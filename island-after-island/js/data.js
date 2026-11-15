// Game data: islands, resources, recipes, perks, texts (Hebrew UI).

export const ITEMS = {
  wood:    { he: 'עץ',        mesh: 'Item_Wood' },
  stone:   { he: 'אבן',       mesh: 'Item_Stone' },
  berry:   { he: 'פירות יער', mesh: 'Item_Berry' },
  ironOre: { he: 'עפרת ברזל', mesh: 'Item_IronOre' },
  goldOre: { he: 'עפרת זהב',  mesh: 'Item_GoldOre' },
  ironBar: { he: 'מוט ברזל',  mesh: 'Item_IronBar' },
  crystal: { he: 'קריסטל',    mesh: 'Item_Crystal' },
  coin:    { he: 'מטבעות',    mesh: 'Item_Coin' },
};
export const INV_ORDER = ['wood', 'stone', 'berry', 'ironOre', 'goldOre', 'ironBar', 'crystal'];

// Resource kinds. hp in hits of damage 1; minTier = pickaxe tier needed (0 stone, 1 iron, 2 gold)
export const RES = {
  oak:      { model: 'oak',      hp: 3, r: 0.45, drops: [['wood', 2, 3]], xp: 4, kind: 'tree', minTier: 0, sfx: 'chop' },
  pine:     { model: 'pine',     hp: 3, r: 0.4,  drops: [['wood', 2, 3]], xp: 4, kind: 'tree', minTier: 0, sfx: 'chop' },
  snowpine: { model: 'snowpine', hp: 4, r: 0.4,  drops: [['wood', 3, 3]], xp: 5, kind: 'tree', minTier: 0, sfx: 'chop' },
  rock:     { model: 'rock',     hp: 4, r: 0.55, drops: [['stone', 2, 3]], xp: 5, kind: 'rock', minTier: 0, sfx: 'mine' },
  iron:     { model: 'ironrock', hp: 6, r: 0.55, drops: [['ironOre', 2, 2], ['stone', 0, 1]], xp: 7, kind: 'rock', minTier: 0, sfx: 'ore' },
  gold:     { model: 'goldrock', hp: 7, r: 0.55, drops: [['goldOre', 1, 2], ['stone', 0, 1]], xp: 9, kind: 'rock', minTier: 1, sfx: 'ore' },
  crystal:  { model: 'crystal',  hp: 7, r: 0.5,  drops: [['crystal', 1, 2]], xp: 10, kind: 'rock', minTier: 1, sfx: 'crystal' },
  bush:     { model: 'bush',     hp: 1, r: 0.42, drops: [['berry', 2, 3]], xp: 2, kind: 'bush', minTier: 0, sfx: 'bush' },
};

// three.js world coordinates (x, z). Spawn tables: [kind, count]
export const ISLANDS = {
  home:      { he: 'אי הבית',        price: 0,  spawn: [['oak', 5], ['rock', 4], ['bush', 3]], slimes: 0, amb: 'amb_meadow' },
  forest:    { he: 'יער האורנים',    price: 8,  spawn: [['pine', 9], ['oak', 2], ['bush', 3], ['rock', 2]], slimes: 3, slimeKind: 'slime', amb: 'amb_forest' },
  highlands: { he: 'הרמה הסלעית',    price: 20, spawn: [['rock', 3], ['iron', 5], ['gold', 3], ['bush', 2], ['oak', 2]], slimes: 2, slimeKind: 'slime', amb: 'amb_meadow' },
  snow:      { he: 'אי השלג',        price: 45, spawn: [['snowpine', 7], ['crystal', 5], ['rock', 2]], slimes: 3, slimeKind: 'frostslime', amb: 'amb_snow' },
  ancient:   { he: 'האי העתיק',      price: 70, spawn: [['oak', 2], ['rock', 2], ['bush', 2]], slimes: 2, slimeKind: 'slime', amb: 'amb_ancient' },
};
export const LINKS = [ // bridges: from (owned) -> to (to buy)
  ['home', 'forest'], ['home', 'highlands'], ['highlands', 'snow'], ['forest', 'ancient'],
];

// Fixed placements, island-local (x, z) and yaw (radians, 0 = facing +z / the camera)
export const FIXED = {
  home:      { tent: [-1.2, -3.6, 0.35], workbench: [2.6, -1.2, -0.3], furnace: [-3.6, 0.4, 0.6], spawn: [-0.6, -1.8] },
  forest:    { chest: [3.5, -4.5, 0.4] },
  highlands: { chest: [-4.6, -3.6, 0.9], windmill: [3.4, -3.0, -0.5] },
  snow:      { chest: [3.8, 3.2, -0.6] },
  ancient:   { beacon: [0, 0, 0], chest: [-3.8, 3.0, 0.4] },
};

