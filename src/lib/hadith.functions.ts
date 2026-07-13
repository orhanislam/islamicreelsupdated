import { createServerFn } from "@tanstack/react-start";
import { fetchSunnahHadith, randomSahihHadith } from "./sunnah.functions";

export type HadithData = {
  collection: string;
  number: number;
  arabic: string;
  english: string;
  reference: string;
  sourceUrl: string;
};

// All 40 Nawawi hadiths live-scraped from sunnah.com/nawawi40:N — guarantees
// authentic wording without hardcoding 40 entries.
export const listHadiths = createServerFn({ method: "GET" }).handler(async () => {
  // Lightweight catalog (number + reference label) so the UI can render a
  // picker without N HTTP calls. Texts are fetched on demand via fetchHadith.
  return Array.from({ length: 42 }, (_, i) => ({
    number: i + 1,
    arabic: "",
    english: "",
    collection: "nawawi40",
    reference: `40 Хадиса на ан-Навауи • Хадис № ${i + 1}`,
    sourceUrl: `https://sunnah.com/nawawi40:${i + 1}`,
  }));
});

export const fetchHadith = createServerFn({ method: "POST" })
  .inputValidator((input: { number: number }) => {
    const n = Math.floor(Number(input.number));
    if (!Number.isFinite(n) || n < 1 || n > 42) throw new Error("Невалиден номер на хадис (1–42)");
    return { number: n };
  })
  .handler(async ({ data }): Promise<HadithData> => {
    const h = await fetchSunnahHadith({ data: { collection: "nawawi40", number: data.number } });
    return {
      collection: "nawawi40",
      number: h.number,
      arabic: h.arabic,
      english: h.english,
      reference: h.reference,
      sourceUrl: h.sourceUrl,
    };
  });

export const randomNawawi = createServerFn({ method: "POST" }).handler(async (): Promise<HadithData> => {
  const h = await randomSahihHadith({ data: { collection: "nawawi40" } });
  return {
    collection: "nawawi40",
    number: h.number,
    arabic: h.arabic,
    english: h.english,
    reference: h.reference,
    sourceUrl: h.sourceUrl,
  };
});
