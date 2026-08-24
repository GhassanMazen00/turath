/* تفكيك نصّ OpenITI mARkdown إلى فقرات موصولة بمواضعها المطبوعة.
 *
 * لا يُعدَّل النصّ ولا يُلخَّص: تُزال علامات الترميز فقط (الميلستون، وعلامات
 * الصفحات بعد التقاط الجزء والصفحة منها)، ويبقى الكلام كما ورد.
 */

const RE_PAGE = /PageV(\d+)P(\d+)/g;
const RE_MS = /\bms\d+\b/g;

export function parseOpenITI(raw) {
  const i = raw.indexOf("#META#Header#End#");
  const head = i < 0 ? raw : raw.slice(0, i);
  const body = i < 0 ? raw : raw.slice(i + "#META#Header#End#".length);

  const meta = {};
  for (const m of head.matchAll(/^#META#\s*([\d.]+)\.(\w+)\s*::\s*(.*)$/gm)) {
    meta[m[2]] = m[3].trim();
  }

  // جمع الأسطر: سطرٌ يبدأ بـ # يفتح فقرة، و~~ يواصلها
  const blocks = [];
  let cur = null;
  for (const lnRaw of body.split("\n")) {
    const ln = lnRaw.replace(/\r$/, "");
    if (!ln.trim() || ln.startsWith("#META#")) continue;
    if (ln.startsWith("~~")) {
      if (cur) cur.parts.push(ln.slice(2));
      continue;
    }
    if (cur) blocks.push(cur);
    const h = ln.match(/^(#+)\s*(\|+)?\s*(.*)$/);
    cur = { level: h && h[2] ? h[2].length : 0, parts: [h ? h[3] : ln] };
  }
  if (cur) blocks.push(cur);

  // تتبّع الجزء والصفحة: العلامة تقع في آخر الصفحة، فما قبلها منها
  const out = [];
  let vol = null, page = null;
  for (const b of blocks) {
    let t = b.parts.join(" ");
    const pages = [...t.matchAll(RE_PAGE)];
    const startVol = vol, startPage = page;
    if (pages.length) {
      const last = pages[pages.length - 1];
      vol = +last[1];
      page = +last[2];
    }
    t = t.replace(RE_PAGE, " ").replace(RE_MS, " ")
         .replace(/[%$@]+/g, " ")
         .replace(/\s+/g, " ").trim();
    if (!t) continue;
    out.push({
      lvl: b.level,
      t,
      v: startVol ?? vol ?? 1,
      p: startPage ?? page ?? 1,
    });
  }
  return { meta, blocks: out };
}

/* تطبيع عربي للمطابقة فقط — نفس قواعد الموقع */
export const norm = (s) =>
  (s || "")
    .replace(/[ً-ْٰـ۟]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
