"""بناء موقع ثابت (HTML خالص) للاستضافة على GitHub Pages.

لا خادم ولا بايثون وقت التصفّح. الروابط مسطّحة نسبية فتعمل تحت مسار
المشروع (‎/turath/‎) وعند فتح الملفات محليًا سواء.

الآيات المبنيّة تُحدَّد بقائمة صريحة (نطاقات سور + آيات مختارة)، ويُبنى
لكل منها التفسير والأحاديث. التنقّل التسلسلي يُعطَّل عند حدود المبنيّ.
"""
import argparse
import sys
from pathlib import Path

from . import db, routing
from .ingest import ingest_ayah, load_corpus
from .query import get_ayah_page
from .render import render_ayah, render_home, render_surah_index
from .sources import surahs
from .sources.http import SourceUnavailable

# ما يُبنى: سور كاملة + آيات مختارة تُبرَز في الرئيسية
FULL_SURAHS = [1, 112, 113, 114]                 # الفاتحة والمعوّذات — قصيرة وكاملة
EXTRA_AYAT = [(2, 255), (5, 6)]                   # آية الكرسي وآية الوضوء


def target_refs():
    refs = []
    for s in FULL_SURAHS:
        for a in range(1, surahs.verse_count(s) + 1):
            refs.append((s, a))
    for r in EXTRA_AYAT:
        if r not in refs:
            refs.append(r)
    return refs


def build(out_dir, log=print):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    refs = target_refs()
    built = set(refs)
    routing.set_static(built)                    # يفعّل الوضع الثابت للروابط

    conn = db.connect(":memory:")
    corpus = load_corpus()
    log(f"فهرس الحديث: {len(corpus)} حديث")

    # صفحات الآيات
    ok = 0
    for i, (s, a) in enumerate(refs, 1):
        try:
            ingest_ayah(conn, s, a, corpus=corpus, fetch_gradings=False,
                        log=lambda *x: None)
        except SourceUnavailable as ex:
            log(f"  تعذّر {s}:{a}: {ex}")
            continue
        data = get_ayah_page(conn, s, a)
        meta = surahs.surah(s)
        nav = {"surah_name": meta["name_ar"] if meta else "",
               "here": f"{s}:{a}",
               "prev": surahs.prev_ref(s, a),
               "next": surahs.next_ref(s, a)}
        (out / f"a-{s}-{a}.html").write_text(render_ayah(data, nav=nav), encoding="utf-8")
        ok += 1
        if i % 5 == 0 or i == len(refs):
            log(f"  [{i}/{len(refs)}] آية {s}:{a}")

    # الرئيسية والفهرس
    (out / "index.html").write_text(
        render_home(surahs.all_surahs(), indexed=sorted({s for s, _ in built})),
        encoding="utf-8")
    (out / "surah.html").write_text(
        render_surah_index(surahs.all_surahs(), current=1), encoding="utf-8")

    # .nojekyll كي لا يتدخّل Jekyll في أسماء الملفات
    (out / ".nojekyll").write_text("", encoding="utf-8")

    log(f"تمّ: {ok} صفحة آية + الرئيسية + الفهرس → {out}")
    return ok


def main(argv=None):
    ap = argparse.ArgumentParser(description="بناء موقع تُراث الثابت")
    ap.add_argument("--out", default="docs", help="مجلد الإخراج (docs لـ GitHub Pages)")
    args = ap.parse_args(argv)
    build(args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
