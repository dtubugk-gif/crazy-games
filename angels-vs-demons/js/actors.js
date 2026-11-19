// Actors: the player (angel or demon hero), the 6 enemy roles of each side with their own AI, projectiles, heal orbs.
// Everything lives on the 2D plane z = 0; models turn ~60° toward the way they face so wings and weapons read.
import * as THREE from 'three';
import { Assets, Anim, node, ownMaterials } from './assets.js?v=15';
import { HEIGHT, ROLE_STATS } from './roster.js?v=15';
import { ARENA } from './world.js?v=15';
import { C } from './fx.js?v=15';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const TURN = 1.02; // radians the model turns toward its facing (3/4 view)
// bodies are drawn bigger than life so they read on a phone; melee reaches and hit radii scale with them
export const DISPLAY = { player: 1.55, rival: 1.55, small: 1.6, heavy: 1.4, charger: 1.45, caster: 1.5, diver: 1.5, boss: 1.02 };
const SC = 1.3;
export const ALLY_DMG = .7; // your army hits a bit softer than you do
const FALLBACK = {
  fly: ['idle'], attack1: ['attack'], attack2: ['attack1', 'attack'], attack3: ['attack2', 'attack1', 'attack'],
  attack: ['attack1', 'cast'], cast: ['attack', 'attack1'], dash: ['fly'], special: ['cast', 'attack3', 'attack'],
  reveal: ['victory', 'special', 'idle'], victory: ['reveal', 'idle'], charge: ['attack', 'fly'], block: ['hit', 'idle'],
  roar: ['enrage', 'attack'], summon: ['cast', 'roar', 'attack'], enrage: ['summon', 'roar', 'cast'], shield: ['cast', 'summon'],
  hit: ['idle'], die: ['hit'],
};

/** a model instance: root (position) > turn (facing + banking) > fit (scale + centring) > gltf scene */
export function makeModel(name, display = 1) {
  const root = new THREE.Group(), turn = new THREE.Group(), fit = new THREE.Group();
  root.add(turn); turn.add(fit);
  const scene = Assets.clone(name); fit.add(scene);
  // normalise: centre the bind-pose box on the origin (pivot = body centre) and fix the scale if it is far off
  const box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const want = HEIGHT[name] || size.y || 1;
  let s = 1; if (size.y > 0 && (size.y > want * 1.45 || size.y < want * .65)) s = want / size.y;
  fit.scale.setScalar(s * display); scene.position.set(-ctr.x, -ctr.y, -ctr.z);
  const mats = ownMaterials(scene);
  scene.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
  const anim = new Anim(scene, Assets.anims(name));
  const pts = {};
  for (const k of ['fx_hand_R', 'fx_hand_L', 'fx_head', 'fx_chest', 'fx_weapon_tip', 'fx_mouth']) pts[k] = node(scene, k);
  return { root, turn, fit, scene, mats, anim, pts, height: size.y * s * display, name };
}

export function animName(anim, n) {
  if (anim.has(n)) return n;
  for (const f of FALLBACK[n] || []) if (anim.has(f)) return f;
  return anim.has('idle') ? 'idle' : null;
}

const _v = new THREE.Vector3();
class Actor {
  constructor(g, modelName, side, display = 1) {
    this.g = g; this.side = side; this.m = makeModel(modelName, display);
    this.root = this.m.root; g.scene.add(this.root);
    this.x = 0; this.y = 5; this.vx = 0; this.vy = 0; this.face = 1; this.hp = 1; this.maxHp = 1; this.r = .6;
    this.dead = false; this.flash = 0; this.inv = 0; this.kx = 0; this.ky = 0; this.stun = 0;
    this.act = null; this.actT = 0; this.actDur = 0; this.events = []; this.bob = rnd(0, 6);
    this.playLoop('idle');
  }
  play(n, o = {}) { const a = animName(this.m.anim, n); if (!a) { o.done?.(); return 0; } this.m.anim.play(a, o); return this.m.anim.dur(a) / (o.speed || 1); }
  playLoop(n, speed = 1) { const a = animName(this.m.anim, n); if (a) this.m.anim.play(a, { speed, fade: .22 }); }
  /** a one-shot action with timed events [{t: fraction, fn}] */
  doAct(n, events = [], o = {}) {
    const speed = o.speed || 1;
    const real = animName(this.m.anim, n);
    const dur = o.dur || (real ? this.m.anim.dur(real) / speed : .5);
    if (real) this.m.anim.play(real, { once: true, restart: true, speed: o.dur && real ? this.m.anim.dur(real) / o.dur : speed, fade: o.fade ?? .1 });
    this.act = n; this.actT = 0; this.actDur = dur; this.events = events.map(e => ({ ...e, done: false })); this.onActEnd = o.end || null;
    return dur;
  }
  tickAct(dt) {
    if (!this.act) return;
    this.actT += dt;
    for (const e of this.events) if (!e.done && this.actT >= e.t * this.actDur) { e.done = true; e.fn(); }
    if (this.actT >= this.actDur) { const end = this.onActEnd; this.act = null; this.onActEnd = null; end?.(); }
  }
  point(name, fallbackDy = 0) {
    const n = this.m.pts[name];
    if (n) { n.getWorldPosition(_v); return { x: _v.x, y: _v.y }; }
    return { x: this.x + this.face * this.r * .8, y: this.y + fallbackDy };
  }
  setFlash(t = .09) { this.flash = t; }
  updateVisual(dt) {
    this.m.anim.update(dt);
    const bob = Math.sin(this.g.t * 2.4 + this.bob) * .08;
    this.root.position.set(this.x, this.y + bob, 0);
    const target = this.face * TURN;
    this.m.turn.rotation.y += (target - this.m.turn.rotation.y) * Math.min(1, dt * 10);
    // bank into horizontal motion (screen-space roll; the root never pitches so silhouettes stay clean)
    const bank = clamp(-this.vx * .025, -.3, .3);
    this.m.turn.rotation.z += (bank - this.m.turn.rotation.z) * Math.min(1, dt * 6);
    // hurt flash
    if (this.flash > 0) this.flash -= dt;
    const f = this.flash > 0 ? 1 : 0;
    if (f !== this._lastF || (this.inv > 0 && this.isPlayer)) {
      const blink = this.isPlayer && this.inv > 0 && Math.floor(this.g.t * 18) % 2 === 0;
      for (const m of this.m.mats) {
        if (!m.emissive) continue;
        if (f) { m.emissive.setRGB(1, .92, .8); m.emissiveIntensity = .9; }
        else { m.emissive.copy(m.userData.baseEmissive || new THREE.Color(0)); m.emissiveIntensity = m.userData.baseEI ?? 1; }
        m.transparent = blink; m.opacity = blink ? .45 : 1;
      }
      this._lastF = f;
    }
  }
  remove() { this.g.scene.remove(this.root); }
}

