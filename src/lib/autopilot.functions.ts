import { createServerFn } from "@tanstack/react-start";
import { getJobsDir } from "./render.functions";
import { createTask, updateTask } from "./tasks-engine";
import { getNextTawheedTopic } from "./tawheed-taxonomy";
import { readAiMemory } from "./memory.functions";
import { auditAndRefineProposal } from "./smart-script-auditor";
import { generateTikTokSEOTitle, formatViralSocialCaption } from "./caption.functions";
import { sanitizeTheologicalRespect } from "./theological-sanitizer";

export interface AutopilotHistoryEntry {
  id: string;
  timestamp: number;
  triggerSource: "schedule" | "manual";
  count: number;
  titles: string[];
  jobIds: string[];
  status: "completed" | "failed";
  error?: string;
}

export interface AutopilotConfig {
  enabled: boolean;
  scheduleTimes: string[]; // Format: ["09:00", "18:00"]
  videosPerRun: number; // 1 to 5
  contentMode: "explained_mix" | "quran_only" | "hadith_only";
  autoDownloadOnOpen: boolean;
  webhookUrl: string;
  uploadPostEnabled: boolean;
  uploadPostApiKey: string;
  uploadPostUser: string;
  uploadPostPlatforms: Array<"tiktok" | "instagram" | "youtube">;
  lastRunAt?: number;
  lastRunScheduleSlot?: string;
  lastRunStatus?: "idle" | "running" | "completed" | "failed";
  lastRunMessage?: string;
  totalAutopilotVideos: number;
  historyLog: AutopilotHistoryEntry[];
  timezone?: string; // "Europe/Sofia"
  serverBulgarianTime?: string;
  serverBulgarianFullText?: string;
  nextScheduledRunText?: string;
}

/**
 * Bulgarian Time Helper (Europe/Sofia timezone: EET/EEST, UTC+2 / UTC+3).
 * Guarantees 100% accurate Bulgarian local time regardless of VPS host timezone (e.g. CET/UTC).
 */
export function getBulgarianTime(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  const hourNum = parseInt(hour, 10);
  const minNum = parseInt(minute, 10);
  const totalMinutes = hourNum * 60 + minNum;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    hourNum,
    minNum,
    totalMinutes,
    timeHm: `${hour}:${minute}`,
    dateKey: `${year}-${month}-${day}`,
    slotKey: (slotHm: string) => `${year}-${month}-${day}_${slotHm}`,
    fullText: `${day}.${month}.${year} г., ${hour}:${minute}:${second} ч. (Българско време, Europe/Sofia)`,
  };
}

/**
 * Calculates the next upcoming scheduled slot in Bulgarian time and human-readable countdown text.
 */
export function getNextBulgarianRun(
  scheduleTimes: string[],
  date: Date = new Date(),
): {
  nextTime: string;
  isToday: boolean;
  minutesRemaining: number;
  formattedText: string;
} | null {
  if (!scheduleTimes || scheduleTimes.length === 0) return null;
  const bg = getBulgarianTime(date);
  const sortedTimes = [...scheduleTimes].sort();

  for (const time of sortedTimes) {
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const slotMins = h * 60 + m;
    if (slotMins > bg.totalMinutes) {
      const remaining = slotMins - bg.totalMinutes;
      const remH = Math.floor(remaining / 60);
      const remM = remaining % 60;
      const remText = remH > 0 ? `${remH} ч. и ${remM} мин.` : `${remM} мин.`;
      return {
        nextTime: time,
        isToday: true,
        minutesRemaining: remaining,
        formattedText: `Днес в ${time} ч. (след ~${remText})`,
      };
    }
  }

  const firstTomorrow = sortedTimes[0];
  const [fh, fm] = firstTomorrow.split(":").map(Number);
  const slotMinsTomorrow = 1440 - bg.totalMinutes + (fh * 60 + fm);
  const remH = Math.floor(slotMinsTomorrow / 60);
  const remM = slotMinsTomorrow % 60;
  const remText = remH > 0 ? `${remH} ч. и ${remM} мин.` : `${remM} мин.`;
  return {
    nextTime: firstTomorrow,
    isToday: false,
    minutesRemaining: slotMinsTomorrow,
    formattedText: `Утре в ${firstTomorrow} ч. (след ~${remText})`,
  };
}

export const DEFAULT_UPLOAD_POST_API_KEY =
  (typeof process !== "undefined" && process.env?.UPLOAD_POST_API_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5heWRlbnRhc2hrb3ZAZ21haWwuY29tIiwiZXhwIjo0OTQ2NTcwMTE5LCJqdGkiOiJkY2U1Yzg3Yi03NzQ2LTRlOWEtYjg2ZS1lYzdkNjk1MjBjOTcifQ.SQviBwJALtBFxyEG7pL2Aou09bRpE2LqRyySdJ7gVlE";

export const DEFAULT_UPLOAD_POST_USER =
  (typeof process !== "undefined" && process.env?.UPLOAD_POST_USER) || "default";

export const DEFAULT_AUTOPILOT_CONFIG: AutopilotConfig = {
  enabled: true,
  scheduleTimes: ["09:00", "18:00"],
  videosPerRun: 2,
  contentMode: "explained_mix",
  autoDownloadOnOpen: true,
  webhookUrl: "",
  uploadPostEnabled: true,
  uploadPostApiKey: DEFAULT_UPLOAD_POST_API_KEY,
  uploadPostUser: DEFAULT_UPLOAD_POST_USER,
  uploadPostPlatforms: ["tiktok"],
  lastRunStatus: "idle",
  lastRunMessage: "Готов за автоматично генериране и публикуване в TikTok (@orhan.islam).",
  totalAutopilotVideos: 0,
  historyLog: [],
};

let configWriteLock: Promise<any> = Promise.resolve();

function withConfigLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = configWriteLock.then(
    () => fn(),
    () => fn(),
  );
  configWriteLock = next.catch(() => {});
  return next;
}

