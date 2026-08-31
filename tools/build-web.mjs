/* شرائحُ الصفحات: ما تحتاجه كلُّ صفحةٍ وحدها، لا المدوّنة كلُّها.
 *
 * قِيس على هاتف: صفحةُ حديثٍ واحد تُنزل ٣٢ ميغابايت. وأثقلُها ثلاثة، وكلُّها
 * تُجلب كاملةً لأجل سطرٍ منها:
 *   ٥٫٧ م.ب  idx/{كتاب}.json   — لأجل صفٍّ واحد وأرقام السابق والتالي
 *   ٥٫٢ م.ب  sharh.json        — خريطةُ شروحٍ مكتوبة، فيها ٢٬٣١٦ شرحًا
 *   ١٫٠ م.ب  asbab.json        — في صفحة التفسير، لأجل آيةٍ واحدة
 *
 * فتُقطَّع هنا مرّةً واحدة إلى ما تُنزَّل منه القِطعة:
 *   docs/data/h/{كتاب}/nav.json   أرقامُ أحاديثه وأبوابُها — للتنقّل ومعرفة الباب
 *   docs/data/h/{كتاب}/{باب}.json أحكامُ أحاديث الباب وسلاسلُها
 *   docs/data/note/index.json     أرقامُ ما له شرحٌ مكتوب
 *   docs/data/note/{كتاب}/{رقم}.json  الشرحُ نفسه
 *   docs/data/asbab/{سورة}.json   أسبابُ نزول آيات السورة
 *
 * والأصولُ تبقى كما هي: idx/{كتاب}.json يُجلب عند البحث في المتون وحده،
 * وهو موضعُه الصحيح. ولا يُشتقّ من هذه الشرائح شيءٌ جديد — هي نسخةٌ من
 * البيانات نفسها مقطَّعة، تُقابَل بأصلها قبل أن تُكتب.
 *
 *   node tools/build-web.mjs            تحقّقٌ وتقرير، بلا كتابة
 *   node tools/build-web.mjs --write    يكتب إن سلمت المقابلة
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const WRITE = process.argv.includes("--write");
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const mb = (n) => (n / 1048576).toFixed(2) + " م.ب";
const kb = (n) => (n / 1024).toFixed(0) + " ك.ب";

const books = rd(path.join(DATA, "books.json"));
const problems = [];
let biggest = 0, biggestName = "";

/* ── ١. الحديث: تنقّلٌ وأحكامٌ لكلّ باب ── */
const hOut = new Map();                       // مسار → محتوى
for (const k of Object.keys(books)) {
  const rows = rd(path.join(DATA, "idx", `${k}.json`));
  /* nav: صفٌّ لكل حديث [رقم، باب] بترتيبه — منه يُعرف بابُ الحديث
     والسابقُ والتالي، وهو كلُّ ما تحتاجه الصفحةُ قبل أن تعرف بابَه. */
  const nav = rows.map((r) => [r[0], r[1]]);
  hOut.set(`h/${k}/nav.json`, JSON.stringify(nav));

  const bySec = new Map();
  for (const r of rows) {
    if (!bySec.has(r[1])) bySec.set(r[1], {});
    /* الأحكامُ والسلسلة فقط: المتنُ المطبَّع للبحث لا للعرض، والعرضُ من
       واجهة المتون. فلا يُنسخ هنا فيُضاعَف الحجمُ بلا فائدة. */
    bySec.get(r[1])[r[0]] = [r[3] || [], r[4] || []];
  }
  for (const [sec, m] of bySec) hOut.set(`h/${k}/${sec}.json`, JSON.stringify(m));

  /* المقابلة: كلُّ صفٍّ في الأصل موجودٌ في شريحته بحكمه وسلسلته */
  for (const r of rows) {
    const m = bySec.get(r[1]);
    const got = m && m[r[0]];
    if (!got) { problems.push(`${k}:${r[0]} سقط من شريحة بابه`); continue; }
    if (JSON.stringify(got[0]) !== JSON.stringify(r[3] || [])) problems.push(`${k}:${r[0]} اختلف حكمُه`);
    if (JSON.stringify(got[1]) !== JSON.stringify(r[4] || [])) problems.push(`${k}:${r[0]} اختلفت سلسلتُه`);
  }
  const nb = Buffer.byteLength(hOut.get(`h/${k}/nav.json`));
  const secMax = Math.max(...[...bySec.keys()].map((s) => Buffer.byteLength(hOut.get(`h/${k}/${s}.json`))));
  if (secMax > biggest) { biggest = secMax; biggestName = k; }
  console.log(`${books[k].ar.padEnd(22)} ${String(rows.length).padStart(5)} حديثًا · ` +
    `تنقّل ${kb(nb).padStart(8)} · أكبرُ باب ${kb(secMax).padStart(8)} · ` +
    `كان ${mb(fs.statSync(path.join(DATA, "idx", `${k}.json`)).size)}`);
}

