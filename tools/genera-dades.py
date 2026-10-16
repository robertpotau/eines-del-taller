# Joc d'eines - (c) 2026 Robert Potau Nunez. Genera img/NN/*.jpg, img/esq/NN.png i eines-data.js a partir de img/raw (fase 1)
import os,json,shutil,glob
from PIL import Image
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOT=os.environ.get("EINES_FOTOS", "")   # carpeta amb els esquemes "NN Nom.png" i "Fotos de la presentacio" (variable d'entorn EINES_FOTOS)
FAM=[("percussio","Eines de percussió","percussió","Colpejar un material per trencar-lo, aixafar-lo o modificar-lo.","#e4572e"),
("tall","Eines de tall","tall","Seccionar un material per mitjà d’una fulla.","#17a2b8"),
("abrasio","Eines d’abrasió o fricció","abrasió","Fregar un material amb un altre de més dur per polir-lo o erosionar-lo.","#a0522d"),
("perforacio","Eines de perforació","perforació","Fer un forat que pot travessar o no el material.","#6f42c1"),
("agafar","Eines d’agafar o retenir","agafar","Subjectar un material de manera fixa o subjectar-lo imprimint-li una altra acció (doblegar, estirar, etc).","#2e8b57"),
("cargolar","Eines de cargolar","cargolar","Imprimir un moviment de rotació en una peça o accessori.","#f0a202"),
("passives","Eines passives","passives","Suportar els materials quan estan sotmesos a l’acció d’una eina.","#7d8597"),
("mesurar","Eines de mesurar, traçar i marcar","mesurar","Projectar, acotar, dibuixar o assenyalar contorns i formes, i fer operacions de control i calibratge.","#1d6fd1"),
("soldar","Eines de soldar o d’adherir","soldar","Unir dues superfícies per forces intermoleculars.","#d6336c"),
("proteccio","Elements de protecció","protecció","Garantir una correcta seguretat en el treball amb les eines.","#2fb344")]
# num, nom, familia, alies
T=[("01","Martell de bola","percussio",[]),("02","Maceta de niló","percussio",["Maceta"]),
("03","Tisores d’electricista","tall",[]),("04","Tisores de planxa","tall",[]),("05","Serra d’arquet","tall",[]),("06","Xerrac","tall",[]),
("07","Serra de marqueteria","tall",[]),("08","Serra de vogir elèctrica","tall",["Serra de calar"]),("09","Alicates per pelar fils","tall",["Alicates de pelar fils"]),
("10","Llima","abrasio",[]),("11","Raspa","abrasio",[]),
("12","Barrina","perforacio",[]),("13","Trepant portàtil","perforacio",[]),("14","Trepant de sobretaula","perforacio",[]),("15","Broca","perforacio",[]),
("16","Alicates universals","agafar",[]),("17","Alicates de boca rodona","agafar",[]),("18","Alicates de boca plana","agafar",[]),("19","Serjant","agafar",[]),("20","Serjant de marqueteria","agafar",[]),
("21","Tornavís de boca plana","cargolar",[]),("22","Tornavís d’estrella","cargolar",["Tornavís Phillips"]),("23","Clau fixa","cargolar",[]),("24","Clau d’estrella colzada","cargolar",[]),("25","Clau sisavada","cargolar",["Clau Allen"]),
("26","Cargol de banc","passives",[]),
("27","Cinta mètrica","mesurar",[]),("28","Regle graduat d’acer","mesurar",[]),("29","Escaire","mesurar",[]),("30","Peu de rei","mesurar",[]),("31","Centenella","mesurar",["Goniòmetre"]),("32","Puntes de senyalar","mesurar",[]),("33","Compàs de punta","mesurar",[]),("34","Nivell","mesurar",[]),
("35","Soldador elèctric","soldar",[]),("36","Bufador","soldar",[]),
("37","Guants de protecció","proteccio",[]),("38","Ulleres de protecció","proteccio",[]),("39","Davantal protector","proteccio",[])]
# Revisio manual (2026-10-12): imatges que NO son fotos de l'eina
DIB={"01":[1],"02":[2],"03":[1],"04":[6],"05":[5],"06":[6],"07":[5],"09":[5],"10":[1],"11":[1],"12":[5],"13":[5],"14":[3],"15":[5],"16":[5],"18":[5],"19":[5,6],"21":[4],"22":[6],"23":[4],"25":[5],"26":[5],"27":[5],"29":[1],"30":[3],"32":[6],"33":[2],"34":[2],"35":[4],"36":[2,4],"37":[5],"38":[5],"39":[4]}
# no corresponen a l'eina (altra eina, joc mixt, tallades, il.lustracio...): revisio 2026-10-16
MALA={"01":[6],"02":[6],"08":[5],"11":[5],"12":[6],"13":[6],"14":[4,6],"16":[6],"20":[3,4,5,6],"21":[6],"24":[3,4,5,6],"28":[4,5],"32":[4,5]}
# multi-eina, marca d'aigua o ambigues: nomes a Flashcards/Cataleg (no als jocs de preguntes)
NO_NETA={"07":[4],"08":[4],"11":[6],"14":[4,5],"15":[2,4],"17":[2],"18":[1],"20":[1,10],"21":[5],"22":[3],"23":[3],"24":[1],"25":[2,6],"31":[1,4,5],"32":[3],"33":[4],"34":[5,6],"37":[4],"38":[6]}
fam_ids=[f[0] for f in FAM]; out=[]
for n,nom,fam,alies in T:
    od=os.path.join(R,"img",n); shutil.rmtree(od,ignore_errors=True); os.makedirs(od)
    fotos=[]
    # fotos de img/raw (carpeta de Drive, 1-6) + fotos-extra/NN (afegides a mà des de Wikimedia Commons, 7 endavant)
    srcs=glob.glob(os.path.join(R,"img","raw",n,"*.jpg"))+glob.glob(os.path.join(R,"fotos-extra",n,"*.jpg"))
    for f in sorted(srcs,key=lambda p:int(os.path.basename(p)[:-4])):
        k=int(os.path.basename(f)[:-4])
        if k in DIB.get(n,[]) or k in MALA.get(n,[]): continue
        shutil.copy(f,os.path.join(od,f"{k}.jpg")); fotos.append({"f":f"img/{n}/{k}.jpg","neta":k not in NO_NETA.get(n,[])})
    esq=[x for x in os.listdir(FOT) if x.startswith(n+" ") and x.endswith(".png")][0]
    os.makedirs(os.path.join(R,"img","esq"),exist_ok=True)
    im=Image.open(os.path.join(FOT,esq)).convert("RGBA"); bg=Image.new("RGBA",im.size,"white"); bg.alpha_composite(im); bg.convert("RGB").save(os.path.join(R,"img","esq",n+".png"),optimize=True)
    out.append({"id":n,"nom":nom,"familia":fam,"alies":alies,"fotos":fotos,"esquema":f"img/esq/{n}.png"})
data={"families":[{"id":a,"nom":b,"curt":c,"def":d,"color":e} for a,b,c,d,e in FAM],"eines":out}
open(os.path.join(R,"eines-data.js"),"w",encoding="utf-8").write("// Joc d'eines — (c) 2026 Robert Potau Nuñez. Tots els drets reservats.\nconst EINES_DATA = "+json.dumps(data,ensure_ascii=False,indent=1)+";\n")

for e in out: print(e["id"],e["nom"],len(e["fotos"]),"fotos,",sum(f["neta"] for f in e["fotos"]),"netes")
print("tools",len(out),"fotos",sum(len(e["fotos"]) for e in out))
