import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { fetchAyah, type AyahData } from "@/lib/quran.functions";
import { fetchHadith, listHadiths, type HadithData } from "@/lib/hadith.functions";
import { fetchSunnahHadith, randomSahihHadith, type SunnahCollection } from "@/lib/sunnah.functions";
import { translateToBulgarian } from "@/lib/translate.functions";
import { suggestBackgrounds, generateBackground } from "@/lib/backgrounds.functions";
import { searchPexelsPhotos, searchPexelsVideos, fetchMultiSceneBRoll } from "@/lib/pexels.functions";
import { suggestViral } from "@/lib/suggestions.functions";
import { createSameOriginDownloadUrl, createSameOriginMediaUrl, cleanMediaMimeType, isIOSMediaDevice, sanitizeFilename, saveMediaBlob, saveMediaFromUrl } from "@/lib/download-media";
import { renderPhoto, blobToBase64, type RenderOptions } from "@/lib/render-photo";
import { renderVideo } from "@/lib/render-video";
import { enqueueDownload } from "@/lib/downloads-queue";
import { synthesizeHadithNarration } from "@/lib/tts.functions";
import { runServerRender, startServerRenderJob } from "@/lib/render.functions";
import { formatViralSocialCaption } from "@/lib/caption.functions";
import { generateViralThumbnail } from "@/lib/thumbnail.functions";
import { alignAudioTimestamps } from "@/lib/audio-align.functions";
import { verifyAndCorrectSubtitleSync } from "@/lib/subtitle-sync.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, Image as ImageIcon, Wand2, Upload, Download, Flame, BookOpen, ScrollText, Film, Mic, Copy } from "lucide-react";

type BgSuggestion = { label: string; prompt: string };
type ViralItem = { kind: string; ref: string; title_bg: string; reason_bg: string; score: number };
type Content = {
  source_type: "ayah" | "hadith";
  source_ref: string;
  arabic: string;
  english: string;
  bulgarian?: string;
  audioUrl?: string;
  wordSegments?: { start: number; end: number }[];
  ayahBounds?: { ayah: number; start: number; end: number; arabic: string; english: string }[];
  arabicWordCount?: number;
};

