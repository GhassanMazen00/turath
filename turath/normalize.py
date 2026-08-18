"""تطبيع عربي للبحث والمطابقة فقط.

القاعدة الحمراء ٥: النص الأصلي يُخزَّن ويُعرض كما ورد.
لا تستخدم ناتج هذه الوحدة في العرض أبدًا — للفهرسة والمطابقة فقط.
"""
import re
import unicodedata

# الحركات والتنوين والعلامات القرآنية والتطويل وعلامات الاتجاه
_STRIP = re.compile(
    "["
    "ؐ-ؚ"  # علامات صلى الله عليه وسلم ونحوها
    "ً-ٟ"  # الحركات والتنوين
    "ٰ"         # الألف الخنجرية
    "ۖ-ۭ"  # علامات الوقف والتجويد
    "ـ"         # التطويل
    "​-‏‪-‮﻿"  # محارف غير مرئية
    "]"
)

_MAP = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ٲ": "ا", "ٳ": "ا",
    "ى": "ي", "ئ": "ي",
    "ة": "ه",
    "ؤ": "و",
    "ک": "ك", "گ": "ك",
    "ی": "ي",
})

_NON_ARABIC = re.compile(r"[^ء-ي ]+")
_SPACES = re.compile(r"\s+")


def normalize(text: str) -> str:
    """يُرجع صورة مطبَّعة صالحة للمطابقة النصية الدقيقة."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = _STRIP.sub("", text)
    text = text.translate(_MAP)
    text = _NON_ARABIC.sub(" ", text)
    return _SPACES.sub(" ", text).strip()


def tokens(text: str) -> list[str]:
    n = normalize(text)
    return n.split() if n else []
