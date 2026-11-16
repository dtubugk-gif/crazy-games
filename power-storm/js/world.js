// World: renderer, sky, sun, water, and building a level's scenery + collision from levels.js data.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Assets, Anim } from './assets.js';

export const WATER_Y = -1.25;
export const ICE_TOP = -0.55;

export function makeRenderer(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const r = new THREE.WebGLRenderer({ canvas, antialias: dpr < 1.6, powerPreference: 'high-performance' });
  r.setPixelRatio(dpr);
  r.setSize(innerWidth, innerHeight, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.02;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

export function makeScene(renderer) {
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  scene.fog = new THREE.Fog(0xd9e3e0, 40, 150);

  // sky dome: three-stop gradient + painted clouds layer (warm daylight, no neon)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, low: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, mid, hor, low, sunCol; uniform vec3 sunDir; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = mix(hor, mid, smoothstep(-0.02, 0.22, h)); c = mix(c, top, smoothstep(0.2, 0.75, h));
        float s = max(dot(normalize(vP), normalize(sunDir)), 0.); c += sunCol * (pow(s, 600.) * 1.6 + pow(s, 12.) * 0.18);
        c = mix(c, low, smoothstep(0.0, -0.28, h)); gl_FragColor = vec4(c, 1.); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat);
  sky.renderOrder = -10; scene.add(sky);

  const clouds = new THREE.Group(); scene.add(clouds);
  const ctex = cloudTexture();
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ctex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
    const s = 40 + Math.random() * 40; m.scale.set(s, s * 0.42, 1);
    m.position.set(-150 + i * 42 + Math.random() * 20, 22 + Math.random() * 26, -180 - Math.random() * 60);
    m.userData.v = 0.4 + Math.random() * 0.6; m.material.map = ctex; clouds.add(m);
  }

  const hemi = new THREE.HemisphereLight(0xdcecff, 0x8a6a48, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d6, 3.0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 1024);
  const sc = sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 13; sc.bottom = -9; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.45); fill.position.set(-6, 4, 12); scene.add(fill);

  return {
    scene, sky, skyMat, clouds, hemi, sun, fill,
    setSky(s) {
      skyMat.uniforms.top.value.setHex(s.top); skyMat.uniforms.mid.value.setHex(s.mid); skyMat.uniforms.hor.value.setHex(s.hor);
      if (s.low != null) skyMat.uniforms.low.value.setHex(s.low); else skyMat.uniforms.low.value.setHex(s.hor).multiplyScalar(.92);
      const d = new THREE.Vector3(...s.sun).normalize(); skyMat.uniforms.sunDir.value.copy(d); skyMat.uniforms.sunCol.value.setHex(s.sunCol);
      this.sunDir = d; sun.color.setHex(s.sunCol); sun.intensity = s.sunI;
      hemi.color.setHex(s.hemi[0]); hemi.groundColor.setHex(s.hemi[1]); hemi.intensity = s.hemi[2];
      scene.fog.color.setHex(s.fog); scene.fog.near = s.fogD[0]; scene.fog.far = s.fogD[1];
      for (const c of clouds.children) c.material.color.setHex(s.hor).lerp(new THREE.Color(0xffffff), 0.55);
    },
    follow(cam, dt) {
      sky.position.copy(cam.position);
      const d = this.sunDir || new THREE.Vector3(0.5, 0.8, 0.4);
      const fx = cam.position.x, fy = Math.max(0, cam.position.y - 3);
      sun.target.position.set(fx, fy, 0); sun.position.set(fx + d.x * 40, fy + d.y * 40, d.z * 40);
      clouds.position.x = cam.position.x * 0.85;
      for (const c of clouds.children) { c.position.x += c.userData.v * dt; if (c.position.x > 200) c.position.x -= 380; }
    },
  };
}

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 220;
  const g = c.getContext('2d');
  const blob = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.6, `rgba(255,255,255,${a * 0.7})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  for (let i = 0; i < 26; i++) { const x = 70 + Math.random() * 370, y = 120 - Math.random() * 50 + Math.abs(x - 256) * 0.12; blob(x, y, 30 + Math.random() * 55, 0.55); }
  // flat-ish base with a soft shade underneath
  const sh = g.createLinearGradient(0, 90, 0, 200); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(120,130,150,.25)');
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = sh; g.fillRect(0, 0, 512, 220);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- water
export function makeWater(x0, x1) {
  const geo = new THREE.PlaneGeometry(x1 - x0 + 60, 26, 1, 1); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: true, depthWrite: false,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, deep: { value: new THREE.Color(0x173f46) }, shallow: { value: new THREE.Color(0x3d7a78) }, sky: { value: new THREE.Color(0xbcd6dc) } }]),
    vertexShader: `varying vec3 vW; varying vec3 vV; #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vV = cameraPosition - w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; #include <fog_vertex> }`.replace(/#include <(\w+)>/g, '\n#include <$1>\n'),
    fragmentShader: `uniform float time; uniform vec3 deep, shallow, sky; varying vec3 vW; varying vec3 vV; #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ vec2 p = vW.xz; float w = n(p*0.9 + vec2(time*0.35, time*0.12)) * 0.6 + n(p*2.3 - vec2(time*0.5, -time*0.2)) * 0.4;
        float fres = pow(1. - clamp(normalize(vV).y, 0., 1.), 2.2);
        vec3 c = mix(deep, shallow, w * 0.6); c = mix(c, sky, fres * 0.55 + 0.08);
        float glint = smoothstep(0.78, 0.96, n(p*3.1 + vec2(time*0.8, time*0.3)) * w); c += vec3(1.,.96,.86) * glint * 0.45;
        gl_FragColor = vec4(c, 0.93); #include <fog_fragment> }`.replace(/#include <(\w+)>/g, '\n#include <$1>\n'),
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set((x0 + x1) / 2, WATER_Y, 1); m.receiveShadow = false; m.renderOrder = 1;
  return m;
}

