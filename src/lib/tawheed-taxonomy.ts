/**
 * Authentic Tawheed Domain Taxonomy & Topic Rotation Engine
 * Based on orthodox Salafi methodology (Quran & Sahih Sunnah upon the understanding of the righteous Salaf).
 *
 * Covers the 3 authentic pillars:
 * 1. Tawheed Ar-Rububiyyah (Единственост в Господството)
 * 2. Tawheed Al-Uluhiyyah / Al-Ibadah (Единственост в Поклонението)
 * 3. Tawheed Al-Asma was-Sifat (Единственост в Имената и Качествата)
 */

export type TawheedPillar = "rububiyyah" | "uluhiyyah" | "asma_was_sifat";

export interface TawheedTopic {
  id: string; // e.g. "rububiyyah:qadr"
  pillar: TawheedPillar;
  pillarBg: string; // e.g. "Таухид ар-Рубубийя (Господство)"
  titleBg: string; // e.g. "Ал-Кадр: Божественият указ и предопределение"
  titleAr?: string;
  summaryBg: string;
  hookAngleBg: string;
  dalilReference: string; // e.g. "Сура Ал-Хадид (57:22-23)"
  dalilTextBg: string;
  suggestedVisualMood: string;
}

export const TAWHEED_PILLAR_NAMES: Record<TawheedPillar, { bg: string; ar: string; desc: string }> =
  {
    rububiyyah: {
      bg: "Таухид ар-Рубубийя (Единственост в Господството)",
      ar: "توحيد الربوبية",
      desc: "Вяра в единствеността на Аллах в Неговите действия: Сътворение, Власт, Препитание и Управление на Вселената.",
    },
    uluhiyyah: {
      bg: "Таухид ал-Улюхийя (Единственост в Поклонението)",
      ar: "توحيد الألوهية",
      desc: "Посвещаване на всички видове ибадет (молитва, дуа, упование, страх, надежда) единствено и само на Аллах.",
    },
    asma_was_sifat: {
      bg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
      ar: "توحيد الأسماء والصفات",
      desc: "Утвърждаване на Прекрасните имена и Възвишени качества на Аллах без изопачаване, отричане или оприличаване.",
    },
  };

