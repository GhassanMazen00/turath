"""Render a page range at 300dpi and OCR it with tesseract (Arabic)."""
import subprocess, sys, os
import pymupdf
from PIL import Image

PDF, FIRST, LAST = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
os.makedirs("build/pages", exist_ok=True)
os.makedirs("build/ocr", exist_ok=True)

doc = pymupdf.open(PDF)
for n in range(FIRST, LAST + 1):
    png = f"build/pages/p{n:04d}.png"
    if not os.path.exists(png):
        doc[n - 1].get_pixmap(dpi=300).save(png)
    subprocess.run(["tesseract", png, f"build/ocr/p{n:04d}", "-l", "ara", "--psm", "6"],
                   capture_output=True)
    size = os.path.getsize(f"build/ocr/p{n:04d}.txt")
    print(f"p{n}: {size} bytes", flush=True)
