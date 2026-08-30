/* جلب كتب شروح الحديث وتهيئتها للعرض والبحث.
 *
 * الكتب تُعرَض كتبًا كما هي، ولا يُنسَب منها شرحٌ إلى حديثٍ بعينه: الشروح
 * شرحٌ بالقول متّصل، ونسبة فقرةٍ منها إلى حديثٍ بذاته اجتهادٌ يُخطئ بصمت
 * (قِيس: ٢٣٪ من فقرات فتح الباري تُطابق أكثر من حديث، وأرقامها المطبوعة
 * تخالف ترقيمنا في ٩٥٪). فالقارئ هو من يبحث ويرى الموضع بنفسه.
 *
 * المصدر: OpenITI — مدوّنة أكاديمية منشورة، نصوصها مرقونة لا ممسوحة ضوئيًّا.
 * ولا يُؤخذ ذلك ظنًّا: buildBook يقرأ بطاقةَ كلّ نسخة ويرفضها إن أُعلن
 * فيها UNCORRECTED_OCR.
 *
 * واختيارُ النسخة حين تتعدّد ليس اعتباطًا: تُقاس النسخُ بعدد فقراتها
 * وحروفها وبجودة عناوينها. فمن جامع العلوم والحكم أُخذت Shamela0004268
 * لأنّ JK000071 يخرج منها أحد عشر مقطعًا لا غير (كتابٌ كلُّه سطرُ تتمّة
 * واحد)، ومن المنتقى أُخذت نسخةُ Sham19Y لأنّ الأخرى تُصدِّر ٢٬٢٣٦ عنوانًا
 * اسمُها «المنتقى» — ترويسةُ صفحةٍ لا ترجمةُ باب، ومن دليل الفالحين أُخذت
 * Shamela0000140 لأنّ JK010830 بلا عناوينَ أصلًا وثلثُ حجمها.
 *
 *   node tools/fetch-sharh-books.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { buildBook } from "./lib/ingest.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "data", "sharh");
const RAW = "https://raw.githubusercontent.com/OpenITI";

const BOOKS = [
  { slug: "fath-albari", ar: "فتح الباري", full: "فتح الباري شرح صحيح البخاري",
    short: "فتح الباري لابن حجر",
    author: "الحافظ ابن حجر العسقلاني", died: 852, on: "bukhari", onAr: "صحيح البخاري",
    url: `${RAW}/0875AH/master/data/0852IbnHajarCasqalani/0852IbnHajarCasqalani.FathBari/0852IbnHajarCasqalani.FathBari.JK000166-ara1` },
  { slug: "minhaj-nawawi", ar: "المنهاج", full: "المنهاج شرح صحيح مسلم بن الحجاج",
    short: "المنهاج للنووي",
    author: "الإمام النووي", died: 676, on: "muslim", onAr: "صحيح مسلم",
    url: `${RAW}/0700AH/master/data/0676Nawawi/0676Nawawi.MinhajFiSharhMuslim/0676Nawawi.MinhajFiSharhMuslim.JK000137-ara1` },
  { slug: "awn-almabud", ar: "عون المعبود", full: "عون المعبود شرح سنن أبي داود",
    short: "عون المعبود",
    author: "محمد أشرف العظيم آبادي", died: 1329, on: "abudawud", onAr: "سنن أبي داود",
    url: `${RAW}/1350AH/master/data/1329MuhammadAshrafCazimabadi/1329MuhammadAshrafCazimabadi.CawnMacbud/1329MuhammadAshrafCazimabadi.CawnMacbud.JK000264-ara1` },
  { slug: "tuhfat-alahwadhi", ar: "تحفة الأحوذي", full: "تحفة الأحوذي بشرح جامع الترمذي",
    short: "تحفة الأحوذي",
    author: "المباركفوري", died: 1353, on: "tirmidhi", onAr: "جامع الترمذي",
    url: `${RAW}/1375AH/master/data/1353IbnCabdRahimMubarakfuri/1353IbnCabdRahimMubarakfuri.TuhfatAhwadhi/1353IbnCabdRahimMubarakfuri.TuhfatAhwadhi.JK000201-ara1` },

  /* الثمانيةُ التالية سدَّت ثغرتين: كتبٌ عندنا بلا شرحٍ مشحون (النسائي
     وابن ماجه والموطّأ والأربعون النووية)، وكتبٌ جديدة أُضيفت في
     tools/fetch-hadith-books.mjs فلزم أن تُضاف شروحُها معها — وإلّا كان
     زرُّ «الشرح» في صفحاتها يُخرج «لا كتابَ شرحٍ لهذا المصنَّف». */
  { slug: "hashiyat-sindi-nasai", ar: "حاشية السندي على النسائي",
    short: "حاشية السندي على النسائي",
    full: "حاشية السندي على سنن النسائي", author: "نور الدين السندي", died: 1138,
    on: "nasai", onAr: "سنن النسائي",
    url: `${RAW}/1150AH/master/data/1138IbnCabdHadiNurDinSindi/1138IbnCabdHadiNurDinSindi.HashiyaCalaNasai/1138IbnCabdHadiNurDinSindi.HashiyaCalaNasai.JK000554-ara1` },
  { slug: "hashiyat-sindi-ibnmajah", ar: "حاشية السندي على ابن ماجه",
    short: "حاشية السندي على ابن ماجه",
    full: "حاشية السندي على سنن ابن ماجه", author: "نور الدين السندي", died: 1138,
    on: "ibnmajah", onAr: "سنن ابن ماجه",
    url: `${RAW}/1150AH/master/data/1138IbnCabdHadiNurDinSindi/1138IbnCabdHadiNurDinSindi.HashiyaCalaIbnMajah/1138IbnCabdHadiNurDinSindi.HashiyaCalaIbnMajah.Shamela0009810-ara1` },
  { slug: "muntaqa-baji", ar: "المنتقى", full: "المنتقى شرح موطّأ مالك",
    short: "المنتقى للباجي",
    author: "أبو الوليد الباجي", died: 474, on: "malik", onAr: "موطأ مالك",
    url: `${RAW}/0475AH/master/data/0474IbnKhalafBaji/0474IbnKhalafBaji.MuntaqaSharhMuwatta/0474IbnKhalafBaji.MuntaqaSharhMuwatta.Sham19Y0006684-ara1.mARkdown` },
  { slug: "jamic-culum", ar: "جامع العلوم والحكم",
    short: "جامع العلوم والحكم لابن رجب",
    full: "جامع العلوم والحكم في شرح خمسين حديثًا من جوامع الكلم",
    author: "الحافظ ابن رجب الحنبلي", died: 795, on: "nawawi", onAr: "الأربعون النووية",
    url: `${RAW}/0800AH/master/data/0795IbnRajabHanbali/0795IbnRajabHanbali.JamicCulumWaHikam/0795IbnRajabHanbali.JamicCulumWaHikam.Shamela0004268-ara1` },
  { slug: "subul-alsalam", ar: "سبل السلام", full: "سبل السلام شرح بلوغ المرام",
    short: "سبل السلام للصنعاني",
    author: "الإمام الصنعاني", died: 1182, on: "bulugh", onAr: "بلوغ المرام",
    url: `${RAW}/1200AH/master/data/1182IbnIsmacilSancani/1182IbnIsmacilSancani.SubulSalam/1182IbnIsmacilSancani.SubulSalam.JK000123-ara1` },
  { slug: "mirqat-almafatih", ar: "مرقاة المفاتيح", full: "مرقاة المفاتيح شرح مشكاة المصابيح",
    short: "مرقاة المفاتيح للقاري",
    author: "ملّا علي القاري", died: 1014, on: "mishkat", onAr: "مشكاة المصابيح",
    url: `${RAW}/1025AH/master/data/1014MullaCaliQari/1014MullaCaliQari.MirqatMafatih/1014MullaCaliQari.MirqatMafatih.JK007044-ara1` },
  { slug: "jamc-alwasail", ar: "جمع الوسائل", full: "جمع الوسائل في شرح الشمائل",
    short: "جمع الوسائل للقاري",
    author: "ملّا علي القاري", died: 1014, on: "shamail", onAr: "الشمائل المحمدية",
    url: `${RAW}/1025AH/master/data/1014MullaCaliQari/1014MullaCaliQari.JamcWasail/1014MullaCaliQari.JamcWasail.Shamela0002569-ara1` },
  { slug: "dalil-alfalihin", ar: "دليل الفالحين", full: "دليل الفالحين لطرق رياض الصالحين",
    short: "دليل الفالحين لابن علّان",
    author: "ابن علّان الصدّيقي", died: 1057, on: "riyad", onAr: "رياض الصالحين",
    url: `${RAW}/1075AH/master/data/1057IbnCallan/1057IbnCallan.DalilFalihin/1057IbnCallan.DalilFalihin.Shamela0000140-ara1` },
];