async function getAutopilotConfigFilePath(): Promise<string> {
  const path = await import("path");
  const dir = await getJobsDir();
  return path.join(dir, "autopilot_config.json");
}

function normalizeConfig(raw: Partial<AutopilotConfig> | null | undefined): AutopilotConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_AUTOPILOT_CONFIG, historyLog: [] };
  }
  const scheduleTimes = Array.isArray(raw.scheduleTimes)
    ? raw.scheduleTimes
        .map((t) => String(t || "").trim())
        .filter((t) => /^\d{2}:\d{2}$/.test(t))
    : DEFAULT_AUTOPILOT_CONFIG.scheduleTimes;

  const videosPerRun = Math.min(5, Math.max(1, Number(raw.videosPerRun) || DEFAULT_AUTOPILOT_CONFIG.videosPerRun));
  const contentMode =
    raw.contentMode === "quran_only" || raw.contentMode === "hadith_only" || raw.contentMode === "explained_mix"
      ? raw.contentMode
      : "explained_mix";

  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_AUTOPILOT_CONFIG.enabled,
    scheduleTimes: scheduleTimes.length > 0 ? scheduleTimes : ["09:00"],
    videosPerRun,
    contentMode,
    autoDownloadOnOpen:
      typeof raw.autoDownloadOnOpen === "boolean"
        ? raw.autoDownloadOnOpen
        : DEFAULT_AUTOPILOT_CONFIG.autoDownloadOnOpen,
    webhookUrl: typeof raw.webhookUrl === "string" ? raw.webhookUrl.trim() : "",
    uploadPostEnabled:
      typeof raw.uploadPostEnabled === "boolean"
        ? raw.uploadPostEnabled
        : DEFAULT_AUTOPILOT_CONFIG.uploadPostEnabled,
    uploadPostApiKey:
      typeof raw.uploadPostApiKey === "string" && raw.uploadPostApiKey.trim().length > 0
        ? raw.uploadPostApiKey.trim()
        : DEFAULT_UPLOAD_POST_API_KEY,
    uploadPostUser:
      typeof raw.uploadPostUser === "string" && raw.uploadPostUser.trim().length > 0
        ? raw.uploadPostUser.trim()
        : DEFAULT_UPLOAD_POST_USER,
    uploadPostPlatforms:
      Array.isArray(raw.uploadPostPlatforms) && raw.uploadPostPlatforms.length > 0
        ? (raw.uploadPostPlatforms.filter((p) =>
            p === "tiktok" || p === "instagram" || p === "youtube",
          ) as Array<"tiktok" | "instagram" | "youtube">)
        : ["tiktok"],
    lastRunAt: typeof raw.lastRunAt === "number" ? raw.lastRunAt : undefined,
    lastRunScheduleSlot: typeof raw.lastRunScheduleSlot === "string" ? raw.lastRunScheduleSlot : undefined,
    lastRunStatus: raw.lastRunStatus || "idle",
    lastRunMessage: raw.lastRunMessage || DEFAULT_AUTOPILOT_CONFIG.lastRunMessage,
    totalAutopilotVideos: Number(raw.totalAutopilotVideos) || 0,
    historyLog: Array.isArray(raw.historyLog) ? raw.historyLog.slice(0, 30) : [],
    timezone: "Europe/Sofia",
    serverBulgarianTime: getBulgarianTime().timeHm,
    serverBulgarianFullText: getBulgarianTime().fullText,
    nextScheduledRunText: getNextBulgarianRun(scheduleTimes)?.formattedText || "Няма зададен час",
  };
}

export async function readAutopilotConfigDirect(): Promise<AutopilotConfig> {
  try {
    const fs = (await import("fs")).promises;
    const filePath = await getAutopilotConfigFilePath();
    const txt = await fs.readFile(filePath, "utf-8");
    return normalizeConfig(JSON.parse(txt));
  } catch {
    return { ...DEFAULT_AUTOPILOT_CONFIG, historyLog: [] };
  }
}

export async function writeAutopilotConfigDirect(
  updates: Partial<AutopilotConfig>,
): Promise<AutopilotConfig> {
  return withConfigLock(async () => {
    const fs = (await import("fs")).promises;
    const filePath = await getAutopilotConfigFilePath();
    let current = { ...DEFAULT_AUTOPILOT_CONFIG, historyLog: [] };
    try {
      const txt = await fs.readFile(filePath, "utf-8");
      current = normalizeConfig(JSON.parse(txt));
    } catch {
      // File may not exist yet
    }
    const merged = normalizeConfig({
      ...current,
      ...updates,
    });
    const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    await fs.writeFile(tmpPath, JSON.stringify(merged, null, 2), "utf-8");
    await fs.rename(tmpPath, filePath);
    return merged;
  });
}

