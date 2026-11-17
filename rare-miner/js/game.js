// כורה נדיר - the daily Minecraft quiz dig. Flow: title -> 7 prompts (25 s each) -> results.
import { QUESTIONS } from './questions.js';
import { matchAnswer, TIER_POINTS } from './match.js';
import { World, MineView, SURF, B, isSolid, kindOf, itemDataURL, layerAt, MILESTONES, rng } from './world.js';
import { Audio } from './audio.js';

const DEDICATION = '';   // the follower's name from the channel owner; the line stays hidden while empty
const GAME_URL = 'https://dtubugk-gif.github.io/crazy-games/rare-miner/';
const QTIME = 25, PER_DAY = 7, MAXPTS = 700, DAY1 = Date.UTC(2026, 10, 17), BEDROCK_STAND = -60;
const TIER = {
  0: { name: 'אין תשובה', emoji: '✖️' },
  1: { name: 'אבן', line: 'כולם חשבו על זה', emoji: '🪨' },
  2: { name: 'פחם', line: 'תשובה נפוצה', emoji: '⬛' },
  3: { name: 'ברזל', line: 'לא רע בכלל!', emoji: '🟧' },
  4: { name: 'זהב', line: 'תשובה נדירה!', emoji: '🟨' },
  5: { name: 'יהלום', line: 'כמעט אף אחד לא חושב על זה!', emoji: '💎' },
};
const CAT = { mobs: 'מובים', blocks: 'בלוקים', items: 'אייטמים', food: 'אוכל', biomes: 'ביומים', structures: 'מבנים', nether: 'נת׳ר', end: 'אנד',
  ocean: 'אושן', redstone: 'רדסטון', enchant: 'אנצ׳נטים', crafting: 'קראפטינג', misc: 'מיינקראפט' };
// an answer's English name, shown under/next to the Hebrew one when it is not the same word
const enOf = a => a && a.en && normalizeLite(a.en) !== normalizeLite(a.he) ? a.en : '';

const $ = id => document.getElementById(id);
const UPRIGHT = matchMedia('(max-aspect-ratio: 5/6)'); // keep in sync with the upright CSS block in index.html
const ICON = {}; for (let t = 1; t <= 5; t++) ICON[t] = itemDataURL(t, 64);

// ---------- dates (Israel time, same dig for everyone) ----------
function jParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}
const today = () => { const p = jParts(); return Math.max(1, Math.round((Date.UTC(p.y, p.m - 1, p.d) - DAY1) / 864e5) + 1); };
const secsToNext = () => { const p = jParts(); return 86400 - (p.h * 3600 + p.mi * 60 + p.s); };
const hms = s => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');

// the day's 7 prompts: walk through seeded shuffles of the whole bank, one shuffle after another
function permutation(c) { const r = rng(9001 + c * 7919); const a = QUESTIONS.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function dayQuestions(day) {
  const N = QUESTIONS.length, out = []; let pos = (day - 1) * PER_DAY;
  while (out.length < PER_DAY) { const c = Math.floor(pos / N), q = permutation(c)[pos % N]; if (!out.includes(q)) out.push(q); pos++; }
  return out.map(i => QUESTIONS[i]);
}
const yForPoints = p => Math.round(SURF - (SURF - BEDROCK_STAND) * Math.pow(Math.max(0, Math.min(p, MAXPTS)) / MAXPTS, 0.8));
const fmtY = y => 'Y ' + y;

// ---------- save ----------
const SAVE_KEY = 'rareMiner.v1';
let save = { days: {}, streak: 0, lastDone: 0, bestPractice: null, vol: { music: 0.8, sfx: 0.8, muted: false }, howSeen: false };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.days) save = Object.assign(save, s); } catch (e) { }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } };

// ---------- engine ----------
const audio = new Audio();
const canvas = $('c');
let world = new World(today() * 7919 + 13);
const view = new MineView(canvas, world);
let run = null;           // the dig in progress
let phase = 'title';      // title | how | ask | reveal | results
let qStart = 0, lastTick = 99, digging = false;

