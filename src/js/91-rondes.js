/* ============================================================
   Eines del taller — modes PER A QUÈ SERVEIX? (rondes per torns) i RONDA RÀPIDA (torns cronometrats)
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats. Mecànica derivada de les rondes d'Adjectivia.
   ============================================================ */
const PER_CHOICES = [{ v: 3, label: '3 cadascú' }, { v: 5, label: '5 cadascú' }, { v: 8, label: '8 cadascú' }];
const TIMER_CHOICES = [{ v: 0, label: 'Sense límit' }, { v: 30, label: '30 s' }, { v: 15, label: '15 s' }];
const LEVEL_CHOICES = [{ v: 0, label: 'Fàcil', desc: 'Opcions molt diferents' }, { v: 1, label: 'Mitjà' }, { v: 2, label: 'Difícil', desc: 'Opcions de la mateixa família' }];

/* ---------- Per a què serveix? ---------- */
function setupDefs() {
  setupScreen({
    id: 'defs', name: 'Per a què serveix?', ic: '1F9E9',
    desc: 'Es llegeix què fa una família d’eines. Endevina de quina família parlem!',
    options: [
      { key: 'per', label: 'Preguntes per jugador', def: 5, choices: PER_CHOICES },
      { key: 'timer', label: 'Temps per pregunta', def: 0, choices: TIMER_CHOICES }
    ],
    rules: ['Encert: 10 punts, més un extra per ratxa.', 'Amb temps, respondre ràpid dona fins a 5 punts més.', 'El ? dona una eina d’exemple, però divideix els punts per dos.'],
    onStart: (cfg, pids) => startRounds({ mode: 'defs', title: 'Per a què serveix?', cfg, pids, types: ['def-fam'] })
  });
}

/** `per` preguntes per jugador, per torns; cada pregunta mostra l'explicació abans de passar a la següent */
function startRounds(spec) {
  const { cfg, pids } = spec;
  newGame(spec.mode, pids);
  const again = () => startRounds(Object.assign({}, spec));
  const total = cfg.per * pids.length;
  const ctx = { types: spec.types, used: new Set(), close: cfg.level || 0 };
  const bar = scoreBar(pids, G.scores); G.bar = bar;
  let i = 0;
  const perfect = Object.fromEntries(pids.map(id => [id, true]));

  function ask() {
    if (i >= total) return end();
    const q = makeQuestion(ctx);
    const pid = pids[i % pids.length]; G.cur = pid;
    let done = false, moved = false, hint = false, timer = null, qv = null;
    const nextBtn = h('button', { class: 'btn primary', hidden: true, onclick: go }, 'Següent →');
    const hintBtn = hintButton(() => { hint = true; qv.showHint(); });
    render(() => {
      const banner = h('div', { class: 'who-banner slim', style: '--pc:' + PCOLORS[pid] }, avatar(pid, 'md'),
        h('div', null, h('b', null, pname(pid)), h('small', null, 'Pregunta ' + (i + 1) + ' de ' + total)));
      qv = qView(q, pick1);
      const parts = [bar, banner];
      if (cfg.timer) { timer = countdown(cfg.timer, () => pick1(-1), { tick: true }); parts.push(timer.el); }
      parts.push(qv.el, h('div', { class: 'under-q' }, hintBtn, nextBtn));
      Keys.on(e => { if (done && (e.key === 'Enter' || e.key === ' ')) { go(); return true; } return false; });
      return h('div', { class: 'rounds' }, parts);
    }, spec.title);
    bar.update(G.scores, pid);

    function pick1(idx) {
      if (done) return;
      done = true; sfx('click');
      const frac = timer ? Math.max(0, timer.left() / cfg.timer) : null;
      if (timer) timer.stop();
      qv.reveal(idx);
      const ok = idx === q.answer;
      recordAnswer(pid, q.tool.id, ok, hint);
      if (ok) {
        let pts = 10 + Math.min(G.streak[pid] - 1, 5) * 2;
        if (frac != null) pts += Math.round(5 * frac);
        if (hint) pts = Math.round(pts / 2);
        addScore(pid, pts); sfx('ok'); confettiFrom(qv.btns[q.answer], 24);
        toast('+' + pts + ' punts', 'good');
      } else { perfect[pid] = false; sfx('ko'); }
      qv.showExplain(ok); afterAnswerSpeak(q);
      nextBtn.hidden = false; hintBtn.disabled = true;
      Timers.set(go, ok ? 3000 : 4500);
    }
    function go() { if (!done || moved) return; moved = true; i++; ask(); }
  }
  function end() {
    if ((spec.mode === 'defs' || spec.mode === 'esquema') && cfg.per >= 5) pids.forEach(id => { if (perfect[id]) award(id, spec.mode); });
    const order = pids.slice().sort((a, b) => G.scores[b] - G.scores[a]);
    finishGame({ title: spec.title + ' acabat!', order, scoreText: id => G.scores[id] + ' punts (' + G.correct[id] + ' ✓)', again });
  }
  ask();
}

