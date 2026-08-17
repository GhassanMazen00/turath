"""Turn OCR'd pages of Ibn Kathir into structured, source-anchored records.

The pipeline never invents an interpretive link. It only recovers what the book
itself states: which ayah a passage comments on (from the running header), which
Quranic text is being quoted (matched against the verified mushaf), and which
authority a report is attributed to (from the book's own wording).

Output per page: build/extract/pNNNN.json
"""
import json, os, re, sys
from rapidfuzz import fuzz

sys.path.insert(0, "scripts")
from arabic import normalize
from match_quran import QuranIndex

SURAHS = json.load(open("data/surahs.json"))

# The scan renders ﴿ ﴾ as an unstable soup of glyphs. The closing bracket is the
# reliable half: it lands on "4" almost every time, while hadith quotes close on
# "»". That asymmetry is what separates Quranic quotation from prophetic report.
QURAN_QUOTE = re.compile(r"[«»<>#9ظلٍَُِّٰﭐ﴿(]{1,3}\s*([^\n4﴾]{8,240}?)\s*[4﴾]")
HADITH_QUOTE = re.compile(r"[«(]\s*([^\n«»()]{12,400}?)\s*[»)]")
BRACKET_CITE = re.compile(r"\[([^\]\n]{3,40})\]")
HEADER_SURAH = re.compile(r"سورة\s+([^\n]{2,28})")

# Ibn Kathir's own citation vocabulary — collectors, commentators, isnad openers.
COLLECTORS = [
    "البخاري", "مسلم", "الصحيحين", "صحيح مسلم", "صحيح البخاري", "أبو داود",
    "الترمذي", "النسائي", "ابن ماجه", "أحمد", "المسند", "الموطأ", "مالك",
    "ابن جرير", "ابن أبي حاتم", "ابن مردويه", "البيهقي", "الحاكم", "الدارقطني",
    "الطبراني", "البزار", "عبد الرزاق", "سعيد بن منصور", "أبو يعلى",
]
ISNAD_OPENER = re.compile(r"(حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|ثنا)\s+([^\n،,؛\.]{3,40})")
GRADING = re.compile(r"(صحيح|حسن|ضعيف|منكر|موضوع|مرسل|غريب|متواتر|إسناده\s+\S+)")


def parse_header(line):
    """Extract the sura being commented on from a page's running header.

    The header reads «سورة الفاتحة، الآية: ٥», but the scan mangles the comma into
    any of »ق. so the sura name cannot be delimited by punctuation. Instead try
    the first one, two and three words after «سورة» and keep the best match —
    that covers both «البقرة» and «آل عمران»."""
    m = HEADER_SURAH.search(line)
    if not m:
        return None
    words = normalize(m.group(1)).split()
    best, score = None, 0
    for take in (1, 2, 3):
        got = " ".join(words[:take])
        if not got:
            continue
        for s in SURAHS:
            sc = fuzz.ratio(got, s["name_norm"])
            if sc > score:
                best, score = s, sc
    return {"surah": best["index"], "name": best["name"], "score": round(score, 1)} if score >= 72 else None


def resolve_cited_surah(tail):
    """A quote is often followed by [الفرقان: 26]; that naming beats guesswork."""
    m = BRACKET_CITE.search(tail)
    if not m:
        return None
    got = normalize(m.group(1).split(":")[0])
    best, score = None, 0
    for s in SURAHS:
        sc = fuzz.ratio(got, s["name_norm"])
        if sc > score:
            best, score = s, sc
    return best["index"] if score >= 75 else None


def extract_page(path, qi):
    raw = open(path).read()
    lines = [l for l in raw.splitlines()]
    header = parse_header(lines[0]) if lines else None
    body = "\n".join(lines[1:])
    current_surah = header["surah"] if header else None

    quran_quotes = [{
        "ocr": h["ocr"],
        "match": {"span": [f"{c}:{v}" for c, v in h["verses"]],
                  "canonical": h["text"], "score": h["score"], "seeds": h["seeds"]},
    } for h in qi.find_all(body)]

    legacy_quotes, seen = [], set()
    for m in QURAN_QUOTE.finditer(body):
        frag = m.group(1).strip()
        if len(normalize(frag)) < 8:
            continue
        cited = resolve_cited_surah(body[m.end():m.end() + 60])
        hit = qi.find(frag, restrict_surah=cited or current_surah)
        if hit is None and (cited or current_surah):
            hit = qi.find(frag)                     # fall back to a free search
        key = (m.start(), frag[:20])
        if key in seen:
            continue
        seen.add(key)
        legacy_quotes.append({
            "ocr": frag,
            "cited_surah": cited,
            "match": None if hit is None else {
                "primary": f"{hit['primary'][0]}:{hit['primary'][1]}",
                "span": [f"{c}:{v}" for c, v in hit["verses"]],
                "canonical": hit["text"],
                "score": hit["score"],
                "confident": hit["confident"],
            },
        })

    reports = []
    for m in HADITH_QUOTE.finditer(body):
        text = m.group(1).strip()
        if len(normalize(text)) < 12:
            continue
        window = body[max(0, m.start() - 320):m.start()]
        attributed = [c for c in COLLECTORS if c in window]
        isnad = [f"{a} {b}".strip() for a, b in ISNAD_OPENER.findall(window)]
        grades = list({g.strip() for g in GRADING.findall(window)})
        if not (attributed or isnad or "رسول الله" in window or "النبي" in window):
            continue                                 # not a report, just a phrase
        reports.append({
            "text": text,
            "attributed_to": attributed,
            "isnad_openers": isnad[-6:],
            "grading_words": grades,
        })

    return {
        "source_page": int(re.search(r"p(\d+)", os.path.basename(path)).group(1)),
        "header": header,
        "quran_quotes": quran_quotes,
        "quran_quotes_bracket_method": legacy_quotes,
        "reports": reports,
        "chars": len(body),
    }


if __name__ == "__main__":
    first, last = int(sys.argv[1]), int(sys.argv[2])
    os.makedirs("build/extract", exist_ok=True)
    qi = QuranIndex()
    tot_q = tot_ok = tot_conf = tot_r = 0
    for n in range(first, last + 1):
        p = f"build/ocr/p{n:04d}.txt"
        if not os.path.exists(p):
            continue
        rec = extract_page(p, qi)
        json.dump(rec, open(f"build/extract/p{n:04d}.json", "w"), ensure_ascii=False, indent=1)
        q = rec["quran_quotes"]
        strong = [x for x in q if x["match"]["score"] >= 85]
        tot_q += len(q); tot_ok += len(strong); tot_r += len(rec["reports"])
        hdr = rec["header"]["name"] if rec["header"] else "—"
        print(f"p{n}: surah={hdr:10} quran={len(q):3} (score>=85: {len(strong):2})  reports={len(rec['reports'])}")
    print(f"\nTOTAL quran quotes located={tot_q}  of which score>=85: {tot_ok} ({tot_ok/max(tot_q,1):.0%})  reports={tot_r}")
