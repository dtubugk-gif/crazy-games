// The two sides: 7 models each, mirror roles. Which side you play comes from the face scan.
export const SIDES = {
  angel: {
    key: 'angel', enemy: 'demon',
    name: 'מלאך', names: 'המלאכים', youAre: 'אתה מלאך!',
    world: 'heaven', homeDir: -1,            // heaven is on the left; your enemies come from the right
    hero: 'angel_hero', shot: 'spear', special: 'אור שמימי', weapon: 'sword',
    music: 'music_battle_angel', amb: 'amb_heaven', flap: 'wing_flap_feather',
    swing: 'sword_swing', hitSfx: 'sword_hit', shotSfx: 'spear_throw', specialSfx: 'special_holy',
    hurtSfx: 'angel_hurt', dieSfx: 'angel_die', bossRoar: 'boss_roar_angel',
    color: '#e8b84a', color2: '#fff3cf', ink: '#3a2a08',
    roles: {
      small: { model: 'cherub', name: 'כרוב קשת' },
      heavy: { model: 'angel_knight', name: 'אביר אור' },
      charger: { model: 'valkyrie', name: 'ולקירית' },
      caster: { model: 'angel_priestess', name: 'כוהנת האור' },
      diver: { model: 'angel_lightning', name: 'מלאך הברק' },
      rival: { model: 'angel_hero', name: 'אלוף המלאכים' },
      boss: { model: 'archangel', name: 'המלאך הגדול' },
    },
  },
  demon: {
    key: 'demon', enemy: 'angel',
    name: 'שד', names: 'השדים', youAre: 'אתה שד!',
    world: 'hell', homeDir: 1,
    hero: 'demon_hero', shot: 'fire', special: 'סערת אש', weapon: 'trident',
    music: 'music_battle_demon', amb: 'amb_hell', flap: 'wing_flap_leather',
    swing: 'trident_swing', hitSfx: 'trident_hit', shotSfx: 'fireball_cast', specialSfx: 'special_fire',
    hurtSfx: 'demon_hurt', dieSfx: 'demon_die', bossRoar: 'boss_roar_demon',
    color: '#d9542a', color2: '#ffd2a8', ink: '#2a0b05',
    roles: {
      small: { model: 'imp', name: 'שדון' },
      heavy: { model: 'brute', name: 'שד ענק' },
      charger: { model: 'pig_demon', name: 'שד חזיר' },
      caster: { model: 'demon_sorceress', name: 'מכשפת האש' },
      diver: { model: 'gargoyle', name: 'גרגויל' },
      rival: { model: 'demon_hero', name: 'אלוף השדים' },
      boss: { model: 'demon_king', name: 'מלך השדים' },
    },
  },
};

// real heights in metres (models are normalised to these if a file comes out at another scale)
export const HEIGHT = {
  angel_hero: 1.8, demon_hero: 1.85, cherub: 1.2, imp: 1.1, angel_knight: 2.3, brute: 2.6,
  valkyrie: 2.0, pig_demon: 2.0, angel_priestess: 1.9, demon_sorceress: 1.9, angel_lightning: 2.2, gargoyle: 1.6,
  archangel: 5.0, demon_king: 5.0,
};

export const ROLE_STATS = {
  small: { hp: 26, speed: 6.2, radius: .55, touch: 0, score: 10 },
  heavy: { hp: 95, speed: 3.6, radius: 1.05, touch: 10, score: 30 },
  charger: { hp: 55, speed: 5.0, radius: .85, touch: 0, score: 25 },
  caster: { hp: 42, speed: 4.4, radius: .7, touch: 0, score: 25 },
  diver: { hp: 34, speed: 7.0, radius: .7, touch: 0, score: 20 },
  rival: { hp: 420, speed: 7.6, radius: .75, touch: 0, score: 150 },
  boss: { hp: 1500, speed: 2.6, radius: 2.3, touch: 14, score: 500 },
};