export const getAutopilotConfig = createServerFn({ method: "POST" }).handler(async () => {
  return await readAutopilotConfigDirect();
});

export const updateAutopilotConfig = createServerFn({ method: "POST" })
  .validator((input: Partial<AutopilotConfig>) => input)
  .handler(async ({ data }) => {
    return await writeAutopilotConfigDirect(data);
  });

export interface WebhookDispatchPayload {
  event: "video_completed" | "webhook_test";
  jobId: string;
  title: string;
  seoTitle: string;
  caption: string;
  downloadUrl: string;
  videoUrl?: string;
  isAutopilot?: boolean;
  completedAt: number;
}

export async function dispatchAutopilotWebhookDirect(
  payload: WebhookDispatchPayload,
  overrideWebhookUrl?: string,
): Promise<{ sent: boolean; status?: number; error?: string }> {
  const config = await readAutopilotConfigDirect();
  const targetUrl = (overrideWebhookUrl ?? config.webhookUrl ?? "").trim();
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return { sent: false, error: "Няма конфигуриран валиден Webhook URL." };
  }

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "IslamicReelsStudio-Autopilot/2.0",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { sent: false, status: res.status, error: `HTTP статус ${res.status}` };
    }
    return { sent: true, status: res.status };
  } catch (err: any) {
    return { sent: false, error: String(err?.message || err) };
  }
}

export const testAutopilotWebhook = createServerFn({ method: "POST" })
  .validator((input?: { webhookUrl?: string }) => input || {})
  .handler(async ({ data }) => {
    const sampleTitle = "[Коран 13:28] Покоят на сърцата при споменаването на Аллах";
    const seoTitle = generateTikTokSEOTitle(sampleTitle);
    const caption = formatViralSocialCaption(sampleTitle, undefined, {
      title: sampleTitle,
      hookQuestion: "Защо усещате необяснима тежест в гърдите си, дори когато привидно имате всичко?",
      dalilText:
        "Онези, които вярват и сърцата им се успокояват при споменаването на Аллах. А нима не със споменаването на Аллах се успокояват сърцата?",
      explanation:
        "Човешкото сърце е сътворено така, че намира истински покой и сигурност единствено в споменаването на Единствения Творец и Таухида.",
      actionStep: "Кажете искрено „Субханаллах“ и споделете това видео за садака джария!",
      isQuran: true,
    });

    return await dispatchAutopilotWebhookDirect(
      {
        event: "webhook_test",
        jobId: `test_job_${Date.now()}`,
        title: sampleTitle,
        seoTitle,
        caption,
        downloadUrl: "/api/download/test_job",
        videoUrl: "/api/download/test_job?inline=1",
        isAutopilot: true,
        completedAt: Date.now(),
      },
      data?.webhookUrl,
    );
  });

/**
 * Ensures any MP4 file sent to Upload-Post / TikTok Direct Post API is encoded
 * in True H.264 High Profile (High@L4.1, 1080x1920, CABAC, B-frames, <=12 Mbps sweet spot)
 * and has the viral cover art attached as the MP4 container's official poster image
 * (stream disposition attached_pic), so TikTok and video galleries display the viral thumbnail.
 */
