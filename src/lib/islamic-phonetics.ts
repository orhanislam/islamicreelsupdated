/**
 * Comprehensive Islamic Phonetics & Arabic Pronunciation Normalizer for TTS
 * Ensures all 114 Quran Surah names and authentic Islamic terminologies
 * (Tawheed, Asma ul-Husna, Sunnah, Hadith, Ibadah, Fiqh, Akhirah)
 * are pronounced accurately with authentic Arabic Salafi recitation diction.
 */

export interface SurahPhoneticEntry {
  number: number;
  canonicalName: string;
  phoneticTts: string;
  displayWord: string;
  pattern: string; // regex pattern for matching variants
}

export const QURAN_SURAHS_PHONETICS: SurahPhoneticEntry[] = [
  { number: 1, canonicalName: "Ал-Фатиха", phoneticTts: "Ал-Фаатиха", displayWord: "Ал-Фатиха", pattern: "(?:ал[- ]?)?фатиха|fatiha|al[- ]?fatiha" },
  { number: 2, canonicalName: "Ал-Бакара", phoneticTts: "Ал-Бакара", displayWord: "Ал-Бакара", pattern: "(?:ал[- ]?)?бакара|baqarah?|al[- ]?baqarah?" },
  { number: 3, canonicalName: "Али Имран", phoneticTts: "'Аали 'Имраан", displayWord: "Али Имран", pattern: "али[- ]?имран|ali[- ]?imran|'ali[- ]?'imran" },
  { number: 4, canonicalName: "Ан-Ниса", phoneticTts: "Ан-Нисаа'", displayWord: "Ан-Ниса", pattern: "(?:ан[- ]?)?ниса|nisaa?|an[- ]?nisaa?" },
  { number: 5, canonicalName: "Ал-Маида", phoneticTts: "Ал-Маа'ида", displayWord: "Ал-Маида", pattern: "(?:ал[- ]?)?маида|ma'?idah?|al[- ]?ma'?idah?" },
  { number: 6, canonicalName: "Ал-Ан'ам", phoneticTts: "Ал-Ан'аам", displayWord: "Ал-Ан'ам", pattern: "(?:ал[- ]?)?ан'?ам|an'?am|al[- ]?an'?am" },
  { number: 7, canonicalName: "Ал-А'раф", phoneticTts: "Ал-А'рааф", displayWord: "Ал-А'раф", pattern: "(?:ал[- ]?)?а'?раф|a'?raf|al[- ]?a'?raf" },
  { number: 8, canonicalName: "Ал-Анфал", phoneticTts: "Ал-Анфаал", displayWord: "Ал-Анфал", pattern: "(?:ал[- ]?)?анфал|anfal|al[- ]?anfal" },
  { number: 9, canonicalName: "Ат-Тауба", phoneticTts: "Ат-Тауба", displayWord: "Ат-Тауба", pattern: "(?:ат[- ]?)?тауба|tawbah?|at[- ]?tawbah?" },
  { number: 10, canonicalName: "Юнус", phoneticTts: "Йуунус", displayWord: "Юнус", pattern: "юнус|yunus" },
  { number: 11, canonicalName: "Худ", phoneticTts: "Хууд", displayWord: "Худ", pattern: "худ|hud" },
  { number: 12, canonicalName: "Юсуф", phoneticTts: "Йуусуф", displayWord: "Юсуф", pattern: "юсуф|yusuf" },
  { number: 13, canonicalName: "Ар-Ра'д", phoneticTts: "Ар-Раад", displayWord: "Ар-Ра'д", pattern: "(?:ар[- ]?)?ра['`]?д|ra'?d|ar[- ]?ra'?d" },
  { number: 14, canonicalName: "Ибрахим", phoneticTts: "Ибраахиим", displayWord: "Ибрахим", pattern: "ибрахим|ibrahim" },
  { number: 15, canonicalName: "Ал-Хиджр", phoneticTts: "Ал-Хиджр", displayWord: "Ал-Хиджр", pattern: "(?:ал[- ]?)?хиджр|hijr|al[- ]?hijr" },
  { number: 16, canonicalName: "Ан-Нахл", phoneticTts: "Ан-Нахл", displayWord: "Ан-Нахл", pattern: "(?:ан[- ]?)?нахл|nahl|an[- ]?nahl" },
  { number: 17, canonicalName: "Ал-Исра", phoneticTts: "Ал-Исраа'", displayWord: "Ал-Исра", pattern: "(?:ал[- ]?)?исра|isra'?|al[- ]?isra'?" },
  { number: 18, canonicalName: "Ал-Кахф", phoneticTts: "Ал-Кахф", displayWord: "Ал-Кахф", pattern: "(?:ал[- ]?)?кахф|kahf|al[- ]?kahf" },
  { number: 19, canonicalName: "Мариам", phoneticTts: "Марйам", displayWord: "Мариам", pattern: "мариам|марием|марям|maryam" },
  { number: 20, canonicalName: "Та Ха", phoneticTts: "Таа Хаа", displayWord: "Та Ха", pattern: "та[- ]?ха|ta[- ]?ha" },
  { number: 21, canonicalName: "Ал-Анбия", phoneticTts: "Ал-Анбийаа'", displayWord: "Ал-Анбия", pattern: "(?:ал[- ]?)?анбия|anbiya'?|al[- ]?anbiya'?" },
  { number: 22, canonicalName: "Ал-Хадж", phoneticTts: "Ал-Хадж", displayWord: "Ал-Хадж", pattern: "(?:ал[- ]?)?хадж|hajj|al[- ]?hajj" },
  { number: 23, canonicalName: "Ал-Му'минун", phoneticTts: "Ал-Му'минуун", displayWord: "Ал-Му'минун", pattern: "(?:ал[- ]?)?му'?минун|mu'?minun|al[- ]?mu'?minun" },
  { number: 24, canonicalName: "Ан-Нур", phoneticTts: "Ан-Нуур", displayWord: "Ан-Нур", pattern: "(?:ан[- ]?)?нур|nur|an[- ]?nur" },
  { number: 25, canonicalName: "Ал-Фуркан", phoneticTts: "Ал-Фуркаан", displayWord: "Ал-Фуркан", pattern: "(?:ал[- ]?)?фуркан|furqan|al[- ]?furqan" },
  { number: 26, canonicalName: "Аш-Шу'ара", phoneticTts: "Аш-Шу'араа'", displayWord: "Аш-Шу'ара", pattern: "(?:аш[- ]?)?шу'?ара|shu'?ara'?|ash[- ]?shu'?ara'?" },
  { number: 27, canonicalName: "Ан-Намл", phoneticTts: "Ан-Намл", displayWord: "Ан-Намл", pattern: "(?:ан[- ]?)?намл|naml|an[- ]?naml" },
  { number: 28, canonicalName: "Ал-Касас", phoneticTts: "Ал-Касас", displayWord: "Ал-Касас", pattern: "(?:ал[- ]?)?касас|qasas|al[- ]?qasas" },
  { number: 29, canonicalName: "Ал-Анкабут", phoneticTts: "Ал-'Анкабуут", displayWord: "Ал-Анкабут", pattern: "(?:ал[- ]?)?анкабут|'ankabut|al[- ]?'?ankabut" },
  { number: 30, canonicalName: "Ар-Рум", phoneticTts: "Ар-Руум", displayWord: "Ар-Рум", pattern: "(?:ар[- ]?)?рум|rum|ar[- ]?rum" },
  { number: 31, canonicalName: "Лукман", phoneticTts: "Лукмаан", displayWord: "Лукман", pattern: "лукман|luqman" },
  { number: 32, canonicalName: "Ас-Саджда", phoneticTts: "Ас-Саджда", displayWord: "Ас-Саджда", pattern: "(?:ас[- ]?)?саджда|sajdah?|as[- ]?sajdah?" },
  { number: 33, canonicalName: "Ал-Ахзаб", phoneticTts: "Ал-Ахзааб", displayWord: "Ал-Ахзаб", pattern: "(?:ал[- ]?)?ахзаб|ahzab|al[- ]?ahzab" },
  { number: 34, canonicalName: "Саба", phoneticTts: "Саба'", displayWord: "Саба", pattern: "саба|saba'?" },
  { number: 35, canonicalName: "Фатир", phoneticTts: "Фаатир", displayWord: "Фатир", pattern: "фатир|fatir" },
  { number: 36, canonicalName: "Йа Син", phoneticTts: "Йаа Сиин", displayWord: "Йа Син", pattern: "йа[- ]?син|ясин|ya[- ]?sin" },
  { number: 37, canonicalName: "Ас-Саффат", phoneticTts: "Ас-Сааффаат", displayWord: "Ас-Саффат", pattern: "(?:ас[- ]?)?саффат|saffat|as[- ]?saffat" },
  { number: 38, canonicalName: "Сад", phoneticTts: "Саад", displayWord: "Сад", pattern: "сад|sad" },
  { number: 39, canonicalName: "Аз-Зумар", phoneticTts: "Аз-Зумар", displayWord: "Аз-Зумар", pattern: "(?:аз[- ]?)?зумар|zumar|az[- ]?zumar" },
  { number: 40, canonicalName: "Гафир", phoneticTts: "Гаафир", displayWord: "Гафир", pattern: "гафир|ghafir" },
  { number: 41, canonicalName: "Фуссилат", phoneticTts: "Фуссилят", displayWord: "Фуссилат", pattern: "фуссилат|fussilat" },
  { number: 42, canonicalName: "Аш-Шура", phoneticTts: "Аш-Шуура", displayWord: "Аш-Шура", pattern: "(?:аш[- ]?)?шура|shura|ash[- ]?shura" },
  { number: 43, canonicalName: "Аз-Зухруф", phoneticTts: "Аз-Зухруф", displayWord: "Аз-Зухруф", pattern: "(?:аз[- ]?)?зухруф|zukhruf|az[- ]?zukhruf" },
  { number: 44, canonicalName: "Ад-Духан", phoneticTts: "Ад-Духаан", displayWord: "Ад-Духан", pattern: "(?:ад[- ]?)?духан|dukhan|ad[- ]?dukhan" },
  { number: 45, canonicalName: "Ал-Джасия", phoneticTts: "Ал-Джаасийа", displayWord: "Ал-Джасия", pattern: "(?:ал[- ]?)?джасия|jathiyah?|al[- ]?jathiyah?" },
  { number: 46, canonicalName: "Ал-Ахкаф", phoneticTts: "Ал-Ахкааф", displayWord: "Ал-Ахкаф", pattern: "(?:ал[- ]?)?ахкаф|ahqaf|al[- ]?ahqaf" },
  { number: 47, canonicalName: "Мухаммад", phoneticTts: "Мухаммад", displayWord: "Мухаммад", pattern: "мухаммад|muhammad" },
  { number: 48, canonicalName: "Ал-Фатх", phoneticTts: "Ал-Фатх", displayWord: "Ал-Фатх", pattern: "(?:ал[- ]?)?фатх|fath|al[- ]?fath" },
  { number: 49, canonicalName: "Ал-Худжурат", phoneticTts: "Ал-Худжураат", displayWord: "Ал-Худжурат", pattern: "(?:ал[- ]?)?худжурат|hujurat|al[- ]?hujurat" },
  { number: 50, canonicalName: "Каф", phoneticTts: "Кааф", displayWord: "Каф", pattern: "каф|qaf" },
  { number: 51, canonicalName: "Аз-Зарият", phoneticTts: "Аз-Заарийаат", displayWord: "Аз-Зарият", pattern: "(?:аз[- ]?)?зарият|(?:ад[- ]?)?дарият|dhariyat|az[- ]?dhariyat" },
  { number: 52, canonicalName: "Ат-Тур", phoneticTts: "Ат-Туур", displayWord: "Ат-Тур", pattern: "(?:ат[- ]?)?тур|tur|at[- ]?tur" },
  { number: 53, canonicalName: "Ан-Наджм", phoneticTts: "Ан-Наджм", displayWord: "Ан-Наджм", pattern: "(?:ан[- ]?)?наджм|najm|an[- ]?najm" },
  { number: 54, canonicalName: "Ал-Камар", phoneticTts: "Ал-Камар", displayWord: "Ал-Камар", pattern: "(?:ал[- ]?)?камар|qamar|al[- ]?qamar" },
  { number: 55, canonicalName: "Ар-Рахман", phoneticTts: "Ар-Рахмаан", displayWord: "Ар-Рахман", pattern: "(?:ар[- ]?)?рахман|rahman|ar[- ]?rahman" },
  { number: 56, canonicalName: "Ал-Ваки'а", phoneticTts: "Ал-Вааки'а", displayWord: "Ал-Ваки'а", pattern: "(?:ал[- ]?)?ваки'?а|(?:ал[- ]?)?уакиа|waqi'?ah?|al[- ]?waqi'?ah?" },
  { number: 57, canonicalName: "Ал-Хадид", phoneticTts: "Ал-Хадиид", displayWord: "Ал-Хадид", pattern: "(?:ал[- ]?)?хадид|hadid|al[- ]?hadid" },
  { number: 58, canonicalName: "Ал-Муджадила", phoneticTts: "Ал-Муджаадиля", displayWord: "Ал-Муджадила", pattern: "(?:ал[- ]?)?муджадила|mujadilah?|al[- ]?mujadilah?" },
  { number: 59, canonicalName: "Ал-Хашр", phoneticTts: "Ал-Хашр", displayWord: "Ал-Хашр", pattern: "(?:ал[- ]?)?хашр|hashr|al[- ]?hashr" },
  { number: 60, canonicalName: "Ал-Мумтахана", phoneticTts: "Ал-Мумтахана", displayWord: "Ал-Мумтахана", pattern: "(?:ал[- ]?)?мумтахана|mumtahanah?|al[- ]?mumtahanah?" },
  { number: 61, canonicalName: "Ас-Сафф", phoneticTts: "Ас-Сафф", displayWord: "Ас-Сафф", pattern: "(?:ас[- ]?)?сафф|saff|as[- ]?saff" },
  { number: 62, canonicalName: "Ал-Джуму'а", phoneticTts: "Ал-Джуму'а", displayWord: "Ал-Джуму'а", pattern: "(?:ал[- ]?)?джуму'?а|(?:ал[- ]?)?джума|jumu'?ah?|al[- ]?jumu'?ah?" },
  { number: 63, canonicalName: "Ал-Мунафикун", phoneticTts: "Ал-Мунаафикуун", displayWord: "Ал-Мунафикун", pattern: "(?:ал[- ]?)?мунафикун|munafiqun|al[- ]?munafiqun" },
  { number: 64, canonicalName: "Ат-Тагабун", phoneticTts: "Ат-Тагаабун", displayWord: "Ат-Тагабун", pattern: "(?:ат[- ]?)?тагабун|taghabun|at[- ]?taghabun" },
  { number: 65, canonicalName: "Ат-Талак", phoneticTts: "Ат-Талаак", displayWord: "Ат-Талак", pattern: "(?:ат[- ]?)?талак|talaq|at[- ]?talaq" },
  { number: 66, canonicalName: "Ат-Тахрим", phoneticTts: "Ат-Тахриим", displayWord: "Ат-Тахрим", pattern: "(?:ат[- ]?)?тахрим|tahrim|at[- ]?tahrim" },
  { number: 67, canonicalName: "Ал-Мулк", phoneticTts: "Ал-Мулк", displayWord: "Ал-Мулк", pattern: "(?:ал[- ]?)?мулк|mulk|al[- ]?mulk" },
  { number: 68, canonicalName: "Ал-Калам", phoneticTts: "Ал-Калям", displayWord: "Ал-Калам", pattern: "(?:ал[- ]?)?калам|qalam|al[- ]?qalam" },
  { number: 69, canonicalName: "Ал-Хакка", phoneticTts: "Ал-Хаакка", displayWord: "Ал-Хакка", pattern: "(?:ал[- ]?)?хакка|haqqah?|al[- ]?haqqah?" },
  { number: 70, canonicalName: "Ал-Ма'аридж", phoneticTts: "Ал-Ма'ааридж", displayWord: "Ал-Ма'аридж", pattern: "(?:ал[- ]?)?ма'?аридж|ma'?arij|al[- ]?ma'?arij" },
  { number: 71, canonicalName: "Нух", phoneticTts: "Нуух", displayWord: "Нух", pattern: "нух|nuh" },
  { number: 72, canonicalName: "Ал-Джинн", phoneticTts: "Ал-Джинн", displayWord: "Ал-Джинн", pattern: "(?:ал[- ]?)?джинн|jinn|al[- ]?jinn" },
  { number: 73, canonicalName: "Ал-Муззаммил", phoneticTts: "Ал-Муззаммиль", displayWord: "Ал-Муззаммил", pattern: "(?:ал[- ]?)?муззаммил|muzzammil|al[- ]?muzzammil" },
  { number: 74, canonicalName: "Ал-Муддассир", phoneticTts: "Ал-Муддассир", displayWord: "Ал-Муддассир", pattern: "(?:ал[- ]?)?муддассир|muddaththir|al[- ]?muddaththir" },
  { number: 75, canonicalName: "Ал-Кияма", phoneticTts: "Ал-Кийаама", displayWord: "Ал-Кияма", pattern: "(?:ал[- ]?)?кияма|qiyamah?|al[- ]?qiyamah?" },
  { number: 76, canonicalName: "Ал-Инсан", phoneticTts: "Ал-Инсаан", displayWord: "Ал-Инсан", pattern: "(?:ал[- ]?)?инсан|insan|al[- ]?insan" },
  { number: 77, canonicalName: "Ал-Мурсалат", phoneticTts: "Ал-Мурсаляат", displayWord: "Ал-Мурсалат", pattern: "(?:ал[- ]?)?мурсалат|mursalat|al[- ]?mursalat" },
  { number: 78, canonicalName: "Ан-Наба", phoneticTts: "Ан-Наба'", displayWord: "Ан-Наба", pattern: "(?:ан[- ]?)?наба|naba'?|an[- ]?naba'?" },
  { number: 79, canonicalName: "Ан-Нази'ат", phoneticTts: "Ан-Наази'аат", displayWord: "Ан-Нази'ат", pattern: "(?:ан[- ]?)?нази'?ат|nazi'?at|an[- ]?nazi'?at" },
  { number: 80, canonicalName: "'Абаса", phoneticTts: "'Абаса", displayWord: "'Абаса", pattern: "'?абаса|'?abasa" },
  { number: 81, canonicalName: "Ат-Таквир", phoneticTts: "Ат-Таквиир", displayWord: "Ат-Таквир", pattern: "(?:ат[- ]?)?таквир|takwir|at[- ]?takwir" },
  { number: 82, canonicalName: "Ал-Инфитар", phoneticTts: "Ал-Инфитаар", displayWord: "Ал-Инфитар", pattern: "(?:ал[- ]?)?инфитар|infitar|al[- ]?infitar" },
  { number: 83, canonicalName: "Ал-Мутаффифин", phoneticTts: "Ал-Мутаффифиин", displayWord: "Ал-Мутаффифин", pattern: "(?:ал[- ]?)?мутаффифин|mutaffifin|al[- ]?mutaffifin" },
  { number: 84, canonicalName: "Ал-Иншикак", phoneticTts: "Ал-Иншикаак", displayWord: "Ал-Иншикак", pattern: "(?:ал[- ]?)?иншикак|inshiqaq|al[- ]?inshiqaq" },
  { number: 85, canonicalName: "Ал-Бурудж", phoneticTts: "Ал-Буруудж", displayWord: "Ал-Бурудж", pattern: "(?:ал[- ]?)?бурудж|buruj|al[- ]?buruj" },
  { number: 86, canonicalName: "Ат-Тарик", phoneticTts: "Ат-Таарик", displayWord: "Ат-Тарик", pattern: "(?:ат[- ]?)?тарик|tariq|at[- ]?tariq" },
  { number: 87, canonicalName: "Ал-А'ля", phoneticTts: "Ал-А'ляа", displayWord: "Ал-А'ля", pattern: "(?:ал[- ]?)?а'?ля|a'?la|al[- ]?a'?la" },
  { number: 88, canonicalName: "Ал-Гашия", phoneticTts: "Ал-Гаашийа", displayWord: "Ал-Гашия", pattern: "(?:ал[- ]?)?гашия|ghashiyah?|al[- ]?ghashiyah?" },
  { number: 89, canonicalName: "Ал-Фаджр", phoneticTts: "Ал-Фаджр", displayWord: "Ал-Фаджр", pattern: "(?:ал[- ]?)?фаджр|fajr|al[- ]?fajr" },
  { number: 90, canonicalName: "Ал-Балад", phoneticTts: "Ал-Баляд", displayWord: "Ал-Балад", pattern: "(?:ал[- ]?)?балад|balad|al[- ]?balad" },
  { number: 91, canonicalName: "Аш-Шамс", phoneticTts: "Аш-Шамс", displayWord: "Аш-Шамс", pattern: "(?:аш[- ]?)?шамс|shams|ash[- ]?shams" },
  { number: 92, canonicalName: "Ал-Лайл", phoneticTts: "Ал-Ляйл", displayWord: "Ал-Лайл", pattern: "(?:ал[- ]?)?лайл|(?:ал[- ]?)?лейл|layl|al[- ]?layl" },
  { number: 93, canonicalName: "Ад-Духа", phoneticTts: "Ад-Духаа", displayWord: "Ад-Духа", pattern: "(?:ад[- ]?)?духа|duha|ad[- ]?duha" },
  { number: 94, canonicalName: "Аш-Шарх", phoneticTts: "Аш-Шарх", displayWord: "Аш-Шарх", pattern: "(?:аш[- ]?)?шарх|(?:ал[- ]?)?инширах|sharh|inshirah" },
  { number: 95, canonicalName: "Ат-Тин", phoneticTts: "Ат-Тиин", displayWord: "Ат-Тин", pattern: "(?:ат[- ]?)?тин|tin|at[- ]?tin" },
  { number: 96, canonicalName: "Ал-'Алак", phoneticTts: "Ал-'Аляк", displayWord: "Ал-'Алак", pattern: "(?:ал[- ]?)?'?алак|(?:ал[- ]?)?аляк|'?alaq|al[- ]?'?alaq" },
  { number: 97, canonicalName: "Ал-Кадр", phoneticTts: "Ал-Кадр", displayWord: "Ал-Кадр", pattern: "(?:ал[- ]?)?кадр|qadr|al[- ]?qadr" },
  { number: 98, canonicalName: "Ал-Байина", phoneticTts: "Ал-Баййина", displayWord: "Ал-Байина", pattern: "(?:ал[- ]?)?байина|bayyinah?|al[- ]?bayyinah?" },
  { number: 99, canonicalName: "Аз-Залзала", phoneticTts: "Аз-Зальзаля", displayWord: "Аз-Залзала", pattern: "(?:аз[- ]?)?залзала|zalzalah?|az[- ]?zalzalah?" },
  { number: 100, canonicalName: "Ал-'Адият", phoneticTts: "Ал-'Аадийаат", displayWord: "Ал-'Адият", pattern: "(?:ал[- ]?)?'?адият|'?adiyat|al[- ]?'?adiyat" },
  { number: 101, canonicalName: "Ал-Кари'а", phoneticTts: "Ал-Каари'а", displayWord: "Ал-Кари'а", pattern: "(?:ал[- ]?)?кари'?а|qari'?ah?|al[- ]?qari'?ah?" },
  { number: 102, canonicalName: "Ат-Такасур", phoneticTts: "Ат-Такаасур", displayWord: "Ат-Такасур", pattern: "(?:ат[- ]?)?такасур|takathur|at[- ]?takathur" },
  { number: 103, canonicalName: "Ал-'Аср", phoneticTts: "Ал-'Аср", displayWord: "Ал-'Аср", pattern: "(?:ал[- ]?)?'?аср|'?asr|al[- ]?'?asr" },
  { number: 104, canonicalName: "Ал-Хумаза", phoneticTts: "Ал-Хумаза", displayWord: "Ал-Хумаза", pattern: "(?:ал[- ]?)?хумаза|humazah?|al[- ]?humazah?" },
  { number: 105, canonicalName: "Ал-Фил", phoneticTts: "Ал-Фиил", displayWord: "Ал-Фил", pattern: "(?:ал[- ]?)?фил|fil|al[- ]?fil" },
  { number: 106, canonicalName: "Курайш", phoneticTts: "Курайш", displayWord: "Курайш", pattern: "курайш|quraysh" },
  { number: 107, canonicalName: "Ал-Ма'ун", phoneticTts: "Ал-Маа'уун", displayWord: "Ал-Ма'ун", pattern: "(?:ал[- ]?)?ма'?ун|ma'?un|al[- ]?ma'?un" },
  { number: 108, canonicalName: "Ал-Каусар", phoneticTts: "Ал-Каусар", displayWord: "Ал-Каусар", pattern: "(?:ал[- ]?)?каусар|kawthar|al[- ]?kawthar" },
  { number: 109, canonicalName: "Ал-Кафирун", phoneticTts: "Ал-Каафируун", displayWord: "Ал-Кафирун", pattern: "(?:ал[- ]?)?кафирун|kafirun|al[- ]?kafirun" },
  { number: 110, canonicalName: "Ан-Наср", phoneticTts: "Ан-Наср", displayWord: "Ан-Наср", pattern: "(?:ан[- ]?)?наср|nasr|an[- ]?nasr" },
  { number: 111, canonicalName: "Ал-Масад", phoneticTts: "Ал-Масад", displayWord: "Ал-Масад", pattern: "(?:ал[- ]?)?масад|masad|al[- ]?masad" },
  { number: 112, canonicalName: "Ал-Ихляс", phoneticTts: "Ал-Ихлаас", displayWord: "Ал-Ихляс", pattern: "(?:ал[- ]?)?ихляс|(?:ал[- ]?)?ихлас|ikhlas|al[- ]?ikhlas" },
  { number: 113, canonicalName: "Ал-Фаляк", phoneticTts: "Ал-Фаляк", displayWord: "Ал-Фаляк", pattern: "(?:ал[- ]?)?фаляк|falaq|al[- ]?falaq" },
  { number: 114, canonicalName: "Ан-Нас", phoneticTts: "Ан-Наас", displayWord: "Ан-Нас", pattern: "(?:ан[- ]?)?нас|nas|an[- ]?nas" },
];

