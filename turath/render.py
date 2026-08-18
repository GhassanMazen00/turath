"""عرض صفحة الآية.

القواعد المفروضة هنا:
  ٢ — كل عنصر معروض يحمل المصدر والموضع ورابط الأصل.
  ١ — الأحكام تُعرض كلها؛ عند اختلافها يظهر تنبيه «مختلَف فيه» بلا ترجيح.
  ٤ — ما لم يُجلب يُقال صراحةً، ولا يُملأ فراغه.
"""
import html
from pathlib import Path

CSS = (Path(__file__).resolve().parent / "web" / "style.css").read_text(encoding="utf-8")

METHOD_LABEL = {
    "shared_key": "مفتاح مشترك",
    "quotation": "اقتباس لفظي",
    "naming": "تسمية مُقرَّرة",
    "manual": "ربط مُقرَّر يدويًا",
}


def e(s):
    return html.escape(s or "")


def _head(title):
    return (
        '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>{e(title)}</title>'
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
        'family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap">'
        f'<style>{CSS}</style></head><body><div class="wrap">'
    )


def _topbar(active=""):
    return (
        '<nav class="topbar"><a class="brand" href="/">تُراث</a>'
        '<div class="navlinks">'
        '<a href="/">الرئيسية</a>'
        '<a href="/surah/1">الفهرس</a>'
        '<a href="/ayah/1/1">اقرأ من الفاتحة</a>'
        '</div></nav>'
    )


_FOOT = ('<footer class="site">تُعرض النصوص كما وردت في مصادرها بلا تعديل '
         'ولا تصحيح ولا تلخيص. المنصة تنقل أقوال أهل العلم ولا ترجّح بينها، '
         'ولا تُصدر فتوى.</footer></div></body></html>')


def _meta(row, extra=""):
    return (f'<div class="meta"><b>المصدر:</b> {e(row["source_name"])} · '
            f'<b>الموضع:</b> {e(row["locus_ar"])} · '
            f'<a href="{e(row["url"])}" target="_blank" rel="noopener">الأصل</a>'
            f'{extra}</div>')


def _gradings_block(gradings, unit_url):
    if not gradings:
        return ('<div class="grading"><div class="notice">'
                'لم تُجلب أحكام العلماء على هذا الحديث من الدرر السنية. '
                'هذا نقصٌ في البيانات لا حكمٌ بعدم وجودها — ولن يُملأ بغير مصدر.'
                '</div></div>')
    distinct = {g["grade"].strip() for g in gradings}
    out = ['<div class="grading">']
    if len(distinct) > 1:
        out.append('<div class="disputed">مختلَف فيه — تُعرض الأحكام كما وردت '
                   'دون ترجيح بينها.</div>')
    out.append('<table><tr><th>المحدِّث</th><th>الكتاب</th><th>الموضع</th>'
               '<th>الدرجة</th></tr>')
    for g in gradings:
        out.append(f'<tr><td>{e(g["muhaddith"])}</td><td>{e(g["book"])}</td>'
                   f'<td>{e(g["page"]) or "—"}</td><td>{e(g["grade"])}</td></tr>')
    out.append('</table>')
    srcs = {g["url"] for g in gradings}
    for u in srcs:
        out.append(f'<div class="meta"><b>مصدر الأحكام:</b> الدرر السنية · '
                   f'<a href="{e(u)}" target="_blank" rel="noopener">الأصل</a></div>')
    out.append('</div>')
    return "".join(out)


def _pager(nav):
    """شريط التنقّل التسلسلي: السابق · موضع الآية · التالي."""
    if not nav:
        return ""
    prev, cur, nxt = nav.get("prev"), nav.get("here", ""), nav.get("next")
    left = (f'<a class="pg" href="/ayah/{nxt[0]}/{nxt[1]}">'
            f'<span class="pgdir">التالي ›</span></a>') if nxt else '<span class="pg disabled"></span>'
    right = (f'<a class="pg" href="/ayah/{prev[0]}/{prev[1]}">'
             f'<span class="pgdir">‹ السابق</span></a>') if prev else '<span class="pg disabled"></span>'
    return f'<div class="pager">{right}<span class="pgcur">{e(cur)}</span>{left}</div>'


