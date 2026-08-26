# Deep Architecture Survey: AI Carousel Generation Pipeline & Topic Diversity

## Executive Summary
This report presents an end-to-end investigation of the AI carousel generation pipeline in **Islamic Reels Studio** (C:\Users\admin\Downloads\Islamic Reels Studio).
It identifies the exact files, functions, UI controls, API endpoints, prompt templates, and storage mechanisms involved in carousel generation.
Furthermore, it pinpoints the exact root causes of topic repetition (e.g. Why are you here? / Защо си тук?) and establishes a concrete technical plan to ensure diverse, state-tracked carousel generation centered around the pillars and sub-topics of **Tawheed (Единобожие)**.

---

## 1. Full Pipeline Architecture Map

The carousel creation feature spans the frontend UI, TanStack Start server functions, Google Gemini LLM & Imagen integrations, canvas rendering, and filesystem/memory persistence:

`
[User UI: assistant.tsx]
       │
       ├─► Quick Action Toolbar (Създай Карусел, line 783)
       ├─► Chat Prompt (e.g., Генерирай ми TikTok карусел..., line 304, 338)
       │
       ▼
[TanStack Start Server Function: chatWithAssistant (assistant.functions.ts)]
       │
       ├─► 1. Read AI Memory & History: getAiMemory() (memory.functions.ts)
       ├─► 2. Build History Context (historyContext)
       ├─► 3. Build System Prompt (systemPrompt - includes КАРУСЕЛИ workflow)
       ├─► 4. Call Google Gemini API: geminiChat() (gemini.ts)
       │         └─ Model: gemini-3.6-flash (or fallback)
       ├─► 5. Parse JSON Proposal & Slides
       ├─► 6. injectAuthenticCarouselText() (assistant.functions.ts)
       │         └─ If surah/ayah or hadith present, fetches text and updates slides
       ├─► 7. recordProposalUsages() (memory.functions.ts)
       │         └─ BUG: Currently ignores carousel proposals!
       ├─► 8. Auto-save Chat History: assistant_chat_history.json
       │
       ▼
[Client Response & UI Render: assistant.tsx (line 963)]
       │
       ▼
[Carousel Rendering: CarouselRendererButton.tsx]
       │
       ├─► 1. generateBackground() (backgrounds.functions.ts)
       │         └─ geminiGenerateImage() (gemini.ts via Google Imagen 3)
       ├─► 2. renderCarouselSlide() (render-carousel.ts)
       │         └─ HTML5 Canvas 1080x1920 (Golden typography, Montserrat font)
       ├─► 3. ZIP Export (jszip) or Make.com Webhook (triggerMakeWebhook)
`

---

## 2. Codebase Breakdown: Exact Files, Functions & Prompts

### A. Client-Side Entry Points & UI Controls

#### 1. src/routes/_app/assistant.tsx
- **Location 1 (Quick Action Toolbar - Lines 782–840)**:
  - **Component**: Carousel Quick Action Card.
  - **Trigger**: Създай Карусел button.
  - **Handler**: Inline onClick sending static carouselPrompt to chatWithAssistant:
    `	s
    const carouselPrompt = Генерирай ми TikTok карусел на силна ислямска тема. ВАЖНО: 1) Провери предишните съобщения и избери НАПЪЛНО НОВА ТЕМА, която НЕ Е била генерирана досега в този чат! 2) ЗАДЪЛЖИТЕЛНО се увери, че всичко (текст, хадиси, цитати) е строго в съответствие със Салафитското учение (Ахлу Сунна уал Джама'а, според разбирането на Салафите) без никакви нововъведения (бид'а) и слаби хадиси. ТИ СИ ПРОФЕСИОНАЛЕН И СТРИКТЕН ПРЕВОДАЧ НА КОРАН И СУННА. ПРЕВЕЖДАЙ АЯТИТЕ И ХАДИСИТЕ БУКВАЛНО, ТОЧНО И ПРОФЕСИОНАЛНО ОТ АРАБСКИ НА БЪЛГАРСКИ ЕЗИК, ЗАПАЗВАЙКИ ОРИГИНАЛНИЯ ИМ БОЖЕСТВЕН СМИСЪЛ БЕЗ ДА ДОБАВЯШ СОБСТВЕНИ ИНТЕРПРЕТАЦИИ. ЗАДЪЛЖИТЕЛНО ги взимай САМО от Quran.com и Sunnah.com! Избери тема свързана с Таухид (Единобожието), величието на Аллах, историите на пророците, чудесата в Корана или смисъла на живота. Избягвай депресиращи теми и стрес. Използвай типа 'carousel'.;
    `
  - **History Passing**: messages.slice(1).map(...). Note that line 799 contains /* Removed user message append */, so user prompts are not added to messages before sending.