/**
 * Common Islamic Concepts & Terminologies:
 * Map of regex pattern -> Authentic Arabic phonetic pronunciation
 */
export const ISLAMIC_TERMS_PHONETICS: [string, string][] = [
  // Greetings & Major Formulas
  ["(?:ас-?саляму\\s+алейкум|селям\\s+алейкум|as-?salamu\\s+alaykum|selam\\s+aleykum)", "Ас-Саляяму 'алейкум"],
  ["(?:ва\\s+алейкум\\s+ас-?салам|ве\\s+алейкум\\s+селям|wa\\s+alaykum\\s+as-?salam)", "Ва 'алейкуму с-саляям"],
  ["(?:аллахумма\\s+салли|allahumma\\s+salli)", "Аллаахумма салли"],
  ["(?:аллахумма|allahumma)", "Аллаахумма"],
  ["(?:раббана|rabbana)", "Раббанаа"],
  ["(?:рабби|rabbi)", "Раббии"],

  // Ayat al-Kursi
  ["(?:аят\\s+ал-?курси|аятул\\s+курси|ayat\\s+al-?kursi)", "Аяат ал-Курсии"],

  // Creed & Pillars of Faith
  ["(?:шахада|шахадат|shahada|shahadah)", "Шахаада"],
  ["(?:иман|имаан|iman)", "имаан"],
  ["(?:ихсан|ihsan)", "ихсаан"],
  ["(?:рубубийя|рубубия|rububiyyah|rububiyya)", "Рубуубийя"],
  ["(?:улюхийя|улухийя|улухия|uluhiyyah|uluhiyya)", "Улуухийя"],
  ["(?:асма\\s+(?:уа|ва)\\s+сифат|asma\\s+wa\\s+sifat)", "Асмаа' ва Сифаат"],
  ["(?:кадр|qadr)", "Кадр"],
  ["(?:гайб|гаиб|ghayb)", "гайб"],
  ["(?:фитра|фитрат|fitrah?)", "фитра"],
  ["(?:тагут|taghut)", "Таагуут"],
  ["(?:куфр|kufr)", "куфр"],
  ["(?:кафир|каафир|kafir)", "каафир"],
  ["(?:кафири|каафири|kafirun|kafiroun)", "каафири"],
  ["(?:нифак|nifaq)", "нифаак"],
  ["(?:мунафик|мунаафик|munafiq)", "мунаафик"],
  ["(?:мунафики|мунаафики|munafiqun)", "мунаафики"],
  ["(?:мушрик|mushrik)", "мушрик"],
  ["(?:мушрици|мушриции|mushrikun)", "мушриции"],

  // Worship, Prayers & Practices
  ["(?:азан|езан|adhan|azan)", "Азаан"],
  ["(?:икама|икамат|iqamah?)", "Икаама"],
  ["(?:вуду|вудуъ|абдест|wudu)", "Вудуу'"],
  ["(?:гусл|гусул|ghusl)", "Гусл"],
  ["(?:таяммум|tayammum)", "Таяммум"],
  ["(?:кибла|qiblah?)", "Кибла"],
  ["(?:тахаджуд|tahajjud)", "Тахадждуд"],
  ["(?:витр|витир|witr)", "Витр"],
  ["(?:таравих|tarawih)", "Тараавиих"],
  ["(?:рамадан|рамадана|рамаданът|рамазан|рамазана|ramadan)", "Рамадаан"],
  ["(?:сухур|сабахлик|suhoor)", "Сухуур"],
  ["(?:ифтар|акшамлик|iftar)", "Ифтаар"],
  ["(?:саум|сийам|сиям|sawm|siyam)", "Сийаам"],
  ["(?:умра|'умра|umrah?)", "'Умра"],
  ["(?:таваф|tawaf)", "Тавааф"],
  ["(?:са'и|саи|sa'i)", "Са'и"],
  ["(?:арафат|'арафат|arafat)", "'Арафаат"],
  ["(?:таваккул|таваккула|таваккулът|tawakkul)", "таваккуль"],
  ["(?:зикр|дикр|dhikr)", "зикр"],
  ["(?:азкари|азкарите|азкар|adhkar)", "азкаар"],
  ["(?:джама'ат|джемаат|джамаат|jama'ah?)", "Джамаа'ат"],
  ["(?:халал|халял|halal)", "халяяль"],
  ["(?:харам|haram)", "хараам"],
  ["(?:макрух|makruh)", "макруух"],
  ["(?:мустахаб|mustahabb?)", "мустахабб"],
  ["(?:мубах|mubah)", "мубаах"],
  ["(?:фард|фарз|fard)", "фард"],
  ["(?:ваджиб|ваджип|wajib)", "вааджиб"],

  // Afterlife & Unseen
  ["(?:ахират|ахирата|ахиратът|ахирета|ахирет|akhirah?)", "Аахира"],
  ["(?:дуня|дунята|dunya)", "Дунйаа"],
  ["(?:барзах|barzakh)", "Барзах"],
  ["(?:сират|сиратът|sirat)", "Сираат"],
  ["(?:мизан|мизанът|mizan)", "Миизаан"],
  ["(?:хауд|хавд|hawd)", "Хавд"],
  ["(?:шафа'ат|шафаат|shafa'ah?)", "Шафаа'а"],
  ["(?:фирдаус|джаннат\\s+ал-?фирдаус|firdaws)", "Фирдавс"],
  ["(?:иблис|iblis)", "Иблиис"],
  ["(?:джибрил|джебраил|jibril|gabriel)", "Джибриил"],
  ["(?:микаил|микаел|mikail)", "Микаа'иил"],
  ["(?:исрафил|исрафел|israfil)", "Исраафиил"],
  ["(?:малаика|маляика|ангелите|malaikah?)", "Маляя'ика"],
  ["(?:замзам|земзем|zamzam)", "Замзам"],

  // Hadith terms
  ["(?:хасан|hasan)\\s+(?:хадис|хадиис)", "хасан хадиис"],
  ["(?:да'иф|даиф|слаб\\s+хадис|da'if)", "да'ииф"],
  ["(?:мавду|измислен\\s+хадис|mawdu')", "мавдуу'"],
  ["(?:мутаватир|mutawatir)", "мутаваатир"],
  ["(?:иснад|isnad)", "иснаад"],
  ["(?:матн|matn)", "матн"],

  // Scholars
  ["(?:имам\\s+малик|малик|imam\\s+malik)", "Имаам Маалик"],
  ["(?:имам\\s+аш-?шафи'?и|шафи'?и|imam\\s+shafi'i)", "Имаам Аш-Шаафи'и"],
  ["(?:имам\\s+ахмад|ахмад\\s+ибн\\s+ханбал|imam\\s+ahmad)", "Имаам Ахмад"],
  ["(?:имам\\s+абу\\s+ханифа|абу\\s+ханифа|abu\\s+hanifa)", "Имаам Абу Ханиифа"],
];

