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
 * Generates high-ranking Bulgarian Islamic keywords for TikTok SEO & search indexing.
 * Does NOT contain the label "TikTok SEO" so the caption stays clean, organic, and professional.
 */
export function generateTikTokKeywords(
  title: string,
  summary?: string,
  opts?: CaptionOptions
): string {
  const topic = extractTopicFromTitle(title);
  const citation = extractCitationFromTitle(title);
  const corpus = `${title} ${summary || ""} ${opts?.dalilText || ""} ${opts?.explanation || ""} ${opts?.actionStep || ""}`.toLowerCase();

  const keywords: string[] = [];

  // 1. Primary topic keyword
  if (topic) {
    const cleanTopicLower = topic.toLowerCase();
    keywords.push(cleanTopicLower);
  }

  // 2. Thematic Islamic expansions based on semantic analysis of content
  if (/мълча|език|думи|говорене|говори/i.test(corpus)) {
    keywords.push("мълчание в исляма", "пази езика", "добро или мълчание", "грехове на езика");
  }
  if (/покой|тревог|тревожност|сърц|спокой|паник|тъга/i.test(corpus)) {
    keywords.push("покой на сърцето", "дуа за спокойствие", "тревожност в исляма", "успокоение на душата", "тъга и депресия ислям");
  }
  if (/покая|тауб|прошк|грях|грехове|опрощ|истигфар/i.test(corpus)) {
    keywords.push("покаяние в исляма", "тауба", "опрощение на грехове", "как да се покаем", "истигфар", "милост от аллах");
  }
  if (/търпени|сабр|изпитани|трудност|болка/i.test(corpus)) {
    keywords.push("сабр", "търпение в исляма", "изпитания в живота", "трудност и облекчение", "награда за търпение");
  }
  if (/упован|тауаккул|страх|кадар|съдба|довер/i.test(corpus)) {
    keywords.push("тауаккул", "упование на аллах", "съдба и кадар", "страх от бъдещето", "доверие в аллах");
  }
  if (/намаз|молитв|салят|кланя/i.test(corpus)) {
    keywords.push("намаз", "как се прави намаз", "молитва в исляма", "редовен намаз", "хушу в намаза");
  }
  if (/благодарн|шукр|ризк|препитани|берекет|изобили/i.test(corpus)) {
    keywords.push("благодарност към аллах", "шукр", "ризк и берекет", "препитание в исляма");
  }
  if (/смърт|ахирет|съдния ден|гроб|дженнет|рай|джехеннем/i.test(corpus)) {
    keywords.push("смъртта в исляма", "ахирет", "съдния ден", "дженнет", "подготовка за ахирет");
  }
  if (/родител|майк|баща/i.test(corpus)) {
    keywords.push("уважение към родителите", "майката в исляма", "добро към родителите", "рай под краката на майките");
  }
  if (/ихсан|добро|милосърд|съвършен/i.test(corpus)) {
    keywords.push("ихсан", "милосърдие в исляма", "добри дела", "съвършенство в делата");
  }
  if (/таухид|ихлас|единобож|ширк/i.test(corpus)) {
    keywords.push("чист таухид", "единобожие", "ихлас", "вяра в единния аллах");
  }
  if (/дуа|зикр/i.test(corpus)) {
    keywords.push("искрена дуа", "приета дуа", "споменаване на аллах", "зикр");
  }

  // 3. Scripture citations
  if (/коран|сура|quran/i.test(citation + corpus)) {
    keywords.push("коран на български", "свещения коран", "аяти от корана");
  }
  if (/бухари|муслим|тирмизи|навауи|хадис/i.test(citation + corpus)) {
    keywords.push("сахих хадиси", "сунна на пророка", "хадиси на български");
  }

  // 4. Core evergreen Bulgarian TikTok discovery terms
  keywords.push("ислямски видеа", "ислям българия", "ислямско напомняне", "мюсюлмани", "вяра");

  // Deduplicate case-insensitively and keep top 10-12
  const seen = new Set<string>();
  const uniqueKeywords: string[] = [];
  for (const kw of keywords) {
    const norm = kw.trim().toLowerCase();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      uniqueKeywords.push(norm);
    }
  }

  return uniqueKeywords.slice(0, 12).join(", ");
}

/**
 * Converts dynamic topic keywords and content context into optimal TikTok hashtags.
 * TikTok algorithmic best practice: 5 to 8 focused, high-relevance hashtags
 * (prevents shadowbanning / hashtag stuffing while maximizing search indexing).
 */
