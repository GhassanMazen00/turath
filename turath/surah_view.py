"""صفحة السورة الكاملة: كل الآيات معروضة، وكل آية قابلة للنقر.

عند النقر تنفتح تفاصيل الآية: التفسير (مختصر مع خيار السعدي)،
الأحاديث المرتبطة، المسائل الفقهية، وأحداث السيرة — كلٌّ بمصدره.

تصميم فاتح، قراءة مريحة، صفحة واحدة مكتفية بذاتها (بلا خادم).
النصوص كما وردت في مصادرها. الأحاديث تُجلب بنصّها من كتبها. لا اختلاق.
"""
import html
import json
from pathlib import Path

from .sources import hadith, surahs
from .sources.http import fetch_json, SourceUnavailable
from .sources.quran import BASE as QBASE, EDITION as QED
from .sources.tafsir import BASE as TBASE, EDITION_NAMES

DATA = Path(__file__).resolve().parent.parent / "data"

# تفسيران: مختصر للعرض الافتراضي، والسعدي للتوسّع
TAFSIR_SHORT = "ar-tafsir-al-mukhtasar"
TAFSIR_LONG = "ar-tafsir-as-saadi"
TAFSIR_NAMES = {TAFSIR_SHORT: "المختصر في التفسير",
                TAFSIR_LONG: "تيسير الكريم الرحمن — السعدي"}
DORAR = "https://dorar.net/hadith/search?q="


def e(s):
    return html.escape(s or "")


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
    return {
        "text": h["arabic"],
        "locus": f"{hadith.BOOKS.get(slug, slug)} — حديث رقم {no}",
        "book_name": hadith.BOOKS.get(slug, slug),
        "url": hadith.book_url(slug),
    }


def _load_curation(surah):
    p = DATA / f"surah_{surah}.json"
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8")).get("verses", {})


CSS = (Path(__file__).resolve().parent / "web" / "surah.css").read_text(encoding="utf-8")
JS = (Path(__file__).resolve().parent / "web" / "surah.js").read_text(encoding="utf-8")