export const TAWHEED_TAXONOMY: TawheedTopic[] = [
  // =========================================================================
  // PILLAR 1: AR-RUBUBIYYAH (Oneness of Lordship & Creation)
  // =========================================================================
  {
    id: "rububiyyah:qadr",
    pillar: "rububiyyah",
    pillarBg: "Таухид ар-Рубубийя (Господство)",
    titleBg: "Ал-Кадр: Божественият указ и предопределение",
    titleAr: "الإيمان بالقدر خيره وشره",
    summaryBg:
      "Всичко, което се случва във вселената, е записано 50 000 години преди сътворението на небесата и земята. Това носи пълен душевен покой от тревога и съжаления.",
    hookAngleBg:
      "Какво означава, че онова, което те е пропуснало, никога не е било писано да те сполети?",
    dalilReference: "Сура Ал-Хадид (57:22-23)",
    dalilTextBg:
      "„Не сполита земята или вас самите беда, без тя да е в Книга, преди още да сме я сътворили. Това за Аллах е лесно — за да не скърбите за онова, което сте изпуснали, и да не ликувате за онова, което Той ви е дал.“",
    suggestedVisualMood:
      "dark misty mountain peaks with celestial starlight, golden dawn rays breaking through fog",
  },
  {
    id: "rububiyyah:rizq",
    pillar: "rububiyyah",
    pillarBg: "Таухид ар-Рубубийя (Господство)",
    titleBg: "Ар-Ризк: Гарантираното препитание от Ар-Раззак",
    titleAr: "الرزق بيد الله وحده",
    summaryBg:
      "Никоя душа няма да напусне този свят, докато не изчерпи и последната троха от отреденото ѝ препитание. Препитанието търси човека по-силно от смъртта.",
    hookAngleBg:
      "Защо се тревожиш за препитанието си, след като Аллах го е гарантирал преди да се родиш?",
    dalilReference: "Сура Худ (11:6)",
    dalilTextBg:
      "„И няма по земята твар, чието препитание да не е от Аллах. Той знае нейното обиталище и нейното хранилище.“",
    suggestedVisualMood:
      "vast fertile valley with morning dew on emerald grass, sunbeams cutting through clouds",
  },
  {
    id: "rububiyyah:khalq",
    pillar: "rububiyyah",
    pillarBg: "Таухид ар-Рубубийя (Господство)",
    titleBg: "Ал-Халк: Величието на сътворението и космическият ред",
    titleAr: "عظمة الخلق وإتقان الصنع",
    summaryBg:
      "Размисълът над съвършенството на небесата, орбитите и природата доказва безпогрешната мъдрост на Единствения Творец без съдружници.",
    hookAngleBg:
      "Погледни към небето над теб: виждаш ли дори един единствен недостатък в сътворението?",
    dalilReference: "Сура Ал-Мулк (67:3-4)",
    dalilTextBg:
      "„Който сътвори седем небеса на слоеве. Не ще видиш несъразмерност в сътворението на Всемилостивия. Обърни пак поглед! Виждаш ли пукнатини?“",
    suggestedVisualMood:
      "deep cosmic nebula with glittering galaxies, ultra-high-definition starry night over calm desert",
  },
  {
    id: "rububiyyah:tadbeer",
    pillar: "rububiyyah",
    pillarBg: "Таухид ар-Рубубийя (Господство)",
    titleBg: "Ат-Тадбир: Божественият промисъл и управление на всяка секунда",
    titleAr: "التدبير الإلهي وتصريف الأمور",
    summaryBg:
      "Нито едно листо не пада без Неговото знание и разрешение. Той управлява всяко сърцебиене и всяка орбита без умора и сън.",
    hookAngleBg:
      "Кой контролира ударите на сърцето ти и дъха ти, докато спиш в пълна безпомощност?",
    dalilReference: "Сура Ал-Ан'ам (6:59)",
    dalilTextBg:
      "„У Него са ключовете на неведомото, знае ги само Той. Знае какво е на сушата и в морето; не пада и лист, без Той да го знае.“",
    suggestedVisualMood:
      "ancient majestic oak tree in a tranquil forest at dusk, golden particles of light floating in air",
  },
  {
    id: "rububiyyah:mulk",
    pillar: "rububiyyah",
    pillarBg: "Таухид ар-Рубубийя (Господство)",
    titleBg: "Ал-Мулк: Абсолютното господство и преходността на земната власт",
    titleAr: "الملك المطلق لله تعالى",
    summaryBg:
      "Всяка земна титла, богатство и власт са временен заем. Истинският и вечен Владетел на всичко съществуващо е само Аллах.",
    hookAngleBg: "Къде са могъщите царе и владетели от миналото? На кого принадлежи властта днес?",
    dalilReference: "Сура Али Имран (3:26)",
    dalilTextBg:
      "„Кажи: „О, Аллах, Владетелю на властта! Ти даваш властта на когото пожелаеш и отнемаш властта от когото пожелаеш... В Твоята Ръка е доброто.“",
    suggestedVisualMood:
      "ancient stone fortress ruins under dramatic sunset clouds, golden twilight reflecting on calm waters",
  },
  {
    id: "rububiyyah:naf_darr",
    pillar: "rububiyyah",
    pillarBg: "Таухид ар-Рубубийя (Господство)",
    titleBg: "Ан-Наф' уад-Дарр: Единственият източник на полза и вреда",
    titleAr: "النفع والضر بيد الله وحده",
    summaryBg:
      "Ако целият свят се събере, за да ти помогне или навреди, не могат да сторят нищо извън предначертаното от Аллах. Перата са вдигнати и мастилото е изсъхнало.",
    hookAngleBg:
      "Ако всички хора по земята се обединят срещу теб, защо няма за какво да се страхуваш?",
    dalilReference: "Сахих ат-Тирмизи (#2516 - Хадис на Ибн Аббас)",
    dalilTextBg:
      "„Знай, че ако целият народ се събере, за да ти принесе някаква полза, ще ти принесе само онази, която Аллах вече е предписал за теб... Вдигнати са перата и изсъхнаха свитъците.“",
    suggestedVisualMood:
      "massive ocean cliffs standing unshakable against stormy crashing waves, golden lighthouse beacon",
  },

  // =========================================================================
  // PILLAR 2: AL-ULUHIYYAH / AL-IBADAH (Oneness of Worship)
  // =========================================================================
  {
    id: "uluhiyyah:ikhlas",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Ал-Ихляс: Чистото намерение и спасение от човешкото одобрение",
    titleAr: "الإخلاص والتحذير من الرياء",
    summaryBg:
      "Освобождаване на делата от търсенето на човешки похвали (Рия / показуха). Делата се оценяват само и единствено според искреността към Аллах.",
    hookAngleBg: "Колко от добрите ти дела правиш тайно, без никой човек на земята да знае за тях?",
    dalilReference: "Сура Ал-Баййина (98:5) & Сахих ал-Бухари (#1)",
    dalilTextBg:
      "„А им бе повелено да служат единствено на Аллах, предани Нему в религията, правоверни.“ Пратеникът ﷺ каза: „Делата се оценяват според намеренията.“",
    suggestedVisualMood:
      "solitary golden lantern glowing brightly in pitch black night, crystalline light reflections",
  },
  {
    id: "uluhiyyah:tawakkul",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Ат-Тауаккул: Истинското упование на Аллах при трудности",
    titleAr: "التوكل على الله وحسن الظن به",
    summaryBg:
      "Вземане на всички позволени практически мерки, докато сърцето е 100% привързано към Твореца, а не към материалните причини.",
    hookAngleBg: "Как да завържеш камилата си, но да оставиш изхода изцяло в Ръцете на Аллах?",
    dalilReference: "Сура Ат-Таляк (65:3)",
    dalilTextBg:
      "„И който се уповава на Аллах, Той му е напълно достатъчен. Аллах довежда Своето дело до край.“",
    suggestedVisualMood:
      "rugged mountain trail illuminated by brilliant warm morning sunlight, clear horizon",
  },
  {
    id: "uluhiyyah:khawf_raja",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Ал-Хауф уар-Раджа: Двете криле на вярващото сърце",
    titleAr: "الخوف والرجاء جناحا المؤمن",
    summaryBg:
      "Страхът от греха предпазва от самодоволство, а надеждата в милостта предпазва от отчаяние и депресия. Балансът води към истинско спасение.",
    hookAngleBg: "Как вярващият лети към Аллах с двете криле на страха и надеждата?",
    dalilReference: "Сура Ал-Хиджр (15:49-50)",
    dalilTextBg:
      "„Извести Моите раби, че Аз съм Опрощаващият, Милосърдният, и че Моето наказание е болезненото наказание.“",
    suggestedVisualMood:
      "dramatic sky with thunderous clouds on one side and glowing warm rainbow on the other",
  },
  {
    id: "uluhiyyah:mahabbah",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Ал-Махабба: Възвишената любов към Аллах над всичко земно",
    titleAr: "محبة الله فوق كل شيء",
    summaryBg:
      "Когато обикнеш Аллах повече от парите, егото и хората, всяко подчинение и молитва се превръщат от тежест в най-сладък душевен покой.",
    hookAngleBg: "Кое заема най-голямото и съкровено място в сърцето ти, когато си сам?",
    dalilReference: "Сура Ал-Бакара (2:165)",
    dalilTextBg: "„А онези, които вярват, най-силно обичат Аллах.“",
    suggestedVisualMood:
      "serene peaceful oasis at golden hour, tranquil crystal-clear spring water reflecting sky",
  },
  {
    id: "uluhiyyah:dua",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Ад-Ду'а: Директният зов към Всевишния без посредници",
    titleAr: "الدعاء هو العبادة وإخلاصه لله",
    summaryBg:
      "Ду'а е същината на ибадета. Зовът се отправя директно към Аллах без светии, гробове или посредници. Той е по-близо от сънната артерия.",
    hookAngleBg:
      "Защо да търсиш създанията за помощ, когато Самият Творец чака да Го повикаш директно?",
    dalilReference: "Сура Гафир (40:60) & Сура Ал-Бакара (2:186)",
    dalilTextBg:
      "„И рече вашият Господ: „Зовете Ме, и Аз ще ви откликна!“ ... „А когато Моите раби те питат за Мен, Аз съм наблизо.“",
    suggestedVisualMood:
      "dramatic desert dunes under an endless starry sky, moonlight illuminating the golden sand",
  },
  {
    id: "uluhiyyah:tawbah",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Ат-Тауба: Вратата на искреното покаяние, която никога не се затваря",
    titleAr: "التوبة الصادقة ومحو الذنوب",
    summaryBg:
      "Няма грях, който да е по-голям от прошката на Аллах. Искреното обръщане изтрива миналото и превръща греховете в добрини.",
    hookAngleBg:
      "Колкото и да си сгрешил, знаеш ли защо никога не бива да се отчайваш от милостта на Аллах?",
    dalilReference: "Сура Аз-Зумар (39:53)",
    dalilTextBg:
      "„Кажи: „О, раби Мои, които престъпихте в ущърб на себе си, не губете надежда за милостта на Аллах! Аллах опрощава всички грехове. Той е Опрощаващият, Милосърдният.“",
    suggestedVisualMood:
      "fresh gentle rainfall over parched earth, fresh green sprouts emerging in warm golden light",
  },
  {
    id: "uluhiyyah:shukr",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Аш-Шукр: Благодарността като ключ за запазване и умножаване на благата",
    titleAr: "الشكر قيد النعم ومزيدها",
    summaryBg:
      "Истинската благодарност със сърце, език и дела предпазва благата от изчезване и привлича нови благословии от Аллах.",
    hookAngleBg: "Благодари ли днес на Аллах за благата, които приемаш за даденост всяка секунда?",
    dalilReference: "Сура Ибрахим (14:7)",
    dalilTextBg:
      "„И когато вашият Господ оповести: „Ако сте благодарни, непременно ще ви надбавя; а ако сте неблагодарни — наказанието Ми наистина е сурово.“",
    suggestedVisualMood:
      "bountiful golden wheat field swaying under sunrise, radiant warm morning glow",
  },
  {
    id: "uluhiyyah:anti_shirk",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Очистване от Ширк: Освобождаване от суеверия, муски и сини мъниста",
    titleAr: "حماية التوحيد من الشرك والتمائم",
    summaryBg:
      "Сините мъниста, червените конци, зодиите и суеверията нямат никаква сила. Свободата на духа идва от упованието единствено в Аллах.",
    hookAngleBg:
      "Как едно синьо мънисто или конец може да те пази, след като само Аллах държи защитата на света?",
    dalilReference: "Муснад Ахмад (#16969) & Сунан Аби Дауд (#3910)",
    dalilTextBg:
      "Пратеникът на Аллах ﷺ каза: „Който окачи талисман (амулет), е съдружил с Аллах (извършил е ширк).“",
    suggestedVisualMood:
      "breaking chains made of dark iron, revealing pure brilliant crystal core inside",
  },
  {
    id: "uluhiyyah:sabr",
    pillar: "uluhiyyah",
    pillarBg: "Таухид ал-Улюхийя (Поклонение)",
    titleBg: "Ас-Сабр лиллях: Търпението като искрено поклонение пред волята на Аллах",
    titleAr: "الصبر لله واحتساب الأجر",
    summaryBg:
      "Търпението при изпитания без роптание е доказателство за чист Таухид. Наградата за търпеливите е безмерна и без отчет.",
    hookAngleBg: "Знаеш ли защо търпението при първия удар на болката е белегът на силния Таухид?",
    dalilReference: "Сура Аз-Зумар (39:10)",
    dalilTextBg: "„Само на търпеливите ще се изплати тяхната награда безмерно.“",
    suggestedVisualMood:
      "solitary mountain pine tree standing strong amidst harsh freezing winter blizzard",
  },

  // =========================================================================
  // PILLAR 3: AL-ASMA WAS-SIFAT (Names and Attributes of Allah)
  // =========================================================================
  {
    id: "asma:hayy_qayyum",
    pillar: "asma_was_sifat",
    pillarBg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
    titleBg: "Ал-Хайй и Ал-Кайюм: Вечноживият, Който крепи всичко без умора",
    titleAr: "الحي القيوم الذي لا يموت ولا ينام",
    summaryBg:
      "Лекарството срещу преумора, стрес и безпомощност: да се облегнеш на Онзи, Когото нито дрямка, нито сън Го обзема.",
    hookAngleBg: "Когато си напълно изтощен от живота, на Кого разчиташ за сили?",
    dalilReference: "Сура Ал-Бакара (2:255 - Аят ал-Курси)",
    dalilTextBg:
      "„Аллах! Няма друг бог освен Него — Вечноживия, Всеподдържащия! Не Го обзема нито дрямка, нито сън.“",
    suggestedVisualMood:
      "endless cosmic pillars of radiant white-gold light extending infinitely into deep cosmos",
  },
  {
    id: "asma:rahman_rahim",
    pillar: "asma_was_sifat",
    pillarBg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
    titleBg: "Ар-Рахман и Ар-Рахим: Необятната божествена милост",
    titleAr: "الرحمن الرحيم وسعت رحمته كل شيء",
    summaryBg:
      "Милостта на Аллах предшества Неговия гняв и обгръща всяка частица във вселената, изцелявайки съкрушените сърца.",
    hookAngleBg:
      "Знаеш ли, че милостта на Аллах към теб е по-голяма от милостта на майка към нейното бебе?",
    dalilReference: "Сура Ал-А'раф (7:156) & Сахих ал-Бухари (#7553)",
    dalilTextBg:
      "„...а Моята милост обгръща всяко нещо.“ Пратеникът ﷺ каза: „Когато Аллах сътвори творенията, записа: Наистина Моята милост надделява над Моя гняв.“",
    suggestedVisualMood:
      "gentle glowing golden sunset reflecting on smooth mirror-like ocean water",
  },
  {
    id: "asma:sami_basir",
    pillar: "asma_was_sifat",
    pillarBg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
    titleBg: "Ас-Сами' и Ал-Басир: Всечуващият шепота и Всевиждащият скритите сълзи",
    titleAr: "السميع البصير المطلع على السرائر",
    summaryBg:
      "Аллах чува нечутия шепот в гърдите ти и вижда черната мравка на черния камък в тъмната нощ. Ти никога не си сам и незабелязан.",
    hookAngleBg: "Когато плачеш в тъмнината и никой човек не вижда, Кой чува всеки твой въздих?",
    dalilReference: "Сура Аш-Шура (42:11) & Сура Ал-Муджадила (58:1)",
    dalilTextBg: "„Няма нищо подобно на Него. Той е Всечуващият, Всевиждащият.“",
    suggestedVisualMood:
      "deep indigo night sky with silver moonlight casting sharp reflections over calm mountain lake",
  },
  {
    id: "asma:hakim_alim",
    pillar: "asma_was_sifat",
    pillarBg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
    titleBg: "Ал-Хаким и Ал-Алим: Премъдрият, Който знае невидимото бъдеще",
    titleAr: "الحكيم العليم في قضائه وقدره",
    summaryBg:
      "Ние виждаме само настоящия момент, а Аллах вижда вечността. Всяко забавяне или отказана молитва крие божествена мъдрост и защита за теб.",
    hookAngleBg:
      "Защо онова, за което плачеш днес, може да се окаже най-голямото спасение в бъдещето ти?",
    dalilReference: "Сура Ал-Бакара (2:216)",
    dalilTextBg:
      "„...но може да възненавидите нещо, а то да е добро за вас; и може да обикнете нещо, а то да е зло за вас. Аллах знае, вие не знаете.“",
    suggestedVisualMood:
      "mysterious ancient stone path ascending through morning mountain mist into glowing summit sunlight",
  },
  {
    id: "asma:wadud",
    pillar: "asma_was_sifat",
    pillarBg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
    titleBg: "Ал-Уадуд: Прелюбящият Господ, Който дарява обич на Своите раби",
    titleAr: "الودود ذو العرش المجيد",
    summaryBg:
      "Когато Аллах обикне Свой раб, Той заповядва на ангелите да го обичат и поставя обич към него в сърцата на хората по земята.",
    hookAngleBg: "Как да спечелиш любовта на Онзи, в Чиито Ръце са всички сърца във вселената?",
    dalilReference: "Сура Ал-Бурудж (85:14) & Сахих ал-Бухари (#3209)",
    dalilTextBg:
      "„И Той е Опрощаващият, Прелюбящият.“ Пратеникът ﷺ каза: „Ако Аллах обикне някой раб, призовава Джибрил: Аллах обича еди-кой си, обичай го и ти!...“",
    suggestedVisualMood:
      "warm sunrise over calm valley with golden morning light illuminating wildflower meadows",
  },
  {
    id: "asma:jabbar_aziz",
    pillar: "asma_was_sifat",
    pillarBg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
    titleBg: "Ал-Джаббар и Ал-Азиз: Изцелителят на съкрушените сърца и Всемогъщият",
    titleAr: "الجبار الذي يجبر كسر القلوب المنكسرة",
    summaryBg:
      "Ал-Джаббар е Онзи, Който изцелява всяко разбито сърце, изправя падналия духом и смирява горделивите угнетители.",
    hookAngleBg:
      "Когато сърцето ти е на парчета от житейска болка, кой друг освен Ал-Джаббар може да го изцели?",
    dalilReference: "Сура Ал-Хашр (59:23) & Сунан Аби Дауд (#874)",
    dalilTextBg:
      "„Той е Аллах, няма друг бог освен Него... Всемогъщият, Възпиращият (Ал-Джаббар)...“ Дуа на Пророка ﷺ: „Господи мой, прости ми, смили се над мен и изцели ме (уаджбурни)!“",
    suggestedVisualMood:
      "cracked desert stone mended and glowing with warm molten golden divine light",
  },
  {
    id: "asma:qarib_mujib",
    pillar: "asma_was_sifat",
    pillarBg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
    titleBg: "Ал-Кариб и Ал-Муджиб: Всеблизкият, Който откликва на бедстващия",
    titleAr: "القريب المجيب لمن دعاه",
    summaryBg:
      "Той не се нуждае от преводач или посредник. Той е по-близо до теб от самия теб и никога не отпраща празни вдигнатите към Него ръце.",
    hookAngleBg:
      "Знаеш ли, че между теб и Аллах няма нито една бариера, когато вдигнеш ръцете си с искрена молба?",
    dalilReference: "Сура Худ (11:61) & Сура Каф (50:16)",
    dalilTextBg:
      "„...Наистина моят Господ е наблизо, откликващ.“ ... „И Ние сме по-близо до него от шийната му артерия.“",
    suggestedVisualMood:
      "dramatic sunset over high mountain peak with solitary prayer rug facing Mecca horizon",
  },
  {
    id: "asma:ghaffar_tawwab",
    pillar: "asma_was_sifat",
    pillarBg: "Таухид ал-Асма вас-Сифат (Имена и Качества)",
    titleBg: "Ал-Гаффар и Ат-Таууаб: Всеопрощаващият, Който покрива срама от греховете",
    titleAr: "الغفار التواب الذي يقبل التوبة عن عباده",
    summaryBg:
      "Ал-Гаффар не просто прощава греховете, но ги покрива и скрива от очите на хората и ангелите, давайки нов чист старт.",
    hookAngleBg:
      "Колко пъти си нарушавал обещанието си към Аллах, а Той все още те покрива и очаква покаянието ти?",
    dalilReference: "Сура Ал-Фуркан (25:70) & Сура Ан-Ниса (4:99)",
    dalilTextBg:
      "„...освен онези, които са се покаяли и повярвали, и вършили праведни дела. На тях Аллах ще замени злините с добрини. Аллах е опрощаващ, милосърден.“",
    suggestedVisualMood:
      "pure white morning light breaking through heavy storm clouds over tranquil ocean",
  },
];