// ---------------------------------------------------------------- level build
const KIT = { street: 'ground_street', roof: 'roof_block', quay: 'canal_quay', factory: 'factory_floor', tower: 'tower_top' };
const THEME_KIT = { town: 'street', roof: 'roof', canal: 'quay', factory: 'factory', tower: 'tower', prize: 'street' };
const PLAT = { wood: ['plat_wood', 3.0], stone: ['plat_stone', 2.0], awning: ['plat_awning', 2.5], metal: ['plat_metal', 3.0] };

function put(group, name, x, y, z, o = {}) {
  const m = Assets.clone(name);
  m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry;
  if (o.s) m.scale.setScalar(o.s);
  if (o.sx) m.scale.x *= o.sx;
  if (o.noShadow) m.traverse(c => { if (c.isMesh) c.castShadow = false; });
  if (o.noRecv) m.traverse(c => { if (c.isMesh) c.receiveShadow = false; });
  group.add(m); return m;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** Build scenery + static collision for a level. Returns {group, solids, surfaces, water, waterCells, mixers, decoMixers, killY} */
export function buildLevel(L) {
  const group = new THREE.Group(); group.name = 'level' + L.id;
  const solids = [];   // {x0,x1,y0,y1, oneWay?, kind, ref?}
  const surfaces = []; // curved walkable tops {x0,x1,f(x)}
  const waterSpans = [];
  const anims = [], belts = [];
  const R = mulberry(L.id * 977);
  const kitDef = THEME_KIT[L.theme];
  let minY = 0;

  for (const p of L.pieces) {
    if (p.t === 'ground') {
      const kit = p.kit || kitDef, model = KIT[kit];
      minY = Math.min(minY, p.y);
      solids.push({ x0: p.x0, x1: p.x1, y0: p.y - 40, y1: p.y, kind: 'ground' });
      if (kit === 'tower') { put(group, model, 0, p.y, 0); continue; }
      const w = 8;
      for (let x = p.x0; x < p.x1 - 0.01; x += w) {
        put(group, model, x + w / 2, p.y, 0);
        // raised floors: stack copies under it so the wall reaches the floor below (no floating slab)
        if (kit === 'factory' || kit === 'street' || kit === 'quay') for (let y = p.y - 4; y > -4; y -= 4) put(group, model, x + w / 2, y, 0, { noShadow: true });
      }
      if (kit === 'street') { put(group, 'ground_end_L', p.x0, p.y, 0); put(group, 'ground_end_R', p.x1, p.y, 0); }
      if (kit === 'roof') { put(group, 'roof_block_end_L', p.x0, p.y, 0); put(group, 'roof_block_end_R', p.x1, p.y, 0); }
      if (kit === 'quay' && Assets.has('canal_quay_end_L')) { put(group, 'canal_quay_end_L', p.x0, p.y, 0); put(group, 'canal_quay_end_R', p.x1, p.y, 0); }
      if (kit === 'factory' && Assets.has('factory_floor_end_L')) for (let y = p.y; y > -4; y -= 4) { put(group, 'factory_floor_end_L', p.x0, y, 0); put(group, 'factory_floor_end_R', p.x1, y, 0); }
    } else if (p.t === 'water') {
      waterSpans.push(p);
    } else if (p.t === 'plat') {
      const [m, w] = PLAT[p.k];
      put(group, m, p.x, p.y, 0);
      solids.push({ x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - 0.3, y1: p.y, oneWay: true, kind: p.k === 'awning' ? 'bounce' : 'plat' });
    } else if (p.t === 'crate') {
      put(group, 'crate', p.x, p.y, 0, { ry: (R() - .5) * 0.2 });
      const s = Assets.size('crate'); const hw = Math.max(0.38, s.x / 2) - 0.02, h = s.y > 0.2 ? s.y : 0.8;
      solids.push({ x0: p.x - hw, x1: p.x + hw, y0: p.y, y1: p.y + h, kind: 'box' });
    } else if (p.t === 'barrel') {
      put(group, 'barrel', p.x, p.y, 0, { ry: R() * 6 });
      const s = Assets.size('barrel'); const hw = Math.max(0.3, s.x / 2) - 0.03, h = s.y > 0.2 ? s.y : 0.9;
      solids.push({ x0: p.x - hw, x1: p.x + hw, y0: p.y, y1: p.y + h, kind: 'box' });
    } else if (p.t === 'bridge') {
      const cx = (p.x0 + p.x1) / 2;
      put(group, 'bridge_arch', cx, 0, 0);
      // walkable crown from the Blender manifest: z(x) = 0.5 * (1 + cos(pi * x / 4)), peak 1.0 m, flat at the ends
      surfaces.push({ x0: p.x0, x1: p.x1, f: x => 0.5 * (1 + Math.cos(Math.PI * clampX((x - cx) / 4) )) });
    } else if (p.t === 'conveyor') {
      // origin = belt surface; set flush with the floor so it reads as a belt sunk into the grating
      const m = put(group, 'conveyor', p.x, 0.0, 0);
      const clips = Assets.anims('conveyor');
      if (clips.length) { const a = new Anim(m, clips); a.play('run', { speed: p.dir < 0 ? -1 : 1 }); anims.push(a); }
      m.traverse(o => { if (o.isMesh && /belt/i.test(o.name) && o.material.map) { o.material = o.material.clone(); o.material.map = o.material.map.clone(); o.material.map.wrapS = THREE.RepeatWrapping; o.material.map.needsUpdate = true; belts.push({ map: o.material.map, dir: p.dir }); } });
    } else if (p.t === 'deco') {
      const m = put(group, p.m, p.x, p.y ?? (p.m === 'boat' ? WATER_Y : (groundAt(L, p.x) ?? 0)), p.z, { ry: p.ry ?? (R() - .5) * 0.3, s: p.s });
      const clips = Assets.anims(p.m);
      if (clips.length) { const a = new Anim(m, clips); const n = clips.find(c => /sway|spin|wave|idle/.test(c.name)) || clips[0]; a.play(n.name); a.mixer.setTime(R() * 3); anims.push(a); }
    }
  }

  // water + freezable cells (4 m)
  let water = null; const waterCells = [];
  if (L.theme === 'canal') {
    water = makeWater(L.len[0], L.len[1]); group.add(water);
    for (const w of waterSpans) for (let x = w.x0; x < w.x1 - 0.01; x += 4) waterCells.push({ x0: x, x1: x + 4, frozen: false, mesh: null });
  }

  backdrop(group, L, R, anims);

  // the boss tower's clock: hands as nodes
  let hands = null; group.traverse(o => { if (o.name === 'hand_hour') (hands ||= {}).h = o; if (o.name === 'hand_min') (hands ||= {}).m = o; });
  return { group, solids, surfaces, water, waterCells, waterSpans, anims, belts, hands, killY: minY - (L.theme === 'roof' ? 11 : 7) };
}

const clampX = u => Math.max(-1, Math.min(1, u));

export function groundAt(L, x) {
  let best = null;
  for (const p of L.pieces) if (p.t === 'ground' && x >= p.x0 && x <= p.x1) best = best == null ? p.y : Math.max(best, p.y);
  return best;
}

function backdrop(group, L, R, anims) {
  const [a, b] = L.len, span = b - a;
  const addAnim = (m, name) => { const clips = Assets.anims(name); if (clips.length) { const an = new Anim(m, clips); an.play(clips[0].name); anims.push(an); } };
  const facades = ['facade_house_a', 'facade_house_b', 'facade_shop', 'facade_tall'];
  const row = (z, y, list, gapMin = 0.2, gapMax = 1.2, scale = 1) => {
    let x = a - 14;
    while (x < b + 14) {
      const n = list[Math.floor(R() * list.length)], w = Assets.size(n).x * scale || 7;
      put(group, n, x + w / 2, y, z, { s: scale, noShadow: z < -14 });
      x += w + gapMin + R() * (gapMax - gapMin);
    }
  };
  const far = (y = -4, z = -78, s = 1.6) => { const w = (Assets.size('skyline_far').x || 80) * s; for (let x = a - 40; x < b + 60; x += w * 0.98) put(group, 'skyline_far', x, y, z, { s, noShadow: true, noRecv: true }); };
  const tower = (x, y, z, s = 1) => put(group, 'clocktower_bg', x, y, z, { s, noShadow: true, noRecv: true });

  if (L.theme === 'town' || L.theme === 'prize') {
    row(-4.3, 0, facades, 0.1, 0.9);
    row(-15, 2.4, facades, 0.4, 2.5, 1.05);
    far(-2, -70, 1.6); tower(a + span * 0.72, 1, -95, 1.2);
  } else if (L.theme === 'roof') {
    // other roofs around you + facades below
    let x = a - 10;
    while (x < b + 10) { const y = -1 - R() * 2.5; put(group, 'roof_slope', x, y, -7.5 - R() * 3, { ry: (R() - .5) * .2, noShadow: true }); x += 7 + R() * 4; }
    row(-16, -12, facades, 0.2, 1.5, 1.1);
    far(-12, -70, 1.6); tower(a + span * 0.6, -10, -88, 1.25);
  } else if (L.theme === 'canal') {
    const w = Assets.size('canal_far_wall').x || 8;
    for (let x = a - 8; x < b + 8; x += w) put(group, 'canal_far_wall', x + w / 2, 0, -6.0);
    row(-8.8, 0.3, facades, 0.0, 0.8);
    far(-2, -70, 1.6); tower(a + span * 0.8, 1, -92, 1.2);
  } else if (L.theme === 'factory') {
    const w = Assets.size('factory_wall_bg').x || 8;
    for (let x = a - 8; x < b + 8; x += w) { const m = put(group, 'factory_wall_bg', x + w / 2, 0, -3.2); addAnim(m, 'factory_wall_bg'); }
    far(-3, -72, 1.6); tower(a + span * 0.9, 0, -80, 1.3);
  } else if (L.theme === 'tower') {
    far(-34, -90, 2.4);
  }
}

/** an ice slab over a frozen water cell (rises a little above the water so it's a step, not a pit) */
export function iceSlab(cell) {
  const m = Assets.clone('ice_slab');
  const s = Assets.size('ice_slab');
  const thick = ICE_TOP - (WATER_Y - 0.25);
  m.scale.set(4.05 / (s.x || 4), thick / (s.y || 0.35), 1);
  m.position.set((cell.x0 + cell.x1) / 2, ICE_TOP, 0.3);
  return m;
}