/* التقسيم بميزانية حروف لا بعدد فقرات: الفقرات تتفاوت بشدّة بين الكتب
   (المنهاج فقراته طوال، وعون المعبود قصار)، فالتقسيم بالعدد يُخرج ملفّاتٍ
   بين ٢٤ك.ب و٣٨٤ك.ب. الميزانية تُسوّيها. */
/* البناءُ مشتركٌ في tools/lib/ingest.mjs — كان منسوخًا هنا وفي السيرة
   والفقه، فلمّا أُصلح تفكيكُ العناوين لزم أن يُصلح في ثلاثة مواضع. */
const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const all = [];
  for (const b of BOOKS) all.push((await buildBook(b, OUT, { minBlocks: 500 })).info);
  /* ترتيبُ الشروح هو ترتيبُ المتون: شرحُ البخاري حيث البخاري، وشرحُ بلوغ
     المرام حيث بلوغ المرام. فمن عرف ترتيبَ صفحة الحديث عرف هذه، ولا يُكتب
     الترتيبُ مرّتين — يُقرأ من books.json نفسه. */
  const order = Object.keys(JSON.parse(
    fs.readFileSync(path.join(ROOT, "docs", "data", "books.json"), "utf8")));
  const at = (b) => { const i = order.indexOf(b.on); return i < 0 ? order.length : i; };
  all.sort((x, y) => at(x) - at(y));
  fs.writeFileSync(path.join(OUT, "books.json"), JSON.stringify(all), "utf8");
  console.log(`\nالمجموع: ${all.length} كتبٍ، ${all.reduce((a, x) => a + x.paras, 0).toLocaleString()} فقرة، ` +
              `${(all.reduce((a, x) => a + x.chars, 0) / 1e6).toFixed(1)} مليون حرف.`);
};

main().catch((e) => { console.error("\nفشل:", e.message); process.exit(1); });