/**
 * Returns the complete Tawheed taxonomy registry.
 */
export function getTawheedTaxonomy(): TawheedTopic[] {
  return [...TAWHEED_TAXONOMY];
}

/**
 * Returns topics for a specific Tawheed pillar.
 */
export function getTawheedTopicsByPillar(pillar: TawheedPillar): TawheedTopic[] {
  return TAWHEED_TAXONOMY.filter((t) => t.pillar === pillar);
}

/**
 * Selects the next Tawheed topic based on recent history with pillar balancing.
 * Ensures consecutive generations cover distinct pillars and sub-topics without repeating hooks.
 */
export function getNextTawheedTopic(recentTopicIdsOrTitles: string[] = []): TawheedTopic {
  if (!recentTopicIdsOrTitles || recentTopicIdsOrTitles.length === 0) {
    // Return first topic (Qadr) or random from Rububiyyah
    return TAWHEED_TAXONOMY[0];
  }

  const normalizedRecent = recentTopicIdsOrTitles.map((id) => id.toLowerCase().trim());

  // Filter out used topics
  const unusedTopics = TAWHEED_TAXONOMY.filter((topic) => {
    const topicIdNorm = topic.id.toLowerCase();
    const titleBgNorm = topic.titleBg.toLowerCase();
    return !normalizedRecent.some(
      (r) =>
        r === topicIdNorm ||
        topicIdNorm.includes(r) ||
        r.includes(topicIdNorm) ||
        r === titleBgNorm ||
        titleBgNorm.includes(r),
    );
  });

  // If all topics have been used, reset the pool to all topics
  const pool = unusedTopics.length > 0 ? unusedTopics : [...TAWHEED_TAXONOMY];

  // Find the last used pillar to enforce pillar rotation (e.g. rububiyyah -> uluhiyyah -> asma_was_sifat)
  const last = normalizedRecent[normalizedRecent.length - 1];
  const lastUsedTopic = TAWHEED_TAXONOMY.find((t) => {
    return (
      last &&
      (last.includes(t.id.toLowerCase()) ||
        t.id.toLowerCase().includes(last) ||
        t.titleBg.toLowerCase().includes(last))
    );
  });

  const pillarOrder: TawheedPillar[] = ["rububiyyah", "uluhiyyah", "asma_was_sifat"];
  let targetPillar: TawheedPillar = "rububiyyah";
  if (lastUsedTopic) {
    const nextIdx = (pillarOrder.indexOf(lastUsedTopic.pillar) + 1) % pillarOrder.length;
    targetPillar = pillarOrder[nextIdx];
  }

  let candidates = pool.filter((t) => t.pillar === targetPillar);
  if (candidates.length === 0) {
    candidates = pool;
  }

  // Sort candidates by LRU (least recently used in normalizedRecent):
  // Helper to find the latest index a topic was referenced (by ID or Bulgarian title)
  const getLastSeenIdx = (topic: TawheedTopic): number => {
    const idNorm = topic.id.toLowerCase();
    const titleNorm = topic.titleBg.toLowerCase();
    for (let i = normalizedRecent.length - 1; i >= 0; i--) {
      const r = normalizedRecent[i];
      if (
        r === idNorm ||
        idNorm.includes(r) ||
        r.includes(idNorm) ||
        r === titleNorm ||
        titleNorm.includes(r)
      ) {
        return i;
      }
    }
    return -1;
  };

  // Candidates never seen have index -1 (highest priority),
  // Candidates seen longest ago have smaller non-negative index.
  candidates.sort((a, b) => {
    const aIdx = getLastSeenIdx(a);
    const bIdx = getLastSeenIdx(b);
    return aIdx - bIdx;
  });

  return candidates[0] || TAWHEED_TAXONOMY[0];
}

