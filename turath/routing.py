"""بناء الروابط: وضع الخادم (/ayah/2/255) أو الوضع الثابت (a-2-255.html).

الوضع الثابت يولّد صفحات مسطّحة في الجذر لتُستضاف على GitHub Pages بلا
مسارات متداخلة. الأزرار إلى آيات غير مبنيّة تُعطَّل بدل أن تقود إلى 404.
"""

MODE = "server"          # يُبدَّل إلى "static" أثناء البناء
BUILT = None             # مجموعة (سورة, آية) المبنيّة في الوضع الثابت


def set_static(built):
    global MODE, BUILT
    MODE = "static"
    BUILT = set(built)


def home_href():
    return "index.html" if MODE == "static" else "/"


def surah_href(n=1):
    return "surah.html" if MODE == "static" else f"/surah/{n}"


def ayah_href(s, a):
    if MODE == "static":
        return f"a-{s}-{a}.html"
    return f"/ayah/{s}/{a}"


def ayah_available(s, a):
    """هل صفحة الآية موجودة؟ في الخادم كلها متاحة عند الطلب."""
    if MODE != "static":
        return True
    return BUILT is not None and (s, a) in BUILT
