/* ============================================================
   Eines del taller — UI compartida: pantalles, jugadors, XP i trofeus, marcador, podi, configuració, perfils
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats. Estructura derivada de l'obra pròpia Adjectivia.
   ============================================================ */
const app = $('#app');
let leaveFns = [];
function onLeave(fn) { leaveFns.push(fn); }
/**
 * Substitueix tota la pantalla. Tot el que pertany a l'anterior (temporitzadors, tecles, veu) s'atura abans.
 * `build` és un node o una funció que el retorna (usa funció si la pantalla crea temporitzadors o tecles en construir-se).
 */
function render(build, crumb) {
  Timers.clear(); Keys.clear();
  leaveFns.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); leaveFns = [];
  closeModal(true);
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  const node = typeof build === 'function' ? build() : build;
  app.replaceChildren(node);
  $('#crumb').textContent = crumb || '';
  window.scrollTo(0, 0);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalEl && !modalEl.dataset.lock) closeModal(); });

/* ---------- rangs i XP ---------- */
const RANKS = [
  { xp: 0, name: 'Aprenent', ic: '1F331' }, { xp: 100, name: 'Manetes', ic: '1F528' },
  { xp: 300, name: 'Ajudant de taller', ic: '1FA9B' }, { xp: 700, name: 'Operari', ic: '1F527' },
  { xp: 1500, name: 'Oficial', ic: '1F9F0' }, { xp: 3000, name: 'Mestre de taller', ic: '1F9B8' },
  { xp: 6000, name: 'Gran mestre', ic: '1F451' }
];
function rankIdx(xp) { let r = 0; RANKS.forEach((x, i) => { if (xp >= x.xp) r = i; }); return r; }
function rankInfo(pid) {
  const p = ST.players[pid], i = rankIdx(p.xp), cur = RANKS[i], nxt = RANKS[i + 1];
  return { rank: cur, next: nxt, pct: nxt ? Math.round(100 * (p.xp - cur.xp) / (nxt.xp - cur.xp)) : 100 };
}
function giveXP(pid, n) {
  n = Math.round(n); if (!(n > 0)) return;
  const p = ST.players[pid], before = rankIdx(p.xp);
  p.xp += n;
  if (G && G.xpGain) G.xpGain[pid] = (G.xpGain[pid] || 0) + n;
  const after = rankIdx(p.xp);
  if (after > before) {
    sfx('levelup'); confetti(50);
    toast(h('div', { class: 'tt' }, ico(RANKS[after].ic), h('div', null, h('b', null, pname(pid) + ' ara és'), h('div', { class: 'tt-big' }, RANKS[after].name))), 'gold');
  }
  if (p.xp >= 1000) award(pid, 'xp1000');
  save();
}

/* ---------- trofeus ---------- */
const TROPHIES = [
  { id: 'first', ic: '1F3C1', name: 'Primers passos', desc: 'Acaba qualsevol joc.' },
  { id: 'winner', ic: '1F947', name: 'Al capdamunt!', desc: 'Guanya un joc contra altres jugadors.' },
  { id: 'streak5', ic: '1F525', name: 'En ratxa', desc: 'Encerta 5 preguntes seguides.' },
  { id: 'streak10', ic: '1F680', name: 'Imparable', desc: 'Encerta 10 preguntes seguides.' },
  { id: 'classifica', ic: '1F5C2', name: 'Cada cosa al seu lloc', desc: 'Fes 10 o més eines a Classifica sense cap error.' },
  { id: 'memory', ic: '1F9E0', name: 'Memòria d’elefant', desc: 'Acaba un Memory de 8 parelles o més sense cap error.' },
  { id: 'escala4', ic: '1F4B0', name: 'Pas segur', desc: 'Arriba al primer esglaó segur de l’Escala d’eines.' },
  { id: 'escala8', ic: '1F48E', name: 'Esglaó de diamant', desc: 'Arriba al segon esglaó segur de l’Escala d’eines.' },
  { id: 'escala12', ic: '1F451', name: 'Campió de l’Escala', desc: 'Puja tots els esglaons de l’Escala d’eines.' },
  { id: 'speed15', ic: '26A1', name: 'Llamp', desc: 'Fes 15 encerts en un sol torn de la Ronda ràpida.' },
  { id: 'defs', ic: '1F9E9', name: 'Savi de les famílies', desc: 'Respon bé totes les preguntes de «Per a què serveix?» (5 o més per jugador).' },
  { id: 'esquema', ic: '1F4D0', name: 'Ull d’enginyer', desc: 'Respon bé totes les preguntes d’«Esquema → eina» (5 o més per jugador).' },
  { id: 'match', ic: '1F517', name: 'Parella perfecta', desc: 'Acaba un joc d’«Uneix» sense cap error.' },
  { id: 'hotseat', ic: '1F3A4', name: 'Ull de llinx', desc: 'Endevina 3 eines amb la primera pista a «Quina eina és?».' },
  { id: 'allModes', ic: '1F3AE', name: 'Explorador', desc: 'Juga els 8 modes de joc.' },
  { id: 'lector', ic: '1F4DA', name: 'Rata de taller', desc: 'Mira 30 eines diferents al Catàleg o a les Flashcards.' },
  { id: 'xp1000', ic: '1F31F', name: 'Superestrella', desc: 'Aconsegueix 1.000 XP.' }
];
const TROPHY = Object.fromEntries(TROPHIES.map(t => [t.id, t]));
function award(pid, id) {
  const p = ST.players[pid];
  if (!TROPHY[id] || p.trophies.includes(id)) return false;
  p.trophies.push(id); save();
  sfx('levelup');
  toast(h('div', { class: 'tt' }, ico(TROPHY[id].ic), h('div', null, h('b', null, pname(pid) + ' ha guanyat un trofeu!'), h('div', { class: 'tt-big' }, TROPHY[id].name))), 'gold');
  return true;
}

