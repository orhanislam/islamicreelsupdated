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
  const apiCollection = collection === "nawawi40" ? "nawawi" : collection;
  
  // To perfectly match sunnah.com numbering (especially for Muslim which uses different indices),
  // we fetch the full collection (which is cached heavily by Cloudflare CDN) and search by arabicnumber.
  const [araRes, engRes] = await Promise.all([
    fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${apiCollection}.min.json`),
    fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${apiCollection}.min.json`)
  ]);

  if (!araRes.ok || !engRes.ok) {
    throw new Error(`Грешка при изтегляне на колекцията: ${araRes.status} / ${engRes.status}`);
  }

  const araJson = await araRes.json();
  const engJson = await engRes.json();

  // Find the exact hadith. Sunnah.com's main number usually matches the `arabicnumber` (e.g. Sahih Muslim).
  // If not found by arabicnumber, we fallback to the sequential `hadithnumber`.
  const araMatch = araJson.hadiths.find((h: any) => parseInt(h.arabicnumber) === number) || 
                   araJson.hadiths.find((h: any) => parseInt(h.hadithnumber) === number);
                   
  const engMatch = engJson.hadiths.find((h: any) => parseInt(h.arabicnumber) === number) || 
                   engJson.hadiths.find((h: any) => parseInt(h.hadithnumber) === number);

  if (!araMatch || !engMatch || !araMatch.text || !engMatch.text) {
    throw new Error(`Хадис номер ${number} не съществува в тази колекция.`);
  }

  const arabic = stripHtml(araMatch.text);
  const english = stripHtml(engMatch.text);

  let reference = `${COLLECTIONS[collection].label} ${number}`;

  return {
    collection,
    collectionLabel: COLLECTIONS[collection].label,
    number,
    arabic,
    english,
    reference,
    inBookReference: null,
    grade: COLLECTIONS[collection].allSahih ? "Sahih" : null,
    sourceUrl: `https://sunnah.com/${collection}:${number}`, // Keep sunnah.com as the UI source reference
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
