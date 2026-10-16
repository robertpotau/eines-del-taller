# Eines del taller (joc-eines)

Joc de Tecnologia (1r ESO, Tema 02) per reconèixer foto, nom i família de les 39 eines oficials del taller.
Estat: **v1.0**. Pla complet: `PLA.md`. Idioma: només català.

## Fer-lo servir / provar-lo
- Cal servir-lo per http (els navegadors no deixen executar-lo des de file://):
  `python -m http.server 5071` dins aquesta carpeta i obrir `http://127.0.0.1:5071/index.html`
  (Python al Tower: `%LOCALAPPDATA%\Programs\Python\Python312\python.exe`).
- `index.html#hub` salta la portada. `index.html?selftest` executa l'auto-prova (dades, imatges, perfils).

## Construir
- `tools/prepara-imatges.py` — fotos de la presentació (Drive) → `img/raw/`.
- `tools/genera-dades.py` — **curació manual** (llistes DIB/MALA/NO_NETA) + `img/NN/`, `img/esq/` + `eines-data.js`.
- `tools/build.py` — `src/` + `eines-data.js` → `index.html` (mai editar-lo a mà).
- `src/js/`: 00-core (estat, perfils, so), 10-data (eines, foto a l'atzar), 20-quiz (preguntes de 4 opcions), 30-ui (UI compartida), 70-estudia (Catàleg + Flashcards), 99-main (menú, arrencada, auto-prova). Motor derivat d'Adjectivia (`Drive\Projectes\joc-adjectivia`, no modificada).

## Estat: v1.0 (2026-10-12) — acabat en local, NO publicat
- **Estudia:** Catàleg, Flashcards (caixes de repàs per perfil).
- **Practica:** Classifica, Memory, Uneix, Esquema → eina.  **Competeix:** Escala d'eines, Ronda ràpida, Quina eina és?, Per a què serveix?.
- Perfils/jugadors/XP/14 trofeus, drets (LICENSE, capçalera, JSON-LD, crèdits a Configuració, peu), font Nunito local, `sw.js` offline (cache `eines-v1.0`) i `manifest.json`.
- Fitxers: `src/js/20-quiz.js` (preguntes), `80-classifica`, `85-memory`, `90-escala`, `91-rondes` (Ronda ràpida + Per a què serveix?), `92-mes-modes` (Esquema, Uneix, Quina eina és?). `index.html?selftest` valida dades, 819 preguntes, 177 imatges i perfils.
- Registre: `claude-projects\VERSIONS-JOCS.md` + `CANVIS_2026-10-12_v1.0.md`; `python GAMES-TEMPLATE/versions.py` no dona avisos.

## Pendent (necessita decisió de Robert)
1. **Publicar:** repo privat + `sync-game.ps1` + entrada a la landing (el joc encara no és a la web).
2. **APK** (com els altres jocs, via Capacitor): no feta.
3. **Mode offline sense verificar** en un navegador real (el panell de prova de Claude no deixa registrar service workers); `sw.js` segueix el patró de VerbQuest i passa `node --check`.
4. Fotos amb pocs exemplars: Compàs de punta i Bufador (1 foto cada una; els jocs usen l'esquema si cal).
- Fotos: del centre + 8 de Wikimedia amb crèdit a `CREDITS-fotos.txt` (cal mantenir l'atribució en publicar).

## Publicar / actualitzar (flux)
1. Editar `src/` o les dades → pujar `VERSION` a `src/js/00-core.js` → `python tools/build.py` → `index.html?selftest` ha de dir PASSED.
2. Registre: `CANVIS_2026-10-12_v1.0.md` + fila a `claude-projects\VERSIONS-JOCS.md` + `python GAMES-TEMPLATE/versions.py` (sense avisos).
3. `git commit` + `git push` d'aquest repo (públic `robertpotau/eines-del-taller`).
4. `claude-projects\landing-page\sync-game.ps1 -Slug eines-del-taller -NoPush` (SENSE `2>&1`; exclou `src`, `tools`, `raw`, `_backup-original` i `manifest.json`).
5. **Abans de pujar la landing: `git fetch` + `git pull --rebase origin main`.** La landing també rep commits des d'altres ordinadors (p. ex. s'hi va afegir Canvi d'Unitat el 2026-10-16) i un `push` directe es rebutja (*non-fast-forward*). Si passa: `git pull --rebase origin main` i tornar a fer `git push`; mai `--force`.
6. Verificar en directe (`curl --ssl-no-revoke`) que `#ver` mostra la versió nova i `?selftest` diu PASSED.

## Fotos extra
`fotos-extra/NN/k.jpg` (k des de 7) = fotos afegides a mà de Wikimedia Commons; `tools/genera-dades.py` les barreja amb les de `img/raw` (carpeta de Drive). Crèdit de cada una a `CREDITS-fotos.txt`; `tools/genera-credits.py` en fa `credits-fotos.html`. Criteri: només fotos on es vegi clarament l'eina (mai edificis, cares, persones o escultures). Cal revisar-ho visualment abans de pujar.
