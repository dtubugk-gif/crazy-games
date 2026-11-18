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
