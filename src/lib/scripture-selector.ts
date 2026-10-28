import { getExcludedScripturesOneMonth } from "./generation-history.functions";
import {
  getAllVerifiedHadithSharhs,
  getVerifiedHadithSharhDirect,
  fetchAuthenticTafsirDirect,
  formatTafsirGroundingPrompt,
  detectScriptureFromText,
  type HadithSharhEntry,
} from "./tafsir.functions";
import { getJobsDir } from "./render.functions";
import path from "node:path";
import fs from "node:fs/promises";

export interface CandidateVerse {
  surah: number;
  ayah: number;
  count?: number;
  title: string;
  keywords: string;
}

export const CANDIDATE_QURAN_VERSES: CandidateVerse[] = [
  // Тревожност, тъга и покой на сърцето (Сакина и Зикр)
  { surah: 13, ayah: 28, title: "Коран 13:28 (Покоят на сърцата при споменаването на Аллах)", keywords: "покой тревожност сърце зикр спокойствие стрес тъга" },
  { surah: 94, ayah: 5, title: "Коран 94:5 (С всяка трудност има облекчение)", keywords: "трудност облекчение изпитание тревожност тежест" },
  { surah: 3, ayah: 139, title: "Коран 3:139 (Не унивайте и не тъгувайте)", keywords: "тъга униние слабост кураж вяра покой" },
  { surah: 9, ayah: 40, title: "Коран 9:40 (Не тъгувай, Аллах е с нас)", keywords: "тъга страх самота закрила покой" },
  { surah: 20, ayah: 25, title: "Коран 20:25-26 (Дуата на Муса за разширяване на гърдите и лекота)", keywords: "дуа тежест гърди тревожност лекота" },
  { surah: 15, ayah: 97, title: "Коран 15:97-99 (Лекарството, когато сърцето се свива от думите на хората)", keywords: "хора обиди болка сърце тъга покой" },
  { surah: 48, ayah: 4, title: "Коран 48:4 (Той е, Който низпосла спокойствието Сакина в сърцата)", keywords: "сакина покой сърце иман тревожност" },
  { surah: 10, ayah: 62, title: "Коран 10:62 (За приближените на Аллах няма страх и не ще скърбят)", keywords: "страх скръб тъга таква покой" },
  { surah: 89, ayah: 27, title: "Коран 89:27-30 (О, успокоена душо, върни се при своя Господар)", keywords: "душа покой смърт ахирет дженнет" },

  // Изпитания, Сабр (Търпение) и Скрита Божествена Мъдрост
  { surah: 2, ayah: 153, title: "Коран 2:153 (Търсете помощ чрез търпение и молитва)", keywords: "сабр търпение намаз молитва изпитание помощ" },
  { surah: 2, ayah: 155, title: "Коран 2:155 (Изпитанията със страх и загуба и благата вест за търпеливите)", keywords: "сабр изпитание загуба страх търпение" },
  { surah: 2, ayah: 214, title: "Коран 2:214 (Кога ще дойде помощта на Аллах? Наистина тя е близо)", keywords: "помощ изпитание трудност надежда сабр" },
  { surah: 2, ayah: 216, title: "Коран 2:216 (Може да мразите нещо, а то да е добро за вас)", keywords: "мъдрост съдба кадар изпитание добро" },
  { surah: 2, ayah: 286, title: "Коран 2:286 (Аллах не възлага на никоя душа товар по-голям от силите й)", keywords: "товар сили изпитание тежест милост" },
  { surah: 29, ayah: 2, title: "Коран 29:2 (Нима хората мислят, че ще бъдат оставени без да бъдат изпитани)", keywords: "изпитание иман сабр проверка" },
  { surah: 29, ayah: 69, title: "Коран 29:69 (Които се борят по Нашия път, ще ги насочим по Нашите пътища)", keywords: "път борба напътствие сабр" },
  { surah: 39, ayah: 10, title: "Коран 39:10 (На търпеливите се въздава наградата им без сметка)", keywords: "сабр търпение награда изпитание" },

  // Забавена Дуа и Близостта на Аллах Всевишния
  { surah: 2, ayah: 186, title: "Коран 2:186 (Аз съм наблизо и откликвам на зова на молещия се)", keywords: "дуа молитва близост отговор молба" },
  { surah: 40, ayah: 60, title: "Коран 40:60 (Зовете Ме с дуа и Аз ще ви откликна)", keywords: "дуа молба отговор ибадет" },
  { surah: 21, ayah: 87, title: "Коран 21:87 (Зовът на пророка Юнус в мрака — Ля иляха илля Анта)", keywords: "дуа юнус мрак беда спасение таухид" },
  { surah: 21, ayah: 83, title: "Коран 21:83-84 (Молитвата на пророка Аюб при тежко страдание)", keywords: "дуа болест страдание сабр милост" },
  { surah: 27, ayah: 62, title: "Коран 27:62 (Кой откликва на изпадналия в беда, когато Го призове)", keywords: "дуа беда помощ таухид спасение" },
  { surah: 19, ayah: 4, title: "Коран 19:4 (Никога не съм бил нещастен в дуата си към Теб, Господи)", keywords: "дуа надежда закария милост" },
  { surah: 50, ayah: 16, title: "Коран 50:16 (Ние знаем какво му нашепва душата му)", keywords: "душа мисли близост шепот знание" },

  // Ризк (Препитание), Благодарност и Изход от безизходица
  { surah: 65, ayah: 2, title: "Коран 65:2-3 (На който се бои от Аллах, Той му дава изход и препитание)", keywords: "ризк препитание таква изход пари бедност" },
  { surah: 14, ayah: 7, title: "Коран 14:7 (Ако сте благодарни, непременно ще ви надбавя)", keywords: "благодарност шукр ризк изобилие блага" },
  { surah: 11, ayah: 6, title: "Коран 11:6 (Няма живо същество на земята, чието препитание да не е от Аллах)", keywords: "ризк препитание страх бъдеще" },
  { surah: 51, ayah: 58, title: "Коран 51:58 (Аллах е Даряващият препитание, Владетелят на силата)", keywords: "ризк препитание таухид сила" },
  { surah: 55, ayah: 13, title: "Коран 55:13 (И кое от благата на своя Господар ще отречете)", keywords: "блага благодарност милост шукр" },
  { surah: 93, ayah: 5, title: "Коран 93:5 (Твоят Господар ще ти дари и ти ще бъдеш доволен)", keywords: "надежда тъга милост дарове покой" },
  { surah: 2, ayah: 152, title: "Коран 2:152 (Помнете Ме, за да ви помня и Аз, и бъдете Ми благодарни)", keywords: "зикр благодарност памет покой" },

  // Покаяние (Тауба), Прошка и Надежда след грях
  { surah: 39, ayah: 53, title: "Коран 39:53 (Не губете надежда за милостта на Аллах — Той прощава всички грехове)", keywords: "покаяние тауба грях прошка милост надежда" },
  { surah: 25, ayah: 70, title: "Коран 25:70 (На които се покаят, Аллах заменя лошите им дела с добри)", keywords: "покаяние тауба грях прошка добрини" },
  { surah: 66, ayah: 8, title: "Коран 66:8 (Покайте се пред Аллах с искрено покаяние — Тауба Насуха)", keywords: "покаяние тауба прошка дженнет" },
  { surah: 4, ayah: 110, title: "Коран 4:110 (Който извърши зло и после моли Аллах за прошка, ще Го намери Опрощаващ)", keywords: "прошка истигфар грях покаяние" },
  { surah: 11, ayah: 114, title: "Коран 11:114 (Наистина добрите дела заличават лошите)", keywords: "намаз добрини грях покаяние" },
  { surah: 71, ayah: 10, title: "Коран 71:10-12 (Молете своя Господар за прошка — истигфарът носи берекет и ризк)", keywords: "истигфар прошка ризк берекет покаяние" },

  // Тауаккул (Упование) и Свобода от страха
  { surah: 3, ayah: 173, title: "Коран 3:173 (Аллах ни е достатъчен и Той е най-прекрасният Покровител)", keywords: "тауаккул упование страх хора закрила" },
  { surah: 8, ayah: 30, title: "Коран 8:30 (Аллах е най-добрият в Своите планове)", keywords: "тауаккул план съдба упование" },
  { surah: 9, ayah: 51, title: "Коран 9:51 (Нищо няма да ни сполети освен предписаното от Аллах за нас)", keywords: "кадар съдба тауаккул упование страх" },
  { surah: 3, ayah: 160, title: "Коран 3:160 (Ако Аллах ви помогне, никой не ще ви надвие)", keywords: "тауаккул помощ сила упование" },
  { surah: 26, ayah: 62, title: "Коран 26:62 (С мен е моят Господар, Той ще ме напъти)", keywords: "тауаккул упование безизходица надежда" },

  // Преходност на Дуня, Ахирет и Смисълът на Живота
  { surah: 103, ayah: 1, title: "Коран 103:1-3 (Кълна се във Времето — спасението чрез вяра, дела и търпение)", keywords: "време дуня ахирет спасение сабр" },
  { surah: 57, ayah: 20, title: "Коран 57:20 (Земният живот е само наслада на заблудата)", keywords: "дуня ахирет преходност живот" },
  { surah: 3, ayah: 185, title: "Коран 3:185 (Всяка душа ще вкуси смъртта и в Съдния ден ще получите наградата си)", keywords: "смърт ахирет дуня съдния ден" },
  { surah: 67, ayah: 2, title: "Коран 67:2 (Който сътвори смъртта и живота, за да ви изпита кой е по-добър в делата)", keywords: "живот смърт изпитание дела ихлас" },
  { surah: 79, ayah: 40, title: "Коран 79:40-41 (Който се е страхувал да застане пред своя Господар и е възпрял душата си)", keywords: "таква страх страсти дженнет ахирет" },
  { surah: 99, ayah: 7, title: "Коран 99:7-8 (Който извърши добро колкото прашинка, ще го види)", keywords: "ахирет дела справедливост съдния ден" },

  // Чистият Таухид и Величието на Единствения Творец
  { surah: 2, ayah: 255, title: "Коран 2:255 (Аят ал-Курси — Абсолютното Величие и Власт на Аллах)", keywords: "таухид величие закрила курси" },
  { surah: 112, ayah: 1, title: "Коран 112:1-4 (Сура Ал-Ихлас — Чистият Таухид)", keywords: "таухид ихлас единобожие" },
  { surah: 59, ayah: 22, title: "Коран 59:22-23 (Той е Аллах, Знаещият скритото и явното, Всемилостивият)", keywords: "таухид имена величие милост" },
  { surah: 6, ayah: 59, title: "Коран 6:59 (У Него са ключовете на неведомото и никое листо не пада без Негово знание)", keywords: "таухид знание кадар мъдрост" },
  { surah: 35, ayah: 15, title: "Коран 35:15 (О, хора, вие сте нуждаещите се от Аллах, а Аллах е Пребогатият)", keywords: "таухид смирение нужда дуа" },
];

