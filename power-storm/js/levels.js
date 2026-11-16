// Level data. Units: metres. x = right, y = up, gameplay plane z = 0.
// Hero: run 6.6 m/s, jump apex ~2.4 m, running jump ~5 m. Flight: ~2.5 s of rise/hover, ~18 m across.
// Wide canal stretches (>= 26 m) are past flight range on purpose: they need the ice beam.

const P = []; // builder scratch
const G = (x0, x1, y = 0, kit) => P.push({ t: 'ground', x0, x1, y, kit });
const W = (x0, x1) => P.push({ t: 'water', x0, x1 });
const plat = (k, x, y) => P.push({ t: 'plat', k, x, y });
const crate = (x, y = 0) => P.push({ t: 'crate', x, y });
const barrel = (x, y = 0) => P.push({ t: 'barrel', x, y });
const E = (t, x, y, o = {}) => P.push({ t, x, y, ...o });
const coin = (x, y) => P.push({ t: 'coin', x, y });
const coinRow = (x0, y, n, dx = 1.1) => { for (let i = 0; i < n; i++) coin(x0 + i * dx, y); };
const coinArc = (x0, y, n, w, h) => { for (let i = 0; i < n; i++) { const u = n === 1 ? .5 : i / (n - 1); coin(x0 + u * w, y + Math.sin(u * Math.PI) * h); } };
const heart = (x, y) => P.push({ t: 'heart', x, y });
const check = (x, y = 0) => P.push({ t: 'check', x, y });
const exit = (x, y = 0) => P.push({ t: 'exit', x, y });
const hint = (x, key, opts = {}) => P.push({ t: 'hint', x, key, ...opts });
const deco = (m, x, z, o = {}) => P.push({ t: 'deco', m, x, z, ...o });
const take = () => P.splice(0, P.length);

// ---------------------------------------------------------------- 1. town streets (earn FIRE)
G(-16, 40); G(44, 96); G(96, 136); G(140, 200);
hint(-11, 'move'); crate(3); coinRow(5.5, 2.2, 4); hint(-3, 'jump', { to: 4 });
hint(8, 'punch'); E('bot', 15, 0, { range: [10, 19] });
crate(21); crate(21.85); crate(21.42, .8); coinArc(19.6, 2.4, 5, 4.2, 1.2);
E('bot', 28, 0, { range: [25, 33] }); E('bot', 34, 0, { range: [31, 38] });
hint(36, 'gap'); coinArc(39.2, 1.6, 5, 5.6, 1.6);
plat('awning', 52, 2.0); plat('wood', 57.5, 2.9); coinRow(56.4, 3.9, 3); heart(58.6, 4.0); hint(47, 'awning');
E('drone', 64, 3.6, { range: [60, 70] });
check(68);
E('bot', 75, 0, { range: [71, 79] }); E('bot', 81, 0, { range: [78, 85] }); coinRow(72, 1.2, 3);
barrel(86.5); coin(86.5, 1.9);
E('crystal', 90, 1.25, { p: 'fire' });
E('barricade', 94.4, 0); coinRow(97.5, 1.2, 4);
E('drone', 104, 3.3, { range: [100, 108] }); E('bot', 110, 0, { range: [106, 114] }); E('drone', 116, 4.0, { range: [112, 121] });
plat('stone', 124, 2.3); coinRow(123.2, 3.3, 3); E('bot', 129, 0, { range: [125, 134] });
coinArc(135.4, 1.8, 5, 5.2, 1.6);
check(144); E('barricade', 151, 0); coinRow(153.5, 1.2, 4);
hint(157, 'charge'); E('brute', 165, 0, { range: [160, 170] });
E('bot', 172, 0, { range: [170, 176] }); E('bot', 177, 0, { range: [175, 181] });
plat('stone', 182, 2.4); coinRow(181.2, 3.4, 3); heart(185, 1.3);
exit(193);
deco('lamp', 6, -1.6); deco('bench', 10, -2.2); deco('tree', 18, -3.0); deco('lamp', 30, -1.6); deco('flowerpot', 47.5, -1.8);
deco('market_stall', 62, -2.4); deco('lamp', 72, -1.6); deco('well', 84, -2.4); deco('tree', 100, -3.2); deco('bench', 112, -2.2);
deco('lamp', 120, -1.6); deco('fence', 128, -2.6); deco('flowerpot', 146, -1.8); deco('tree', 158, -3.0); deco('lamp', 168, -1.6);
deco('market_stall', 178, -2.4); deco('lamp', 190, -1.6); deco('barrel', 26, -1.9); deco('crate', 33, -2.0);
const L1 = take();

