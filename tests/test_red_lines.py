"""اختبارات تحرس القواعد الحمراء.

هذه ليست اختبارات وظيفية فحسب — كل اختبار هنا يمنع انحرافًا بعينه
نصّ عليه قرار المشروع. كسر أحدها يعني كسر القاعدة لا كسر الشيفرة.
تعمل كلها بلا شبكة.
"""
import sqlite3
import unittest

from turath import db, links, render
from turath.normalize import normalize
from turath.query import get_ayah_page

AYAH = "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَيُّ ٱلۡقَيُّومُۚ لَا تَأۡخُذُهُۥ سِنَةࣱ وَلَا نَوۡمࣱ"


def seed(conn):
    src = db.upsert_source(conn, "quran", "مصحف", "https://example/q", "pinned")
    hsrc = db.upsert_source(conn, "hadith", "الحديث", "https://example/h", "v1.2.0")
    dsrc = db.upsert_source(conn, "dorar", "الدرر السنية", "https://dorar.net", "api")
    a = db.upsert_unit(conn, source_id=src, kind="ayah", ref_key="2:255", surah=2,
                       ayah=255, text_ar=AYAH, locus_ar="القرآن — 2:255",
                       url="https://example/q/2/255")
    h = db.upsert_unit(conn, source_id=hsrc, kind="hadith", ref_key="bukhari:1",
                       book_slug="bukhari", hadith_no=1, text_ar="متن الحديث",
                       locus_ar="صحيح البخاري — حديث رقم ١", url="https://example/h")
    db.add_link(conn, a, h, "ayah_hadith", "quotation", "حجّة الربط", "https://example/h")
    return src, hsrc, dsrc, a, h


class RedLineOne(unittest.TestCase):
    """١ — لا يوجد حقل grade على الحديث؛ كل حكم صفٌّ مستقل."""

    def setUp(self):
        self.conn = db.connect(":memory:")
        self.src, self.hsrc, self.dsrc, self.a, self.h = seed(self.conn)

    def test_unit_has_no_grade_column(self):
        cols = {r[1] for r in self.conn.execute("PRAGMA table_info(unit)")}
        self.assertNotIn("grade", cols)
        self.assertNotIn("grading", cols)

    def test_conflicting_rulings_coexist(self):
        for muhaddith, grade in [("البخاري", "صحيح"), ("الألباني", "ضعيف")]:
            self.conn.execute(
                "INSERT INTO grading (unit_id,source_id,muhaddith,book,page,grade,url)"
                " VALUES (?,?,?,?,?,?,?)",
                (self.h, self.dsrc, muhaddith, "كتاب", "١٢", grade, "https://dorar.net/x"))
        rows = self.conn.execute("SELECT grade FROM grading WHERE unit_id=?",
                                 (self.h,)).fetchall()
        self.assertEqual({r["grade"] for r in rows}, {"صحيح", "ضعيف"})

    def test_disputed_banner_when_rulings_differ(self):
        gradings = [
            {"muhaddith": "البخاري", "book": "ك", "page": "١", "grade": "صحيح",
             "url": "https://dorar.net/x"},
            {"muhaddith": "الألباني", "book": "ك", "page": "٢", "grade": "ضعيف",
             "url": "https://dorar.net/x"},
        ]
        out = render._gradings_block(gradings, "u")
        self.assertIn("مختلَف فيه", out)
        self.assertIn("دون ترجيح", out)
        self.assertIn("البخاري", out)
        self.assertIn("الألباني", out)

    def test_no_disputed_banner_when_rulings_agree(self):
        g = [{"muhaddith": "أ", "book": "ك", "page": "١", "grade": "صحيح", "url": "u"},
             {"muhaddith": "ب", "book": "ك", "page": "٢", "grade": "صحيح", "url": "u"}]
        self.assertNotIn("مختلَف فيه", render._gradings_block(g, "u"))


class RedLineTwo(unittest.TestCase):
    """٢ — لا معلومة بلا مصدر: كل عنصر معروض يحمل مصدره وموضعه ورابطه."""

    def test_every_unit_requires_locus_and_url(self):
        conn = db.connect(":memory:")
        src = db.upsert_source(conn, "quran", "مصحف", "https://e", "p")
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute("INSERT INTO unit (source_id,kind,ref_key,text_ar,text_norm,"
                         "locus_ar,url) VALUES (?,?,?,?,?,?,NULL)",
                         (src, "ayah", "1:1", "ن", "ن", "موضع"))

    def test_rendered_card_carries_provenance(self):
        conn = db.connect(":memory:")
        seed(conn)
        html = render.render_ayah(get_ayah_page(conn, 2, 255))
        for token in ("المصدر:", "الموضع:", "الأصل", "لِمَ ارتبط:"):
            self.assertIn(token, html)

    def test_link_requires_evidence(self):
        conn = db.connect(":memory:")
        _, _, _, a, h = seed(conn)
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute("INSERT INTO link (from_unit,to_unit,relation,method,evidence_ar)"
                         " VALUES (?,?,?,?,NULL)", (a, h, "ayah_hadith", "manual"))


