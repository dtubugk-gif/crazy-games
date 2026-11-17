// Validates the question bank: run `node tests/validate.mjs` from the game folder.
// Exits with code 1 (and lists every problem) when anything is wrong.
import { QUESTIONS } from '../js/questions.js';
import { normalize, matchAnswer } from '../js/match.js';

const CATS = ['mobs', 'blocks', 'items', 'food', 'biomes', 'structures', 'nether', 'end', 'ocean', 'redstone', 'enchant', 'crafting', 'misc'];
const errors = [];
const err = (qid, msg) => errors.push(`[${qid}] ${msg}`);

// Typed answers (typos, plurals, other spellings) that must be recognised: [prompt id, what the kid types, expected en].
const SAMPLES = [
  ['misc-explodes', 'קריפרים', 'Creeper'],
  ['misc-explodes', 'creepr', 'Creeper'],
  ['misc-explodes', 'TNT', 'TNT'],
  ['misc-explodes', 'end cristal', 'End Crystal'],
  ['mob-undead', 'זומבים', 'Zombie'],
  ['mob-undead', 'skeletn', 'Skeleton'],
  ['mob-undead', 'סקלטונים', 'Skeleton'],
  ['mob-undead', 'Wither Skeletons', 'Wither Skeleton'],
  ['mob-undead', 'פנטומים', 'Phantom'],
  ['mob-tameable', 'כלב', 'Wolf'],
  ['mob-tameable', 'wolves', 'Wolf'],
  ['mob-tameable', 'חתולים', 'Cat'],
  ['mob-rideable', 'happy gast', 'Happy Ghast'],
  ['mob-rideable', 'הסוס', 'Horse'],
  ['mob-breed', 'פרות', 'Cow'],
  ['mob-breed', 'תרנגולות', 'Chicken'],
  ['mob-breed', 'axolotel', 'Axolotl'],
  ['mob-breed', 'אקסולוטלים', 'Axolotl'],
  ['mob-breed', 'Sniffers', 'Sniffer'],
  ['mob-can-attack', 'אנדרמנים', 'Enderman'],
  ['mob-can-attack', 'endermen', 'Enderman'],
  ['mob-can-attack', 'the warden', 'Warden'],
  ['mob-can-attack', 'וורדן', 'Warden'],
  ['mob-can-attack', 'golem', 'Iron Golem'],
  ['mob-flying', 'האנדר דרגון', 'Ender Dragon'],
  ['mob-flying', 'דרקון', 'Ender Dragon'],
  ['ocean-mobs', 'דגים', 'Cod'],
  ['ocean-mobs', 'דולפינים', 'Dolphin'],
  ['ocean-mobs', 'תמנון', 'Squid'],
  ['nether-mobs', 'גאסטים', 'Ghast'],
  ['nether-mobs', 'zombie pigman', 'Zombified Piglin'],
  ['nether-mobs', 'Piglins', 'Piglin'],
  ['blocks-ores', 'diamon ore', 'Diamond Ore'],
  ['blocks-ores', 'יהלומים', 'Diamond Ore'],
  ['blocks-ores', 'deepslate diamond', 'Deepslate Diamond Ore'],
  ['blocks-ores', 'עפרת אמרלד', 'Emerald Ore'],
  ['blocks-light', 'לפידים', 'Torch'],
  ['blocks-light', 'glowstne', 'Glowstone'],
  ['blocks-light', 'Jack O Lantern', "Jack o'Lantern"],
  ['blocks-flowers', 'ורדים', 'Poppy'],
  ['blocks-flowers', 'rose', 'Poppy'],
  ['blocks-flowers', 'red tulip', 'Tulip'],
  ['blocks-flowers', 'חמניות', 'Sunflower'],
  ['blocks-wood-types', 'Dark oak', 'Dark Oak'],
  ['blocks-wood-types', "צ'רי", 'Cherry'],
  ['enchant-any', 'sharpnes', 'Sharpness'],
  ['enchant-any', 'מנדינג', 'Mending'],
  ['enchant-any', 'Feather Faling', 'Feather Falling'],
  ['enchant-any', 'Silk Tuch', 'Silk Touch'],
  ['enchant-sword', 'אש', 'Fire Aspect'],
  ['food-hunger', 'סטייקים', 'Steak'],
  ['food-hunger', 'golden aple', 'Golden Apple'],
  ['food-hunger', 'notch apple', 'Enchanted Golden Apple'],
  ['food-hunger', 'עוגיות', 'Cookie'],
  ['biomes-any', 'mesa', 'Badlands'],
  ['biomes-any', 'ג׳ונגל', 'Jungle'],
  ['biomes-any', 'cherry grove', 'Cherry Grove'],
  ['biomes-any', 'מדבר', 'Desert'],
  ['structures-any', 'כפרים', 'Village'],
  ['structures-any', 'stronghld', 'Stronghold'],
  ['structures-any', 'end ship', 'End City'],
  ['crafting-diamond', 'פיקאקס', 'Diamond Pickaxe'],
  ['crafting-diamond', 'diamond armor', 'Diamond Chestplate'],
  ['crafting-iron', 'דליים', 'Bucket'],
  ['crafting-wood', 'שולחן יצירה', 'Crafting Table'],
  ['crafting-wood', 'מקלות', 'Stick'],
  ['items-potions', 'שיקוי ריפוי', 'Potion of Healing'],
  ['items-potions', 'potion of swiftnes', 'Potion of Swiftness'],
  ['items-effects', 'speeed', 'Speed'],
  ['items-music-discs', 'pigstep', 'Pigstep'],
  ['items-music-discs', '13', '13'],
  ['redstone-power', 'redstone torch', 'Redstone Torch'],
  ['redstone-activated', 'פיסטונים', 'Piston'],
  ['blocks-unobtainable', 'בדרוק', 'Bedrock'],
  ['misc-dye-colors', 'grey', 'Gray'],
];

