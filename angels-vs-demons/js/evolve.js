// Evolution mode hero: starts as the smallest of its side and evolves through 7 forms (roster.js FORMS).
// Every form has its own attack / shoot / special (the MOVES below), played with that model's own animations.
import { Player, makeModel } from './actors.js?v=9';
import { FORMS, EVO_XP } from './roster.js?v=9';
import { ARENA } from './world.js?v=9';
import { C } from './fx.js?v=9';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class EvoPlayer extends Player {
  constructor(g, sideDef, level = 0) {
    const f = FORMS[sideDef.key][level];
    super(g, sideDef, f.model, f.display);
    this.evo = true; this.xp = EVO_XP[level]; this.atkCd = 0; this.lunge = null; this.blockT = 0; this.channel = null; this.orbit = null; this.stoneT = 0;
    this.applyForm(level, true);
  }
  get dmgMul() { return this.form.dmg; }
  get spd() { return this.form.speed; }
  get key() { return this.def.key; }
  get fxKind() { return this.def.key === 'angel' ? 'light' : 'fire'; }
  get maxLevel() { return FORMS[this.def.key].length - 1; }

  applyForm(level, first) {
    const f = FORMS[this.def.key][level];
    this.level = level; this.form = f;
    if (!first) {
      this.g.scene.remove(this.root);
      this.m = makeModel(f.model, f.display); this.root = this.m.root; this.g.scene.add(this.root);
      this._lastF = null; this.act = null; this.events = [];
    }
    // evolving keeps your wounds (scaled to the new body) and heals a quarter on top
    const frac = first ? 1 : clamp(this.hp / this.maxHp, 0, 1);
    this.r = f.r; this.maxHp = f.hp; this.hp = Math.min(f.hp, Math.round(f.hp * (frac + .25)));
    this.lunge = null; this.blockT = 0; this.channel = null; this.orbit = null; this.stoneT = 0; this.dashT = 0;
    this.playLoop('idle');
  }
  /** power from a defeated enemy; returns true when it is time to evolve */
  gainXp(n) {
    this.xp += n;
    return this.level < this.maxLevel && this.xp >= EVO_XP[this.level + 1];
  }
  xpFrac() {
    if (this.level >= this.maxLevel) return 1;
    const a = EVO_XP[this.level], b = EVO_XP[this.level + 1];
    return clamp((this.xp - a) / (b - a), 0, 1);
  }

  // ------------------------------------------------------------ input -> this form's moves
  attack() {
    const mv = this.form.moves.attack;
    if (mv === 'combo') return super.attack();
    if (this.atkCd > 0) return;
    this.queued = false; MOVES[mv].call(this);
  }
  shoot() {
    const mv = this.form.moves.shoot;
    if (mv === 'throw') return super.shoot();
    MOVES[mv].call(this);
  }
  useSpecial() {
    const mv = this.form.moves.special;
    if (mv === 'nova') return super.useSpecial();
    this.special = 0; this.inv = Math.max(this.inv, 1.2);
    MOVES[mv].call(this);
  }

  update(dt, inp) {
    this.atkCd -= dt;
    // shield stance: you can't fly while holding it
    if (this.blockT > 0) inp = { ...inp, x: inp.x * .2, y: inp.y * .2 };
    super.update(dt, inp);
    if (this.dead) return;
    const g = this.g;
    // lunges hurt everything they pass through, once each
    if (this.lunge) {
      if (this.dashT > 0) {
        const L = this.lunge;
        for (const e of g.enemies) {
          if (e.dead || e.spawning > 0 || L.hit.has(e)) continue;
          if (Math.hypot(e.x - this.x, e.y - this.y) < this.r + e.r + .4) { L.hit.add(e); g.hurtEnemy(e, L.dmg, Math.sign(this.vx || this.face) * L.knock, 2, { melee: true }); g.hitStop(.03); }
        }
        if (L.trail) L.trail();
      } else { const L = this.lunge; this.lunge = null; L.end?.(); }
    }
    // shield stance reflects the enemy's shots back at them
    if (this.blockT > 0) {
      this.blockT -= dt;
      for (const s of g.shots) {
        if (s.from !== 'enemy' || s.kill) continue;
        if (Math.hypot(s.x - this.x, s.y - this.y) < this.r + 2.4) {
          s.from = 'player'; s.vx *= -1.2; s.vy *= -1.2; s.dmg *= 1.5; s.aim = null; s.life = 1.2; s.hitSet.clear();
          g.fx.burst(s.x, s.y, 'block', 10); g.sfx('shield_block', s.x, s.y, { vol: .7, gap: .05 });
        }
      }
      if (this.blockT <= 0) this.blockEnd?.();
    }
    // channelled moves (fire breath)
    if (this.channel) { this.channel.t -= dt; this.channel.tick(dt); if (this.channel.t <= 0) this.channel = null; }
    // orbiting fireballs
    if (this.orbit) {
      const O = this.orbit; O.t -= dt; O.a += dt * 3.2;
      for (let i = 0; i < O.n; i++) {
        const a = O.a + i * Math.PI * 2 / O.n, x = this.x + Math.cos(a) * O.R, y = this.y + Math.sin(a) * O.R * .8;
        g.fx.trail(x, y, 'fire', .3); g.fx.trail(x, y, 'fire', .3);
        for (const e of g.enemies) {
          if (e.dead || e.spawning > 0) continue;
          if (Math.hypot(e.x - x, e.y - y) < e.r + .7 && (O.cd.get(e) || 0) <= g.t) { O.cd.set(e, g.t + .4); g.hurtEnemy(e, 9 * this.dmgMul, Math.sign(e.x - this.x) * 4, 1, {}); g.sfx('fireball_hit', x, y, { vol: .4, gap: .08 }); }
        }
      }
      if (O.t <= 0) this.orbit = null;
    }
    // stone skin: can't be hurt, pulses shockwaves
    if (this.stoneT > 0) {
      this.stoneT -= dt; this.inv = Math.max(this.inv, .1);
      this.stonePulse = (this.stonePulse || 0) - dt;
      if (this.stonePulse <= 0) { this.stonePulse = 1; this.area(this.x, this.y, 4.8, 14, 10, 'stone'); g.fx.ring(this.x, this.y, .5, 4.8, .4, C.stone, .8); g.sfx('stone_hit', this.x, this.y, { vol: .8 }); }
      if (Math.random() < .5) g.fx.shard.emit({ x: this.x + rnd(-1, 1), y: this.y + rnd(-1, 1), vy: rnd(1, 3), life: .6, size: .2, grav: 8, color: C.stone, spin: rnd(-8, 8) });
    }
  }

  // ------------------------------------------------------------ helpers the moves share
  target(maxD = 18) { const t = this.nearest(maxD); if (t) this.face = Math.sign(t.x - this.x) || this.face; return t; }
  angTo(t) { return t ? Math.atan2(t.y - this.y, t.x - this.x) : (this.face > 0 ? 0 : Math.PI); }
  from(pt = 'fx_hand_R') { return this.point(pt, .2); }
  /** damage everything within R of (cx, cy) */
  area(cx, cy, R, dmg, knock = 8, burst = null, stun = 0) {
    const g = this.g; let n = 0;
    for (const e of g.enemies) {
      if (e.dead || e.spawning > 0) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d < R + e.r) { g.hurtEnemy(e, dmg * this.dmgMul, Math.sign(e.x - cx || 1) * knock, 2, { melee: true }); if (stun) e.stun = Math.max(e.stun, stun); n++; }
    }
    if (burst) g.fx.burst(cx, cy, burst, 14, 1);
    return n;
  }
  /** a melee swing in front of you */
  swing(reach, dmg, knock, sfxHit) {
    const g = this.g, cx = this.x + this.face * reach * .55, cy = this.y + .1;
    const n = this.area(cx, cy, reach * .75, dmg, knock);
    for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 2.2; g.fx.trail(this.x + this.face * Math.cos(a) * reach * .9, this.y + Math.sin(a) * reach * .7, this.fxKind, .3); }
    if (n) { g.hitStop(.05 + Math.min(.06, reach * .01)); g.shake(.15 + reach * .04); g.sfx(sfxHit, cx, cy, { vol: .9 }); }
    return n;
  }
  /** damage everything along a line */
  line(ang, len, width, dmg, knock = 6) {
    const g = this.g, ux = Math.cos(ang), uy = Math.sin(ang); let n = 0;
    for (const e of g.enemies) {
      if (e.dead || e.spawning > 0) continue;
      const dx = e.x - this.x, dy = e.y - this.y, along = dx * ux + dy * uy, off = Math.abs(-dx * uy + dy * ux);
      if (along > 0 && along < len && off < width + e.r) { g.hurtEnemy(e, dmg * this.dmgMul, ux * knock, uy * knock, { melee: true }); n++; }
    }
    return n;
  }
  /** rush forward, hurting everything you pass through */
  rush(ang, speed, dur, dmg, knock, end) {
    this.vx = Math.cos(ang) * speed; this.vy = Math.sin(ang) * speed; this.dashT = dur; this.inv = Math.max(this.inv, dur + .1);
    if (Math.abs(this.vx) > 1) this.face = Math.sign(this.vx);
    this.lunge = { dmg: dmg * this.dmgMul, knock, hit: new Set(), end };
    this.g.sfx('dash', this.x, this.y, { vol: .8 });
  }
  /** something falls from the sky onto each target */
  fromSky(targets, kind, dmg, delay = .6, color = C.goldW) {
    const g = this.g;
    targets.forEach((e, i) => {
      const x = clamp(e.x + e.vx * .3, ARENA.x0, ARENA.x1), y = e.y;
      g.after(i * .06, () => {
        g.fx.marker(x, kind === 'meteor' ? y : 5.5, kind === 'meteor' ? 'circle' : 'column', delay, color, kind === 'meteor' ? 1.8 : 1.3, 14);
        g.after(delay, () => {
          if (kind === 'meteor') { const sx = x + rnd(-4, 4), sy = ARENA.y1 + 6; g.shoot('meteor', sx, sy, Math.atan2(y - sy, x - sx), 'player', { dmg: dmg * this.dmgMul, target: { x, y } }); }
          else g.shoot(kind, x, ARENA.y1 + 3, -Math.PI / 2, 'player', { dmg: dmg * this.dmgMul });
        });
      });
    });
  }
  visible(max = 14) {
    const g = this.g, cx = g.cam.x, hw = Math.tan(19 * Math.PI / 180) * g.cam.z * g.camera.aspect;
    return g.enemies.filter(e => !e.dead && e.spawning <= 0 && Math.abs(e.x - cx) < hw + 1).slice(0, max);
  }
}

