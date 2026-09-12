import { createServerFn } from "@tanstack/react-start";

export interface BuildCarouselVideoInput {
  slides?: {
    overlayBase64?: string;
    imageBase64?: string;
    videoUrl?: string;
    text?: string;
    topTitle?: string;
    quoteText?: string;
    commentaryText?: string;
    mainText?: string;
  }[];
  script?: string;
  title: string;
  tiktokTheme?: string;
  bRollUrls?: string[];
}

export const buildCarouselVideo = createServerFn({ method: "POST" })
  .validator((input: BuildCarouselVideoInput) => input)
  .handler(async ({ data }) => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    const { executeRenderTask } = await import("./render.functions");
    const { synthesizeHadithNarration } = await import("./tts.functions");
    const { fetchMultiSceneBRoll } = await import("./pexels.functions");

    const jobId = `reel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const displayTitle = (data.title || "Ислямско видео").trim();
    const safeFileTitle = displayTitle.replace(/[<>:"/\\|?*]+/g, "_").trim() || "islamic_video";

    // 1. Build cohesive, professional narration script from carousel content
    let narrationText = (data.script || "").trim();
    if (!narrationText && Array.isArray(data.slides)) {
      const parts: string[] = [];
      const seen = new Set<string>();

      for (const slide of data.slides) {
        const candidates = [slide.quoteText, slide.mainText, slide.commentaryText, slide.text]
          .filter((t): t is string => Boolean(t && typeof t === "string" && t.trim().length > 0));

        for (const text of candidates) {
          const clean = text
            .replace(/Продължава\s*👉?/gi, "")
            .replace(/👉/g, "")
            .replace(/Слайд\s*\d+/gi, "")
            .trim();
          if (clean && !seen.has(clean)) {
            seen.add(clean);
            parts.push(clean);
          }
        }
      }

      narrationText = parts.join(". ").replace(/\s+/g, " ").replace(/\.+/g, ".").trim();
    }

    if (!narrationText) {
      narrationText = displayTitle;
    }

    console.log(`[carousel-video] Starting professional video render for "${displayTitle}". Narration length: ${narrationText.length}`);

    // 2. Synthesize authentic voiceover narration with exact word-level timings
    const narr = await synthesizeHadithNarration({ data: { text: narrationText } });
    const audioUrl = `data:${narr.mimeType || "audio/mp3"};base64,${narr.base64}`;

    // 3. Collect & fetch dynamic, context-aware, Salafi-compliant B-Roll scenes
    let bRollClips: string[] = [];
    if (Array.isArray(data.bRollUrls) && data.bRollUrls.length > 0) {
      bRollClips = data.bRollUrls.filter((u) => typeof u === "string" && u.startsWith("http"));
    }

    if (bRollClips.length < 2 && Array.isArray(data.slides)) {
      for (const slide of data.slides) {
        if (slide.videoUrl && typeof slide.videoUrl === "string" && slide.videoUrl.startsWith("http")) {
          if (!bRollClips.includes(slide.videoUrl)) {
            bRollClips.push(slide.videoUrl);
          }
        }
      }
    }

    if (bRollClips.length < 2) {
      try {
        const bRollRes = await fetchMultiSceneBRoll({
          data: {
            query: "islamic calm nature peaceful cinematic landscape",
            text: narrationText,
          },
        });
        if (bRollRes.clips && bRollRes.clips.length > 0) {
          bRollClips = bRollRes.clips;
        }
      } catch (e) {
        console.warn("[carousel-video] fetchMultiSceneBRoll fallback:", e);
      }
    }

    const fallbackBg =
      "https://videos.pexels.com/video-files/30054113/12891205_1080_1920_30fps.mp4";
    const primaryBg = bRollClips[0] || fallbackBg;

    // 4. Render using the battle-tested executeRenderTask engine
    const primaryDir = path.join(os.homedir(), ".islamicreels_jobs");
    await fs.mkdir(primaryDir, { recursive: true });
    const targetMp4 = path.join(primaryDir, `${jobId}.mp4`);

    await executeRenderTask({
      data: {
        backgroundUrl: primaryBg,
        backgroundVideoUrl: primaryBg,
        bRollUrls: bRollClips.length > 1 ? bRollClips : undefined,
        bulgarian: narrationText,
        bulgarianWordTimings: narr.wordTimings,
        reference: displayTitle,
        viralTitle: displayTitle,
        subtitlePosition: "middle",
        subtitleSlicingMode: "phrase",
        pacingMode: "punchy",
        tiktokTheme: data.tiktokTheme || "hormozi",
        audioUrl,
        requireAudio: true,
        quality: "1080p",
        targetOutputPath: targetMp4,
      },
    });

    const finalFilename = `${safeFileTitle}.mp4`;
    const downloadUrl = `/api/download/${jobId}?filename=${encodeURIComponent(finalFilename)}`;

    // 5. Register in jobs.json so it immediately appears in the Downloads tab
    try {
      const jobsFile = path.join(primaryDir, "jobs.json");
      let jobs: any[] = [];
      try {
        const raw = await fs.readFile(jobsFile, "utf-8");
        jobs = JSON.parse(raw);
        if (!Array.isArray(jobs)) jobs = [];
      } catch {}

      jobs.unshift({
        id: jobId,
        title: displayTitle || "Ислямско видео от карусел",
        status: "completed",
        createdAt: Date.now(),
        completedAt: Date.now(),
        downloadUrl,
      });
      await fs.writeFile(jobsFile, JSON.stringify(jobs.slice(0, 100), null, 2));
    } catch (jobsErr) {
      console.warn("[carousel-video] Could not record in jobs.json:", jobsErr);
    }

    return {
      success: true,
      jobId,
      title: displayTitle,
      downloadUrl,
    };
  });
