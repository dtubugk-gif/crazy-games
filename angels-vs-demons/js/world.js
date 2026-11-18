// World: renderer, the split sky (golden heaven on the left, ember-red underworld on the right),
// painted cloud layers, the sea of clouds below, floating Blender islands at several depths for parallax.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Assets } from './assets.js?v=8';

const rnd = (a, b) => a + Math.random() * (b - a);
export const ARENA = { x0: -12.5, x1: 12.5, y0: 1.4, y1: 8.8 }; // y1 stays under the top HUD

export function makeRenderer(canvas) {
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || /Android [4-8]\b/.test(navigator.userAgent);
  const r = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio || 1, lowEnd ? 1.25 : 1.75);
  r.setPixelRatio(dpr);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.userData = { lowEnd };
  return r;
}

const SKY_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }`;
const SKY_FS = `
varying vec3 vW; uniform float uBias; uniform float uTime;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec3 d = normalize(vW);
  float side = smoothstep(-.55, .55, d.x + uBias * .25);           // 0 = heaven, 1 = underworld
  float up = clamp(d.y * .5 + .5, 0., 1.);
  vec3 heavenTop = vec3(.1,.27,.66), heavenMid = vec3(.32,.52,.82), heavenLow = vec3(.92,.76,.52);
  vec3 hellTop = vec3(.1,.04,.06), hellMid = vec3(.42,.11,.06), hellLow = vec3(.92,.36,.1);
  vec3 hv = mix(heavenLow, heavenMid, smoothstep(.35,.55,up)); hv = mix(hv, heavenTop, smoothstep(.55,.92,up));
  vec3 hl = mix(hellLow, hellMid, smoothstep(.3,.52,up)); hl = mix(hl, hellTop, smoothstep(.52,.9,up));
  vec3 col = mix(hv, hl, side);
  // sun (heaven) and a smoky glow (underworld)
  vec3 sunDir = normalize(vec3(-.55,.42,-.72));
  float s = max(dot(d, sunDir), 0.);
  col += vec3(1.,.9,.7) * (pow(s, 600.) * 2.2 + pow(s, 40.) * .22) * (1.-side);
  float smoke = n(vec2(d.x*6. + uTime*.01, d.y*5.)) * .6 + n(vec2(d.x*14., d.y*12. - uTime*.02)) * .4;
  col = mix(col, col * vec3(.55,.45,.45), side * smoke * .45 * smoothstep(.45,.8,up));
  float wisps = n(vec2(d.x*4. - uTime*.006, d.y*9.)) ;
  col = mix(col, col + vec3(.12,.1,.08), (1.-side) * smoothstep(.55,.85,wisps) * smoothstep(.5,.75,up) * .6);
  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function cloudTexture(seed, dark) {
  // a painted cumulus: many soft puffs in a long heap with a flat base, lit from above, shadowed underneath, blurred
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  x.filter = 'blur(3px)';
  const puffs = [];
  for (let i = 0; i < 70; i++) {
    const u = R(), cx = 50 + u * 412, hump = Math.sin(u * Math.PI);
    const r = 14 + R() * 34 * (.45 + hump * .8), cy = 190 - r * .6 - hump * R() * 70;
    puffs.push({ cx, cy, r });
  }
  puffs.sort((p, q) => q.cy - p.cy);
  for (const p of puffs) {
    const g = x.createRadialGradient(p.cx - p.r * .3, p.cy - p.r * .45, p.r * .1, p.cx, p.cy, p.r);
    if (dark) { g.addColorStop(0, 'rgba(118,72,62,.95)'); g.addColorStop(.7, 'rgba(70,40,38,.9)'); g.addColorStop(1, 'rgba(50,28,28,0)'); }
    else { g.addColorStop(0, 'rgba(250,248,244,1)'); g.addColorStop(.65, 'rgba(214,216,226,.95)'); g.addColorStop(1, 'rgba(190,196,212,0)'); }
    x.fillStyle = g; x.beginPath(); x.arc(p.cx, p.cy, p.r, 0, 7); x.fill();
  }
  // flat, shaded base
  x.globalCompositeOperation = 'destination-out'; x.filter = 'blur(8px)';
  x.fillStyle = 'rgba(0,0,0,1)'; x.fillRect(0, 200, 512, 60);
  x.globalCompositeOperation = 'source-atop'; x.filter = 'none';
  const sh = x.createLinearGradient(0, 90, 0, 205); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, dark ? 'rgba(25,8,8,.55)' : 'rgba(150,140,150,.45)');
  x.fillStyle = sh; x.fillRect(0, 0, 512, 256);
  if (!dark) { const warm = x.createLinearGradient(0, 0, 0, 120); warm.addColorStop(0, 'rgba(255,236,190,.35)'); warm.addColorStop(1, 'rgba(255,236,190,0)'); x.fillStyle = warm; x.fillRect(0, 0, 512, 256); }
  else { const glow = x.createLinearGradient(0, 150, 0, 210); glow.addColorStop(0, 'rgba(255,110,40,0)'); glow.addColorStop(1, 'rgba(255,110,40,.35)'); x.fillStyle = glow; x.fillRect(0, 0, 512, 256); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function seaTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const cx = Math.random() * 512, cy = Math.random() * 512, r = 18 + Math.random() * 60;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); const v = 200 + Math.random() * 55;
    g.addColorStop(0, `rgba(${v},${v},${v},.8)`); g.addColorStop(1, 'rgba(255,255,255,0)');
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { x.fillStyle = g; x.save(); x.translate(ox, oy); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.restore(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeScene(renderer) {
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = .55;

  const skyU = { uBias: { value: 0 }, uTime: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false }));
  sky.renderOrder = -10; scene.add(sky);

  // lights: warm sun from heaven (upper left), ember bounce from below right, cool sky fill
  const hemi = new THREE.HemisphereLight(0xfff3dd, 0x6a2a1a, 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.6); sun.position.set(-12, 16, 14); scene.add(sun);
  const ember = new THREE.DirectionalLight(0xff7a3a, 1.1); ember.position.set(14, -6, 8); scene.add(ember);
  const rim = new THREE.DirectionalLight(0xfff0dc, 2.4); rim.position.set(-4, 10, -14); scene.add(rim); // strong back/top rim so dark demons separate from the sky
  const fill = new THREE.DirectionalLight(0xffe2c8, .7); fill.position.set(6, 3, 16); scene.add(fill);

  // sea of clouds far below, white on the heaven side, smoke over lava on the underworld side
  const seaTex = seaTexture(); seaTex.repeat.set(6, 3);
  const seaMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: seaTex }, uTime: { value: 0 } }, transparent: false,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D map; uniform float uTime; varying vec2 vUv; varying vec3 vW;
      void main(){ float a = texture2D(map, vUv*vec2(6.,3.) + vec2(uTime*.004, 0.)).r; float b = texture2D(map, vUv*vec2(11.,5.) - vec2(uTime*.007, uTime*.002)).r;
        float c = a*.6 + b*.4; float side = smoothstep(-25., 25., vW.x);
        vec3 heaven = mix(vec3(.62,.66,.74), vec3(.86,.86,.88), c);
        vec3 lava = vec3(1.,.42,.1) * smoothstep(.55,.25,c) * 1.4;
        vec3 hell = mix(vec3(.2,.1,.09), vec3(.42,.24,.2), c) + lava * .55;
        vec3 col = mix(heaven, hell, side);
        float far = smoothstep(20., 160., -vW.z); col = mix(col, mix(vec3(.78,.74,.7), vec3(.8,.32,.12), side), far*.65);
        gl_FragColor = vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 260), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -9, -100); scene.add(sea);

  const env = { scene, sky, skyU, sea, seaMat, sun, hemi, ember, clouds: [], props: [], motes: [], t: 0 };
  return env;
}

