// "להשיג את הפרס": the impossible level. A golden trophy (made with Kiln) floats in the sky; touch it and you win.
// You never can: every time you get close it pulls a new trick (runs away, shields itself, turns out fake, explodes,
// shrinks...). Meanwhile the enemies never stop and grow angrier, and there is no natural healing, so the level
// always ends in defeat. The trick fires at TRIGGER distance, well before the touch distance, and while a trick runs
// the prize is out of reach, so there is no way to reach it.
import * as THREE from 'three';
import { Assets } from './assets.js?v=10';
import { ARENA } from './world.js?v=10';
import { C } from './fx.js?v=10';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
export const PRIZE_MODEL = 'prize_trophy';
const H = 2.9;          // how tall the trophy is drawn (world units)
const TRIGGER = 3.0;    // a trick starts when you are this close to the middle of the trophy
const TOUCH = 1.0;      // what a real touch would need (never reached)
const SLIP = 2.2;       // the prize always keeps at least this far from your centre (its own body is ~0.8 wide)

/** the tricks after the first few scripted ones are picked from here at random (never the same twice in a row) */
const TRICKS = ['flee', 'shield', 'fake', 'creep', 'bomb', 'tiny'];
const SCRIPT = ['flee', 'shield', 'fake', 'creep', 'bomb', 'guardian', 'tiny'];

