#!/usr/bin/env node
/* ═══ صفحاتٌ ثابتة لمحرّكات البحث ═══
 *
 * المشكلة: الموقع كلُّه ثمانيُ صفحات، وما تحتها مساراتُ شَبَكٍ (#/...).
 * والشَبَكُ لا يُرسَل إلى الخادم، فـ«hadith.html#/bukhari/h/100» عند جوجل
 * هو «hadith.html» نفسُه. فمن بحث عن لفظ حديثٍ عندنا لم يجدنا، لأنّه لا
 * يوجد عنوانٌ واحدٌ في الموقع كلِّه يحوي ذلك الحديث.
 *
 * والحلُّ على مستضيفٍ ثابتٍ لا خادمَ له: ملفٌّ لكلّ موضع. فتُبنى هنا:
 *   /hadith/{كتاب}/{رقم}.html   لكلّ حديث، فيه متنُه وأحكامُه وإسنادُه
 *   /hadith/{كتاب}/b{باب}.html  فهرسُ الباب
 *   /hadith/{كتاب}/            أبوابُ الكتاب
 *   /quran/{سورة}/{آية}.html    الآيةُ وتفسيرُها الميسّر وسببُ نزولها
 *   /quran/{سورة}/             آياتُ السورة
 *   وخريطةُ الموقع (sitemap) وrobots.txt
 *
 * وهذه ليست صفحاتِ استدراجٍ تُحيل إلى غيرها: كلُّ صفحةٍ تحمل النصَّ نفسَه
 * بمصدره وموضعه، تُقرأ وحدها بلا جافاسكربت ولا جلبٍ من الشبكة — وهي
 * أسرعُ ما في الموقع. ثمّ فيها بابٌ إلى النسخة التفاعلية لمن أراد.
 *
 * والقواعدُ الحمراء هنا كما هي: لا متنَ بلا مصدر، ولا حكمَ بلا قائل،
 * ولا يُنشأ نصٌّ من عندنا. وما خلا منه المصدرُ يُقال فيه ذلك.
 *
 * المدخلات: docs/data/** ومخبّأٌ لا يُودع في المستودع:
 *   .cache/matn/{كتاب}.json     متونٌ من fawazahmed0/hadith-api
 *   .cache/tafsir/{سورة}.json   التفسير الميسّر من spa5k/tafsir_api
 * يُجلبان بـ: node tools/fetch-seo-cache.mjs
 *
 *   node tools/build-seo.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DOCS = path.join(ROOT, "docs");
const DATA = path.join(DOCS, "data");
const CACHE = path.join(ROOT, ".cache");
const SITE = "https://turath.space";

const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const has = (p) => fs.existsSync(p);
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const AR = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
const ARG = (n) => AR(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "٬"));
/* التشكيلُ يُحذف من الوصف لا من النصّ: النصُّ يُعرض كما ورد، والوصفُ
   سطرٌ في نتيجة البحث يُقرأ مجرّدًا أهونَ. */
const bare = (s) => String(s || "").replace(/[ً-ْٰـۖ-ۭ]/g, "")
  .replace(/[‏‎]/g, "").replace(/\s+/g, " ").trim();
const cut = (s, n) => { const t = bare(s); return t.length <= n ? t : t.slice(0, n).replace(/\s\S*$/, "") + "…"; };
/* فصلُ السند عن المتن — كما في المحرّك سواءً بسواء.
 * ولِمَ هنا؟ لأنّ أوّلَ الحديث إسنادُه: «حدثنا إسماعيل بن أبي أويس، قال
 * حدثني مالك، عن هشام…». ولا أحدَ يبحث في جوجل عن سلسلةِ رواةٍ — إنّما
 * يبحث بلفظ المتن. فلو صُدّر العنوانُ والوصفُ بالإسناد لما طابق سؤالَ
 * أحد. فيُصدَّران بالمتن، والنصُّ في الصفحة كاملٌ كما ورد. */
