# Implementation Changes: Tawheed Carousel Topic Rotation & Memory Deduplication

## 1. `src/lib/tawheed-taxonomy.ts`
- **Component**: `getNextTawheedTopic`
- **Changes**:
  - Implemented LRU (Least Recently Used) topic candidate sorting based on `normalizedRecent` history.
  - When `unusedTopics` reaches 0 (after all 23 taxonomy topics have been generated at least once), `pool` resets cleanly to all topics (`[...TAWHEED_TAXONOMY]`).
  - Added helper `getLastSeenIdx(topic)` which scans `normalizedRecent` backwards for matching subtopic IDs or Bulgarian titles. Topics never seen return index `-1` (highest priority), while previously seen topics return their last occurrence index.
  - Candidates for `targetPillar` are sorted ascending by `getLastSeenIdx(a) - getLastSeenIdx(b)`, ensuring the topic used longest ago in that pillar is selected first.
  - Fixes the 3-topic lock-in loop issue when history size $\ge 23$.

## 2. `src/lib/memory.functions.ts`
- **Component**: `recordCarouselProposalUsageDirect`, `recordProposalUsagesDirect`, `writeAiMemory`, `readAiMemory`
- **Changes**:
  - Relaxed duplicate checking from `(hook || (title && subtopicId))` to hook-only deduplication (`x.hook.toLowerCase() === normalizedHook.toLowerCase()`).
  - Allowed topics to be re-used across cycles with distinct hooks without being dropped from history.
  - Introduced thread-safe / async-serialized `withMemoryLock` queue with raw disk I/O primitives (`_readAiMemoryRaw`, `_writeAiMemoryRaw`), preventing race conditions and file collisions during concurrent async writes.

## 3. `src/routes/_app/assistant.tsx`
- **Component**: `handleNextCarouselQuickAction`
- **Changes**:
  - Updated `usedCarouselTopics` sliding window buffer from `slice(-25)` to `slice(-30)`.
  - Ensures smooth LRU rotation and history tracking without truncating below the taxonomy size.

## 4. `src/lib/__tests__/verify-tawheed-carousel.test.ts`
- **Component**: `testMultiCycleCarouselGeneration`
- **Changes**:
  - Expanded `SIMULATION_CYCLES` from 5 to 30 cycles.
  - Updated loop assertions to verify strict topic uniqueness prior to saturation ($\le 23$) and non-consecutive immediate repetition after saturation ($> 23$).
  - Verified state progression ($N \to N+1$) from 0 to 30 entries, 0% duplicate hooks, and rotation across all 3 Tawheed pillars.

## 5. `src/lib/__tests__/stress-carousel-engine.test.ts`
- **Component**: Adversarial stress test harness
- **Changes**:
  - Adapted Halal visual prompt regex check to strip standard negative constraint phrases (`no people`, `no faces`, `no humans`, `no silhouettes`) prior to prohibited keyword checks.
