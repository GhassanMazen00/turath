"""صفحات تُراث: الرئيسية وصفحة السورة، بلغة بصرية مستوحاة من تذهيب المصاحف.

صفحة السورة: كل آية عليها مِيْدالية ذهبية، والضغط يكشف تفسيرها (مختصر
افتراضيًا، ويُتوسَّع إلى تفسير ابن كثير لهذه الآية بعينها — تُصدَّر الآية
فوقه ليتأكّد القارئ أنه تفسيرها). الأحاديث والمسائل في خانتين أسفل السورة.

النصوص كما وردت. الأحاديث تُجلب بنصّها من كتبها. لا يُختلق شيء.
"""
import html
import json
from pathlib import Path

from . import routing
from .sources import hadith, surahs
from .sources.http import fetch_json, SourceUnavailable
from .sources.quran import BASE as QBASE, EDITION as QED
from .sources.tafsir import BASE as TBASE

DATA = Path(__file__).resolve().parent.parent / "data"
WEB = Path(__file__).resolve().parent / "web"
CSS = (WEB / "site.css").read_text(encoding="utf-8")
JS = (WEB / "surah.js").read_text(encoding="utf-8")

TAFSIR_SHORT = "ar-tafsir-al-mukhtasar"
TAFSIR_FULL = "ar-tafsir-ibn-kathir"
NAME_SHORT = "المختصر في التفسير"
NAME_FULL = "تفسير ابن كثير"
DORAR = "https://dorar.net/hadith/search?q="

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" media="print" onload="this.media=\'all\'" '
         'href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&'
         'family=Reem+Kufi:wght@400;500;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap">'
         '<noscript><link rel="stylesheet" '
         'href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&'
         'family=Reem+Kufi:wght@400;500;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap"></noscript>')

SEAL = ('<svg class="seal" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        '<path d="M12 1.6l2.6 2.2 3.4-.3.9 3.3 2.9 1.8-1.3 3.2 1.3 3.2-2.9 1.8-.9 3.3-3.4-.3'
        'L12 22.4 9.4 20.2l-3.4.3-.9-3.3-2.9-1.8 1.3-3.2L2.2 9 5.1 7.2 6 3.9l3.4.3z" '
        'stroke="currentColor" stroke-width="1.1" fill="var(--gold-soft)"/>'
        '<circle cx="12" cy="12" r="4.4" stroke="currentColor" stroke-width="1.1"/></svg>')

STAR = ('<svg class="star" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        '<path d="M12 2l2.2 5.8L20 8.4l-4.2 4 1.3 6-5.1-3-5.1 3 1.3-6L4 8.4l5.8-.6z" '
        'fill="currentColor" opacity=".9"/></svg>')

MEDALLION = ('<svg class="frame" viewBox="0 0 40 40" fill="none" aria-hidden="true">'
             '<circle cx="20" cy="20" r="18.4" stroke="currentColor" stroke-width="1"/>'
             '<circle cx="20" cy="20" r="15" stroke="currentColor" stroke-width=".7" opacity=".6"/>'
             '<g stroke="currentColor" stroke-width=".7" opacity=".8">'
             '<path d="M20 1.6v3M20 35.4v3M1.6 20h3M35.4 20h3"/></g></svg>')

ICONS = {
    "tafsir": '<path d="M4 5h11a2 2 0 012 2v12H6a2 2 0 01-2-2z" stroke="currentColor" stroke-width="1.4"/><path d="M8 9h7M8 12h7M8 15h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    "hadith": '<path d="M12 3l7 4v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 11l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    "fiqh": '<path d="M12 3v16M6 8l6-3 6 3M5 8l-2 5a3 3 0 006 0L7 8M17 8l-2 5a3 3 0 006 0l-2-5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
}


def e(s):
    return html.escape(s or "")


def icon(name, cls="ic"):
    return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" aria-hidden="true">{ICONS[name]}</svg>'