const DIA = /[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g;
const LINK = /(حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|سمعت|عن\s|قرأت على|وحدثنا|وحدثني|نا\s|ثنا\s)/;
function matnOf(text) {
  const t = String(text || "").replace(/[\u200e\u200f]/g, " ");
  /* في ثلاثة أخماس المدوّنة يُحصر المتنُ بعلامة اقتباس بعد «قال» أو
     «يقول»، وهي أصدقُ من أيّ تخمين. */
  const q = t.indexOf('"');
  if (q >= 0) {
    const inner = t.slice(q + 1).replace(/"[\s\S]*$/, "").trim();
    if (inner.length >= 25) return inner;
  }
  /* وإلّا فبقطع السند عند آخر لفظ تحمّل. وهو تقريبٌ: قد يبقى من آخر
     السند شيءٌ، وقد يُقتطع من أوّل المتن. ولذلك لا يُعتمد عليه إلا في
     العنوان والوصف — والنصُّ في الصفحة كاملٌ كما ورد. */
  const p = t.split("،");
  if (p.length < 2) return t;
  let last = -1;
  for (let i = 0; i < p.length; i++) { if (LINK.test(p[i].replace(DIA, ""))) last = i; else break; }
  if (last < 0 || last >= p.length - 1) return t;
  return p.slice(last + 1).join("،").trim() || t;
}
const gclass = (g) => { const t = bare(g);
  if (/موضوع|منكر|متروك|شاذ|ضعيف/.test(t)) return "bad";
  if (/حسن/.test(t)) return "mid"; if (/صحيح/.test(t)) return "ok"; return "na"; };

let written = 0, bytes = 0;
function put(rel, html) {
  const f = path.join(DOCS, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
  written++; bytes += Buffer.byteLength(html);
}

/* ── بصمةُ الشيفرة، ليُطابق عنوانُ التنسيق ما تبصمه tools/stamp.mjs ── */
const AV = (() => {
  const m = fs.readFileSync(path.join(DOCS, "sw.js"), "utf8").match(/^const AV = "([^"]*)";$/m);
  return m ? m[1] : "";
})();

/* ── الهيكل: صفحةٌ تُقرأ بلا جافاسكربت ──
 * ولا تُحمَّل عليها app.js: صفحةُ هبوطٍ لا تحتاج محرّكَ الموقع كلَّه
 * (٤٠ ك.ب)، وإنّما سطورًا تحفظ السمةَ وتسجّل عاملَ الخدمة فيصير ما بعدها
 * سريعًا. والمساراتُ مطلقة، فلا تنكسر في عمقِ المجلّدات. */
const NAV = `<header class="nav"><div class="navin">
  <a class="brand" href="/"><img src="/assets/mark.svg" width="22" height="22" alt="">تُراث</a>
  <nav class="navl"><a href="/tafsir.html">التفسير</a><a href="/hadith/">الحديث</a><a href="/quran/">القرآن</a><a href="/rijal.html">الرواة</a><a href="/sharh.html">الشروح</a><a href="/about.html">عن المنصّة</a>
  <button class="tgl flat" id="tgl" title="تبديل الوضع الليلي" aria-label="تبديل الوضع الليلي">
  <svg viewBox="0 0 24 24" fill="none"><path d="M20 13.4A8.2 8.2 0 1110.6 4a6.6 6.6 0 009.4 9.4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button></nav>
</div></header>`;

const FOOT = `<footer class="foot"><div class="footb">
<a class="srcbtn" href="/about.html">من نحن · مصادرنا</a>
<a class="srcbtn" href="/about.html#give">أبوابُ خير</a>
<a class="srcbtn" href="/hadith/">كل الأحاديث</a>
<a class="srcbtn" href="/quran/">كل الآيات</a></div>
<p>النصوص كما وردت في مصادرها. تُراث تنقل ولا ترجّح ولا تُفتي.<br>
بناه فردٌ واحد: <a href="https://www.instagram.com/ghassan.shk/" target="_blank" rel="noopener">غسّان</a>.</p></footer>`;

const TAIL = `<script src="/assets/seo.js?v=${AV}" defer></script>`;

function crumbHTML(items) {
  return `<nav class="crumb">` + items.map((x, i) =>
    (i ? '<span class="sep">›</span>' : "") +
    (x.href ? `<a href="${esc(x.href)}">${esc(x.t)}</a>` : `<span>${esc(x.t)}</span>`)).join("") + `</nav>`;
}
function crumbLD(items) {
  return { "@type": "BreadcrumbList", itemListElement: items.map((x, i) => ({
    "@type": "ListItem", position: i + 1, name: bare(x.t),
    ...(x.href ? { item: SITE + x.href } : {}) })) };
}

function page({ url, title, desc, crumbs, body, ld }) {
  /* حارسٌ: سبعةٌ وثلاثون ألف صفحةٍ كُتبت مرّةً بلا جسم لأنّ «body» لم
     يُمرَّر، ولم يبِن ذلك إلا بفتحِ صفحةٍ في المتصفّح. فلا تُكتب بعد
     اليوم صفحةٌ بلا جسم. */
  if (!body || body.length < 80) throw new Error(`صفحةٌ بلا جسم: ${url}`);
  const graph = [crumbLD(crumbs)].concat(ld ? [ld] : []);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}">
<meta property="og:url" content="${SITE}${url}"><meta property="og:image" content="${SITE}/assets/icon-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Reem+Kufi:wght@400;500;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/assets/app.css?v=${AV}">
<link rel="icon" href="/assets/mark.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#eef2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#17191c" media="(prefers-color-scheme: dark)">
<script>(function(){var t=localStorage.getItem("turath-theme");if(t)document.documentElement.setAttribute("data-theme",t);})();</script>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>
</head><body>
${NAV}
<div class="shell"><main class="main wide">
${crumbHTML(crumbs)}
${body}
</main></div>
${FOOT}
${TAIL}
</body></html>`;
}

/* ═══ المدخلات ═══ */
const books = rd(path.join(DATA, "books.json"));
const surahs = rd(path.join(DATA, "surahs.json"));
const quran = rd(path.join(DATA, "quran.json"));
const tafsirs = rd(path.join(DATA, "tafsirs.json"));
const gdefs = rd(path.join(DATA, "grades.json"));
const noteIdx = has(path.join(DATA, "note", "index.json")) ? rd(path.join(DATA, "note", "index.json")) : {};
const gdefKeys = Object.keys(gdefs).sort((a, b) => b.length - a.length);
const gdef = (g) => { for (const k of gdefKeys) if (String(g).indexOf(k) >= 0) return gdefs[k]; return ""; };

const rijal = {};
for (let i = 0; i < 24; i++) {
  const f = path.join(DATA, "rijal", `b${i}.json`);
  if (has(f)) Object.assign(rijal, rd(f));
}

const missing = [];
for (const k of Object.keys(books)) if (!has(path.join(CACHE, "matn", `${k}.json`))) missing.push(k);
if (missing.length) {
  console.error("ينقص المخبّأ: " + missing.join(" ") + "\nشغّل: node tools/fetch-seo-cache.mjs");
  process.exit(1);
}

/* ═══ صفحاتُ الحديث ═══ */
const urls = { hadith: [], quran: [] };
let noMatn = 0, withGrade = 0;

for (const k of Object.keys(books)) {
  const b = books[k];
  const nav = rd(path.join(DATA, "h", k, "nav.json"));
  const takhrij = has(path.join(DATA, "h", k, "takhrij.json")) ? rd(path.join(DATA, "h", k, "takhrij.json")) : {};
  const notes = new Set(noteIdx[k] || []);
  const secCache = {};
  const secOf = (n) => { if (!secCache[n]) {
    const f = path.join(DATA, "h", k, `${n}.json`);
    secCache[n] = has(f) ? rd(f) : {}; } return secCache[n]; };
  const matn = {};
  for (const h of rd(path.join(CACHE, "matn", `${k}.json`)).hadiths) matn[h.hadithnumber] = h;
  const secName = {}; for (const s of b.sections) secName[s.n] = s.ar;
  const nums = nav.map((r) => r[0]);
  const bySec = {};
  for (const [num, sec] of nav) (bySec[sec] = bySec[sec] || []).push(num);

  for (let i = 0; i < nav.length; i++) {
    const [num, sec] = nav[i];
    const h = matn[num] || {};
    const text = String(h.text || "").trim();
    if (!text) noMatn++;
    const row = secOf(sec)[num] || [[], []];
    const grades = row[0] || [], chain = row[1] || [];
    if (grades.length) withGrade++;
    const tak = takhrij[k + ":" + num] || [];
    const ref = h.reference && h.reference.book != null
      ? `${AR(h.reference.book)}:${AR(h.reference.hadith)}` : "";
    const prev = i > 0 ? nums[i - 1] : null, next = i < nums.length - 1 ? nums[i + 1] : null;
    const url = `/hadith/${k}/${num}.html`;
    const sn = secName[sec] || "";

    const disp = text ? matnOf(text) : "";
    const title = disp ? `${cut(disp, 58)} — ${b.ar} ${AR(num)} · تُراث`
                       : `${b.ar} — حديث ${AR(num)} · تُراث`;
    const gl = grades.length ? ` حكمه: ${bare(grades[0][1])} (${bare(grades[0][0])}).` : "";
    const desc = text ? `${cut(disp, 150)}${gl} ${b.ar} حديث ${AR(num)}${sn ? "، " + bare(sn) : ""}.`
                      : `${b.ar} حديث ${AR(num)}${sn ? "، " + bare(sn) : ""} — لم يرد نصُّ هذا الحديث في المصدر المعتمد للمتون.`;

    const names = chain.map(([kind, v]) => kind === "i"
      ? (rijal[v] ? { n: rijal[v][0], g: rijal[v][1], href: `/rijal.html#/r/${encodeURIComponent(v)}` } : null)
      : { n: v, g: "", href: `/rijal.html#/r/${encodeURIComponent("t:" + v)}` }).filter(Boolean);

    const body =
`<div class="ph"><div class="k">${esc(b.ar)}${sn ? `<span class="sep">•</span>${esc(sn)}` : ""}</div>
<h1>حديث ${AR(num)}${disp ? ` — ${esc(cut(disp, 48))}` : ""}</h1>
<div class="m">${esc(b.author)}${ref ? `<span class="sep">•</span>الموضع <bdi>${ref}</bdi>` : ""}</div></div>
${grades.length ? `<div class="pane gband"><span class="gbig ${gclass(grades[0][1])}">${esc(grades[0][1])}</span>
<span class="gdef">${esc(gdef(grades[0][1]) || "حكمٌ منقول عن أهل الحديث.")}<br><b>${esc(grades[0][0])}</b></span></div>`
  : `<div class="pane gband"><span class="gbig na">بلا حكم مرفق</span><span class="gdef">لم يرد حكمٌ منسوبٌ إلى قائله لهذا الحديث في مصادرنا، ولا يُنسب إلى عالمٍ ما لم يقله.</span></div>`}
${text ? `<div class="pane matn"><span>${esc(text)}</span></div>`
  : `<div class="pane msg">لم يرد نصُّ هذا الحديث في المصدر المعتمد للمتون.
     <div class="note" style="margin:.7rem 0 0">رقمُه وبابُه وموضعُه المطبوع ثابتةٌ كما ترى، وإنّما خلا المصدرُ من متنه. ولا نملؤه من عندنا ولا نسكت عنه.</div></div>`}
${grades.length ? `<div class="sh"><h2>أحكام المحدّثين</h2><span class="cnt"><bdi>${AR(grades.length)}</bdi></span><span class="ln"></span></div>
<div class="pane"><table class="t"><tr><th>المحدِّث</th><th>الحكم</th><th>معناه</th></tr>
${grades.map((g) => `<tr><td>${esc(g[0])}</td><td><span class="g ${gclass(g[1])}">${esc(g[1])}</span></td><td style="color:var(--mut);font-size:.9rem">${esc(gdef(g[1]) || "…")}</td></tr>`).join("")}
</table></div><div class="note">الأحكام كما وردت عن قائليها. المنصة تنقل ولا ترجّح بينها.</div>` : ""}
${names.length ? `<div class="sh"><h2>الإسناد</h2><span class="cnt"><bdi>${AR(names.length)}</bdi></span><span class="ln"></span></div>
<div class="pane pad">${names.map((n, j) => `<div class="node${j === names.length - 1 ? " last" : ""}"><span class="dot">${AR(j + 1)}</span><span class="nm"><span><span class="rl">${j === 0 ? "شيخ المصنِّف" : (j === names.length - 1 ? "الصحابي" : "راوٍ")}</span><a href="${esc(n.href)}">${esc(n.n)}</a></span>${n.g ? `<span class="sub">${esc(n.g)}</span>` : ""}</span></div>`).join("")}</div>` : ""}
${tak.length ? `<div class="sh"><h2>أخرجه أيضًا</h2><span class="cnt"><bdi>${AR(tak.length)}</bdi></span><span class="ln"></span></div>
<div class="tiles">${tak.map((r) => { const [bb, nn] = r.split(":");
  return `<a class="tile" href="/hadith/${bb}/${nn}.html"><span class="n">${AR(nn)}</span><span class="t"><b>${esc((books[bb] || {}).ar || bb)}</b><span>حديث ${AR(nn)}</span></span></a>`; }).join("")}</div>
<div class="note">مواضع ورود الحديث نفسه في كتبٍ أخرى، مستخرَجة بمطابقة المتن.</div>` : ""}
<div class="acts"><a class="act" href="/hadith.html#/${k}/h/${num}">افتحه في تُراث — الشرح والبحث وبقيّة التبويبات ←</a>${notes.has(num) ? `<a class="act" href="/hadith.html#/${k}/h/${num}">شرحُ هذا الحديث</a>` : ""}</div>
<div class="pager">${prev ? `<a href="/hadith/${k}/${prev}.html">‹ حديث ${AR(prev)}</a>` : `<span class="off">‹</span>`}
<span class="mid"><bdi>حديث ${AR(num)} من ${ARG(b.total)}</bdi></span>
${next ? `<a href="/hadith/${k}/${next}.html">حديث ${AR(next)} ›</a>` : `<span class="off">›</span>`}</div>
<div class="note">المصدر: ${esc(b.ar)}${sn ? `، ${esc(sn)}` : ""}، حديث رقم <bdi>${AR(num)}</bdi>${ref ? `، الموضع المطبوع <bdi>${ref}</bdi>` : ""}. النصّ كما ورد في المصدر بلا تعديل.</div>`;

    put(url.slice(1), page({
      url, title, desc, body,
      crumbs: [{ t: "تُراث", href: "/" }, { t: "كتب الحديث", href: "/hadith/" },
               { t: b.ar, href: `/hadith/${k}/` },
               ...(sn ? [{ t: sn, href: `/hadith/${k}/b${sec}.html` }] : []),
               { t: `حديث ${AR(num)}` }],
      ld: { "@type": "Article", headline: cut(disp || `${b.ar} حديث ${num}`, 110), inLanguage: "ar",
            isPartOf: { "@type": "Book", name: b.ar, author: { "@type": "Person", name: b.author } },
            url: SITE + url },
    }));
    urls.hadith.push(url);
  }

  /* فهرسُ كلّ باب، مقسَّمًا. وبابٌ فيه ألفا حديثٍ كان صفحةً من ١٩١ ك.ب
     لا تُقرأ ولا تُزحف، فحُدَّت الصفحةُ بمئةٍ وخمسين. */
  const PER = 150;
  for (const s of b.sections) {
    const list = bySec[s.n] || [];
    if (!list.length) continue;
    const pages = Math.ceil(list.length / PER);
    for (let pg = 1; pg <= pages; pg++) {
      const slice = list.slice((pg - 1) * PER, pg * PER);
      const url = `/hadith/${k}/b${s.n}${pg > 1 ? "-" + pg : ""}.html`;
      const pgt = pages > 1 ? ` — ${AR(pg)}/${AR(pages)}` : "";
      put(url.slice(1), page({
        url,
        title: `${s.ar}${pgt} — ${b.ar} · تُراث`,
        desc: `${bare(s.ar)} من ${bare(b.ar)}: ${AR(list.length)} حديثًا بأرقامها المعتمدة وأحكام المحدّثين عليها.`,
        crumbs: [{ t: "تُراث", href: "/" }, { t: "كتب الحديث", href: "/hadith/" },
                 { t: b.ar, href: `/hadith/${k}/` }, { t: s.ar + pgt }],
        body: `<div class="ph"><div class="k">${esc(b.ar)}</div><h1>${esc(s.ar)}</h1>
<div class="m"><bdi>${AR(list.length)} حديثًا</bdi>${pages > 1 ? `<span class="sep">•</span><bdi>صفحة ${AR(pg)} من ${AR(pages)}</bdi>` : ""}</div></div>
<div class="tiles">${slice.map((n) => {
  const t = (matn[n] && matn[n].text) ? cut(matnOf(matn[n].text), 70) : `حديث ${AR(n)}`;
  return `<a class="tile wrap" href="/hadith/${k}/${n}.html"><span class="n">${AR(n)}</span><span class="t"><b>${esc(t)}</b></span></a>`;
}).join("")}</div>
${pages > 1 ? `<div class="pager">${pg > 1 ? `<a href="/hadith/${k}/b${s.n}${pg > 2 ? "-" + (pg - 1) : ""}.html">‹ السابق</a>` : `<span class="off">‹</span>`}
<span class="mid"><bdi>صفحة ${AR(pg)} من ${AR(pages)}</bdi></span>
${pg < pages ? `<a href="/hadith/${k}/b${s.n}-${pg + 1}.html">التالي ›</a>` : `<span class="off">›</span>`}</div>` : ""}
<div class="acts"><a class="act" href="/hadith.html#/${k}/${s.n}/1">افتح الباب في تُراث ←</a></div>`,
      }));
      urls.hadith.push(url);
    }
  }

  /* أبوابُ الكتاب */
  const burl = `/hadith/${k}/`;
  put(`hadith/${k}/index.html`, page({
    url: burl,
    title: `${b.ar} — أبوابه وأحاديثه · تُراث`,
    desc: `${bare(b.ar)} ${bare(b.author)}: ${ARG(b.total)} حديثًا في ${AR(b.sections.length)} كتابًا وبابًا، بأرقامها المعتمدة وأحكام المحدّثين عليها وأسانيدها.`,
    crumbs: [{ t: "تُراث", href: "/" }, { t: "كتب الحديث", href: "/hadith/" }, { t: b.ar }],
    body: `<div class="ph"><div class="k">${esc(b.author)}</div><h1>${esc(b.ar)}</h1>
<div class="m"><bdi>${ARG(b.total)} حديثًا</bdi><span class="sep">•</span><bdi>${AR(b.sections.length)} كتابًا وبابًا</bdi></div></div>
<div class="tiles">${b.sections.filter((s) => (bySec[s.n] || []).length).map((s) =>
  `<a class="tile wrap" href="/hadith/${k}/b${s.n}.html"><span class="n">${AR(s.n)}</span><span class="t"><b>${esc(s.ar)}</b><span><bdi>${AR((bySec[s.n] || []).length)} حديثًا</bdi></span></span></a>`).join("")}</div>
<div class="acts"><a class="act" href="/hadith.html#/${k}">افتح الكتاب في تُراث ←</a></div>`,
  }));
  urls.hadith.push(burl);
  console.log(`  ${k}: ${nav.length} حديثًا`);
}

