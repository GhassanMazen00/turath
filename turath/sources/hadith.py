"""الحديث — AhmedBaset/hadith-json، مثبَّت على tag لا على main.

٥٠٬٨٨٤ حديثًا من ١٧ كتابًا. النموذج الرأسي يستعمل الكتب التسعة.
البيانات تُخزَّن كما وردت؛ لا تصحيح ولا تلخيص.
"""
from .http import fetch_json

REF = "v1.2.0"
BASE = f"https://raw.githubusercontent.com/AhmedBaset/hadith-json/{REF}"
HOMEPAGE = "https://github.com/AhmedBaset/hadith-json"

BOOKS = {
    "bukhari":  "صحيح البخاري",
    "muslim":   "صحيح مسلم",
    "abudawud": "سنن أبي داود",
    "tirmidhi": "جامع الترمذي",
    "nasai":    "سنن النسائي",
    "ibnmajah": "سنن ابن ماجه",
    "malik":    "موطأ مالك",
    "ahmed":    "مسند أحمد",
    "darimi":   "سنن الدارمي",
}


def book_url(slug: str) -> str:
    return f"{BASE}/db/by_book/the_9_books/{slug}.json"


def get_book(slug: str) -> dict:
    return fetch_json(book_url(slug))


def iter_hadiths(slug: str):
    """يُنتج (رقم في الكتاب، النص العربي، الموضع، الرابط) لكل حديث."""
    book = get_book(slug)
    name = BOOKS.get(slug, slug)
    url = book_url(slug)
    for h in book["hadiths"]:
        no = h.get("idInBook")
        if no is None or not h.get("arabic"):
            continue
        yield {
            "book_slug": slug,
            "hadith_no": no,
            "text_ar": h["arabic"],
            "locus_ar": f"{name} — حديث رقم {no}",
            "url": url,
            "book_name": name,
        }