// ---------- small UI helpers ----------
function show(sec) {
  for (const id of ['sTitle', 'sHow', 'sQ', 'sRes']) $(id).classList.toggle('hidden', id !== sec);
  document.body.classList.toggle('notop', sec === 'sTitle' || sec === 'sHow');
}
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), 2200); }
function banner(t) { const b = $('banner'); b.innerHTML = ''; const d = document.createElement('div'); d.textContent = t; b.appendChild(d); }
const click = () => audio.play('ui_click', { vol: 0.9 });
function press(el, fn) {
  el.addEventListener('click', e => { e.preventDefault(); fn(e); });
}
function slots(answers, cur) {
  const box = $('ores'); box.innerHTML = '';
  for (let i = 0; i < PER_DAY; i++) {
    const s = document.createElement('div'); s.className = 'slot'; s.id = 'slot' + i;
    const a = answers[i];
    if (a) { if (a.t) { const im = new Image(); im.src = ICON[a.t]; im.className = 'px'; s.appendChild(im); s.classList.add('got'); } else s.classList.add('miss'); }
    if (i === cur) s.classList.add('cur');
    box.appendChild(s);
  }
}
let shownPts = 0;
function setPts(p, bump) { shownPts = p; $('pTxt').textContent = Math.round(p); if (bump) { const c = $('chipP'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } }

// ---------- world helpers ----------
function standY() { return Math.round(view.miner.y) - 1; }
function placeMinerAtSurface() { const m = view.miner; m.y = SURF + 1; m.state = 'idle'; view.cam.y = view.camT.y = m.y - 0.6; }
// rebuild the shaft instantly (resuming a dig, or showing the finished dig on the title screen)
function carveTo(target) {
  for (let y = SURF; y > target; y--) world.set(0, y, B.AIR);
  if (!isSolid(world.get(0, target))) world.set(0, target, B.PLANKS);
  const m = view.miner; m.y = target + 1; m.state = 'idle'; view.cam.y = view.camT.y = m.y - 0.6;
}
function newWorld(seed) { world = new World(seed); world.set(0, BEDROCK_STAND, B.BEDROCK); view.setWorld(world); view.parts = []; view.floaters = []; view.crack = null; placeMinerAtSurface(); }

const wait = ms => new Promise(r => setTimeout(r, ms / (fastForward ? 3 : 1)));
let fastForward = false;

// dig the shaft down so the miner stands on block `target`, with swings, cracks, falls and sounds
async function digTo(target) {
  const m = view.miner;
  let stand = standY();
  const total = stand - target;
  if (total <= 0) return;
  const swingDur = total > 9 ? 0.12 : total > 3 ? 0.16 : 0.22;
  let lastLayer = layerAt(stand).name;
  while (stand > target) {
    const b = world.get(0, stand);
    if (isSolid(b)) {
      const kind = kindOf(b);
      const hits = total > 3 ? 1 : kind === 'dirt' ? 2 : kind === 'deep' ? 4 : 3;
      for (let h = 0; h < hits; h++) {
        m.swing = m.swingDur = swingDur;
        await wait(swingDur * 1000 * 0.62);
        audio.play('dig_' + (kind === 'bedrock' ? 'deep' : kind), { vol: 0.85, minGap: 0.02 });
        view.crack = { x: 0, y: stand, stage: Math.min(3, Math.floor((h + 1) / hits * 4)) };
        view.burst(0, stand + 0.7, kind, 3, 0.6);
        await wait(swingDur * 1000 * 0.38);
      }
      view.crack = null;
      world.set(0, stand, B.AIR);
      view.burst(0, stand, kind, total > 9 ? 6 : 12, 1);
      view.shake = Math.max(view.shake, total > 9 ? 0.12 : 0.25);
      audio.play('break_' + (kind === 'bedrock' ? 'deep' : kind), { vol: 0.8, minGap: 0.02 });
    } else if (b === B.WATER) { world.set(0, stand, B.AIR); }
    // fall to the next solid block, but never past the target
    let y = stand - 1;
    let wet = false;
    while (y > target && !isSolid(world.get(0, y))) { if (world.get(0, y) === B.WATER) { wet = true; world.set(0, y, B.AIR); } y--; }
    if (y === target && !isSolid(world.get(0, y))) {
      if (world.get(0, y) === B.WATER) wet = true;
      world.set(0, y, B.PLANKS); view.burst(0, y + 0.5, 'planks', 6, 0.5); audio.play('land', { vol: 0.6 });
    }
    const drop = stand - y;
    if (drop > 1) {
      m.state = 'fall'; m.vy = 0; m.floorY = y + 1;
      await new Promise(res => { view.onLand = () => { view.onLand = null; res(); }; });
      audio.play('land', { vol: 0.9 }); view.burst(0, y + 1, kindOf(world.get(0, y)), 8, 0.6);
      view.shake = Math.max(view.shake, 0.35);
    } else {
      m.y = y + 1; m.squash = Math.max(m.squash, 0.35);
    }
    if (wet) { audio.play('splash', { vol: 0.8 }); view.burst(0, y + 1.5, 'water', 14, 1); }
    stand = y;
    const ln = layerAt(stand).name;
    if (ln !== lastLayer) { lastLayer = ln; audio.play('layer', { vol: 0.8 }); banner(ln); updateAmbience(); if (stand <= -54) setTimeout(() => audio.play('lava_hiss', { vol: 0.8 }), 500); }
    updateAmbience();
  }
}

function updateAmbience() {
  const y = standY();
  const w = { amb_surface: 0, amb_cave: 0, amb_deep: 0, amb_lava: 0 };
  if (y >= 60) w.amb_surface = 1;
  else if (y >= 50) { w.amb_surface = (y - 50) / 10; w.amb_cave = 1 - w.amb_surface; }
  else if (y > 0) w.amb_cave = 1;
  else if (y > -50) { w.amb_deep = 1; w.amb_cave = Math.max(0, (y + 20) / 20); }
  else { w.amb_deep = 0.7; w.amb_lava = Math.min(1, (-50 - y) / 6 + 0.4); }
  audio.setAmbience(w);
  if (phase === 'title' || phase === 'how') audio.setMusic('music_title');
  else if (phase === 'results') audio.setMusic('music_title');
  else { const deep = Math.max(0, Math.min(1, (10 - y) / 45)); audio.setMusic({ music_dig: 1 - deep, music_deep: deep }); }
}

// ---------- title ----------
function refreshTitle() {
  const d = today(), rec = save.days[d];
  $('dailyTxt').textContent = rec?.done ? 'התוצאה שלי · חפירה #' + d : rec?.answers?.length ? `להמשיך את חפירה #${d}` : `חפירה יומית #${d}`;
  $('dailySub').textContent = rec?.done ? `הגעתם ל־⁦${fmtY(rec.y)}⁩ · ${rec.total} נקודות` : rec?.answers?.length ? `${rec.answers.length} מתוך 7 שאלות` : '7 שאלות חדשות מחכות';
  const meta = [];
  if (save.streak > 1 && save.lastDone >= d - 1) meta.push(`<span>רצף: <b>${save.streak}</b> ימים</span>`);
  if (rec?.done) meta.push(`<span>החפירה הבאה בעוד <b id="cd">${hms(secsToNext())}</b></span>`);
  else meta.push(`<span>חפירה חדשה כל יום ב־00:00</span>`);
  $('titleMeta').innerHTML = meta.join('');
  if (DEDICATION) { $('ded').textContent = 'המשחק מוקדש ל' + DEDICATION + ' ❤️'; $('ded').classList.remove('hidden'); }
}
function goTitle() {
  phase = 'title'; run = null; show('sTitle'); refreshTitle();
  const d = today(), rec = save.days[d];
  newWorld(d * 7919 + 13);
  if (rec?.done) carveTo(yForPoints(rec.total));
  updateAmbience();
}

// ---------- a dig (daily or practice) ----------
function startDaily() {
  const d = today();
  let rec = save.days[d];
  if (rec?.done) { showResults({ mode: 'daily', day: d, qs: rec.qids.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean), answers: rec.answers, total: rec.total }, true); return; }
  let qs = dayQuestions(d);
  if (!rec) { rec = save.days[d] = { qids: qs.map(q => q.id), answers: [], cur: -1, done: false, total: 0 }; persist(); }
  else { const saved = rec.qids.map(id => QUESTIONS.find(q => q.id === id)); if (saved.every(Boolean)) qs = saved; } // keep the dig the player started
  // a prompt that was opened and left without an answer counts as missed: one dig, no second chances
  if (rec.cur >= 0 && rec.answers.length === rec.cur) { const q = qs[rec.cur]; rec.answers.push({ qid: q.id, text: '', t: 0, pts: 0 }); rec.cur = -1; persist(); }
  run = { mode: 'daily', day: d, qs, answers: rec.answers, total: rec.answers.reduce((s, a) => s + a.pts, 0), i: rec.answers.length };
  newWorld(d * 7919 + 13);
  if (run.total > 0) carveTo(yForPoints(run.total));
  begin();
}
function startPractice() {
  const daily = new Set(dayQuestions(today()).map(q => q.id));
  let pool = QUESTIONS.filter(q => !daily.has(q.id));
  if (pool.length < PER_DAY) pool = QUESTIONS.slice();
  const r = rng((Date.now() & 0xffffff) + 17);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  run = { mode: 'practice', qs: pool.slice(0, PER_DAY), answers: [], total: 0, i: 0 };
  newWorld((Date.now() & 0xfffffff) + 99);
  begin();
}
function begin() {
  goFull();
  $('modeTxt').textContent = run.mode === 'daily' ? 'חפירה #' + run.day : 'אימון';
  setPts(run.total);
  if (run.i >= PER_DAY) { finish(); return; }
  ask(true);
}
function goFull() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen && matchMedia('(pointer:coarse)').matches) {
    el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('portrait').catch(() => { })).catch(() => { });
  }
}

