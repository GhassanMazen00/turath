/* استخراجُ مسائل الفقه من كتبها.
 *
 * ولا يُكتب هنا نثرٌ ولا يُلخَّص: كلُّ ما يُعرض على القارئ مقتبسٌ من كتابه
 * بجزئه وصفحته. وإنما يُستخرَج شيئان يقولهما المصنِّف بنفسه:
 *
 *   ١) الإجماعُ لابن المنذر: مسائلُه مرقّمةٌ في أصلها («٣ - وأجمعوا على…»)،
 *      فتُلتقط بأرقامها تحت كتبها وأبوابها.
 *   ٢) بدايةُ المجتهد: يُصرّح فيها بمواضع الاتّفاق («اتفقوا»، «وأجمع»)
 *      وبمواضع الخلاف («واختلفوا») وبسببه («وسبب اختلافهم»). فتُوسَم
 *      الفقرةُ بما صرّح به هو، لا بحكمٍ منّا عليها.
 *
 * والأدلّة: يقتبس ابن رشد الآية بين قوسين معقوفين والحديثَ بين قوسين
 * مزدوجين. فالآيةُ تُطابَق بنصّ المصحف حرفًا بحرف فيُعرف موضعُها، والحديثُ
 * يُطابَق بمتون كتبنا بلفظٍ متّصلٍ مميِّز. وما لم يثبت يُطرح ويُحصى.
 *
 *   node tools/build-fiqh.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { norm } from "./lib/openiti.mjs";
import { cleanHead } from "./lib/ingest.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const FIQH = path.join(DATA, "fiqh");
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/* ── المصحف، للمطابقة بمفتاحٍ لا بمطابقةٍ عمياء ── */
const quran = rd(path.join(DATA, "quran.json"));
const surahs = rd(path.join(DATA, "surahs.json"));
const off = []; { let a = 0; for (const s of surahs) { off[s.n] = a; a += s.count; } }
const ALL = [];
for (const s of surahs) for (let v = 1; v <= s.count; v++) ALL.push([s.n, v, norm(quran[off[s.n] + v - 1])]);
function locateAyah(n) {
  if (n.split(" ").filter(Boolean).length < 3) return null;
  const hit = ALL.filter(([, , t]) => t.includes(n));
  return hit.length === 1 ? { s: hit[0][0], v: hit[0][1] } : null;
}

/* ── متونُ الحديث ── */
const books = rd(path.join(DATA, "books.json"));
const matn = [];
for (const k of Object.keys(books)) {
  for (const r of rd(path.join(DATA, "idx", `${k}.json`))) if (r[2]) matn.push([k, r[0], r[2]]);
}
const STOP = new Set(("عن قال قالت قوله انه اني اذا الذي التي هذا هذه ذلك وقد كان كانت ثم لا ما لم "+
 "في من الي علي هو هي به له بن ابن ابي ابو رسول الله النبي صلي عليه وسلم حدثنا اخبرنا "+
 "رضي عنه عنها عنهم وهو وهي وقال فقال عليه السلام").split(" "));
/* لفظٌ متّصلٌ من الحديث المقتبَس يُميّزه: خمسُ كلماتٍ فيها ثلاثٌ مميِّزة */
function locateHadith(q) {
  const w = norm(q).split(" ").filter(Boolean);
  if (w.length < 5) return [];
  for (let len = Math.min(9, w.length); len >= 5; len--) {
    for (let i = 0; i + len <= w.length; i++) {
      const seg = w.slice(i, i + len);
      if (seg.filter((x) => x.length > 2 && !STOP.has(x)).length < 3) continue;
      const p = seg.join(" ");
      const hit = [];
      for (const [k, n, t] of matn) { if (t.includes(p)) { hit.push([k, n]); if (hit.length > 6) break; } }
      if (hit.length && hit.length <= 6) return hit;
    }
  }
  return [];
}

const stat = { ayah: 0, ayahNo: 0, had: 0, hadNo: 0 };

/* ═══ الإجماع: مسائلُ مرقّمة ═══ */
function buildIjmac() {
  const slug = "ijmac-ibn-almundhir";
  const meta = rd(path.join(FIQH, slug, "meta.json"));
  const out = [];
  let kitab = "", bab = "";
  for (let ci = 0; ci < meta.chunks; ci++) {
    const rows = rd(path.join(FIQH, slug, `c${ci}.json`));
    rows.forEach((r, i) => {
      const [t, v, p, lvl] = r;
      /* عناوينُ هذه الطبعة تحمل علاماتِ المدوّنة («CHECK»، «AUTO»)، وهي
         تُنزع في الفهرس ولا تُنزع في الفقرات. فتُنزع هنا أيضًا، وإلّا لم
         يُطابَق «كتاب» في أوّل العنوان فضاع تصنيفُ المسائل كلِّه. */
      const h = cleanHead(t);
      if (lvl) { if (/^كتاب|^ما أجمع/.test(h)) { kitab = h; bab = ""; } else bab = h; return; }
      const m = t.match(/^(\d+)\s*[-–]\s*(.+)$/s);
      if (!m) return;
      if (!/أجمع|اتفق/.test(m[2].slice(0, 60))) return;
      out.push({ n: +m[1], t: m[2].trim(), kitab, bab, v, p, c: ci, i });
    });
  }
  return out;
}

