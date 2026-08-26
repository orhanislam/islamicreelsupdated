# Project: Islamic Reels Studio — Diverse Tawheed Topics & State-Tracked Carousel Generation

## Architecture
Islamic Reels Studio generates viral Islamic carousels and reels based on authentic Islamic sources (Quran & Sahih Sunnah). 
The carousel generation pipeline consists of:
1. **Domain Taxonomy Registry (`src/lib/tawheed-taxonomy.ts`)**: Structured repository of authentic Tawheed pillars (*Ar-Rububiyyah*, *Al-Uluhiyyah*, *Al-Asma was-Sifat*) and 25+ rich theological sub-topics with authentic dalils and distinct hook angles.
2. **State & Memory Engine (`src/lib/memory.functions.ts`)**: Server-persisted (`~/.islamicreels_jobs/assistant_memory.json`) and client-synced (`localStorage`) tracking of generated carousel topics, hooks, premises, and timestamps.
3. **AI Generation & Prompt Pipeline (`src/lib/assistant.functions.ts`, `src/lib/carousel.functions.ts`, `src/routes/_app/assistant.tsx`)**: Dynamic topic selection, past generation history injection for negative constraint exclusion, and strict anti-cliché enforcement.
4. **Verification & Testing Engine (`src/lib/__tests__/verify-tawheed-carousel.test.ts`)**: Deterministic multi-cycle simulation test runner proving consecutive generation state updates, 0% duplicate hooks, and authentic 4-slide structure.

```
┌──────────────────────────────────────────────────────────┐
│                   UI: assistant.tsx                      │
│   (Quick Action / Chat / LocalStorage Carousel State)    │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│             Server: assistant.functions.ts               │
│  - Reads AiMemory (usageHistory & carouselHistory)       │
│  - Selects Tawheed Sub-Topic from tawheed-taxonomy.ts    │
│  - Injects Exclusion List & Negative Constraints         │
│  - Calls Gemini Flash AI                                 │
│  - Records Generated Carousel into Memory                │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│        Renderer & Export: CarouselRendererButton         │
│   (Renders 1080x1920 4-slide carousel & Halal visuals)   │
└──────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tawheed Domain Taxonomy Registry | Authentic 3-pillar taxonomy (Rububiyyah, Uluhiyyah, Asma was-Sifat) with 25+ subtopics, dalils, and rotation logic | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Carousel State & Memory Tracking | Server & client state tracking for carousel topics, hooks, and premises in `AiMemory` and `localStorage` | M2 | ORIGINAL_REQUEST §R2 |
| 3 | AI Prompt Diversification & Cliché Exclusion | History-aware prompt construction injecting exclusion lists and banning clichés like "Защо си тук?" | M3 | ORIGINAL_REQUEST §R1, §R2 |
| 4 | Multi-Cycle Automated Verification Test | Test script simulating >= 3 consecutive generations validating state updates, topic diversity, and 0% hook duplicates | M4 | ORIGINAL_REQUEST §Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Tawheed Taxonomy Module | Create `src/lib/tawheed-taxonomy.ts` with authentic subtopics, dalils, and rotation utilities | none | DONE |
| 2 | M2: State Tracking & Memory Persistence | Update `src/lib/memory.functions.ts` to record carousel entries with hooks/topics and sync to client state | M1 | DONE |
| 3 | M3: Prompt Diversification & Anti-Repetition | Update `src/lib/assistant.functions.ts`, `src/lib/carousel.functions.ts`, and `src/routes/_app/assistant.tsx` | M1, M2 | DONE |
| 4 | M4: Multi-Cycle Simulation Test & Final Hardening | Create `src/lib/__tests__/verify-tawheed-carousel.test.ts`, add test scripts to `package.json`, run full verification suite and forensic audit | M1, M2, M3 | DONE |

## Interface Contracts
### `src/lib/tawheed-taxonomy.ts`
```typescript
export type TawheedPillar = "rububiyyah" | "uluhiyyah" | "asma_was_sifat";

export interface TawheedTopic {
  id: string; // e.g. "rububiyyah:qadr"
  pillar: TawheedPillar;
  titleBg: string; // e.g. "Ал-Кадр: Божественият указ и предопределение"
  titleAr?: string;
  summaryBg: string;
  hookAngleBg: string;
  dalilReference: string; // e.g. "Сура Ал-Хадид (57:22-23)"
  dalilTextBg: string;
  suggestedVisualMood: string;
}

export function getTawheedTaxonomy(): TawheedTopic[];
export function getNextTawheedTopic(recentTopicIds: string[]): TawheedTopic;
export function formatNegativeExclusionPrompt(recentEntries: Array<{ topic?: string; hook?: string }>): string;
```

### `src/lib/memory.functions.ts`
```typescript
export interface CarouselHistoryEntry {
  id: string;
  type: "carousel";
  pillar?: TawheedPillar;
  subtopicId?: string;
  title: string;
  hook: string;
  premise?: string;
  timestamp: number;
}

export interface AiMemory {
  lastUpdated: number;
  usageHistory: UsageHistoryEntry[];
  carouselHistory?: CarouselHistoryEntry[];
}

export function recordCarouselProposalUsage(entry: Omit<CarouselHistoryEntry, "timestamp">): Promise<void>;
export function getRecentCarouselHistory(limit?: number): Promise<CarouselHistoryEntry[]>;
```

## Code Layout
- `src/lib/tawheed-taxonomy.ts`: Authentic Tawheed domain taxonomy and topic rotation engine
- `src/lib/memory.functions.ts`: Memory persistence and carousel history recording
- `src/lib/assistant.functions.ts`: AI assistant orchestration, prompt building, proposal generation
- `src/lib/carousel.functions.ts`: Carousel generation endpoints
- `src/routes/_app/assistant.tsx`: UI client interface, quick action triggers, localStorage syncing
- `src/lib/__tests__/verify-tawheed-carousel.test.ts`: Automated multi-cycle verification test
- `package.json`: Script definitions for running tests