function ask(focus) {
  const q = run.qs[run.i];
  phase = 'ask'; show('sQ');
  slots(run.answers, run.i);
  $('qNum').textContent = `${run.i + 1}/${PER_DAY}`;
  $('qCount').textContent = `שאלה ${run.i + 1} מתוך ${PER_DAY}`;
  $('qCat').textContent = CAT[q.cat] || 'מיינקראפט';
  $('qText').textContent = q.q;
  $('askBox').classList.remove('hidden'); $('result').classList.add('hidden'); $('sQ').classList.remove('revealing');
  $('alts').classList.add('hidden'); $('bNext').classList.add('hidden');
  $('msg').textContent = ''; $('msg').className = 'msg';
  const ans = $('ans'); ans.value = ''; ans.disabled = false; $('bDig').disabled = false; $('ansForm').classList.remove('bad');
  $('timer').className = 'timer'; $('tFill').style.transform = 'scaleX(1)'; $('tNum').textContent = QTIME;
  if (run.mode === 'daily') { const rec = save.days[run.day]; rec.cur = run.i; persist(); }
  qStart = performance.now(); lastTick = 99;
  audio.play('ui_open', { vol: 0.7 });
  updateAmbience();
  if (focus) ans.focus({ preventScroll: true });
}

function submit() {
  if (phase !== 'ask') return;
  const ans = $('ans'), txt = ans.value.trim();
  const row = $('ansForm');
  if (!txt) { row.classList.remove('bad'); void row.offsetWidth; row.classList.add('bad'); ans.focus(); return; }
  const q = run.qs[run.i];
  const a = matchAnswer(q, txt);
  if (!a) {
    audio.play('wrong', { vol: 0.9 });
    row.classList.remove('bad'); void row.offsetWidth; row.classList.add('bad');
    $('msg').textContent = `"${txt}" לא מתאים לשאלה הזאת. נסו משהו אחר!`; $('msg').className = 'msg';
    ans.select(); ans.focus();
    return;
  }
  audio.play('submit', { vol: 0.9 });
  resolve(a, txt);
}

