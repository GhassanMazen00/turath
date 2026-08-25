/* استخراج مرشّحي أحداث السيرة من فهارس الكتب.
 *
 * لماذا يصحّ هذا: فهرسُ الواقدي مرتَّبٌ على التاريخ، وعناوينُه تحمل تواريخها
 * بنفسها («سرية زيد بن حارثة إلى العيص في جمادى الأولى سنة ست»). فالاسمُ
 * والتاريخُ والموضعُ كلُّها من المصدر لا من عندنا — وهذا هو المطلوب: أن
 * يكون الصفُّ مفاتيحَ منقولةً لا إنشاءً.
 *
 * ولا يُستخرج لفظُ الوصل بالأحاديث إلا بشرطه: كلمتان مميِّزتان فأكثر، أو
 * لفظٌ واحدٌ نادر. وما لم يبلغه يُترك بلا وصلٍ ويظهر بطبقة السيرة وحدها —
 * لا يُوصَل بالظنّ.
 *
 *   node tools/derive-sira.mjs > tools/sira-derived.json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SIRA = path.join(ROOT, "docs", "data", "sira");
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const norm = (s) => (s || "").replace(/[ً-ٰٟـ]/g, "").replace(/[إأآا]/g, "ا")
  .replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ؤئ]/g, "ء")
  .replace(/[^ء-ي\s]/g, " ").replace(/\s+/g, " ").trim();

/* ألفاظ العدد كما تَرِد في العناوين */
const NUM = { "واحده":1,"احدي":1,"اثنتين":2,"ثنتين":2,"ثنتي":2,"ثلاث":3,"ثلاثه":3,
  "اربع":4,"اربعه":4,"خمس":5,"خمسه":5,"ست":6,"سته":6,"سبع":7,"سبعه":7,
  "ثمان":8,"ثمانيه":8,"تسع":9,"تسعه":9,"عشر":10,"عشره":10 };
const TENS = { "عشرين":20,"ثلاثين":30,"اربعين":40,"خمسين":50,"ستين":60,"سبعين":70 };
const MONTH = ["المحرم","صفر","ربيع الاول","ربيع الاخر","جمادي الاولي","جمادي الاخره",
  "رجب","شعبان","رمضان","شوال","ذي القعده","ذي الحجه"];

/* السنة من نصّ العنوان: «سنة ست» أو «على رأس ستة وثلاثين شهرا» */
function yearOf(t) {
  const n = norm(t);
  let m = n.match(/علي راس ([^ ]+)(?: و([^ ]+))? شهرا/);
  if (m) {
    const a = NUM[m[1]] || 0, b = m[2] ? (TENS[m[2]] || NUM[m[2]] || 0) : 0;
    const months = (b ? b + a : a);
    if (months > 0) return { y: Math.ceil(months / 12), from: "شهور" };
  }
  m = n.match(/سنه ([^ ]+)(?: عشره?)?/);
  if (m) {
    let y = NUM[m[1]] || 0;
    if (/سنه [^ ]+ عشره?/.test(n) && y) y += 10;
    if (y > 0 && y <= 11) return { y, from: "نصّ" };
  }
  return null;
}
function monthOf(t) {
  const n = norm(t);
  for (const mo of MONTH) if (n.includes("في " + mo) || n.includes(mo + " سنه")) return mo;
  return null;
}

/* لبُّ الاسم: يُنزع منه التاريخُ وعلاماتُ المحقّق والوصفُ الملحق.
   العناوينُ تُذيَّل بشرحٍ («وهي أول غزواته»، «وهو راية عقدها»)، وهو وصفٌ
   لا اسم، فيُقطع عند أوّل واوٍ استئنافية أو صلاةٍ على النبي. */
