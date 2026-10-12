/* ============================================================
   Eines del taller — mode ESCALA D'EINES (12 preguntes, esglaons segurs, 5 comodins)
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats. Mecànica derivada de la «Golden Ladder» d'Adjectivia.
   ============================================================ */
const PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000];
const STEPS = PRIZES.length;
const SAFE_AT = [3, 7];                       // índexs dels esglaons segurs (el 4t i el 8è)
const fmtPts = n => n.toLocaleString('ca-ES');
const LIFELINES = [
  { id: 'fifty', ic: null, label: 'Meitat', tip: '50:50 — treu dues respostes errònies.' },
  { id: 'audience', ic: '1F465', label: 'La classe', tip: 'La classe vota aixecant la mà.' },
  { id: 'phone', ic: '1F4DE', label: 'Truca a un amic', tip: 'Un company t’ajuda durant 30 segons.' },
  { id: 'swap', ic: '1F500', label: 'Canvi', tip: 'Canvia aquesta pregunta per una altra.' },
  { id: 'double', ic: '1F340', label: 'Doble oportunitat', tip: 'Si falles la primera resposta, en pots triar una altra.' }
];
let L = null;      // estat de l'escala

function setupLadder() {
  setupScreen({
    id: 'ladder', name: 'Escala d’eines', ic: '1F3C6',
    desc: 'Puja ' + STEPS + ' esglaons de preguntes de foto, nom i família que es van complicant. Fes servir bé els comodins!',
    options: [
      { key: 'style', label: 'Com juguem?', def: 'relay', choices: [
        { v: 'relay', label: 'Relleu d’equip', desc: 'Una sola escala per a tothom. Es respon per torns i es comparteixen els comodins.' },
        { v: 'solo', label: 'Un per un', desc: 'Cada jugador puja la seva escala amb els seus comodins.' }] },
      { key: 'timer', label: 'Temps per pregunta', def: 0, choices: [{ v: 0, label: 'Sense límit' }, { v: 60, label: '60 s' }, { v: 30, label: '30 s' }] }
    ],
    rules: ['Els esglaons 4 i 8 són segurs: si caus, et quedes aquests punts.', 'Pots plantar-te en qualsevol moment i quedar-te el que tens.',
      'Fes servir A-D o 1-4 al teclat per respondre; Enter confirma.'],
    onStart: startLadder
  });
}
function startLadder(cfg, pids) {
  newGame('ladder', pids);
  L = { cfg, pids, style: pids.length === 1 ? 'solo' : cfg.style, qi: 0, runIdx: 0, turn: 0, results: [], used: new Set(), life: null, team: 0 };
  G.cur = null;
  beginRun();
}
function curPid() { return L.style === 'solo' ? L.pids[L.runIdx] : L.pids[L.turn % L.pids.length]; }
function freshLife() { return { fifty: true, audience: true, phone: true, swap: true, double: true }; }
function beginRun() {
  L.qi = 0; L.turn = 0; L.life = freshLife(); L.used = new Set(); L.team = 0;
  if (L.style === 'solo') {
    const pid = L.pids[L.runIdx];
    render(h('div', { class: 'intro' }, avatar(pid, 'xxl'), h('h2', null, pname(pid) + ', et toca!'),
      h('p', null, 'Puja l’escala. ' + STEPS + ' preguntes, 5 comodins.'),
      h('button', { class: 'btn primary big', onclick: () => { sfx('start'); askQuestion(); } }, ico('25B6'), ' Comença a pujar')), 'Escala d’eines');
    sfx('start');
  } else askQuestion();
}
/** tipus i dificultat segons l'esglaó: primer foto→nom amb opcions fàcils; al final, esquemes i fotos entre eines de la mateixa família */
function makeLadderQuestion() {
  const qi = L.qi;
  const types = qi < 4 ? ['foto-nom', 'foto-nom', 'nom-fam', 'esq-nom'] : qi < 8 ? ['foto-nom', 'nom-fam', 'foto-fam', 'esq-nom', 'nom-foto'] : ['foto-nom', 'foto-fam', 'esq-nom', 'esq-foto', 'nom-foto', 'def-fam'];
  const close = qi < 2 ? 0 : qi < 8 ? 1 : 2;
  return makeQuestion({ types, close, used: L.used });
}
function safePrize(qi) { return qi > SAFE_AT[1] ? PRIZES[SAFE_AT[1]] : qi > SAFE_AT[0] ? PRIZES[SAFE_AT[0]] : 0; }
function walkPrize(qi) { return qi > 0 ? PRIZES[qi - 1] : 0; }

