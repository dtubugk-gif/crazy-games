// Actors: platformer physics, the hero and his powers, clockwork robots (bot, drone, brute) and the Clock King boss.
import * as THREE from 'three';
import { Assets, Anim, node, ownMaterials } from './assets.js';
import { C, makeFireballMesh } from './fx.js';
import { WATER_Y, ICE_TOP } from './world.js';

export const GRAV = -32;
const TURN = Math.PI / 2 * 0.8;     // 3/4 toward camera when facing left/right
const V = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- physics
/** move a body {x,y,w,h,vx,vy} through solids; sets grounded/ground/hitWall/hitHead. Feet at y, x is centre. */
export function moveBody(b, dt, world, o = {}) {
  const solids = world.solids, hw = b.w / 2;
  b.hitWall = 0; b.hitHead = false;
  const wasGround = b.grounded; b.grounded = false; const prevGround = b.ground; b.ground = null;
  // carried by a moving platform
  if (wasGround && prevGround && prevGround.dy) b.y += prevGround.dy;
  if (wasGround && prevGround && prevGround.dx) b.x += prevGround.dx;
  // horizontal
  const px = b.x; b.x += b.vx * dt;
  for (const s of solids) {
    if (s.oneWay || s.off || s.ref === b) continue;
    if (b.y + b.h <= s.y0 + 0.02 || b.y >= s.y1 - 0.02) continue;
    if (b.x + hw <= s.x0 || b.x - hw >= s.x1) continue;
    // step-up onto low ledges (ice slabs, curbs)
    if (wasGround && s.y1 - b.y <= (o.step ?? 0.62) && s.y1 - b.y > 0) { b.y = s.y1; continue; }
    if (px <= (s.x0 + s.x1) / 2) { b.x = s.x0 - hw - 0.001; b.hitWall = 1; } else { b.x = s.x1 + hw + 0.001; b.hitWall = -1; }
    if (Math.sign(b.vx) === b.hitWall) b.vx = 0;
  }
  // vertical
  const py = b.y; b.y += b.vy * dt;
  for (const s of solids) {
    if (s.off || s.ref === b) continue;
    if (b.x + hw * 0.9 <= s.x0 || b.x - hw * 0.9 >= s.x1) continue;
    if (b.vy <= 0 && py >= s.y1 - 0.05 && b.y <= s.y1) {
      if (s.oneWay && b.dropT > 0) continue;
      b.y = s.y1; b.vy = 0; b.grounded = true; b.ground = s;
    } else if (!s.oneWay && b.vy > 0 && py + b.h <= s.y0 + 0.05 && b.y + b.h > s.y0) {
      b.y = s.y0 - b.h; b.vy = 0; b.hitHead = true;
    }
  }
  // curved walkable tops (bridge arch)
  for (const sf of world.surfaces) {
    if (b.x < sf.x0 || b.x > sf.x1) continue;
    const fy = sf.f(b.x);
    if (b.vy <= 0 && b.y <= fy + 0.02 && (py >= fy - 0.7 || wasGround)) { b.y = fy; b.vy = 0; b.grounded = true; b.ground = { kind: 'ground', y1: fy, x0: sf.x0, x1: sf.x1 }; }
  }
  if (b.dropT > 0) b.dropT -= dt;
}

/** is there floor under x (for robots that won't walk off edges) */
export function floorAt(world, x, y, depth = 0.6) {
  for (const s of world.solids) if (!s.off && x > s.x0 && x < s.x1 && s.y1 <= y + 0.05 && s.y1 >= y - depth) return true;
  for (const sf of world.surfaces) if (x > sf.x0 && x < sf.x1) return true;
  return false;
}

function faceModel(m, dir, dt, rate = 14) {
  const t = dir * TURN; m.rotation.y += (t - m.rotation.y) * Math.min(1, rate * dt);
}

function flash(mats, t, color = 0xffffff, k = 0.55) {
  for (const m of mats) { if (!m.emissive) continue; m.userData.flashT = t; m.userData.flashC = color; m.userData.flashK = k; }
}
function updateMats(mats, dt, freeze) {
  for (const m of mats) {
    if (!m.emissive) continue;
    const base = m.userData.baseEmissive;
    if (m.userData.flashT > 0) { m.userData.flashT -= dt; m.emissive.setHex(m.userData.flashC); m.emissiveIntensity = m.userData.flashK; }
    else if (freeze > 0) { m.emissive.setRGB(0.35, 0.55, 0.7); m.emissiveIntensity = 0.35 * freeze; }
    else { if (base) m.emissive.copy(base); else m.emissive.setRGB(0, 0, 0); m.emissiveIntensity = m.userData.baseEI ?? 1; }
  }
}

// ======================================================================== HERO
export class Player {
  constructor(game) {
    this.g = game;
    this.model = Assets.clone('hero');
    this.mats = ownMaterials(this.model);
    this.anim = new Anim(this.model, Assets.anims('hero'));
    this.hand = node(this.model, 'fx_hand_R'); this.handL = node(this.model, 'fx_hand_L'); this.chest = node(this.model, 'fx_chest');
    this.w = 0.62; this.h = 1.5;
    this.reset(0, 0);
  }
  reset(x, y) {
    Object.assign(this, { x, y, vx: 0, vy: 0, grounded: false, ground: null, facing: 1, state: 'normal', stateT: 0, coyote: 0, jumpBuf: 0, airT: 0,
      flying: false, invuln: 0, punchN: 0, pressT: -1, charge: 0, castCd: 0, boltCd: 0, beamOn: false, dropT: 0, safe: { x, y }, safeT: 0,
      stepT: 0, landSquash: 0, dead: false, stormT: 0, punchQueued: false, freezeCell: null, freezeP: 0 });
    this.model.position.set(x, y, 0); this.model.rotation.y = TURN; this.model.scale.set(1, 1, 1);
    this.anim.play('idle', { fade: 0 });
    this.stopLoops();
  }
  stopLoops() { for (const k of ['chargeLoop', 'flyLoop', 'beamLoop']) { this[k]?.stop(); this[k] = null; } }
  get cx() { return this.x; } get cy() { return this.y + this.h * 0.55; }
  handPos(out = V) {
    if (this.hand) { this.hand.getWorldPosition(out); out.z = 0.2; return out; }
    return out.set(this.x + this.facing * 0.6, this.y + 1.1, 0.2);
  }

