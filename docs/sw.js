/* عاملُ الخدمة: يجعل الموقعَ يُفتح من الجهاز لا من الشبكة في كل مرّة.
 *
 * لماذا: أكثرُ ما يُنزَّل هنا لا يتغيّر — نصوصُ الكتب وفهارسُها وأرقامُ
 * الأحاديث. فإن حُفظت عند القارئ صار فتحُ الصفحة الثانية بلا انتظار،
 * وصار الموقعُ يعمل وهو في مصعدٍ أو طائرة. وهذا أيضًا ما يجعله يُضاف إلى
 * الشاشة الرئيسية فيُفتح كالتطبيق.
 *
 * ── الحفظُ والتجديد: كيف حُلَّت العقدة ──
 * الصفحةُ والشيفرةُ زوجٌ لا يُفرَّق: صفحةٌ جديدة مع شيفرةٍ قديمة بابُ
 * أعطالٍ صامتة. وكانت السياسةُ «الشبكةُ أوّلًا» للصفحة وللشيفرة حفظًا
 * لهذا الزواج، فسلِم الزواجُ وضاع السبق: كلُّ ضغطةٍ تنتظر ثلاثَ رحلاتٍ
 * إلى الخادم — الصفحةُ ثمّ التنسيقُ ثمّ الشيفرة — قبل أن يُرسم شيء.
 *
 * والحلُّ أن يُبصَم عنوانُ الشيفرة بمحتواها (`app.js?v=بصمة`، يكتبها
 * tools/stamp.mjs)، ويُبصَم اسمُ محفوظِ الهيكل بالصفحات والشيفرة معًا،
 * واسمُ محفوظِ البيانات ببصمة البيانات.
 * فإذا نُشر جديدٌ تغيّر الاسمُ، فحُفظ الجديدُ كلُّه معًا في محفوظٍ آخر،
 * ومُحي القديمُ كلُّه معًا. فلا يلتقي نصفٌ من هذا بنصفٍ من ذاك أبدًا،
 * ولا يُسأل الخادمُ في الضغطات.
 *
 * وثمنُه المعلوم: الفتحةُ الأولى بعد النشر تُرى بالنسخة السابقة كاملةً
 * متّسقة، ثمّ يتولّى العاملُ الجديدُ فما بعدها جديد. وهذا أقلُّ ضررًا من
 * انتظارٍ في كلّ ضغطة.
 *
 * والسياسةُ بحسب ما يُطلب:
 *   صفحةٌ (HTML)   — المحفوظُ أوّلًا، ويُجدَّد في الخلفية للفتحة التالية.
 *   شيفرةٌ وتنسيق  — المحفوظُ أوّلًا بلا سؤال: العنوانُ مبصومٌ بالمحتوى،
 *                    فما تغيّر محتواه إلا وتغيّر عنوانُه.
 *   بيانات        — المحفوظُ أوّلًا بلا سؤال كذلك، ومحفوظُها مبصومٌ ببصمة
 *                    البيانات كلِّها: فإن بُنيت من جديد تغيّر الاسمُ،
 *                    وإلّا فلا يُسأل الخادمُ عنها أبدًا.
 * وما ليس من هذا الأصل (خطوطُ جوجل ونصوصُ الكتب من مدوّناتها) لا يُعترض:
 * هي مثبَّتةٌ على مراجعَ لا تتغيّر، والمتصفّحُ يحفظها بنفسه.
 *
 * ويُحدُّ المحفوظُ بعددٍ فلا يمتلئ جهازُ القارئ من تصفّحٍ طويل.
 */
/* هذه السطورُ يكتبها tools/stamp.mjs من محتوى الملفّات — لا تُحرَّر يدًا */
const V = "turath-e09778e1";
const AV = "bc7c4fea";
const DV = "6e487403";

const SHELL = V + "-shell";       // صفحاتٌ وشيفرةٌ وتنسيق: زوجٌ لا يُفرَّق
const RUN = "turath-" + DV + "-run";   // بياناتٌ تُجلب عند الحاجة
const RUN_MAX = 500;