/* ---------- partida ---------- */
let G = null;
const PLAY_MODES = ['classifica', 'memory', 'match', 'esquema', 'ladder', 'speed', 'hotseat', 'defs'];            // ids dels modes de joc competitius (es van afegint)
function newGame(mode, pids) {
  G = { mode, pids: pids.slice(), scores: {}, correct: {}, wrong: {}, streak: {}, best: {}, missed: new Set(), extra: {}, xpGain: {}, live: true };
  pids.forEach(id => { G.scores[id] = 0; G.correct[id] = 0; G.wrong[id] = 0; G.streak[id] = 0; G.best[id] = 0; });
  return G;
}
/** registra una resposta (toolId pot ser null). Retorna l'XP donat. `hint` divideix la recompensa per dos. */
function recordAnswer(pid, toolId, ok, hint) {
  if (toolId) noteResult(toolId, ok);
  const p = ST.players[pid];
  if (ok) {
    G.correct[pid]++; G.streak[pid]++; p.correct++;
    if (G.streak[pid] > G.best[pid]) G.best[pid] = G.streak[pid];
    if (G.streak[pid] > p.bestStreak) p.bestStreak = G.streak[pid];
    if (G.streak[pid] >= 5) award(pid, 'streak5');
    if (G.streak[pid] >= 10) award(pid, 'streak10');
    const xp = (hint ? 4 : 8) + Math.min(G.streak[pid], 5);
    giveXP(pid, xp); return xp;
  }
  G.wrong[pid]++; G.streak[pid] = 0; p.wrong++;
  if (toolId) G.missed.add(toolId);
  save(); return 0;
}
function addScore(pid, n) { G.scores[pid] = Math.max(0, (G.scores[pid] || 0) + n); if (G.bar) G.bar.update(G.scores, G.cur); }

/* ---------- avatars i marcador ---------- */
function avatar(pid, size) {
  return h('span', { class: 'avatar ' + (size || ''), style: '--pc:' + PCOLORS[pid] }, ico(ST.players[pid].avatar));
}
function scoreBar(pids, scores, fmt) {
  const bar = h('div', { class: 'scorebar' });
  const els = {}, last = {};
  pids.forEach(id => {
    const v = h('b', { class: 'sc-v' }, fmt ? fmt(scores[id] || 0) : (scores[id] || 0));
    els[id] = h('div', { class: 'sc', style: '--pc:' + PCOLORS[id] }, avatar(id, 'sm'), h('span', { class: 'sc-n' }, pname(id)), v);
    els[id].v = v; last[id] = scores[id] || 0;
    bar.append(els[id]);
  });
  bar.update = (sc, cur) => {
    pids.forEach(id => {
      const nv = sc[id] || 0;
      els[id].v.textContent = fmt ? fmt(nv) : nv;
      if (nv > last[id]) { els[id].classList.remove('pop'); void els[id].offsetWidth; els[id].classList.add('pop'); }
      last[id] = nv;
      els[id].classList.toggle('cur', id === cur);
    });
  };
  bar.update(scores, null);
  return bar;
}

