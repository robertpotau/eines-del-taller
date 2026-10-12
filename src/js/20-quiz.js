/* ============================================================
   Eines del taller — preguntes de 4 opcions (motor comú de l'Escala, la Ronda ràpida, etc.) i la seva vista
   (c) 2026 Robert Potau Nuñez. Tots els drets reservats.
   ============================================================ */
const LETTERS = ['A', 'B', 'C', 'D'];
/**
 * Tipus de pregunta:
 *  foto-nom : foto → nom de l'eina        nom-foto : nom → la foto correcta (4 fotos)
 *  esq-nom  : esquema → nom               esq-foto : esquema → la foto correcta
 *  nom-fam  : nom → família               foto-fam : foto → família
 *  def-fam  : definició de la família → família
 */
const Q_TYPES = ['foto-nom', 'nom-foto', 'esq-nom', 'esq-foto', 'nom-fam', 'foto-fam', 'def-fam'];

/** `n` eines diferents de t. `close` = quantes d'elles volem de la mateixa família (les més fàcils de confondre) */
function distractorTools(t, n, close) {
  const same = shuffle(toolsOf(t.familia).filter(x => x.id !== t.id));
  const diff = shuffle(TOOLS.filter(x => x.familia !== t.familia));
  const out = same.slice(0, Math.min(close, same.length, n));
  for (const x of diff) { if (out.length >= n) break; out.push(x); }
  for (const x of same) { if (out.length >= n) break; if (!out.includes(x)) out.push(x); }
  return out.slice(0, n);
}
const imgBox = (src, alt, cls) => h('div', { class: 'q-imgbox ' + (cls || '') }, pic(src, alt));

/**
 * ctx = { used:Set d'ids d'eines ja usades, close:0|1|2, types:[...], tool (opcional: forçar l'eina) }
 * Retorna { type, tool, lead, big:Node, options:[{label}|{img,alt}], answer, explain, speakText, hint } o null
 */
function makeQuestion(ctx) {
  const types = ctx.types || Q_TYPES;
  let pool = TOOLS.filter(t => !ctx.used.has(t.id));
  if (!pool.length) { ctx.used.clear(); pool = TOOLS.slice(); }
  const t = ctx.tool || pick(pool);
  const type = pick(types);
  ctx.used.add(t.id);
  const close = ctx.close || 0;
  const toolNames = () => { const all = shuffle([t].concat(distractorTools(t, 3, close))); return { options: all.map(x => ({ label: x.nom })), answer: all.indexOf(t) }; };
  const toolPhotos = () => { const all = shuffle([t].concat(distractorTools(t, 3, close))); return { options: all.map(x => ({ img: photoOf(x, true), alt: x.nom })), answer: all.indexOf(t) }; };
  const families = () => { const all = shuffle([t.fam].concat(shuffle(FAMS.filter(f => f.id !== t.familia)).slice(0, 3))); return { options: all.map(f => ({ label: f.nom })), answer: all.indexOf(t.fam) }; };
  const ofFam = 'És una eina de la família: ' + t.fam.nom + '.';
  const spec = {
    'foto-nom': () => [{ lead: 'Quina eina és aquesta?', big: imgBox(photoOf(t, true), 'Eina'), hint: ofFam }, toolNames()],
    'esq-nom': () => [{ lead: 'Quina eina representa aquest esquema?', big: imgBox(t.esquema, 'Esquema', 'draw'), hint: ofFam }, toolNames()],
    'nom-foto': () => [{ lead: 'Quina foto és: ' + t.nom + '?', big: h('div', { class: 'q-text' }, t.nom), hint: ofFam }, toolPhotos()],
    'esq-foto': () => [{ lead: 'Quina foto correspon a aquest esquema?', big: imgBox(t.esquema, 'Esquema', 'draw'), hint: ofFam }, toolPhotos()],
    'nom-fam': () => [{ lead: 'De quina família és aquesta eina?', big: h('div', { class: 'q-text' }, t.nom), hint: t.fam.def }, families()],
    'foto-fam': () => [{ lead: 'De quina família és aquesta eina?', big: imgBox(photoOf(t, true), 'Eina'), hint: t.fam.def }, families()],
    'def-fam': () => [{ lead: 'Quina família serveix per a això?', big: h('div', { class: 'q-text def' }, '«' + t.fam.def + '»'), hint: 'Per exemple: ' + t.nom + '.' }, families()]
  };
  const parts = {}; Object.assign(parts, ...spec[type]());
  return Object.assign({ type, tool: t, speakText: t.nom,
    explain: type.endsWith('fam') ? t.nom + ' és una eina de «' + t.fam.nom + '».' : 'És: ' + t.nom + ' (' + t.fam.nom + ').' }, parts);
}

