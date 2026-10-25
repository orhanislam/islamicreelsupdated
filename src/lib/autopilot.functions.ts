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
}

export const DEFAULT_AUTOPILOT_CONFIG: AutopilotConfig = {
  enabled: true,
  scheduleTimes: ["09:00", "18:00"],
  videosPerRun: 2,
  contentMode: "explained_mix",
  autoDownloadOnOpen: true,
  webhookUrl: "",
  uploadPostEnabled: false,
  uploadPostApiKey: "",
  uploadPostUser: "",
  uploadPostPlatforms: ["tiktok"],
  lastRunStatus: "idle",
  lastRunMessage: "Готов за автоматично генериране по график.",
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
    uploadPostApiKey: typeof raw.uploadPostApiKey === "string" ? raw.uploadPostApiKey.trim() : "",
    uploadPostUser: typeof raw.uploadPostUser === "string" ? raw.uploadPostUser.trim() : "",
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
 * Direct Upload-Post.com API Integration (https://app.upload-post.com)
 * Sends the rendered MP4 video file + full TikTok caption directly to TikTok / Instagram / YouTube.
 */
export async function publishVideoViaUploadPostDirect(params: {
  jobId: string;
  mp4FilePath: string;
  title: string;
  caption: string;
  apiKey?: string;
  user?: string;
  platforms?: Array<"tiktok" | "instagram" | "youtube">;
}): Promise<{
  published: boolean;
  status?: number;
  requestId?: string;
  error?: string;
}> {
  const cfg = await readAutopilotConfigDirect();
  const rawKey = (params.apiKey ?? cfg.uploadPostApiKey ?? "").trim().replace(/^Apikey\s+/i, "");
  const userHandle = (params.user ?? cfg.uploadPostUser ?? "").trim();
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
    const fs = (await import("fs")).promises;
    const fileBuf = await fs.readFile(params.mp4FilePath);
    const captionText = (params.caption || params.title || "Ислямска мъдрост").slice(0, 2200);

    const form = new FormData();
    form.append("user", userHandle);
    form.append("title", captionText);
    for (const p of platforms) {
      form.append("platform[]", p);
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
  const globalForAutopilot = globalThis as unknown as { __autopilotSchedulerStarted?: boolean };
  if (globalForAutopilot.__autopilotSchedulerStarted) return;
  globalForAutopilot.__autopilotSchedulerStarted = true;

  console.log("[autopilot-scheduler] 24/7 Zero-Click Autopilot Scheduler initialized.");

  const checkInterval = setInterval(async () => {
    try {
      const cfg = await readAutopilotConfigDirect();
      if (!cfg.enabled || isAutopilotCycleRunning) return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const currentHm = `${hh}:${mm}`;
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const slotKey = `${dateKey}_${currentHm}`;

      if (cfg.scheduleTimes.includes(currentHm) && cfg.lastRunScheduleSlot !== slotKey) {
        console.log(`[autopilot-scheduler] Scheduled slot ${slotKey} matched! Launching autonomous cycle...`);
        await writeAutopilotConfigDirect({ lastRunScheduleSlot: slotKey });
        await runAutopilotCycleDirect({
          count: cfg.videosPerRun,
          contentMode: cfg.contentMode,
          triggerSource: "schedule",
        });
      }
    } catch (err) {
      console.error("[autopilot-scheduler] Check error:", err);
    }
  }, 30 * 1000);

  checkInterval?.unref?.();
}