/* ═══ بداية المجتهد: مواضعُ الاتّفاق والخلاف وسببِه ═══ */
const MARK = [
  ["ijmac", /(^|\s)(اتفق(وا|\s)|وأجمع|أجمع العلماء|أجمعوا|لا خلاف)/],
  ["sabab", /وسبب (اختلافهم|الخلاف)/],
  ["khilaf", /(واختلفوا|اختلف العلماء|اختلفوا في|فذهب .* وذهب)/],
];
function buildMasail() {
  const slug = "bidayat-almujtahid";
  const meta = rd(path.join(FIQH, slug, "meta.json"));
  const out = [];
  let kitab = "", bab = "";
  for (let ci = 0; ci < meta.chunks; ci++) {
    const rows = rd(path.join(FIQH, slug, `c${ci}.json`));
    rows.forEach((r, i) => {
      const [t, v, p, lvl] = r;
      const h = cleanHead(t);
      if (lvl) { if (/^كتاب/.test(h)) { kitab = h; bab = ""; } else bab = h; return; }
      const tags = MARK.filter(([, re]) => re.test(t)).map(([k]) => k);
      if (!tags.length) return;

      /* الأدلّة كما اقتبسها المصنّف */
      const ayat = [];
      for (const m of t.matchAll(/\{([^{}]{6,220})\}/g)) {
        stat.ayah++;
        const loc = locateAyah(norm(m[1]));
        if (loc) { stat.ayahNo++; if (!ayat.some((a) => a.s === loc.s && a.v === loc.v)) ayat.push(loc); }
      }
      const ahadith = [];
      for (const m of t.matchAll(/«([^»]{25,600})»/g)) {
        stat.had++;
        const hit = locateHadith(m[1]);
        if (hit.length) { stat.hadNo++; ahadith.push({ q: m[1].slice(0, 160), at: hit }); }
      }
      const title = t.replace(/\s+/g, " ").slice(0, 120);
      out.push({ t, title, tags, kitab, bab, v, p, c: ci, i,
                 ayat, ahadith: ahadith.slice(0, 4) });
    });
  }
  return out;
}

const ijmac = buildIjmac();
const masail = buildMasail();

if (ijmac.length < 300) throw new Error(`مسائل الإجماع قليلة (${ijmac.length}) — انكسر الاستخراج؟`);
if (masail.length < 300) throw new Error(`مسائل الخلاف قليلة (${masail.length}) — انكسر الاستخراج؟`);

fs.writeFileSync(path.join(FIQH, "ijmac.json"), JSON.stringify(ijmac), "utf8");
fs.writeFileSync(path.join(FIQH, "masail.json"), JSON.stringify(masail), "utf8");

/* الرئيسيةُ لا تحتاج إلا العدد، فلا تُحمَّل ميغابايتًا ونصفًا لتطبع رقمًا */
const byTag = (k) => masail.filter((m) => m.tags.includes(k)).length;
const summary = {
  ijmac: ijmac.length,
  masail: masail.length,
  sabab: byTag("sabab"),
  ayat: masail.reduce((a, m) => a + m.ayat.length, 0),
  ahadith: masail.reduce((a, m) => a + m.ahadith.length, 0),
  /* الكتبُ بعددِ مسائلها، ليُعرض فهرسٌ مرتَّبٌ لا كومةُ أزرار */
  kutubIjmac: countBy(ijmac),
  kutubMasail: countBy(masail),
};
function countBy(rows) {
  const m = new Map();
  for (const r of rows) {
    if (!r.kitab) continue;
    const e = m.get(r.kitab) || { ar: r.kitab, n: 0, khilaf: 0, sabab: 0 };
    e.n++;
    if (r.tags && r.tags.includes("khilaf")) e.khilaf++;
    if (r.tags && r.tags.includes("sabab")) e.sabab++;
    m.set(r.kitab, e);
  }
  return [...m.values()];
}
fs.writeFileSync(path.join(FIQH, "summary.json"), JSON.stringify(summary), "utf8");

console.log(`مسائل الإجماع (ابن المنذر): ${ijmac.length} مرقّمة`);
console.log(`مواضع بداية المجتهد: ${masail.length}`);
console.log(`   فيها اتّفاقٌ مصرَّح: ${byTag("ijmac")} · خلافٌ مصرَّح: ${byTag("khilaf")} · سببُ خلافٍ: ${byTag("sabab")}`);
console.log(`الأدلّة: آياتٌ مقتبسة ${stat.ayah} ثبت منها ${stat.ayahNo} · أحاديثُ مقتبسة ${stat.had} وُصل منها ${stat.hadNo}`);
console.log(`الحجم: ${(fs.statSync(path.join(FIQH,"masail.json")).size/1024).toFixed(0)}ك.ب + ${(fs.statSync(path.join(FIQH,"ijmac.json")).size/1024).toFixed(0)}ك.ب`);
