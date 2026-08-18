"""بناء الروابط بين الآيات والأحاديث.

ثلاث طرق، ولكلٍّ حجّتها المعروضة للقارئ:

  shared_key  مفتاح مشترك (سورة:آية) — التفسير مبوَّب على الآية أصلًا.
  quotation   الحديث يقتبس نصّ الآية حرفيًا. مطابقة دقيقة بعد التطبيع،
              لا مطابقة تقريبية ولا تشابه إحصائي. الحجّة واقعة يمكن للقارئ
              التحقق منها بنفسه: هذا اللفظ بعينه في الحديث.
  manual      ربط مقرَّر يدويًا يحمل نصّ إسناده إلى موضع مطبوع.

ما لا نفعله: لا نربط بالتشابه الدلالي ولا بالكلمات المفتاحية.
رابط بلا حجّة قابلة للفحص = معلومة بلا مصدر.
"""
import json
from pathlib import Path

from .normalize import normalize

MIN_WORDS = 6          # أقل عدد كلمات متتالية يُعتدّ به اقتباسًا
MANUAL_PATH = Path(__file__).resolve().parent.parent / "data" / "links_manual.json"


def _windows(words: list[str], n: int) -> list[str]:
    return [" ".join(words[i:i + n]) for i in range(len(words) - n + 1)]


def find_quotations(ayah_text: str, hadiths, min_words: int = MIN_WORDS):
    """يُرجع الأحاديث التي تقتبس من الآية، مع أطول لفظ مقتبس.

    hadiths: تكرارٌ لقواميس فيها text_ar (ويُحسب التطبيع هنا أو يُمرَّر جاهزًا).
    """
    words = normalize(ayah_text).split()
    if len(words) < min_words:
        return []
    probes = _windows(words, min_words)          # مرشِّح أولي رخيص
    out = []
    for h in hadiths:
        hn = h.get("text_norm") or normalize(h["text_ar"])
        if not any(p in hn for p in probes):
            continue
        longest = ""
        for n in range(len(words), min_words - 1, -1):
            hit = next((w for w in _windows(words, n) if w in hn), None)
            if hit:
                longest = hit
                break
        if longest:
            out.append({**h, "quoted": longest, "quoted_words": len(longest.split())})
    out.sort(key=lambda r: -r["quoted_words"])
    return out


def other_ayahs_with(phrase: str, quran, exclude=(None, None)) -> list[str]:
    """مواضع أخرى من المصحف يرد فيها اللفظ نفسه.

    اللفظ المشترك بين آيتين لا يُثبت أن الحديث يقصد هذه الآية بعينها.
    نعرض ذلك للقارئ بدل أن نرجّح — «تنقل ولا ترجّح».
    """
    p = normalize(phrase)
    out = []
    for v in quran:
        if (v["chapter"], v["verse"]) == exclude:
            continue
        if p and p in normalize(v["text"]):
            out.append(f'{v["chapter"]}:{v["verse"]}')
    return out


def quotation_evidence(quoted: str, word_count: int, also_in=()) -> str:
    base = (f"يقتبس الحديث من الآية {word_count} كلمة متتالية نصًّا: «{quoted}». "
            "مطابقة لفظية دقيقة بعد تطبيع الرسم، لا اجتهاد فيها.")
    if also_in:
        base += (" تنبيه: هذا اللفظ يرد أيضًا في " + "، ".join(also_in) +
                 " — فقد يكون المقصود موضعًا آخر. المنصة تعرض ولا ترجّح.")
    return base


def load_manual(surah: int, ayah: int) -> list[dict]:
    """روابط مقرَّرة يدويًا. كل مدخلة تحمل إسنادها إلى موضع مطبوع."""
    if not MANUAL_PATH.exists():
        return []
    data = json.loads(MANUAL_PATH.read_text(encoding="utf-8"))
    return [e for e in data.get(f"{surah}:{ayah}", [])]


TITLES_PATH = Path(__file__).resolve().parent.parent / "data" / "ayah_titles.json"


def ayah_titles(surah: int, ayah: int) -> list[dict]:
    """أسماء مشتهرة للآية، مُقرَّرة يدويًا ومسنَدة."""
    if not TITLES_PATH.exists():
        return []
    data = json.loads(TITLES_PATH.read_text(encoding="utf-8"))
    return data.get("titles", {}).get(f"{surah}:{ayah}", [])


def find_by_name(titles: list[dict], hadiths):
    """أحاديث تسمّي الآية باسمها المشتهر دون أن تقتبس لفظها.

    يلتقط ما تفوته المطابقة اللفظية: «من قرأ آية الكرسي…».
    المطابقة على الاسم بعد التطبيع — دقيقة لا تقريبية.
    """
    if not titles:
        return []
    probes = [(t["name"], normalize(t["name"]), t) for t in titles]
    out = []
    for h in hadiths:
        hn = h.get("text_norm") or normalize(h["text_ar"])
        for raw, needle, meta in probes:
            if needle and needle in hn:
                out.append({**h, "named": raw, "title_meta": meta})
                break
    return out


def naming_evidence(name: str, meta: dict) -> str:
    return (f"يذكر الحديث الآية باسمها «{name}» دون أن يقتبس لفظها. "
            f"إسناد التسمية: {meta.get('attested_ar','')} "
            f"({meta.get('source_ar','')})")
