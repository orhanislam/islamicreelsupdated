import { computeHardenedPhotoLayout } from "./verify-photo-hardening.test";
import { getSafeZone } from "../safe-zone";

const ayatAlKursiArabic =
  "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ";

const ayatAlKursiBulgarian =
  "Аллах! Няма друг бог освен Него - Вечноживия, Неизменния! Не Го обзема нито дрямка, нито сън. Негово е всичко на небесата и всичко на земята. Кой ще се застъпи пред Него, освен с Неговото позволение? Той знае какво е било преди тях и какво ще бъде след тях, а от Неговото знание те обхващат само онова, което Той пожелае. Неговият Престол вмества небесата и земята, и не Му тежи опазването им. Той е Всевишния, Превеликия.";

const layout = computeHardenedPhotoLayout({
  reference: "Коран 2:255 • Аят ал-Курси",
  arabic: ayatAlKursiArabic,
  bulgarian: ayatAlKursiBulgarian,
  style: "lower-third",
  profile: "tiktok",
});

console.log("Result for Ayat al-Kursi (Full Verse):", {
  isContained: layout.isContained,
  pill: layout.pill,
  arabic: {
    y: layout.arabic?.box.y,
    h: layout.arabic?.box.height,
    bottom: layout.arabic ? layout.arabic.box.y + layout.arabic.box.height : null,
  },
  bg: {
    fontSize: layout.bulgarian.fontSize,
    y: layout.bulgarian.box.y,
    h: layout.bulgarian.box.height,
    bottom: layout.bulgarian.box.y + layout.bulgarian.box.height,
    maxAllowedY: getSafeZone("tiktok").BOTTOM_MAX_Y,
  },
});
