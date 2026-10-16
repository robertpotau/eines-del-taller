# Joc d'eines - (c) 2026 Robert Potau Nunez. Optimitza les fotos (una subcarpeta "NN Nom" per eina, fitxers 1..6)
# a img/raw/NN/k.jpg (max 640 px). Us: python tools/prepara-imatges.py "<carpeta amb les fotos>"
# (o la variable d'entorn EINES_FOTOS_NOVES). Les carpetes d'eines extra "X1 ..." s'ignoren.
import os, glob, sys, shutil
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("EINES_FOTOS_NOVES", "")
if not src or not os.path.isdir(src):
    sys.exit("Indica la carpeta de fotos (argument o EINES_FOTOS_NOVES)")
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "img", "raw")
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
def flat(im):
    im = im.convert("RGBA"); bg = Image.new("RGBA", im.size, "white"); bg.alpha_composite(im); return bg.convert("RGB")
n = 0
for d in sorted(glob.glob(os.path.join(src, "[0-9][0-9] *"))):
    num = os.path.basename(d)[:2]; od = os.path.join(out, num); os.makedirs(od)
    for f in sorted(glob.glob(os.path.join(d, "*.*"))):
        stem = os.path.splitext(os.path.basename(f))[0]
        if not stem.isdigit(): continue
        try:
            im = Image.open(f); w, h = im.size; im = flat(im); im.thumbnail((640, 640))
            im.save(os.path.join(od, stem + ".jpg"), quality=85, optimize=True)
            with open(os.path.join(od, "orig.txt"), "a", encoding="utf-8") as t: t.write(f"{os.path.basename(f)} {w}x{h}\n")
            n += 1
        except Exception as e: print("ERR", f, e)
print(n, "imatges")
