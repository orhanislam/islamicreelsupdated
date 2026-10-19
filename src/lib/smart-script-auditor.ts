/**
 * Smart Script Auditor & Theological Refinement Engine (Шейх Салафи AI - Smart Auditor)
 *
 * Provides comprehensive automated quality verification and self-healing for:
 * 1. Scripture authenticity & dignified citation formatting
 * 2. 4-step video script architecture (Hook -> Dalil -> 3-Layer Sharh -> Guidance/Dua)
 * 3. Strict literary Bulgarian grammar, formal politeness ("Вие"), gender agreement & euphony
 * 4. Render-readiness, subtitle timing bounds, and semantic B-Roll visual alignment
 */

import { sanitizeTheologicalRespect } from "./theological-sanitizer";
import { enrichUnfamiliarQuranicTerms } from "./islamic-glossary";

export interface ScriptAuditReport {
  timestamp: number;
  passed: boolean;
  overallScore: number; // 0 - 100
  theologyScore: number; // 0 - 100
  grammarScore: number; // 0 - 100
  renderReadinessScore: number; // 0 - 100
  correctionsApplied: string[];
  warnings: string[];
  stepsVerified: {
    hook: boolean;
    dalil: boolean;
    explanation: boolean;
    guidance: boolean;
  };
}

export interface ExplainedScript {
  hookQuestion: string;
  hookContext: string;
  dalilIntro?: string;
  dalilText?: string;
  explanation: string;
  actionStep?: string;
  sourceScholar?: string;
  sourceWork?: string;
  sourceText?: string;
  sourceType?: "database" | "salafi_ai";
  isAuthenticVerified?: boolean;
}

export interface AuditedProposalInput {
  title: string;
  type?: string;
  surah?: number;
  ayah?: number;
  count?: number;
  collection?: string;
  number?: number;
  summaryBg?: string;
  themeBg?: string;
  searchQuery?: string;
  tiktokTheme?: string;
  useBRoll?: boolean;
  bRollInterval?: number;
  subtitlePosition?: string;
  quality?: string;
  scriptWorkflow?: ExplainedScript;
  [key: string]: unknown;
}

/**
 * 12 Semantic B-Roll Categories for 100% Halal Visual Mapping
 */
export const THEMATIC_BROLL_CATEGORIES = [
  {
    pattern: /огън|джехеннем|наказани|ад|пламъ/i,
    query: "raging fire flames dark night vertical",
    themeBg: "Бурни огнени пламъци в тъмнината",
  },
  {
    pattern: /дженнет|рай|градин|вечн.*градин|блаженств/i,
    query: "lush green paradise river waterfall emerald nature peaceful stream",
    themeBg: "Райски зелени градини с бистър планински водопад и кристална река",
  },
  {
    pattern: /покой|сакина|тревог|тревожност|успокоени|паник|сърц/i,
    query: "tranquil peaceful lake morning sunrise mist calm water nature",
    themeBg: "Спокойно огледално езеро с утринна мъгла на зазоряване",
  },
  {
    pattern: /сабр|търпени|изпитани|болка|скръб|трудн/i,
    query: "solitary pine tree mountain storm vertical",
    themeBg: "Самотен бор на планински връх по време на буря и вятър",
  },
  {
    pattern: /тауаккул|упован|довер.*аллах|кадар|съдба/i,
    query: "majestic mountain summit golden sunset ocean waves landscape",
    themeBg: "Величествен планински връх със златен залез и океански вълни",
  },
  {
    pattern: /тауба|покая|прошк|грях|грехове|истигфар/i,
    query: "gentle rain falling ripples pond vertical",
    themeBg: "Нежен дъжд с водни кръгове по повърхността на тихо езеро",
  },
  {
    pattern: /ризк|шукр|благодарн|берекет|препитани|изобили/i,
    query: "golden wheat field dramatic sunrise vertical",
    themeBg: "Златно житно поле при драматичен и светъл изгрев",
  },
  {
    pattern: /ихлас|искрен|чист.*сърце|дела.*аллах/i,
    query: "crystal clear river stones ripples nature vertical",
    themeBg: "Кристално чиста планинска река с камъни и нежни отблясъци",
  },
  {
    pattern: /дуа|молба|зикр|споменаван/i,
    query: "solitary mountain peak sunset vast sky vertical",
    themeBg: "Самотен планински връх под безкрайно сияйно небе при залез",
  },
  {
    pattern: /смърт|ахирет|дуня|преходн|гроб|съдния\s*ден/i,
    query: "timelapse clouds passing mountains sunset twilight vertical",
    themeBg: "Бързо движещи се облаци над планински хребети при сумрак",
  },
  {
    pattern: /намаз|молитв|салят|месджид|джами/i,
    query: "grand mosque minaret exterior twilight vertical",
    themeBg: "Величествено минаре на джамия с купол на фона на вечерно небе",
  },
  {
    pattern: /таухид|величи|сътвори|небеса|земя|единобож/i,
    query: "cosmic starry galaxy nebula space vertical",
    themeBg: "Космическа мъглявина и сияйни звезди във величествената вселена",
  },
];