def paras(text):
    blocks = [b.strip() for b in (text or "").split("\n") if b.strip()]
    return "".join(f'<p class="para">{e(b)}</p>' for b in blocks)


def _fetch(url):
    return fetch_json(url)


def _verse_text(s, a):
    url = f"{QBASE}/editions/{QED}/{s}/{a}.json"
    return _fetch(url)["text"], url


def _tafsir(edition, s, a):
    url = f"{TBASE}/tafsir/{edition}/{s}/{a}.json"
    try:
        return _fetch(url)["text"].strip(), url
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


def _shell(title, inner, home_link="index.html"):
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>{FONTS}<style>{CSS}</style></head><body>
<nav class="nav"><div class="nav-in">
  <a class="brand" href="{home_link}">{SEAL}تُراث</a>
  <div class="nav-links"><a href="{home_link}">الرئيسية</a>
  <a href="{routing.surah_href(1) if routing.MODE=='static' else '/surah/1'}">الفاتحة</a></div>
</div></nav>
{inner}
</body></html>"""


# ————————————————— الصفحة الرئيسية —————————————————
def render_home():
    fatiha = routing.ayah_href(1, 1) if routing.MODE == "server" else "surah-1.html"
    inner = f"""<main class="wrap">
  <section class="hero">
    <div class="ey">منصة معرفة إسلامية مترابطة</div>
    <h1>تُراث</h1>
    <div class="rule">{STAR}</div>
    <p class="lede">لكل آية: تفسيرها، والأحاديث المرتبطة بها، وأحكام العلماء
      والمسائل الفقهية — مجموعةً في مكان واحد، كلٌّ موصولٌ بمصدره.</p>
    <div class="creed"><span>تَنقل ولا تُرجِّح</span><span>لا معلومة بلا مصدر</span>
      <span>لا إفتاء</span><span>لا يُختلق نصّ</span></div>
    <a class="cta" href="{fatiha}">ابدأ بسورة الفاتحة ←</a>
  </section>

  <div class="rule">{STAR}</div>

  <section class="feature">
    <div class="fcell">{icon('tafsir')}<h3>التفسير</h3>
      <p>تفسير مختصر لكل آية، ويُتوسَّع إلى التفسير الكامل لها من تفسير ابن كثير.</p></div>
    <div class="fcell">{icon('hadith')}<h3>الأحاديث</h3>
      <p>الأحاديث المرتبطة بالسورة بنصّها من كتبها، مع بيان صلتها ورابط أحكام العلماء.</p></div>
    <div class="fcell">{icon('fiqh')}<h3>المسائل الفقهية</h3>
      <p>المسائل المتعلقة بالسورة مع أدلّتها المنقولة — عرضٌ بلا ترجيح ولا إفتاء.</p></div>
  </section>

  <div class="sources">
    <b>المصادر:</b> القرآن من quran-api · التفسير من tafsir_api · الأحاديث من
    hadith-json · وأحكام العلماء من الدرر السنية. كلّ عنصر معروض يحمل مصدره
    وموضعه ورابط أصله. تُعرض النصوص كما وردت بلا تعديل ولا تلخيص.
  </div>

  <footer class="foot">تُراث — تنقل أقوال أهل العلم ولا ترجّح بينها ولا تُصدر فتوى.</footer>
</main>"""
    return _shell("تُراث · منصة معرفة إسلامية مترابطة", inner)


# ————————————————— صفحة السورة —————————————————
def _verse_card(surah, a):
    vtext, vurl = _verse_text(surah, a)
    short, surl = _tafsir(TAFSIR_SHORT, surah, a)
    full, furl = _tafsir(TAFSIR_FULL, surah, a)

    short_html = (f'<p class="taf-text">{e(short)}</p>' if short
                  else '<p class="empty">لم يُجلب تفسير مختصر لهذه الآية.</p>')
    full_html = ""
    if full:
        full_html = (
            '<details class="taf-full"><summary><span class="plus">+</span>'
            f'التفسير الكامل لهذه الآية — {e(NAME_FULL)}</summary>'
            f'<div class="verse-echo">﴿ {e(vtext)} ﴾</div>'
            f'<div class="taf-longtext">{paras(full)}</div>'
            f'<a class="src" href="{e(furl)}" target="_blank" rel="noopener">المصدر</a></details>')

    return f"""
