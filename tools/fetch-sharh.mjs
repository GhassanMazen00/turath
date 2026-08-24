/* جلب شروح الأحاديث وحفظها ملفًّا ثابتًا في المستودع.
 *
 * لماذا هكذا: الدرر السنية وموسوعة الحديث تُخرجان صفحاتٍ يمنع المتصفّحَ من
 * قراءتها قيدُ CORS. والقيد على المتصفّح وحده — لا على من يجلب من طرف الخادم.
 * فيكفي أن يُجلَب الشرح مرةً واحدة هنا ويُحفَظ في docs/data/sharh.json،
 * فيقرأه الموقع كأيّ ملفٍّ ساكن. لا استضافة ولا وسيط ولا اشتراك.
 *
 * يُشغَّل من GitHub Actions (تبويب Actions ← «جلب شروح الأحاديث» ← Run workflow)
 * أو محلّيًّا:  node tools/fetch-sharh.mjs
 *
 * المصدر: موسوعة الحديث النبوي (hadeethenc.com) — واجهة رسمية مجّانية تُرجع
 * لكل حديث: نصَّه، وشرحه، وفوائده، ومعاني مفرداته، ودرجته ومَن خرّجه.
 * تغطيتها مختارة (بضعة آلاف) لا شاملة، وهذا يُقال في الموقع صراحةً.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const OUT = path.join(DATA, "sharh.json");
const API = "https://hadeethenc.com/api/v1";

/* التطبيع نفسه المستعمل في الموقع — للمطابقة فقط، لا للعرض */
const norm = (s) =>
  (s || "")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const SHINGLE = 6;      // طول النافذة بالكلمات
const MIN_SHARED = 3;   // أقل عدد نوافذ مشتركة يُعتدّ به
const MIN_RATIO = 0.6;  // ونسبتها من نوافذ النصّ الأقصر

function shingles(text) {
  const w = norm(text).split(" ").filter(Boolean);
  if (w.length < SHINGLE) return [];
  const out = new Set();
  for (let i = 0; i + SHINGLE <= w.length; i++) out.add(w.slice(i, i + SHINGLE).join(" "));
  return [...out];
}

async function getJSON(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json" } });
      if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status);
      if (!r.ok) return null;                       // ٤٠٤ وأمثاله: تُتخطّى بلا إعادة
      return await r.json();
    } catch (e) {
      if (i === tries) throw new Error(`تعذّر جلب ${url} — ${e.message}`);
      await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
}

/* ── فهرس المتون عندنا: نافذة ← أرقام الأحاديث ──
 * تُستبعد النوافذ الشائعة: ألفاظ الإسناد («حدثنا فلان عن فلان») تتكرّر في مئات
 * الأحاديث فلا تدلّ على حديثٍ بعينه. بلا هذا الاستبعاد يُطابَق إسنادٌ مجرَّد
 * بحديثٍ لا صلة لمتنه به — وهو الخطأ نفسه الذي وقع في التخريج قبلُ.
 */
const MAX_DF = 20;

function buildIndex() {
  const books = JSON.parse(fs.readFileSync(path.join(DATA, "books.json"), "utf8"));
  const all = [];
  for (const b of Object.keys(books)) {
    const rows = JSON.parse(fs.readFileSync(path.join(DATA, "idx", `${b}.json`), "utf8"));
    for (const r of rows) all.push([`${b}:${r[0]}`, shingles(r[2])]);
  }
  const df = new Map();
  for (const [, sh] of all) for (const s of sh) df.set(s, (df.get(s) || 0) + 1);

  const byShingle = new Map();
  const sizes = new Map();
  for (const [id, sh] of all) {
    let kept = 0;
    for (const s of sh) {
      if (df.get(s) > MAX_DF) continue;
      let a = byShingle.get(s);
      if (!a) byShingle.set(s, (a = []));
      a.push(id);
      kept++;
    }
    sizes.set(id, kept);
  }
  const dropped = df.size - byShingle.size;
  console.log(`فُهرس ${all.length} حديثًا؛ ${byShingle.size} نافذة مميِّزة (استُبعدت ${dropped} نافذة شائعة).`);
  return { byShingle, sizes, df };
}

