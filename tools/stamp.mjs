#!/usr/bin/env node
/* بصمُ الشيفرة والتنسيق بمحتواهما، وبصمُ المحفوظ بالهيكل كلِّه.
 *
 * لماذا: عاملُ الخدمة لا يستطيع أن يخدُم من المحفوظ بلا سؤالٍ إلا إن كان
 * العنوانُ يتغيّر بتغيّر المحتوى. فيُكتب `assets/app.js?v=بصمة` في كل
 * صفحة، ويُكتب في sw.js اسمُ المحفوظ مبصومًا بالصفحات والشيفرة معًا —
 * فيُحفظ كلُّ نشرةٍ وحدَها ويُمحى ما قبلها، ولا تلتقي صفحةٌ جديدة بشيفرةٍ
 * قديمة.
 *
 * يُشغَّل قبل كل نشر:  node tools/stamp.mjs
 * ولا يُكتب شيءٌ إن لم تتغيّر البصمات.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const PAGES = ["index.html", "about.html", "hadith.html", "tafsir.html",
               "rijal.html", "sharh.html", "sira.html", "fiqh.html"];
const ASSETS = ["assets/app.js", "assets/app.css"];

const h8 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 8);
const read = (f) => readFileSync(join(DOCS, f), "utf8");

/* بصمةٌ واحدة للشيفرة والتنسيق معًا: فما تغيّر أحدُهما إلا وتغيّر عنوانُ
   الآخر. وهذا مقصود — هما يُقرآن معًا ويُحفظان معًا. */
const AV = h8(ASSETS.map(read).join("\0"));

/* بصمةُ البيانات: محفوظُها يُسمّى بها، فلا يُسأل الخادمُ عنها إلا إن
   بُنيت من جديد. وتُقرأ الملفّاتُ كلُّها — خطوةُ بناءٍ لا خطوةُ قارئ. */
function walk(dir, out = []) {
  for (const n of readdirSync(dir).sort()) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out); else out.push(f);
  }
  return out;
}
const dataFiles = walk(join(DOCS, "data"));
const dataHash = createHash("sha256");
for (const f of dataFiles) {
  dataHash.update(f.slice(DOCS.length)).update("\0").update(readFileSync(f));
}
const DV = dataHash.digest("hex").slice(0, 8);

let touched = [];
const stamped = {};
for (const p of PAGES) {
  const before = read(p);
  const after = before.replace(
    /(["'])assets\/app\.(js|css)(\?v=[0-9a-f]+)?\1/g,
    (_m, q, ext) => `${q}assets/app.${ext}?v=${AV}${q}`);
  stamped[p] = after;
  if (after !== before) { writeFileSync(join(DOCS, p), after); touched.push(p); }
}

/* بصمةُ المحفوظ: الصفحاتُ بعد بصمها + الشيفرةُ والتنسيق. فأيُّ تغيّرٍ في
   أيّها يُنشئ محفوظًا جديدًا ويمحو ما قبله. */
const V = "turath-" + h8(PAGES.map((p) => stamped[p]).join("\0") + "\0" + AV);

const swPath = join(DOCS, "sw.js");
const sw = readFileSync(swPath, "utf8");
const next = sw
  .replace(/^const V = "[^"]*";$/m, `const V = "${V}";`)
  .replace(/^const AV = "[^"]*";$/m, `const AV = "${AV}";`)
  .replace(/^const DV = "[^"]*";$/m, `const DV = "${DV}";`);
for (const line of [/^const V = "/m, /^const AV = "/m, /^const DV = "/m])
  if (!line.test(sw)) throw new Error("sw.js: لم يُوجد سطرُ البصمة " + line);
if (next !== sw) { writeFileSync(swPath, next); touched.push("sw.js"); }

console.log(`البصمة: assets=${AV}  shell=${V}  data=${DV} (${dataFiles.length} ملفًّا)`);
console.log(touched.length ? "كُتب: " + touched.join(" ") : "لا تغيير");
