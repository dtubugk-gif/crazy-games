// The 300 of "להשיג את הפרס", ALL attacking at once.
// 300 animated 3D models would stop a phone, so every enemy kind is rendered once (8 wing-beat frames, from the real
// Blender/Sketchfab model, in the arena's own light) into a sprite atlas, and the whole army is ONE instanced mesh.
// Nobody waits: the army circles you in the sky from the first second and every soldier takes part -
//  - they throw light / fire at you from the sky (a ring on the ground of the fight shows where it lands),
//  - they swoop down into the fight, strike and fly back up (while they are down you can hit them),
//  - the ones nearest the fight come down for good as full 3D fighters,
//  - your special blast also reaches the soldiers in the sky around you.
// The counter starts at 300 and every one of them counts.
import * as THREE from 'three';
import { makeModel, animName, DISPLAY } from './actors.js?v=14';
import { ARENA } from './world.js?v=14';
import { ROLE_STATS } from './roster.js?v=14';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const FRAMES = 8, CELL = 256, TURN = 1.02;
const ROLES = ['small', 'charger', 'diver', 'caster', 'heavy', 'rival'];
const SKY_HP = .55;            // a soldier of the army is lighter than a front-line fighter
const PLANE = 1.5;             // closer than this to the fight plane, a swooping soldier can be hit
const SWOOP_DMG = { small: 5, charger: 7, diver: 6, caster: 5, heavy: 8 };
const VOLLEY_DMG = 7;

/** render every enemy kind of this side into one atlas (rows = kinds, columns = wing-beat frames) */
export function bakeHorde(renderer, foe) {
  const W = CELL * FRAMES, H = CELL * ROLES.length;
  const rt = new THREE.WebGLRenderTarget(W, H, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  // each frame is drawn with 4x anti-aliasing into a small target, then copied into its cell (an MSAA atlas would cost a phone ~50 MB)
  const tmp = new THREE.WebGLRenderTarget(CELL, CELL, { samples: 4 }); tmp.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const copyMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tmp.texture } }, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv); }',
  });
  const copy = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat); copy.frustumCulled = false;
  const copyScene = new THREE.Scene(); copyScene.add(copy); const copyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff3dd, 0x6a2a1a, 1.25));
  const L = (c, i, p) => { const l = new THREE.DirectionalLight(c, i); l.position.set(...p); scene.add(l); };
  L(0xfff0d6, 2.6, [-12, 16, 14]); L(0xff7a3a, 1.1, [14, -6, 8]); L(0xfff0dc, 2.4, [-4, 10, -14]); L(0xffe2c8, .9, [6, 3, 16]);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100); cam.position.set(0, 0, 20);
  const oldClear = renderer.getClearColor(new THREE.Color()), oldAlpha = renderer.getClearAlpha(), oldAuto = renderer.autoClear, oldTarget = renderer.getRenderTarget();
  renderer.autoClear = false; renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(rt); renderer.clear();
  const size = {};
  ROLES.forEach((role, row) => {
    const info = foe.roles[role]; if (!info) return;
    const m = makeModel(info.model, DISPLAY[role] || 1);
    scene.add(m.root); m.turn.rotation.y = TURN; // facing +x, the same 3/4 turn as the fighters
    m.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m.root), s = box.getSize(new THREE.Vector3());
    const half = Math.max(s.x, s.y) * .62; size[role] = half * 2;
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix();
    const clip = animName(m.anim, 'fly'); const dur = clip ? m.anim.dur(clip) : 1;
    if (clip) m.anim.play(clip);
    for (let f = 0; f < FRAMES; f++) {
      if (clip) m.anim.mixer.setTime(dur * f / FRAMES);
      m.root.updateMatrixWorld(true);
      renderer.setRenderTarget(tmp); renderer.clear(); renderer.render(scene, cam);
      const x = f * CELL, y = (ROLES.length - 1 - row) * CELL;
      rt.viewport.set(x, y, CELL, CELL); rt.scissor.set(x, y, CELL, CELL); rt.scissorTest = true;
      renderer.setRenderTarget(rt); renderer.render(copyScene, copyCam);
    }
    scene.remove(m.root); m.anim.mixer.stopAllAction();
  });
  rt.scissorTest = false; rt.viewport.set(0, 0, W, H); rt.scissor.set(0, 0, W, H);
  renderer.setRenderTarget(oldTarget); renderer.setClearColor(oldClear, oldAlpha); renderer.autoClear = oldAuto;
  tmp.dispose(); copyMat.dispose(); copy.geometry.dispose();
  return { rt, size };
}

