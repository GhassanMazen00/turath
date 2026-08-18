"""المخطط: unit · link · grading — مع تسجيل المصادر.

القاعدة الحمراء ١: لا يوجد عمود grade في جدول الوحدات.
كل حكم صفٌّ مستقل في جدول grading يحمل القائل والكتاب والموضع.
هذا القيد مفروض بالمخطط نفسه لا بالاتفاق.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "turath.db"

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- سجل المصادر: لا يدخل شيء إلى القاعدة بلا مصدر مسجَّل هنا
CREATE TABLE IF NOT EXISTS source (
    id          INTEGER PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,   -- quran | tafsir | hadith | dorar
    name_ar     TEXT NOT NULL,
    homepage    TEXT NOT NULL,
    pinned_ref  TEXT NOT NULL,          -- tag/commit — لا يُقبل main متحرّكًا
    fetched_at  TEXT
);

-- وحدة نص: آية أو مقطع تفسير أو حديث
CREATE TABLE IF NOT EXISTS unit (
    id          INTEGER PRIMARY KEY,
    source_id   INTEGER NOT NULL REFERENCES source(id),
    kind        TEXT NOT NULL CHECK (kind IN ('ayah','tafsir','hadith')),
    ref_key     TEXT NOT NULL,          -- المفتاح المشترك: 2:255 | bukhari:2311
    surah       INTEGER,
    ayah        INTEGER,
    book_slug   TEXT,
    hadith_no   INTEGER,
    edition     TEXT,                   -- سلاسة التفسير أو الرواية
    text_ar     TEXT NOT NULL,          -- كما ورد حرفيًا — لا تعديل
    text_norm   TEXT NOT NULL,          -- للمطابقة فقط، لا يُعرض
    locus_ar    TEXT NOT NULL,          -- الموضع المطبوع: «صحيح البخاري ٢٣١١»
    url         TEXT NOT NULL,          -- رابط الأصل
    UNIQUE (source_id, kind, ref_key, edition)
);

-- رابط مطبوع بين وحدتين. لا يُنشأ رابط بلا method و evidence.
CREATE TABLE IF NOT EXISTS link (
    id           INTEGER PRIMARY KEY,
    from_unit    INTEGER NOT NULL REFERENCES unit(id),
    to_unit      INTEGER NOT NULL REFERENCES unit(id),
    relation     TEXT NOT NULL,         -- ayah_tafsir | ayah_hadith
    method       TEXT NOT NULL CHECK (method IN ('shared_key','quotation','naming','manual')),
    evidence_ar  TEXT NOT NULL,         -- لماذا هذا الرابط قائم — يُعرض للقارئ
    ambiguous    INTEGER NOT NULL DEFAULT 0,  -- اللفظ مشترك مع آية أخرى
    shared_with  TEXT,                  -- مواضع الاشتراك، مفصولة بفاصلة
    url          TEXT,
    UNIQUE (from_unit, to_unit, relation, method)
);

-- حكم واحد لمحدّث واحد في موضع واحد. الاختلاف يُمثَّل بصفوف متعددة.
CREATE TABLE IF NOT EXISTS grading (
    id           INTEGER PRIMARY KEY,
    unit_id      INTEGER NOT NULL REFERENCES unit(id),
    source_id    INTEGER NOT NULL REFERENCES source(id),
    muhaddith    TEXT NOT NULL,         -- القائل
    book         TEXT NOT NULL,         -- الكتاب
    page         TEXT,                  -- الموضع
    grade        TEXT NOT NULL,         -- نص الدرجة كما ورد
    explanation  TEXT,
    rawi         TEXT,
    url          TEXT NOT NULL,
    UNIQUE (unit_id, muhaddith, book, page, grade)
);

CREATE INDEX IF NOT EXISTS idx_unit_ref   ON unit(kind, ref_key);
CREATE INDEX IF NOT EXISTS idx_link_from  ON link(from_unit, relation);
CREATE INDEX IF NOT EXISTS idx_grading_u  ON grading(unit_id);
"""


def connect(path=None) -> sqlite3.Connection:
    path = Path(path or DB_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def upsert_source(conn, key, name_ar, homepage, pinned_ref) -> int:
    conn.execute(
        "INSERT INTO source (key, name_ar, homepage, pinned_ref, fetched_at)"
        " VALUES (?,?,?,?, datetime('now'))"
        " ON CONFLICT(key) DO UPDATE SET"
        " name_ar=excluded.name_ar, homepage=excluded.homepage,"
        " pinned_ref=excluded.pinned_ref, fetched_at=excluded.fetched_at",
        (key, name_ar, homepage, pinned_ref),
    )
    return conn.execute("SELECT id FROM source WHERE key=?", (key,)).fetchone()["id"]


def upsert_unit(conn, **f) -> int:
    from .normalize import normalize
    f.setdefault("edition", "")
    f["text_norm"] = normalize(f["text_ar"])
    cols = ("source_id","kind","ref_key","surah","ayah","book_slug","hadith_no",
            "edition","text_ar","text_norm","locus_ar","url")
    vals = [f.get(c) for c in cols]
    conn.execute(
        f"INSERT INTO unit ({','.join(cols)}) VALUES ({','.join('?'*len(cols))})"
        " ON CONFLICT(source_id, kind, ref_key, edition) DO UPDATE SET"
        " text_ar=excluded.text_ar, text_norm=excluded.text_norm,"
        " locus_ar=excluded.locus_ar, url=excluded.url",
        vals,
    )
    return conn.execute(
        "SELECT id FROM unit WHERE source_id=? AND kind=? AND ref_key=? AND edition=?",
        (f["source_id"], f["kind"], f["ref_key"], f["edition"]),
    ).fetchone()["id"]


def add_link(conn, from_unit, to_unit, relation, method, evidence_ar,
             url=None, ambiguous=False, shared_with=None):
    conn.execute(
        "INSERT OR IGNORE INTO link"
        " (from_unit,to_unit,relation,method,evidence_ar,ambiguous,shared_with,url)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (from_unit, to_unit, relation, method, evidence_ar,
         1 if ambiguous else 0, ",".join(shared_with) if shared_with else None, url),
    )