  update(dt, inp) {
    const g = this.g, A = g.audio, S = g.save;
    this.stateT += dt; this.castCd -= dt; this.boltCd -= dt; this.invuln -= dt;
    if (this.dead) { this.vx *= 0.9; this.vy += GRAV * dt; moveBody(this, dt, g.world); this.sync(dt); return; }
    const powers = S.powers;
    const st = this.state;
    const busy = st === 'hurt' || st === 'smash' || st === 'storm' || st === 'victory';
    // ---- horizontal control
    let mx = busy ? 0 : inp.x;
    if (st === 'beam' || st === 'charge') mx = 0;
    if (Math.abs(mx) > 0.15 && st !== 'beam' && st !== 'charge') this.facing = Math.sign(mx);
    if ((st === 'beam' || st === 'charge') && Math.abs(inp.x) > 0.5) this.facing = Math.sign(inp.x);
    const maxV = this.flying ? 7.6 : 6.6;
    let accel = this.grounded ? 62 : 34;
    if (st === 'punch' && this.grounded) mx *= 0.25;
    if (st === 'cast' && this.grounded) mx *= 0.4;
    let target = mx * maxV;
    // conveyors
    let push = 0;
    if (this.grounded) for (const c of g.conveyors) if (this.x > c.x - 2 && this.x < c.x + 2 && Math.abs(this.y - c.y) < 0.2) push = c.dir * 2.8;
    this.vx = approach(this.vx, target + push, accel * dt);
    if (st === 'hurt') this.vx *= Math.pow(0.08, dt);
    // ---- jump / flight
    if (this.grounded) { this.coyote = 0.11; this.airT = 0; this.lastGroundY = this.y; } else { this.coyote -= dt; this.airT += dt; }
    if (inp.jumpPressed) this.jumpBuf = 0.13; else this.jumpBuf -= dt;
    if (!busy && st !== 'beam' && st !== 'charge' && this.jumpBuf > 0 && this.coyote > 0) {
      if (inp.y < -0.6 && this.ground?.oneWay) { this.dropT = 0.25; this.grounded = false; this.y -= 0.05; this.jumpBuf = 0; }
      else this.jump(12.6);
    }
    if (!inp.jumpHeld && this.vy > 4 && !this.flying && !this.bounced) this.vy *= Math.pow(0.0005, dt); // short hop on release
    const canFly = powers.wind && !this.grounded && inp.jumpHeld && (this.airT > 0.2 || this.vy < 3) && g.energy > 0.5 && !busy && st !== 'beam';
    if (canFly && !this.flying) { this.flying = true; A.play('fly_start'); this.flyLoop = A.loop('fly_loop', { vol: 0.8 }); g.fx.ring(this.x, this.y, 0xf4f8f2, 2.2, .35, .5); }
    if (this.flying && (!canFly)) { this.flying = false; this.flyLoop?.stop(0.25); this.flyLoop = null; }
    if (this.flying) {
      // rise, then hover about 5.5 m above the last floor so the hero stays on screen and near the action
      const top = (this.lastGroundY ?? this.y) + 5.5;
      this.vy = approach(this.vy, this.y < top ? 3.3 : (this.y > top + .4 ? -1.5 : 0), 26 * dt);
      g.useEnergy(30 * dt);
      if (Math.random() < 0.7) g.fx.wind(this.x, this.y + 0.8, this.facing);
    } else this.vy += GRAV * dt;
    this.vy = Math.max(this.vy, -24);
    // ---- powers
    this.handlePunch(dt, inp);
    if (powers.fire && inp.fire && !busy && st !== 'beam' && this.castCd <= 0) {
      if (g.useEnergy(18, true)) this.castFire(); else g.noEnergy();
    }
    if (powers.bolt && inp.bolt && !busy && st !== 'beam' && this.boltCd <= 0) {
      if (g.useEnergy(24, true)) this.castBolt(); else g.noEnergy();
    }
    this.handleBeam(dt, inp, powers.ice && !busy);
    if (inp.storm && g.storm >= 1 && !busy) this.castStorm();
    // ---- move
    const wasAir = !this.grounded, vyBefore = this.vy;
    moveBody(this, dt, g.world);
    if (this.grounded && this.ground?.kind === 'bounce' && vyBefore <= 0) { this.vy = 17.5; this.grounded = false; this.bounced = true; A.play('jump', { pitch: 1.25 }); g.fx.dust(this.x, this.y, 6, .6); g.onBounce?.(this.ground); }
    if (this.grounded) this.bounced = false;
    if (wasAir && this.grounded) this.onLand(vyBefore);
    // footsteps
    if (this.grounded && Math.abs(this.vx) > 1 && st === 'normal') {
      this.stepT -= dt * Math.abs(this.vx) / 6.6;
      if (this.stepT <= 0) { this.stepT = 0.3; A.play(g.stepSound(this), { vol: 0.55, jitter: .08 }); }
    }
    // safe spot for respawn after a fall
    this.safeT -= dt;
    if (this.grounded && this.safeT <= 0 && this.ground && (this.ground.kind === 'ground' || this.ground.kind === 'ice') && this.x - this.ground.x0 > 0.8 && this.ground.x1 - this.x > 0.8) { this.safe = { x: this.x, y: this.y }; this.safeT = 0.4; }
    this.animate(dt, inp);
    this.sync(dt);
  }

  jump(v) {
    this.vy = v; this.grounded = false; this.coyote = 0; this.jumpBuf = 0;
    this.g.audio.play('jump', { vol: 0.8 }); this.g.fx.dust(this.x, this.y, 5, .6);
    this.anim.play('jump', { once: true, fade: .08 });
    this.landSquash = -0.12;
  }
  onLand(vy) {
    const hard = vy < -14;
    this.g.audio.play('land', { vol: hard ? 0.9 : 0.55 });
    this.g.fx.dust(this.x, this.y, hard ? 10 : 5, hard ? 1 : .6);
    this.landSquash = hard ? 0.22 : 0.12;
    if (this.state === 'normal' && Math.abs(this.vx) < 1) this.anim.play('land', { once: true, fade: .06, done: () => { if (this.state === 'normal') this.anim.play('idle'); } });
    if (this.flying) { this.flying = false; this.flyLoop?.stop(.2); this.flyLoop = null; }
  }

