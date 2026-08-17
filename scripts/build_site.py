"""Inline the data into the page template.

Emits two files from one source: web/index.html is a standalone document that
opens straight from disk or GitHub Pages, and build/artifact.html is the same
page as a fragment, since the Artifact host supplies its own document skeleton.
"""
import base64, glob, json, os, re

TEMPLATE = "web/template.html"
STANDALONE = "web/index.html"
FRAGMENT = "build/artifact.html"


def main():
    tpl = open(TEMPLATE).read()

    quran = json.load(open("data/quran/uthmani_hafs.json"))["quran"]
    surahs = json.load(open("data/surahs.json"))

    tafsir = {}
    for path in sorted(glob.glob("data/tafsir/*.json")):
        rec = json.load(open(path))
        tafsir[str(rec["surah"])] = rec

    def dump(obj):
        # </script> inside JSON would close the host tag early.
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    def font(name):
        return base64.b64encode(open(f"web/fonts/{name}.woff2", "rb").read()).decode()

    page = (tpl.replace("__FONT_QURAN__", font("AmiriQuran"))
               .replace("__FONT_BODY__", font("Amiri"))
               .replace("__QURAN__", dump(quran))
               .replace("__SURAHS__", dump(surahs))
               .replace("__TAFSIR__", dump(tafsir)))

    os.makedirs("build", exist_ok=True)
    open(FRAGMENT, "w").write(page)

    head = ('<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n'
            '<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1">\n')
    m = re.search(r"<title>.*?</title>\s*", page, re.S)
    title, body = m.group(0), page[m.end():]
    style_end = body.index("</style>") + len("</style>")
    open(STANDALONE, "w").write(head + title + body[:style_end] + "\n</head>\n<body>\n"
                                + body[style_end:] + "\n</body>\n</html>\n")

    for p in (STANDALONE, FRAGMENT):
        print(f"{p}: {os.path.getsize(p)/1e6:.2f} MB")
    print(f"surahs with tafsir: {sorted(int(k) for k in tafsir)}  ayat: {len(quran)}")


if __name__ == "__main__":
    main()