/* ---------- compte enrere ---------- */
function countdown(secs, onEnd, opts) {
  opts = opts || {};
  let left = secs, total = secs, stopped = false, paused = false;
  const fill = h('i'), num = h('b', null, Math.ceil(left));
  const el = h('div', { class: 'cd' + (opts.big ? ' big' : '') }, h('div', { class: 'cd-bar' }, fill), num);
  const paint = () => {
    num.textContent = Math.max(0, Math.ceil(left));
    fill.style.width = clamp(100 * left / total, 0, 100) + '%';
    el.classList.toggle('low', left <= 5);
  };
  paint();
  const id = Timers.every(() => {
    if (stopped || paused) return;
    left -= 0.1; paint();
    if (opts.tick && left <= 5 && Math.abs(left - Math.round(left)) < 0.05) sfx('tick');
    if (left <= 0) { stopped = true; Timers.stop(id); onEnd && onEnd(); }
  }, 100);
  return { el, stop() { stopped = true; Timers.stop(id); }, pause() { paused = true; }, resume() { paused = false; }, add(n) { left += n; total = Math.max(total, left); paint(); }, left: () => left };
}

/* ---------- final de partida: XP, trofeus, podi ---------- */
function finishGame(opts) {
  // opts: { title, subtitle, order:[pid millor primer], scoreText:(pid)=>string, scoreOf, again:fn, note:Node }
  const pids = G.pids, multi = pids.length > 1;
  const order = opts.order || pids.slice().sort((a, b) => G.scores[b] - G.scores[a]);
  pids.forEach(id => {
    const p = ST.players[id];
    p.games++; p.modes[G.mode] = (p.modes[G.mode] || 0) + 1;
    award(id, 'first');
    giveXP(id, 20);
    if (PLAY_MODES.every(m => p.modes[m])) award(id, 'allModes');
  });
  let winners = [];
  if (multi) {
    const top = opts.scoreOf ? opts.scoreOf(order[0]) : G.scores[order[0]];
    winners = order.filter(id => (opts.scoreOf ? opts.scoreOf(id) : G.scores[id]) === top);
    if (top > 0 && winners.length < pids.length) winners.forEach(id => { award(id, 'winner'); giveXP(id, 30); });
  }
  save();
  showPodium(Object.assign({}, opts, { order, winners }));
}
function showPodium(o) {
  G.live = false;
  const order = o.order, wrap = h('div', { class: 'podium-screen' });
  wrap.append(h('h2', { class: 'pod-title' }, o.title || 'Fi del joc!'));
  if (o.subtitle) wrap.append(h('p', { class: 'pod-sub' }, o.subtitle));
  const top3 = order.slice(0, 3);
  const arrangement = top3.length === 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];
  const steps = h('div', { class: 'podium' });
  arrangement.forEach(rank => {
    const id = top3[rank];
    steps.append(h('div', { class: 'pstep r' + (rank + 1) + (o.winners && o.winners.includes(id) ? ' win' : ''), style: '--pc:' + PCOLORS[id] },
      h('div', { class: 'p-medal' }, ico(['1F947', '1F948', '1F949'][rank])),
      avatar(id, 'xl'), h('div', { class: 'p-name' }, pname(id)),
      h('div', { class: 'p-score' }, o.scoreText ? o.scoreText(id) : G.scores[id] + ' punts'),
      h('div', { class: 'p-block' }, String(rank + 1))));
  });
  wrap.append(steps);
  if (order.length > 3) {
    wrap.append(h('div', { class: 'pod-rest' }, order.slice(3).map((id, i) => h('div', { class: 'sc', style: '--pc:' + PCOLORS[id] },
      h('b', null, (i + 4) + '.'), avatar(id, 'sm'), h('span', { class: 'sc-n' }, pname(id)), h('b', { class: 'sc-v' }, o.scoreText ? o.scoreText(id) : G.scores[id])))));
  }
  if (G.pids.length > 1) {
    const best = G.pids.slice().sort((a, b) => G.correct[b] - G.correct[a])[0];
    if (G.correct[best] > 0) wrap.append(h('p', { class: 'mvp' }, ico('2B50'), ' Més encerts: ', h('b', null, pname(best)), ' (' + G.correct[best] + ')'));
  }
  if (o.note) wrap.append(o.note);
  if (G.xpGain && G.pids.some(id => G.xpGain[id])) {
    wrap.append(h('div', { class: 'xp-panel' }, h('h3', null, ico('2B50'), ' Experiència guanyada'), G.pids.map(id => {
      const ri = rankInfo(id), p = ST.players[id];
      return h('div', { class: 'xp-row', style: '--pc:' + PCOLORS[id] }, avatar(id, 'sm'), h('b', null, pname(id)),
        h('span', { class: 'xp-gain' }, '+' + Math.round(G.xpGain[id] || 0) + ' XP'),
        h('span', { class: 'xp-rank' }, ico(ri.rank.ic, 'tiny'), ' ' + ri.rank.name),
        h('div', { class: 'xpbar' }, h('i', { style: 'width:' + ri.pct + '%' })),
        h('small', null, p.xp + ' XP' + (ri.next ? ' · proper rang als ' + ri.next.xp : ' · rang màxim!')));
    })));
  }
  const missed = Array.from(G.missed).map(toolById).filter(Boolean);
  if (missed.length) {
    wrap.append(h('div', { class: 'review' }, h('h3', null, ico('1F4DA'), ' Eines per repassar'),
      h('div', { class: 'chips' }, missed.slice(0, 14).map(t => h('button', { class: 'chip big', onclick: () => showTool(t, missed), title: 'Obre la fitxa' }, t.nom, h('small', null, ' · ' + t.fam.curt))))));
  }
  const acts = h('div', { class: 'actions' });
  if (o.again) acts.append(h('button', { class: 'btn primary', onclick: o.again }, ico('1F501'), ' Torna-hi'));
  acts.append(h('button', { class: 'btn', onclick: () => showHub() }, ico('1F3E0'), ' Inici'));
  wrap.append(acts);
  render(wrap, o.title || 'Resultats');
  sfx('win'); confetti(110, innerWidth / 2, innerHeight * 0.3);
  Timers.set(() => confetti(50, innerWidth * 0.2, innerHeight * 0.35), 500);
  Timers.set(() => confetti(50, innerWidth * 0.8, innerHeight * 0.35), 800);
}

