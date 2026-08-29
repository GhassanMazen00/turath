/* جلب كتب شروح الحديث وتهيئتها للعرض والبحث.
 *
 * الكتب تُعرَض كتبًا كما هي، ولا يُنسَب منها شرحٌ إلى حديثٍ بعينه: الشروح
 * شرحٌ بالقول متّصل، ونسبة فقرةٍ منها إلى حديثٍ بذاته اجتهادٌ يُخطئ بصمت
 * (قِيس: ٢٣٪ من فقرات فتح الباري تُطابق أكثر من حديث، وأرقامها المطبوعة
 * تخالف ترقيمنا في ٩٥٪). فالقارئ هو من يبحث ويرى الموضع بنفسه.
 *
 * المصدر: OpenITI — مدوّنة أكاديمية منشورة، نصوصها مرقونة لا ممسوحة ضوئيًّا
 * (uncorrected_OCR = False لكل ما هنا).
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
    author: "الحافظ ابن حجر العسقلاني", died: 852, on: "bukhari", onAr: "صحيح البخاري",
    url: `${RAW}/0875AH/master/data/0852IbnHajarCasqalani/0852IbnHajarCasqalani.FathBari/0852IbnHajarCasqalani.FathBari.JK000166-ara1` },
  { slug: "minhaj-nawawi", ar: "المنهاج", full: "المنهاج شرح صحيح مسلم بن الحجاج",
    author: "الإمام النووي", died: 676, on: "muslim", onAr: "صحيح مسلم",
    url: `${RAW}/0700AH/master/data/0676Nawawi/0676Nawawi.MinhajFiSharhMuslim/0676Nawawi.MinhajFiSharhMuslim.JK000137-ara1` },
  { slug: "awn-almabud", ar: "عون المعبود", full: "عون المعبود شرح سنن أبي داود",
    author: "محمد أشرف العظيم آبادي", died: 1329, on: "abudawud", onAr: "سنن أبي داود",
    url: `${RAW}/1350AH/master/data/1329MuhammadAshrafCazimabadi/1329MuhammadAshrafCazimabadi.CawnMacbud/1329MuhammadAshrafCazimabadi.CawnMacbud.JK000264-ara1` },
  { slug: "tuhfat-alahwadhi", ar: "تحفة الأحوذي", full: "تحفة الأحوذي بشرح جامع الترمذي",
    author: "المباركفوري", died: 1353, on: "tirmidhi", onAr: "جامع الترمذي",
    url: `${RAW}/1375AH/master/data/1353IbnCabdRahimMubarakfuri/1353IbnCabdRahimMubarakfuri.TuhfatAhwadhi/1353IbnCabdRahimMubarakfuri.TuhfatAhwadhi.JK000201-ara1` },
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
  fs.writeFileSync(path.join(OUT, "books.json"), JSON.stringify(all), "utf8");
  console.log(`\nالمجموع: ${all.length} كتبٍ، ${all.reduce((a, x) => a + x.paras, 0).toLocaleString()} فقرة، ` +
              `${(all.reduce((a, x) => a + x.chars, 0) / 1e6).toFixed(1)} مليون حرف.`);
};

main().catch((e) => { console.error("\nفشل:", e.message); process.exit(1); });
