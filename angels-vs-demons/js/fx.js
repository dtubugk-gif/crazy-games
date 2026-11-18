// Effects: particle pools (light motes, fire, smoke, feathers), shock rings, lightning, telegraph markers, beams.
// Warm, natural colours - fire and holy light are the only things that glow, and only modestly. Never neon.
import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);

function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = {
  soft: () => canvasTex(64, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }),
  smoke: () => canvasTex(64, (x, s) => {
    for (let i = 0; i < 9; i++) { const r = rnd(8, 18), cx = s / 2 + rnd(-10, 10), cy = s / 2 + rnd(-10, 10); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }
  }),
  feather: () => canvasTex(64, (x, s) => {
    x.translate(s / 2, s / 2); x.rotate(-.6);
    const g = x.createLinearGradient(0, -26, 0, 26); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e9e0cc');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, -27); x.bezierCurveTo(11, -14, 10, 14, 0, 27); x.bezierCurveTo(-9, 14, -10, -14, 0, -27); x.fill();
    x.strokeStyle = 'rgba(160,140,110,.8)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, -24); x.lineTo(0, 30); x.stroke();
    x.strokeStyle = 'rgba(190,175,150,.5)'; x.lineWidth = .8; for (let i = -18; i < 22; i += 4) { x.beginPath(); x.moveTo(0, i); x.lineTo(7, i - 5); x.moveTo(0, i); x.lineTo(-7, i - 5); x.stroke(); }
  }),
  shard: () => canvasTex(64, (x, s) => { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(s * .5, s * .08); x.lineTo(s * .72, s * .55); x.lineTo(s * .45, s * .92); x.lineTo(s * .28, s * .4); x.closePath(); x.fill(); }),
  ring: () => canvasTex(128, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, s * .3, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.72, 'rgba(255,255,255,.9)'); g.addColorStop(.86, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }),
};

// ---------------------------------------------------------------- particle pool (one draw call per pool)
const VS = `
attribute float size; attribute float alpha; attribute vec3 tint; attribute float rot;
varying float vA; varying vec3 vC; varying float vR;
uniform float uScale;
void main(){ vA = alpha; vC = tint; vR = rot;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`;
const FS = `
uniform sampler2D map; varying float vA; varying vec3 vC; varying float vR;
void main(){ vec2 p = gl_PointCoord - .5; float c = cos(vR), s = sin(vR); p = mat2(c,-s,s,c) * p + .5;
  vec4 t = texture2D(map, p); gl_FragColor = vec4(vC * t.rgb, t.a * vA); if (gl_FragColor.a < .003) discard; }`;

