/**
 * Professional Social Media Caption Formatting Utility
 * TikTok SEO Expert + Salafi AI Shaykh (по манхаджа на ас-Саляф ас-Салих)
 * Generates broadcast-grade, high-conversion, search-indexed captions for
 * TikTok, Instagram Reels, and YouTube Shorts.
 */

import { sanitizeTheologicalRespect } from "./theological-sanitizer";

/**
 * Extracts the clean topic/theme from a proposal title.
 * Example: "[Коран 13:28] Покоят на сърцата" → "Покоят на сърцата"
 * Example: "Покоят на сърцата" → "Покоят на сърцата"
 */
export function extractTopicFromTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  // Strip leading bracketed citations like [Коран 13:28], [Сахих ал-Бухари #6424]
  let topic = rawTitle
    .replace(/^\s*\[[^\]]*\]\s*/g, "")
    .replace(/^[:\-–—•_━═─\s]+/, "")
    .trim();

  // Strip any long divider stripes or repeated hyphens/dashes (e.g. --------------------------- or ━━━━━━━━━━━━━━━━)
  topic = topic.replace(/[-–—_━═─]{2,}/g, " ").trim();

  // Replace standalone dashes used as separators (e.g. " - ", " — ", " – ") with clean bullet " • "
  topic = topic.replace(/\s+[-–—]+\s+/g, " • ").trim();

  // Fallback: split on "•" or "—"
  if (!topic && rawTitle.includes("•")) topic = rawTitle.split("•").slice(1).join("•").trim();
  if (!topic && rawTitle.includes("—")) topic = rawTitle.split("—").slice(1).join("—").trim();

  // Clean trailing punctuation
  topic = topic.replace(/[:\-–—•_━═─\s]+$/, "").trim();

  return topic || rawTitle.trim();
}

/**
 * Extracts the citation/reference block from a title.
 * Example: "[Коран 13:28] Покоят на сърцата" → "[Коран 13:28]"
 * Example: "Покоят на сърцата" → ""
 */
export function extractCitationFromTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  const match = rawTitle.match(/^\s*(\[[^\]]+\])/);
  return match ? match[1].trim() : "";
}

/**
 * Generates an elite TikTok-search-optimized SEO headline without dashes or long stripes.
 * Follows TikTok Search ranking best practices (front-loaded keyword, authentic Dalil citation,
 * emotional/spiritual hook, max ~80 chars).
 *
 * Example output:
 *   "✨ Покоят на сърцата | Свещеният Коран [13:28] 📖"
 *   "✨ Скритата милост | Сахих ал-Бухари #6424 📜"
 */
