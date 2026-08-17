"""Locate a (possibly OCR-garbled) Quranic fragment inside the canonical text.

Naive fuzzy matching fails here: short verses such as «الٓمٓ» score 100% against
any fragment under partial_ratio. Instead we search one continuous normalised
corpus with a character n-gram index, which also lets a quote span verses.
"""
import json, sys
from collections import Counter
from rapidfuzz import fuzz
sys.path.insert(0, "scripts")
from arabic import normalize, skeleton

N = 4          # n-gram size (4 tolerates OCR damage better than 5)
BUCKET = 40    # corpus positions per voting bucket
SKIP_ABOVE = 300  # posting-list size above which an n-gram is uninformative
BAND = 3       # diagonals within this distance are one alignment (tolerates indels)
MIN_LEN = 22   # shortest run of skeleton characters accepted as a quotation


class QuranIndex:
    def __init__(self, path="data/quran/uthmani_hafs.json"):
        ayat = json.load(open(path))["quran"]
        self.keys, parts, self.pos2ayah = [], [], []
        for a in ayat:
            norm = skeleton(a["text"])
            idx = len(self.keys)
            self.keys.append(((a["chapter"], a["verse"]), a["text"]))
            parts.append(norm)
            self.pos2ayah.extend([idx] * (len(norm) + 1))   # +1 for the joining space
        self.corpus = " ".join(parts)
        self.pos2ayah = self.pos2ayah[:len(self.corpus)]
        self.index = {}
        for i in range(len(self.corpus) - N + 1):
            self.index.setdefault(self.corpus[i:i + N], []).append(i)
        # Drop n-grams so common they carry no location signal. Truncating their
        # posting lists instead would bias every lookup toward the start of the
        # corpus (al-Baqarah), which is a silent source of wrong matches.
        # Keep every posting list: a surah-restricted search needs the common
        # n-grams too. Ubiquitous grams are skipped at query time instead.
        self.surah_span = {}
        for pos, ai in enumerate(self.pos2ayah):
            ch = self.keys[ai][0][0]
            span = self.surah_span.get(ch)
            self.surah_span[ch] = (pos if span is None else span[0], pos)

    def find(self, fragment, min_score=62, auto_score=78, restrict_surah=None):
        """restrict_surah limits the search to one chapter. Ibn Kathir cites the
        sura himself in square brackets, and that citation beats fuzzy matching:
        identical wording recurs across the Quran (الحمد لله رب العالمين sits in
        1:2, 6:45, 10:10, 37:182, 39:75), so context is what disambiguates."""
        frag = skeleton(fragment)
        if len(frag) < 8:
            return None
        allowed = self.surah_span.get(restrict_surah) if restrict_surah else None
        votes = Counter()
        for i in range(len(frag) - N + 1):
            posting = self.index.get(frag[i:i + N], ())
            if allowed:
                posting = [p for p in posting if allowed[0] <= p <= allowed[1]]
            elif len(posting) > SKIP_ABOVE:
                continue          # carries no location signal in a free search
            for p in posting:
                votes[p // BUCKET] += 1
        if not votes:
            return None
        best = None
        for bucket, _ in votes.most_common(15):
            centre = bucket * BUCKET
            lo = max(0, centre - len(frag))
            hi = min(len(self.corpus), centre + 2 * len(frag))
            window = self.corpus[lo:hi]
            al = fuzz.partial_ratio_alignment(frag, window)
            if al is None:
                continue
            score = al.score
            if best is None or score > best[0]:
                best = (score, lo + al.dest_start, lo + al.dest_end)
        if best is None or best[0] < min_score:
            return None
        score, s, e = best
        mid = self.pos2ayah[min((s + e) // 2, len(self.pos2ayah) - 1)]
        a1, a2 = self.pos2ayah[s], self.pos2ayah[min(e, len(self.pos2ayah) - 1)]
        span = self.keys[a1:a2 + 1]
        return {
            "start": span[0][0], "end": span[-1][0],
            "text": " ".join(t for _, t in span),
            "score": round(score, 1),
            "confident": score >= auto_score,
            "verses": [k for k, _ in span],
            "primary": self.keys[mid][0],   # ayah at the centre of the match
        }

    def find_all(self, page_text, min_score=72, min_seeds=4, restrict_surah=None):
        """Locate every Quranic quotation inside a page of OCR text.

        Parsing the ornamental brackets ﴿ ﴾ out of a damaged scan is unreliable —
        when the opening glyph is lost, the quote silently swallows the prose
        before it. So instead of finding boundaries then matching, we seed-and-
        extend: shared n-grams vote on a diagonal (corpus_pos - page_pos), and a
        well-populated diagonal *is* the quotation, boundaries included.
        """
        page = skeleton(page_text)
        allowed = self.surah_span.get(restrict_surah) if restrict_surah else None
        diagonals = {}
        for i in range(len(page) - N + 1):
            posting = self.index.get(page[i:i + N], ())
            if not posting or (not allowed and len(posting) > SKIP_ABOVE):
                continue
            for p in posting:
                if allowed and not (allowed[0] <= p <= allowed[1]):
                    continue
                d = p - i
                slot = diagonals.get(d)
                if slot is None:
                    diagonals[d] = [1, i, i]
                else:
                    slot[0] += 1
                    if i < slot[1]:
                        slot[1] = i
                    if i > slot[2]:
                        slot[2] = i

        # A single dropped or inserted character shifts the diagonal by one and
        # splits one quotation into several weak diagonals. Merge neighbours
        # within BAND so an indel costs recall instead of destroying it.
        bands = []
        for d in sorted(diagonals):
            votes, lo, hi = diagonals[d]
            # Anchor the band to the diagonal that opened it. Comparing against
            # the previous member instead would let d=100,103,106,… chain into
            # one arbitrarily wide band.
            if bands and d - bands[-1][0] <= BAND:
                b = bands[-1]
                bands[-1] = (b[0], b[1] + votes, min(b[2], lo), max(b[3], hi))
            else:
                bands.append((d, votes, lo, hi))

        hits = []
        for d, votes, lo, hi in bands:
            if votes < min_seeds:
                continue
            ps, pe = lo, hi + N
            cs, ce = ps + d, pe + d
            if cs < 0 or ce > len(self.corpus):
                continue
            # Without a length floor a lone 4-gram seed scores a perfect 100:
            # a 4-character region always matches itself.
            if pe - ps < MIN_LEN:
                continue
            # And require the seeds to actually cover the region rather than
            # sitting at its two ends with noise in between.
            if votes < (pe - ps) / 8:
                continue
            score = fuzz.ratio(page[ps:pe], self.corpus[cs:ce])
            if score < min_score:
                continue
            a1 = self.pos2ayah[cs]
            a2 = self.pos2ayah[min(ce - 1, len(self.pos2ayah) - 1)]
            span = self.keys[a1:a2 + 1]
            hits.append({
                "page_span": (ps, pe),
                "ocr": page_text[ps:pe] if len(page_text) == len(page) else page[ps:pe],
                "verses": [k for k, _ in span],
                "text": " ".join(t for _, t in span),
                "score": round(score, 1),
                "seeds": votes,
            })

        # Keep the strongest hit wherever two overlap on the page.
        hits.sort(key=lambda h: (-h["score"], -h["seeds"]))
        kept = []
        for h in hits:
            s, e = h["page_span"]
            if any(not (e <= ks or s >= ke) for ks, ke in (k["page_span"] for k in kept)):
                continue
            kept.append(h)
        kept.sort(key=lambda h: h["page_span"][0])
        return kept


if __name__ == "__main__":
    qi = QuranIndex()
    tests = [
        ("مديكِ يَوْمِ التيف", "1:4 مالك يوم الدين"),
        ("اليلكُ يَرْمسِذٍ الْحَنُ لليّحمنْ", "25:26"),
        ("ٍإِيّاكَ نمَبدُ وَإِيّاكَ حَنَيِنْ", "1:5"),
        ("أهينًا الصَرط الْمَسَقِيمَ", "1:6"),
        ("صرط الذي أنعمت عَلْهِم غير لْممْصُوبٍ عَليُهِم ولا الصََالِينَ", "1:7"),
        ("الْحَمَد ينه رت العدلييفَ", "1:2"),
        ("لِمَنِ الْمُلكُ الوم به الور الْمَهّارٍ", "40:16"),
        ("فَأميدُْ وتوكل عليه وا ريك بعل عَمَا مون", "11:123"),
        ("أهينًا الصَرط الْمَسَقِيمَ صرط الذي أنعمت عَلْهِم", "1:6-1:7 (spans two)"),
    ]
    for frag, expect in tests:
        r = qi.find(frag)
        got = f"{r['start'][0]}:{r['start'][1]}" + (f"-{r['end'][0]}:{r['end'][1]}" if r['end'] != r['start'] else "") + f" ({r['score']})" if r else "MISS"
        print(f"{got:22} | expect {expect:22} | {r['text'][:46] if r else ''}")