class Pool {
  constructor(scene, tex, n, additive) {
    this.n = n; this.i = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    this.tint = new Float32Array(n * 3); this.rot = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.uni = { map: { value: tex }, uScale: { value: 600 } };
    const m = new THREE.ShaderMaterial({ uniforms: this.uni, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 6 : 5;
    scene.add(this.pts); this.g = g;
    this.p = Array.from({ length: n }, () => ({ life: 0 }));
  }
  emit(o) {
    const p = this.p[this.i]; this.i = (this.i + 1) % this.n;
    p.x = o.x; p.y = o.y; p.z = o.z || 0; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.life = p.max = o.life || .6; p.s0 = o.size || .4; p.s1 = o.size1 ?? p.s0; p.a = o.alpha ?? 1;
    p.c0 = o.color || [1, 1, 1]; p.c1 = o.color1 || p.c0; p.grav = o.grav || 0; p.drag = o.drag ?? 1.5;
    p.r = o.rot ?? rnd(0, 6.28); p.vr = o.spin ?? 0; p.fadeIn = o.fadeIn || 0; p.wob = o.wob || 0; p.t = rnd(0, 6);
  }
  update(dt) {
    const { pos, size, alpha, tint, rot } = this;
    for (let k = 0; k < this.n; k++) {
      const p = this.p[k];
      if (p.life <= 0) { alpha[k] = 0; continue; }
      p.life -= dt; const f = 1 - Math.max(p.life, 0) / p.max; // 0 -> 1
      const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; p.vy -= p.grav * dt;
      p.t += dt; if (p.wob) { p.vx += Math.sin(p.t * 5) * p.wob * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.r += p.vr * dt;
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      size[k] = p.s0 + (p.s1 - p.s0) * f;
      const fin = p.fadeIn ? Math.min(1, f / p.fadeIn) : 1;
      alpha[k] = p.a * fin * (1 - f) * (p.life > 0 ? 1 : 0);
      tint[k * 3] = p.c0[0] + (p.c1[0] - p.c0[0]) * f; tint[k * 3 + 1] = p.c0[1] + (p.c1[1] - p.c0[1]) * f; tint[k * 3 + 2] = p.c0[2] + (p.c1[2] - p.c0[2]) * f;
      rot[k] = p.r;
    }
    for (const a of ['position', 'size', 'alpha', 'tint', 'rot']) this.g.attributes[a].needsUpdate = true;
  }
  clear() { for (const p of this.p) p.life = 0; }
}

// colour sets (linear-ish 0..1, multiplied with the white textures)
export const C = {
  gold: [1, .82, .45], goldW: [1, .95, .8], white: [1, 1, 1], cream: [1, .96, .86],
  fire: [1, .62, .22], fireHot: [1, .85, .5], ember: [.95, .32, .08], deep: [.55, .12, .03],
  smoke: [.22, .2, .2], smokeL: [.5, .47, .45], ash: [.32, .3, .3], stone: [.45, .43, .4],
  blood: [.6, .1, .08], sky: [.85, .9, 1],
};

export class FX {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.glow = new Pool(scene, TEX.soft(), 1400, true);
    this.smoke = new Pool(scene, TEX.smoke(), 500, false);
    this.feather = new Pool(scene, TEX.feather(), 220, false);
    this.shard = new Pool(scene, TEX.shard(), 260, false);
    this.pools = [this.glow, this.smoke, this.feather, this.shard];
    this.items = []; // rings, bolts, markers, beams
    this.ringTex = TEX.ring();
    this.softTex = TEX.soft();
  }
  setScale(px) { for (const p of this.pools) p.uni.uScale.value = px; }
  update(dt) {
    for (const p of this.pools) p.update(dt);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.t += dt;
      if (it.update(it, dt) === false || it.t >= it.dur) { this.scene.remove(it.obj); it.obj.geometry?.dispose(); it.obj.material?.dispose?.(); this.items.splice(i, 1); }
    }
  }
  clear() { for (const p of this.pools) p.clear(); for (const it of this.items) this.scene.remove(it.obj); this.items.length = 0; }

  // ---- bursts
  burst(x, y, kind, n = 14, power = 1) {
    const P = power;
    if (kind === 'light') {
      for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(2, 7) * P; this.glow.emit({ x, y, z: rnd(-.3, .3), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.3, .7), size: rnd(.25, .6) * P, size1: .05, color: C.goldW, color1: C.gold, drag: 3 }); }
      this.glow.emit({ x, y, z: .2, life: .22, size: 2.4 * P, size1: 3.2 * P, alpha: .7, color: C.goldW });
    } else if (kind === 'fire') {
      for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(2, 7) * P; this.glow.emit({ x, y, z: rnd(-.3, .3), vx: Math.cos(a) * s, vy: Math.sin(a) * s + 1, life: rnd(.3, .65), size: rnd(.35, .8) * P, size1: .1, color: C.fireHot, color1: C.ember, drag: 3, grav: -2 }); }
      for (let i = 0; i < n / 2; i++) this.smoke.emit({ x: x + rnd(-.3, .3), y: y + rnd(-.3, .3), vx: rnd(-1.5, 1.5), vy: rnd(.5, 2.5), life: rnd(.6, 1.2), size: rnd(.6, 1) * P, size1: 1.8 * P, alpha: .55, color: C.smoke, drag: 1.5, spin: rnd(-1, 1) });
      this.glow.emit({ x, y, z: .2, life: .2, size: 2.2 * P, size1: 3 * P, alpha: .6, color: C.fire });
    } else if (kind === 'hit') {
      for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(4, 10) * P; this.glow.emit({ x, y, z: .3, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.12, .28), size: rnd(.12, .3), size1: .02, color: C.cream, drag: 4 }); }
      this.glow.emit({ x, y, z: .4, life: .12, size: 1.3 * P, size1: 1.8 * P, alpha: .8, color: C.cream });
    } else if (kind === 'stone') {
      for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(3, 8) * P; this.shard.emit({ x, y, z: rnd(-.2, .2), vx: Math.cos(a) * s, vy: Math.sin(a) * s + 2, life: rnd(.5, .9), size: rnd(.15, .35), grav: 14, color: C.stone, spin: rnd(-12, 12), drag: .6 }); }
      for (let i = 0; i < 5; i++) this.smoke.emit({ x, y, vx: rnd(-1, 1), vy: rnd(0, 1.5), life: rnd(.5, .9), size: .7, size1: 1.6, alpha: .45, color: C.smokeL });
    } else if (kind === 'block') {
      for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(5, 11); this.glow.emit({ x, y, z: .4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.1, .25), size: rnd(.1, .22), size1: .02, color: [1, .9, .6], drag: 3, grav: 10 }); }
    }
  }
  feathers(x, y, n = 10, spread = 1) {
    for (let i = 0; i < n; i++) this.feather.emit({ x: x + rnd(-.4, .4) * spread, y: y + rnd(-.4, .4) * spread, z: rnd(-.3, .4), vx: rnd(-3, 3), vy: rnd(-1, 3), life: rnd(1.2, 2.2), size: rnd(.35, .6), grav: 1.2, drag: 2.2, spin: rnd(-3, 3), wob: 8, color: C.white, color1: C.cream });
  }
  embers(x, y, n = 10, spread = 1) {
    for (let i = 0; i < n; i++) this.glow.emit({ x: x + rnd(-.5, .5) * spread, y: y + rnd(-.5, .5) * spread, z: rnd(-.3, .4), vx: rnd(-2, 2), vy: rnd(.5, 3.5), life: rnd(.7, 1.5), size: rnd(.08, .18), size1: .02, grav: -1, drag: 1.2, wob: 6, color: C.fireHot, color1: C.ember });
  }
  puff(x, y, kind, n = 10, scale = 1) {
    // death puff: soft smoke (demons) or a bright cloud of light (angels)
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.28), s = rnd(1, 3);
      if (kind === 'light') this.glow.emit({ x: x + rnd(-.4, .4) * scale, y: y + rnd(-.6, .6) * scale, z: rnd(-.3, .3), vx: Math.cos(a) * s, vy: Math.sin(a) * s + 1.5, life: rnd(.6, 1.2), size: rnd(.5, 1) * scale, size1: .1, alpha: .6, color: C.goldW, color1: C.gold, drag: 2 });
      else this.smoke.emit({ x: x + rnd(-.4, .4) * scale, y: y + rnd(-.6, .6) * scale, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 1, life: rnd(.8, 1.5), size: rnd(.8, 1.3) * scale, size1: 2.4 * scale, alpha: .6, color: C.smoke, color1: C.ash, drag: 1.6, spin: rnd(-1, 1) });
    }
  }
  trail(x, y, kind, z = 0) {
    if (kind === 'light') this.glow.emit({ x: x + rnd(-.05, .05), y: y + rnd(-.05, .05), z, life: .28, size: .45, size1: .05, alpha: .8, color: C.goldW, color1: C.gold, drag: 0 });
    else if (kind === 'fire') { this.glow.emit({ x: x + rnd(-.1, .1), y: y + rnd(-.1, .1), z, vy: .8, life: .32, size: .7, size1: .1, alpha: .85, color: C.fireHot, color1: C.ember, drag: 0 }); if (Math.random() < .3) this.smoke.emit({ x, y, vy: .6, life: .7, size: .4, size1: 1, alpha: .35, color: C.smoke }); }
    else if (kind === 'dark') { this.glow.emit({ x: x + rnd(-.1, .1), y: y + rnd(-.1, .1), z, life: .3, size: .5, size1: .05, alpha: .7, color: C.ember, color1: C.deep, drag: 0 }); this.smoke.emit({ x, y, life: .5, size: .35, size1: .8, alpha: .3, color: C.smoke }); }
  }

  // ---- shapes
  ring(x, y, r0, r1, dur, color, alpha = .85, z = .1) {
    const m = new THREE.MeshBasicMaterial({ map: this.ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(...color) });
    const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); o.position.set(x, y, z); o.renderOrder = 7; this.scene.add(o);
    this.items.push({ obj: o, t: 0, dur, update: (it) => { const f = it.t / dur, e = 1 - (1 - f) ** 3; const s = (r0 + (r1 - r0) * e) * 2; o.scale.set(s, s, 1); m.opacity = alpha * (1 - f); } });
  }
  /** jagged bolt from a to b (pale gold-white, not cyan) */
  bolt(ax, ay, bx, by, dur = .25, width = 1) {
    const pts = []; const n = 10; let px = ax, py = ay;
    for (let i = 0; i <= n; i++) {
      const f = i / n, x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
      const j = i === 0 || i === n ? 0 : rnd(-.6, .6) * width;
      const nx = -(by - ay), ny = bx - ax, l = Math.hypot(nx, ny) || 1;
      pts.push(new THREE.Vector3(x + nx / l * j, y + ny / l * j, .3)); px = x; py = y;
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: 0xfff1c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const o = new THREE.Line(g, m); o.renderOrder = 8; this.scene.add(o);
    this.items.push({ obj: o, t: 0, dur, update: (it) => { m.opacity = (1 - it.t / dur) * (Math.random() < .3 ? .4 : 1); } });
    for (const p of pts) if (Math.random() < .5) this.glow.emit({ x: p.x, y: p.y, z: .3, life: .2, size: .6 * width, size1: .1, alpha: .6, color: C.goldW });
  }
  /** a warning marker (vertical column or circle) that fills up before something lands */
  marker(x, y, kind, dur, color = [1, .55, .2], w = 1.6, h = 14) {
    let o, m;
    if (kind === 'column') {
      const c = document.createElement('canvas'); c.width = 32; c.height = 128; const x2 = c.getContext('2d');
      const gr = x2.createLinearGradient(0, 0, 32, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x2.fillStyle = gr; x2.fillRect(0, 0, 32, 128);
      const t = new THREE.CanvasTexture(c);
      m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(...color) });
      o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, -.2);
    } else {
      m = new THREE.MeshBasicMaterial({ map: this.ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(...color) });
      o = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, w * 2), m); o.position.set(x, y, .1);
    }
    o.renderOrder = 4; this.scene.add(o);
    this.items.push({ obj: o, t: 0, dur, update: (it) => { const f = it.t / dur; m.opacity = (.15 + .45 * f) * (.75 + .25 * Math.sin(it.t * 30)); if (kind !== 'column') { const s = 1 - .3 * f; o.scale.set(s, s, 1); } } });
    return o;
  }
  /** a broad light beam (angel special / archangel) from x,y along angle */
  beam(x, y, ang, len, width, dur, color) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 64; const x2 = c.getContext('2d');
    const gr = x2.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x2.fillStyle = gr; x2.fillRect(0, 0, 16, 64);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(...color) });
    const o = new THREE.Mesh(new THREE.PlaneGeometry(len, width), m);
    o.position.set(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2, .2); o.rotation.z = ang; o.renderOrder = 8; this.scene.add(o);
    this.items.push({ obj: o, t: 0, dur, update: (it) => { const f = it.t / dur; m.opacity = Math.sin(Math.min(1, f) * Math.PI) * (it.peak ?? .9); o.scale.y = 1 + f * .4; } });
  }
  /** a halo of light rays around a point (angel reveal / special) */
  rays(x, y, n, len, dur, color) {
    for (let i = 0; i < n; i++) { this.beam(x, y, (i / n) * Math.PI * 2 + rnd(-.1, .1), len * rnd(.7, 1.1), .38, dur, color); this.items[this.items.length - 1].peak = .3; }
  }
}