const PAGES = [
  "./", "./index.html", "./about.html", "./hadith.html", "./tafsir.html",
  "./rijal.html", "./sharh.html", "./sira.html", "./fiqh.html",
];
const PRECACHE = PAGES.concat([
  "./assets/app.css?v=" + AV, "./assets/app.js?v=" + AV,
  "./assets/mark.svg",
  "./assets/icon-192.png", "./assets/icon-512.png", "./assets/apple-touch-icon.png",
  "./manifest.webmanifest",
]);
/* بياناتٌ تحتاجها كلُّ صفحة، تُحفظ مع الهيكل فلا تُنتظر في أول ضغطة */
const PREDATA = [
  "./data/books.json", "./data/surahs.json", "./data/tafsirs.json",
  "./data/stats.json", "./data/grades.json", "./data/sharh/books.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    /* واحدًا واحدًا: لو سقط ملفٌّ واحد بـaddAll سقط التثبيتُ كلُّه */
    await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})));
    const r = await caches.open(RUN);
    await Promise.all(PREDATA.map((u) => r.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, RUN]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* حدُّ الحجم: يُحذف الأقدمُ حين يتجاوز العددُ حدَّه */
async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

/* جلبٌ وحفظ. و«no-cache» لازمةٌ فيه: بدونها يُجيب المتصفّحُ من ذاكرته
   هو، فيُعاد حفظُ القديم مكانَ القديم ولا يصل الجديدُ أبدًا. */
function pull(req, name, max) {
  return fetch(req, { cache: "no-cache" }).then(async (res) => {
    if (res && res.ok) { (await caches.open(name)).put(req, res.clone()); if (max) trim(name, max); }
    return res;
  }).catch(() => null);
}

/* المحفوظُ أوّلًا، ولا سؤالَ بعده.
 *
 * ولِمَ لا يُجدَّد في الخلفية؟ جُرّب فأضرّ: كلُّ محفوظٍ يُسأل عنه الخادمُ
 * في كلّ فتحة، فصار فتحُ بابٍ من فتح الباري ينتظر ٣٥٣ ك.ب تُنزَّل ثانيةً
 * وهي عنده — وعاملُ الخدمة خيطٌ واحد، فسيلُ التجديد يزحم ما يُسلَّم إلى
 * الصفحة فعلًا. وغِنى التجديد أنّ الأسماء مبصومة: إن تغيّرت الشيفرةُ أو
 * صفحةٌ أو ملفٌّ من البيانات تغيّر اسمُ المحفوظ، فحُفظ الجديدُ في محفوظٍ
 * آخر ومُحي القديمُ عند التنشيط. فلا يُسأل الخادمُ إلا عمّا لم يُحفظ. */
async function cacheFirst(req, name, { max = 0, ignoreSearch = false } = {}) {
  const c = await caches.open(name);
  const hit = await c.match(req, { ignoreSearch });
  if (hit) return hit;
  const res = await pull(req, name, max);
  return res || new Response("", { status: 504 });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") return;

  /* صفحةٌ يفتحها القارئ: من المحفوظ بلا انتظار ولا سؤال.
     والمطابقةُ بلا استعلام: «index.html?x» صفحةٌ واحدة.
     وصفحاتُ /hadith/ و/quran/ الثابتة ثلاثةٌ وأربعون ألفًا، فلا تُخلط
     بالهيكل: تُحفظ في محفوظ البيانات المحدودِ عددُه، فلا يمتلئ الجهازُ
     من تصفّحٍ طويل. */
  if (req.mode === "navigate") {
    const deep = /^\/(hadith|quran)\//.test(url.pathname);
    e.respondWith((async () => {
      const res = deep ? await cacheFirst(req, RUN, { max: RUN_MAX, ignoreSearch: true })
                       : await cacheFirst(req, SHELL, { ignoreSearch: true });
      if (res.status !== 504) return res;
      return (await caches.match("./index.html")) ||
        new Response("لا اتصال، ولم تُحفظ هذه الصفحة بعد.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
    })());
    return;
  }

  /* ما ليس من هذا الأصل — خطوطُ جوجل ونصوصُ الكتب من مدوّناتها — يُترك
     للمتصفّح كما هو. جُرّب اعتراضُه فأضرّ ولم ينفع: المكسبُ لا شيء (هذه
     الملفّاتُ مثبَّتةٌ على مراجعَ لا تتغيّر، فالمتصفّح يحفظها بترويسات
     المصدر نفسه)، والضررُ أنّ عاملَ الخدمة يُحوّل انقطاعَ الشبكة إلى ردٍّ
     صناعيّ ٥٠٤، فيلتبس الخطأُ على ما فوقه. فلا يُعترض. */
  if (url.origin !== self.location.origin) return;

  if (/\/assets\//.test(url.pathname)) { e.respondWith(cacheFirst(req, SHELL)); return; }
  if (/\/data\//.test(url.pathname)) e.respondWith(cacheFirst(req, RUN, { max: RUN_MAX }));
});