async function ensureHighProfileMasterForUploadPost(
  mp4FilePath: string,
  coverImagePath?: string,
): Promise<void> {
  try {
    const { execFile } = await import("child_process");
    const util = await import("util");
    const fs = (await import("fs")).promises;
    const execFileAsync = util.promisify(execFile);

    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=profile,width,height,bit_rate",
      "-of",
      "json",
      mp4FilePath,
    ]);
    const info = JSON.parse(stdout || "{}");
    const stream = info?.streams?.[0];
    if (!stream) return;

    const profile = String(stream.profile || "");
    const width = Number(stream.width) || 0;
    const height = Number(stream.height) || 0;
    const bitRate = Number(stream.bit_rate) || 0;

    const hasCoverImage = Boolean(coverImagePath && (await fs.stat(coverImagePath).catch(() => null)));

    const isOptimalHighProfile =
      profile.toLowerCase().includes("high") &&
      width === 1080 &&
      height === 1920 &&
      (bitRate === 0 || bitRate <= 13_500_000);

    let ffmpegPath = "ffmpeg";
    try {
      const installerMod = await import("@ffmpeg-installer/ffmpeg");
      const installer = installerMod.default || installerMod;
      if (installer?.path) ffmpegPath = installer.path;
    } catch {}

    if (isOptimalHighProfile) {
      // If already optimal 1080p High profile, check if attached_pic cover art is already present
      if (hasCoverImage && coverImagePath) {
        try {
          const { stdout: probeStreams } = await execFileAsync("ffprobe", [
            "-v",
            "error",
            "-show_entries",
            "stream=index,codec_name,disposition",
            "-of",
            "json",
            mp4FilePath,
          ]);
          const probeJson = JSON.parse(probeStreams || "{}");
          const alreadyHasCover = (probeJson.streams || []).some(
            (s: any) => s.disposition?.attached_pic === 1 || s.codec_name === "mjpeg",
          );
          if (!alreadyHasCover) {
            console.log(
              `[upload-post] Embedding viral cover image into MP4 container as attached_pic: ${mp4FilePath}`,
            );
            const coverMuxedPath = `${mp4FilePath}.with_cover.mp4`;
            await execFileAsync(ffmpegPath, [
              "-y",
              "-i",
              mp4FilePath,
              "-i",
              coverImagePath,
              "-map",
              "0:v:0",
              "-map",
              "0:a?",
              "-map",
              "1:v:0",
              "-c",
              "copy",
              "-disposition:v:1",
              "attached_pic",
              coverMuxedPath,
            ]);
            const statMux = await fs.stat(coverMuxedPath).catch(() => null);
            if (statMux && statMux.size > 50_000) {
              await fs.rename(coverMuxedPath, mp4FilePath);
            } else {
              await fs.unlink(coverMuxedPath).catch(() => {});
            }
          }
        } catch (embedErr) {
          console.warn("[upload-post] MP4 cover stream embedding non-fatal warning:", embedErr);
        }
      }
      return;
    }

    console.log(
      `[upload-post] Remastering ${mp4FilePath} from (${profile}, ${width}x${height}, ${(bitRate / 1e6).toFixed(1)} Mbps) -> High@L4.1 1080p HD with cover art...`,
    );

    const remasteredPath = `${mp4FilePath}.hq_remaster.mp4`;
    const ffmpegArgs = [
      "-y",
      "-i",
      mp4FilePath,
    ];

    if (hasCoverImage && coverImagePath) {
      ffmpegArgs.push("-i", coverImagePath);
    }

    ffmpegArgs.push(
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,unsharp=3:3:0.35:3:3:0.0",
      "-c:v",
      "libx264",
      "-tag:v",
      "avc1",
      "-preset",
      "veryfast",
      "-profile:v",
      "high",
      "-level",
      "4.1",
      "-pix_fmt",
      "yuv420p",
      "-colorspace",
      "bt709",
      "-color_trc",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_range",
      "tv",
      "-movflags",
      "+faststart",
      "-crf",
      "17",
      "-maxrate",
      "10M",
      "-bufsize",
      "20M",
      "-refs",
      "3",
      "-bf",
      "3",
      "-g",
      "60",
      "-keyint_min",
      "60",
      "-sc_threshold",
      "0",
      "-x264-params",
      "aq-mode=3:aq-strength=0.9",
      "-c:a",
      "aac",
      "-b:a",
      "256k",
      "-ar",
      "48000",
      "-ac",
      "2",
    );

    if (hasCoverImage && coverImagePath) {
      ffmpegArgs.push(
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-map",
        "1:v:0",
        "-c:v:1",
        "copy",
        "-disposition:v:1",
        "attached_pic",
      );
    }

    ffmpegArgs.push(remasteredPath);
    await execFileAsync(ffmpegPath, ffmpegArgs);

    const stat = await fs.stat(remasteredPath).catch(() => null);
    if (stat && stat.size > 50_000) {
      await fs.rename(remasteredPath, mp4FilePath);
      console.log(
        `[upload-post] Remastered ${mp4FilePath} to High@L4.1 1080p with cover art (${(stat.size / (1024 * 1024)).toFixed(1)} MB).`,
      );
    } else {
      await fs.unlink(remasteredPath).catch(() => {});
    }
  } catch (err) {
    console.warn("[upload-post] Pre-upload High-Profile check skipped:", err);
  }
}

/**
 * Stages a local cover image on Upload-Post's Cloudflare R2 infrastructure
 * via Upload-Post MCP staging endpoints (create_media_upload -> PUT -> complete_media_upload).
 * Returns the signed public HTTPS media_url (valid for 6 hours) that can be passed to
 * tiktokCoverImageUrl, instagramCoverUrl, and youtubeThumbnailUrl.
 */
export async function stageCoverImageViaUploadPostDirect(params: {
  coverBuffer: Buffer;
  apiKey: string;
}): Promise<string | null> {
  const rawKey = params.apiKey.trim().replace(/^ApiKey\s+/i, "");
  if (!rawKey) return null;

  try {
    const initRes = await fetch("https://mcp.upload-post.com/mcp", {
      method: "POST",
      headers: {
        Authorization: "ApiKey " + rawKey,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "islamic-reels", version: "1" },
        },
      }),
    });
    const sessionId = initRes.headers.get("mcp-session-id");

    const createRes = await fetch("https://mcp.upload-post.com/mcp", {
      method: "POST",
      headers: {
        Authorization: "ApiKey " + rawKey,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "create_media_upload",
          arguments: {
            filename: "cover.jpg",
            contentType: "image/jpeg",
            contentLength: params.coverBuffer.length,
            mediaType: "image",
          },
        },
      }),
    });

    const createText = await createRes.text();
    const match = createText.match(/data:\s*(\{.*\})/);
    if (!match) return null;
    const data = JSON.parse(match[1]);
    const parsed = data?.result?.structuredContent?.result;
    if (!parsed || !parsed.upload_url || !parsed.upload_id) return null;

    // PUT cover bytes to presigned Cloudflare R2 URL
    const putRes = await fetch(parsed.upload_url, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: new Uint8Array(params.coverBuffer),
    });
    if (!putRes.ok) return null;

    // Complete media upload to get signed public media_url
    const compRes = await fetch("https://mcp.upload-post.com/mcp", {
      method: "POST",
      headers: {
        Authorization: "ApiKey " + rawKey,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "complete_media_upload",
          arguments: {
            uploadId: parsed.upload_id,
          },
        },
      }),
    });

    const compText = await compRes.text();
    const compMatch = compText.match(/data:\s*(\{.*\})/);
    if (!compMatch) return null;
    const compData = JSON.parse(compMatch[1]);
    const mediaUrl = compData?.result?.structuredContent?.result?.media_url;
    if (mediaUrl) {
      console.log(`[upload-post] Staged viral cover image on Cloudflare R2: ${mediaUrl.slice(0, 80)}...`);
      return mediaUrl;
    }
  } catch (err) {
    console.warn("[upload-post] Failed to stage cover image via MCP:", err);
  }
  return null;
}