// 6 waves; each entry = [role, count]; `cap` = most enemies alive at once
// 6 waves against a whole enemy army (your own army fights with you); each entry = [role, count]; cap = most alive at once
export const WAVES = [
  { n: 1, title: 'הגל הראשון', spawn: [['small', 6], ['charger', 1], ['small', 3]], cap: 6 },
  { n: 2, title: 'הם מתקרבים', spawn: [['small', 4], ['charger', 3], ['diver', 2], ['small', 4], ['heavy', 1]], cap: 7 },
  { n: 3, title: 'צבא שלם', spawn: [['small', 4], ['diver', 3], ['heavy', 2], ['caster', 2], ['small', 4], ['charger', 3]], cap: 8 },
  { n: 4, title: 'המתקפה הגדולה', spawn: [['charger', 3], ['heavy', 2], ['diver', 3], ['caster', 2], ['small', 6], ['heavy', 2], ['diver', 2], ['small', 4]], cap: 9 },
  { n: 5, title: 'האלוף', spawn: [['rival', 1], ['small', 4], ['caster', 2], ['heavy', 2], ['charger', 2], ['small', 4]], cap: 8, rival: true },
  { n: 6, title: 'הקרב האחרון', spawn: [['boss', 1], ['small', 3], ['heavy', 1]], cap: 6, boss: true },
];

export const UPGRADES = [
  { id: 'dmg', icon: 'iSword', t: 'כוח', d: '+25% נזק לכל ההתקפות', max: 4 },
  { id: 'speed', icon: 'iWing', t: 'כנפיים מהירות', d: '+15% מהירות תעופה ודאש מהיר יותר', max: 3 },
  { id: 'multi', icon: 'iShot', t: 'זריקה משולשת', d: 'כל זריקה יוצאת בשלושה כיוונים', max: 1 },
  { id: 'hp', icon: 'iHeart', t: 'לב חזק', d: '+30 חיים מקסימליים (ומתמלא)', max: 3 },
  { id: 'special', icon: 'iStar', t: 'כוח מיוחד', d: 'המד המיוחד מתמלא פי 1.5 מהר', max: 2 },
  { id: 'rapid', icon: 'iBolt', t: 'זריקה מהירה', d: 'זריקות מהירות יותר ב-30%', max: 2 },
  { id: 'heal', icon: 'iOrb', t: 'ריפוי מלא', d: 'כל החיים חוזרים עכשיו', max: 9 },
  { id: 'vamp', icon: 'iDrop', t: 'כוח החיים', d: 'כל אויב שנופל מחזיר 4 חיים', max: 2 },
  { id: 'army', icon: 'iWing', t: 'צבא גדול', d: 'עוד 2 לוחמים מצטרפים לצבא שלך בכל גל', max: 2 },
];

// owner-supplied Sketchfab models (CC-BY-4.0): shown in the credits screen
export const CREDITS = [
  ['Demon', 'Daisy.Swart', 'https://sketchfab.com/3d-models/demon-57a7a026d3ab42988d098be9103af7f2', 'אלוף השדים'],
  ['Blood Demon', 'PierreHuot', 'https://sketchfab.com/3d-models/blood-demon-22e50bad3dc24c169a287613f1bca9ee', 'שדון'],
  ['Pig Demon', 'Lexington Dath', 'https://sketchfab.com/3d-models/pig-demon-bba636efaee04b3ea988b2ae4487cfc1', 'שד חזיר'],
  ['Black Demon', 'simonemaccari', 'https://sketchfab.com/3d-models/black-demon-46e2b97deeb7471696c66274eea7e824', 'שד ענק'],
  ['Armored Demon', 'simonemaccari', 'https://sketchfab.com/3d-models/armored-demon-747ba9d771cb4235ba3af968b51b92d3', 'מלך השדים'],
  ['Demon Woman - Dwarf Idle', 'Walter Araujo', 'https://sketchfab.com/3d-models/demon-woman-dwarf-idle-25e9f3e893ff4afc8a1821b245fea2ca', 'מכשפת האש'],
  ['Angel - Tilt Brush', '3Donimus', 'https://sketchfab.com/3d-models/angel-tilt-brush-48b2042cc4184a5f9b5ccc6c24743b1a', 'מלאך הברק'],
];

