/* جلب كتب السيرة وتهيئتها للقراءة والبحث.
 *
 * الشكل نفسه المستعمل في كتب الشروح (meta/toc/idx/c{N}) عمدًا: القارئ
 * والباحث والمُبرِز مكتوبةٌ مرّة، فتخدم البابين. والمصدر OpenITI: مدوّنة
 * أكاديمية منشورة، نصوصها مرقونة لا ممسوحة ضوئيًّا.
 *
 * وكتبُ السيرة أخبارٌ لا أحاديثُ على شرط الصحيح، وهذا يُقال في الصفحة
 * صراحةً ولا يُموَّه عليه.
 *
 *   node tools/fetch-sira.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseOpenITI, norm } from "./lib/openiti.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "data", "sira");
const RAW = "https://raw.githubusercontent.com/OpenITI";

const BOOKS = [
  { slug: "ibn-hisham", ar: "سيرة ابن هشام", full: "السيرة النبوية لابن هشام",
    author: "عبد الملك بن هشام", died: 213,
    note: "تهذيبُ ابن هشام لسيرة ابن إسحاق، وهو الأصل الذي تدور عليه كتب السيرة بعده.",
    url: `${RAW}/0225AH/master/data/0213IbnHisham/0213IbnHisham.SiraNabawiyya/0213IbnHisham.SiraNabawiyya.JK000797-ara1` },
  { slug: "waqidi", ar: "مغازي الواقدي", full: "كتاب المغازي للواقدي",
    author: "محمد بن عمر الواقدي", died: 207,
    note: "أوسع الكتب في تفاصيل الغزوات وتواريخها وأعداد من شهدها.",
    url: `${RAW}/0225AH/master/data/0207Waqidi/0207Waqidi.Maghazi/0207Waqidi.Maghazi.Shamela0023680-ara1.mARkdown` },
];

const CHUNK_CHARS = 600_000;
const MAXDF = 0.5;

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
  if (blocks.length < 300) throw new Error(`${b.ar}: فقرات قليلة (${blocks.length}) — تغيّر المصدر؟`);

  const dir = path.join(OUT, b.slug);
  fs.mkdirSync(dir, { recursive: true });

  const chunks = [];
  const at = new Array(blocks.length);
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

  /* عناوين ابن هشام أسماءُ أحداثٍ بذاتها («حديث مولد رسول الله ﷺ»)، فهي
     عمود الخطّ الزمني لا مجرّد فهرس. وتُستبعد علاماتُ الصفحات التي تسرّبت
     إلى العناوين في المصدر. */
  const toc = [];
  blocks.forEach((x, i) => {
    if (!x.lvl) return;
    const t = x.t.replace(/^\d+\s*/, "").replace(/^[(]\s*/, "").replace(/\s*[)]\s*$/, "").trim();
    if (t.length > 2 && !/^PageV/.test(t)) toc.push([t, at[i][0], at[i][1], x.v, x.p]);
  });

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
    slug: b.slug, ar: b.ar, full: b.full, author: b.author, died: b.died, note: b.note,
    vols: +(meta.BookVOLS || 0) || Math.max(...blocks.map((x) => x.v)),
    paras: blocks.length, chunks: chunks.length,
    chars: blocks.reduce((a, x) => a + x.t.length, 0),
    src: b.url,
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(info), "utf8");
  const gzIdx = zlib.gzipSync(JSON.stringify(idx)).length;
  console.log(`تمّ.`);
  console.log(`   ${info.paras.toLocaleString()} فقرة · ${info.chunks} جزءًا · ${toc.length} عنوانًا · ${info.vols} مجلّدًا`);
  console.log(`   الفهرس ${kb(gzIdx)} مضغوطًا · ${dropped} كلمة شائعة مستبعَدة`);
  return info;
}

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const all = [];
  for (const b of BOOKS) all.push(await build(b));
  fs.writeFileSync(path.join(OUT, "books.json"), JSON.stringify(all), "utf8");
  console.log(`\nالمجموع: ${all.length} كتابين، ${all.reduce((a, x) => a + x.paras, 0).toLocaleString()} فقرة.`);
};
main().catch((e) => { console.error("\nفشل:", e.message); process.exit(1); });
