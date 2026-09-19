/// <reference path="../types/declarations.d.ts" />
import { createServerFn } from "@tanstack/react-start";
import * as googleTTS from "google-tts-api";
import mp3Duration from "mp3-duration";
import { sanitizeTheologicalRespect } from "./theological-sanitizer";
import { normalizeBulgarianNumbersForTts, integerToBulgarianWords } from "./bulgarian-numbers";
import { normalizeAllIslamicPhonetics, normalizeIslamicPhoneticsToDisplayWord } from "./islamic-phonetics";

export { normalizeBulgarianNumbersForTts, integerToBulgarianWords, normalizeAllIslamicPhonetics };

export type WordTiming = { start: number; end: number; word: string };

function estimateWordTimings(text: string, totalDuration: number): WordTiming[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  // Phonetic cost weighting + punctuation pauses for rhythmic accuracy
  const speechCost = (w: string) => {
    let cost = 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.55;
    if (/[.!?…]$/.test(w)) cost += 3.5;
    else if (/[,;:—]$/.test(w)) cost += 1.8;
    return cost;
  };
  const costs = words.map(speechCost);
  const totalCost = costs.reduce((sum, c) => sum + c, 0) || 1;

  const timings: WordTiming[] = [];
  let currentCost = 0;

  const leadSilence = 0.05;
  const tailSilence = 0.1;
  const speechDuration = Math.max(0.5, totalDuration - leadSilence - tailSilence);

  for (let i = 0; i < words.length; i++) {
    const startFrac = currentCost / totalCost;
    currentCost += costs[i];
    const endFrac = currentCost / totalCost;

    const start = Math.round((leadSilence + startFrac * speechDuration) * 1000) / 1000;
    const end = Math.round((leadSilence + endFrac * speechDuration) * 1000) / 1000;

    timings.push({
      start,
      end,
      word: words[i],
    });
  }

  return timings;
}

