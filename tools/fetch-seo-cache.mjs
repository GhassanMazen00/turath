#!/usr/bin/env node
/* مخبّأُ بناء الصفحات الثابتة: متونُ الأحاديث والتفسير الميسّر.
 *
 * لا يُودع في المستودع (.cache مستثناة): هو مدخلُ بناءٍ لا بيانات موقع.
 * والمراجعُ مثبَّتة على ما يستعمله الموقع نفسه، فما يُبنى هو ما يُعرض.
 *
 *   node tools/fetch-seo-cache.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache");
const REF = { hadith: "df57907be35291c91ad6a6691180e22ca9920784",
              tafsir: "05d5ba765d77c6ca6d43c30f0e1c273deb137454" };
const books = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, "docs/data/books.json"), "utf8")));

async function get(url, out) {
  if (fs.existsSync(out)) return "محفوظ";
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const t = await r.text();
      JSON.parse(t);                       // لا يُحفظ ما لا يُقرأ
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, t);
      return Math.round(t.length / 1024) + " ك.ب";
    } catch (e) {
      if (i === 4) throw new Error(`تعذّر ${url} — ${e.message}`);
      await new Promise((r) => setTimeout(r, 600 * 2 ** i));
    }
  }
}

for (const b of books) {
  const s = await get(`https://raw.githubusercontent.com/fawazahmed0/hadith-api/${REF.hadith}/editions/ara-${b}.json`,
    path.join(CACHE, "matn", `${b}.json`));
  console.log(`متن ${b}: ${s}`);
}
for (let n = 1; n <= 114; n++) {
  await get(`https://raw.githubusercontent.com/spa5k/tafsir_api/${REF.tafsir}/tafsir/ar-tafsir-muyassar/${n}.json`,
    path.join(CACHE, "tafsir", `${n}.json`));
}
console.log("التفسير الميسّر: ١١٤ سورة");
console.log("تمّ. ثمّ: node tools/build-seo.mjs");
