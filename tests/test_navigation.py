"""اختبارات التنقّل التسلسلي وبناء الصفحات."""
import unittest

from turath.sources import surahs


class SequentialNavigation(unittest.TestCase):
    """التنقّل يمرّ بالمصحف كله بالترتيب من الفاتحة إلى الناس."""

    def test_first_and_last_bounds(self):
        self.assertIsNone(surahs.prev_ref(1, 1))       # لا سابق لأول آية
        self.assertIsNone(surahs.next_ref(114, 6))     # لا تالي لآخر آية

    def test_crosses_surah_boundary_forward(self):
        # آخر الفاتحة (١:٧) يليه أول البقرة (٢:١)
        self.assertEqual(surahs.next_ref(1, 7), (2, 1))

    def test_crosses_surah_boundary_backward(self):
        self.assertEqual(surahs.prev_ref(2, 1), (1, 7))

    def test_within_surah(self):
        self.assertEqual(surahs.next_ref(2, 100), (2, 101))
        self.assertEqual(surahs.prev_ref(2, 100), (2, 99))

    def test_all_114_surahs_present(self):
        s = surahs.all_surahs()
        self.assertEqual(len(s), 114)
        self.assertEqual(s[0]["index"], 1)
        self.assertEqual(s[-1]["index"], 114)
        self.assertTrue(all(x["verse_count"] > 0 for x in s))

    def test_full_chain_reaches_end(self):
        # اتبع السلسلة من ١:١ خطواتٍ معدودة وتأكد أنها تتقدّم دائمًا
        ref = (1, 1)
        seen = 0
        while ref and seen < 20:
            nxt = surahs.next_ref(*ref)
            if nxt:
                self.assertNotEqual(nxt, ref)
            ref = nxt
            seen += 1
        self.assertEqual(seen, 20)


class HomeAndIndexRender(unittest.TestCase):
    def test_home_names_the_creed(self):
        from turath.render import render_home
        html = render_home(surahs.all_surahs(), indexed=[2])
        for token in ("تُراث", "لا معلومة بلا مصدر", "لا إفتاء", "اقرأ من الفاتحة"):
            self.assertIn(token, html)

    def test_index_lists_every_surah(self):
        from turath.render import render_surah_index
        html = render_surah_index(surahs.all_surahs(), current=1)
        self.assertIn("/ayah/1/1", html)
        self.assertIn("/ayah/114/1", html)


if __name__ == "__main__":
    unittest.main()