function core(t) {
  let s = t
    .replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ")
    .replace(/QB|QE/g, " ")
    .replace(/\s*(في|على رأس)\s+[^،]*?(سنة\s+\S+|شهرا).*$/u, " ")
    .replace(/\s*سنة\s+\S+\s*$/u, " ")
    .replace(/^باب\s+/, "")
    .replace(/\s+(وهي|وهو|وما|وكان|ونزول|وذكر|وشأنه|وحال)\s.*$/u, " ")
    .replace(/\s*(صلى الله عليه وسلم|عليه الصلاة والسلام|صلى الله عليه وعلى آله وسلم\S*|عليه السلام|رضي الله عنه\S*)\s*/gu, " ")
    .replace(/\s+/g, " ").trim();
  return s;
}
/* ألفاظ الوصل: الاسمُ المميِّز بعد «غزوة» أو بعد «إلى» في السرايا */
/* لا يُنزع من الاسم إلا لقبُ الحدث وأسماءُ الأمراء. وأمّا «ذات» و«ذي»
   و«بني» فهي التي تُميّز الموضع، ونزعُها هو الذي أوقع الخطأ:
   «ذي القَصَة» صارت «القصة» فطابقت «ذكر القصة»، و«ذي العشيرة» صارت
   «العشيرة» فطابقت «بنو العمّ والعشيرة»، و«غزوة السويق» صارت «السويق»
   فطابقت سويق الطعام. فتُترك على حالها. */
const STOP = new Set(norm("غزوة سرية سريّة بعث بعثة باب ذكر أمر شأن يوم رسول الله صلى عليه وسلم رضي عنه عنهم عليه السلام أميرها وهي وهو").split(" "));
/* ولا يُقبل لفظُ وصلٍ من كلمةٍ واحدة البتّة: كلُّ ما جاء منها في الفحص كان
   خطأً — «اليمن» وصلت ٤٢ حديثًا لا تخصّ السرية، و«قينقاع» وصلت سوقها.
   وكلُّ ما جاء من كلمتين فأكثر كان صوابًا. فما قصر عن كلمتين تُرك بلا وصل. */
function keyWords(name) {
  const to = name.split(/\s+إلى\s+/);
  let tail = to.length > 1 ? to.slice(1).join(" ") : name;
  tail = tail.replace(/^\s*(غزوة|سرية|بعثة|بعث|باب غزوة)\s+/u, " ")
             .replace(/\s*أميرها\s+[^إ]*$/u, " ");
  const w = norm(tail).split(" ").filter((x) => x.length > 1 && !STOP.has(x));
  /* ولا يُوصَل باسم رجل: «غزوة أسامة بن زيد» وصلت ٣٣ حديثًا في أسامة نفسه
     لا في الغزوة، و«أبي رافع» كنيةُ مولًى وراوٍ. وعلاماتُ اسم الرجل: بن،
     وابن، وأبي، وأبو، وبنت. وأمّا «بني» و«بنو» و«ذات» و«ذي» فللقبيلة
     والموضع، وهي التي تُميّز — فتبقى. */
  if (w.some((x) => ["بن", "ابن", "ابي", "ابو", "بنت", "مولي"].includes(x))) return [];
  return w;
}

/* الترتيب: ابن هشام يبدأ من المولد وينتهي بالوفاة، والواقدي مقصورٌ على
   المغازي مرتَّبًا على التاريخ من ١هـ. فيُؤخذ ما قبل الهجرة من ابن هشام
   (مجلّداه الأوّلان)، وما بعدها من الواقدي على ترتيبه — فيخرج خطٌّ واحدٌ
   ترتيبُه من المصدر لا من عندنا. */
const pre = [], post = [];
for (const x of rd(path.join(SIRA, "ibn-hisham", "toc.json")))
  if (x[3] <= 2) pre.push({ b: "ibn-hisham", t: x[0], c: x[1], i: x[2], v: x[3], p: x[4] });
for (const x of rd(path.join(SIRA, "waqidi", "toc.json")))
  post.push({ b: "waqidi", t: x[0], c: x[1], i: x[2], v: x[3], p: x[4] });
const rows = pre.concat(post);
/* مواضعُ ابن هشام لما بعد الهجرة تُلحق بأحداث الواقدي بمطابقة الاسم، فلا
   تُنشئ صفوفًا جديدة تفسد الترتيب. */
