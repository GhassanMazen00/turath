/* سلاسلُ الإسناد للكتب التي تسوقها في متنها ولا سلسلةَ مفهرسةً لها.
 *
 * سنن الدارمي والأدب المفرد والشمائل المحمدية تسوق أسانيدها كاملةً في نصّها
 * المطبوع، ولكن مصدرَ السلاسل المفهرسة لا يغطّيها. فالسلسلةُ موجودةٌ في
 * النصّ الذي بين أيدينا، وإنّما تحتاج أن تُقرأ منه.
 *
 * وتُقرأ بالآلة نفسها التي يقرأ بها الموقعُ الأسانيدَ غيرَ المفهرسة —
 * splitIsnad وchain في docs/assets/app.js — لا بآلةٍ ثانية تخالفها. وتُوسم
 * بأنّها مستخرَجةٌ آليًّا (النوع «t») لا مفهرسةً (النوع «i»)، فيقول الموقع
 * للقارئ صراحةً: «استُخرجت الأسماء آليًّا وقد تنقص».
 *
 * والاسمُ لا يُربط بترجمةٍ إلا إن كان في قاعدة الرواة راوٍ واحدٌ يحمله.
 * وإن تعدّد المسمَّون به تُرك اسمًا بلا رابط — القاعدةُ أنّا لا نجزم بهويةٍ
 * ملتبسة.
 *
 * وبلوغُ المرام ورياضُ الصالحين ومشكاةُ المصابيح لا تُمَسّ: منتخَباتٌ تنسب
 * الحديث إلى صحابيّه ولا تسوق سلسلته، فليس ثَمّ ما يُستخرج — وإخراجُ حلقةٍ
 * واحدة وتسميتُها «سلسلة إسناد» كذبٌ بالشكل.
 *
 * ولا يُدهَس صفٌّ له سلسلةٌ من قبل، ولا يُكتب شيءٌ إن ضاع شيء.
 *
 *   node tools/build-isnad.mjs            تحقّقٌ وتقرير، بلا كتابة
 *   node tools/build-isnad.mjs --write    يكتب إن سلمت المقابلة
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const WRITE = process.argv.includes("--write");
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/* الكتبُ التي تسوق أسانيدها ولا سلسلةَ مفهرسةً لها */
const BOOKS = ["darimi", "adab", "shamail"];

/* ── منقولٌ حرفًا عن docs/assets/app.js: التشكيل والفصل والاستخراج ── */
const DIA = /[ً-ْٰـۖ-ۭ]/g;
const LINK = /(حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|سمعت|عن\s|قرأت على|وحدثنا|وحدثني|نا\s|ثنا\s)/;
const VERB = /(وحدثنا|وحدثني|حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|سمعت|قرأت على|عن)\s+/g;
const bare = (x) => x.replace(DIA, "");
function stripMap(s) {
  let out = "", map = [];
  for (let i = 0; i < s.length; i++) if (!/[ً-ْٰـ]/.test(s[i])) { out += s[i]; map.push(i); }
  map.push(s.length); return { out, map };
}
/* حدُّ الإسناد: كان يُؤخذ بوجود لفظِ تحمّلٍ في المقطع أيًّا كان موضعُه
   (LINK أعلاه، وفيه «نا\s»). و«نا» تقع في وسط المتن — «لمَّا نُهينا أنْ
   نبتدئ» — فابتلع المقطعُ الأخيرُ الحديثَ كلَّه وصار «راويًا» طولُه مئتا
   حرف. فالحدُّ هنا أضيق: المقطعُ من الإسناد إن ابتدأ بلفظ التحمّل، لا إن
   وقع فيه. ويُسمح بـ«قال» قبله، فهي تتخلّل السلاسل. */
