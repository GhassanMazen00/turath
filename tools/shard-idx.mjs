#!/usr/bin/env node
/* تقطيعُ فهرس البحث في المتون.
 *
 * لماذا: كان فهرسُ كلّ كتابٍ ملفًّا واحدًا — ١٫٠٩ م.ب مضغوطةً في البخاري
 * وحده، و٤٫٩ م.ب للكتب العشرة. وأوّلُ بحثٍ في المتون يُنزّلها كلَّها قبل
 * أن يرى القارئُ نتيجةً واحدة. والبحثُ يقف عند ستّين موضعًا، فأكثرُ ما
 * يُنزَّل لا يُقرأ منه حرف.
 *
 * فيُقطَّع الفهرسُ قطعًا صغيرة تُجلب واحدةً بعد واحدة ويُمسح ما جاء منها،
 * فإذا تمّ العددُ وقف الجلب. وتُحذف من الصفوف سلسلةُ الرواة: البحثُ لا
 * يقرؤها، وصفحةُ الحديث تأخذها من h/{كتاب}/{باب}.json.
 *
 * وهو تحويلٌ محلّيّ لا يُعيد بناءً: يُقرأ الموجود ويُقطَّع ويُتحقَّق أنّ
 * المجموع هو الأصلُ نفسه بلا عمودِ السلسلة.
 *
 *   node tools/shard-idx.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IDX = join(ROOT, "docs", "data", "idx");
const TARGET = 400 * 1024;   // حجمُ القطعة قبل الضغط

const books = readdirSync(IDX).filter((f) => f.endsWith(".json") && f !== "shards.json");
if (!books.length) { console.log("لا فهارس مفردة — يبدو أنّه قُطّع من قبل"); process.exit(0); }

const counts = {};
for (const file of books) {
  const slug = file.replace(/\.json$/, "");
  const rows = JSON.parse(readFileSync(join(IDX, file), "utf8"));
  /* الصفُّ: رقمٌ وبابٌ ونصٌّ مطبَّعٌ وأحكام. والأحكامُ تبقى لأنّها تُعرض
     مع النتيجة، وهي جزءٌ من أربعين من حجم الفهرس. */
  const slim = rows.map((r) => [r[0], r[1], r[2], r[3] || []]);

  const shards = [];
  let cur = [], size = 2;
  for (const r of slim) {
    const n = JSON.stringify(r).length + 1;
    if (cur.length && size + n > TARGET) { shards.push(cur); cur = []; size = 2; }
    cur.push(r); size += n;
  }
  if (cur.length) shards.push(cur);

  /* التحقّق قبل الكتابة: المجموعُ هو الأصلُ نفسه بلا عمود السلسلة */
  const back = [].concat(...shards);
  if (JSON.stringify(back) !== JSON.stringify(slim))
    throw new Error(slug + ": القطعُ لا يُعيد الأصل");
  if (back.length !== rows.length) throw new Error(slug + ": عددُ الصفوف تغيّر");
  for (let i = 0; i < rows.length; i++)
    if (back[i][0] !== rows[i][0] || back[i][2] !== rows[i][2])
      throw new Error(slug + ": صفٌّ اختلف عند " + i);

  const dir = join(IDX, slug);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  shards.forEach((s, i) => writeFileSync(join(dir, `s${i}.json`), JSON.stringify(s)));
  counts[slug] = shards.length;
  rmSync(join(IDX, file));
  console.log(`${slug.padEnd(12)} ${String(rows.length).padStart(6)} صفًّا → ${shards.length} قطعة`);
}
writeFileSync(join(IDX, "shards.json"), JSON.stringify(counts));
console.log("shards.json: " + JSON.stringify(counts));
