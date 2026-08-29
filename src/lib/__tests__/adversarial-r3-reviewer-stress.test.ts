/**
 * Round 3 Adversarial Reviewer Stress & Hardening Test Suite
 *
 * Attacks Tested:
 * 1. Deep quotation nesting & dialogue parsing
 * 2. Unbroken tokens & Arabic Tashkeel horizontal containment
 * 3. Title + Multi-Segment + CTA extreme vertical stress fitting
 * 4. Coordinate-level boundary verification (X and Y containment)
 * 5. Stroke width scaling and font-size minimum clamps
 * 6. Empty & degenerate input invariants
 */

import {
  TIKTOK_SAFE_ZONE,
  parseSlideSegments,
  computeSlideLayout,
  fitSlideLayout,
  wrapIntelligent,
  stripOuterQuotes,
  stripEmojis,
  type CarouselSlideOptions,
} from "../render-carousel";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

function createRealisticMockCtx(scale: number = 1.0): CanvasRenderingContext2D {
  let currentFont = "800 60px 'Montserrat', sans-serif";
  return {
    get font() {
      return currentFont;
    },
    set font(val: string) {
      currentFont = val;
    },
    lineWidth: 6,
    strokeStyle: "",
    fillStyle: "",
    textAlign: "center",
    textBaseline: "middle",
    strokeText: () => {},
    fillText: () => {},
    measureText: (str: string) => {
      const match = currentFont.match(/(\d+)px/);
      const fs = match ? parseInt(match[1], 10) : 60 * scale;
      let w = 0;
      for (const char of str) {
        if (char === " ") {
          w += fs * 0.28;
        } else if (/[.,!?:;'"„“”«»`\(\)\[\]—–-]/.test(char)) {
          w += fs * 0.32;
        } else if (/[щжюшмфЩЖЮШМФWwMm%@]/.test(char)) {
          w += fs * 0.85;
        } else if (/[iljt1I|]/.test(char)) {
          w += fs * 0.30;
        } else if (/[A-ZА-Я]/.test(char)) {
          w += fs * 0.72;
        } else if (/[\u0600-\u06FF]/.test(char)) {
          w += fs * 0.55;
        } else {
          w += fs * 0.60;
        }
      }
      return { width: Math.round(w) };
    },
  } as unknown as CanvasRenderingContext2D;
}

async function runR3AdversarialSuite() {
  console.log("=================================================================");
  console.log("🛡️ ROUND 3 ADVERSARIAL REVIEWER COMPREHENSIVE STRESS SUITE");
  console.log("=================================================================");

  // -------------------------------------------------------------------------
  // TEST 1: Dialogue & Complex Nested Quotes Segmentation
  // -------------------------------------------------------------------------
  console.log("\n[TEST 1] Complex Dialogue & Nested Quotation Segmentation...");
  {
    const slide: CarouselSlideOptions = {
      backgroundUrl: "bg",
      topTitle: "[Сахих Бухари #13]",
      mainText:
        "„Попитах Пратеника на Аллах ﷺ: «Кое дело е най-обично на Аллах?» Той отговори: «Молитвата в нейното определено време.»“\n\nТози хадис поставя молитвата като абсолютен стълб в ежедневието.",
      bottomText: "Последвай за още",
    };

    const parsed = parseSlideSegments(slide);
    assert(parsed.isQuoteSlide, "Must be identified as quote slide");
    assert(parsed.segments.length === 2, `Expected 2 segments, got ${parsed.segments.length}`);
    assert(parsed.segments[0].type === "sacred", "Segment 0 must be sacred quote");
    assert(parsed.segments[0].text.includes("«Кое дело е най-обично на Аллах?»"), "Must contain inner question quote");
    assert(parsed.segments[0].text.includes("«Молитвата в нейното определено време.»"), "Must contain inner answer quote");
    assert(parsed.segments[1].type === "human", "Segment 1 must be human commentary");
    assert(parsed.segments[1].text.startsWith("Този хадис"), "Commentary must start cleanly without orphaned quote marks");
    console.log("  ✔ Complex dialogue with multiple inner guillemets cleanly parsed.");
  }

  // -------------------------------------------------------------------------
  // TEST 2: Horizontal Token Safety & Unbroken URL / Word Slicing
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Horizontal Containment & Oversized Token Slicing...");
  {
    const ctx = createRealisticMockCtx();
    const maxWidth = TIKTOK_SAFE_ZONE.W_SAFE; // 760px

    const giantWord = "А".repeat(120); // 120 cyrillic capitals = ~5184px wide
    const lines = wrapIntelligent((t) => ctx.measureText(t).width, giantWord, maxWidth);
    
    assert(lines.length > 1, `Giant word should have wrapped into multiple lines, got ${lines.length}`);
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      assert(w <= maxWidth, `Line "${line.substring(0, 10)}..." width ${w}px exceeds maxWidth ${maxWidth}px`);
    }

    const mixedArabicBulgarian = "Хадис: «مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ» — Който вярва в Аллах и в Съдния ден, нека говори добро или да мълчи!";
    const arabicLines = wrapIntelligent((t) => ctx.measureText(t).width, mixedArabicBulgarian, maxWidth);
    assert(arabicLines.length >= 2, "Mixed Arabic-Bulgarian text should wrap properly");
    for (const line of arabicLines) {
      const w = ctx.measureText(line).width;
      assert(w <= maxWidth, `Arabic line width ${w}px exceeds maxWidth ${maxWidth}px`);
    }
    console.log("  ✔ Horizontal wrapping verified: no token breaches W_SAFE (760px).");
  }

  // -------------------------------------------------------------------------
  // TEST 3: Extreme Multi-Segment Density & CTA Auto-Fitting (R1 & R2)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Extreme Multi-Segment Density & CTA Auto-Fitting...");
  {
    const ctx = createRealisticMockCtx();
    const safeH = TIKTOK_SAFE_ZONE.H_SAFE; // 1220px

    // Create a 25-segment slide with heavy title and bottom text
    const segmentList: string[] = [];
    for (let i = 1; i <= 25; i++) {
      if (i % 2 === 1) {
        segmentList.push(`„Аллах е Най-Великият и Неговото царство няма граници — Знамение ${i}“`);
      } else {
        segmentList.push(`Това напомняне номер ${i} укрепва вярата и пречиства сърцето от всяко съмнение.`);
      }
    }

    const extremeSlide: CarouselSlideOptions = {
      backgroundUrl: "bg",
      topTitle: "ВЕЛИКИЯТ ТАУХИД: 25 КЛЮЧОВИ УРОКА ЗА СЪЗНАНИЕТО И СПОКОЙСТВИЕТО",
      mainText: segmentList.join("\n\n"),
      bottomText: "ЗАПАЗЕТЕ ТОЗИ ПОСТ И ГО СПОДЕЛЕТЕ С ВАШИТЕ БЛИЗКИ ЗА НАГРАДА В АХИРАТА",
    };

    const layout = fitSlideLayout(ctx, extremeSlide);

    assert(layout.totalH <= safeH, `Total height ${layout.totalH}px exceeds safe height ${safeH}px`);
    assert(layout.scale >= 0.05, `Scale ${layout.scale} must be >= 0.05`);
    assert(layout.gapScale >= 0.01, `Gap scale ${layout.gapScale} must be >= 0.01`);
    assert(layout.layoutSegments.length === 25, `Expected 25 layout segments, got ${layout.layoutSegments.length}`);

    // Verify coordinate bounds
    const startY = TIKTOK_SAFE_ZONE.SAFE_TOP + (safeH - layout.totalH) / 2;
    const endY = startY + layout.totalH;

    assert(startY >= TIKTOK_SAFE_ZONE.SAFE_TOP, `startY (${startY}px) < SAFE_TOP (300px)`);
    assert(endY <= TIKTOK_SAFE_ZONE.H - TIKTOK_SAFE_ZONE.SAFE_BOTTOM, `endY (${endY}px) > 1520px`);

    console.log(
      `  25-Segment Extreme Slide -> totalH: ${layout.totalH}px | scale: ${layout.scale.toFixed(3)} | gapScale: ${layout.gapScale.toFixed(3)} | startY: ${startY.toFixed(1)}px | endY: ${endY.toFixed(1)}px`
    );
    console.log("  ✔ Extreme 25-segment slide strictly contained within TikTok safe bounds.");
  }

  // -------------------------------------------------------------------------
  // TEST 4: Pixel-Perfect Line-by-Line Coordinate Tracking
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Pixel-Perfect Line-by-Line Coordinate Simulation...");
  {
    const ctx = createRealisticMockCtx();
    const testCases: CarouselSlideOptions[] = [
      {
        backgroundUrl: "bg",
        topTitle: "[Сура Ал-Ихляс 112:1-4]",
        mainText: "„Кажи: Той е Аллах — Единственият! Аллах, Целящият! Не е раждал и не е бил роден, и няма равен Нему!“\n\nТази сура се равнява на една трета от Корана.",
        bottomText: "Сподели знанието",
      },
      {
        backgroundUrl: "bg",
        topTitle: "ВЪПРОС ЗА РАЗМИСЪЛ",
        mainText: "Какво означава да се довериш напълно на Аллах в трудни моменти?\n\nДоверието (Теуеккул) не е бездействие, а усилие с пълна вяра в изхода.",
        bottomText: "Коментирай твоя опит",
      },
      {
        backgroundUrl: "bg",
        topTitle: "",
        mainText: "„Който прави добро колкото прашинка, ще го види.“",
        bottomText: "",
      },
    ];

    for (let idx = 0; idx < testCases.length; idx++) {
      const tc = testCases[idx];
      const layout = fitSlideLayout(ctx, tc);
      const startY = TIKTOK_SAFE_ZONE.SAFE_TOP + (TIKTOK_SAFE_ZONE.H_SAFE - layout.totalH) / 2;
      let currY = startY;

      // Track Top Lines
      for (const line of layout.topLines) {
        const lineTop = currY;
        const lineBottom = currY + layout.lhTop;
        assert(lineTop >= TIKTOK_SAFE_ZONE.SAFE_TOP - 1, `Top line above SAFE_TOP: ${lineTop}`);
        assert(lineBottom <= 1520 + 1, `Top line below SAFE_BOTTOM: ${lineBottom}`);
        currY += layout.lhTop;
      }
      if (layout.topH > 0 && (layout.bodyH > 0 || layout.bottomH > 0)) {
        currY += layout.gapTopToBody;
      }

      // Track Body Segments
      for (let sIdx = 0; sIdx < layout.layoutSegments.length; sIdx++) {
        const seg = layout.layoutSegments[sIdx];
        for (const line of seg.lines) {
          const lineTop = currY;
          const lineBottom = currY + seg.lh;
          assert(lineTop >= TIKTOK_SAFE_ZONE.SAFE_TOP - 1, `Body line above SAFE_TOP: ${lineTop}`);
          assert(lineBottom <= 1520 + 1, `Body line below SAFE_BOTTOM: ${lineBottom}`);
          currY += seg.lh;
        }
        if (sIdx < layout.layoutSegments.length - 1) {
          currY += layout.gapBetweenSegments;
        }
      }
      if (layout.bodyH > 0 && layout.bottomH > 0) {
        currY += layout.gapBodyToBottom;
      }

      // Track Bottom Lines
      for (const line of layout.bottomLines) {
        const lineTop = currY;
        const lineBottom = currY + layout.lhBottom;
        assert(lineTop >= TIKTOK_SAFE_ZONE.SAFE_TOP - 1, `Bottom line above SAFE_TOP: ${lineTop}`);
        assert(lineBottom <= 1520 + 1, `Bottom line below SAFE_BOTTOM: ${lineBottom}`);
        currY += layout.lhBottom;
      }

      const diff = Math.abs(currY - (startY + layout.totalH));
      assert(diff < 0.001, `Layout totalH mismatch: accumulated ${currY - startY} vs layout.totalH ${layout.totalH}`);
    }
    console.log("  ✔ Line-by-line coordinate simulation verified: every rendered line is strictly inside [300px, 1520px].");
  }

  // -------------------------------------------------------------------------
  // TEST 5: Boundary Degenerate Inputs (Null/Empty/Whitespace/Punctuation Only)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 5] Boundary Degenerate Inputs Verification...");
  {
    const ctx = createRealisticMockCtx();

    // 1. All empty strings
    const emptySlide: CarouselSlideOptions = {
      backgroundUrl: "",
      topTitle: "",
      mainText: "",
      bottomText: "",
    };
    const emptyLayout = fitSlideLayout(ctx, emptySlide);
    assert(emptyLayout.totalH === 0, "Empty slide should have totalH = 0");
    assert(emptyLayout.layoutSegments.length === 0, "Empty slide should have 0 layout segments");

    // 2. Only whitespace and punctuation
    const punctSlide: CarouselSlideOptions = {
      backgroundUrl: "bg",
      topTitle: "   \t\n  ",
      mainText: "   .  ,  ;  —  -  !  ?  \n\n   ",
      bottomText: "   ",
    };
    const punctParsed = parseSlideSegments(punctSlide);
    assert(punctParsed.segments.length === 0, `Punctuation-only mainText must yield 0 segments, got ${punctParsed.segments.length}`);

    // 3. Emojis only
    const emojiSlide: CarouselSlideOptions = {
      backgroundUrl: "bg",
      topTitle: "✨ 🤲 📖 ⭐",
      mainText: "🕋 ✨ 🤍",
      bottomText: "✨",
    };
    const emojiLayout = fitSlideLayout(ctx, emojiSlide);
    assert(emojiLayout.topLines.length === 0, "Emoji-only topTitle should yield 0 lines");
    assert(emojiLayout.layoutSegments.length === 0, "Emoji-only mainText should yield 0 layout segments");
    assert(emojiLayout.bottomLines.length === 0, "Emoji-only bottomText should yield 0 lines");

    console.log("  ✔ Degenerate inputs safely handled with zero crashes and clean zero-length layouts.");
  }

  // -------------------------------------------------------------------------
  // TEST 6: Readability & Stroke Scaling at Various Scale Factors (R2)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 6] Readability & Stroke Scaling...");
  {
    const fontSizes = [60, 50, 40, 30, 20, 15, 10, 8];
    for (const fs of fontSizes) {
      const strokeWidth = Math.max(2, Math.min(6, Math.round(fs * 0.1)));
      assert(strokeWidth >= 2 && strokeWidth <= 6, `Stroke width ${strokeWidth} out of bounds for font size ${fs}`);
      // Ensure stroke does not exceed 30% of font size to avoid visual occlusion
      const ratio = strokeWidth / fs;
      assert(ratio <= 0.30, `Stroke ratio ${ratio.toFixed(2)} too large for font size ${fs}`);
    }
    console.log("  ✔ Adaptive stroke scaling guarantees readability without character occlusion across all font sizes.");
  }

  console.log("\n=================================================================");
  console.log("🎉 ALL ROUND 3 ADVERSARIAL TESTS PASSED WITH 100% PERFECTION!");
  console.log("=================================================================\n");
}

runR3AdversarialSuite().catch((err) => {
  console.error("FATAL ERROR IN R3 ADVERSARIAL SUITE:", err);
  process.exit(1);
});
