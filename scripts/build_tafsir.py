"""Assemble per-ayah tafsir records from the OCR'd pages.

The page→ayah map comes from the printed running headers, read off the scans
directly. Tesseract mangles the Arabic-Indic numerals in those headers
(«الآيات: ١٢٥ ـ ١٢٨» → «١8-6»), so the mapping is transcribed rather than
guessed, and kept here as data the pipeline can be audited against.
"""
import json, os, re, sys

sys.path.insert(0, "scripts")
from match_quran import QuranIndex

# surah 1, Ibn Kathir, printed pages of the 1-500 volume.
FATIHA_MAP = [
    {"kind": "intro", "title": "فاتحة الكتاب وفضلها", "pages": [54, 55, 56, 57]},
    {"kind": "intro", "title": "الكلام على تفسير الاستعاذة", "pages": [58, 59, 60]},
    {"kind": "ayah", "ayat": [1], "pages": [61, 62, 63, 64, 65, 66]},
    {"kind": "ayah", "ayat": [2], "pages": [67, 68]},
    {"kind": "ayah", "ayat": [3, 4], "pages": [69]},
    {"kind": "ayah", "ayat": [5], "pages": [70]},
    {"kind": "ayah", "ayat": [6], "pages": [71, 72]},
    {"kind": "ayah", "ayat": [7], "pages": [73, 74, 75, 76]},
]

# Systematic tesseract confusions on this typeface. Display-only cleanup: the
# Arabic comma and full stop are rendered as » and ء far more often than not.
FIXES = [(r"»", "،"), (r"[ ]+([،.؛:؟])", r"\1"), (r"\s{2,}", " ")]


def page_text(n):
    """Prefer a vision transcription when one exists.

    data/ocr_vision holds pages read off the scan directly. They are already
    clean and header-free, so they are used verbatim; tesseract output still
    needs its first line (the running header) stripped."""
    vision = f"data/ocr_vision/p{n:04d}.txt"
    if os.path.exists(vision):
        return open(vision).read().strip()
    p = f"build/ocr/p{n:04d}.txt"
    if not os.path.exists(p):
        return ""
    lines = open(p).read().splitlines()
    return "\n".join(lines[1:]).strip()          # line 1 is the running header


def text_layer(pages):
    seen = {"vision" if os.path.exists(f"data/ocr_vision/p{n:04d}.txt") else "tesseract"
            for n in pages}
    return "vision" if seen == {"vision"} else ("mixed" if len(seen) > 1 else "tesseract")


def clean(text):
    for pat, rep in FIXES:
        text = re.sub(pat, rep, text)
    return "\n\n".join(p.strip() for p in text.split("\n\n") if p.strip())


def build(surah, mapping, qi):
    quran = json.load(open("data/quran/uthmani_hafs.json"))["quran"]
    ayat = {a["verse"]: a["text"] for a in quran if a["chapter"] == surah}
    sections = []
    for entry in mapping:
        text = clean("\n".join(page_text(p) for p in entry["pages"]))
        quotes = qi.find_all(text)
        sec = {
            "kind": entry["kind"],
            "pages": entry["pages"],
            "text_layer": text_layer(entry["pages"]),
            "text": text,
            "quran_quotes": [{
                "verses": [f"{c}:{v}" for c, v in q["verses"]],
                "canonical": q["text"],
                "score": q["score"],
            } for q in quotes if q["score"] >= 85],
        }
        if entry["kind"] == "ayah":
            sec["ayat"] = entry["ayat"]
            sec["ayah_text"] = [{"n": n, "text": ayat[n]} for n in entry["ayat"]]
        else:
            sec["title"] = entry["title"]
        sections.append(sec)
    return {
        "surah": surah,
        "book": "تفسير القرآن العظيم — ابن كثير",
        "source_file": "Noor-Book.com تفسير القرآن العظيم تفسير ابن كثير-1-500.pdf",
        "text_layer": text_layer([p for e in mapping for p in e["pages"]]),
        "sections": sections,
    }


if __name__ == "__main__":
    os.makedirs("data/tafsir", exist_ok=True)
    qi = QuranIndex()
    rec = build(1, FATIHA_MAP, qi)
    out = "data/tafsir/ibn_kathir_001.json"
    json.dump(rec, open(out, "w"), ensure_ascii=False, indent=1)
    chars = sum(len(s["text"]) for s in rec["sections"])
    print(f"{out}: {len(rec['sections'])} sections, {chars} chars")
    for s in rec["sections"]:
        label = s.get("title") or "الآية " + "، ".join(str(a) for a in s.get("ayat", []))
        print(f"  {label:34} pages={s['pages'][0]}-{s['pages'][-1]:<4} chars={len(s['text']):6} quotes={len(s['quran_quotes'])}")