/**
 * Direct Upload-Post.com API Integration (https://app.upload-post.com)
 * Sends the rendered MP4 video file + full TikTok caption directly to TikTok / Instagram / YouTube,
 * automatically creating, staging, and attaching the viral cover thumbnail.
 */
export async function publishVideoViaUploadPostDirect(params: {
  jobId: string;
  mp4FilePath: string;
  title: string;
  caption: string;
  apiKey?: string;
  user?: string;
  platforms?: Array<"tiktok" | "instagram" | "youtube">;
  coverImagePath?: string;
  scheduledDate?: string | Date | number;
  timezone?: string;
}): Promise<{
  published: boolean;
  status?: number;
  requestId?: string;
  error?: string;
  coverStaged?: boolean;
  coverMediaUrl?: string;
}> {
  const cfg = await readAutopilotConfigDirect();
  const rawKey = (
    params.apiKey !== undefined ? params.apiKey : cfg.uploadPostApiKey || DEFAULT_UPLOAD_POST_API_KEY
  )
    .trim()
    .replace(/^ApiKey\s+/i, "");
  const userHandle = (
    params.user !== undefined ? params.user : cfg.uploadPostUser || DEFAULT_UPLOAD_POST_USER
  ).trim();
  const platforms =
    params.platforms && params.platforms.length > 0
      ? params.platforms
      : cfg.uploadPostPlatforms?.length > 0
      ? cfg.uploadPostPlatforms
      : (["tiktok"] as Array<"tiktok" | "instagram" | "youtube">);

  if (!rawKey) {
    return { published: false, error: "Липсва Upload-Post API Key." };
  }
  if (!userHandle) {
    return { published: false, error: "Липсва Upload-Post профил (user)." };
  }

  try {
    // 1. Generate or load server viral thumbnail for this job
    let coverPath = params.coverImagePath;
    let coverBuf: Buffer | null = null;
    let stagedCoverUrl: string | null = null;

    try {
      const { ensureJobThumbnailOnDisk } = await import("./thumbnail.functions");
      const thumbInfo = await ensureJobThumbnailOnDisk({
        jobId: params.jobId,
        title: params.title,
      });
      coverPath = thumbInfo.filePath;
      coverBuf = thumbInfo.buffer;
    } catch (tErr) {
      console.warn("[upload-post] Thumbnail retrieval non-fatal warning:", tErr);
    }

    // 2. Embed cover art into MP4 file & ensure 1080p High@L4.1 master profile
    await ensureHighProfileMasterForUploadPost(params.mp4FilePath, coverPath);

    // 3. Stage cover image on Upload-Post Cloudflare R2 infrastructure
    if (coverBuf && rawKey) {
      stagedCoverUrl = await stageCoverImageViaUploadPostDirect({
        coverBuffer: coverBuf,
        apiKey: rawKey,
      });
    }

    const fs = (await import("fs")).promises;
    const fileBuf = await fs.readFile(params.mp4FilePath);
    const captionText = (params.caption || params.title || "Ислямска мъдрост").slice(0, 2200);

    const form = new FormData();
    form.append("user", userHandle);
    form.append("title", captionText);
    for (const p of platforms) {
      form.append("platform[]", p);
    }
    if (platforms.includes("tiktok")) {
      form.append("privacy_level", "PUBLIC_TO_EVERYONE");
      form.append("post_mode", "DIRECT_POST");
      form.append("disable_duet", "false");
      form.append("disable_comment", "false");
      form.append("disable_stitch", "false");
      form.append("cover_timestamp", "0");
    }

    if (params.scheduledDate) {
      const scheduledIso = new Date(params.scheduledDate).toISOString();
      form.append("scheduled_date", scheduledIso);
      form.append("timezone", params.timezone || "Europe/Sofia");
    }

    if (stagedCoverUrl) {
      form.append("cover_image_url", stagedCoverUrl);
      form.append("tiktok_cover_image_url", stagedCoverUrl);
      form.append("tiktokCoverImageUrl", stagedCoverUrl);
      form.append("instagram_cover_url", stagedCoverUrl);
      form.append("youtube_thumbnail_url", stagedCoverUrl);
    }

    if (coverBuf) {
      const coverBlob = new Blob([new Uint8Array(coverBuf)], { type: "image/jpeg" });
      form.append("cover", coverBlob, `${params.jobId || "islamic_reel"}_cover.jpg`);
      form.append("cover_image", coverBlob, `${params.jobId || "islamic_reel"}_cover.jpg`);
      form.append("thumbnail", coverBlob, `${params.jobId || "islamic_reel"}_cover.jpg`);
    }

    const blob = new Blob([new Uint8Array(fileBuf)], { type: "video/mp4" });
    form.append("video", blob, `${params.jobId || "islamic_reel"}.mp4`);

    const res = await fetch("https://api.upload-post.com/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Apikey ${rawKey}`,
      },
      body: form,
    });

    let bodyJson: any = null;
    try {
      bodyJson = await res.json();
    } catch {
      // Ignore non-JSON body
    }

    if (!res.ok || (bodyJson && bodyJson.success === false)) {
      const errDetail = bodyJson?.message || bodyJson?.error || `HTTP ${res.status}`;
      return { published: false, status: res.status, error: String(errDetail) };
    }

    return {
      published: true,
      status: res.status,
      requestId: bodyJson?.request_id || bodyJson?.id,
      coverStaged: Boolean(stagedCoverUrl),
      coverMediaUrl: stagedCoverUrl || undefined,
    };
  } catch (err: any) {
    return {
      published: false,
      error: String(err?.message || err),
    };
  }
}

