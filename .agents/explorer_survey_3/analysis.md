# Tawheed Domain Taxonomy & Carousel State Architecture Analysis

## 1. Executive Summary

This investigation explores the domain modeling, state-tracking mechanisms, and testing architecture required to resolve repetitive AI carousel generation (such as repetitive hooks like *"Why are you here?"*) in Islamic Reels Studio.

Our analysis demonstrates that:
1. **Root Cause**: The current carousel generation logic does not pass a structured taxonomy of Tawheed sub-topics to the LLM, nor does `src/lib/memory.functions.ts` record `type: "carousel"` proposals into `usageHistory` (it only records `quran:X:Y` or `hadith:C:N`). Consequently, the AI prompt history contains no previous carousel titles or hooks, causing the LLM to gravitate toward repetitive, generic philosophical hooks.
2. **Domain Solution**: An authentic, 3-pillar Tawheed taxonomy (Ar-Rububiyyah, Al-Uluhiyyah, Al-Asma was-Sifat) with over 25 rich sub-topics, accompanied by a rotation algorithm and exclusion-list injection, guarantees rich thematic variety strictly adhering to orthodox Salafi methodology (Quran and Sahih Sunnah).
3. **Testing Setup**: While `package.json` currently lacks a `"test"` script, `jiti` (`./node_modules/.bin/jiti`) is installed and seamlessly executes TypeScript test files under Node.js v24.18.0 (verified with `src/lib/__tests__/verify-sync.test.ts`).
4. **Verification Design**: A multi-cycle simulation test (`src/lib/__tests__/verify-tawheed-carousel.test.ts`) executing $\ge 3$ consecutive generations is formulated to assert history state persistence, complete hook/topic uniqueness, valid Tawheed taxonomy classification, and 4-slide structural compliance.

---

## 2. Authentic Tawheed Domain Taxonomy

