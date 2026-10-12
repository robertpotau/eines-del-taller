/* ============================================================
   Eines del taller — mode MEMORY: parelles de foto i nom, nom i família, esquema i foto (1-6 jugadors per torns)
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats.
   ============================================================ */
function setupMemory() {
  setupScreen({
    id: 'memory', name: 'Memory', ic: '1F9E0',
    desc: 'Gira dues targetes i troba parelles. Si n’encertes una, tornes a jugar!',
    options: [
      { key: 'kind', label: 'Quines parelles?', def: 'mixed', choices: [
        { v: 'nom', label: 'Foto + nom', desc: 'L’eina i com es diu' }, { v: 'fam', label: 'Nom + família', desc: 'Clau fixa – Eines de cargolar' },
        { v: 'esq', label: 'Esquema + foto', desc: 'El dibuix i l’eina real' }, { v: 'mixed', label: 'Barrejat', desc: 'De tot una mica' }] },
      { key: 'size', label: 'Quantes targetes?', def: 16, choices: [{ v: 12, label: '12 targetes' }, { v: 16, label: '16 targetes' }, { v: 20, label: '20 targetes' }] }
    ],
    rules: ['Parella trobada → +10 punts i tornes a jugar. Cada parella seguida dona +2 més.', 'Si falles, passa el torn al següent jugador.',
      'Cada parella és d’una família diferent, així no hi ha confusions.'],
    onStart: startMemory
  });
}

/** n parelles; cada una d'una família diferent (així mai no hi ha dues respostes possibles) */
function buildMemoryPairs(kind, n) {
  const fams = shuffle(FAMS).slice(0, n);
  return fams.map(f => {
    const t = pick(toolsOf(f.id));
    const k = kind === 'mixed' ? pick(['nom', 'fam', 'esq']) : kind;
    return { k, t };
  });
}
/** les dues cares d'una parella */
function memoryFaces(p) {
  const t = p.t;
  if (p.k === 'nom') return [{ type: 'photo', src: photoOf(t, true), alt: t.nom }, { type: 'name', text: t.nom }];
  if (p.k === 'fam') return [{ type: 'name', text: t.nom }, { type: 'fam', fam: t.fam }];
  return [{ type: 'draw', src: t.esquema, alt: 'Esquema' }, { type: 'photo', src: photoOf(t, true), alt: t.nom }];
}
function memoryFront(f) {
  if (f.type === 'photo' || f.type === 'draw') return h('span', { class: 'face front pic' }, pic(f.src, f.alt));
  if (f.type === 'fam') return h('span', { class: 'face front fam', style: '--fc:' + f.fam.color }, famDot(f.fam), h('span', null, f.fam.nom));
  return h('span', { class: 'face front word' }, h('span', null, f.text));
}

function startMemory(cfg, pids) {
  newGame('memory', pids);
  const pairs = buildMemoryPairs(cfg.kind, cfg.size / 2);
  const cards = [];
  pairs.forEach((p, i) => memoryFaces(p).forEach(f => cards.push({ pair: i, face: f, tool: p.t })));
  const deck = shuffle(cards);
  const M = { turn: 0, up: [], busy: false, found: 0, mistakes: 0, combo: 0, pairs: pairs.length, last: null };
  G.cur = pids[0]; G.extra.deck = deck;            // (G.extra.deck: l'auto-prova i les proves automàtiques hi miren)
  const bar = scoreBar(pids, G.scores); G.bar = bar;
  const banner = h('div', { class: 'who-banner slim' });
  const paintTurn = () => {
    const pid = pids[M.turn % pids.length]; G.cur = pid; bar.update(G.scores, pid);
    banner.style.setProperty('--pc', PCOLORS[pid]);
    banner.replaceChildren(avatar(pid, 'md'), h('div', null,
      h('b', null, pids.length > 1 ? 'Torn de ' + pname(pid) : 'Troba les parelles'),
      h('small', null, 'Parelles trobades: ' + M.found + ' de ' + M.pairs + (M.combo > 1 ? ' · combo x' + M.combo : '')),
      M.last ? h('small', { class: 'mem-last' }, '✓ ' + M.last.nom + ' — ' + M.last.fam.nom) : null));
  };
  const cols = cfg.size === 20 ? 5 : 4;
  const grid = h('div', { class: 'mgrid', style: '--cols:' + cols + ';--rows:' + Math.ceil(cfg.size / cols) });
  deck.forEach((c, idx) => {
    c.el = h('button', { class: 'mcard', 'aria-label': 'Targeta ' + (idx + 1), onclick: () => flip(c) },
      h('span', { class: 'face back' }, ico('2753')), memoryFront(c.face));
    grid.append(c.el);
  });
  render(h('div', { class: 'memory' }, bar, banner, grid), 'Memory');
  paintTurn();

  function flip(c) {
    if (M.busy || c.up || c.done) return;
    c.up = true; c.el.classList.add('up'); sfx('flip');
    M.up.push(c);
    if (M.up.length < 2) return;
    M.busy = true;
    const [a, b] = M.up, pid = pids[M.turn % pids.length];
    if (a.pair === b.pair) {
      Timers.set(() => {
        a.done = b.done = true; a.el.classList.add('done'); b.el.classList.add('done');
        a.el.style.setProperty('--pc', PCOLORS[pid]); b.el.style.setProperty('--pc', PCOLORS[pid]);
        M.found++; M.combo++; M.up = []; M.last = a.tool;
        sfx('match'); confettiFrom(a.el, 18);
        addScore(pid, 10 + 2 * (M.combo - 1));
        recordAnswer(pid, a.tool.id, true, false);
        speak(a.tool.nom);
        if (M.found === M.pairs) return Timers.set(endMemory, 900);
        M.busy = false; paintTurn();
      }, 500);
    } else {
      Timers.set(() => {
        a.up = b.up = false; a.el.classList.remove('up'); b.el.classList.remove('up'); M.up = [];
        M.mistakes++; M.combo = 0; recordAnswer(pid, null, false, false);
        M.turn++; M.busy = false; sfx('ko'); paintTurn();
      }, 1200);
    }
  }
  function endMemory() {
    if (M.mistakes === 0 && M.pairs >= 8) pids.forEach(id => award(id, 'memory'));
    const order = pids.slice().sort((x, y) => G.scores[y] - G.scores[x]);
    finishGame({ title: 'Memory acabat!', subtitle: 'Errors en total: ' + M.mistakes, order, scoreText: id => G.scores[id] + ' punts', again: () => startMemory(cfg, pids) });
  }
}