/* فهرسُ كتب الحديث */
put("hadith/index.html", page({
  url: "/hadith/",
  title: "كتب الحديث — الصحيحان والسنن والموطأ · تُراث",
  desc: `${ARG(Object.values(books).reduce((a, b) => a + b.total, 0))} حديثًا من ${AR(Object.keys(books).length)} كتبٍ معتمدة، لكلّ حديث متنُه وأحكام المحدّثين عليه منسوبةً إلى قائليها وإسنادُه ومواضعُه في بقيّة الكتب.`,
  crumbs: [{ t: "تُراث", href: "/" }, { t: "كتب الحديث" }],
  body: `<div class="ph"><div class="k">السنّة النبوية</div><h1>كتب الحديث</h1>
<div class="m"><bdi>${AR(Object.keys(books).length)} كتابًا</bdi><span class="sep">•</span><bdi>${ARG(Object.values(books).reduce((a, b) => a + b.total, 0))} حديثًا</bdi></div></div>
<div class="bento">${Object.keys(books).map((k) => { const b = books[k];
  return `<a class="cell b3 card" href="/hadith/${k}/"><div class="ch"><h3>${esc(b.ar)}</h3><span class="cn"><bdi>${ARG(b.total)}</bdi><small>حديثًا</small></span></div><p class="au">${esc(b.author)}</p><div class="meta"><bdi>${AR(b.sections.length)} كتابًا وبابًا</bdi><span class="go">تصفَّح ←</span></div></a>`; }).join("")}</div>
<div class="acts"><a class="act" href="/hadith.html">ابحث في المتون ←</a></div>`,
}));
urls.hadith.push("/hadith/");