// ================================================================ evolution mode
// you start as the smallest of your side and evolve, form by form, up to the biggest; every form fights its own way.
// display = drawn scale (bodies grow every step), r = hit radius, cam = camera distance (it pulls back as you grow).
// moves: attack / shoot / special are move ids in js/evolve.js; names are shown on the buttons and in the evolve banner.
export const FORMS = {
  angel: [
    { model: 'cherub', name: 'כרוב קטן', display: 1.6, r: .45, hp: 70, speed: 10.5, dmg: .8, cam: 14,
      moves: { attack: 'volley', shoot: 'goldArrow', special: 'arrowRain' }, names: { attack: 'מטח חיצים', shoot: 'חץ זהב', special: 'גשם חיצים' }, icons: { attack: 'iShot', shoot: 'iSpear' } },
    { model: 'angel_priestess', name: 'כוהנת האור', display: 1.26, r: .55, hp: 90, speed: 9.8, dmg: .95, cam: 14.5,
      moves: { attack: 'orbs', shoot: 'beam', special: 'pillar' }, names: { attack: 'כדורי אור', shoot: 'קרן אור', special: 'עמודי שמיים' }, icons: { attack: 'iOrb', shoot: 'iBolt' } },
    { model: 'angel_hero', name: 'לוחם האור', display: 1.55, r: .8, hp: 115, speed: 9.4, dmg: 1.1, cam: 15.5,
      moves: { attack: 'combo', shoot: 'throw', special: 'nova' }, names: { attack: 'קומבו חרב', shoot: 'רומח אור', special: 'אור שמימי' }, icons: { attack: 'iSword', shoot: 'iSpear' } },
    { model: 'angel_lightning', name: 'מלאך הברק', display: 1.36, r: .85, hp: 140, speed: 10.2, dmg: 1.25, cam: 16,
      moves: { attack: 'diveStrike', shoot: 'chain', special: 'storm' }, names: { attack: 'צלילת ברק', shoot: 'ברק שרשרת', special: 'סערת ברקים' }, icons: { attack: 'iDash', shoot: 'iBolt' } },
    { model: 'valkyrie', name: 'ולקירית', display: 1.6, r: .9, hp: 170, speed: 9.6, dmg: 1.45, cam: 16.5,
      moves: { attack: 'thrust', shoot: 'lanceCharge', special: 'spearWall' }, names: { attack: 'דקירת רומח', shoot: 'הסתערות', special: 'חומת רמחים' }, icons: { attack: 'iSpear', shoot: 'iDash' } },
    { model: 'angel_knight', name: 'אביר אור', display: 1.57, r: 1, hp: 210, speed: 8.8, dmg: 1.65, cam: 17.5,
      moves: { attack: 'bigSlash', shoot: 'shieldBlock', special: 'holyCharge' }, names: { attack: 'מכת חרב', shoot: 'מגן מחזיר', special: 'הסתערות קדושה' }, icons: { attack: 'iSword', shoot: 'iShield' } },
    { model: 'archangel', name: 'המלאך הגדול', display: 1.08, r: 1.5, hp: 300, speed: 8.2, dmg: 2.1, cam: 20,
      moves: { attack: 'sweep', shoot: 'spearRain', special: 'judgment' }, names: { attack: 'חרב הלהבה', shoot: 'גשם רמחים', special: 'יום הדין' }, icons: { attack: 'iSword', shoot: 'iSpear' } },
  ],
  demon: [
    { model: 'imp', name: 'שדון קטן', display: 1.73, r: .45, hp: 70, speed: 10.5, dmg: .8, cam: 14,
      moves: { attack: 'claws', shoot: 'emberShot', special: 'frenzy' }, names: { attack: 'שריטה', shoot: 'גץ אש', special: 'טירוף' }, icons: { attack: 'iClaw', shoot: 'iFire' } },
    { model: 'demon_sorceress', name: 'מכשפת האש', display: 1.26, r: .55, hp: 90, speed: 9.8, dmg: .95, cam: 14.5,
      moves: { attack: 'orbs', shoot: 'fireRing', special: 'emberStorm' }, names: { attack: 'כדורי צל', shoot: 'טבעת אש', special: 'סופת גצים' }, icons: { attack: 'iOrb', shoot: 'iFire' } },
    { model: 'demon_hero', name: 'לוחם האש', display: 1.51, r: .8, hp: 115, speed: 9.4, dmg: 1.1, cam: 15.5,
      moves: { attack: 'combo', shoot: 'throw', special: 'nova' }, names: { attack: 'קומבו קלשון', shoot: 'כדור אש', special: 'סערת אש' }, icons: { attack: 'iTrident', shoot: 'iFire' } },
    { model: 'gargoyle', name: 'גרגויל', display: 1.88, r: .85, hp: 140, speed: 10.2, dmg: 1.25, cam: 16,
      moves: { attack: 'diveStrike', shoot: 'shards', special: 'stoneSkin' }, names: { attack: 'צלילת אבן', shoot: 'רסיסי אבן', special: 'עור אבן' }, icons: { attack: 'iDash', shoot: 'iShot' } },
    { model: 'pig_demon', name: 'שד חזיר', display: 1.6, r: .9, hp: 170, speed: 9.6, dmg: 1.45, cam: 16.5,
      moves: { attack: 'bite', shoot: 'ram', special: 'squeal' }, names: { attack: 'נשיכה', shoot: 'דהירה', special: 'צווחת אימה' }, icons: { attack: 'iClaw', shoot: 'iDash' } },
    { model: 'brute', name: 'שד ענק', display: 1.38, r: 1, hp: 210, speed: 8.8, dmg: 1.65, cam: 17.5,
      moves: { attack: 'clubSmash', shoot: 'roarStun', special: 'quake' }, names: { attack: 'מכת אלה', shoot: 'שאגה', special: 'רעידת אדמה' }, icons: { attack: 'iClub', shoot: 'iRoar' } },
    { model: 'demon_king', name: 'מלך השדים', display: 1.08, r: 1.5, hp: 300, speed: 8.2, dmg: 2.1, cam: 20,
      moves: { attack: 'sweep', shoot: 'breath', special: 'meteorRain' }, names: { attack: 'מכת טופר', shoot: 'נשימת אש', special: 'גשם מטאורים' }, icons: { attack: 'iClaw', shoot: 'iFire' } },
  ],
};
// total power needed to reach each form (form 1 = 0)
export const EVO_XP = [0, 40, 110, 210, 330, 480, 700];
// power a defeated enemy gives
export const XP_GAIN = { small: 10, diver: 14, caster: 16, charger: 18, heavy: 30, rival: 90, boss: 0 };
// solo against every kind of the other side: 8 waves, the last is their boss; [role, count]
export const EVO_WAVES = [
  { n: 1, title: 'כולם גדולים ממך!', spawn: [['small', 5]], cap: 3 },
  { n: 2, title: 'צוללים מהשמיים', spawn: [['small', 3], ['diver', 2], ['small', 2]], cap: 4 },
  { n: 3, title: 'מסתערים', spawn: [['charger', 2], ['small', 3], ['caster', 1]], cap: 4 },
  { n: 4, title: 'הענק מגיע', spawn: [['heavy', 1], ['small', 3], ['diver', 2], ['caster', 1]], cap: 5 },
  { n: 5, title: 'כל הסוגים ביחד', spawn: [['charger', 2], ['heavy', 1], ['diver', 2], ['small', 3], ['caster', 1]], cap: 5 },
  { n: 6, title: 'האלוף', spawn: [['rival', 1], ['small', 3], ['caster', 1]], cap: 3, rival: true },
  { n: 7, title: 'הצבא האחרון', spawn: [['heavy', 2], ['charger', 2], ['diver', 2], ['caster', 2], ['small', 4]], cap: 6 },
  { n: 8, title: 'הקרב האחרון', spawn: [['boss', 1], ['small', 2]], cap: 3, boss: true },
];
