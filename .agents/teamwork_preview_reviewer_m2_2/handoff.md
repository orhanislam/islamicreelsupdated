# Handoff Report — Review of State Logic & Error Handling in `src/routes/_app/assistant.tsx`

## 1. Observation

### Target File
- File: `src/routes/_app/assistant.tsx`
- Lines examined: 1 - 1079

### State Initializers (Lines 73–93)
```tsx
  const [usedQuranKeys, setUsedQuranKeys] = useState<string[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return JSON.parse(window.localStorage.getItem("islamic_used_quran_keys") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

  const [usedHadithKeys, setUsedHadithKeys] = useState<string[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return JSON.parse(window.localStorage.getItem("islamic_used_hadith_keys") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });
```

### Quick Action Handlers & Storage Writes (Lines 95–129)
```tsx
  const handleNextQuranQuickAction = () => {
    playStudioClick();
    const unpicked = VIRAL_QURAN_PRESETS.filter(
      (p) => !usedQuranKeys.includes(`quran:${p.surah}:${p.ayah}`)
    );
    const pool = unpicked.length > 0 ? unpicked : VIRAL_QURAN_PRESETS;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const key = `quran:${selected.surah}:${selected.ayah}`;

    const updated = unpicked.length <= 1 ? [key] : [...usedQuranKeys, key];
    setUsedQuranKeys(updated);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("islamic_used_quran_keys", JSON.stringify(updated));
    }
    setPrompt(selected.prompt);
    toast.message(`🕋 Избран нов аят: ${selected.title}`);
  };

  const handleNextHadithQuickAction = () => {
    playStudioClick();
    const unpicked = VIRAL_HADITH_PRESETS.filter(
      (p) => !usedHadithKeys.includes(`hadith:${p.collection}:${p.number}`)
    );
    const pool = unpicked.length > 0 ? unpicked : VIRAL_HADITH_PRESETS;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const key = `hadith:${selected.collection}:${selected.number}`;

    const updated = unpicked.length <= 1 ? [key] : [...usedHadithKeys, key];
    setUsedHadithKeys(updated);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("islamic_used_hadith_keys", JSON.stringify(updated));
    }
    setPrompt(selected.prompt);
    toast.message(`📜 Избран нов хадис: ${selected.title}`);
  };
```

### Build Verification Command & Output
- Command executed: `npm run build`
- Result: **Compilation succeeded cleanly** with 0 errors. Client, SSR, and Nitro server environments generated successfully (`.output/public`).

---

## 2. Logic Chain

### A. SSR Safety Assessment
- `typeof window !== "undefined" && window.localStorage` guards exist in `useState` initializers, `useEffect`, quick actions, and `handleClearChat`.
- **Verdict**: SSR safe. No window/document references are executed at module load or server evaluation time.

### B. Corrupted `localStorage` & Type Safety Assessment
- **SyntaxError Handling**: If `localStorage` contains invalid JSON syntax (e.g. `"{invalid"`), `JSON.parse` throws a `SyntaxError`, which is caught by `try...catch` and safely returns `[]`.
- **Corrupted Non-Array JSON Vulnerability**: If `localStorage` contains valid JSON that is NOT a JavaScript array (e.g. `"null"`, `"123"`, `"true"`, `"{}"`), `JSON.parse` succeeds without throwing. `usedQuranKeys` / `usedHadithKeys` is assigned a non-array value.
  - Calling `usedQuranKeys.includes(...)` throws `TypeError: usedQuranKeys.includes is not a function`.
  - Spreading `[...usedQuranKeys, key]` throws `TypeError: usedQuranKeys is not iterable`.
- **Recommendation**: Add `Array.isArray(parsed) ? parsed : []` in state initializers.

### C. `localStorage.setItem` Unhandled Exception Assessment
- In `handleNextQuranQuickAction` (line 107) and `handleNextHadithQuickAction` (line 125), `window.localStorage.setItem(...)` is called directly without a `try...catch` block.
- If storage quota is exceeded (`QuotaExceededError`) or private browsing / security policy blocks writes, `setItem` throws a DOMException, crashing handler execution.
- **Recommendation**: Wrap `window.localStorage.setItem` in `try { ... } catch {}`.

### D. Pool Cycling Logic Assessment
- `unpicked` filters preset items that are not in `usedQuranKeys`.
- When all preset items have been picked, `unpicked` is empty, falling back to full preset list (`VIRAL_QURAN_PRESETS` or `VIRAL_HADITH_PRESETS`).
- When `unpicked.length <= 1` (last item in pool), `updated` resets to `[key]`, retaining only the single newly selected key. This prevents unbounded array growth and resets the cycle smoothly.
- **Verdict**: Logic is sound and cycling operates correctly.

---

## 3. Caveats

- Review was performed via static code analysis and local build verification (`npm run build`). No manual DOM browser clicks were performed as network mode is CODE_ONLY.
- Preset arrays (`VIRAL_QURAN_PRESETS` with 10 items and `VIRAL_HADITH_PRESETS` with 6 items) are currently non-empty hardcoded arrays in the file.

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

### Findings Summary
1. **[Minor] Missing Array Type Check for LocalStorage State Init** (`src/routes/_app/assistant.tsx:76, 87`):
   `JSON.parse` returning non-array valid JSON (e.g., `"null"`, `"123"`, `"true"`) bypasses `catch` and breaks `.includes()` / array spread in quick action handlers.
   - *Fix*: `const parsed = JSON.parse(...); return Array.isArray(parsed) ? parsed : [];`
2. **[Minor] Unhandled `localStorage.setItem` Exception** (`src/routes/_app/assistant.tsx:107, 125`):
   Storage write calls in quick actions lack `try...catch` wrappers.
   - *Fix*: Wrap `window.localStorage.setItem(...)` in `try { ... } catch {}`.

---

## 5. Verification Method

### How to Verify
1. **Build Check**:
   Run `npm run build` in project root. Confirm clean compilation.
2. **State Init Invalidation Test**:
   Execute `window.localStorage.setItem("islamic_used_quran_keys", "null")` in browser console, reload page, and click "Вирален Коран". Confirm whether `Array.isArray` guard prevents crash.
3. **Storage Write Invalidation Test**:
   Simulate private browsing / blocked `localStorage.setItem` and click quick actions. Confirm `try/catch` prevents DOMException crash.