function timeUp() {
  if (phase !== 'ask') return;
  audio.play('time_up', { vol: 1, duck: 0.6 });
  resolve(null, $('ans').value.trim());
}

async function resolve(a, txt) {
  phase = 'reveal'; digging = true; fastForward = false;
  const ans = $('ans'); ans.disabled = true; $('bDig').disabled = true; ans.blur();
  document.body.classList.remove('kb', 'kbp');
  const q = run.qs[run.i];
  const t = a ? a.t : 0, pts = TIER_POINTS[t];
  const rec = { qid: q.id, text: txt, aid: a ? (a.en || a.he) : null, he: a ? a.he : '', t, pts };
  run.answers.push(rec); run.total += pts;
  if (run.mode === 'daily') { const r = save.days[run.day]; r.cur = -1; r.total = run.total; persist(); }
  // the result card
  $('askBox').classList.add('hidden'); $('result').classList.remove('hidden'); $('sQ').classList.add('revealing');
  const top = $('resTop'); top.className = 'resTop t' + t;
  $('resImg').src = t ? ICON[t] : ICON[1]; $('resImg').style.visibility = t ? 'visible' : 'hidden'; $('resImg').style.display = t ? '' : 'none';
  $('resTier').textContent = t ? `${TIER[t].name}!` : 'נגמר הזמן!';
  $('resLine').textContent = t ? TIER[t].line : (txt ? `"${txt}" לא נקלט בזמן` : 'הפעם בלי נקודות');
  $('resAns').innerHTML = a ? `התשובה שלכם: ${esc(a.he)}${enOf(a) ? `<bdi dir="ltr" class="en">${esc(enOf(a))}</bdi>` : ''}` : '';
  $('resPts').textContent = '+' + pts;
  // dig!
  const from = shownPts, target = yForPoints(run.total);
  const startStand = standY();
  const counting = (async () => {
    const steps = Math.max(1, Math.min(14, Math.round(pts / 8))), dur = Math.max(400, (startStand - target) * 170);
    for (let i = 1; i <= steps; i++) { await wait(dur / steps); setPts(from + pts * i / steps); if (pts) audio.play('coin', { vol: 0.45, minGap: 0.06 }); }
    setPts(run.total, true);
  })();
  await wait(250);
  await digTo(target);
  await counting;
  // the ore pops out
  if (t) {
    const m = view.miner;
    view.popItem(t, 0, standY() + 1.2);
    view.sparkle(0.5, standY() + 1.8, t);
    audio.play('ore_' + t, { vol: 1, duck: t >= 4 ? 0.55 : 0 });
    if (t >= 4) { view.shake = 0.5; m.celebrate = 1.2; }
    if (t === 5) { freeze(140); }
    if (target <= BEDROCK_STAND) { m.swing = m.swingDur = 0.25; setTimeout(() => { audio.play('dig_bedrock', { vol: 1 }); view.burst(0, BEDROCK_STAND + 0.8, 'bedrock', 10, 0.8); view.shake = 0.6; }, 160); }
    await wait(900);
    flyToSlot(t, run.i);
  } else {
    await wait(300);
    const s = $('slot' + run.i); if (s) { s.classList.add('miss'); s.classList.add('land'); }
  }
  // what else could have been said
  const rare = q.answers.filter(x => x.t >= 4 && x !== a);
  const r = rng(run.i * 31 + run.total + 7);
  rare.sort(() => r() - 0.5);
  const common = q.answers.filter(x => x.t === 1 && x !== a);
  const chip = x => `<span><img class="px" src="${ICON[x.t]}" alt=""><i>${esc(x.he)}${enOf(x) ? `<small dir="ltr">${esc(enOf(x))}</small>` : ''}</i></span>`;
  let html = '';
  if (rare.length) html += `<b>תשובות נדירות שהיו אפשריות:</b><div class="chipList">${rare.slice(0, 3).map(chip).join('')}</div>`;
  if (common.length && t !== 1) html += `<div class="common">הכי צפוי: <b>${common.map(x => esc(x.he) + (enOf(x) ? ` <small dir="ltr">(${esc(enOf(x))})</small>` : '')).join(', ')}</b></div>`;
  $('alts').innerHTML = html; $('alts').classList.toggle('hidden', !html);
  const last = run.i === PER_DAY - 1;
  $('bNext').textContent = last ? 'לתוצאה הסופית' : 'לשאלה הבאה';
  $('bNext').classList.remove('hidden');
  digging = false;
}
const normalizeLite = s => String(s).toLowerCase().replace(/\s/g, '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let frozenUntil = 0;
function freeze(ms) { frozenUntil = performance.now() + ms; }

function flyToSlot(t, i) {
  const f = view.floaters.find(x => !x.gone && x.tier === t); if (!f) return;
  const p = view.screenOf(f.x, f.y), slot = $('slot' + i); if (!slot) { f.gone = true; return; }
  const r = slot.getBoundingClientRect();
  const im = new Image(); im.src = ICON[t]; im.className = 'fly';
  im.style.left = (p.x - 22) + 'px'; im.style.top = (p.y - 22) + 'px';
  document.body.appendChild(im); f.gone = true;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    im.style.transform = `translate(${r.left + r.width / 2 - p.x}px, ${r.top + r.height / 2 - p.y}px) scale(.6)`;
  }));
  setTimeout(() => {
    im.remove(); slot.innerHTML = ''; const s = new Image(); s.src = ICON[t]; s.className = 'px'; slot.appendChild(s); slot.classList.add('got');
    slot.classList.remove('cur'); slot.classList.add('land'); audio.play('ui_click', { vol: 0.5, pitch: 1.3 });
  }, 720);
}

