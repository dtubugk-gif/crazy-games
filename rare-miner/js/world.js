// The mine: pixel-art tiles drawn in code, a seeded cross-section of the world (surface -> bedrock),
// the miner, particles, lighting and depth milestones. Everything is original art made here.

// ---------- seeded helpers ----------
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 3) {
  let t = 0, amp = 1, sum = 0, f = 1;
  for (let i = 0; i < oct; i++) { t += vnoise(x * f, y * f, s + i * 101) * amp; sum += amp; amp *= 0.5; f *= 2; }
  return t / sum;
}

// ---------- blocks ----------
export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, DEEP: 4, BEDROCK: 5, GRAVEL: 6, WATER: 7, LAVA: 8,
  COAL: 9, IRON: 10, COPPER: 11, GOLD: 12, RED: 13, LAPIS: 14, DIAMOND: 15,
  DCOAL: 16, DIRON: 17, DGOLD: 18, DRED: 19, DLAPIS: 20, DDIAMOND: 21,
  LOG: 22, LEAVES: 23, PLANKS: 24, SCULK: 25, GLASS: 26, DOOR: 27, ROOF: 28, TUFF: 29, CLAY: 30, GRANITE: 31, DIORITE: 32,
};
const SOLID = new Set(Object.values(B).filter(v => ![B.AIR, B.WATER, B.LAVA, B.LEAVES, B.GLASS, B.DOOR].includes(v)));
export const isSolid = b => SOLID.has(b);
export const kindOf = b => (b === B.DIRT || b === B.GRASS || b === B.GRAVEL || b === B.CLAY || b === B.PLANKS || b === B.LOG) ? 'dirt'
  : (b === B.DEEP || (b >= B.DCOAL && b <= B.DDIAMOND) || b === B.SCULK || b === B.TUFF) ? 'deep'
  : b === B.BEDROCK ? 'bedrock' : 'stone';