export const publishServerJobToUploadPost = createServerFn({ method: "POST" })
  .validator(
    (input: {
      jobId: string;
      apiKey?: string;
      user?: string;
      platforms?: Array<"tiktok" | "instagram" | "youtube">;
    }) => input,
  )
  .handler(async ({ data }) => {
    const path = await import("path");
    const fs = (await import("fs")).promises;
    const dir = await getJobsDir();
    const mp4Path = path.join(dir, `${data.jobId}.mp4`);

    await fs.access(mp4Path).catch(() => {
      throw new Error("MP4 файлът за това видео не е намерен на сървъра.");
    });

    const jobsFile = path.join(dir, "jobs.json");
    let jobTitle = "Ислямска мъдрост";
    let jobCaption = "";
    try {
      const jobs = JSON.parse(await fs.readFile(jobsFile, "utf-8"));
      const found = Array.isArray(jobs) ? jobs.find((j: any) => j.id === data.jobId) : null;
      if (found) {
        jobTitle = found.title || jobTitle;
        jobCaption = found.viralCaption || "";
      }
    } catch {}

    if (!jobCaption) {
      jobCaption = formatViralSocialCaption(jobTitle);
    }

    const res = await publishVideoViaUploadPostDirect({
      jobId: data.jobId,
      mp4FilePath: mp4Path,
      title: jobTitle,
      caption: jobCaption,
      apiKey: data.apiKey,
      user: data.user,
      platforms: data.platforms,
    });

    if (res.published) {
      try {
        const { withJobsLock } = await import("./render.functions");
        await withJobsLock(async () => {
          const jobs = JSON.parse(await fs.readFile(jobsFile, "utf-8"));
          const idx = Array.isArray(jobs) ? jobs.findIndex((j: any) => j.id === data.jobId) : -1;
          if (idx !== -1) {
            jobs[idx].tiktokPublished = true;
            jobs[idx].tiktokPublishRequestId = res.requestId;
            await fs.writeFile(jobsFile, JSON.stringify(jobs, null, 2), "utf-8");
          }
        });
      } catch {}
    }

    return res;
  });

export const verifyUploadPostAccount = createServerFn({ method: "POST" })
  .validator((input?: { apiKey?: string }) => input || {})
  .handler(async ({ data }) => {
    const cfg = await readAutopilotConfigDirect();
    const rawKey = (data?.apiKey || cfg.uploadPostApiKey || DEFAULT_UPLOAD_POST_API_KEY)
      .trim()
      .replace(/^ApiKey\s+/i, "");
    try {
      const res = await fetch("https://api.upload-post.com/api/uploadposts/users", {
        headers: {
          Authorization: `Apikey ${rawKey}`,
        },
      });
      const json: any = await res.json();
      if (!res.ok || !json?.success) {
        return {
          valid: false,
          error: json?.message || json?.error || `HTTP ${res.status}`,
        };
      }
      const firstProfile = Array.isArray(json.profiles) ? json.profiles[0] : null;
      const tiktokInfo = firstProfile?.social_accounts?.tiktok;
      return {
        valid: true,
        username: firstProfile?.username || "default",
        tiktokHandle: tiktokInfo?.handle || tiktokInfo?.display_name || "",
        plan: json.plan || "basic",
      };
    } catch (err: any) {
      return {
        valid: false,
        error: String(err?.message || err),
      };
    }
  });

const AUTOPILOT_SPIRITUAL_TOPICS = [
  "Покой на сърцето (Сакина) и избавление от тревогата чрез споменаване на Аллах",
  "Търпение (Сабр) при тежки изпитания и скритата Божествена милост",
  "Упование в Единствения Творец (Тауаккул) и свобода от страха за бъдещето",
  "Силата на искрената Дуа в последната третина на нощта",
  "Искрено покаяние (Тауба Насуха) и безграничната прошка на Всемилостивия",
  "Благодарност (Шукр) и обещаното умножаване на берекета и препитанието (Ризк)",
  "Опазване на границите на Аллах и Неговата закрила над вярващия",
  "Преходността на земния живот (Дуня) и подготовка за вечния Ахирет",
  "Чистота на намерението (Ихляс) и дела, които водят към Дженнета",
  "Опазване на езика и благороден нрав според Сунната на Пратеника ﷺ",
];

let isAutopilotCycleRunning = false;