  handlePunch(dt, inp) {
    const g = this.g, A = g.audio, st = this.state;
    const busy = st === 'hurt' || st === 'smash' || st === 'storm' || st === 'victory' || st === 'beam';
    if (inp.punchPressed && !busy) {
      if (st === 'punch' && this.stateT > 0.14) this.punchQueued = true;
      else if (st !== 'punch' && st !== 'charge') this.startPunch();
      this.pressT = 0;
    }
    if (this.pressT >= 0) {
      if (inp.punchHeld) this.pressT += dt; else this.pressT = -1;
    }
    // hold -> charge (on the ground)
    if (this.pressT > 0.24 && this.grounded && (st === 'normal' || (st === 'punch' && this.stateT > 0.16))) {
      this.setState('charge'); this.charge = 0; this.anim.play('charge', { fade: .12 });
      this.chargeLoop = A.loop('charge_loop', { vol: 0.5 }); g.ui.charging(true);
    }
    if (this.state === 'charge') {
      this.charge = Math.min(1, this.charge + dt / 0.65);
      this.chargeLoop?.setRate(0.85 + this.charge * 0.35); this.chargeLoop?.setVol(0.45 + this.charge * 0.5);
      if (Math.random() < 0.5 + this.charge) { const h = this.handPos(new THREE.Vector3()); g.fx.add.emit({ x: h.x + rnd(-.6, .6), y: h.y + rnd(-.6, .6), z: .4, vx: 0, vy: 0, life: .25, size: .12 + this.charge * .1, c0: C.spark0, c1: C.fire1 }); }
      if (!inp.punchHeld || !this.grounded) this.smash();
    }
    if (st === 'punch') {
      const dur = 0.27;
      if (!this.hitDone && this.stateT > 0.08) { this.hitDone = true; g.meleeHit(this, 1, 1.35, 'punch'); }
      if (this.stateT > dur) {
        if (this.punchQueued) this.startPunch();
        else { this.setState('normal'); }
      }
    }
    if (st === 'smash' && !this.hitDone && this.stateT > 0.13) {
      this.hitDone = true;
      const lv = this.smashLv;
      g.meleeHit(this, 2 + Math.round(lv * 4), 1.9, lv > 0.55 ? 'smash' : 'punch', lv);
      A.play('smash_hit', { vol: 0.6 + lv * 0.4 }); g.shake(0.25 + lv * 0.35); g.hitstop(0.05 + lv * 0.06);
      g.fx.ring(this.x + this.facing * 1.2, this.y, 0xfff1c8, 3 + lv * 2, .4, .7); g.fx.dust(this.x + this.facing, this.y, 12, 1.2);
    }
    if (st === 'smash' && this.stateT > 0.45) this.setState('normal');
  }
  startPunch() {
    this.setState('punch'); this.hitDone = false; this.punchQueued = false;
    this.punchN ^= 1;
    this.anim.play(this.punchN ? 'punch_a' : 'punch_b', { once: true, fade: .05, restart: true, speed: 1.05 });
    this.g.audio.play('punch_whoosh', { vol: 0.5 });
    if (!this.grounded && this.vy < 0) this.vy *= 0.4; // a little air hang on punches
  }
  smash() {
    this.smashLv = this.charge; this.chargeLoop?.stop(.06); this.chargeLoop = null; this.g.ui.charging(false);
    this.setState('smash'); this.hitDone = false; this.pressT = -1;
    this.anim.play('smash', { once: true, fade: .05, restart: true });
    this.vx = this.facing * (3 + this.smashLv * 4);
    this.g.audio.play('punch_whoosh', { pitch: .8, vol: .8 });
  }
  castFire() {
    const g = this.g;
    this.setState('cast'); this.castCd = 0.42;
    this.anim.play('cast', { once: true, fade: .05, restart: true, done: () => { if (this.state === 'cast') this.setState('normal'); } });
    g.audio.play('fire_cast', { vol: .8 });
    g.after(() => { if (this.dead || g.player !== this) return; const h = this.handPos(new THREE.Vector3()); g.spawnFireball(h.x + this.facing * .25, Math.max(h.y, this.y + .9), this.facing); }, 70);
    g.after(() => { if (this.state === 'cast') this.setState('normal'); }, 330);
  }
  castBolt() {
    const g = this.g;
    this.setState('cast'); this.boltCd = 0.65;
    this.anim.play('cast', { once: true, fade: .05, restart: true, done: () => { if (this.state === 'cast') this.setState('normal'); } });
    g.audio.play('bolt_cast', { vol: .8 });
    g.after(() => { if (!this.dead && g.player === this) g.lightning(this); }, 90);
    g.after(() => { if (this.state === 'cast') this.setState('normal'); }, 330);
  }
  castStorm() {
    const g = this.g;
    this.setState('storm'); this.flying = false; this.flyLoop?.stop(); this.flyLoop = null;
    this.vx = 0; this.vy = Math.max(this.vy, 4);
    this.anim.play('victory', { fade: .1 });
    g.stormStart(this);
  }
  handleBeam(dt, inp, allowed) {
    const g = this.g;
    const want = allowed && inp.ice && (this.grounded || this.state === 'beam') && this.state !== 'punch' && this.state !== 'charge';
    if (want && g.energy > 0.5) {
      if (this.state !== 'beam') { this.setState('beam'); this.anim.play('beam', { fade: .1 }); this.beamLoop = g.audio.loop('ice_beam_loop', { vol: .7 }); }
      g.useEnergy(30 * dt);
      g.iceBeam(this, dt);
    } else if (this.state === 'beam') {
      if (want) g.noEnergy();
      this.setState('normal'); this.beamLoop?.stop(.15); this.beamLoop = null; g.beam.hide(dt); this.freezeCell = null;
    } else g.beam.hide(dt);
  }
  setState(s) { this.state = s; this.stateT = 0; }

  hurt(fromX, dmg = 1) {
    const g = this.g;
    if (this.invuln > 0 || this.dead || this.state === 'storm') return false;
    if (this.state === 'charge') { this.chargeLoop?.stop(); this.chargeLoop = null; g.ui.charging(false); }
    if (this.state === 'beam') { this.beamLoop?.stop(); this.beamLoop = null; }
    this.flying = false; this.flyLoop?.stop(); this.flyLoop = null;
    g.hearts = Math.max(0, g.hearts - dmg); g.ui.hearts(true); g.stats.hurt += dmg;
    g.audio.play('hurt'); g.shake(0.35); g.hitstop(0.06); flash(this.mats, .12, 0xff6040, .7);
    this.invuln = 1.35;
    const d = Math.sign(this.x - fromX) || -this.facing;
    this.vx = d * 7; this.vy = 6.5; this.grounded = false;
    if (g.hearts <= 0) { this.die(); return true; }
    this.setState('hurt'); this.anim.play('hurt', { once: true, fade: .05, restart: true, done: () => { if (this.state === 'hurt') this.setState('normal'); } });
    g.after(() => { if (this.state === 'hurt') this.setState('normal'); }, 380);
    return true;
  }
  die() {
    this.dead = true; this.setState('dead'); this.stopLoops();
    this.anim.play('death', { once: true, fade: .1 });
    this.g.audio.play('die'); this.g.onPlayerDead();
  }

