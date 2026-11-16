// Effects: GPU point particles (additive + normal), lightning ribbons, ice beam, shockwave rings, flashes.
// Powers read by element: fire = amber/orange, ice = pale blue-white, lightning = warm white-yellow, wind = pale sage.
import * as THREE from 'three';

function softTex(kind = 'soft') {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  if (kind === 'soft') { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  if (kind === 'puff') { for (let i = 0; i < 7; i++) { const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, r = 12 + Math.random() * 10; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); } }
  if (kind === 'shard') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 2); g.lineTo(44, 32); g.lineTo(32, 62); g.lineTo(20, 32); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); return t;
}

class Particles {
  constructor(scene, max, blending, tex) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.age = new Float32Array(max);
    this.size = new Float32Array(max); this.grow = new Float32Array(max);
    this.c0 = new Float32Array(max * 3); this.c1 = new Float32Array(max * 3);
    this.g = new Float32Array(max); this.drag = new Float32Array(max); this.a0 = new Float32Array(max); this.rot = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos); geo.setAttribute('color', this.aCol); geo.setAttribute('size', this.aSize); geo.setAttribute('rot', this.aRot);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending, uniforms: { map: { value: tex }, scale: { value: 600 } },
      vertexShader: `attribute float size; attribute float rot; attribute vec4 color; varying vec4 vC; varying float vR; uniform float scale;
        void main(){ vC = color; vR = rot; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC; varying float vR;
        void main(){ vec2 uv = gl_PointCoord - .5; float c = cos(vR), s = sin(vR); uv = mat2(c,-s,s,c) * uv + .5; vec4 t = texture2D(map, uv); gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a); if (gl_FragColor.a < 0.01) discard; }`,
    });
    this.mat = mat;
    this.points = new THREE.Points(geo, mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points);
  }
  emit(o) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.p[i * 3] = o.x; this.p[i * 3 + 1] = o.y; this.p[i * 3 + 2] = o.z ?? 0;
    this.v[i * 3] = o.vx || 0; this.v[i * 3 + 1] = o.vy || 0; this.v[i * 3 + 2] = o.vz || 0;
    this.life[i] = o.life || 0.6; this.age[i] = 0; this.size[i] = o.size || 0.4; this.grow[i] = o.grow ?? 0;
    const a = o.c0 || [1, 1, 1], b = o.c1 || a;
    this.c0.set(a, i * 3); this.c1.set(b, i * 3);
    this.g[i] = o.g ?? 0; this.drag[i] = o.drag ?? 0; this.a0[i] = o.a ?? 1; this.rot[i] = o.rot ?? Math.random() * 6.28;
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.kill(i); continue; }
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.v[i * 3] *= d; this.v[i * 3 + 1] = this.v[i * 3 + 1] * d + this.g[i] * dt; this.v[i * 3 + 2] *= d;
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      i++;
    }
    const P = this.aPos.array, C = this.aCol.array, S = this.aSize.array, Rr = this.aRot.array;
    for (let j = 0; j < this.n; j++) {
      const u = this.age[j] / this.life[j];
      P[j * 3] = this.p[j * 3]; P[j * 3 + 1] = this.p[j * 3 + 1]; P[j * 3 + 2] = this.p[j * 3 + 2];
      for (let k = 0; k < 3; k++) C[j * 4 + k] = this.c0[j * 3 + k] + (this.c1[j * 3 + k] - this.c0[j * 3 + k]) * u;
      C[j * 4 + 3] = this.a0[j] * (u < 0.12 ? u / 0.12 : 1 - (u - 0.12) / 0.88);
      S[j] = this.size[j] * (1 + this.grow[j] * u); Rr[j] = this.rot[j] + u * 1.5;
    }
    this.points.geometry.setDrawRange(0, this.n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aRot.needsUpdate = true;
  }
  kill(i) {
    const j = --this.n; if (i === j) return;
    for (let k = 0; k < 3; k++) { this.p[i * 3 + k] = this.p[j * 3 + k]; this.v[i * 3 + k] = this.v[j * 3 + k]; this.c0[i * 3 + k] = this.c0[j * 3 + k]; this.c1[i * 3 + k] = this.c1[j * 3 + k]; }
    this.life[i] = this.life[j]; this.age[i] = this.age[j]; this.size[i] = this.size[j]; this.grow[i] = this.grow[j];
    this.g[i] = this.g[j]; this.drag[i] = this.drag[j]; this.a0[i] = this.a0[j]; this.rot[i] = this.rot[j];
  }
  clear() { this.n = 0; }
}