export async function runAutopilotCycleDirect(options?: {
  count?: number;
  topic?: string;
  contentMode?: "explained_mix" | "quran_only" | "hadith_only";
  triggerSource?: "schedule" | "manual";
  skipRender?: boolean;
}): Promise<{
  success: boolean;
  count: number;
  jobIds: string[];
  titles: string[];
  proposals: any[];
  message: string;
}> {
  if (isAutopilotCycleRunning) {
    return {
      success: false,
      count: 0,
      jobIds: [],
      titles: [],
      proposals: [],
      message: "Автопилотът вече изпълнява активен цикъл в момента.",
    };
  }

  isAutopilotCycleRunning = true;
  const config = await readAutopilotConfigDirect();
  const count = Math.min(5, Math.max(1, Number(options?.count) || config.videosPerRun || 2));
  const contentMode = options?.contentMode || config.contentMode || "explained_mix";
  const triggerSource = options?.triggerSource || "manual";

  const task = await createTask(
    "autopilot_cycle",
    `🤖 Пълен Автопилот (${count} видеа)`,
    `Автономно избиране на теми, 100% Салафи одит и рендиране...`,
    { count, contentMode, triggerSource },
  );

  await writeAutopilotConfigDirect({
    lastRunAt: Date.now(),
    lastRunStatus: "running",
    lastRunMessage: `Генериране и рендиране на ${count} видеа в ход...`,
  });

  const jobIds: string[] = [];
  const titles: string[] = [];
  const generatedProposals: any[] = [];

  try {
    await updateTask(task.id, {
      status: "processing",
      progress: 10,
      message: "Избор на уникални теми от Корана и Сунната (30-дневен филтър)...",
    });

    const {
      generateExplainedVideoProposalDirect,
      confirmAndGenerateVideo,
      getHistoryFilePath,
    } = await import("./assistant.functions");

    const memory = await readAiMemory();
    const recentIds = (memory.usageHistory || []).map((u) => u.identifier);
    const tawheedSuggestion = getNextTawheedTopic(recentIds);

    for (let i = 0; i < count; i++) {
      const sourcePreference: "auto" | "quran" | "hadith" =
        contentMode === "quran_only"
          ? "quran"
          : contentMode === "hadith_only"
          ? "hadith"
          : i % 2 === 0
          ? "quran"
          : "hadith";

      const rotatingTopic =
        options?.topic ||
        (i === 0 && tawheedSuggestion?.subtopicBg
          ? `${tawheedSuggestion.subtopicBg} (${tawheedSuggestion.TitleBg})`
          : AUTOPILOT_SPIRITUAL_TOPICS[(Date.now() + i * 3) % AUTOPILOT_SPIRITUAL_TOPICS.length]);

      const stepPct = Math.round(15 + (i / count) * 75);
      await updateTask(task.id, {
        progress: stepPct,
        message: `[${i + 1}/${count}] Изготвяне и 100% одит на ${sourcePreference === "quran" ? "Коран с Тефсир ас-Са'ди" : "Сахих Хадис с Шарх"}...`,
      });

      const genRes = await generateExplainedVideoProposalDirect({
        topic: rotatingTopic,
        sourcePreference,
      });

      if (!genRes.proposal) {
        continue;
      }

      // Final 5-pass self-healing convergence guarantee before rendering
      const { proposal: auditedProposal, report } = auditAndRefineProposal(genRes.proposal as any, {
        maxPasses: 5,
      });
      auditedProposal.auditReport = report;
      generatedProposals.push(auditedProposal);
      titles.push(auditedProposal.title || `Ислямско видео #${i + 1}`);

      if (!options?.skipRender) {
        await updateTask(task.id, {
          progress: Math.min(95, stepPct + 15),
          message: `[${i + 1}/${count}] Автоматично озвучаване и стартиране на рендер: ${auditedProposal.title}`,
        });

        const renderRes = await confirmAndGenerateVideo({
          data: {
            proposal: auditedProposal as any,
            force: true,
            isAutopilot: true,
          },
        });

        if (renderRes?.jobId) {
          jobIds.push(renderRes.jobId);
        }
      } else {
        jobIds.push(`autopilot_dryrun_${Date.now()}_${i}`);
      }
    }

    // Append rich notification to AI Assistant chat history
    try {
      const fs = (await import("fs")).promises;
      const historyFile = await getHistoryFilePath();
      let history: any[] = [];
      try {
        history = JSON.parse(await fs.readFile(historyFile, "utf-8"));
      } catch {
        history = [];
      }

      const itemsSummary = generatedProposals
        .map((p, idx) => {
          const seoTitle = generateTikTokSEOTitle(p.title || "");
          return `${idx + 1}. **${ sanitizeTheologicalRespect(p.title || "") }**\n   📌 TikTok Заглавие: \`${seoTitle}\`\n   🛡️ Одит: 100% Салафи Акъида & Книжовен БГ (${p.auditReport?.auditPasses || 1} паса)`;
        })
        .join("\n\n");

      history.push({
        role: "assistant",
        text:
          `🤖 **Пълен Автопилот (${triggerSource === "schedule" ? "По график" : "Ръчен старт"}) завърши успешно!**\n\n` +
          `Системата автономно избра, провери чрез 5-степенния богословски и граматически одитор и изпрати за рендиране **${generatedProposals.length} видеа** (без нужда от ръчно одобрение):\n\n` +
          `${itemsSummary}\n\n` +
          `📥 Веднага щом рендирането завърши, видеата ще се свалят автоматично при отваряне на приложението и са достъпни с готови TikTok описания в раздел **[Изтегляния](/downloads)**.`,
        proposals: generatedProposals,
      });

      await fs.writeFile(historyFile, JSON.stringify(history, null, 2), "utf-8");
    } catch (histErr) {
      console.warn("[autopilot] Could not append to assistant chat history:", histErr);
    }

    const updatedHistoryLog: AutopilotHistoryEntry[] = [
      {
        id: `auto_${Date.now()}`,
        timestamp: Date.now(),
        triggerSource,
        count: generatedProposals.length,
        titles,
        jobIds,
        status: "completed" as const,
      },
      ...(config.historyLog || []),
    ].slice(0, 30);

    const doneMsg = `Успешно генерирани и изпратени за рендиране ${generatedProposals.length} видеа (${titles.join(", ")}).`;
    await writeAutopilotConfigDirect({
      lastRunAt: Date.now(),
      lastRunStatus: "completed",
      lastRunMessage: doneMsg,
      totalAutopilotVideos: (config.totalAutopilotVideos || 0) + generatedProposals.length,
      historyLog: updatedHistoryLog,
    });

    await updateTask(task.id, {
      status: "completed",
      progress: 100,
      message: `🤖 Автопилотът стартира рендирането на ${generatedProposals.length} видеа!`,
      result: { jobIds, titles },
    });

    return {
      success: true,
      count: generatedProposals.length,
      jobIds,
      titles,
      proposals: generatedProposals,
      message: doneMsg,
    };
  } catch (err: any) {
    const errMsg = String(err?.message || err || "Неизвестна грешка в Автопилота");
    console.error("[autopilot] Cycle failed:", err);

    const updatedHistoryLog: AutopilotHistoryEntry[] = [
      {
        id: `auto_${Date.now()}`,
        timestamp: Date.now(),
        triggerSource,
        count: 0,
        titles,
        jobIds,
        status: "failed" as const,
        error: errMsg,
      },
      ...(config.historyLog || []),
    ].slice(0, 30);

    await writeAutopilotConfigDirect({
      lastRunAt: Date.now(),
      lastRunStatus: "failed",
      lastRunMessage: `Грешка: ${errMsg}`,
      historyLog: updatedHistoryLog,
    });

    await updateTask(task.id, {
      status: "failed",
      progress: 100,
      error: errMsg,
      message: `Грешка в Автопилота: ${errMsg}`,
    });

    return {
      success: false,
      count: 0,
      jobIds,
      titles,
      proposals: generatedProposals,
      message: errMsg,
    };
  } finally {
    isAutopilotCycleRunning = false;
  }
}