// ---------------------------------------------------------------- 2. rooftops (earn FLIGHT)
G(-12, 20, 0, 'roof'); G(23, 47, 1, 'roof'); G(60, 84, 2, 'roof'); G(90, 114, 0, 'roof'); G(128, 160, 1, 'roof'); G(166, 192, 0, 'roof');
hint(-8, 'roofs'); coinRow(2, 1.3, 4); E('bot', 12, 0, { range: [7, 18] });
coinArc(19.5, 1.8, 4, 5, 1.6);
E('bot', 31, 1, { range: [27, 36] }); E('drone', 38, 4.6, { range: [34, 44] });
E('crystal', 44, 2.25, { p: 'wind' });
hint(49, 'flygap'); coinArc(49, 4.2, 7, 10, 2.2); E('drone', 54, 5.4, { range: [51, 58] });
E('drone', 68, 6, { range: [63, 74] }); coinRow(64, 3.3, 3);
E('crackwall', 77, 2); coinRow(80, 3.2, 3); hint(72, 'smashwall');
coinArc(84.5, 3.6, 5, 5.2, 1.8);
check(93); E('bot', 97, 0, { range: [94, 101] }); E('bot', 104, 0, { range: [101, 108] }); E('brute', 110, 0, { range: [106, 113] });
plat('wood', 121, 1.0); heart(121, 3.2); E('drone', 117.5, 4.2, { range: [115, 120] }); E('drone', 125, 4.8, { range: [122, 127] }); coinArc(115, 3.5, 6, 12, 1.6);
check(131, 1); E('barricade', 136, 1); coinRow(139, 2.3, 4);
E('bot', 143, 1, { range: [140, 147] }); E('bot', 149, 1, { range: [146, 153] }); E('drone', 154, 5.4, { range: [150, 158] });
coinArc(159.5, 3, 4, 6.5, 1.4);
check(169); E('brute', 178, 0, { range: [174, 182] }); coinRow(180, 1.3, 3);
exit(187);
deco('chimney', -4, -2.6); deco('water_tower', 9, -3.6); deco('antenna', 16, -2.4); deco('chimney', 30, -2.4, { y: 1 }); deco('clothesline', 40, -3.0, { y: 1 });
deco('chimney', 66, -2.6, { y: 2 }); deco('antenna', 80, -2.2, { y: 2 }); deco('water_tower', 98, -3.6); deco('clothesline', 108, -3.0);
deco('chimney', 134, -2.6, { y: 1 }); deco('water_tower', 146, -3.6, { y: 1 }); deco('antenna', 156, -2.2, { y: 1 }); deco('chimney', 172, -2.6); deco('clothesline', 184, -3.0);
const L2 = take();

// ---------------------------------------------------------------- 3. canal (earn ICE)
G(-16, 24, 0, 'quay'); W(24, 32); G(32, 48, 0, 'quay'); W(48, 76); G(76, 104, 0, 'quay'); W(104, 136); G(136, 152, 0, 'quay');
P.push({ t: 'bridge', x0: 152, x1: 160 }); W(152, 160); G(160, 176, 0, 'quay'); W(176, 184); G(184, 208, 0, 'quay');
hint(-10, 'canal'); E('bot', 10, 0, { range: [5, 16] }); coinRow(2, 1.2, 4); coinArc(23.5, 2.4, 5, 9, 2);
E('crystal', 40, 1.25, { p: 'ice' }); E('bot', 46, 0, { range: [44, 47.5] });
hint(45, 'freezewater'); coinRow(52, 1.2, 6, 3.6); coinRow(62, 3.4, 3);
check(80); hint(81, 'freezebot'); E('bot', 86, 0, { range: [82, 90] }); E('bot', 93, 0, { range: [90, 97] });
plat('stone', 92, 3.6); coinRow(91, 4.6, 3); E('brute', 100, 0, { range: [97, 103] });
coinRow(106, 1.2, 8, 3.8); E('drone', 113, 3.2, { range: [108, 118] }); E('drone', 127, 3.8, { range: [122, 132] }); heart(120, 2.6);
check(139); E('bot', 146, 0, { range: [141, 150] }); coinArc(151.5, 2.4, 5, 9, 1.2);
E('bot', 166, 0, { range: [162, 170] }); E('drone', 171, 4, { range: [166, 175] }); coinArc(175.5, 2.6, 4, 9, 1.6);
E('brute', 194, 0, { range: [189, 198] }); exit(203);
deco('mooring_post', 6, -1.7); deco('boat', 28, 2.6, { y: -1.25 }); deco('mooring_post', 46, -1.7); deco('boat', 62, -2.6, { y: -1.25, ry: .4 });
deco('mooring_post', 88, -1.7); deco('boat', 118, 2.8, { y: -1.25, ry: -.3 }); deco('mooring_post', 142, -1.7); deco('boat', 180, -2.4, { y: -1.25 });
deco('lamp', 0, -1.4); deco('lamp', 40, -1.4); deco('lamp', 96, -1.4); deco('lamp', 168, -1.4); deco('barrel', 84, -1.6); deco('crate', 192, -1.8);
const L3 = take();

