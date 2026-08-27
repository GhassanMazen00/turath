/* بناءُ كتابٍ من OpenITI إلى الشكل الذي تقرؤه المنصة وتبحث فيه:
 *   meta.json · toc.json · idx.json · c{N}.json
 *
 * كُتب هذا بعدما تكرّر البناءُ نفسه في الشروح وكتب السيرة، فلمّا جاء
 * الفقه صار ثالثًا. فجُمع هنا ليُكتب مرّة. (والسكربتان الأوّلان يعملان
 * ولم يُمسّا، وتحويلُهما إليه يُترك لتغييرٍ يُعاد فيه بناؤهما فيُقابَل
 * الناتج بالموجود.)
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseOpenITI, norm } from "./openiti.mjs";

const CHUNK_CHARS = 600_000;
const MAXDF = 0.5;
const kb = (n) => (n / 1024).toFixed(0) + "ك.ب";

export async function get(url) {
  for (let i = 1; i <= 4; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return await r.text(); }
    catch (e) { if (i === 4) throw new Error(`تعذّر جلب ${url} — ${e.message}`);
      await new Promise((r) => setTimeout(r, 500 * 2 ** i)); }
  }
}

/* عنوانُ الباب كما يُعرض: تُزال علاماتُ المحقّق وأرقامُه ويبقى اللفظ */
export function cleanHead(t) {
  return String(t || "")
    .replace(/\[|\]/g, " ").replace(/\(¬?\d+\)/g, " ")
    .replace(/^(CHECK|AUTO)\s+/i, "").replace(/^\d+\s*[-–]\s*/, "")
    .replace(/\s+/g, " ").trim();
}

export async function buildBook(b, outDir, { minBlocks = 300 } = {}) {
  process.stdout.write(`\n${b.ar} — جلب… `);
  const raw = await get(b.url);
  process.stdout.write(`${(raw.length / 1048576).toFixed(1)}م.ب، تفكيك… `);
  const { meta, blocks } = parseOpenITI(raw);
  if (blocks.length < minBlocks) throw new Error(`${b.ar}: فقرات قليلة (${blocks.length}) — تغيّر المصدر؟`);

  const dir = path.join(outDir, b.slug);
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

  /* الفهرس: لكل عنوانٍ موضعُه وعددُ فقراته إلى العنوان الذي يليه.
     والعددُ لازم: عناوينُ الكتب في هذه الطبعات حاويةٌ يتلوها عنوانُ بابها
     رأسًا، فلا فقرةَ بينهما — فإن جُعلت صفحاتٍ خرجت فارغة. وبالعدد تُعرف
     الحاوية من ذات المحتوى بلا فتحِ الكتاب. */
  const toc = [];
  const heads = [];
  blocks.forEach((x, i) => {
    if (!x.lvl) return;
    const t = cleanHead(x.t);
    if (t.length > 2 && !/^PageV/.test(t)) heads.push({ t, i, v: x.v, p: x.p });
  });
  heads.forEach((h, j) => {
    const end = j + 1 < heads.length ? heads[j + 1].i : blocks.length;
    let n = 0;
    for (let x = h.i; x < end; x++) if (!blocks[x].lvl) n++;
    toc.push([h.t, at[h.i][0], at[h.i][1], h.v, h.p, n]);
  });

  const inv = new Map();
  chunks.forEach((c, ci) => {
    const seen = new Set();
    for (const x of c) for (const w of norm(x.t).split(" ")) if (w.length > 2) seen.add(w);
    for (const w of seen) { let a = inv.get(w); if (!a) inv.set(w, (a = [])); a.push(ci); }
  });
  /* استبعادُ الكلمة الشائعة يقوم على نسبتها من الأجزاء، فإن كان الكتابُ
     جزءًا واحدًا فكلُّ كلمةٍ فيه في ١٠٠٪ من أجزائه — فيُستبعد الكتابُ
     كلُّه ويخرج فهرسٌ فارغ. (وقع في «الإجماع» فخرج فهرسُه صفرًا.)
     فلا يُستبعد شيءٌ إلا في كتابٍ له أجزاء. */
  const idx = {};
  let dropped = 0;
  const cap = chunks.length > 2 ? chunks.length * MAXDF : Infinity;
  for (const [w, a] of inv) { if (a.length > cap) { dropped++; continue; } idx[w] = a; }
  fs.writeFileSync(path.join(dir, "idx.json"), JSON.stringify(idx), "utf8");
  fs.writeFileSync(path.join(dir, "toc.json"), JSON.stringify(toc), "utf8");

  const info = { slug: b.slug, ar: b.ar, full: b.full, author: b.author, died: b.died,
    note: b.note, madhhab: b.madhhab || "", kind: b.kind || "",
    vols: +(meta.BookVOLS || 0) || Math.max(...blocks.map((x) => x.v)),
    paras: blocks.length, chunks: chunks.length,
    chars: blocks.reduce((a, x) => a + x.t.length, 0), src: b.url };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(info), "utf8");

  console.log("تمّ.");
  console.log(`   ${info.paras.toLocaleString()} فقرة · ${info.chunks} جزءًا · ${toc.length} عنوانًا · ${info.vols} مجلّدًا`);
  console.log(`   الفهرس ${kb(zlib.gzipSync(JSON.stringify(idx)).length)} مضغوطًا · ${dropped} كلمة شائعة مستبعَدة`);
  return { info, blocks, at };
}
