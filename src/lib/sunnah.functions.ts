import { createServerFn } from "@tanstack/react-start";

// Scrape sahih-graded hadiths directly from sunnah.com (no API key required).
// Each collection page lives at https://sunnah.com/<collection>:<number>

const COLLECTIONS = {
  bukhari: { label: "Sahih al-Bukhari", max: 7563, allSahih: true },
  muslim: { label: "Sahih Muslim", max: 3033, allSahih: true },
  tirmidhi: { label: "Jami` at-Tirmidhi", max: 3956, allSahih: false },
  nawawi40: { label: "40 Hadith Nawawi", max: 42, allSahih: true },
} as const;

export type SunnahCollection = keyof typeof COLLECTIONS;

export type SunnahHadith = {
  collection: SunnahCollection;
  collectionLabel: string;
  number: number;
  arabic: string;
  english: string;
  reference: string;
  inBookReference: string | null;
  grade: string | null;
  sourceUrl: string;
};

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBlock(html: string, className: string): string | null {
  // Find class attribute then balance one level of <div> nesting.
  const re = new RegExp(`<div[^>]*class="[^"]*${className}[^"]*"[^>]*>`, "i");
  const m = html.match(re);
  if (!m || m.index === undefined) return null;
  const start = m.index + m[0].length;
  let depth = 1;
  let i = start;
  while (i < html.length && depth > 0) {
    const next = html.indexOf("<", i);
    if (next < 0) break;
    if (html.startsWith("<div", next)) { depth++; i = next + 4; }
    else if (html.startsWith("</div", next)) { depth--; i = next + 5; if (depth === 0) return html.slice(start, next); }
    else i = next + 1;
  }
  return null;
}

async function scrape(collection: SunnahCollection, number: number): Promise<SunnahHadith> {
  const url = `https://sunnah.com/${collection}:${number}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`sunnah.com ${res.status}`);
  const html = await res.text();

  const arabicRaw = pickBlock(html, "arabic_hadith_full");
  const englishRaw = pickBlock(html, "english_hadith_full");
  if (!arabicRaw || !englishRaw) throw new Error("Не успях да извлека текста (страница без хадис).");

  const arabic = stripHtml(arabicRaw);
  const english = stripHtml(englishRaw);

  // In-book reference & translation reference
  const refMatch = html.match(/<table[^>]*class=hadith_reference[^>]*>([\s\S]*?)<\/table>/i);
  let reference = `${COLLECTIONS[collection].label} ${number}`;
  let inBookReference: string | null = null;
  if (refMatch) {
    const text = stripHtml(refMatch[1]);
    const refLine = text.match(/Reference\s*:\s*([^\n:]+?\d+)/i);
    const inBook = text.match(/In-book reference\s*:\s*([^\n]+?)(?:English|$)/i);
    if (refLine) reference = refLine[1].trim();
    if (inBook) inBookReference = inBook[1].trim();
  }

  // Grade: sunnah.com renders grades in two adjacent <td class="english_grade">
  // cells per row — the first holds the label ("Grade :"), the second holds
  // the value ("Sahih (Darussalam)"). Collect ALL such cells and pick the one
  // that doesn't look like a label.
  let grade: string | null = null;
  const gradeCells: string[] = [];
  const cellRe = /<td[^>]*class=(?:"[^"]*english_grade[^"]*"|english_grade)[^>]*>([\s\S]*?)<\/td>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = cellRe.exec(html)) !== null) {
    const v = stripHtml(cm[1]).replace(/^grade\s*:?\s*/i, "").trim();
    if (v) gradeCells.push(v);
  }
  // Prefer the first cell whose text actually mentions a grade verdict.
  const verdict = gradeCells.find((v) => /sahih|hasan|da'?if|daeef|weak|mawdu|munkar|saheeh|sahīh/i.test(v));
  if (verdict) grade = verdict;
  if (!grade && COLLECTIONS[collection].allSahih) grade = "Sahih";

  return {
    collection,
    collectionLabel: COLLECTIONS[collection].label,
    number,
    arabic,
    english,
    reference,
    inBookReference,
    grade,
    sourceUrl: url,
  };
}

function isSahihGrade(grade: string | null): boolean {
  if (!grade) return false;
  // Reject Hasan/Daif/Mawdu etc. Accept anything containing "Sahih" (Darussalam/Albani/etc.)
  const g = grade.toLowerCase();
  if (/da'?if|daeef|weak|mawdu|fabricated|munkar/.test(g)) return false;
  return /sahih|sahīh|saheeh/.test(g);
}

export const listSunnahCollections = createServerFn({ method: "GET" }).handler(async () => {
  return Object.entries(COLLECTIONS).map(([key, v]) => ({
    key: key as SunnahCollection,
    label: v.label,
    max: v.max,
    allSahih: v.allSahih,
  }));
});

export const fetchSunnahHadith = createServerFn({ method: "POST" })
  .inputValidator((input: { collection: SunnahCollection; number: number; requireSahih?: boolean }) => input)
  .handler(async ({ data }): Promise<SunnahHadith> => {
    const meta = COLLECTIONS[data.collection];
    if (!meta) throw new Error("Невалидна колекция");
    const n = Math.max(1, Math.min(meta.max, Math.floor(data.number)));
    const h = await scrape(data.collection, n);
    if (data.requireSahih && !meta.allSahih && !isSahihGrade(h.grade)) {
      throw new Error(`Хадис ${h.reference} не е сахих (${h.grade ?? "няма степен"}). Опитай друг номер.`);
    }
    return h;
  });

export const randomSahihHadith = createServerFn({ method: "POST" })
  .inputValidator((input: { collection: SunnahCollection }) => input)
  .handler(async ({ data }): Promise<SunnahHadith> => {
    const meta = COLLECTIONS[data.collection];
    if (!meta) throw new Error("Невалидна колекция");
    // Bukhari & Muslim — всичко е сахих, един опит стига.
    // Tirmidhi — пробваме до 8 пъти, докато паднем на сахих.
    const attempts = meta.allSahih ? 3 : 8;
    let lastErr: unknown = null;
    for (let i = 0; i < attempts; i++) {
      const n = 1 + Math.floor(Math.random() * meta.max);
      try {
        const h = await scrape(data.collection, n);
        if (meta.allSahih || isSahihGrade(h.grade)) return h;
      } catch (e) { lastErr = e; }
    }
    throw new Error(lastErr instanceof Error ? lastErr.message : "Не намерих сахих хадис, опитай отново.");
  });
