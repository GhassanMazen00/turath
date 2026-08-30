/* التخريج: أين وردَ هذا الحديثُ نفسُه في بقيّة الكتب.
 *
 * لماذا الآن: الكتبُ الستّةُ التي أُضيفت — ورياضُ الصالحين ومشكاةُ المصابيح
 * وبلوغُ المرام منها منتخَباتٌ من التسعة — ليس لمتونها في مصدرٍ نعرفه أحكامٌ
 * منسوبةٌ إلى قائليها. ولا تُختلق: القاعدةُ أنّ كلّ حكمٍ يحمل قائلَه وكتابَه
 * وموضعَه. فالطريقُ الصادق أن يُوصل الحديثُ بأصله في الكتاب الذي أخرجه —
 * وهناك حكمُه بأسماء من حكموا عليه، وهناك سلسلةُ رواته. ننقل الموضعَ، لا
 * الحكم.
 *
 * والوصلُ بمطابقة اللفظ لا بالظنّ، وشرطُه ثلاثة تجتمع:
 *   ١. أكثرُ متنِ الأقصرِ منهما مشتركٌ لفظًا بلفظ (نسبةُ المقاطع ≥ ٠٫٤٥)،
 *   ٢. وفيهما لفظٌ متّصلٌ مشترك لا يقلّ عن ست كلمات،
 *   ٣. وفي ذلك اللفظ أربعُ كلماتٍ مميِّزة على الأقلّ — لا أسماءَ رجالٍ ولا
 *      ألفاظَ روايةٍ تدور في كلّ إسناد. (بغير هذا الشرط وُصل «داري ٨٩»
 *      بـ«بخاري ٣٤٨» لاشتراكهما في «عن أبي هريرة رضي الله عنه» ولا غير.)
 *
 * ولا يُطرح رابطٌ قائم: الملفُّ القديم يُنسخ كما هو ويُزاد عليه. وما يُزاد
 * لا يكون إلا فيه أحدُ الكتب الستّة الجديدة، فلا يتغيّر ما كان يراه القارئ
 * في الكتب العشرة.
 *
 *   node tools/build-takhrij.mjs            تحقّقٌ وتقرير، بلا كتابة
 *   node tools/build-takhrij.mjs --write    يكتب إن سلمت المقابلة
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const WRITE = process.argv.includes("--write");
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const RATIO = 0.45, RUN = 6, DISTINCT = 4, MAXLINKS = 12;
const SH = 4;                       // طولُ المقطع المفهرس، بالكلمات

/* المتنُ: ما بعد آخر «صلى الله عليه وسلم» — فما قبله إسناد. وذيلُ التخريج
   في المنتخَبات («متفق عليه»، «رواه مسلم») ليس من المتن، ويُطيله فيُخفض
   النسبة. يُطرح للمقابلة وحدها؛ والنصُّ المعروض لا يُمسّ. */
const MARK = /صلي الله عليه وسلم/g;
/* «\b» في جافاسكربت حدُّ كلمةٍ لاتينية، والعربيةُ كلُّها عنده «غيرُ كلمة»
   فلا يقع الحدُّ حيث يُظنّ. فالمقابلةُ بمسافةٍ أو نهايةِ نصّ. وبغير هذا بقي
   الذيلُ فوُصل «مشكاة ٤١٤٨» بـ«مشكاة ٩٥٩» لاشتراكهما في «رواه الترمذي وقال
   هذا حديث حسن غريب» ولا شيءَ غيره. */
const TAIL = /\s(?:متفق عليه|رواه|رواهما|اخرجه|اخرجهما|واخرجه|وروي|رويناه|وفي روايه)(?=\s|$)[\s\S]*$/;
function matnOf(t) {
  MARK.lastIndex = 0;
  let last = -1, m;
  while ((m = MARK.exec(t))) last = m.index + m[0].length;
  let r = last > 0 ? t.slice(last) : t;
  r = r.replace(/^\s*(?:انه\s+)?(?:يقول|قال|قالت|فقال|انه)\s+/, "").trim();
  if (r.length < 25) r = t;
  return r.replace(TAIL, "").trim();
}

/* ألفاظٌ لا تميّز حديثًا: أدواتُ الرواية وأسماءُ ما يتكرّر في كلّ إسناد.
   هي نفسُها المستعملة في وزن أدلّة الشروح (SH_STOP في docs/assets/app.js). */
const STOP = new Set(("عن قال قالت قوله انه اني اذا الذي التي هذا هذه ذلك وقد كان كانت ثم " +
  "لا ما لم في من الي علي هو هي به له بن ابن ابي ابو رسول الله النبي صلي عليه وسلم " +
  "حدثنا اخبرنا انبانا وهو وهي وقال فقال ايضا وفي وقيل قلت سمعت حدثني اخبرني " +
  "رضي عنه عنها عنهم انا اننا كنا كنت يا ان وان او ثنا نا مثله نحوه بمعناه").split(" "));