// ================================================================ the player
export class Player extends Actor {
  constructor(g, sideDef, model = sideDef.hero, display = DISPLAY.player) {
    super(g, model, sideDef.key, display);
    this.isPlayer = true; this.def = sideDef;
    this.maxHp = 100; this.hp = 100; this.r = .62 * SC;
    this.combo = 0; this.comboT = 0; this.queued = false; this.shotCd = 0; this.dashCd = 0; this.dashT = 0;
    this.special = 0; this.flapT = 0; this.x = sideDef.homeDir * 8; this.y = 5.5; this.face = -sideDef.homeDir;
    this.up = { dmg: 0, speed: 0, multi: 0, hp: 0, special: 0, rapid: 0, vamp: 0 };
  }
  get dmgMul() { return 1 + this.up.dmg * .25; }
  get spd() { return 9.2 * (1 + this.up.speed * .15); }
  nearest(maxD = 99, front = false) {
    let best = null, bd = maxD;
    for (const e of this.g.enemies) {
      if (e.dead || e.spawning > 0) continue;
      const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy) - e.r;
      if (front && dx * this.face < -1) continue;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  update(dt, inp) {
    const g = this.g;
    if (this.dead) { this.vy -= 6 * dt; this.y += this.vy * dt; this.updateVisual(dt); return; }
    this.inv = Math.max(0, this.inv - dt); this.shotCd -= dt; this.dashCd -= dt; this.comboT -= dt;
    // slow natural healing: a few points every couple of seconds
    this.regenT = (this.regenT ?? 2) - dt;
    if (this.regenT <= 0) { this.regenT = 2; if (this.hp < this.maxHp && g.state === 'battle') g.regen(this); }
    this.tickAct(dt);
    const busy = this.act && this.act !== 'cast';
    // movement
    let ix = inp.x, iy = inp.y; const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    if (this.dashT > 0) {
      this.dashT -= dt;
      if (Math.random() < .8) g.fx.trail(this.x - this.face * .3, this.y, this.def.key === 'angel' ? 'light' : 'fire');
    } else {
      const sp = this.spd * (busy ? .45 : 1);
      const ax = ix * sp - this.vx, ay = iy * sp - this.vy;
      const acc = il > .05 ? 9 : 6;
      this.vx += ax * Math.min(1, acc * dt); this.vy += ay * Math.min(1, acc * dt);
    }
    this.vx += this.kx; this.vy += this.ky; this.kx *= .5; this.ky *= .5;
    this.x += this.vx * dt; this.y += this.vy * dt;
    // soft arena walls
    if (this.x < ARENA.x0) { this.x = ARENA.x0; this.vx = Math.max(0, this.vx); }
    if (this.x > ARENA.x1) { this.x = ARENA.x1; this.vx = Math.min(0, this.vx); }
    if (this.y < ARENA.y0) { this.y = ARENA.y0; this.vy = Math.max(0, this.vy); }
    if (this.y > ARENA.y1) { this.y = ARENA.y1; this.vy = Math.min(0, this.vy); }
    if (!busy && Math.abs(ix) > .2) this.face = Math.sign(ix);
    // wing flaps sound while flying
    this.flapT -= dt * (il > .1 ? 1.6 : .8);
    if (this.flapT <= 0) { this.flapT = .55; g.sfx(this.def.flap, this.x, this.y, { vol: .28 }); }
    // actions
    if (inp.dash && this.dashCd <= 0) this.dash(ix, iy);
    if (inp.attack) { if (this.act && this.act.startsWith('attack')) this.queued = true; else if (!this.act || this.act === 'cast') this.attack(); }
    if (inp.shoot && this.shotCd <= 0 && (!this.act || this.act === 'cast')) this.shoot();
    if (inp.special && this.special >= 1 && !this.act) this.useSpecial();
    if (!this.act) this.playLoop(il > .15 || this.dashT > 0 ? 'fly' : 'idle', il > .15 ? 1.15 : 1);
    this.updateVisual(dt);
  }
  dash(ix, iy) {
    const g = this.g; let dx = ix, dy = iy; if (Math.hypot(dx, dy) < .2) { dx = this.face; dy = 0; }
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    const sp = 25 * (1 + this.up.speed * .1);
    this.vx = dx * sp; this.vy = dy * sp; this.dashT = .2; this.dashCd = .65 - this.up.speed * .08; this.inv = Math.max(this.inv, .3);
    if (Math.abs(dx) > .2) this.face = Math.sign(dx);
    if (!this.act) this.doAct('dash', [], { dur: .3 });
    g.sfx('dash', this.x, this.y, { vol: .7 });
    if (this.def.key === 'angel') g.fx.feathers(this.x, this.y, 4); else g.fx.embers(this.x, this.y, 8);
  }
  attack() {
    const g = this.g; const target = this.nearest(7.5);
    if (target) { this.face = Math.sign(target.x - this.x) || this.face; }
    const step = this.comboT > 0 ? (this.combo % 3) + 1 : 1; this.combo = step; this.queued = false;
    const dmg = [10, 12, 20][step - 1] * this.dmgMul, reach = [2.3, 2.4, 2.8][step - 1] * SC;
    // a little lunge toward the target makes melee feel sticky
    if (target) { const dx = target.x - this.x, dy = target.y - this.y, d = Math.hypot(dx, dy); if (d > 1.5 && d < 6.5) { this.vx += dx / d * 10; this.vy += dy / d * 10; } }
    const speed = 1.15;
    this.doAct('attack' + step, [
      { t: .18, fn: () => g.sfx(this.def.swing, this.x, this.y, { vol: .8, rate: 1 + step * .06 }) },
      { t: .4, fn: () => this.meleeHit(dmg, reach, step === 3 ? 13 : 6, step) },
    ], {
      speed, end: () => { this.comboT = .32; if (this.queued) this.attack(); },
    });
  }
  meleeHit(dmg, reach, knock, step) {
    const g = this.g; const cx = this.x + this.face * reach * .55, cy = this.y + .1;
    let hit = 0;
    for (const e of g.enemies) {
      if (e.dead || e.spawning > 0) continue;
      const dx = e.x - cx, dy = e.y - cy;
      if (Math.hypot(dx, dy) < reach * .75 + e.r) { g.hurtEnemy(e, dmg, this.face * knock, 2 + (step === 3 ? 3 : 0), { melee: true, fromX: this.x }); hit++; }
    }
    const kind = this.def.key === 'angel' ? 'light' : 'fire';
    if (hit) { g.hitStop(step === 3 ? .09 : .05); g.shake(step === 3 ? .35 : .18); g.sfx(this.def.hitSfx, cx, cy, { vol: .9 }); }
    // swoosh arc particles
    for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 2.2, rr = reach * .9; g.fx.trail(this.x + this.face * Math.cos(a) * rr, this.y + Math.sin(a) * rr * .8, kind, .3); }
  }
  shoot() {
    const g = this.g; this.shotCd = .42 * (1 - this.up.rapid * .3);
    const t = this.nearest(16, true);
    let ang;
    if (t) { ang = Math.atan2(t.y - this.y, t.x - this.x); this.face = Math.sign(t.x - this.x) || this.face; }
    else ang = this.face > 0 ? 0 : Math.PI;
    const fire = () => {
      const p = this.point(this.def.key === 'demon' ? 'fx_hand_L' : 'fx_hand_R', .2); // the demon hero throws with his free hand
      const angs = this.up.multi ? [ang - .2, ang, ang + .2] : [ang];
      for (const a of angs) g.shoot(this.def.shot, p.x, p.y, a, 'player', { dmg: (this.def.shot === 'fire' ? 9 : 8) * this.dmgMul });
      g.sfx(this.def.shotSfx, p.x, p.y, { vol: .75 });
    };
    if (!this.act) this.doAct('cast', [{ t: .45, fn: fire }], { speed: 1.5 }); else fire();
  }
  useSpecial() {
    const g = this.g; this.special = 0; this.inv = Math.max(this.inv, 1.3);
    this.doAct('special', [{ t: .55, fn: () => g.playerNova(this) }], { dur: 1.0 });
    g.slowmo(.6, .45);
  }
}

