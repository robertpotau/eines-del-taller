# Joc d'eines - (c) 2026 Robert Potau Nunez. Genera credits-fotos.html amb NOMES les fotos de Wikimedia Commons que
# s'usen de veritat al joc (les de eines-data.js). Font: CREDITS-fotos.txt (una linia per foto:
# "NN Nom/k.ext - titol - autor - llicencia - enllac", separats per " — ").
import html
import json
import os
import re

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_txt = open(os.path.join(R, "eines-data.js"), encoding="utf-8").read()
data = json.loads(data_txt[data_txt.index("{"):data_txt.rindex("}") + 1])
names = {e["id"]: e["nom"] for e in data["eines"]}
used = {(e["id"], int(f["f"].rsplit("/", 1)[1][:-4])) for e in data["eines"] for f in e["fotos"]}
rows = []
for line in open(os.path.join(R, "CREDITS-fotos.txt"), encoding="utf-8").read().splitlines():
    parts = [x.strip() for x in line.split(" — ")]
    if len(parts) < 5:
        continue
    m = re.match(r"(\d\d) .*/(\d+)\.\w+$", parts[0])
    if not m or (m.group(1), int(m.group(2))) not in used:
        continue
    rows.append((names[m.group(1)], parts[1], parts[2], parts[3], parts[4]))
tr = "\n".join('<tr><td>%s</td><td><a href="%s" rel="noopener">%s</a></td><td>%s</td><td>%s</td></tr>'
               % (html.escape(a), html.escape(e), html.escape(b), html.escape(c), html.escape(d)) for a, b, c, d, e in rows)
page = """<!doctype html>
<html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Crèdits de les fotos — Eines del taller</title><meta name="robots" content="noai, noimageai">
<style>body{font-family:system-ui,Segoe UI,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#1a1a2e}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd;padding:.4rem .6rem;text-align:left;font-size:.92rem}th{background:#eef}</style></head>
<body><h1>Crèdits de les fotos</h1>
<p>© 2026 Robert Potau Nuñez · Tots els drets reservats (codi, disseny i textos). Les fotografies i els esquemes de les eines són material del centre educatiu de l'autor, excepte les que s'indiquen a continuació.</p>
<p>Les fotografies següents provenen de <a href="https://commons.wikimedia.org" rel="noopener">Wikimedia Commons</a>, conserven la seva llicència lliure (CC0 / CC BY / CC BY-SA / domini públic) i <b>NO</b> les cobreix la reserva de drets del joc:</p>
<table><tr><th>Eina</th><th>Fitxer (Commons)</th><th>Autor</th><th>Llicència</th></tr>
""" + tr + """
</table>
<p><a href="index.html">← Torna al joc</a> · <a href="https://robertpotau.github.io/termes.html">Termes d'ús</a></p></body></html>
"""
open(os.path.join(R, "credits-fotos.html"), "w", encoding="utf-8", newline="\n").write(page)
lic = {}
for r in rows:
    lic[r[3]] = lic.get(r[3], 0) + 1
print("credits-fotos.html:", len(rows), "fotos de Commons;", lic)
