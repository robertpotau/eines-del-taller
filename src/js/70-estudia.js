/* ============================================================
   Eines del taller — secció ESTUDIA: Catàleg (galeria + fitxa de cada eina) i Flashcards amb caixes de repàs
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats.
   ============================================================ */
const CAT = { fam: 'all', q: '' };
const famDot = f => h('span', { class: 'fam-dot', style: '--fc:' + f.color }, ico(f.ic, 'tiny'));
const famChip = f => h('span', { class: 'fam-chip', style: '--fc:' + f.color }, famDot(f), ' ', f.nom);
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function catalogList() {
  const q = norm(CAT.q.trim());
  return TOOLS.filter(t => (CAT.fam === 'all' || t.familia === CAT.fam) && (!q || allNames(t).some(n => norm(n).includes(q))));
}

function showCatalog() {
  const wrap = h('div', { class: 'catalog' });
  const grid = h('div', { class: 'tcards' });
  const count = h('span', { class: 'muted' });
  const banner = h('div', { class: 'fam-banner' });
  const search = h('input', { type: 'search', placeholder: 'Cerca una eina…', value: CAT.q, 'aria-label': 'Cerca', oninput: () => { CAT.q = search.value; draw(); } });
  const famRow = h('div', { class: 'chip-row tight' });
  const famBtn = (id, label, f) => {
    const b = h('button', { class: 'choice sm' + (CAT.fam === id ? ' on' : ''), style: f ? '--fc:' + f.color : '', onclick: () => {
      CAT.fam = id; sfx('click'); $$('.choice', famRow).forEach(x => x.classList.remove('on')); b.classList.add('on'); draw();
    } }, f ? famDot(f) : null, ' ', label);
    return b;
  };
  famRow.append(famBtn('all', 'Totes'));
  FAMS.forEach(f => famRow.append(famBtn(f.id, f.curt, f)));
  const flashBtn = h('button', { class: 'btn primary', onclick: () => { const l = catalogList(); if (!l.length) return toast('No hi ha eines en aquesta llista', 'bad'); setupFlash(CAT.fam === 'all' ? null : [CAT.fam]); } }, ico('1F4D6'), ' Flashcards');

  function draw() {
    const list = catalogList();
    count.textContent = list.length + (list.length === 1 ? ' eina' : ' eines');
    const f = CAT.fam === 'all' ? null : FAMMAP.get(CAT.fam);
    banner.replaceChildren(...(f ? [famChip(f), h('p', null, h('b', null, f.nom + ': '), f.def)] : []));
    banner.classList.toggle('on', !!f);
    if (f) banner.style.setProperty('--fc', f.color);
    grid.replaceChildren(...list.map(t => h('button', { class: 'tcard', style: '--fc:' + t.fam.color, onclick: () => { showTool(t, list); } },
      pic(photoOf(t, true), t.nom, 'tc-img'), h('b', null, t.nom), h('small', null, famDot(t.fam), ' ' + t.fam.curt))));
    if (!list.length) grid.append(h('p', { class: 'muted' }, 'No s’ha trobat cap eina.'));
  }
  wrap.append(h('h2', null, ico('1F4DA'), ' Catàleg d’eines'),
    h('div', { class: 'wb-tools' }, search, flashBtn, count), famRow, banner, grid,
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => showHub() }, '← Enrere')));
  render(wrap, 'Catàleg');
  draw();
}

/* ---------- fitxa d'una eina (finestra) ---------- */
function showTool(t, list) {
  noteViewed(t.id);
  const idx = list ? list.indexOf(t) : -1;
  const nav = d => { const n = list[(idx + d + list.length) % list.length]; showTool(n, list); };
  const imgs = t.fotos.map(f => ({ src: f.f, label: 'Foto' })).concat([{ src: t.esquema, label: 'Esquema' }]);
  const main = h('div', { class: 'gal-main' }, pic(imgs[0].src, t.nom));
  const label = h('small', { class: 'gal-label' }, imgs[0].label);
  const ths = imgs.map((im, i) => h('button', { class: 'gal-th' + (i === 0 ? ' on' : ''), 'aria-label': im.label + ' ' + (i + 1), onclick: () => {
    main.replaceChildren(pic(im.src, t.nom)); label.textContent = im.label; sfx('click'); $$('.gal-th', ths0).forEach((x, j) => x.classList.toggle('on', j === i));
  } }, pic(im.src, '')));
  const ths0 = h('div', { class: 'gal-ths' }, ths);
  const say = ttsReady() ? h('button', { class: 'say', 'aria-label': 'Escolta', onclick: () => speak(t.nom) }, ico('1F50A')) : null;
  openModal(h('div', { class: 'wd tool-sheet', style: '--fc:' + t.fam.color },
    h('div', { class: 'gal' }, main, label, ths0),
    h('h2', null, t.nom, say),
    t.alies.length ? h('div', { class: 'wd-ca' }, 'També: ' + t.alies.join(', ')) : null,
    h('div', { class: 'tool-fam' }, famChip(t.fam), h('p', null, t.fam.def)),
    h('div', { class: 'actions' }, idx >= 0 && list.length > 1 ? h('button', { class: 'btn', onclick: () => nav(-1) }, '←') : null,
      h('button', { class: 'btn primary', onclick: closeModal }, 'Tanca'), idx >= 0 && list.length > 1 ? h('button', { class: 'btn', onclick: () => nav(1) }, '→') : null)), null, true);
  if (ttsReady()) speak(t.nom);
}