const HEAD = /^\s*(?:و|ف)?\s*(?:قال\s*:?\s*)?(?:حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|سمعت|قرأت على|عن|ثنا|أنا|نا)(?:\s|:)/;
function splitIsnad(text) {
  const p = text.split("،"); if (p.length < 2) return { isnad: null, matn: text };
  let last = -1;
  for (let i = 0; i < p.length; i++) { if (HEAD.test(bare(p[i]))) last = i; else break; }
  if (last < 0 || last >= p.length - 1) return { isnad: null, matn: text };
  const isnad = p.slice(0, last + 1).join("،") + "،", matn = p.slice(last + 1).join("،").trim();
  return matn ? { isnad: isnad.trim(), matn } : { isnad: null, matn: text };
}
function chain(isnad) {
  if (!isnad) return [];
  const src = isnad.replace(/[،\s]+$/, "");
  const { out, map } = stripMap(src);
  const marks = []; let m; VERB.lastIndex = 0;
  while ((m = VERB.exec(out)) !== null) marks.push({ verb: m[1], start: m.index, after: VERB.lastIndex });
  const res = [];
  for (let i = 0; i < marks.length; i++) {
    const a = map[marks[i].after];
    const b = (i + 1 < marks.length) ? map[marks[i + 1].start] : src.length;
    let name = src.slice(a, b).replace(/[،\s]+$/, "").trim();
    name = name.replace(/[،\s]*ق\p{M}*ا\p{M}*ل\p{M}*[\s،]*$/u, "").trim();
    if (name) res.push({ verb: marks[i].verb, name });
  }
  return res;
}
/* ── نهايةُ المنقول ── */

/* الاسمُ كما يُعرض. والقطعُ يقع على النصّ المشكول بمواضعَ تُحسب من نظيره
   المجرَّد: «رَضِيَ اللهُ عَنْهُ» لا يطابقها /رضي\s+الله/ لأنّ بين حروفها
   حركات. فيُبحث في المجرَّد ويُقطع الأصلُ بموضعه، فيبقى التشكيل في الاسم
   ولا يبقى ما ليس منه.
   وطبعةُ الأدب المفرد تصل بالراوي خبرَ سماعِه («قراءةً عليه فأقرّ به قدم
   علينا حاجًّا في صفر سنة…») — وهو من النصّ لا يُحذف منه، ولكنّه ليس من
   الاسم فلا يُعرض عقدةً في السلسلة. */
