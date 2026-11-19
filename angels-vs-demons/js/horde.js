// The 300 of "להשיג את הפרס", all at once: the whole horde fills the sky from the first second.
// 300 animated 3D models would stop a phone, so every enemy kind is rendered once (4 wing-beat frames, from the real
// Blender/Sketchfab model, in the arena's own light) into a sprite atlas, and the horde is ONE instanced mesh of those
// sprites, deep in the sky behind the fight. The ones in front fight as full 3D enemies; when one falls, the next one
// dives out of the horde, grows into a real fighter and joins in. The counter starts at 300 and every one of them counts.
import * as THREE from 'three';
import { makeModel, animName, DISPLAY } from './actors.js?v=13';
import { ARENA } from './world.js?v=13';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const FRAMES = 4, CELL = 192, TURN = 1.02;
const ROLES = ['small', 'charger', 'diver', 'caster', 'heavy', 'rival'];

/** render every enemy kind of this side into one atlas (rows = kinds, columns = wing-beat frames) */
export function bakeHorde(renderer, foe) {
  const W = CELL * FRAMES, H = CELL * ROLES.length;
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff3dd, 0x6a2a1a, 1.25));
  const L = (c, i, p) => { const l = new THREE.DirectionalLight(c, i); l.position.set(...p); scene.add(l); };
  L(0xfff0d6, 2.6, [-12, 16, 14]); L(0xff7a3a, 1.1, [14, -6, 8]); L(0xfff0dc, 2.4, [-4, 10, -14]); L(0xffe2c8, .9, [6, 3, 16]);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100); cam.position.set(0, 0, 20);
  const oldClear = renderer.getClearColor(new THREE.Color()), oldAlpha = renderer.getClearAlpha(), oldAuto = renderer.autoClear, oldTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.autoClear = false; rt.scissorTest = false; renderer.clear();
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
      if (clip) { m.anim.mixer.setTime(dur * f / FRAMES); }
      m.root.updateMatrixWorld(true);
      const x = f * CELL, y = (ROLES.length - 1 - row) * CELL;
      rt.viewport.set(x, y, CELL, CELL); rt.scissor.set(x, y, CELL, CELL); rt.scissorTest = true;
      renderer.setRenderTarget(rt); renderer.render(scene, cam);
    }
    scene.remove(m.root); m.anim.mixer.stopAllAction();
  });
  rt.scissorTest = false; rt.viewport.set(0, 0, W, H); rt.scissor.set(0, 0, W, H);
  renderer.setRenderTarget(oldTarget); renderer.setClearColor(oldClear, oldAlpha); renderer.autoClear = oldAuto;
  return { rt, size };
}