export const Route = createFileRoute("/_app/create")({
  head: () => ({ meta: [{ title: "Създай — Nur Studio" }] }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const runFetchAyah = useServerFn(fetchAyah);
  const runFetchHadith = useServerFn(fetchHadith);
  const runListHadiths = useServerFn(listHadiths);
  const runFetchSunnah = useServerFn(fetchSunnahHadith);
  const runRandomSahih = useServerFn(randomSahihHadith);
  const runTranslate = useServerFn(translateToBulgarian);
  const runSuggest = useServerFn(suggestBackgrounds);
  const runGenerate = useServerFn(generateBackground);
  const runPexels = useServerFn(searchPexelsPhotos);
  const runPexelsVideos = useServerFn(searchPexelsVideos);
  const runSuggestViral = useServerFn(suggestViral);
  const runNarrate = useServerFn(synthesizeHadithNarration);
  const runFetchMultiScene = useServerFn(fetchMultiSceneBRoll);

  // sources
  const [tab, setTab] = useState<"ayah" | "hadith" | "viral">("ayah");
  const [surah, setSurah] = useState<number | "">("");
  const [ayah, setAyah] = useState<number | "">("");
  const [ayahEnd, setAyahEnd] = useState<number | "">("");
  const [hadithNum, setHadithNum] = useState<number | "">("");
  const [hadithList, setHadithList] = useState<HadithData[]>([]);
  const [hadithSource, setHadithSource] = useState<"nawawi40" | SunnahCollection>("bukhari");
  const [sunnahNum, setSunnahNum] = useState<number | "">("");
  const [theme, setTheme] = useState("надежда и спокойствие в трудни моменти");
  const [viral, setViral] = useState<ViralItem[]>([]);
  const [suggestingViral, setSuggestingViral] = useState(false);

  // current content
  const [content, setContent] = useState<Content | null>(null);
  const [bulgarian, setBulgarian] = useState("");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  // background
  const [suggestions, setSuggestions] = useState<BgSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgPrompt, setBgPrompt] = useState<string>("");
  const [bgVideoUrl, setBgVideoUrl] = useState<string | null>(null);
  const [pexelsPhotos, setPexelsPhotos] = useState<{ id: number; url: string; full: string; photographer: string }[]>([]);
  const [pexelsVideos, setPexelsVideos] = useState<{ id: number; link: string; poster: string; photographer: string; duration: number }[]>([]);
  const [pexelsQuery, setPexelsQuery] = useState<string>("");
  const [pexelsTheme, setPexelsTheme] = useState<string>("");
  const [pexelsTried, setPexelsTried] = useState<string[]>([]);
  const [pexelsAvoid, setPexelsAvoid] = useState<string[]>([]);
  const [pexelsLoading, setPexelsLoading] = useState(false);
  const [pexelsVideosLoading, setPexelsVideosLoading] = useState(false);
  const [minPexelsDuration, setMinPexelsDuration] = useState<number>(30);

  // audio: custom upload
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);

  // caption style + output format
  const [captionStyle, setCaptionStyle] = useState<RenderOptions["style"]>("lower-third");
  const [tiktokTheme, setTiktokTheme] = useState<"hormozi" | "gold" | "emerald" | "neon" | "classic">("hormozi");
  const [pacingMode, setPacingMode] = useState<"punchy" | "ayah">("punchy");
  const [aligningSync, setAligningSync] = useState(false);
  const [showTimingEditor, setShowTimingEditor] = useState(false);
  const [format, setFormat] = useState<"photo" | "video">("video");
  const [videoQuality, setVideoQuality] = useState<"1080p" | "720p">("1080p");
  const [renderMode, setRenderMode] = useState<"client" | "server">("server");
  // Bulgarian male narration (hadiths)
  const [useBgNarration, setUseBgNarration] = useState(true);
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [narrationTimings, setNarrationTimings] = useState<{ start: number; end: number; word?: string }[] | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [multiSceneUrls, setMultiSceneUrls] = useState<string[]>([]);
  const [multiSceneLoading, setMultiSceneLoading] = useState(false);

  // render
  const [rendering, setRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [renderedKind, setRenderedKind] = useState<"photo" | "video" | null>(null);
  const [renderedExt, setRenderedExt] = useState<"png" | "webm" | "mp4">("png");
  const [renderedMime, setRenderedMime] = useState<string>("image/png");
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [autoViralRunning, setAutoViralRunning] = useState(false);
  const [autoViralStep, setAutoViralStep] = useState<string>("");

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const clearRendered = () => {
    setRenderedUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setRenderedBlob(null);
  };

  const reset = () => {
    setContent(null); setBulgarian(""); setSuggestions([]); setBgUrl(null);
    setBgVideoUrl(null); setBgPrompt(""); clearRendered(); setCustomAudioUrl(null);
    setNarrationUrl(null); setNarrationTimings(null);
    setPexelsPhotos([]); setPexelsVideos([]); setPexelsTheme(""); setPexelsTried([]); setPexelsAvoid([]);
  };

  const loadAyah = async (s: number, a: number, aEnd?: number) => {
    setLoading(true); reset();
    try {
      const d: AyahData = await runFetchAyah({ data: { surah: s, ayah: a, ayahEnd: aEnd } });
      const refStr = d.ayahEnd && d.ayahEnd > d.ayah
        ? `Сура ${d.surah} (${d.surahName}) • Аяти ${d.ayah}–${d.ayahEnd}`
        : `Сура ${d.surah} (${d.surahName}) • Аят ${d.ayah}`;
      const c: Content = {
        source_type: "ayah",
        source_ref: refStr,
        arabic: d.arabic, english: d.english, audioUrl: d.audioUrl,
        wordSegments: d.wordSegments, ayahBounds: d.ayahBounds, arabicWordCount: d.arabicWordCount,
      };
      setContent(c);
      setTranslating(true);
      const t = await runTranslate({ data: { english: d.english, sourceRef: c.source_ref, ayahBounds: d.ayahBounds } });
      setBulgarian(t.bulgarian);
      if (t.ayahBounds) {
        c.ayahBounds = t.ayahBounds;
        setContent({ ...c, ayahBounds: t.ayahBounds });
      }
      toast.success(t.cached ? "От кеша" : "Преведено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setLoading(false); setTranslating(false); }
  };

  const loadHadith = async (n: number) => {
    setLoading(true); reset();
    try {
      const h = await runFetchHadith({ data: { number: n } });
      const c: Content = {
        source_type: "hadith",
        source_ref: `${h.reference}`,
        arabic: h.arabic, english: h.english,
      };
      setContent(c);
      setTranslating(true);
      const t = await runTranslate({ data: { arabic: h.arabic, english: h.english, sourceRef: h.reference } });
      setBulgarian(t.bulgarian);
      toast.success(t.cached ? "От кеша" : "Преведено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setLoading(false); setTranslating(false); }
  };

  const loadHadithIndex = async () => {
    if (hadithList.length) return;
    try { setHadithList(await runListHadiths()); } catch { /* ignore */ }
  };

  const loadSunnah = async (collection: SunnahCollection, number: number, requireSahih = true) => {
    setLoading(true); reset();
    try {
      const h = await runFetchSunnah({ data: { collection, number, requireSahih } });
      const c: Content = {
        source_type: "hadith",
        source_ref: `${h.reference}`,
        arabic: h.arabic, english: h.english,
      };
      setContent(c);
      setTranslating(true);
      const t = await runTranslate({ data: { arabic: h.arabic, english: h.english, sourceRef: h.reference } });
      setBulgarian(t.bulgarian);
      toast.success(`${h.reference} · ${h.grade ?? "Sahih"}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setLoading(false); setTranslating(false); }
  };

  const loadRandomSahih = async (collection: SunnahCollection) => {
    setLoading(true); reset();
    try {
      const h = await runRandomSahih({ data: { collection } });
      setSunnahNum(h.number);
      const c: Content = {
        source_type: "hadith",
        source_ref: `${h.reference}`,
        arabic: h.arabic, english: h.english,
      };
      setContent(c);
      setTranslating(true);
      const t = await runTranslate({ data: { arabic: h.arabic, english: h.english, sourceRef: h.reference } });
      setBulgarian(t.bulgarian);
      toast.success(`${h.reference} · ${h.grade ?? "Sahih"}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setLoading(false); setTranslating(false); }
  };

  const runViral = async () => {
    setSuggestingViral(true);
    try {
      const r = await runSuggestViral({ data: { theme, kind: "any" } });
      setViral(r.items);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setSuggestingViral(false); }
  };

  const approveViral = async (item: ViralItem) => {
    if (item.kind === "ayah") {
      const m = item.ref.match(/(\d+)\s*[:.\s-]\s*(\d+)/);
      if (!m) return toast.error("Невалидна препратка");
      setTab("ayah");
      setSurah(+m[1]); setAyah(+m[2]);
      await loadAyah(+m[1], +m[2]);
    } else {
      const collMatch = item.ref.toLowerCase().match(/(bukhari|muslim|dawud|tirmidhi|nasai|majah|nawawi)/);
      const m = item.ref.match(/(\d+)/);
      const n = m ? +m[1] : 1;
      
      setTab("hadith");
      if (collMatch) {
         let coll = collMatch[1] as string;
         if (coll === 'dawud') coll = 'abudawud';
         
         if (coll === 'nawawi') {
           setHadithSource("nawawi40");
           setHadithNum(n);
           await loadHadith(n);
         } else {
           setHadithSource(coll as SunnahCollection);
           setSunnahNum(n);
           await loadSunnah(coll as SunnahCollection, n, false); // Don't require sahih strict filter just in case AI recommended a hasan one
         }
      } else {
         // Fallback to Bukhari if collection not recognizable
         setHadithSource("bukhari");
         setSunnahNum(n);
         await loadSunnah("bukhari", n, false);
      }
    }
  };

  const onSuggest = async () => {
    if (!content) return;
    setSuggesting(true); setSuggestions([]);
    try {
      const r = await runSuggest({
        data: { text: `${content.english}\n\nБългарски: ${bulgarian}`, sourceRef: content.source_ref },
      });
      setSuggestions(r.suggestions);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setSuggesting(false); }
  };

  const onGenerateBg = async (idx: number, prompt: string) => {
    setGeneratingIdx(idx);
    try {
      const r = await runGenerate({ data: { prompt } });
      setBgUrl(`data:${r.mimeType};base64,${r.base64}`); setBgVideoUrl(null); setBgPrompt(prompt); clearRendered();
      toast.success("Фонът е готов");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setGeneratingIdx(null); }
  };

  const onPexelsSearch = async (overrideQuery?: string) => {
    if (!content) return;
    setPexelsLoading(true);
    try {
      const r = await runPexels({ data: { text: `${content.english}\n${bulgarian}`, query: overrideQuery ?? pexelsQuery, avoid: pexelsAvoid } });
      setPexelsPhotos(r.photos);
      setPexelsQuery(r.query);
      setPexelsTheme(r.theme ?? "");
      setPexelsTried(r.queriesTried ?? []);
      if (!r.photos.length) toast.message("Няма резултати — опитай друга тема");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setPexelsLoading(false); }
  };

  const onPexelsVideoSearch = async (overrideQuery?: string) => {
    if (!content) return;
    const textToSearch = `${content.english}${bulgarian ? `\n${bulgarian}` : ""}`;
    setPexelsVideosLoading(true);
    try {
      const r = await runPexelsVideos({ data: { text: textToSearch, query: overrideQuery ?? pexelsQuery, avoid: pexelsAvoid, minDuration: minPexelsDuration } });
      setPexelsVideos(r.videos);
      setPexelsQuery(r.query);
      setPexelsTheme(r.theme ?? "");
      setPexelsTried(r.queriesTried ?? []);
      if (!r.videos.length) toast.message("Няма видеа — опитай друга тема");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setPexelsVideosLoading(false); }
  };

  const onAutoPickPexelsVideo = async () => {
    if (!content) return;
    const textToSearch = `${content.english}${bulgarian ? `\n${bulgarian}` : ""}`;
    setPexelsVideosLoading(true);
    try {
      const r = await runPexelsVideos({ data: { text: textToSearch, avoid: pexelsAvoid, minDuration: minPexelsDuration } });
      setPexelsVideos(r.videos);
      setPexelsQuery(r.query);
      setPexelsTheme(r.theme ?? "");
      setPexelsTried(r.queriesTried ?? []);
      const best = r.videos[0];
      if (best) {
        setBgVideoUrl(best.link);
        setBgUrl(best.poster || null);
        setBgPrompt(`Pexels stock video by ${best.photographer} — ${r.theme || r.query}`);
        clearRendered();
        setFormat("video");
        toast.success(`Авто-избор: ${r.theme || r.query}`);
      } else {
        toast.message("Няма подходящи видеа");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setPexelsVideosLoading(false); }
  };

  const onRotateTheme = () => {
    const next = pexelsTheme ? [...new Set([...pexelsAvoid, pexelsTheme])].slice(-5) : pexelsAvoid;
    setPexelsAvoid(next);
    setTimeout(() => { onPexelsVideoSearch(); }, 0);
  };

  const handleFetchMultiScene = async () => {
    try {
      setMultiSceneLoading(true);
      toast.message("Избирам 3 кинематографични B-Roll сцени за динамичен монтаж...");
      const r = await runFetchMultiScene({ data: { query: pexelsQuery || content?.source_ref || "islamic nature" } });
      if (r.clips && r.clips.length > 1) {
        setMultiSceneUrls(r.clips);
        setBgVideoUrl(r.clips[0]);
        clearRendered();
        setFormat("video");
        toast.success(`Избрани ${r.clips.length} сменящи се B-Roll кадра (${r.theme})!`);
      } else {
        toast.message("Не бяха намерени достатъчно клипове, използва се един фон");
      }
    } catch (e: any) {
      toast.error(e?.message || "Грешка при избор на B-Roll");
    } finally {
      setMultiSceneLoading(false);
    }
  };

  useEffect(() => {
    if (content?.english) {
      void onPexelsVideoSearch();
    }
  }, [content?.english]);

  const onPickPexels = (photo: { url: string; full: string; photographer: string }) => {
    setBgUrl(photo.full); setBgVideoUrl(null);
    setBgPrompt(`Pexels stock photo by ${photo.photographer}`);
    clearRendered();
    toast.success("Стоковият фон е избран");
  };

  const onPickPexelsVideo = (v: { link: string; poster: string; photographer: string }) => {
    setBgVideoUrl(v.link);
    setBgUrl(v.poster || null);
    setBgPrompt(`Pexels stock video by ${v.photographer}`);
    clearRendered();
    if (format !== "video") {
      setFormat("video");
      toast.message("Превключих на видео — стоковите видеа работят само във видео режим.");
    } else {
      toast.success("Стоковото видео е избрано");
    }
  };

  const onAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) return toast.error("Файлът е твърде голям (макс 25MB)");
    try {
      toast.message("Зареждане и конвертиране на аудиото...");
      const base64Url = await blobToBase64(f);
      setCustomAudioUrl(base64Url);
      toast.success("Аудиото е заредено и готово за авто-синхронизация!");
    } catch (err) {
      toast.error("Не успях да заредя аудио файла");
    }
  };

  const handleAutoAlignSync = async () => {
    const audio = customAudioUrl || narrationUrl || content?.audioUrl;
    if (!audio) {
      toast.error("Първо генерирайте или качете аудио за синхронизиране!");
      return;
    }
    if (!bulgarian.trim()) {
      toast.error("Няма български текст за синхронизиране!");
      return;
    }
    setAligningSync(true);
    try {
      toast.message("Акустичен AI анализ на аудиото за синхронизация...");
      const words = bulgarian.split(/\s+/).filter(Boolean);
      const existingItems = narrationTimings && narrationTimings.length > 0 ? narrationTimings : words.map((w, idx) => ({ word: w, start: idx * 0.4, end: (idx + 1) * 0.4 }));
      const res = await runAlignTimestamps({
        data: {
          audioUrl: audio,
          items: existingItems,
          text: bulgarian,
        }
      });
      if (res.alignedItems && res.alignedItems.length > 0) {
        const verified = verifyAndCorrectSubtitleSync(res.alignedItems, res.intervals?.length ? res.intervals[res.intervals.length - 1].end : 15);
        setNarrationTimings(verified.correctedTimings);
        toast.success("Субтитрите са синхронизирани с милисекундна точност!");
      } else {
        toast.warning("Не бяха открити ясни думи в аудиото.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Грешка при синхронизацията на субтитрите");
    } finally {
      setAligningSync(false);
    }
  };

  const onRender = async () => {
    if (!content || !bulgarian) return;
    setRendering(true);
    try {
      if (format === "photo") {
        const blob = await renderPhoto({
          backgroundUrl: bgUrl,
          arabic: content.arabic,
          bulgarian,
          reference: content.source_ref,
          style: captionStyle,
          tiktokTheme,
          pacingMode,
        });
        if (renderedUrl) URL.revokeObjectURL(renderedUrl);
        setRenderedUrl(URL.createObjectURL(blob));
        setRenderedBlob(blob);
        setRenderedKind("photo");
        setRenderedExt("png");
        setRenderedMime("image/png");
        toast.success("Снимката е готова");
      } else {
        let narration = narrationUrl;
        let timings = narrationTimings;
        if (
          content.source_type === "hadith" &&
          useBgNarration &&
          !customAudioUrl &&
          !narration &&
          bulgarian.trim().length > 0
        ) {
          setNarrating(true);
          try {
            toast.message("Генерирам български глас…");
            const r = await runNarrate({ data: { text: bulgarian, reference: content.source_ref } });
            narration = `data:${r.mimeType};base64,${r.base64}`;
            timings = r.wordTimings ?? null;
            setNarrationUrl(narration);
            setNarrationTimings(timings);
          } catch (e: unknown) {
            throw new Error(e instanceof Error ? e.message : "Не успях да генерирам глас");
          } finally { setNarrating(false); }
        }
        const audio = customAudioUrl ?? narration ?? content.audioUrl ?? null;
        if (content.source_type === "hadith" && useBgNarration && !audio) {
          throw new Error("Първо генерирай гласа с „Чуй гласа“, за да не стане нямо или отрязано видео.");
        } else if (!audio) {
          toast.message("Без аудио — ще се рендира 8s видео.");
        }
        toast.message("Рендирам видео в реално време — изчакай края на аудиото.");
        
        const activeTimings = timings && timings.length > 0 ? timings : undefined;
        const opts = {
          backgroundUrl: bgUrl,
          backgroundVideoUrl: bgVideoUrl,
          arabic: content.arabic,
          bulgarian,
          reference: content.source_ref,
          style: captionStyle,
          tiktokTheme,
          pacingMode,
          audioUrl: audio,
          requireAudio: Boolean(audio),
          fallbackDuration: 8,
          wordSegments: customAudioUrl || narration ? undefined : content.wordSegments,
          ayahBounds: pacingMode === "ayah" && content.ayahBounds ? content.ayahBounds : (customAudioUrl || narration ? undefined : content.ayahBounds),
          arabicWordCount: customAudioUrl || narration ? undefined : content.arabicWordCount,
          bulgarianWordTimings: activeTimings,
          quality: videoQuality,
          bRollUrls: multiSceneUrls.length > 1 ? multiSceneUrls : undefined,
        };

        let blob: Blob;
        let mimeType: string;

        if (renderMode === "server") {
          toast.message("Стартирам фоново рендиране на сървъра...");
          await startServerRenderJob({
            data: {
              data: opts,
              title: content.source_ref || "Ислямско видео",
            },
          });
          toast.success("Видео се рендира във фонов режим на сървъра! Можеш да затвориш Safari и да го свалиш по-късно от Изтегляния.");
          setRendering(false);
          navigate({ to: "/downloads" });
          return;
        } else {
          const result = await renderVideo(opts);
          blob = result.blob;
          mimeType = result.mimeType;
        }

        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const title = sanitizeFilename(`${content?.source_ref ?? "nur-studio-video"}`);
        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await enqueueDownload({
          id,
          title,
          blob,
          ext,
          mimeType: cleanMediaMimeType(mimeType),
          createdAt: Date.now(),
        });
        toast.success("Видеото е готово! Прехвърляне към изтегляния...");
        navigate({ to: "/downloads" });
        return;
      }
      window.setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Грешка при рендиране");
    } finally { setRendering(false); }
  };

  const onOneClickAutoViralStudio = async () => {
    if (!content) {
      toast.error("Моля, първо избери Аят или Хадис от списъка вляво.");
      return;
    }
    setAutoViralRunning(true);
    try {
      let currentBulgarian = bulgarian;
      if (!currentBulgarian || !currentBulgarian.trim()) {
        setAutoViralStep("1/4: Превод на професионален български...");
        toast.message("⚡ 1-Click: Изготвяне на български превод...");
        const t = await runTranslate({
          data: {
            arabic: content.arabic,
            english: content.english,
            sourceRef: content.source_ref,
          },
        });
        currentBulgarian = t.translated || t.bulgarian || content.english;
        setBulgarian(currentBulgarian);
      }

      setAutoViralStep("2/4: Избор на кинематографични B-Roll кадри...");
      toast.message("⚡ 1-Click: Подбор на вертикални Pexels видеа без хора...");
      let activeBgVideoUrl = bgVideoUrl;
      let activeMultiUrls = multiSceneUrls;
      try {
        const query = pexelsQuery || content.source_ref || "islamic nature";
        const multiRes = await runFetchMultiScene({ data: { query } });
        if (multiRes.clips && multiRes.clips.length > 0) {
          activeMultiUrls = multiRes.clips;
          activeBgVideoUrl = multiRes.clips[0];
          setMultiSceneUrls(multiRes.clips);
          setBgVideoUrl(activeBgVideoUrl);
          setBgUrl(null);
        } else {
          const r = await runPexelsVideos({ data: { text: `${content.english}\n${currentBulgarian}`, avoid: pexelsAvoid, minDuration: minPexelsDuration } });
          if (r.videos && r.videos[0]) {
            activeBgVideoUrl = r.videos[0].link;
            setBgVideoUrl(activeBgVideoUrl);
            setBgUrl(r.videos[0].poster || null);
          }
        }
      } catch {}

      let activeAudioUrl = customAudioUrl ?? narrationUrl ?? content.audioUrl ?? null;
      let activeTimings = narrationTimings;
      if (!activeAudioUrl && currentBulgarian.trim().length > 0) {
        setAutoViralStep("3/4: Генериране на глас и акустично караоке...");
        toast.message("⚡ 1-Click: Синхронизиране на българска навигация...");
        const r = await runNarrate({ data: { text: currentBulgarian, reference: content.source_ref } });
        activeAudioUrl = `data:${r.mimeType};base64,${r.base64}`;
        activeTimings = r.wordTimings ?? null;
        setNarrationUrl(activeAudioUrl);
        setNarrationTimings(activeTimings);
      }

      setAutoViralStep("4/4: Стартиране на сървърно рендиране във формат Hormozi...");
      toast.message("⚡ 1-Click: Изпращане за рендиране на сървъра!");
      setTiktokTheme("hormozi");
      setCaptionStyle("lower-third");
      setPacingMode("punchy");
      setFormat("video");
      setUseBgNarration(true);
      setRenderMode("server");

      const activeTimingsFinal = activeTimings && activeTimings.length > 0 ? activeTimings : undefined;
      const opts = {
        backgroundUrl: bgUrl,
        backgroundVideoUrl: activeBgVideoUrl,
        arabic: content.arabic,
        bulgarian: currentBulgarian,
        reference: content.source_ref,
        style: "lower-third" as const,
        tiktokTheme: "hormozi" as const,
        pacingMode: "punchy" as const,
        audioUrl: activeAudioUrl,
        requireAudio: Boolean(activeAudioUrl),
        fallbackDuration: 8,
        ayahBounds: content.ayahBounds,
        arabicWordCount: content.arabicWordCount,
        bulgarianWordTimings: activeTimingsFinal,
        quality: videoQuality,
        bRollUrls: activeMultiUrls.length > 1 ? activeMultiUrls : undefined,
      };

      await startServerRenderJob({
        data: {
          data: opts,
          title: content.source_ref || "Ислямско видео",
        },
      });
      toast.success("🎯 1-Click Автоматизация завърши успешно! Видеото се рендира на сървъра. Прехвърляне към Изтегляния...");
      navigate({ to: "/downloads" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Грешка в 1-Click автоматизацията");
    } finally {
      setAutoViralRunning(false);
      setAutoViralStep("");
    }
  };

  const onDownload = async () => {
    if (!renderedUrl) return;
    const filename = sanitizeFilename(`${content?.source_ref ?? "post"}.${renderedExt}`);
    try {
      let result: Awaited<ReturnType<typeof saveMediaBlob>>;
      result = renderedBlob
        ? await saveMediaBlob(renderedBlob, filename, renderedMime)
        : await saveMediaFromUrl(renderedUrl, filename, renderedMime);
      if (result === "shared") toast.success("Избери 'Save Video' (Запази видео), за да го запазиш в Снимки/Photos");
      else if (result === "opened") toast.message("Отворено е като файл — избери Share/Сподели → Save to Files.");
      else toast.success("Свалянето започна");
    } catch (e) {
      toast.error(e instanceof Error ? `Сваляне: ${e.message}` : "Грешка при сваляне");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-4xl">Създай пост</h1>
      <p className="font-ui text-sm text-muted-foreground">Избери източник, преведи, добави фон и каптион, рендирай.</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
        <TabsList>
          <TabsTrigger value="ayah"><BookOpen className="size-4 mr-1" /> Аят</TabsTrigger>
          <TabsTrigger value="hadith" onClick={loadHadithIndex}><ScrollText className="size-4 mr-1" /> Хадис</TabsTrigger>
          <TabsTrigger value="viral"><Flame className="size-4 mr-1" /> AI вирални</TabsTrigger>
        </TabsList>

        <TabsContent value="ayah">
          <Card className="glass-card p-6">
            <div className="font-ui flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="surah">Сура</Label>
                <Input id="surah" type="number" min={1} max={114} placeholder="Напр. 2" value={surah} onChange={(e) => setSurah(e.target.value ? +e.target.value : "")} className="w-24" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ayah">От Аят</Label>
                <Input id="ayah" type="number" min={1} placeholder="Напр. 255" value={ayah} onChange={(e) => setAyah(e.target.value ? +e.target.value : "")} className="w-24" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ayahEnd">До Аят (по избор)</Label>
                <Input id="ayahEnd" type="number" min={1} placeholder="Напр. 257" value={ayahEnd} onChange={(e) => setAyahEnd(e.target.value ? +e.target.value : "")} className="w-28" />
              </div>
              <Button onClick={() => loadAyah(surah as number, ayah as number, ayahEnd ? ayahEnd as number : undefined)} disabled={loading || !surah || !ayah}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
                Извлечи и преведи
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="hadith">
          <Card className="glass-card p-6 space-y-4 animate-fade-up">
            <p className="font-ui text-sm text-muted-foreground">Сахих хадиси директно от sunnah.com.</p>
            <div className="font-ui flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Колекция</Label>
                <Select value={hadithSource} onValueChange={(v) => setHadithSource(v as typeof hadithSource)}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bukhari">Сахих ал-Бухари (1–7563)</SelectItem>
                    <SelectItem value="muslim">Сахих Муслим (1–3033)</SelectItem>
                    <SelectItem value="tirmidhi">Джами ат-Тирмизи — само сахих</SelectItem>
                    <SelectItem value="nawawi40">40 Хадиса на ан-Навауи (куриран)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hadithSource === "nawawi40" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Номер (1–40)</Label>
                    <Select value={String(hadithNum || "")} onValueChange={(v) => setHadithNum(+v)}>
                      <SelectTrigger className="w-64"><SelectValue placeholder="Избери хадис" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(hadithList.length ? hadithList : [{ number: 1, reference: "40 Хадиса на ан-Навауи • Хадис № 1" }]).map((h) => (
                          <SelectItem key={h.number} value={String(h.number)}>{h.reference}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => loadHadith(hadithNum as number)} disabled={loading || !hadithNum}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
                    Извлечи и преведи
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Номер</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Напр. 1"
                      value={sunnahNum}
                      onChange={(e) => setSunnahNum(e.target.value ? Math.max(1, parseInt(e.target.value, 10)) : "")}
                      className="w-32"
                    />
                  </div>
                  <Button onClick={() => loadSunnah(hadithSource as SunnahCollection, sunnahNum as number)} disabled={loading || !sunnahNum}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
                    Извлечи и преведи
                  </Button>
                  <Button variant="outline" onClick={() => loadRandomSahih(hadithSource as SunnahCollection)} disabled={loading}>
                    <Wand2 className="size-4 mr-1" /> Случаен сахих
                  </Button>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="viral">
          <Card className="glass-card p-6 space-y-3 animate-fade-up">
            <Label className="font-ui">Тема или настроение</Label>
            <div className="flex gap-2">
              <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="напр. търпение в труден момент" />
              <Button onClick={runViral} disabled={suggestingViral}>
                {suggestingViral ? <Loader2 className="size-4 animate-spin" /> : <Flame className="size-4 mr-1" />}
                AI вирални
              </Button>
            </div>
            {viral.length > 0 && (
              <div className="grid gap-3 mt-3">
                {viral.map((v, i) => (
                  <Card key={i} className="p-4 flex items-start gap-3">
                    <div className="grid place-items-center size-12 rounded-full bg-accent text-accent-foreground font-bold">{v.score}</div>
                    <div className="flex-1 font-ui">
                      <div className="flex items-center gap-2"><Badge variant="secondary">{v.kind}</Badge><Badge>{v.ref}</Badge></div>
                      <p className="font-semibold mt-1">{v.title_bg}</p>
                      <p className="text-sm text-muted-foreground">{v.reason_bg}</p>
                    </div>
                    <Button size="sm" onClick={() => approveViral(v)}>Одобри</Button>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {content && (
        <>
          <Card className="mt-6 border-amber-500/60 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-primary/15 p-6 rounded-2xl shadow-xl space-y-4 animate-fade-up border">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-500 text-lg">
                  <Sparkles className="size-5 text-amber-400 animate-pulse" />
                  <span>⚡ 1-Click Auto-Viral Studio (Пълна Автоматизация)</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl font-ui">
                  С едно кликване системата автоматично изпълнява всичко за <strong>„{content.source_ref}“</strong>: превежда на български, избира най-подходящи вертикални видео кадри от Pexels без хора, генерира глас, прави милисекундно караоке и стартира рендиране във формат Hormozi!
                </p>
              </div>
              <Button
                size="lg"
                onClick={onOneClickAutoViralStudio}
                disabled={autoViralRunning || rendering}
                className="w-full md:w-auto font-bold text-base px-6 py-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black shadow-lg shadow-amber-500/20 rounded-xl transition-all hover:scale-105 shrink-0 cursor-pointer"
              >
                {autoViralRunning ? (
                  <>
                    <Loader2 className="size-5 animate-spin mr-2" />
                    <span>{autoViralStep || "Автоматизирам..."}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="size-5 mr-2" />
                    <span>⚡ 1-Click Автоматизация</span>
                  </>
                )}
              </Button>
            </div>
            {autoViralRunning && (
              <div className="bg-background/80 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between text-xs font-mono text-amber-400 animate-pulse">
                <span>🚀 В процес на изпълнение: {autoViralStep}</span>
                <span>Моля изчакайте...</span>
              </div>
            )}
          </Card>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card className="glass-card p-6 space-y-4 animate-fade-up">
            <div>
              <p className="font-ui text-xs uppercase tracking-wider text-muted-foreground">{content.source_ref}</p>
              <p className="font-arabic text-3xl leading-loose mt-2 text-right" dir="rtl">{content.arabic}</p>
            </div>
            <div>
              <p className="font-ui text-xs uppercase tracking-wider text-muted-foreground">Английски (оригинал)</p>
              <p className="font-ui text-sm mt-1 text-muted-foreground">{content.english}</p>
            </div>
            {content.source_type === "ayah" && content.audioUrl && (
              <div>
                <p className="font-ui text-xs uppercase tracking-wider text-muted-foreground">Рецитация — Ясер ал-Досари (синхронизирани думи)</p>
                <audio controls src={customAudioUrl ?? content.audioUrl} className="mt-2 w-full" />
              </div>
            )}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mic className="size-4 text-primary" />
                  <Label htmlFor="bg-narr" className="font-ui cursor-pointer">
                    {content.source_type === "hadith" ? "Български глас (мъжки) при видео" : "Български глас за превода (по избор при видео)"}
                  </Label>
                </div>
                <Switch id="bg-narr" checked={useBgNarration} onCheckedChange={(v) => { setUseBgNarration(v); setNarrationUrl(null); clearRendered(); }} />
              </div>
              <p className="font-ui text-xs text-muted-foreground">
                Естествен мъжки глас на български (ElevenLabs · George). Натисни „Чуй гласа", за да го генерираш и прослушаш преди рендиране.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={narrating || !bulgarian.trim()}
                  onClick={async () => {
                    if (!content) return;
                    setNarrating(true);
                    clearRendered();
                    try {
                      toast.message("Генерирам български глас…");
                      const r = await runNarrate({ data: { text: bulgarian, reference: content.source_ref } });
                      setNarrationUrl(`data:${r.mimeType};base64,${r.base64}`);
                      setNarrationTimings(r.wordTimings ?? null);
                      if (!useBgNarration) setUseBgNarration(true);
                      toast.success("Гласът е готов — пусни плейъра по-долу.");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Не успях да генерирам глас");
                    } finally { setNarrating(false); }
                  }}
                >
                  {narrating ? <><Loader2 className="size-3 animate-spin mr-1" /> Генерирам…</> : <><Mic className="size-3 mr-1" /> Чуй гласа</>}
                </Button>
              </div>
              {narrationUrl && !narrating && (
                <audio controls src={narrationUrl} className="w-full" />
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-ui">Собствено аудио (по избор)</Label>
              <div className="flex gap-2 items-center">
                <Input ref={fileRef} type="file" accept="audio/*" onChange={onAudioUpload} />
              </div>
              {customAudioUrl && content.source_type === "hadith" && (
                <audio controls src={customAudioUrl} className="w-full" />
              )}
            </div>
          </Card>

          <Card className="glass-card p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <Label className="font-ui" htmlFor="bg">Български превод (можеш да редактираш)</Label>
              <Button
                size="sm"
                variant="outline"
                disabled={translating || !content}
                onClick={async () => {
                  if (!content) return;
                  setTranslating(true);
                  try {
                    const t = await runTranslate({
                      data: { arabic: content.arabic, english: content.english, sourceRef: content.source_ref, ayahBounds: content.ayahBounds },
                    });
                    setBulgarian(t.bulgarian);
                    if (t.ayahBounds) {
                      content.ayahBounds = t.ayahBounds;
                      setContent({ ...content, ayahBounds: t.ayahBounds });
                    }
                    toast.success("Преведено на български");
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Грешка при превод");
                  } finally {
                    setTranslating(false);
                  }
                }}
              >
                Преведи отново
              </Button>
            </div>
            {translating ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Превеждам…</div>
            ) : (
              <Textarea 
                id="bg" 
                rows={10} 
                value={bulgarian} 
                onChange={(e) => {
                  setBulgarian(e.target.value);
                  setNarrationUrl(null);
                  clearRendered();
                }} 
                className="text-base leading-relaxed" 
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/40">
              <div className="space-y-2">
                <Label className="font-ui text-xs font-semibold uppercase tracking-wider text-muted-foreground">Метод на рендиране</Label>
                <Select value={renderMode} onValueChange={(v) => { setRenderMode(v as "client" | "server"); clearRendered(); }}>
                  <SelectTrigger className="font-ui bg-background/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">⚡ В браузъра (Бързо, безплатно, PC/Mac)</SelectItem>
                    <SelectItem value="server">🚀 На сървъра (Clouding.io, за iPhone/Mobile)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-ui text-xs font-semibold uppercase tracking-wider text-muted-foreground">Позиция на субтитрите</Label>
                <Select value={captionStyle} onValueChange={(v) => { setCaptionStyle(v as RenderOptions["style"]); clearRendered(); }}>
                  <SelectTrigger className="font-ui bg-background/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lower-third">📍 Долна трета (TikTok / Reels Safe Area)</SelectItem>
                    <SelectItem value="centered">🎯 Центриран (В центъра на екрана)</SelectItem>
                    <SelectItem value="minimal">👁️ Минималистичен (Без караоке)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-ui text-xs font-semibold uppercase tracking-wider text-muted-foreground">Вирусен цвят / Тема (Active Karaoke Glow)</Label>
                <Select value={tiktokTheme} onValueChange={(v) => { setTiktokTheme(v as any); clearRendered(); }}>
                  <SelectTrigger className="font-ui bg-background/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hormozi">🥇 Hormozi / Злато (#FFD700) — Висок контраст</SelectItem>
                    <SelectItem value="emerald">💎 Изумруд (#32CD32) — Ислямско зелено + Златен акцент</SelectItem>
                    <SelectItem value="neon">⚡ Неон (#00FFFF) — Модерен кибер-циан</SelectItem>
                    <SelectItem value="classic">❄️ Класически бял — Минималистичен стил</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-ui text-xs font-semibold uppercase tracking-wider text-muted-foreground">Динамика и темп (Pacing Mode)</Label>
                <Select value={pacingMode} onValueChange={(v) => { setPacingMode(v as any); clearRendered(); }}>
                  <SelectTrigger className="font-ui bg-background/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="punchy">🚀 Ударен темп (2-4 думи на ред — TikTok/Reels)</SelectItem>
                    <SelectItem value="ayah">📖 Пълен аят / дълга фраза — класическо четене</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAlignSync}
                  disabled={aligningSync || (!customAudioUrl && !narrationUrl && !content?.audioUrl)}
                  className="font-ui border-amber-500/30 text-amber-500 hover:bg-amber-500/10 transition-all shadow-sm"
                >
                  {aligningSync ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Wand2 className="size-3.5 mr-1.5 text-amber-500" />}
                  ⚡ Авто-синхронизация на таймингите
                </Button>
                {narrationTimings && narrationTimings.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTimingEditor(!showTimingEditor)}
                    className="font-ui text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ScrollText className="size-3.5 mr-1.5" />
                    {showTimingEditor ? "Скрий редактора на думи" : `📝 Редактор на тайминги (${narrationTimings.length} думи)`}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-ui">
                <Badge variant="outline" className="font-mono bg-primary/5 text-primary border-primary/20">
                  1080p • 30 FPS • Pro Karaoke
                </Badge>
                <span>Active Word Glow + Pro Outlines</span>
              </div>
            </div>

            {showTimingEditor && narrationTimings && narrationTimings.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-background/80 border border-border/50 max-h-56 overflow-y-auto space-y-1.5 font-mono text-xs animate-fade-in">
                <div className="flex items-center justify-between text-muted-foreground pb-1 border-b border-border/40 font-ui text-[11px]">
                  <span>Дума</span>
                  <span>Начало (s) → Край (s)</span>
                </div>
                {narrationTimings.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-0.5 hover:bg-muted/30 px-1 rounded transition-colors">
                    <input
                      type="text"
                      value={t.word || ""}
                      onChange={(e) => {
                        const next = [...narrationTimings];
                        next[i] = { ...next[i], word: e.target.value };
                        setNarrationTimings(next);
                      }}
                      className="bg-transparent border-none font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 w-32"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.05"
                        value={t.start}
                        onChange={(e) => {
                          const next = [...narrationTimings];
                          next[i] = { ...next[i], start: parseFloat(e.target.value) || 0 };
                          setNarrationTimings(next);
                        }}
                        className="bg-muted/40 text-right w-16 px-1 rounded border border-border/30 focus:outline-none focus:border-primary"
                      />
                      <span className="text-muted-foreground">→</span>
                      <input
                        type="number"
                        step="0.05"
                        value={t.end}
                        onChange={(e) => {
                          const next = [...narrationTimings];
                          next[i] = { ...next[i], end: parseFloat(e.target.value) || 0 };
                          setNarrationTimings(next);
                        }}
                        className="bg-muted/40 text-right w-16 px-1 rounded border border-border/30 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </>
      )}

      {content && (
        <Card className="glass-card mt-6 p-6 space-y-4 animate-fade-up">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-2xl">Стокови видеа от Pexels (1080p / 30 FPS)</h2>
              <p className="font-ui text-sm text-muted-foreground">AI чете текста и подбира визуално подходящи вертикални видео кадри. Без хора, животни или религиозни символи.</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Input
                value={pexelsQuery}
                onChange={(e) => setPexelsQuery(e.target.value)}
                placeholder="напр. mountain sunset"
                className="w-48 font-ui"
              />
              <Select value={String(minPexelsDuration)} onValueChange={(v) => setMinPexelsDuration(Number(v))}>
                <SelectTrigger className="w-[140px] font-ui"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Мин. 15 сек.</SelectItem>
                  <SelectItem value="30">Мин. 30 сек.</SelectItem>
                  <SelectItem value="45">Мин. 45 сек.</SelectItem>
                  <SelectItem value="60">Мин. 60 сек.</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="secondary" onClick={() => onPexelsVideoSearch()} disabled={pexelsVideosLoading}>
                {pexelsVideosLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <Film className="size-4 mr-1" />}
                {pexelsVideos.length ? "Видеа отново" : "Търси видеа"}
              </Button>
              <Button onClick={onAutoPickPexelsVideo} disabled={pexelsVideosLoading}>
                {pexelsVideosLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <Sparkles className="size-4 mr-1" />}
                Авто-избор
              </Button>
              <Button
                variant="outline"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                onClick={handleFetchMultiScene}
                disabled={multiSceneLoading || pexelsVideosLoading}
              >
                {multiSceneLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <Film className="size-4 mr-1" />}
                🎬 3 Сменящи се B-Roll сцени
              </Button>
            </div>
          </div>

          {(pexelsTheme || pexelsTried.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap text-xs font-ui">
              {pexelsTheme && <Badge variant="secondary">Тема: {pexelsTheme}</Badge>}
              {pexelsTried.map((q) => (
                <Badge key={q} variant={q === pexelsQuery ? "default" : "outline"} className="font-mono">{q}</Badge>
              ))}
              {pexelsTheme && (
                <Button size="sm" variant="ghost" onClick={onRotateTheme} disabled={pexelsVideosLoading} className="h-6">
                  Друга тема
                </Button>
              )}
            </div>
          )}

          {pexelsVideos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              {pexelsVideos.map((v) => {
                const isActive = bgVideoUrl === v.link;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onPickPexelsVideo(v)}
                    className={`relative aspect-[9/16] overflow-hidden rounded-md border transition ${isActive ? "ring-2 ring-primary border-primary" : "hover:border-primary/60"}`}
                  >
                    {v.poster ? <img src={v.poster} alt="" className="size-full object-cover" loading="lazy" /> : <div className="size-full bg-muted" />}
                    <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"><Film className="size-3" />{v.duration}s</span>
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate text-left">{v.photographer}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {content && bulgarian && !translating && (
        <Card className="glass-card mt-6 p-6 space-y-4 animate-fade-up">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-2xl">Преглед и рендиране</h2>
              <p className="font-ui text-sm text-muted-foreground">TikTok / Reels формат 1080×1920 (30 FPS) — видео със синхронизиран караоке превод.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={onRender} disabled={rendering}>
                {rendering ? <Loader2 className="size-4 animate-spin mr-1" /> : <Film className="size-4 mr-1" />}
                {renderedUrl ? "Рендирай отново" : "Рендирай видео"}
              </Button>
              {renderedUrl ? (
                <>
                  <Button variant="outline" onClick={onDownload}>
                    <Download className="size-4 mr-1" />
                    Свали .{renderedExt}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const title = content?.source_ref || "Ислямска Мъдрост";
                      const text = formatViralSocialCaption(title, content?.bulgarian || bulgarian);
                      navigator.clipboard.writeText(text);
                      toast.success("📋 Професионалният TikTok/Reels текст е копиран в клипборда!");
                    }}
                    className="border-teal-500/40 text-teal-400 hover:bg-teal-500/10 cursor-pointer"
                  >
                    <Copy className="size-4 mr-1" />
                    TikTok Текст
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        setGeneratingThumb(true);
                        const title = content?.source_ref || "Ислямска Мъдрост";
                        toast.message("Генериране на професионална вайръл корица (Thumbnail)...");
                        const res = await generateViralThumbnail({ data: { title } });
                        const a = document.createElement("a");
                        a.href = res.dataUrl;
                        a.download = `${sanitizeFilename(title)}_thumbnail.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        toast.success("Вайръл корицата е свалена успешно!");
                      } catch (err) {
                        toast.error("Грешка при създаване на корица");
                      } finally {
                        setGeneratingThumb(false);
                      }
                    }}
                    disabled={generatingThumb}
                    className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                  >
                    {generatingThumb ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ImageIcon className="size-4 mr-1" />}
                    Корица
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          {(renderedUrl || bgVideoUrl || bgUrl) && (
            <div ref={previewRef} className="grid gap-4 md:grid-cols-[300px_1fr] items-start scroll-mt-24">
              <div className="aspect-[9/16] overflow-hidden rounded-lg border bg-muted">
                {renderedUrl && renderedKind === "video" ? (
                  <video
                    key={renderedUrl}
                    src={renderedUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="size-full object-cover"
                  />
                ) : renderedUrl ? (
                  <img key={renderedUrl} src={renderedUrl} alt="Готова снимка" className="size-full object-cover" />
                ) : bgVideoUrl ? (
                  <video
                    key={bgVideoUrl}
                    src={bgVideoUrl}
                    controls
                    playsInline
                    loop
                    autoPlay
                    muted
                    className="size-full object-cover"
                  />
                ) : bgUrl ? (
                  <img src={bgUrl} alt="Избран фон" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="font-ui text-sm space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {renderedUrl ? "Финална композиция (1080p / 30 FPS)" : "Избрано стоково видео"}
                </p>
                {bgPrompt && <p className="text-muted-foreground">{bgPrompt}</p>}
                <p className="text-xs text-muted-foreground">
                  Ако на iPhone не се сваля автоматично, натисни Share и избери Save to Files.
                </p>
              </div>
            </div>
          )}
          {!bgVideoUrl && !bgUrl && !renderedUrl && (
            <p className="font-ui text-sm text-muted-foreground flex items-center gap-2"><Upload className="size-4" /> Избери стоково видео от Pexels по-горе, преди да рендираш.</p>
          )}
        </Card>
      )}
    </div>
  );
}