function next() {
  if (phase !== 'reveal' || digging) return;
  click();
  run.i++;
  if (run.i >= PER_DAY) finish(); else ask(true);
}

// ---------- results ----------
function finish() {
  if (run.mode === 'daily') {
    const r = save.days[run.day];
    if (!r.done) {
      r.done = true; r.total = run.total; r.y = yForPoints(run.total); r.cur = -1;
      save.streak = save.lastDone === run.day - 1 ? save.streak + 1 : 1; save.lastDone = run.day;
      persist();
    }
  } else if (save.bestPractice === null || run.total > save.bestPractice) { save.bestPractice = run.total; persist(); }
  showResults(run, false);
}
function showResults(r, quiet) {
  run = r; phase = 'results'; show('sRes');
  if (quiet) { newWorld(r.day * 7919 + 13); carveTo(yForPoints(r.total)); }
  slots(r.answers, -1); setPts(r.total);
  const y = yForPoints(r.total), perfect = r.total >= MAXPTS;
  $('resTitle').textContent = r.mode === 'daily' ? `חפירה יומית #${r.day}` : 'סיבוב אימון';
  $('resY').textContent = fmtY(y);
  $('resLayer').textContent = perfect ? 'בדרוק! חפירה מושלמת!' : layerAt(y).name;
  $('resTotal').innerHTML = `${r.total} נקודות מתוך ${MAXPTS}` + (r.mode === 'daily' ? `<em class="cdIn"> · הבאה: <b id="cd3">${hms(secsToNext())}</b></em>` : '');
  $('yTxt').textContent = fmtY(y); $('qNum').textContent = `${PER_DAY}/${PER_DAY}`; $('modeTxt').textContent = r.mode === 'daily' ? 'חפירה #' + r.day : 'אימון';
  $('resList').innerHTML = r.qs.map((q, i) => {
    const a = r.answers[i] || { t: 0, pts: 0 };
    // look the answer up again so saved digs show today's names
    const ans = a.t ? (q.answers.find(x => x.en === a.aid) || { he: a.he, en: a.aid }) : null;
    const name = ans ? `${esc(ans.he)}${enOf(ans) ? `<small dir="ltr">${esc(enOf(ans))}</small>` : ''}` : 'אין';
    return `<div class="li ${a.t ? '' : 'miss'}">${a.t ? `<img class="px" src="${ICON[a.t]}" alt="">` : '<img alt="" style="visibility:hidden">'}<span class="q">${esc(q.q)}</span><span class="a">${name}</span><span class="pt">+${a.pts}</span></div>`;
  }).join('');
  $('bAgain').textContent = r.mode === 'daily' ? 'אימון' : 'עוד סיבוב';
  const meta = [];
  if (r.mode === 'daily') { meta.push(`<span>רצף: <b>${save.streak}</b> ${save.streak === 1 ? 'יום' : 'ימים'}</span>`); meta.push(`<span>החפירה הבאה בעוד <b id="cd2">${hms(secsToNext())}</b></span>`); }
  else meta.push(`<span>שיא באימון: <b>${save.bestPractice ?? r.total}</b></span>`);
  $('resMeta').innerHTML = meta.join('');
  updateAmbience();
  if (!quiet) {
    audio.stinger(perfect ? 'stinger_perfect' : 'stinger_results');
    if (r.mode === 'daily' && save.streak > 1) setTimeout(() => { audio.play('streak', { vol: 0.9 }); toast(`רצף של ${save.streak} ימים!`); }, perfect ? 6800 : 4600);
    view.miner.celebrate = 2.5;
    view.sparkle(0.5, standY() + 2, perfect ? 5 : 4);
  }
}
function shareText() {
  const r = run, y = yForPoints(r.total);
  const row = r.qs.map((_, i) => TIER[(r.answers[i] || {}).t || 0].emoji).join('');
  const head = r.mode === 'daily' ? `⛏️ כורה נדיר · חפירה #${r.day}` : '⛏️ כורה נדיר · אימון';
  return `${head}\n${row}\nהגעתי ל־⁦${fmtY(y)}⁩ (${layerAt(y).name}) · ${r.total} נקודות\n${GAME_URL}`;
}
async function share() {
  click();
  const text = shareText();
  if (navigator.share && matchMedia('(pointer:coarse)').matches) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); audio.play('copy', { vol: 0.8 }); toast('הועתק! הדביקו בוואטסאפ'); }
  catch (e) { prompt('העתיקו את התוצאה:', text); }
}

