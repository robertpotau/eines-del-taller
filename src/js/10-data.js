/* ============================================================
   Eines del taller — model de dades: eines, famílies, fotos a l'atzar i estadístiques per perfil
   (EINES_DATA el genera tools/genera-dades.py; (c) 2026 Robert Potau Nuñez. Tots els drets reservats.)
   ============================================================ */
const FAM_ICONS = { percussio: '1F528', tall: '1FA9A', abrasio: '1F9FD', perforacio: '1F573', agafar: '1F5DC', cargolar: '1FA9B', passives: '1F9F1', mesurar: '1F4CF', soldar: '1F525', proteccio: '1F97D' };
const FAMS = EINES_DATA.families.map(f => Object.assign({}, f, { ic: FAM_ICONS[f.id] }));
const FAMMAP = new Map(FAMS.map(f => [f.id, f]));
const TOOLS = EINES_DATA.eines.map(e => Object.assign({}, e, { fam: FAMMAP.get(e.familia) }));
const TMAP = new Map(TOOLS.map(t => [t.id, t]));
const toolById = id => TMAP.get(id);
const toolsOf = fid => TOOLS.filter(t => t.familia === fid);
/** every name that is accepted for a tool (main name + alternative names) */
const allNames = t => [t.nom].concat(t.alies);

/* ---------- random photo of a tool (never the same twice in a row) ---------- */
const lastPhoto = {};
/**
 * `clean` = only photos that show just this tool (for quiz questions). If a tool has no clean photo the
 * schematic drawing is used, so a question is never ambiguous. Returns a path.
 */
function photoOf(t, clean) {
  let pool = (clean ? t.fotos.filter(f => f.neta) : t.fotos).map(f => f.f);
  if (!pool.length) return t.esquema;
  if (pool.length > 1) pool = pool.filter(p => p !== lastPhoto[t.id]);
  const p = pick(pool); lastPhoto[t.id] = p; return p;
}
/** <img> that never shows a broken icon */
function pic(src, alt, cls) {
  const im = h('img', { src, alt: alt || '', class: cls || '', draggable: 'false' });
  im.addEventListener('error', () => { im.classList.add('missing'); });
  return im;
}

/* ---------- statistics per profile: right/wrong counts and a Leitner box (1 = needs work … 5 = known) ---------- */
function toolStat(id) { const s = ST.tools[id]; return s || (ST.tools[id] = { ok: 0, ko: 0, box: 1 }); }
function noteResult(id, ok) {
  const s = toolStat(id);
  if (ok) { s.ok++; s.box = Math.min(5, s.box + 1); } else { s.ko++; s.box = 1; }
  save();
}
function noteViewed(id) {
  const v = ST.viewed;
  if (!v.includes(id)) { v.push(id); save(); if (v.length >= 30) activePlayers().forEach(p => award(p.id, 'lector')); }
}
/** tools the class struggles with, most missed first */
function missedTools(n) {
  return TOOLS.filter(t => ST.tools[t.id] && ST.tools[t.id].ko > 0 && ST.tools[t.id].box <= 2)
    .sort((a, b) => ST.tools[b.id].ko - ST.tools[a.id].ko).slice(0, n || 12);
}
const boxOf = id => (ST.tools[id] ? ST.tools[id].box : 1);
