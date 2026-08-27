/* جلبُ كتب الفقه وتهيئتها.
 *
 * القسمُ خريطةُ خلافٍ لا فتوى: تُعرض المسألةُ بأقوال أهلها منسوبةً إليهم،
 * وسببِ اختلافهم كما ذكره ابن رشد، وأدلّتهم موصولةً بالمصحف وكتب الحديث.
 * ولا يُقال فيه «الراجح» ولا يُجاب عن «ما حكم كذا» — القاعدة الحمراء
 * الثالثة قائمة.
 *
 * واختيرت هذه الكتب لأنّ بِنيتها هي المطلوبة:
 *   • بداية المجتهد: مقارنٌ بابُه مسألةٌ فأقوالٌ فسببُ خلافٍ فأدلّة.
 *   • الإجماع لابن المنذر: مسائلُ مرقّمةٌ فيما لا خلاف فيه.
 *   • المغني: أوسعُ المقارن، يُقرأ ويُبحث.
 *
 *   node tools/fetch-fiqh.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { buildBook } from "./lib/ingest.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "data", "fiqh");
const RAW = "https://raw.githubusercontent.com/OpenITI";

const BOOKS = [
  { slug: "bidayat-almujtahid", ar: "بداية المجتهد", full: "بداية المجتهد ونهاية المقتصد",
    author: "ابن رشد الحفيد", died: 595, kind: "مقارن",
    note: "أشهرُ كتب الفقه المقارن: يذكر المسألة، ثم ما اتُّفق عليه وما اختُلف فيه، ثم سببَ الاختلاف وأدلّةَ كلّ قول.",
    url: `${RAW}/0600AH/master/data/0595IbnRushdHafid/0595IbnRushdHafid.BidayatMujtahid/0595IbnRushdHafid.BidayatMujtahid.Shamela0021739-ara1` },
  { slug: "ijmac-ibn-almundhir", ar: "الإجماع", full: "الإجماع لابن المنذر النيسابوري",
    author: "ابن المنذر النيسابوري", died: 319, kind: "إجماع",
    note: "مسائلُ مرقّمةٌ فيما أجمع عليه أهل العلم، وهو أقدمُ ما صُنّف في بابه.",
    url: `${RAW}/0325AH/master/data/0319IbnMundhirNaysaburi/0319IbnMundhirNaysaburi.Ijmac/0319IbnMundhirNaysaburi.Ijmac.Sham19Y0151100-ara1` },
  { slug: "almughni", ar: "المغني", full: "المغني لابن قدامة المقدسي",
    author: "ابن قدامة المقدسي", died: 620, kind: "مقارن",
    note: "أوسعُ كتب الفقه المقارن، يسوق المسألة بأقوال المذاهب وأدلّتها.",
    url: `${RAW}/0625AH/master/data/0620IbnQudamaMaqdisi/0620IbnQudamaMaqdisi.Mughni/0620IbnQudamaMaqdisi.Mughni.Shamela0008463-ara1` },
];

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const all = [];
  for (const b of BOOKS) all.push((await buildBook(b, OUT, { minBlocks: 200 })).info);
  fs.writeFileSync(path.join(OUT, "books.json"), JSON.stringify(all), "utf8");
  console.log(`\nالمجموع: ${all.length} كتب، ${all.reduce((a, x) => a + x.paras, 0).toLocaleString()} فقرة.`);
};
main().catch((e) => { console.error("\nفشل:", e.message); process.exit(1); });