- **Location 2 (Helper Handler - Lines 300–336)**:
  - handleGenerateCarouselClick:
    `	s
    const userText = Генерирай ми TikTok карусел с 4 слайда. Нека бъде на интересна Ислямска тема. Използвай type: 'carousel'.;
    `
- **Location 3 (Message Rendering - Lines 963–978)**:
  - Detects m.proposal.type === 'carousel' && m.proposal.carouselSlides.
  - Renders 4 slide preview cards with 	opTitle, mainText, imagePrompt.
  - Mounts <CarouselRendererButton slides={m.proposal.carouselSlides} title={m.proposal.title} />.

---

### B. Server-Side Pipeline & AI Generation

#### 1. src/lib/assistant.functions.ts
- **chatWithAssistant (Lines 94–258)**:
  - TanStack Start server function receiving { prompt: string; history: { role: string; content: string }[] }.
  - Loads memory via getAiMemory().
  - Builds historyContext from memory.usageHistory (Lines 98–99).
  - System prompt (Lines 111–185) defines the Carousel schema:
    `
    КАРУСЕЛИ (CAROUSEL):
    Ако потребителят иска карусел (слайдове със снимки за TikTok/Reels): 
    Върни proposal с type: carousel, title, summaryBg, и задължително включи carouselSlides: масив от обекти, всеки с { topTitle, mainText, bottomText, footerText, imagePrompt }. 
    СПАЗВАЙ ТОЗИ УПДАТНАТ WORKFLOW ЗА СЛАЙДОВЕТЕ:
    1. Слайд 1 (Куката): Завладяващо, провокиращо размисъл твърдение/въпрос на български език, адресиращо универсална нужда или трудност. Текстът се запазва умишлено кратък. imagePrompt: ТРЯБВА да бъде мрачно и драматично (dark, shadowy, cinematic), НО добави и специфичен красив природен пейзаж, съобразен с темата (напр. stormy ocean waves, dark misty mountains, desert at night).
    2. Слайдове 2 до N-1 (Същинска стойност): Разгръщане на съдържанието (Аят, Хадис, Сунна) стъпка по стъпка. АБСОЛЮТНО ЗАБРАНЕНО Е ПРЕТРУПВАНЕТО с много текст на един екран! Ако хадисът има 3 стъпки, отдели им отделни слайдове. imagePrompt: визуалната естетика постепенно става по-светла (gradually brighter, emerging light), като запазиш същия природен пейзаж от Слайд 1.
    ВАЖНО ЗА СЛАЙДОВЕТЕ (ИЗТОЧНИК И РАЗДЕЛЯНЕ):
    - ЗАДЪЛЖИТЕЛНО изписвай точния източник и номер на Хадиса/Аята (напр. Сахих Тирмизи #2344 или Коран 2:255) в topTitle или bottomText на съответните слайдове. ПОТРЕБИТЕЛЯТ ИЗРИЧНО ИСКА ДА ВИЖДА НОМЕРАТА НА ХАДИСИТЕ.
    - Ако потребителят иска визуално разделение между Аят/Хадис и твой коментар, СТРИКТНО ЗАБРАНЕНО е да използваш markdown линии (--- или ___), емоджита (💡, 📖) или буквални фрази като Наш пояснителен текст:. ТЕ ЩЕ СЧУПЯТ ДИЗАЙНА! Вместо това, използвай JSON полетата: сложи Аята в mainText (в кавички), а твоят коментар в bottomText. Рендърът автоматично ще ги раздалечи красиво.
    3. Последен Слайд N (Кулминация и Призив): Окончателната духовна развръзка, мир или върховно обещание. imagePrompt: изцяло окъпан в топла, сияйна и божествена златна светлина (bathed in warm golden divine light), същият пейзаж напълно озарен от слънцето. ЗАДЪЛЖИТЕЛНО завърши с призив за действие (CTA) в долната част на екрана (bottomText или footerText), подтикващ зрителите да последват или споделят.
    `
- **injectAuthenticCarouselText (Lines 32–92)**:
  - If proposal has surah && ayah or collection && number, fetches text and splits into sentence slides, preserving hook (slide 0) and CTA (slide N-1).
- **suggestBatchViralProposals (Lines 342–461)**:
  - Supports 	argetType === carousel: adds instruction:
    ИЗКЛЮЧИТЕЛНО ВАЖНО: ЗАДЪЛЖИТЕЛНО генерирай ВСИЧКИ предложения като тип КАРУСЕЛ (type: 'carousel') с полетата за слайдове (carouselSlides)!
- **Daily Cron Job (Lines 934–955)**:
  - Uses 
ode-cron to schedule 9:00 AM daily plan generation with 	argetType: 'carousel'.