def build_surah(surah=1, log=print):
    meta = surahs.surah(surah)
    curation = _load_curation(surah)
    n = meta["verse_count"]
    rows = []

    for a in range(1, n + 1):
        vtext, vurl = _verse_text(surah, a)
        short, surl = _tafsir(TAFSIR_SHORT, surah, a)
        long, lurl = _tafsir(TAFSIR_LONG, surah, a)
        cur = curation.get(str(a), {})

        # التفسير
        taf = []
        if short:
            taf.append(
                f'<div class="taf-block"><div class="taf-name">{e(TAFSIR_NAMES[TAFSIR_SHORT])}</div>'
                f'<p class="taf-text">{e(short)}</p>'
                f'<a class="src" href="{e(surl)}" target="_blank" rel="noopener">المصدر · تفسير مهيكل</a></div>')
        if long:
            taf.append(
                f'<details class="taf-more"><summary>توسّع: {e(TAFSIR_NAMES[TAFSIR_LONG])}</summary>'
                f'<p class="taf-text">{e(long)}</p>'
                f'<a class="src" href="{e(lurl)}" target="_blank" rel="noopener">المصدر</a></details>')
        taf_html = "".join(taf) or '<p class="empty">لم يُجلب تفسير لهذه الآية.</p>'

        # الأحاديث
        had = []
        for ref in cur.get("hadith", []):
            hd = _hadith_text(ref["book"], ref["no"])
            if not hd:
                continue
            had.append(
                f'<div class="hcard"><p class="htext">{e(hd["text"])}</p>'
                f'<div class="why"><span class="whyb">لِمَ ارتبط:</span> {e(ref["relation"])}</div>'
                f'<div class="hmeta"><span class="loc">{e(hd["locus"])}</span>'
                f'<a class="src" href="{e(hd["url"])}" target="_blank" rel="noopener">نصّ الكتاب</a>'
                f'<a class="src" href="{DORAR}{e(hd["text"][:40])}" target="_blank" rel="noopener">أحكام العلماء · الدرر</a>'
                f'</div></div>')
        had_html = ("".join(had) if had else
                    '<p class="empty">لا حديث مُقرَّر الارتباط بهذه الآية في هذه المرحلة.</p>')

        # المسائل الفقهية
        fiqh = cur.get("fiqh", [])
        if fiqh:
            fq = "".join(
                f'<div class="fcard"><div class="ftopic">{e(x["topic"])}</div>'
                f'<div class="fev"><span class="whyb">من أدلتها:</span> {e(x["evidence"])}</div></div>'
                for x in fiqh)
            fiqh_html = (fq + '<p class="disclaim">تُعرض المسألة ودليلها المنقول فقط — '
                         'المنصة تنقل ولا ترجّح ولا تُفتي.</p>')
        else:
            fiqh_html = ('<p class="empty">لا مسألة فقهية مُقرَّرة لهذه الآية بعد. '
                         'لا تُملأ باختلاق.</p>')

        # السيرة
        sira_html = ('<p class="empty">لا أحداث سيرة مرتبطة مباشرةً بهذه الآية. '
                     'لا يوجد مصدر مهيكل، ولا تُملأ باختلاق.</p>')

        counts = f'{len(had)} حديث' if had else 'لا أحاديث'
        rows.append(f"""
<div class="verse" id="v{a}">
  <button class="vrow" aria-expanded="false" aria-controls="d{a}">
    <span class="vnum">{a}</span>
    <span class="vtext">{e(vtext)}</span>
    <span class="vchev" aria-hidden="true">﹀</span>
  </button>
  <div class="detail" id="d{a}" hidden>
    <div class="vsrc">﴿{e(vtext)}﴾ — <a class="src" href="{e(vurl)}" target="_blank" rel="noopener">المصدر: مصحف {surah}:{a}</a></div>
    <div class="tabs" role="tablist">
      <button class="tab active" data-t="taf">التفسير</button>
      <button class="tab" data-t="had">الأحاديث <span class="tcount">{counts}</span></button>
      <button class="tab" data-t="fiqh">المسائل الفقهية</button>
      <button class="tab" data-t="sira">أحداث السيرة</button>
    </div>
    <div class="panel active" data-p="taf">{taf_html}</div>
    <div class="panel" data-p="had">{had_html}</div>
    <div class="panel" data-p="fiqh">{fiqh_html}</div>
    <div class="panel" data-p="sira">{sira_html}</div>
  </div>
</div>""")
        log(f"  آية {surah}:{a} — {len(had)} حديث")

    body = f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(meta['name_ar'])} · تُراث</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap">
<style>{CSS}</style></head><body>
<header class="top">
  <div class="brand">تُراث</div>
  <div class="sub">لكل آية: تفسيرها وأحاديثها ومسائلها — كلٌّ بمصدره</div>
</header>
<main class="wrap">
  <div class="surah-head">
    <h1>{e(meta['name_ar'])}</h1>
    <div class="smeta">{e(meta['revelation'])} · {meta['verse_count']} آيات</div>
    <p class="hint">اضغط أي آية لعرض تفسيرها والأحاديث المرتبطة بها.</p>
  </div>
  <div class="verses">{''.join(rows)}</div>
  <footer class="foot">تُعرض النصوص كما وردت في مصادرها بلا تعديل ولا تلخيص.
  المنصة تنقل أقوال أهل العلم ولا ترجّح بينها ولا تُفتي. الأحاديث من
  <a href="https://github.com/AhmedBaset/hadith-json" target="_blank" rel="noopener">hadith-json</a>،
  والتفسير من <a href="https://github.com/spa5k/tafsir_api" target="_blank" rel="noopener">tafsir_api</a>،
  والقرآن من <a href="https://github.com/fawazahmed0/quran-api" target="_blank" rel="noopener">quran-api</a>.</footer>
</main>
<script>{JS}</script>
</body></html>"""
    return body