/**
 * Normalizes all Quran Surah names and authentic Islamic terminologies
 * for pristine Arabic pronunciation in Bulgarian TTS.
 */
export function normalizeAllIslamicPhonetics(text: string): string {
  if (!text) return "";
  let res = text;

  const replaceWord = (pattern: string, replacement: string) => {
    const reg = new RegExp(`(?<=^|[^\\p{L}\\p{N}])(?:${pattern})(?=[^\\p{L}\\p{N}]|$)`, "gui");
    res = res.replace(reg, replacement);
  };

  // 1. Normalize all 114 Quran Surah names
  for (const surah of QURAN_SURAHS_PHONETICS) {
    // When preceded by "сура" / "суура" / "surah" / "surat"
    const surahWithPrefixPattern = `(?:сура|суура|surah?|surat)\\s+${surah.pattern}`;
    res = res.replace(
      new RegExp(`(?<=^|[^\\p{L}\\p{N}])(?:сура|суура|surah?|surat)\\s+(?:${surah.pattern})(?=[^\\p{L}\\p{N}]|$)`, "gui"),
      `Суура ${surah.phoneticTts}`
    );

    // Standalone canonical name match (e.g. "Ал-Бакара", "Ал-Ихляс")
    replaceWord(surah.pattern, surah.phoneticTts);
  }

  // 2. Normalize specialized Islamic terminologies & formulas
  for (const [pattern, replacement] of ISLAMIC_TERMS_PHONETICS) {
    replaceWord(pattern, replacement);
  }

  return res;
}

/**
 * Maps phonetic Arabic TTS words back to clean readable Bulgarian subtitle words.
 */
export function normalizeIslamicPhoneticsToDisplayWord(word: string): string {
  if (!word) return "";
  let clean = word;
  for (const surah of QURAN_SURAHS_PHONETICS) {
    if (clean.toLowerCase() === surah.phoneticTts.toLowerCase()) {
      return surah.displayWord;
    }
  }
  return clean;
}