function askQuestion() {
  const q = makeLadderQuestion();
  const pid = curPid();
  G.cur = pid; L.q = q;                       // (L.q: les proves automàtiques hi miren)
  const S = { q, locked: false, double: false, usedSecond: false, hint: false, pending: -1, qv: null, timer: null };
  let confirmBar;
  const build = () => {
    const fmt = L.style === 'solo' ? fmtPts : null;
    const bar = scoreBar(L.pids, G.scores, fmt);
    G.bar = bar; bar.update(G.scores, pid);
    const who = h('div', { class: 'who-banner', style: '--pc:' + PCOLORS[pid] }, avatar(pid, 'md'),
      h('div', null, h('b', null, pname(pid)), h('small', null, 'Pregunta ' + (L.qi + 1) + ' de ' + STEPS + ' · per ' + fmtPts(PRIZES[L.qi]) + ' punts')));
    const main = h('div', { class: 'ladder-main' });
    main.append(who);
    if (L.cfg.timer) {
      S.timer = countdown(L.cfg.timer, () => { if (!S.locked) lockIn(-1); }, { tick: true });
      main.append(S.timer.el);
    }
    S.qv = qView(q, i => onPick(i));
    main.append(S.qv.el);
    confirmBar = h('div', { class: 'confirm-bar', hidden: true });
    const hintBtn = hintButton(() => { S.hint = true; S.qv.showHint(); });
    const walk = h('button', { class: 'btn small', onclick: () => walkAway() }, ico('1F6D1'), ' Quedar-me ' + fmtPts(walkPrize(L.qi)) + ' i plantar-me');
    main.append(confirmBar, h('div', { class: 'under-q' }, hintBtn, walk));
    const life = h('div', { class: 'lifelines' });
    LIFELINES.forEach(ll => {
      const b = h('button', { class: 'life', disabled: !L.life[ll.id], title: ll.tip, 'aria-label': ll.label + '. ' + ll.tip, onclick: () => useLife(ll.id, S, b) },
        ll.ic ? ico(ll.ic) : h('span', { class: 'fifty' }, '50:50'), h('small', null, ll.label));
      life.append(b);
    });
    const ladder = h('ol', { class: 'prizes' });
    for (let i = STEPS - 1; i >= 0; i--) {
      ladder.append(h('li', { class: (i === L.qi ? 'now ' : '') + (i < L.qi ? 'done ' : '') + (SAFE_AT.includes(i) ? 'safe' : '') },
        h('span', { class: 'n' }, i + 1), h('span', { class: 'v' }, fmtPts(PRIZES[i])), SAFE_AT.includes(i) ? ico('1F6E1', 'tiny') : null));
    }
    const wrap = h('div', { class: 'ladder-wrap' }, bar, h('div', { class: 'ladder' }, main, h('aside', { class: 'ladder-side' }, life, ladder)));
    Keys.on(confirmKeys);
    return wrap;
  };
  render(build, 'Escala d’eines');
  announce('Pregunta ' + (L.qi + 1));

  function onPick(i) {
    if (S.locked) return;
    sfx('click');
    if (!ST.settings.confirm) return lockIn(i);
    S.pending = i; S.qv.select(i);
    confirmBar.hidden = false;
    confirmBar.replaceChildren(h('b', null, 'Resposta definitiva: ' + LETTERS[i] + (q.options[i].label ? ' — ' + q.options[i].label : '') + '?'),
      h('button', { class: 'btn primary', onclick: () => lockIn(S.pending) }, 'Sí, definitiva'),
      h('button', { class: 'btn', onclick: () => { S.pending = -1; S.qv.select(-1); confirmBar.hidden = true; } }, 'No'));
  }
  function confirmKeys(e) {
    if (S.locked || S.pending < 0) return false;
    if (e.key === 'Enter' || e.key.toLowerCase() === 's') { lockIn(S.pending); return true; }
    if (e.key.toLowerCase() === 'n') { S.pending = -1; S.qv.select(-1); confirmBar.hidden = true; return true; }
    return false;
  }
  function lockIn(i) {
    if (S.locked) return;
    S.locked = true; confirmBar.hidden = true;
    if (S.timer) S.timer.stop();
    S.qv.disable(true); S.qv.select(i);
    sfx('tick');
    Timers.set(() => verdict(i), i < 0 ? 100 : 1100);
  }
  function verdict(i) {
    const ok = i === q.answer;
    if (!ok && S.double && !S.usedSecond && i >= 0) {               // doble oportunitat: un altre intent
      S.usedSecond = true; S.locked = false; S.pending = -1; sfx('ko');
      S.qv.markWrong(i); S.qv.select(-1);
      S.qv.btns.forEach(b => { if (!b.classList.contains('wrong') && !b.classList.contains('gone')) b.disabled = false; });
      toast('Doble oportunitat! Torna-ho a provar.', 'gold');
      return;
    }
    S.qv.reveal(i);
    S.qv.showExplain(ok);
    afterAnswerSpeak(q);
    recordAnswer(pid, q.tool.id, ok, S.hint);
    if (ok) {
      sfx('ok'); confettiFrom(S.qv.btns[q.answer], 30);
      if (L.style === 'solo') addScore(pid, PRIZES[L.qi] - G.scores[pid]);
      else { addScore(pid, Math.round(100 * (L.qi + 1) * (S.hint ? 0.5 : 1))); L.team = PRIZES[L.qi]; }
      const victims = L.style === 'solo' ? [pid] : L.pids;
      if (L.qi === SAFE_AT[0]) victims.forEach(v => { award(v, 'escala4'); giveXP(v, 20); });
      if (L.qi === SAFE_AT[1]) victims.forEach(v => { award(v, 'escala8'); giveXP(v, 40); });
      if (L.qi === STEPS - 1) victims.forEach(v => { award(v, 'escala12'); giveXP(v, 100); });
      if (SAFE_AT.includes(L.qi)) { sfx('levelup'); confetti(70); toast('Esglaó segur aconseguit: ' + fmtPts(PRIZES[L.qi]) + ' punts!', 'gold'); }
      Timers.set(() => {
        if (L.qi === STEPS - 1) return endRun('win');
        L.qi++; L.turn++; askQuestion();
      }, 2400);
    } else {
      sfx('ko'); document.body.classList.add('shake'); Timers.set(() => document.body.classList.remove('shake'), 500);
      Timers.set(() => endRun(i < 0 ? 'time' : 'wrong'), 3400);
    }
  }
  function walkAway() {
    if (S.locked) return;
    openModal(h('div', null, h('h3', null, 'Vols quedar-te els punts i plantar-te?'), h('p', null, 'Et quedaràs ' + fmtPts(walkPrize(L.qi)) + ' punts.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Segueixo jugant'),
        h('button', { class: 'btn primary', onclick: () => { closeModal(); S.locked = true; if (S.timer) S.timer.stop(); endRun('walk'); } }, 'Me’ls quedo'))));
  }
}