// ---------- texture painting ----------
const T = 16;
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function paint(fn, seed) {
  const cv = document.createElement('canvas'); cv.width = cv.height = T;
  const g = cv.getContext('2d'); const img = g.createImageData(T, T); const r = rng(seed);
  const px = (x, y, c, a = 255) => {
    if (x < 0 || y < 0 || x >= T || y >= T) return;
    const i = (y * T + x) * 4, [R, G, Bc] = typeof c === 'string' ? hex(c) : c;
    img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = Bc; img.data[i + 3] = a;
  };
  const get = (x, y) => { const i = (y * T + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };
  fn(px, r, get);
  g.putImageData(img, 0, 0);
  return cv;
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function speckle(px, r, base, specks, density = 0.35) {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(x, y, r() < density ? pick(r, specks) : base);
}
// chunky 2x2 clusters read as calm, hand-made pixel art instead of per-pixel noise
function clusters(px, r, base, cols, n) {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(x, y, base);
  for (let k = 0; k < n; k++) {
    const x = Math.floor(r() * T), y = Math.floor(r() * T), c = pick(r, cols), w = 1 + (r() < .6 ? 1 : 0), h = 1 + (r() < .5 ? 1 : 0);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px((x + i) % T, (y + j) % T, c);
  }
}
function stoneBase(px, r) {
  clusters(px, r, '#808080', ['#747473', '#8c8c89', '#6c6c6b', '#939390'], 46);
  if (r() < .6) { // at most one short, soft crack per tile so no pattern repeats
    let x = Math.floor(r() * T), y = Math.floor(r() * T); const dx = r() < .5 ? 1 : -1;
    for (let i = 0; i < 2 + r() * 2; i++) { px(x, y, '#686866'); x += r() < .5 ? dx : 0; y += 1; }
  }
  for (let k = 0; k < 5; k++) px(Math.floor(r() * T), Math.floor(r() * T), '#9a9a95');
}
function deepBase(px, r) {
  for (let y = 0; y < T; y++) {
    const band = (y % 4 === 0) ? '#3f3f48' : (y % 4 === 2 ? '#52525c' : '#4a4a53');
    for (let x = 0; x < T; x++) px(x, y, r() < 0.3 ? pick(r, ['#45454e', '#55555f', '#3b3b44']) : band);
  }
  for (let k = 0; k < 4; k++) { const y = Math.floor(r() * T); const x0 = Math.floor(r() * T); for (let i = 0; i < 4; i++) px((x0 + i) % T, y, '#33333b'); }
}
function oreBlobs(px, r, cols, n = 4) {
  // cols: [shadow, body, highlight]: chunky lumps lit from the top-left, spread over the 4 quadrants
  const spots = [[2, 2], [9, 3], [3, 9], [10, 10], [6, 6]].sort(() => r() - .5).slice(0, n);
  for (const [bx, by] of spots) {
    const cx = bx + Math.floor(r() * 3) - 1, cy = by + Math.floor(r() * 3) - 1, w = 3 + (r() < .4 ? 1 : 0), h = 2 + (r() < .5 ? 1 : 0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if ((x === 0 || x === w - 1) && (y === 0 || y === h - 1) && r() < .5) continue; // round the corners
      const shade = y === h - 1 || x === w - 1;
      px(cx + x, cy + y, shade ? cols[0] : cols[1]);
    }
    px(cx + 1, cy, cols[2]); if (w > 3) px(cx + 2, cy, cols[2]);
    px(cx, cy + h, '#4f4f4c', 120);
  }
}
const ORE_COL = {
  COAL: ['#141414', '#2a2a2a', '#5c5c5c'], IRON: ['#7d5a43', '#d4a98b', '#efd2bd'], COPPER: ['#8a4a2a', '#c9764a', '#7fc4a6'],
  GOLD: ['#8c6315', '#e6bd3a', '#fff0a0'], RED: ['#6e1612', '#c1342b', '#f07a66'], LAPIS: ['#17286e', '#2f50b5', '#7f9cf0'],
  DIAMOND: ['#1d6e6a', '#4fd0c6', '#d8fffb'],
};

function makeTiles() {
  const tiles = {}; const V = 4;
  const set = (id, fn) => { tiles[id] = []; for (let v = 0; v < V; v++) tiles[id].push(paint(fn, id * 977 + v * 131 + 7)); };
  const dirt = (px, r) => {
    clusters(px, r, '#8a5a3a', ['#7a4d31', '#9b6844', '#734a2e', '#a37150'], 44);
    for (let k = 0; k < 3; k++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 14); px(x, y, '#5b3822'); px(x + 1, y, '#b48562'); }
  };
  set(B.DIRT, dirt);
  set(B.GRASS, (px, r) => {
    dirt(px, r);
    for (let x = 0; x < T; x++) {
      const d = 3 + Math.floor(r() * 2) + (r() < .25 ? 1 : 0);
      for (let y = 0; y < d; y++) px(x, y, y === 0 ? (r() < .5 ? '#86c053' : '#78b346') : pick(r, ['#5f9e35', '#56932f', '#6aa83e']));
      px(x, d, '#4a7d27');
    }
  });
  set(B.STONE, stoneBase);
  set(B.DEEP, deepBase);
  set(B.TUFF, (px, r) => speckle(px, r, '#6d6c63', ['#5f5e56', '#7b7a70', '#86847a'], .6));
  set(B.CLAY, (px, r) => speckle(px, r, '#9aa3b2', ['#8f97a5', '#a7afbd'], .35));
  set(B.GRANITE, (px, r) => { clusters(px, r, '#9a6b57', ['#8a5c49', '#b07e69', '#82563f', '#c28f79'], 52); for (let k = 0; k < 5; k++) px(Math.floor(r() * T), Math.floor(r() * T), '#d9a991'); });
  set(B.DIORITE, (px, r) => { clusters(px, r, '#bdbcb8', ['#a9a8a4', '#d2d1cd', '#9d9c98', '#e2e1dc'], 52); for (let k = 0; k < 6; k++) px(Math.floor(r() * T), Math.floor(r() * T), '#6f6e6a'); });
  set(B.GRAVEL, (px, r) => {
    speckle(px, r, '#857d78', ['#6e6560', '#9c948e', '#5d5551', '#a8a19b'], .7);
    for (let k = 0; k < 6; k++) { const x = Math.floor(r() * 15), y = Math.floor(r() * 15); px(x, y, '#4f4844'); px(x + 1, y, '#b9b2ac'); }
  });
  set(B.BEDROCK, (px, r) => speckle(px, r, '#3a3a3a', ['#1e1e1e', '#5a5a5a', '#2a2a2a', '#151515', '#6b6b6b'], .8));
  for (const [name, base] of [['COAL', 0], ['IRON', 0], ['COPPER', 0], ['GOLD', 0], ['RED', 0], ['LAPIS', 0], ['DIAMOND', 0]]) {
    set(B[name], (px, r) => { stoneBase(px, r); oreBlobs(px, r, ORE_COL[name], name === 'DIAMOND' ? 3 : 4); });
    if (B['D' + name]) set(B['D' + name], (px, r) => { deepBase(px, r); oreBlobs(px, r, ORE_COL[name], name === 'DIAMOND' ? 3 : 4); });
  }
  set(B.LOG, (px, r) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const stripe = (x % 4 === 0) ? '#4a321c' : (x % 4 === 2 ? '#6b4a2b' : '#5c3f23');
      px(x, y, r() < .15 ? '#3f2a17' : stripe);
    }
  });
  set(B.LEAVES, (px, r) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = r();
      if (v < .1) continue; // holes
      px(x, y, v < .35 ? '#3f7a24' : v < .7 ? '#4f8f2d' : v < .92 ? '#5ea336' : '#79bb4b');
    }
  });
  set(B.PLANKS, (px, r) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const line = y % 4 === 3; const seam = (y % 8 < 4 ? x === 5 : x === 12) && !line;
      px(x, y, line ? '#7a5631' : seam ? '#8a6438' : (r() < .25 ? pick(r, ['#a27a49', '#b8915c']) : '#ad8552'));
    }
  });
  set(B.ROOF, (px, r) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const line = y % 4 === 3; px(x, y, line ? '#5a2f22' : (r() < .25 ? '#8a4a35' : '#7a3f2c'));
    }
  });
  set(B.GLASS, (px) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      if (edge) px(x, y, '#d9e9ee', 255); else px(x, y, '#bfe0ea', 70);
    }
    for (let i = 3; i < 7; i++) px(i, 12 - i, '#ffffff', 200);
  });
  set(B.DOOR, (px, r) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const frame = x < 2 || x > 13; px(x, y, frame ? '#5a3c20' : (y % 5 === 4 ? '#6e4a28' : (r() < .2 ? '#86603a' : '#7b5631')));
    }
    px(11, 8, '#d8c27a'); px(11, 9, '#a8913f');
  });
  set(B.SCULK, (px, r) => {
    speckle(px, r, '#10262d', ['#0b1c22', '#163741', '#1c4450'], .55);
    for (let k = 0; k < 4; k++) px(Math.floor(r() * T), Math.floor(r() * T), '#3a8f93');
  });
  // fluids: a few animation frames
  tiles.water = []; tiles.lava = [];
  for (let f = 0; f < 4; f++) {
    tiles.water.push(paint((px, r) => {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const w = Math.sin((x + f * 4) * 0.8 + y * 0.6) + Math.sin((x - f * 3) * 0.35 - y * 0.9);
        px(x, y, w > 1.1 ? '#6f9fd8' : w > 0.2 ? '#3f74bd' : '#335fa3', 200);
      }
    }, 900 + f));
    tiles.lava.push(paint((px, r) => {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const w = Math.sin((x + f * 2) * 0.7 + Math.sin(y * 0.5 + f) * 2) + Math.cos((y - f * 2) * 0.6 + x * 0.3);
        px(x, y, w > 1.2 ? '#ffc35a' : w > 0.3 ? '#f08a28' : w > -0.6 ? '#d8581c' : '#a8350f');
      }
    }, 950 + f));
  }
  // background walls: the layer's block, darker and a touch cooler
  const wall = (src) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = T; const g = cv.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#6a6672'; g.fillRect(0, 0, T, T);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(10,8,14,.08)'; g.fillRect(0, 0, T, T);
    return cv;
  };
  tiles.wall = { dirt: tiles[B.DIRT].map(wall), stone: tiles[B.STONE].map(wall), deep: tiles[B.DEEP].map(wall), planks: tiles[B.PLANKS].map(wall) };
  return tiles;
}

