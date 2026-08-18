"""القرآن — fawazahmed0/quran-api، مثبَّت على ref محدد."""
from .http import fetch_json

REF = "6be8e17f2a0c13b1f33b1c3057f73cb28d5e848e"   # فرع 1 وقت التثبيت
BASE = f"https://raw.githubusercontent.com/fawazahmed0/quran-api/{REF}"
HOMEPAGE = "https://github.com/fawazahmed0/quran-api"
EDITION = "ara-quransimple"                        # الرسم الإملائي المعياري
# اختير على العثماني لسببين: (١) يُعرَض بثبات في المتصفحات والخطوط —
# طبعة الرسم العثماني تستعمل محارف تنوين من Arabic Extended-A (U+08F0)
# تكسر تشكيل الكلمة في خط Amiri على الوِب. (٢) الرسم الإملائي يطابق رسم
# متون الحديث المنقولة (السماوات لا السموٰت، الصلاة لا الصلوٰة) فيرتفع
# استرجاع الاقتباسات: آية الوضوء ٥:٦ قفزت من ٦ إلى ١٧ حديثًا.

SURAH_NAMES = {2: "البقرة", 1: "الفاتحة", 112: "الإخلاص"}


def ayah_url(surah: int, ayah: int, edition: str = EDITION) -> str:
    return f"{BASE}/editions/{edition}/{surah}/{ayah}.json"


def full_url(edition: str = EDITION) -> str:
    return f"{BASE}/editions/{edition}.json"


def get_all(edition: str = EDITION) -> list[dict]:
    """المصحف كاملًا — يُستعمل للتحقق من تفرّد اللفظ بين الآيات."""
    return fetch_json(full_url(edition))["quran"]


def get_ayah(surah: int, ayah: int, edition: str = EDITION) -> dict:
    url = ayah_url(surah, ayah, edition)
    d = fetch_json(url)
    return {
        "surah": surah,
        "ayah": ayah,
        "text_ar": d["text"],
        "url": url,
        "locus_ar": f"القرآن الكريم — {surah}:{ayah}",
    }
