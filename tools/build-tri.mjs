#!/usr/bin/env node
/* دليلُ الثلاثيّات: أيُّ قطعةٍ من فهرس المتون يُحتمل أن تحوي اللفظ.
 *
 * لماذا: البحثُ يقف عند ستّين موضعًا، فاللفظُ الشائع يُوجد في أوّل قطعة.
 * وأمّا من يبحث بعبارةٍ يذكرها من حديث — وهو أكثرُ ما يُبحث به — فيجدها
 * في موضعين أو ثلاثة، فتُمسح القطعُ الثلاثُ والأربعون كلُّها: ثمانيةٌ
 * ونصفٌ من الميغابايت لأجل سطرين.
 *
 * والحيلةُ أنّ أيّ نصٍّ يحوي عبارةً فهو يحوي كلَّ ثلاثيّاتها من الحروف
 * بالضرورة. فتُبنى خريطة: لكلّ ثلاثيّةٍ القطعُ التي وردت فيها، عددًا
 * ثنائيًّا مكتوبًا بالستّة والثلاثين. فإذا بُحث عن عبارةٍ ضُربت خرائطُ
 * ثلاثيّاتها بعضُها في بعض، فلم يبقَ إلا ما يُحتمل. وهو ترشيحٌ لا حكم:
 * ما بقي يُمسح نصُّه كما كان، فلا يتغيّر ما يُعرض — وإنّما يَقلّ ما
 * يُنزَّل. ولا يسقط موضعٌ صحيح: من حوى العبارةَ حوى ثلاثيّاتها.
 *
 *   node tools/build-tri.mjs      (بعد tools/shard-idx.mjs)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IDX = join(ROOT, "docs", "data", "idx");
const counts = JSON.parse(readFileSync(join(IDX, "shards.json"), "utf8"));

/* ترتيبٌ ثابت للقطع، يُكتب في الملفّ فيقرأه الموقع كما هو */
const shards = [];
for (const slug of Object.keys(counts).sort())
  for (let i = 0; i < counts[slug]; i++) shards.push(`${slug}/${i}`);
if (shards.length > 900) throw new Error("قطعٌ أكثر مما يحتمله القناع");

const map = new Map();                      // ثلاثيّة → BigInt قناعًا
const texts = [];                           // للتحقّق بعد البناء
shards.forEach((id, bit) => {
  const [slug, n] = id.split("/");
  const rows = JSON.parse(readFileSync(join(IDX, slug, `s${n}.json`), "utf8"));
  const one = 1n << BigInt(bit);
  const seen = new Set();
  let all = "";
  for (const r of rows) {
    const t = r[2] || "";
    all += t + "\u0000";
    for (let i = 0; i + 3 <= t.length; i++) seen.add(t.slice(i, i + 3));
  }
  texts.push(all);
  for (const g of seen) map.set(g, (map.get(g) || 0n) | one);
});

const out = {};
for (const [g, m] of map) out[g] = m.toString(36);
const doc = { s: shards, t: out };
const file = join(IDX, "tri.json");
writeFileSync(file, JSON.stringify(doc));

/* ── التحقّق: الترشيحُ لا يُسقط موضعًا ──
   تُؤخذ عباراتٌ من النصّ نفسه، ويُقارن ما يُرشّحه الدليلُ بما يجده المسحُ
   الكامل. فإن أسقط الدليلُ قطعةً فيها اللفظُ سقط البناء. */
const pick = (s, n) => { const o = []; for (let i = 0; i < n; i++) {
  const t = texts[Math.floor(Math.random() * texts.length)];
  const at = Math.floor(Math.random() * Math.max(1, t.length - 40));
  const q = t.slice(at, at + 6 + Math.floor(Math.random() * 25)).replace(/\u0000/g, " ").trim();
  if (q.length >= 3) o.push(q); } return o; };

let checked = 0;
for (const q of pick(texts, 400)) {
  let mask = null;
  for (let i = 0; i + 3 <= q.length; i++) {
    const m = map.get(q.slice(i, i + 3)) || 0n;
    mask = mask === null ? m : (mask & m);
  }
  if (mask === null) continue;
  for (let b = 0; b < shards.length; b++) {
    const has = texts[b].indexOf(q) >= 0;
    const kept = ((mask >> BigInt(b)) & 1n) === 1n;
    if (has && !kept) throw new Error(`الترشيح أسقط «${q}» من ${shards[b]}`);
  }
  checked++;
}

const raw = readFileSync(file).length;
console.log(`ثلاثيّات: ${map.size} · قطع: ${shards.length} · الملفّ ${Math.round(raw / 1024)} ك.ب خامًا`);
console.log(`التحقّق: ${checked} عبارةً لم يسقط منها موضع`);