// ---------- settings ----------
function applyVol() { Object.assign(audio.vol, save.vol); audio.applyVolumes(); $('bMute').textContent = save.vol.muted ? 'החזרת הצלילים' : 'השתקת הכל'; }
$('vMusic').value = save.vol.music; $('vSfx').value = save.vol.sfx; applyVol();
$('vMusic').addEventListener('input', e => { save.vol.music = +e.target.value; applyVol(); persist(); });
$('vSfx').addEventListener('input', e => { save.vol.sfx = +e.target.value; applyVol(); persist(); audio.play('ui_click', { minGap: 0.12 }); });
press($('bMute'), () => { save.vol.muted = !save.vol.muted; applyVol(); persist(); });
press($('bSound'), () => { click(); $('settings').classList.toggle('hidden'); });
document.addEventListener('pointerdown', e => { const s = $('settings'); if (!s.classList.contains('hidden') && !s.contains(e.target) && !$('bSound').contains(e.target)) s.classList.add('hidden'); });

// ---------- wiring ----------
const legendHTML = [1, 2, 3, 4, 5].map(t => `<span><img class="px" src="${ICON[t]}" alt="">${TIER_POINTS[t]}</span>`).join('');
$('qLegend').innerHTML = legendHTML; $('tLegend').innerHTML = legendHTML;
$('tierLegend').innerHTML = [1, 2, 3, 4, 5].map(t => `<div class="tier"><img class="px" src="${ICON[t]}" alt=""><span>${TIER[t].name}</span><b>${TIER_POINTS[t]}</b></div>`).join('');
const firstTap = () => { audio.unlock().then(updateAmbience); };
document.addEventListener('pointerdown', firstTap, { once: true, capture: true });
document.addEventListener('keydown', firstTap, { once: true, capture: true });
press($('bDaily'), () => { click(); if (!save.howSeen && !save.days[today()]) { save.howSeen = true; persist(); afterHow = startDaily; phase = 'how'; show('sHow'); return; } startDaily(); });
press($('bPractice'), () => { click(); startPractice(); });
let afterHow = null;
press($('bHow'), () => { click(); afterHow = null; phase = 'how'; show('sHow'); });
press($('bHowOk'), () => { click(); if (afterHow) { const f = afterHow; afterHow = null; f(); } else { phase = 'title'; show('sTitle'); } });
$('ansForm').addEventListener('submit', e => { e.preventDefault(); submit(); });
$('bDig').addEventListener('pointerdown', e => e.preventDefault()); // keep the phone keyboard open on a miss
$('ans').addEventListener('input', () => { audio.play('type_key', { vol: 0.6, minGap: 0.035, jitter: 0.1 }); if ($('msg').textContent) $('msg').textContent = ''; });
$('ans').addEventListener('focus', onVV); $('ans').addEventListener('blur', () => setTimeout(onVV, 50));
press($('bNext'), next);
press($('bShare'), share);
press($('bAgain'), () => { click(); startPractice(); });
press($('bHome'), () => { click(); goTitle(); });
canvas.addEventListener('pointerdown', () => { if (digging) fastForward = true; });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && phase === 'reveal' && !digging && document.activeElement !== $('ans')) { e.preventDefault(); next(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) audio.suspend(); else audio.resume(); });