  animate(dt, inp) {
    const st = this.state;
    if (st === 'normal') {
      let want;
      if (this.flying) want = 'fly';
      else if (!this.grounded) want = this.vy > 1.5 && this.anim.curName === 'jump' ? 'jump' : 'fall';
      else if (Math.abs(this.vx) > 0.6) want = 'run';
      else want = (this.anim.curName === 'land' && this.anim.cur?.isRunning()) ? 'land' : 'idle';
      if (want === 'jump') { /* keep the take-off playing */ }
      else if (want !== this.anim.curName) this.anim.play(want, { fade: want === 'fall' ? .2 : .14 });
      if (want === 'run') if (this.anim.cur) this.anim.cur.timeScale = clamp(Math.abs(this.vx) / 6.6, .55, 1.15);
    }
    if (st === 'cast' && !this.grounded && this.flying) { /* keep flying pose under the cast */ }
  }
  sync(dt) {
    this.anim.update(dt);
    const m = this.model;
    m.position.set(this.x, this.y, 0);
    faceModel(m, this.facing, dt, this.flying ? 9 : 16);
    // flight tilt + squash/stretch
    const tilt = this.flying ? -this.facing * clamp(Math.abs(this.vx) / 7.6, 0, 1) * 0.0 : 0;
    m.rotation.z += (tilt - m.rotation.z) * Math.min(1, dt * 8);
    this.landSquash *= Math.pow(0.0008, dt);
    const sq = this.landSquash; m.scale.set(1 + sq * .5, 1 - sq, 1 + sq * .5);
    // invulnerability blink
    m.visible = this.invuln > 0 && !this.dead ? (Math.floor(this.invuln * 14) % 2 === 0) : true;
    updateMats(this.mats, dt, 0);
  }
}

// ======================================================================== ENEMIES
class Enemy {
  constructor(game, kind, x, y, o = {}) {
    this.g = game; this.kind = kind;
    this.model = Assets.clone(kind); this.mats = ownMaterials(this.model);
    this.anim = new Anim(this.model, Assets.anims(kind));
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.facing = -1; this.grounded = false; this.ground = null;
    this.range = o.range || [x - 4, x + 4]; this.state = 'idle'; this.stateT = 0; this.cd = rnd(0.3, 1.2);
    this.freezeAmt = 0; this.frozen = 0; this.stun = 0; this.dead = false; this.remove = false; this.deadT = 0;
    this.model.position.set(x, y, 0); this.model.rotation.y = -TURN;
    this.solid = null; this.shell = null;
    this.id = Enemy.n = (Enemy.n || 0) + 1;
  }
  get cx() { return this.x; } get cy() { return this.y + this.h * 0.5; }
  box() { return { x0: this.x - this.w / 2, x1: this.x + this.w / 2, y0: this.y, y1: this.y + this.h }; }
  setState(s, anim, o) { this.state = s; this.stateT = 0; if (anim) this.anim.play(anim, o); }
  /** returns true if the hit landed */
  hit(dmg, o = {}) {
    if (this.dead) return false;
    const g = this.g;
    if (this.frozen > 0 && (o.kind === 'punch' || o.kind === 'smash' || o.kind === 'storm')) { this.shatter(); return true; }
    if (this.frozen > 0 && o.kind === 'fire') { this.thaw(); dmg += 1; }
    this.hp -= dmg; g.addStorm(dmg);
    flash(this.mats, .1, 0xffffff, .65);
    g.fx.sparks(this.cx, this.cy, 10, o.dir > 0 ? 0 : Math.PI, 1);
    if (this.hp <= 0) { this.die(o); return true; }
    g.audio.play('bot_hurt', { pos: this.pos(), vol: .9, pitch: this.kind === 'brute' ? .75 : this.kind === 'drone' ? 1.3 : 1 });
    if (o.kb) { this.vx = (o.dir || 1) * o.kb * (this.kind === 'brute' ? .35 : 1); if (this.kind !== 'drone') this.vy = Math.min(5, o.kb * .5); }
    if (o.stun) this.stun = Math.max(this.stun, o.stun);
    if (this.frozen <= 0 && this.state !== 'attack' && this.state !== 'smash') this.setState('hurt', 'hurt', { once: true, fade: .05, restart: true });
    return true;
  }
  addFreeze(amt) {
    if (this.dead || this.frozen > 0) return;
    this.freezeAmt += amt;
    if (this.freezeAmt >= this.freezeNeed) this.freeze();
  }
  freeze() {
    const g = this.g;
    this.frozen = this.kind === 'brute' ? 4.5 : 5.5; this.freezeAmt = 0; this.anim.mixer.timeScale = 0;
    g.audio.play('freeze', { pos: this.pos() }); g.fx.iceBurst(this.cx, this.cy, .7);
    this.shell = Assets.clone('ice_shell');
    const s = Assets.size('ice_shell'), k = Math.max(this.w * 1.25 / (s.x || 1.2), this.h * 1.12 / (s.y || 1.6));
    this.shell.scale.setScalar(k); this.shell.position.set(this.x, this.y - .05, 0);
    this.shell.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .82; o.renderOrder = 3; o.castShadow = false; } });
    g.scene.add(this.shell);
    this.solid = { x0: this.x - this.w * .55, x1: this.x + this.w * .55, y0: this.y, y1: this.y + this.h * 1.05, kind: 'ice', ref: this };
    g.world.solids.push(this.solid);
    if (this.kind === 'drone') this.vy = 0;
  }
  thaw() {
    if (this.frozen <= 0) return;
    this.frozen = 0; this.anim.mixer.timeScale = 1;
    if (this.shell) { this.g.scene.remove(this.shell); this.shell = null; }
    this.g.fx.iceBurst(this.cx, this.cy, .5); this.g.audio.play('ice_shatter', { pos: this.pos(), vol: .6 });
    this.removeSolid();
  }
  removeSolid() { if (this.solid) { const i = this.g.world.solids.indexOf(this.solid); if (i >= 0) this.g.world.solids.splice(i, 1); this.solid = null; } }
  shatter() {
    const g = this.g;
    g.audio.play('ice_shatter', { pos: this.pos() }); g.fx.iceBurst(this.cx, this.cy, 1.2); g.shake(.2); g.hitstop(.05);
    if (this.shell) { g.scene.remove(this.shell); this.shell = null; }
    this.removeSolid(); g.addStorm(3);
    this.dead = true; this.remove = true; this.model.visible = false;
    g.onEnemyDead(this, true);
  }
  die(o = {}) {
    const g = this.g;
    this.dead = true; this.deadT = 0; this.removeSolid();
    if (this.shell) { g.scene.remove(this.shell); this.shell = null; }
    this.anim.mixer.timeScale = 1;
    this.anim.play('death', { once: true, fade: .06 });
    g.audio.play(this.kind === 'brute' ? 'bot_die' : this.kind + '_die', { pos: this.pos(), pitch: this.kind === 'brute' ? .7 : 1 });
    g.fx.sparks(this.cx, this.cy, 18, 1.57, 2); g.fx.smoke(this.cx, this.cy, 6, 1);
    this.vx = (o.dir || 0) * 3;
    g.onEnemyDead(this, false);
  }
  pos() { return V.set(this.x, this.cy, 0).clone(); }
  baseUpdate(dt) {
    const g = this.g;
    this.stateT += dt; this.cd -= dt;
    if (this.stun > 0) this.stun -= dt;
    this.freezeAmt = Math.max(0, this.freezeAmt - dt * 0.6);
    if (this.frozen > 0) {
      this.frozen -= dt;
      if (this.kind === 'drone' && !this.grounded) { this.vy += GRAV * dt; moveBody(this, dt, g.world); if (this.solid) { this.solid.x0 = this.x - this.w * .55; this.solid.x1 = this.x + this.w * .55; this.solid.y0 = this.y; this.solid.y1 = this.y + this.h * 1.05; } if (this.shell) this.shell.position.set(this.x, this.y - .05, 0); }
      if (this.frozen < 1 && this.shell) this.shell.position.x = this.x + Math.sin(this.frozen * 60) * .03;
      if (this.frozen <= 0) this.thaw();
    }
    if (this.dead) {
      this.deadT += dt;
      if (this.kind !== 'drone') { this.vy += GRAV * dt; this.vx *= .9; moveBody(this, dt, g.world); }
      else { this.vy += GRAV * .6 * dt; this.y += this.vy * dt; this.x += this.vx * dt; this.model.rotation.z += dt * 6; if (Math.random() < .4) g.fx.smoke(this.x, this.y + .3, 1, .6); if (this.y < g.world.killY) this.remove = true; }
      if (this.deadT > 1.6) { const k = 1 - (this.deadT - 1.6) / 0.5; this.model.scale.setScalar(Math.max(0.01, k)); if (k <= 0) this.remove = true; }
    }
    if (this.y < g.world.killY) { this.remove = true; if (!this.dead) g.onEnemyDead(this, true); this.dead = true; }
  }
  sync(dt) {
    this.anim.update(dt);
    this.model.position.set(this.x, this.y, 0);
    if (!this.dead && this.frozen <= 0) faceModel(this.model, this.facing, dt, 10);
    updateMats(this.mats, dt, this.frozen > 0 ? 1 : Math.min(1, this.freezeAmt / this.freezeNeed));
  }
  playerDx() { return this.g.player.x - this.x; }
  canSee(dist) { const p = this.g.player; return !p.dead && Math.abs(p.x - this.x) < dist && Math.abs(p.y - this.y) < 3.2; }
}

