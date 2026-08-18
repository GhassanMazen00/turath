"""صفحة السورة: كل آية قابلة للنقر تكشف تفسيرها. وبعد الآيات: خانتان
للأحاديث المرتبطة بالسورة وللمسائل الفقهية.

التفسير المختصر افتراضيًا، ويُتوسَّع إلى التفسير الكامل لهذه الآية
(ابن كثير — لكل آية على حدة، منسّق فقرات). الأحاديث والمسائل على مستوى
السورة لأن أكثرها يتعلق بها عمومًا. النصوص كما وردت، والأحاديث تُجلب
بنصّها من كتبها، ولا يُختلق شيء.
"""
import html
import json
from pathlib import Path

from .sources import hadith, surahs
from .sources.http import fetch_json, SourceUnavailable
from .sources.quran import BASE as QBASE, EDITION as QED
from .sources.tafsir import BASE as TBASE

DATA = Path(__file__).resolve().parent.parent / "data"

TAFSIR_SHORT = "ar-tafsir-al-mukhtasar"      # مختصر، لكل آية
TAFSIR_FULL = "ar-tafsir-ibn-kathir"         # كامل، لكل آية
NAME_SHORT = "المختصر في التفسير"
NAME_FULL = "تفسير ابن كثير"
DORAR = "https://dorar.net/hadith/search?q="

CSS = (Path(__file__).resolve().parent / "web" / "surah.css").read_text(encoding="utf-8")
JS = (Path(__file__).resolve().parent / "web" / "surah.js").read_text(encoding="utf-8")


def e(s):
    return html.escape(s or "")


def paras(text):
    """يحوّل النص إلى فقرات منسّقة على حدود الأسطر."""
    blocks = [b.strip() for b in (text or "").split("\n") if b.strip()]
    return "".join(f'<p class="para">{e(b)}</p>' for b in blocks)


def _verse_text(s, a):
    url = f"{QBASE}/editions/{QED}/{s}/{a}.json"
    return fetch_json(url)["text"], url


def _tafsir(edition, s, a):
    url = f"{TBASE}/tafsir/{edition}/{s}/{a}.json"
    try:
        return fetch_json(url)["text"].strip(), url
    except SourceUnavailable:
        return None, url


def _hadith_text(slug, no):
    book = hadith.get_book(slug)
    h = next((x for x in book["hadiths"] if x.get("idInBook") == no), None)
    if not h:
        return None
    return {"text": h["arabic"],
            "locus": f"{hadith.BOOKS.get(slug, slug)} — حديث رقم {no}",
            "url": hadith.book_url(slug)}


def _curation(surah):
    p = DATA / f"surah_{surah}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def _verse_card(surah, a):
    vtext, vurl = _verse_text(surah, a)
    short, surl = _tafsir(TAFSIR_SHORT, surah, a)
    full, furl = _tafsir(TAFSIR_FULL, surah, a)

    short_html = (f'<p class="taf-text">{e(short)}</p>' if short
                  else '<p class="empty">لم يُجلب تفسير مختصر لهذه الآية.</p>')
    full_html = ""
    if full:
        full_html = (
            '<details class="taf-full"><summary>التفسير الكامل لهذه الآية — '
            f'{e(NAME_FULL)}</summary>'
            f'<div class="taf-longtext">{paras(full)}</div>'
            f'<a class="src" href="{e(furl)}" target="_blank" rel="noopener">المصدر</a>'
            '</details>')

    return f"""
<div class="verse" id="v{a}">
  <button class="vrow" aria-expanded="false" aria-controls="d{a}">
    <span class="vnum">{a}</span>
    <span class="vtext">{e(vtext)}</span>
    <span class="vchev" aria-hidden="true">﹀</span>
  </button>
  <div class="detail" id="d{a}" hidden>
    <div class="taf-name">{e(NAME_SHORT)}
      <a class="src inline" href="{e(surl)}" target="_blank" rel="noopener">المصدر</a></div>
    {short_html}
    {full_html}
  </div>
</div>"""


def _hadith_section(surah):
    cur = _curation(surah)
    items = cur.get("hadith", [])
    if not items:
        return ""
    cards = []
    for ref in items:
        hd = _hadith_text(ref["book"], ref["no"])
        if not hd:
            continue
        cards.append(f"""
<div class="hcard">
  <div class="hlabel">{e(ref.get("label",""))}</div>
  <p class="htext">{e(hd["text"])}</p>
  <div class="why"><span class="whyb">صلته بالسورة:</span> {e(ref.get("context",""))}</div>
  <div class="hmeta"><span class="loc">{e(hd["locus"])}</span>
    <a class="src" href="{e(hd["url"])}" target="_blank" rel="noopener">نصّ الكتاب</a>
    <a class="src" href="{DORAR}{e(hd["text"][:40])}" target="_blank" rel="noopener">أحكام العلماء · الدرر</a>
  </div>
</div>""")
    return (f'<section class="block" id="ahadith"><h2 class="bhead">'
            f'الأحاديث المرتبطة بالسورة <span class="bcount">{len(cards)}</span></h2>'
            f'{"".join(cards)}</section>')


def _fiqh_section(surah):
    cur = _curation(surah)
    items = cur.get("fiqh", [])
    if not items:
        return ""
    cards = "".join(
        f'<div class="fcard"><div class="ftopic">{e(x["topic"])}</div>'
        f'<div class="fev"><span class="whyb">من أدلتها:</span> {e(x["evidence"])}</div></div>'
        for x in items)
    return (f'<section class="block" id="fiqh"><h2 class="bhead">المسائل الفقهية '
            f'<span class="bcount">{len(items)}</span></h2>{cards}'
            '<p class="disclaim">تُعرض المسألة ودليلها المنقول فقط — '
            'المنصة تنقل ولا ترجّح ولا تُفتي.</p></section>')


def build_surah(surah=1, log=print):
    meta = surahs.surah(surah)
    n = meta["verse_count"]
    verse_cards = []
    for a in range(1, n + 1):
        verse_cards.append(_verse_card(surah, a))
        log(f"  آية {surah}:{a}")

    hadith_html = _hadith_section(surah)
    fiqh_html = _fiqh_section(surah)

    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(meta['name_ar'])} · تُراث</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap"></noscript>
<style>{CSS}</style></head><body>
<header class="top">
  <div class="brand">تُراث</div>
  <div class="sub">لكل آية تفسيرها، ولكل سورة أحاديثها ومسائلها — كلٌّ بمصدره</div>
</header>
<main class="wrap">
  <div class="surah-head">
    <h1>{e(meta['name_ar'])}</h1>
    <div class="smeta">{e(meta['revelation'])} · {meta['verse_count']} آيات</div>
    <p class="hint">اضغط أي آية لعرض تفسيرها. الأحاديث والمسائل الفقهية أسفل السورة.</p>
  </div>
  <div class="verses">{''.join(verse_cards)}</div>
  {hadith_html}
  {fiqh_html}
  <footer class="foot">تُعرض النصوص كما وردت في مصادرها بلا تعديل ولا تلخيص.
  المنصة تنقل أقوال أهل العلم ولا ترجّح بينها ولا تُفتي. الأحاديث من
  <a href="https://github.com/AhmedBaset/hadith-json" target="_blank" rel="noopener">hadith-json</a>،
  والتفسير من <a href="https://github.com/spa5k/tafsir_api" target="_blank" rel="noopener">tafsir_api</a>،
  والقرآن من <a href="https://github.com/fawazahmed0/quran-api" target="_blank" rel="noopener">quran-api</a>.</footer>
</main>
<script>{JS}</script>
</body></html>"""