def render_ayah(data, nav=None) -> str:
    a = data["ayah"]
    surah_name = nav.get("surah_name") if nav else ""
    heading = (f'<div class="ayahhead"><span class="surah">{e(surah_name)}</span>'
               f'<span class="aref">آية {a["surah"]}:{a["ayah"]}</span></div>') if surah_name else ""
    parts = [
        _head(a["locus_ar"]),
        _topbar(),
        _pager(nav),
        heading,
        f'<div class="ayah">{e(a["text_ar"])}</div>',
        _meta(a),
    ]

    parts.append(f'<h2 class="section">التفسير <span class="count">'
                 f'({len(data["tafsirs"])})</span></h2>')
    if not data["tafsirs"]:
        parts.append('<div class="notice">لم يُجلب تفسير لهذه الآية.</div>')
    for t in data["tafsirs"]:
        parts.append(f'<div class="card"><div class="text">{e(t["text_ar"])}</div>'
                     f'{_meta(t)}<div class="why">'
                     f'<b>لِمَ ارتبط:</b> {e(t["evidence_ar"])}</div></div>')

    parts.append(f'<h2 class="section">الأحاديث المرتبطة <span class="count">'
                 f'({len(data["hadiths"])})</span></h2>')
    if not data["hadiths"]:
        parts.append('<div class="notice">لم يُبنَ رابط موثَّق بين هذه الآية '
                     'وأي حديث في الكتب المفهرسة.</div>')
    for h in data["hadiths"]:
        tag = METHOD_LABEL.get(h["method"], h["method"])
        tag_html = ' <span class="tag">' + e(tag) + '</span>'
        if h.get("ambiguous"):
            tag_html += ('<span class="tag warn">لفظ مشترك مع '
                         + e(h["shared_with"] or "") + '</span>')
        parts.append(
            '<div class="card"><div class="text">' + e(h["text_ar"]) + '</div>'
            + _meta(h, tag_html)
            + '<div class="why"><b>لِمَ ارتبط:</b> ' + e(h["evidence_ar"]) + '</div>'
            + _gradings_block(h["gradings"], h["url"]) + '</div>')

    for section, note in (("المسائل الفقهية", "الفقه"), ("أحداث السيرة", "السيرة")):
        parts.append(f'<h2 class="section">{section}</h2><div class="notice">'
                     f'لا يوجد مصدر مهيكل بجودة كافية لـ{note} بعد. '
                     f'مؤجَّل عمدًا — ولن يُملأ بمحتوى غير موثّق.</div>')

    parts.append(_pager(nav))
    parts.append(_FOOT)
    return "".join(parts)


def render_home(surahs, indexed=()) -> str:
    """الصفحة الرئيسية: ما المنصة، وكيف تبدأ."""
    indexed = set(indexed)
    cards = "".join(
        f'<a class="feat" href="/ayah/1/1"><b>اقرأ من الفاتحة</b>'
        f'<span>ابدأ من أول المصحف وتنقّل آيةً آية حتى الناس</span></a>'
        f'<a class="feat" href="/surah/1"><b>فهرس السور</b>'
        f'<span>١١٤ سورة — اختر السورة ثم الآية</span></a>'
        for _ in [0])
    demo = "".join(
        f'<a class="chip" href="/ayah/{s}/{a}">{e(label)}</a>'
        for s, a, label in [(2, 255, "آية الكرسي ٢:٢٥٥"),
                            (5, 6, "آية الوضوء ٥:٦"),
                            (1, 1, "الفاتحة ١:١")])
    return (
        _head("تُراث · منصة معرفة إسلامية مترابطة")
        + _topbar()
        + '<section class="hero"><h1>تُراث</h1>'
        '<p class="tagline">لكل آية: تفسيرها، والأحاديث المرتبطة بها، '
        'وأحكام العلماء عليها — في مكان واحد، كلٌّ بمصدره.</p>'
        '<p class="creed">تَنقل ولا تُرجِّح · لا معلومة بلا مصدر · لا إفتاء · '
        'لا يخترع شيء</p></section>'
        f'<div class="feats">{cards}</div>'
        '<h2 class="section">نماذج جاهزة</h2>'
        f'<div class="chips">{demo}</div>'
        '<div class="notice" style="margin-top:1.4rem">التفسير والأحاديث يعملان الآن. '
        'أحكام العلماء من الدرر السنية مبنيّة في الشيفرة لكنها محجوبة في هذه البيئة. '
        'المسائل الفقهية وأحداث السيرة مؤجَّلة حتى يتوفّر مصدر مهيكل — لا تُملأ باختلاق.</div>'
        + _FOOT)


def render_surah_index(surahs, current=None) -> str:
    """فهرس السور، مع إبراز السورة الحالية إن وُجدت."""
    rows = []
    for s in surahs:
        cls = "srow active" if current == s["index"] else "srow"
        rows.append(
            f'<a class="{cls}" href="/ayah/{s["index"]}/1">'
            f'<span class="snum">{s["index"]}</span>'
            f'<span class="sname">{e(s["name_ar"])}</span>'
            f'<span class="smeta">{e(s["revelation"])} · {s["verse_count"]} آية</span>'
            f'</a>')
    return (
        _head("فهرس السور · تُراث")
        + _topbar()
        + '<h1 class="pagetitle">فهرس السور</h1>'
        '<p class="sub">اختر سورة لتبدأ من أول آياتها، ثم تنقّل بالتسلسل.</p>'
        f'<div class="sindex">{"".join(rows)}</div>'
        + _FOOT)
