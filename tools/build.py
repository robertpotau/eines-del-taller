#!/usr/bin/env python3
# Eines del taller - (c) 2026 Robert Potau Nunez. Tots els drets reservats.
"""Build: src/ + eines-data.js -> index.html (un sol HTML; les fotos queden a img/) + sw.js (offline).

Usage:  python tools/build.py
Exit code 1 on errors.
"""
import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
END_SCRIPT = "</" + "script"          # escrit així perquè no tanqui cap <script> per error


def minify_svg(s):
    s = re.sub(r"<\?xml[^>]*\?>", "", s)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r'\s(id|xmlns|xmlns:xlink|version|xml:space|enable-background)="[^"]*"', "", s)
    s = re.sub(r"<g\s*/>", "", s)
    s = re.sub(r">\s+<", "><", s)
    return re.sub(r"\s+", " ", s).strip()


def main():
    errors = []
    data_txt = (ROOT / "eines-data.js").read_text(encoding="utf-8")
    data = json.loads(data_txt[data_txt.index("{"):data_txt.rindex("}") + 1])
    for e in data["eines"]:
        for p in [f["f"] for f in e["fotos"]] + [e["esquema"]]:
            if not (ROOT / p).exists():
                errors.append("missing image %s (%s)" % (p, e["nom"]))
    js = "\n".join(f.read_text(encoding="utf-8") for f in sorted((SRC / "js").glob("*.js")))
    codes = set(re.findall(r"""['"]([0-9A-F]{4,6})['"]""", js))
    have = {p.stem for p in (SRC / "icons").glob("*.svg")}
    used = sorted(c for c in codes if c in have)
    for m in re.finditer(r"""ico\(\s*['"]([0-9A-F]{4,6})['"]""", js):
        if m.group(1) not in have:
            errors.append("code uses icon %s which is not downloaded" % m.group(1))
    icons = {c: minify_svg((SRC / "icons" / (c + ".svg")).read_text(encoding="utf-8")) for c in used}
    if errors:
        print("\n%d ERROR(S):" % len(errors))
        for e in errors:
            print("  -", e)
        return 1

    ver = re.search(r"const VERSION = '([\d.]+)'", js).group(1)
    date = datetime.date.today().isoformat()
    html = (SRC / "template.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8") + "\n" + (SRC / "style-eines.css").read_text(encoding="utf-8")
    icons_js = "const ICONS = " + json.dumps(icons, separators=(",", ":")) + ";"
    html = html.replace("/*@@CSS@@*/", css).replace("/*@@DATA@@*/", data_txt).replace("/*@@ICONS@@*/", icons_js)
    html = html.replace("/*@@JS@@*/", js.replace(END_SCRIPT, "<\\/script"))
    html = html.replace("@@DATE@@", date).replace("@@VER@@", "v" + ver + " — " + date)

    # service worker: precache de la pagina, la font, el manifest i totes les imatges
    assets = ["./", "./index.html", "./manifest.json", "./icon.svg", "./fonts/nunito-400.woff2"]
    for e in data["eines"]:
        assets += ["./" + f["f"] for f in e["fotos"]] + ["./" + e["esquema"]]
    sw = (ROOT / "sw.template.js").read_text(encoding="utf-8").replace("@@VERSION@@", ver).replace("@@ASSETS@@", json.dumps(assets, indent=1))
    (ROOT / "sw.js").write_text(sw, encoding="utf-8", newline="\n")

    out = ROOT / "index.html"
    out.write_text(html, encoding="utf-8", newline="\n")
    print("Built %s v%s (%s): %d tools, %d icons, %d KB; sw.js with %d assets" % (out.name, ver, date, len(data["eines"]), len(icons), out.stat().st_size // 1024, len(assets)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
