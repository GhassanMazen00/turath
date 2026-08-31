/* أيقوناتُ التطبيق: PNG من شعار الموقع نفسه.
 *
 * حين يُضيف القارئ الموقعَ إلى شاشته على هاتفه، يطلب النظامُ أيقونةً
 * نقطيّة — أندرويد ١٩٢ و٥١٢، وiOS ١٨٠ — ولا يقبل SVG. ولا في هذه البيئة
 * أداةُ تحويل، فتُرسم الأيقونةُ هنا رسمًا: الشعارُ مضلَّعٌ مستقيمُ الأضلاع
 * وثقبٌ دائري، وكلاهما يُحسب لكلّ نقطةٍ بحساب.
 *
 * والنقاطُ منقولةٌ من docs/assets/mark.svg بعد فكّ الإحداثيات النسبية،
 * فإن تغيّر الشعارُ فلتُنقل من جديد.
 *
 *   node tools/make-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "assets");

/* نجمةُ الشعار في مربّع ٢٤×٢٤ */
const STAR = [
  [12, 1.4], [14.62, 3.57], [18.04, 3.23], [18.95, 6.53], [21.91, 8.36],
  [20.54, 11.55], [21.91, 14.74], [18.95, 16.57], [18.04, 19.87], [14.62, 19.53],
  [12, 22.6], [9.38, 20.43], [5.96, 20.77], [5.05, 17.47], [2.09, 15.64],
  [3.46, 12.45], [2.09, 9.26], [5.05, 7.43], [5.96, 4.13], [9.38, 4.47],
];
const HOLE = { x: 12, y: 12, r: 3.9 };

const inPoly = (x, y) => {
  let hit = false;
  for (let i = 0, j = STAR.length - 1; i < STAR.length; j = i++) {
    const [xi, yi] = STAR[i], [xj, yj] = STAR[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};
const inHole = (x, y) => (x - HOLE.x) ** 2 + (y - HOLE.y) ** 2 <= HOLE.r ** 2;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/* ── كاتبُ PNG: ترويسة، وبيانات مضغوطة، ونهاية. لا اعتمادَ على أحد ── */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c; }
  return (buf) => { let c = -1;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0; };
})();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgb) {                       // rgb: Buffer طولُه w*h*3
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8bit RGB
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;                   // مرشِّحٌ لا شيء
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* المِلءُ بأربعِ عيّناتٍ في كلّ نقطة، فتنعم الحافّة ولا تُسنَّن */
function draw(size, { fg, bg, inset }) {
  const [fr, fg2, fb] = hex(fg), [br, bg2, bb] = hex(bg);
  const buf = Buffer.alloc(size * size * 3);
  const span = size * (1 - 2 * inset), off = size * inset;
  const SS = 4;                                  // ٤×٤ عيّنة
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let on = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = ((x + (sx + 0.5) / SS) - off) / span * 24;
      const py = ((y + (sy + 0.5) / SS) - off) / span * 24;
      if (inPoly(px, py) && !inHole(px, py)) on++;
    }
    const a = on / (SS * SS), i = (y * size + x) * 3;
    buf[i] = Math.round(br + (fr - br) * a);
    buf[i + 1] = Math.round(bg2 + (fg2 - bg2) * a);
    buf[i + 2] = Math.round(bb + (fb - bb) * a);
  }
  return png(size, size, buf);
}

const ACC = "#0072a8", BG = "#eef2f7";
/* أندرويد يقصّ الأيقونة دائرةً أو مربّعًا مستديرًا، فيلزم أن يبقى الشعار
   داخل الثمانين في المئة الوسطى — ومن ثَمّ الحاشية. وiOS لا يقصّ، ولكنّه
   يستدير الأركان، فحاشيةٌ أصغر تكفي. */
const files = [
  ["icon-192.png", 192, 0.20],
  ["icon-512.png", 512, 0.20],
  ["apple-touch-icon.png", 180, 0.12],
];
for (const [name, size, inset] of files) {
  const buf = draw(size, { fg: ACC, bg: BG, inset });
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name.padEnd(22)} ${size}×${size} · ${(buf.length / 1024).toFixed(1)} ك.ب`);
}
