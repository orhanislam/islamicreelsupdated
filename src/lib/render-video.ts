// Client-side TikTok-format video renderer.
// Composites background + word-by-word Bulgarian captions synced to audio,
// records via MediaRecorder. Returns an MP4 (when supported) or WebM Blob.
// Arabic is intentionally omitted from video output so the Bulgarian text
// always fits the 1080x1920 safe area at a comfortable size.

import type { RenderOptions } from "./render-photo";

export type WordSegment = { start: number; end: number };

export type VideoOptions = RenderOptions & {
  audioUrl?: string | null;
  /** When true, fail rendering instead of silently creating a muted video. */
  requireAudio?: boolean;
  /** Optional looping background video (e.g. Pexels stock MP4). Overrides backgroundUrl. */
  backgroundVideoUrl?: string | null;
  /** seconds; used when no audio is provided */
  fallbackDuration?: number;
  /** Per-Arabic-word timing in seconds, aligned to audioUrl. */
  wordSegments?: WordSegment[];
  ayahBounds?: { ayah: number; start: number; end: number; arabic: string; english: string; bulgarian?: string; segments?: any[] }[];
  /** Total Arabic words — used with wordSegments to derive reveal progress. */
  arabicWordCount?: number;
  /** Per-Bulgarian-word timings (from ElevenLabs with-timestamps), aligned to audioUrl. */
  bulgarianWordTimings?: WordSegment[];
  /** Video quality. 1080p uses high bitrate but may crash iPhone Safari. */
  quality?: "1080p" | "720p";
};

let W = 1080;
let H = 1920;
let SAFE = { top: 320, bottom: 280, side: 180 };

function configureCanvasSize(ios: boolean, quality?: "1080p" | "720p") {
  const is1080p = quality !== "720p"; // Strictly 1080p (1080x1920) by default
  const scale = is1080p ? 1 : 720 / 1080;
  W = is1080p ? 1080 : 720;
  H = is1080p ? 1920 : 1280;
  SAFE = {
    top: Math.round(320 * scale),
    bottom: Math.round(280 * scale),
    side: Math.round(180 * scale),
  };
  return scale;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => reject(new Error("Фоновото изображение се зарежда твърде бавно")), 10_000);
    img.crossOrigin = "anonymous";
    img.onload = () => { window.clearTimeout(timer); resolve(img); };
    img.onerror = () => { window.clearTimeout(timer); reject(new Error("Не успях да заредя фоновото изображение")); };
    img.src = src;
  });
}



function isIOSDevice() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 8_000): Promise<boolean> {
  if (video.readyState >= 2) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      video.onloadeddata = null;
      video.oncanplay = null;
      video.onerror = null;
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    video.onloadeddata = () => finish(true);
    video.oncanplay = () => finish(true);
    video.onerror = () => finish(false);
  });
}

function keepBackgroundVideoLooping(video: HTMLVideoElement) {
  let loopSeeking = false;
  const replay = () => {
    if (loopSeeking) return;
    try {
      loopSeeking = true;
      if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = 0.01;
      void video.play().catch(() => undefined).finally(() => { loopSeeking = false; });
    } catch { loopSeeking = false; }
  };
  video.onended = replay;
  video.onpause = () => {
    if (!video.src || loopSeeking) return;
    void video.play().catch(() => undefined);
  };
  return replay;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  iw: number,
  ih: number,
  t: number,
) {
  // gentle Ken Burns zoom 1.0 -> 1.06
  const zoom = 1 + 0.06 * t;
  const r = Math.max(W / iw, H / ih) * zoom;
  const w = iw * r;
  const h = ih * r;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number): string[][] {
  const lines: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    const test = [...cur, w].join(" ");
    if (ctx.measureText(test).width > maxWidth && cur.length) {
      lines.push(cur);
      cur = [w];
    } else cur.push(w);
  }
  if (cur.length) lines.push(cur);
  return lines;
}

/**
 * Pick a single font size that fits the FULL Bulgarian text in the available
 * area. We use the full text (not just the revealed portion) so the layout
 * stays stable as words progressively appear.
 */
function chooseFontSize(
  ctx: CanvasRenderingContext2D,
  fullText: string,
  maxWidth: number,
  maxHeight: number,
): { fontSize: number; lineHeight: number } {
  const words = fullText.split(/\s+/).filter(Boolean);
  // Long hadiths cannot fit professionally as one giant block. Pick a readable
  // size, then paginate the wrapped lines so every part of the text appears.
  const wordCount = words.length;
  const readableMax = wordCount > 40 ? 46 : wordCount > 28 ? 54 : wordCount > 18 ? 64 : wordCount > 10 ? 72 : 82;
  const maxSize = Math.round(readableMax * (W / 1080));
  const minSize = Math.round(36 * (W / 1080));
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = `800 ${size}px 'Inter', 'Roboto', 'Montserrat', sans-serif`;
    const lines = wrapWords(ctx, words, maxWidth);
    const lh = Math.round(size * 1.34);
    const maxLinesPerPage = Math.max(1, Math.floor(maxHeight / lh));
    if (lines.length <= maxLinesPerPage) return { fontSize: size, lineHeight: lh };
  }
  const size = minSize;
  return { fontSize: size, lineHeight: Math.round(size * 1.34) };
}

type CaptionPage = {
  lines: string[][];
  startWord: number;
  endWord: number;
  baseYStart: number;
};