// ================================================================ enemies
export class Enemy extends Actor {
  constructor(g, sideDef, role, opts = {}) {
    const info = sideDef.roles[role];
    super(g, info.model, sideDef.key, DISPLAY[role] || 1);
    this.def = sideDef; this.role = role; this.info = info; this.stats = ROLE_STATS[role];
    const hpMul = opts.hpMul || 1;
    this.maxHp = this.hp = Math.round(this.stats.hp * hpMul); this.r = this.stats.radius * (DISPLAY[role] || 1) * .85;
    this.sp = this.stats.speed * rnd(.9, 1.1); this.seed = rnd(0, 100);
    this.cd = { a: rnd(1.2, 2.4), b: rnd(3, 5), c: rnd(6, 9), d: rnd(8, 12) };
    this.state = 'move'; this.stT = 0; this.shield = 0; this.shieldT = 0; this.hitCount = 0; this.hitWin = 0;
    this.phase = 1; this.touchCd = 0; this.contactDone = false;
    this.team = opts.team || 'foe'; this.isAlly = this.team === 'ally'; this.shotFrom = this.isAlly ? 'ally' : 'enemy';
    this.slot = opts.slot ?? 0; this.tgt = null; this.retarget = 0;
    const from = this.isAlly ? g.side.homeDir : -g.side.homeDir; // each army flies in from its own world
    this.x = opts.x ?? from * (ARENA.x1 + 4); this.y = opts.y ?? rnd(2.5, 9.5); this.face = -from;
    this.spawning = opts.instant ? 0 : .6; // fly-in grace
    this.hpBar = makeBar(g, role === 'boss' ? 0 : this.m.height, this.isAlly);
    if (role === 'boss') this.hpBar.root.visible = false;
  }
  /** who this unit fights right now: the enemy army goes for you or the nearest soldier of your army, your army for the nearest foe */
  get p() { return this.tgt || this.g.player; }
  foes() { const g = this.g; return this.isAlly ? g.enemies : [g.player, ...g.allies]; }
  pickTarget() {
    let best = null, bd = 1e9;
    for (const o of this.foes()) {
      if (!o || o.dead || o.spawning > .3) continue;
      let d = Math.hypot(o.x - this.x, o.y - this.y);
      if (o.isPlayer) d *= (this.role === 'rival' || this.role === 'boss') ? .35 : .6; // you draw the most attention
      if (o.role === 'boss') d *= 1.3;
      if (d < bd) { bd = d; best = o; }
    }
    this.tgt = best;
  }
  /** damage one opponent: you, a soldier of your army, or (for your army) an enemy */
  hit(o, dmg, fx, fy, dot) {
    const g = this.g; if (!o || o.dead) return;
    if (o.isPlayer) g.hurtPlayer(dmg, fx, fy, dot);
    else if (o.isAlly) g.hurtAlly(o, this.role === 'boss' ? dmg * .5 : dmg, fx, fy); // the boss is your fight: it hits soldiers softer
    else g.hurtEnemy(o, dmg * ALLY_DMG, Math.sign(o.x - fx) * 4, 1, { ally: true, melee: !dot });
  }
  /** hit every opponent within R of (cx, cy); returns the set that was hit */
  strike(cx, cy, R, dmg, dot, skip) {
    const hitSet = new Set();
    for (const o of this.foes()) if (o && !o.dead && !(skip && skip.has(o)) && Math.hypot(o.x - cx, o.y - cy) < R + o.r) { this.hit(o, dmg, this.x, this.y, dot); hitSet.add(o); }
    return hitSet;
  }
  /** between fights your soldiers fly in formation behind you, facing the enemy side */
  formation(dt) {
    const g = this.g, P = g.player; if (!P) return;
    const k = this.slot, col = k % 3, row = Math.floor(k / 3);
    const tx = clamp(P.x + g.side.homeDir * (2.6 + row * 2.3), ARENA.x0 + 1, ARENA.x1 - 1), ty = clamp(P.y + (col - 1) * 2 + (row % 2) * .8, ARENA.y0 + .6, ARENA.y1 - .5);
    this.steer(tx, ty, this.sp * 1.3, 2.6, dt);
    this.face = -g.side.homeDir; this.moveAnim();
  }
  update(dt) {
    const g = this.g;
    if (this.dead) {
      this.deadT += dt; this.vy -= 7 * dt; this.vx *= .96; this.x += this.vx * dt; this.y += this.vy * dt;
      this.m.turn.rotation.z += dt * this.face * 1.2;
      if (this.deadT > .9) { const s = Math.max(0, 1 - (this.deadT - .9) / .5); this.m.fit.scale.setScalar(this.m.fit.userData.s0 * s + .0001); }
      this.updateVisual(dt); this.hpBar.root.visible = false;
      return this.deadT < 1.4;
    }
    if (this.spawning > 0) this.spawning -= dt;
    this.inv = Math.max(0, this.inv - dt); this.stun = Math.max(0, this.stun - dt); this.touchCd -= dt; this.hitWin -= dt;
    for (const k in this.cd) this.cd[k] -= dt * (this.phase === 2 ? 1.4 : 1);
    if (this.shieldT > 0) { this.shieldT -= dt; if (this.shieldT <= 0) this.shield = 0; }
    this.tickAct(dt);
    this.retarget -= dt;
    if (this.retarget <= 0 || !this.tgt || this.tgt.dead) { this.retarget = rnd(.35, .6); this.pickTarget(); }
    if (this.stun <= 0 && this.tgt && !this.tgt.dead) this.think(dt);
    else if (this.stun <= 0 && this.isAlly && !this.act) this.formation(dt);
    else { this.vx *= .9; this.vy *= .9; }
    this.vx += this.kx; this.vy += this.ky; this.kx *= .4; this.ky *= .4;
    // separation from the rest of the same army
    for (const o of (this.isAlly ? g.allies : g.enemies)) {
      if (o === this || o.dead) continue;
      const dx = this.x - o.x, dy = this.y - o.y, d = Math.hypot(dx, dy), min = this.r + o.r + .3;
      if (d < min && d > .001) { const push = (min - d) * 3; this.vx += dx / d * push; this.vy += dy / d * push; }
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const lim = this.role === 'boss' ? 3.8 : 0; // the boss's whole body stays on screen
    if (this.spawning <= 0) { this.x = clamp(this.x, ARENA.x0 - .5 + lim, ARENA.x1 + .5 - lim); }
    this.y = clamp(this.y, ARENA.y0 + (this.role === 'boss' ? 2.4 : 0), ARENA.y1 - (this.role === 'boss' ? 2.8 : 0));
    // contact damage (heavy / boss bodies, chargers and divers while lunging)
    if (this.lunging && !this.contactDone) { const h = this.strike(this.x, this.y, this.r * .9, this.lungeDmg); if (h.size) { this.contactDone = true; this.onContact?.(); } }
    else if (this.stats.touch && this.touchCd <= 0 && this.strike(this.x, this.y, this.r * .9, this.stats.touch).size) this.touchCd = .9;
    // shield bubble
    if (this.shieldMesh) { this.shieldMesh.visible = this.shield > 0; if (this.shield > 0) { this.shieldMesh.position.set(this.x, this.y, 0); this.shieldMesh.material.uniforms.t.value = g.t; } }
    this.updateVisual(dt);
    this.hpBar.set(this.x, this.y, this.hp / this.maxHp, this.hp < this.maxHp);
    return true;
  }
  steer(tx, ty, sp, k = 3, dt = 1 / 60) {
    // a spot outside the arena flips to the other side of the player instead of pinning the enemy to the edge
    const p = this.p, m = 1.6;
    if (tx > ARENA.x1 - m || tx < ARENA.x0 + m) { const mir = 2 * p.x - tx; tx = (mir > ARENA.x0 + m && mir < ARENA.x1 - m) ? mir : clamp(tx, ARENA.x0 + m, ARENA.x1 - m); }
    ty = clamp(ty, ARENA.y0 + .6, ARENA.y1 - .5);
    if (this.isAlly) tx = clamp(tx, -7, 7); // your army holds a front line on screen and lets the enemy come in
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    const s = Math.min(sp, d * 2.2);
    const vx = d > .01 ? dx / d * s : 0, vy = d > .01 ? dy / d * s : 0;
    this.vx += (vx - this.vx) * Math.min(1, k * dt); this.vy += (vy - this.vy) * Math.min(1, k * dt);
  }
  lookAtPlayer() { const dx = this.p.x - this.x; if (Math.abs(dx) > .3) this.face = Math.sign(dx); }
  moveAnim() { if (!this.act) this.playLoop(Math.hypot(this.vx, this.vy) > 1.5 ? 'fly' : 'idle'); }
  aimAt(px, py, speed) { // lead the player a little
    const p = this.p, dx = px - this.x, dy = py - this.y, t = Math.hypot(dx, dy) / speed;
    return Math.atan2(py + p.vy * t * .5 - this.y, px + p.vx * t * .5 - this.x);
  }
  think(dt) {
    const g = this.g, p = this.p, dx = p.x - this.x, dy = p.y - this.y, dist = Math.hypot(dx, dy);
    const side = Math.sign(this.x - p.x) || -g.side.homeDir;
    const t = g.t + this.seed;
    switch (this.role) {
      case 'small': {
        if (!this.lunging) this.steer(p.x + side * 6.5, clamp(p.y + Math.sin(t * .9) * 2.5, 1.5, 10), this.sp, 3, dt);
        this.lookAtPlayer();
        const imp = this.def.key === 'demon';
        if (imp && this.spawning <= 0 && Math.random() < dt * .12) g.sfx('imp_cackle', this.x, this.y, { vol: .55, gap: 1.5 });
        if (imp && dist < 2.6 * SC && this.cd.b <= 0 && !this.act) {
          this.cd.b = 2.2;
          this.doAct('attack', [{ t: .45, fn: () => { if (Math.hypot(p.x - this.x, p.y - this.y) < 2.8 * SC + p.r) { this.hit(p, 9, this.x, this.y); g.sfx('claw_hit', this.x, this.y); } else g.sfx('claw_swing', this.x, this.y, { vol: .6 }); } }]);
          this.vx += Math.sign(dx) * 6;
        } else if (this.cd.a <= 0 && dist < 15 && !this.act && this.spawning <= 0) {
          this.cd.a = rnd(2.1, 3.0);
          const kind = imp ? 'ember' : 'arrow';
          this.doAct(imp ? 'cast' : 'attack', [{ t: .55, fn: () => { const q = this.point('fx_hand_R'); g.shoot(kind, q.x, q.y, this.aimAt(p.x, p.y, 14), this.shotFrom, { dmg: 7, aim: p }); g.sfx(imp ? 'fireball_cast' : 'arrow_shoot', q.x, q.y, { vol: .55 }); } }]);
        }
        break;
      }
      case 'heavy': {
        const brute = this.def.key === 'demon';
        if (this.state === 'windup') {
          this.vx *= .85; this.vy *= .85; this.stT -= dt; this.lookAtPlayer();
          if (Math.random() < .5) g.fx.trail(this.x + rnd(-.6, .6), this.y + rnd(-.8, .8), brute ? 'fire' : 'light', .2);
          if (this.stT <= 0) { this.state = 'lunge'; this.stT = .62; const a = Math.atan2(dy, dx); this.vx = Math.cos(a) * 17; this.vy = Math.sin(a) * 17; this.lunging = true; this.lungeDmg = 16; this.contactDone = false; g.sfx('dash', this.x, this.y, { vol: .8, rate: .8 }); }
          break;
        }
        if (this.state === 'lunge') { this.stT -= dt; g.fx.trail(this.x, this.y, brute ? 'fire' : 'light', .2); if (this.stT <= 0) { this.state = 'move'; this.lunging = false; this.vx *= .3; this.vy *= .3; } break; }
        if (!this.act) this.steer(p.x + side * 1.9 * SC, p.y, this.sp, 2.4, dt);
        this.lookAtPlayer();
        if (dist < 3.1 * SC && this.cd.a <= 0 && !this.act) {
          this.cd.a = rnd(1.6, 2.3);
          this.doAct('attack', [
            { t: .2, fn: () => g.sfx(brute ? 'claw_swing' : 'sword_swing', this.x, this.y, { vol: .8, rate: .8 }) },
            { t: .5, fn: () => {
              const cx = this.x + this.face * 1.4 * SC;
              const near = this.strike(cx, this.y, 2.2 * SC, 16); if (near.size) g.sfx(brute ? 'club_hit' : 'sword_hit', cx, this.y);
              if (brute) { g.fx.ring(cx, this.y, .5, 3.6, .45, C.fire, .7); if (!this.isAlly) g.shake(.25); this.strike(cx, this.y, 3.6, 8, false, near); }
            } },
          ]);
        } else if (dist > 4.5 && dist < 14 && this.cd.c <= 0 && !this.act) {
          this.cd.c = rnd(5.5, 7.5); this.state = 'windup'; this.stT = .62;
          this.doAct('charge', [], { dur: .62 });
          g.sfx(brute ? 'brute_roar' : 'charge_windup', this.x, this.y, { vol: .8 });
        }
        break;
      }
      case 'charger': {
        if (this.state === 'windup') {
          this.vx *= .85; this.vy *= .85; this.stT -= dt; this.lookAtPlayer();
          if (this.stT <= 0) { this.state = 'lunge'; this.stT = .7; const a = Math.atan2(this.ty - this.y, this.tx - this.x); this.vx = Math.cos(a) * 20; this.vy = Math.sin(a) * 20; this.lunging = true; this.lungeDmg = 15; this.contactDone = false; g.sfx('dash', this.x, this.y, { vol: .9 }); }
          break;
        }
        if (this.state === 'lunge') { this.stT -= dt; g.fx.trail(this.x, this.y, this.def.key === 'angel' ? 'light' : 'fire', .1); if (this.stT <= 0) { this.state = 'tired'; this.stT = .9; this.lunging = false; } break; }
        if (this.state === 'tired') { this.vx *= .9; this.vy *= .9; this.stT -= dt; if (this.stT <= 0) this.state = 'move'; this.moveAnim(); break; }
        if (!this.act) this.steer(p.x + side * 8, clamp(p.y + Math.sin(t * .7) * 1.5, 1.5, 10), this.sp, 2.5, dt);
        this.lookAtPlayer();
        if (dist < 2.6 * SC && this.cd.b <= 0 && !this.act) {
          this.cd.b = 2;
          this.doAct('attack', [{ t: .5, fn: () => { if (Math.hypot(p.x - this.x, p.y - this.y) < 2.6 * SC + p.r) { this.hit(p, 12, this.x, this.y); g.sfx(this.def.key === 'angel' ? 'sword_hit' : 'claw_hit', this.x, this.y); } } }]);
        } else if (this.cd.a <= 0 && dist < 15 && this.spawning <= 0 && !this.act) {
          this.cd.a = rnd(3.2, 4.4); this.state = 'windup'; this.stT = .65; this.tx = p.x; this.ty = p.y;
          this.doAct('charge', [], { dur: .65 });
          g.fx.beam(this.x, this.y, Math.atan2(p.y - this.y, p.x - this.x), Math.min(16, dist + 3), .5, .65, this.def.key === 'angel' ? C.gold : C.fire);
          g.sfx(this.def.key === 'angel' ? 'charge_windup' : 'pig_squeal_roar', this.x, this.y, { vol: .8 });
        }
        break;
      }
      case 'caster': {
        if (!this.act) this.steer(p.x + side * 9, clamp(p.y + 2 + Math.sin(t * .6) * 2, 2.5, 10.5), this.sp, 2, dt);
        this.lookAtPlayer();
        const angel = this.def.key === 'angel';
        if (this.cd.c <= 0 && !this.act) {
          const allies = (this.isAlly ? g.allies : g.enemies).filter(e => e !== this && !e.dead && !e.swarm && e.shield <= 0 && Math.hypot(e.x - this.x, e.y - this.y) < 8);
          this.cd.c = this.isAlly ? rnd(12, 15) : rnd(7, 9); // your casters bless less often so the screen stays readable
          if (allies.length) {
            this.doAct('shield', [{ t: .55, fn: () => { for (const a of [this, ...allies].slice(0, this.isAlly ? 3 : 4)) g.giveShield(a, angel); if (this.isAlly && g.player && Math.hypot(g.player.x - this.x, g.player.y - this.y) < 10) g.heal(6); g.sfx('shield_bless', this.x, this.y, { vol: .7 }); } }]);
            break;
          }
        }
        if (this.cd.a <= 0 && dist < 18 && this.spawning <= 0 && !this.act) {
          this.cd.a = rnd(2.8, 3.6);
          this.doAct('cast', [{ t: .55, fn: () => { const q = this.point('fx_weapon_tip', 1); g.shoot(angel ? 'orb_light' : 'orb_dark', q.x, q.y, Math.atan2(p.y - q.y, p.x - q.x), this.shotFrom, { dmg: 10, aim: p }); g.sfx('orb_cast', q.x, q.y, { vol: .6 }); } }]);
        }
        break;
      }
      case 'diver': {
        const angel = this.def.key === 'angel';
        if (this.state === 'aim') {
          this.vx *= .85; this.vy *= .85; this.stT -= dt; this.lookAtPlayer();
          if (this.stT <= 0) { this.state = 'dive'; this.stT = .85; const a = Math.atan2(this.ty - this.y, this.tx - this.x); this.vx = Math.cos(a) * 22; this.vy = Math.sin(a) * 22; this.lunging = true; this.lungeDmg = 14; this.contactDone = false; this.doAct('attack', [], { dur: .85 }); g.sfx(angel ? 'lightning_strike' : 'gargoyle_screech', this.x, this.y, { vol: .7 }); }
          break;
        }
        if (this.state === 'dive') {
          this.stT -= dt; g.fx.trail(this.x, this.y, angel ? 'light' : 'dark', .1);
          if (this.stT <= 0 || Math.hypot(this.tx - this.x, this.ty - this.y) < .6) {
            this.state = 'recover'; this.stT = .9; this.lunging = false;
            if (angel) { g.fx.bolt(this.x, this.y + 7, this.x, this.y, .3, 1.4); g.fx.burst(this.x, this.y, 'light', 12); }
            else { g.fx.burst(this.x, this.y, 'stone', 10); g.sfx('stone_hit', this.x, this.y, { vol: .8 }); }
            if (!this.contactDone && this.strike(this.x, this.y, 1.8, 10).size) this.contactDone = true;
          }
          break;
        }
        if (this.state === 'recover') { this.stT -= dt; this.vy += 10 * dt; this.vx *= .95; if (this.stT <= 0) { this.state = 'move'; this.cd.a = rnd(1.2, 2); } this.moveAnim(); break; }
        this.steer(p.x + side * 3.5, Math.min(ARENA.y1 - .4, p.y + 5.5), this.sp * 1.1, 2.6, dt);
        this.lookAtPlayer();
        if (this.cd.a <= 0 && this.spawning <= 0 && !this.act && this.y > p.y + 2) {
          this.cd.a = rnd(2.5, 3.5); this.state = 'aim'; this.stT = .5; this.tx = p.x + p.vx * .25; this.ty = p.y + p.vy * .25;
          g.fx.marker(this.tx, this.ty, 'circle', .5, angel ? C.goldW : C.fire, 1.1);
        }
        break;
      }
      case 'rival': this.thinkRival(dt, dist, dx, dy, side); break;
      case 'boss': this.thinkBoss(dt, dist, dx, dy, side); break;
    }
    if (!this.act && !this.lunging && this.state === 'move') this.moveAnim();
  }
  thinkRival(dt, dist, dx, dy, side) {
    const g = this.g, p = this.p, angel = this.def.key === 'angel';
    if (this.dashT > 0) { this.dashT -= dt; g.fx.trail(this.x, this.y, angel ? 'light' : 'fire', .1); return; }
    if (this.state === 'nova') { this.vx *= .9; this.vy *= .9; return; }
    const want = (this.act ? 1.6 : (this.cd.a < .5 ? 2 : 5.5)) * SC;
    this.steer(p.x + side * want, p.y + Math.sin(g.t * 1.3) * 1.2, this.sp, 3.4, dt);
    this.lookAtPlayer();
    // dodge after being hit a few times quickly
    if (this.hitCount >= 3 && this.cd.d <= 0) {
      this.hitCount = 0; this.cd.d = 3.5; this.dashT = .28; this.inv = .4;
      const a = Math.atan2(-dy, -dx) + rnd(-.8, .8); this.vx = Math.cos(a) * 22; this.vy = Math.sin(a) * 22;
      this.doAct('dash', [], { dur: .3 }); g.sfx('dash', this.x, this.y); return;
    }
    if (this.hp < this.maxHp * .55 && this.cd.c <= 0 && !this.act) {
      this.cd.c = 9; this.state = 'nova';
      g.fx.marker(this.x, this.y, 'circle', .85, angel ? C.goldW : C.fire, 5.5);
      g.sfx(angel ? 'special_holy' : 'special_fire', this.x, this.y, { vol: .7 });
      this.doAct('special', [{ t: .85, fn: () => {
        g.fx.ring(this.x, this.y, .5, 5.8, .5, angel ? C.goldW : C.fire, .9);
        if (angel) g.fx.rays(this.x, this.y, 10, 6, .45, C.goldW); else g.fx.burst(this.x, this.y, 'fire', 30, 1.6);
        this.strike(this.x, this.y, 5.5, 22);
        g.shake(.4);
      } }], { dur: 1.05, end: () => { this.state = 'move'; } });
      return;
    }
    if (dist < 2.8 * SC && this.cd.a <= 0 && !this.act) {
      this.cd.a = rnd(1.3, 1.9);
      const swing = (n) => ({ t: .45, fn: () => { g.sfx(angel ? 'sword_swing' : 'trident_swing', this.x, this.y, { vol: .7 }); if (this.strike(this.x + this.face * 1.2 * SC, this.y, 2 * SC, n === 3 ? 11 : 7).size) g.sfx(angel ? 'sword_hit' : 'trident_hit', p.x, p.y); } });
      this.doAct('attack1', [swing(1)], { speed: 1.1, end: () => { if (!this.dead && Math.hypot(this.p.x - this.x, this.p.y - this.y) < 3.2 * SC) this.doAct('attack2', [swing(2)], { speed: 1.1, end: () => { if (!this.dead && Math.random() < .6) this.doAct('attack3', [swing(3)], { speed: 1.05 }); } }); } });
      return;
    }
    if (this.cd.b <= 0 && dist > 3.5 && !this.act) {
      this.cd.b = rnd(1.4, 2);
      this.doAct('cast', [{ t: .45, fn: () => { const q = this.point('fx_hand_R', .2); g.shoot(angel ? 'spear' : 'fire', q.x, q.y, this.aimAt(p.x, p.y, 18), this.shotFrom, { dmg: 8, aim: p }); g.sfx(angel ? 'spear_throw' : 'fireball_cast', q.x, q.y, { vol: .7 }); } }], { speed: 1.3 });
    }
  }
  thinkBoss(dt, dist, dx, dy, side) {
    const g = this.g, p = this.p, angel = this.def.key === 'angel';
    if (this.state === 'enrage' || this.state === 'breath') { this.vx *= .9; this.vy *= .9; if (this.state === 'breath') this.breathTick(dt); return; }
    const tx = this.act ? this.x : clamp(p.x + side * 5, -8.5, 8.5);
    this.steer(tx, clamp(p.y + .3, 4, 5.6), this.sp * (this.phase === 2 ? 1.3 : 1), 1.6, dt);
    this.lookAtPlayer();
    if (this.act) return;
    if (this.phase === 1 && this.hp < this.maxHp * .5) {
      this.phase = 2; this.state = 'enrage'; this.inv = 1.6;
      g.sfx(this.def.bossRoar, this.x, this.y, { vol: 1 }); g.shake(.6); g.ui.banner(angel ? 'המלאך הגדול זועם!' : 'מלך השדים זועם!', 'תגבורת לצבא שלך בדרך!');
      g.after(1.6, () => g.reinforce(false)); // your army is refilled for the last half of the fight
      this.doAct('enrage', [{ t: .5, fn: () => { g.fx.ring(this.x, this.y, 1, 9, .7, angel ? C.goldW : C.fire, .9); this.strike(this.x, this.y, 7, 10); } }], { dur: 1.5, end: () => { this.state = 'move'; } });
      return;
    }
    if (dist < 5.4 && this.cd.a <= 0) {
      this.cd.a = rnd(2.2, 3);
      g.fx.marker(this.x + this.face * 3, this.y, 'circle', .5, angel ? C.goldW : C.fire, 3.2);
      this.doAct('attack', [
        { t: .3, fn: () => g.sfx(angel ? 'sword_swing' : 'claw_swing', this.x, this.y, { vol: 1, rate: .7 }) },
        { t: .45, fn: () => {
          const cx = this.x + this.face * 3;
          g.fx.ring(cx, this.y, .5, 3.6, .35, angel ? C.goldW : C.fire, .8); g.shake(.3);
          this.strike(cx, this.y, 3.4, 20);
        } },
      ], { dur: 1.2 });
      return;
    }
    if (this.cd.b <= 0) {
      this.cd.b = rnd(4.5, 6);
      if (angel) {
        // rain of light spears: warning columns, then spears fall
        const n = this.phase === 2 ? 8 : 5;
        this.doAct('cast', [{ t: .3, fn: () => {
          g.sfx('light_spear_rain', p.x, 9, { vol: .8 });
          const xs = []; for (let i = 0; i < n; i++) xs.push(clamp(p.x + (i - (n - 1) / 2) * 2.3 + rnd(-.5, .5), ARENA.x0, ARENA.x1));
          for (const x of xs) { g.fx.marker(x, 5.5, 'column', 1, C.goldW, 1.4, 14); g.after(1 + rnd(0, .15), () => g.shoot('rain', x, ARENA.y1 + 3, -Math.PI / 2, 'enemy', { dmg: 15 })); }
        } }], { dur: 1 });
      } else {
        // fire breath toward the player, then meteors in phase 2
        this.state = 'breath'; this.breathT = 1.5; this.breathAng = Math.atan2(dy, dx);
        this.doAct('cast', [], { dur: 1.6 }); g.sfx('special_fire', this.x, this.y, { vol: .8, rate: .8 });
        if (this.phase === 2) g.after(1.7, () => this.meteors());
      }
      return;
    }
    if (this.cd.c <= 0) {
      this.cd.c = this.phase === 2 ? 11 : 14;
      this.doAct('summon', [{ t: .5, fn: () => {
        g.sfx(this.def.bossRoar, this.x, this.y, { vol: .7, rate: 1.1 });
        const roles = this.phase === 2 ? ['small', 'small', 'small', 'diver', 'charger'] : ['small', 'small', 'small', 'diver'];
        for (const r of roles) g.spawn(r, { x: this.x + rnd(-2, 2), y: this.y + rnd(-2, 2), instant: true, hpMul: .8, summoned: true });
        g.fx.burst(this.x, this.y, angel ? 'light' : 'fire', 24, 1.4);
      } }], { dur: 1.2 });
    }
  }
  breathTick(dt) {
    const g = this.g, p = this.p;
    this.breathT -= dt;
    const target = Math.atan2(p.y - this.y, p.x - this.x);
    let da = target - this.breathAng; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    this.breathAng += clamp(da, -.9 * dt, .9 * dt);
    const m = this.point('fx_mouth', 1.6);
    for (let i = 0; i < 4; i++) {
      const a = this.breathAng + rnd(-.25, .25), s = rnd(10, 15);
      g.fx.glow.emit({ x: m.x, y: m.y, z: rnd(-.2, .2), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.45, .65), size: rnd(.5, .9), size1: 2.2, alpha: .8, color: C.fireHot, color1: C.ember, drag: 1.2, grav: -3 });
    }
    if (Math.random() < .5) g.fx.smoke.emit({ x: m.x + Math.cos(this.breathAng) * 4, y: m.y + Math.sin(this.breathAng) * 4, vx: Math.cos(this.breathAng) * 4, vy: 1.5, life: .9, size: 1, size1: 2.6, alpha: .4, color: C.smoke });
    this.breathHit = (this.breathHit || 0) - dt;
    if (this.breathHit <= 0) {
      this.breathHit = .22;
      for (const o of this.foes()) {
        if (!o || o.dead) continue;
        const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy);
        let ang = Math.atan2(dy, dx) - this.breathAng; while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI;
        if (d < 9 && Math.abs(ang) < .34) this.hit(o, 5, m.x, m.y, true);
      }
    }
    if (this.breathT <= 0) this.state = 'move';
  }
  meteors() {
    const g = this.g, p = this.p;
    for (let i = 0; i < 4; i++) {
      const tx = clamp(p.x + rnd(-5, 5), ARENA.x0, ARENA.x1), ty = clamp(p.y + rnd(-2.5, 2.5), ARENA.y0, ARENA.y1);
      g.after(i * .35, () => {
        g.fx.marker(tx, ty, 'circle', 1.1, C.fire, 1.6); g.sfx('meteor_fall', tx, ty, { vol: .7 });
        g.after(.35, () => { const sx = tx - 9 * g.side.homeDir, sy = ARENA.y1 + 6; g.shoot('meteor', sx, sy, Math.atan2(ty - sy, tx - sx), 'enemy', { dmg: 16, target: { x: tx, y: ty } }); });
      });
    }
  }
  remove() { super.remove(); this.hpBar.remove(); if (this.shieldMesh) this.g.scene.remove(this.shieldMesh); }
}