/* ---------- flashcards: configuració ---------- */
const FLASH_FACES = [{ v: 'photo', label: 'Foto → nom i família', desc: 'Veus l’eina i l’has de reconèixer.' },
  { v: 'name', label: 'Nom → foto', desc: 'Veus el nom i recordes com és.' }, { v: 'mixed', label: 'Barrejat', desc: 'Una mica de cada.' }];
function setupFlash(preFams) {
  const saved = ST.prefs.flash || {};
  const cfg = { fams: preFams || (Array.isArray(saved.fams) && saved.fams.length ? saved.fams : FAMS.map(f => f.id)),
    face: FLASH_FACES.some(c => c.v === saved.face) ? saved.face : 'photo', order: saved.order === 'weak' ? 'weak' : 'random' };
  const wrap = h('div', { class: 'setup' });
  wrap.append(h('div', { class: 'setup-head' }, ico('1F4D6', 'xl'), h('div', null, h('h2', null, 'Flashcards'), h('p', null, 'Estudia les eines una a una. Les que falles tornen més sovint.'))));
  const body = h('div', { class: 'setup-body' });
  const count = h('b', { class: 'fc-count' });
  const upd = () => { const n = TOOLS.filter(t => cfg.fams.includes(t.familia)).length; count.textContent = n + ' targetes'; go.disabled = !n; ST.prefs.flash = Object.assign({}, cfg); save(); };
  const famRow = h('div', { class: 'chip-row tight' });
  FAMS.forEach(f => {
    const b = h('button', { class: 'choice sm' + (cfg.fams.includes(f.id) ? ' on' : ''), style: '--fc:' + f.color, onclick: () => {
      cfg.fams = cfg.fams.includes(f.id) ? cfg.fams.filter(x => x !== f.id) : cfg.fams.concat(f.id); b.classList.toggle('on', cfg.fams.includes(f.id)); sfx('click'); upd();
    } }, famDot(f), ' ', f.curt);
    famRow.append(b);
  });
  const allB = h('button', { class: 'btn small', onclick: () => { cfg.fams = FAMS.map(f => f.id); $$('.choice', famRow).forEach(x => x.classList.add('on')); upd(); } }, 'Totes');
  const noneB = h('button', { class: 'btn small', onclick: () => { cfg.fams = []; $$('.choice', famRow).forEach(x => x.classList.remove('on')); upd(); } }, 'Cap');
  body.append(h('div', { class: 'opt-group' }, h('h4', null, 'Quines famílies?'), famRow, h('div', { class: 'actions left' }, allB, noneB, count)),
    h('div', { class: 'opt-group' }, h('h4', null, 'Què es veu primer?'), chipRow({ key: 'face', choices: FLASH_FACES }, cfg, upd)),
    h('div', { class: 'opt-group' }, h('h4', null, 'Ordre'), chipRow({ key: 'order', choices: [{ v: 'random', label: 'Barrejat' }, { v: 'weak', label: 'Les que fallo primer', desc: 'Segons les caixes de repàs del perfil.' }] }, cfg, upd)));
  wrap.append(body);
  const go = h('button', { class: 'btn primary big', onclick: () => {
    sfx('start');
    let deck = shuffle(TOOLS.filter(t => cfg.fams.includes(t.familia)));
    if (cfg.order === 'weak') deck.sort((a, b) => boxOf(a.id) - boxOf(b.id));
    startFlash(deck, cfg);
  } }, ico('25B6'), ' Comença');
  wrap.append(h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => showCatalog() }, '← Catàleg'), go));
  render(wrap, 'Flashcards');
  upd();
}

