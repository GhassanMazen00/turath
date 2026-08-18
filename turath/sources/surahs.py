"""بيانات السور: الأسماء وعدد الآيات وموضع النزول.

من info.json في نفس مصدر القرآن المثبَّت. تُخزَّن كما وردت.
"""
from .http import fetch_json
from .quran import REF, BASE

_INFO = None


def _load():
    global _INFO
    if _INFO is None:
        d = fetch_json(f"{BASE}/info.json")
        chapters = d["chapters"]
        refs = chapters["references"] if isinstance(chapters, dict) else chapters
        _INFO = {c["chapter"]: {
            "index": c["chapter"],
            "name_ar": c["arabicname"],
            "name_en": c["englishname"],
            "slug": c["name"],
            "revelation": "مكية" if c["revelation"].lower().startswith("mecc") else "مدنية",
            "verse_count": len(c["verses"]),
        } for c in refs}
    return _INFO


def all_surahs() -> list[dict]:
    return [_load()[i] for i in range(1, 115)]


def surah(n: int) -> dict:
    return _load().get(n)


def verse_count(n: int) -> int:
    s = surah(n)
    return s["verse_count"] if s else 0


def next_ref(s: int, a: int):
    """الآية التالية في ترتيب المصحف، أو None عند آخر آية."""
    if a < verse_count(s):
        return (s, a + 1)
    if s < 114:
        return (s + 1, 1)
    return None


def prev_ref(s: int, a: int):
    if a > 1:
        return (s, a - 1)
    if s > 1:
        return (s - 1, verse_count(s - 1))
    return None