function makeBar(g, h, ally) {
  const root = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .12), new THREE.MeshBasicMaterial({ color: 0x1a1210, transparent: true, opacity: .7, depthTest: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1.04, .07), new THREE.MeshBasicMaterial({ color: ally ? 0x8fd16a : 0xe8a33a, depthTest: false, transparent: true }));
  fill.position.z = .01; root.add(bg); root.add(fill); bg.renderOrder = 20; fill.renderOrder = 21;
  root.visible = false; g.scene.add(root);
  const off = h * .62 + .35;
  return {
    root,
    set(x, y, f, show) { root.visible = show && f > 0; root.position.set(x, y + off, .5); fill.scale.x = Math.max(.001, f); fill.position.x = -(1 - f) * .52; },
    remove() { g.scene.remove(root); },
  };
}

// ================================================================ projectiles
export const SHOTS = {
  spear: { model: 'light_spear', scale: 1, r: .35, speed: 24, trail: 'light', hit: 'light', sfx: 'spear_hit', life: 1.4, pierce: 1 },
  fire: { model: 'fire_orb', scale: .9, r: .45, speed: 20, trail: 'fire', hit: 'fire', sfx: 'fireball_hit', life: 1.4, splash: 1.5 },
  arrow: { model: 'light_arrow', scale: 1, r: .25, speed: 15, trail: 'light', hit: 'light', sfx: 'arrow_hit', life: 2.2, small: true },
  ember: { model: 'fire_orb', scale: .5, r: .3, speed: 12.5, trail: 'fire', hit: 'fire', sfx: 'fireball_hit', life: 2.4, small: true },
  orb_light: { glow: [1, .85, .5], r: .4, speed: 7.5, trail: 'light', hit: 'light', sfx: 'orb_hit', life: 4.5, homing: 2.1 },
  orb_dark: { glow: [1, .45, .15], r: .4, speed: 7.5, trail: 'dark', hit: 'fire', sfx: 'orb_hit', life: 4.5, homing: 2.1 },
  rain: { model: 'light_spear', scale: 1.4, r: .45, speed: 30, trail: 'light', hit: 'light', sfx: 'spear_hit', life: 1.2 },
  shard: { model: 'debris_hell', scale: .32, r: .3, speed: 22, trail: 'dark', hit: 'stone', sfx: 'stone_hit', life: 1.1 },
  meteor: { model: 'fire_orb', scale: 2.4, r: .9, speed: 17, trail: 'fire', hit: 'fire', sfx: 'meteor_impact', life: 2.5, splash: 2.3, big: true },
};
let glowTex = null;
export class Shot {
  constructor(g, kind, x, y, ang, from, o = {}) {
    const c = SHOTS[kind]; this.c = c; this.g = g; this.kind = kind; this.from = from;
    this.x = x; this.y = y; this.vx = Math.cos(ang) * c.speed; this.vy = Math.sin(ang) * c.speed;
    this.dmg = o.dmg || 8; this.life = c.life; this.r = c.r * 1.25; this.pierce = c.pierce || 0; this.hitSet = new Set(); this.target = o.target; this.aim = o.aim;
    this.obj = new THREE.Group();
    if (c.model && Assets.has(c.model)) { const m = Assets.clone(c.model); m.scale.setScalar(c.scale * 1.35); this.obj.add(m); this.spin = kind.includes('fire') || kind === 'ember' || kind === 'meteor' || kind === 'shard'; this.mesh = m; }
    else {
      if (!glowTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x2 = cv.getContext('2d'); const gr = x2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(cv); }
      const col = c.glow || [1, .7, .3];
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(...col), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sp.scale.setScalar(c.r * 3.2 * (c.model ? c.scale : 1)); this.obj.add(sp);
      if (c.model) this.spin = true;
    }
    // a soft glow around every projectile so it reads against the busy sky
    if (!c.glow) {
      if (!glowTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x2 = cv.getContext('2d'); const gr = x2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(cv); }
      const col = c.trail === 'light' ? [1, .86, .55] : [1, .5, .18];
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(...col), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 }));
      sp.scale.setScalar(c.r * 3.4); this.obj.add(sp);
    }
    this.obj.position.set(x, y, 0); g.scene.add(this.obj); this.orient();
  }
  orient() { if (!this.spin && this.mesh) this.obj.rotation.z = Math.atan2(this.vy, this.vx); }
  update(dt) {
    const g = this.g, c = this.c;
    if (this.kill) return false;
    this.life -= dt;
    const homeOn = this.aim && !this.aim.dead ? this.aim : (this.from === 'enemy' && !g.player.dead ? g.player : null);
    if (c.homing && homeOn) {
      const want = Math.atan2(homeOn.y - this.y, homeOn.x - this.x), cur = Math.atan2(this.vy, this.vx);
      let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const a = cur + clamp(d, -c.homing * dt, c.homing * dt); this.vx = Math.cos(a) * c.speed; this.vy = Math.sin(a) * c.speed;
    }
    this.x += this.vx * dt; this.y += this.vy * dt; this.obj.position.set(this.x, this.y, 0);
    if (this.spin && this.mesh) { this.mesh.rotation.x += dt * 6; this.mesh.rotation.y += dt * 4; } else this.orient();
    if (Math.random() < (c.big ? 1 : .85)) g.fx.trail(this.x - this.vx * .012, this.y - this.vy * .012, c.trail, 0);
    if (c.big) g.fx.trail(this.x + rnd(-.5, .5), this.y + rnd(-.5, .5), 'fire', 0);
    if (this.target && Math.hypot(this.target.x - this.x, this.target.y - this.y) < .8) { this.explode(); return false; }
    if (this.life <= 0) { if (c.splash) this.explode(); return false; }
    if (this.x < ARENA.x0 - 8 || this.x > ARENA.x1 + 8 || this.y < -4 || this.y > ARENA.y1 + 9) return false;
    // collisions
    if (this.from !== 'enemy') {
      const ally = this.from === 'ally';
      for (const e of g.enemies) {
        if (e.dead || e.spawning > .3 || this.hitSet.has(e)) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) < e.r + this.r) {
          // the angel knight's tower shield blocks shots that come from the front
          if (e.role === 'heavy' && e.def.key === 'angel' && !e.act && e.state === 'move' && Math.sign(this.vx) === -e.face && Math.random() < .7) {
            g.fx.burst(this.x, this.y, 'block', 12); g.sfx('shield_block', this.x, this.y, { vol: .8 }); e.doAct('block', [], { dur: .35 }); return false;
          }
          this.hitSet.add(e);
          g.hurtEnemy(e, this.dmg * (ally ? ALLY_DMG : 1), Math.sign(this.vx) * 3.5, 0, { shot: true, ally });
          if (c.splash) { this.explode(e); return false; }
          g.fx.burst(this.x, this.y, c.hit, 10, .8); g.sfx(c.sfx, this.x, this.y, { vol: .7 });
          if (this.pierce-- <= 0) return false;
        }
      }
    } else {
      for (const p of [g.player, ...g.allies]) {
        if (!p || p.dead || p.spawning > .3) continue;
        if (Math.hypot(p.x - this.x, p.y - this.y) < p.r + this.r * .85) {
          if (c.splash) { this.explode(); return false; }
          if (p.isPlayer) g.hurtPlayer(this.dmg, this.x - this.vx * .05, this.y - this.vy * .05); else g.hurtAlly(p, this.dmg, this.x, this.y);
          g.fx.burst(this.x, this.y, c.hit, 10, .8); g.sfx(c.sfx, this.x, this.y, { vol: .7 });
          return false;
        }
      }
    }
    return true;
  }
  explode(skip) {
    const g = this.g, c = this.c, R = c.splash || 1;
    g.fx.burst(this.x, this.y, c.hit, c.big ? 30 : 16, c.big ? 1.7 : 1); g.fx.ring(this.x, this.y, .3, R * 1.2, .35, C.fire, .7);
    g.sfx(c.sfx, this.x, this.y, { vol: c.big ? 1 : .75 });
    if (c.big) g.shake(.3);
    if (this.from !== 'enemy') {
      const ally = this.from === 'ally';
      for (const e of g.enemies) if (!e.dead && e !== skip && Math.hypot(e.x - this.x, e.y - this.y) < R + e.r) g.hurtEnemy(e, this.dmg * .6 * (ally ? ALLY_DMG : 1), Math.sign(e.x - this.x) * 4, 1, { shot: true, ally });
    } else {
      for (const p of [g.player, ...g.allies]) if (p && !p.dead && Math.hypot(p.x - this.x, p.y - this.y) < R + p.r) { if (p.isPlayer) g.hurtPlayer(this.dmg, this.x, this.y); else g.hurtAlly(p, this.dmg, this.x, this.y); }
    }
  }
  remove() { this.g.scene.remove(this.obj); }
}