export class Horde {
  /** roles: the 300 kinds in order (index = the order they dive in) */
  constructor(g, roles, atlas) {
    this.g = g; this.t = 0; this.atlas = atlas;
    const N = roles.length, foeSide = -g.side.homeDir; this.foeSide = foeSide;
    this.m = roles.map((role, i) => {
      const z = -9 - Math.pow(Math.random(), .8) * 22; // far behind the fight: a sky full of them that never hides the real fighters
      const vis = Math.tan(THREE.MathUtils.degToRad(19)) * (15.5 - z) * 2.05; // half width of the view at that depth
      const hx = foeSide * rnd(1.5, vis - 1.5), hy = rnd(1.5 - (-z) * .12, 9.5 + (-z) * .42);
      return { i, role, row: ROLES.indexOf(role), hx, hy, hz: z, x: foeSide * rnd(vis + 4, vis + 16), y: hy + rnd(-2, 2), z, ph: Math.random() * 6.28, state: 'in', delay: rnd(0, 1.6), side: foeSide };
    });
    // one instanced mesh: plane per enemy, frame + flip + haze per instance
    const geo = new THREE.PlaneGeometry(1, 1);
    this.aCell = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); // row, phase, flip, haze
    geo.setAttribute('aCell', this.aCell);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas.rt.texture }, uTime: { value: 0 }, uHaze: { value: new THREE.Color(g.foe.key === 'angel' ? 0xdccbb4 : 0xc9937a) } },
      vertexShader: `attribute vec4 aCell; uniform float uTime; varying vec2 vUv; varying float vHaze;
        void main() {
          float frame = floor(mod(uTime * 9.0 + aCell.y * 4.0, ${FRAMES}.0));
          vec2 u = uv; if (aCell.z > .5) u.x = 1.0 - u.x;
          vUv = vec2((u.x + frame) / ${FRAMES}.0, (u.y + ${ROLES.length - 1}.0 - aCell.x) / ${ROLES.length}.0);
          vHaze = aCell.w;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uHaze; varying vec2 vUv; varying float vHaze;
        void main() {
          vec4 c = texture2D(map, vUv);
          if (c.a < .42) discard;
          vec3 col = c.rgb / max(c.a, .001);
          col = mix(col, uHaze, vHaze);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, N); this.mesh.frustumCulled = false; this.mesh.renderOrder = -1;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.aCell.setUsage(THREE.DynamicDrawUsage);
    g.scene.add(this.mesh);
    this._o = new THREE.Object3D();
    this.next = 0; // index of the next one to dive in
    this.update(0);
  }
  get left() { return this.m.filter(m => m.state !== 'gone' && m.state !== 'dive').length; }
  /** the next one dives out of the horde; cb(x, y, role) when it reaches the fight */
  dive(cb) {
    const m = this.m[this.next]; if (!m) return false;
    this.next++;
    const P = this.g.player, side = m.side;
    m.tx = clamp(side * rnd(7, 11.5), ARENA.x0 + 1, ARENA.x1 - 1); m.ty = clamp(m.y, ARENA.y0 + 1, ARENA.y1 - 1);
    if (P && Math.abs(m.tx - P.x) < 3) m.tx = clamp(P.x + side * 4, ARENA.x0 + 1, ARENA.x1 - 1);
    m.fx = m.x; m.fy = m.y; m.fz = m.z; m.dt = 0; m.state = 'dive'; m.cb = cb;
    return true;
  }
  /** after 100: about half of the rest fly around to the other side - you are surrounded */
  surround() {
    for (const m of this.m) if ((m.state === 'idle' || m.state === 'in') && m.i >= this.next && Math.random() < .45) {
      m.side = -m.side; m.hx = -m.hx; m.state = 'idle';
    }
  }
  update(dt) {
    const g = this.g, P = g.player, o = this._o, a = this.aCell.array; this.t += dt;
    this.mesh.material.uniforms.uTime.value = this.t;
    for (const m of this.m) {
      const k = m.i;
      if (m.state === 'gone') { o.scale.setScalar(0); o.position.set(0, -50, 0); o.updateMatrix(); this.mesh.setMatrixAt(k, o.matrix); continue; }
      if (m.state === 'in') { m.delay -= dt; if (m.delay <= 0) { const f = Math.min(1, dt * 1.6); m.x += (m.hx - m.x) * f; m.y += (m.hy - m.y) * f; if (Math.abs(m.hx - m.x) < .3) m.state = 'idle'; } }
      else if (m.state === 'idle') {
        const tx = m.hx + Math.sin(this.t * .5 + m.ph) * 1.4, ty = m.hy + Math.sin(this.t * .9 + m.ph * 1.7) * .6;
        const f = Math.min(1, dt * .9); m.x += (tx - m.x) * f; m.y += (ty - m.y) * f;
      } else if (m.state === 'dive') {
        m.dt += dt; const u = Math.min(1, m.dt / 1.0), e = u * u * (3 - 2 * u);
        m.x = m.fx + (m.tx - m.fx) * e; m.y = m.fy + (m.ty - m.fy) * e + Math.sin(u * Math.PI) * 1.2; m.z = m.fz * (1 - e);
        if (u >= 1) { m.state = 'gone'; const cb = m.cb; m.cb = null; cb?.(m.tx, m.ty, m.role); }
      }
      const s = this.atlas.size[m.role] || 2, faceRight = (P ? P.x : 0) > m.x;
      o.position.set(m.x, m.y + Math.sin(this.t * 2.2 + m.ph) * .12, m.z); o.scale.set(s, s, 1); o.rotation.set(0, 0, 0); o.updateMatrix();
      this.mesh.setMatrixAt(k, o.matrix);
      a[k * 4] = m.row; a[k * 4 + 1] = m.ph; a[k * 4 + 2] = faceRight ? 0 : 1; a[k * 4 + 3] = .22 + clamp((-m.z - 8) / 24, 0, 1) * .45;
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.aCell.needsUpdate = true;
  }
  remove() { this.g.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
