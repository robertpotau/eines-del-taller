/* ============================================================
   Eines del taller — portada, menú, arrencada i auto-prova (?selftest)
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats.
   ============================================================ */
/* group: estudia / practica / competeix. `go` absent = encara no disponible (apareix com a «Aviat»). */
const MODES = [
  { id: 'catalog', group: 'estudia', name: 'Catàleg', ic: '1F4DA', desc: 'Totes les eines per famílies: fotos, esquema i definició.', tag: 'Consulta', go: () => showCatalog() },
  { id: 'flash', group: 'estudia', name: 'Flashcards', ic: '1F4D6', desc: 'Targetes per estudiar. Les que falles tornen més sovint.', tag: 'Estudi', go: () => setupFlash() },
  { id: 'classifica', group: 'practica', name: 'Classifica', ic: '1F5C2', desc: 'Posa cada eina a la seva família.', tag: '1-6 jugadors', go: () => setupClassifica() },
  { id: 'memory', group: 'practica', name: 'Memory', ic: '1F9E0', desc: 'Parelles de foto, nom, família i esquema.', tag: '1-6 jugadors', go: () => setupMemory() },
  { id: 'match', group: 'practica', name: 'Uneix', ic: '1F517', desc: 'Foto, nom i família: uneix cada parella.', tag: '1-6 jugadors', go: () => setupMatch() },
  { id: 'esquema', group: 'practica', name: 'Esquema → eina', ic: '1F4D0', desc: 'Quina foto o nom correspon a aquest dibuix?', tag: '1-6 jugadors', go: () => setupEsquema() },
  { id: 'ladder', group: 'competeix', name: 'Escala d’eines', ic: '1F3C6', desc: '12 preguntes que es van complicant, amb comodins i premis.', tag: '1-6 jugadors', go: () => setupLadder() },
  { id: 'speed', group: 'competeix', name: 'Ronda ràpida', ic: '26A1', desc: 'Famílies o noms contra el rellotge. Un torn per jugador.', tag: '1-6 jugadors', go: () => setupSpeed() },
  { id: 'hotseat', group: 'competeix', name: 'Quina eina és?', ic: '1F3A4', desc: 'La foto es va veient millor a cada pista. Com menys pistes, més punts.', tag: '1-6 jugadors', go: () => setupHotSeat() },
  { id: 'defs', group: 'competeix', name: 'Per a què serveix?', ic: '1F9E9', desc: 'Llegeix la definició i endevina la família.', tag: '1-6 jugadors', go: () => setupDefs() }
];
const GROUPS = [{ id: 'estudia', name: 'Estudia', ic: '1F4DA', color: '#4cc9f0' }, { id: 'practica', name: 'Practica', ic: '1F3AF', color: '#3ddc97' },
  { id: 'competeix', name: 'Competeix a la pissarra', ic: '1F3C6', color: '#ffd23f' }];