/* ---------- vista de la pregunta ---------- */
/** onPick(i) quan s'escull una opció (clic o tecla A-D / 1-4). Retorna ajudes per marcar el resultat. */
function qView(q, onPick) {
  const wrap = h('div', { class: 'qv t-' + q.type });
  wrap.append(h('div', { class: 'q-lead' }, q.lead));
  const bigBox = h('div', { class: 'q-big' }, q.big);
  if (ttsReady() && q.speakText && q.type !== 'nom-foto' && q.type !== 'nom-fam' && q.type !== 'def-fam') { /* no es llegeix el nom si és la resposta */ }
  wrap.append(bigBox);
  const hasImg = q.options.some(o => o.img);
  const opts = h('div', { class: 'q-opts' + (hasImg ? ' imgs' : '') });
  const btns = q.options.map((o, i) => h('button', { class: 'opt c' + i, 'data-i': i, onclick: () => { if (!btns[i].disabled) onPick(i); } },
    h('span', { class: 'letter' }, LETTERS[i]), o.img ? pic(o.img, o.alt || '', 'opt-img') : h('span', { class: 'olabel' }, o.label)));
  btns.forEach(b => opts.append(b));
  wrap.append(opts);
  const hint = h('div', { class: 'q-hint' });
  wrap.append(hint);
  const keyFn = e => {
    const k = e.key.toLowerCase();
    let i = ['a', 'b', 'c', 'd'].indexOf(k); if (i < 0) i = ['1', '2', '3', '4'].indexOf(k);
    if (i >= 0 && btns[i] && !btns[i].disabled) { onPick(i); return true; }
    return false;
  };
  Keys.on(keyFn);
  return {
    el: wrap, btns,
    destroy() { Keys.off(keyFn); },
    select(i) { btns.forEach((b, j) => b.classList.toggle('sel', j === i)); },
    disable(on) { btns.forEach(b => { b.disabled = on; }); },
    eliminate(i) { btns[i].classList.add('gone'); btns[i].disabled = true; },
    markWrong(i) { btns[i].classList.add('wrong'); btns[i].disabled = true; },
    /** mostra el veredicte. `chosen` pot ser -1 (s'ha acabat el temps) */
    reveal(chosen) {
      btns.forEach(b => { b.disabled = true; });
      btns.forEach((b, j) => { b.classList.remove('sel'); if (j === q.answer) b.classList.add('right'); else if (j === chosen) b.classList.add('wrong'); });
    },
    showHint() { hint.replaceChildren(h('b', null, 'Pista: '), q.hint); hint.classList.add('on'); },
    showExplain(ok) { hint.classList.add('on', ok ? 'okx' : 'kox'); hint.replaceChildren(h('span', null, q.explain)); }
  };
}
function hintButton(onClick) {
  const b = h('button', { class: 'btn-hint', title: 'Mostra una pista (la meitat de punts)', onclick: () => { b.disabled = true; sfx('click'); onClick(); } }, '?', h('small', null, ' pista'));
  return b;
}
function afterAnswerSpeak(q) { if (ST.settings.readAnswers && q.tool) speak(q.tool.nom); }
/** resum d'una pregunta (per als diàlegs de la classe i del company) */
function qSummary(q) {
  const box = h('div', { class: 'q-sum' }, h('div', { class: 'q-lead' }, q.lead), h('div', { class: 'q-big small' }, q.big.cloneNode(true)));
  box.append(h('div', { class: 'sum-opts' }, q.options.map((o, i) => h('span', { class: 'sum-o' }, h('b', null, LETTERS[i]), o.img ? pic(o.img, '', 'sum-img') : ' ' + o.label))));
  return box;
}
