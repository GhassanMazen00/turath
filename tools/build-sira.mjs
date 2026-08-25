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
for (const b of ["ibn-hisham", "waqidi", "dalail", "tabaqat"]) {
  toc[b] = rd(path.join(SIRA, b, "toc.json"));
  meta[b] = rd(path.join(SIRA, b, "meta.json"));
}

const problems = [];

/* موضعُ بابٍ في كتاب سيرة، بمطابقة عنوانه */
function anchor(a, ev) {
  const t = toc[a.b];
  if (!t) { problems.push(`${ev}: كتاب مجهول «${a.b}»`); return null; }
  const q = norm(a.q);
  const hit = t.find((x) => norm(x[0]) === q) || t.find((x) => norm(x[0]).includes(q));
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

/* ── دمجُ المستخرَج بالمراجَع ──
 * المطابقة بالاسم فشلت: «صلح الحديبية» لا يطابق «غزوة الحديبية»، وتوسيعُها
 * يخلط «بدر الكبرى» بـ«بدر الأولى». فالمطابقة بالموضع: إن اشترك الصفّان في
 * عنوان بابٍ واحدٍ من الكتاب فهما حدثٌ واحد — وهذا يقينٌ لا ظنّ.
 */
const derived = fs.existsSync(path.join(ROOT, "tools", "sira-derived.json"))
  ? rd(path.join(ROOT, "tools", "sira-derived.json")) : [];

const headOf = (a) => { const t = toc[a.b]; if (!t) return null;
  const q = norm(a.q); const h = t.find((x) => norm(x[0]).includes(q));
  return h ? a.b + "|" + h[0] : null; };

const handHeads = new Map();                 // عنوان → معرّف الحدث المراجَع
for (const h of spec.events)
  for (const a of h.anchor || []) { const k = headOf(a); if (k) handHeads.set(k, h.id); }

const merged = [];
for (const d of derived) {
  let hit = null;
  for (const a of d.anchor) { const k = a.b + "|" + a.q; if (handHeads.has(k)) { hit = handHeads.get(k); break; } }
  if (hit) { d.handId = hit; continue; }     // المراجَع أولى، وأغنى تهيئةً
  /* لفظُ الوصل لا يُقبل إلا بكلمتين مميِّزتين متّصلتين أو كلمةٍ طويلة نادرة،
     وإلا تُرك الحدث بلا وصلٍ وظهر بطبقة السيرة وحدها. الظنُّ لا يُوصَل به. */
  const k = d.keys || [];
  let ok = k.length >= 2 ? [k.slice(0, 3).join(" ")] : [];
  let bad = [];
  /* رقعةٌ مفحوصةٌ بيدٍ لحدثٍ لم يصلح له لفظٌ آليّ */
  for (const key of Object.keys(spec._رقع || {})) {
    if (key.startsWith("_")) continue;
    if (d.ar.includes(key)) { const r = spec._رقع[key]; ok = r.ok; bad = r.bad || []; break; }
  }
  merged.push({ id: "d" + d.ord, ar: d.ar, y: d.y, ybound: d.ybound,
    when: d.y != null ? (d.month ? d.month + " " + AR_Y(d.y) : AR_Y(d.y))
        : (d.ybound ? "بين " + AR_Y(d.ybound[0]) + " و" + AR_Y(d.ybound[1]) : ""),
    whenFrom: d.y != null ? d.yfrom : (d.ybound ? "ترتيب" : null),
    place: "", anchor: d.anchor.map((a) => ({ b: a.b, q: a.q })),
    quran: [], ok, bad, secs: ok.length ? "مغازي" : "" });
}
function AR_Y(y) { return y > 0 ? "سنة " + y + "هـ" : "قبل الهجرة"; }

/* الترتيب: المراجَع في موضعه من ترتيب المصدر إن طابق، وإلا بسنته */
const spine = [];
for (const h of spec.events) if (h.y < 1) spine.push(h);
const byOrd = derived.slice().sort((a, b) => a.ord - b.ord);
for (const d of byOrd) {
  if (d.handId) { const h = spec.events.find((x) => x.id === d.handId);
    if (h && !spine.includes(h)) spine.push(h);
    continue; }
  const m = merged.find((x) => x.id === "d" + d.ord);
  if (m) spine.push(m);
}
for (const h of spec.events) if (!spine.includes(h)) {
  /* مراجَعٌ لم يطابق موضعًا: يوضع بسنته بين ما حولها */
  let at = spine.length;
  for (let i = 0; i < spine.length; i++) {
    const y = spine[i].y != null ? spine[i].y : (spine[i].ybound ? spine[i].ybound[0] : null);
    if (y != null && y > h.y) { at = i; break; }
  }
  spine.splice(at, 0, h);
}
console.log(`الخطّ: ${spine.length} حدثًا (${spec.events.length} مراجَعًا + ${merged.length} مستخرَجًا)\n`);

/* ── مواضعُ الحدث في دلائل النبوة وطبقات ابن سعد ──
 * لا تُطابَق بالاسم مطابقةً حرّة، بل بألفاظ الحدث نفسها التي ثبت أنّها
 * تُميّزه في متون المغازي. فما صحّ مفتاحًا هناك يصحّ هنا.
 */
function extraAnchors(ev) {
  const ok = (ev.ok || []).map(normPat).filter(Boolean);
  const bad = (ev.bad || []).map(normPat).filter(Boolean);
  const nm = norm(ev.ar).split(" ").filter((w) => w.length > 2 &&
    !["غزوه","سريه","بعثه","بعث","حديث","وفاه","هجره","صلح","بيعه","فتح","حجه","عمره","النبي","رسول","الله"].includes(w));
  const phrases = ok.length ? ok : (nm.length >= 2 ? [nm.slice(0, 2).join(" ")] : []);
  if (!phrases.length) return [];
  const out = [];
  for (const b of ["dalail", "tabaqat"]) {
    for (const x of toc[b]) {
      const t = " " + norm(x[0]) + " ";
      if (bad.some((z) => t.includes(z))) continue;
      if (!phrases.some((z) => t.includes(z))) continue;
      out.push({ b, ar: meta[b].ar, t: x[0], c: x[1], i: x[2], v: x[3], p: x[4],
                 musnad: !!meta[b].musnad });
      if (out.filter((y) => y.b === b).length >= 4) break;
    }
  }
  return out;
}

const events = [];
for (const ev of spine) {
  const an = (ev.anchor || []).map((a) => anchor(a, ev.id)).filter(Boolean);
  const ax = extraAnchors(ev);
  for (const a of ax) if (!an.some((y) => y.b === a.b && y.t === a.t)) an.push(a);
  const qs = (ev.quran || []).map((q) => {
    const vs = verses(q.k);
    const src = q.src ? anchor(q.src, ev.id) : null;
    return vs.length ? { k: q.k, why: q.why, src, vs } : null;
  }).filter(Boolean);
  const hs = hadiths(ev);
  /* شريط التوثيق: ما قام عليه الحدث من طبقات المصادر */
  /* أربعُ طبقاتٍ لا ثلاث: ودلائلُ النبوة تُساق فيها أخبارُ السيرة
     بأسانيدها كما تُساق الأحاديث، فهي بين الصحيح وبين الأخبار المرسلة —
     وإدراجُها في «كتب الأخبار» يبخسها، وفي «كتب الحديث» يزيدها. */
  const tier = { q: qs.length > 0, h: hs.length > 0,
                 m: an.some((a) => a.musnad), s: an.some((a) => !a.musnad) };
  events.push({ id: ev.id, ar: ev.ar, y: ev.y, when: ev.when || "", place: ev.place || "",
    whenFrom: ev.whenFrom || null, ybound: ev.ybound || null,
    tier, quran: qs, hadith: hs, anchor: an, nh: hs.length });
  const mark = (b) => (b ? "●" : "○");
  console.log(`${mark(tier.q)}${mark(tier.h)}${mark(tier.m)}${mark(tier.s)}  ${ev.ar.padEnd(24)} ` +
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
