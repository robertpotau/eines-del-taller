/* ============================================================
   Eines del taller — modes ESQUEMA → EINA, UNEIX i QUINA EINA ÉS?
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats.
   ============================================================ */

/* ---------- Esquema → eina (rondes per torns amb el motor de preguntes) ---------- */
function setupEsquema() {
  setupScreen({
    id: 'esquema', name: 'Esquema → eina', ic: '1F4D0',
    desc: 'Mira el dibuix tècnic i troba la foto o el nom de l’eina real.',
    options: [
      { key: 'per', label: 'Preguntes per jugador', def: 5, choices: PER_CHOICES },
      { key: 'level', label: 'Nivell', def: 1, choices: LEVEL_CHOICES },
      { key: 'timer', label: 'Temps per pregunta', def: 0, choices: TIMER_CHOICES }
    ],
    rules: ['Encert: 10 punts, més un extra per ratxa.', 'El ? et diu la família de l’eina, però divideix els punts per dos.'],
    onStart: (cfg, pids) => startRounds({ mode: 'esquema', title: 'Esquema → eina', cfg, pids, types: ['esq-foto', 'esq-nom'] })
  });
}

/* ---------- Uneix ---------- */
function setupMatch() {
  setupScreen({
    id: 'match', name: 'Uneix', ic: '1F517',
    desc: 'Uneix cada eina amb el seu nom o la seva família. Si falles, passa el torn.',
    options: [
      { key: 'kind', label: 'Què unim?', def: 'mixed', choices: [{ v: 'nom', label: 'Foto ↔ nom', desc: 'L’eina i com es diu' }, { v: 'fam', label: 'Nom ↔ família', desc: 'Cada eina a la seva família' }, { v: 'mixed', label: 'Barrejat', desc: 'Una ronda de cada' }] },
      { key: 'rounds', label: 'Rondes', def: 2, choices: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }] }
    ],
    rules: ['Cada ronda té 5 parelles. Toca un element de l’esquerra i després el seu company de la dreta.', 'Parella correcta → +10 punts i tornes a jugar (+2 per cada parella seguida). Si falles, passa el torn.'],
    onStart: startMatch
  });
}
function startMatch(cfg, pids) {
  newGame('match', pids);
  let round = 0, turn = 0, combo = 0, mistakes = 0;
  const bar = scoreBar(pids, G.scores); G.bar = bar;
  function nextRound() {
    if (round >= cfg.rounds) return end();
    const kind = cfg.kind === 'mixed' ? (round % 2 === 0 ? 'nom' : 'fam') : cfg.kind;
    const tools = shuffle(FAMS).slice(0, 5).map(f => pick(toolsOf(f.id)));     // cada una d'una família diferent
    const left = shuffle(tools.map(t => ({ t, side: 'L' })));
    const right = shuffle(tools.map(t => ({ t, side: 'R' })));
    let sel = null, found = 0, busy = false;
    const banner = h('div', { class: 'who-banner slim' });
    const paint = () => {
      const pid = pids[turn % pids.length]; G.cur = pid; bar.update(G.scores, pid);
      banner.style.setProperty('--pc', PCOLORS[pid]);
      banner.replaceChildren(avatar(pid, 'md'), h('div', null, h('b', null, pids.length > 1 ? 'Torn de ' + pname(pid) : 'Uneix les parelles'),
        h('small', null, 'Ronda ' + (round + 1) + ' de ' + cfg.rounds + ' · ' + (kind === 'nom' ? 'foto ↔ nom' : 'nom ↔ família') + ' · parelles: ' + found + ' de 5' + (combo > 1 ? ' · combo x' + combo : ''))));
    };
    const mk = (it, i) => {
      const t = it.t;
      let inner;
      if (it.side === 'L') inner = kind === 'nom' ? pic(photoOf(t, true), t.nom, 'mt-img') : h('span', { class: 'mt-txt' }, t.nom);
      else inner = kind === 'nom' ? h('span', { class: 'mt-txt' }, t.nom) : h('span', { class: 'mt-txt' }, famDot(t.fam), ' ', t.fam.nom);
      const b = h('button', { class: 'mt ' + (it.side === 'L' ? 'mt-l' : 'mt-r'), onclick: () => click(it, b) }, inner);
      it.el = b; return b;
    };
    const colL = h('div', { class: 'mt-col' }, left.map(mk)), colR = h('div', { class: 'mt-col' }, right.map(mk));
    render(h('div', { class: 'matchgame' }, bar, banner, h('div', { class: 'mt-grid' }, colL, colR)), 'Uneix');
    paint();
    function click(it, el) {
      if (busy || it.done) return;
      const pid = pids[turn % pids.length];
      if (it.side === 'L') {
        left.forEach(x => x.el.classList.remove('sel')); sel = it; el.classList.add('sel'); sfx('click');
        if (kind === 'fam') speak(it.t.nom); return;
      }
      if (!sel) { toast('Primer toca un element de l’esquerra', 'gold'); return; }
      const ok = sel.t.id === it.t.id; busy = true;
      if (ok) {
        sel.done = it.done = true; [sel.el, it.el].forEach(e => { e.classList.remove('sel'); e.classList.add('done'); e.style.setProperty('--pc', PCOLORS[pid]); });
        found++; combo++; sfx('match'); confettiFrom(el, 14); addScore(pid, 10 + 2 * (combo - 1)); recordAnswer(pid, it.t.id, true, false);
        sel = null; busy = false; paint();
        if (found === 5) Timers.set(() => { round++; nextRound(); }, 900);
      } else {
        const l = sel; sel = null; mistakes++; combo = 0; recordAnswer(pid, l.t.id, false, false); sfx('ko');
        l.el.classList.add('wrong'); el.classList.add('wrong');
        Timers.set(() => { l.el.classList.remove('wrong', 'sel'); el.classList.remove('wrong'); turn++; busy = false; paint(); }, 900);
      }
    }
  }
  function end() {
    if (!mistakes) pids.forEach(id => award(id, 'match'));
    const order = pids.slice().sort((a, b) => G.scores[b] - G.scores[a]);
    finishGame({ title: 'Uneix acabat!', subtitle: 'Errors en total: ' + mistakes, order, scoreText: id => G.scores[id] + ' punts', again: () => startMatch(cfg, pids) });
  }
  nextRound();
}