export function generateTikTokSEOTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== "string") return "✨ Ислямска мъдрост 📖";

  // Clean any long stripes or multiple dashes first
  const cleanRaw = rawTitle
    .replace(/[-–—_━═─]{2,}/g, " ")
    .replace(/\s+[-–—]+\s+/g, " • ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const topic = extractTopicFromTitle(cleanRaw);
  const citation = extractCitationFromTitle(cleanRaw) || extractCitationFromTitle(rawTitle);

  if (!topic) return cleanRaw || "✨ Ислямска мъдрост 📖";

  // Ensure topic has no lingering dashes/stripes
  const sanitizedTopic = topic
    .replace(/[-–—_━═─]{2,}/g, " ")
    .replace(/\s+[-–—]+\s+/g, " • ")
    .replace(/^[:\-–—•\s]+/, "")
    .replace(/[:\-–—•\s]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Determine emoji suffix by citation type
  let suffix = "";
  if (citation) {
    if (/коран|сура|quran/i.test(citation)) suffix = " 📖";
    else if (/бухари|муслим|тирмизи|навауи|хадис/i.test(citation)) suffix = " 📜";
    else suffix = " ✨";
  } else {
    suffix = " 🌿";
  }

  // Build clean citation label for headline
  let citationLabel = citation;
  if (citationLabel) {
    citationLabel = citationLabel.replace(/^\[|\]$/g, ""); // strip outer brackets
    // e.g. "Коран 13:28" → "Свещеният Коран [13:28]"
    const quranMatch = citationLabel.match(/Коран\s+(\d+:\d+)/i);
    const hadithMatch = citationLabel.match(/(Сахих\s+ал-\w+|Сунан\s+\w+|Навауи\s*40)\s*#?\s*(\d+)/i);
    if (quranMatch) {
      citationLabel = `Свещеният Коран [${quranMatch[1]}]`;
    } else if (hadithMatch) {
      citationLabel = `${hadithMatch[1]} #${hadithMatch[2]}`;
    }
  }

  if (citationLabel) {
    return `✨ ${sanitizedTopic} | ${citationLabel}${suffix}`;
  }
  return `✨ ${sanitizedTopic}${suffix}`;
}

/**
 * Main broadcast-grade caption formatter.
 * Produces a complete, professional TikTok/Reels/Shorts caption:
 *
 * 1. 🏆 SEO Headline (TikTok Search-indexed, high-CTR)
 * 2. 🎯 Curiosity Hook
 * 3. 📖 Authentic Dalil (Quran Ayah or Sahih Hadith)
 * 4. 💎 Salafi AI Shaykh Sharh (Explanation)
 * 5. 📌 Sunnah Action OR Dua
 * 6. 🔄 Save & Share CTA (Sadaka Jariya hadith от Сахих Муслим)
 * 7. 🔍 TikTok SEO Search Queries
 * 8. #️⃣ Tiered Viral Hashtags
 */
export interface CaptionOptions {
  /** The full proposal title, e.g. "[Коран 13:28] Покоят на сърцата" */
  title: string;
  /** Short Bulgarian summary / description */
  summary?: string;
  /** Hook question from scriptWorkflow (first 2-3 seconds) */
  hookQuestion?: string;
  /** The authentic Dalil text (Quran ayah or Hadith text in Bulgarian) */
  dalilText?: string;
  /** The explanation/sharh from Salafi AI Shaykh */
  explanation?: string;
  /** The action step or Dua */
  actionStep?: string;
  /** Whether this is a Quran ayah (affects citation label) */
  isQuran?: boolean;
}

export function formatViralSocialCaption(
  titleOrRaw: string,
  summary?: string,
  opts?: CaptionOptions
): string {
  // Merge opts and top-level args
  const title = (opts?.title || titleOrRaw || "Ислямска мъдрост").trim();
  const summaryText = (opts?.summary || summary || "").trim();
  const hookQuestion = opts?.hookQuestion?.trim() || "";
  const dalilText = opts?.dalilText?.trim() || "";
  const explanation = opts?.explanation?.trim() || "";
  const actionStep = opts?.actionStep?.trim() || "";

  // ── 1. SEO Headline ──────────────────────────────────────────────────────
  const seoTitle = generateTikTokSEOTitle(title);

  // ── 2. Curiosity Hook ────────────────────────────────────────────────────
  let hookBlock = "";
  if (hookQuestion) {
    hookBlock = `\n\n${hookQuestion}`;
  } else if (summaryText) {
    // Derive a curiosity hook from the summary – use as is with slight framing
    hookBlock = `\n\n${summaryText}`;
  }

  // ── 3. Authentic Dalil Block ─────────────────────────────────────────────
  let dalilBlock = "";
  if (dalilText) {
    const citation = extractCitationFromTitle(title);
    const topic = extractTopicFromTitle(title);
    // Determine intro label
    let dalilIntroLabel = "📖 Аллах Всевишният повелява:";
    if (/бухари|муслим|тирмизи|навауи|хадис|hadith/i.test(citation + title)) {
      dalilIntroLabel = `📜 Пратеникът на Аллах ﷺ ни учи:`;
    }
    // Citation label for the end of the dalil (in parentheses without dashes)
    const citationEnd = citation ? ` (${citation.replace(/^\[|\]$/g, "")})` : "";
    dalilBlock = `\n\n${dalilIntroLabel}\n„${dalilText}“${citationEnd}`;
    // Suppress hookBlock if already covered by dalil topic
    if (!hookBlock && topic) {
      hookBlock = `\n\n${topic}`;
    }
  }

  // ── 4. Salafi AI Shaykh Sharh ────────────────────────────────────────────
  let sharhBlock = "";
  if (explanation) {
    const cleanExpl = explanation
      .replace(/^(?:обяснение|поука|sharh|explanation)\s*:\s*/i, "")
      .replace(/^Salafi Shaykh AI\s+пояснява[^,]*,?\s*че\s*/i, "")
      .replace(/^Шейх\s+[^:]+:\s*/i, "")
      .trim();
    if (cleanExpl) {
      sharhBlock = `\n\n💎 Богословско разяснение:\n${cleanExpl}`;
    }
  }

  // ── 5. Sunnah Action OR Dua ──────────────────────────────────────────────
  let actionBlock = "";
  if (actionStep) {
    const cleanAction = actionStep
      .replace(/^(?:действие|дуа|action|dua)\s*:\s*/i, "")
      .trim();
    const isDua = /астагфируллах|субханаллах|алхамдулиллях|аллаху|ля иляха|дуа|молитва|зикр|дуа:/i.test(actionStep);
    const actionLabel = isDua ? "🤍 Дуа:" : "📌 Напътствие:";
    actionBlock = `\n\n${actionLabel} ${cleanAction}`;
  }

  // ── 6. Save & Share CTA (Algorithmic Retention + Sadaka Jariya) ──────────
  // Note: NO long divider lines (━━━━━━━━━━━━ or ------------) or dashes
  const ctaBlock = `\n\n📌 ЗАПАЗИ, за да се върнете към тази мъдрост в момент на нужда!\n🔄 СПОДЕЛИ с приятел или в Story:\n„Който насочи към добро, получава награда колкото онзи, който го е извършил.“\n(Сахих Муслим #1893)\n💬 Напишете „Амин“ или „Субханаллах“ ⬇️`;

  // ── 7. TikTok SEO Search Queries ─────────────────────────────────────────
  const topic = extractTopicFromTitle(title);
  const topicKeywords = topic
    ? `${topic}, ислямски видеа, ислям България, коран хадис`
    : "ислямски видеа, ислям България, коран хадис";
  const seoBlock = `\n\n🔍 TikTok SEO: ${topicKeywords}, ислямско напомняне, мюсюлмани, вяра, таухид, ислям на български`;

  // ── 8. Tiered Hashtags ────────────────────────────────────────────────────
  // High-volume spiritual, Bulgarian-geo, niche Salafi, and viral algo tags
  const hashtags = `\n\n#ислям #коран #хадиси #мюсюлмани #напомняне #вяра #аллах #българия #ислямскоНапомняне #таухид #салафи #сахихБухари #сахихМуслим #islamicreels #islamicvideo #muslimreels #quran #hadith #sunnah #salafi #islamicreminder #fyp #viral #tiktokviral #islamicbulgaria`;

  // ── Compose Full Caption ──────────────────────────────────────────────────
  const rawCaption = `${seoTitle}${hookBlock}${dalilBlock}${sharhBlock}${actionBlock}${ctaBlock}${seoBlock}${hashtags}`;

  // Strip any accidental long divider stripes, repeated hyphens/dashes
  const cleanCaption = rawCaption
    .replace(/[-–—_━═─]{2,}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return sanitizeTheologicalRespect(cleanCaption);
}