function showHub() {
  if (G) G.live = false;
  const wrap = h('div', { class: 'hub' });
  wrap.append(h('button', { class: 'profile-chip', onclick: () => showProfiles(), title: 'Canvia de perfil' }, ico('1F465'), ' Perfil: ', h('b', null, profileLabel(ST.profiles[ST.cur], ST.cur)), h('small', null, ' · canvia')));
  const strip = h('div', { class: 'pstrip' });
  activePlayers().forEach(p => {
    const ri = rankInfo(p.id);
    strip.append(h('div', { class: 'pmini', style: '--pc:' + PCOLORS[p.id] }, avatar(p.id, 'md'),
      h('div', null, h('b', null, pname(p.id)), h('small', null, ico(ri.rank.ic, 'tiny'), ' ' + ri.rank.name + ' · ' + p.xp + ' XP'), h('div', { class: 'xpbar slim' }, h('i', { style: 'width:' + ri.pct + '%' })))));
  });
  wrap.append(strip);
  GROUPS.forEach(g => {
    const modes = MODES.filter(m => m.group === g.id);
    wrap.append(h('h2', { class: 'hub-title grp', style: '--mc:' + g.color }, ico(g.ic), ' ' + g.name));
    const grid = h('div', { class: 'mode-grid' });
    modes.forEach(m => {
      const soon = !m.go;
      grid.append(h('button', { class: 'mode-card' + (soon ? ' soon' : ''), style: '--mc:' + g.color, disabled: soon, onclick: () => { sfx('click'); m.go(); } },
        ico(m.ic, 'xl'), h('b', null, m.name), h('span', { class: 'md' }, m.desc), h('small', { class: 'tag' }, m.tag)));
    });
    wrap.append(grid);
  });
  wrap.append(h('div', { class: 'hub-actions' },
    h('button', { class: 'btn', onclick: () => showPlayers() }, ico('1F465'), ' Jugadors'),
    h('button', { class: 'btn', onclick: () => showTrophies() }, ico('1F3C6'), ' Trofeus i estadístiques'),
    h('button', { class: 'btn', onclick: showSettings }, ico('2699'), ' Configuració')));
  render(wrap, '');
}
function showSplash() {
  const first = LS.get('profiles', null) === null;
  const wrap = h('div', { class: 'splash' },
    h('div', { class: 'owl' }, ico('1F9F0', 'huge')),
    h('h1', null, 'Eines del taller'),
    h('p', { class: 'tagline' }, 'Reconeix l’eina, el seu nom i la seva família!'),
    h('div', { class: 'splash-faces' }, ['1F528', '1FA9A', '1FA9B', '1F527', '1F4CF', '1F97D', '1F9F0'].map(c => ico(c))),
    h('button', { class: 'btn primary huge', id: 'btn-play', onclick: () => { sfx('start'); if (first) { saveAll(); showProfiles(); } else showHub(); } }, ico('25B6'), ' Juga'),
    h('p', { class: 'muted' }, 'Tecnologia · 39 eines i 10 famílies · 1 a 6 jugadors'));
  render(wrap, '');
  const b = $('#btn-play'); if (b) b.focus({ preventScroll: true });
}

function boot() {
  fxInit();
  $('#logo-ico').append(ico('1F9F0'));
  $('#btn-settings').append(ico('2699'));
  paintSound();
  $('#ver').textContent = 'v' + VERSION + ' — ' + BUILD_DATE;
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) { try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* ignore */ } }
  $('#btn-home').addEventListener('click', () => {
    if (G && G.live) {
      openModal(h('div', null, h('h3', null, 'Vols sortir d’aquest joc?'), h('p', null, 'Es perdrà la partida en curs.'),
        h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: closeModal }, 'Continua jugant'), h('button', { class: 'btn primary', onclick: () => { closeModal(); showHub(); } }, 'Surt'))));
    } else showHub();
  });
  $('#btn-sound').addEventListener('click', () => { ST.settings.sound = !ST.settings.sound; save(); paintSound(); sfx('click'); });
  $('#btn-settings').addEventListener('click', showSettings);
  $('#btn-full').addEventListener('click', () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ }
  });
  if (/#hub\b/.test(location.hash)) showHub(); else showSplash();     // index.html#hub salta la portada
  if (/[?&]selftest/.test(location.search)) runSelfTest();
}

/* ============================================================
   Auto-prova: obre index.html?selftest
   ============================================================ */
