/* جلب كتب شروح الحديث وتهيئتها للعرض والبحث.
 *
 * الكتب تُعرَض كتبًا كما هي، ولا يُنسَب منها شرحٌ إلى حديثٍ بعينه: الشروح
 * شرحٌ بالقول متّصل، ونسبة فقرةٍ منها إلى حديثٍ بذاته اجتهادٌ يُخطئ بصمت
 * (قِيس: ٢٣٪ من فقرات فتح الباري تُطابق أكثر من حديث، وأرقامها المطبوعة
 * تخالف ترقيمنا في ٩٥٪). فالقارئ هو من يبحث ويرى الموضع بنفسه.
 *
 * المصدر: OpenITI — مدوّنة أكاديمية منشورة، نصوصها مرقونة لا ممسوحة ضوئيًّا
 * (uncorrected_OCR = False لكل ما هنا).
 *
 *   node tools/fetch-sharh-books.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseOpenITI, norm } from "./lib/openiti.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "data", "sharh");
const RAW = "https://raw.githubusercontent.com/OpenITI";

const BOOKS = [
  { slug: "fath-albari", ar: "فتح الباري", full: "فتح الباري شرح صحيح البخاري",
    author: "الحافظ ابن حجر العسقلاني", died: 852, on: "bukhari", onAr: "صحيح البخاري",
    url: `${RAW}/0875AH/master/data/0852IbnHajarCasqalani/0852IbnHajarCasqalani.FathBari/0852IbnHajarCasqalani.FathBari.JK000166-ara1` },
  { slug: "minhaj-nawawi", ar: "المنهاج", full: "المنهاج شرح صحيح مسلم بن الحجاج",
    author: "الإمام النووي", died: 676, on: "muslim", onAr: "صحيح مسلم",
    url: `${RAW}/0700AH/master/data/0676Nawawi/0676Nawawi.MinhajFiSharhMuslim/0676Nawawi.MinhajFiSharhMuslim.JK000137-ara1` },
  { slug: "awn-almabud", ar: "عون المعبود", full: "عون المعبود شرح سنن أبي داود",
    author: "محمد أشرف العظيم آبادي", died: 1329, on: "abudawud", onAr: "سنن أبي داود",
    url: `${RAW}/1350AH/master/data/1329MuhammadAshrafCazimabadi/1329MuhammadAshrafCazimabadi.CawnMacbud/1329MuhammadAshrafCazimabadi.CawnMacbud.JK000264-ara1` },
  { slug: "tuhfat-alahwadhi", ar: "تحفة الأحوذي", full: "تحفة الأحوذي بشرح جامع الترمذي",
    author: "المباركفوري", died: 1353, on: "tirmidhi", onAr: "جامع الترمذي",
    url: `${RAW}/1375AH/master/data/1353IbnCabdRahimMubarakfuri/1353IbnCabdRahimMubarakfuri.TuhfatAhwadhi/1353IbnCabdRahimMubarakfuri.TuhfatAhwadhi.JK000201-ara1` },
];

/* التقسيم بميزانية حروف لا بعدد فقرات: الفقرات تتفاوت بشدّة بين الكتب
   (المنهاج فقراته طوال، وعون المعبود قصار)، فالتقسيم بالعدد يُخرج ملفّاتٍ
   بين ٢٤ك.ب و٣٨٤ك.ب. الميزانية تُسوّيها. */
const CHUNK_CHARS = 600_000;
const MAXDF = 0.5;          // الكلمة الواردة في أكثر من نصف الأجزاء لا تُفهرَس

async function get(url) {
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } catch (e) {
      if (i === 4) throw new Error(`تعذّر جلب ${url} — ${e.message}`);
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
}

const kb = (n) => (n / 1024).toFixed(0) + "ك.ب";