#### 2. src/lib/carousel.functions.ts
- **generateCarouselScript (Lines 21–38)**:
  - Server function taking 	opic: string.
  - System prompt PROMPT_SYSTEM (Lines 4–19) defining 4-slide structure:
    1. Хук (въпрос или интересна мисъл)
    2. Обяснение или контекст
    3. Доказателство от Корана или Сунната
    4. Решение, Дуа или Призив

---

### C. State & Memory Management

#### src/lib/memory.functions.ts
- **Data Structures (Lines 6–18)**:
  `	s
  export type UsageHistoryEntry = {
    type: quran | hadith;
    identifier: string; // e.g. quran:2:255 or hadith:nawawi40:1
    timestamp: number;
  };

  export type AiMemory = {
    userName?: string;
    preferredStyle?: hormozi | emerald | neon | classic;
    customInstructions: string[];
    learnedFacts: string[];
    usageHistory?: UsageHistoryEntry[];
  };
  `
- **Persistence**: Saved to ~/.islamicreels_jobs/assistant_memory.json.
- **ecordProposalUsages (Lines 67–99)**:
  `	s
  for (const p of proposals) {
    if (!p) continue;
    let identifier = ";
 if (p.type === quran && p.surah && p.ayah) {
 identifier = quran::;
 } else if (p.type === hadith && p.collection && p.number) {
 identifier = hadith::;
 }

 if (identifier) {
 if (!history.find(x => x.identifier === identifier)) {
 history.push({ type: p.type, identifier, timestamp: now });
 hasNew = true;
 }
 }
 }
 `

---

### D. Carousel Slide Rendering & Export

#### 1. src/components/CarouselRendererButton.tsx
- Iterates over slides.
- Calls generateBackground({ data: { prompt: slide.imagePrompt } }) to get AI generated background.
- Calls enderCarouselSlide(...) from src/lib/render-carousel.ts.
- Uses JSZip to bundle Slide_1.png .. Slide_4.png into ${title}_Carousel.zip.
- Or triggers Make.com webhook via riggerMakeWebhook.