// ================================================================ the moves (this = the EvoPlayer)
const MOVES = {
  // ---------- 1. cherub / imp
  volley() {
    const g = this.g, t = this.target(16), a = this.angTo(t); this.atkCd = .55;
    this.doAct('attack', [{ t: .4, fn: () => { for (let i = 0; i < 3; i++) g.after(i * .07, () => { const p = this.from('fx_weapon_tip'); g.shoot('arrow', p.x, p.y, a + rnd(-.05, .05), 'player', { dmg: 6 * this.dmgMul }); g.sfx('arrow_shoot', p.x, p.y, { vol: .55, gap: .03 }); }); } }], { speed: 1.7 });
  },
  goldArrow() {
    const g = this.g, t = this.target(18), a = this.angTo(t); this.shotCd = .32;
    const p = this.from('fx_weapon_tip'); g.shoot('arrow', p.x, p.y, a, 'player', { dmg: 8 * this.dmgMul }); g.sfx('arrow_shoot', p.x, p.y, { vol: .6 });
  },
  arrowRain() {
    const g = this.g; this.doAct('attack', [], { speed: 1.2 });
    const tg = this.visible(14); for (const e of [...tg]) tg.push(e); // two arrows for each enemy on screen
    this.fromSky(tg, 'rain', 14, .6); g.sfx('light_spear_rain', this.x, 9, { vol: .8 });
  },
  claws() {
    const g = this.g, t = this.target(6); this.atkCd = .36;
    if (t) { const d = Math.hypot(t.x - this.x, t.y - this.y); if (d > 1.2 && d < 5) { this.vx += (t.x - this.x) / d * 10; this.vy += (t.y - this.y) / d * 10; } }
    this.doAct('attack', [{ t: .2, fn: () => g.sfx('claw_swing', this.x, this.y, { vol: .6 }) }, { t: .45, fn: () => this.swing(2.3, 9, 5, 'claw_hit') }], { speed: 1.5 });
  },
  emberShot() {
    const g = this.g, t = this.target(16), a = this.angTo(t); this.shotCd = .3;
    const fire = () => { const p = this.from(); g.shoot('ember', p.x, p.y, a, 'player', { dmg: 6 * this.dmgMul }); g.sfx('fireball_cast', p.x, p.y, { vol: .5, gap: .05 }); };
    if (!this.act) this.doAct('cast', [{ t: .5, fn: fire }], { speed: 2.2 }); else fire();
  },
  frenzy() {
    const g = this.g; this.inv = 2;
    for (let i = 0; i < 6; i++) g.after(i * .22, () => {
      if (this.dead) return; const t = this.nearest(14); const a = t ? this.angTo(t) : rnd(0, 6.28);
      this.doAct('attack', [], { dur: .2 }); this.rush(a, 34, .18, 14, 8);
      g.fx.embers(this.x, this.y, 8); g.sfx('claw_hit', this.x, this.y, { vol: .6, gap: .05 });
    });
    g.sfx('imp_cackle', this.x, this.y, { vol: .8 });
  },
  // ---------- 2. priestess / sorceress
  orbs() {
    const g = this.g, angel = this.key === 'angel'; this.atkCd = .75;
    const ts = g.enemies.filter(e => !e.dead && e.spawning <= 0).sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
    if (ts[0]) this.face = Math.sign(ts[0].x - this.x) || this.face;
    this.doAct('cast', [{ t: .55, fn: () => {
      const p = this.from('fx_weapon_tip');
      [-.45, .45].forEach((da, i) => { const t = ts[i] || ts[0]; g.shoot(angel ? 'orb_light' : 'orb_dark', p.x, p.y, this.angTo(t) + da, 'player', { dmg: 12 * this.dmgMul, aim: t }); });
      g.sfx('orb_cast', p.x, p.y, { vol: .6 });
    } }], { speed: 1.5 });
  },
  beam() {
    const g = this.g, t = this.target(16), a = this.angTo(t); this.shotCd = 1;
    this.doAct('cast', [{ t: .5, fn: () => {
      const p = this.from('fx_weapon_tip');
      g.fx.beam(p.x, p.y, a, 15, 1.1, .45, C.goldW); g.fx.beam(p.x, p.y, a, 15, .45, .35, C.white);
      this.line(a, 15, .8, 18, 5); g.sfx('special_holy', p.x, p.y, { vol: .45, rate: 1.4 });
    } }], { speed: 1.5 });
  },
  pillar() {
    const g = this.g; this.doAct('shield', [], { speed: 1 });
    const ts = this.visible(14).sort((a, b) => b.hp - a.hp).slice(0, 5);
    ts.forEach((e, i) => g.after(.15 + i * .12, () => {
      g.fx.marker(e.x, 5.5, 'column', .45, C.goldW, 1.8, 16);
      g.after(.45, () => { if (e.dead) return; g.fx.beam(e.x, -1, Math.PI / 2, 14, 1.8, .6, C.goldW); g.fx.burst(e.x, e.y, 'light', 20, 1.3); g.hurtEnemy(e, 40 * this.dmgMul, 0, 6, { melee: true }); });
    }));
    g.heal(Math.round(this.maxHp * .3)); g.sfx('shield_bless', this.x, this.y, { vol: .8 }); g.fx.feathers(this.x, this.y, 14);
  },
  fireRing() {
    const g = this.g; this.shotCd = 1.2;
    this.doAct('shield', [{ t: .45, fn: () => { this.area(this.x, this.y, 4.2, 16, 10); g.fx.ring(this.x, this.y, .5, 4.4, .45, C.fire, .95); g.fx.burst(this.x, this.y, 'fire', 24, 1.2); g.sfx('special_fire', this.x, this.y, { vol: .55, rate: 1.3 }); } }], { speed: 1.7 });
  },
  emberStorm() {
    const g = this.g; this.doAct('shield', [], { speed: 1 });
    this.orbit = { t: 6.5, n: 6, a: 0, R: 2.8, cd: new Map() }; g.sfx('special_fire', this.x, this.y, { vol: .8 });
  },
  // ---------- 4. lightning angel / gargoyle
  diveStrike() {
    const g = this.g, t = this.target(11), a = this.angTo(t), angel = this.key === 'angel'; this.atkCd = .7;
    this.doAct('attack', [], { dur: .5 });
    this.rush(a, 28, .32, 16, 10, () => {
      if (angel) { g.fx.bolt(this.x, this.y + 8, this.x, this.y, .3, 1.6); g.fx.burst(this.x, this.y, 'light', 16); g.sfx('lightning_strike', this.x, this.y, { vol: .7 }); }
      else { g.fx.burst(this.x, this.y, 'stone', 16); g.sfx('stone_hit', this.x, this.y, { vol: .8 }); }
      this.area(this.x, this.y, 2.4, 10, 8); g.shake(.2);
    });
    g.sfx(angel ? 'lightning_strike' : 'gargoyle_screech', this.x, this.y, { vol: .5 });
  },
  chain() {
    const g = this.g; this.shotCd = .7;
    let from = this.from('fx_weapon_tip'), cur = this.target(13); const hit = new Set();
    for (let i = 0; i < 4 && cur; i++) {
      g.fx.bolt(from.x, from.y, cur.x, cur.y, .25, 1.1); g.hurtEnemy(cur, 12 * this.dmgMul, Math.sign(cur.x - from.x) * 3, 1, {}); hit.add(cur);
      from = { x: cur.x, y: cur.y };
      cur = g.enemies.filter(e => !e.dead && !hit.has(e) && e.spawning <= 0 && Math.hypot(e.x - from.x, e.y - from.y) < 7).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
    }
    if (!hit.size) g.fx.bolt(from.x, from.y, from.x + this.face * 6, from.y + rnd(-1, 1), .2, 1);
    g.sfx('lightning_strike', this.x, this.y, { vol: .55, gap: .05 });
  },
  storm() {
    const g = this.g; this.doAct('attack', [], { dur: 1 }); g.slowmo(.5, .5);
    for (let k = 0; k < 2; k++) g.after(.2 + k * .5, () => {
      for (const e of this.visible(14)) { g.fx.bolt(e.x + rnd(-1, 1), ARENA.y1 + 2, e.x, e.y, .3, 1.5); g.hurtEnemy(e, 22 * this.dmgMul, 0, 3, { melee: true }); }
      g.shake(.4); g.sfx('lightning_strike', this.x, 9, { vol: 1 });
    });
  },
  shards() {
    const g = this.g, t = this.target(14), a = this.angTo(t); this.shotCd = .55;
    const p = this.from(); for (let i = -2; i <= 2; i++) g.shoot('shard', p.x, p.y, a + i * .16, 'player', { dmg: 6 * this.dmgMul });
    g.sfx('stone_hit', p.x, p.y, { vol: .5, gap: .05 });
  },
  stoneSkin() {
    const g = this.g; this.doAct('attack', [], { speed: .8 });
    this.stoneT = 5; this.stonePulse = 0; this.inv = 5.2; g.fx.burst(this.x, this.y, 'stone', 30, 1.6); g.sfx('gargoyle_screech', this.x, this.y, { vol: .9 });
  },
  // ---------- 5. valkyrie / pig demon
  thrust() {
    const g = this.g, t = this.target(7), a = t ? this.angTo(t) : (this.face > 0 ? 0 : Math.PI); this.atkCd = .45;
    this.doAct('attack', [{ t: .45, fn: () => {
      const n = this.line(a, 4.4, .7, 15, 9); const p = this.from('fx_weapon_tip');
      g.fx.beam(this.x, this.y, a, 4.4, .35, .2, C.goldW);
      if (n) { g.hitStop(.05); g.sfx('spear_hit', p.x, p.y, { vol: .8 }); } else g.sfx('sword_swing', this.x, this.y, { vol: .6 });
    } }], { speed: 1.4 });
  },
  lanceCharge() {
    const g = this.g, t = this.target(14), a = this.angTo(t); this.shotCd = 1.5;
    this.doAct('charge', [{ t: .35, fn: () => this.rush(a, 27, .45, 20, 14, () => g.fx.ring(this.x, this.y, .4, 2.6, .3, C.goldW)) }], { dur: .9 });
    g.sfx('charge_windup', this.x, this.y, { vol: .7 });
  },
  spearWall() {
    const g = this.g; this.doAct('attack', [], { speed: .9 });
    for (let k = 0; k < 2; k++) g.after(k * .3, () => { for (let i = 0; i < 12; i++) g.shoot('spear', this.x, this.y, i / 12 * Math.PI * 2 + k * .26, 'player', { dmg: 20 * this.dmgMul }); g.sfx('spear_throw', this.x, this.y, { vol: .9 }); });
    g.fx.ring(this.x, this.y, .5, 5, .5, C.goldW);
  },
  bite() {
    const g = this.g, t = this.target(6); this.atkCd = .55;
    if (t) { const d = Math.hypot(t.x - this.x, t.y - this.y); if (d > 1.5 && d < 6) { this.vx += (t.x - this.x) / d * 11; this.vy += (t.y - this.y) / d * 11; } }
    this.doAct('attack', [{ t: .5, fn: () => this.swing(2.8, 16, 8, 'claw_hit') }], { speed: 1.3 });
  },
  ram() {
    const g = this.g, t = this.target(14), a = this.angTo(t); this.shotCd = 1.4;
    this.doAct('charge', [{ t: .35, fn: () => this.rush(a, 25, .5, 22, 15, () => { g.fx.burst(this.x, this.y, 'fire', 14); g.shake(.25); }) }], { dur: .9 });
    g.sfx('pig_squeal_roar', this.x, this.y, { vol: .6 });
  },
  squeal() {
    const g = this.g; this.doAct('attack', [{ t: .4, fn: () => { this.area(this.x, this.y, 7, 20, 14, null, 2.5); g.fx.ring(this.x, this.y, .5, 7, .5, C.fire, .9); g.fx.ring(this.x, this.y, .3, 5, .4, C.fireHot, .7); g.shake(.5); } }], { speed: .9 });
    g.sfx('pig_squeal_roar', this.x, this.y, { vol: 1 });
  },
  // ---------- 6. knight / brute
  bigSlash() {
    const g = this.g, t = this.target(7); this.atkCd = .7;
    if (t) { const d = Math.hypot(t.x - this.x, t.y - this.y); if (d > 2 && d < 6) { this.vx += (t.x - this.x) / d * 9; this.vy += (t.y - this.y) / d * 9; } }
    this.doAct('attack', [{ t: .2, fn: () => g.sfx('sword_swing', this.x, this.y, { vol: .9, rate: .85 }) }, { t: .5, fn: () => this.swing(3.4, 22, 13, 'sword_hit') }], { speed: 1.3 });
  },
  shieldBlock() {
    const g = this.g; this.shotCd = 1.8; this.blockT = 1.1;
    this.doAct('block', [], { dur: 1.1 });
    this.blockEnd = () => { const cx = this.x + this.face * 1.8; this.area(cx, this.y, 2.8, 18, 15); g.fx.ring(cx, this.y, .4, 3, .35, C.goldW); g.sfx('shield_block', cx, this.y, { vol: .9 }); };
    g.sfx('shield_bless', this.x, this.y, { vol: .5 });
  },
  holyCharge() {
    const g = this.g, t = this.target(16), a = this.angTo(t);
    this.doAct('charge', [{ t: .35, fn: () => {
      this.rush(a, 30, .6, 35, 18, () => { this.area(this.x, this.y, 5, 25, 14); g.fx.ring(this.x, this.y, .5, 5.2, .5, C.goldW, .95); g.fx.rays(this.x, this.y, 10, 5, .5, C.goldW); g.shake(.5); g.sfx('special_holy', this.x, this.y, { vol: .9 }); });
      this.lunge.trail = () => { if (Math.random() < .5) g.fx.ring(this.x, this.y, .2, 1.6, .25, C.goldW, .7); g.fx.feathers(this.x, this.y, 1); };
    } }], { dur: 1.1 });
    g.sfx('charge_windup', this.x, this.y, { vol: .8 });
  },
  clubSmash() {
    const g = this.g, t = this.target(7); this.atkCd = .75;
    if (t) { const d = Math.hypot(t.x - this.x, t.y - this.y); if (d > 2 && d < 6) { this.vx += (t.x - this.x) / d * 8; this.vy += (t.y - this.y) / d * 8; } }
    this.doAct('attack', [{ t: .2, fn: () => g.sfx('claw_swing', this.x, this.y, { vol: .9, rate: .8 }) }, { t: .5, fn: () => {
      const cx = this.x + this.face * 1.9; this.swing(3.2, 24, 12, 'club_hit');
      this.area(cx, this.y, 4.6, 10, 8); g.fx.ring(cx, this.y, .5, 4.6, .45, C.fire, .8); g.shake(.3);
    } }], { speed: 1.2 });
  },
  roarStun() {
    const g = this.g; this.shotCd = 2.4;
    this.doAct('roar', [{ t: .4, fn: () => { this.area(this.x, this.y, 6.5, 6, 11, null, 2); g.fx.ring(this.x, this.y, .5, 6.5, .45, C.fire, .8); g.shake(.3); } }], { speed: 1.3 });
    g.sfx('brute_roar', this.x, this.y, { vol: .9 });
  },
  quake() {
    const g = this.g; this.doAct('charge', [], { dur: 1.2 });
    [5, 8, 11].forEach((R, i) => g.after(.3 + i * .3, () => { this.area(this.x, this.y, R, 22, 10, null, .6); g.fx.ring(this.x, this.y, R * .3, R, .45, C.fire, .9); g.fx.burst(this.x, this.y - 1, 'stone', 20, 1.4); g.shake(.5); g.sfx('meteor_impact', this.x, this.y, { vol: .7 }); }));
  },
  // ---------- 7. archangel / demon king
  sweep() {
    const g = this.g, t = this.target(9); this.atkCd = .8;
    this.doAct('attack', [{ t: .3, fn: () => g.sfx(this.key === 'angel' ? 'sword_swing' : 'claw_swing', this.x, this.y, { vol: 1, rate: .7 }) }, { t: .5, fn: () => {
      const n = this.swing(5.2, 30, 15, this.key === 'angel' ? 'sword_hit' : 'club_hit');
      g.fx.ring(this.x + this.face * 3, this.y, .5, 4, .35, this.key === 'angel' ? C.goldW : C.fire, .8); if (n) g.shake(.35);
    } }], { speed: 1.7 });
  },
  spearRain() {
    const g = this.g; this.shotCd = 1.5;
    this.doAct('cast', [{ t: .3, fn: () => { this.fromSky(this.visible(8), 'rain', 22, .55); g.sfx('light_spear_rain', this.x, 9, { vol: .8 }); } }], { speed: 1.5 });
  },
  breath() {
    const g = this.g, t = this.target(12); this.shotCd = 2.1;
    this.doAct('cast', [], { dur: 1.5 }); g.sfx('special_fire', this.x, this.y, { vol: .8, rate: .8 });
    let ang = this.angTo(t), tick = 0;
    this.channel = { t: 1.3, tick: (dt) => {
      const tt = this.nearest(12); if (tt) { const want = this.angTo(tt); let d = want - ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; ang += clamp(d, -1.2 * dt, 1.2 * dt); }
      const m = this.point('fx_mouth', 1.6);
      for (let i = 0; i < 4; i++) { const a = ang + rnd(-.25, .25), s = rnd(11, 16); g.fx.glow.emit({ x: m.x, y: m.y, z: rnd(-.2, .2), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.45, .65), size: rnd(.5, .9), size1: 2.2, alpha: .8, color: C.fireHot, color1: C.ember, drag: 1.2, grav: -3 }); }
      tick -= dt; if (tick <= 0) { tick = .15; for (const e of g.enemies) { if (e.dead || e.spawning > 0) continue; const dx = e.x - m.x, dy = e.y - m.y; let da = Math.atan2(dy, dx) - ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; if (Math.hypot(dx, dy) < 11 && Math.abs(da) < .4) g.hurtEnemy(e, 6 * this.dmgMul, Math.cos(ang) * 3, Math.sin(ang) * 2, {}); } }
    } };
  },
  judgment() {
    const g = this.g; this.doAct('enrage', [{ t: .45, fn: () => {
      this.area(this.x, this.y, 13, 70, 18); g.fx.rays(this.x, this.y, 18, 13, .9, C.goldW); g.fx.ring(this.x, this.y, .5, 13, .7, C.goldW, .95); g.fx.burst(this.x, this.y, 'light', 60, 2.4); g.fx.feathers(this.x, this.y, 30, 3);
      this.fromSky(this.visible(10), 'rain', 20, .5); g.shake(.8); g.sfx('special_holy', this.x, this.y, { vol: 1 }); g.audio.duckMusic(.5, 1.2);
    } }], { dur: 1.4 }); g.slowmo(.7, .4);
  },
  meteorRain() {
    const g = this.g; this.doAct('enrage', [{ t: .4, fn: () => { this.fromSky(this.visible(12), 'meteor', 60, .7, C.fire); g.sfx('meteor_fall', this.x, 9, { vol: .9 }); g.shake(.4); } }], { dur: 1.4 }); g.slowmo(.6, .45);
    g.sfx(this.def.bossRoar, this.x, this.y, { vol: .9 });
  },
};