/* ═══ صفحاتُ القرآن ═══ */
let at = 0, withAsbab = 0;
const other = tafsirs.filter((t) => t.slug !== "ar-tafsir-muyassar");
for (const s of surahs) {
  const tf = has(path.join(CACHE, "tafsir", `${s.n}.json`)) ? rd(path.join(CACHE, "tafsir", `${s.n}.json`)) : [];
  const asb = has(path.join(DATA, "asbab", `${s.n}.json`)) ? rd(path.join(DATA, "asbab", `${s.n}.json`)) : {};
  const first = at;
  for (let a = 1; a <= s.count; a++) {
    const text = quran[at++] || "";
    const t = (tf[a - 1] && tf[a - 1].text) ? String(tf[a - 1].text).trim() : "";
    const sb = asb[`${s.n}:${a}`] || [];
    if (sb.length) withAsbab++;
    const url = `/quran/${s.n}/${a}.html`;
    const nm = `سورة ${bare(s.ar)}`;
    const title = `${cut(text, 52)} — ${nm} ${AR(a)} · تُراث`;
    const desc = `${cut(text, 120)} — تفسير الآية ${AR(a)} من ${nm}${sb.length ? " وسبب نزولها" : ""}، و${AR(tafsirs.length)} تفسيرًا لها.`;
    const body =
`<div class="ph"><div class="k">القرآن الكريم<span class="sep">•</span>${esc(s.rev)}</div>
<h1>${esc(nm)} — الآية ${AR(a)}</h1>
<div class="m"><bdi>${AR(s.n)}:${AR(a)}</bdi><span class="sep">•</span><bdi>${AR(s.count)} آية</bdi></div></div>
<div class="pane ayah"><span class="tx">${esc(text)}<span class="an">${AR(a)}</span></span></div>
${sb.length ? `<div class="sh"><h2>سبب نزولها</h2><span class="cnt"><bdi>${AR(sb.length)}</bdi></span><span class="ln"></span></div>
<p class="evlead">من <b>أسباب النزول</b> للواحدي (ت٤٦٨هـ)، وُصل بالآية بمطابقة اللفظ الذي اقتبسه بنصّ المصحف. والنصّ كما ورد بجزئه وصفحته.</p>
${sb.map((x) => `<div class="pane pad prose"><p class="para">${esc(x.t)}</p>${x.v != null ? `<div class="note">أسباب النزول للواحدي، ج${AR(x.v)} ص${AR(x.p)}.</div>` : ""}</div>`).join("")}` : ""}
${t ? `<div class="sh"><h2>التفسير الميسّر</h2><span class="ln"></span></div>
<div class="pane pad prose">${bare(t).split("\n").filter(Boolean).map((p) => `<p class="para">${esc(p)}</p>`).join("") || `<p class="para">${esc(t)}</p>`}</div>
<div class="note">التفسير الميسّر، مجمع الملك فهد لطباعة المصحف الشريف. النصّ كما ورد.</div>`
  : `<div class="pane msg">لم يرد لهذه الآية نصٌّ في التفسير الميسّر عند مصدرنا.</div>`}
<div class="sh"><h2>بقيّة التفاسير</h2><span class="cnt"><bdi>${AR(other.length)}</bdi></span><span class="ln"></span></div>
<div class="pane pad"><div class="lnk">${other.map((x) =>
  `<a href="/tafsir.html#/${s.n}/${x.slug}/${a}"><span>${esc(x.ar)}</span><span class="n">↗</span></a>`).join("")}</div></div>
<div class="pager">${a > 1 ? `<a href="/quran/${s.n}/${a - 1}.html">‹ الآية ${AR(a - 1)}</a>` : `<span class="off">‹</span>`}
<span class="mid"><bdi>الآية ${AR(a)} من ${AR(s.count)}</bdi></span>
${a < s.count ? `<a href="/quran/${s.n}/${a + 1}.html">الآية ${AR(a + 1)} ›</a>` : `<span class="off">›</span>`}</div>`;
    put(url.slice(1), page({
      url, title, desc,
      crumbs: [{ t: "تُراث", href: "/" }, { t: "القرآن", href: "/quran/" },
               { t: nm, href: `/quran/${s.n}/` }, { t: `الآية ${AR(a)}` }],
      body,
      ld: { "@type": "Article", headline: cut(text, 110), inLanguage: "ar", url: SITE + url,
            isPartOf: { "@type": "Book", name: "القرآن الكريم" } },
    }));
    urls.quran.push(url);
  }
  const surl = `/quran/${s.n}/`;
  put(`quran/${s.n}/index.html`, page({
    url: surl,
    title: `سورة ${bare(s.ar)} — آياتها وتفسيرها · تُراث`,
    desc: `سورة ${bare(s.ar)} ${bare(s.rev)}، ${AR(s.count)} آية. لكلّ آية نصُّها وتفسيرها وسببُ نزولها حيث ورد، و${AR(tafsirs.length)} تفسيرًا لها.`,
    crumbs: [{ t: "تُراث", href: "/" }, { t: "القرآن", href: "/quran/" }, { t: `سورة ${bare(s.ar)}` }],
    body: `<div class="ph"><div class="k">القرآن الكريم<span class="sep">•</span>${esc(s.rev)}</div>
<h1>سورة ${esc(s.ar)}</h1><div class="m"><bdi>${AR(s.count)} آية</bdi></div></div>
<div class="tiles">${Array.from({ length: s.count }, (_, i) => i + 1).map((a) =>
  `<a class="tile wrap" href="/quran/${s.n}/${a}.html"><span class="n">${AR(a)}</span><span class="t"><b>${esc(cut(quran[first + a - 1] || "", 64))}</b></span></a>`).join("")}</div>
<div class="acts"><a class="act" href="/tafsir.html#/${s.n}">افتح السورة في تُراث ←</a></div>`,
  }));
  urls.quran.push(surl);
}
put("quran/index.html", page({
  url: "/quran/",
  title: "القرآن الكريم — فهرس السور وتفسيرها · تُراث",
  desc: `١١٤ سورة، ٦٬٢٣٦ آية. لكلّ آية نصُّها وتفسيرها الميسّر وسببُ نزولها حيث ورد، و${AR(tafsirs.length)} تفسيرًا لها جنبًا إلى جنب.`,
  crumbs: [{ t: "تُراث", href: "/" }, { t: "القرآن" }],
  body: `<div class="ph"><div class="k">القرآن الكريم</div><h1>فهرس السور</h1>
<div class="m"><bdi>١١٤ سورة</bdi><span class="sep">•</span><bdi>٦٬٢٣٦ آية</bdi></div></div>
<div class="tiles">${surahs.map((s) =>
  `<a class="tile wrap" href="/quran/${s.n}/"><span class="n">${AR(s.n)}</span><span class="t"><b>سورة ${esc(s.ar)}</b><span>${esc(s.rev)} <span class="sep">•</span> <bdi>${AR(s.count)} آية</bdi></span></span></a>`).join("")}</div>
<div class="acts"><a class="act" href="/tafsir.html">افتح التفسير في تُراث ←</a></div>`,
}));
urls.quran.push("/quran/");