/* ---------- Quina eina és? (pistes progressives, per a la pissarra) ---------- */
const HINT_PIX = [9, 18, 38, 0];         // píxels d'amplada a cada pista (0 = foto sencera): com més pistes, més clara és la foto
const HINT_PTS = [10, 7, 4, 2];
function setupHotSeat() {
  setupScreen({
    id: 'hotseat', name: 'Quina eina és?', ic: '1F3A4',
    desc: 'La foto es va veient millor a cada pista. Digues quina eina és el més aviat possible: com menys pistes, més punts!',
    options: [{ key: 'per', label: 'Eines per jugador', def: 3, choices: [{ v: 2, label: '2' }, { v: 3, label: '3' }, { v: 5, label: '5' }] }],
    rules: ['El jugador respon en veu alta; el professor o la classe diu si és correcte.', 'Punts: 10 a la primera pista, 7, 4 i 2 a l’última. A partir de la segona pista també apareix la família.',
      'Es pot jugar sol: llavors ho decideixes tu mateix.'],
    onStart: startHotSeat
  });
}
function startHotSeat(cfg, pids) {
  newGame('hotseat', pids);
  const total = cfg.per * pids.length;
  const used = new Set(), firstTry = Object.fromEntries(pids.map(id => [id, 0]));
  const bar = scoreBar(pids, G.scores); G.bar = bar;
  let i = 0;
  function ask() {
    if (i >= total) return end();
    const pool = TOOLS.filter(t => !used.has(t.id));
    const t = pick(pool.length ? pool : TOOLS); used.add(t.id);
    const pid = pids[i % pids.length]; G.cur = pid;
    const src = photoOf(t, true);
    let lvl = 0, over = false;
    const img = h('canvas', { class: 'hs-img', 'aria-label': 'Foto de l’eina, pixelada' });
    const photo = new Image(); let loaded = false;
    const draw = n => {                       // pixelació: es dibuixa petita i s'amplia sense suavitzar
      if (!loaded) return;
      const iw = photo.naturalWidth, ih = photo.naturalHeight; img.width = iw; img.height = ih;
      const cx = img.getContext('2d'); cx.imageSmoothingEnabled = false;
      if (!n) { cx.drawImage(photo, 0, 0); return; }
      const w = n, hh = Math.max(1, Math.round(n * ih / iw)), tmp = document.createElement('canvas'); tmp.width = w; tmp.height = hh;
      const tc = tmp.getContext('2d'); tc.imageSmoothingEnabled = true; tc.drawImage(photo, 0, 0, w, hh);
      cx.drawImage(tmp, 0, 0, w, hh, 0, 0, iw, ih);
    };
    photo.onload = () => { loaded = true; draw(HINT_PIX[lvl]); };
    photo.src = src;
    const stage = h('div', { class: 'hs-stage' }, img);
    const dots = h('div', { class: 'hs-dots' });
    const info = h('div', { class: 'hs-info' });
    const btns = h('div', { class: 'actions hs-actions' });
    const paint = () => {
      draw(HINT_PIX[lvl]);
      dots.replaceChildren(...HINT_PTS.map((p, k) => h('span', { class: 'hs-dot' + (k === lvl ? ' on' : k < lvl ? ' past' : '') }, p + ' pts')));
      info.replaceChildren(lvl >= 1 ? h('span', null, 'Pista: és una eina de la família ', famChip(t.fam)) : h('span', { class: 'muted' }, 'Pista 1: molt pixelat…'));
      btns.replaceChildren(
        h('button', { class: 'btn primary', onclick: () => finish(true) }, '✓ Correcte (' + HINT_PTS[lvl] + ' punts)'),
        h('button', { class: 'btn', onclick: () => { if (lvl < 3) { lvl++; sfx('flip'); paint(); } else finish(false); } }, lvl < 3 ? '✗ No és — més pista' : '✗ No és'),
        h('button', { class: 'btn small', onclick: () => finish(false) }, 'Passo'));
    };
    function finish(ok) {
      if (over) return; over = true;
      draw(0);
      const pts = ok ? HINT_PTS[lvl] : 0;
      recordAnswer(pid, t.id, ok, lvl > 0);
      if (ok) { addScore(pid, pts); if (lvl === 0) firstTry[pid]++; sfx('ok'); confettiFrom(stage, 40); } else sfx('ko');
      speak(t.nom);
      dots.remove();
      info.replaceChildren(h('div', { class: 'hs-answer' }, h('b', null, t.nom), ' ', famChip(t.fam), ok ? h('span', { class: 'cls-xp' }, ' +' + pts + ' punts') : null));
      btns.replaceChildren(h('button', { class: 'btn primary', id: 'hs-next', onclick: () => { i++; ask(); } }, 'Següent →'));
      const nb = $('#hs-next'); if (nb) nb.focus({ preventScroll: true });
    }
    render(() => {
      const banner = h('div', { class: 'who-banner slim', style: '--pc:' + PCOLORS[pid] }, avatar(pid, 'md'),
        h('div', null, h('b', null, pname(pid)), h('small', null, 'Eina ' + (i + 1) + ' de ' + total)));
      Keys.on(e => { const nb = $('#hs-next'); if (nb && (e.key === 'Enter' || e.key === ' ')) { nb.click(); return true; } return false; });
      return h('div', { class: 'hotseat' }, bar, banner, h('div', { class: 'q-lead' }, 'Quina eina és?'), stage, dots, info, btns);
    }, 'Quina eina és?');
    bar.update(G.scores, pid);
    paint();
  }
  function end() {
    if (pids.some(id => firstTry[id] >= 3)) pids.filter(id => firstTry[id] >= 3).forEach(id => award(id, 'hotseat'));
    const order = pids.slice().sort((a, b) => G.scores[b] - G.scores[a]);
    finishGame({ title: 'Quina eina és? acabat!', order, scoreText: id => G.scores[id] + ' punts', again: () => startHotSeat(cfg, pids) });
  }
  ask();
}