/* ---------- comodins ---------- */
function useLife(id, S, btn) {
  if (S.locked || !L.life[id]) return;
  const q = S.q;
  sfx('lifeline');
  if (id === 'fifty') {
    L.life.fifty = false; btn.disabled = true;
    const wrongs = [0, 1, 2, 3].filter(i => i !== q.answer && !S.qv.btns[i].classList.contains('gone'));
    sample(wrongs, 2).forEach(i => S.qv.eliminate(i));
    if (S.pending >= 0 && S.qv.btns[S.pending].classList.contains('gone')) S.pending = -1;
  } else if (id === 'double') {
    L.life.double = false; btn.disabled = true; S.double = true;
    $('.who-banner').append(h('span', { class: 'badge' }, ico('1F340'), ' Doble oportunitat activa'));
    toast('Doble oportunitat: pots respondre dues vegades.', 'gold');
  } else if (id === 'swap') {
    L.life.swap = false; btn.disabled = true;
    S.locked = true; if (S.timer) S.timer.stop();
    toast('Pregunta nova!', 'gold'); Timers.set(() => askQuestion(), 400);
  } else if (id === 'audience') {
    L.life.audience = false; btn.disabled = true;
    if (S.timer) S.timer.pause();
    audienceModal(q, () => { if (S.timer) S.timer.resume(); });
  } else if (id === 'phone') {
    L.life.phone = false; btn.disabled = true;
    if (S.timer) S.timer.pause();
    phoneModal(q, () => { if (S.timer) S.timer.resume(); });
  }
}
function audienceModal(q, onDone) {
  const votes = [0, 0, 0, 0];
  const rows = h('div', { class: 'vote-rows' });
  const els = [0, 1, 2, 3].map(i => {
    const n = h('b', { class: 'vote-n' }, '0'), bar = h('i');
    rows.append(h('div', { class: 'vote-row c' + i }, h('span', { class: 'letter' }, LETTERS[i]), h('span', { class: 'vl' }, q.options[i].img ? pic(q.options[i].img, '', 'sum-img') : q.options[i].label),
      h('div', { class: 'vbar' }, bar), n,
      h('button', { class: 'btn round small', onclick: () => { votes[i] = Math.max(0, votes[i] - 1); paint(); }, 'aria-label': 'Treu un vot' }, '−'),
      h('button', { class: 'btn round small', onclick: () => { votes[i]++; sfx('click'); paint(); }, 'aria-label': 'Afegeix un vot' }, '+')));
    return { n, bar };
  });
  const paint = () => {
    const tot = votes.reduce((a, b) => a + b, 0);
    els.forEach((e, i) => { e.n.textContent = tot ? Math.round(100 * votes[i] / tot) + '%' : '0'; e.bar.style.width = tot ? (100 * votes[i] / tot) + '%' : '0%'; });
  };
  const cd = countdown(30, () => { sfx('ko'); }, { big: true, tick: true });
  openModal(h('div', null, h('h3', null, ico('1F465'), ' Pregunta a la classe'), qSummary(q),
    h('p', { class: 'muted' }, 'Tothom aixeca la mà per A, B, C o D. Toca + per cada mà.'), cd.el, rows,
    h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: closeModal }, 'Fet'))), () => { cd.stop(); if (onDone) onDone(); }, true);
}
function phoneModal(q, onDone) {
  const pid = curPid();
  const friends = L.pids.filter(p => p !== pid);
  let calling = false;
  const showCall = name => {
    calling = true;
    const cd = countdown(30, () => sfx('ko'), { big: true, tick: true });
    openModal(h('div', null, h('h3', null, ico('1F4DE'), ' Trucant a ' + name + '…'), qSummary(q),
      h('p', { class: 'muted' }, name + ', llegeix la pregunta en veu alta i ajuda durant 30 segons!'), cd.el,
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: closeModal }, 'Penja'))), () => { cd.stop(); if (onDone) onDone(); }, true);
  };
  const list = h('div', { class: 'friend-list' },
    friends.map(f => h('button', { class: 'btn friend', style: '--pc:' + PCOLORS[f], onclick: () => showCall(pname(f)) }, avatar(f, 'sm'), pname(f))),
    h('button', { class: 'btn friend', onclick: () => showCall('un company') }, ico('1F9D1'), 'Un company'));
  openModal(h('div', null, h('h3', null, ico('1F4DE'), ' Truca a un amic'), h('p', null, 'A qui vols trucar?'), list,
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Cancel·la'))), () => { if (!calling && onDone) onDone(); });
}

/* ---------- final d'una pujada ---------- */
function endRun(kind) {
  const pid = curPid();
  const reached = kind === 'win' ? STEPS : L.qi;               // esglaons respostos bé
  const prize = kind === 'win' ? PRIZES[STEPS - 1] : kind === 'walk' ? walkPrize(L.qi) : safePrize(L.qi);
  if (L.style === 'solo') {
    G.scores[pid] = prize;
    L.results.push({ pid, prize, reached });
    const msg = { win: 'Has pujat tots els esglaons!', walk: 'Has decidit plantar-te.', wrong: 'Oh, aquesta no era la resposta correcta.', time: 'S’ha acabat el temps!' }[kind];
    const last = L.runIdx >= L.pids.length - 1;
    render(h('div', { class: 'intro result' }, avatar(pid, 'xxl'), h('h2', null, msg),
      h('div', { class: 'prize-big' }, ico('1FA99'), fmtPts(prize), h('small', null, ' punts')),
      h('p', null, 'Esglaons respostos bé: ' + reached + ' de ' + STEPS),
      h('button', { class: 'btn primary big', onclick: () => { if (last) finishLadder(); else { L.runIdx++; beginRun(); } } },
        last ? 'Veure el podi' : 'Següent: ' + pname(L.pids[L.runIdx + 1]) + ' →')), 'Escala d’eines');
    if (kind === 'win') { sfx('win'); confetti(200); } else if (kind === 'wrong' || kind === 'time') sfx('lose'); else sfx('ok');
  } else {
    L.teamPrize = prize; L.teamReached = reached; L.teamKind = kind;
    finishLadder();
  }
}
function finishLadder() {
  if (L.style === 'solo') {
    const order = L.pids.slice().sort((a, b) => G.scores[b] - G.scores[a] || (L.results.find(r => r.pid === b).reached - L.results.find(r => r.pid === a).reached));
    finishGame({ title: 'Resultats de l’Escala', order, scoreText: id => fmtPts(G.scores[id]) + ' punts', again: () => startLadder(L.cfg, L.pids) });
  } else {
    const order = L.pids.slice().sort((a, b) => G.scores[b] - G.scores[a]);
    const kind = L.teamKind;
    const note = h('div', { class: 'team-prize' }, ico('1F3C6'), h('div', null, h('b', null, 'Premi de l’equip: ' + fmtPts(L.teamPrize) + ' punts'),
      h('small', null, kind === 'win' ? 'L’equip ha pujat tots els esglaons!' : 'Esglaons respostos bé: ' + L.teamReached + ' de ' + STEPS)));
    finishGame({ title: kind === 'win' ? 'Ho heu aconseguit!' : 'Resultats de l’Escala', subtitle: 'Els punts mostren què ha aportat cada jugador.', order, note,
      scoreText: id => fmtPts(G.scores[id]) + ' punts', again: () => startLadder(L.cfg, L.pids) });
  }
}
