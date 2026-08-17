"""Arabic normalisation shared by search and by Quran matching."""
import re

TASHKEEL = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]")
TATWEEL  = re.compile(r"ـ")
NONARAB  = re.compile(r"[^ء-ي\s]")

def normalize(s: str) -> str:
    """Strip diacritics/ornaments and unify letter shapes. Used for matching only;
    the original text is always kept for display."""
    s = TASHKEEL.sub("", s)
    s = TATWEEL.sub("", s)
    s = NONARAB.sub(" ", s)
    s = re.sub("[أإآٱا]", "ا", s)
    s = re.sub("[ىي]", "ي", s)
    s = re.sub("ة", "ه", s)
    s = re.sub("[ؤئء]", "ء", s)
    return re.sub(r"\s+", " ", s).strip()


# Arabic OCR confuses letters that differ only in dots (ز/ر, ب/ت/ث/ن/ي, ف/ق …).
# Folding each family to one representative gives the consonantal skeleton, which
# survives OCR damage far better than the letters themselves. Used for matching
# only — never for display.
_SKELETON = str.maketrans({
    "ت": "ب", "ث": "ب", "ن": "ب", "ي": "ب",
    "ج": "ح", "خ": "ح",
    "ذ": "د",
    "ز": "ر",
    "ش": "س",
    "ض": "ص",
    "ظ": "ط",
    "غ": "ع",
    "ق": "ف",
    "ه": "ه", "ة": "ه",
    "أ": "ا", "إ": "ا", "آ": "ا", "ى": "ا", "ء": "ا", "ؤ": "ا", "ئ": "ا",
})

def skeleton(s: str) -> str:
    return normalize(s).translate(_SKELETON)
