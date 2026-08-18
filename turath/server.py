"""خادم تُراث: الرئيسية · فهرس السور · صفحة الآية بالتنقّل التسلسلي.

الآيات تُبنى عند الطلب (on-demand) وتُخزَّن في القاعدة، فالمصحف كله
متصفَّح دون تحميل ٦٢٣٦ آية مسبقًا. فهرس الحديث يُحمَّل مرة واحدة عند
الإقلاع ويُعاد استعماله.
"""
import argparse
import threading
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from . import db
from .ingest import ingest_ayah, load_corpus
from .query import get_ayah_page
from .render import render_ayah, render_home, render_surah_index
from .sources import surahs
from .sources.http import SourceUnavailable

AYAH_RE = re.compile(r"^/ayah/(\d+)/(\d+)/?$")
SURAH_RE = re.compile(r"^/surah/(\d+)/?$")


class App:
    """حالة مشتركة: القاعدة، فهرس الحديث، بيانات السور."""

    def __init__(self, db_path=None, gradings=False):
        self.conn = db.connect(db_path)
        self.gradings = gradings
        self.corpus = None          # يُحمَّل كسولًا عند أول آية
        self._lock = threading.Lock()

    def corpus_ready(self):
        with self._lock:
            if self.corpus is None:
                self.corpus = load_corpus()
        return self.corpus

    def ensure_ayah(self, s, a):
        """يبني الآية إن لم تكن مفهرسة. يُرجع True عند النجاح."""
        row = self.conn.execute(
            "SELECT 1 FROM unit WHERE kind='ayah' AND surah=? AND ayah=?", (s, a)
        ).fetchone()
        if row:
            return True
        corpus = self.corpus_ready()
        with self._lock:          # كتابة متسلسلة إلى القاعدة
            ingest_ayah(self.conn, s, a, corpus=corpus,
                        fetch_gradings=self.gradings, log=lambda *a: None)
        return True

    def nav(self, s, a):
        meta = surahs.surah(s)
        return {
            "surah_name": meta["name_ar"] if meta else "",
            "here": f"{s}:{a}",
            "prev": surahs.prev_ref(s, a),
            "next": surahs.next_ref(s, a),
        }


class Handler(BaseHTTPRequestHandler):
    app: App = None

    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        raw = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        path = self.path.split("?", 1)[0]

        if path in ("/", "/index.html"):
            indexed = [r["surah"] for r in self.app.conn.execute(
                "SELECT DISTINCT surah FROM unit WHERE kind='ayah'")]
            return self._send(200, render_home(surahs.all_surahs(), indexed))

        m = SURAH_RE.match(path)
        if m:
            n = int(m.group(1))
            return self._send(200, render_surah_index(surahs.all_surahs(), current=n))

        m = AYAH_RE.match(path)
        if m:
            s, a = int(m.group(1)), int(m.group(2))
            meta = surahs.surah(s)
            if not meta or not (1 <= a <= meta["verse_count"]):
                return self._send(404, self._msg("هذه الآية خارج حدود المصحف."))
            try:
                self.app.ensure_ayah(s, a)
            except SourceUnavailable as ex:
                return self._send(503, self._msg(
                    f"تعذّر جلب الآية من المصدر: {ex}. لم يُختلق بديل."))
            data = get_ayah_page(self.app.conn, s, a)
            return self._send(200, render_ayah(data, nav=self.app.nav(s, a)))

        self._send(404, self._msg("الصفحة غير موجودة."))

    def _msg(self, text):
        return (
            '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>تُراث</title></head><body style="font-family:serif;max-width:40rem;'
            'margin:4rem auto;padding:0 1rem;text-align:center">'
            f'<p style="font-size:1.2rem">{text}</p>'
            '<p><a href="/">الرئيسية</a></p></body></html>')

    def log_message(self, *a):
        pass


def main(argv=None):
    ap = argparse.ArgumentParser(description="خادم تُراث")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--db", default=None)
    ap.add_argument("--gradings", action="store_true",
                    help="جلب الأحكام من الدرر (يتطلب وصولًا إلى dorar.net)")
    args = ap.parse_args(argv)
    Handler.app = App(args.db, gradings=args.gradings)
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"تُراث → http://127.0.0.1:{args.port}/   (Ctrl-C للإيقاف)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