// ================================================================ heal orb
export class Orb {
  constructor(g, x, y) {
    this.g = g; this.x = x; this.y = y; this.t = 0; this.life = 12;
    this.obj = Assets.has('soul_orb') ? Assets.clone('soul_orb') : new THREE.Mesh(new THREE.SphereGeometry(.25), new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffb050, emissiveIntensity: .6 }));
    this.obj.scale.setScalar(1.7); g.scene.add(this.obj);
    this.obj.traverse(o => { if (o.isMesh && /glass/i.test(o.name + (o.material?.name || ''))) { o.material.depthWrite = false; o.renderOrder = 7; } if (o.isMesh && /core/i.test(o.name)) this.core = o.material; });
    g.sfx('orb_drop', x, y, { vol: .5 });
  }
  update(dt) {
    const g = this.g, p = g.player; this.t += dt; this.life -= dt;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    if (d < 3.2) { this.x += (p.x - this.x) * Math.min(1, dt * 6); this.y += (p.y - this.y) * Math.min(1, dt * 6); }
    else this.y += Math.sin(this.t * 2) * .3 * dt;
    this.obj.position.set(this.x, this.y + Math.sin(this.t * 3) * .12, .3); this.obj.rotation.y += dt * 1.5;
    if (this.core) this.core.emissiveIntensity = 2 + Math.sin(this.t * 6) * .8;
    if (Math.random() < .3) g.fx.glow.emit({ x: this.x + rnd(-.3, .3), y: this.y + rnd(-.3, .3), z: .3, vy: .8, life: .6, size: .2, size1: .02, color: C.goldW });
    if (this.life < 2) this.obj.visible = Math.floor(this.t * 10) % 2 === 0;
    if (d < p.r + .5 && !p.dead) { g.heal(20); g.fx.burst(this.x, this.y, 'light', 14); return false; }
    return this.life > 0;
  }
  remove() { this.g.scene.remove(this.obj); }
}