/** one soldier of the army while it is down in the fight: your attacks treat it like any other enemy */
class Soldier {
  constructor(h, m) {
    this.h = h; this.m = m; this.swarm = true; this.role = m.role; this.def = h.g.foe; this.stats = ROLE_STATS[m.role];
    this.r = this.stats.radius * (DISPLAY[m.role] || 1) * .8;
    this.x = m.x; this.y = m.y; this.hp = m.hp; this.maxHp = m.maxHp;
    this.dead = false; this.inv = 0; this.stun = 0; this.kx = 0; this.ky = 0; this.shield = 0; this.spawning = 0;
    this.act = null; this.hitCount = 0; this.state = 'swoop'; this.face = 1; this.flash = 0; this.leave = false;
  }
  setFlash(t = .09) { this.flash = t; }
  doAct() { return 0; }
  play() { return 0; }
  update(dt) { this.inv = Math.max(0, this.inv - dt); this.stun = Math.max(0, this.stun - dt); this.flash -= dt; return !this.dead && !this.leave; }
  remove() { }
}

let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.22, 'rgba(255,255,255,.95)'); gr.addColorStop(.45, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  _glow = new THREE.CanvasTexture(c); _glow.colorSpace = THREE.SRGBColorSpace; return _glow;
}

/** the warning ring where a throw will land: dark rim + bright line, so it reads on the pale sky and on fire alike */
const _rings = {};
function ringTex(angel) {
  const key = angel ? 'a' : 'd'; if (_rings[key]) return _rings[key];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.lineWidth = 13; x.strokeStyle = angel ? 'rgba(70,40,5,.55)' : 'rgba(45,6,0,.6)'; x.beginPath(); x.arc(64, 64, 55, 0, 7); x.stroke();
  x.lineWidth = 6; x.strokeStyle = angel ? 'rgba(255,226,140,1)' : 'rgba(255,120,40,1)'; x.beginPath(); x.arc(64, 64, 55, 0, 7); x.stroke();
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 52); gr.addColorStop(0, angel ? 'rgba(255,236,170,.35)' : 'rgba(255,110,30,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill();
  x.fillStyle = angel ? 'rgba(255,240,190,.95)' : 'rgba(255,150,70,.95)'; x.beginPath(); x.arc(64, 64, 6, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (_rings[key] = t);
}

export class Horde {
  /** roles: the 300 kinds in order (a lower number comes down to fight first) */
  constructor(g, roles, atlas) {
    this.g = g; this.t = 0; this.atlas = atlas;
    const N = roles.length, foeSide = -g.side.homeDir; this.foeSide = foeSide;
    this.angelFoe = g.foe.key === 'angel';
    this.closed = 0;             // 0 = they keep to their side of the sky, 1 = all around you (after 100)
    this.cdV = 2.2; this.cdS = 3; // first throw / first swoop
    this.vols = []; this.volPool = []; this.ringPool = [];
    this.m = roles.map((role, i) => {
      const st = ROLE_STATS[role], depth = Math.pow(Math.random(), .75);
      const z = -8 - depth * 20; // well behind the fight, so the fighters in front always read
      const own = Math.random() < .8; // most of them start on their own side of the sky
      const ang = own ? (foeSide > 0 ? 0 : Math.PI) + rnd(-1.5, 1.5) : rnd(0, Math.PI * 2);
      const maxHp = Math.round(st.hp * SKY_HP * (1 + i / N * .6));
      return {
        i, role, row: ROLES.indexOf(role), hp: maxHp, maxHp, z, z0: z,
        ang, rad: 5.6 + depth * 8 + rnd(0, 4), w: rnd(.05, .16) * (Math.random() < .5 ? -1 : 1), ph: Math.random() * 6.28,
        x: foeSide * rnd(32, 48), y: rnd(6, 20), state: 'in', delay: rnd(0, 2.4), flash: 0, glow: 0, alpha: 1, tilt: 0, vx: 0, vy: 0,
      };
    });
    // one instanced mesh: a plane per soldier; per instance: atlas row, phase, flip, haze + hit flash, cast glow, fade
    const geo = new THREE.PlaneGeometry(1, 1);
    this.aCell = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
    this.aFx = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
    geo.setAttribute('aCell', this.aCell); geo.setAttribute('aFx', this.aFx);
    const glowCol = this.angelFoe ? 0xffd987 : 0xff6a24;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas.rt.texture }, uTime: { value: 0 }, uHaze: { value: new THREE.Color(this.angelFoe ? 0xdccbb4 : 0xc9937a) }, uGlow: { value: new THREE.Color(glowCol) } },
      vertexShader: `attribute vec4 aCell; attribute vec4 aFx; uniform float uTime; varying vec2 vUv; varying float vHaze; varying vec3 vFx;
        void main() {
          float frame = floor(mod(uTime * 14.0 + aCell.y * 8.0, ${FRAMES}.0));
          vec2 u = uv; if (aCell.z > .5) u.x = 1.0 - u.x;
          vUv = vec2((u.x + frame) / ${FRAMES}.0, (u.y + ${ROLES.length - 1}.0 - aCell.x) / ${ROLES.length}.0);
          vHaze = aCell.w; vFx = aFx.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uHaze; uniform vec3 uGlow; varying vec2 vUv; varying float vHaze; varying vec3 vFx;
        void main() {
          vec4 c = texture2D(map, vUv);
          if (c.a < .42) discard;
          if (vFx.z < .999 && fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) > vFx.z) discard;
          vec3 col = c.rgb / max(c.a, .001);
          col = mix(col, uHaze, vHaze);
          col = mix(col, uGlow, vFx.y * .5) + uGlow * vFx.y * .35;
          col = mix(col, vec3(1., .94, .84), vFx.x * .85);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, N); this.mesh.frustumCulled = false; this.mesh.renderOrder = -1;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.aCell.setUsage(THREE.DynamicDrawUsage); this.aFx.setUsage(THREE.DynamicDrawUsage);
    g.scene.add(this.mesh);
    this._o = new THREE.Object3D(); this._h = { x: 0, y: 0 };
    this.update(0);
  }
  /** soldiers still up in the sky (not counting the ones on their way down to fight) */
  get left() { let n = 0; for (const m of this.m) if (m.state !== 'gone' && m.state !== 'fall' && m.state !== 'dive') n++; return n; }
  get diving() { let n = 0; for (const m of this.m) if (m.state === 'dive') n++; return n; }
  get swooping() { let n = 0; for (const m of this.m) if (m.state === 'swoop') n++; return n; }

  // ------------------------------------------------------------ where things are
  /** the camera's distance to the fight plane and half the visible width there */
  view() { const c = this.g.camera, D = c.position.z; return { c: c.position, D, hw: Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) * D * c.aspect }; }
  /** a soldier's home in the sky: a ring around you, wider than tall; out = world position at its depth */
  home(m, v, out) {
    const P = this.g.player, px = P ? P.x : 0, py = P ? P.y : 5.5;
    const a = m.ang + this.t * m.w * this.closed + Math.sin(this.t * .35 + m.ph) * .3;
    const s = Math.sin(a), rr = m.rad * (1 - this.closed * .12);
    const sx = px * .8 + Math.cos(a) * rr * 1.35; // the space right around you stays clear
    const sy = clamp(5.6 + (py - 5.5) * .35 + s * rr * (s > 0 ? .6 : .28), ARENA.y0 - .2, ARENA.y1 + 4);
    const k = (v.D - m.z) / v.D; // un-project: at depth z this point lands on screen exactly at (sx, sy)
    out.x = v.c.x + (sx - v.c.x) * k; out.y = v.c.y + (sy - v.c.y) * k;
  }
  /** where a soldier at depth appears on the fight plane (screen position) */
  proj(m, v) { const k = v.D / (v.D - m.z); return { x: v.c.x + (m.x - v.c.x) * k, y: v.c.y + (m.y - v.c.y) * k }; }
  onScreen(m, v, pad = .9) { const p = this.proj(m, v); return Math.abs(p.x - v.c.x) < v.hw * pad && p.y > ARENA.y0 - .5 && p.y < ARENA.y1 + 1.2; }
  pickIdle(test, tries = 16) {
    const N = this.m.length;
    for (let k = 0; k < tries; k++) { const m = this.m[Math.floor(Math.random() * N)]; if (m.state === 'idle' && test(m)) return m; }
    return null;
  }

  // ------------------------------------------------------------ orders
  /** the lowest-numbered soldier in the sky comes down to fight for good; cb(x, y, role, hpFrac) when it lands */
  dive(cb) {
    let m = null; for (const o of this.m) if (o.state === 'idle' || o.state === 'cast') { m = o; break; }
    if (!m) return false;
    const P = this.g.player, side = Math.sign(m.x - (P ? P.x : 0)) || this.foeSide;
    m.tx = clamp((P ? P.x : 0) + side * rnd(5, 8), ARENA.x0 + 1, ARENA.x1 - 1); m.ty = clamp(m.y, ARENA.y0 + 1, ARENA.y1 - 1);
    m.fx = m.x; m.fy = m.y; m.fz = m.z; m.dt = 0; m.state = 'dive'; m.cb = cb; m.glow = 0;
    return true;
  }
  /** after 100: the whole army closes in around you and starts to circle */
  surround() {
    this.closed = 1;
    for (const m of this.m) if (m.state !== 'gone' && m.state !== 'fall') { if (Math.random() < .5) m.ang = rnd(0, Math.PI * 2); m.z = m.z0 * .82; }
  }
  /** a soldier swoops down at you, strikes and flies back up */
  swoop(m) {
    const P = this.g.player, side = Math.sign(m.x - P.x) || 1;
    m.state = 'swoop'; m.sw = 'in'; m.swT = 0; m.fx = m.x; m.fy = m.y; m.fz = m.z; m.hitDone = false; m.glow = 0;
    m.tx = clamp(P.x + side * rnd(1.4, 2.4), ARENA.x0 + .3, ARENA.x1 - .3); m.ty = clamp(P.y + rnd(-.9, .9), ARENA.y0 + .3, ARENA.y1 - .3);
    m.vx = 0; m.vy = 0;
    this.g.sfx('dash', m.tx, m.ty, { vol: .32, gap: .15 });
  }
  /** a soldier throws light / fire at where you are going */
  fire(m) {
    const g = this.g, P = g.player; if (!P || P.dead) return;
    const tx = clamp(P.x + P.vx * .18 + rnd(-.5, .5), ARENA.x0, ARENA.x1), ty = clamp(P.y + P.vy * .18 + rnd(-.4, .4), ARENA.y0, ARENA.y1);
    const ft = rnd(1.05, 1.35);
    const sp = this.volPool.pop() || new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(this.angelFoe ? 0xffe6a8 : 0xff7a2e), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.scale.setScalar(1.35); sp.renderOrder = 5; sp.visible = true; g.scene.add(sp);
    const ring = this.ringPool.pop() || new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(this.angelFoe), transparent: true, depthWrite: false, toneMapped: false }));
    ring.position.set(tx, ty, .05); ring.renderOrder = 4; ring.scale.setScalar(.01); g.scene.add(ring);
    this.vols.push({ x0: m.x, y0: m.y, z0: m.z, tx, ty, t: 0, ft, arc: rnd(.6, 2.2), sp, ring });
  }
  clearVolleys() { for (const v of this.vols) this.endVolley(v); this.vols.length = 0; }
  endVolley(v) { this.g.scene.remove(v.sp); this.volPool.push(v.sp); this.g.scene.remove(v.ring); this.ringPool.push(v.ring); }
  /** after you pick a power: everyone backs off for a moment */
  breather() {
    this.clearVolleys(); this.cdV = 1.6; this.cdS = 2.2;
    for (const m of this.m) if (m.state === 'swoop') this.leavePlane(m, 'out');
  }
  /** your special blast reaches the soldiers in the sky around you (the nearer, the sooner) */
  blast(x, y, R, dmg) {
    const v = this.view(), g = this.g;
    for (const m of this.m) {
      if ((m.state !== 'idle' && m.state !== 'cast' && m.state !== 'in') || m.role === 'rival' || m.z < -13) continue;
      const p = this.proj(m, v), d = Math.hypot(p.x - x, p.y - y);
      if (d > R) continue;
      m.flash = .15; m.hp -= dmg * .5;
      if (m.hp <= 0) { m.state = 'doomed'; g.after(d / R * .4 + rnd(0, .08), () => this.killSky(m)); }
    }
  }
  /** a soldier in the sky falls: it counts like any other */
  killSky(m) {
    if (m.state !== 'doomed') return;
    const v = this.view(), p = this.proj(m, v), s = new Soldier(this, m); s.x = p.x; s.y = p.y;
    this.g.killEnemy(s); this.fallFrom(m, 0, 0);
  }
  fallFrom(m, kx, ky) { m.state = 'fall'; m.vx = kx * .4 + rnd(-1, 1); m.vy = 1.5 + ky * .2; m.flash = .12; m.glow = 0; m.px = null; }
  leavePlane(m, next) {
    if (m.px) { m.hp = m.px.hp; m.px.leave = true; m.px = null; }
    if (next === 'out') { m.sw = 'out'; m.swT = 0; m.fx = m.x; m.fy = m.y; m.fz = m.z; }
  }

  // ------------------------------------------------------------ every frame
  /** who attacks now: throws and swoops from all over the sky, more as you get further */
  director(dt) {
    const g = this.g, P = g.player; if (!P || P.dead) return;
    const p = (g.prizeKilled || 0) / 300, v = this.view();
    this.cdV -= dt; this.cdS -= dt;
    if (this.cdV <= 0) {
      this.cdV = rnd(.6, 1.4) / (.75 + p * 1.05 + this.closed * .25);
      const m = this.pickIdle(o => o.z > -22 && this.onScreen(o, v));
      if (m) { m.state = 'cast'; m.castT = .5; }
    }
    const maxSw = 2 + Math.floor(p * 4) + this.closed;
    if (this.cdS <= 0) {
      this.cdS = rnd(.6, 1.4) / (.5 + p * .65 + this.closed * .2);
      if (this.swooping < maxSw) { const m = this.pickIdle(o => o.role !== 'rival' && o.z > -17 && this.onScreen(o, v, 1.05)); if (m) this.swoop(m); }
    }
  }
  updateSwoop(m, dt) {
    const g = this.g, P = g.player;
    m.swT += dt;
    if (m.sw === 'in') { // dive out of the sky toward you
      const u = Math.min(1, m.swT / .8), e = u * u * (2.2 - 1.2 * u);
      m.x = m.fx + (m.tx - m.fx) * e; m.y = m.fy + (m.ty - m.fy) * e + Math.sin(u * Math.PI) * 1.4; m.z = m.fz * (1 - e);
      m.tilt = clamp((m.tx - m.fx) * -.04, -.5, .5) * (1 - u);
      if (u >= 1) { m.sw = 'strike'; m.swT = 0; m.z = 0; }
    } else if (m.sw === 'strike') { // in the fight: close in, then lunge once
      const px = m.px;
      if (px && px.stun > 0) { m.vx *= .85; m.vy *= .85; }
      else if (P && !P.dead) {
        const dx = P.x - m.x, dy = P.y - m.y, d = Math.hypot(dx, dy) || 1, sp = m.swT < .45 ? 5.5 : 14;
        m.vx += (dx / d * sp - m.vx) * Math.min(1, dt * (m.swT < .45 ? 4 : 9)); m.vy += (dy / d * sp - m.vy) * Math.min(1, dt * (m.swT < .45 ? 4 : 9));
        if (!m.hitDone && m.swT > .45 && P.inv <= 0 && d < P.r + (px ? px.r : .6) + .25) { m.hitDone = true; g.hurtPlayer(SWOOP_DMG[m.role] || 5, m.x, m.y); m.swT = 1.2; }
      }
      if (px) { m.vx += px.kx; m.vy += px.ky; px.kx = 0; px.ky = 0; }
      m.x = clamp(m.x + m.vx * dt, ARENA.x0 - 1, ARENA.x1 + 1); m.y = clamp(m.y + m.vy * dt, ARENA.y0, ARENA.y1);
      m.tilt = clamp(-m.vx * .03, -.35, .35);
      if (m.swT > 1.25) this.leavePlane(m, 'out');
    } else { // back up to its place in the sky
      const u = Math.min(1, m.swT / .9), e = u * u * (3 - 2 * u), h = this._h;
      this.home(m, this.view(), h);
      m.x = m.fx + (h.x - m.fx) * e; m.y = m.fy + (h.y - m.fy) * e + Math.sin(u * Math.PI) * 1.2; m.z = m.fz + (m.z0 * (1 - this.closed * .18) - m.fz) * e;
      m.tilt *= .9;
      if (u >= 1) { m.state = 'idle'; m.z = m.z0 * (1 - this.closed * .18); }
    }
    // down in the fight plane you can hit it
    const near = m.state === 'swoop' && m.z > -PLANE;
    if (near && !m.px) { m.px = new Soldier(this, m); g.enemies.push(m.px); }
    if (m.px) {
      m.px.x = m.x; m.px.y = m.y; m.px.face = P && P.x > m.x ? 1 : -1;
      if (m.px.flash > 0) m.flash = m.px.flash;
      if (!near) this.leavePlane(m);
    }
  }
  update(dt) {
    const g = this.g, P = g.player, o = this._o, a = this.aCell.array, f4 = this.aFx.array, v = this.view(), h = this._h; this.t += dt;
    this.mesh.material.uniforms.uTime.value = this.t;
    if (g.state === 'battle' && !g.prizeDone) this.director(dt);
    // the throws in the air
    for (let i = this.vols.length - 1; i >= 0; i--) {
      const q = this.vols[i]; q.t += dt; const u = Math.min(1, q.t / q.ft);
      const x = q.x0 + (q.tx - q.x0) * u, y = q.y0 + (q.ty - q.y0) * u + Math.sin(u * Math.PI) * q.arc, z = q.z0 * (1 - u);
      q.sp.position.set(x, y, z);
      // the ring closes in to exactly the danger zone as the throw comes down
      const R = (P ? P.r : .8) + .8, rs = 2 * R * (1 + .45 * (1 - Math.min(1, u * 1.25)));
      q.ring.scale.set(rs, rs, 1); q.ring.material.opacity = Math.min(1, .35 + u * .9) * (u > .75 ? .75 + .25 * Math.sin(q.t * 40) : 1); q.ring.rotation.z = q.t * .8;
      g.fx.glow.emit({ x, y, z, life: .3, size: .55, size1: .05, alpha: .8, color: this.angelFoe ? [1, .9, .62] : [1, .55, .2], color1: this.angelFoe ? [1, .7, .3] : [.8, .2, .05], drag: 0 });
      if (u >= 1) {
        g.fx.burst(q.tx, q.ty, this.angelFoe ? 'light' : 'fire', 12, .8);
        g.sfx(this.angelFoe ? 'orb_hit' : 'fireball_hit', q.tx, q.ty, { vol: .55, gap: .12 });
        if (P && !P.dead && Math.hypot(P.x - q.tx, P.y - q.ty) < P.r + .8) g.hurtPlayer(VOLLEY_DMG, q.tx, q.ty);
        this.endVolley(q); this.vols.splice(i, 1);
      }
    }
    for (const m of this.m) {
      const k = m.i;
      if (m.state === 'gone') { o.position.set(0, -60, 0); o.scale.setScalar(0); o.rotation.set(0, 0, 0); o.updateMatrix(); this.mesh.setMatrixAt(k, o.matrix); continue; }
      if (m.state === 'in') {
        m.delay -= dt;
        if (m.delay <= 0) { this.home(m, v, h); const f = Math.min(1, dt * 1.7); m.x += (h.x - m.x) * f; m.y += (h.y - m.y) * f; if (Math.abs(h.x - m.x) < .5) m.state = 'idle'; }
      } else if (m.state === 'idle' || m.state === 'cast' || m.state === 'doomed') {
        this.home(m, v, h); const f = Math.min(1, dt * 1.3); m.x += (h.x - m.x) * f; m.y += (h.y - m.y) * f;
        m.tilt *= .92;
        if (m.state === 'cast') { // glows, then throws
          m.castT -= dt; m.glow = Math.min(1, m.glow + dt * 3.5);
          if (m.castT <= 0) { this.fire(m); m.state = 'idle'; }
        } else m.glow = Math.max(0, m.glow - dt * 4);
      } else if (m.state === 'swoop') {
        this.updateSwoop(m, dt);
        if (m.px && m.px.dead) this.fallFrom(m, m.px.kx, m.px.ky);
      } else if (m.state === 'dive') { // comes down to fight for good
        m.dt += dt; const u = Math.min(1, m.dt / 1.0), e = u * u * (3 - 2 * u);
        m.x = m.fx + (m.tx - m.fx) * e; m.y = m.fy + (m.ty - m.fy) * e + Math.sin(u * Math.PI) * 1.2; m.z = m.fz * (1 - e);
        if (u >= 1) { m.state = 'gone'; const cb = m.cb; m.cb = null; cb?.(m.tx, m.ty, m.role, m.hp / m.maxHp); }
      } else if (m.state === 'fall') { // falls out of the sky and fades
        m.vy -= 9 * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.tilt += dt * 3.2 * (m.vx >= 0 ? -1 : 1); m.alpha -= dt * 1.15;
        if (m.alpha <= 0) { m.state = 'gone'; continue; }
      }
      if (m.flash > 0) m.flash -= dt;
      const s = this.atlas.size[m.role] || 2, faceRight = (P ? P.x : 0) > m.x;
      const bob = m.state === 'swoop' || m.state === 'fall' ? 0 : Math.sin(this.t * 2.2 + m.ph) * .14;
      o.position.set(m.x, m.y + bob, m.z); o.scale.set(s, s, 1); o.rotation.set(0, 0, m.tilt); o.updateMatrix();
      this.mesh.setMatrixAt(k, o.matrix);
      a[k * 4] = m.row; a[k * 4 + 1] = m.ph; a[k * 4 + 2] = faceRight ? 0 : 1;
      a[k * 4 + 3] = clamp((-m.z - 1) / 7, 0, 1) * (.16 + clamp((-m.z - 8) / 20, 0, 1) * .4); // none down in the fight, more the deeper
      f4[k * 4] = m.flash > 0 ? 1 : 0; f4[k * 4 + 1] = m.glow * (.75 + .25 * Math.sin(this.t * 24)); f4[k * 4 + 2] = clamp(m.alpha, 0, 1);
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.aCell.needsUpdate = true; this.aFx.needsUpdate = true;
  }
  remove() {
    this.clearVolleys();
    for (const m of this.m) if (m.px) { m.px.leave = true; m.px = null; }
    this.g.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose();
  }
}
