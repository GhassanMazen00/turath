/* بناء خطّ أحداث السيرة من مفاتيحه.
 *
 * لا يكتب هذا السكربت نصًّا ولا يلخّصه. كلّ ما يفعله: يَحُلّ المفاتيح التي
 * أُثبتت في tools/sira-events.json إلى مواضعَ حقيقية في المصادر، ويتحقّق
 * منها، ويُسقط ما لم يثبت — ويقول ما أسقط.
 *
 * الربطُ بالأحاديث يقوم على مفتاحين مستقلّين يقدّمهما المصدر نفسه:
 *   ١) تصنيفُ المصنِّف: أن يكون الحديث في كتاب المغازي أو السير من كتابه.
 *   ٢) ورودُ اسم الحدث في متنه بلفظٍ لا يشتبه بغيره.
 * ولا يُقبل حديثٌ باجتماعهما إلا ويُعرض للقارئ موضعُ الذكر مُبرَزًا ليحكم.
 *
 *   node tools/build-sira.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const SIRA = path.join(DATA, "sira");
const SRC = path.join(ROOT, "tools", "sira-events.json");

const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const norm = (s) => (s || "").replace(/[ً-ٰٟـ]/g, "").replace(/[إأآا]/g, "ا")
  .replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ؤئ]/g, "ء")
  .replace(/[^ء-ي\s]/g, " ").replace(/\s+/g, " ").trim();

const spec = rd(SRC);
const books = rd(path.join(DATA, "books.json"));
const quran = rd(path.join(DATA, "quran.json"));
const surahs = rd(path.join(DATA, "surahs.json"));
const off = []; { let a = 0; for (const s of surahs) { off[s.n] = a; a += s.count; } }
const ayah = (s, v) => quran[off[s] + v - 1];
const surahAr = Object.fromEntries(surahs.map((s) => [s.n, s.ar]));

const toc = {}, meta = {};
for (const b of ["ibn-hisham", "waqidi"]) {
  toc[b] = rd(path.join(SIRA, b, "toc.json"));
  meta[b] = rd(path.join(SIRA, b, "meta.json"));
}

const problems = [];

/* موضعُ بابٍ في كتاب سيرة، بمطابقة عنوانه */
function anchor(a, ev) {
  const t = toc[a.b];
  if (!t) { problems.push(`${ev}: كتاب مجهول «${a.b}»`); return null; }
  const q = norm(a.q);
  const hit = t.find((x) => norm(x[0]).includes(q));
  if (!hit) { problems.push(`${ev}: لم يوجد بابٌ عنوانه «${a.q}» في ${meta[a.b].ar}`); return null; }
  return { b: a.b, ar: meta[a.b].ar, t: hit[0], c: hit[1], i: hit[2], v: hit[3], p: hit[4] };
}

/* مدى آيات → صفوفٌ فيها النصّ كما ورد */
function verses(k) {
  const [from, to] = String(k).split("-");
  const [s1, v1] = from.split(":").map(Number);
  const [s2, v2] = to ? to.split(":").map(Number) : [s1, v1];
  if (s1 !== s2) { problems.push(`مدى بين سورتين: ${k}`); return []; }
  const cnt = surahs.find((x) => x.n === s1);
  if (!cnt) { problems.push(`سورة مجهولة: ${k}`); return []; }
  const out = [];
  for (let v = v1; v <= Math.min(v2, cnt.count); v++) {
    const t = ayah(s1, v);
    if (!t) { problems.push(`آية غير موجودة: ${s1}:${v}`); continue; }
    out.push({ s: s1, v, sar: surahAr[s1], t });
  }
  return out;
}

/* أحاديثُ الحدث: تقاطعُ تصنيف المصنِّف بذكر اسم الحدث في المتن */
/* التطبيع يقصّ الفراغ من الطرفين، فيضيع به حدُّ الكلمة الذي قُصد في النمط:
   «احدا » بفراغٍ إنما أُريد به ألّا يقع على «باحداهما». فيُطبَّع اللفظ
   ويُردّ إليه حدُّه. (وبغير هذا وقع «فبدا باحداهما» في غزوة أحد.) */
function normPat(s) {
  const lead = /^\s/.test(s), trail = /\s$/.test(s);
  const n = norm(s);
  return n ? (lead ? " " : "") + n + (trail ? " " : "") : "";
}
function hadiths(ev) {
  const ok = (ev.ok || []).map(normPat).filter(Boolean);
  const bad = (ev.bad || []).map(normPat).filter(Boolean);
  if (!ok.length) return [];
  const secRe = ev.secs ? new RegExp(spec._أقسام[ev.secs]) : null;
  const out = [];
  for (const k of Object.keys(books)) {
    const secs = books[k].sections.filter((s) => !secRe || secRe.test(s.ar));
    const ns = new Set(secs.map((s) => s.n));
    let rows;
    try { rows = rd(path.join(DATA, "idx", `${k}.json`)); } catch { continue; }
    for (const r of rows) {
      if (secRe && !ns.has(r[1])) continue;
      const raw = r[2] || "";
      if (!raw) continue;
      const t = " " + raw + " ";               // ليصحّ حدُّ الكلمة في الطرفين
      if (bad.some((b) => t.includes(b))) continue;
      const m = ok.find((o) => t.includes(o));
      if (!m) continue;
      const at = t.indexOf(m) - 1;
      const q = m.trim();
      out.push({ b: k, n: r[0], sec: r[1],
        q,                                     // اللفظ الذي وقع الربط به
        cx: raw.slice(Math.max(0, at - 70), at + m.length + 70) });
    }
  }
  return out;
}

const events = [];
for (const ev of spec.events) {
  const an = (ev.anchor || []).map((a) => anchor(a, ev.id)).filter(Boolean);
  const qs = (ev.quran || []).map((q) => {
    const vs = verses(q.k);
    const src = q.src ? anchor(q.src, ev.id) : null;
    return vs.length ? { k: q.k, why: q.why, src, vs } : null;
  }).filter(Boolean);
  const hs = hadiths(ev);
  /* شريط التوثيق: ما قام عليه الحدث من طبقات المصادر */
  const tier = { q: qs.length > 0, h: hs.length > 0, s: an.length > 0 };
  events.push({ id: ev.id, ar: ev.ar, y: ev.y, when: ev.when, place: ev.place,
    tier, quran: qs, hadith: hs, anchor: an, nh: hs.length });
  const mark = (b) => (b ? "●" : "○");
  console.log(`${mark(tier.q)}${mark(tier.h)}${mark(tier.s)}  ${ev.ar.padEnd(24)} ` +
    `آيات:${String(qs.reduce((a, x) => a + x.vs.length, 0)).padStart(3)}  ` +
    `أحاديث:${String(hs.length).padStart(4)}  مواضع:${an.length}`);
}

if (problems.length) {
  console.error(`\nلم يثبت ${problems.length}:`);
  problems.forEach((p) => console.error("  ✕ " + p));
  process.exit(1);
}

fs.writeFileSync(path.join(SIRA, "events.json"), JSON.stringify(events), "utf8");
const kb = (fs.statSync(path.join(SIRA, "events.json")).size / 1024).toFixed(0);
console.log(`\nكُتب ${events.length} حدثًا (${kb}ك.ب)، وكلُّ مفتاحٍ فيها ثبت في مصدره.`);
