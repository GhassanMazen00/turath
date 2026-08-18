"""بناء موقع تُراث الثابت لـ GitHub Pages — سورة الفاتحة الكاملة.

صفحة واحدة مكتفية بذاتها: كل آيات الفاتحة معروضة، كل آية قابلة للنقر
تكشف تفسيرها وأحاديثها ومسائلها. لا خادم وقت التصفّح.

التوسّع لاحقًا: أضف السور إلى SURAHS وستُبنى كلٌّ في صفحتها.
"""
import argparse
import sys
from pathlib import Path

from .surah_view import build_surah

SURAHS = [1]                       # الفاتحة فقط الآن — نتوسّع سورةً سورة


def build(out_dir, log=print):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for i, s in enumerate(SURAHS):
        html = build_surah(s, log=log)
        # أول سورة هي الصفحة الرئيسية للموقع
        name = "index.html" if i == 0 else f"surah-{s}.html"
        (out / name).write_text(html, encoding="utf-8")
        log(f"→ {name}")
    (out / ".nojekyll").write_text("", encoding="utf-8")
    log(f"تمّ → {out}")


def main(argv=None):
    ap = argparse.ArgumentParser(description="بناء موقع تُراث الثابت")
    ap.add_argument("--out", default="docs")
    args = ap.parse_args(argv)
    build(args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