export class Bot extends Enemy {
  constructor(g, x, y, o) { super(g, 'bot', x, y, o); this.w = .9; this.h = 1.25; this.hp = 3; this.freezeNeed = .55; this.anim.play('idle'); this.stepT = 0; }
  update(dt) {
    this.baseUpdate(dt);
    if (this.dead || this.frozen > 0) { this.sync(dt); return; }
    const g = this.g, p = g.player, dx = this.playerDx();
    let want = 0;
    if (this.state === 'hurt') { if (this.stateT > .32) this.setState('idle'); }
    else if (this.state === 'attack') {
      if (!this.hitDone && this.stateT > .27) { this.hitDone = true; if (Math.abs(dx) < 1.5 && Math.sign(dx) === this.facing && Math.abs(p.y - this.y) < 1.3) p.hurt(this.x); g.audio.play('bot_attack', { pos: this.pos(), vol: .8 }); }
      if (this.stateT > .62) { this.setState('idle'); this.cd = rnd(.6, 1.1); }
    } else if (this.stun > 0) { if (this.anim.curName !== 'stun') this.anim.play('stun'); }
    else if (this.canSee(7.5)) {
      this.facing = Math.sign(dx) || this.facing;
      if (Math.abs(dx) < 1.25 && this.cd <= 0) { this.setState('attack', 'attack', { once: true, fade: .08, restart: true }); this.hitDone = false; }
      else if (Math.abs(dx) > 1.0) want = this.facing * 2.1;
    } else {
      // patrol inside range
      if (this.x < this.range[0] + .3) this.facing = 1; else if (this.x > this.range[1] - .3) this.facing = -1;
      want = this.facing * 1.15;
    }
    // stay on solid ground and inside range
    if (want && (!floorAt(g.world, this.x + Math.sign(want) * .7, this.y) || (this.x + want * .3 < this.range[0] - 2.5) || (this.x + want * .3 > this.range[1] + 2.5))) want = 0;
    if (this.state !== 'hurt') this.vx = approach(this.vx, want, 14 * dt);
    this.vy += GRAV * dt; moveBody(this, dt, g.world);
    if (this.state === 'idle' || this.state === 'walk') {
      const a = Math.abs(this.vx) > .2 ? 'walk' : 'idle'; if (this.anim.curName !== a && this.stun <= 0) this.anim.play(a, { fade: .2 });
      if (a === 'walk') { if (this.anim.cur) this.anim.cur.timeScale = Math.abs(this.vx) / 1.6; this.stepT -= dt * Math.abs(this.vx); if (this.stepT < 0) { this.stepT = .55; g.audio.play('bot_step', { pos: this.pos(), vol: .35 }); } }
    }
    // touch damage
    if (Math.abs(dx) < .7 && Math.abs(p.y - this.y) < 1 && !p.dead) p.hurt(this.x);
    this.sync(dt);
  }
}

export class Drone extends Enemy {
  constructor(g, x, y, o) { super(g, 'drone', x, y, o); this.w = .95; this.h = .8; this.hp = 2; this.freezeNeed = .35; this.baseY = y; this.t = rnd(0, 6); this.anim.play('fly'); this.y = y - this.h / 2; this.buzz = null; }
  get cy() { return this.y + this.h / 2; }
  update(dt) {
    this.baseUpdate(dt);
    const g = this.g;
    if (!this.buzz && !this.dead && this.frozen <= 0 && Math.abs(g.player.x - this.x) < 18) this.buzz = g.audio.loop('drone_loop', { pos: this.pos(), vol: .55 });
    if (this.buzz && (this.dead || this.frozen > 0 || Math.abs(g.player.x - this.x) > 20)) { this.buzz.stop(.3); this.buzz = null; }
    this.buzz?.setPos(this.pos());
    if (this.dead || this.frozen > 0) { this.sync(dt); return; }
    const p = g.player, dx = this.playerDx(); this.t += dt;
    if (this.state === 'hurt' && this.stateT > .3) this.setState('fly', 'fly', { fade: .15 });
    let tx = this.x;
    if (this.canSee(12)) {
      this.facing = Math.sign(dx) || this.facing;
      tx = p.x - Math.sign(dx || 1) * 5.2;
      if (this.cd <= 0 && this.state !== 'hurt' && this.stun <= 0) {
        this.cd = rnd(2.0, 2.8); this.setState('shoot', 'shoot', { once: true, fade: .06, restart: true, done: () => { if (this.state === 'shoot') this.setState('fly', 'fly', { fade: .15 }); } });
        g.after(() => { if (!this.dead && this.frozen <= 0 && g.enemies.includes(this)) g.droneShot(this); }, 140);
      }
    } else { tx = this.range[0] + (Math.sin(this.t * .35) * .5 + .5) * (this.range[1] - this.range[0]); this.facing = Math.sign(Math.cos(this.t * .35)) || 1; }
    tx = clamp(tx, this.range[0] - 3, this.range[1] + 3);
    if (this.stun > 0) tx = this.x;
    this.vx = approach(this.vx, clamp((tx - this.x) * 1.4, -3.2, 3.2), 8 * dt);
    this.x += this.vx * dt;
    const ty = this.baseY - this.h / 2 + Math.sin(this.t * 2.1) * .35;
    this.y += (ty - this.y) * Math.min(1, dt * 3);
    this.model.rotation.z = -this.vx * .05;
    if (Math.abs(dx) < .8 && Math.abs(p.cy - this.cy) < .9 && !p.dead) p.hurt(this.x);
    this.sync(dt);
  }
  die(o) { super.die(o); this.vy = 2; this.buzz?.stop(.1); this.buzz = null; }
  shatter() { super.shatter(); this.buzz?.stop(.1); this.buzz = null; }
}