/* ── ١ب. التخريج: قسمًا لكل كتاب. صفحةُ الكتاب لا تحتاجه أصلًا، وصفحةُ
   الحديث لا تحتاج إلا تخريجَ كتابه. ── */
const tAll = rd(path.join(DATA, "takhrij.json"));
const tSh = {};
for (const key of Object.keys(tAll)) (tSh[key.split(":")[0]] = tSh[key.split(":")[0]] || {})[key] = tAll[key];
for (const b2 of Object.keys(tSh)) hOut.set(`h/${b2}/takhrij.json`, JSON.stringify(tSh[b2]));
for (const key of Object.keys(tAll))
  if (JSON.stringify(tSh[key.split(":")[0]][key]) !== JSON.stringify(tAll[key])) problems.push(`تخريجُ ${key} اختلف`);
console.log(`\nالتخريج: ${Object.keys(tAll).length} حديثًا في ${Object.keys(tSh).length} كتب · ` +
  `أكبرُ قسم ${kb(Math.max(...Object.keys(tSh).map((b2) => Buffer.byteLength(hOut.get(`h/${b2}/takhrij.json`)))))} · ` +
  `كان ${kb(fs.statSync(path.join(DATA, "takhrij.json")).size)}`);

/* ── ٢. الشروح المكتوبة: ملفٌّ لكلّ شرح، وفهرسٌ صغيرٌ يُعرف به من له شرح ── */
const notes = rd(path.join(DATA, "sharh.json"));
const manual = fs.existsSync(path.join(DATA, "sharh-manual.json"))
  ? rd(path.join(DATA, "sharh-manual.json")) : {};
const all = { ...notes };
for (const k in manual) { if (k.charAt(0) === "_") continue; all[k] = manual[k]; }  // اليدويّ يعلو
const nOut = new Map(), nIndex = {};
for (const key of Object.keys(all)) {
  const [b, n] = key.split(":");
  (nIndex[b] = nIndex[b] || []).push(+n);
  nOut.set(`note/${b}/${n}.json`, JSON.stringify(all[key]));
}
for (const b of Object.keys(nIndex)) nIndex[b].sort((a, c) => a - c);
nOut.set("note/index.json", JSON.stringify(nIndex));
for (const key of Object.keys(all)) {
  const [b, n] = key.split(":");
  if (JSON.stringify(rd0(nOut.get(`note/${b}/${n}.json`))) !== JSON.stringify(all[key]))
    problems.push(`شرح ${key} اختلف`);
  if (!nIndex[b].includes(+n)) problems.push(`شرح ${key} ليس في الفهرس`);
}
function rd0(s) { return JSON.parse(s); }
console.log(`\nالشروح المكتوبة: ${Object.keys(all).length} شرحًا في ${Object.keys(nIndex).length} كتب · ` +
  `فهرسٌ ${kb(Buffer.byteLength(nOut.get("note/index.json")))} · كان ${mb(fs.statSync(path.join(DATA, "sharh.json")).size)}`);