// ---------- items (ore tier icons), 16x16 hand-drawn maps ----------
const ITEM_MAPS = {
  1: { // stone chunk
    pal: { a: '#4f4f4c', b: '#7e7e7b', c: '#9b9b96', d: '#b9b9b3', e: '#646461' },
    map: [
      '................', '................', '.....aaaa.......', '....abccba......', '...abcddcbaa....', '..abcddccbbba...',
      '..abccccbbbeba..', '..abbccbbbeeba..', '.aebbbbbeeeba...', '.aeebbbeeeba....', '..aeeeeeeba.....', '...aaeeeaa......',
      '.....aaa........', '................', '................', '................'],
  },
  2: { // coal lump
    pal: { a: '#0d0d0d', b: '#1f1f1f', c: '#343434', d: '#5a5a5a', e: '#8a8a8a' },
    map: [
      '................', '................', '......aaa.......', '....aabcbaa.....', '...abccdcbba....', '..abcdeedcbba...',
      '..abcdddccbba...', '.abbccccbbbba...', '.abbbccbbbbba...', '..abbbbbbbaa....', '..aabbbbbaa.....', '....aabaa.......',
      '.....aa.........', '................', '................', '................'],
  },
  3: { // raw iron
    pal: { a: '#5e3f2c', b: '#a77a5c', c: '#d4a98b', d: '#efd2bd', e: '#8a6248' },
    map: [
      '................', '................', '.......aaa......', '.....aacdca.....', '....acddccba....', '...acdccccbba...',
      '..aaccccbbbba...', '.acdcbbbeebbba..', '.acccbbeeeebba..', '..abbbbeeeeba...', '..abbbbbeeba....', '...aabbbbaa.....',
      '.....aaaa.......', '................', '................', '................'],
  },
  4: { // gold nugget cluster
    pal: { a: '#6e4a0c', b: '#c08a1e', c: '#e6bd3a', d: '#fff0a0', e: '#9b6c14' },
    map: [
      '................', '................', '........aa......', '.......acda.....', '...aa..accba....', '..acda..abba....',
      '..accbaaaaa.....', '...abbacddca....', '....aaccccbba...', '....acccbbbea...', '...acdcbbbeea...', '...accbbbeea....',
      '....abbeeaa.....', '.....aaaa.......', '................', '................'],
  },
  5: { // diamond gem
    pal: { a: '#0f4f4b', b: '#2a9c94', c: '#4fd0c6', d: '#a8f2ea', e: '#e9fffd' },
    map: [
      '................', '................', '.....aaaaaa.....', '....adeddcca....', '...adeedccbba...', '..addddccccbba..',
      '..aaaaaaaaaaaa..', '...acddccbbba...', '....acdccbba....', '.....acccba.....', '......acba......', '.......aa.......',
      '................', '................', '................', '................'],
  },
};
function drawItem(tier) {
  const it = ITEM_MAPS[tier]; const cv = document.createElement('canvas'); cv.width = cv.height = T; const g = cv.getContext('2d');
  it.map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = it.pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return cv;
}
export function itemDataURL(tier, size = 64) {
  const src = drawItem(tier); const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, size, size);
  return cv.toDataURL();
}

// ---------- milestones (true facts for current Minecraft, Java 1.18+) ----------
export const MILESTONES = [
  { y: 56, t: 'פחם נפוץ בכל מקום כאן למעלה' },
  { y: 48, t: 'נחושת הכי נפוצה בגובה 48' },
  { y: 16, t: 'ברזל: אחד השיאים שלו בגובה 16' },
  { y: 0, t: 'מתחת לגובה 0: רק דיפסלייט' },
  { y: -16, t: 'זהב הכי נפוץ בגובה ‎-16' },
  { y: -51, t: 'בגובה הזה נבנות האנשנט סיטיז' },
  { y: -54, t: 'מתחת לגובה ‎-54 המערות מלאות לבה' },
  { y: -59, t: 'יהלומים הכי נפוצים ממש מעל הבדרוק. מכאן אי אפשר לחפור: חפירה מושלמת!' },
];
export const LAYERS = [
  { min: 61, name: 'פני השטח', amb: 'amb_surface' },
  { min: 1, name: 'שכבת האבן', amb: 'amb_cave' },
  { min: -30, name: 'שכבת הדיפסלייט', amb: 'amb_deep' },
  { min: -54, name: 'הדיפ דארק', amb: 'amb_deep' },
  { min: -59, name: 'שכבת הלבה', amb: 'amb_lava' },
  { min: -999, name: 'בדרוק', amb: 'amb_lava' },
];
export const layerAt = y => LAYERS.find(l => y >= l.min);