// the card sits above the phone keyboard while typing
function onVV() {
  const vv = window.visualViewport; if (!vv) return;
  const root = document.documentElement.style;
  root.setProperty('--vvh', vv.height + 'px'); root.setProperty('--vvt', vv.offsetTop + 'px');
  const typing = document.activeElement === $('ans') && phase === 'ask';
  // upright: the card rides on top of the keyboard (the layout viewport keeps its height)
  root.setProperty('--kbb', Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px');
  document.body.classList.toggle('kbp', UPRIGHT.matches && typing && vv.height < window.innerHeight * 0.8);
  document.body.classList.toggle('kb', !UPRIGHT.matches && typing && vv.height < 250);
}
window.visualViewport?.addEventListener('resize', onVV); window.visualViewport?.addEventListener('scroll', onVV);

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (now < frozenUntil) dt = 0;
  if (fastForward && digging) dt *= 2;
  view.resize();
  view.uiScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
  // keep the shaft in the open part of the screen: left of the card when sideways, above it when upright
  const pr = $('panel').getBoundingClientRect(), W = canvas.clientWidth, H = canvas.clientHeight;
  const fr = $('frameIn').getBoundingClientRect(); view.safeLeft = fr.left || 0;
  const topB = document.body.classList.contains('notop') ? (fr.top || 0) + 12 : $('top').getBoundingClientRect().bottom + 8;
  let fx, fy;
  if (UPRIGHT.matches) {
    const bottom = Math.max(topB + 80, pr.top - 10);
    fx = 0.6; fy = Math.max(0.08, Math.min(0.62, (topB + (bottom - topB) * 0.62 + 10) / H)); // feet a bit below the middle, so the head shows
    view.gaugeBottom = bottom;
  } else {
    const free = document.body.classList.contains('kb') ? W : Math.max(120, pr.left - fr.left);
    fx = Math.max(0.16, Math.min(0.5, (fr.left + free * 0.6) / W)); fy = 0.42;
    view.gaugeBottom = (fr.bottom || H) - 12;
  }
  // ease towards the new framing so the shaft glides when the card grows or shrinks
  const kf = view.framed ? 1 - Math.pow(0.002, dt) : 1; view.framed = true;
  view.focusX += (fx - view.focusX) * kf; view.focusY += (fy - view.focusY) * kf;
  view.gaugeTop = topB;
  view.update(dt); view.draw();
  if (phase === 'ask') {
    const left = Math.max(0, QTIME - (now - qStart) / 1000);
    $('tFill').style.transform = `scaleX(${left / QTIME})`;
    const s = Math.ceil(left); $('tNum').textContent = s;
    $('timer').className = 'timer' + (left <= 5 ? ' hot' : left <= 10 ? ' warn' : '');
    if (s !== lastTick && s <= 10 && s > 0) { lastTick = s; audio.play(s <= 5 ? 'tick_hi' : 'tick', { vol: s <= 5 ? 0.8 : 0.6, jitter: 0.02 }); }
    if (left <= 0) timeUp();
  }
  if (phase === 'ask' || phase === 'reveal') $('yTxt').textContent = fmtY(Math.round(view.miner.y) - 1);
  const cd = $('cd') || $('cd2'), cd3 = $('cd3'); if (cd3 && (now | 0) % 500 < 20) cd3.textContent = hms(secsToNext()); if (cd && (now | 0) % 500 < 20) cd.textContent = hms(secsToNext());
}

// ---------- boot ----------
(async () => {
  const bar = $('loadBar');
  bar.style.width = '30%';
  await Promise.race([audio.preload(), new Promise(r => setTimeout(r, 9000))]);
  bar.style.width = '100%';
  try { await document.fonts.ready; } catch (e) { }
  goTitle();
  const ld = $('loading'); ld.style.opacity = '0'; setTimeout(() => ld.remove(), 400);
  requestAnimationFrame(frame);
  // debug/test hook (used by the automated checks)
  window.__rm = { view, audio, get run() { return run; }, get phase() { return phase; }, dayQuestions, yForPoints, today };
})();
