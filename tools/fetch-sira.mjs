/* جلب كتب السيرة وتهيئتها للقراءة والبحث.
 *
 * الشكل نفسه المستعمل في كتب الشروح (meta/toc/idx/c{N}) عمدًا: القارئ
 * والباحث والمُبرِز مكتوبةٌ مرّة، فتخدم البابين. والمصدر OpenITI: مدوّنة
 * أكاديمية منشورة، نصوصها مرقونة لا ممسوحة ضوئيًّا.
 *
 * وكتبُ السيرة أخبارٌ لا أحاديثُ على شرط الصحيح، وهذا يُقال في الصفحة
 * صراحةً ولا يُموَّه عليه.
 *
 *   node tools/fetch-sira.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { buildBook } from "./lib/ingest.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "data", "sira");
const RAW = "https://raw.githubusercontent.com/OpenITI";

const BOOKS = [
  { slug: "ibn-hisham", ar: "سيرة ابن هشام", full: "السيرة النبوية لابن هشام",
    author: "عبد الملك بن هشام", died: 213,
    note: "تهذيبُ ابن هشام لسيرة ابن إسحاق، وهو الأصل الذي تدور عليه كتب السيرة بعده.",
    url: `${RAW}/0225AH/master/data/0213IbnHisham/0213IbnHisham.SiraNabawiyya/0213IbnHisham.SiraNabawiyya.JK000797-ara1` },
  { slug: "waqidi", ar: "مغازي الواقدي", full: "كتاب المغازي للواقدي",
    author: "محمد بن عمر الواقدي", died: 207,
    note: "أوسع الكتب في تفاصيل الغزوات وتواريخها وأعداد من شهدها.",
    url: `${RAW}/0225AH/master/data/0207Waqidi/0207Waqidi.Maghazi/0207Waqidi.Maghazi.Shamela0023680-ara1.mARkdown` },
  { slug: "dalail", ar: "دلائل النبوة", full: "دلائل النبوة ومعرفة أحوال صاحب الشريعة",
    author: "الإمام البيهقي", died: 458, musnad: true,
    note: "يسوق أخبار السيرة بأسانيدها كما تُساق الأحاديث، فهو بينها وبين كتب الأخبار المرسلة.",
    url: `${RAW}/0475AH/master/data/0458Bayhaqi/0458Bayhaqi.DalailNubuwwa/0458Bayhaqi.DalailNubuwwa.JK006838-ara1.mARkdown` },
  { slug: "tabaqat", ar: "طبقات ابن سعد", full: "الطبقات الكبرى لابن سعد",
    author: "محمد بن سعد", died: 230,
    note: "تراجمُ من شهد الأحداث، مرتَّبةً على الطبقات — وبها تتّصل السيرة بالرواة.",
    url: `${RAW}/0250AH/master/data/0230IbnSacd/0230IbnSacd.TabaqatKubra/0230IbnSacd.TabaqatKubra.JK000530-ara2` },
];

/* البناءُ مشتركٌ في tools/lib/ingest.mjs */
const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const all = [];
  for (const b of BOOKS) all.push((await buildBook(b, OUT, { minBlocks: 300 })).info);
  fs.writeFileSync(path.join(OUT, "books.json"), JSON.stringify(all), "utf8");
  const kutub = all.length === 2 ? "كتابين" : all.length <= 10 ? "كتب" : "كتابًا";
  console.log(`\nالمجموع: ${all.length} ${kutub}، ${all.reduce((a, x) => a + x.paras, 0).toLocaleString()} فقرة.`);
};
main().catch((e) => { console.error("\nفشل:", e.message); process.exit(1); });