/* ---------- flashcards: la sessió ---------- */
function startFlash(deck0, cfg) {
  let deck = deck0.slice(), total = deck.length, known = 0, again = [];
  const seen = new Set();
  function next() {
    if (!deck.length) {
      if (again.length) {
        const w = h('div', { class: 'intro' }, h('h2', null, 'Ronda acabada'), h('p', null, 'Has marcat ' + again.length + (again.length === 1 ? ' targeta' : ' targetes') + ' per repassar.'),
          h('div', { class: 'chips' }, again.map(t => h('span', { class: 'chip big' }, t.nom))),
          h('div', { class: 'actions' }, h('button', { class: 'btn primary big', onclick: () => { deck = shuffle(again); again = []; next(); } }, 'Repassa-les'),
            h('button', { class: 'btn', onclick: () => showCatalog() }, 'Catàleg')));
        render(w, 'Flashcards'); return;
      }
      sfx('win'); confetti(120);
      render(h('div', { class: 'intro' }, h('h2', null, ico('1F389'), ' Totes les targetes fetes!'), h('p', null, total + (total === 1 ? ' eina repassada.' : ' eines repassades.')),
        h('div', { class: 'actions' }, h('button', { class: 'btn primary big', onclick: () => setupFlash() }, 'Una altra ronda'), h('button', { class: 'btn', onclick: () => showCatalog() }, 'Catàleg'))), 'Flashcards');
      return;
    }
    const t = deck[0]; let flipped = false;
    noteViewed(t.id);
    const face = cfg && cfg.face === 'name' ? 'name' : cfg && cfg.face === 'mixed' ? (Math.random() < .5 ? 'name' : 'photo') : 'photo';
    const photo = photoOf(t, false);
    const alt = t.fotos.map(f => f.f).filter(p => p !== photo);
    const fam = h('div', { class: 'fc-fam' }, famChip(t.fam), h('small', null, t.fam.def));
    const mini = h('div', { class: 'fc-mini' }, pic(t.esquema, 'Esquema'), alt.length ? pic(pick(alt), '') : null);
    const nameBlock = [h('div', { class: 'fc-word sm' }, t.nom), t.alies.length ? h('div', { class: 'wd-ca' }, 'També: ' + t.alies.join(', ')) : null];
    const front = face === 'photo' ? h('div', { class: 'fc-face front' }, pic(photo, '', 'fc-big'), h('small', null, 'Toca per veure el nom i la família'))
      : h('div', { class: 'fc-face front' }, h('div', { class: 'fc-word' }, t.nom), h('small', null, 'Toca per veure l’eina'));
    const back = face === 'photo' ? h('div', { class: 'fc-face back' }, nameBlock, fam, mini)
      : h('div', { class: 'fc-face back' }, pic(photo, t.nom, 'fc-big'), h('div', { class: 'fc-word sm' }, t.nom), fam);
    const card = h('div', { class: 'fcard tall', role: 'button', tabindex: 0, 'aria-label': 'Gira la targeta', style: '--fc:' + t.fam.color, onclick: flip }, front, back);
    const prog = h('div', { class: 'fc-prog' }, h('i', { style: 'width:' + (100 * known / total) + '%' }));
    const mark = ok => { noteResult(t.id, ok); deck.shift(); if (ok) known++; else again.push(t); sfx(ok ? 'ok' : 'ko'); next(); };
    const btns = h('div', { class: 'actions fc-actions' },
      h('button', { class: 'btn danger', onclick: () => mark(false) }, '✗ Un altre cop'),
      ttsReady() ? h('button', { class: 'btn', onclick: () => speak(t.nom) }, ico('1F50A'), ' Escolta') : null,
      h('button', { class: 'btn primary', onclick: () => mark(true) }, '✓ Ja la sé'));
    function flip() { flipped = !flipped; card.classList.toggle('flipped', flipped); sfx('flip'); if (flipped) speak(t.nom); }
    render(h('div', { class: 'flash' }, h('div', { class: 'muted' }, 'Targeta ' + (known + again.length + 1) + ' de ' + total + ' · caixa ' + boxOf(t.id) + '/5'), prog, card, btns,
      h('div', { class: 'actions' }, h('button', { class: 'btn small', onclick: () => showCatalog() }, '← Catàleg'))), 'Flashcards');
    Keys.on(e => {
      if (e.key === ' ' || e.key === 'Enter') { flip(); return true; }
      if (e.key === 'ArrowRight') { mark(true); return true; }
      if (e.key === 'ArrowLeft') { mark(false); return true; }
      return false;
    });
  }
  next();
}