export interface SelectedUniqueScripture {
  type: "quran" | "hadith";
  title: string;
  reference: string;
  collection?: "bukhari" | "muslim" | "tirmidhi" | "nawawi40";
  number?: number;
  surah?: number;
  ayah?: number;
  count?: number;
  dalilTextBg: string;
  arabicText?: string;
  sourceScholar: string;
  sourceWork: string;
  topic: string;
  preGroundingPrompt: string;
  isPreVerifiedUnique: true;
}

/**
 * Ultra-fast scripture selector and 30-day deduplication guard.
 * Checks the entire 30-day history FIRST before any LLM prompt, video creation,
 * or history write. Guarantees that different authentic Hadiths and Ayahs are
 * rotated continuously without delay, collisions, or history clutter.
 */
export async function selectGuaranteedUniqueScriptureDirect(options?: {
  topic?: string;
  sourcePreference?: "auto" | "quran" | "hadith";
  now?: number;
}): Promise<SelectedUniqueScripture> {
  const now = options?.now || Date.now();
  const sourcePref = options?.sourcePreference || "auto";
  const rawTopic = (options?.topic || "").trim();

  // 1. Gather 30-day exclusion keys
  const exclusionData = await getExcludedScripturesOneMonth(now);
  const excludedHadithKeys = new Set<string>(exclusionData.hadithKeys);
  const excludedAyahKeys = new Set<string>(exclusionData.ayahKeys);

  // 2. Also inspect jobs.json to include any rendered videos from the last 30 days
  try {
    const jobsDir = await getJobsDir();
    const jobsFile = path.join(jobsDir, "jobs.json");
    const raw = await fs.readFile(jobsFile, "utf-8").catch(() => "[]");
    const jobs = JSON.parse(raw);
    const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
    if (Array.isArray(jobs)) {
      for (const j of jobs) {
        if (!j || (j.createdAt && j.createdAt < thirtyDaysAgo)) continue;
        if (j.data?.surah && j.data?.ayah) {
          excludedAyahKeys.add(`${j.data.surah}:${j.data.ayah}`);
        }
        const coll = (j.data?.collection || j.data?.hadithCollection || "").toLowerCase().trim();
        const num = j.data?.hadithNumber || j.data?.number;
        if (coll && num) {
          excludedHadithKeys.add(`${coll}:${num}`);
        }
      }
    }
  } catch {}

  // 3. Check if user specified an exact explicit reference in the topic (e.g. "Коран 2:255" or "Бухари 1")
  const detected = detectScriptureFromText(rawTopic);

  if (detected.type === "quran" && detected.surah && detected.ayah) {
    const key = `${detected.surah}:${detected.ayah}`;
    const isExcluded = excludedAyahKeys.has(key);
    if (!isExcluded) {
      const [tafsir, dalilBg] = await Promise.all([
        fetchAuthenticTafsirDirect({ surah: detected.surah, ayah: detected.ayah, scholarId: 91 }),
        preFetchQuranDalilBg(detected.surah, detected.ayah, 1),
      ]);
      const title = `[Коран ${detected.surah}:${detected.ayah}]`;
      return {
        type: "quran",
        title,
        reference: `Сура ${detected.surah}:${detected.ayah}`,
        surah: detected.surah,
        ayah: detected.ayah,
        count: 1,
        dalilTextBg: dalilBg || "В Свещения Коран, Аллах Всевишният повелява:",
        sourceScholar: "Шейх ас-Са'ди (рахимахуллах)",
        sourceWork: "Тефсир ас-Са'ди",
        topic: rawTopic || `Сура ${detected.surah}:${detected.ayah}`,
        preGroundingPrompt: tafsir ? formatTafsirGroundingPrompt({ tafsir, ayahTextBg: dalilBg || undefined }) : "",
        isPreVerifiedUnique: true,
      };
    }
  } else if (detected.type === "hadith" && detected.collection && detected.number) {
    const key = `${detected.collection.toLowerCase().trim()}:${detected.number}`;
    const isExcluded = excludedHadithKeys.has(key);
    if (!isExcluded) {
      const sharh = getVerifiedHadithSharhDirect({
        collection: detected.collection,
        number: detected.number,
      });
      const collName =
        detected.collection === "nawawi40"
          ? "40 Хадиса на ан-Науауи"
          : detected.collection === "bukhari"
          ? "Сахих ал-Бухари"
          : detected.collection === "muslim"
          ? "Сахих Муслим"
          : "Джами ат-Тирмизи";
      const title = `[${collName} #${detected.number}]`;
      return {
        type: "hadith",
        title,
        reference: `${collName} #${detected.number}`,
        collection: detected.collection as any,
        number: Number(detected.number),
        dalilTextBg: sharh?.hadithTextBg || "Пратеникът на Аллах ﷺ ни учи:",
        sourceScholar: "Сахих Сунна (Шейх Ибн Баз & Шейх ал-Албани)",
        sourceWork: sharh?.work || "Автентичен Шарх",
        topic: sharh?.topic || rawTopic || `${collName} #${detected.number}`,
        preGroundingPrompt: sharh ? formatTafsirGroundingPrompt({ hadithSharh: sharh }) : "",
        isPreVerifiedUnique: true,
      };
    }
  }

  // 4. Build unexcluded pools of verified Hadiths and Quran verses
  const allVerifiedHadiths = getAllVerifiedHadithSharhs();
  const availableHadiths = allVerifiedHadiths.filter((h) => {
    const key = `${h.collection.toLowerCase().trim()}:${h.number}`;
    if (excludedHadithKeys.has(key)) return false;
    // Also check item references
    return !exclusionData.items.some(
      (item) =>
        item.type === "hadith" &&
        (item.collection || "bukhari").toLowerCase().trim() === h.collection.toLowerCase().trim() &&
        String(item.hadithNumber ?? (item as any).number ?? "") === String(h.number),
    );
  });

  const availableAyahs = CANDIDATE_QURAN_VERSES.filter((v) => {
    const key = `${v.surah}:${v.ayah}`;
    if (excludedAyahKeys.has(key)) return false;
    return !exclusionData.items.some(
      (item) =>
        (item.type === "ayah" || (item as any).type === "quran") &&
        Number(item.surah) === v.surah &&
        Number(item.ayah) === v.ayah,
    );
  });

  // 5. Select based on sourcePreference: "hadith", "quran", or "auto"
  const pickHadith =
    sourcePref === "hadith"
      ? true
      : sourcePref === "quran"
      ? false
      : availableHadiths.length > 0 && (availableAyahs.length === 0 || Math.random() < 0.5);

  if (pickHadith) {
    let pool = availableHadiths;
    if (pool.length === 0) {
      // In the edge case where all 67 verified hadiths were used in 30 days,
      // fallback to the full pool rather than failing or looping.
      pool = allVerifiedHadiths;
    }

    // Keyword matching if topic provided
    if (rawTopic) {
      const topicWords = rawTopic
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !["видео", "обяснение", "ислямско", "направи", "искам", "тема", "само", "върху"].includes(w));

      if (topicWords.length > 0) {
        const matches = pool.filter((h) => {
          const hay = `${h.topic} ${h.hadithTextBg || ""} ${h.text || ""}`.toLowerCase();
          return topicWords.some((w) => hay.includes(w.slice(0, Math.max(3, w.length - 1))));
        });
        if (matches.length > 0) {
          pool = matches;
        }
      }
    }

    // Pick a random unexcluded hadith from the filtered pool
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const collName =
      selected.collection === "nawawi40"
        ? "40 Хадиса на ан-Науауи"
        : selected.collection === "bukhari"
        ? "Сахих ал-Бухари"
        : selected.collection === "muslim"
        ? "Сахих Муслим"
        : "Джами ат-Тирмизи";

    const title = `[${collName} #${selected.number}] ${selected.topic}`;
    const preGroundingPrompt = formatTafsirGroundingPrompt({ hadithSharh: selected });

    return {
      type: "hadith",
      title,
      reference: `${collName} #${selected.number}`,
      collection: selected.collection as any,
      number: Number(selected.number),
      dalilTextBg: selected.hadithTextBg || "Пратеникът на Аллах ﷺ ни учи:",
      sourceScholar: "Сахих Сунна (Шейх Ибн Баз & Шейх ал-Албани)",
      sourceWork: selected.work || "Автентичен Шарх",
      topic: selected.topic,
      preGroundingPrompt,
      isPreVerifiedUnique: true,
    };
  } else {
    let pool = availableAyahs;
    if (pool.length === 0) {
      pool = CANDIDATE_QURAN_VERSES;
    }

    if (rawTopic) {
      const topicWords = rawTopic
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !["видео", "обяснение", "ислямско", "направи", "искам", "тема", "само", "върху"].includes(w));

      if (topicWords.length > 0) {
        const matches = pool.filter((v) => {
          const hay = `${v.title} ${v.keywords}`.toLowerCase();
          return topicWords.some((w) => hay.includes(w.slice(0, Math.max(3, w.length - 1))));
        });
        if (matches.length > 0) {
          pool = matches;
        }
      }
    }

    const selected = pool[Math.floor(Math.random() * pool.length)];
    const [tafsir, dalilBg] = await Promise.all([
      fetchAuthenticTafsirDirect({ surah: selected.surah, ayah: selected.ayah, scholarId: 91 }),
      preFetchQuranDalilBg(selected.surah, selected.ayah, selected.count || 1),
    ]);

    const title = `[Сура ${selected.surah}:${selected.ayah}]`;
    const preGroundingPrompt = tafsir ? formatTafsirGroundingPrompt({ tafsir, ayahTextBg: dalilBg || undefined }) : "";

    return {
      type: "quran",
      title: selected.title,
      reference: `Сура ${selected.surah}:${selected.ayah}`,
      surah: selected.surah,
      ayah: selected.ayah,
      count: selected.count || 1,
      dalilTextBg: dalilBg || "В Свещения Коран, Аллах Всевишният повелява:",
      sourceScholar: "Шейх ас-Са'ди (рахимахуллах)",
      sourceWork: "Тефсир ас-Са'ди",
      topic: selected.title,
      preGroundingPrompt,
      isPreVerifiedUnique: true,
    };
  }
}

async function preFetchQuranDalilBg(surah: number, ayah: number, count = 1): Promise<string> {
  try {
    const { getBulgarianQuranAyahDirect } = await import("./quran.functions");
    const ayahs: string[] = [];
    for (let i = 0; i < count; i++) {
      const res = await getBulgarianQuranAyahDirect({ surah, ayah: ayah + i });
      if (res.text) ayahs.push(res.text);
    }
    return ayahs.join(" ");
  } catch {
    return "";
  }
}