/* ═══ خريطةُ الموقع ═══ */
const MAIN = ["/", "/hadith.html", "/tafsir.html", "/rijal.html", "/sharh.html",
              "/sira.html", "/fiqh.html", "/about.html"];
const day = new Date().toISOString().slice(0, 10);
const sm = (list, pri) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${list.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${day}</lastmod><priority>${pri(u)}</priority></url>`).join("\n")}
</urlset>`;
fs.writeFileSync(path.join(DOCS, "sitemap-main.xml"), sm(MAIN, (u) => u === "/" ? "1.0" : "0.8"));
fs.writeFileSync(path.join(DOCS, "sitemap-hadith.xml"), sm(urls.hadith, (u) => u.endsWith("/") ? "0.7" : "0.6"));
fs.writeFileSync(path.join(DOCS, "sitemap-quran.xml"), sm(urls.quran, (u) => u.endsWith("/") ? "0.7" : "0.6"));
fs.writeFileSync(path.join(DOCS, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["main", "hadith", "quran"].map((n) => `<sitemap><loc>${SITE}/sitemap-${n}.xml</loc><lastmod>${day}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`);

/* البياناتُ لا تُزحف: مئةٌ وتسعون ميغابايت من JSON تستنزف ميزانيةَ الزحف
   ولا يُعرض منها شيءٌ في نتيجة. والصفحاتُ هي المقصودة. */
fs.writeFileSync(path.join(DOCS, "robots.txt"),
`User-agent: *
Allow: /
Disallow: /data/
Disallow: /sw.js

Sitemap: ${SITE}/sitemap.xml
`);

const total = urls.hadith.length + urls.quran.length + MAIN.length;
console.log(`\nكُتب ${written} ملفًّا (${Math.round(bytes / 1048576)} م.ب)`);
console.log(`خريطةُ الموقع: ${total} عنوانًا — ${urls.hadith.length} حديثًا وأبوابًا، ${urls.quran.length} آيةً وسورًا، ${MAIN.length} صفحاتٍ أصلية`);
console.log(`أحاديثُ بلا متنٍ في المصدر: ${noMatn} · أحاديثُ لها حكمٌ منسوب: ${withGrade} · آياتٌ لها سببُ نزول: ${withAsbab}`);