function runSelfTest() {
  const out = [], fails = [];
  const log = s => out.push(s);
  const ok = (cond, s) => { if (!cond) { fails.push(s); out.push('FAIL  ' + s); } };

  log('Joc v' + VERSION + ' · eines: ' + TOOLS.length + ' · famílies: ' + FAMS.length);
  ok(TOOLS.length === 39, 'han de ser 39 eines');
  ok(FAMS.length === 10, 'han de ser 10 famílies');
  const ids = new Set(), names = new Set();
  TOOLS.forEach(t => {
    ok(!ids.has(t.id), 'id duplicat ' + t.id); ids.add(t.id);
    ok(!names.has(t.nom), 'nom duplicat ' + t.nom); names.add(t.nom);
    ok(t.fam, 'família desconeguda a ' + t.nom);
    ok(t.fotos.length >= 1, 'sense fotos: ' + t.nom);
    ok(t.esquema, 'sense esquema: ' + t.nom);
    for (let i = 0; i < 30; i++) { const p = photoOf(t, true); ok(p === t.esquema || t.fotos.some(f => f.f === p && f.neta), 'photoOf(clean) dolent a ' + t.nom); }
  });
  FAMS.forEach(f => { ok(toolsOf(f.id).length > 0, 'família buida ' + f.nom); ok(ICONS[f.ic], 'falta la icona de ' + f.nom); log('  ' + f.curt + ': ' + toolsOf(f.id).length + ' eines'); });
  [].concat(AVATARS, RANKS.map(r => r.ic), TROPHIES.map(t => t.ic), MODES.map(m => m.ic), GROUPS.map(g => g.ic)).forEach(c => ok(ICONS[c], 'falta la icona ' + c));

  /* preguntes: tots els tipus, dificultats i eines */
  Q_TYPES.forEach(type => [0, 1, 2].forEach(close => TOOLS.forEach(t => {
    const q = makeQuestion({ types: [type], close, used: new Set(), tool: t });
    const keys = q.options.map(o => o.label || o.img);
    ok(q.options.length === 4 && new Set(keys).size === 4 && q.answer >= 0 && q.answer < 4, 'pregunta dolenta ' + type + ' ' + t.nom);
    const a = q.options[q.answer];
    if (type.endsWith('-nom')) ok(a.label === t.nom, type + ': resposta incorrecta ' + t.nom);
    if (type.endsWith('-fam')) ok(a.label === t.fam.nom, type + ': família incorrecta ' + t.nom);
    if (type.endsWith('-foto')) ok(a.alt === t.nom, type + ': foto incorrecta ' + t.nom);
  })));
  log('Preguntes comprovades: ' + Q_TYPES.length * 3 * TOOLS.length);
  /* fotos: totes han de carregar (comprovació asíncrona) */
  const paths = new Set(); TOOLS.forEach(t => { t.fotos.forEach(f => paths.add(f.f)); paths.add(t.esquema); });
  let loaded = 0, bad = [];
  const box = h('div', { class: 'selftest' }, h('h2', null, 'Auto-prova…'), h('pre', null, ''));
  const finish = () => {
    log('Imatges carregades: ' + loaded + '/' + paths.size + (bad.length ? ' — NO CARREGUEN: ' + bad.join(', ') : ''));
    bad.forEach(b => fails.push('imatge que no carrega: ' + b));
    /* perfils: exportar / importar */
    const payload = exportPayload([0, 1, 2, 3, 4, 5]);
    const back = parseProfilesFile(JSON.stringify(payload));
    ok(JSON.stringify(back.profiles) === JSON.stringify(ST.profiles.map((p, i) => normaliseProfile(p, i))), 'perfils: export/import canvia les dades');
    ['nope', '{}', '{"app":"altra","profiles":[{}]}', '{"app":"eines-del-taller","profiles":[]}'].forEach(bad2 => { let thrown = false; try { parseProfilesFile(bad2); } catch (e) { thrown = true; } ok(thrown, 'perfils: fitxer dolent acceptat: ' + bad2); });
    const evil = parseProfilesFile(JSON.stringify({ app: 'eines-del-taller', profiles: [{ name: 12, active: 99, players: [{ name: 'x'.repeat(50), xp: -5, avatar: 'zzz', trophies: 'no', games: 'many' }], tools: { '01': { ok: 'a', ko: 2, box: 99 } } }] })).profiles[0];
    ok(evil.active === 6 && evil.name === '' && evil.players[0].name.length === 14 && evil.players[0].xp === 0 && AVATARS.includes(evil.players[0].avatar) && evil.players[0].games === 0 && evil.tools['01'].ok === 0 && evil.tools['01'].ko === 2 && evil.tools['01'].box === 5 && evil.players.length === 6, 'perfils: la importació no neteja valors dolents');
    log('Perfils comprovats.');
    window.__selftest = { fails, out, done: true };
    $('h2', box).textContent = fails.length ? '❌ Auto-prova: ' + fails.length + ' problema(es)' : '✅ Auto-prova superada';
    log(fails.length ? 'FAILED' : 'PASSED');
    $('pre', box).textContent = out.join('\n');
  };
  window.__selftest = { fails, out, done: false };
  render(box, 'Auto-prova');
  let pending = paths.size;
  paths.forEach(p => { const im = new Image(); im.onload = () => { loaded++; if (!--pending) finish(); }; im.onerror = () => { bad.push(p); if (!--pending) finish(); }; im.src = p; });
}

boot();