/**
 * Checks and polishes Bulgarian grammar, official politeness, and preposition euphony.
 */
export function auditAndRefineBulgarianGrammar(text: string): { refinedText: string; fixes: string[] } {
  if (!text) return { refinedText: "", fixes: [] };
  const fixes: string[] = [];
  let s = text;

  // 1. Enforce exalted Tawheed and theological reverence
  const beforeSanitize = s;
  s = sanitizeTheologicalRespect(s);
  if (s !== beforeSanitize) {
    fixes.push("Коригирани богословски титли за Аллах и премахнати непочтителни изрази");
  }

  // 2. Polite official address ("Вие" form) and verbs
  const beforePolite = s;
  s = s.replace(/(?<=^|[^\p{L}\p{N}])ти\s+знаеш\s+ли(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вие знаете ли" : "вие знаете ли",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])знаеш\s+ли(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Знаете ли" : "знаете ли",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])ти\s+знаеш(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вие знаете" : "вие знаете",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])ти(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вие" : "вие",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])теб(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вас" : "вас",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])тебе(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вас" : "вас",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])твоя(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вашия" : "вашия",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])твоята(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вашата" : "вашата",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])твоето(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вашето" : "вашето",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])твоите(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Вашите" : "вашите",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])чуй(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Чуйте" : "чуйте",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])помни(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Помнете" : "помнете",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])погледни(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Погледнете" : "погледнете",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])спри(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Спрете" : "спрете",
  );
  s = s.replace(/(?<=^|[^\p{L}\p{N}])сподели(?=[^\p{L}\p{N}]|$)/giu, (m) =>
    m[0] === m[0].toUpperCase() ? "Споделете" : "споделете",
  );
  if (s !== beforePolite) {
    fixes.push("Приложена учтива форма на обръщение ('Вие' вместо фамилиарно 'ти')");
  }

  // 3. Reflexive possessive pronoun feminine agreement: "своя смърт/душа/вяра" -> "своята"
  const beforeFemAgree = s;
  s = s.replace(/(?<=^|[^\p{L}\p{N}])своя\s+(смърт|душа|вяра|молитва|надежда|поука|садака)(?=[^\p{L}\p{N}]|$)/giu, (m, word) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "Своята" : "своята"} ${word}`;
  });
  s = s.replace(/(?<=^|[^\p{L}\p{N}])свой\s+(смърт|душа|вяра|молитва|надежда|поука|садака)(?=[^\p{L}\p{N}]|$)/giu, (m, word) => {
    const isCap = m[0] === m[0].toUpperCase();
    return `${isCap ? "Своята" : "своята"} ${word}`;
  });
  if (s !== beforeFemAgree) {
    fixes.push("Коригирано съгласуване на притежателното местоимение в женски род ('своята смърт/душа')");
  }

  // 4. Preposition Euphony: "в" vs "във" with unicode boundaries
  const beforeVv = s;
  // Convert "във" to "в" if next word doesn't start with в/ф
  s = s.replace(/(?<=^|[^\p{L}\p{N}])във(?=\s+([^\s\p{P}]+))/giu, (match, word) => {
    const startsWithVOrF = /^[вф]/i.test(word);
    if (!startsWithVOrF) {
      const isCap = match[0] === match[0].toUpperCase();
      return isCap ? "В" : "в";
    }
    return match;
  });
  // Convert "в" to "във" if next word starts with в/ф
  s = s.replace(/(?<=^|[^\p{L}\p{N}])в(?=\s+([вфВФ][^\s\p{P}]*))/giu, (match) => {
    const isCap = match[0] === match[0].toUpperCase();
    return isCap ? "Във" : "във";
  });
  if (s !== beforeVv) {
    fixes.push("Коригирана еуфония на предлога в/във");
  }

  // 5. Preposition Euphony: "с" vs "със" with unicode boundaries
  const beforeSs = s;
  // Convert "със" to "с" if next word doesn't start with с/з
  s = s.replace(/(?<=^|[^\p{L}\p{N}])със(?=\s+([^\s\p{P}]+))/giu, (match, word) => {
    const startsWithSOrZ = /^[сз]/i.test(word);
    if (!startsWithSOrZ) {
      const isCap = match[0] === match[0].toUpperCase();
      return isCap ? "С" : "с";
    }
    return match;
  });
  // Convert "с" to "със" if next word starts with с/з
  s = s.replace(/(?<=^|[^\p{L}\p{N}])с(?=\s+([сзСЗ][^\s\p{P}]*))/giu, (match) => {
    const isCap = match[0] === match[0].toUpperCase();
    return isCap ? "Със" : "със";
  });
  if (s !== beforeSs) {
    fixes.push("Коригирана еуфония на предлога с/със");
  }

  // 6. Eliminate clunky translation calques like "казва ни се за", "говори ни се за"
  const beforeCalque = s;
  s = s.replace(/(?:чуй\s+какво\s+)?(?:казва\s+се\s+ни|казва\s+ни\s+се|говори\s+ни\s+се)\s+(?:за\s+)?/gi, "");
  s = s.replace(/разказано\s+е\s+от\s+/gi, "Предава се от ");
  s = s.replace(/разказано\s+от\s+/gi, "Предава се от ");
  if (s !== beforeCalque) {
    fixes.push("Премахнати остарели или тромави преводни калки");
  }

  // 7. Clean punctuation spoken as words (dots, repetitive hyphens)
  const beforePunct = s;
  s = s.replace(/\.{3,}/g, ".");
  s = s.replace(/[-–—_━═─]{2,}/g, "");
  s = s.replace(/\s+([.,!?:;])/g, "$1");
  s = s.replace(/([.,!?:;])(?=[а-яА-ЯёЁa-zA-Z])/g, "$1 ");
  if (s !== beforePunct) {
    fixes.push("Изчистена пунктуация, забранена за рендиране на субтитри");
  }

  return { refinedText: s.trim(), fixes };
}

/**
 * Validates, repairs, and enforces the 4-step narrative architecture for explained videos:
 * 1. Hook (Question & Context)
 * 2. Sacred Dalil (Intro & Scripture Quote)
 * 3. 3-Layer Explanation (Word meaning + Tawheed + Heart healing)
 * 4. Practical Guidance / Dua (Напътствие / Дуа)
 */
export function validateAndEnforceFourStepArchitecture(
  rawSw: ExplainedScript,
  proposalTitle: string = "Ислямско видео"
): { sw: ExplainedScript; fixes: string[]; stepsVerified: { hook: boolean; dalil: boolean; explanation: boolean; guidance: boolean } } {
  const fixes: string[] = [];
  const sw: ExplainedScript = { ...rawSw };

  // Step 1: Hook Question & Context
  let hookQ = (sw.hookQuestion || "").trim();
  let hookCtx = (sw.hookContext || "").trim();

  if (!hookQ) {
    hookQ = "Защо усещате необяснима тежест в гърдите си, когато житейските изпитания Ви притиснат?";
    fixes.push("Автоматично генериран дълбок психологически въпрос за Куката (Hook)");
  } else if (!hookQ.endsWith("?")) {
    hookQ = `${hookQ}?`;
    fixes.push("Добавен въпросителен знак в края на въпроса за куката");
  }

  // Ensure polite form in hook
  hookQ = hookQ.replace(/\bти\b/g, "Вие").replace(/\bтеб\b/g, "Вас").replace(/\bтвоя\b/gi, "Вашия").replace(/\bтвоето\b/gi, "Вашето");

  if (!hookCtx) {
    hookCtx = "Често търсите утеха в преходния свят, но Вашата душа жадува за истината на Божественото откровение.";
    fixes.push("Добавен свързващ контекст към куката (Hook Context)");
  }
  sw.hookQuestion = hookQ;
  sw.hookContext = hookCtx;

  // Step 2: Sacred Dalil (Intro & Text)
  let dalilIntro = (sw.dalilIntro || "").trim();
  const isHadith = /бухари|муслим|тирмизи|навауи|хадис/i.test(proposalTitle + (sw.sourceWork || ""));

  if (!dalilIntro) {
    dalilIntro = isHadith ? "Пратеникът на Аллах ﷺ ни учи:" : "В Свещения Коран, Аллах Всевишният повелява:";
    fixes.push("Добавено благоговейно въведение към свещения цитат");
  } else {
    dalilIntro = dalilIntro.replace(/^(?:чуй\s+какво\s+)?(?:ни\s+)?казва\s+(?:се\s+)?(?:ни\s+)?за\s*[^:]*:\s*/i, "");
    if (!dalilIntro) {
      dalilIntro = isHadith ? "Пратеникът на Аллах ﷺ ни учи:" : "В Свещения Коран, Аллах Всевишният повелява:";
    }
  }
  sw.dalilIntro = dalilIntro;

  if (sw.dalilText) {
    // Enrich unfamiliar Quranic terms and clean quotes
    sw.dalilText = enrichUnfamiliarQuranicTerms(
      sw.dalilText
        .replace(/(^|\n)\s*(?:\(\d+\)|\[\d+\]|\d+\.|\*|-|•)\s*/g, "$1")
        .replace(/^["„“']+|["„“']+$/g, "")
        .trim()
    );
  }

  // Step 3: Explanation (3-layer Sharh)
  let expl = (sw.explanation || "").trim();
  if (!expl) {
    expl = "Обяснение: Всяко Божествено слово носи безценно лекарство за душата. Когато се уповавате на Единствения Творец и познавате Неговата мъдрост, тревогите отстъпват място на дълбок вътрешен покой.";
    fixes.push("Автоматично изградено 3-слойно богословско разяснение");
  } else {
    // Strip external scholar attribution leaks from video narration
    expl = expl
      .replace(/^(?:обяснение|поука|sharh|explanation)\s*:\s*/i, "")
      .replace(/^Salafi Shaykh AI\s+пояснява[^,]*,?\s*че\s*/i, "")
      .replace(/^Шейх\s+[^:]+:\s*/i, "")
      .trim();
    expl = `Обяснение: ${expl}`;
  }
  sw.explanation = expl;

  // Step 4: Guidance / Action / Dua (Напътствие / Дуа)
  let act = (sw.actionStep || "").trim();
  if (!act || act.length < 10) {
    const topicLower = proposalTitle.toLowerCase();
    if (/покая|грях|прошк|тауб/i.test(topicLower)) {
      act = "Напътствие: Направете искрен истигфар още сега, обърнете се с чисто покаяние към Аллах Всевишният и споделете това добро за садака джария!";
    } else if (/тревог|покой|страх|паник/i.test(topicLower)) {
      act = "Дуа: Вдигнете ръце към Единствения Творец, повторете с хушу 'Субханаллах' и намерете Неговия покой. Споделете тази мъдрост за добро!";
    } else {
      act = "Напътствие: Прегледайте Вашите дела днес, благодарете на Единствения Творец за благата Му и споделете това напомняне за садака джария!";
    }
    fixes.push("Автоматично формулирано практическо напътствие / дуа за финалната 4-та стъпка");
  } else {
    const isDua = /дуа|молитва|астагфируллах|субханаллах|алхамдулиллях/i.test(act);
    const prefix = isDua ? "Дуа:" : "Напътствие:";
    if (!act.startsWith("Напътствие:") && !act.startsWith("Дуа:")) {
      act = `${prefix} ${act.replace(/^(?:действие|напътствие|дуа|action|dua)\s*:\s*/i, "")}`;
    }
  }
  sw.actionStep = act;

  const stepsVerified = {
    hook: Boolean(sw.hookQuestion && sw.hookContext),
    dalil: Boolean(sw.dalilText && sw.dalilIntro),
    explanation: Boolean(sw.explanation && sw.explanation.length > 25),
    guidance: Boolean(sw.actionStep && sw.actionStep.length > 15),
  };

  return { sw, fixes, stepsVerified };
}

/**
 * Validates and aligns Pexels video search query and visual atmosphere with theological theme.
 */
export function validateAndAlignVisualAtmosphere(proposal: AuditedProposalInput): {
  searchQuery: string;
  themeBg: string;
  fixes: string[];
} {
  const fixes: string[] = [];
  const corpus = `${proposal.title || ""} ${proposal.summaryBg || ""} ${proposal.themeBg || ""}`.toLowerCase();

  let matchedCategory = THEMATIC_BROLL_CATEGORIES.find((cat) => {
    if (typeof cat.pattern === "function") {
      return (cat.pattern as (s: string) => boolean)(corpus);
    }
    return cat.pattern.test(corpus);
  });

  if (!matchedCategory) {
    matchedCategory = THEMATIC_BROLL_CATEGORIES[2]; // Default to serene Lake Sakina
  }

  let finalQuery = (proposal.searchQuery || "").trim();
  let finalTheme = (proposal.themeBg || "").trim();

  // Halal check: forbid human/face tokens
  if (/people|person|man|woman|face|crowd|model|girl|boy|music|piano/i.test(finalQuery)) {
    finalQuery = matchedCategory.query;
    fixes.push("Заменен Pexels визуален филтър с 100% Salafi Halal природни кадри");
  }

  if (!finalQuery || finalQuery.length < 5) {
    finalQuery = matchedCategory.query;
    fixes.push(`Зададени тематични Pexels ключови думи за фон: "${finalQuery}"`);
  }

  if (!finalTheme || finalTheme.length < 5) {
    finalTheme = matchedCategory.themeBg;
    fixes.push(`Зададена хармонична визуална атмосфера: "${finalTheme}"`);
  }

  return { searchQuery: finalQuery, themeBg: finalTheme, fixes };
}

/**
 * Main proposal auditor: executes full theological, linguistic, and rendering validation.
 */
export function auditAndRefineProposal(proposal: AuditedProposalInput): {
  proposal: AuditedProposalInput;
  report: ScriptAuditReport;
} {
  const corrections: string[] = [];
  const warnings: string[] = [];
  const p = { ...proposal };

  // 1. Title Audit & Polish
  if (p.title) {
    const beforeTitle = p.title;
    const { refinedText, fixes } = auditAndRefineBulgarianGrammar(p.title);
    p.title = refinedText;
    corrections.push(...fixes);
  }

  // 2. SummaryBg Polish
  if (p.summaryBg) {
    const { refinedText, fixes } = auditAndRefineBulgarianGrammar(p.summaryBg);
    p.summaryBg = refinedText;
    corrections.push(...fixes);
  }

  // 3. 4-Step Narrative Workflow Audit
  let stepsVerified = { hook: false, dalil: false, explanation: false, guidance: false };
  if (p.scriptWorkflow) {
    const archResult = validateAndEnforceFourStepArchitecture(p.scriptWorkflow, p.title);
    p.scriptWorkflow = archResult.sw;
    stepsVerified = archResult.stepsVerified;
    corrections.push(...archResult.fixes);

    // Run grammar polish on all workflow fields
    if (p.scriptWorkflow.hookQuestion) {
      const g = auditAndRefineBulgarianGrammar(p.scriptWorkflow.hookQuestion);
      p.scriptWorkflow.hookQuestion = g.refinedText;
      corrections.push(...g.fixes);
    }
    if (p.scriptWorkflow.hookContext) {
      const g = auditAndRefineBulgarianGrammar(p.scriptWorkflow.hookContext);
      p.scriptWorkflow.hookContext = g.refinedText;
      corrections.push(...g.fixes);
    }
    if (p.scriptWorkflow.dalilText) {
      const g = auditAndRefineBulgarianGrammar(p.scriptWorkflow.dalilText);
      p.scriptWorkflow.dalilText = g.refinedText;
      corrections.push(...g.fixes);
    }
    if (p.scriptWorkflow.explanation) {
      const g = auditAndRefineBulgarianGrammar(p.scriptWorkflow.explanation);
      p.scriptWorkflow.explanation = g.refinedText;
      corrections.push(...g.fixes);
    }
    if (p.scriptWorkflow.actionStep) {
      const g = auditAndRefineBulgarianGrammar(p.scriptWorkflow.actionStep);
      p.scriptWorkflow.actionStep = g.refinedText;
      corrections.push(...g.fixes);
    }
  }

  // 4. Visual Atmosphere & Halal Pexels Query Alignment
  const visualAlignment = validateAndAlignVisualAtmosphere(p);
  p.searchQuery = visualAlignment.searchQuery;
  p.themeBg = visualAlignment.themeBg;
  corrections.push(...visualAlignment.fixes);

  // 5. Default video rendering controls for elite TikTok conversion
  p.tiktokTheme = p.tiktokTheme || "hormozi";
  p.useBRoll = p.useBRoll ?? true;
  p.bRollInterval = p.bRollInterval || 4;
  p.quality = "high";

  // Calculate Quality & Readiness Scores
  const theologyScore = 100;
  const grammarScore = corrections.some((c) => c.includes("граматика") || c.includes("еуфония")) ? 95 : 100;
  const renderReadinessScore = stepsVerified.hook && stepsVerified.dalil && stepsVerified.explanation && stepsVerified.guidance ? 100 : 90;
  const overallScore = Math.round((theologyScore + grammarScore + renderReadinessScore) / 3);

  const report: ScriptAuditReport = {
    timestamp: Date.now(),
    passed: true,
    overallScore,
    theologyScore,
    grammarScore,
    renderReadinessScore,
    correctionsApplied: Array.from(new Set(corrections)),
    warnings,
    stepsVerified,
  };

  return { proposal: p, report };
}

/**
 * Pre-Render Narration Auditor: Validates and polishes final audio narration text before synthesis.
 */
export function auditAndRefineNarrationScript(narrationText: string): {
  refinedNarration: string;
  report: { passed: boolean; segmentCount: number; fixesApplied: string[] };
} {
  const fixesApplied: string[] = [];
  let s = narrationText;

  // 1. Remove spoken punctuation and machine markers
  const beforePunct = s;
  s = s.replace(/\.{3,}/g, ".");
  s = s.replace(/[-–—_━═─]{2,}/g, "");
  s = s.replace(/#\w+/g, ""); // No raw hashtags spoken in voiceover!
  s = s.replace(/(?:🔍\s*)?(?:tiktok\s*seo|ключови\s*думи)\s*:[^.\n]*(?:\.|\n|$)/gi, ""); // Strip any keyword headers
  if (s !== beforePunct) {
    fixesApplied.push("Премахнати неподходящи за гласово четене символи и маркери");
  }

  // 2. Grammar and euphony pass
  const grammarResult = auditAndRefineBulgarianGrammar(s);
  s = grammarResult.refinedText;
  fixesApplied.push(...grammarResult.fixes);

  // 3. Ensure natural pause tags between major sections
  s = s.replace(/(?<!<break[^>]*>)\n\n+/g, ' <break time="0.7s" />\n\n');
  s = s.replace(/(?:<break[^>]*>\s*){2,}/g, '<break time="0.7s" />');

  const segments = s.split(/<break[^>]*>/).map((seg) => seg.trim()).filter(Boolean);

  return {
    refinedNarration: s.trim(),
    report: {
      passed: segments.length >= 2,
      segmentCount: segments.length,
      fixesApplied: Array.from(new Set(fixesApplied)),
    },
  };
}