export class Brute extends Enemy {
  constructor(g, x, y, o) {
    super(g, 'brute', x, y, o); this.w = 1.5; this.h = 2.2; this.hp = 9; this.freezeNeed = 1.3; this.anim.play('idle'); this.stepT = 0;
    this.shield = node(this.model, 'shield'); this.shieldUp = true;
  }
  hit(dmg, o = {}) {
    if (this.dead) return false;
    const g = this.g, fromFront = Math.sign(g.player.x - this.x) === this.facing;
    if (this.frozen > 0) return super.hit(dmg, o);
    if (this.shieldUp) {
      if (o.kind === 'smash' && (o.lv ?? 1) > 0.55 || o.kind === 'bolt' || o.kind === 'storm') { this.breakShield(); return super.hit(Math.max(1, dmg - 2), o); }
      if (fromFront || o.kind === 'fire') {
        g.audio.play('shield_block', { pos: this.pos() }); g.fx.sparks(this.x + this.facing * .8, this.cy, 12, this.facing > 0 ? 0 : Math.PI, 1);
        if (this.state !== 'smash') this.setState('block', 'block', { fade: .08 });
        g.ui.hintOnce('shield');
        return false;
      }
    }
    return super.hit(dmg, o);
  }
  breakShield() {
    this.shieldUp = false; const g = this.g;
    g.audio.play('shield_break', { pos: this.pos() }); g.shake(.3); g.fx.sparks(this.x + this.facing * .8, this.cy, 24, 1.57, 2);
    // the clip throws the shield off; hide it when the clip ends (or straight away if the clip is missing)
    const hide = () => { if (this.shield) this.shield.visible = false; };
    if (!this.anim.has('shield_break')) hide(); else g.after(hide, this.anim.dur('shield_break') * 1000);
    this.setState('break', 'shield_break', { once: true, fade: .05, done: () => { hide(); if (this.state === 'break') this.setState('idle', 'idle'); } });
    this.stun = .9;
  }
  update(dt) {
    this.baseUpdate(dt);
    if (this.dead || this.frozen > 0) { this.sync(dt); return; }
    const g = this.g, p = g.player, dx = this.playerDx();
    let want = 0;
    if (this.state === 'hurt' && this.stateT > .35) this.setState('idle', 'idle');
    if (this.state === 'block' && this.stateT > .6) this.setState('idle', 'idle', { fade: .2 });
    if (this.state === 'break' && this.stateT > .8) this.setState('idle', 'idle');
    if (this.state === 'smash') {
      if (!this.hitDone && this.stateT > .5) {
        this.hitDone = true; g.audio.play('brute_smash', { pos: this.pos() }); g.shake(.35);
        g.fx.ring(this.x + this.facing * 1.6, this.y, 0xe8d8b8, 3.5, .45, .6); g.fx.dust(this.x + this.facing * 1.6, this.y, 12, 1.2);
        const ax = this.x + this.facing * 1.4;
        if (Math.abs(p.x - ax) < 1.6 && p.y - this.y < 1.2 && p.grounded) p.hurt(this.x);
      }
      if (this.stateT > .95) { this.setState('idle', 'idle', { fade: .2 }); this.cd = rnd(1, 1.6); }
    } else if (this.state === 'idle' || this.state === 'walk') {
      if (this.stun <= 0 && this.canSee(8)) {
        this.facing = Math.sign(dx) || this.facing;
        if (Math.abs(dx) < 2.2 && this.cd <= 0) { this.setState('smash', 'smash', { once: true, fade: .08, restart: true }); this.hitDone = false; }
        else if (Math.abs(dx) > 1.8) want = this.facing * 1.35;
      } else if (this.stun <= 0) {
        if (this.x < this.range[0] + .3) this.facing = 1; else if (this.x > this.range[1] - .3) this.facing = -1;
        want = this.facing * .8;
      }
      if (want && !floorAt(g.world, this.x + Math.sign(want) * 1, this.y)) want = 0;
      const a = Math.abs(this.vx) > .2 ? 'walk' : 'idle'; if (this.anim.curName !== a) this.anim.play(a, { fade: .25 });
      if (a === 'walk') { this.stepT -= dt * Math.abs(this.vx); if (this.stepT < 0) { this.stepT = .7; g.audio.play('brute_step', { pos: this.pos(), vol: .5 }); g.shake(.04); } }
    }
    this.vx = approach(this.vx, want, 10 * dt);
    this.vy += GRAV * dt; moveBody(this, dt, g.world);
    if (Math.abs(dx) < 1 && Math.abs(p.y - this.y) < 1.8 && !p.dead) p.hurt(this.x);
    this.sync(dt);
  }
}