// ---------- world generation ----------
export const XR = 44, YMIN = -64, YMAX = 92, SURF = 64;
export class World {
  constructor(seed) {
    this.seed = seed; this.W = XR * 2 + 1; this.H = YMAX - YMIN + 1;
    this.cells = new Uint8Array(this.W * this.H); this.wallK = new Uint8Array(this.W * this.H); // 0 none(sky) 1 dirt 2 stone 3 deep 4 planks
    this.deco = []; this.gen();
  }
  i(x, y) { return (y - YMIN) * this.W + (x + XR); }
  get(x, y) { if (x < -XR || x > XR || y < YMIN || y > YMAX) return y < YMIN ? B.BEDROCK : B.AIR; return this.cells[this.i(x, y)]; }
  set(x, y, b) { if (x < -XR || x > XR || y < YMIN || y > YMAX) return; this.cells[this.i(x, y)] = b; }
  surfaceAt(x) {
    // flat around the shaft and the cabin (x -10..2), gentle hills further out
    const dist = x < -10 ? -10 - x : x > 2 ? x - 2 : 0;
    if (!dist) return SURF;
    const n = fbm(x * 0.09, 3.3, this.seed, 3);
    return SURF + Math.round((n - 0.45) * 7 * Math.min(1, dist / 5));
  }
  gen() {
    const s = this.seed, r = rng(s * 7 + 3);
    for (let x = -XR; x <= XR; x++) {
      const top = this.surfaceAt(x);
      const dirtDepth = 3 + Math.floor(hash2(x, 1, s) * 2);
      for (let y = YMIN; y <= YMAX; y++) {
        let b = B.AIR, wk = 0;
        if (y <= top) {
          if (y === top) b = B.GRASS;
          else if (y > top - dirtDepth) b = B.DIRT;
          else {
            const deepT = y < 0 ? 1 : y > 8 ? 0 : (8 - y) / 8;
            b = hash2(x, y, s + 5) < deepT ? B.DEEP : B.STONE;
          }
          if (y <= -60) { const bt = (y + 64) / 5; if (y === -64 || hash2(x, y, s + 9) > bt) b = B.BEDROCK; }
          wk = y > top - dirtDepth ? 1 : (b === B.DEEP || y < 0 ? 3 : 2);
        }
        this.set(x, y, b); this.wallK[this.i(x, y)] = wk;
      }
    }
    // patches: gravel, tuff, clay
    for (let x = -XR; x <= XR; x++) for (let y = -58; y < SURF - 4; y++) {
      const b = this.get(x, y); if (b !== B.STONE && b !== B.DEEP) continue;
      const n = fbm(x * 0.21, y * 0.21, s + 33, 2), n2 = fbm(x * 0.17, y * 0.19, s + 44, 2);
      if (n > 0.73) this.set(x, y, y > 0 ? B.GRAVEL : B.TUFF);
      else if (y > 2 && n2 > 0.7) this.set(x, y, hash2(x >> 3, y >> 3, s) < .5 ? B.GRANITE : B.DIORITE);
    }
    // caves (keep the top few blocks under the grass intact, fewer near the surface)
    for (let x = -XR; x <= XR; x++) for (let y = -59; y < SURF - 5; y++) {
      const n = fbm(x * 0.085, y * 0.13, s + 77, 3);
      const near = y > 40 ? (y - 40) / 20 * 0.08 : 0;
      const nearShaft = Math.abs(x) <= 1 ? 0.04 : 0; // caves cross the shaft less often, but still do
      if (n > 0.6 + near + nearShaft && this.get(x, y) !== B.BEDROCK) this.set(x, y, B.AIR);
    }
    // ores: veins weighted by height like the real distribution (approximate triangles)
    const tri = (y, lo, peak, hi) => y < lo || y > hi ? 0 : y <= peak ? (y - lo) / (peak - lo) : (hi - y) / (hi - peak);
    const ores = [
      { b: 'COAL', f: y => y > 0 ? 0.9 : 0, size: 5 },
      { b: 'COPPER', f: y => tri(y, -16, 48, 112), size: 5 },
      { b: 'IRON', f: y => tri(y, -24, 16, 56), size: 4 },
      { b: 'LAPIS', f: y => tri(y, -32, 0, 32) * 0.6, size: 3 },
      { b: 'GOLD', f: y => tri(y, -64, -16, 32) * 0.7, size: 3 },
      { b: 'RED', f: y => y < 15 ? Math.min(1, (15 - y) / 70) * 0.9 : 0, size: 4 },
      { b: 'DIAMOND', f: y => y < 16 ? Math.min(1, (16 - y) / 76) * 0.6 : 0, size: 3 },
    ];
    for (const o of ores) {
      const tries = 300;
      for (let k = 0; k < tries; k++) {
        const x = -XR + Math.floor(r() * this.W), y = -60 + Math.floor(r() * (SURF + 56));
        if (r() > o.f(y)) continue;
        let cx = x, cy = y;
        for (let n = 0; n < o.size; n++) {
          const b = this.get(cx, cy);
          if (b === B.STONE) this.set(cx, cy, B[o.b]);
          else if (b === B.DEEP && B['D' + o.b]) this.set(cx, cy, B['D' + o.b]);
          else if (b === B.DEEP && o.b === 'COPPER') this.set(cx, cy, B.DIRON);
          cx += Math.floor(r() * 3) - 1; cy += Math.floor(r() * 3) - 1;
        }
      }
    }
    // fluids: lava fills caves below -54 (not right in the shaft), water pools on cave floors in the stone layer
    for (let x = -XR; x <= XR; x++) {
      for (let y = -59; y <= -55; y++) if (this.get(x, y) === B.AIR && Math.abs(x) > 1 && y < this.surfaceAt(x)) this.set(x, y, B.LAVA);
    }
    // water only settles in basins: a run of cave floor with solid walls at both ends (two levels deep)
    for (let y = 8; y < 46; y++) {
      let x = -XR + 1;
      while (x < XR) {
        const floor = xx => this.get(xx, y) === B.AIR && (isSolid(this.get(xx, y - 1)) || this.get(xx, y - 1) === B.WATER);
        if (!floor(x)) { x++; continue; }
        let e = x; while (e + 1 < XR && floor(e + 1)) e++;
        const bounded = isSolid(this.get(x - 1, y)) && isSolid(this.get(e + 1, y));
        const below = y === 8 || [...Array(e - x + 1)].every((_, k) => isSolid(this.get(x + k, y - 1)) || this.get(x + k, y - 1) === B.WATER);
        const isLevel2 = this.get(x, y - 1) === B.WATER;
        const wet = isLevel2 || fbm((x + e) * 0.08, y * 0.1, s + 55, 2) > 0.5;
        if (bounded && below && wet && e - x < 14 && !(x <= 0 && e >= 0 && !isLevel2 && hash2(x, y, s) < 0.5)) for (let k = x; k <= e; k++) this.set(k, y, B.WATER);
        x = e + 1;
      }
    }
    // the deep dark: sculk on cave floors and walls between -58 and -30, mostly on one side
    for (let x = -XR; x <= XR; x++) for (let y = -58; y < -28; y++) {
      const b = this.get(x, y); if (b !== B.DEEP) continue;
      const nearAir = this.get(x, y + 1) === B.AIR || this.get(x + 1, y) === B.AIR || this.get(x - 1, y) === B.AIR;
      if (nearAir && fbm(x * 0.1, y * 0.1, s + 91, 2) > 0.5) this.set(x, y, B.SCULK);
    }
    // surface: trees and a little cabin
    const trees = [-13, -21, 6, 12, 19, 27, -29, -36, 34];
    for (const tx of trees) {
      const x = tx + Math.floor(hash2(tx, 2, s) * 3) - 1; const top = this.surfaceAt(x); const h = 4 + Math.floor(hash2(x, 3, s) * 2);
      if (this.get(x, top) !== B.GRASS) continue;
      for (let y = top + 1; y <= top + h; y++) this.set(x, y, B.LOG);
      for (let dy = h - 1; dy <= h + 2; dy++) {
        const rad = dy >= h + 1 ? 1 : 2;
        for (let dx = -rad; dx <= rad; dx++) {
          if (Math.abs(dx) === rad && (dy === h - 1 || dy === h + 2) && hash2(x + dx, dy, s) < .6) continue;
          if (this.get(x + dx, top + dy) === B.AIR) this.set(x + dx, top + dy, B.LEAVES);
        }
      }
    }
    // cabin to the left of the shaft (x -9..-4), flattened ground
    const cx0 = -7, cx1 = -2, cy = SURF;
    for (let x = cx0 - 1; x <= cx1 + 1; x++) {
      for (let y = cy + 1; y <= cy + 9; y++) this.set(x, y, B.AIR);
      for (let y = YMIN; y <= cy; y++) if (y > cy - 3) this.set(x, y, y === cy ? B.GRASS : B.DIRT);
    }
    for (let x = cx0; x <= cx1; x++) for (let y = cy + 1; y <= cy + 4; y++) {
      const corner = x === cx0 || x === cx1;
      this.set(x, y, corner ? B.LOG : B.PLANKS);
      this.wallK[this.i(x, y)] = 4;
    }
    this.set(cx1 - 1, cy + 1, B.DOOR); this.set(cx1 - 1, cy + 2, B.DOOR);
    for (const [gx, gy] of [[cx0 + 1, cy + 2], [cx0 + 2, cy + 2], [cx0 + 1, cy + 3], [cx0 + 2, cy + 3]]) { this.set(gx, gy, B.GLASS); this.wallK[this.i(gx, gy)] = 0; } // see the sky through the window
    for (let k = 0; k < 3; k++) for (let x = cx0 - 1 + k; x <= cx1 + 1 - k; x++) this.set(x, cy + 5 + k, B.ROOF);
    // decorations on grass: tufts and flowers
    for (let x = -XR; x <= XR; x++) {
      const top = this.surfaceAt(x);
      if (this.get(x, top) !== B.GRASS || this.get(x, top + 1) !== B.AIR || Math.abs(x) <= 1) continue;
      const h = hash2(x, 4, s);
      if (h < 0.3) this.deco.push({ x, y: top + 1, k: 'tuft' });
      else if (h < 0.4) this.deco.push({ x, y: top + 1, k: 'flowerR' });
      else if (h < 0.48) this.deco.push({ x, y: top + 1, k: 'flowerY' });
    }
    // the shaft column starts solid right under the surface
    this.set(0, SURF, B.GRASS);
  }
  wallKind(x, y) {
    const k = this.wallK[this.i(Math.max(-XR, Math.min(XR, x)), Math.max(YMIN, Math.min(YMAX, y)))];
    return k === 1 ? 'dirt' : k === 2 ? 'stone' : k === 3 ? 'deep' : k === 4 ? 'planks' : null;
  }
}

