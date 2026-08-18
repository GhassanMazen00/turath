"""الدرر السنية — المصدر الوحيد للأحكام والدرجات.

كل نتيجة تُحوَّل إلى صفوف grading مستقلة: قائل + كتاب + موضع + درجة.
لا تُدمج الأحكام ولا يُرجَّح بينها. إن تعذّر الوصول رُفع SourceUnavailable
ولا يُختلق حكم ولا يُترك الحديث موصوفًا بغير ما ورد.
"""
import urllib.parse

from .http import SourceUnavailable, fetch_json

HOMEPAGE = "https://dorar.net"
API = "https://dorar.net/dorar_api.json"
REF = "official-api"


def search_url(text: str) -> str:
    return f"{API}?skey={urllib.parse.quote(text)}"


def search(text: str) -> list[dict]:
    """يبحث في موسوعة الحديث ويُرجع الأحكام كصفوف مستقلة."""
    url = search_url(text)
    payload = fetch_json(url)                      # يرفع SourceUnavailable عند التعذّر
    items = (payload.get("ahadith", {}) or {}).get("result", [])
    if isinstance(items, str):
        items = _parse_html_result(items)
    out = []
    for it in items:
        out.append({
            "muhaddith": (it.get("mohdith") or "").strip(),
            "book": (it.get("book") or "").strip(),
            "page": (it.get("numberOrPage") or "").strip() or None,
            "grade": (it.get("grade") or "").strip(),
            "explanation": (it.get("explainGrade") or "").strip() or None,
            "rawi": (it.get("rawi") or "").strip() or None,
            "text_ar": (it.get("hadith") or "").strip(),
            "url": url,
        })
    return [r for r in out if r["muhaddith"] and r["grade"]]


def _parse_html_result(html: str) -> list[dict]:
    """الـ API يُرجع أحيانًا HTML بدل JSON منظّم."""
    import re
    rows = []
    for block in re.findall(r"<div class=\"hadith-info\">(.*?)</div>\s*</div>", html, re.S):
        def pick(label):
            m = re.search(label + r"\s*:?\s*</span>\s*([^<]+)", block)
            return m.group(1).strip() if m else ""
        rows.append({
            "mohdith": pick("المحدث"), "book": pick("المصدر"),
            "numberOrPage": pick("الصفحة أو الرقم"), "grade": pick("خلاصة حكم المحدث"),
            "rawi": pick("الراوي"), "explainGrade": "", "hadith": "",
        })
    return rows


__all__ = ["search", "search_url", "SourceUnavailable", "HOMEPAGE", "REF"]
