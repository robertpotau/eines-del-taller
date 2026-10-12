/* ============================================================
   Eines del taller — mode CLASSIFICA: cada eina va a la seva família (1-6 jugadors, per torns)
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats.
   ============================================================ */
function setupClassifica() {
  setupScreen({
    id: 'classifica', name: 'Classifica', ic: '1F5C2',
    desc: 'Surt una eina: toca la caixa de la seva família. Si falles, aprens quina era i torna a sortir més tard.',
    options: [
      { key: 'fams', label: 'Quantes famílies?', def: 10, choices: [{ v: 4, label: '4', desc: 'Per començar' }, { v: 6, label: '6' }, { v: 10, label: 'Les 10', desc: 'Totes' }] },
      { key: 'count', label: 'Quantes eines?', def: 12, choices: [{ v: 12, label: '12' }, { v: 20, label: '20' }, { v: 0, label: 'Totes', desc: 'Les de les famílies triades' }] },
      { key: 'help', label: 'Ajuda', def: 'def', choices: [{ v: 'def', label: 'Amb definicions', desc: 'Cada caixa explica què fa la família (menys XP)' }, { v: 'no', label: 'Sense ajuda', desc: 'Només el nom de la família' }] },
      { key: 'timer', label: 'Temps per eina', def: 0, choices: [{ v: 0, label: 'Sense límit' }, { v: 15, label: '15 s' }, { v: 8, label: '8 s' }] }
    ],
    rules: ['Encert: 10 punts, més un extra per ratxa.', 'Cada jugador va responent per torns.', 'Una eina fallada torna a sortir una vegada més al final.'],
    onStart: startClassifica
  });
}

function startClassifica(cfg, pids) {
  newGame('classifica', pids);
  const chosen = shuffle(FAMS).slice(0, cfg.fams);
  const fams = FAMS.filter(f => chosen.includes(f));
  const deck = shuffle(TOOLS.filter(t => fams.some(f => f.id === t.familia)));
  if (cfg.count) deck.length = Math.min(cfg.count, deck.length);
  let total = deck.length, done = 0, turn = 0, answered = 0, right = 0;
  const retried = new Set(), hint = cfg.help === 'def';
  G.bar = pids.length > 1 ? scoreBar(pids, G.scores) : null;

  function next() {
    if (!deck.length) return end();
    const t = deck.shift(), pid = pids[turn++ % pids.length];
    G.cur = pid;
    let locked = false, cd = null;
    const bucketEls = {};
    const fb = h('div', { class: 'cls-fb' });
    function answer(fid) {
      if (locked) return; locked = true; if (cd) cd.stop();
      const ok = fid === t.familia;
      answered++;
      const xp = recordAnswer(pid, t.id, ok, hint);
      Object.values(bucketEls).forEach(b => { b.disabled = true; });
      bucketEls[t.familia].classList.add('right');
      if (ok) {
        right++; done++;
        addScore(pid, 10 + Math.min(G.streak[pid], 5));
        sfx('ok'); if (xp) fb.append(h('span', { class: 'cls-xp' }, '+' + xp + ' XP'));
        fb.classList.add('on', 'good'); fb.prepend(h('b', null, 'Correcte!'));
        Timers.set(next, 900);
      } else {
        if (fid) bucketEls[fid].classList.add('wrong');
        sfx('ko');
        if (!retried.has(t.id)) { retried.add(t.id); deck.push(t); total++; } else done++;
        fb.classList.add('on', 'bad');
        fb.replaceChildren(h('div', null, h('b', null, fid ? 'Quasi! ' : 'S’ha acabat el temps. '), t.nom + ' és una eina de ', famChip(t.fam), h('p', null, t.fam.def)),
          h('button', { class: 'btn primary', id: 'cls-next', onclick: next }, 'Continua ', ico('25B6')));
        const nb = $('#cls-next'); if (nb) nb.focus({ preventScroll: true });
      }
    }
    render(() => {
      const wrap = h('div', { class: 'classify' });
      if (G.bar) { G.bar.update(G.scores, pid); wrap.append(G.bar); }
      if (pids.length > 1) wrap.append(h('div', { class: 'cls-turn', style: '--pc:' + PCOLORS[pid] }, avatar(pid, 'sm'), h('b', null, ' Torn de ' + pname(pid))));
      wrap.append(h('div', { class: 'muted cls-count' }, 'Eina ' + Math.min(done + 1, total) + ' de ' + total));
      wrap.append(h('div', { class: 'fc-prog' }, h('i', { style: 'width:' + (100 * done / total) + '%' })));
      wrap.append(h('div', { class: 'cls-card' }, pic(photoOf(t, true), t.nom, 'cls-img'), h('h2', null, t.nom)));
      if (cfg.timer) { cd = countdown(cfg.timer, () => answer(null), { tick: true }); wrap.append(cd.el); }
      const grid = h('div', { class: 'cls-buckets' });
      fams.forEach((f, i) => {
        const b = h('button', { class: 'bucket', style: '--fc:' + f.color, onclick: () => answer(f.id) },
          h('span', { class: 'bk-key' }, i === 9 ? '0' : String(i + 1)), famDot(f), h('b', null, f.nom), hint ? h('small', null, f.def) : null);
        bucketEls[f.id] = b; grid.append(b);
      });
      wrap.append(grid, fb);
      wrap.append(h('div', { class: 'actions' }, h('button', { class: 'btn small', onclick: () => showHub() }, '← Surt')));
      Keys.on(e => {
        if (e.key === 'Enter' || e.key === ' ') { const nb = $('#cls-next'); if (nb) { nb.click(); return true; } return false; }
        const i = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        if (i >= 0 && fams[i]) { answer(fams[i].id); return true; }
        return false;
      });
      return wrap;
    }, 'Classifica');
  }

  function end() {
    const wrong = pids.reduce((a, id) => a + G.wrong[id], 0);
    if (!wrong && answered >= 10) pids.forEach(id => award(id, 'classifica'));
    const pct = answered ? Math.round(100 * right / answered) : 0;
    finishGame({ title: 'Classifica', subtitle: right + ' encerts de ' + answered + ' respostes (' + pct + '%)',
      scoreText: id => G.scores[id] + ' punts', again: () => startClassifica(cfg, pids) });
  }
  next();
}
