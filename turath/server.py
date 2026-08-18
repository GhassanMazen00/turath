"""خادم بسيط لصفحة الآية.  الاستعمال: python -m turath.server [--port 8000]"""
import argparse
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

from . import db
from .query import get_ayah_page
from .render import render_ayah

AYAH_RE = re.compile(r"^/ayah/(\d+)/(\d+)/?$")


class Handler(BaseHTTPRequestHandler):
    conn = None

    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        raw = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            rows = self.conn.execute(
                "SELECT surah, ayah FROM unit WHERE kind='ayah' ORDER BY surah, ayah"
            ).fetchall()
            items = "".join(
                f'<li><a href="/ayah/{r["surah"]}/{r["ayah"]}">'
                f'الآية {r["surah"]}:{r["ayah"]}</a></li>' for r in rows)
            return self._send(200,
                '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">'
                '<title>الآيات المفهرسة</title>'
                '<body style="font-family:serif;max-width:40rem;margin:3rem auto">'
                f'<h1>الآيات المفهرسة</h1><ul>{items or "<li>لا شيء بعد</li>"}</ul>')

        m = AYAH_RE.match(self.path)
        if m:
            data = get_ayah_page(self.conn, int(m[1]), int(m[2]))
            if data is None:
                return self._send(404,
                    '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">'
                    '<body style="font-family:serif;margin:3rem">'
                    'هذه الآية غير مفهرسة بعد. شغّل: <code>python -m turath.ingest '
                    f'{m[1]}:{m[2]}</code>')
            return self._send(200, render_ayah(data))
        self._send(404, "غير موجود")

    def log_message(self, *a):
        pass


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--db", default=None)
    args = ap.parse_args(argv)
    Handler.conn = db.connect(args.db)
    srv = HTTPServer(("127.0.0.1", args.port), Handler)
    print(f"http://127.0.0.1:{args.port}/  —  Ctrl-C للإيقاف")
    srv.serve_forever()


if __name__ == "__main__":
    main()