export class Prize {
  constructor(g, x, y) {
    this.g = g; this.x = x; this.y = y; this.hx = x; this.hy = y; this.t = 0;
    this.state = 'idle'; this.st = 0; this.n = 0; this.last = ''; this.scale = 1; this.goalScale = 1; this.cool = 0;
    this.root = new THREE.Group(); g.scene.add(this.root);
    this.spin = new THREE.Group(); this.root.add(this.spin);
    const m = Assets.clone(PRIZE_MODEL);
    const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
    const s = H / (size.y || 1); m.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    m.position.set(-c.x * s, -c.y * s, -c.z * s); // centred on the prize point
    m.traverse(o => { if (o.isMesh) { o.castShadow = false; for (const mt of [].concat(o.material)) { if (mt && 'emissive' in mt) { mt.emissive = new THREE.Color(0x3a2400); mt.emissiveIntensity = .55; } } } });
    this.spin.add(m); this.model = m;
    // a warm light so the gold shines whatever the sky behind it
    this.light = new THREE.PointLight(0xffd27a, 18, 9, 1.6); this.light.position.set(0, .4, 2.2); this.root.add(this.light);
    // soft halo behind it
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .75 }));
    halo.position.z = -.6; halo.renderOrder = 2; this.root.add(halo); this.halo = halo;
    this.bubble = null;
    this.closest = 99;
    this.place();
  }
  get busy() { return this.state !== 'idle'; }
  /** the far end of the arena from the player. When the prize has to cross over to get there, it first swings
   *  to the top or bottom of the sky (this.via), so it never flies through you */
  farPoint() {
    const P = this.g.player, sx = P.x > 0 ? -1 : 1;
    const f = { x: sx * rnd(ARENA.x1 - 4, ARENA.x1 - 1.6), y: rnd(ARENA.y0 + 1.6, ARENA.y1 - 1.2) };
    this.via = Math.sign(f.x - this.x) !== Math.sign(this.x - P.x) && Math.abs(P.x - this.x) < 9 ? { x: (this.x + P.x) / 2, y: P.y > (ARENA.y0 + ARENA.y1) / 2 ? ARENA.y0 + .9 : ARENA.y1 - .6 } : null;
    return f;
  }
  update(dt) {
    const g = this.g, P = g.player; if (!P) return;
    this.t += dt; this.st += dt; this.cool -= dt;
    const d = Math.hypot(P.x - this.x, P.y - this.y);
    if (!P.dead) this.closest = Math.min(this.closest, Math.max(TOUCH + .05, d - .9)); // "how close did you get" (never a touch)
    switch (this.state) {
      case 'idle': {
        // drift around its home spot
        this.x += (this.hx + Math.sin(this.t * .7) * 1.1 - this.x) * Math.min(1, dt * 1.5);
        this.y += (this.hy + Math.sin(this.t * 1.1) * .5 - this.y) * Math.min(1, dt * 1.5);
        if (d < TRIGGER && !P.dead && g.state === 'battle' && this.cool <= 0) this.trick();
        break;
      }
      case 'flee': { // zip to the far side, laughing (around you, never through you)
        const w = this.via || { x: this.tx, y: this.ty };
        this.x += (w.x - this.x) * Math.min(1, dt * 7); this.y += (w.y - this.y) * Math.min(1, dt * 7);
        if (this.via && Math.hypot(w.x - this.x, w.y - this.y) < .8) this.via = null;
        if (Math.random() < .8) g.fx.glow.emit({ x: this.x + rnd(-.4, .4), y: this.y + rnd(-.6, .6), z: .2, vx: rnd(-1, 1), vy: rnd(-1, 1), life: .6, size: .35, size1: .02, color: C.goldW });
        if (Math.hypot(this.tx - this.x, this.ty - this.y) < .2 || this.st > 2) { this.via = null; this.home(this.x, this.y); }
        break;
      }
      case 'creep': { // runs away from you at your own speed; cornered -> jumps over you
        const ax = this.x - P.x, ay = this.y - P.y, l = Math.hypot(ax, ay) || 1;
        const sp = 9.5 + (P.speed || 0) * .2;
        this.x += ax / l * sp * dt * (d < TRIGGER + 1.6 ? 1 : .2); this.y += ay / l * sp * dt * (d < TRIGGER + 1.6 ? 1 : .2);
        const cornered = this.x < ARENA.x0 + 1.4 || this.x > ARENA.x1 - 1.4;
        this.x = clamp(this.x, ARENA.x0 + 1.2, ARENA.x1 - 1.2); this.y = clamp(this.y, ARENA.y0 + 1.2, ARENA.y1 - .8);
        if (cornered && d < TRIGGER + .6) { g.pop(this.x, this.y + 1.6, 'הופ!', 'crit'); g.sfx('dash', this.x, this.y, { vol: .8 }); this.go('flee'); const f = this.farPoint(); this.tx = f.x; this.ty = f.y; }
        else if (this.st > 6) this.home(this.x, this.y);
        if (Math.random() < .5) g.fx.glow.emit({ x: this.x + rnd(-.4, .4), y: this.y - .8, z: .2, vy: -1, life: .5, size: .25, size1: .02, color: C.goldW });
        break;
      }
      case 'shield': { // a gold bubble pushes you back
        if (d < 3.3 && !P.dead) {
          const ax = P.x - this.x, ay = P.y - this.y, l = Math.hypot(ax, ay) || 1;
          P.x = this.x + ax / l * 3.3; P.y = this.y + ay / l * 3.3; P.kx += ax / l * 14; P.ky += ay / l * 8;
          if (this.st - (this.lastZap || -9) > .5) { this.lastZap = this.st; g.hurtPlayer(6, this.x, this.y); g.fx.burst(P.x, P.y, 'block', 10); g.sfx('shield_block', this.x, this.y, { vol: .8 }); }
        }
        if (this.bubble) { const k = 1 + Math.sin(this.t * 9) * .03; this.bubble.scale.setScalar(k * Math.min(1, this.st * 4)); this.bubble.position.set(this.x, this.y, 0); }
        if (this.st > 4.5) { this.popBubble(); this.home(this.x, this.y); }
        break;
      }
      case 'gone': { // hidden (fake prize / bomb): comes back far away
        if (this.st > this.wait) { this.root.visible = true; const f = this.farPoint(); this.x = f.x; this.y = f.y; this.home(f.x, f.y); this.scale = .2; g.fx.burst(this.x, this.y, 'light', 30, 1.2); g.sfx('orb_drop', this.x, this.y, { vol: .8 }); g.pop(this.x, this.y + 1.8, 'אני פה!', 'heal'); }
        break;
      }
      case 'tiny': { // shrinks and buzzes around like a fly
        this.goalScale = .3;
        const a = this.t * 3.1;
        this.tx = clamp(this.tx + Math.cos(a * 1.7) * dt * 14, ARENA.x0 + 1, ARENA.x1 - 1); this.ty = clamp(this.ty + Math.sin(a * 2.3) * dt * 9, ARENA.y0 + 1, ARENA.y1 - 1);
        if (d < 3.2) { const ax = this.x - P.x, ay = this.y - P.y, l = Math.hypot(ax, ay) || 1; this.tx += ax / l * 18 * dt; this.ty += ay / l * 12 * dt; this.tx = clamp(this.tx, ARENA.x0 + 1, ARENA.x1 - 1); this.ty = clamp(this.ty, ARENA.y0 + 1, ARENA.y1 - 1); }
        if (d < 2) { const f = this.farPoint(); this.tx = f.x; this.ty = f.y; } // never let you catch it
        this.x += (this.tx - this.x) * Math.min(1, dt * 8); this.y += (this.ty - this.y) * Math.min(1, dt * 8);
        if (this.st > 6.5) { this.goalScale = 1; this.home(this.x, this.y); g.pop(this.x, this.y + 1.6, 'חזרתי לגודל!', 'heal'); }
        break;
      }
    }
    // a safety net: whatever happens, the prize slips out of the way before anything touches it
    if (this.root.visible && this.state !== 'gone' && !P.dead) {
      const dd = Math.hypot(this.x - P.x, this.y - P.y), keep = SLIP * Math.max(.8, this.scale);
      if (dd < keep) {
        let ax = this.x - P.x, ay = this.y - P.y; const l = dd || 1; ax /= l; ay /= l;
        this.x = P.x + ax * keep; this.y = P.y + ay * keep;
        if (this.x < ARENA.x0 + 1 || this.x > ARENA.x1 - 1 || this.y < ARENA.y0 + .6 || this.y > ARENA.y1 - .4) { // pinned to the edge: hop over you
          this.x = clamp(this.x, ARENA.x0 + 1, ARENA.x1 - 1); this.y = clamp(this.y, ARENA.y0 + .6, ARENA.y1 - .4);
          if (Math.hypot(this.x - P.x, this.y - P.y) < keep) { // still too close: slide along the edge to the nearest free spot around you
            let best = null, bd = 1e9;
            for (let k = 0; k < 24; k++) {
              const a = k / 24 * Math.PI * 2, x = P.x + Math.cos(a) * keep, y = P.y + Math.sin(a) * keep;
              if (x < ARENA.x0 + 1 || x > ARENA.x1 - 1 || y < ARENA.y0 + .6 || y > ARENA.y1 - .4) continue;
              const q = Math.hypot(x - this.x, y - this.y); if (q < bd) { bd = q; best = { x, y }; }
            }
            if (best) { this.x = best.x; this.y = best.y; }
          }
          if (this.state === 'idle' || this.state === 'creep') { g.pop(this.x, this.y + 1.6, 'הופ!', 'crit'); g.sfx('dash', this.x, this.y, { vol: .8 }); const f = this.farPoint(); this.tx = f.x; this.ty = f.y; this.go('flee'); }
        }
      }
    }
    if (this.state !== 'tiny') this.goalScale = this.state === 'gone' ? 0 : 1;
    this.scale += (this.goalScale - this.scale) * Math.min(1, dt * 6);
    // draw
    this.root.position.set(this.x, this.y + Math.sin(this.t * 2.4) * .15, .2);
    this.root.scale.setScalar(Math.max(.01, this.scale));
    this.spin.rotation.y = Math.sin(this.t * .8) * .7 + (this.state === 'flee' ? this.st * 14 : 0);
    this.spin.rotation.z = this.state === 'creep' ? Math.sin(this.t * 18) * .15 : Math.sin(this.t * 1.3) * .05;
    this.halo.material.opacity = .55 + Math.sin(this.t * 3) * .2;
    this.light.intensity = 14 + Math.sin(this.t * 3) * 5;
    if (this.root.visible && Math.random() < .35) g.fx.glow.emit({ x: this.x + rnd(-1, 1) * this.scale, y: this.y + rnd(-1.1, 1.1) * this.scale, z: .5, vy: rnd(.3, 1), life: .9, size: .18, size1: .02, alpha: .9, color: C.goldW });
  }
  go(s) { this.state = s; this.st = 0; }
  home(x, y) { this.hx = clamp(x, ARENA.x0 + 2, ARENA.x1 - 2); this.hy = clamp(y, ARENA.y0 + 1.4, ARENA.y1 - 1); this.go('idle'); this.cool = .35; }
  place() { const P = this.g.player, side = -this.g.side.homeDir; this.x = this.hx = side * 8; this.y = this.hy = 6.3; if (P) this.closest = Math.hypot(P.x - this.x, P.y - this.y); }
  /** you got close: pull the next trick */
  trick() {
    const g = this.g;
    let k = SCRIPT[this.n];
    if (!k) { const pool = TRICKS.filter(t => t !== this.last); k = pool[Math.floor(Math.random() * pool.length)]; }
    if (k === 'guardian' && g.boss) k = 'flee';
    this.n++; this.last = k; g.prizeAlmost = (g.prizeAlmost || 0) + 1;
    g.pop(this.x, this.y + 1.9, ['כמעט!', 'אוי!', 'לא כל כך מהר!', 'חה חה!', 'עוד קצת…', 'נו באמת…'][this.n % 6], 'crit');
    g.sfx('imp_cackle', this.x, this.y, { vol: .9, rate: 1.35 });
    const lines = {
      flee: ['הפרס ברח!', 'הוא לא רוצה שיתפסו אותו'],
      shield: ['מגן זהב!', 'הפרס הדליק מגן. אי אפשר להתקרב'],
      fake: ['פרס מזויף!', 'זה בכלל לא היה הפרס… והוא מלא אויבים'],
      guardian: ['שומר הפרס!', 'מישהו גדול שומר על הפרס'],
      creep: ['הפרס בורח ממך!', 'הוא טס בדיוק כמו המהירות שלך'],
      bomb: ['בום!', 'הפרס התפוצץ… ונבנה מחדש במקום אחר'],
      tiny: ['הפרס התכווץ!', 'נסו לתפוס זבוב זהב'],
    }[k];
    g.ui_banner(lines[0], lines[1]);
    if (k === 'flee') { const f = this.farPoint(); this.tx = f.x; this.ty = f.y; this.go('flee'); g.sfx('dash', this.x, this.y, { vol: .9 }); }
    if (k === 'creep') this.go('creep');
    if (k === 'tiny') { this.tx = this.x; this.ty = this.y; this.go('tiny'); g.sfx('dash', this.x, this.y, { vol: .6, rate: 1.6 }); }
    if (k === 'shield') {
      this.go('shield'); this.lastZap = -9;
      this.bubble = new THREE.Mesh(new THREE.SphereGeometry(3.1, 32, 20), g.shieldMat(0xffd27a, 1)); this.bubble.renderOrder = 6; g.scene.add(this.bubble);
      g.sfx('shield_bless', this.x, this.y, { vol: 1 }); g.fx.ring(this.x, this.y, .5, 3.4, .5, C.goldW, .9);
    }
    if (k === 'fake' || k === 'bomb') {
      this.go('gone'); this.wait = k === 'fake' ? 1.3 : 1.6; this.root.visible = false;
      if (k === 'fake') {
        g.fx.puff(this.x, this.y, 'smoke', 20, 1.4); g.sfx('orb_hit', this.x, this.y, { vol: 1 });
        for (let i = 0; i < 3; i++) g.spawn('small', { x: this.x + rnd(-1, 1), y: clamp(this.y + rnd(-1, 1), ARENA.y0 + .6, ARENA.y1 - .6), instant: true });
      } else {
        g.fx.burst(this.x, this.y, 'fire', 50, 2); g.fx.ring(this.x, this.y, .5, 5, .5, C.fire, .9); g.shake(.7); g.sfx('meteor_impact', this.x, this.y, { vol: 1 });
        const P = g.player; if (Math.hypot(P.x - this.x, P.y - this.y) < 5.2) g.hurtPlayer(14, this.x, this.y);
      }
    }
    if (k === 'guardian') { this.go('flee'); const f = this.farPoint(); this.tx = f.x; this.ty = f.y; g.prizeGuardian(); }
  }
  popBubble() { if (!this.bubble) return; this.g.scene.remove(this.bubble); this.bubble.geometry.dispose(); this.bubble = null; this.g.fx.burst(this.x, this.y, 'light', 16); }
  remove() { this.popBubble(); this.g.scene.remove(this.root); }
}

let _halo = null;
function haloTex() {
  if (_halo) return _halo;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,226,150,.85)'); gr.addColorStop(.35, 'rgba(255,196,90,.35)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  _halo = new THREE.CanvasTexture(c); _halo.colorSpace = THREE.SRGBColorSpace; return _halo;
}