function cutBare(s, re) {
  const { out, map } = stripMap(s);
  const m = re.exec(out);
  return m ? s.slice(0, map[m.index]) : s;
}
const NAME_END = /\s(?:قال|قالت|يقول|تقول|قراءة|قدم|سنة|أنه|أنها|وهو|يحدث|حدثه|أخبره|سمعته|رضي الله|رحمه الله)(?:\s|:|$)/;
function cleanName(s) {
  /* علاماتُ اتّجاه الكتابة (U+200E/200F) تتخلّل هذه الطبعات، فتقع بين
     «قال» وما بعده فلا يقع عليها القطع. تُزال أوّلًا لا آخرًا. */
  let t = String(s || "").replace(/[\u200e\u200f]/g, " ").replace(/\s+/g, " ");
  t = cutBare(t, NAME_END);
  t = t.replace(/[:؛.،]+/g, " ").replace(/\s+/g, " ").trim();
  /* «قال» في صدر الاسم من السلسلة لا منه */
  const b = stripMap(t);
  const lead = /^(?:قال|قالت|أنه|أنها)\s+/.exec(b.out);
  if (lead) t = t.slice(b.map[lead[0].length]).trim();
  const w = t.split(/\s+/).filter(Boolean);
  return (w.length > 14 ? w.slice(0, 14).join(" ") : t).trim();
}
const norm = (s) => (s || "").normalize("NFKC").replace(DIA, "")
  .replace(/[أإآٱ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و")
  .replace(/[^ء-ي ]/g, " ").replace(/\s+/g, " ").trim();

/* اسمٌ لا يدلّ على راوٍ: كلمةٌ واحدةٌ من أدوات الكلام، أو ما خلا من حرف عربي */
const NOTNAME = new Set(("قال قالت انه انها هو هي ذلك هذا هذه نحوه مثله بمعناه به له " +
  "صاحب هذه الدار رجل رجلا امراه ابيه امه جده عمه خاله بعضهم غيره اخر اخري").split(" "));
const looksName = (n) => {
  const w = norm(n).split(" ").filter(Boolean);
  if (!w.length || !/[ء-ي]/.test(n)) return false;
  if (w.length === 1 && NOTNAME.has(w[0])) return false;
  if (w.every((x) => NOTNAME.has(x))) return false;
  return norm(n).length >= 3;
};

/* اسم الراوي → مفاتيحُ من يحملونه. لا يُربط إلا ما انفرد به واحد. */
const RI = rd(path.join(DATA, "rijal", "index.json"));
const byName = new Map();
for (const k of Object.keys(RI)) {
  const n = norm(RI[k].n); if (!n) continue;
  let a = byName.get(n); if (!a) byName.set(n, (a = [])); a.push(k);
}

const books = rd(path.join(DATA, "books.json"));
const report = [], blockers = [];

for (const k of BOOKS) {
  const idxPath = path.join(DATA, "idx", `${k}.json`);
  const rows = rd(idxPath);
  const txtDir = path.join(DATA, "txt", k);
  if (!fs.existsSync(txtDir)) { blockers.push(`${k}: لا نصَّ مشحونًا`); continue; }
  const cache = new Map();
  const textOf = (num, sec) => {
    if (!cache.has(sec)) cache.set(sec, rd(path.join(txtDir, `${sec}.json`)));
    const h = (cache.get(sec).hadiths || []).find((x) => +x.hadithnumber === num);
    return h ? h.text : "";
  };

  let had = 0, made = 0, nodes = 0, linked = 0, ambig = 0, kept = 0;
  const out = rows.map((r) => {
    if ((r[4] || []).length) { kept++; return r; }        // لا يُدهَس ما كان
    const t = textOf(r[0], r[1]); if (!t) return r;
    const sp = splitIsnad(t);
    const raw = chain(sp.isnad);
    if (!raw.length) return r;
    had++;
    const ch = [];
    for (const x of raw) {
      const n = cleanName(x.name);
      if (!looksName(n)) continue;
      const hit = byName.get(norm(n));
      if (hit && hit.length === 1) { ch.push(["i", hit[0]]); linked++; }
      else { if (hit) ambig++; ch.push(["t", n]); }
      nodes++;
    }
    if (!ch.length) return r;
    made++;
    return [r[0], r[1], r[2], r[3], ch];
  });

  /* لا يضيع صفٌّ ولا متنٌ ولا حكمٌ ولا سلسلةٌ كانت */
  const bad = [];
  if (out.length !== rows.length) bad.push("اختلف عددُ الصفوف");
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i], b = out[i];
    if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) bad.push(`تغيّر الصفّ ${a[0]}`);
    if (JSON.stringify(a[3]) !== JSON.stringify(b[3])) bad.push(`تغيّر حكمُ ${a[0]}`);
    if ((a[4] || []).length && JSON.stringify(a[4]) !== JSON.stringify(b[4])) bad.push(`دُهست سلسلةُ ${a[0]}`);
  }
  if (bad.length) blockers.push(`${books[k].ar}: ${bad.slice(0, 3).join(" · ")}`);

  report.push({ k, out, made, nodes, linked, ambig, total: rows.length, had });
  console.log(`${books[k].ar.padEnd(20)} ${String(made).padStart(5)}/${String(rows.length).padStart(5)} سلسلةً ` +
    `(${(made / rows.length * 100).toFixed(0)}٪) · ${nodes} راويًا · ${linked} موصولًا بترجمته ` +
    `(${(linked / Math.max(1, nodes) * 100).toFixed(0)}٪) · ${ambig} اسمًا ملتبسًا تُرك بلا رابط`);
}

if (blockers.length) {
  console.error("\nرُفضت الكتابة:"); blockers.forEach((b) => console.error("  ✕ " + b)); process.exit(1);
}
const tot = report.reduce((a, x) => a + x.made, 0);
console.log(`\nالمجموع: ${tot.toLocaleString()} سلسلةً مستخرَجة، مَوسومةً بأنّها آليّة.`);

/* عيّنةٌ تُقرأ */
for (const r of report.slice(0, 3)) {
  const s = r.out.find((x) => (x[4] || []).length >= 3);
  if (s) console.log(`  ${books[r.k].ar} ${s[0]}: ` +
    s[4].map(([t, v]) => (t === "i" ? "⟨" + RI[v].n + "⟩" : v)).join(" ← "));
}

if (!WRITE) { console.log("\nتحقّقٌ فقط. للكتابة: node tools/build-isnad.mjs --write"); process.exit(0); }
for (const r of report)
  fs.writeFileSync(path.join(DATA, "idx", `${r.k}.json`), JSON.stringify(r.out), "utf8");
console.log(`\nكُتبت فهارسُ ${report.length} كتب.`);
