/* أرقامُ الوصل، تُحسب مرّةً هنا لا في متصفّح كلّ زائر.
 *
 * كانت الرئيسية تحسب «كم حديثًا اختلف العلماء في حكمه» بأن تُنزل فهارس
 * الكتب كلَّها ثم تعدّ — سبعةً وعشرين ميغابايتًا لرقمٍ واحد، ثم صارت
 * ثمانيةً وثلاثين لمّا زِيدت ستّةُ كتب. والرقمُ لا يتغيّر إلا حين تتغيّر
 * البيانات، فمكانُه هنا.
 *
 *   node tools/build-stats.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/* تصنيفُ الحكم — منقولٌ حرفًا بحرفٍ عن gclass وnorm في docs/assets/app.js،
   فما يُعدّ هنا هو ما يُصنَّف هناك. إن تغيّر أحدهما فليتغيّر الآخر. */
const norm = (s) => (s || "").normalize("NFKC").replace(/[\u064b-\u0652\u0670\u0640\u0656-\u065f]/g, "")
  .replace(/[أإآٱ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و")
  .replace(/[^ء-ي ]/g, " ").replace(/\s+/g, " ").trim();
const gclass = (g) => {
  const t = norm(g);
  if (/موضوع|منكر|متروك|شاذ/.test(t)) return "bad";
  if (/ضعيف/.test(t)) return "bad";
  if (/حسن/.test(t)) return "mid";
  if (/صحيح/.test(t)) return "ok";
  return "na";
};

const books = rd(path.join(DATA, "books.json"));
let hadiths = 0, gradings = 0, conflict = 0, graded = 0;
for (const k of Object.keys(books)) {
  for (const r of rd(path.join(DATA, "idx", `${k}.json`))) {
    hadiths++;
    const g = r[3] || [];
    if (!g.length) continue;
    graded++; gradings += g.length;
    if (g.length < 2) continue;
    const kinds = new Set(g.map((x) => gclass(x[1])).filter((x) => x !== "na"));
    if (kinds.size > 1) conflict++;
  }
}

const shb = rd(path.join(DATA, "sharh", "books.json"));
const stats = {
  books: Object.keys(books).length, hadiths, graded, gradings, conflict,
  sharhBooks: shb.length,
  sharhParas: shb.reduce((a, b) => a + b.paras, 0),
  sharhOn: shb.filter((b) => b.on).length,
  takhrij: Object.values(rd(path.join(DATA, "takhrij.json"))).flat().length,
  asbab: Object.keys(rd(path.join(DATA, "asbab.json"))).length,
  rijal: Object.keys(rd(path.join(DATA, "rijal", "index.json"))).length,
};
fs.writeFileSync(path.join(DATA, "stats.json"), JSON.stringify(stats), "utf8");
console.log(stats);