function buildCaptionPages(
  lines: string[][],
  lineHeight: number,
  style: RenderOptions["style"],
): CaptionPage[] {
  const verticalForText = H - SAFE.top - SAFE.bottom;
  const maxLinesPerPage = Math.max(1, Math.floor(verticalForText / lineHeight));
  const pages: CaptionPage[] = [];
  let lineIndex = 0;
  let wordIndex = 0;

  while (lineIndex < lines.length) {
    const pageLines = lines.slice(lineIndex, lineIndex + maxLinesPerPage);
    const count = pageLines.reduce((sum, line) => sum + line.length, 0);
    const blockH = pageLines.length * lineHeight;
    const targetBottomY = H * 0.74;
    const baseYStart = targetBottomY - (pageLines.length - 1) * lineHeight;
    pages.push({ lines: pageLines, startWord: wordIndex, endWord: wordIndex + count, baseYStart });
    lineIndex += pageLines.length;
    wordIndex += count;
  }

  return pages.length ? pages : [{ lines: [], startWord: 0, endWord: 0, baseYStart: H / 2 }];
}

function pickMimeType(ios: boolean): string {
  // iOS Safari can preview/save MP4, but cannot reliably play WebM. Also,
  // asking Safari for an exact codec string often reports support but creates
  // files that the native player refuses to open. Prefer the plain container.
  const candidates = ios ? [
    "video/mp4;codecs=avc1.64002A", // High Profile Level 4.2 for pristine 1080p
    "video/mp4;codecs=avc1.4D402A", // Main Profile Level 4.2
    "video/mp4;codecs=avc1.42E02A", // Baseline Profile Level 4.2
    "video/mp4",
    "video/mp4;codecs=avc1.42E01F",
  ] : [
    "video/webm;codecs=vp9,opus", // VP9 High Quality 1080p
    "video/mp4;codecs=avc1.64002A",
    "video/mp4;codecs=avc1.4D402A",
    "video/mp4;codecs=avc1.42E02A",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return ios ? "" : "video/webm";
}

function normalizeRecordedMime(type: string | undefined, fallback: string) {
  const out = (type || fallback || "video/webm").split(";")[0].trim().toLowerCase();
  return out || "video/webm";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawReferencePill(ctx: CanvasRenderingContext2D, text: string) {
  ctx.save();
  const scale = W / 1080;
  const fontPx = Math.round(28 * scale);
  ctx.font = `500 ${fontPx}px 'Inter', system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  const padX = 28 * scale, padY = 14 * scale;
  const pillW = tw + padX * 2;
  const pillH = fontPx + padY * 2;
  const x = (W - pillW) / 2;
  const y = 280 * scale;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  
  // Glowing golden border
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(212, 175, 55, 0.4)";
  ctx.strokeStyle = "rgba(212, 175, 55, 0.8)";
  ctx.lineWidth = 2.0;
  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.stroke();
  
  // Premium typography for the reference
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f4c95d";
  ctx.font = `bold ${24 * scale}px 'Inter', 'Roboto', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, y + pillH / 2 + 1);
  ctx.restore();
}

export async function renderVideo(opts: VideoOptions): Promise<{ blob: Blob; mimeType: string }> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Този браузър не поддържа видео рендиране. На iPhone използвай последната версия на Safari/Chrome.");
  }

  const ios = isIOSDevice();
  const scale = configureCanvasSize(ios, opts.quality);
  const videoBitsPerSecond = opts.quality === "720p" ? 14_000_000 : 28_000_000;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  let attachedCanvas: HTMLCanvasElement | null = null;
  const detachCanvas = () => {
    if (attachedCanvas?.isConnected) attachedCanvas.remove();
    attachedCanvas = null;
  };
  if (ios) {
    // iOS can suspend MediaRecorder tracks from canvases that are never
    // attached to the page. Keep a tiny live canvas mounted during render.
    canvas.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      `width:${W}px`,
      `height:${H}px`,
    ].join(";");
    
    const wrapper = document.createElement("div");
    wrapper.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "width:20px",
      "height:20px",
      "overflow:hidden",
      "z-index:9999",
      "pointer-events:none",
      "opacity:0.02"
    ].join(";");
    
    wrapper.appendChild(canvas);
    document.body.appendChild(wrapper);
    attachedCanvas = wrapper as any;
  }

  try {
    await Promise.all([
      document.fonts.load("700 72px 'Cormorant Garamond'"),
      document.fonts.load("500 28px 'Inter'"),
    ]);
  } catch { /* best-effort */ }

  // background — video has priority on desktop. On iOS Safari, recording a
  // canvas that is continuously fed by an HTMLVideoElement is still unreliable:
  // the visual track can freeze or the recorder can fail around the source
  // clip's loop boundary while audio keeps going. For iPhone/iPad we render
  // from the selected poster/image with Ken Burns movement instead, which keeps
  // the subtitle/video timeline deterministic until the narration ends.
  let bgVideo: HTMLVideoElement | null = null;
  const useBackgroundVideo = Boolean(opts.backgroundVideoUrl);
  if (useBackgroundVideo && opts.backgroundVideoUrl) {
    bgVideo = document.createElement("video");
    bgVideo.crossOrigin = "anonymous";
    let videoSrc = opts.backgroundVideoUrl;
    try {
      // Preload the entire video into RAM to prevent network buffering
      // from pausing the video during the real-time render.
      const res = await fetch(videoSrc, { cache: "force-cache" });
      if (res.ok) {
        const b = await res.blob();
        videoSrc = URL.createObjectURL(b);
      }
    } catch { /* ignore, use original URL */ }
    bgVideo.src = videoSrc;
    bgVideo.muted = true;
    // Do not use native loop on iOS/stock clips: the loop boundary can pause
    // canvas capture around ~15–20s. We control looping manually in drawFrame.
    bgVideo.loop = false;
    bgVideo.playsInline = true;
    bgVideo.preload = "auto";
    keepBackgroundVideoLooping(bgVideo);
    const ready = await waitForVideoReady(bgVideo, 10_000);
    if (!ready) {
      console.warn("[render-video] background video unavailable, falling back to image");
      bgVideo.src = "";
      bgVideo = null;
    }
  }
  const bg = !bgVideo && opts.backgroundUrl ? await loadImage(opts.backgroundUrl).catch(() => null) : null;

  // audio — decoded into an AudioBuffer so it is guaranteed to be captured by
  // MediaRecorder. createMediaElementSource silently outputs silence when the
  // audio URL is cross-origin without permissive CORS, which previously
   let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  let audioSource: AudioBufferSourceNode | null = null;
  let audioStartCtxTime = 0;
  let audioEndedAtWall: number | null = null;
  let renderStartedAt = 0;
  let duration = opts.fallbackDuration ?? 8;
  let audioBufDuration = 0;
  
  if (opts.audioUrl) {
    try {
      const res = await withTimeout(
        fetch(opts.audioUrl, { mode: "cors", credentials: "omit", cache: "no-store" }),
        15_000,
        "Аудиото се зарежда твърде бавно",
      );
      if (!res.ok) throw new Error(`audio fetch ${res.status}`);
      const arr = await withTimeout(res.arrayBuffer(), 15_000, "Аудио файлът не се изтегли докрай");
      if (arr.byteLength < 512) throw new Error("audio payload too small");

      const AC: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AC();
      
      const originalBuf = await withTimeout(audioCtx.decodeAudioData(arr.slice(0)), 15_000, "Аудиото не можа да се декодира");
      
      // The fix for iOS Safari audio truncation:
      // Safari's MediaStreamDestinationNode has massive internal latency. 
      // If we stop the video when the real audio ends, the last ~1 second of audio 
      // is completely dropped. To fix this, we create a new AudioBuffer that is 
      // longer than the original, and fill the end with silence. 
      // This physically forces Safari to flush the real audio into the MP4 file.
      const silencePadding = 1.0; 
      const paddedBuf = audioCtx.createBuffer(
        originalBuf.numberOfChannels,
        originalBuf.length + (originalBuf.sampleRate * silencePadding),
        originalBuf.sampleRate
      );
      
      // Copy original audio into the new buffer (the rest remains silent 0s)
      for (let channel = 0; channel < originalBuf.numberOfChannels; channel++) {
        paddedBuf.copyToChannel(originalBuf.getChannelData(channel), channel, 0);
      }

      // The video duration is based on the REAL audio, not the silence padding
      duration = originalBuf.duration;
      audioBufDuration = originalBuf.duration;
      
      audioDest = audioCtx.createMediaStreamDestination();
      audioSource = audioCtx.createBufferSource();
      audioSource.buffer = paddedBuf; // Play the padded buffer
      
      // We manually detect completion in the draw loop, so we don't strictly 
      // rely on onended, but we leave it as a fallback.
      audioSource.onended = () => {
        // onended will now fire 2 seconds AFTER the real audio finishes
        if (audioEndedAtWall === null) {
          audioEndedAtWall = renderStartedAt ? (performance.now() - renderStartedAt) / 1000 : duration;
        }
      };
      
      audioSource.connect(audioDest);
      console.log("[render-video] audio decoded:", originalBuf.duration.toFixed(2), "s, padded to:", paddedBuf.duration.toFixed(2), "s");
    } catch (err) {
      console.error("[render-video] AUDIO FAILED - silent video:", err);
      if (opts.requireAudio) {
        throw new Error("Аудиото не можа да се зареди за видеото. Опитай пак с бутона 'Чуй гласа' и после рендирай.");
      }
      audioCtx = null; audioDest = null; audioSource = null;
    }
  }

  // stream — add audio onto the existing video stream so tracks share lifetime.
  const fps = 30; // Strictly 30 FPS as requested
  // Keep a normal fixed-FPS canvas stream on iOS. `captureStream(0)` manual
  // mode is inconsistently implemented in mobile Safari and can make the
  // recorder never produce a playable final file. We still call requestFrame()
  // every draw as an extra nudge where browsers support it.
  const manualCanvasCapture = false;
  let videoStream: MediaStream;
  try {
    videoStream = canvas.captureStream(manualCanvasCapture ? 0 : fps);
  } catch {
    // Some browsers reject captureStream(0); fall back to a normal fixed-FPS
    // stream and still manually request frames below when possible.
    videoStream = canvas.captureStream(fps);
  }
  let canvasVideoTrack = videoStream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
  if (manualCanvasCapture && !canvasVideoTrack?.requestFrame) {
    // Manual streams need requestFrame(). If the browser lacks it, recreate a
    // normal FPS stream so the video track cannot stay stuck on the first frame.
    videoStream.getTracks().forEach((track) => track.stop());
    videoStream = canvas.captureStream(fps);
    canvasVideoTrack = videoStream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
  }
  canvasVideoTrack?.addEventListener?.("ended", () => console.warn("[render-video] canvas video track ended before recorder stopped"));
  let lastCanvasRequestTime = 0;
  const requestCanvasFrame = () => {
    const nowMs = performance.now();
    if (nowMs - lastCanvasRequestTime >= 33) {
      lastCanvasRequestTime = nowMs;
      try { canvasVideoTrack?.requestFrame?.(); } catch { /* ignore */ }
    }
  };
  const forceCanvasCommit = () => {
    // iOS Safari can delay committing 2D canvas updates into the captured
    // stream unless layout/painting notices the canvas changed. Reading a tiny
    // pixel is cheap at 720p and forces the backing store to stay current.
    if (!ios) return;
    try { ctx.getImageData(0, 0, 1, 1); } catch { /* ignore */ }
  };
  if (audioDest) {
    for (const t of audioDest.stream.getAudioTracks()) videoStream.addTrack(t);
  }

  const requestedMimeType = pickMimeType(ios);
  if (ios && !requestedMimeType.includes("mp4")) {
    throw new Error("iPhone не поддържа MP4 рендиране в този браузър. Обнови iOS/Safari и опитай отново.");
  }
  const recorder = new MediaRecorder(videoStream, {
    mimeType: requestedMimeType,
    videoBitsPerSecond,
    audioBitsPerSecond: 128_000,
  });
  const recordedMimeType = normalizeRecordedMime(recorder.mimeType, requestedMimeType);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.onerror = (e) => console.error("[render-video] recorder error", e);

  // Split the Bulgarian text into subtitle-style PHRASES (one chunk shown
  // at a time, like real subtitles). Phrases break on punctuation, with a
  // soft cap on words per phrase so nothing overflows the safe area.
  const allWords = opts.bulgarian.split(/\s+/).filter(Boolean);
  const maxW = W - SAFE.side * 2;
  const verticalForText = H - SAFE.top - SAFE.bottom;

  const MAX_WORDS_PER_PHRASE = 7;
  const MIN_WORDS_PER_PHRASE = 3;
  type Phrase = { words: string[]; startWord: number; endWord: number; exactStart?: number; exactEnd?: number };
  const phrases: Phrase[] = [];
  if (opts.ayahBounds && Array.isArray(opts.ayahBounds) && opts.ayahBounds.length > 0) {
    const bounds = opts.ayahBounds;
    const totalEngLen = bounds.reduce((acc: number, b: any) => acc + (b.english ? b.english.length : 10), 0) || 1;
    let wordIdx = 0;
    for (let bIdx = 0; bIdx < bounds.length; bIdx++) {
      const b = bounds[bIdx];
      const isLast = bIdx === bounds.length - 1;
      let ayahWords: string[];
      if (b.bulgarian && typeof b.bulgarian === "string" && b.bulgarian.trim().length > 0) {
        ayahWords = b.bulgarian.split(/\s+/).filter(Boolean);
      } else {
        const ratio = (b.english ? b.english.length : 10) / totalEngLen;
        const count = isLast ? (allWords.length - wordIdx) : Math.max(1, Math.round(allWords.length * ratio));
        ayahWords = allWords.slice(wordIdx, Math.min(allWords.length, wordIdx + count));
      }
      if (ayahWords.length > 0) {
        phrases.push({
          words: ayahWords,
          startWord: wordIdx,
          endWord: wordIdx + ayahWords.length,
          exactStart: Number(b.start) || 0,
          exactEnd: Number(b.end) || (Number(b.start) + 5)
        });
      }
      wordIdx += ayahWords.length;
    }
  } else {
    let cur: string[] = [];
    let curStart = 0;
    const flush = () => {
      if (!cur.length) return;
      phrases.push({ words: cur, startWord: curStart, endWord: curStart + cur.length });
      curStart += cur.length;
      cur = [];
    };
    for (let i = 0; i < allWords.length; i++) {
      const w = allWords[i];
      cur.push(w);
      const endsPunct = /[.!?…]$/.test(w) || (/[,;:—]$/.test(w) && cur.length >= MIN_WORDS_PER_PHRASE);
      if ((endsPunct && cur.length >= MIN_WORDS_PER_PHRASE) || cur.length >= MAX_WORDS_PER_PHRASE) {
        flush();
      }
    }
    flush();
  }

  // Per-word timings.
  //   1) Bulgarian per-word timings from ElevenLabs (best accuracy)
  //   2) Arabic per-word timings from Quran.com (for ayah recitations)
  //   3) Weighted-cost heuristic distributed across the audio duration
  const bgSegs = (opts.bulgarianWordTimings ?? [])
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end))
    .slice(0, allWords.length);
  const hasBgSegments = bgSegs.length > 0;
  if (hasBgSegments && bgSegs.length < allWords.length) {
    console.warn(
      "[render-video] Bulgarian word timings are incomplete; remaining words use fallback timing",
      { timings: bgSegs.length, words: allWords.length },
    );
  }
  const segs = opts.wordSegments ?? [];
  const arCount = opts.arabicWordCount ?? segs.length;
  const hasArSegments = !hasBgSegments && segs.length > 0 && arCount > 0;

  // Reserve a small tail so the last subtitle is fully on screen before audio ends.
  const REVEAL_END_OFFSET = 0.4;
  const revealDuration = Math.max(0.5, duration - REVEAL_END_OFFSET);

  const speechCost = (w: string) => 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55;
  const costs = allWords.map(speechCost);
  const cumCost: number[] = [0];
  for (let i = 0; i < costs.length; i++) cumCost.push(cumCost[i] + costs[i]);
  const totalCost = cumCost[cumCost.length - 1] || 1;
  void arCount;

  // Build per-word [start,end] times.
  const wordTimes: { start: number; end: number }[] = new Array(allWords.length);
  if (hasBgSegments) {
    const lastEnd = bgSegs[bgSegs.length - 1].end || duration;
    const missing = Math.max(0, allWords.length - bgSegs.length);
    const fallbackWindow = missing
      ? Math.min(revealDuration * 0.55, Math.max(1.2, revealDuration - lastEnd))
      : 0;
    const timedEnd = missing ? Math.max(0.2, revealDuration - fallbackWindow) : revealDuration;
    // Only scale if timestamps exceed the audio duration; never artificially stretch them if they finish early.
    const scl = lastEnd > 0 && lastEnd > timedEnd ? timedEnd / lastEnd : 1;
    for (let i = 0; i < bgSegs.length; i++) {
      wordTimes[i] = { start: bgSegs[i].start * scl, end: bgSegs[i].end * scl };
    }
    if (missing) {
      const fromCost = cumCost[bgSegs.length];
      const remainingCost = Math.max(0.001, totalCost - fromCost);
      const fromTime = bgSegs[bgSegs.length - 1].end * scl;
      const toTime = revealDuration;
      const span = Math.max(0.08, toTime - fromTime);
      for (let i = bgSegs.length; i < allWords.length; i++) {
        const s = fromTime + ((cumCost[i] - fromCost) / remainingCost) * span;
        const e = fromTime + ((cumCost[i + 1] - fromCost) / remainingCost) * span;
        wordTimes[i] = { start: s, end: e };
      }
    }
  } else if (opts.ayahBounds && Array.isArray(opts.ayahBounds) && opts.ayahBounds.length > 0) {
    const bounds = opts.ayahBounds;
    const totalEngLen = bounds.reduce((acc: number, b: any) => acc + (b.english ? b.english.length : 10), 0) || 1;
    let wordIdx = 0;
    for (let bIdx = 0; bIdx < bounds.length; bIdx++) {
      const b = bounds[bIdx];
      const isLast = bIdx === bounds.length - 1;
      let ayahWords: string[];
      if (b.bulgarian && typeof b.bulgarian === "string" && b.bulgarian.trim().length > 0) {
        ayahWords = b.bulgarian.split(/\s+/).filter(Boolean);
      } else {
        const ratio = (b.english ? b.english.length : 10) / totalEngLen;
        const count = isLast ? (allWords.length - wordIdx) : Math.max(1, Math.round(allWords.length * ratio));
        ayahWords = allWords.slice(wordIdx, Math.min(allWords.length, wordIdx + count));
      }

      const bStart = Number(b.start) || 0;
      const bEnd = Number(b.end) || (bStart + 5);
      const bDur = Math.max(0.2, bEnd - bStart);

      const ayahCosts = ayahWords.map((w) => 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55);
      const ayahTotalCost = ayahCosts.reduce((sum, c) => sum + c, 0) || 1;
      let ayahCumCost = 0;

      const interpolateSegTime = (frac: number, segs?: any[]) => {
        if (frac <= 0) return bStart;
        if (frac >= 1) return bEnd;
        if (!Array.isArray(segs) || segs.length === 0) {
          return bStart + frac * bDur;
        }
        const x = frac * segs.length;
        const k = Math.min(segs.length - 1, Math.floor(x));
        const r = x - k;
        const sStart = Number(segs[k].start) || bStart;
        const sEnd = Number(segs[k].end) || bEnd;
        return sStart + r * (sEnd - sStart);
      };

      for (let w = 0; w < ayahWords.length; w++) {
        const fracS = ayahCumCost / ayahTotalCost;
        ayahCumCost += ayahCosts[w];
        const fracE = ayahCumCost / ayahTotalCost;
        const idx = wordIdx + w;
        if (idx < wordTimes.length) {
          wordTimes[idx] = {
            start: Math.round(interpolateSegTime(fracS, b.segments) * 1000) / 1000,
            end: Math.round(interpolateSegTime(fracE, b.segments) * 1000) / 1000,
          };
        }
      }
      wordIdx += ayahWords.length;
    }
  } else if (hasArSegments) {
    const scale = 1; // DO NOT scale exact reciter segment timestamps
    const segDurs = segs.map(s => Math.max(0.1, (s.end - s.start) * scale));
    const cumAudio = [0];
    for (let i = 0; i < segDurs.length; i++) cumAudio.push(cumAudio[i] + segDurs[i]);
    const totalAudio = cumAudio[cumAudio.length - 1] || duration;

    for (let i = 0; i < allWords.length; i++) {
      const fracS = cumCost[i] / totalCost;
      const fracE = cumCost[i + 1] / totalCost;
      const targetAudioS = fracS * totalAudio;
      const targetAudioE = fracE * totalAudio;

      let sIdx = 0;
      while (sIdx < segs.length - 1 && cumAudio[sIdx + 1] < targetAudioS) sIdx++;
      const remAudioS = (targetAudioS - cumAudio[sIdx]) / segDurs[sIdx];
      const start = (segs[sIdx].start + remAudioS * (segs[sIdx].end - segs[sIdx].start)) * scale;

      let eIdx = 0;
      while (eIdx < segs.length - 1 && cumAudio[eIdx + 1] < targetAudioE) eIdx++;
      const remAudioE = (targetAudioE - cumAudio[eIdx]) / segDurs[eIdx];
      const end = (segs[eIdx].start + remAudioE * (segs[eIdx].end - segs[eIdx].start)) * scale;

      wordTimes[i] = { start, end };
    }
  } else {
    for (let i = 0; i < allWords.length; i++) {
      const s = (cumCost[i] / totalCost) * revealDuration;
      const e = (cumCost[i + 1] / totalCost) * revealDuration;
      wordTimes[i] = { start: s, end: e };
    }
  }

  // Compute each phrase's [start,end] from word timings, plus pre-wrapped lines.
  type RenderPhrase = Phrase & { start: number; end: number; fontSize: number; lineHeight: number; lines: string[][] };
  const phraseRender: RenderPhrase[] = phrases.map((p) => {
    const start = p.exactStart ?? (wordTimes[p.startWord]?.start ?? 0);
    const end = p.exactEnd ?? (wordTimes[p.endWord - 1]?.end ?? revealDuration);
    const text = p.words.join(" ");
    const { fontSize: fs, lineHeight: lh } = chooseFontSize(ctx, text, maxW, verticalForText);
    ctx.font = `700 ${fs}px 'Cormorant Garamond', Georgia, serif`;
    const lines = wrapWords(ctx, p.words, maxW);
    return { ...p, start, end, fontSize: fs, lineHeight: lh, lines };
  });
  if (phraseRender.length && opts.ayahBounds) {
    for (let i = 0; i < phraseRender.length - 1; i++) {
      phraseRender[i].end = Math.min(phraseRender[i].end, phraseRender[i + 1].start);
    }
  } else if (phraseRender.length && !opts.ayahBounds) {
    phraseRender[0].start = 0;
    phraseRender[phraseRender.length - 1].end = revealDuration;
  }

  // Snapshot canvas for fallback when the background video is seeking/buffering.
  let bgSnapshot: ImageData | null = null;
  const saveBgSnapshot = () => {
    try { bgSnapshot = ctx.getImageData(0, 0, W, H); } catch { /* ignore */ }
  };

  // Track which subtitle phrases have been drawn at least once.
  const shownPhrases = new Set<number>();
  // Minimum display time per subtitle phrase (seconds).
  // Disabled for ayahBounds — those are acoustically-anchored timestamps.
  const hasAyahBounds = opts.ayahBounds && Array.isArray(opts.ayahBounds) && opts.ayahBounds.length > 0;
  const MIN_PHRASE_DISPLAY = hasAyahBounds ? 0 : 0.4;
  // Track how long the current phrase has been on-screen.
  let currentPhraseShownSince = -1;
  let lastPhraseIdx = -1;

  const drawFrame = (elapsed: number) => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const t = Math.min(1, elapsed / duration);

    // Pick the active phrase, enforcing exact start/end window for Ayah bounds.
    let activePhraseIdx = -1;
    for (let i = 0; i < phraseRender.length; i++) {
      if (hasAyahBounds) {
        if (elapsed >= phraseRender[i].start - 0.01 && elapsed < phraseRender[i].end) {
          activePhraseIdx = i;
          break;
        }
      } else {
        if (phraseRender[i].start <= elapsed + 0.02) activePhraseIdx = i; else break;
      }
    }
    // If we'd jump past phrases that were never shown, force-show them first (only for non-Ayah bounds).
    if (!hasAyahBounds && activePhraseIdx > lastPhraseIdx + 1) {
      for (let skip = lastPhraseIdx + 1; skip < activePhraseIdx; skip++) {
        if (!shownPhrases.has(skip)) {
          activePhraseIdx = skip;
          break;
        }
      }
    }
    // Enforce minimum display time for current phrase (skipped for ayahBounds).
    if (MIN_PHRASE_DISPLAY > 0 && lastPhraseIdx >= 0 && activePhraseIdx > lastPhraseIdx && currentPhraseShownSince >= 0) {
      const displayedFor = elapsed - currentPhraseShownSince;
      if (displayedFor < MIN_PHRASE_DISPLAY) {
        activePhraseIdx = lastPhraseIdx;
      }
    }
    // Track phrase transitions.
    if (activePhraseIdx !== lastPhraseIdx) {
      currentPhraseShownSince = elapsed;
      lastPhraseIdx = activePhraseIdx;
    }
    if (activePhraseIdx >= 0) shownPhrases.add(activePhraseIdx);
    const activePhrase = activePhraseIdx >= 0 ? phraseRender[activePhraseIdx] : null;
    // Caption is done only when ALL phrases have been shown at least once
    // AND we've reached the end timing of the last phrase.
    const allPhrasesShown = phraseRender.length === 0 || shownPhrases.size >= phraseRender.length;
    const lastPhraseTimingDone =
      phraseRender.length === 0 ||
      (activePhraseIdx === phraseRender.length - 1 && elapsed >= phraseRender[phraseRender.length - 1].end - 0.01);
    const captionDone = allPhrasesShown && lastPhraseTimingDone;

    // background — pre-emptively loop video before it reaches the end to avoid
    // the freeze that occurs when the video element enters "ended" state.
    let backgroundDrawn = false;
    if (bgVideo) {
      const ready = bgVideo.readyState >= 2 && !bgVideo.seeking;
      // Pre-emptive loop: seek back before the video reaches its natural end.
      if (ready && Number.isFinite(bgVideo.duration) && bgVideo.duration > 0) {
        if (bgVideo.currentTime >= bgVideo.duration - 0.5) {
          saveBgSnapshot();
          bgVideo.currentTime = 0.01;
          void bgVideo.play().catch(() => undefined);
        }
      }
      if (ready) {
        try {
          if ((bgVideo.paused || bgVideo.ended) && !bgVideo.seeking) {
            void bgVideo.play().catch(() => undefined);
          }
          drawCover(ctx, bgVideo, bgVideo.videoWidth || 1080, bgVideo.videoHeight || 1920, t);
          backgroundDrawn = true;
          // Save a snapshot for fallback during future seeks.
          saveBgSnapshot();
        } catch (err) {
          console.warn("[render-video] background video frame skipped", err);
        }
      }
      // When the video element is seeking/buffering, draw the last known frame.
      if (!backgroundDrawn && bgSnapshot) {
        try {
          ctx.putImageData(bgSnapshot, 0, 0);
          backgroundDrawn = true;
        } catch { /* ignore */ }
      }
    }
    if (!backgroundDrawn && bg) {
      drawCover(ctx, bg, bg.width, bg.height, t);
      backgroundDrawn = true;
    }
    if (!backgroundDrawn) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0d2a24");
      g.addColorStop(1, "#1a4d3e");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // overlay + vignette (lightened to keep stock videos vibrant and colorful)
    const ov = ctx.createLinearGradient(0, 0, 0, H);
    ov.addColorStop(0, "rgba(0,0,0,0.25)");
    ov.addColorStop(0.5, "rgba(0,0,0,0.05)");
    ov.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.7);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.20)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    // corner accents (skip for minimal)
    if (opts.style !== "minimal") {
      ctx.strokeStyle = "rgba(212,175,55,0.55)";
      ctx.lineWidth = 2 * scale;
      const m = 80 * scale, cl = 70 * scale;
      ctx.beginPath();
      ctx.moveTo(m, m + cl); ctx.lineTo(m, m); ctx.lineTo(m + cl, m);
      ctx.moveTo(W - m - cl, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + cl);
      ctx.moveTo(m, H - m - cl); ctx.lineTo(m, H - m); ctx.lineTo(m + cl, H - m);
      ctx.moveTo(W - m - cl, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - cl);
      ctx.stroke();
    }

    if (activePhrase) {
      const isFirstPhrase = activePhraseIdx === 0;
      const isLastPhrase = activePhraseIdx === phraseRender.length - 1;
      const sinceStart = elapsed - activePhrase.start;
      const tillEnd = activePhrase.end - elapsed;

      // For ayah-bounded subtitles: instant swap between ayahs (no fade/pop)
      // to eliminate flicker. Only the very first ayah gets a gentle fade-in,
      // and only the very last ayah gets a fade-out.
      let alpha: number;
      let popScale: number;
      if (hasAyahBounds) {
        const alphaIn = isFirstPhrase ? Math.max(0, Math.min(1, sinceStart / 0.15)) : 1.0;
        const alphaOut = isLastPhrase ? Math.max(0, Math.min(1, tillEnd / 0.15)) : 1.0;
        alpha = Math.min(alphaIn, alphaOut);
        // Only pop-scale on the very first ayah
        if (isFirstPhrase) {
          const popProgress = Math.max(0, Math.min(1, sinceStart / 0.15));
          popScale = 0.90 + 0.10 * (1 - Math.pow(1 - popProgress, 3));
        } else {
          popScale = 1.0;
        }
      } else {
        const FADE_IN = 0.18;
        const alphaIn = Math.max(0, Math.min(1, sinceStart / FADE_IN));
        const alphaOut = isLastPhrase ? Math.max(0, Math.min(1, tillEnd / 0.18)) : 1.0;
        alpha = Math.min(alphaIn, alphaOut);
        const popProgress = Math.max(0, Math.min(1, sinceStart / 0.15));
        popScale = 0.88 + 0.12 * (1 - Math.pow(1 - popProgress, 3));
      }

      // Modern minimalistic clean white font
      ctx.font = `700 ${activePhrase.fontSize}px 'Outfit', 'Inter', sans-serif`;
      ctx.textBaseline = "alphabetic";
      ctx.lineJoin = "round";

      const blockH = activePhrase.lines.length * activePhrase.lineHeight;
      // Position vertically lower down the screen (~74% down).
      // As text gets bigger or has multiple lines, anchor downward vertically.
      const targetBottomY = H * 0.74;
      const baseY = targetBottomY - (activePhrase.lines.length - 1) * activePhrase.lineHeight;

      ctx.save();
      const centerY = baseY + blockH / 2 - activePhrase.lineHeight * 0.75;
      ctx.translate(W / 2, centerY);
      ctx.scale(popScale, popScale);
      ctx.translate(-W / 2, -centerY);

      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.lineJoin = "round";

      // Subtle minimalistic dark border & soft shadow for readability without muddying
      ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
      ctx.lineWidth = Math.max(3, activePhrase.fontSize * 0.04);
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      for (let i = 0; i < activePhrase.lines.length; i++) {
        const text = activePhrase.lines[i].join(" ");
        const y = baseY + i * activePhrase.lineHeight;
        ctx.strokeText(text, W / 2, y);
      }

      // Pure crisp white fill
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < activePhrase.lines.length; i++) {
        const text = activePhrase.lines[i].join(" ");
        const y = baseY + i * activePhrase.lineHeight;
        ctx.fillText(text, W / 2, y);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.textAlign = "center";

    drawReferencePill(ctx, opts.reference);
    // Safari/iOS can stop emitting canvas frames during long recordings if the
    // canvas appears static around a background-video loop boundary. A tiny,
    // visually-imperceptible heartbeat pixel keeps the captured video track
    // active while subtitles/audio continue.
    ctx.save();
    ctx.globalAlpha = 0.012;
    ctx.fillStyle = Math.floor(elapsed * fps) % 2 ? "#000" : "#fff";
    ctx.fillRect(0, 0, 1, 1);
    ctx.restore();
    forceCanvasCommit();
    requestCanvasFrame();
    return { captionDone };
  };

  // Start the moving background before the recorder/audio, then draw a real
  // first frame. This prevents iOS from recording audio over a black/blank
  // video track at the beginning.
  if (bgVideo) {
    try { await withTimeout(bgVideo.play(), 3_000, "Фоновото видео не стартира навреме"); } catch { /* ignore */ }
    await new Promise<void>((resolve) => {
      if (ios) setTimeout(resolve, 15); else requestAnimationFrame(() => resolve());
    });
  }
  drawFrame(0);

  // Pass a 1000ms timeslice to constantly flush the iOS hardware encoder.
  // Without a timeslice, the internal AVAssetWriter buffer fills up after 
  // exactly 15 seconds at 720p, causing it to silently drop the video track
  // while the audio track continues.
  recorder.start(1000);

  await new Promise<void>((resolve) => {
    if (ios) setTimeout(() => { drawFrame(0); resolve(); }, 15);
    else requestAnimationFrame(() => { drawFrame(0); resolve(); });
  });

  const startedAt = performance.now();
  renderStartedAt = startedAt;
  const hasAudio = Boolean(audioCtx && audioSource);
  
  if (audioCtx && audioSource) {
    if (audioCtx.state === "suspended") {
      try { await withTimeout(audioCtx.resume(), 3_000, "Аудио системата не стартира навреме"); } catch { /* ignore */ }
    }
    audioStartCtxTime = audioCtx.currentTime;
    try { audioSource.start(0); } catch { /* ignore */ }
  }

  await new Promise<void>((resolveDraw) => {
    let done = false;
    let lastAudioElapsed = 0;
    let lastAudioProgressWall = 0;
    let rafId: number | null = null;
    let lastFrameTime = 0;
    const frameInterval = 1000 / fps;
    let draw: () => void;
    const scheduleDraw = () => {
      if (ios) {
        rafId = window.setTimeout(draw, 15) as any;
      } else {
        rafId = requestAnimationFrame(draw);
      }
    };
    const finish = () => {
      if (!done) {
        done = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
        clearTimeout(safety);
        resolveDraw();
      }
    };
    // Hard safety cap — only for broken browser encoders. Normal completion is
    // Failsafe timeout in case the MediaRecorder drops frames indefinitely
    const isHeadless = navigator.userAgent.includes("HeadlessChrome");
    const timeoutSeconds = isHeadless ? 600 : duration + 45; // Allow 10 minutes for server-side rendering
    const safety = setTimeout(() => {
      console.warn("[render-video] safety timeout reached, finishing render");
      finish();
    }, timeoutSeconds * 1000);

    draw = () => {
      if (done) return;
      const now = performance.now();
      lastFrameTime = now;

      // Wall clock drives the loop end (reliable). Audio clock drives text
      // reveal sync when it's actually advancing; otherwise fall back to
      // wall clock so a stuck AudioContext can't hang the render.
      const wall = (now - startedAt) / 1000;
      // --- Audio elapsed calculation ---
      const audioElapsed = audioCtx ? Math.max(0, audioCtx.currentTime - audioStartCtxTime) : 0;
      if (!audioCtx || audioElapsed > lastAudioElapsed + 0.015) {
        lastAudioElapsed = audioElapsed;
        lastAudioProgressWall = wall;
      }
      const audioClockStale = hasAudio && wall > 1.25 && wall - lastAudioProgressWall > 1.25;

      // When ayahBounds are present, subtitles must be precisely locked to the
      // actual audio playback position — never race ahead via wall clock.
      // The wall clock can run faster than audio decode on some devices, causing
      // subtitles to jump to the next ayah while the reciter is still on the previous one.
      let elapsed: number;
      if (opts.ayahBounds && opts.ayahBounds.length > 0 && hasAudio && audioElapsed > 0.05 && !audioClockStale) {
        // Use audio clock exclusively — it's locked to real playback
        elapsed = Math.min(duration, audioElapsed);
      } else {
        const clockElapsed = hasAudio && audioElapsed > 0.05 && !audioClockStale ? audioElapsed : wall;
        elapsed = Math.min(duration, Math.max(clockElapsed, Math.min(wall, revealDuration)));
      }
      const { captionDone } = drawFrame(elapsed);

      // --- Audio completion detection ---
      // We manually poll audioCtx.currentTime against the REAL audio duration (not the silence padding)
      if (audioDest && audioEndedAtWall === null && audioCtx && audioBufDuration > 0) {
        const ctxElapsed = audioCtx.currentTime - audioStartCtxTime;
        if (ctxElapsed >= audioBufDuration - 0.05) {
          audioEndedAtWall = wall;
          console.log(`[render-video] real audio ended at wall=${wall.toFixed(2)}s`);
        }
      }

      const wallDone = wall >= duration + 0.4;
      const audioTailDone = hasAudio && audioEndedAtWall !== null && wall >= audioEndedAtWall;
      const audioFallbackDone = hasAudio && audioElapsed >= duration - 0.05;
      const silentVideoDone = !hasAudio && wall >= duration;
      const playbackDone = Boolean(wallDone || audioTailDone || audioFallbackDone || silentVideoDone);

      if (!playbackDone) {
        scheduleDraw();
      } else {
        console.log(`[render-video] FINISH: wall=${wall.toFixed(2)}s duration=${duration.toFixed(2)}s`);
        finish();
      }
    };
    draw();
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    let resolved = false;
    let stopRequested = false;
    let keepPainting = true;
    let finalPaintTimer: number | null = null;
    const finalize = () => {
      if (resolved) return;
      resolved = true;
      keepPainting = false;
      if (finalPaintTimer !== null) window.clearTimeout(finalPaintTimer);
      window.clearTimeout(fallbackTimer);
      if (!chunks.length) {
        reject(new Error("Браузърът не върна видео данни. Опитай пак след refresh."));
        return;
      }
      resolve(new Blob(chunks, { type: recordedMimeType }));
    };

    const paintFinalFrame = () => {
      if (!keepPainting) return;
      const wall = (performance.now() - startedAt) / 1000;
      drawFrame(wall);
      finalPaintTimer = window.setTimeout(paintFinalFrame, Math.round(1000 / fps));
    };
    paintFinalFrame();

    recorder.onstop = finalize;
    recorder.onerror = (e) => { console.error("[render-video] recorder error", e); finalize(); };
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
      // Some iOS builds emit the final MP4 data but never dispatch `stop`.
      // Give the native muxer a short beat, then finalize the complete chunk.
      if (ios && stopRequested && e.data.size) window.setTimeout(finalize, 600);
    };

    const fallbackTimer = window.setTimeout(() => {
      if (chunks.length) finalize();
      else reject(new Error("iPhone не финализира видеото. Опитай по-кратък текст или друг фон."));
    }, ios ? 20_000 : 5_000);

    window.setTimeout(() => {
      stopRequested = true;
      try {
        // Important: do NOT call requestData() before stop for Safari MP4.
        // It can create a partial fMP4 chunk before the final moov atom, and
        // concatenating that chunk makes a file that iPhone says cannot play.
        if (!ios && !recordedMimeType.includes("mp4")) {
          try { recorder.requestData(); } catch { /* ignore */ }
        }
        if (recorder.state !== "inactive") recorder.stop();
        else finalize();
      } catch (e) {
        console.error("[render-video] recorder stop failed", e);
        finalize();
      }
    }, ios ? 3500 : 350);
  });
  if (blob.size < 1024) {
    detachCanvas();
    throw new Error("Видеото не се записа правилно. Опитай пак, без стоково видео фон или с по-кратък текст.");
  }
  if (ios && !recordedMimeType.includes("mp4")) {
    detachCanvas();
    throw new Error("iPhone получи неподдържан видео формат. Обнови iOS/Safari и рендирай отново.");
  }
  if (audioSource && audioEndedAtWall === null) { try { audioSource.stop(); } catch { /* ignore */ } }
  if (bgVideo) { bgVideo.pause(); bgVideo.src = ""; }
  if (audioCtx) await audioCtx.close().catch(() => undefined);
  detachCanvas();
  return { blob, mimeType: recordedMimeType };
}

