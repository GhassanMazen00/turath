/* أسباب النزول للواحدي: استخراج مفاتيح الآيات منه.
 *
 * الكتاب نثرٌ مسترسل لا سجلٌّ مفهرس، لكنّه يقتبس الآية بين قوسين معقوفين
 * قبل أن يسوق سببها. وهذا الاقتباسُ هو المفتاح: يُطابَق بنصّ المصحف حرفًا
 * بحرف بعد التطبيع، فيُعرف موضعُه سورةً وآية. والكتابُ مرتَّبٌ على السور،
 * فيُحصر البحث في سورة الباب — وبهذا لا تقع المطابقة العمياء التي تُخطئ.
 *
 * ولا يُقبل مفتاحٌ إلا بشرطين: أن يبلغ الاقتباسُ ثلاث كلمات، وأن يكون
 * موضعُه في سورته واحدًا لا يشتبه. وما عداه يُطرح ويُحصى في التقرير.
 *
 *   node tools/fetch-asbab.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { parseOpenITI, norm } from "./lib/openiti.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const OUT = path.join(DATA, "asbab.json");
const SRC = "https://raw.githubusercontent.com/OpenITI/0475AH/master/data/" +
  "0468IbnAhmadWahidiNaysaburi/0468IbnAhmadWahidiNaysaburi.AsbabNuzul/" +
  "0468IbnAhmadWahidiNaysaburi.AsbabNuzul.Shamela0011314-ara1";

const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const quran = rd(path.join(DATA, "quran.json"));
const surahs = rd(path.join(DATA, "surahs.json"));
const off = []; { let a = 0; for (const s of surahs) { off[s.n] = a; a += s.count; } }
const ayah = (s, v) => quran[off[s] + v - 1];

/* اسم السورة كما في عنوان الباب ← رقمها */
const sName = new Map();
for (const s of surahs) sName.set(norm(s.ar).replace(/^ال/, ""), s.n);
const surahNum = (t) => {
  const n = norm(t).replace(/^سوره\s+/, "").replace(/^ال/, "").trim();
  if (sName.has(n)) return sName.get(n);
  for (const [k, v] of sName) if (n.startsWith(k) || k.startsWith(n)) return v;
  return null;
};

/* آياتُ السورة مطبَّعةً، تُحسب مرّة */
const cache = new Map();
function ayatOf(s) {
  if (cache.has(s)) return cache.get(s);
  const cnt = surahs.find((x) => x.n === s);
  const a = [];
  for (let v = 1; v <= (cnt ? cnt.count : 0); v++) a.push([v, norm(ayah(s, v))]);
  cache.set(s, a);
  return a;
}
/* المصحف كلُّه مطبَّعًا، للبحث حين لا تُعرف السورة */
const ALL = [];
for (const s of surahs) for (const [v, t] of ayatOf(s.n)) ALL.push([s.n, v, t]);

/* موضعُ الاقتباس: يُلتمس في سورة الباب أوّلًا فهي أحصر، فإن لم يكن الباب
   سورةً — كأبواب المقدّمة: «القول في أول ما نزل من القرآن» — أو لم يقع
   فيها، التُمس في المصحف كلِّه. والضمانُ في الحالين واحد: ألّا يقع اللفظ
   إلا في موضعٍ واحد. (وبغير هذا كانت آياتُ العلق والمدّثر تُطلب في سورةٍ
   لا صلة لها بها، فتضيع.) */
function locate(n, cur) {
  if (cur) {
    const inSurah = ayatOf(cur).filter(([, t]) => t.includes(n));
    if (inSurah.length === 1) return { s: cur, v: inSurah[0][0], how: "سورته" };
    if (inSurah.length > 1) return { many: true };
  }
  const all = ALL.filter(([, , t]) => t.includes(n));
  if (all.length === 1) return { s: all[0][0], v: all[0][1], how: "المصحف" };
  return all.length ? { many: true } : { none: true };
}

async function get(url) {
  for (let i = 1; i <= 4; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return await r.text(); }
    catch (e) { if (i === 4) throw new Error(`تعذّر جلب المصدر — ${e.message}`);
      await new Promise((r) => setTimeout(r, 500 * 2 ** i)); }
  }
}

const main = async () => {
  process.stdout.write("جلب أسباب النزول… ");
  const raw = await get(SRC);
  const { blocks } = parseOpenITI(raw);
  console.log(`${blocks.length} فقرة.`);

  const stat = { quotes: 0, short: 0, none: 0, many: 0, ok: 0, noSurah: 0 };
  const map = {};
  let cur = null;

  /* الواحدي يفتتح الموضع بترجمته («قوله تعالى: {…} الآية») ثم يسوق سببه
     في الفقرات التي تليها. فأخذُ فقرة الترجمة وحدها يُخرج مفتاحًا بلا خبر.
     فيُجمع الموضعُ من ترجمته إلى ما قبل الترجمة التالية أو انتهاء السورة. */
  const items = [];                       // [مفاتيح، فقرات]
  let open = null;
  for (const b of blocks) {
    if (b.lvl) { const n = surahNum(b.t); if (n) cur = n; open = null; continue; }
    const qs = [...b.t.matchAll(/\{([^{}]{4,300})\}/g)].map((m) => m[1]);
    const hits = new Set();
    for (const q of qs) {
      stat.quotes++;
      const n = norm(q);
      if (n.split(" ").filter(Boolean).length < 3) { stat.short++; continue; }
      const r = locate(n, cur);
      if (r.none) { stat.none++; continue; }
      if (r.many) { stat.many++; continue; }
      stat.ok++;
      if (r.how === "المصحف") stat.global = (stat.global || 0) + 1;
      hits.add(r.s + ":" + r.v);
    }
    if (hits.size) { open = { keys: [...hits], parts: [b], v: b.v, p: b.p }; items.push(open); }
    else if (open && open.parts.length < 12) open.parts.push(b);
  }

  for (const it of items) {
    const t = it.parts.map((x) => x.t).join("\n").trim();
    if (!t) continue;
    /* النصّ كما ورد، بلا تلخيصٍ ولا تعديل، بموضعه المطبوع */
    const entry = { t, v: it.v, p: it.p, n: it.parts.length };
    for (const k of it.keys) (map[k] = map[k] || []).push(entry);
  }

  const keys = Object.keys(map);
  if (keys.length < 200) throw new Error(`مفاتيح قليلة (${keys.length}) — تغيّر المصدر أو انكسر الاستخراج.`);
  fs.writeFileSync(OUT, JSON.stringify(map), "utf8");

  console.log(`\nاقتباسات: ${stat.quotes}`);
  console.log(`  ثبت موضعُها:        ${stat.ok}  (منها ${stat.global || 0} بالبحث في المصحف كلِّه)`);
  console.log(`  أقصرُ من ثلاث كلمات: ${stat.short}`);
  console.log(`  لم تُوجد في المصحف:  ${stat.none}`);
  console.log(`  في أكثر من آية:      ${stat.many}`);
  const lens = Object.values(map).flat().map((x) => x.t.length);
  console.log(`\nآياتٌ لها سبب نزولٍ موصول: ${keys.length}`);
  console.log(`مواضع: ${lens.length} · متوسّط الطول ${Math.round(lens.reduce((a, x) => a + x, 0) / lens.length)} حرفًا`);
  console.log(`الملف: ${(fs.statSync(OUT).size / 1024).toFixed(0)}ك.ب`);
};
main().catch((e) => { console.error("\nفشل:", e.message); process.exit(1); });