#### 2. src/lib/render-carousel.ts
- Dimensions: 1080 x 1920 (9:16).
- Loads background image, applies dark gradient overlay.
- Renders opTitle (font size 85px, gold #f3d179), mainText (65px, light gold #ffedb3), ottomText (50px, gold #f3d179).
- Shifts text slightly left (centerX = (W / 2) - 40) to avoid TikTok UI overlay buttons.

---

## 3. Detailed Root Cause Analysis: Why Repetitive Topics (e.g. Why are you here?) Occur

### Root Cause 1: Complete Absence of Carousel Topic State Tracking
- In src/lib/memory.functions.ts line 80, ecordProposalUsages **only** checks for p.type === quran and p.type === hadith.
- Proposals of ype === carousel (or generic conceptual topics) produce an empty identifier = .
- Consequently, memory.usageHistory is never updated with carousel topics, titles, or hooks.
- When chatWithAssistant is called on the next request, historyList and historyContext contain **zero** past carousel topics. The LLM has zero awareness of what carousels were generated in earlier sessions or minutes ago.

### Root Cause 2: Static, Broad Prompt with Open Existential Keywords
- In src/routes/_app/assistant.tsx line 798, every click sends the exact same static text:
 ... Избери тема свързана с Таухид (Единобожието), величието на Аллах, историите на пророците, чудесата в Корана или смисъла на живота. Избягвай депресиращи теми и стрес. Използвай типа 'carousel'.
- Key issues with this prompt:
 1. The phrase смисъла на живота (meaning of life) is a classic trigger for existential rhetorical questions in LLMs.
 2. The prompt does not supply a specific sub-topic or dynamic seed.
 3. The prompt is 100% static across all clicks.

### Root Cause 3: Lack of Granular Taxonomy for Tawheed Sub-Topics
- In Islamic theology, **Tawheed** has rich, diverse divisions:
 - **Tawheed Ar-Rububiyyah (Единственост в Господството)**: All-Creating (Al-Khaliq), All-Sustaining (Ar-Razzaq - provision/rizq), Sole Controller of destiny and nature (Al-Mudabbir), Life & Death.
 - **Tawheed Al-Uluhiyyah / Al-Ibadah (Единственост в Поклонението)**: Sincerity (Ikhlas), Pure Du'a to Allah alone, Trust/Reliance (Tawakkul), Fear & Hope (Khawf & Raja), Negation of minor shirk (Riya / ostentation, superstitions, amulets), Conditions of La ilaha illa Allah.
 - **Tawheed Al-Asma was-Sifat (Единственост в Имената и Качествата)**: Affirming divine names/attributes without distortion or comparison (Al-Aliyy, Al-Hakim, Al-Ghafur, Ar-Rahim, As-Sami', Al-Baseer, Al-Qayyum).
- Because neither the frontend prompt nor the backend system prompt specifies this taxonomy, Gemini falls back to its default statistical attractor for meaning of life: **Защо си тук? / Why are you here?**.

### Root Cause 4: Open Hook Instructions in System Prompt
- In src/lib/assistant.functions.ts line 136:
 1. Слайд 1 (Куката): Завладяващо, провокиращо размисъл твърдение/въпрос на български език, адресиращо универсална нужда или трудност.
- Without negative constraints prohibiting generic questions like Защо си тук?, the model repeatedly generates the same existential hook.

---

## 4. Architectural & Implementation Blueprint for Resolution

To fulfill **R1 (Diverse Tawheed Topics)** and **R2 (State-Tracked Topic Generation)**:

### 1. State-Tracked Carousel History (memory.functions.ts & ssistant.tsx)
- **Extend UsageHistoryEntry**:
 ` s
 export type UsageHistoryEntry = {
 type: quran | hadith | carousel | tiktok;
 identifier: string; // e.g. carousel:tawheed_rububiyyah_rizq or carousel:title:<title>
 title?: string;
 topicCategory?: string;
 timestamp: number;
 };
 `
- **Update ecordProposalUsages**:
 Handle p.type === carousel by recording sanitized slug, title, and Tawheed category into memory.usageHistory.
- **Client-Side Fallback Tracking**:
 Add localStorage tracking (islamic_used_carousel_topics) in ssistant.tsx (mirroring usedQuranKeys and usedHadithKeys).

### 2. Comprehensive Tawheed Sub-Topic Catalog & Rotation Engine
- Create a structured catalogue of at least 15–20 distinct Tawheed sub-topics across:
 1. *Ar-Rububiyyah* (e.g. Rizq & Provision from Ar-Razzaq, Flawless Creation of the Heavens, Absolute Sovereignty).
 2. *Al-Uluhiyyah* (e.g. Sincerity/Ikhlas, Power of Du'a alone, Tawakkul in hardships, Escaping Riya, The 7 conditions of La ilaha illa Allah).
 3. *Al-Asma was-Sifat* (e.g. Al-Baseer & As-Sami' watching over you, Al-Hakim's wisdom behind delays, Al-Ghafur forgiving all sins, Al-Aliyy's loftiness).
 4. *Tawheed of the Prophets* (e.g. Ibrahim's destruction of idols, Musa calling Pharaoh to Tawheed, Yusuf in prison).
- Implement a deterministic/randomized non-repeating picker that filters out recently used topics and feeds the chosen sub-topic directly into the prompt.

### 3. Prompt Refactoring
- In src/routes/_app/assistant.tsx:
 - Dynamically construct carouselPrompt with the chosen Tawheed sub-topic, theological category, and negative constraints:
 ИЗРИЧНО ЗАБРАНЕНО Е да повтаряш клиширани въпроси като 'Защо си тук?', 'Каква е целта на живота ти?' или 'Защо си създаден?'.
 - Pass the list of previously generated topics to the prompt.
- In src/lib/assistant.functions.ts:
 - Update historyContext to include recent carousel topics in the ban list.
 - Refine the carousel workflow instructions to require hooks directly tailored to the specific Tawheed sub-theme.

---

## 5. Summary Table of Pipeline Components

| Component | File Path | Function / Constant | Role & Responsibilities |
|---|---|---|---|
| **Quick Action Button** | src/routes/_app/assistant.tsx | Carousel Card onClick (line 793) | Client trigger for carousel creation |
| **Chat Server Handler** | src/lib/assistant.functions.ts | chatWithAssistant (line 94) | Coordinates memory, prompts, Gemini LLM call |
| **Authentic Text Injector** | src/lib/assistant.functions.ts | injectAuthenticCarouselText (line 32) | Fetches Quran/Hadith text and builds slide text |
| **Memory & History State** | src/lib/memory.functions.ts | getAiMemory, ecordProposalUsages | Reads/persists used topics to ssistant_memory.json |
| **Standalone Script Gen** | src/lib/carousel.functions.ts | generateCarouselScript (line 21) | 4-slide JSON script generator |
| **LLM Gateway** | src/lib/gemini.ts | geminiChat (line 29) | Google Gemini API completions with fallback |
| **Background AI Generator** | src/lib/backgrounds.functions.ts | generateBackground (line 44) | Generates vertical backgrounds via Imagen 3 |
| **Slide Canvas Renderer** | src/lib/render-carousel.ts | enderCarouselSlide (line 69) | 1080x1920 2D Canvas typography renderer |
| **Carousel UI Action Button** | src/components/CarouselRendererButton.tsx | CarouselRendererButton (line 23) | Handles ZIP download and Make.com export |