/* ---------- Ronda ràpida ---------- */
const SPEED_WHAT = { fam: ['foto-fam', 'nom-fam'], nom: ['foto-nom', 'esq-nom'], all: ['foto-fam', 'nom-fam', 'foto-nom', 'esq-nom', 'nom-foto'] };
function setupSpeed() {
  setupScreen({
    id: 'speed', name: 'Ronda ràpida', ic: '26A1',
    desc: 'Respon tantes preguntes com puguis abans que s’acabi el temps. Cada jugador té un torn.',
    options: [
      { key: 'what', label: 'Què preguntem?', def: 'fam', choices: [{ v: 'fam', label: 'De quina família és?', desc: 'Foto o nom → família' }, { v: 'nom', label: 'Com es diu?', desc: 'Foto o esquema → nom' }, { v: 'all', label: 'Tot barrejat' }] },
      { key: 'secs', label: 'Segons per torn', def: 45, choices: [{ v: 30, label: '30 s' }, { v: 45, label: '45 s' }, { v: 60, label: '60 s' }, { v: 90, label: '90 s' }] },
      { key: 'level', label: 'Nivell', def: 1, choices: LEVEL_CHOICES }
    ],
    rules: ['Encert: 10 punts + bonus de combo. Error: perds el combo i 3 segons.', 'Cada jugador té un +10 s, una vegada per torn.'],
    onStart: startSpeed
  });
}
function startSpeed(cfg, pids) {
  newGame('speed', pids);
  const ctx = { types: SPEED_WHAT[cfg.what] || SPEED_WHAT.fam, used: new Set(), close: cfg.level };
  const bar = scoreBar(pids, G.scores); G.bar = bar;
  let turn = 0;
  function intro() {
    const pid = pids[turn]; G.cur = pid;
    render(h('div', { class: 'intro' }, bar, avatar(pid, 'xxl'), h('h2', null, pname(pid) + ', prepara’t!'),
      h('p', null, cfg.secs + ' segons. Ves tan ràpid com puguis!'),
      h('button', { class: 'btn primary big', onclick: () => countIn(pid) }, ico('26A1'), ' Som-hi!')), 'Ronda ràpida');
    bar.update(G.scores, pid);
  }
  function countIn(pid) {
    let n = 3;
    const big = h('div', { class: 'count-in' }, String(n));
    render(h('div', { class: 'intro' }, big), 'Ronda ràpida');
    sfx('tick');
    Timers.every(() => { n--; if (n <= 0) { run(pid); return; } big.textContent = String(n); sfx('tick'); }, 800);
  }
  function run(pid) {
    let over = false, power = true, answered = 0, wrongs = 0, locked = false, cd = null, stat = null, area = null, current = null;
    const startCorrect = G.correct[pid];
    const paintStat = () => { stat.replaceChildren(h('span', null, ico('2705', 'tiny'), ' ' + (G.correct[pid] - startCorrect) + ' encerts'), h('span', null, ico('1F525', 'tiny'), ' combo x' + G.streak[pid])); };
    render(() => {
      stat = h('div', { class: 'speed-stat' });
      area = h('div', { class: 'speed-area' });
      cd = countdown(cfg.secs, () => { over = true; locked = true; if (current) current.disable(true); sfx('lose'); toast('S’ha acabat el temps!', 'gold'); Timers.set(finishTurn, 1400); }, { big: true, tick: true });
      const pwr = h('button', { class: 'btn small', onclick: () => { if (!power || over) return; power = false; pwr.disabled = true; cd.add(10); sfx('lifeline'); toast('+10 segons!', 'gold'); } }, ico('23F3'), ' +10 s');
      return h('div', { class: 'rounds speed' }, bar, h('div', { class: 'who-banner slim', style: '--pc:' + PCOLORS[pid] }, avatar(pid, 'md'), h('div', null, h('b', null, pname(pid)), h('small', null, 'Ronda ràpida'))),
        cd.el, stat, area, h('div', { class: 'under-q' }, pwr));
    }, 'Ronda ràpida');
    bar.update(G.scores, pid);
    function nextQ() {
      if (over) return;
      const q = makeQuestion(ctx); G.extra.q = q;     // (G.extra.q: les proves automàtiques hi miren)
      locked = false;
      const qv = qView(q, idx => {
        if (locked || over) return;
        locked = true; answered++;
        qv.reveal(idx);
        const ok = idx === q.answer;
        recordAnswer(pid, q.tool.id, ok, false);
        if (ok) { addScore(pid, 10 + Math.min(G.streak[pid] - 1, 5) * 2); sfx('ok'); }
        else { wrongs++; cd.add(-3); sfx('ko'); }
        paintStat();
        Timers.set(() => { qv.destroy(); nextQ(); }, ok ? 450 : 1100);
      });
      current = qv;
      area.replaceChildren(qv.el);
    }
    function finishTurn() {
      const got = G.correct[pid] - startCorrect;
      G.extra[pid] = Math.max(G.extra[pid] || 0, got);
      if (got >= 15) award(pid, 'speed15');
      const last = turn >= pids.length - 1;
      render(h('div', { class: 'intro result' }, bar, avatar(pid, 'xxl'), h('h2', null, pname(pid) + ': ' + got + ' encerts!'),
        h('p', null, answered + ' respostes · ' + wrongs + ' errors'),
        h('button', { class: 'btn primary big', onclick: () => { if (last) endSpeed(); else { turn++; intro(); } } }, last ? 'Veure el podi' : 'Següent: ' + pname(pids[turn + 1]) + ' →')), 'Ronda ràpida');
      bar.update(G.scores, pid);
      sfx(got >= 8 ? 'win' : 'ok'); if (got >= 8) confetti(100);
    }
    paintStat(); nextQ();
  }
  function endSpeed() {
    const order = pids.slice().sort((a, b) => G.scores[b] - G.scores[a]);
    finishGame({ title: 'Ronda ràpida acabada!', order, scoreText: id => G.scores[id] + ' punts (' + (G.extra[id] || 0) + ' ✓)', again: () => startSpeed(cfg, pids) });
  }
  intro();
}