async function build(b) {
  process.stdout.write(`\n${b.ar} — جلب… `);
  const raw = await get(b.url);
  process.stdout.write(`${(raw.length / 1048576).toFixed(1)}م.ب، تفكيك… `);
  const { meta, blocks } = parseOpenITI(raw);
  if (blocks.length < 500) throw new Error(`${b.ar}: فقرات قليلة (${blocks.length}) — تغيّر المصدر؟`);

  const dir = path.join(OUT, b.slug);
  fs.mkdirSync(dir, { recursive: true });

  // تقسيم بميزانية حروف
  const chunks = [];
  const at = new Array(blocks.length);          // فقرة ← [جزء، موضعها فيه]
  let cur = [], size = 0;
  blocks.forEach((x, i) => {
    at[i] = [chunks.length, cur.length];
    cur.push(x); size += x.t.length;
    if (size >= CHUNK_CHARS) { chunks.push(cur); cur = []; size = 0; }
  });
  if (cur.length) chunks.push(cur);
  chunks.forEach((c, i) =>
    fs.writeFileSync(path.join(dir, `c${i}.json`),
      JSON.stringify(c.map((x) => [x.t, x.v, x.p, x.lvl])), "utf8"));

  // فهرس الأبواب: العناوين ومواضعها
  const toc = [];
  blocks.forEach((x, i) => {
    if (!x.lvl) return;
    const t = x.t.replace(/^\d+\s*/, "").replace(/^[(]\s*/, "").replace(/\s*[)]\s*$/, "")
                 .replace(/^قوله\s+/, "").trim();
    if (t.length > 1) toc.push([t, at[i][0], at[i][1], x.v, x.p]);
  });

  // فهرس معكوس: كلمة ← أرقام الأجزاء
  const inv = new Map();
  chunks.forEach((c, ci) => {
    const seen = new Set();
    for (const x of c) for (const w of norm(x.t).split(" ")) if (w.length > 2) seen.add(w);
    for (const w of seen) {
      let a = inv.get(w);
      if (!a) inv.set(w, (a = []));
      a.push(ci);
    }
  });
  const idx = {};
  let dropped = 0;
  for (const [w, a] of inv) {
    if (a.length > chunks.length * MAXDF) { dropped++; continue; }
    idx[w] = a;
  }
  fs.writeFileSync(path.join(dir, "idx.json"), JSON.stringify(idx), "utf8");
  fs.writeFileSync(path.join(dir, "toc.json"), JSON.stringify(toc), "utf8");

  const info = {
    slug: b.slug, ar: b.ar, full: b.full, author: b.author, died: b.died,
    on: b.on, onAr: b.onAr,
    vols: +(meta.BookVOLS || 0) || Math.max(...blocks.map((x) => x.v)),
    paras: blocks.length, chunks: chunks.length,
    chars: blocks.reduce((a, x) => a + x.t.length, 0),
    src: b.url,
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(info), "utf8");

  const gzIdx = zlib.gzipSync(JSON.stringify(idx)).length;
  const gzC = zlib.gzipSync(fs.readFileSync(path.join(dir, "c0.json"))).length;
  console.log(`تمّ.`);
  console.log(`   ${info.paras.toLocaleString()} فقرة · ${info.chunks} جزءًا · ${toc.length} عنوانًا · ${info.vols} مجلّدًا`);
  console.log(`   الفهرس ${kb(gzIdx)} مضغوطًا · الجزء ${kb(gzC)} مضغوطًا · ${dropped} كلمة شائعة مستبعَدة`);
  return info;
}

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const all = [];
  for (const b of BOOKS) all.push(await build(b));
  fs.writeFileSync(path.join(OUT, "books.json"), JSON.stringify(all), "utf8");
  console.log(`\nالمجموع: ${all.length} كتبٍ، ${all.reduce((a, x) => a + x.paras, 0).toLocaleString()} فقرة، ` +
              `${(all.reduce((a, x) => a + x.chars, 0) / 1e6).toFixed(1)} مليون حرف.`);
};

main().catch((e) => { console.error("\nفشل:", e.message); process.exit(1); });