<div class="verse" id="v{a}">
  <button class="vrow" aria-expanded="false" aria-controls="d{a}">
    <span class="medallion">{MEDALLION}<b>{a}</b></span>
    <span class="vtext">{e(vtext)}</span>
    <span class="vchev"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </button>
  <div class="detail" id="d{a}" hidden>
    <div class="taf-tag">{e(NAME_SHORT)}
      <a class="src" href="{e(surl)}" target="_blank" rel="noopener">المصدر</a></div>
    {short_html}
    {full_html}
  </div>
</div>"""


def _hadith_section(surah):
    items = _curation(surah).get("hadith", [])
    cards = []
    for ref in items:
        hd = _hadith_text(ref["book"], ref["no"])
        if not hd:
            continue
        cards.append(f"""
<div class="hcard">
  <div class="lbl"><span class="dot"></span>{e(ref.get("label",""))}</div>
  <p class="htext">{e(hd["text"])}</p>
  <div class="why"><b>صلته بالسورة:</b> {e(ref.get("context",""))}</div>
  <div class="hmeta"><span class="loc">{e(hd["locus"])}</span>
    <a class="src" href="{e(hd["url"])}" target="_blank" rel="noopener">نصّ الكتاب</a>
    <a class="src" href="{DORAR}{e(hd["text"][:40])}" target="_blank" rel="noopener">أحكام العلماء · الدرر</a>
  </div>
</div>""")
    if not cards:
        return ""
    return (f'<section class="block" id="ahadith"><div class="bhead">'
            f'<h2>الأحاديث المرتبطة بالسورة</h2><span class="count">{len(cards)}</span>'
            f'<span class="line"></span></div>{"".join(cards)}</section>')


def _fiqh_section(surah):
    items = _curation(surah).get("fiqh", [])
    if not items:
        return ""
    cards = "".join(
        f'<div class="fcard"><div class="ftopic">{e(x["topic"])}</div>'
        f'<div class="fev"><b>من أدلتها:</b> {e(x["evidence"])}</div></div>'
        for x in items)
    return (f'<section class="block" id="fiqh"><div class="bhead">'
            f'<h2>المسائل الفقهية</h2><span class="count">{len(items)}</span>'
            f'<span class="line"></span></div>{cards}'
            '<p class="disclaim">تُعرض المسألة ودليلها المنقول فقط — تنقل ولا ترجّح ولا تُفتي.</p></section>')


def build_surah(surah=1, log=print):
    meta = surahs.surah(surah)
    cards = []
    for a in range(1, meta["verse_count"] + 1):
        cards.append(_verse_card(surah, a))
        log(f"  آية {surah}:{a}")
    inner = f"""<main class="wrap">
  <div class="surah-frame">
    <div class="kaf">سورة</div>
    <h1>{e(meta['name_ar'].replace('سُوْرَةُ ','').replace('سورة ',''))}</h1>
    <div class="meta">{e(meta['revelation'])} · {meta['verse_count']} آيات</div>
  </div>
  <p class="reading-hint">اضغط أيّ آية لعرض تفسيرها. الأحاديث والمسائل الفقهية أسفل السورة.</p>
  <div class="verses">{''.join(cards)}</div>
  {_hadith_section(surah)}
  {_fiqh_section(surah)}
  <footer class="foot">تُعرض النصوص كما وردت في مصادرها بلا تعديل ولا تلخيص.
  الأحاديث من hadith-json، والتفسير من tafsir_api، والقرآن من quran-api.</footer>
</main>
<script>{JS}</script>"""
    return _shell(f"{meta['name_ar']} · تُراث", inner)
