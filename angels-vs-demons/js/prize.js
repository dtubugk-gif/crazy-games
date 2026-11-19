// "להשיג את הפרס": you alone against 300 of the other side. Only when all 300 are down does the prize appear:
// a golden trophy (made with Kiln) comes down from the sky in a beam of light; fly to it and it is yours.
import * as THREE from 'three';
import { Assets } from './assets.js?v=14';
import { ARENA } from './world.js?v=14';
import { C } from './fx.js?v=14';

const rnd = (a, b) => a + Math.random() * (b - a);
export const PRIZE_MODEL = 'prize_trophy';
export const PRIZE_TOTAL = 300;
const H = 2.9; // how tall the trophy is drawn (world units)

/** which enemy is number i (0..299): the mix gets tougher as you go; two champions, the last one closes the level */
export function prizeRole(i) {
  if (i === 149 || i === PRIZE_TOTAL - 1) return 'rival';
  const p = i / PRIZE_TOTAL;
  const mix = p < .15 ? [['small', 70], ['charger', 30]]
    : p < .4 ? [['small', 45], ['charger', 20], ['diver', 20], ['caster', 15]]
      : p < .7 ? [['small', 35], ['charger', 15], ['diver', 20], ['caster', 15], ['heavy', 15]]
        : [['small', 30], ['charger', 15], ['diver', 20], ['caster', 15], ['heavy', 20]];
  let r = Math.random() * 100;
  for (const [role, w] of mix) { if ((r -= w) < 0) return role; }
  return 'small';
}

/** the trophy: comes down from the sky, waits for you, and is taken when you touch it */
export class Trophy {
  constructor(g, x, y) {
    this.g = g; this.x = x; this.y0 = y; this.y = ARENA.y1 + 7; this.t = 0; this.state = 'down'; this.taken = false;
    this.root = new THREE.Group(); g.scene.add(this.root);
    this.spin = new THREE.Group(); this.root.add(this.spin);
    const m = Assets.clone(PRIZE_MODEL);
    const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const s = H / (size.y || 1); m.scale.setScalar(s); m.position.set(-c.x * s, -c.y * s, -c.z * s);
    m.traverse(o => { if (o.isMesh) { o.castShadow = false; for (const mt of [].concat(o.material)) if (mt && 'emissive' in mt) { mt.emissive = new THREE.Color(0x3a2400); mt.emissiveIntensity = .55; } } });
    this.spin.add(m);
    this.light = new THREE.PointLight(0xffd27a, 18, 9, 1.6); this.light.position.set(0, .4, 2.2); this.root.add(this.light);
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8), new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }));
    this.halo.position.z = -.6; this.halo.renderOrder = 2; this.root.add(this.halo);
    // the beam of light it comes down in
    this.beam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 30), new THREE.MeshBasicMaterial({ map: beamTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.beam.position.set(x, y + 15, -1.5); this.beam.renderOrder = 1; g.scene.add(this.beam);
    g.sfx('special_holy', x, y, { vol: .8 });
  }
  update(dt) {
    const g = this.g, P = g.player; this.t += dt;
    if (this.state === 'down') { // slow fall into place
      this.y += (this.y0 - this.y) * Math.min(1, dt * 1.6);
      this.beam.material.opacity = Math.min(.75, this.beam.material.opacity + dt * .6);
      if (Math.abs(this.y - this.y0) < .05) { this.state = 'wait'; g.fx.ring(this.x, this.y, .6, 4, .6, C.goldW, .9); g.sfx('orb_drop', this.x, this.y, { vol: .9 }); }
    } else if (this.state === 'wait') {
      if (P && !P.dead && Math.hypot(P.x - this.x, P.y - this.y) < P.r + 1.1) this.take();
    } else if (this.state === 'taken') { // floats above your head, turning slowly
      this.x += (P.x - this.x) * Math.min(1, dt * 5); this.y += (P.y + P.r + 1.9 - this.y) * Math.min(1, dt * 5);
      this.beam.material.opacity = Math.max(0, this.beam.material.opacity - dt * .8);
    }
    const bob = this.state === 'wait' ? Math.sin(this.t * 2.4) * .18 : 0;
    this.root.position.set(this.x, this.y + bob, .2);
    this.root.scale.setScalar(this.state === 'taken' ? .62 : 1);
    this.spin.rotation.y = this.state === 'taken' ? this.t * 1.6 : Math.sin(this.t * .8) * .7;
    this.halo.material.opacity = .6 + Math.sin(this.t * 3) * .2;
    this.light.intensity = 14 + Math.sin(this.t * 3) * 5;
    if (Math.random() < .4) g.fx.glow.emit({ x: this.x + rnd(-1, 1), y: this.y + rnd(-1.2, 1.2), z: .5, vy: rnd(.3, 1), life: .9, size: .18, size1: .02, alpha: .9, color: C.goldW });
  }
  take() {
    if (this.taken) return; this.taken = true; this.state = 'taken';
    const g = this.g; g.fx.burst(this.x, this.y, 'light', 60, 2.4); g.fx.ring(this.x, this.y, .5, 7, .7, C.goldW, .95); g.fx.rays(this.x, this.y, 14, 7, .9, C.goldW);
    g.shake(.5); g.prizeTaken();
  }
  remove() { this.g.scene.remove(this.root); this.g.scene.remove(this.beam); }
}

let _halo = null, _beam = null;
function haloTex() {
  if (_halo) return _halo;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,226,150,.85)'); gr.addColorStop(.35, 'rgba(255,196,90,.35)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  _halo = new THREE.CanvasTexture(c); _halo.colorSpace = THREE.SRGBColorSpace; return _halo;
}
function beamTex() {
  if (_beam) return _beam;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
  const h = x.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(255,220,150,0)'); h.addColorStop(.5, 'rgba(255,236,190,.9)'); h.addColorStop(1, 'rgba(255,220,150,0)');
  x.fillStyle = h; x.fillRect(0, 0, 64, 256);
  x.globalCompositeOperation = 'destination-in'; const v = x.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, 'rgba(0,0,0,.2)'); v.addColorStop(.75, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = v; x.fillRect(0, 0, 64, 256);
  _beam = new THREE.CanvasTexture(c); _beam.colorSpace = THREE.SRGBColorSpace; return _beam;
}