/* ألفاظُ التحمّل: لا تقع إلا في إسناد. فلفظٌ متّصلٌ فيه واحدةٌ منها إسنادٌ
   مشترك لا متنٌ مشترك — وشيخانِ مشتركان لا يجعلان الحديثين واحدًا. (وُصل
   «شمائل ١٣٥» بـ«ترمذي ٣٨٨٨» لاشتراكهما في «حدثنا محمد بن بشار قال حدثنا
   عبد الرحمن بن مهدي قال حدثنا سفيان عن» — وهما حديثان مختلفان.) */
const CARRY = /(^|\s)(حدثنا|حدثني|حدثه|اخبرنا|اخبرني|اخبره|انبانا|انباني|ثنا|سمعت)(\s|$)/;

const words = (s) => s.split(" ").filter(Boolean);
const shingles = (w) => { const o = []; for (let i = 0; i + SH <= w.length; i++) o.push(w.slice(i, i + SH).join(" ")); return o; };

/* أطولُ لفظٍ متّصلٍ مشتركٍ بينهما، بالكلمات — ومعه عددُ المميِّز منه */
function sharedRun(a, b) {
  const at = new Map();
  b.forEach((w, i) => { let x = at.get(w); if (!x) at.set(w, (x = [])); x.push(i); });
  let best = 0, bi = 0;
  for (let i = 0; i < a.length; i++) {
    if (a.length - i <= best) break;
    const st = at.get(a[i]); if (!st) continue;
    for (const j of st) {
      let n = 0;
      while (i + n < a.length && j + n < b.length && a[i + n] === b[j + n]) n++;
      if (n > best) { best = n; bi = i; }
    }
  }
  const run = a.slice(bi, bi + best);
  return { len: best, distinct: run.filter((w) => w.length > 2 && !STOP.has(w)).length, run: run.join(" ") };
}

const books = rd(path.join(DATA, "books.json"));
const NEW = new Set(fs.existsSync(path.join(DATA, "txt", "books.json"))
  ? rd(path.join(DATA, "txt", "books.json")) : []);

/* الفهرس المقلوب على المدوّنة كلِّها */
const inv = new Map(), matn = new Map();
for (const k of Object.keys(books)) {
  for (const r of rd(path.join(DATA, "idx", `${k}.json`))) {
    if (!r[2]) continue;
    const w = words(matnOf(r[2]));
    if (w.length < SH + 2) continue;
    const id = `${k}:${r[0]}`;
    matn.set(id, w);
    for (const s of new Set(shingles(w))) { let a = inv.get(s); if (!a) inv.set(s, (a = [])); a.push(id); }
  }
}
console.log(`فُهرست ${matn.size.toLocaleString()} متنًا · ${inv.size.toLocaleString()} مقطعًا`);

/* لا يُبحث إلا عن روابط فيها كتابٌ جديد: ما يراه القارئُ في الكتب العشرة
   يبقى كما هو، فلا يُقلَب عليه شيءٌ في هذه الدفعة. */
const found = new Map();                 // "a|b" → {score, run}
const add = (a, b, sc, run) => {
  const key = a < b ? a + "|" + b : b + "|" + a;
  const old = found.get(key);
  if (!old || sc > old.score) found.set(key, { score: sc, run });
};
let scanned = 0;
for (const k of NEW) {
  for (const r of rd(path.join(DATA, "idx", `${k}.json`))) {
    const id = `${k}:${r[0]}`;
    const w = matn.get(id); if (!w) continue;
    scanned++;
    const cnt = new Map();
    for (const s of new Set(shingles(w))) {
      const a = inv.get(s);
      if (!a || a.length > 200) continue;   // مقطعٌ شائعٌ في مئتَي حديث لا يدلّ
      for (const oid of a) { if (oid === id) continue; cnt.set(oid, (cnt.get(oid) || 0) + 1); }
    }
    const cands = [...cnt].sort((x, y) => y[1] - x[1]).slice(0, 40);
    for (const [oid, c] of cands) {
      const ow = matn.get(oid);
      const denom = Math.max(1, Math.min(w.length, ow.length) - SH + 1);
      const ratio = c / denom;
      if (ratio < RATIO) continue;
      const sr = sharedRun(w, ow);
      if (sr.len < RUN || sr.distinct < DISTINCT) continue;
      if (CARRY.test(sr.run)) continue;
      add(id, oid, ratio, sr.run);
    }
  }
}
console.log(`مُسح ${scanned.toLocaleString()} حديثًا من الكتب الجديدة · وُجد ${found.size.toLocaleString()} وصلًا`);

