// סערת כוחות - main: boot, input, HUD, level flow, powers, interactables, camera.
import * as THREE from 'three';
import { Assets, COMMON, THEME_MODELS, Anim, node } from './assets.js';
import { makeRenderer, makeScene, buildLevel, iceSlab, WATER_Y, ICE_TOP } from './world.js';
import { FX, IceBeam, C } from './fx.js';
import { Player, Bot, Drone, Brute, Boss, Fireball, EnemyShot, BossGear, GRAV, floorAt } from './actors.js';
import { LEVELS, POWERS, HINTS } from './levels.js';
import { Audio } from './audio.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const isPC = matchMedia('(hover:hover) and (pointer:fine)').matches;
const SAVE_KEY = 'power-storm-v1';

// ================================================================ save
function loadSave() {
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
  s = Object.assign({ powers: { fire: false, wind: false, ice: false, bolt: false }, unlocked: 1, stars: {}, best: {}, vol: { music: .8, sfx: .8, muted: false }, done: false }, s || {});
  if (location.hash.includes('all')) { s.unlocked = 6; s.powers = { fire: true, wind: true, ice: true, bolt: true }; }
  return s;
}
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { } }

// ================================================================ input
class Input {
  constructor() {
    this.keys = new Set(); this.prev = new Set();
    this.btn = { punch: false, jump: false, fire: false, ice: false, bolt: false, storm: false };
    this.btnPrev = { ...this.btn };
    this.stick = { x: 0, y: 0, id: null };
    addEventListener('keydown', e => { if (e.repeat) return; this.keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); for (const k in this.btn) this.btn[k] = false; this.stick.x = 0; });
    // joystick (left thumb): horizontal run, pull down to drop through thin platforms
    const zone = $('stickZone'), stick = $('stick'), knob = $('knob');
    const R = 46;
    const move = (e) => {
      const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick.x = clamp(dx / (R * .72), -1, 1); this.stick.y = clamp(-dy / (R * .72), -1, 1);
    };
    zone.addEventListener('pointerdown', e => { if (this.stick.id != null) return; this.stick.id = e.pointerId; zone.setPointerCapture(e.pointerId); stick.classList.add('on'); move(e); window.__audioUnlock?.(); });
    zone.addEventListener('pointermove', e => { if (e.pointerId === this.stick.id) move(e); });
    const end = e => { if (e.pointerId !== this.stick.id) return; this.stick.id = null; this.stick.x = this.stick.y = 0; knob.style.transform = ''; stick.classList.remove('on'); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
    // action buttons (multi-touch: each button tracks its own pointer)
    const bind = (id, key) => {
      const el = $(id);
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); this.btn[key] = true; el.classList.add('down'); window.__audioUnlock?.(); });
      const up = () => { this.btn[key] = false; el.classList.remove('down'); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    };
    bind('bPunch', 'punch'); bind('bJump', 'jump'); bind('bFire', 'fire'); bind('bIce', 'ice'); bind('bBolt', 'bolt'); bind('bStorm', 'storm');
  }
  k(...codes) { return codes.some(c => this.keys.has(c)); }
  kp(...codes) { return codes.some(c => this.keys.has(c) && !this.prev.has(c)); }
  read() {
    const b = this.btn, p = this.btnPrev;
    let x = this.stick.x; if (this.k('ArrowLeft', 'KeyA')) x = -1; if (this.k('ArrowRight', 'KeyD')) x = 1;
    if (this.k('ArrowLeft', 'KeyA') && this.k('ArrowRight', 'KeyD')) x = 0;
    let y = this.stick.y; if (this.k('ArrowDown', 'KeyS')) y = -1;
    const jumpHeld = b.jump || this.k('Space', 'ArrowUp', 'KeyW');
    const punchHeld = b.punch || this.k('KeyJ', 'KeyZ');
    const o = {
      x: Math.abs(x) < .18 ? 0 : x, y,
      jumpHeld, jumpPressed: (b.jump && !p.jump) || this.kp('Space', 'ArrowUp', 'KeyW'),
      punchHeld, punchPressed: (b.punch && !p.punch) || this.kp('KeyJ', 'KeyZ'),
      fire: (b.fire && !p.fire) || this.kp('KeyK', 'KeyX', 'Digit1'),
      ice: b.ice || this.k('KeyL', 'KeyC', 'Digit2'),
      bolt: (b.bolt && !p.bolt) || this.kp('KeyI', 'KeyV', 'Digit3'),
      storm: (b.storm && !p.storm) || this.kp('KeyQ', 'KeyB', 'Digit4'),
      pause: this.kp('Escape', 'KeyP'),
    };
    this.prev = new Set(this.keys); this.btnPrev = { ...b };
    return o;
  }
}

// ================================================================ UI (DOM)
class UI {
  constructor(g) {
    this.g = g; this.hintTimer = 0; this.shown = new Set();
    this.heartsEl = $('hearts');
  }
  hearts(hit) {
    const g = this.g; let h = '';
    for (let i = 0; i < g.maxHearts; i++) h += `<svg viewBox="0 0 24 24" fill="${i < g.hearts ? '#d8433b' : '#e4cfa6'}" stroke="${i < g.hearts ? '#8d1f17' : '#c4ae86'}" stroke-width="1.4"><use href="#iHeart"/></svg>`;
    this.heartsEl.innerHTML = h;
    if (hit) { this.heartsEl.classList.remove('hit'); void this.heartsEl.offsetWidth; this.heartsEl.classList.add('hit'); }
  }
  coins() { const el = $('coins'); $('coinN').textContent = this.g.coins; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  meters() {
    const g = this.g;
    $('energy').firstElementChild.style.transform = `scaleX(${g.energy / 100})`;
    $('energy').classList.toggle('low', g.energy < 20);
    const anyPower = g.save.powers.fire || g.save.powers.wind;
    $('stormRow').classList.toggle('hidden', !anyPower);
    $('storm').firstElementChild.style.transform = `scaleX(${g.storm})`;
    $('storm').classList.toggle('full', g.storm >= 1);
    $('bStorm').classList.toggle('hidden', !(g.storm >= 1 && anyPower));
    const P = g.player, pw = g.save.powers;
    const ring = (id, cd, max, cost) => { const el = $(id); const c = el.querySelector('.ring circle'); if (c) c.style.strokeDashoffset = cd > 0 ? 100 - (cd / max) * 100 : 100; el.classList.toggle('cool', cd > 0); el.classList.toggle('noen', cd <= 0 && g.energy < cost); };
    if (P) {
      ring('bFire', P.castCd, .42, 18); ring('bBolt', P.boltCd, .65, 24); ring('bIce', 0, 1, 4);
      const flyMode = pw.wind && !P.grounded && !P.dead;
      if (flyMode !== this.flyMode) { this.flyMode = flyMode; $('bJump').classList.toggle('fly', flyMode); $('jumpLbl').textContent = flyMode ? 'תעופה' : 'קפיצה'; $('jumpIco').setAttribute('href', flyMode ? '#iWing' : '#iJump'); }
    }
  }
  powers() {
    const p = this.g.save.powers;
    $('bFire').classList.toggle('hidden', !p.fire); $('bIce').classList.toggle('hidden', !p.ice); $('bBolt').classList.toggle('hidden', !p.bolt);
  }
  charging(on) { $('bPunch').classList.toggle('charging', on); $('punchLbl').textContent = on ? 'שחררו!' : 'אגרוף'; }
  hint(key, dur = 6) {
    const h = HINTS[key] || (typeof key === 'object' ? key : null); if (!h) return;
    $('hintT').innerHTML = isPC ? (h.pc || h.t) : h.t;
    $('hint').classList.remove('off'); this.hintTimer = dur;
  }
  hintOnce(key) { if (this.shown.has(key)) return; this.shown.add(key); this.hint(EXTRA[key] || key, 6); }
  update(dt) { if (this.hintTimer > 0) { this.hintTimer -= dt; if (this.hintTimer <= 0) $('hint').classList.add('off'); } }
  pop(text, warn) { const d = document.createElement('div'); d.className = 'pop' + (warn ? ' warn' : ''); d.innerHTML = text; $('pops').appendChild(d); setTimeout(() => d.remove(), 1800); }
  banner(big, small = '') { $('banner').innerHTML = `<div>${big}${small ? `<small>${small}</small>` : ''}</div>`; }
  boss(f) { $('bossBar').querySelector('i').style.transform = `scaleX(${Math.max(0, f)})`; }
  flash(op = .8, dur = 300) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = op; void f.offsetWidth; f.style.transition = `opacity ${dur}ms ease-out`; f.style.opacity = 0; }
}
const EXTRA = {
  shield: { t: 'המגן חוסם! <b>החזיקו אגרוף</b> לאגרוף־על, או ברק, כדי לשבור אותו', pc: 'המגן חוסם! <b>החזיקו J</b> לאגרוף־על, או ברק (I)' },
  barricade: { t: 'מחסום עץ. צריך <b>אש</b> כדי לשרוף אותו', pc: 'מחסום עץ. <b>אש (K)</b> שורפת אותו' },
  gate: { t: 'שער נעול. מפעילים את <b>הגנרטור</b> עם ברק', pc: 'שער נעול. <b>ברק (I)</b> על הגנרטור' },
  gen: { t: 'גנרטור! רק <b>ברק</b> מפעיל אותו', pc: 'רק <b>ברק (I)</b> מפעיל גנרטור' },
  wall: { t: 'הקיר חזק. <b>החזיקו אגרוף</b> ושחררו לאגרוף־על', pc: '<b>החזיקו J</b> ושחררו לאגרוף־על' },
  energy: { t: 'אין מספיק אנרגיה. היא מתמלאת לבד בעוד רגע', pc: 'אין מספיק אנרגיה. היא מתמלאת לבד' },
  bossCore: { t: 'השריון חזק מדי! חכו שהחזה של המלך <b>ייפתח</b>, או פגעו בו פעמיים <b>בברק</b>', pc: 'חכו שהחזה ייפתח, או פגעו פעמיים <b>בברק (I)</b>' },
  bossOpen: { t: 'הלב גלוי! <b>קפצו ועופו</b> אליו, זרקו אש, ו<b>קרח</b> משאיר אותו פתוח יותר', pc: 'הלב גלוי! עופו אליו, אש (K), וקרח (L) משאיר אותו פתוח' },
  storm: { t: 'מד הסערה מלא! לחצו על <b>סערה</b> לכל הכוחות ביחד', pc: 'מד הסערה מלא! <b>Q</b> לסערת כוחות' },
};

