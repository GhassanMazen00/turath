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


def render_ayah(data) -> str:
    a = data["ayah"]
    parts = [
        '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        f'<title>{e(a["locus_ar"])}</title><style>{CSS}</style></head><body><div class="wrap">',
        '<header class="site"><h1>منصة معرفة إسلامية مترابطة</h1>',
        '<div class="sub">تَنقل ولا تُرجِّح · لا معلومة بلا مصدر · لا إفتاء</div></header>',
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

    parts.append('<footer class="site">تُعرض النصوص كما وردت في مصادرها بلا تعديل '
                 'ولا تصحيح ولا تلخيص. المنصة تنقل أقوال أهل العلم ولا ترجّح بينها، '
                 'ولا تُصدر فتوى.</footer></div></body></html>')
    return "".join(parts)
