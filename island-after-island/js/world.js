// World: renderer, sky, light, water, islands (height + walk tests), decor, particles, asset loading.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const SEA_Y = -0.45;

// ------------------------------------------------------------------ assets
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
export const Assets = {
  gltf: {}, data: null,
  async load(names, onProgress) {
    let done = 0;
    // models ship as base64-wrapped GLB inside JSON (the artifact host serves .json, not .glb)
    // meshopt needs WebAssembly; if the page's security policy blocks it, use the quantized-only set
    let dir = 'models/';
    try { if (location.hash === '#lite') throw 0; await MeshoptDecoder.ready; } catch (e) { dir = 'models/q/'; console.warn('WebAssembly blocked, using fallback models'); }
    this.dir = dir;
    const fetchGlb = async (n) => {
      const j = await (await fetch(`${dir}${n}.model.json`)).json();
      const s = atob(j.b64), u = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      return loader.parseAsync(u.buffer, 'models/');
    };
    const jobs = names.map(n => fetchGlb(n).then(g => {
      g.scene.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          if (o.material) {
            o.material.side = THREE.FrontSide; if (o.material.map) o.material.map.anisotropy = 4;
            // stylised metals: keep some diffuse colour so gold/iron/brass read in a sunny scene
            if (o.material.metalnessMap && !o.material.userData.tuned) {
              o.material.metalness = 0.6; o.material.envMapIntensity = 2.4; o.material.userData.tuned = true;
            }
          }
        }
      });
      this.gltf[n] = g; onProgress?.(++done / (names.length + 1));
    }).catch(e => { console.warn('model failed', n, e); onProgress?.(++done / (names.length + 1)); }));
    jobs.push(fetch('models/islands.json').then(r => r.json()).then(d => { this.data = d; onProgress?.(++done / (names.length + 1)); }));
    await Promise.all(jobs);
  },
  clone(n) { const g = this.gltf[n]; return g ? SkeletonUtils.clone(g.scene) : new THREE.Group(); },
  anims(n) { return this.gltf[n]?.animations || []; },
  mesh(n, meshName) {
    let found = null;
    this.gltf[n]?.scene.traverse(o => { if (!found && o.isMesh && (o.name === meshName || o.parent?.name === meshName)) found = o; });
    return found;
  },
};

