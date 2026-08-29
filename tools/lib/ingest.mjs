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

/* عنوانُ الباب كما يُعرض: تُزال علاماتُ المحقّق والمدوّنة ويبقى اللفظ.
   و«PARATEXT|» و«AUTO» و«CHECK» علاماتُ المدوّنة لا من الكتاب، فتُزال. */
export function cleanHead(t) {
  const out = String(t || "")
    .replace(/\[|\]/g, " ").replace(/\(¬?\d+\)/g, " ")
    .replace(/\bPARATEXT\s*\|?/gi, " ").replace(/\b(CHECK|AUTO)\b/gi, " ")
    .replace(/^\d+\s*[-–]\s*/, "")
    /* طبعاتُ الشروح تُصدّر الترجمة برقمٍ وقوسٍ و«قوله»: «1 ( قوله باب … )».
       وكان هذا يُنزع عند العرض لا عند البناء، فيُخزَّن العنوانُ بغير صورته
       التي تُرى — فلا يُعرف العاطلُ منه. فصار النزعُ هنا مرّةً واحدة. */
    .replace(/^\d+\s*/, "").replace(/^[(]\s*/, "").replace(/\s*[)]\s*$/, "")
    .replace(/^\d+\s*/, "").replace(/^[(]\s*/, "").replace(/^قوله\s+/, "")
    .replace(/\s*[)]\s*$/, "")
    .replace(/^[\s*|:،.-]+/, "").replace(/[\s*|:،.-]+$/, "")
    .replace(/\s+/g, " ").trim();
  return tidyParens(out);
}
/* أقواسُ المحقّق تتداخل وتفرغ: «أبواب ( ( شرح ) ) الطهارة». والتداخلُ
   يزيد على طبقةٍ، فيُكرَّر الطيُّ حتى يستقرّ اللفظ. */
function tidyParens(t) {
  let prev;
  do { prev = t;
    t = t.replace(/\(\s*\)/g, " ").replace(/\(\s*\(/g, "(").replace(/\)\s*\)/g, ")");
  } while (t !== prev);
  return t.replace(/\s+/g, " ").trim();
}
/* عنوانٌ لا يدلّ: «باب» و«فصل» مجرَّدين، أو ما خلا من حرفٍ عربي.
   وهي في المصدر كذلك — أبوابٌ بلا ترجمة — فلا تُغيَّر، وإنّما يُضمّ
   إليها فاتحةُ كلامها لتُعرف. */
const BARE = /^(باب|فصل|كتاب|أبواب|جماع|تتمة)$/;
export const isBareHead = (t) => { const c = cleanHead(t); return c.length < 3 || BARE.test(c) || !/[ء-ي]/.test(c); };

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
    if (!/^PageV/.test(x.t)) heads.push({ t: x.t, i, v: x.v, p: x.p });
  });
  heads.forEach((h, j) => {
    const end = j + 1 < heads.length ? heads[j + 1].i : blocks.length;
    let n = 0, first = "";
    for (let x = h.i; x < end; x++) if (!blocks[x].lvl) { n++; if (!first) first = blocks[x].t; }
    /* فاتحةُ الكلام تُضمّ للعنوان الذي لا يدلّ، لا لغيره */
    const hint = isBareHead(h.t) ? first.replace(/\s+/g, " ").slice(0, 70).trim() : "";
    toc.push([cleanHead(h.t), at[h.i][0], at[h.i][1], h.v, h.p, n, hint]);
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