export function generateTikTokHashtags(
  title: string,
  summary?: string,
  opts?: CaptionOptions,
  maxTags: number = 8
): string {
  const corpus = `${title} ${summary || ""} ${opts?.dalilText || ""} ${opts?.explanation || ""} ${opts?.actionStep || ""}`.toLowerCase();
  const citation = extractCitationFromTitle(title);
  const topic = extractTopicFromTitle(title);

  const tags: string[] = [];

  // Helper to sanitize a phrase into a valid camelCase hashtag without spaces or symbols
  const toHashtag = (phrase: string): string => {
    const clean = phrase
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim()
      .split(/\s+/)
      .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join("");
    return clean ? `#${clean}` : "";
  };

  // 1. Specific topic tag from title
  if (topic) {
    const topicTag = toHashtag(topic);
    if (topicTag && topicTag.length <= 25) {
      tags.push(topicTag);
    }
  }

  // 2. Thematic keyword hashtags based on content analysis
  if (/мълча|език|думи|говорене/i.test(corpus)) {
    tags.push("#мълчание", "#пазиЕзика", "#спасение");
  } else if (/покой|тревог|тревожност|сърц|спокой|паник/i.test(corpus)) {
    tags.push("#покой", "#спокойствие", "#дуаЗаПокой");
  } else if (/покая|тауб|прошк|грях|грехове|истигфар/i.test(corpus)) {
    tags.push("#покаяние", "#тауба", "#прошка", "#истигфар");
  } else if (/търпени|сабр|изпитани|болка/i.test(corpus)) {
    tags.push("#сабр", "#търпение", "#изпитание");
  } else if (/упован|тауаккул|страх|кадар|съдба/i.test(corpus)) {
    tags.push("#тауаккул", "#упование", "#кадар");
  } else if (/намаз|молитв|салят/i.test(corpus)) {
    tags.push("#намаз", "#молитва", "#хушу");
  } else if (/благодарн|шукр|ризк|препитани|берекет/i.test(corpus)) {
    tags.push("#шукр", "#благодарност", "#ризк");
  } else if (/смърт|ахирет|съдния ден|дженнет|рай/i.test(corpus)) {
    tags.push("#ахирет", "#дженнет", "#съднияДен");
  } else if (/родител|майк|баща/i.test(corpus)) {
    tags.push("#родители", "#майка", "#добро");
  } else if (/ихсан|добродетел/i.test(corpus)) {
    tags.push("#ихсан", "#добро", "#милосърдие");
  } else if (/таухид|ихлас|единобож/i.test(corpus)) {
    tags.push("#таухид", "#ихлас", "#единобожие");
  } else if (/дуа|зикр/i.test(corpus)) {
    tags.push("#дуа", "#зикр", "#молитва");
  }

  // 3. Scripture citation tags
  if (/коран|сура|quran/i.test(citation + corpus)) {
    tags.push("#коран", "#свещенияКоран");
  } else if (/бухари|муслим|тирмизи|навауи|хадис/i.test(citation + corpus)) {
    if (/бухари/i.test(citation + corpus)) tags.push("#сахихБухари");
    else if (/муслим/i.test(citation + corpus)) tags.push("#сахихМуслим");
    tags.push("#хадиси", "#сунна");
  }

  // 4. Core community and discovery tags
  tags.push("#ислям", "#напомняне", "#ислямБългария");

  // Deduplicate and cap to optimal TikTok limits (5 to 8 hashtags)
  const seen = new Set<string>();
  const finalTags: string[] = [];
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (tag && !seen.has(lower)) {
      seen.add(lower);
      finalTags.push(tag);
      if (finalTags.length >= maxTags) break;
    }
  }

  return finalTags.join(" ");
}

/**
 * Main broadcast-grade caption formatter.
 * Produces a complete, professional TikTok/Reels/Shorts caption:
 *
 * 1. 🏆 Title (SEO & Search-indexed, high-CTR)
 * 2. 🎯 Curiosity Hook
 * 3. 📖 Authentic Dalil (Quran Ayah or Sahih Hadith)
 * 4. 💎 Salafi AI Shaykh Sharh (Explanation)
 * 5. 📌 Sunnah Action OR Dua
 * 6. 🔄 Save & Share CTA (Sadaka Jariya hadith от Сахих Муслим)
 * 7. #️⃣ Optimal TikTok Hashtags (5 to 8 targeted topic keywords as hashtags)
 *
 * Note: SEO keywords are organically embedded within the text body itself.
 * No visible "TikTok SEO" or "Ключови думи" labels are included in the caption.
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

  // ── 7. Optimal TikTok Hashtags (Keywords in hashtags, 5-8 tags) ──────────
  // Organic SEO is inside the text body. Topic keywords are formatted as focused hashtags.
  const hashtags = `\n\n${generateTikTokHashtags(title, summary, opts, 8)}`;

  // ── Compose Full Caption ──────────────────────────────────────────────────
  let rawCaption = `${seoTitle}${hookBlock}${dalilBlock}${sharhBlock}${actionBlock}${ctaBlock}${hashtags}`;

  // Strip any accidental artificial label lines and long stripes
  rawCaption = rawCaption
    .replace(/(?:🔍\s*)?(?:tiktok\s*seo|ключови\s*думи)\s*:[^\n]*\n?/gi, "")
    .replace(/[-–—_━═─]{2,}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return sanitizeTheologicalRespect(rawCaption);
}