/* ---------- pantalla de configuració genèrica d'un mode ---------- */
function chipRow(opt, cfg, save2) {
  const row = h('div', { class: 'chip-row' });
  opt.choices.forEach(ch => {
    const b = h('button', { class: 'choice' + (cfg[opt.key] === ch.v ? ' on' : ''), onclick: () => {
      cfg[opt.key] = ch.v; sfx('click');
      $$('.choice', row).forEach(x => x.classList.remove('on')); b.classList.add('on');
      save2();
    } }, h('b', null, ch.label), ch.desc ? h('small', null, ch.desc) : null);
    row.append(b);
  });
  return row;
}
/** def: { id, name, ic, desc, rules:[], options:[{key,label,choices:[{v,label,desc}], def}], minPlayers, noOrder, onStart(cfg, pids) } */
function setupScreen(def) {
  const saved = ST.prefs[def.id] || {}, cfg = {};
  const opts = def.options.slice();
  if (ST.active > 1 && !def.noOrder) opts.push({ key: 'order', label: 'Qui comença?', choices: [{ v: 'list', label: 'Per ordre' }, { v: 'random', label: 'A l’atzar' }], def: 'list' });
  opts.forEach(o => { cfg[o.key] = o.choices.some(c => c.v === saved[o.key]) ? saved[o.key] : o.def; });
  const wrap = h('div', { class: 'setup' });
  wrap.append(h('div', { class: 'setup-head' }, ico(def.ic, 'xl'), h('div', null, h('h2', null, def.name), h('p', null, def.desc))));
  const body = h('div', { class: 'setup-body' });
  opts.forEach(o => body.append(h('div', { class: 'opt-group' }, h('h4', null, o.label), chipRow(o, cfg, () => { ST.prefs[def.id] = Object.assign({}, cfg); save(); }))));
  wrap.append(body);
  if (def.rules && def.rules.length) wrap.append(h('ul', { class: 'rules' }, def.rules.map(r => h('li', null, r))));
  const pids = activePlayers().map(p => p.id);
  const need = def.minPlayers || 1;
  if (!def.solo) wrap.append(h('div', { class: 'who-row' }, h('span', null, 'Jugadors: '), pids.map(id => h('span', { class: 'who', style: '--pc:' + PCOLORS[id] }, avatar(id, 'sm'), pname(id))),
    h('button', { class: 'btn small', onclick: () => showPlayers(() => setupScreen(def)) }, 'Canvia')));
  const acts = h('div', { class: 'actions' },
    h('button', { class: 'btn', onclick: () => showHub() }, '← Enrere'),
    h('button', { class: 'btn primary big', id: 'btn-go', disabled: pids.length < need, onclick: () => {
      ST.prefs[def.id] = Object.assign({}, cfg); save(); sfx('start');
      let order = pids.slice(); if (cfg.order === 'random') order = shuffle(order);
      def.onStart(cfg, order);
    } }, ico('25B6'), ' Comença'));
  if (pids.length < need) wrap.append(h('p', { class: 'warn' }, 'Aquest mode necessita almenys ' + need + ' jugadors.'));
  wrap.append(acts);
  render(wrap, def.name);
}