function parseElevenLabsTimings(
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }
): WordTiming[] {
  const timings: WordTiming[] = [];
  const chars = alignment.characters || [];
  const starts = alignment.character_start_times_seconds || [];
  const ends = alignment.character_end_times_seconds || [];

  let curWord = "";
  let curStart: number | null = null;
  let curEnd = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\S/.test(ch)) {
      if (curStart === null) curStart = starts[i];
      curWord += ch;
      curEnd = ends[i];
    } else if (curWord.length > 0) {
      if (curStart !== null && curEnd > curStart) {
        const cleanWord = curWord.replace(/^[\s.,:;!?…\-—–'"„“”«»]+|[\s.,:;!?…\-—–'"„“”«»]+$/g, "").trim();
        if (cleanWord.length > 0) {
          timings.push({
            start: Math.round(curStart * 1000) / 1000,
            end: Math.round(curEnd * 1000) / 1000,
            word: curWord,
          });
        }
      }
      curWord = "";
      curStart = null;
    }
  }
  if (curWord.length > 0 && curStart !== null && curEnd > curStart) {
    const cleanWord = curWord.replace(/^[\s.,:;!?…\-—–'"„“”«»]+|[\s.,:;!?…\-—–'"„“”«»]+$/g, "").trim();
    if (cleanWord.length > 0) {
      timings.push({
        start: Math.round(curStart * 1000) / 1000,
        end: Math.round(curEnd * 1000) / 1000,
        word: curWord,
      });
    }
  }

  return timings;
}

function parseVttTimings(vttText: string): WordTiming[] {
  const timings: WordTiming[] = [];
  const cues = vttText.split(/\r?\n\r?\n/);
  const parseTime = (str: string) => {
    const parts = str.trim().replace(",", ".").split(":");
    if (parts.length === 3) {
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    }
    if (parts.length === 2) {
      return Number(parts[0]) * 60 + Number(parts[1]);
    }
    return 0;
  };

  for (const cue of cues) {
    const lines = cue.trim().split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->")) {
        const [startStr, endStr] = lines[i].split("-->");
        const start = parseTime(startStr);
        const end = parseTime(endStr);
        const text = lines.slice(i + 1).join(" ").trim();
        const words = text.split(/\s+/).filter(Boolean);
        // Exclude standalone dots/punctuation tokens (e.g. "...", "....", ",")
        const validWords = words.filter((w) => {
          const stripped = w.replace(/^[\s.,:;!?…\-—–'"„“”«»]+|[\s.,:;!?…\-—–'"„“”«»]+$/g, "").trim();
          return stripped.length > 0;
        });
        if (validWords.length > 0 && end > start) {
          const dur = end - start;
          for (let w = 0; w < validWords.length; w++) {
            const wStart = start + (w / validWords.length) * dur;
            const wEnd = start + ((w + 1) / validWords.length) * dur;
            timings.push({
              start: Math.round(wStart * 1000) / 1000,
              end: Math.round(wEnd * 1000) / 1000,
              word: validWords[w],
            });
          }
        }
        break;
      }
    }
  }
  return timings;
}

export function normalizeIslamicArabicPhoneticsForTts(text: string): string {
  if (!text) return "";

  let res = text;

  const replaceWord = (pattern: string, replacement: string) => {
    const reg = new RegExp(`(?<=^|[^\\p{L}\\p{N}])(?:${pattern})(?=[^\\p{L}\\p{N}]|$)`, "gui");
    res = res.replace(reg, replacement);
  };

  // 0. Salafi Adab Gate: Reverence for Allah & Tawheed titles (eliminate diminutive "единичкият" & casual 'оня')
  res = sanitizeTheologicalRespect(res);

  // 1. Invocations, Honorifics & Abbreviations
  res = res
    .replace(/\(\s*с\s*\/\s*у\s*\)/gi, " Саллаллааху 'алейхи ва саллям ")
    .replace(/(?<=^|[^\p{L}\p{N}])с\s*\/\s*у(?=[^\p{L}\p{N}]|$)/gui, " Саллаллааху 'алейхи ва саллям ")
    .replace(/(?:\(\s*(?:с\.а\.с\.|с\.а\.в\.|saw|pbuh)\s*\)|(?<=^|[^\p{L}\p{N}])(?:с\.а\.с\.|с\.а\.в\.|ﷺ)(?=[^\p{L}\p{N}]|$))/gui, " Саллаллааху 'алейхи ва саллям ")
    .replace(/(?<=^|[^\p{L}\p{N}])(?:с\.в\.т\.|swt|свт)(?=[^\p{L}\p{N}]|$)/gui, " Субхаанаху ва Та'ааля ")
    .replace(/(?:\(\s*(?:р\.а\.|ra|ра)\s*\)|(?<=^|[^\p{L}\p{N}])(?:р\.а\.)(?=[^\p{L}\p{N}]|$))/gui, " Радийаллааху 'анху ")
    .replace(/(?<=^|[^\p{L}\p{N}])(?:radiyallahu\s+anhu|радияллаху\s+анху)(?=[^\p{L}\p{N}]|$)/gui, " Радийаллааху 'анху ");

  // Disabled: We let the TTS engine natively read digits to keep subtitle timings 1:1 with digits.
  // 1.6. Authentic Arabic Quran Surah Names & Islamic Terminologies Normalization
  // Ensures all 114 Quran Surah names (e.g. Ал-Фатиха, Ал-Бакара, Ал-Ихляс, Аш-Шарх, Ал-Мулк, Ар-Рахман)
  // and Islamic concepts/phrases are pronounced with authentic Arabic tajweed/salafi diction
  res = normalizeAllIslamicPhonetics(res);

  // 2. Astaghfirullah & Istighfar (Salafi Arabic Diction - user requirement)
  // Replaces "astafirullah", "астафируллах", "астафирулла", "astaghfirullah" with authentic Arabic Salafi "Астагфируллаах"
  replaceWord("(?:astafirullah|astafirulla|astaghfirullah|astaghfirulla|астафируллах|астафирулла|астагфирулла|астагфируллах)", "Астагфируллаах");
  replaceWord("(?:astaghfirullahal\\s+adheem|astaghfirullahal\\s+azim|астагфируллах\\s+ал-?ази[йм]м?|астафируллах\\s+ал-?ази[йм]м?)", "Астагфируллаах ал-Азиим");
  replaceWord("(?:istighfar|istigfar|истигфар)", "истигфаар");
  replaceWord("истигфара", "истигфаара");
  replaceWord("истигфарът", "истигфаарът");

  // 3. SubhanAllah, Alhamdulillah, Allahu Akbar, Bismillah
  replaceWord("(?:subhanallah|subhan\\s+allah|субханаллах)", "Субхааналлаах");
  replaceWord("(?:subhanahu\\s+wa\\s+ta'?ala|subhanahu\\s+wa\\s+taala|субханаху\\s+ва\\s+та'?а[ля|ла])", "Субхаанаху ва Та'ааля");
  replaceWord("(?:alhamdulillah|al\\s+hamdulillah|elhamdulillah|алхамдулиллях|алхамдулиллах|елхамдулиллях)", "Алхамдулиллаах");
  replaceWord("(?:bismillah\\s+ar-?rahmani?\\s+ar-?rahim|bismillahi\\s+ar-?rahmani?\\s+ar-?rahim|бисмилляхир\\s+рахманир\\s+рахим|бисмиллахир\\s+рахманир\\s+рахим)", "Бисмилляяхи р-Рахмаани р-Рахийм");
  replaceWord("(?:bismillah|bismillahi|бисмиллях|бисмиллах)", "Бисмилляях");
  replaceWord("(?:allahu\\s+akbar|allahuakbar|аллаху\\s+акбар)", "Аллааху Акбар");
  replaceWord("(?:la\\s+ilaha\\s+illallah|la\\s+ilaha\\s+illa\\s+allah|ля\\s+иляха\\s+илляллах|ля\\s+иляха\\s+иллаллах)", "Ляя иляяха илляллаах");
  replaceWord("(?:la\\s+hawla\\s+wa\\s+la\\s+quwwata\\s+illa\\s+billah|ля\\s+хаула\\s+ва\\s+ля\\s+куввата\\s+илля\\s+биллях)", "Ляя хауля ва ляя куувата илляя билляах");
  replaceWord("(?:hasbunallah|hasbunallahu\\s+wa\\s+ni'mal\\s+wakeel|хасбуналлах|хасбуналлаху\\s+ва\\s+ни'ма\\s+ал-вакил)", "Хасбуналлааху ва ни'ма-л-Вакиил");

  // 4. Inshallah, MashaAllah, JazakAllah, BarakAllah
  replaceWord("(?:inshallah|in\\s+sha\\s+allah|inshaallah|иншаллах|иншааллах|ин\\s+шаа\\s+аллах)", "Ин шаа Аллаах");
  replaceWord("(?:mashaallah|ma\\s+sha\\s+allah|mashallah|машаллах|машааллах|ма\\s+шаа\\s+аллах)", "Маа шаа Аллаах");
  replaceWord("(?:jazakallahu\\s+khayran|jazakallah\\s+khair|jazakallah|джазакаллаху\\s+хайран|джазакаллах\\s+хайран|джазакаллах)", "Джазаакаллааху хайран");
  replaceWord("(?:barakallahu\\s+feek|barakallahu\\s+fik|barakallah|баракаллаху\\s+фик|баракаллах)", "Бааракаллааху фийк");

  // 5. Salawat & Companions
  replaceWord("(?:sallallahu\\s+alayhi\\s+wa\\s+sallam|sallallahu\\s+alaihi\\s+wa\\s+sallam|саллаллаху\\s+алейхи\\s+уа\\s+саллям|саллаллаху\\s+алейхи\\s+ва\\s+саллям|саллаллаху\\s+алейхи\\s+ва\\s+селлем)", "Саллаллааху 'алейхи ва саллям");
  replaceWord("(?:radiyallahu\\s+anhu|radiallahu\\s+anhu|радияллаху\\s+анху|радиалаху\\s+анху)", "Радийаллааху 'анху");
  replaceWord("(?:radiyallahu\\s+anha|radiallahu\\s+anha|радияллаху\\s+анха|радиалаху\\s+анха)", "Радийаллааху 'анхаа");
  replaceWord("(?:radiyallahu\\s+anhum|radiallahu\\s+anhum|радияллаху\\s+анхум|радиалаху\\s+анхум)", "Радийаллааху 'анхум");

  // 6. Islamic Creed & Concepts (Aqeedah / Fiqh)
  replaceWord("(?:tawheed|tawhid|таухид)", "таухиийд");
  replaceWord("таухида", "таухиийда");
  replaceWord("таухидът", "таухиийдът");
  replaceWord("(?:shirk|ширк)", "ширк");
  replaceWord("(?:bid'ah|bidah|бид'а|бид'ат|бида)", "бид'а");
  replaceWord("(?:sahih|сахих)", "сахийх");
  replaceWord("(?:hadith|ahadith|хадис)", "хадиис");
  replaceWord("хадиса", "хадииса");
  replaceWord("хадисът", "хадиисът");
  replaceWord("хадиси", "хадииси");
  replaceWord("хадисите", "хадиисите");
  replaceWord("(?:ayah|аят)", "аяат");
  replaceWord("аята", "аяата");
  replaceWord("аятът", "аяатът");
  replaceWord("(?:ayat|аяти)", "аяати");
  replaceWord("аятите", "аяатите");
  replaceWord("(?:surah|surat|сура)", "суура");
  replaceWord("сурата", "суурата");
  replaceWord("сури", "суури");
  replaceWord("сурите", "суурите");
  replaceWord("(?:quran|kur'an)", "Кур'аан");
  replaceWord("(?:dua|du'a|дуа)", "ду'аа");
  replaceWord("дуата", "ду'аата");
  replaceWord("(?:taqwa|таква)", "такваа");
  replaceWord("таквата", "такваата");
  replaceWord("(?:sabr|сабр)", "сабр");
  replaceWord("сабъра", "сабъра");
  replaceWord("(?:ikhlas|ихлас)", "ихлаас");
  replaceWord("ихласа", "ихлааса");
  replaceWord("(?:jannah|jannat|джанна|джаннат|дженнет)", "джаннат");
  replaceWord("(?:jahannam|джаханнам|дженхем)", "джаханнам");
  replaceWord("(?:salah|salat|салят)", "саляят");
  replaceWord("салята", "саляята");
  replaceWord("(?:sujood|sujud|суджуд|сежде)", "суджууд");
  replaceWord("суджуда", "суджууда");
  replaceWord("(?:ruku|руку)", "рукуу'");
  replaceWord("(?:sadaqah\\s+jariyah|sadaqa\\s+jariya|садака\\s+джария)", "садака джаария");
  replaceWord("(?:sadaqah|sadaqa|садака)", "садака");
  replaceWord("(?:zakat|закат)", "закаат");
  replaceWord("заката", "закаата");
  replaceWord("(?:ummah|умма)", "умма");
  replaceWord("уммата", "уммата");
  replaceWord("(?:fitnah|fitna|фитна)", "фитна");
  replaceWord("фитната", "фитната");
  replaceWord("(?:dawah|da'wah|дауа)", "да'уа");
  replaceWord("(?:qiyamah|qiyama|кияма|киямет|къямет)", "кияама");
  replaceWord("(?:shaytan|shaitan|шайтан|шейтан)", "шайтаан");
  replaceWord("шайтана", "шайтаана");
  replaceWord("(?:dajjal|al-dajjal|ал-даджал|ал-джаджали|даджал)", "Ал-Даджджаал");
  replaceWord("(?:kaaba|ka'bah|кааба)", "Ал-Ка'ба");

  // 7. Scholars & References
  replaceWord("(?:al-bukhari|bukhari|ал-бухари|бухари)", "Ал-Бухаари");
  replaceWord("(?:muslim|муслим)", "Муслим");
  replaceWord("ал-муслим", "Ал-Муслим");
  replaceWord("(?:at-tirmidhi|tirmidhi|ат-тирмизи|тирмизи|ал-тирмизи)", "Ат-Тирмизи");
  replaceWord("(?:abu\\s+dawud|abu\\s+dawood|абу\\s+давуд)", "Абу Даавуд");
  replaceWord("(?:an-nasa'i|an-nasai|nasai|ан-насаи)", "Ан-Насаа'и");
  replaceWord("(?:ibn\\s+majah|ибн\\s+маджа)", "Ибн Мааджа");
  replaceWord("(?:an-nawawi|nawawi|ан-навави|навави)", "Ан-Навави");
  replaceWord("(?:ibn\\s+kathir|ибн\\s+касир)", "Ибн Касиир");
  replaceWord("(?:ibn\\s+taymiyyah|ibn\\s+taymiyyah|ibn\\s+taymiya|ибн\\s+теймия|ибн\\s+таймия)", "Ибн Таймийя");
  replaceWord("(?:ibn\\s+al-qayyim|ibn\\s+qayyim|ибн\\s+ал-каййим)", "Ибн ал-Каййим");
  replaceWord("(?:al-albani|albani|ал-албани|албани)", "Ал-Албаани");
  replaceWord("(?:ibn\\s+baz|ибн\\s+баз)", "Ибн Бааз");
  replaceWord("(?:salafi\\s+shaykh\\s+ai|салафи\\s+шейх\\s+ai|салафи\\s+шейх\\s+аи)", "Салафи Шейх А И");
  replaceWord("(?:ibn\\s+uthaymeen|ibn\\s+uthaimeen|ибн\\s+усеймин|ибн\\s+утаймин)", "Ибн Усаймийн");

  // 8. Fix Arabic prefixes that cause Bulgarian TTS to expand them as abbreviations
  replaceWord("(?:Ар-Ра'д|Ar-Ra'd|Ра'д|Ra'd)", "Ар-Раад");
  res = res
    .replace(/(?<=^|[^\p{L}\p{N}])(А|а)л-(?=\p{L})/gu, "$1л ")
    .replace(/(?<=^|[^\p{L}\p{N}])(А|а)т-(?=\p{L})/gu, "$1т ")
    .replace(/(?<=^|[^\p{L}\p{N}])(А|а)н-(?=\p{L})/gu, "$1н ")
    .replace(/(?<=^|[^\p{L}\p{N}])(А|а)з-(?=\p{L})/gu, "$1з ")
    .replace(/(?<=^|[^\p{L}\p{N}])(А|а)с-(?=\p{L})/gu, "$1с ")
    .replace(/(?<=^|[^\p{L}\p{N}])(А|а)ш-(?=\p{L})/gu, "$1ш ")
    .replace(/(?<=^|[^\p{L}\p{N}])(А|а)д-(?=\p{L})/gu, "$1д ")
    .replace(/[_…]+/g, ", ")
    .replace(/\.{2,}/g, ", ")
    .replace(/,\s*,+/g, ", ")
    .replace(/[ \t]+/g, " ")
    .trim();

  return res;
}

export function normalizePhoneticsToDisplayWord(word: string): string {
  if (!word) return "";
  let clean = word.replace(/[\[\]]/g, "").trim();
  clean = clean.replace(/^\.{2,}|\.{2,}$/g, "").replace(/\.{2,}/g, "").trim();
  clean = clean.replace(/(?<=^|[^\p{L}\p{N}])Ар-Раад(?=[^\p{L}\p{N}]|$)/gui, "Ар-Ра'д");
  clean = normalizeIslamicPhoneticsToDisplayWord(clean);
  return clean
    .replace(/(?<=^|[^\p{L}\p{N}])Астагфируллаах(?=[^\p{L}\p{N}]|$)/gui, "Астагфируллах")
    .replace(/(?<=^|[^\p{L}\p{N}])Субхааналлаах(?=[^\p{L}\p{N}]|$)/gui, "Субханаллах")
    .replace(/(?<=^|[^\p{L}\p{N}])Алхамдулиллаах(?=[^\p{L}\p{N}]|$)/gui, "Алхамдулиллях")
    .replace(/(?<=^|[^\p{L}\p{N}])Аллааху(?=[^\p{L}\p{N}]|$)/gui, "Аллаху")
    .replace(/(?<=^|[^\p{L}\p{N}])Бисмилляях(?=[^\p{L}\p{N}]|$)/gui, "Бисмиллях")
    .replace(/(?<=^|[^\p{L}\p{N}])Ляя(?=[^\p{L}\p{N}]|$)/gui, "Ля")
    .replace(/(?<=^|[^\p{L}\p{N}])иляяха(?=[^\p{L}\p{N}]|$)/gui, "иляха")
    .replace(/(?<=^|[^\p{L}\p{N}])илляллаах(?=[^\p{L}\p{N}]|$)/gui, "илляллах")
    .replace(/(?<=^|[^\p{L}\p{N}])таухиийд/gui, "таухид")
    .replace(/(?<=^|[^\p{L}\p{N}])истигфаар/gui, "истигфар")
    .replace(/(?<=^|[^\p{L}\p{N}])сахийх/gui, "сахих")
    .replace(/(?<=^|[^\p{L}\p{N}])хадиис/gui, "хадис")
    .replace(/(?<=^|[^\p{L}\p{N}])аяат/gui, "аят")
    .replace(/(?<=^|[^\p{L}\p{N}])суура/gui, "сура")
    .replace(/(?<=^|[^\p{L}\p{N}])ду'аа/gui, "дуа")
    .replace(/(?<=^|[^\p{L}\p{N}])такваа/gui, "таква")
    .replace(/(?<=^|[^\p{L}\p{N}])ихлаас/gui, "ихлас")
    .replace(/(?<=^|[^\p{L}\p{N}])шайтаан/gui, "шайтан")
    .replace(/(?<=^|[^\p{L}\p{N}])саляят/gui, "салят")
    .replace(/(?<=^|[^\p{L}\p{N}])суджууд/gui, "суджуд");
}

export const synthesizeHadithNarration = createServerFn({ method: "POST" })
  .validator((input: { text: string; reference?: string }) => {
    const text = String(input.text ?? "").trim();
    if (!text) throw new Error("Празен текст за озвучаване");
    if (text.length > 4500) throw new Error("Текстът е твърде дълъг за един запис");
    return { text, reference: input.reference ?? "" };
  })
  .handler(async ({ data }): Promise<{
    base64: string;
    mimeType: string;
    wordTimings: WordTiming[];
  }> => {
    // Authentically normalize Islamic Arabic terminology for Salafi Arabic diction
    const cleaned = normalizeIslamicArabicPhoneticsForTts(data.text);

    let audioBuffer: any = null;
    let exactWordTimings: WordTiming[] | null = null;
    const BufferMod = (await import("node:buffer")).Buffer;

    const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
    const elevenVoice = process.env.ELEVENLABS_VOICE_ID || process.env.VITE_ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Default: Adam (Deep, realistic male) / Multilingual v2

    if (elevenKey) {
      try {
        console.log("[tts] Synthesizing with ElevenLabs API (with-timestamps)...");
        const cleanForEleven = cleaned
          .replace(/<break[^>]*\/>/gi, ",\n\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/\[[^\]]*\]/g, " ")
          .replace(/[\[\]]/g, " ")
          .replace(/\.{2,}/g, ", ")
          .replace(/…+/g, ", ")
          .replace(/,\s*,+/g, ", ")
          .replace(/\s{2,}/g, " ")
          .trim();
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}/with-timestamps`, {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: cleanForEleven,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
            },
          }),
        });
        if (res.ok) {
          const jsonRes = await res.json();
          if (jsonRes.audio_base64) {
            audioBuffer = BufferMod.from(jsonRes.audio_base64, "base64");
            if (jsonRes.alignment) {
              const parsed = parseElevenLabsTimings(jsonRes.alignment);
              if (parsed.length > 0) {
                exactWordTimings = parsed;
              }
            }
            console.log("[tts] Successfully generated audio & exact timestamps via ElevenLabs");
          }
        } else {
          console.warn(`[tts] ElevenLabs API error ${res.status}: ${await res.text()}, falling back to EdgeTTS`);
        }
      } catch (err) {
        console.warn("[tts] ElevenLabs request failed, falling back to EdgeTTS:", err);
      }
    }

    if (!audioBuffer) {
      const { EdgeTTS } = await import("node-edge-tts");
      const tts = new EdgeTTS({
        voice: "bg-BG-BorislavNeural", // Premium natural male voice for Bulgarian
        lang: "bg-BG",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        rate: "-2%",
        pitch: "-2Hz",
      });

      try {
        const os = await import("os");
        const path = await import("path");
        const fs = await import("fs/promises");

        const tmpPath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
        const cleanForEdge = cleaned
          .replace(/<break[^>]*\/>/gi, ",\n\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/\[[^\]]*\]/g, " ")
          .replace(/[\[\]]/g, " ")
          .replace(/\.{2,}/g, ", ")
          .replace(/…+/g, ", ")
          .replace(/,\s*,+/g, ", ")
          .replace(/\s{2,}/g, " ")
          .trim();
        await tts.ttsPromise(cleanForEdge, tmpPath);
        audioBuffer = await fs.readFile(tmpPath);
        await fs.unlink(tmpPath).catch(() => {});
      } catch (e: any) {
        console.warn("[tts] Node EdgeTTS failed, trying Python edge-tts realistic male voice:", e);
        try {
          const os = await import("os");
          const path = await import("path");
          const fs = await import("fs/promises");
          const { execFile } = await import("child_process");
          const util = await import("util");
          const execFileAsync = util.promisify(execFile);

          const tmpPyPath = path.join(os.tmpdir(), `py-tts-${Date.now()}.mp3`);
          const tmpVttPath = path.join(os.tmpdir(), `py-tts-${Date.now()}.vtt`);
          const cleanForEdge = cleaned
            .replace(/<break[^>]*\/>/gi, ",\n\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/\[[^\]]*\]/g, " ")
            .replace(/[\[\]]/g, " ")
            .replace(/\.{2,}/g, ", ")
            .replace(/…+/g, ", ")
            .replace(/,\s*,+/g, ", ")
            .replace(/\s{2,}/g, " ")
            .trim();
          await execFileAsync("edge-tts", [
            "--voice", "bg-BG-BorislavNeural",
            "--text", cleanForEdge,
            "--write-media", tmpPyPath,
            "--write-subtitles", tmpVttPath
          ]);
          audioBuffer = await fs.readFile(tmpPyPath);
          try {
            const vttContent = await fs.readFile(tmpVttPath, "utf-8");
            const parsedVtt = parseVttTimings(vttContent);
            if (parsedVtt.length > 0) {
              exactWordTimings = parsedVtt;
            }
          } catch { /* ignore vtt parse errors */ }
          await fs.unlink(tmpPyPath).catch(() => {});
          await fs.unlink(tmpVttPath).catch(() => {});
        } catch (pyErr) {
          console.warn("[tts] Python edge-tts failed, falling back to Google TTS:", pyErr);
          try {
            const cleanForGoogle = cleaned
              .replace(/<break[^>]*\/>/gi, ", ")
              .replace(/<[^>]+>/g, " ")
              .replace(/\[[^\]]*\]/g, " ")
              .replace(/[\[\]]/g, " ")
              .replace(/\.{2,}/g, ", ")
              .replace(/…+/g, ", ")
              .replace(/,\s*,+/g, ", ")
              .replace(/\s{2,}/g, " ")
              .trim();
            const base64Audio = await googleTTS.getAudioBase64(cleanForGoogle.slice(0, 200), {
              lang: "bg",
              slow: false,
              host: "https://translate.google.com",
              timeout: 10000,
            });
            audioBuffer = BufferMod.from(base64Audio, "base64");
          } catch (gErr: any) {
            throw new Error("Грешка при генериране на аудио озвучаване: " + (e?.message || gErr?.message || "Неуспешен запис"));
          }
        }
      }
    }

    // Get exact audio duration (probe via ffprobe with fallback to mp3Duration)
    let duration = 5; // fallback
    try {
      const { execFile } = await import("child_process");
      const util = await import("util");
      const execFileAsync = util.promisify(execFile);
      const os = await import("os");
      const path = await import("path");
      const fs = await import("fs/promises");
      const tmpProbe = path.join(os.tmpdir(), `probe-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
      await fs.writeFile(tmpProbe, audioBuffer);
      try {
        const { stdout } = await execFileAsync("ffprobe", [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1",
          tmpProbe,
        ]);
        const parsed = parseFloat(stdout.trim());
        if (!isNaN(parsed) && parsed > 0) {
          duration = parsed;
        }
      } finally {
        await fs.unlink(tmpProbe).catch(() => {});
      }
    } catch {
      try {
        duration = await mp3Duration(audioBuffer);
      } catch (err) {
        console.warn("Failed to get MP3 duration", err);
      }
    }

    let wordTimings = exactWordTimings || estimateWordTimings(cleaned, duration);

    if (!exactWordTimings) {
      try {
        const { detectSpeechIntervals, alignTimestampsToSpeech } = await import("./audio-align.functions");
        const base64Url = `data:audio/mp3;base64,${audioBuffer.toString("base64")}`;
        const speechIntervals = await detectSpeechIntervals(base64Url);
        if (speechIntervals.length > 0) {
          wordTimings = alignTimestampsToSpeech(wordTimings, speechIntervals);
        }
      } catch (alignErr) {
        console.warn("Audio alignment fallback:", alignErr);
      }
    }

    const { verifyAndCorrectSubtitleSync } = await import("./subtitle-sync.functions");
    const verified = verifyAndCorrectSubtitleSync(wordTimings, duration);
    wordTimings = verified.correctedTimings.map((t: WordTiming) => ({
      ...t,
      word: normalizePhoneticsToDisplayWord(t.word),
    }));

    return {
      base64: audioBuffer.toString("base64"),
      mimeType: "audio/mpeg",
      wordTimings,
    };
  });