To ensure variety, spiritual depth, and strict theological authenticity (Ahlus Sunnah wal Jama'ah upon the understanding of the righteous Salaf), the carousel generation engine must draw from a structured, comprehensive matrix across the three authentic divisions of Tawheed.

```
                                    ┌────────────────────────┐
                                    │    TAWHEED TAXONOMY    │
                                    └───────────┬────────────┘
                        ┌───────────────────────┼───────────────────────┐
                        │                       │                       │
            ┌───────────▼────────────┐ ┌────────▼───────────┐ ┌─────────▼────────────┐
            │   1. AR-RUBUBIYYAH     │ │   2. AL-ULUHIYYAH   │ │  3. AL-ASMA WAS-SIFAT │
            │ (Oneness of Lordship)  │ │(Oneness of Worship) │ │(Names and Attributes) │
            └───────────┬────────────┘ └────────┬───────────┘ └─────────┬────────────┘
                        │                       │                       │
             • Divine Decree (Qadr)   • Pure Sincerity (Ikhlas) • Al-Hayy & Al-Qayyum
             • Sustenance (Rizq)      • Reliance (Tawakkul)     • Ar-Rahman & Ar-Rahim
             • Grandeur of Creation   • Fear & Hope (Khawf/Raja)• As-Sami' & Al-Basir
             • Providence (Tadbeer)   • Pure Love (Mahabbah)    • Al-Hakim & Al-Alim
             • Absolute Sovereignty   • True Du'a (No Intermed) • Al-Wadud & Al-Jabbar
             • Sole Source of Harm/   • Repentance (Tawbah)     • Al-Ghaffar & At-Tawwab
               Benefit (Naf' wa Darr) • Gratitude (Shukr)       • Transcendent Perfection
                                      • Avoiding Shirk/Amulets    (Bila Takyif/Ta'til)
                                      • Sabr for Allah's Sake
```

### 2.1. Pillar 1: Tawheed Ar-Rububiyyah (Единобожие в Господството)
*Belief in the absolute oneness of Allah in His actions: Creation, Ownership, Sustenance, and Universal Control without partner or helper.*

| Sub-Topic Identifier | Theological Concept & Focus | Core Message / Psychological Impact | Example Dalil (Quran / Sahih Sunnah) |
| :--- | :--- | :--- | :--- |
| `rububiyyah:qadr` | **Al-Qadr (Divine Decree & Predestination)** | Liberates the soul from regret ("if only") and anxiety; whatever missed you was never meant to reach you. | *Surah Al-Hadid (57:22-23); Sahih Muslim #2653* |
| `rububiyyah:rizq` | **Ar-Rizq (Guaranteed Sustenance)** | No soul will die until its written provision is fully consumed; reliance on Allah over employers or economy. | *Surah Hud (11:6); Surah Adh-Dhariyat (51:58)* |
| `rububiyyah:khalq` | **Al-Khalq (Grandeur of Creation & Cosmic Order)** | Contemplating the precision of the heavens, mountains, and cellular life; randomness is an intellectual impossibility. | *Surah Ali 'Imran (3:190-191); Surah Al-Mulk (67:3-4)* |
| `rububiyyah:tadbeer` | **At-Tadbeer (Divine Providence & Control)** | Allah never slumbers; every falling leaf, beating heart, and planetary orbit is actively sustained and governed. | *Surah Al-An'am (6:59); Surah Yunus (10:31)* |
| `rububiyyah:mulk` | **Al-Mulk (Absolute Ownership & Sovereignty)** | All worldly status, wealth, and authority are temporary loans; Allah is the ultimate Sovereign Owner. | *Surah Ali 'Imran (3:26); Surah Al-Fatihah (1:4)* |
| `rububiyyah:naf_darr` | **An-Naf' wad-Darr (Sole Source of Benefit & Harm)** | If all mankind gathered to benefit or harm you, they could only do what Allah already decreed. | *Sahih at-Tirmidhi #2516 (Hadith Ibn Abbas); Surah Yunus (10:107)* |

---

### 2.2. Pillar 2: Tawheed Al-Uluhiyyah / Al-Ibadah (Единобожие в Поклонението)
*Singling out Allah alone in all internal and external acts of worship (prayers, oaths, reliance, fear, hope, sacrifice, and du'a).*

| Sub-Topic Identifier | Theological Concept & Focus | Core Message / Psychological Impact | Example Dalil (Quran / Sahih Sunnah) |
| :--- | :--- | :--- | :--- |
| `uluhiyyah:ikhlas` | **Al-Ikhlas (Pure Sincerity & Intention)** | Freeing deeds from the prison of human validation (Riyaa' / showing off); actions are weighed solely by intent. | *Surah Al-Bayyinah (98:5); Sahih al-Bukhari #1* |
| `uluhiyyah:tawakkul` | **At-Tawakkul (Unwavering Reliance on Allah Alone)** | Taking practical means while the heart remains 100% attached to the Creator, not the created means. | *Surah At-Talaq (65:3); Sunan at-Tirmidhi #2344 (Tie your camel)* |
| `uluhiyyah:khawf_raja` | **Al-Khawf & Ar-Raja (Fear & Hope Equilibrium)** | The two wings of the heart: fear prevents complacency and sins; hope prevents despair and depression. | *Surah Al-Hijr (15:49-50); Surah As-Sajdah (32:16)* |
| `uluhiyyah:mahabbah` | **Al-Mahabbah (Transcendent Love for Allah)** | Loving Allah above wealth, family, and ego; divine love turns acts of obedience into sources of delight. | *Surah Al-Baqarah (2:165); Sahih al-Bukhari #16* |
| `uluhiyyah:dua` | **Ad-Dua (Direct Supplication without Intermediaries)** | Du'a is the essence of worship; calling upon Allah directly without saints, graves, or intermediaries. | *Surah Ghafir (40:60); Surah Al-Baqarah (2:186); Sunan at-Tirmidhi #3372* |
| `uluhiyyah:tawbah` | **At-Tawbah (Heartfelt Repentance & Cleansing)** | No sin is too great for Allah's forgiveness; sincere turning back cleanses the slate completely. | *Surah Az-Zumar (39:53); Sahih Muslim #2749* |
| `uluhiyyah:shukr` | **Ash-Shukr (Gratitude & Acknowledgment of Blessings)** | True thankfulness with heart, tongue, and limbs protects blessings from departing and brings increase. | *Surah Ibrahim (14:7); Surah Luqman (31:12)* |
| `uluhiyyah:anti_shirk` | **Tahdhir min ash-Shirk (Avoiding Superstition & Amulets)** | Nullifying evil-eye beads, horoscopes, fortune-tellers, and superstitions; liberating the mind into pure Tawheed. | *Musnad Ahmad #16969; Sunan Abi Dawud #3910* |
| `uluhiyyah:sabr` | **As-Sabr lillah (Patience for Allah's Sake)** | Three dimensions of patience: in obedience, in avoiding temptations, and during difficult decrees. | *Surah Az-Zumar (39:10); Sahih al-Bukhari #1303* |

---

### 2.3. Pillar 3: Tawheed Al-Asma was-Sifat (Единобожие в Имената и Качествата)
*Affirming what Allah and His Messenger ﷺ affirmed regarding Allah's Most Beautiful Names and Lofty Attributes upon their literal majesty, without distortion (Tahrif), denial (Ta'til), inquiring into 'how' (Takyif), or likening to creation (Tamthil).*

| Sub-Topic Identifier | Name / Attribute Group | Spiritual & Psychological Dimension | Example Dalil (Quran / Sahih Sunnah) |
| :--- | :--- | :--- | :--- |
| `asma:hayy_qayyum` | **Al-Hayy & Al-Qayyum (Ever-Living, Self-Sustaining)** | The antidote to burn-out and overwhelm; resting upon the One Who neither tires nor sleeps. | *Surah Al-Baqarah (2:255); Surah Ta-Ha (20:111)* |
| `asma:rahman_rahim` | **Ar-Rahman & Ar-Rahim (All-Merciful, Bestower of Mercy)** | His mercy encompasses all things and precedes His wrath; soothing broken hearts. | *Surah Al-A'raf (7:156); Sahih al-Bukhari #7553* |
| `asma:sami_basir` | **As-Sami' & Al-Basir (All-Hearing, All-Seeing)** | True Muraqabah (mindfulness); Allah hears your unspoken whisper and sees your hidden tears in the dark. | *Surah Ash-Shura (42:11); Surah Al-Mujadila (58:1)* |
| `asma:hakim_alim` | **Al-Hakim & Al-Alim (All-Wise, All-Knowing)** | Allah knows the unseen future while we see only the present; trusting His divine wisdom behind delays and hardships. | *Surah Al-Baqarah (2:216); Surah Al-An'am (6:18)* |
| `asma:wadud` | **Al-Wadud (The Affectionate & Loving)** | When Allah loves a believer, He commands Jibril and the angels to love him, and places acceptance on earth. | *Surah Al-Buruj (85:14); Sahih al-Bukhari #3209* |
| `asma:jabbar_aziz` | **Al-Jabbar & Al-Aziz (The Restorer of the Broken, Almighty)** | Al-Jabbar mends broken hearts, restores the downtrodden, and humbles tyrants. | *Surah Al-Hashr (59:23); Sunan Abi Dawud #874* |
| `asma:qarib_mujib` | **Al-Qarib & Al-Mujib (The Ever-Near, Responsive)** | Closer than the jugular vein; always near to the one in distress. | *Surah Qaf (50:16); Surah Hud (11:61)* |
| `asma:ghaffar_tawwab`| **Al-Ghaffar, Al-Afuww, At-Tawwab (The Forgiver, Pardoner)** | Complete expiation of past shortcomings; turning bad deeds into good for the sincere penitent. | *Surah Al-Furqan (25:70); Surah An-Nisa (4:99)* |

---

## 3. Codebase Investigation & Root Cause of Topic Repetition

### 3.1. Current Architecture Flow
```
User triggers Carousel in assistant.tsx (e.g. Quick Action Toolbar)
   │
   ▼
Calls chatWithAssistant() in src/lib/assistant.functions.ts
   │
   ├─► Reads memory via getAiMemory() in src/lib/memory.functions.ts
   │   └─► usageHistory only contains "quran:X:Y" or "hadith:C:N"
   │   └─► DOES NOT CONTAIN ANY CAROUSEL ENTRIES!
   │
   ├─► Sends Gemini Prompt with generic topic request
   │   └─► "Генерирай ми TikTok карусел на силна ислямска тема..."
   │   └─► LLM has no concrete Tawheed subtopic assigned and no history list of past hooks!
   │   └─► LLM defaults to high-frequency philosophical hook ("Защо си тук?")
   │
   ├─► Parses JSON proposal (type: "carousel")
   │
   ├─► Calls recordProposalUsages(proposals)
   │   └─► In memory.functions.ts, line 80-84:
   │       checks ONLY if (p.type === "quran") or (p.type === "hadith")
   │       IGNORING type === "carousel" completely!
   │   └─► Zero history recorded!
   │
   └─► Returns response to assistant.tsx
```

### 3.2. Concrete Code Deficiencies Identified

1. **`src/lib/memory.functions.ts` (Lines 7-10, 80-93)**:
   - `UsageHistoryEntry` is typed only as `type: "quran" | "hadith"` and requires `surah && ayah` or `collection && number`.
   - Carousels without explicit Quran/Hadith props are dropped completely.
   - Even when recorded, only the chapter/verse numbers are tracked, not the topic, subtopic, hook, or title.
2. **`src/routes/_app/assistant.tsx` (Lines 86-108, 304, 798)**:
   - Local state in `assistant.tsx` has `usedQuranKeys` and `usedHadithKeys` in `localStorage`, but **no** `usedCarouselKeys` or `usedTawheedTopics`.
   - The quick action button prompt (line 798) is a hardcoded generic block without dynamic subtopic selection or history exclusion insertion.
3. **`src/lib/carousel.functions.ts` (Lines 21-38)**:
   - `generateCarouselScript` is an unconstrained endpoint taking `{ topic: string }` with no state tracking, no taxonomy validation, and no memory integration.

---

## 4. Test Environment & Runners in `package.json`

### 4.1. Current `package.json` State
- **Scripts defined**:
  ```json
  "scripts": {
    "dev": "vite dev --host --port 8080",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
  ```
- **Finding**: No test script or test framework (vitest/jest) is registered in `scripts` or `devDependencies`.

### 4.2. Execution Engine Analysis
- **Node.js**: `v24.18.0` is installed.
- **TypeScript Runner**: `jiti` is available in `node_modules/.bin/jiti`.
- **Existing Test Validation**: `src/lib/__tests__/verify-sync.test.ts` was tested via `./node_modules/.bin/jiti src/lib/__tests__/verify-sync.test.ts` and executed with 0 exit code in under 1 second.
- **Recommended Test Runner Setup**:
  Add `"test:carousel": "jiti src/lib/__tests__/verify-tawheed-carousel.test.ts"` and `"test": "jiti src/lib/__tests__/verify-tawheed-carousel.test.ts && jiti src/lib/__tests__/verify-sync.test.ts"` to `package.json`.

---

## 5. Proposed Solution Architecture

### 5.1. Tawheed Taxonomy Matrix (`src/lib/tawheed-taxonomy.ts`)
Create a dedicated domain registry defining:
- The 3 Pillars (`rububiyyah`, `uluhiyyah`, `asma_was_sifat`).
- 25+ Sub-Topics with authentic Bulgarian titles, summaries, authentic Dalils, and viral hook angles.
- Helper functions: `getNextTawheedTopic(history)`, `getTawheedTaxonomy()`, `filterUnusedTopics(history)`.

### 5.2. Unified Carousel State Store (`src/lib/memory.functions.ts`)
Extend `UsageHistoryEntry` to support carousel generations:
```typescript
export type UsageHistoryEntry = {
  type: "quran" | "hadith" | "carousel";
  identifier: string; // e.g. "carousel:rububiyyah:qadr" or "quran:2:255"
  category?: "rububiyyah" | "uluhiyyah" | "asma_was_sifat";
  subtopic?: string;
  hook?: string;
  title?: string;
  timestamp: number;
};
```
Update `recordProposalUsages` to capture carousel proposals, record `p.carouselSlides[0]?.mainText` / `topTitle`, and persist to `assistant_memory.json` (server) and `localStorage` (client).

### 5.3. Dynamic History-Aware Prompt Generation
Before requesting Gemini to generate a carousel:
1. Load `usageHistory` from memory.
2. Select an unused Tawheed subtopic across rotating pillars.
3. Formulate the exclusion prompt:
   ```
   СКОРОШНО ГЕНЕРИРАНИ КАРУСЕЛИ (СТРИКТНО ЗАБРАНЕНО Е ДА ПОВТАРЯШ ТЕЗИ ТЕМИ И КУКИ):
   - [Категория: Ar-Rububiyyah | Тема: Qadr] Кука: "Знакът, че Аллах е предначертал..."
   - [Категория: Al-Uluhiyyah | Тема: Tawakkul] Кука: "Защо се тревожиш за утрешния ден..."
   
   ИЗБРАНА НОВА ЗАДЪЛЖИТЕЛНА ТЕМА: [Категория: Al-Asma was-Sifat | Тема: Al-Wadud (Любящият)]
   ```

---

## 6. Verification Criteria & Simulation Test Design

### 6.1. Simulation Test Specification (`>= 3` Consecutive Cycles)

The verification script must run $\ge 3$ consecutive carousel generations in a deterministic sequence:

| Cycle | Input State (History) | Expected Category Selection | Expected Assertion Checks |
| :--- | :--- | :--- | :--- |
| **Cycle 1** | History = `[]` | Category 1 (e.g. `rububiyyah:qadr`) | • Valid Tawheed topic generated<br>• 4 valid slides returned<br>• History updated with Entry 1 |
| **Cycle 2** | History = `[Entry 1]` | Category 2 (e.g. `uluhiyyah:tawakkul`) | • Topic $\neq$ Entry 1<br>• Hook $\neq$ Entry 1 hook<br>• History size == 2<br>• 4 valid slides returned |
| **Cycle 3** | History = `[Entry 1, Entry 2]` | Category 3 (e.g. `asma:hayy_qayyum`) | • Topic $\notin$ {Entry 1, Entry 2}<br>• Hook $\notin$ {Entry 1, Entry 2}<br>• History size == 3<br>• Pillar rotation verified |
| **Cycle 4+** | History = `[1, 2, 3]` | Unused sub-topic (e.g. `uluhiyyah:ikhlas`) | • Uniqueness index = 100%<br>• Zero duplicate hooks |

### 6.2. Concrete Verification Assertions
1. **Pillar & Sub-topic Validity**: Generated topic matches an authentic entry in `TAWHEED_TAXONOMY`.
2. **Hook Discrepancy & Diversity**:
   $$\text{ExactMatch}(\text{Hook}_i, \text{Hook}_j) = \text{False} \quad \forall i \neq j$$
   $$\text{JaccardSimilarity}(\text{Words}_i, \text{Words}_j) < 0.5$$
3. **State Persistence**:
   $$\text{Length}(\text{History}_{N}) = \text{Length}(\text{History}_{N-1}) + 1$$
4. **Slide Structure Compliance**:
   - `slides.length === 4`
   - Slide 1: Hook (topTitle, mainText, bottomText, imagePrompt with dark cinematic landscape)
   - Slide 2: Context/Explanation
   - Slide 3: Authentic Quran Ayah or Sahih Hadith reference
   - Slide 4: Resolution / Du'a / CTA
5. **Salafi Halal Compliance**:
   - `imagePrompt` contains NO humans, faces, men, women, or animals (`/people|person|man|woman|face|animal/i.test(...) === false`).

---

## 7. Conclusion & Roadmap for Implementation

The architectural solution is completely defined and ready for implementation by the worker agent:
1. Create `src/lib/tawheed-taxonomy.ts` (authentic domain registry and topic selector).
2. Enhance `src/lib/memory.functions.ts` to record carousel entries with hooks/topics in `usageHistory`.
3. Update `src/lib/carousel.functions.ts` & `src/lib/assistant.functions.ts` to integrate Tawheed taxonomy and history exclusion prompts.
4. Add `src/lib/__tests__/verify-tawheed-carousel.test.ts` and update `package.json` with the test command.