/**
 * Formats a strict negative constraint prompt string listing recent topics and hooks to exclude,
 * and prohibiting overused existential clichés (e.g., "Защо си тук?", "Защо сме на този свят?").
 */
export function formatNegativeExclusionPrompt(
  recentEntries: Array<{ topic?: string; hook?: string; title?: string; subtopicId?: string }> = [],
): string {
  const lines: string[] = [];

  lines.push("=== СТРИКТНО ЗАБРАНЕНИ ПРЕДИШНИ ТЕМИ И КУКИ (ВЕЧЕ ИЗПОЛЗВАНИ) ===");
  lines.push("Следните теми, заглавия и куки (hooks) са ВЕЧЕ генерирани наскоро.");
  lines.push("СТРИКТНО ЗАБРАНЕНО Е да повтаряш или перифразираш тези идеи и въпроси:");

  if (recentEntries.length > 0) {
    const dedupeMap = new Set<string>();
    for (const entry of recentEntries.slice(-10)) {
      const parts = [entry.title, entry.hook, entry.topic, entry.subtopicId].filter(Boolean);
      const row = parts.join(" | ");
      if (row && !dedupeMap.has(row)) {
        dedupeMap.add(row);
        lines.push(`- ❌ [ВЕЧЕ ИЗПОЛЗВАН]: ${row}`);
      }
    }
  } else {
    lines.push("- (Първа сесия: избери конкретна дълбока подтема на Таухид)");
  }

  lines.push("");
  lines.push("=== АБСОЛЮТНО ЗАБРАНЕНИ БАНАЛНИ КЛИШЕТА (BAN LIST) ===");
  lines.push(
    "СТРИКТНО ЗАБРАНЕНО е да използваш следните банални или философски въпроси за Слайд 1 (Куката):",
  );
  lines.push("❌ 'Защо си тук?'");
  lines.push("❌ 'Защо сме на този свят?'");
  lines.push("❌ 'Какъв е смисълът на живота?'");
  lines.push("❌ 'Замислял ли си се защо съществуваш?'");
  lines.push("❌ 'Защо си създаден?'");
  lines.push("❌ 'Каква е целта на съществуването ти?'");
  lines.push("");
  lines.push(
    "Вместо банални въпроси, задължително изгради куката (Слайд 1) около КОНКРЕТНОТО богословско измерение на избраната подтема на Таухид (напр. предопределение, гаранция за препитанието, изцеление на сърцето, чистота на ду'а без посредници).",
  );

  return lines.join("\n");
}