// ---------- the miner sprite (drawn per frame at texel resolution) ----------
const SPR = 40;
function plotLine(g, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy; g.fillStyle = col;
  for (; ;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function drawMiner(g, st) {
  // origin: feet centre at (20, 36). st: {arm (rad), legs, bob, blink, armsUp, lamp}
  g.clearRect(0, 0, SPR, SPR);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const ox = 20, oy = 36 - Math.round(st.bob || 0);
  // legs
  const lg = st.legs || 0;
  R(ox - 4, oy - 7, 3, 6 - (lg > 0 ? 1 : 0), '#33507c'); R(ox + 1, oy - 7, 3, 6 - (lg < 0 ? 1 : 0), '#2b4569');
  R(ox - 5, oy - 2 - (lg > 0 ? 1 : 0), 4, 2, '#3b2a1d'); R(ox + 1, oy - 2 - (lg < 0 ? 1 : 0), 4, 2, '#30221a');
  // back arm (when arms up / falling)
  if (st.armsUp) { R(ox - 6, oy - 20, 2, 7, '#a8452a'); R(ox - 6, oy - 22, 2, 2, '#efbd96'); }
  // body: shirt + overall bib + straps + belt
  R(ox - 5, oy - 15, 10, 8, '#b8502f'); R(ox - 5, oy - 15, 10, 1, '#cf6a43');
  R(ox - 3, oy - 13, 6, 6, '#3a5a8a'); R(ox - 4, oy - 15, 1, 3, '#3a5a8a'); R(ox + 3, oy - 15, 1, 3, '#3a5a8a');
  R(ox - 2, oy - 12, 1, 1, '#d8c27a'); R(ox + 1, oy - 12, 1, 1, '#d8c27a');
  R(ox - 5, oy - 8, 10, 1, '#4a3322');
  // head
  R(ox - 4, oy - 22, 8, 7, '#efbd96'); R(ox - 4, oy - 16, 8, 1, '#d99e79');
  R(ox + 2, oy - 20, 1, st.blink ? 1 : 2, '#2b1d14'); R(ox - 1, oy - 20, 1, st.blink ? 1 : 2, '#2b1d14');
  R(ox + 3, oy - 18, 1, 1, '#d99e79'); // nose hint
  R(ox - 4, oy - 17, 7, 2, '#7a4a2a'); R(ox - 3, oy - 16, 5, 1, '#6a3e22'); // beard
  // helmet + lamp
  R(ox - 5, oy - 25, 10, 3, '#e6b13a'); R(ox - 4, oy - 26, 8, 1, '#f0c55a'); R(ox - 6, oy - 22, 12, 1, '#c9922a');
  R(ox + 3, oy - 25, 3, 3, '#5a5a5a'); R(ox + 4, oy - 24, 2, 1, st.lamp ? '#fff4c8' : '#c9c39a');
  // front arm + pickaxe, rotating around the shoulder
  const sx = ox + 1, sy = oy - 14, a = st.arm ?? 0.4;
  const hx = sx + Math.cos(a) * 6, hy = sy + Math.sin(a) * 6;
  plotLine(g, sx, sy, hx, hy, '#a8452a'); plotLine(g, sx + 1, sy, hx + 1, hy, '#b8502f');
  R(Math.round(hx), Math.round(hy), 2, 2, '#efbd96');
  // handle extends from the hand along a = arm angle - 90deg (held across)
  const ha = a - Math.PI / 2 * 0.9;
  const ex = hx + Math.cos(ha) * 11, ey = hy + Math.sin(ha) * 11;
  const bx = hx - Math.cos(ha) * 2, by = hy - Math.sin(ha) * 2;
  plotLine(g, bx, by, ex, ey, '#7a5230');
  // head of the pick: a curved bar perpendicular to the handle at its end
  const px = Math.cos(ha + Math.PI / 2), py = Math.sin(ha + Math.PI / 2);
  for (let k = -5; k <= 5; k++) {
    const bend = (k * k) / 12;
    const qx = ex + px * k - Math.cos(ha) * bend, qy = ey + py * k - Math.sin(ha) * bend;
    g.fillStyle = Math.abs(k) >= 4 ? '#5d666e' : '#a7b0b8'; g.fillRect(Math.round(qx), Math.round(qy), 1, 1);
    if (Math.abs(k) < 4) { g.fillStyle = '#c9d0d6'; g.fillRect(Math.round(qx - Math.cos(ha)), Math.round(qy - Math.sin(ha)), 1, 1); }
  }
  if (st.armsUp) { R(ox + 4, oy - 21, 2, 7, '#b8502f'); }
}

// ---------- the renderer ----------
export class MineView {
  constructor(canvas, world) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.tiles = makeTiles(); this.world = world;
    this.spr = document.createElement('canvas'); this.spr.width = this.spr.height = SPR; this.sg = this.spr.getContext('2d');
    this.light = document.createElement('canvas'); this.lg = this.light.getContext('2d');
    this.items = {}; for (let t = 1; t <= 5; t++) this.items[t] = drawItem(t);
    this.parts = []; this.floaters = []; this.shake = 0; this.time = 0;
    this.cam = { x: 0, y: SURF + 2 }; this.camT = { x: 0, y: SURF + 2 };
    this.focusX = 0.3; this.focusY = 0.42; // where the shaft sits on screen
    this.miner = { x: 0, y: SURF + 1, vy: 0, state: 'idle', t: 0, swing: 0, squash: 0, facing: 1, blink: 0, celebrate: 0 };
    this.crack = null; // {x,y,stage}
    this.clouds = Array.from({ length: 7 }, (_, i) => ({ x: -40 + i * 13 + Math.random() * 6, y: SURF + 14 + Math.random() * 9, w: 4 + Math.floor(Math.random() * 4), s: 0.15 + Math.random() * 0.2 }));
    this.placed = new Set();
    this.resize();
  }
  setWorld(w) { this.world = w; this.placed = new Set(); }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(this.cv.clientWidth * dpr), h = Math.round(this.cv.clientHeight * dpr);
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    this.dpr = dpr;
    // integer texel size so the pixel art stays crisp: about 9.5 blocks top to bottom on a sideways phone,
    // and at least 8 blocks across on an upright one (where the card covers the lower half)
    this.tx = Math.max(2, Math.round(Math.min(h / (T * 9.5), w / (T * (w > 600 * dpr ? 11 : 8)))));
    this.bs = this.tx * T;
    this.light.width = Math.ceil(w / 4); this.light.height = Math.ceil(h / 4);
  }
  // world -> screen
  sx(x) { return Math.round(this.cv.width * this.focusX + (x - this.cam.x) * this.bs); }
  sy(y) { return Math.round(this.cv.height * this.focusY - (y - this.cam.y) * this.bs); }
  screenOf(x, y) { return { x: this.sx(x) / this.dpr, y: this.sy(y) / this.dpr }; }

  burst(x, y, kind, n = 10, power = 1) {
    const cols = kind === 'dirt' ? ['#8a5a3a', '#6d432a', '#a37150', '#5f9e35'] : kind === 'deep' ? ['#4a4a53', '#3f3f48', '#55555f'] :
      kind === 'bedrock' ? ['#3a3a3a', '#1e1e1e', '#6b6b6b'] : kind === 'water' ? ['#6f9fd8', '#3f74bd', '#d8ecff'] :
      kind === 'planks' ? ['#ad8552', '#7a5631'] : ['#7e7e7b', '#6d6d6a', '#9a9a95'];
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + 0.2 + Math.random() * 0.6, y: y + 0.5 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 7 * power, vy: (2 + Math.random() * 5) * power, life: 0.5 + Math.random() * 0.5, t: 0,
        c: cols[Math.floor(Math.random() * cols.length)], s: Math.random() < .3 ? 2 : 1, g: 22,
      });
    }
  }
  sparkle(x, y, tier) {
    const cols = { 1: ['#d9d9d4', '#ffffff'], 2: ['#8a8a8a', '#e0e0e0'], 3: ['#efd2bd', '#ffffff'], 4: ['#fff0a0', '#ffd75a', '#ffffff'], 5: ['#d8fffb', '#4fd0c6', '#ffffff'] }[tier];
    const n = 6 + tier * 5;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4 * (0.6 + tier * 0.15);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 2, life: 0.6 + Math.random() * 0.6, t: 0, c: cols[i % cols.length], s: 1, g: 3, star: Math.random() < .35 });
    }
  }
  popItem(tier, x, y) { this.floaters.push({ tier, x: x + 0.5, y: y + 0.6, vy: 6, t: 0, hold: 0 }); }

  update(dt) {
    this.time += dt;
    const m = this.miner;
    m.t += dt; m.blink = (m.t % 3.3) < 0.12;
    m.squash = Math.max(0, m.squash - dt * 4);
    m.celebrate = Math.max(0, m.celebrate - dt);
    if (m.state === 'fall') {
      m.vy -= 40 * dt; m.y += m.vy * dt;
      if (m.y <= m.floorY) { m.y = m.floorY; m.vy = 0; m.state = 'idle'; m.squash = 1; if (this.onLand) this.onLand(); }
    }
    m.swing = Math.max(0, m.swing - dt);
    // camera: follow the miner smoothly, a little lower so you can see where you are digging
    this.camT.y = m.y - 0.6;
    const k = 1 - Math.pow(0.0015, dt);
    this.cam.y += (this.camT.y - this.cam.y) * k; this.cam.x += (this.camT.x - this.cam.x) * k;
    this.shake = Math.max(0, this.shake - dt * 3);
    for (const p of this.parts) { p.t += dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; }
    this.parts = this.parts.filter(p => p.t < p.life);
    for (const f of this.floaters) { f.t += dt; if (f.t < 0.45) { f.vy -= 16 * dt; f.y += f.vy * dt; } }
    for (const c of this.clouds) { c.x += c.s * dt; if (c.x > XR) c.x = -XR - 8; }
  }

  draw() {
    const g = this.g, W = this.cv.width, H = this.cv.height, bs = this.bs, w = this.world;
    g.imageSmoothingEnabled = false;
    const sh = this.shake > 0 ? this.shake * this.tx * 3 : 0;
    const shx = sh ? Math.round((Math.random() - 0.5) * sh) : 0, shy = sh ? Math.round((Math.random() - 0.5) * sh) : 0;
    g.save(); g.translate(shx, shy);
    // sky
    const skyTop = this.sy(SURF + 26), skyBot = this.sy(SURF);
    const sky = g.createLinearGradient(0, skyTop, 0, skyBot);
    sky.addColorStop(0, '#79b7dc'); sky.addColorStop(0.75, '#bfe0ec'); sky.addColorStop(1, '#e3efe6');
    g.fillStyle = sky; g.fillRect(-10, -10, W + 20, H + 20);
    // sun
    const sunX = this.sx(-9), sunY = this.sy(SURF + 15);
    g.fillStyle = '#fff1b8'; g.fillRect(sunX - bs * .9, sunY - bs * .9, bs * 1.8, bs * 1.8);
    g.fillStyle = '#ffe58a'; g.fillRect(sunX - bs * .7, sunY - bs * .7, bs * 1.4, bs * 1.4);
    // far hills (parallax)
    for (const [col, par, amp, base, sd] of [['#9cc3b5', 0.35, 4, 3, 11], ['#7fae8f', 0.6, 3, 1.4, 23]]) {
      g.fillStyle = col;
      const step = this.tx * 4;
      for (let x = -step; x < W + step; x += step) {
        const wx = (x - W * this.focusX) / bs * par + this.cam.x * par;
        const hgt = SURF + base + fbm(wx * 0.08, 1, sd, 2) * amp;
        const yy = this.sy(hgt);
        g.fillRect(x, yy, step + 1, skyBot - yy + 2);
      }
    }
    // clouds
    g.fillStyle = 'rgba(255,255,255,.92)';
    for (const c of this.clouds) {
      const x0 = this.sx(c.x), y0 = this.sy(c.y);
      g.fillRect(x0, y0, c.w * bs * .6, bs * .5); g.fillRect(x0 + bs * .4, y0 - bs * .3, c.w * bs * .35, bs * .4);
    }
    // visible cell range
    const x0 = Math.floor(this.cam.x - (W * this.focusX) / bs) - 1, x1 = Math.ceil(this.cam.x + (W * (1 - this.focusX)) / bs) + 1;
    const yTop = Math.ceil(this.cam.y + (H * this.focusY) / bs) + 1, yBot = Math.floor(this.cam.y - (H * (1 - this.focusY)) / bs) - 1;
    const frame = Math.floor(this.time * 3) % 4;
    for (let y = yBot; y <= yTop; y++) {
      for (let x = x0; x <= x1; x++) {
        const b = w.get(x, y); const px = this.sx(x), py = this.sy(y + 1);
        const v = Math.floor(hash2(x, y, 5) * 4);
        if (b === B.AIR || b === B.WATER || b === B.LAVA || b === B.LEAVES || b === B.GLASS) {
          const wk = w.wallKind(x, y);
          if (wk) g.drawImage(this.tiles.wall[wk][v], px, py, bs, bs);
        }
        if (b === B.AIR) continue;
        if (b === B.WATER) { g.drawImage(this.tiles.water[(frame + (x & 1)) % 4], px, py, bs, bs); continue; }
        if (b === B.LAVA) { g.drawImage(this.tiles.lava[(frame + (x & 3)) % 4], px, py, bs, bs); continue; }
        g.drawImage(this.tiles[b][v], px, py, bs, bs);
        // contact shading where a solid block meets open air (reads as depth, no outlines)
        if (isSolid(b) && y < SURF + 1 - 0) {
          g.fillStyle = 'rgba(0,0,0,.28)';
          if (!isSolid(w.get(x, y + 1)) && w.wallKind(x, y + 1)) g.fillRect(px, py, bs, this.tx);
          if (!isSolid(w.get(x - 1, y)) && w.wallKind(x - 1, y)) g.fillRect(px, py, this.tx, bs);
          if (!isSolid(w.get(x + 1, y)) && w.wallKind(x + 1, y)) g.fillRect(px + bs - this.tx, py, this.tx, bs);
          g.fillStyle = 'rgba(255,255,255,.10)';
          if (!isSolid(w.get(x, y - 1)) && w.wallKind(x, y - 1)) g.fillRect(px, py + bs - this.tx, bs, this.tx);
        }
      }
    }
    // decorations on the grass
    for (const d of w.deco) {
      if (d.x < x0 || d.x > x1) continue;
      const px = this.sx(d.x), py = this.sy(d.y), t = this.tx;
      if (d.k === 'tuft') { g.fillStyle = '#5f9e35'; g.fillRect(px + 4 * t, py - 4 * t, t, 4 * t); g.fillRect(px + 7 * t, py - 6 * t, t, 6 * t); g.fillRect(px + 10 * t, py - 3 * t, t, 3 * t); g.fillStyle = '#78b346'; g.fillRect(px + 8 * t, py - 5 * t, t, 4 * t); }
      else { g.fillStyle = '#4a7d27'; g.fillRect(px + 7 * t, py - 6 * t, t, 6 * t); g.fillStyle = d.k === 'flowerR' ? '#d8433b' : '#f0c43a'; g.fillRect(px + 6 * t, py - 8 * t, 3 * t, 2 * t); g.fillRect(px + 7 * t, py - 9 * t, t, 4 * t); g.fillStyle = '#fff3c8'; g.fillRect(px + 7 * t, py - 8 * t, t, t); }
    }
    // milestone tags (to the left of the shaft)
    // crack overlay on the block being dug
    if (this.crack) {
      const c = this.crack, px = this.sx(c.x), py = this.sy(c.y + 1), t = this.tx;
      g.fillStyle = 'rgba(20,14,10,.75)';
      const lines = [[7, 7, 3, 2], [8, 8, 12, 4], [7, 9, 4, 13], [9, 8, 13, 12], [6, 7, 1, 8], [9, 9, 9, 15], [7, 6, 9, 1]];
      for (let i = 0; i < Math.min(lines.length, 1 + c.stage * 2); i++) {
        const [a, b, cc, d] = lines[i]; const n = Math.max(Math.abs(cc - a), Math.abs(d - b));
        for (let s = 0; s <= n; s++) g.fillRect(px + Math.round(a + (cc - a) * s / n) * t, py + Math.round(b + (d - b) * s / n) * t, t, t);
      }
    }
    // the miner
    const m = this.miner;
    let arm = 0.5, legs = 0, bob = Math.sin(m.t * 2.2) * 0.6, armsUp = false;
    if (m.swing > 0) { const p = 1 - m.swing / m.swingDur; arm = p < 0.55 ? -2.4 + p / 0.55 * 0.3 : -2.1 + (p - 0.55) / 0.45 * 3.4; bob = p > 0.6 ? -1 : 0; }
    else if (m.state === 'fall') { armsUp = true; arm = -2.2; legs = Math.sin(m.t * 30) > 0 ? 1 : -1; bob = 0; }
    else if (m.celebrate > 0) { arm = -2.0 + Math.sin(m.t * 12) * 0.3; bob = Math.abs(Math.sin(m.t * 8)) * 4; legs = Math.sin(m.t * 16) > 0 ? 1 : -1; }
    else if (m.place > 0) { arm = 0.9; }
    drawMiner(this.sg, { arm, legs, bob, blink: m.blink, armsUp, lamp: m.y < SURF - 2 });
    const sqx = 1 + m.squash * 0.18, sqy = 1 - m.squash * 0.15;
    const mw = SPR * this.tx * sqx, mh = SPR * this.tx * sqy;
    const mx = this.sx(m.x + 0.5) - mw / 2, my = this.sy(m.y) - mh + (4 * this.tx) * sqy;
    if (m.y < SURF - 1) { // warm pool of helmet-lamp light on the floor
      const cx = this.sx(m.x + 0.5), cy = this.sy(m.y), rx = this.bs * 1.4, ry = this.bs * 0.32;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
      rg.addColorStop(0, 'rgba(255,214,140,.38)'); rg.addColorStop(1, 'rgba(255,214,140,0)');
      g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.translate(-cx, -cy); g.fillStyle = rg; g.fillRect(cx - rx, cy - rx, rx * 2, rx * 2); g.restore();
    }
    g.drawImage(this.spr, mx, my, mw, mh);
    // particles
    for (const p of this.parts) {
      const a = 1 - p.t / p.life; g.globalAlpha = Math.min(1, a * 1.6); g.fillStyle = p.c;
      const s = p.s * this.tx * (p.star ? 1 : 1.5), px = this.sx(p.x), py = this.sy(p.y);
      if (p.star) { g.fillRect(px - s, py, s * 3, s); g.fillRect(px, py - s, s, s * 3); } else g.fillRect(px, py, s, s);
    }
    g.globalAlpha = 1;
    // darkness that grows with depth, with the helmet lamp and lava lighting holes in it
    this.drawLight(yTop, yBot, x0, x1);
    // a card between the depth ruler and the shaft: a dark "Y" chip, then the fact wrapped to fit
    const d = this.dpr * (this.uiScale || 1), xr = this.sx(0) - this.tx * 3, xlMin = ((this.safeLeft || 0) + 30) * this.dpr;
    const maxW = Math.min(230 * d, xr - xlMin - 16 * d);
    let prevBottom = -1e9;
    if (maxW > 70 * d) for (const ms of MILESTONES) {
      if (ms.y > yTop + 1 || ms.y < yBot - 2) continue;
      g.font = `700 ${Math.round(12 * d)}px Rubik, system-ui, sans-serif`; g.textBaseline = 'middle'; g.direction = 'rtl'; g.textAlign = 'right';
      const lines = []; let cur = '';
      for (const w of ms.t.split(' ')) { const tryL = cur ? cur + ' ' + w : w; if (g.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL; }
      if (cur) lines.push(cur);
      const tw = Math.max(...lines.map(l => g.measureText(l).width)) + 16 * d;
      const lh = 15 * d, hh = 20 * d + lines.length * lh + 4 * d;
      const yLine = this.sy(ms.y + 1), xl = Math.max(xlMin, xr - tw), top = Math.max(yLine - 10 * d, prevBottom + 5 * d);
      prevBottom = top + hh;
      if (top < ((this.gaugeTop || 0) - 4) * this.dpr) continue; // keep clear of the status row
      if (this.gaugeBottom && top + 26 * d > this.gaugeBottom * this.dpr) continue; // would only peek out above the card
      // a thin marker line at the exact height, running into the shaft
      g.fillStyle = 'rgba(255,244,220,.75)';
      for (let x = xr; x < this.sx(1); x += 8 * d) g.fillRect(x, yLine - d, 4 * d, 2 * d);
      g.fillStyle = 'rgba(58,38,21,.45)'; g.fillRect(xl + 2 * d, top + 3 * d, xr - xl, hh);
      g.fillStyle = 'rgba(247,236,214,.95)'; g.fillRect(xl, top, xr - xl, hh);
      const ytxt = 'Y ' + (ms.y < 0 ? '‎' + ms.y : ms.y);
      g.font = `800 ${Math.round(11 * d)}px Rubik, system-ui, sans-serif`;
      const yw = g.measureText(ytxt).width + 12 * d;
      g.fillStyle = '#3a2615'; g.fillRect(xr - yw - 4 * d, top + 4 * d, yw, 16 * d);
      g.fillStyle = '#ffe3a3'; g.textAlign = 'center'; g.fillText(ytxt, xr - 4 * d - yw / 2, top + 12.5 * d);
      g.font = `700 ${Math.round(12 * d)}px Rubik, system-ui, sans-serif`; g.textAlign = 'right'; g.fillStyle = '#3a2615';
      lines.forEach((l, i) => g.fillText(l, xr - 8 * d, top + 22 * d + lh * (i + 0.5)));
    }
    // floating ore items (drawn after the light so they read clearly)
    for (const f of this.floaters) {
      if (f.gone) continue;
      const s = bs * 0.9, px = this.sx(f.x) - s / 2, py = this.sy(f.y) - s / 2 + Math.sin(f.t * 6) * this.tx;
      g.drawImage(this.items[f.tier], px, py, s, s);
    }
    g.restore();
    this.drawGauge();
  }

  drawLight(yTop, yBot, x0, x1) {
    const L = this.lg, lw = this.light.width, lh = this.light.height, k = 0.25;
    L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, lw, lh);
    const dark = y => y > SURF - 1 ? 0 : Math.min(0.84, 0.12 + (SURF - 1 - y) / 64 * 0.42 + (y < 0 ? 0.1 : 0) + (y < -30 ? 0.1 : 0));
    const gr = L.createLinearGradient(0, this.sy(SURF) * k, 0, this.sy(SURF - 80) * k);
    for (let i = 0; i <= 8; i++) { const y = SURF - i * 10; gr.addColorStop(i / 8, `rgba(8,6,12,${dark(y)})`); }
    L.fillStyle = gr; L.fillRect(0, 0, lw, lh);
    L.globalCompositeOperation = 'destination-out';
    const hole = (wx, wy, r, a) => {
      const cx = this.sx(wx) * k, cy = this.sy(wy) * k, rr = r * this.bs * k;
      const rg = L.createRadialGradient(cx, cy, 0, cx, cy, rr);
      rg.addColorStop(0, `rgba(0,0,0,${a})`); rg.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = rg; L.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    };
    const m = this.miner;
    hole(m.x + 0.5 + 0.4, m.y + 1.2, 6.5, 1);
    for (let y = Math.max(yBot, -60); y <= Math.min(yTop, -50); y++) for (let x = x0; x <= x1; x++) if (this.world.get(x, y) === B.LAVA && (x + y) % 2 === 0) hole(x + 0.5, y + 0.5, 2.6, 0.55);
    for (const f of this.floaters) if (!f.gone) hole(f.x, f.y, 1.4, 0.8);
    this.g.imageSmoothingEnabled = true;
    this.g.drawImage(this.light, 0, 0, lw / k, lh / k);
    this.g.imageSmoothingEnabled = false;
  }

  // slim depth ruler on the left edge
  drawGauge() {
    const g = this.g, d = this.dpr, H = this.cv.height;
    const top = (this.gaugeTop || 56) * d, bot = (this.gaugeBottom ? this.gaugeBottom * d : H - 14 * d), x = 9 * d + (this.safeLeft || 0) * d, w = 8 * d;
    const yTo = y => top + (SURF - y) / (SURF + 64) * (bot - top);
    const bands = [[64, 60, '#6aa83e'], [60, 50, '#8a5a3a'], [50, 0, '#7e7e7b'], [0, -30, '#4f4f59'], [-30, -54, '#1f3a42'], [-54, -60, '#d8581c'], [-60, -64, '#2a2a2a']];
    g.fillStyle = 'rgba(43,28,14,.55)'; g.fillRect(x - 2 * d, top - 2 * d, w + 4 * d, bot - top + 4 * d);
    for (const [a, b, c] of bands) { g.fillStyle = c; g.fillRect(x, yTo(a), w, yTo(b) - yTo(a)); }
    const my = yTo(Math.max(-64, Math.min(64, this.miner.y - 1)));
    g.fillStyle = '#fff4dc'; g.fillRect(x - 4 * d, my - 2 * d, w + 8 * d, 4 * d);
    g.fillStyle = '#e6b13a'; g.fillRect(x + w + 4 * d, my - 4 * d, 6 * d, 8 * d);
  }
}
