"""التفسير — spa5k/tafsir_api، مثبَّت على commit لا على main."""
from .http import fetch_json

REF = "05d5ba765d77c6ca6d43c30f0e1c273deb137454"
BASE = f"https://raw.githubusercontent.com/spa5k/tafsir_api/{REF}"
HOMEPAGE = "https://github.com/spa5k/tafsir_api"

# أسماء عربية للطبعات المستخدمة في النموذج الرأسي
EDITION_NAMES = {
    "ar-tafsir-ibn-kathir": "تفسير ابن كثير",
    "ar-tafsir-as-saadi": "تيسير الكريم الرحمن — السعدي",
    "ar-tafsir-al-tabari": "جامع البيان — الطبري",
    "ar-tafsir-muyassar": "التفسير الميسّر",
    "ar-tafseer-al-qurtubi": "الجامع لأحكام القرآن — القرطبي",
}


def tafsir_url(edition: str, surah: int, ayah: int) -> str:
    return f"{BASE}/tafsir/{edition}/{surah}/{ayah}.json"


def editions() -> list[dict]:
    return fetch_json(f"{BASE}/tafsir/editions.json")


def get_tafsir(edition: str, surah: int, ayah: int) -> dict:
    url = tafsir_url(edition, surah, ayah)
    d = fetch_json(url)
    name = EDITION_NAMES.get(edition, edition)
    return {
        "edition": edition,
        "edition_name": name,
        "surah": surah,
        "ayah": ayah,
        "text_ar": d["text"],
        "url": url,
        "locus_ar": f"{name} — عند {surah}:{ayah}",
    }
