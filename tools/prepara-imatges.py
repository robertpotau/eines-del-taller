# Joc d'eines - (c) 2026 Robert Potau Nunez. Optimitza les fotos de la presentacio a img/raw/NN/k.jpg (max 640 px)
import os,glob,sys
from PIL import Image
base=os.environ.get("EINES_FOTOS", "")   # carpeta amb els esquemes "NN Nom.png" i "Fotos de la presentacio" (variable d'entorn EINES_FOTOS)
out=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"img","raw")
os.makedirs(out,exist_ok=True)
def flat(im):
    im=im.convert("RGBA"); bg=Image.new("RGBA",im.size,"white"); bg.alpha_composite(im); return bg.convert("RGB")
n=0
for d in sorted(glob.glob(os.path.join(base,"Fotos de la presentacio","[0-9][0-9] *"))):
    num=os.path.basename(d)[:2]; od=os.path.join(out,num); os.makedirs(od,exist_ok=True)
    for f in sorted(glob.glob(os.path.join(d,"*.*"))):
        try:
            im=Image.open(f); w,h=im.size; im=flat(im); im.thumbnail((640,640))
            im.save(os.path.join(od,os.path.splitext(os.path.basename(f))[0]+".jpg"),quality=85,optimize=True)
            with open(os.path.join(od,"orig.txt"),"a",encoding="utf-8") as t: t.write(f"{os.path.basename(f)} {w}x{h}\n")
            n+=1
        except Exception as e: print("ERR",f,e)
print(n)
