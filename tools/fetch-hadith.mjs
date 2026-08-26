/* بناءُ مدوّنة الحديث والتحقّقُ منها.
 *
 * لماذا كُتب: الشروحُ والسيرةُ وأسبابُ النزول لكلٍّ سكربتٌ يُعيد بناءها
 * فتُدقَّق وتُحدَّث. وأمّا مدوّنةُ الحديث — وهي أساسُ كلّ ما بُني فوقها —
 * فبُنيت مرّةً وذهب سكربتُها، فلا تُراجَع ولا يُعرف أصدقٌ هي أم لا.
 *
 * وصفُّ الفهرس خمسةُ حقول: [رقم، باب، متنٌ مطبَّع، أحكام، سلسلة إسناد].
 * الأربعةُ الأُوَل من fawazahmed0/hadith-api، وأمّا سلسلةُ الإسناد فمن
 * مصدرٍ آخر (OmarShafie/hadith) لا يُبنى منه هنا. فلا يُعاد بناءُ الصفّ
 * كلِّه: يُبنى ما يُبنى، ويُنقل الباقي بالرقم من الملفّ القائم.
 *
 * ولا يُكتب شيءٌ إلا بعد المقابلة: إن نقص صفٌّ، أو ضاع متنٌ كان موجودًا،
 * أو ضاع حكمٌ أو سلسلةُ إسناد — رُفضت الكتابة وقيل ما الذي كان يضيع.
 *
 *   node tools/fetch-hadith.mjs            تحقّقٌ وتقرير، بلا كتابة
 *   node tools/fetch-hadith.mjs --write    يكتب إن سلمت المقابلة
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const IDX = path.join(DATA, "idx");
const WRITE = process.argv.includes("--write");

/* الوسمُ نفسه المثبَّت في الموقع، فما يُبنى هو ما يُعرض */
const REF = "df57907be35291c91ad6a6691180e22ca9920784";
const SRC = (b) => `https://raw.githubusercontent.com/fawazahmed0/hadith-api/${REF}/editions/ara-${b}.json`;

const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const norm = (s) => (s || "").normalize("NFKC")
  .replace(/[ً-ْٰـۖ-ۭ]/g, "")
  .replace(/[أإآٱ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و")
  .replace(/[^ء-ي ]/g, " ").replace(/\s+/g, " ").trim();

async function get(url) {
  for (let i = 1; i <= 4; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
    catch (e) { if (i === 4) throw new Error(`تعذّر جلب ${url} — ${e.message}`);
      await new Promise((r) => setTimeout(r, 600 * 2 ** i)); }
  }
}

const books = rd(path.join(DATA, "books.json"));
const report = [], blockers = [];
let totEmpty = 0, totRows = 0;

for (const k of Object.keys(books)) {
  const oldRows = rd(path.join(IDX, `${k}.json`));
  const oldBy = new Map(oldRows.map((r) => [r[0], r]));
  process.stdout.write(`${books[k].ar} … `);
  const src = await get(SRC(k));
  const hs = src.hadiths || [];

  const rows = [];
  let filled = 0, empty = [], lostText = [], lostGrade = [], lostChain = [];
  for (const h of hs) {
    const num = +h.hadithnumber;
    const prev = oldBy.get(num);
    const sec = h.reference && h.reference.book != null ? +h.reference.book
              : (prev ? prev[1] : 0);
    const text = norm(h.text || "");
    /* الأحكامُ وسلسلةُ الإسناد ليستا من هذا المصدر: فحصُه أخرج صفرًا من
       الأحكام في البخاري كلِّه ولدينا ٧٬٥٧٧ — فهي من مصدر أحكام المحدّثين،
       والسلسلةُ من مصدر الرواة. فتُنقلان بالرقم ولا تُبنيان هنا. ولا يُؤخذ
       من المصدر إلا ما خلا منه الملفُّ القائم، فلا يُدهَس شيء. */
    const srcGrades = (h.grades || []).map((g) => [g.name || g.grader || "", g.grade || ""])
                                      .filter((g) => g[0] || g[1]);
    const grades = (prev && (prev[3] || []).length) ? prev[3] : srcGrades;
    const chain = prev ? (prev[4] || []) : [];

    if (prev) {
      if ((prev[2] || "").trim() && !text) lostText.push(num);
      if ((prev[3] || []).length && !grades.length) lostGrade.push(num);
      if ((prev[4] || []).length && !chain.length) lostChain.push(num);
    }
    if (!text) empty.push(num); else if (prev && !(prev[2] || "").trim()) filled++;
    rows.push([num, sec, text, grades, chain]);
  }

  const missing = oldRows.filter((r) => !hs.some((h) => +h.hadithnumber === r[0])).map((r) => r[0]);
  totRows += rows.length; totEmpty += empty.length;

  const bad = [];
  if (missing.length) bad.push(`سقط ${missing.length} صفًّا (${missing.slice(0, 5).join(",")}…)`);
  if (lostText.length) bad.push(`ضاع متنُ ${lostText.length}`);
  if (lostGrade.length) bad.push(`ضاع حكمُ ${lostGrade.length}`);
  if (lostChain.length) bad.push(`ضاعت سلسلةُ ${lostChain.length}`);
  if (bad.length) blockers.push(`${books[k].ar}: ${bad.join(" · ")}`);

  report.push({ k, ar: books[k].ar, was: oldRows.length, now: rows.length,
                empty: empty.length, filled, ok: !bad.length, rows });
  console.log(`${rows.length} صفًّا · ${empty.length} بلا متن${filled ? ` · مُلئ ${filled}` : ""}${bad.length ? "  ✕ " + bad.join(" · ") : "  ✓"}`);
}

console.log("\n" + "─".repeat(60));
console.log(`المجموع: ${totRows} صفًّا · ${totEmpty} بلا متنٍ في المصدر (${(totEmpty / totRows * 100).toFixed(1)}٪)`);

if (blockers.length) {
  console.error("\nرُفضت الكتابة — كان يضيع:");
  blockers.forEach((b) => console.error("  ✕ " + b));
  process.exit(1);
}
if (!WRITE) { console.log("\nتحقّقٌ فقط. للكتابة: node tools/fetch-hadith.mjs --write"); process.exit(0); }

for (const r of report) fs.writeFileSync(path.join(IDX, `${r.k}.json`), JSON.stringify(r.rows), "utf8");
/* الصفوفُ التي لا متنَ لها في المصدر تُثبَت في ملفٍّ يقرؤه الموقع، فيُقال
   للقارئ صراحةً «لم يرد نصُّه في المصدر» بدل أن يُعرض له صندوقٌ فارغ. */
const gaps = {};
for (const r of report) {
  const g = r.rows.filter((x) => !x[2]).map((x) => x[0]);
  if (g.length) gaps[r.k] = g;
}
fs.writeFileSync(path.join(DATA, "gaps.json"), JSON.stringify(gaps), "utf8");
console.log(`\nكُتبت الفهارس، و${Object.values(gaps).flat().length} رقمًا في gaps.json.`);
