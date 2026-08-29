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

  /* جمع الأسطر: سطرٌ يبدأ بـ # يفتح فقرة، و~~ يواصلها.
   *
   * والعنوانُ لا يواصَل: سطرُ العنوان في هذه المدوّنة لا يجاوز ثمانيةً
   * وتسعين حرفًا في الكتب كلِّها، وما تلاه من ~~ فهو نصُّ ما تحته لا تتمّةُ
   * اسمه. وكان يُضمّ إليه فتخرج عناوينُ في آلاف الحروف: «باب» يبتلع صفحةً
   * من فتح الباري، وعنوانٌ في سيرة ابن هشام يبتلع قصيدةً بأكملها. فيُفصل
   * ما بعده فقرةً مستقلّة — ولا يضيع حرف.
   *
   * وسطرٌ مُعلَّمٌ عنوانًا وفيه «%» ليس عنوانًا: «%» فاصلُ شطرَي البيت،
   * فالسطرُ شعرٌ عُلّم خطأً في المصدر (ستّةُ مواضع في ابن هشام).
   */
  const blocks = [];
  let cur = null;
  const push = () => { if (cur) blocks.push(cur); cur = null; };
  for (const lnRaw of body.split("\n")) {
    const ln = lnRaw.replace(/\r$/, "");
    if (!ln.trim() || ln.startsWith("#META#")) continue;
    if (ln.startsWith("~~")) {
      if (cur && !cur.level) cur.parts.push(ln.slice(2));
      else { push(); cur = { level: 0, parts: [ln.slice(2)] }; }
      continue;
    }
    push();
    const h = ln.match(/^(#+)\s*(\|+)?\s*(.*)$/);
    const txt = h ? h[3] : ln;
    const isHead = !!(h && h[2]) && !txt.includes("%");
    cur = { level: isHead ? h[2].length : 0, parts: [txt] };
  }
  push();

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
    /* «&» في طبعة دلائل النبوة علامةُ انتهاء العنوان، تقع في آخر أسطر
       «###» وبعد علامات الصفحات. ليست من النصّ، فتُزال كما تُزال أخواتُها.
       ولا يستعملها غيرُ هذا الكتاب ممّا نشحنه. */
    t = t.replace(RE_PAGE, " ").replace(RE_MS, " ")
         .replace(/[%$@&]+/g, " ")
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