// ================================================================ game
class Game {
  constructor() {
    this.canvas = $('c');
    this.renderer = makeRenderer(this.canvas);
    this.env = makeScene(this.renderer); this.scene = this.env.scene;
    this.camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.3, 600);
    this.fx = new FX(this.scene); this.beam = new IceBeam(this.scene);
    this.audio = new Audio(); this.input = new Input(); this.ui = new UI(this);
    this.save = loadSave(); this.audio.vol = { ...this.save.vol };
    this.clock = new THREE.Clock(); this.mode = 'loading';
    this.objects = []; this.enemies = []; this.shots = []; this.conveyors = []; this.timers = [];
    this.camPos = new THREE.Vector3(0, 3, 15); this.camLook = new THREE.Vector3(0, 2, 0);
    this.shakeAmt = 0; this.stopT = 0; this.hearts = 5; this.maxHearts = 5; this.energy = 100; this.energyIdle = 0; this.storm = 0; this.coins = 0;
    addEventListener('resize', () => this.resize()); this.resize();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (this.mode === 'play') this.pause(); this.audio.suspend(); } else if (this.mode !== 'pause') this.audio.resume(); });
    window.__audioUnlock = () => {
      if (this._unlocking) { this.audio.resume(); return; }
      this._unlocking = true;
      this.audio.unlock().then(() => { this.audio.applyVolumes(); this.audio.musicState = undefined; this.music(this.wantMusic); if (this.wantAmb) this.audio.setAmbience(this.wantAmb); }).catch(() => { this._unlocking = false; });
    };
    addEventListener('pointerdown', window.__audioUnlock, { capture: true });
    addEventListener('keydown', window.__audioUnlock, { capture: true });
    window.__game = this;
    this.boot();
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
  }

  async boot() {
    const fill = $('loadfill'); let pm = 0, pa = 0;
    const upd = () => { fill.style.width = `${Math.round((pm * .8 + pa * .2) * 100)}%`; };
    const audioP = this.audio.preload().then(() => { pa = 1; upd(); });
    await Assets.load([...COMMON, ...THEME_MODELS.town], p => { pm = p; upd(); });
    await audioP;
    if (Assets.missing.length) console.warn('missing models:', Assets.missing.join(', '));
    $('loadtxt').classList.add('hidden'); $('loadbar').classList.add('hidden'); $('tbtns').classList.remove('hidden');
    $('bPlay').onclick = () => { this.audio.play('ui_click'); this.goFullscreen(); this.showMap(); };
    $('bOpts').onclick = () => { this.audio.play('ui_click'); this.showOptions(true); };
    $('bPause').onclick = () => this.pause();
    this.titleScene();
    const m = location.hash.match(/lv=(\d)/); if (m) { $('title').classList.add('hidden'); this.startLevel(+m[1]); }
    this.renderer.setAnimationLoop(() => this.frame());
  }
  goFullscreen() {
    if (isPC) return;
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
    Promise.resolve(p).then(() => screen.orientation?.lock?.('landscape')).catch(() => { });
  }

  // ------------------------------------------------------------ title backdrop
  titleScene() {
    this.mode = 'title';
    this.loadWorld(LEVELS[0]);
    this.player = new Player(this); this.scene.add(this.player.model);
    this.player.reset(-6.9, 0); this.player.facing = 1; this.player.anim.play('idle');
    const bots = [new Bot(this, -1.4, 0, { range: [-1.4, -1.4] }), new Drone(this, -.2, 2.35, { range: [-.2, -.2] })];
    for (const b of bots) { this.scene.add(b.model); this.enemies.push(b); }
    this.titleT = 0;
    this.music('music_title');
  }

  // ------------------------------------------------------------ level lifecycle
  clearWorld() {
    this.audio.loopsStopAll?.();
    for (const o of this.objects) { o.loop?.stop(); o.dispose?.(); }
    for (const e of this.enemies) { e.buzz?.stop(); e.whirr?.stop(); if (e.shell) this.scene.remove(e.shell); this.scene.remove(e.model); }
    for (const s of this.shots) { s.whirr?.stop?.(); if (s.mesh) this.scene.remove(s.mesh); }
    if (this.player) { this.player.stopLoops(); this.scene.remove(this.player.model); }
    if (this.world) this.scene.remove(this.world.group);
    this.objects = []; this.enemies = []; this.shots = []; this.conveyors = [];
    this.fx.clear(); this.beam.mesh.visible = false;
  }
  loadWorld(L) {
    this.clearWorld();
    Assets.release([...COMMON, ...THEME_MODELS[L.theme]]);
    this.L = L; this.world = buildLevel(L); this.scene.add(this.world.group);
    this.env.setSky(L.sky);
    for (const p of L.pieces) if (p.t === 'conveyor') this.conveyors.push({ x: p.x, y: 0, dir: p.dir });
  }
  async startLevel(id, fromCheckpoint = null) {
    const L = LEVELS[id - 1];
    const need = THEME_MODELS[L.theme].filter(n => !Assets.has(n) && !Assets.missing.includes(n));
    if (need.length) {
      const f = $('fade'); f.textContent = 'טוען את השלב… 0%'; f.style.opacity = 1; f.style.pointerEvents = 'auto';
      $('overlay').classList.add('hidden'); this.mode = 'loading';
      await Assets.load(need, p => { f.textContent = `טוען את השלב… ${Math.round(p * 100)}%`; });
      f.style.opacity = 0; f.style.pointerEvents = 'none'; setTimeout(() => { if (f.style.opacity === '0') f.textContent = ''; }, 700);
    }
    $('overlay').classList.add('hidden'); $('title').classList.add('hidden');
    this.loadWorld(L);
    this.mode = 'play'; this.levelT = 0; this.ui.shown = new Set(); this.session = (this.session || 0) + 1;
    this.hearts = this.maxHearts; this.energy = 100; this.storm = fromCheckpoint ? this.storm : 0; this.coins = 0;
    this.stats = { hurt: 0, coinsTotal: 0, start: performance.now() };
    this.checkpoint = fromCheckpoint;
    this.player = new Player(this); this.scene.add(this.player.model);
    const sp = fromCheckpoint || { x: L.spawn[0], y: L.spawn[1] };
    this.player.reset(sp.x, sp.y + .05);
    this.spawnPieces(L, fromCheckpoint);
    this.hintsLeft = L.pieces.filter(p => p.t === 'hint' && (!fromCheckpoint || p.x > fromCheckpoint.x));
    $('hud').classList.remove('hidden'); $('controls').classList.remove('hidden');
    if (L.prize) { this.save.prizeTries = (this.save.prizeTries || 0) + 1; writeSave(this.save); }
    $('lvlChip').textContent = L.prize ? `${L.name} · ניסיון ${this.save.prizeTries}` : `${L.id}. ${L.name}`;
    $('bossBar').classList.toggle('hidden', !L.boss); document.body.classList.toggle('boss', !!L.boss);
    this.ui.hearts(); this.ui.powers(); this.ui.meters(); $('coinN').textContent = 0;
    this.music(L.boss || L.prize ? 'music_boss' : 'music_level');
    const amb = {}; for (const a of ['amb_town', 'amb_roof', 'amb_canal', 'amb_factory', 'amb_tower']) amb[a] = a === L.amb ? 1 : 0; this.wantAmb = amb; this.audio.setAmbience(amb);
    if (!fromCheckpoint) this.ui.banner(L.boss ? 'קרב אחרון!' : L.prize ? 'שלב הפרס' : `שלב ${L.id}`, L.boss ? 'הכו בלב שלו כשהחזה נפתח' : L.prize ? 'השלב הבלתי אפשרי' : L.name);
    this.camSnap = true;
    if (L.boss) this.bossIntro();
  }
  spawnPieces(L, cp) {
    for (const p of L.pieces) {
      const behind = cp && p.x < cp.x - 1;
      switch (p.t) {
        case 'bot': if (!behind) this.addEnemy(new Bot(this, p.x, p.y ?? 0, p)); break;
        case 'drone': if (!behind) this.addEnemy(new Drone(this, p.x, p.y, p)); break;
        case 'brute': if (!behind) this.addEnemy(new Brute(this, p.x, p.y ?? 0, p)); break;
        case 'coin': this.stats.coinsTotal++; if (!behind) this.addCoin(p.x, p.y); break;
        case 'heart': if (!behind) this.addHeart(p.x, p.y); break;
        case 'crystal': this.addCrystal(p); break;
        case 'barricade': this.addBarricade(p, behind && this.save.powers.fire); break;
        case 'crackwall': this.addCrackwall(p); break;
        case 'gen': this.addGenerator(p); break;
        case 'gate': this.addGate(p); break;
        case 'lift': this.addLift(p); break;
        case 'vent': this.addVent(p); break;
        case 'check': this.addCheckpoint(p, cp && Math.abs(cp.x - p.x) < .1); break;
        case 'exit': this.addExit(p); break;
        case 'prize': this.addPrize(p); break;
        case 'gearrain': this.addGearRain(p); break;
      }
    }
  }
  addEnemy(e) { this.scene.add(e.model); this.enemies.push(e); return e; }

  // ------------------------------------------------------------ interactables
  obj(o) { this.objects.push(o); if (o.model) this.scene.add(o.model); return o; }
  model(name, x, y, z = 0, s = 1) { const m = Assets.clone(name); m.position.set(x, y, z); m.scale.setScalar(s); return m; }
  addCoin(x, y, vx = 0, vy = 0, drop = false) {
    const m = this.model('gear_coin', x, y, .1); const s = Assets.size('gear_coin'); m.scale.setScalar(.56 / (Math.max(s.x, s.y) || .3));
    m.traverse(o => { if (o.isMesh) o.castShadow = false; });
    return this.obj({ type: 'coin', x, y, vx, vy, drop, model: m, t: rnd(0, 6), age: 0,
      update(dt, g) {
        this.t += dt; this.age += dt; const p = g.player;
        if (this.drop && this.age < 4) { this.vy += GRAV * .7 * dt; this.x += this.vx * dt; this.y += this.vy * dt; const fl = g.floorBelow(this.x, this.y); if (fl != null && this.y < fl + .35) { this.y = fl + .35; this.vy = Math.abs(this.vy) > 2 ? -this.vy * .45 : 0; this.vx *= .7; } }
        const dx = p.x - this.x, dy = p.cy - this.y, d = Math.hypot(dx, dy);
        if (!p.dead && d < 1.6 && this.age > .25) { this.x += dx * Math.min(1, dt * 12); this.y += dy * Math.min(1, dt * 12); }
        if (!p.dead && d < .55 && this.age > .25) { g.collectCoin(this); return false; }
        if (this.drop && this.age > 12) return false;
        this.model.position.set(this.x, this.y + Math.sin(this.t * 3) * .06, .1); this.model.rotation.y = this.t * 3;
        return true;
      } });
  }
  addHeart(x, y) {
    const m = this.model('heart', x, y, .1); const s = Assets.size('heart'); m.scale.setScalar(.55 / (Math.max(s.x, s.y) || .4));
    return this.obj({ type: 'heart', x, y, model: m, t: 0, update(dt, g) {
      this.t += dt; this.model.position.y = this.y + Math.sin(this.t * 2.6) * .1; this.model.rotation.y = Math.sin(this.t * 1.5) * .6;
      const p = g.player; if (!p.dead && Math.abs(p.x - this.x) < .7 && Math.abs(p.cy - this.y) < 1.1) {
        if (g.hearts < g.maxHearts) { g.hearts++; g.ui.hearts(); g.audio.play('heart'); g.fx.magic(this.x, this.y, [1, .7, .6], [.85, .25, .2], 20); g.ui.pop('+ לב'); return false; }
      }
      return true; } });
  }
  addCrystal(p) {
    if (this.save.powers[p.p]) return; // already earned
    const ped = this.model('pedestal', p.x, 0); this.scene.add(ped);
    const pedTop = Assets.size('pedestal').y || 1;
    const name = { fire: 'crystal_fire', wind: 'crystal_wind', ice: 'crystal_ice', bolt: 'crystal_bolt' }[p.p];
    const groundY = this.floorBelow(p.x, 3) ?? 0; ped.position.y = groundY;
    const m = this.model(name, p.x, groundY + pedTop + .3, .05);
    const light = new THREE.PointLight(0xffffff, 0, 6, 2);
    light.color.set(POWERS[p.p].col[1]); light.position.set(p.x, groundY + pedTop + .8, 1); this.scene.add(light);
    return this.obj({ type: 'crystal', p: p.p, x: p.x, y: groundY + pedTop + .3, model: m, t: 0, ped, light,
      dispose() { },
      update(dt, g) {
        this.t += dt; this.model.position.y = this.y + Math.sin(this.t * 2) * .12; this.model.rotation.y += dt * 1.2;
        this.light.intensity = 3 + Math.sin(this.t * 3) * .8;
        if (Math.random() < .3) { const c = new THREE.Color(POWERS[this.p].col[0]); g.fx.add.emit({ x: this.x + rnd(-.5, .5), y: this.y + rnd(-.5, .5), z: .3, vy: rnd(.3, .9), life: .8, size: .12, c0: [c.r, c.g, c.b], c1: [c.r * .6, c.g * .6, c.b * .6] }); }
        const pl = g.player; if (!pl.dead && Math.abs(pl.x - this.x) < 1.2 && pl.y < this.y + 6 && pl.y > this.y - 2.5) { g.getPower(this); return false; }
        return true;
      } });
  }
  addBarricade(p, preBurnt) {
    const y = this.floorBelow(p.x, p.y + 1) ?? p.y;
    if (preBurnt) { this.scene.add(this.model('barricade_burnt', p.x, y)); return; }
    const m = this.model('barricade', p.x, y);
    const solid = { x0: p.x - .55, x1: p.x + .55, y0: y, y1: y + 2.4, kind: 'barricade' }; this.world.solids.push(solid);
    return this.obj({ type: 'barricade', x: p.x, y, model: m, solid, state: 'ok', t: 0,
      burn(g) { if (this.state !== 'ok') return; this.state = 'burning'; this.t = 0; this.loop = g.audio.loop('burn_loop', { pos: new THREE.Vector3(this.x, this.y + 1, 0), vol: .9 }); },
      update(dt, g) {
        if (this.state === 'burning') {
          this.t += dt; for (let i = 0; i < 3; i++) g.fx.burning(this.x, this.y, 1.4, 2.4);
          this.model.traverse(o => { if (o.isMesh && o.material.color) o.material.color.multiplyScalar(1 - dt * .5); });
          if (this.t > 1.3) {
            this.state = 'gone'; this.solid.off = true; this.loop?.stop(.6); g.scene.remove(this.model);
            this.model = g.model('barricade_burnt', this.x, this.y); g.scene.add(this.model);
            g.audio.play('barricade_break', { pos: new THREE.Vector3(this.x, this.y + 1, 0) }); g.fx.smoke(this.x, this.y + 1, 14, 1.4); g.fx.sparks(this.x, this.y + 1, 20, 1.57, 2); g.shake(.2);
          }
        }
        return true;
      } });
  }
  addCrackwall(p) {
    const y = this.floorBelow(p.x, p.y + 1) ?? p.y;
    const m = this.model('crackwall', p.x, y);
    const solid = { x0: p.x - .75, x1: p.x + .75, y0: y, y1: y + 3, kind: 'wall' }; this.world.solids.push(solid);
    return this.obj({ type: 'crackwall', x: p.x, y, model: m, solid, broken: false, chunks: [],
      smash(g, dir) {
        if (this.broken) return; this.broken = true; this.solid.off = true; g.scene.remove(this.model);
        g.audio.play('wall_break', { pos: new THREE.Vector3(this.x, this.y + 1.5, 0) }); g.shake(.5); g.hitstop(.07); g.fx.dust(this.x, this.y + .5, 20, 1.6); g.fx.smoke(this.x, this.y + 1.5, 10, 1.6, false);
        for (let i = 0; i < 10; i++) { const c = g.model('crackwall_chunk', this.x + rnd(-.5, .5), this.y + rnd(.3, 2.7), rnd(-.3, .4), rnd(.6, 1.1)); c.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); g.scene.add(c); this.chunks.push({ m: c, vx: dir * rnd(2, 7), vy: rnd(1, 7), vr: rnd(-8, 8), t: 0 }); }
      },
      update(dt, g) {
        for (const c of this.chunks) {
          c.t += dt; c.vy += GRAV * dt; c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.rotation.x += c.vr * dt;
          if (c.m.position.y < this.y + .2) { c.m.position.y = this.y + .2; c.vy = Math.abs(c.vy) > 2 ? -c.vy * .35 : 0; c.vx *= .6; c.vr *= .5; }
          if (c.t > 2.4) { const k = Math.max(0, 1 - (c.t - 2.4) * 2); c.m.scale.setScalar(k * c.m.scale.x / Math.max(k, .001) * k || .001); }
        }
        if (this.chunks.length && this.chunks.every(c => c.t > 2.9)) { for (const c of this.chunks) g.scene.remove(c.m); this.chunks = []; }
        return true;
      },
      dispose() { for (const c of this.chunks) window.__game.scene.remove(c.m); } });
  }
  addGenerator(p) {
    const y = this.floorBelow(p.x, (p.y ?? 0) + 1) ?? 0;
    const m = this.model('generator', p.x, y);
    const anim = new Anim(m, Assets.anims('generator')); anim.play('off');
    return this.obj({ type: 'gen', id: p.id, x: p.x, y, model: m, anim, on: false,
      power(g) {
        if (this.on) return; this.on = true; this.anim.play('on', { fade: .3 });
        g.audio.play('generator_on', { pos: new THREE.Vector3(this.x, this.y + 1, 0) }); this.loop = g.audio.loop('generator_loop', { pos: new THREE.Vector3(this.x, this.y + 1, 0), vol: .6 });
        g.fx.magic(this.x, this.y + 1, C.bolt0, C.bolt1, 30); g.ui.pop('הגנרטור פועל!');
        for (const o of g.objects) if (o.link === this.id) o.activate?.(g);
      },
      update(dt, g) { this.anim.update(dt); if (this.on && Math.random() < .12) g.fx.add.emit({ x: this.x + rnd(-.5, .5), y: this.y + rnd(.6, 1.5), z: .4, vx: rnd(-2, 2), vy: rnd(-1, 2), life: .15, size: .1, c0: C.bolt0, c1: C.bolt1 }); return true; } });
  }
  addGate(p) {
    const y = this.floorBelow(p.x, (p.y ?? 0) + 1) ?? 0;
    const m = this.model('gate', p.x, y); const anim = new Anim(m, Assets.anims('gate')); anim.play(anim.has('closed') ? 'closed' : 'open', anim.has('closed') ? {} : { speed: 0 });
    const solid = { x0: p.x - .5, x1: p.x + .5, y0: y, y1: y + 3.6, kind: 'gate' }; this.world.solids.push(solid);
    return this.obj({ type: 'gate', link: p.link, x: p.x, y, model: m, anim, solid, open: false,
      activate(g) { if (this.open) return; this.open = true; this.anim.play('open', { once: true, fade: .1 }); g.audio.play('gate_open', { pos: new THREE.Vector3(this.x, this.y + 1.5, 0) }); g.after(() => { this.solid.off = true; }, 550); g.shake(.15); },
      update(dt) { this.anim.update(dt); return true; } });
  }
  addLift(p) {
    const m = this.model('lift', p.x, p.y0);
    const solid = { x0: p.x - 1.5, x1: p.x + 1.5, y0: p.y0 - .4, y1: p.y0, oneWay: true, kind: 'lift', dy: 0 }; this.world.solids.push(solid);
    return this.obj({ type: 'lift', link: p.link, x: p.x, y: p.y0, y0: p.y0, y1: p.y1, model: m, solid, on: false, dir: 1, wait: 9999,
      activate(g) { this.on = true; this.loop = g.audio.loop('lift_loop', { pos: new THREE.Vector3(this.x, this.y, 0), vol: .5 }); },
      update(dt, g) {
        this.solid.dy = 0;
        if (this.on) {
          // waits at the bottom for the hero, rides up, pauses at the top, comes back down when nobody is on it
          const riding = g.player.grounded && g.player.ground === this.solid;
          const atBottom = this.y <= this.y0 + .001, atTop = this.y >= this.y1 - .001;
          if (atBottom && this.dir < 0) { this.dir = 1; this.wait = 9999; }
          if (atTop && this.dir > 0) { this.dir = -1; this.wait = 1.6; }
          if (atBottom && riding && this.wait > .4) this.wait = .4;
          if (atTop && riding) this.wait = Math.max(this.wait, .8);
          if (this.wait > 0) { this.wait -= dt; this.loop?.setVol(.05); }
          else {
            this.loop?.setVol(.5);
            const ny = clamp(this.y + this.dir * 2.2 * dt, this.y0, this.y1); this.solid.dy = ny - this.y; this.y = ny;
          }
          this.loop?.setPos(new THREE.Vector3(this.x, this.y, 0));
        }
        this.solid.y1 = this.y; this.solid.y0 = this.y - .4; this.model.position.y = this.y;
        return true;
      } });
  }
  addVent(p) {
    const y = this.floorBelow(p.x, 1) ?? 0;
    const m = this.model('steam_vent', p.x, y);
    return this.obj({ type: 'vent', x: p.x, y, model: m, t: rnd(0, 1),
      update(dt, g) {
        this.t += dt; const ph = this.t % 2.6, blast = ph > 1.5, warn = ph > 1.1 && !blast;
        if (warn && Math.random() < .3) g.fx.steam(this.x, this.y + .95, .25);
        if (blast) { g.fx.steam(this.x, this.y + .95, 1); if (!this.hissed) { this.hissed = true; g.audio.play('steam_hiss', { pos: new THREE.Vector3(this.x, this.y + 1, 0) }); } }
        else this.hissed = false;
        const pl = g.player; if (blast && !pl.dead && Math.abs(pl.x - this.x) < .75 && pl.y < this.y + 3.4) pl.hurt(this.x);
        return true;
      } });
  }
  addCheckpoint(p, active) {
    const y = this.floorBelow(p.x, (p.y ?? 0) + 1) ?? (p.y ?? 0);
    const m = this.model('checkpoint', p.x, y, -.6); const anim = new Anim(m, Assets.anims('checkpoint')); anim.play(active ? 'wave' : 'down');
    return this.obj({ type: 'check', x: p.x, y, model: m, anim, on: active,
      update(dt, g) {
        this.anim.update(dt);
        const pl = g.player;
        if (!this.on && !pl.dead && Math.abs(pl.x - this.x) < 1.1) {
          this.on = true; this.anim.play('raise', { once: true, fade: .1, done: () => this.anim.play('wave', { fade: .2 }) });
          g.audio.play('checkpoint'); g.checkpoint = { x: this.x, y: this.y }; g.ui.pop('נקודת שמירה'); g.fx.magic(this.x, this.y + 2, [1, .95, .8], [.9, .6, .2], 24);
          if (g.hearts < 3) { g.hearts = 3; g.ui.hearts(); }
        }
        return true;
      } });
  }
  addExit(p) {
    const y = this.floorBelow(p.x, (p.y ?? 0) + 1) ?? 0;
    const m = this.model('checkpoint', p.x, y, -.4, 1.45); const anim = new Anim(m, Assets.anims('checkpoint')); anim.play('down');
    const light = new THREE.PointLight(0xffd890, 2.5, 7, 2); light.position.set(p.x, y + 2.5, 1.5); this.scene.add(light);
    return this.obj({ type: 'exit', x: p.x, y, model: m, anim, done: false, light, t: 0,
      update(dt, g) {
        this.anim.update(dt); this.t += dt; this.light.intensity = 2.2 + Math.sin(this.t * 3) * .6;
        if (Math.random() < .25) g.fx.add.emit({ x: this.x + rnd(-1, 1), y: this.y + rnd(0, 3), z: .2, vy: rnd(.4, 1), life: 1, size: .1, c0: [1, .95, .75], c1: [.95, .7, .25] });
        if (!this.done && Math.abs(g.player.x - this.x) < 1 && !g.player.dead) { this.done = true; this.anim.play('raise', { once: true, done: () => this.anim.play('wave') }); g.levelComplete(); }
        return true;
      } });
  }

  addPrize(p) {
    const m = this.model('gear_coin', p.x, p.y, .3); const s = Assets.size('gear_coin'); m.scale.setScalar(1.6 / (Math.max(s.x, s.y) || .3));
    const light = new THREE.PointLight(0xffd27a, 4, 9, 2); this.scene.add(light);
    const TAUNTS = ['נו, תתפסו אותי!', 'כמעט… ממש כמעט!', 'אף אחד עוד לא תפס אותי', 'גלגל הזהב בורח!', 'אולי בניסיון הבא?', 'מהר יותר! עוד יותר!'];
    return this.obj({ type: 'prize', x: p.x, y: p.y, model: m, light, t: 0, tauntT: 4, k: 0,
      dispose() { window.__game.scene.remove(this.light); },
      update(dt, g) {
        const pl = g.player; this.t += dt; this.tauntT -= dt;
        // impossible by design: the gear never lets the hero within its lead distance, whatever the speed
        const lead = 6.5;
        const was = this.x;
        this.x = Math.max(this.x + .5 * dt, pl.x + lead);
        if (this.x - was > .25 && Math.random() < .6) g.fx.add.emit({ x: this.x - .6, y: this.y + Math.random() - .5, z: .3, vx: -3, vy: Math.random() - .5, life: .35, size: .2, c0: [1, .92, .6], c1: [.9, .55, .15] });
        this.y = (pl.grounded ? pl.y : Math.max(pl.y, 0)) + 1.15 + Math.sin(this.t * 2.2) * .22;
        this.model.position.set(this.x, this.y, .3); this.model.rotation.y = this.t * 2.4; this.model.rotation.z = Math.sin(this.t) * .2;
        this.light.position.set(this.x, this.y + .3, 1.6); this.light.intensity = 3.5 + Math.sin(this.t * 4) * 1;
        if (Math.random() < .35) g.fx.add.emit({ x: this.x + (Math.random() - .5) * 1.4, y: this.y + (Math.random() - .5) * 1.4, z: .4, vy: .6, life: .7, size: .12, c0: [1, .95, .7], c1: [.95, .65, .2] });
        if (!pl.dead && this.x - pl.x < lead + .6 && this.tauntT <= 0) { this.tauntT = 6 + Math.random() * 3; g.ui.hint({ t: TAUNTS[this.k++ % TAUNTS.length] }, 2.6); g.audio.play('coin', { pitch: .55, vol: .5 }); }
        if (!pl.dead && Math.abs(pl.x - this.x) < .9 && Math.abs(pl.cy - this.y) < 1.4) g.prizeWin();
        return true;
      } });
  }
  addGearRain(p) {
    return this.obj({ type: 'rain', x: p.x, t: 0, update(dt, g) {
      const pl = g.player; this.t -= dt;
      if (this.t <= 0 && !pl.dead && pl.x > this.x && pl.x < 196 && g.mode === 'play') {
        this.t = 2.1 + Math.random() * 1.2;
        const gr = new BossGear(g, pl.x + 3 + Math.random() * 7, pl.y + 11, -1); gr.vx = -(1 + Math.random() * 2.5); gr.vy = 0; gr.life = 5; g.shots.push(gr);
      }
      return true;
    } });
  }
  /** the prize screen - only reachable by catching the golden gear (which the gear makes impossible) */
  async prizeWin() {
    if (this.prizeShown) return; this.prizeShown = true; this.mode = 'won';
    this.save.prizeWon = true; writeSave(this.save);
    this.audio.stinger('music_win'); this.ui.flash(.9, 900);
    try {
      const b = new Uint8Array(await (await fetch('models/vault.dat')).arrayBuffer());
      const key = new TextEncoder().encode('PowerStorm-Eili-Shai-2026');
      for (let i = 0; i < b.length; i++) b[i] ^= key[i % key.length] ^ ((i * 131) & 255);
      const url = URL.createObjectURL(new Blob([b], { type: 'image/webp' }));
      const d = document.createElement('div'); d.id = 'prizeWin';
      d.innerHTML = `<img alt="זכית" src="${url}"><button class="big sec" id="pwClose">סגירה</button>`;
      document.body.appendChild(d); $('pwClose').onclick = () => { d.remove(); this.toTitle(); };
    } catch (e) { console.warn(e); }
  }

  floorBelow(x, y) {
    let best = null;
    for (const s of this.world.solids) if (!s.off && x >= s.x0 && x <= s.x1 && s.y1 <= y + .01 && (best == null || s.y1 > best)) best = s.y1;
    for (const sf of this.world.surfaces) if (x >= sf.x0 && x <= sf.x1) { const fy = sf.f(x); if (fy <= y + .01 && (best == null || fy > best)) best = fy; }
    return best;
  }

  // ------------------------------------------------------------ economy, energy, storm
  collectCoin(c) { this.coins++; this.audio.play('coin', { vol: .45, pitch: 1 + (this.coins % 5) * .03 }); this.fx.coinPop(c.x, c.y); this.ui.coins(); }
  spawnCoins(x, y, n) { for (let i = 0; i < n; i++) this.addCoin(x, y + .6, rnd(-3, 3), rnd(4, 8), true); }
  useEnergy(a, all) {
    this.energyIdle = 0;
    if (all) { if (this.energy < a) return false; this.energy -= a; return true; }
    this.energy = Math.max(0, this.energy - a); return this.energy > 0;
  }
  noEnergy() { if (!this._noenT || performance.now() - this._noenT > 900) { this._noenT = performance.now(); this.audio.play('energy_empty', { vol: .7 }); this.ui.hintOnce('energy'); } }
  addStorm(d) {
    if (!(this.save.powers.fire || this.save.powers.wind)) return;
    const was = this.storm; this.storm = Math.min(1, this.storm + d * .03);
    if (was < 1 && this.storm >= 1) { this.audio.play('power_ready'); this.ui.pop('סערת כוחות מוכנה!'); this.ui.hintOnce('storm'); }
  }

  // ------------------------------------------------------------ combat
  hitstop(t) { this.stopT = Math.max(this.stopT, t); }
  shake(a) { this.shakeAmt = Math.min(1.2, Math.max(this.shakeAmt, a)); }
  meleeHit(p, dmg, reach, kind, lv = 0) {
    const f = p.facing, x0 = Math.min(p.x, p.x + f * reach), x1 = Math.max(p.x, p.x + f * reach);
    const y0 = p.y + .1, y1 = p.y + (kind === 'smash' ? 2.0 : 1.75);
    let landed = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e instanceof Boss) {
        const c = e.corePos();
        if (e.coreOpen() && c.x > x0 - .9 && c.x < x1 + .9 && c.y > y0 - .9 && c.y < y1 + .9) { e.hit(dmg, { kind, dir: f, lv, at: c }); landed = true; }
        else if (x1 > e.x - e.w / 2 && x0 < e.x + e.w / 2) { e.hit(dmg, { kind, dir: f, lv, at: new THREE.Vector3(e.x - e.w / 2, p.y + 1, 0) }); landed = true; }
        continue;
      }
      const b = e.box();
      if (b.x1 > x0 && b.x0 < x1 && b.y1 > y0 && b.y0 < y1) { if (e.hit(dmg, { kind, dir: f, kb: kind === 'smash' ? 9 : 4.5, lv })) landed = true; else landed = 'blocked'; }
    }
    for (const s of this.shots) if (s instanceof BossGear && !s.dead && s.x > x0 - .6 && s.x < x1 + .6 && s.y > y0 - .6 && s.y < y1 + .6) { s.hit(kind === 'smash' ? 3 : 1); landed = true; }
    for (const o of this.objects) {
      if (o.x < x0 - 1 || o.x > x1 + 1) continue;
      if (o.type === 'crackwall' && !o.broken && Math.abs(o.x - (p.x + f * .9)) < 1.6 && p.y < o.y + 2.5) { if (kind === 'smash' && lv > .55) { o.smash(this, f); landed = true; } else { this.audio.play('shield_block', { pitch: .6, vol: .7 }); this.fx.dust(o.x - f * .7, p.y + 1, 4, .6); this.ui.hintOnce('wall'); } }
      if (o.type === 'barricade' && o.state === 'ok' && Math.abs(o.x - (p.x + f * .9)) < 1.2) { this.audio.play('punch_hit', { pitch: .7, vol: .6 }); this.fx.dust(o.x - f * .5, p.y + 1, 5, .6); this.ui.hintOnce('barricade'); }
      if (o.type === 'gate' && !o.open && Math.abs(o.x - (p.x + f * .9)) < 1.2) { this.audio.play('shield_block', { pitch: .8, vol: .6 }); this.ui.hintOnce('gate'); }
      if (o.type === 'gen' && !o.on && Math.abs(o.x - (p.x + f * .9)) < 1.3) { this.ui.hintOnce('gen'); }
    }
    if (landed === true) { this.audio.play('punch_hit', { vol: kind === 'smash' ? 1 : .75 }); this.hitstop(kind === 'smash' ? .08 : .045); this.shake(kind === 'smash' ? .3 : .1); }
  }
  spawnFireball(x, y, dir) { this.shots.push(new Fireball(this, x, y, dir)); }
  fireHit(fb) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e instanceof Boss) {
        const c = e.corePos();
        if (e.coreOpen() && Math.hypot(c.x - fb.x, c.y - fb.y) < 1.4) { e.hit(3, { kind: 'fire', dir: fb.dir }); fb.explode(); return true; }
        if (fb.x > e.x - e.w / 2 && fb.y < e.y + 5.6) { e.hit(3, { kind: 'fire', dir: fb.dir, at: new THREE.Vector3(fb.x, fb.y, 0) }); fb.explode(); return true; }
        continue;
      }
      const b = e.box();
      if (fb.x > b.x0 - .3 && fb.x < b.x1 + .3 && fb.y > b.y0 - .3 && fb.y < b.y1 + .3) { e.hit(e.kind === 'drone' ? 9 : 3, { kind: 'fire', dir: fb.dir, kb: 3 }); fb.explode(); return true; }
    }
    for (const s of this.shots) if (s instanceof BossGear && !s.dead && Math.hypot(s.x - fb.x, s.y - fb.y) < 1) { s.hit(3); fb.explode(); return true; }
    for (const o of this.objects) if (o.type === 'barricade' && o.state === 'ok' && Math.abs(o.x - fb.x) < .8 && fb.y < o.y + 2.6) { o.burn(this); fb.explode(); return true; }
    return false;
  }
  lightning(p) {
    const hand = p.handPos(new THREE.Vector3());
    const cand = [];
    for (const e of this.enemies) if (!e.dead) {
      const tp = e instanceof Boss ? (e.coreOpen() ? e.corePos() : new THREE.Vector3(e.x - 1, e.y + 3.4, 0)) : new THREE.Vector3(e.x, e.cy, 0);
      const dx = tp.x - p.x;
      if (Math.abs(dx) < 11 && Math.abs(tp.y - p.cy) < 6 && (Math.sign(dx) === p.facing || Math.abs(dx) < 1.5)) cand.push({ e, tp, d: Math.abs(dx) + Math.abs(tp.y - p.cy) * .5 });
    }
    for (const s of this.shots) if (s instanceof BossGear && !s.dead && Math.sign(s.x - p.x) === p.facing && Math.abs(s.x - p.x) < 10) cand.push({ e: s, tp: new THREE.Vector3(s.x, s.y, 0), d: Math.abs(s.x - p.x) });
    const gens = this.objects.filter(o => o.type === 'gen' && !o.on && Math.sign(o.x - p.x) === p.facing && Math.abs(o.x - p.x) < 11 && Math.abs(o.y - p.y) < 7);
    cand.sort((a, b) => a.d - b.d);
    let from = hand.clone(), hits = 0;
    if (gens.length) { const gn = gens.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; const tp = new THREE.Vector3(gn.x, gn.y + 1.1, 0); this.fx.bolt(from, tp, .18); gn.power(this); hits++; }
    const chain = []; if (cand.length) { chain.push(cand[0]); for (const c of cand.slice(1)) { if (chain.length >= 4) break; if (c.tp.distanceTo(chain[chain.length - 1].tp) < 6.5) chain.push(c); } }
    chain.forEach((c, i) => {
      this.after(() => {
        if (c.e.dead) return;
        this.fx.bolt(i === 0 ? from : chain[i - 1].tp, c.tp, i === 0 ? .2 : .14);
        c.e.hit(3, { kind: 'bolt', dir: p.facing, stun: 1.3, kb: 2, at: c.tp });
        this.audio.play('bolt_zap', { pos: c.tp, vol: .9 });
      }, i * 70);
      hits++;
    });
    if (!hits) { const to = new THREE.Vector3(p.x + p.facing * 6, (this.floorBelow(p.x + p.facing * 6, p.y + 2) ?? p.y), 0); this.fx.bolt(from, to, .16); this.fx.sparks(to.x, to.y, 10, 1.57, 1.4); this.audio.play('bolt_zap', { pos: to, vol: .7 }); }
    this.shake(.12);
  }
  iceBeam(p, dt) {
    const hand = p.handPos(new THREE.Vector3()); const f = p.facing; const y = hand.y;
    let endX = p.x + f * 9.5, endY = y, target = null;
    // canal: freeze the next water cell touching walkable ground or ice
    if (this.world.waterCells.length) {
      let cell = null, best = 1e9;
      for (const c of this.world.waterCells) {
        if (c.frozen) continue;
        const near = f > 0 ? c.x0 - p.x : p.x - c.x1;
        if (near < -0.6 || near > 4.8) continue;
        const edgeX = f > 0 ? c.x0 : c.x1;
        const touches = this.world.waterCells.some(o => o.frozen && Math.abs((f > 0 ? o.x1 : o.x0) - edgeX) < .01) || this.floorBelow(edgeX - f * .3, .1) === 0;
        if (touches && near < best) { best = near; cell = c; }
      }
      if (cell) {
        const blocking = this.enemies.some(e => !e.dead && Math.sign(e.x - p.x) === f && Math.abs(e.x - p.x) < best + 1 && Math.abs(e.cy - y) < e.h);
        if (!blocking) {
          endX = (cell.x0 + cell.x1) / 2; endY = WATER_Y + .2;
          if (p.freezeCell !== cell) { p.freezeCell = cell; p.freezeP = 0; }
          p.freezeP += dt / .3;
          for (let i = 0; i < 3; i++) this.fx.frost(endX + rnd(-1.8, 1.8), endY + .2);
          if (p.freezeP >= 1) this.freezeCell(cell);
          this.beam.show(hand, new THREE.Vector3(endX, endY, 0), dt);
          return;
        }
      }
    }
    // enemies in the line
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x; if (Math.sign(dx) !== f || Math.abs(dx) > 9.5) continue;
      if (e instanceof Boss) { if (Math.abs(dx) - e.w / 2 < Math.abs(endX - p.x)) { endX = e.x - f * e.w / 2; target = e; } continue; }
      if (y < e.y - .35 || y > e.y + e.h + .35) continue;
      const ex = e.x - f * e.w / 2; if (Math.abs(ex - p.x) < Math.abs(endX - p.x)) { endX = ex; target = e; }
    }
    // walls stop the beam
    for (const s of this.world.solids) {
      if (s.off || s.oneWay || s.ref) continue;
      if (y < s.y0 || y > s.y1) continue;
      const wx = f > 0 ? s.x0 : s.x1; const d = (wx - p.x) * f;
      if (d > .3 && d < Math.abs(endX - p.x)) { endX = wx; target = null; }
    }
    if (target) { if (target instanceof Boss) target.chillBy(dt); else target.addFreeze(dt * 1.7); }
    for (let i = 0; i < 2; i++) this.fx.frost(endX, endY);
    if (Math.random() < .5) this.fx.frost(hand.x + (endX - hand.x) * Math.random(), y);
    this.beam.show(hand, new THREE.Vector3(endX, endY, 0), dt);
  }
  freezeCell(cell) {
    cell.frozen = true; cell.mesh = iceSlab(cell); this.world.group.add(cell.mesh);
    this.world.solids.push({ x0: cell.x0, x1: cell.x1, y0: WATER_Y - 3, y1: ICE_TOP, kind: 'ice' });
    this.audio.play('water_freeze', { pos: new THREE.Vector3((cell.x0 + cell.x1) / 2, WATER_Y, 0) });
    this.fx.iceBurst((cell.x0 + cell.x1) / 2, ICE_TOP, .8); this.player.freezeCell = null;
  }
  droneShot(d) { const p = this.player; this.shots.push(new EnemyShot(this, d.x + d.facing * .3, d.y + .1, p.x, p.cy)); this.audio.play('drone_shoot', { pos: d.pos() }); this.fx.flash(d.x, d.y, 1, 0xffc070, 3, .1, 5); }
  bossGear(x, y, dir) { this.shots.push(new BossGear(this, x, y, dir)); }
  bossShockwave(x, y) {
    this.fx.ring(x, y, 0xf0e0c0, 6, .5, .8);
    for (const dir of [-1]) this.obj({ type: 'wave', x, y, dir, t: 0, update(dt, g) {
      this.t += dt; this.x += this.dir * 10 * dt;
      g.fx.dust(this.x, this.y, 2, 1.1); if (Math.random() < .5) g.fx.sparks(this.x, this.y + .1, 2, 1.57, .6, C.dust, C.smoke);
      const p = g.player; if (!p.dead && Math.abs(p.x - this.x) < .6 && p.y < this.y + .65) p.hurt(this.x + this.dir);
      return this.t < 2.4 && this.x > -13;
    } });
  }
  bossIntro() {
    const b = this.addEnemy(new Boss(this, 7, 0)); this.boss = b; this.ui.boss(1);
    this.audio.play('boss_roar'); this.shake(.4);
    const s = this.session; this.after(() => this.session === s && this.ui.hint({ t: 'הימנעו מהגל (קפצו!), מהגלגל ומהאגרופים. כשהחזה נפתח: הכו בלב!', pc: 'קפצו מעל הגלים. כשהחזה נפתח: הכו בלב!' }, 7), 3000);
  }
  bossPhase2() {
    this.audio.play('boss_roar'); this.ui.banner('הוא כועס!', 'רובוטים חדשים בדרך'); this.shake(.5);
    for (const x of [-9, -5]) { const b = this.addEnemy(new Bot(this, x, 8, { range: [-12, -1] })); b.vy = -2; }
    this.addEnemy(new Drone(this, -3, 4.6, { range: [-10, 0] }));
  }
  stormStart(p) {
    this.storm = 0; this.stormT = 0; this.stormP = p;
    this.audio.play('storm'); this.audio.duckMusic(.35, 2.2); this.ui.flash(.5, 500); this.shake(.3);
  }
  stormUpdate(dt) {
    const p = this.stormP; if (!p) return;
    this.stormT += dt; const t = this.stormT;
    for (let i = 0; i < 6; i++) {
      const a = t * 9 + i * 1.05, r = 1.2 + t * 2.2, cols = [[C.fire0, C.fire1], [C.ice0, C.ice1], [C.bolt0, C.bolt1], [C.wind0, C.wind1]][i % 4];
      this.fx.add.emit({ x: p.x + Math.cos(a) * r, y: p.cy + Math.sin(a) * r * .7, z: .5, vx: -Math.sin(a) * 3, vy: Math.cos(a) * 3, life: .4, size: .3, c0: cols[0], c1: cols[1] });
    }
    p.vy = Math.max(p.vy, t < .5 ? 2 : 0);
    if (t > .55 && !this.stormHit) {
      this.stormHit = true; this.ui.flash(.85, 700); this.shake(1); this.hitstop(.12);
      for (const e of [...this.enemies]) {
        if (e.dead || Math.abs(e.x - p.x) > 17) continue;
        const tp = e instanceof Boss ? e.corePos() : new THREE.Vector3(e.x, e.cy, 0);
        this.fx.bolt(new THREE.Vector3(p.x, p.cy + 1, 0), tp, .24, .4);
        this.fx.fireBurst(tp.x, tp.y, .8); this.fx.iceBurst(tp.x, tp.y, .6);
        e.hit(e instanceof Boss ? 6 : 9, { kind: 'storm', dir: Math.sign(e.x - p.x), kb: 8 });
        if (e instanceof Boss && e.state !== 'open' && !e.dead) e.forceOpen();
      }
      for (const s of this.shots) if (!s.dead) (s.pop || s.explode)?.call(s, true);
      this.fx.ring(p.x, p.y, 0xfff1c8, 14, .7, .9);
    }
    if (t > 1.35) { this.stormP = null; this.stormHit = false; p.setState('normal'); }
  }
  getPower(c) {
    const P = POWERS[c.p];
    this.save.powers[c.p] = true; writeSave(this.save);
    this.scene.remove(c.model); this.scene.remove(c.light);
    const col = new THREE.Color(P.col[0]), col2 = new THREE.Color(P.col[2]);
    this.fx.magic(c.x, c.y, [col.r, col.g, col.b], [col2.r, col2.g, col2.b], 60); this.fx.ring(c.x, this.player.y, P.col[1], 6, .7, .8); this.ui.flash(.6, 600);
    this.audio.play('crystal_get'); this.audio.duckMusic(.3, 2);
    this.player.vx = 0; this.player.anim.play('victory', { fade: .1 }); this.player.setState('victory');
    this.mode = 'card';
    const s = this.session; this.after(() => { if (this.session === s) this.showPowerCard(c.p); }, 650);
  }
  onEnemyDead(e, shattered) {
    const n = e.kind === 'brute' ? 5 : e.kind === 'boss' ? 0 : 2;
    if (n) this.spawnCoins(e.x, e.y + (e.kind === 'drone' ? 0 : .5), n);
    this.addStorm(2);
  }
  onPlayerDead() { this.music(null); this.audio.stinger('music_lose'); const s = this.session; this.after(() => { if (this.session === s) this.showLose(); }, 1700); }
  onBossDead(b) {
    this.ui.banner('ניצחון!', 'מלך השעונים נפל'); this.shake(.8); this.ui.flash(.7, 900);
    for (const e of this.enemies) if (e !== b && !e.dead) e.die({});
    const s = this.session; this.after(() => { if (this.session === s) this.levelComplete(true); }, 3600);
  }
  levelComplete(final) {
    if (this.mode !== 'play') return;
    this.mode = 'won'; const p = this.player; p.stopLoops(); p.vx = 0; p.setState('victory'); p.anim.play('victory', { fade: .2 });
    this.audio.stinger('music_win'); this.fx.magic(p.x, p.cy + 1, [1, .95, .75], [.95, .6, .2], 60);
    const L = this.L, s = this.save;
    const coinsOk = this.stats.coinsTotal ? this.coins >= Math.ceil(this.stats.coinsTotal * .75) : true;
    const stars = 1 + (L.boss ? (this.stats.hurt <= 3 ? 1 : 0) : (coinsOk ? 1 : 0)) + (this.stats.hurt <= (L.boss ? 1 : 2) ? 1 : 0);
    s.stars[L.id] = Math.max(s.stars[L.id] || 0, stars);
    s.unlocked = Math.max(s.unlocked, Math.min(6, L.id + 1)); if (L.boss) s.done = true;
    const time = (performance.now() - this.stats.start) / 1000; s.best[L.id] = Math.min(s.best[L.id] || 1e9, time);
    writeSave(s);
    const sess = this.session, snap = { coins: this.coins, total: this.stats.coinsTotal, hurt: this.stats.hurt };
    this.after(() => { if (this.session === sess) this.showResults(stars, time, L.boss, snap); }, L.boss ? 400 : 1900);
  }

  // ------------------------------------------------------------ panels
  panel(html, onBuild) { const o = $('overlay'); o.innerHTML = `<div class="panel">${html}</div>`; o.classList.remove('hidden'); onBuild?.(o); return o; }
  closePanel() { $('overlay').classList.add('hidden'); $('overlay').innerHTML = ''; }
  showMap() {
    if (this.mode !== 'title') { /* from pause/results */ }
    const s = this.save;
    const icons = { fire: 'iFire', wind: 'iWing', ice: 'iIce', bolt: 'iBolt' };
    const pcol = { fire: '#e0652a', wind: '#6f9e94', ice: '#5b9cc0', bolt: '#d9a32a' };
    const cards = LEVELS.map(L => {
      const lock = L.id > s.unlocked, st = s.stars[L.id] || 0;
      const stars = [0, 1, 2].map(i => `<svg viewBox="0 0 24 24" fill="${i < st ? '#e6a93a' : '#fffaf0'}"><use href="#iStar"/></svg>`).join('');
      const pw = L.reward ? `<span class="pwb" style="background:${pcol[L.reward]}"><svg viewBox="0 0 48 48"><use href="#${icons[L.reward]}"/></svg></span>` : '';
      const row = lock ? `<svg class="lk" viewBox="0 0 24 24"><use href="#iLockD"/></svg>` : stars + pw;
      const next = !lock && !s.stars[L.id] ? ' next' : '';
      if (L.prize) return `<button class="lv prize${lock ? ' lock' : ''}" data-id="${L.id}" ${lock ? 'disabled' : ''}><span class="n">?</span><b>${L.name}</b><span class="st">${lock ? `<svg class="lk" viewBox="0 0 24 24"><use href="#iLockD"/></svg>` : `<small class="tries">${s.prizeTries ? 'ניסיונות: ' + s.prizeTries : 'בלתי אפשרי'}</small>`}</span></button>`;
      return `<button class="lv${lock ? ' lock' : ''}${L.boss ? ' boss' : ''}${next}" data-id="${L.id}" ${lock ? 'disabled' : ''}>${L.boss ? '<span class="crown">♛</span>' : ''}<span class="n">${L.id}</span><b>${L.name}</b><span class="st">${row}</span></button>`;
    }).join('');
    this.panel(`<div class="phead"><h2>בחרו שלב</h2><button class="close" id="mClose" aria-label="סגירה">×</button></div>
      <div class="pbody"><div class="levels">${cards}</div>
      <p class="lead" style="text-align:center;font:700 13.5px/1.4 var(--ui);color:var(--ink)">בכל שלב מחכה כוח חדש</p><p class="lead" style="text-align:center;font-size:12px;color:var(--ink2);margin-top:-6px">3 כוכבים: לסיים, לאסוף 75% מגלגלי השיניים ולשמור על הלבבות</p></div>`, o => {
      o.querySelectorAll('.lv:not(.lock)').forEach(b => b.onclick = () => { this.audio.play('ui_click'); this.goFullscreen(); this.startLevel(+b.dataset.id); });
      $('mClose').onclick = () => { this.audio.play('ui_back'); this.closePanel(); if (this.mode !== 'title') this.toTitle(); };
    });
  }
  toTitle() { this.closePanel(); $('hud').classList.add('hidden'); $('controls').classList.add('hidden'); $('title').classList.remove('hidden'); this.titleScene(); }
  showOptions(fromTitle) {
    const v = this.audio.vol;
    this.panel(`<div class="phead"><h2>${fromTitle ? 'הגדרות' : 'הפסקה'}</h2><button class="close" id="oClose" aria-label="סגירה">×</button></div>
      <div class="pbody">
        ${fromTitle ? '' : `<div class="btnrow"><button class="big" id="oResume">המשך</button><button class="big sec" id="oRestart">מההתחלה</button><button class="big sec" id="oMap">מפה</button></div>`}
        <div class="row"><span>מוזיקה</span><input type="range" id="vMusic" min="0" max="1" step=".05" value="${v.music}"></div>
        <div class="row"><span>צלילים</span><input type="range" id="vSfx" min="0" max="1" step=".05" value="${v.sfx}"></div>
        <div class="row"><span>השתקה</span><button class="toggle${v.muted ? ' on' : ''}" id="vMute" aria-label="השתקה"></button></div>
        ${isPC ? `<p class="lead" style="font-size:13px;color:var(--ink2)">מקלדת: חיצים לריצה · רווח קפיצה (להחזיק = תעופה) · J אגרוף (להחזיק = אגרוף־על) · K אש · L קרח · I ברק · Q סערה · Esc הפסקה</p>` : ''}
      </div>`, () => {
      const saveV = () => { this.save.vol = { ...this.audio.vol }; writeSave(this.save); this.audio.applyVolumes(); };
      $('vMusic').oninput = e => { this.audio.vol.music = +e.target.value; saveV(); };
      $('vSfx').oninput = e => { this.audio.vol.sfx = +e.target.value; saveV(); this.audio.play('coin', { minGap: .15 }); };
      $('vMute').onclick = e => { this.audio.vol.muted = !this.audio.vol.muted; e.target.classList.toggle('on', this.audio.vol.muted); saveV(); };
      const close = () => { this.audio.play('ui_back'); this.closePanel(); if (!fromTitle) this.resume(); };
      $('oClose').onclick = close;
      if (!fromTitle) {
        $('oResume').onclick = close;
        $('oRestart').onclick = () => { this.audio.play('ui_click'); this.startLevel(this.L.id); };
        $('oMap').onclick = () => { this.audio.play('ui_click'); this.showMap(); };
      }
    });
  }
  /** game-time timer (pauses with the game; dropped when a new level starts). Same argument order as setTimeout. */
  after(fn, ms) { this.timers.push({ t: ms / 1000, fn, s: this.session }); }
  tickTimers(dt) { for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); if (tm.s === this.session) tm.fn(); } } }
  music(n) { this.wantMusic = n; this.audio.setMusic(n); }
  pause() {
    if (this.mode !== 'play') return; this.mode = 'pause';
    const p = this.player; if (p) { p.stopLoops(); p.flying = false; if (p.state === 'beam' || p.state === 'charge') p.setState('normal'); this.ui.charging(false); this.beam.hide(1); }
    for (const k in this.input.btn) this.input.btn[k] = false;
    this.showOptions(false);
  }
  resume() { if (this.mode === 'pause') this.mode = 'play'; }
  showPowerCard(key) {
    const P = POWERS[key];
    this.ui.powers();
    this.panel(`<div class="phead"><h2>כוח חדש: ${P.name}!</h2></div>
      <div class="pbody"><div class="powerCard"><div class="orb" style="background:radial-gradient(circle at 50% 28%, ${P.col[0]}, ${P.col[1]} 58%, ${P.col[2]})"><svg viewBox="0 0 48 48"><use href="#${P.icon}"/></svg></div>
      <div style="display:flex;flex-direction:column;gap:7px;flex:1">${P.how.map(h => `<div class="how">${h}</div>`).join('')}${isPC ? `<div class="how">מקלדת: <kbd>${P.keys}</kbd></div>` : ''}</div></div>
      <button class="big" id="pGo">יאללה!</button></div>`, () => {
      $('pGo').onclick = () => {
        this.audio.play('ui_click'); this.closePanel(); this.mode = 'play'; this.player.setState('normal'); this.player.anim.play('idle');
        const el = { fire: 'bFire', ice: 'bIce', bolt: 'bBolt', wind: 'bJump' }[key]; const b = $(el); b.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.2,1.6,.4,1)' });
        if (key === 'wind') this.ui.hint('flygap', 6);
      };
    });
  }
  showResults(stars, time, final, snap) {
    const L = this.L, nextId = L.id + 1;
    const mm = Math.floor(time / 60), ss = String(Math.floor(time % 60)).padStart(2, '0');
    const starSvg = [0, 1, 2].map(i => `<svg viewBox="0 0 24 24" fill="${i < stars ? '#e6a93a' : '#e4cfa6'}"><use href="#iStar"/></svg>`).join('');
    const body = final
      ? `<p class="lead" style="text-align:center"><b>ניצחתם את מלך השעונים והצלתם את העיר!</b><br>כל הכוחות שלכם, בסערה אחת.</p>
         <div id="dedic2" style="text-align:center;font:400 22px/1.2 var(--display);color:#b52d22">המשחק מוקדש לעילי שי</div>`
      : `<div class="stat"><span>גלגלי שיניים</span><span>${snap.coins} / ${snap.total}</span></div><div class="stat"><span>זמן</span><span>${mm}:${ss}</span></div><div class="stat"><span>פגיעות</span><span>${snap.hurt}</span></div>`;
    this.panel(`<div class="phead"><h2>${final ? 'גיבורי העיר!' : 'כל הכבוד!'}</h2></div>
      <div class="pbody"><div class="stars" id="stars">${starSvg}</div>${body}
      <div class="btnrow">${final ? `<button class="big" id="rNext">לשלב הפרס!</button>` : ''}${!final && nextId <= 5 ? `<button class="big" id="rNext">לשלב הבא</button>` : ''}<button class="big sec" id="rAgain">שוב</button><button class="big sec" id="rMap">מפה</button></div></div>`, () => {
      const svgs = [...document.querySelectorAll('#stars svg')];
      svgs.forEach((s, i) => setTimeout(() => { s.classList.add('on'); if (i < stars) this.audio.play('ui_star', { pitch: 1 + i * .12, jitter: 0 }); }, 250 + i * 330));
      $('rAgain').onclick = () => { this.audio.play('ui_click'); this.startLevel(L.id); };
      $('rMap').onclick = () => { this.audio.play('ui_click'); this.showMap(); };
      if ($('rNext')) $('rNext').onclick = () => { this.audio.play('ui_click'); this.startLevel(nextId); };
    });
  }
  showLose() {
    const cp = this.checkpoint; this.mode = 'lost'; this.player?.stopLoops();
    this.panel(`<div class="phead"><h2>אוי! נגמרו הלבבות</h2></div>
      <div class="pbody"><p class="lead">גם גיבורי־על נופלים לפעמים. ${cp ? 'נחזור לנקודת השמירה האחרונה.' : 'ננסה שוב מההתחלה של השלב.'}</p>
      <div class="btnrow"><button class="big" id="lRetry">נסו שוב</button><button class="big sec" id="lMap">מפה</button></div></div>`, () => {
      $('lRetry').onclick = () => { this.audio.play('ui_click'); this.startLevel(this.L.id, cp); };
      $('lMap').onclick = () => { this.audio.play('ui_click'); this.showMap(); };
    });
  }

  // ------------------------------------------------------------ per-frame
  stepSound(p) {
    const k = p.ground?.kind;
    if (k === 'ice') return 'step_stone';
    if (this.L.theme === 'factory') return 'step_metal';
    if (this.L.theme === 'roof') return 'step_tile';
    if (k === 'plat' && this.L.theme !== 'canal') return 'step_tile';
    return 'step_stone';
  }
  fallOut(splash) {
    const p = this.player;
    if (splash) { this.fx.splash(p.x, WATER_Y); this.audio.play('splash'); } else this.audio.play('hurt');
    p.stopLoops(); this.beam.hide(1);
    this.hearts = Math.max(0, this.hearts - 1); this.stats.hurt++; this.ui.hearts(true);
    if (this.hearts <= 0) { p.dead = true; p.model.visible = false; this.onPlayerDead(); return; }
    const sp = p.safe; p.reset(sp.x, sp.y + .05); p.invuln = 1.4; p.safe = sp;
    this.camSnap = true; this.ui.flash(.4, 400);
  }
  frame() {
    let dt = Math.min(this.clock.getDelta(), 1 / 30);
    const inp = this.input.read();
    if (inp.pause) { if (this.mode === 'play') this.pause(); else if (this.mode === 'pause') { this.closePanel(); this.resume(); } }
    if (this.mode === 'title') this.titleFrame(dt);
    else if (this.mode === 'play' || this.mode === 'won') this.playFrame(dt, inp);
    else if (this.mode === 'card') { this.player.update(dt, { x: 0, y: 0 }); this.fx.update(dt); this.updateObjects(dt); this.camera_(dt); }
    if (this.mode === 'play' || this.mode === 'won' || this.mode === 'card') this.tickTimers(dt);
    this.env.follow(this.camera, dt);
    this.renderer.render(this.scene, this.camera);
  }
  titleFrame(dt) {
    this.titleT += dt; const t = this.titleT;
    this.player.anim.update(dt); this.player.model.rotation.y = .45 + Math.sin(t * .4) * .08;
    for (const e of this.enemies) { e.anim.update(dt); e.model.rotation.y = -.6; if (e.kind === 'drone') e.model.position.y = 2.2 + Math.sin(t * 2) * .15; }
    for (const a of this.world.anims) a.update(dt);
    if (Math.random() < .08) this.fx.add.emit({ x: -6.5 + rnd(-.6, .6), y: rnd(.2, 2), z: .4, vy: rnd(.3, .9), life: 1, size: .1, c0: C.bolt0, c1: C.fire1 });
    this.fx.update(dt);
    // hero on the left, robots on the right, framed between the logo and the buttons (like the Dreamlet reference)
    const cx = -4.15 + Math.sin(t * .15) * .12, d = 7.2 * Math.max(1, 1.9 / this.camera.aspect);
    this.camera.position.set(cx, 1.05, d); this.camera.lookAt(cx, 1.05, 0);
  }
  playFrame(dt, inp) {
    if (this.stopT > 0) { this.stopT -= dt; dt *= .05; }
    this.levelT += dt;
    const p = this.player;
    const live = this.mode === 'play';
    p.update(dt, live ? inp : { x: 0, y: 0 });
    if (this.stormP) this.stormUpdate(dt);
    // energy regen
    this.energyIdle += dt;
    if (this.energyIdle > .45 && !p.flying && p.state !== 'beam') this.energy = Math.min(100, this.energy + dt * (p.grounded ? 22 : 7));
    for (const e of this.enemies) e.update(dt);
    this.enemies = this.enemies.filter(e => { if (e.remove) { this.scene.remove(e.model); e.buzz?.stop(); return false; } return true; });
    for (const s of this.shots) s.update(dt);
    this.shots = this.shots.filter(s => !s.dead);
    this.updateObjects(dt);
    for (const a of this.world.anims) a.update(dt);
    if (this.world.water) this.world.water.material.uniforms.time.value += dt;
    for (const b of this.world.belts) b.map.offset.x -= b.dir * 0.9 * dt;
    if (this.world.hands) { const t = this.levelT; this.world.hands.m.rotation.z = -(.6 + t * .05); this.world.hands.h.rotation.z = -(4.1 + t * .004); }
    // falls
    if (live && !p.dead) {
      if (p.y < this.world.killY) this.fallOut(false);
      else if (this.world.waterCells.length && p.y < WATER_Y + .15 && this.world.waterSpans.some(w => p.x > w.x0 && p.x < w.x1) && !this.world.waterCells.some(c => c.frozen && p.x >= c.x0 && p.x <= c.x1)) this.fallOut(true);
      // hints
      for (let i = this.hintsLeft.length - 1; i >= 0; i--) {
        const h = this.hintsLeft[i];
        if (p.x > h.x) { this.hintsLeft.splice(i, 1); if (h.key === 'freezewater' && !this.save.powers.ice) continue; if (h.key === 'flygap' && !this.save.powers.wind) continue; this.ui.hint(h.key); this.ui.shown.add(h.key); }
      }
      // level bounds
      p.x = clamp(p.x, this.L.len[0] + .5, this.L.len[1] - .5);
    }
    this.fx.update(dt);
    this.ui.update(dt); this.ui.meters();
    this.camera_(dt);
    this.audio.setListener?.(new THREE.Vector3(this.camera.position.x, this.camera.position.y, 4), new THREE.Vector3(0, 0, -1));
  }
  updateObjects(dt) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      if (!o.update(dt, this)) { if (o.model && o.type !== 'gate') this.scene.remove(o.model); if (o.ped && o.type === 'crystal') { /* pedestal stays */ } o.loop?.stop(); this.objects.splice(i, 1); }
    }
  }
  camera_(dt) {
    const p = this.player, L = this.L;
    const cam = this.camera, asp = cam.aspect;
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    let tx, ty, dist;
    if (L?.boss) { dist = clamp(13.8 / (tanH * asp), 15, 30); tx = .4; ty = 2.3 + Math.max(0, (p.y - 3) * .4); }
    else {
      dist = 11.8 * clamp(1.9 / asp, .9, 1.25);
      this.lookAhead = (this.lookAhead ?? 0) + ((p.facing * (L.prize ? 3.4 : 2.4) + p.vx * .25) - (this.lookAhead ?? 0)) * Math.min(1, dt * 2.2);
      tx = p.x + this.lookAhead;
      const halfW = dist * tanH * asp; tx = clamp(tx, L.len[0] + halfW - 1, L.len[1] - halfW + 1);
      // vertical: follow the ground the hero stands on, and the hero when far above/below it
      if (p.grounded || this.camGround == null) this.camGround = p.y;
      let gy = this.camGround; if (p.y > gy + 3) gy = p.y - 3; if (p.y < gy - .5) gy = p.y + .5;
      ty = gy + 1.6;
    }
    if (this.camSnap) { this.camPos.set(tx, ty, dist); this.camSnap = false; this.camGround = p.y; }
    this.camPos.x += (tx - this.camPos.x) * Math.min(1, dt * 5);
    this.camPos.y += (ty - this.camPos.y) * Math.min(1, dt * 3);
    this.camPos.z += (dist - this.camPos.z) * Math.min(1, dt * 2);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
    const s = this.shakeAmt * this.shakeAmt * .5;
    const sx = (Math.random() - .5) * s, sy = (Math.random() - .5) * s;
    cam.position.set(this.camPos.x + sx, this.camPos.y + this.camPos.z * .21 + sy, this.camPos.z);
    cam.lookAt(this.camPos.x + sx * .5, this.camPos.y + sy * .5, 0);
  }
}

new Game();
