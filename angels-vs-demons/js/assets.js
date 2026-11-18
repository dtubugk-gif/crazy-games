// Asset loading (shared with the previous games): Blender-built GLB models shipped as base64 inside <name>.model.json (hosts that won't serve .glb),
// meshopt-compressed; a quantize-only fallback set in models/q/ when WebAssembly is blocked.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

export const KIT = ['isle_heaven_a', 'isle_heaven_b', 'heaven_gate', 'isle_hell_a', 'isle_hell_b', 'hell_spire', 'debris_heaven', 'debris_hell',
  'light_spear', 'light_arrow', 'fire_orb', 'soul_orb'];
// loaded at boot: both heroes (title screen + your hero + the rival) and the arena kit; each side's enemies load after the scan
export const COMMON = ['angel_hero', 'demon_hero', ...KIT];
export const SIDE_MODELS = {
  angel: ['cherub', 'angel_knight', 'valkyrie', 'angel_priestess', 'angel_lightning', 'archangel'],
  demon: ['imp', 'brute', 'pig_demon', 'demon_sorceress', 'gargoyle', 'demon_king'],
};

export const Assets = {
  gltf: {}, info: {}, missing: [], pending: {},
  async load(names, onProgress) {
    const waitFor = [...new Set(names)].filter(n => this.pending[n]).map(n => this.pending[n]);
    names = [...new Set(names)].filter(n => !this.gltf[n] && !this.missing.includes(n) && !this.pending[n]);
    if (!names.length && waitFor.length) { await Promise.all(waitFor); onProgress?.(1); return; }
    let done = 0;
    if (!names.length) { onProgress?.(1); return; }
    if (!this.dir) {
      let dir = 'models/';
      try { if (location.hash.includes('lite')) throw 0; await MeshoptDecoder.ready; } catch (e) { dir = 'models/q/'; console.warn('WebAssembly blocked, using fallback models'); }
      this.dir = dir;
    }
    const dir = this.dir;
    const fetchGlb = async (n) => {
      const r = await fetch(`${dir}${n}.model.json`);
      if (!r.ok) throw new Error('404 ' + n);
      const j = await r.json();
      const s = atob(j.b64), u = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      return loader.parseAsync(u.buffer, 'models/');
    };
    await Promise.all([...waitFor, ...names.map(n => (this.pending[n] = fetchGlb(n).then(g => {
      g.scene.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) {
            if (!m) continue;
            // keep the GLB's own sidedness: wing membranes, feathers and paint strokes are double-sided on purpose
            if (m.map) m.map.anisotropy = 4;
            if (m.metalnessMap && !m.userData.tuned) { m.metalness = Math.min(m.metalness, 0.75); m.envMapIntensity = 1.6; m.userData.tuned = true; }
          }
        }
      });
      const box = new THREE.Box3().setFromObject(g.scene);
      this.info[n] = { box, size: box.getSize(new THREE.Vector3()) };
      this.gltf[n] = g; onProgress?.(++done / names.length);
    }).catch(e => { console.warn('model failed', n, e.message || e); this.missing.push(n); onProgress?.(++done / names.length); }).finally(() => { delete this.pending[n]; })))]);
  },
  has(n) { return !!this.gltf[n]; },
  /** free GPU textures of models the next scene does not use (three.js re-uploads them if they are used again) */
  release(keep) {
    const k = new Set(keep);
    for (const [n, g] of Object.entries(this.gltf)) {
      if (k.has(n)) continue;
      g.scene.traverse(o => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) m?.[key]?.dispose(); });
    }
  },
  /** a fresh instance (skinned meshes deep-cloned) */
  clone(n) {
    const g = this.gltf[n];
    if (!g) return placeholder(n);
    return SkeletonUtils.clone(g.scene);
  },
  anims(n) { return this.gltf[n]?.animations || []; },
  size(n) { return this.info[n]?.size || new THREE.Vector3(1, 1, 1); },
  box(n) { return this.info[n]?.box || new THREE.Box3(new THREE.Vector3(-.5, 0, -.5), new THREE.Vector3(.5, 1, .5)); },
};

// dev-only stand-in so a missing file never crashes the game (the finished game ships every model)
function placeholder(n) {
  const g = new THREE.Group(); g.name = 'missing_' + n;
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00aa, wireframe: true }));
  m.position.y = .5; g.add(m); return g;
}

/** find a node by exact name inside an instance */
export function node(root, name) {
  let f = null; root.traverse(o => { if (!f && o.name === name) f = o; }); return f;
}

/** give an instance its own materials (for per-instance flashes / tints / fades) */
export function ownMaterials(root) {
  const mats = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material)) o.material = o.material.map(m => { const c = m.clone(); mats.push(c); return c; });
    else { o.material = o.material.clone(); mats.push(o.material); }
  });
  for (const m of mats) { m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null; m.userData.baseEI = m.emissiveIntensity ?? 1; }
  return mats;
}

/** Animation controller: crossfades between named clips, one-shots return to a base loop. */
export class Anim {
  constructor(root, clips, defaults = {}) {
    this.mixer = new THREE.AnimationMixer(root);
    this.clips = new Map(clips.map(c => [c.name, c]));
    this.actions = new Map();
    this.cur = null; this.curName = ''; this.base = defaults.base || 'idle';
    this.onDone = null; this.speed = 1;
    this.mixer.addEventListener('finished', (e) => {
      if (e.action !== this.cur) return;
      const cb = this.onDone; this.onDone = null;
      if (cb) cb(this.curName);
    });
  }
  has(n) { return this.clips.has(n); }
  dur(n) { return this.clips.get(n)?.duration || 0.5; }
  action(n) {
    let a = this.actions.get(n);
    if (!a) { const c = this.clips.get(n); if (!c) return null; a = this.mixer.clipAction(c); this.actions.set(n, a); }
    return a;
  }
  /** play(name, {once, fade, speed, restart, hold, done}) */
  play(n, o = {}) {
    if (!this.clips.has(n)) { if (o.done) setTimeout(() => o.done(n), 0); return false; }
    if (this.curName === n && !o.restart && this.cur?.isRunning()) { if (o.speed) this.cur.timeScale = o.speed; return true; }
    const a = this.action(n), prev = this.cur;
    a.reset();
    a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, o.once ? 1 : Infinity);
    a.clampWhenFinished = !!o.once;
    a.timeScale = o.speed ?? 1;
    a.enabled = true; a.setEffectiveWeight(1);
    a.play();
    const f = o.fade ?? 0.18;
    if (prev && prev !== a) { a.crossFadeFrom(prev, f, false); }
    else if (!prev) a.fadeIn(Math.min(f, .1));
    this.cur = a; this.curName = n; this.onDone = o.done || null;
    return true;
  }
  /** normalised progress 0..1 of the current clip */
  t() { return this.cur ? (this.cur.time / (this.cur.getClip().duration || 1)) : 0; }
  update(dt) { this.mixer.update(dt); }
}
