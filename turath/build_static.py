"""بناء موقع تُراث الثابت: الرئيسية + صفحة السورة (الفاتحة الآن).

نتوسّع سورةً سورة عبر SURAHS.
"""
import argparse
import sys
from pathlib import Path

from . import routing
from .surah_view import build_surah, render_home

SURAHS = [1]


def build(out_dir, log=print):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    routing.set_static([(s, 1) for s in SURAHS])   # الوضع الثابت للروابط
    (out / "index.html").write_text(render_home(), encoding="utf-8")
    log("→ index.html (الرئيسية)")
    for s in SURAHS:
        (out / f"surah-{s}.html").write_text(build_surah(s, log=log), encoding="utf-8")
        log(f"→ surah-{s}.html")
    (out / ".nojekyll").write_text("", encoding="utf-8")
    log(f"تمّ → {out}")


def main(argv=None):
    ap = argparse.ArgumentParser(description="بناء موقع تُراث الثابت")
    ap.add_argument("--out", default="docs")
    ap.parse_args(argv)
    build(ap.parse_args(argv).out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