const rnd = (a, b) => a + Math.random() * (b - a);
const col = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
export const C = {
  fire0: col(0xffe0a0), fire1: col(0xe0652a), fire2: col(0x6a2a10), smoke: col(0x5a5048), smokeL: col(0xb8aea0),
  ice0: col(0xf2fbff), ice1: col(0x8dbfd8), bolt0: col(0xfffbe8), bolt1: col(0xf0c048), wind0: col(0xf4f8f2), wind1: col(0xa9c9c2),
  spark0: col(0xfff2c0), spark1: col(0xe08a2a), dust: col(0xc9b79a), brass: col(0xd8a040), white: [1, 1, 1], steam: col(0xf2efe8),
};

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.add = new Particles(scene, 1400, THREE.AdditiveBlending, softTex('soft'));
    this.norm = new Particles(scene, 900, THREE.NormalBlending, softTex('puff'));
    this.shard = new Particles(scene, 400, THREE.NormalBlending, softTex('shard'));
    this.items = []; // timed meshes (bolts, rings, beams) {obj, t, life, update}
    this.lights = [];
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 9, 2); l.userData.t = 0; scene.add(l); this.lights.push(l); }
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.boltGlow = new THREE.MeshBasicMaterial({ color: 0xf0b840, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.ringGeo = new THREE.RingGeometry(0.82, 1, 48); this.ringGeo.rotateX(-Math.PI / 2);
  }
  /** brief coloured point light flash */
  flash(x, y, z, color, intensity = 6, dur = 0.18, dist = 9) {
    const l = this.lights.reduce((a, b) => (a.userData.t < b.userData.t ? a : b));
    l.position.set(x, y, z ?? 1); l.color.setHex(color); l.distance = dist; l.userData.i = intensity; l.userData.t = dur; l.userData.d = dur; l.intensity = intensity;
  }
  sparks(x, y, n = 12, dir = 0, spread = 1, c0 = C.spark0, c1 = C.spark1) {
    for (let i = 0; i < n; i++) { const a = dir + rnd(-1.4, 1.4) * spread, s = rnd(4, 10); this.add.emit({ x, y, z: rnd(-.2, .4), vx: Math.cos(a) * s, vy: Math.sin(a) * s + 2, vz: rnd(-2, 2), life: rnd(.18, .4), size: rnd(.08, .16), c0, c1, g: -18, drag: 2 }); }
  }
  dust(x, y, n = 8, s = 1) {
    for (let i = 0; i < n; i++) this.norm.emit({ x: x + rnd(-.4, .4) * s, y: y + .1, z: rnd(-.3, .5), vx: rnd(-2, 2) * s, vy: rnd(.3, 1.4), vz: rnd(-.5, .5), life: rnd(.4, .8), size: rnd(.4, .8) * s, grow: 1.4, c0: C.dust, c1: C.smokeL, a: .5, drag: 3 });
  }
  smoke(x, y, n = 6, s = 1, dark = true) {
    for (let i = 0; i < n; i++) this.norm.emit({ x: x + rnd(-.3, .3) * s, y, z: rnd(-.3, .3), vx: rnd(-.6, .6), vy: rnd(.8, 2.2), life: rnd(.8, 1.6), size: rnd(.5, 1) * s, grow: 2, c0: dark ? C.smoke : C.steam, c1: C.smokeL, a: dark ? .55 : .5, drag: 1.2 });
  }
  fireBurst(x, y, s = 1) {
    for (let i = 0; i < 26 * s; i++) { const a = rnd(0, 6.28), v = rnd(2, 7) * s; this.add.emit({ x, y, z: rnd(-.3, .5), vx: Math.cos(a) * v, vy: Math.sin(a) * v + 1.5, vz: rnd(-1.5, 1.5), life: rnd(.25, .55), size: rnd(.45, .9) * s, grow: .6, c0: C.fire0, c1: C.fire2, drag: 4, g: 3 }); }
    this.sparks(x, y, 10 * s); this.smoke(x, y, 6 * s, s);
    this.flash(x, y, 1.5, 0xff9a40, 9 * s, 0.25, 10);
  }
  fireTrail(x, y, z = 0) {
    this.add.emit({ x: x + rnd(-.08, .08), y: y + rnd(-.08, .08), z, vx: rnd(-.6, .6), vy: rnd(.3, 1.4), life: rnd(.18, .32), size: rnd(.35, .55), grow: -.4, c0: C.fire0, c1: C.fire1, drag: 2 });
    if (Math.random() < .25) this.norm.emit({ x, y, z: z - .1, vx: rnd(-.3, .3), vy: rnd(.5, 1), life: .6, size: .35, grow: 1.6, c0: C.smoke, c1: C.smokeL, a: .3 });
  }
  burning(x, y, w = 1, h = 2) {
    this.add.emit({ x: x + rnd(-w / 2, w / 2), y: y + rnd(0, h * .7), z: rnd(-.2, .5), vx: rnd(-.3, .3), vy: rnd(1.2, 2.6), life: rnd(.35, .6), size: rnd(.4, .75), grow: -.3, c0: C.fire0, c1: C.fire2, drag: 1 });
    if (Math.random() < .3) this.smoke(x + rnd(-w / 2, w / 2), y + h, 1, .8);
  }
  iceBurst(x, y, s = 1) {
    for (let i = 0; i < 18 * s; i++) { const a = rnd(0, 6.28), v = rnd(2, 6) * s; this.shard.emit({ x, y, z: rnd(-.3, .5), vx: Math.cos(a) * v, vy: Math.sin(a) * v + 3, vz: rnd(-1, 1), life: rnd(.4, .8), size: rnd(.12, .3) * s, c0: C.ice0, c1: C.ice1, g: -16, drag: 1 }); }
    for (let i = 0; i < 10 * s; i++) this.norm.emit({ x: x + rnd(-.4, .4), y: y + rnd(-.3, .3), z: .2, vx: rnd(-1, 1), vy: rnd(-.2, .8), life: rnd(.5, 1), size: rnd(.5, .9) * s, grow: 1.4, c0: C.ice0, c1: C.ice1, a: .55, drag: 2 });
    this.flash(x, y, 1.5, 0xbfe4f5, 5 * s, .2, 8);
  }
  frost(x, y) { this.add.emit({ x: x + rnd(-.25, .25), y: y + rnd(-.25, .25), z: rnd(-.1, .3), vx: rnd(-.5, .5), vy: rnd(-.3, .6), life: rnd(.3, .6), size: rnd(.15, .3), c0: C.ice0, c1: C.ice1, a: .8, drag: 2 }); }
  wind(x, y, dir) { this.norm.emit({ x: x - dir * rnd(.2, .6), y: y + rnd(-.4, .4), z: rnd(-.2, .4), vx: -dir * rnd(3, 6), vy: rnd(-.5, .5), life: rnd(.25, .45), size: rnd(.25, .45), grow: 1.2, c0: C.wind0, c1: C.wind1, a: .45, drag: 2 }); }
  steam(x, y, h = 1) { for (let i = 0; i < 2; i++) this.norm.emit({ x: x + rnd(-.25, .25), y, z: rnd(-.2, .3), vx: rnd(-.5, .5), vy: rnd(5, 8) * h, life: rnd(.5, .8), size: rnd(.5, .8), grow: 2.2, c0: C.steam, c1: C.steam, a: .6, drag: 2.4 }); }
  splash(x, y) {
    for (let i = 0; i < 24; i++) this.norm.emit({ x: x + rnd(-.3, .3), y, z: rnd(-.3, .5), vx: rnd(-3, 3), vy: rnd(3, 8), life: rnd(.5, .9), size: rnd(.2, .45), c0: [.85, .95, 1], c1: [.5, .7, .75], a: .8, g: -20 });
    this.ring(x, y + .05, 0xffffff, 2.4, .5, .5);
  }
  magic(x, y, c0, c1, n = 30) {
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(1, 5); this.add.emit({ x, y, z: rnd(-.3, .6), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.5, 1.1), size: rnd(.12, .3), c0, c1, drag: 1.5, g: 1 }); }
  }
  coinPop(x, y) { for (let i = 0; i < 6; i++) { const a = rnd(0, 6.28); this.add.emit({ x, y, z: .3, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, life: .3, size: .16, c0: [1, .92, .6], c1: [.9, .6, .2], drag: 4 }); } }
  /** expanding flat ring on the ground */
  ring(x, y, color = 0xfff1c8, size = 4, dur = .45, opacity = .8) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    m.position.set(x, y + .06, 0); this.scene.add(m);
    this.items.push({ obj: m, t: 0, life: dur, up: (it, u) => { const s = .3 + u * size; m.scale.set(s, 1, s * .7); m.material.opacity = opacity * (1 - u); } });
  }
  /** jagged lightning ribbon from a to b (Vector3s), lasts ~0.22 s and re-jags every frame */
  bolt(a, b, width = .16, life = .24) {
    const geo = new THREE.BufferGeometry(); const segs = 14;
    const pos = new Float32Array((segs + 1) * 2 * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const idx = []; for (let i = 0; i < segs; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } geo.setIndex(idx);
    const core = new THREE.Mesh(geo, this.boltMat), glow = new THREE.Mesh(geo, this.boltGlow);
    glow.scale.set(1, 1, 1); core.renderOrder = 6; glow.renderOrder = 5;
    const g = new THREE.Group(); g.add(glow, core); this.scene.add(g);
    const A = a.clone(), B = b.clone();
    const jag = () => {
      const d = B.clone().sub(A), n = new THREE.Vector3(-d.y, d.x, 0).normalize(), L = d.length();
      for (let i = 0; i <= segs; i++) {
        const u = i / segs, off = (i === 0 || i === segs) ? 0 : (Math.random() - .5) * Math.min(1.4, L * .18) * Math.sin(u * Math.PI);
        const p = A.clone().addScaledVector(d, u).addScaledVector(n, off); const w = width * (1 - Math.abs(u - .5) * .6);
        pos.set([p.x + n.x * w, p.y + n.y * w, p.z + .6], i * 6); pos.set([p.x - n.x * w, p.y - n.y * w, p.z + .6], i * 6 + 3);
      }
      geo.attributes.position.needsUpdate = true; geo.computeBoundingSphere();
    };
    jag();
    this.items.push({ obj: g, t: 0, life, k: 0, up: (it, u) => { if ((it.k++ & 1) === 0) jag(); this.boltMat.opacity = 1; glow.material.opacity = .45 * (1 - u); core.visible = Math.random() > u * .5; }, dispose: () => geo.dispose() });
    this.flash((A.x + B.x) / 2, (A.y + B.y) / 2, 1.5, 0xfff0c0, 10, .2, 12);
    for (let i = 0; i < 8; i++) this.add.emit({ x: B.x, y: B.y, z: .4, vx: rnd(-5, 5), vy: rnd(-2, 6), life: rnd(.15, .35), size: rnd(.1, .2), c0: C.bolt0, c1: C.bolt1, g: -10 });
  }
  update(dt) {
    this.add.update(dt); this.norm.update(dt); this.shard.update(dt);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.t += dt; const u = Math.min(1, it.t / it.life);
      it.up?.(it, u);
      if (it.t >= it.life) { this.scene.remove(it.obj); it.dispose?.(); if (it.obj.material && !it.keepMat) it.obj.material.dispose?.(); this.items.splice(i, 1); }
    }
    for (const l of this.lights) { if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = l.userData.i * Math.max(0, l.userData.t / l.userData.d); } else l.intensity = 0; }
  }
  clear() {
    this.add.clear(); this.norm.clear(); this.shard.clear();
    for (const it of this.items) { this.scene.remove(it.obj); it.dispose?.(); }
    this.items.length = 0;
  }
}

