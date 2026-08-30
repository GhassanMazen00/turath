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
  let s = String(t || "")
    .replace(/\[|\]/g, " ").replace(/\(¬?\d+\)/g, " ")
    .replace(/\bPARATEXT\s*\|?/gi, " ").replace(/\b(CHECK|AUTO)\b/gi, " ")
    .replace(/\s+/g, " ").trim();
  /* يُكرَّر حتى يستقرّ: العنوانُ يحمل أكثرَ من علامةٍ في صدره
     («1 ( 2002 2003 باب بيان…» في المنهاج)، ونزعُ واحدةٍ يكشف التي تحتها. */
  let prev;
  do {
    prev = s;
    s = s.replace(/^\d+\s*[-–]\s*/, "")
      .replace(/^\d+\s*/, "").replace(/^[(]\s*/, "").replace(/^قوله\s+/, "")
      /* مرقاة المفاتيح تُحيط العنوان برقم عمقه من الطرفين:
         «1 ( كتاب الإيمان ) 1». الأوّل يُنزع بما سبق، والثاني كان يبقى
         فيُخزَّن العنوان «كتاب الإيمان ) 1». وهو من المدوّنة لا من الكتاب. */
      .replace(/\s*\)\s*\d+\s*$/, "")
      .replace(/^[\s*|:،.-]+/, "").replace(/[\s*|:،.-]+$/, "")
      .trim();
    /* القوسُ الطرفيّ لا يُنزع إلا إن كان زائدًا لا نظيرَ له: «( جديدا )»
       قوسٌ تامٌّ من المحقّق يُترك، و«باب … )» ذيلُ قوسٍ فُتح على العنوان
       كلِّه فيُنزع. وكان يُنزع دائمًا — فإذا أُعيد التنظيف على عنوانٍ
       نُظّف (وهو عملُ mark-toc) أكل قوسًا صحيحًا: «( جديدا )» ← «( جديدا». */
    const cl = (s.match(/\)/g) || []).length, op = (s.match(/\(/g) || []).length;
    if (cl > op && /\)\s*$/.test(s)) s = s.replace(/\s*\)\s*$/, "");
    else if (op > cl && /^\(/.test(s)) s = s.replace(/^\(\s*/, "");
    s = tidyParens(s);
  } while (s !== prev);
  return s;
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
/* «مسألة» و«فرع» و«فرق» من هذا الباب أيضًا: علاماتُ تقسيمٍ لا تراجم.
   وكتب الفقه المشروحة مبنيّةٌ عليها — في المنتقى للباجي وحده ٣٬٥٩٤ عنوانًا
   اسمُه «مسألة» و١٬٣٣٠ اسمُه «فرع» — فلو تُركت لخرج فهرسٌ يقول «مسألة»
   ثلاثةَ آلاف مرّة. فتُضمّ إليها فاتحةُ كلامها كما يُصنع بـ«باب» و«فصل». */
const BARE = /^(باب|فصل|كتاب|أبواب|جماع|تتمة|مسألة|مسئلة|فرع|فرق)$/;
export const isBareHead = (t) => { const c = cleanHead(t); return c.length < 3 || BARE.test(c) || !/[ء-ي]/.test(c); };

/* القرارُ التأسيسي: لا نصَّ ممسوحًا ضوئيًّا. ومدوّنةُ OpenITI تُعلن ذلك في
   بطاقة كل نسخة (90#VERS#ISSUES### : UNCORRECTED_OCR)، فيُقرأ الإعلانُ
   ويُرفض الكتابُ إن كان ممسوحًا — بدل أن نُصدّق ونحن لا ندري. وإن غابت
   البطاقةُ قيل ذلك ولم يُسكَت عنه. */
async function checkNotOCR(b) {
  let yml;
  /* بطاقةُ النسخة تُسمّى باسم الملفّ بلا لاحقة .mARkdown */
  try { yml = await get(b.url.replace(/\.mARkdown$/, "") + ".yml"); }
  catch (e) { console.log(`   ⚠ ${b.ar}: لا بطاقةَ للنسخة، فلم يُتحقّق من المسح الضوئي.`); return; }
  if (/UNCORRECTED_OCR/i.test(yml))
    throw new Error(`${b.ar}: النسخةُ ممسوحةٌ ضوئيًّا (UNCORRECTED_OCR) — تُرفض، والتمس نسخةً مرقونة.`);
}

export async function buildBook(b, outDir, { minBlocks = 300 } = {}) {
  process.stdout.write(`\n${b.ar} — جلب… `);
  await checkNotOCR(b);
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
  /* عنوانٌ ذهب كلُّه بالتنظيف، ولا فقرةَ تحته فلا فاتحةَ تقوم مقامه، ولا
     عددَ يُعرف به: تِيلةٌ تُعرض بلا اسمٍ وتُفتح على لا شيء. لا يحمل شيئًا
     فيُطرح — ولا يضيع نصّ: الأجزاء كما هي، وما كان يقع في مداه (وهو صفر
     فقرة) يعود إلى الباب الذي قبله. */
  const blank = toc.filter((t) => !t[0] && !t[6] && !t[5]).length;
  const toc2 = toc.filter((t) => t[0] || t[6] || t[5]);

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
  fs.writeFileSync(path.join(dir, "toc.json"), JSON.stringify(toc2), "utf8");

  /* «on» و«onAr»: الكتابُ الذي يشرحه هذا الشرح. كانا يُمرَّران ولا يُكتبان،
     فتُصدِر صفحةُ الشرح زرًّا إلى «hadith.html#/undefined». */
  const info = { slug: b.slug, ar: b.ar, full: b.full, author: b.author, died: b.died,
    on: b.on, onAr: b.onAr, short: b.short,
    note: b.note, madhhab: b.madhhab || "", kind: b.kind || "",
    vols: +(meta.BookVOLS || 0) || Math.max(...blocks.map((x) => x.v)),
    paras: blocks.length, chunks: chunks.length,
    chars: blocks.reduce((a, x) => a + x.t.length, 0), src: b.url };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(info), "utf8");

  console.log("تمّ.");
  console.log(`   ${info.paras.toLocaleString()} فقرة · ${info.chunks} جزءًا · ${toc2.length} عنوانًا · ${info.vols} مجلّدًا` +
              (blank ? ` (طُرح ${blank} عنوانًا خاليًا)` : ""));
  console.log(`   الفهرس ${kb(zlib.gzipSync(JSON.stringify(idx)).length)} مضغوطًا · ${dropped} كلمة شائعة مستبعَدة`);
  return { info, blocks, at };
}