// ------------------------------------------------------------------ renderer + scene
export function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function makeScene(renderer) {
  const scene = new THREE.Scene();
  // soft image-based light so metals (coins, gold, iron, brass) reflect something instead of going black
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  const horizon = new THREE.Color('#f3dfbd');
  scene.fog = new THREE.Fog(horizon, 34, 95);
  scene.background = horizon.clone();
  // sky dome: warm horizon -> soft blue zenith
  const skyGeo = new THREE.SphereGeometry(160, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#7fb3d9') }, mid: { value: new THREE.Color('#c9e0e6') }, bot: { value: horizon } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h)) : mix(bot, mid, smoothstep(-0.05, 0.12, h));
      gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.renderOrder = -10; scene.add(sky);
  const hemi = new THREE.HemisphereLight('#dfefff', '#6b5a3c', 0.85); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
  sun.position.set(-9, 18, 7);
  sun.castShadow = true;
  const sm = innerWidth < 800 ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  return { scene, sun, hemi, sky };
}

// ------------------------------------------------------------------ islands
export class Islands {
  constructor(scene, data) {
    this.scene = scene; this.list = {}; this.data = data;
    for (const [name, d] of Object.entries(data)) {
      const obj = Assets.clone('island_' + name);
      obj.position.set(d.centre[0], 0, d.centre[1]);
      obj.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
      scene.add(obj);
      const walk = d.walk.map(p => [p[0] + d.centre[0], p[1] + d.centre[1]]);
      this.list[name] = { name, d, obj, walk, cx: d.centre[0], cz: d.centre[1], R: d.radius, owned: false };
    }
  }
  heightAt(x, z) {
    for (const I of Object.values(this.list)) {
      const g = I.d.grid, lx = x - I.cx, lz = z - I.cz;
      const fx = (lx - g.x0) / g.step, fz = (lz - g.z0) / g.step;
      if (fx < 0 || fz < 0 || fx >= g.n - 1 || fz >= g.n - 1) continue;
      if (lx * lx + lz * lz > (I.R * 1.5) ** 2) continue;
      const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
      const h = (a, b) => g.h[(iz + b) * g.n + ix + a];
      const v = h(0, 0) * (1 - tx) * (1 - tz) + h(1, 0) * tx * (1 - tz) + h(0, 1) * (1 - tx) * tz + h(1, 1) * tx * tz;
      if (v > -1.9) return v;
    }
    return -2;
  }
  islandAt(x, z, needOwned = false) {
    for (const I of Object.values(this.list)) {
      if (needOwned && !I.owned) continue;
      if (pointInPoly(x, z, I.walk)) return I;
    }
    return null;
  }
  /** radius of the walk polygon from the island centre in direction (dx, dz) */
  edgeDist(I, dx, dz) {
    let best = I.R;
    const n = I.walk.length;
    for (let i = 0; i < n; i++) {
      const a = I.walk[i], b = I.walk[(i + 1) % n];
      const t = raySeg(I.cx, I.cz, dx, dz, a[0], a[1], b[0], b[1]);
      if (t !== null) best = t;
    }
    return best;
  }
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}
function raySeg(ox, oz, dx, dz, ax, az, bx, bz) {
  const ex = bx - ax, ez = bz - az, den = dx * ez - dz * ex;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((ax - ox) * ez - (az - oz) * ex) / den, u = ((ax - ox) * dz - (az - oz) * dx) / den;
  return t > 0 && u >= 0 && u <= 1 ? t : null;
}

// ------------------------------------------------------------------ water
export function makeWater(scene, islands) {
  // shallow-water mask: islands' outlines drawn soft into a canvas covering the world
  const W = 512, ext = 80, cx = 2, cz = -12;
  const cv = document.createElement('canvas'); cv.width = cv.height = W;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
  const toPx = (x, z) => [(x - (cx - ext / 2)) / ext * W, (z - (cz - ext / 2)) / ext * W];
  for (const blur of [26, 12, 5]) {
    g.filter = `blur(${blur}px)`;
    g.fillStyle = blur > 20 ? 'rgba(255,255,255,0.55)' : blur > 10 ? 'rgba(255,255,255,0.6)' : '#fff';
    for (const I of Object.values(islands.list)) {
      g.beginPath();
      I.d.outline.forEach((p, i) => { const [px, pz] = toPx(p[0] * (blur > 20 ? 1.35 : blur > 10 ? 1.15 : 1.03) + I.cx, p[1] * (blur > 20 ? 1.35 : blur > 10 ? 1.15 : 1.03) + I.cz); i ? g.lineTo(px, pz) : g.moveTo(px, pz); });
      g.closePath(); g.fill();
    }
  }
  g.filter = 'none';
  const mask = new THREE.CanvasTexture(cv); mask.colorSpace = THREE.NoColorSpace;
  const geo = new THREE.PlaneGeometry(220, 220, 140, 140); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: true, depthWrite: false,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      t: { value: 0 }, mask: { value: mask }, maskRect: { value: new THREE.Vector4(cx - ext / 2, cz - ext / 2, ext, ext) },
      deep: { value: new THREE.Color('#1f6f8c') }, shallow: { value: new THREE.Color('#5cc4b8') },
      sky: { value: new THREE.Color('#d8ecf0') }, sunDir: { value: new THREE.Vector3(-0.45, 0.8, 0.4).normalize() },
    }]),
    vertexShader: `
      uniform float t; varying vec3 vW; varying vec2 vUv2; uniform vec4 maskRect;
      #include <fog_pars_vertex>
      void main(){
        vec3 p = position;
        vec4 w = modelMatrix * vec4(p,1.0);
        float wave = sin(w.x*0.35 + t*1.1)*0.05 + sin(w.z*0.42 - t*0.9)*0.04 + sin((w.x+w.z)*0.9 + t*1.7)*0.015;
        w.y += wave; vW = w.xyz;
        vUv2 = (w.xz - maskRect.xy) / maskRect.zw;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float t; uniform sampler2D mask; uniform vec3 deep; uniform vec3 shallow; uniform vec3 sky; uniform vec3 sunDir;
      varying vec3 vW; varying vec2 vUv2;
      #include <fog_pars_fragment>
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float m = 0.0;
        if (vUv2.x > 0.0 && vUv2.x < 1.0 && vUv2.y > 0.0 && vUv2.y < 1.0) m = texture2D(mask, vUv2).r;
        // normals from layered waves
        vec2 q = vW.xz;
        float n1 = noise(q*0.9 + vec2(t*0.25, t*0.1)), n2 = noise(q*2.3 - vec2(t*0.2, -t*0.3));
        vec3 N = normalize(vec3((n1-0.5)*0.35 + (n2-0.5)*0.2, 1.0, (n2-0.5)*0.35 - (n1-0.5)*0.15));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = mix(deep, shallow, smoothstep(0.05, 0.85, m));
        col = mix(col, sky, fres*0.55);
        float spec = pow(max(dot(reflect(-sunDir, N), V), 0.0), 80.0);
        col += vec3(1.0,0.95,0.85) * spec * 0.35;
        // foam band where the shallow mask is high, broken by moving noise
        float foamBand = smoothstep(0.82, 0.97, m);
        float foamN = noise(q*3.0 + vec2(t*0.6, -t*0.4)) * 0.6 + noise(q*7.0 - t*0.5) * 0.4;
        float ripple = 0.5 + 0.5*sin(m*40.0 - t*2.2);
        float foam = foamBand * smoothstep(0.35, 0.75, foamN * (0.6 + 0.6*ripple));
        col = mix(col, vec3(0.97,0.96,0.92), foam*0.85);
        float alpha = mix(0.86, 0.5, smoothstep(0.3, 0.98, m)) + foam*0.4;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
        #include <fog_fragment>
      }`,
  });
  const water = new THREE.Mesh(geo, mat);
  water.position.set(cx, SEA_Y, cz); water.renderOrder = 1;
  scene.add(water);
  // sea floor so deep water reads blue, not void
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshLambertMaterial({ color: '#2a6b74' }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, -2.4, cz); scene.add(floor);
  return water;
}