/** The ice beam: a tapered, scrolling ribbon from the hands, plus frost. Shown while the ice power is held. */
export class IceBeam {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(1, 1, 24, 1); geo.translate(.5, 0, 0);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { time: { value: 0 }, op: { value: 0 } },
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform float time, op; varying vec2 vU;
        float h(float x){ return fract(sin(x*91.7)*437.5); }
        void main(){ float y = abs(vU.y - .5) * 2.; float taper = mix(.55, 1., vU.x);
          float band = smoothstep(taper, 0., y); float core = smoothstep(.35*taper, 0., y);
          float stripes = .55 + .45 * sin(vU.x * 40. - time * 26. + sin(vU.y * 9. + time * 7.) * 1.5);
          float fade = smoothstep(0., .06, vU.x) * smoothstep(1., .82, vU.x);
          vec3 c = mix(vec3(.45,.72,.88), vec3(.95,.99,1.), core);
          gl_FragColor = vec4(c, (band * .55 * stripes + core * .6) * fade * op); }`,
    });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.visible = false; this.mesh.renderOrder = 6; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  show(from, to, dt) {
    const d = to.clone().sub(from), L = d.length();
    this.mesh.visible = true; this.mesh.position.copy(from); this.mesh.position.z += .5;
    this.mesh.rotation.set(0, 0, Math.atan2(d.y, d.x));
    this.mesh.scale.set(L, .55, 1);
    this.mat.uniforms.time.value += dt; this.mat.uniforms.op.value = Math.min(1, this.mat.uniforms.op.value + dt * 8);
  }
  hide(dt) { this.mat.uniforms.op.value = Math.max(0, this.mat.uniforms.op.value - dt * 10); if (this.mat.uniforms.op.value <= 0) this.mesh.visible = false; }
}

/** Fireball visuals: a hot core billboard + trail particles + light. */
export function makeFireballMesh() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(.3, 'rgba(255,200,110,1)'); gr.addColorStop(.6, 'rgba(230,110,40,.7)'); gr.addColorStop(1, 'rgba(160,50,10,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(.9, .9, 1); s.renderOrder = 6; return s;
}
