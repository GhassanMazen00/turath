/* تُراث — طبقة الجلب والتوجيه.
   المصادر (مثبَّتة على مراجع محددة، لا على فروع متحركة):
     القرآن   fawazahmed0/quran-api
     التفسير  spa5k/tafsir_api
     الحديث   fawazahmed0/hadith-api  ← الترقيم المعتمد المطبوع
   يُجرَّب jsDelivr أولًا ثم raw.githubusercontent احتياطًا. */
const REF = {
  quran: "6be8e17f2a0c13b1f33b1c3057f73cb28d5e848e",
  tafsir: "05d5ba765d77c6ca6d43c30f0e1c273deb137454",
  hadith: "df57907be35291c91ad6a6691180e22ca9920784",
};
const HOSTS = [
  (r, p) => `https://cdn.jsdelivr.net/gh/${r}@${p.ref}/${p.path}`,
  (r, p) => `https://raw.githubusercontent.com/${r}/${p.ref}/${p.path}`,
];
const cache = new Map();

async function grab(repo, ref, path) {
  const key = repo + "/" + ref + "/" + path;
  if (cache.has(key)) return cache.get(key);
  let err;
  for (const h of HOSTS) {
    try {
      const res = await fetch(h(repo, { ref, path }));
      if (!res.ok) { err = new Error("HTTP " + res.status); continue; }
      const data = await res.json();
      cache.set(key, data);
      return data;
    } catch (e) { err = e; }
  }
  throw err || new Error("تعذّر الجلب");
}

const api = {
  local: (f) => fetch("data/" + f).then(r => r.json()),
  quran: (s) => grab("fawazahmed0/quran-api", REF.quran,
                     `editions/ara-quransimple/${s}.json`),
  ayah: (s, a) => grab("fawazahmed0/quran-api", REF.quran,
                     `editions/ara-quransimple/${s}/${a}.json`),
  tafsir: (ed, s, a) => grab("spa5k/tafsir_api", REF.tafsir,
                     `tafsir/${ed}/${s}/${a}.json`),
  hadith: (book, n) => grab("fawazahmed0/hadith-api", REF.hadith,
                     `editions/ara-${book}/${n}.json`),
};

/* ——— أدوات ——— */
const $ = (s, r = document) => r.querySelector(s);
const el = (h) => { const d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstElementChild; };
const esc = (s) => (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const AR = (n) => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const paras = (t) => (t || "").split("\n").map(x => x.trim()).filter(Boolean)
  .map(x => `<p class="para">${esc(x)}</p>`).join("") || '<p class="para">—</p>';

function loading(node, label) {
  node.innerHTML = `<div class="msg"><span class="spin"></span> ${esc(label || "جارٍ الجلب…")}</div>`;
}
function failed(node, e) {
  node.innerHTML = `<div class="msg">تعذّر جلب البيانات من المصدر.<br>
    <span style="font-size:.78rem">${esc(String(e && e.message || e))}</span><br>
    <a href="#" onclick="location.reload();return false">إعادة المحاولة</a></div>`;
}

/* فصل السند عن المتن — للعرض فقط.
   الإسناد سلسلة مقاطع تحمل ألفاظ التحمّل (حدثنا/أخبرنا/عن…) مفصولة بفواصل؛
   نمشي عليها من أول النص حتى أول مقطع لا يحمل لفظ تحمّل، فهو مبدأ المتن.
   النص لا يُعدَّل: السند + المتن = النص الأصلي حرفيًا. */
const DIA=/[\u064B-\u0652\u0670\u0640]/g;
const bare=(x)=>x.replace(DIA,"");
const LINK=/(حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|سمعت|عن\s|قرأت على|قال حدثنا|وحدثنا|وحدثني)/;
function splitIsnad(text){
  const parts=text.split("،");
  if(parts.length<2) return {isnad:null,matn:text};
  let last=-1;
  for(let i=0;i<parts.length;i++){
    if(LINK.test(bare(parts[i]))) last=i; else break;
  }
  if(last<0||last>=parts.length-1) return {isnad:null,matn:text};
  const isnad=parts.slice(0,last+1).join("،")+"،";
  const matn=parts.slice(last+1).join("،").trim();
  if(!matn) return {isnad:null,matn:text};
  return {isnad:isnad.trim(),matn:matn};
}

function crumbs(parts) {
  return `<nav class="crumb">` + parts.map((p, i) =>
    (i ? '<span class="sep">›</span>' : "") +
    (p.href ? `<a href="${p.href}">${esc(p.t)}</a>` : `<span>${esc(p.t)}</span>`)
  ).join("") + `</nav>`;
}
