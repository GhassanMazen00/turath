/* ضمُّ كتب حديثٍ ليست في مصدر المتون الأوّل.
 *
 * لماذا مصدرٌ ثانٍ: مصدرُنا الأوّل (fawazahmed0/hadith-api) لا يُخرج إلا
 * عشرةَ كتب، وهي التي عندنا كلُّها. وستّةٌ مشهورةٌ تنقصنا — الدارمي وبلوغ
 * المرام ورياض الصالحين ومشكاة المصابيح والأدب المفرد والشمائل — وهي في
 * AhmedBaset/hadith-json مهيكلةً مدقّقة. فتُؤخذ منه، مثبَّتًا على وسمٍ لا
 * على فرعٍ متحرّك، كما نفعل في كل مصدر.
 *
 * ومسند أحمد متروك عمدًا: في هذا المصدر ١٬٣٧٤ حديثًا من نحو سبعةٍ وعشرين
 * ألفًا (ثمانيةُ فصولٍ من واحدٍ وثلاثين — والنقصُ عند المصدر نفسه، مذكورٌ
 * في وثيقته). وعرضُ خمسةٍ في المئة تحت اسم «مسند أحمد» يوهم القارئَ أنّه
 * أمام المسند، وليس. فيُترك حتى يوجد مصدرٌ تامّ.
 *
 * وصفُّ الفهرس هو صفُّ الكتب العشرة نفسه: [رقم، باب، متنٌ مطبَّع، أحكام،
 * سلسلة إسناد]. والأخيران فارغان هنا لا تقصيرًا بل صدقًا: لا أحكام في
 * هذا المصدر ولا أسانيد مفهرسة، ولا تُختلق. فإن وُجد مصدرٌ لها لاحقًا
 * مُلئت بالرقم كما يفعل tools/fetch-hadith.mjs.
 *
 * والمتنُ يُشحن عندنا كما ورد بالتشكيل في docs/data/txt/{كتاب}/{باب}.json
 * لأنّ واجهة المتون الأولى لا تعرف هذه الكتب. والفهرسُ مطبَّعٌ للمطابقة،
 * والعرضُ من المشحون — كما في بقية الكتب سواء.
 *
 *   node tools/fetch-hadith-books.mjs            تحقّقٌ وتقرير، بلا كتابة
 *   node tools/fetch-hadith-books.mjs --write    يكتب إن سلمت المقابلة
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const IDX = path.join(DATA, "idx");
const TXT = path.join(DATA, "txt");
const WRITE = process.argv.includes("--write");

const REF = "v1.2.0";
const SRC = (p) => `https://raw.githubusercontent.com/AhmedBaset/hadith-json/${REF}/db/by_book/${p}.json`;

/* الأسماءُ والمؤلّفون من عندنا لا من المصدر: فيه «الإمام الكاتب التبريزي»
   ترجمةً مقلوبة لـ«الخطيب»، و«عبد الرحمن بن عبد الله» مقلوبًا في الدارمي.
   والمتونُ تُنقل كما وردت ولا تُمسّ؛ وأمّا اسمُ المؤلّف فخطؤه خطأٌ يُصحَّح
   لا نصٌّ يُصان. */
const BOOKS = [
  { slug: "darimi", path: "the_9_books/darimi",
    ar: "سنن الدارمي", author: "الإمام عبد الله بن عبد الرحمن الدارمي",
    note: "تاسعُ الكتب التسعة، ومن أقدمها تصنيفًا، رتّبه على الأبواب كالسنن." },
  { slug: "riyad", path: "other_books/riyad_assalihin",
    ar: "رياض الصالحين", author: "الإمام يحيى بن شرف النووي", isnad: false,
    note: "منتخَبٌ من الصحيح في الآداب والأخلاق، أشهرُ كتب الترغيب." },
  { slug: "mishkat", path: "other_books/mishkat_almasabih",
    ar: "مشكاة المصابيح", author: "الخطيب التبريزي", isnad: false,
    note: "جامعٌ لأحاديث المصابيح للبغوي، زاد عليها وبيّن مواضعها من الكتب." },
  { slug: "bulugh", path: "other_books/bulugh_almaram",
    ar: "بلوغ المرام", author: "الحافظ ابن حجر العسقلاني", isnad: false,
    note: "أحاديث الأحكام مختصرةً، يذكر مع كلّ حديثٍ من أخرجه." },
  { slug: "adab", path: "other_books/aladab_almufrad",
    ar: "الأدب المفرد", author: "الإمام محمد بن إسماعيل البخاري",
    note: "أفرده البخاري لأحاديث الأخلاق والبرّ وصلة الرحم." },
  { slug: "shamail", path: "other_books/shamail_muhammadiyah",
    ar: "الشمائل المحمدية", author: "الإمام محمد بن عيسى الترمذي",
    note: "في صفته ﷺ: خَلقِه وخُلقِه وهديه في يومه وليلته." },
];