/* ── ٣. أسباب النزول: ملفٌّ لكلّ سورة ── */
const asbab = rd(path.join(DATA, "asbab.json"));
const aOut = new Map(), bySura = {};
for (const key of Object.keys(asbab)) {
  const [s] = key.split(":");
  (bySura[s] = bySura[s] || {})[key] = asbab[key];
}
for (const s of Object.keys(bySura)) aOut.set(`asbab/${s}.json`, JSON.stringify(bySura[s]));
for (const key of Object.keys(asbab)) {
  const [s] = key.split(":");
  if (JSON.stringify(bySura[s][key]) !== JSON.stringify(asbab[key])) problems.push(`سببُ ${key} اختلف`);
}
const aMax = Math.max(...[...aOut.values()].map((v) => Buffer.byteLength(v)));
console.log(`أسباب النزول: ${Object.keys(asbab).length} آيةً في ${aOut.size} سورة · ` +
  `أكبرُ سورة ${kb(aMax)} · كان ${mb(fs.statSync(path.join(DATA, "asbab.json")).size)}`);

/* ── ٤. الرواة: اسمٌ وطبقةٌ وحكم، مقسومةً كما تُقسم ملفّاتُ تراجمهم ──
 * صفحةُ الحديث تحتاج من كلّ راوٍ في السلسلة اسمَه وحكمَه وطبقتَه لا غير،
 * وكانت تُنزل فهرسَ الرواة كلَّه (٧٤٩ ك.ب) لأجل ثمانيةِ أسماء. والقسمةُ
 * هي قسمةُ ملفّات التراجم نفسِها (shardOf في app.js)، فلا يُخترع ثانٍ. */
const shardOf = (n) => { let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0; return Math.abs(h) % 24; };
const RI = rd(path.join(DATA, "rijal", "index.json"));
const rOut = new Map(), rSh = {};
for (const key of Object.keys(RI)) {
  const r = RI[key];
  (rSh[shardOf(key)] = rSh[shardOf(key)] || {})[key] = [r.n || "", r.g || "", r.gen || ""];
}
for (const i of Object.keys(rSh)) rOut.set(`rijal/b${i}.json`, JSON.stringify(rSh[i]));
for (const key of Object.keys(RI)) {
  const got = rSh[shardOf(key)][key];
  if (!got || got[0] !== (RI[key].n || "")) problems.push(`راوٍ ${key} اختلف اسمُه`);
}
const rMax = Math.max(...[...rOut.values()].map((v) => Buffer.byteLength(v)));
console.log(`الرواة: ${Object.keys(RI).length} راويًا في ${rOut.size} قسمًا · ` +
  `أكبرُ قسم ${kb(rMax)} · كان ${mb(fs.statSync(path.join(DATA, "rijal", "index.json")).size)}`);

if (problems.length) {
  console.error(`\nرُفضت الكتابة — ${problems.length} اختلافًا:`);
  problems.slice(0, 5).forEach((p) => console.error("  ✕ " + p));
  process.exit(1);
}
console.log(`\n✓ كلُّ شريحةٍ تطابق أصلَها. أكبرُ بابٍ في المدوّنة: ${kb(biggest)} (${books[biggestName].ar}).`);
if (!WRITE) { console.log("\nتحقّقٌ فقط. للكتابة: node tools/build-web.mjs --write"); process.exit(0); }

for (const dir of ["h", "note", "asbab"]) fs.rmSync(path.join(DATA, dir), { recursive: true, force: true });
for (const f of fs.readdirSync(path.join(DATA, "rijal"))) if (/^b\d+\.json$/.test(f)) fs.rmSync(path.join(DATA, "rijal", f));
const write = (m) => { for (const [rel, body] of m) {
  const p = path.join(DATA, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body, "utf8");
} };
write(hOut); write(nOut); write(aOut); write(rOut);
console.log(`\nكُتبت ${hOut.size + nOut.size + aOut.size + rOut.size} شريحة.`);