// ======================================================================== BOSS
export class Boss extends Enemy {
  constructor(g, x, y) {
    super(g, 'boss', x, y, { range: [3.2, 9.5] });
    this.w = 3.2; this.h = 6.2; this.hp = this.maxHp = 64; this.freezeNeed = 99;
    this.core = node(this.model, 'fx_core'); this.handR = node(this.model, 'fx_hand_R'); this.footR = node(this.model, 'fx_foot_R');
    this.queue = []; this.phase = 1; this.open = 0; this.overload = 0; this.chill = 0; this.cycle = 0;
    this.setState('intro', 'idle'); this.facing = -1; this.stepT = 0;
  }
  corePos(out = new THREE.Vector3()) { if (this.core) { this.core.getWorldPosition(out); out.z = 0; return out; } return out.set(this.x - .3, this.y + 3.8, 0); }
  coreOpen() { return this.state === 'open' && this.stateT > .45; }
  hit(dmg, o = {}) {
    if (this.dead) return false;
    const g = this.g;
    // the core is the only weak point; the body just sparks
    if (!this.coreOpen()) {
      if (o.kind === 'bolt' || o.kind === 'storm') {
        this.overload += o.kind === 'storm' ? 2 : 1; flash(this.mats, .12, 0xfff0c0, .5);
        g.fx.sparks(this.x, this.y + 3, 16, 1.57, 2); g.audio.play('boss_hurt', { vol: .6 });
        if (this.overload >= 2 && this.state !== 'open') { this.overload = 0; this.forceOpen(); g.ui.pop('הברק פתח את הלב!'); }
        if (o.kind === 'storm') { this.hp -= 6; g.ui.boss(this.hp / this.maxHp); }
        return true;
      }
      g.audio.play('shield_block', { pos: this.pos(), pitch: .7 }); g.fx.sparks(o.at?.x ?? this.x - 1.4, o.at?.y ?? this.y + 2, 10, Math.PI, 1);
      g.ui.hintOnce('bossCore');
      return false;
    }
    let d = dmg * (o.kind === 'smash' ? 1.4 : 1) * (o.kind === 'storm' ? 1 : 1.6);
    this.hp -= d; g.addStorm(dmg * .5); flash(this.mats, .1, 0xffffff, .6);
    const cp = this.corePos(); g.fx.sparks(cp.x, cp.y, 18, Math.PI, 1.5); g.fx.fireBurst(cp.x, cp.y, .4);
    g.audio.play('boss_hurt'); g.shake(.2); g.hitstop(.05);
    g.ui.boss(this.hp / this.maxHp);
    if (this.anim.has('hurt_open') && this.hp > 0) this.anim.play('hurt_open', { once: true, fade: .05, restart: true, done: () => { if (this.state === 'open') this.anim.play('open_idle', { fade: .12 }); } });
    if (this.hp <= 0) { this.die(); return true; }
    if (this.phase === 1 && this.hp < this.maxHp * .5) { this.phase = 2; g.bossPhase2(); }
    return true;
  }
  playOpen() { this.setState('open', 'open', { once: true, fade: .12, restart: true, done: () => { if (this.state === 'open') this.anim.play('open_idle', { fade: .15 }); } }); this.g.audio.play('boss_open'); }
  forceOpen() { this.queue = []; this.playOpen(); this.openLen = 3.8; }
  chillBy(dt) { if (this.state === 'open') { this.chill = Math.min(3, this.chill + dt * 1.6); } flash(this.mats, .05, 0x9cc8e0, .3); }
  die() {
    const g = this.g; this.dead = true; this.deadT = 0;
    this.anim.mixer.timeScale = 1; this.anim.play('death', { once: true, fade: .1 });
    g.audio.play('boss_die'); g.audio.duckMusic(.2, 3);
    g.onBossDead(this);
  }
  update(dt) {
    const g = this.g, p = g.player;
    this.stateT += dt; this.cd -= dt;
    if (this.dead) {
      this.deadT += dt;
      if (Math.random() < .5) { g.fx.sparks(this.x + rnd(-1.5, 1.5), this.y + rnd(1, 5.5), 6, 1.57, 2); }
      if (Math.random() < .25) g.fx.smoke(this.x + rnd(-1.5, 1.5), this.y + rnd(2, 5), 2, 1.4);
      if (Math.random() < .08) { g.fx.fireBurst(this.x + rnd(-1.5, 1.5), this.y + rnd(1.5, 5), .7); g.shake(.2); }
      this.sync(dt); return;
    }
    const dx = p.x - this.x;
    const speed = this.phase === 2 ? 1.2 : 1;
    if (this.state === 'intro') { if (this.stateT > 2.2) this.next(); }
    else if (this.state === 'walk') {
      const want = Math.abs(dx) > 7.5 ? Math.sign(dx) * 1.5 * speed : 0;
      this.vx = approach(this.vx, want, 6 * dt); this.x = clamp(this.x + this.vx * dt, this.range[0], this.range[1]);
      this.stepT -= dt; if (this.stepT < 0 && Math.abs(this.vx) > .2) { this.stepT = .8 / speed; g.audio.play('boss_step'); g.shake(.12); g.fx.dust(this.x + rnd(-1, 1), this.y, 8, 1.4); }
      if (this.stateT > 1.6 || (!want && this.stateT > .6)) this.next();
    } else if (this.state === 'stomp') {
      if (!this.hitDone && this.stateT > this.anim.dur('stomp') * .48 / speed) { this.hitDone = true; const f = this.footR ? this.footR.getWorldPosition(new THREE.Vector3()).x : this.x - 1.2; g.bossShockwave(Math.min(f, this.x - 1), this.y); g.audio.play('boss_stomp'); g.shake(.55); }
      if (this.stateT > this.anim.dur('stomp') / speed) this.next();
    } else if (this.state === 'slam') {
      if (!this.hitDone && this.stateT > this.anim.dur('slam') * .5 / speed) {
        this.hitDone = true; g.audio.play('boss_slam'); g.shake(.7); g.hitstop(.04);
        const x0 = this.x - 4.4, x1 = this.x - 1.0; for (let x = x0; x < x1; x += 1) g.fx.dust(x, this.y, 4, 1.4);
        g.fx.ring(this.x - 2.7, this.y, 0xf0e0c0, 5.5, .5, .7);
        if (p.x > x0 && p.x < x1 && p.y < this.y + 1.2) p.hurt(this.x, 1);
      }
      if (this.stateT > this.anim.dur('slam') / speed) this.next();
    } else if (this.state === 'throw') {
      if (!this.hitDone && this.stateT > this.anim.dur('throw') * .55 / speed) { this.hitDone = true; const h = this.handR ? this.handR.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(this.x - 1.5, this.y + 4, 0); g.bossGear(h.x, h.y, Math.sign(dx) || -1); g.audio.play('boss_throw'); }
      if (this.stateT > this.anim.dur('throw') / speed) this.next();
    } else if (this.state === 'open') {
      const len = (this.openLen || 3.2) + this.chill;
      if (this.stateT > .3 && this.stateT < .4 && !this.steamed) { this.steamed = true; g.audio.play('steam_hiss'); }
      if (Math.random() < .2) { const c = this.corePos(); g.fx.steam(c.x + .4, c.y + .8, .3); }
      if (this.stateT > len) { this.chill = 0; this.steamed = false; this.setState('close', 'close', { once: true, fade: .1 }); g.audio.play('boss_open', { pitch: .85 }); if (g.hearts <= 3 && !g.objects.some(o => o.type === 'heart')) g.addHeart(-7 + Math.random() * 4, 1.3); }
    } else if (this.state === 'close') { if (this.stateT > this.anim.dur('close')) this.next(); }
    else if (this.state === 'roar') { if (this.stateT > 1.4) this.next(); }
    // contact: shove the hero back
    if (!p.dead && p.x > this.x - this.w / 2 - .3 && p.x < this.x + this.w / 2 && p.y < this.y + 5) { p.x = this.x - this.w / 2 - .3; if (p.vx > 0) p.vx = -2; p.hurt(this.x); }
    this.sync(dt);
  }
  next() {
    if (!this.queue.length) {
      this.cycle++;
      const atk = this.phase === 1 ? [['stomp', 'throw'], ['slam', 'stomp'], ['throw', 'slam']][this.cycle % 3] : [['stomp', 'throw', 'slam'], ['throw', 'stomp', 'stomp'], ['slam', 'throw', 'stomp']][this.cycle % 3];
      this.queue = ['walk', atk[0], 'walk', ...atk.slice(1), 'open'];
    }
    const s = this.queue.shift(); this.hitDone = false;
    if (s === 'walk') this.setState('walk', 'walk', { fade: .25 });
    else if (s === 'open') { this.playOpen(); this.openLen = this.phase === 2 ? 2.8 : 3.4; this.g.ui.hintOnce('bossOpen'); }
    else this.setState(s, s, { once: true, fade: .12, restart: true });
    if (this.anim.cur) this.anim.cur.timeScale = this.phase === 2 ? 1.2 : 1;
  }
  sync(dt) {
    this.anim.update(dt);
    this.model.position.set(this.x, this.y, 0);
    this.model.rotation.y += (-TURN * 0.85 - this.model.rotation.y) * Math.min(1, dt * 4);
    updateMats(this.mats, dt, 0);
  }
}