// ── structure ──
if (!Array.isArray(QUESTIONS) || QUESTIONS.length === 0) { console.error('QUESTIONS is empty'); process.exit(1); }
const ids = new Set();
let answerCount = 0;
const perCat = {};
const tierTotals = [0, 0, 0, 0, 0, 0];

for (const q of QUESTIONS) {
  const qid = q.id || '(no id)';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.id || '')) err(qid, 'id must be ascii kebab-case');
  if (ids.has(q.id)) err(qid, 'duplicate id');
  ids.add(q.id);
  if (!CATS.includes(q.cat)) err(qid, `unknown cat "${q.cat}"`);
  if (typeof q.q !== 'string' || !q.q.trim()) err(qid, 'missing prompt text q');
  else if (q.q.length > 60) err(qid, `prompt too long (${q.q.length} chars, max 60)`);
  if (!Array.isArray(q.answers)) { err(qid, 'answers missing'); continue; }
  perCat[q.cat] = (perCat[q.cat] || 0) + 1;
  answerCount += q.answers.length;
  if (q.answers.length < 8) err(qid, `only ${q.answers.length} answers (need 8+)`);

  const t1 = q.answers.filter(a => a.t === 1).length;
  const rare = q.answers.filter(a => a.t >= 4).length;
  if (t1 < 1 || t1 > 2) err(qid, `${t1} tier-1 answers (need 1-2)`);
  if (rare < 3) err(qid, `${rare} tier 4-5 answers (need 3+)`);

  const owner = new Map(); // normalized form -> answer
  const ens = new Set();
  for (const a of q.answers) {
    const label = a.en || a.he || '?';
    if (typeof a.he !== 'string' || !a.he.trim()) err(qid, `answer "${label}" has no he`);
    if (typeof a.en !== 'string' || !a.en.trim()) err(qid, `answer "${label}" has no en`);
    if (!Number.isInteger(a.t) || a.t < 1 || a.t > 5) err(qid, `answer "${label}" has bad tier ${a.t}`);
    else tierTotals[a.t]++;
    if (!Array.isArray(a.alias)) err(qid, `answer "${label}" alias is not an array`);
    if (ens.has(a.en)) err(qid, `en "${a.en}" appears twice`);
    ens.add(a.en);
    for (const form of [a.he, a.en, ...(a.alias || [])]) {
      if (typeof form !== 'string' || !form.trim()) { err(qid, `answer "${label}" has an empty alias`); continue; }
      const n = normalize(form);
      if (!n) { err(qid, `"${form}" (${label}) normalizes to nothing`); continue; }
      const prev = owner.get(n);
      if (prev && prev !== a) err(qid, `"${form}" is shared by "${prev.en}" and "${label}" (normalized "${n}")`);
      owner.set(n, a);
    }
  }
  // every form must match back to its own answer
  for (const a of q.answers) {
    for (const form of [a.he, a.en, ...(a.alias || [])]) {
      if (typeof form !== 'string' || !form.trim()) continue;
      const got = matchAnswer(q, form);
      if (got !== a) err(qid, `"${form}" should match "${a.en}" but matched ${got ? `"${got.en}"` : 'nothing'}`);
    }
  }
}

// ── sample misspellings ──
const byId = new Map(QUESTIONS.map(q => [q.id, q]));
let samplesOk = 0;
for (const [qid, input, want] of SAMPLES) {
  const q = byId.get(qid);
  if (!q) { err(qid, `sample refers to a missing prompt`); continue; }
  const got = matchAnswer(q, input);
  if (!got || got.en !== want) err(qid, `sample "${input}" should match "${want}" but matched ${got ? `"${got.en}"` : 'nothing'}`);
  else samplesOk++;
}
// ── things that must NOT match ──
const NEGATIVE = [
  ['mob-undead', 'Creeper'], ['mob-tameable', 'Camel'], ['blocks-ores', 'Stone'], ['mob-flying', 'Chicken'],
  ['blocks-gravity', 'Dirt'], ['enchant-sword', 'Efficiency'],
];
for (const [qid, input] of NEGATIVE) {
  const q = byId.get(qid);
  const got = q && matchAnswer(q, input);
  if (got) err(qid, `"${input}" must not be accepted but matched "${got.en}"`);
}

// ── summary ──
console.log(`prompts: ${QUESTIONS.length}`);
console.log(`answers: ${answerCount} (avg ${(answerCount / QUESTIONS.length).toFixed(1)} per prompt)`);
console.log(`tiers:   ${[1, 2, 3, 4, 5].map(t => `t${t}=${tierTotals[t]}`).join('  ')}`);
console.log('categories: ' + CATS.map(c => `${c}=${perCat[c] || 0}`).join('  '));
console.log(`samples: ${samplesOk}/${SAMPLES.length} misspellings matched, ${NEGATIVE.length} negatives checked`);
if (errors.length) {
  console.error(`\nFAILED with ${errors.length} problem(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('\nOK: question bank is valid');