// ------------------------------------------------------------------ decor scatter (instanced)
export function scatterDecor(scene, islands, avoid) {
  const kinds = {
    home: [['Grass', 140], ['Flowers', 30], ['Pebbles', 10], ['Shell', 6]],
    forest: [['Grass', 120], ['Mushroom', 18], ['Stump', 5], ['Flowers', 10], ['Pebbles', 8]],
    highlands: [['Grass', 70], ['Pebbles', 30], ['Flowers', 10]],
    snow: [['SnowLump', 26], ['Pebbles', 10]],
    ancient: [['Grass', 110], ['Flowers', 26], ['Mushroom', 8], ['Pebbles', 10]],
  };
  const dummy = new THREE.Object3D();
  const rng = mulberry(77);
  const groups = [];
  const byKind = {};
  for (const [iname, list] of Object.entries(kinds)) {
    const I = islands.list[iname];
    for (const [kind, count] of list) {
      (byKind[kind] ||= []);
      let tries = 0, made = 0;
      while (made < count && tries++ < count * 12) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * I.R * (kind === 'Shell' || kind === 'Reeds' ? 1.05 : 0.95);
        const x = I.cx + Math.cos(a) * r, z = I.cz + Math.sin(a) * r;
        if (!pointInPoly(x, z, I.walk)) continue;
        if (avoid(x, z)) continue;
        const y = islands.heightAt(x, z);
        if (y < SEA_Y + 0.05 && kind !== 'Shell') continue;
        byKind[kind].push([x, y, z, rng() * Math.PI * 2, 0.75 + rng() * 0.6]);
        made++;
      }
    }
  }
  for (const [kind, arr] of Object.entries(byKind)) {
    const src = Assets.mesh('decor', kind);
    if (!src || !arr.length) continue;
    const mat = src.material.clone();
    src.updateWorldMatrix(true, false);
    const srcM = src.matrixWorld.clone();          // keeps the quantization scale/offset of the node
    const uS = new THREE.Vector3().setFromMatrixScale(srcM).y;
    const im = new THREE.InstancedMesh(src.geometry, mat, arr.length);
    const m4 = new THREE.Matrix4();
    im.castShadow = kind !== 'Grass' && kind !== 'Flowers'; im.receiveShadow = true;
    arr.forEach(([x, y, z, ry, s], i) => {
      dummy.position.set(x, y - 0.01, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(s); dummy.updateMatrix();
      im.setMatrixAt(i, m4.multiplyMatrices(dummy.matrix, srcM));
    });
    // gentle wind sway for grass + flowers in the vertex shader
    if (kind === 'Grass' || kind === 'Flowers' || kind === 'Reeds') {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = windTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          `#include <begin_vertex>
           float h = max(position.y, 0.0);
           vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
           float s = sin(uTime*1.7 + wp.x*0.6 + wp.z*0.4) * 0.5 + sin(uTime*3.1 + wp.x*1.3) * 0.2;
           transformed.x += s * h * 0.35; transformed.z += s * h * 0.15;`);
      };
    }
    scene.add(im); groups.push(im);
  }
  return groups;
}
export const windTime = { value: 0 };