/* ---------- jugadors ---------- */
function showPlayers(back) {
  const wrap = h('div', { class: 'players-screen' });
  const grid = h('div', { class: 'pgrid' });
  const draw = () => {
    grid.replaceChildren();
    count.textContent = ST.active;
    for (let i = 0; i < ST.active; i++) {
      const p = ST.players[i], ri = rankInfo(i);
      const nameIn = h('input', { type: 'text', maxlength: 14, value: p.name, placeholder: 'Jugador ' + (i + 1), 'aria-label': 'Nom del jugador ' + (i + 1),
        oninput: () => { p.name = nameIn.value; save(); } });
      grid.append(h('div', { class: 'pcard', style: '--pc:' + PCOLORS[i] },
        h('button', { class: 'avatar-btn', title: 'Canvia l’avatar', onclick: () => pickAvatar(i, draw) }, avatar(i, 'xl')),
        nameIn,
        h('div', { class: 'p-rank' }, ico(ri.rank.ic), ' ', ri.rank.name),
        h('div', { class: 'xpbar' }, h('i', { style: 'width:' + ri.pct + '%' })),
        h('div', { class: 'p-xp' }, p.xp + ' XP' + (ri.next ? ' · següent: ' + ri.next.xp : '')),
        h('button', { class: 'link', onclick: () => resetPlayer(i, draw) }, 'Reinicia el jugador')));
    }
  };
  const count = h('b', { class: 'big-num' });
  const step = d => { ST.active = clamp(ST.active + d, 1, MAX_PLAYERS); sfx('click'); save(); draw(); };
  wrap.append(h('h2', null, 'Qui juga?'),
    h('p', { class: 'muted' }, 'Perfil: ', h('b', null, profileLabel(ST.profiles[ST.cur], ST.cur)), ' · ', h('button', { class: 'link', onclick: () => showProfiles() }, 'canvia de perfil')),
    h('div', { class: 'stepper' }, h('button', { class: 'btn round', onclick: () => step(-1), 'aria-label': 'Menys jugadors' }, '−'), h('div', null, count, h('small', null, ' jugadors')),
      h('button', { class: 'btn round', onclick: () => step(1), 'aria-label': 'Més jugadors' }, '+')),
    grid, h('p', { class: 'muted' }, 'Els noms i els punts es desen en aquest navegador. Cada un dels 6 llocs té el seu propi XP i trofeus.'),
    h('div', { class: 'actions' }, h('button', { class: 'btn primary big', onclick: () => { saveAll(); sfx('start'); (back || showHub)(); } }, ico('25B6'), ' A jugar!')));
  draw();
  render(wrap, 'Jugadors');
}
/* ---------- perfils: grups de jugadors desats ---------- */
function showProfiles() {
  const wrap = h('div', { class: 'profiles-screen' }, h('h2', null, 'Tria un perfil'),
    h('p', { class: 'muted' }, 'Un perfil recorda els noms, avatars, XP, trofeus i les eines fallades d’un grup (per exemple una classe). Toca el nom per canviar-lo.'));
  const grid = h('div', { class: 'prgrid' });
  ST.profiles.forEach((pr, i) => {
    const used = pr.players.some(p => p.xp > 0 || (p.name || '').trim() || p.games > 0);
    const nameIn = h('input', { type: 'text', maxlength: 24, value: pr.name, placeholder: 'Perfil ' + (i + 1), 'aria-label': 'Nom del perfil ' + (i + 1),
      oninput: () => { pr.name = nameIn.value; save(); } });
    const who = h('div', { class: 'pr-who' }, pr.players.slice(0, pr.active).map((p, k) =>
      h('span', { class: 'pr-p', style: '--pc:' + PCOLORS[k] }, ico(p.avatar), ' ' + ((p.name || '').trim() || 'Jugador ' + (k + 1)))));
    const totalXP = pr.players.slice(0, pr.active).reduce((a, p) => a + p.xp, 0);
    grid.append(h('div', { class: 'prcard' + (i === ST.cur ? ' cur' : '') }, nameIn, who,
      h('div', { class: 'p-xp' }, used ? totalXP + ' XP en total' : 'Perfil buit'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: () => { ST.cur = i; saveAll(); sfx('start'); showHub(); } }, i === ST.cur ? 'Continua' : 'Usa aquest perfil'),
        used ? h('button', { class: 'link', onclick: () => exportProfiles([i]) }, 'Exporta') : null,
        used ? h('button', { class: 'link', onclick: () => resetWholeProfile(i) }, 'Reinicia') : null)));
  });
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', hidden: true, 'aria-label': 'Tria un fitxer de perfils',
    onchange: () => { const f = fileIn.files[0]; fileIn.value = ''; if (f) readImportFile(f); } });
  wrap.append(grid,
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => exportProfiles([0, 1, 2, 3, 4, 5]), title: 'Desa tots els perfils en un fitxer' }, ico('1F4BE'), ' Exporta-ho tot'),
      h('button', { class: 'btn', onclick: () => fileIn.click(), title: 'Carrega perfils d’un fitxer' }, ico('1F4C2'), ' Importa…'), fileIn),
    h('p', { class: 'muted small' }, 'Exporta i importa per fer còpia dels perfils o passar-los a un altre ordinador.'),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => showHub() }, '← Enrere')));
  render(wrap, 'Perfils');
}

