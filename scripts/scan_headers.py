"""Render the running-header strip of each page and OCR it.

The header carries "سورة X، الآيات: N - M" plus the printed page number,
which is what lets us map PDF pages onto the mushaf deterministically.
"""
import subprocess, sys, os, re, json
import pymupdf
from PIL import Image

PDF = sys.argv[1]
FIRST, LAST = int(sys.argv[2]), int(sys.argv[3])   # 1-based, inclusive
OUT = sys.argv[4]
os.makedirs("build/headers", exist_ok=True)

doc = pymupdf.open(PDF)
rows = []
for n in range(FIRST, LAST + 1):
    page = doc[n - 1]
    pix = page.get_pixmap(dpi=300)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    strip = img.crop((0, 0, img.width, int(img.height * 0.075)))
    p = f"build/headers/h{n:04d}.png"
    strip.save(p)
    txt = subprocess.run(["tesseract", p, "stdout", "-l", "ara", "--psm", "7"],
                         capture_output=True, text=True).stdout.strip()
    txt = " ".join(txt.split())
    rows.append({"pdf_page": n, "header_raw": txt})
    print(f"{n:4d} | {txt}", flush=True)

json.dump(rows, open(OUT, "w"), ensure_ascii=False, indent=1)