export const RECIPES = [
  { id: 'workbench', tab: 'build', he: 'שולחן עבודה', desc: 'מאפשר להכין כלים חדשים.', cost: { wood: 6, stone: 2 }, once: true },
  { id: 'furnace', tab: 'build', he: 'כבשן', desc: 'מתיך עפרות למוטות ולמטבעות.', cost: { stone: 8, wood: 4 }, once: true, needs: 'workbench' },
  { id: 'ironBar', tab: 'furnace', he: 'מוט ברזל', desc: '2 עפרות ברזל ועץ להסקה.', cost: { ironOre: 2, wood: 1 }, gives: { ironBar: 1 }, needs: 'furnace' },
  { id: 'mint', tab: 'furnace', he: '4 מטבעות', desc: 'הטבעת מטבעות מעפרת זהב.', cost: { goldOre: 1, wood: 1 }, gives: { coin: 4 }, needs: 'furnace' },
  { id: 'pickIron', tab: 'tools', he: 'מכוש ברזל', desc: 'מכה כפולה, כורה זהב וקריסטלים.', cost: { ironBar: 3, wood: 5 }, tier: 1, needs: 'workbench' },
  { id: 'pickGold', tab: 'tools', he: 'מכוש זהב', desc: 'מכה משולשת. הכי מהיר שיש.', cost: { ironBar: 3, goldOre: 4, crystal: 1 }, tier: 2, needs: 'workbench' },
  { id: 'sellWood', tab: 'trade', he: 'מכירת עץ', desc: '3 עץ ← מטבע', cost: { wood: 3 }, gives: { coin: 1 } },
  { id: 'sellStone', tab: 'trade', he: 'מכירת אבן', desc: '3 אבן ← מטבע', cost: { stone: 3 }, gives: { coin: 1 } },
  { id: 'sellBerry', tab: 'trade', he: 'מכירת פירות', desc: '2 פירות ← מטבע', cost: { berry: 2 }, gives: { coin: 1 } },
  { id: 'sellIron', tab: 'trade', he: 'מכירת מוט ברזל', desc: 'מוט ברזל ← 3 מטבעות', cost: { ironBar: 1 }, gives: { coin: 3 } },
];
export const TABS = [['build', 'בנייה'], ['tools', 'כלים'], ['furnace', 'כבשן'], ['trade', 'מסחר']];

export const BEACON_COST = { wood: 20, stone: 20, ironBar: 6, crystal: 5 };

export const PERKS = [
  { id: 'strong', he: 'יד חזקה', desc: '‎+35% עוצמת מכה', max: 3 },
  { id: 'swift', he: 'רגליים קלות', desc: '‎+12% מהירות הליכה', max: 3 },
  { id: 'heart', he: 'לב גדול', desc: 'לב נוסף וריפוי מלא', max: 3 },
  { id: 'magnet', he: 'מגנט', desc: 'פריטים נמשכים אלייך מרחוק', max: 2 },
  { id: 'luck', he: 'מזל', desc: '‎25% סיכוי לשלל כפול', max: 3 },
  { id: 'lumber', he: 'חוטב מומחה', desc: '‎+1 עץ מכל עץ', max: 2 },
  { id: 'miner', he: 'כורה מומחה', desc: '‎+1 מכל סלע', max: 2 },
  { id: 'trader', he: 'סוחר', desc: 'מכירה משתלמת יותר', max: 2 },
];
export const xpForLevel = (lv) => 18 + (lv - 1) * 14;

export const TUTORIAL = [   // text = phone, pc = keyboard wording
  { id: 'move', text: 'גררו את הג׳ויסטיק משמאל כדי ללכת', pc: 'לכו עם WASD או החצים' },
  { id: 'chop', text: 'עמדו ליד עץ ולחצו על הכפתור הירוק כדי לחטוב', pc: 'עמדו ליד עץ ולחצו רווח כדי לחטוב' },
  { id: 'gather', text: 'אספו 6 עץ ו־2 אבן (סלעים אפורים)' },
  { id: 'bench', text: 'לחצו על ״בנייה״ ובנו שולחן עבודה', pc: 'לחצו E ובנו שולחן עבודה' },
  { id: 'coins', text: 'ב״בנייה״ ← ״מסחר״ מכרו משאבים ואספו 8 מטבעות' },
  { id: 'buy', text: 'לכו לשלט שליד הגשר וקנו את יער האורנים' },
]
export const GOALS = [
  { id: 'highlands', text: 'קנו את הרמה הסלעית (20 מטבעות)' },
  { id: 'furnace', text: 'בנו כבשן והתיכו עפרת ברזל' },
  { id: 'pickIron', text: 'הכינו מכוש ברזל (3 מוטות ברזל)' },
  { id: 'snow', text: 'קנו את אי השלג וכרו קריסטלים' },
  { id: 'ancient', text: 'קנו את האי העתיק' },
  { id: 'beacon', text: 'תקנו את המגדלור העתיק' },
];