// ---------------------------------------------------------------- 4. clock factory (earn LIGHTNING)
G(-16, 40, 0, 'factory'); G(40, 64, 0, 'factory'); G(64, 80, 0, 'factory'); G(80, 104, 6, 'factory'); G(104, 136, 0, 'factory'); G(136, 180, 0, 'factory');
hint(-10, 'factory'); E('bot', 6, 0, { range: [2, 11] }); coinRow(0, 1.2, 4);
E('crystal', 22, 1.25, { p: 'bolt' }); E('gen', 31, 0, { id: 'g1' }); E('gate', 37.5, 0, { link: 'g1' }); hint(28, 'boltgen');
coinRow(41, 1.2, 3); P.push({ t: 'conveyor', x: 46, dir: 1 }); P.push({ t: 'conveyor', x: 50, dir: 1 }); E('vent', 56.5, 0); hint(53, 'vent');
E('bot', 52, 0, { range: [49, 55] }); E('bot', 60, 0, { range: [58, 63] });
E('gen', 66.5, 0, { id: 'g2' }); P.push({ t: 'lift', x: 77.4, y0: 0, y1: 6.02, link: 'g2' }); hint(65, 'lift');
check(82, 6); E('drone', 88, 9.6, { range: [84, 92] }); E('bot', 92, 6, { range: [88, 96] }); E('brute', 100, 6, { range: [96, 103] }); coinRow(84, 7.3, 4);
coinArc(103.5, 4.5, 4, 3, 1.2);
E('gen', 110, 0, { id: 'g3' }); E('gate', 118, 0, { link: 'g3' }); E('bot', 112.5, 0, { range: [111, 116] });
E('vent', 123, 0); P.push({ t: 'conveyor', x: 128, dir: -1 }); E('bot', 126, 0, { range: [124, 131] }); E('bot', 133, 0, { range: [131, 135] });
plat('metal', 129, 3.4); coinRow(128, 4.4, 3); heart(130, 4.6);
check(139); E('crackwall', 144, 0); E('drone', 149, 4.2, { range: [146, 153] }); E('drone', 156, 4.8, { range: [153, 160] }); coinRow(146, 1.2, 4);
E('brute', 163, 0, { range: [159, 167] }); E('bot', 169, 0, { range: [167, 172] }); E('barricade', 172.5, 0); exit(176);
deco('pipe_run', 12, -2.4); deco('steam_vent', 18, -1.8); deco('pipe_run', 58, -2.4); deco('pipe_run', 112, -2.4); deco('steam_vent', 150, -1.8); deco('pipe_run', 160, -2.4);
deco('barrel', 2, -1.6); deco('crate', 44, -1.8); deco('barrel', 140, -1.6);
const L4 = take();

// ---------------------------------------------------------------- 6. the prize level (unlocks after the boss) - impossible by design:
// the golden gear always stays >= 6.5 m ahead of the hero (faster than run or flight), and after x=200 the road ends in an
// endless chasm where flight energy runs out. A hard gauntlet first so it feels like a real level.
G(-16, 40); G(44.5, 72); G(76.5, 104); G(108.5, 136); G(140.5, 168); G(172.5, 200);
hint(-10, 'prize'); E('prize', -5.5, 1.2);
E('bot', 14, 0, { range: [9, 19] }); E('brute', 31, 0, { range: [27, 36] }); crate(38.6); coinRow(41, 2.2, 3);
E('drone', 52, 4.2, { range: [47, 57] }); E('drone', 60, 5, { range: [56, 66] }); E('brute', 66, 0, { range: [62, 70] });
coinArc(71.5, 2, 4, 5, 1.6); E('bot', 84, 0, { range: [79, 88] }); E('bot', 91, 0, { range: [88, 95] }); E('drone', 97, 4.4, { range: [93, 102] });
E('brute', 101, 0, { range: [98, 103] }); check(111); heart(112, 1.3);
E('drone', 119, 4.6, { range: [114, 124] }); E('drone', 127, 3.8, { range: [123, 132] }); E('brute', 131, 0, { range: [127, 135] });
coinArc(135.5, 2.2, 4, 5, 1.6); E('bot', 147, 0, { range: [143, 151] }); E('bot', 153, 0, { range: [150, 157] }); E('brute', 161, 0, { range: [157, 166] });
E('drone', 167, 4.8, { range: [163, 171] }); check(175); E('bot', 186, 0, { range: [181, 190] }); E('drone', 193, 4.4, { range: [188, 198] });
P.push({ t: 'gearrain', x: 40 });
deco('lamp', 6, -1.6); deco('tree', 20, -3.0); deco('lamp', 56, -1.6); deco('market_stall', 88, -2.4); deco('lamp', 120, -1.6); deco('well', 150, -2.4); deco('lamp', 184, -1.6); deco('tree', 196, -3.0);
const L6 = take();

