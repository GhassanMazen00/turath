/* عاملُ الخدمة: يجعل الموقعَ يُفتح من الجهاز لا من الشبكة في كل مرّة.
 *
 * لماذا: أكثرُ ما يُنزَّل هنا لا يتغيّر — نصوصُ الكتب وفهارسُها وأرقامُ
 * الأحاديث. فإن حُفظت عند القارئ صار فتحُ الصفحة الثانية بلا انتظار،
 * وصار الموقعُ يعمل وهو في مصعدٍ أو طائرة. وهذا أيضًا ما يجعله يُضاف إلى
 * الشاشة الرئيسية فيُفتح كالتطبيق.
 *
 * والسياسةُ بحسب ما يُطلب:
 *   صفحةٌ (HTML)   — الشبكةُ أوّلًا: إن نُشرت نسخةٌ جديدة رآها القارئ فورًا،
 *                    وإن انقطعت الشبكةُ فُتحت المحفوظة.
 *   شيفرةٌ وتنسيق  — الشبكةُ أوّلًا كذلك، ولسببٍ لا يُتهاون فيه: كانت
 *                    «المحفوظُ أوّلًا» فبقي app.js القديمُ يُخدَم بعد نشر
 *                    الجديد — لا فتحةً واحدة بل دائمًا، لأنّ التجديدَ في
 *                    الخلفية كان يُعيد كتابةَ المحفوظ بنسخةٍ من ذاكرة
 *                    المتصفّح لا من الخادم. فالقارئُ يُحدَّث الموقعُ عنده
 *                    ولا يرى منه شيئًا. والشيفرةُ مع صفحةٍ أحدثَ منها بابُ
 *                    أعطالٍ صامتة، فلا تُخدَم إلا من الشبكة ما دامت تعمل.
 *   بيانات        — المحفوظُ أوّلًا ثمّ يُجدَّد في الخلفية: لا انتظار،
 *                    والتجديدُ يظهر في الفتحة التالية. وهي لا تتغيّر إلا
 *                    ببناءٍ جديد، فتأخُّرُ فتحةٍ لا يضرّ.
 * وما ليس من هذا الأصل (خطوطُ جوجل ونصوصُ الكتب من مدوّناتها) لا يُعترض:
 * هي مثبَّتةٌ على مراجعَ لا تتغيّر، والمتصفّحُ يحفظها بنفسه.
 *
 * ويُحدُّ المحفوظُ بعددٍ فلا يمتلئ جهازُ القارئ من تصفّحٍ طويل.
 */
/* يُرفَع الرقمُ كلّما تغيّرت سياسةُ الحفظ، فتُمحى محفوظاتُ النسخة السابقة */
const V = "turath-v2";
const SHELL = V + "-shell";     // صفحاتٌ وأصولٌ ثابتة
const RUN = V + "-run";         // بياناتٌ تُجلب عند الحاجة
const RUN_MAX = 400;

const PRECACHE = [
  "./", "./index.html", "./about.html", "./hadith.html", "./tafsir.html",
  "./rijal.html", "./sharh.html", "./sira.html", "./fiqh.html",
  "./assets/app.css", "./assets/app.js", "./assets/mark.svg",
  "./assets/icon-192.png", "./assets/icon-512.png", "./assets/apple-touch-icon.png",
  "./manifest.webmanifest",
  "./data/books.json", "./data/surahs.json", "./data/tafsirs.json",
  "./data/stats.json", "./data/grades.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    /* واحدًا واحدًا: لو سقط ملفٌّ واحد بـaddAll سقط التثبيتُ كلُّه */
    await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})));
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

/* المحفوظُ أوّلًا، والتجديدُ في الخلفية. و«no-cache» لازمةٌ في التجديد:
   بدونها يُجيب المتصفّحُ من ذاكرته هو، فيُعاد حفظُ القديم مكانَ القديم
   ولا يصل الجديدُ أبدًا. بها يُسأل الخادمُ فيردّ ٣٠٤ إن لم يتغيّر. */
async function swr(req, name, max) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  const net = fetch(req, { cache: "no-cache" }).then((res) => {
    if (res && res.ok) c.put(req, res.clone()).then(() => trim(name, max));
    return res;
  }).catch(() => null);
  return hit || (await net) || new Response("", { status: 504 });
}

/* الشبكةُ أوّلًا، والمحفوظُ شبكةَ نجاةٍ عند الانقطاع */
async function netFirst(req, name) {
  try {
    const res = await fetch(req, { cache: "no-cache" });
    if (res && res.ok) (await caches.open(name)).put(req, res.clone());
    return res;
  } catch (err) {
    return (await caches.match(req)) || new Response("", { status: 504 });
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") return;

  /* صفحةٌ يفتحها القارئ: الشبكةُ أوّلًا، والمحفوظُ عند انقطاعها */
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: "no-cache" });
        if (res && res.ok) (await caches.open(SHELL)).put(req, res.clone());
        return res;
      } catch (err) {
        return (await caches.match(req)) || (await caches.match("./index.html")) ||
          new Response("لا اتصال، ولم تُحفظ هذه الصفحة بعد.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  /* ما ليس من هذا الأصل — خطوطُ جوجل ونصوصُ الكتب من مدوّناتها — يُترك
     للمتصفّح كما هو. جُرّب اعتراضُه فأضرّ ولم ينفع: المكسبُ لا شيء (هذه
     الملفّاتُ مثبَّتةٌ على مراجعَ لا تتغيّر، فالمتصفّح يحفظها بترويسات
     المصدر نفسه)، والضررُ أنّ عاملَ الخدمة يُحوّل انقطاعَ الشبكة إلى ردٍّ
     صناعيّ ٥٠٤، فيلتبس الخطأُ على ما فوقه. فلا يُعترض. */
  if (url.origin !== self.location.origin) return;

  /* الشيفرةُ والتنسيقُ من الشبكة، والبياناتُ من المحفوظ ثمّ تُجدَّد */
  if (/\/assets\/.*\.(js|css)$/.test(url.pathname)) { e.respondWith(netFirst(req, SHELL)); return; }
  if (/\/assets\//.test(url.pathname)) { e.respondWith(swr(req, SHELL, RUN_MAX)); return; }
  if (/\/data\//.test(url.pathname)) e.respondWith(swr(req, RUN, RUN_MAX));
});
