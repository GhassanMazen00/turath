/* إضافةُ عدد الفقرات إلى فهارس الكتب المشحونة من قبلُ.
 *
 * الفهرسُ الجديد يحمله من أصله، وأمّا ما شُحن قبله فيُحسب من ملفّات
 * أجزائه التي بين أيدينا — فلا يُعاد جلبُ تسعين ميغابايتًا لحقلٍ واحد.
 *
 *   node tools/mark-toc.mjs
 */
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "docs", "data");
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

let done = 0, already = 0;
for (const col of ["sharh", "sira", "fiqh"]) {
  const dir = path.join(DATA, col);
  if (!fs.existsSync(path.join(dir, "books.json"))) continue;
  for (const b of rd(path.join(dir, "books.json"))) {
    const bd = path.join(dir, b.slug);
    const toc = rd(path.join(bd, "toc.json"));
    if (!toc.length) continue;
    if (toc[0].length >= 6) { already++; continue; }
    const meta = rd(path.join(bd, "meta.json"));
    const ch = [];
    for (let i = 0; i < meta.chunks; i++) ch.push(rd(path.join(bd, `c${i}.json`)));
    const out = toc.map((t, k) => {
      const nx = toc[k + 1];
      const from = { c: t[1], i: t[2] };
      const to = nx ? { c: nx[1], i: nx[2] } : { c: meta.chunks - 1, i: Infinity };
      let n = 0;
      for (let c = from.c; c <= to.c; c++) {
        const r = ch[c];
        const s = c === from.c ? from.i : 0;
        const e = c === to.c ? Math.min(to.i, r.length) : r.length;
        for (let x = s; x < e; x++) if (!r[x][3]) n++;
      }
      return [t[0], t[1], t[2], t[3], t[4], n];
    });
    if (out.length !== toc.length) throw new Error(`${b.slug}: اختلف عددُ العناوين`);
    fs.writeFileSync(path.join(bd, "toc.json"), JSON.stringify(out), "utf8");
    const empty = out.filter((x) => !x[5]).length;
    console.log(`${b.ar.padEnd(18)} ${out.length} عنوانًا · ${empty} حاويةً بلا فقرات`);
    done++;
  }
}
console.log(`\nحُدّث ${done} فهرسًا${already ? `، و${already} كان محدَّثًا` : ""}.`);