const extra = [];
for (const x of rd(path.join(SIRA, "ibn-hisham", "toc.json")))
  if (x[3] > 2) extra.push({ b: "ibn-hisham", t: x[0], c: x[1], i: x[2], v: x[3], p: x[4] });

const EVENT = /^(غزوة|سرية|باب غزوة|بعث|فتح|صلح|بيعة|هجرة|مبعث|مولد|وفاة|حجة|عمرة)/;
const NOISE = /(شعر|قال حسان|فأجاب|قصيدة|تم بعون|الجز|رثي|يبكي|ما قيل من)/;
const seen = new Map();
for (const r of rows) {
  if (!EVENT.test(r.t) || NOISE.test(r.t)) continue;
  const name = core(r.t);
  if (name.length < 5) continue;
  const k = norm(name);
  if (!seen.has(k)) seen.set(k, { ar: name, y: null, month: null, anchor: [], keys: keyWords(name) });
  const e = seen.get(k);
  e.anchor.push({ b: r.b, q: r.t, v: r.v, p: r.p });
  const y = yearOf(r.t);
  if (y && e.y == null) { e.y = y.y; e.yfrom = "نصّ"; }
  const mo = monthOf(r.t);
  if (mo && !e.month) e.month = mo;
}
const out = [...seen.values()];
const stated = out.filter((x) => x.y != null).length;

/* تُبذَر التواريخ ممّا رُوجع بيدٍ: تلك أحداثٌ كبارٌ تواريخُها معلومة. */
const hand = rd(path.join(ROOT, "tools", "sira-events.json")).events;
for (const h of hand) {
  const k = norm(h.ar.replace(/\s*\([^)]*\)/g, ""));
  for (const o of out) {
    const ok = norm(o.ar);
    if (ok === k || ok.includes(k) || k.includes(ok)) {
      if (o.y == null) { o.y = h.y; o.yfrom = "مرجوع"; }
      o.hand = h.id;
      break;
    }
  }
}
/* ولا يُستنتج تاريخٌ من الترتيب. جُرِّب فأخطأ: «بيعة العقبة» قبل الهجرة
   بسنتين، فسرت سنتُها إلى الهجرة نفسها وإلى غزوات السنة الثانية بعدها.
   والترتيبُ يدلّ على التقدّم والتأخّر لا على السنة. فمن لم يُنصّ تاريخُه
   ولم يُراجَع، عُرض بلا سنةٍ وبقي في موضعه من ترتيب المصدر. */

/* إلحاق مواضع ابن هشام بما يوافقها من أحداث */
for (const x of extra) {
  const k = norm(core(x.t));
  if (k.length < 5) continue;
  for (const o of out) {
    const ok = norm(o.ar);
    if (ok === k || (k.length > 8 && ok.includes(k)) || (ok.length > 8 && k.includes(ok))) {
      if (!o.anchor.some((a) => a.b === x.b && a.q === x.t))
        o.anchor.push({ b: x.b, q: x.t, v: x.v, p: x.p });
      break;
    }
  }
}
/* ما لم يُنصّ تاريخُه يُحصر بين أقرب مؤرَّخين قبله وبعده — وهذا خبرٌ صادق
   عن ترتيب المصدر، لا تاريخٌ نخترعه له. */
for (let i = 0; i < out.length; i++) {
  if (out[i].y != null) continue;
  let a = null, b = null;
  for (let j = i - 1; j >= 0; j--) if (out[j].y != null && out[j].y > 0) { a = out[j].y; break; }
  for (let j = i + 1; j < out.length; j++) if (out[j].y != null && out[j].y > 0) { b = out[j].y; break; }
  if (a != null && b != null && b >= a) out[i].ybound = [a, b];
}
out.forEach((x, i) => { x.ord = i; });
console.error(`مرشّحون: ${out.length} — ${stated} بتاريخٍ منصوص، ` +
  `${out.filter((x) => x.yfrom === "مرجوع").length} من المراجَع، ` +
  `${out.filter((x) => x.y == null).length} بلا تاريخ`);
process.stdout.write(JSON.stringify(out, null, 1));