/** clouds + islands; call after the kit models are loaded */
export function buildArena(env) {
  const { scene } = env;
  for (const o of env.clouds) scene.remove(o.mesh); env.clouds.length = 0;
  for (const o of env.props) scene.remove(o.obj); env.props.length = 0;

  // painted cloud billboards at several depths, heaven side light, underworld side smoky
  const texL = [cloudTexture(11, false), cloudTexture(29, false), cloudTexture(47, false)];
  const texD = [cloudTexture(13, true), cloudTexture(31, true), cloudTexture(53, true)];
  const layers = [{ z: -110, n: 10, s: 52, y: [-10, 4], spd: .25, o: .75 }, { z: -62, n: 9, s: 30, y: [-9, 0], spd: .45, o: .7 }, { z: -30, n: 7, s: 18, y: [-8, -3], spd: .7, o: .65 }];
  for (const L of layers) for (let i = 0; i < L.n; i++) {
    const x = -L.s * L.n * .45 + (i + rnd(-.3, .3)) * L.s * .9;
    const dark = x > rnd(-6, 6);
    const m = new THREE.MeshBasicMaterial({ map: (dark ? texD : texL)[i % 3], transparent: true, depthWrite: false, fog: false, opacity: L.o });
    if (dark) m.opacity *= .7;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L.s, L.s * .5), m);
    mesh.position.set(x, rnd(L.y[0], L.y[1]), L.z + rnd(-6, 6)); mesh.renderOrder = -5;
    scene.add(mesh); env.clouds.push({ mesh, spd: L.spd * rnd(.7, 1.3), span: L.s * L.n * .9 });
  }

  const place = (name, x, y, z, s = 1, ry = 0, bob = .3) => {
    if (!Assets.has(name)) return;
    const o = Assets.clone(name); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; scene.add(o);
    env.props.push({ obj: o, y0: y, bob, ph: rnd(0, 6), spin: rnd(-.03, .03) });
  };
  // far backdrops
  place('heaven_gate', -78, -6, -150, 1.8, .25, 0);
  place('hell_spire', 82, -10, -150, 1.8, -.25, 0);
  // the spire's lava falls flow (tiling texture on its own material)
  env.lava = [];
  for (const pr of env.props) pr.obj.traverse(o => { if (o.isMesh && /lava/i.test(o.material?.name || '')) { const m = o.material; for (const t of [m.map, m.emissiveMap]) if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; } env.lava.push(m); } });
  // mid islands
  // placed by projection so they frame the fight band (screen y ~1..9.5) from below and above instead of sitting behind it
  place('isle_heaven_a', -40, -13.5, -60, 1.4, .3); place('isle_heaven_b', -30, 27, -48, 1.1, -.4); place('isle_heaven_a', -72, -24, -100, 1.6, 1.2); place('isle_heaven_b', -18, -6.5, -32, .9, 2.3); place('isle_heaven_b', -58, 40, -90, 1.3, .9);
  place('isle_hell_a', 42, -14, -62, 1.4, -.3); place('isle_hell_b', 32, 27, -48, 1.1, .5); place('isle_hell_a', 72, -24, -100, 1.6, -1.1); place('isle_hell_b', 18, -6.5, -32, .9, -2.1); place('isle_hell_b', 60, 40, -90, 1.3, -.8);
  // small debris floating near the fight (parallax)
  for (let i = 0; i < 6; i++) { const yy = () => Math.random() < .5 ? rnd(-8, -4) : rnd(16, 20); place('debris_heaven', rnd(-34, -6), yy(), rnd(-18, -9), rnd(.8, 1.4), rnd(0, 6), .5); place('debris_hell', rnd(6, 34), yy(), rnd(-18, -9), rnd(.8, 1.4), rnd(0, 6), .5); }

  // god-rays on the heaven side
  const rayTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,245,215,.55)'); g.addColorStop(1, 'rgba(255,245,215,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256); const h = x.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = h; x.fillRect(0, 0, 64, 256); return new THREE.CanvasTexture(c); })();
  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .18 });
    const r = new THREE.Mesh(new THREE.PlaneGeometry(rnd(4, 8), 60), m); r.position.set(-30 + i * 6 + rnd(-2, 2), 8, -40 - i * 4); r.rotation.z = -.42;
    r.renderOrder = -4; scene.add(r); env.props.push({ obj: r, y0: r.position.y, bob: 0, ph: rnd(0, 6), ray: m });
  }
}

export function updateWorld(env, dt, camX) {
  env.t += dt;
  env.skyU.uTime.value = env.t; env.seaMat.uniforms.uTime.value = env.t;
  for (const m of env.lava || []) for (const t of [m.map, m.emissiveMap]) if (t) t.offset.y -= dt * .35;
  for (const c of env.clouds) { c.mesh.position.x -= c.spd * dt; if (c.mesh.position.x < -c.span * .55) c.mesh.position.x += c.span * 1.1; }
  for (const p of env.props) {
    if (p.ray) { p.ray.opacity = .12 + .07 * Math.sin(env.t * .4 + p.ph); continue; }
    p.obj.position.y = p.y0 + Math.sin(env.t * .5 + p.ph) * p.bob; p.obj.rotation.y += p.spin * dt;
  }
}