// ---------------------------------------------------------------- 5. boss: top of the clock tower
G(-13, 13, 0, 'tower');
const L5 = take();

export const POWERS = {
  fire: { name: 'כדור אש', icon: 'iFire', col: ['#ffc06a', '#e0652a', '#9a2d10'], how: ['לחצו על כפתור <b>האש</b> כדי לזרוק כדור אש.', 'אש <b>שורפת מחסומי עץ</b> ומפילה רחפנים במכה אחת.'], keys: 'K / X' },
  wind: { name: 'תעופה', icon: 'iWing', col: ['#f4f8f2', '#a9c9c2', '#4d7c74'], how: ['באוויר, <b>החזיקו את כפתור הקפיצה</b> כדי לעוף.', 'התעופה צורכת אנרגיה. היא מתמלאת כשנוחתים.'], keys: 'רווח (להחזיק)' },
  ice: { name: 'קרן קרח', icon: 'iIce', col: ['#e4f3fa', '#8dbfd8', '#3f7a99'], how: ['<b>החזיקו את כפתור הקרח</b>: קרן שמקפיאה רובוטים.', 'ליד מים הקרן <b>מקפיאה את התעלה</b> ואפשר ללכת עליה. על רובוט קפוא אפשר לעמוד, ואגרוף מנפץ אותו.'], keys: 'L / C (להחזיק)' },
  bolt: { name: 'ברק', icon: 'iBolt', col: ['#fff1b0', '#e7b93a', '#94650f'], how: ['כפתור <b>הברק</b> מכה ברובוט הקרוב וקופץ לעוד רובוטים.', 'ברק <b>מפעיל גנרטורים</b>: שערים נפתחים ומעליות זזות. הוא גם שובר מגנים.'], keys: 'I / V' },
};

export const LEVELS = [
  { id: 1, name: 'רחובות העיר', sub: 'הרובוטים בכיכר!', theme: 'town', spawn: [-12, 0], pieces: L1, reward: 'fire', amb: 'amb_town', steps: 'step_stone', len: [-16, 200],
    sky: { top: 0x5f9fd0, mid: 0xa9d0e6, hor: 0xf3dfb8, sun: [0.5, 0.75, 0.42], sunCol: 0xfff0d6, sunI: 3.0, hemi: [0xdcecff, 0x8a6a48, 1.25], fog: 0xd9e3e0, fogD: [38, 150] } },
  { id: 2, name: 'הגגות', sub: 'מעל העיר', theme: 'roof', spawn: [-8, 0], pieces: L2, reward: 'wind', amb: 'amb_roof', steps: 'step_tile', len: [-12, 192],
    sky: { top: 0x3f86c8, mid: 0x9cc8e6, hor: 0xeaf0ea, sun: [0.3, 0.9, 0.3], sunCol: 0xfff6e4, sunI: 3.2, hemi: [0xe0f0ff, 0x7a6a58, 1.3], fog: 0xd6e6ee, fogD: [40, 170] } },
  { id: 3, name: 'התעלה', sub: 'מים, סירות וקרח', theme: 'canal', spawn: [-12, 0], pieces: L3, reward: 'ice', amb: 'amb_canal', steps: 'step_stone', len: [-16, 208],
    sky: { top: 0x5a8fc4, mid: 0xb7cfe0, hor: 0xf7d9a8, sun: [-0.55, 0.5, 0.4], sunCol: 0xffe2b0, sunI: 2.9, hemi: [0xe6eef8, 0x806048, 1.2], fog: 0xe6dccb, fogD: [36, 150] } },
  { id: 4, name: 'מפעל השעונים', sub: 'הלב של הרובוטים', theme: 'factory', spawn: [-12, 0], pieces: L4, reward: 'bolt', amb: 'amb_factory', steps: 'step_metal', len: [-16, 180],
    sky: { top: 0x6f7fa8, mid: 0xd9a77c, hor: 0xf2b77a, sun: [0.6, 0.32, 0.45], sunCol: 0xffc890, sunI: 2.7, hemi: [0xf2d8c0, 0x5a4636, 1.15], fog: 0xd8a983, fogD: [30, 130] } },
  { id: 5, name: 'ראש המגדל', sub: 'מלך השעונים', theme: 'tower', spawn: [-7.5, 0], pieces: L5, boss: true, amb: 'amb_tower', steps: 'step_stone', len: [-13, 13],
    sky: { top: 0x45507e, mid: 0xc67c62, hor: 0xf3a865, sun: [0.75, 0.22, 0.35], sunCol: 0xffb87a, sunI: 2.6, hemi: [0xf0c8b0, 0x4a3a30, 1.1], fog: 0xcf8f73, fogD: [40, 160] } },
  { id: 6, name: 'שלב הפרס', sub: 'השלב הבלתי אפשרי', theme: 'prize', prize: true, spawn: [-12, 0], pieces: L6, amb: 'amb_tower', steps: 'step_stone', len: [-16, 640],
    sky: { top: 0x3a4a7c, mid: 0xb08a96, hor: 0xf1c79a, sun: [-0.6, 0.22, 0.4], sunCol: 0xffc488, sunI: 2.6, hemi: [0xeed6c8, 0x463a40, 1.1], fog: 0xe0c2aa, fogD: [50, 170], low: 0x221d36 } },
];