/* ---------- exportar / importar perfils (un .json) ---------- */
function exportPayload(indices) {
  return { app: 'eines-del-taller', format: 1, version: VERSION, exported: new Date().toISOString(),
    profiles: indices.map(i => JSON.parse(JSON.stringify(ST.profiles[i]))) };
}
function parseProfilesFile(text) {
  let o; try { o = JSON.parse(text); } catch (e) { throw new Error('Aquest fitxer no és un fitxer de perfils vàlid.'); }
  if (!o || o.app !== 'eines-del-taller' || !Array.isArray(o.profiles) || !o.profiles.length) throw new Error('Aquest fitxer no conté perfils d’Eines del taller.');
  if (o.profiles.length > MAX_PROFILES) throw new Error('El fitxer té massa perfils.');
  return { exported: o.exported || '', profiles: o.profiles.map((p, i) => normaliseProfile(p, i)) };
}
function exportProfiles(indices) {
  const data = exportPayload(indices);
  const day = new Date().toISOString().slice(0, 10);
  const one = indices.length === 1 ? profileLabel(ST.profiles[indices[0]], indices[0]).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') : 'tots-els-perfils';
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: 'eines-' + (one || 'perfil') + '-' + day + '.json' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(indices.length + (indices.length === 1 ? ' perfil desat' : ' perfils desats') + ' en un fitxer', 'good');
}
function readImportFile(file) {
  if (file.size > 5e6) return toast('Aquest fitxer és massa gran', 'bad');
  const rd = new FileReader();
  rd.onload = () => {
    let res; try { res = parseProfilesFile(String(rd.result)); } catch (e) { return toast(e.message, 'bad'); }
    confirmImport(res.profiles);
  };
  rd.onerror = () => toast('No s’ha pogut llegir el fitxer', 'bad');
  rd.readAsText(file);
}
function confirmImport(profiles) {
  const summary = list => h('ul', { class: 'imp-list' }, list.map((pr, i) => h('li', null, h('b', null, profileLabel(pr, i)), ' — ',
    pr.players.slice(0, pr.active).map(p => (p.name || 'Jugador') + ' (' + p.xp + ' XP)').join(', '))));
  const done = () => { closeModal(); saveAll(); toast('Perfils importats', 'good'); showProfiles(); };
  if (profiles.length === 1) {
    const sel = h('select', { 'aria-label': 'On posar el perfil' }, ST.profiles.map((pr, i) => h('option', { value: i, selected: i === ST.cur }, (i + 1) + '. ' + profileLabel(pr, i) + (i === ST.cur ? ' (actual)' : ''))));
    openModal(h('div', null, h('h3', null, ico('1F4C2'), ' Importa un perfil'), summary(profiles),
      h('p', null, 'Posa’l en aquest lloc (el que hi ha ara se substituirà):'), sel,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Cancel·la'),
        h('button', { class: 'btn primary', onclick: () => { ST.profiles[parseInt(sel.value, 10)] = profiles[0]; done(); } }, 'Importa'))));
  } else {
    openModal(h('div', null, h('h3', null, ico('1F4C2'), ' Importa ' + profiles.length + ' perfils'), summary(profiles),
      h('p', { class: 'warn' }, 'Tots els teus perfils actuals se substituiran per aquests.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Cancel·la'),
        h('button', { class: 'btn danger', onclick: () => { for (let i = 0; i < MAX_PROFILES; i++) ST.profiles[i] = profiles[i] || normaliseProfile(null, i); ST.cur = clamp(ST.cur, 0, MAX_PROFILES - 1); done(); } }, 'Substitueix-ho tot'))), null, true);
  }
}
function resetWholeProfile(i) {
  const label = profileLabel(ST.profiles[i], i);
  openModal(h('div', null, h('h3', null, 'Reiniciar ' + label + '?'), h('p', null, 'S’esborraran els noms, avatars, XP, trofeus i estadístiques de tot el perfil.'),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Cancel·la'),
      h('button', { class: 'btn danger', onclick: () => { ST.profiles[i] = normaliseProfile(null, i); saveAll(); closeModal(); showProfiles(); } }, 'Reinicia'))));
}
function pickAvatar(i, done) {
  const used = new Set(ST.players.slice(0, ST.active).map((p, j) => j === i ? null : p.avatar));
  const grid = h('div', { class: 'av-grid' }, AVATARS.map(a => h('button', { class: 'av' + (ST.players[i].avatar === a ? ' on' : ''), disabled: used.has(a),
    onclick: () => { ST.players[i].avatar = a; save(); closeModal(); done(); } }, ico(a))));
  openModal(h('div', null, h('h3', null, 'Tria un avatar'), grid, h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Tanca'))));
}
function resetPlayer(i, done) {
  openModal(h('div', null, h('h3', null, 'Reiniciar el progrés de ' + pname(i) + '?'), h('p', null, 'S’esborraran l’XP, el rang, els trofeus i les estadístiques d’aquest lloc. El nom es queda.'),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Cancel·la'),
      h('button', { class: 'btn danger', onclick: () => { const p = ST.players[i]; Object.assign(p, newPlayer(i), { name: p.name, avatar: p.avatar }); save(); closeModal(); done(); } }, 'Reinicia'))));
}

/* ---------- configuració i trofeus ---------- */
function showSettings() {
  const row = (key, label, desc) => {
    const b = h('button', { class: 'toggle' + (ST.settings[key] ? ' on' : ''), role: 'switch', 'aria-checked': String(!!ST.settings[key]), onclick: () => {
      ST.settings[key] = !ST.settings[key]; b.classList.toggle('on', ST.settings[key]); b.setAttribute('aria-checked', String(ST.settings[key])); save(); paintSound(); sfx('click');
    } }, h('i'));
    return h('div', { class: 'srow' }, h('div', null, h('b', null, label), h('small', null, desc)), b);
  };
  openModal(h('div', null, h('h3', null, ico('2699'), ' Configuració'),
    row('sound', 'Efectes de so', 'Petits sons i fanfàrries.'),
    row('confirm', 'Pregunta «Resposta definitiva?» a l’Escala', 'Una pausa abans de tancar la resposta.'),
    row('tts', 'Llegeix els noms en veu alta', ttsReady() ? 'Fa servir la veu en català d’aquest dispositiu.' : 'Aquest dispositiu no té cap veu en català.'),
    h('div', { class: 'srow' }, h('div', null, h('b', null, 'Estadístiques de la classe'), h('small', null, 'Oblida quines eines s’han fallat i el progrés de les flashcards.')),
      h('button', { class: 'btn small', onclick: () => { ST.tools = {}; save(); toast('Estadístiques esborrades'); } }, 'Esborra')),
    h('div', { class: 'srow' }, h('div', null, h('b', null, 'Esborra-ho tot'), h('small', null, 'Noms, XP, trofeus i configuració.')),
      h('button', { class: 'btn small danger', onclick: () => { if (confirm('Vols esborrar TOTES les dades d’Eines del taller d’aquest navegador?')) { ['settings', 'profiles', 'profile', 'prefs'].forEach(LS.del); location.reload(); } } }, 'Esborra')),
    h('div', { class: 'credits' },
      h('b', null, 'Crèdits · Eines del taller v' + VERSION + ' — ' + BUILD_DATE),
      h('p', null, '© 2026 Robert Potau Nuñez · Tots els drets reservats · ', h('a', { href: 'https://robertpotau.github.io/termes.html', target: '_blank', rel: 'noopener' }, 'Termes d’ús')),
      h('p', null, 'Idea original, disseny i programació: Robert Potau Nuñez amb Claude Code (Anthropic).'),
      h('p', null, h('a', { href: 'credits-fotos.html', target: '_blank', rel: 'noopener' }, 'Crèdits de les fotos (Wikimedia Commons)')),
      h('p', { class: 'muted' }, 'Fotografies i esquemes de les eines: material del centre. Algunes fotos vénen de Wikimedia Commons (CC0 / CC BY / CC BY-SA) amb atribució a la pàgina de crèdits de les fotos. Icones: OpenMoji (CC BY-SA 4.0). Tipus de lletra: Nunito (SIL OFL 1.1). Aquest material de tercers NO el cobreix la reserva de drets.')),
    h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: closeModal }, 'Fet'))));
}
function paintSound() {
  const b = $('#btn-sound'); b.replaceChildren(ico(ST.settings.sound ? '1F50A' : '1F507'));
  b.setAttribute('aria-pressed', String(!ST.settings.sound));
}
function showTrophies() {
  const wrap = h('div', { class: 'trophy-screen' });
  wrap.append(h('h2', null, ico('1F3C6'), ' Trofeus i estadístiques'));
  const pl = activePlayers();
  const grid = h('div', { class: 'tgrid' });
  TROPHIES.forEach(t => {
    grid.append(h('div', { class: 'tcell' }, ico(t.ic), h('b', null, t.name), h('small', null, t.desc),
      h('div', { class: 'tw' }, pl.map(p => h('span', { class: 'tw-p' + (p.trophies.includes(t.id) ? ' got' : ''), style: '--pc:' + PCOLORS[p.id], title: pname(p.id) }, ico(p.avatar))))));
  });
  wrap.append(h('p', { class: 'muted' }, 'Les cares de colors han guanyat el trofeu.'), grid);
  const miss = missedTools(12);
  wrap.append(h('h3', null, ico('1F50E'), ' Classe: eines per practicar'));
  wrap.append(miss.length ? h('div', { class: 'chips' }, miss.map(t => h('button', { class: 'chip big', onclick: () => showTool(t, miss) }, t.nom, h('small', null, ' · ✗' + ST.tools[t.id].ko)))) :
    h('p', { class: 'muted' }, 'Encara res. Les eines que es fallin apareixeran aquí.'));
  const tbl = h('table', { class: 'stats' }, h('thead', null, h('tr', null, ['Jugador', 'Rang', 'XP', 'Partides', 'Encerts', 'Errors', 'Millor ratxa'].map(x => h('th', null, x)))),
    h('tbody', null, pl.map(p => h('tr', null, h('td', null, pname(p.id)), h('td', null, rankInfo(p.id).rank.name), h('td', null, p.xp), h('td', null, p.games), h('td', null, p.correct), h('td', null, p.wrong), h('td', null, p.bestStreak)))));
  wrap.append(h('h3', null, ico('1F4CA'), ' Jugadors'), h('div', { class: 'tbl-wrap' }, tbl));
  wrap.append(h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => showHub() }, '← Enrere')));
  render(wrap, 'Trofeus');
}
