"""قراءة صفحة الآية من القاعدة، بكل ما يرتبط بها."""
from . import db


def get_ayah_page(conn, surah: int, ayah: int):
    a = conn.execute(
        "SELECT u.*, s.name_ar AS source_name FROM unit u JOIN source s ON s.id=u.source_id"
        " WHERE u.kind='ayah' AND u.surah=? AND u.ayah=?", (surah, ayah)).fetchone()
    if a is None:
        return None

    rows = conn.execute(
        "SELECT u.*, s.name_ar AS source_name, l.method, l.evidence_ar, l.relation,"
        " l.ambiguous, l.shared_with"
        " FROM link l JOIN unit u ON u.id=l.to_unit"
        " JOIN source s ON s.id=u.source_id"
        " WHERE l.from_unit=? ORDER BY u.kind, u.book_slug, u.hadith_no",
        (a["id"],)).fetchall()

    tafsirs, hadiths = [], []
    for r in rows:
        d = dict(r)
        if r["kind"] == "tafsir":
            tafsirs.append(d)
        elif r["kind"] == "hadith":
            d["gradings"] = [dict(g) for g in conn.execute(
                "SELECT * FROM grading WHERE unit_id=? ORDER BY muhaddith",
                (r["id"],)).fetchall()]
            hadiths.append(d)

    # الاقتباس اللفظي أقوى حجّة، فيُقدَّم
    order = {"quotation": 0, "naming": 1, "manual": 2}
    hadiths.sort(key=lambda h: (h["ambiguous"], order.get(h["method"], 9),
                                h["book_slug"], h["hadith_no"] or 0))
    return {"ayah": dict(a), "tafsirs": tafsirs, "hadiths": hadiths}