/* أفضل مطابقة، بشرط الدقّة لا السَّعة */
function match(text, { byShingle, sizes, df }) {
  const sh = shingles(text).filter((s) => (df.get(s) || 0) <= MAX_DF);
  if (sh.length < MIN_SHARED) return null;
  const hits = new Map();
  for (const s of sh) {
    const a = byShingle.get(s);
    if (!a) continue;
    for (const id of a) hits.set(id, (hits.get(id) || 0) + 1);
  }
  let best = null, bestScore = 0;
  for (const [id, c] of hits) {
    if (c < MIN_SHARED) continue;
    const ratio = c / Math.min(sh.length, sizes.get(id) || sh.length);
    if (ratio >= MIN_RATIO && ratio > bestScore) { bestScore = ratio; best = id; }
  }
  return best ? { id: best, score: +bestScore.toFixed(3) } : null;
}

/* ── الجلب ── */
async function fetchAll() {
  const cats = await getJSON(`${API}/categories/list/?language=ar`);
  if (!Array.isArray(cats) || !cats.length) throw new Error("قائمة الأبواب فارغة — تغيّرت الواجهة؟");
  console.log(`أبواب المصدر: ${cats.length}`);

  const ids = new Set();
  for (const c of cats) {
    for (let page = 1; page <= 100; page++) {
      const r = await getJSON(`${API}/hadeeths/list/?language=ar&category_id=${c.id}&page=${page}&per_page=100`);
      const rows = r?.data || [];
      rows.forEach((h) => ids.add(String(h.id)));
      const last = r?.meta?.last_page ?? 1;
      if (page >= last || !rows.length) break;
    }
  }
  console.log(`أحاديث المصدر: ${ids.size}`);
  if (!ids.size) throw new Error("لم تُجلب أحاديث — تغيّرت الواجهة؟");

  const out = [];
  let i = 0;
  for (const id of ids) {
    const h = await getJSON(`${API}/hadeeths/one/?language=ar&id=${id}`);
    if (h?.hadeeth && h?.explanation) out.push(h);
    if (++i % 200 === 0) console.log(`  … ${i}/${ids.size}`);
  }
  console.log(`منها ما له شرح: ${out.length}`);
  return out;
}

const main = async () => {
  const idx = buildIndex();
  const src = await fetchAll();

  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  // ما هو محفوظ لا يُدهَس: الأربعون النووية شروحٌ مُتحقَّقة شُحنت مع الموقع،
  // وكانت نسخةٌ أولى من هذا السكربت ستُسقطها لأنها بلا وسم.
  const map = { ...prev };
  let matched = 0, skipped = 0, already = 0;

  for (const h of src) {
    const m = match(h.hadeeth, idx);
    if (!m) { skipped++; continue; }
    if (map[m.id]) { already++; continue; }
    const parts = [String(h.explanation).trim()];
    const hints = (h.hints || []).filter(Boolean);
    if (hints.length) parts.push("من فوائده:\n" + hints.map((x) => "• " + x).join("\n"));
    const wm = (h.words_meanings || []).filter((w) => w?.word && w?.meaning);
    if (wm.length) parts.push("معاني المفردات:\n" + wm.map((w) => `${w.word}: ${w.meaning}`).join("\n"));
    map[m.id] = {
      t: parts.join("\n\n"),
      s: "موسوعة الحديث النبوي (hadeethenc.com)",
      u: `https://hadeethenc.com/ar/browse/hadith/${h.id}`,
      m: m.score,
    };
    matched++;
  }

  const before = Object.keys(prev).length, after = Object.keys(map).length;
  if (!matched && !already) throw new Error("لم يُطابَق شيء البتّة — تغيّر المصدر أو انكسرت المطابقة. أُلغيت الكتابة.");
  if (after < before) throw new Error(`النتيجة (${after}) أقلّ ممّا هو محفوظ (${before}) — أُلغيت الكتابة.`);

  fs.writeFileSync(OUT, JSON.stringify(map, null, 0), "utf8");
  console.log(`\nأُضيف ${matched}، وكان ${already} محفوظًا من قبلُ، وتُخطّي ${skipped} لعدم بلوغ عتبة الدقّة.`);
  console.log(`المجموع في الملف: ${after} (كان ${before}).`);
};

main().catch((e) => { console.error("\nفشل:", e.message); process.exit(1); });