// ======================================================================== projectiles
export class Fireball {
  constructor(g, x, y, dir) {
    this.g = g; this.x = x; this.y = y; this.vx = dir * 15; this.dir = dir; this.life = 1.1; this.dead = false;
    this.mesh = makeFireballMesh(); this.mesh.position.set(x, y, .3); g.scene.add(this.mesh);
  }
  update(dt) {
    const g = this.g; this.life -= dt; this.x += this.vx * dt;
    this.mesh.position.set(this.x, this.y, .3); const s = .85 + Math.sin(this.life * 50) * .08; this.mesh.scale.set(s, s, 1);
    for (let i = 0; i < 3; i++) g.fx.fireTrail(this.x - this.dir * i * .12, this.y, .25);
    if (this.life <= 0) return this.explode(false);
    // hit test: enemies, barricades/walls, solids
    if (g.fireHit(this)) return;
    for (const s of g.world.solids) if (!s.off && !s.oneWay && this.x > s.x0 && this.x < s.x1 && this.y > s.y0 && this.y < s.y1) return this.explode(true);
  }
  explode(sound = true) {
    if (this.dead) return; this.dead = true;
    this.g.scene.remove(this.mesh); this.mesh.material.map.dispose(); this.mesh.material.dispose();
    this.g.fx.fireBurst(this.x, this.y, .8); if (sound) this.g.audio.play('fire_explode', { pos: new THREE.Vector3(this.x, this.y, 0) });
  }
}

export class EnemyShot {
  constructor(g, x, y, tx, ty) {
    this.g = g; this.x = x; this.y = y; const d = new THREE.Vector2(tx - x, ty - y).normalize().multiplyScalar(6.8);
    this.vx = d.x; this.vy = d.y; this.life = 3.2; this.dead = false;
    const c = document.createElement('canvas'); c.width = c.height = 32; const k = c.getContext('2d');
    const gr = k.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,245,215,1)'); gr.addColorStop(.4, 'rgba(240,170,70,.9)'); gr.addColorStop(1, 'rgba(200,90,30,0)');
    k.fillStyle = gr; k.fillRect(0, 0, 32, 32);
    this.mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.mesh.scale.set(.5, .5, 1); g.scene.add(this.mesh);
  }
  update(dt) {
    const g = this.g, p = g.player; this.life -= dt; this.x += this.vx * dt; this.y += this.vy * dt;
    this.mesh.position.set(this.x, this.y, .3);
    if (Math.random() < .5) g.fx.add.emit({ x: this.x, y: this.y, z: .2, life: .2, size: .2, c0: C.spark0, c1: C.spark1 });
    if (!p.dead && Math.abs(p.x - this.x) < .45 && this.y > p.y && this.y < p.y + p.h) { p.hurt(this.x); return this.pop(); }
    for (const s of g.world.solids) if (!s.off && !s.oneWay && this.x > s.x0 && this.x < s.x1 && this.y > s.y0 && this.y < s.y1) return this.pop();
    if (this.life <= 0) this.pop();
  }
  pop() { if (this.dead) return; this.dead = true; this.g.scene.remove(this.mesh); this.mesh.material.map.dispose(); this.mesh.material.dispose(); this.g.fx.sparks(this.x, this.y, 8); this.g.audio.play('bullet_hit', { pos: new THREE.Vector3(this.x, this.y, 0), vol: .7 }); }
}

export class BossGear {
  constructor(g, x, y, dir) {
    this.g = g; this.x = x; this.y = y; this.vx = dir * 7.5; this.vy = 4; this.dead = false; this.hp = 2; this.life = 6; this.r = .6;
    this.mesh = Assets.clone('boss_gear'); const s = Assets.size('boss_gear'); this.mesh.scale.setScalar(1.2 / (Math.max(s.x, s.y) || 1.2));
    this.mesh.position.set(x, y, 0); g.scene.add(this.mesh);
    this.whirr = g.audio.loop('gear_whirr', { pos: new THREE.Vector3(x, y, 0), vol: .7 });
  }
  update(dt) {
    const g = this.g, p = g.player; this.life -= dt;
    this.vy += GRAV * .8 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    const fl = g.floorBelow(this.x, this.y + .2) ?? -99;
    if (this.y - this.r < fl) { this.y = fl + this.r; this.vy = Math.abs(this.vy) > 3 ? -this.vy * .45 : 0; if (Math.abs(this.vy) > 1) { g.audio.play('bullet_hit', { pitch: .5, vol: .6 }); g.fx.dust(this.x, fl, 5); } }
    this.mesh.position.set(this.x, this.y, 0); this.mesh.rotation.z -= this.vx * dt / this.r;
    this.whirr?.setPos(V.set(this.x, this.y, 0));
    if (!p.dead && Math.abs(p.x - this.x) < this.r + .25 && p.y < this.y + this.r && p.y + p.h > this.y - this.r) { p.hurt(this.x); this.vx *= -.3; }
    if (this.life <= 0 || this.x < g.L.len[0] - 1 || this.x > g.L.len[1] + 1 || this.y < g.world.killY) this.pop();
  }
  hit(dmg) { this.hp -= dmg; this.g.fx.sparks(this.x, this.y, 10); if (this.hp <= 0) this.pop(true); else this.vx *= -.6; return true; }
  pop(broken) {
    if (this.dead) return; this.dead = true; this.whirr?.stop(.1);
    this.g.scene.remove(this.mesh); this.g.fx.sparks(this.x, this.y, 20, 1.57, 2); this.g.fx.smoke(this.x, this.y, 4);
    if (broken) { this.g.audio.play('wall_break', { vol: .6, pitch: 1.3 }); this.g.spawnCoins(this.x, this.y, 2); }
  }
}

export { WATER_Y, ICE_TOP };
