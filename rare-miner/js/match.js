// Answer matching: Hebrew or English, transliterations, plurals, small typos.
// normalize() is also used by tests/validate.mjs, so keep the two in sync by importing it.

const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

/** Canonical form: lower-case, no niqqud/punctuation/spaces, final letters folded, doubled vav/yod folded. */
export function normalize(s) {
  if (!s) return '';
  let t = String(s).normalize('NFKD').toLowerCase();
  t = t.replace(/[֑-ׇ]/g, '');            // niqqud and cantillation
  t = t.replace(/[̀-ͯ]/g, '');            // latin accents
  t = t.replace(/[ךםןףץ]/g, c => FINALS[c]);
  t = t.replace(/[^a-z0-9א-ת]/g, '');     // drop spaces, geresh, quotes, hyphens...
  t = t.replace(/וו/g, 'ו').replace(/יי/g, 'י');     // transliteration spelling variants
  return t;
}

/** Extra forms tried when the plain form is not found: plural / article stripped. */
function variants(n) {
  const out = new Set([n]);
  const he = /[א-ת]/.test(n);
  if (he) {
    if (n.length >= 4 && n.startsWith('ה')) out.add(n.slice(1));                 // the article ה
    // plural endings (normalized form: the final ם is already folded to מ)
    for (const suf of ['ימ', 'ות']) if (n.length >= 5 && n.endsWith(suf)) out.add(n.slice(0, -2));
    // feminine plurals: פרות -> פרה, כבשות -> כבשה
    if (n.length >= 4 && n.endsWith('ות')) { out.add(n.slice(0, -2) + 'ה'); out.add(n.slice(0, -2) + 'ת'); }
    for (const v of [...out]) if (v.length >= 4 && v.startsWith('ה')) out.add(v.slice(1));
  } else {
    if (n.startsWith('the') && n.length > 5) out.add(n.slice(3));
    for (const v of [...out]) {
      if (v.endsWith('ies') && v.length > 5) out.add(v.slice(0, -3) + 'y');
      if (v.endsWith('es') && v.length > 4) out.add(v.slice(0, -2));
      if (v.endsWith('s') && v.length > 3) out.add(v.slice(0, -1));
    }
  }
  return [...out];
}

/** Damerau-Levenshtein (optimal string alignment); returns max+1 early when the gap is too big. */
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => { const r = new Array(n + 1).fill(0); r[0] = i; return r; });
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return d[m][n];
}

const cache = new WeakMap();
/** Build (once per question) a list of [normalizedForm, answer]. */
function index(q) {
  let idx = cache.get(q);
  if (idx) return idx;
  idx = [];
  for (const a of q.answers) {
    const forms = new Set([a.he, a.en, ...(a.alias || [])].filter(Boolean).map(normalize));
    for (const f of forms) if (f) idx.push([f, a]);
  }
  cache.set(q, idx);
  return idx;
}

/** Returns the matched answer object or null. */
export function matchAnswer(q, text) {
  const n = normalize(text);
  if (n.length < 2) return null;
  const idx = index(q);
  const tries = variants(n);
  // 1) exact on any variant
  for (const v of tries) for (const [f, a] of idx) if (f === v) return a;
  // 2) the alias stripped of plural/article equals the input
  for (const [f, a] of idx) for (const fv of variants(f)) if (tries.includes(fv)) return a;
  // 3) typo tolerance, only when one answer is clearly closest
  if (n.length < 4) return null;
  const max = n.length >= 8 ? 2 : 1;
  let best = null, bestD = max + 1, tie = false;
  for (const [f, a] of idx) {
    if (f.length < 4) continue;
    const d = lev(n, f, max);
    if (d < bestD) { bestD = d; best = a; tie = false; }
    else if (d === bestD && best && best !== a) tie = true;
  }
  return bestD <= max && !tie ? best : null;
}

export const TIER_POINTS = [0, 5, 15, 35, 65, 100];