export function mulberry(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ------------------------------------------------------------------ particles
function softTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  if (kind === 'puff') {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  } else if (kind === 'star') {
    g.translate(32, 32); g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 28; const a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
  } else { // chip: rounded square
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(14, 20, 36, 24, 8); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Particles {
  constructor(scene) {
    this.pools = {};
    for (const kind of ['puff', 'star', 'chip']) {
      const mat = new THREE.SpriteMaterial({ map: softTex(kind), transparent: true, depthWrite: false, fog: true });
      const arr = [];
      for (let i = 0; i < (kind === 'chip' ? 120 : 90); i++) {
        const s = new THREE.Sprite(mat.clone()); s.visible = false; scene.add(s);
        arr.push({ s, life: 0, max: 1, v: new THREE.Vector3(), g: 0, s0: 0.3, s1: 0.1, spin: 0, drag: 0 });
      }
      this.pools[kind] = { arr, i: 0 };
    }
  }
  emit(kind, pos, n, o = {}) {
    const P = this.pools[kind];
    for (let k = 0; k < n; k++) {
      const p = P.arr[P.i = (P.i + 1) % P.arr.length];
      p.s.visible = true; p.life = 0; p.max = (o.life ?? 0.7) * (0.75 + Math.random() * 0.5);
      p.s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * (o.spread ?? 0.3), (Math.random()) * (o.spreadY ?? 0.2), (Math.random() - 0.5) * (o.spread ?? 0.3)));
      const sp = o.speed ?? 2.5, a = Math.random() * Math.PI * 2;
      p.v.set(Math.cos(a) * sp * (0.4 + Math.random() * 0.6), (o.up ?? 2.5) * (0.6 + Math.random() * 0.6), Math.sin(a) * sp * (0.4 + Math.random() * 0.6));
      if (o.dir) p.v.add(o.dir);
      p.g = o.gravity ?? 6; p.s0 = (o.size ?? 0.25) * (0.7 + Math.random() * 0.6); p.s1 = o.endSize ?? p.s0 * 0.2;
      p.drag = o.drag ?? 1.5; p.spin = (Math.random() - 0.5) * 8;
      const cols = o.colors || ['#ffffff'];
      p.s.material.color.set(cols[Math.floor(Math.random() * cols.length)]);
      p.s.material.opacity = o.opacity ?? 1; p.op = o.opacity ?? 1;
      p.s.material.rotation = Math.random() * 6;
    }
  }
  update(dt) {
    for (const P of Object.values(this.pools)) for (const p of P.arr) {
      if (!p.s.visible) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { p.s.visible = false; continue; }
      p.v.y -= p.g * dt; p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.s.position.addScaledVector(p.v, dt);
      if (p.s.position.y < SEA_Y - 0.2) p.s.visible = false;
      const sz = p.s0 + (p.s1 - p.s0) * k;
      p.s.scale.setScalar(sz);
      p.s.material.rotation += p.spin * dt;
      p.s.material.opacity = p.op * (k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4));
    }
  }
}