/* الدمج: القديمُ كما هو، ثم يُزاد.
   والملفُّ مُقسَّمٌ على الكتب: صفحةُ الحديث لا تحتاج إلا تخريجَ كتابها،
   فلا يُنزَّل عليها تخريجُ المدوّنة كلِّها (٩٠٠ ك.ب لأجل كتابٍ واحد). */
const TDIR = path.join(DATA, "takhrij");
function readOld() {
  if (fs.existsSync(TDIR)) {
    const o = {};
    for (const f of fs.readdirSync(TDIR)) Object.assign(o, rd(path.join(TDIR, f)));
    return o;
  }
  const legacy = path.join(DATA, "takhrij.json");
  return fs.existsSync(legacy) ? rd(legacy) : {};
}
const old = readOld();
const out = {};
for (const k of Object.keys(old)) out[k] = old[k].slice();
const push = (a, b) => { if (!out[a]) out[a] = []; if (!out[a].includes(b)) out[a].push(b); };
const scored = [...found].map(([k, v]) => { const [a, b] = k.split("|"); return { a, b, ...v }; })
  .sort((x, y) => y.score - x.score);
let added = 0;
for (const x of scored) {
  if ((out[x.a] || []).length >= MAXLINKS && (out[x.b] || []).length >= MAXLINKS) continue;
  push(x.a, x.b); push(x.b, x.a); added += 2;
}

/* لا يضيع رابطٌ كان */
const lost = [];
for (const k of Object.keys(old)) for (const v of old[k]) if (!(out[k] || []).includes(v)) lost.push(k + "→" + v);
if (lost.length) { console.error(`\nرُفضت الكتابة: ضاع ${lost.length} رابطًا (${lost.slice(0, 3).join("، ")}…)`); process.exit(1); }

const before = Object.values(old).flat().length, after = Object.values(out).flat().length;
const perBook = {};
for (const k of Object.keys(out)) { const b = k.split(":")[0]; perBook[b] = (perBook[b] || 0) + 1; }
console.log("\nأحاديثُ لها تخريج، بالكتاب:");
for (const k of Object.keys(books)) {
  const n = perBook[k] || 0, tot = books[k].total;
  console.log(`  ${books[k].ar.padEnd(22)} ${String(n).padStart(5)}/${String(tot).padStart(5)} = ${(n / tot * 100).toFixed(0)}٪${NEW.has(k) ? "  ← جديد" : ""}`);
}
console.log(`\nالروابط: ${before.toLocaleString()} ← ${after.toLocaleString()} (+${(after - before).toLocaleString()})`);

/* عيّنةٌ تُقرأ: الوصلُ يُعرض بدليله كما يُعرض دليلُ الشرح */
console.log("\nعيّنة:");
for (const x of scored.slice(0, 5))
  console.log(`  ${x.a} ↔ ${x.b} (${x.score.toFixed(2)}) « ${x.run.slice(0, 70)} »`);

/* عيّنةٌ عشوائيةٌ من حافّة القبول، تُقرأ بالعين: هناك يقع الخطأ إن وقع */
if (process.argv.includes("--edge")) {
  const edge = scored.filter((x) => x.score < 0.6);
  console.log(`\nعلى الحافّة (نسبة < ٠٫٦): ${edge.length} وصلًا — عيّنةٌ منها:`);
  for (let i = 0; i < 14 && edge.length; i++) {
    const x = edge[Math.floor(i * edge.length / 14)];
    console.log(`\n  ${x.a} ↔ ${x.b}  نسبة=${x.score.toFixed(2)}  اللفظ المشترك: «${x.run}»`);
    console.log(`   أ: ${matn.get(x.a).join(" ").slice(0, 120)}`);
    console.log(`   ب: ${matn.get(x.b).join(" ").slice(0, 120)}`);
  }
}

if (!WRITE) { console.log("\nتحقّقٌ فقط. للكتابة: node tools/build-takhrij.mjs --write"); process.exit(0); }
const shard = {};
for (const k of Object.keys(out)) {
  const b2 = k.split(":")[0];
  (shard[b2] = shard[b2] || {})[k] = out[k];
}
fs.rmSync(TDIR, { recursive: true, force: true });
fs.mkdirSync(TDIR, { recursive: true });
for (const k of Object.keys(shard))
  fs.writeFileSync(path.join(TDIR, `${k}.json`), JSON.stringify(shard[k]), "utf8");
fs.rmSync(path.join(DATA, "takhrij.json"), { force: true });
console.log(`\nكُتب تخريجُ ${Object.keys(shard).length} كتبٍ — ${Object.keys(out).length.toLocaleString()} حديثًا.`);