export const HINTS = {
  move: { t: 'גררו את <b>הג׳ויסטיק</b> שמאלה וימינה כדי לרוץ', pc: 'רוצו עם <b>החיצים</b> או <b>A/D</b>' },
  jump: { t: 'לחצו <b>קפיצה</b> כדי לקפוץ על הארגז', pc: '<b>רווח</b> או <b>W</b> לקפיצה' },
  punch: { t: 'רובוט! לחצו <b>אגרוף</b> כדי להכות אותו', pc: '<b>J</b> או <b>Z</b> לאגרוף' },
  gap: { t: 'בור! רוצו וקפצו מעליו', pc: 'רוצו וקפצו עם <b>רווח</b>' },
  awning: { t: 'סוכך הבד <b>מקפיץ</b> גבוה!', pc: 'סוכך הבד <b>מקפיץ</b> גבוה!' },
  charge: { t: 'לרובוט הענק יש מגן. <b>החזיקו אגרוף</b> לאגרוף־על שמפיל אותו', pc: '<b>החזיקו J</b> לאגרוף־על ששובר מגנים' },
  roofs: { t: 'אל תיפלו בין הגגות!', pc: 'אל תיפלו בין הגגות!' },
  flygap: { t: 'קפצו ו<b>החזיקו קפיצה</b> כדי לעוף מעל הרחוב', pc: 'קפצו ו<b>החזיקו רווח</b> כדי לעוף' },
  smashwall: { t: 'קיר סדוק! <b>החזיקו אגרוף</b> ושחררו כדי לנפץ', pc: '<b>החזיקו J</b> ושחררו כדי לנפץ' },
  canal: { t: 'במים אי אפשר לשחות. עופו מעל התעלה הקצרה', pc: 'עופו מעל התעלה הקצרה' },
  freezewater: { t: 'התעלה רחבה מדי לעוף. עמדו בשפה ו<b>החזיקו קרח</b> כדי להקפיא את המים', pc: 'עמדו בשפה ו<b>החזיקו L</b> כדי להקפיא את המים' },
  freezebot: { t: 'הקפיאו רובוט, ואז <b>אגרוף</b> מנפץ אותו', pc: 'הקפיאו רובוט, ואז <b>J</b> מנפץ אותו' },
  factory: { t: 'שימו לב לאדים ולמסועים', pc: 'שימו לב לאדים ולמסועים' },
  boltgen: { t: 'השער נעול. זרקו <b>ברק</b> על הגנרטור', pc: 'זרקו <b>ברק</b> (I) על הגנרטור' },
  vent: { t: 'פתח אדים! עברו כשהוא שקט', pc: 'פתח אדים! עברו כשהוא שקט' },
  lift: { t: 'ברק על הגנרטור מפעיל את <b>המעלית</b>', pc: 'ברק על הגנרטור מפעיל את <b>המעלית</b>' },
  prize: { t: 'השלב הבלתי אפשרי! תפסו את <b>גלגל הזהב</b>, ורק אז תגלו מה הפרס', pc: 'השלב הבלתי אפשרי! תפסו את <b>גלגל הזהב</b>, ורק אז תגלו מה הפרס' },
};