/* isnad:false — كتبٌ منتخَبة تنسب الحديث إلى صحابيّه وتذكر من أخرجه، ولا
   تسوق سلسلة إسناده. وفصلُ السند عن المتن آلةٌ بُنيت لكتبٍ تسوقه، فإن
   أُجريت على هذه أكلت أوّل المتن: في بلوغ المرام حديثٌ صار متنُه المعروض
   «والنسائي (1/50)…» — وهو ذيلُ تخريج المحقّق. فيُقال للآلة: لا تفصل. */

/* ترتيبُ العرض: هو ترتيبُ المفاتيح في books.json. تُوضع الكتب الجديدة في
   موضعها من الترتيب المتعارَف — الصحيحان، فالسنن الأربعة، فالموطّأ
   والدارمي، فالمنتخَبات، فالأربعينات — ولا يُغيَّر موضعُ كتابٍ قائم. */
const ORDER = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah",
               "malik", "darimi", "riyad", "mishkat", "bulugh", "adab", "shamail",
               "nawawi", "qudsi", "dehlawi"];

const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const norm = (s) => (s || "").normalize("NFKC")
  .replace(/[ً-ْٰـۖ-ۭ]/g, "")
  .replace(/[أإآٱ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و")
  .replace(/[^ء-ي ]/g, " ").replace(/\s+/g, " ").trim();

async function get(url) {
  for (let i = 1; i <= 4; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
    catch (e) { if (i === 4) throw new Error(`تعذّر جلب ${url} — ${e.message}`);
      await new Promise((r) => setTimeout(r, 600 * 2 ** i)); }
  }
}

const books = rd(path.join(DATA, "books.json"));
/* ما سبق أن كتبه هذا السكربت — يجوز أن يُعاد بناؤه. وما عداه لا يُمسّ. */
const MINE = new Set(fs.existsSync(path.join(TXT, "books.json"))
  ? rd(path.join(TXT, "books.json")) : []);
const built = [], blockers = [];

for (const b of BOOKS) {
  process.stdout.write(`${b.ar} … `);
  const src = await get(SRC(b.path));
  const hs = src.hadiths || [], chs = src.chapters || [];

  const bad = [];
  /* كتابٌ قائمٌ بهذا المفتاح؟ لا يُدهَس أبدًا: الكتب العشرة مبنيّةٌ على
     مصدرٍ آخر وترقيمٍ آخر، والخلطُ بينهما يُفسد التخريج والأحكام. */
  if (books[b.slug] && !MINE.has(b.slug))
    bad.push(`المفتاح «${b.slug}» مأخوذٌ لكتابٍ من مصدرٍ آخر`);
  if (!hs.length) bad.push("لا أحاديث في المصدر");
  if (!chs.length) bad.push("لا أبواب في المصدر");

  const byCh = new Map();
  const rows = [], txt = new Map();
  let empty = 0, dupes = 0, orphan = 0;
  const seen = new Set();
  for (const h of hs) {
    const num = +h.idInBook, sec = +h.chapterId;
    const text = String(h.arabic || "");
    if (seen.has(num)) { dupes++; continue; }
    seen.add(num);
    if (!text.trim()) empty++;
    if (!chs.some((c) => +c.id === sec)) orphan++;
    byCh.set(sec, (byCh.get(sec) || 0) + 1);
    rows.push([num, sec, norm(text), [], []]);
    if (!txt.has(sec)) txt.set(sec, []);
    /* الشكلُ شكلُ واجهة المتون الأولى، فتقرؤه آلةُ العرض بلا تفريع */
    txt.get(sec).push({ hadithnumber: num, text });
  }
  rows.sort((a, b2) => a[0] - b2[0]);

  /* اسمُ الباب كما يُعرض: التطويلُ («كتـــــاب اللباس») والشرطةُ في صدره
     («-باب ما جاء…») من رقن الطبعة لا من الكتاب، فتُزالان. ولا يُمسّ حرفٌ
     من الاسم نفسه ولا من متنٍ. خمسةُ أبوابٍ من ١٩٩ هي التي تُصلَح. */
  const secName = (t) => String(t || "").replace(/ـ/g, "")
    .replace(/^[\s\-–—]+/, "").replace(/\s+/g, " ").trim();

  /* الأبوابُ الخالية تُطرح: تيلةٌ تُفتح على لا شيءٍ عيبٌ قديم عولج في
     كتب الفقه، فلا يُعاد هنا. ويُقال كم طُرح. */
  const sections = chs.filter((c) => byCh.get(+c.id))
    .map((c) => ({ n: +c.id, ar: secName(c.arabic),
                   en: String(c.english || "").trim(), count: byCh.get(+c.id) }));
  const dropped = chs.length - sections.length;
  const noName = sections.filter((s) => !s.ar).length;

  if (dupes) bad.push(`تكرّر ${dupes} رقمًا`);
  if (orphan) bad.push(`${orphan} حديثًا بلا بابٍ معروف`);
  if (empty) bad.push(`${empty} حديثًا بلا متن`);
  if (noName) bad.push(`${noName} بابًا بلا اسم`);
  if (rows.length !== hs.length - dupes) bad.push("عددُ الصفوف لا يطابق المصدر");
  if (bad.length) blockers.push(`${b.ar}: ${bad.join(" · ")}`);

  const info = { ar: b.ar, author: b.author, total: rows.length,
                 ...(b.isnad === false ? { isnad: false } : {}), sections };
  built.push({ ...b, info, rows, txt, dropped });
  console.log(`${rows.length} حديثًا · ${sections.length} بابًا` +
    (dropped ? ` (طُرح ${dropped} بابًا خاليًا)` : "") +
    (bad.length ? "  ✕ " + bad.join(" · ") : "  ✓"));
}

const tot = built.reduce((a, x) => a + x.rows.length, 0);
/* ما في المدوّنة من غير هذه الكتب — وإلّا عُدّت مرّتين عند إعادة البناء */
const was = Object.keys(books).filter((k) => !MINE.has(k))
  .reduce((a, k) => a + books[k].total, 0);
console.log("\n" + "─".repeat(60));
console.log(`${built.length} كتبٍ جديدة · ${tot.toLocaleString()} حديثًا`);
console.log(`المدوّنة: ${was.toLocaleString()} ← ${(was + tot).toLocaleString()}`);

if (blockers.length) {
  console.error("\nرُفضت الكتابة:");
  blockers.forEach((b) => console.error("  ✕ " + b));
  process.exit(1);
}
if (!WRITE) { console.log("\nتحقّقٌ فقط. للكتابة: node tools/fetch-hadith-books.mjs --write"); process.exit(0); }

for (const b of built) {
  fs.writeFileSync(path.join(IDX, `${b.slug}.json`), JSON.stringify(b.rows), "utf8");
  const dir = path.join(TXT, b.slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [sec, list] of b.txt)
    fs.writeFileSync(path.join(dir, `${sec}.json`), JSON.stringify({ hadiths: list }), "utf8");
  books[b.slug] = b.info;
}
/* الكتبُ القائمة تُنسخ كما هي ولا يُمسّ منها حرف؛ وإنّما يُعاد الترتيب */
const out = {};
for (const k of ORDER) if (books[k]) out[k] = books[k];
for (const k of Object.keys(books)) if (!(k in out)) out[k] = books[k];
fs.writeFileSync(path.join(DATA, "books.json"), JSON.stringify(out), "utf8");

/* الكتبُ التي يُقرأ متنُها من عندنا لا من واجهة المتون — تعرفها آلةُ العرض */
fs.writeFileSync(path.join(DATA, "txt", "books.json"),
  JSON.stringify(built.map((b) => b.slug)), "utf8");
console.log(`\nكُتبت ${built.length} كتبٍ، والترتيبُ ${Object.keys(out).join("، ")}.`);
