"""بناء النموذج الرأسي: آية واحدة من طرف إلى طرف.

  الآية → تفسيراها → الأحاديث المرتبطة → أحكام العلماء عليها

كل خطوة تُسجِّل مصدرها وموضعها ورابط أصلها. ما لا يُجلب لا يُختلق:
تعذُّر الوصول إلى مصدر يُسجَّل تعذُّرًا ظاهرًا في التقرير وفي الواجهة.
"""
import argparse
import sys

from . import db, links
from .normalize import normalize
from .sources import dorar, hadith, quran, tafsir
from .sources.http import SourceUnavailable

DEFAULT_TAFSIRS = ["ar-tafsir-ibn-kathir", "ar-tafsir-as-saadi"]


def register_sources(conn) -> dict:
    return {
        "quran": db.upsert_source(conn, "quran", "مصحف — fawazahmed0/quran-api",
                                  quran.HOMEPAGE, quran.REF),
        "tafsir": db.upsert_source(conn, "tafsir", "التفسير — spa5k/tafsir_api",
                                   tafsir.HOMEPAGE, tafsir.REF),
        "hadith": db.upsert_source(conn, "hadith", "الحديث — AhmedBaset/hadith-json",
                                   hadith.HOMEPAGE, hadith.REF),
        "dorar": db.upsert_source(conn, "dorar", "الدرر السنية — الموسوعة الحديثية",
                                  dorar.HOMEPAGE, dorar.REF),
    }


def load_corpus(books=None) -> list[dict]:
    corpus = []
    for slug in (books or hadith.BOOKS):
        for h in hadith.iter_hadiths(slug):
            h["text_norm"] = normalize(h["text_ar"])
            corpus.append(h)
    return corpus


def ingest_ayah(conn, surah, ayah, tafsir_editions=None, corpus=None,
                fetch_gradings=True, log=print):
    src = register_sources(conn)
    report = {"surah": surah, "ayah": ayah, "tafsirs": 0, "links": 0,
              "hadiths": 0, "gradings": 0, "unavailable": []}

    # ١ — الآية
    a = quran.get_ayah(surah, ayah)
    ayah_uid = db.upsert_unit(conn, source_id=src["quran"], kind="ayah",
                              ref_key=f"{surah}:{ayah}", surah=surah, ayah=ayah,
                              text_ar=a["text_ar"], locus_ar=a["locus_ar"], url=a["url"])
    log(f"الآية {surah}:{ayah} ✓")

    # ٢ — التفاسير: مفتاح مشترك، الربط بديهي ومُثبت
    for ed in (tafsir_editions or DEFAULT_TAFSIRS):
        try:
            t = tafsir.get_tafsir(ed, surah, ayah)
        except SourceUnavailable as e:
            report["unavailable"].append(f"تفسير {ed}: {e}")
            log(f"  تعذّر التفسير {ed}")
            continue
        uid = db.upsert_unit(conn, source_id=src["tafsir"], kind="tafsir",
                             ref_key=f"{surah}:{ayah}", surah=surah, ayah=ayah,
                             edition=ed, text_ar=t["text_ar"],
                             locus_ar=t["locus_ar"], url=t["url"])
        db.add_link(conn, ayah_uid, uid, "ayah_tafsir", "shared_key",
                    f"مبوَّب على الآية نفسها في {t['edition_name']} — مفتاح مشترك {surah}:{ayah}.",
                    t["url"])
        report["tafsirs"] += 1
        log(f"  تفسير: {t['edition_name']} ✓")

    # ٣ — الأحاديث: اقتباس لفظي دقيق + تسمية مُقرَّرة
    corpus = corpus if corpus is not None else load_corpus()
    all_ayahs = quran.get_all()
    titles = links.ayah_titles(surah, ayah)

    found: dict[tuple, dict] = {}
    for h in links.find_quotations(a["text_ar"], corpus):
        also = links.other_ayahs_with(h["quoted"], all_ayahs, exclude=(surah, ayah))
        found[(h["book_slug"], h["hadith_no"])] = {
            "h": h, "method": "quotation", "shared_with": also,
            "evidence": links.quotation_evidence(h["quoted"], h["quoted_words"], also),
        }
    for h in links.find_by_name(titles, corpus):
        key = (h["book_slug"], h["hadith_no"])
        if key in found:      # الاقتباس أقوى حجّة، فلا يُستبدل
            continue
        found[key] = {"h": h, "method": "naming", "shared_with": [],
                      "evidence": links.naming_evidence(h["named"], h["title_meta"])}

    hadith_uids = {}
    for (slug, no), rec in found.items():
        h = rec["h"]
        uid = db.upsert_unit(conn, source_id=src["hadith"], kind="hadith",
                             ref_key=f"{slug}:{no}", book_slug=slug, hadith_no=no,
                             text_ar=h["text_ar"], locus_ar=h["locus_ar"], url=h["url"])
        shared = rec.get("shared_with") or []
        db.add_link(conn, ayah_uid, uid, "ayah_hadith", rec["method"],
                    rec["evidence"], h["url"],
                    ambiguous=bool(shared), shared_with=shared)
        hadith_uids[(slug, no)] = uid
        report["links"] += 1
    report["hadiths"] = len(hadith_uids)
    log(f"  أحاديث مرتبطة: {len(hadith_uids)}")

    # ٤ — الأحكام: الدرر السنية وحدها. كل حكم صفٌّ مستقل.
    if fetch_gradings:
        for (slug, no), uid in hadith_uids.items():
            row = conn.execute("SELECT text_ar FROM unit WHERE id=?", (uid,)).fetchone()
            probe = " ".join(normalize(row["text_ar"]).split()[-9:])
            try:
                rulings = dorar.search(probe)
            except SourceUnavailable as e:
                report["unavailable"].append(f"الدرر ({slug}:{no}): {str(e)[:80]}")
                continue
            for r in rulings:
                conn.execute(
                    "INSERT OR IGNORE INTO grading"
                    " (unit_id,source_id,muhaddith,book,page,grade,explanation,rawi,url)"
                    " VALUES (?,?,?,?,?,?,?,?,?)",
                    (uid, src["dorar"], r["muhaddith"], r["book"], r["page"],
                     r["grade"], r["explanation"], r["rawi"], r["url"]))
                report["gradings"] += 1

    conn.commit()
    return report


def main(argv=None):
    ap = argparse.ArgumentParser(description="بناء النموذج الرأسي لآية")
    ap.add_argument("ref", help="مرجع الآية، مثل 2:255")
    ap.add_argument("--db", default=None)
    ap.add_argument("--tafsir", action="append", dest="tafsirs")
    ap.add_argument("--no-gradings", action="store_true")
    args = ap.parse_args(argv)

    surah, ayah = (int(x) for x in args.ref.split(":"))
    conn = db.connect(args.db)
    rep = ingest_ayah(conn, surah, ayah, args.tafsirs,
                      fetch_gradings=not args.no_gradings)

    print("\n— التقرير —")
    print(f"  تفاسير: {rep['tafsirs']}   أحاديث: {rep['hadiths']}   "
          f"روابط: {rep['links']}   أحكام: {rep['gradings']}")
    if rep["unavailable"]:
        print(f"  مصادر تعذّر الوصول إليها ({len(rep['unavailable'])}):")
        for u in dict.fromkeys(x.split(":")[0] for x in rep["unavailable"]):
            print(f"    · {u}")
        print("  لم يُختلق بديل. الواجهة ستُظهر النقص صراحةً.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