class RedLineThreeAndFour(unittest.TestCase):
    """٣ و٤ — لا إفتاء، ولا يُختلق ما لم يُجلب."""

    def test_missing_gradings_declared_not_filled(self):
        out = render._gradings_block([], "u")
        self.assertIn("لم تُجلب", out)
        self.assertIn("لا حكمٌ بعدم وجودها", out)

    def test_unreachable_source_raises_not_returns_empty(self):
        from turath.sources.http import SourceUnavailable, fetch
        with self.assertRaises(SourceUnavailable):
            fetch("https://invalid.invalid.invalid/nope.json")

    def test_page_never_ranks_or_prefers(self):
        conn = db.connect(":memory:")
        seed(conn)
        html = render.render_ayah(get_ayah_page(conn, 2, 255))
        for banned in ("الراجح", "الأرجح", "والصواب أن", "نرجّح"):
            self.assertNotIn(banned, html)


class RedLineFive(unittest.TestCase):
    """٥ — النص يُخزَّن ويُعرض كما ورد؛ التطبيع للمطابقة فقط."""

    def test_original_text_preserved_verbatim(self):
        conn = db.connect(":memory:")
        _, _, _, a, _ = seed(conn)
        row = conn.execute("SELECT text_ar, text_norm FROM unit WHERE id=?", (a,)).fetchone()
        self.assertEqual(row["text_ar"], AYAH)          # حرفيًا بالتشكيل
        self.assertNotEqual(row["text_norm"], AYAH)     # المطبَّع منفصل

    def test_normalized_form_never_rendered(self):
        conn = db.connect(":memory:")
        seed(conn)
        html = render.render_ayah(get_ayah_page(conn, 2, 255))
        self.assertIn("ٱللَّهُ لَآ إِلَٰهَ", html)
        self.assertNotIn("الله لا اله الا هو الحي القيوم لا تاخذه", html)

    def test_orthographies_unify_for_matching_only(self):
        self.assertEqual(normalize("ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ"),
                         normalize("اللهُ لا إلهَ إلا هوَ"))


class LinkingDiscipline(unittest.TestCase):
    """الربط بمفتاح أو بلفظ دقيق — لا بمطابقة تقريبية."""

    def test_only_declared_methods_allowed(self):
        conn = db.connect(":memory:")
        _, _, _, a, h = seed(conn)
        with self.assertRaises(sqlite3.IntegrityError):
            conn.execute("INSERT INTO link (from_unit,to_unit,relation,method,evidence_ar)"
                         " VALUES (?,?,?,?,?)",
                         (a, h, "ayah_hadith", "similarity", "تشابه دلالي"))

    def test_quotation_requires_exact_match(self):
        corpus = [
            {"text_ar": "قال: اللهُ لا إلهَ إلا هوَ الحيُّ القيّومُ لا تأخذُهُ سِنةٌ ولا نومٌ"},
            {"text_ar": "حديث في التوحيد لا يقتبس شيئًا من لفظ الآية"},
        ]
        hits = links.find_quotations(AYAH, corpus)
        self.assertEqual(len(hits), 1)
        self.assertGreaterEqual(hits[0]["quoted_words"], links.MIN_WORDS)

    def test_short_incidental_overlap_rejected(self):
        corpus = [{"text_ar": "الحمد لله الحي القيوم"}]     # ٣ كلمات فقط
        self.assertEqual(links.find_quotations(AYAH, corpus), [])

    def test_shared_wording_is_flagged_not_resolved(self):
        quran = [{"chapter": 3, "verse": 2,
                  "text": "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَيُّ ٱلۡقَيُّومُ"}]
        also = links.other_ayahs_with("الله لا اله الا هو الحي القيوم", quran,
                                      exclude=(2, 255))
        self.assertEqual(also, ["3:2"])
        ev = links.quotation_evidence("الله لا اله الا هو الحي القيوم", 7, also)
        self.assertIn("3:2", ev)
        self.assertIn("ولا ترجّح", ev)

    def test_unambiguous_links_rank_first(self):
        conn = db.connect(":memory:")
        src, hsrc, _, a, h1 = seed(conn)
        h2 = db.upsert_unit(conn, source_id=hsrc, kind="hadith", ref_key="muslim:2",
                            book_slug="muslim", hadith_no=2, text_ar="متن",
                            locus_ar="صحيح مسلم — ٢", url="https://e")
        conn.execute("UPDATE link SET ambiguous=1, shared_with='3:2' WHERE to_unit=?", (h1,))
        db.add_link(conn, a, h2, "ayah_hadith", "quotation", "حجّة", "https://e")
        page = get_ayah_page(conn, 2, 255)
        self.assertEqual(page["hadiths"][0]["book_slug"], "muslim")
        self.assertEqual(page["hadiths"][0]["ambiguous"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
