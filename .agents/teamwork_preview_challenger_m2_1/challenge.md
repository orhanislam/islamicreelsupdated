# Empirical Stress-Test & Challenge Report — Non-repetitive Selection Logic

## Challenge Summary

**Overall risk assessment**: MEDIUM

Empirical stress testing of `src/routes/_app/assistant.tsx` revealed key insights into the Quran (`VIRAL_QURAN_PRESETS`, 10 items) and Hadith (`VIRAL_HADITH_PRESETS`, 6 items) non-repetitive selection logic (`handleNextQuranQuickAction` and `handleNextHadithQuickAction`).

While the logic successfully guarantees zero immediate consecutive duplicates (i.e. `item[i] === item[i-1]`), empirical trace analysis discovered pool truncation after initial exhaustion and a potential application crash caused by malformed `localStorage` state initialization.

---

## Challenges & Failure Modes Found

### [Medium] Challenge 1: Pool Reset Truncation (Cycling 9/10 Quran & 5/6 Hadith Items)

- **Assumption challenged**: That after pool exhaustion, all items in the pool are cycled through evenly before repeating.
- **Attack scenario**: Consecutive calls past initial pool exhaustion (calls 11+ for Quran, calls 7+ for Hadith).
- **Blast radius**: The selection logic resets `usedKeys` to `[key]` when 1 item remains (`unpicked.length <= 1`). Consequently:
  - For Quran (10 items): After call 10, resets occur every **9 calls** (calls 10, 19, 28, 37...). During each 9-call cycle, 1 item remains trapped in `usedQuranKeys` and is completely excluded from selection.
  - For Hadith (6 items): After call 6, resets occur every **5 calls** (calls 6, 11, 16, 21...). During each 5-call cycle, 1 item remains trapped in `usedHadithKeys` and is completely excluded from selection.
- **Mitigation**: Reset `usedKeys` to empty array `[]` or handle reset cleanly when `unpicked.length === 0` so that all pool items (10 Quran, 6 Hadith) are cycled through equally.

### [High] Challenge 2: Unhandled `JSON.parse("null")` LocalStorage Crash

- **Assumption challenged**: That `try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }` safely defaults to `[]` for any non-array localStorage value.
- **Attack scenario**: `localStorage` contains the literal string `"null"`, `"123"`, or `{}` (e.g. set by external script or cleared to null).
- **Blast radius**: `JSON.parse("null")` evaluates to `null` without throwing a syntax error. `usedQuranKeys` and `usedHadithKeys` are initialized to `null`. On subsequent click of quick action buttons, `usedQuranKeys.includes(...)` throws an uncaught runtime `TypeError: Cannot read properties of null (reading 'includes')`, crashing the assistant view.
- **Mitigation**: Validate type in initializer: `Array.isArray(parsed) ? parsed : []`.

### [Low] Challenge 3: Stale State Closure on Rapid Synchronous Clicks

- **Assumption challenged**: That `setUsedQuranKeys` and `setUsedHadithKeys` will process consecutive user clicks correctly.
- **Attack scenario**: Fast rapid clicking of the Quick Action button before React re-renders.
- **Blast radius**: `handleNextQuranQuickAction` and `handleNextHadithQuickAction` capture `usedQuranKeys` from state closure instead of functional state update (`setUsedQuranKeys(prev => ...)`). Rapid clicks execute against stale `usedQuranKeys` array `[]`, causing duplicate selections and state overwrites.
- **Mitigation**: Use functional state updates `setUsedQuranKeys(prev => ...)` or maintain state ref.

---

## Empirical Stress Test Results

| Test Scenario | Total Iterations | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| Quran Immediate Consecutive Duplicates (`item[i] === item[i-1]`) | 10,000 calls | 0 duplicates | 0 duplicates | **PASS** |
| Hadith Immediate Consecutive Duplicates (`item[i] === item[i-1]`) | 6,000 calls | 0 duplicates | 0 duplicates | **PASS** |
| Quran Initial Pool Full Exhaustion (Calls 1..10) | 10 calls | 10 unique items picked | 10 unique items picked | **PASS** |
| Hadith Initial Pool Full Exhaustion (Calls 1..6) | 6 calls | 6 unique items picked | 6 unique items picked | **PASS** |
| Post-Exhaustion Reset Cycle Length (Quran) | 30 calls | Reset every 10 calls | Resets every 9 calls (Pool truncated) | **FAIL (Defect)** |
| Post-Exhaustion Reset Cycle Length (Hadith) | 20 calls | Reset every 6 calls | Resets every 5 calls (Pool truncated) | **FAIL (Defect)** |
| LocalStorage = `"null"` Initialization | 1 call | Fallback to `[]` | Initialized to `null`, throws `TypeError` | **FAIL (Defect)** |
| LocalStorage Normal Read & Persistence | 10 calls | Array persisted to localStorage | Array persisted to localStorage | **PASS** |

---

## Unchallenged Areas

- Audio playback (`playStudioClick()`) and UI toast notifications — out of scope for empirical selection logic testing.