export const triggerAutopilotCycleNow = createServerFn({ method: "POST" })
  .validator(
    (
      input?: {
        count?: number;
        topic?: string;
        contentMode?: "explained_mix" | "quran_only" | "hadith_only";
      },
    ) => input || {},
  )
  .handler(async ({ data }) => {
    // Run asynchronously so the UI receives an immediate response while the background task banner tracks progress
    setTimeout(() => {
      runAutopilotCycleDirect({
        count: data?.count,
        topic: data?.topic,
        contentMode: data?.contentMode,
        triggerSource: "manual",
      }).catch((e) => console.error("[autopilot] Manual trigger background error:", e));
    }, 20);

    return {
      started: true,
      message: "🤖 Пълният Автопилот стартира! Избира теми, одитира текста и пуска рендирането автоматично.",
    };
  });

export function initAutopilotScheduler() {
  if (typeof process === "undefined" || typeof window !== "undefined") return;
  const globalForAutopilot = globalThis as unknown as {
    __autopilotSchedulerStarted?: boolean;
    __autopilotCheckInterval?: any;
  };
  if (globalForAutopilot.__autopilotSchedulerStarted) return;
  globalForAutopilot.__autopilotSchedulerStarted = true;

  const bg = getBulgarianTime();
  console.log(
    `[autopilot-scheduler] 24/7 Zero-Click Autopilot Scheduler active! Current Bulgarian time: ${bg.fullText}`,
  );

  const checkInterval = setInterval(async () => {
    try {
      const cfg = await readAutopilotConfigDirect();
      if (!cfg.enabled || isAutopilotCycleRunning) return;

      const bgNow = getBulgarianTime();

      for (const slot of cfg.scheduleTimes) {
        const [sH, sM] = slot.split(":").map(Number);
        if (isNaN(sH) || isNaN(sM)) continue;
        const slotMinutes = sH * 60 + sM;
        const diff = (bgNow.totalMinutes - slotMinutes + 1440) % 1440;

        // Trigger if within a 3-minute grace window from the scheduled Bulgarian time
        if (diff >= 0 && diff <= 3) {
          const expectedSlotKey = bgNow.slotKey(slot);
          if (cfg.lastRunScheduleSlot !== expectedSlotKey) {
            console.log(
              `[autopilot-scheduler] 🇧🇬 Bulgarian slot ${slot} matched at ${bgNow.timeHm} (slotKey: ${expectedSlotKey})! Starting autonomous cycle...`,
            );
            await writeAutopilotConfigDirect({ lastRunScheduleSlot: expectedSlotKey });
            await runAutopilotCycleDirect({
              count: cfg.videosPerRun,
              contentMode: cfg.contentMode,
              triggerSource: "schedule",
            });
            break; // Fire at most one scheduled cycle per interval check
          }
        }
      }
    } catch (err) {
      console.error("[autopilot-scheduler] Bulgarian check error:", err);
    }
  }, 25 * 1000);

  globalForAutopilot.__autopilotCheckInterval = checkInterval;
  checkInterval?.unref?.();
}
