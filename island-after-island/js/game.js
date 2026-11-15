// אי אחרי אי - main game
import * as THREE from 'three';
import { Assets, makeRenderer, makeScene, Islands, makeWater, scatterDecor, windTime, Particles, mulberry, pointInPoly, SEA_Y } from './world.js';
import { Audio } from './audio.js';
import * as D from './data.js';

const $ = (id) => document.getElementById(id);
const V3 = THREE.Vector3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const upright = matchMedia('(orientation: portrait) and (pointer: coarse)');   // phone held upright -> rotate screen, game waits

// ===================================================================== core
const canvas = $('c');
const renderer = makeRenderer(canvas);
const { scene, sun } = makeScene(renderer);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 320);
const audio = new Audio();
const clock = new THREE.Clock();
let islands, fx, water;
const SAVE_KEY = 'iAchareiI.save.v1';

const S = {
  coins: 0, inv: { wood: 0, stone: 0, berry: 0, ironOre: 0, goldOre: 0, ironBar: 0, crystal: 0 },
  level: 1, xp: 0, perks: {}, owned: { home: true }, built: {}, chests: {}, beacon: false, tier: 0, hearts: 3,
  time: 0, tut: 0, goal: 0, won: false, madeBar: false, broken: 0, vol: { music: 0.8, sfx: 0.8, muted: false },
};
let mode = 'title';          // title | play | menu | faint | win
let pendingPerks = 0;
const perk = (id) => S.perks[id] || 0;
const maxHearts = () => 3 + perk('heart');

let resetting = false;
function resetGame() {   // wipe the save and restart; block the save that visibilitychange would do on unload
  resetting = true;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
  location.reload();
}
function save() {
  if (resetting) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && s.inv) { Object.assign(S, s); S.inv = Object.assign({}, S.inv, s.inv); return true; }
  } catch (e) { /* ignore */ }
  return false;
}

// ===================================================================== player
const player = {
  obj: null, mixer: null, act: {}, cur: null, pos: new V3(), vel: new V3(), face: 0, speed: 0,
  swingT: -1, swingHit: false, swingCd: 0, inv: 0, hurtT: 0, stepPhase: 0, target: null, moved: 0,
};
function initPlayer() {
  player.obj = Assets.clone('hero');
  scene.add(player.obj);
  player.mixer = new THREE.AnimationMixer(player.obj);
  for (const clip of Assets.anims('hero')) player.act[clip.name] = player.mixer.clipAction(clip);
  for (const n of ['Swing', 'Hurt', 'Faint']) { const a = player.act[n]; if (a) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } }
  playAnim('Idle', 0);
  setTool();
  const sp = spawnPoint();
  player.pos.copy(sp); player.obj.position.copy(sp);
}
function spawnPoint() {
  const I = islands.list.home, f = D.FIXED.home.spawn;
  const x = I.cx + f[0], z = I.cz + f[1];
  return new V3(x, islands.heightAt(x, z), z);
}
function setTool() {
  const names = ['Pick_Stone', 'Pick_Iron', 'Pick_Gold'];
  player.obj.traverse(o => { const i = names.indexOf(o.name); if (i >= 0) o.visible = i === S.tier; });
}
function playAnim(name, fade = 0.2, speed = 1) {
  const a = player.act[name]; if (!a) return;
  a.timeScale = speed;
  if (player.cur === name) return;
  const prev = player.act[player.cur];
  a.reset().play();
  if (prev) a.crossFadeFrom(prev, fade, false); else a.setEffectiveWeight(1);
  player.cur = name;
}

// ===================================================================== world objects
const resources = [];   // {kind, def, obj, mixer, act, pos, hp, island, state, berries, regrowAt, pop}
const items = [];
const slimes = [];
const signs = [];
const chests = [];
const bridges = {};     // key "a>b": {a, b, A, B, obj, mixer, built}
const structures = {};  // workbench/furnace/tent/windmill/beacon
let beacon = null;
const colliders = [];   // static circles {x, z, r}
const rng = mulberry(1234);

function placeFixed(model, iname, spec, opts = {}) {
  const I = islands.list[iname];
  const x = I.cx + spec[0], z = I.cz + spec[1];
  const obj = Assets.clone(model);
  obj.position.set(x, islands.heightAt(x, z) - 0.02, z);
  obj.rotation.y = spec[2] || 0;
  scene.add(obj);
  const mixer = Assets.anims(model).length ? new THREE.AnimationMixer(obj) : null;
  const act = {};
  if (mixer) for (const c of Assets.anims(model)) act[c.name] = mixer.clipAction(c);
  if (opts.r) colliders.push({ x, z, r: opts.r, id: model });
  return { obj, mixer, act, pos: obj.position.clone(), island: iname };
}

function buildWorld() {
  islands = new Islands(scene, Assets.data);
  for (const k of Object.keys(S.owned)) if (islands.list[k]) islands.list[k].owned = true;
  water = makeWater(scene, islands);
  fx = new Particles(scene);
  // fixed structures
  structures.tent = placeFixed('tent', 'home', D.FIXED.home.tent, { r: 1.05 });
  for (const b of ['workbench', 'furnace']) {
    structures[b] = placeFixed(b, 'home', D.FIXED.home[b], {});
    structures[b].obj.visible = !!S.built[b];
    if (S.built[b]) colliders.push({ x: structures[b].pos.x, z: structures[b].pos.z, r: 0.75, id: b });
  }
  structures.windmill = placeFixed('windmill', 'highlands', D.FIXED.highlands.windmill, { r: 1.15 });
  structures.windmill.act.Spin?.play();
  beacon = placeFixed('beacon', 'ancient', D.FIXED.ancient.beacon, { r: 1.9 });
  beacon.obj.traverse(o => { if (o.name === 'BeaconTop') beacon.top = o; if (o.name === 'BeaconRubble') beacon.rubble = o; });
  for (const p of [[1.95, 1.95], [-1.95, 1.95], [1.95, -1.95], [-1.95, -1.95]]) colliders.push({ x: beacon.pos.x + p[0], z: beacon.pos.z + p[1], r: 0.35 });
  if (beacon.top) beacon.top.visible = S.beacon;
  if (S.beacon) { beacon.rubble && (beacon.rubble.visible = false); beacon.act.Spin?.play(); addBeam(); }
  // chests
  for (const iname of Object.keys(D.FIXED)) {
    const spec = D.FIXED[iname].chest; if (!spec) continue;
    const c = placeFixed('chest', iname, spec, { r: 0.45 });
    c.id = iname; c.opened = !!S.chests[iname];
    if (c.opened && c.act.Open) { c.act.Open.setLoop(THREE.LoopOnce); c.act.Open.clampWhenFinished = true; c.act.Open.play(); c.mixer.update(5); }
    chests.push(c);
  }
  // bridges + signs
  for (const [a, b] of D.LINKS) {
    const IA = islands.list[a], IB = islands.list[b];
    const dir = new V3(IB.cx - IA.cx, 0, IB.cz - IA.cz).normalize();
    const ea = islands.edgeDist(IA, dir.x, dir.z), eb = islands.edgeDist(IB, -dir.x, -dir.z);
    const A = new V3(IA.cx + dir.x * (ea - 0.5), 0, IA.cz + dir.z * (ea - 0.5));
    const B = new V3(IB.cx - dir.x * (eb - 0.5), 0, IB.cz - dir.z * (eb - 0.5));
    A.y = islands.heightAt(A.x, A.z); B.y = islands.heightAt(B.x, B.z);
    const len = A.distanceTo(B);
    const obj = Assets.clone('bridge');
    obj.position.set(A.x, Math.max(A.y, B.y) - 0.04, A.z);
    obj.rotation.y = -Math.atan2(dir.z, dir.x);
    obj.scale.set(len / 6, 1, 1);
    scene.add(obj);
    const mixer = new THREE.AnimationMixer(obj);
    const build = Assets.anims('bridge').find(c => c.name === 'Build');
    const act = build ? mixer.clipAction(build) : null;
    if (act) { act.setLoop(THREE.LoopOnce); act.clampWhenFinished = true; }
    const built = !!S.owned[b];
    obj.visible = built;
    const br = { a, b, A, B, dir, len, obj, mixer, act, built, deckY: Math.max(A.y, B.y) + 0.02 };
    bridges[a + '>' + b] = br;
    // sign on island A, beside the bridge head
    const side = new V3(-dir.z, 0, dir.x);
    const sp = A.clone().addScaledVector(dir, -0.7).addScaledVector(side, 1.05);
    sp.y = islands.heightAt(sp.x, sp.z);
    const sobj = Assets.clone('sign');
    sobj.position.copy(sp);
    sobj.rotation.y = Math.atan2(IA.cx - sp.x, IA.cz - sp.z) * 0.4 + Math.atan2(-dir.x, -dir.z) * 0.6;
    scene.add(sobj);
    const label = makeLabel(D.ISLANDS[b].he, D.ISLANDS[b].price);
    label.position.set(sp.x, sp.y + 1.75, sp.z); scene.add(label);
    const sign = { link: [a, b], obj: sobj, label, pos: sp.clone(), price: D.ISLANDS[b].price, br };
    signs.push(sign);
    colliders.push({ x: sp.x, z: sp.z, r: 0.22, sign });
  }
  refreshSigns();
  // decor
  const avoid = (x, z) => colliders.some(c => (c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + 0.4) ** 2) ||
    Object.values(bridges).some(br => br.A.distanceToSquared(new V3(x, br.A.y, z)) < 2.2 ** 2 || br.B.distanceToSquared(new V3(x, br.B.y, z)) < 2.2 ** 2) ||
    fixedNear(x, z, 2.0);
  scatterDecor(scene, islands, avoid);
  // resources: fill every island once (locked islands are static until bought)
  for (const iname of Object.keys(D.ISLANDS)) {
    for (const [kind, n] of D.ISLANDS[iname].spawn) for (let i = 0; i < n; i++) spawnResource(kind, iname, false);
  }
  // furnace fx
  structures.furnace.light = new THREE.PointLight('#ff9a4a', 0, 5, 1.6);
  structures.furnace.light.position.copy(structures.furnace.pos).add(new V3(0, 0.45, 0.55).applyAxisAngle(new V3(0, 1, 0), D.FIXED.home.furnace[2]));
  scene.add(structures.furnace.light);
  // highlight ring + health bar + guide arrow
  makeMarkers();
}
function fixedNear(x, z, r) {
  for (const [iname, f] of Object.entries(D.FIXED)) {
    const I = islands.list[iname];
    for (const [k, v] of Object.entries(f)) {
      const rr = k === 'beacon' ? 4.6 : k === 'windmill' ? 2.2 : k === 'tent' ? 2.2 : r;
      if ((I.cx + v[0] - x) ** 2 + (I.cz + v[1] - z) ** 2 < rr * rr) return true;
    }
  }
  return false;
}

function makeLabel(name, price) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 200;
  const g = c.getContext('2d');
  g.font = '800 56px Rubik, sans-serif'; g.textAlign = 'center'; g.direction = 'rtl';
  const draw = () => {
    g.clearRect(0, 0, 512, 200);
    g.fillStyle = 'rgba(58,38,21,0.82)'; g.beginPath(); g.roundRect(40, 18, 432, 164, 36); g.fill();
    g.fillStyle = '#fff6e2'; g.font = '800 50px Rubik, sans-serif'; g.fillText(name, 256, 84);
    g.fillStyle = '#ffd77a'; g.font = '900 60px Rubik, sans-serif';
    g.fillText(price + '', 286, 156);
    g.beginPath(); g.fillStyle = '#e3a83a'; g.arc(196, 136, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a8701c'; g.lineWidth = 6; g.stroke();
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  sp.scale.set(2.3, 0.9, 1); sp.renderOrder = 5;
  draw(); document.fonts?.ready.then(draw);
  return sp;
}
function refreshSigns() {
  for (const s of signs) {
    const show = !!S.owned[s.link[0]] && !S.owned[s.link[1]];
    s.obj.visible = s.label.visible = show;
    s.active = show;
  }
}

// ------------------------------------------------------------------- resources
function freeSpot(iname, minD = 1.5) {
  const I = islands.list[iname];
  for (let t = 0; t < 40; t++) {
    const a = rng() * Math.PI * 2;
    const e = islands.edgeDist(I, Math.cos(a), Math.sin(a));
    const r = Math.sqrt(rng()) * e * 0.84;
    const x = I.cx + Math.cos(a) * r, z = I.cz + Math.sin(a) * r;
    if (!pointInPoly(x, z, I.walk)) continue;
    if (fixedNear(x, z, 2.0)) continue;
    if (colliders.some(c => (c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + 1.0) ** 2)) continue;
    if (resources.some(o => o.state !== 'dead' && (o.pos.x - x) ** 2 + (o.pos.z - z) ** 2 < minD * minD)) continue;
    if (Object.values(bridges).some(b => (b.A.x - x) ** 2 + (b.A.z - z) ** 2 < 6 || (b.B.x - x) ** 2 + (b.B.z - z) ** 2 < 6)) continue;
    if (player.obj && mode !== 'title' && (player.pos.x - x) ** 2 + (player.pos.z - z) ** 2 < 4) continue;
    const y = islands.heightAt(x, z);
    if (y < SEA_Y + 0.15) continue;
    return new V3(x, y, z);
  }
  return null;
}
function spawnResource(kind, iname, pop = true) {
  const def = D.RES[kind];
  const pos = freeSpot(iname, def.kind === 'tree' ? 1.7 : 1.4); if (!pos) return null;
  const obj = Assets.clone(def.model);
  obj.position.copy(pos).y -= 0.03;
  obj.rotation.y = rng() * Math.PI * 2;
  const sc = def.kind === 'tree' ? rand(0.85, 1.12) : rand(0.85, 1.1);
  obj.scale.setScalar(sc);
  scene.add(obj);
  const r = { kind, def, obj, pos, hp: def.hp, island: iname, state: 'alive', scale: sc, pop: pop ? 0 : 1, mixer: null, act: {} };
  if (Assets.anims(def.model).length) {
    r.mixer = new THREE.AnimationMixer(obj);
    for (const c of Assets.anims(def.model)) r.act[c.name] = r.mixer.clipAction(c);
    if (r.act.Sway) { r.act.Sway.play(); r.act.Sway.time = Math.random() * 4; r.act.Sway.timeScale = rand(0.8, 1.15); }
    for (const n of ['Hit', 'Fall']) if (r.act[n]) { r.act[n].setLoop(THREE.LoopOnce); r.act[n].clampWhenFinished = n === 'Fall'; }
  }
  if (def.kind === 'bush') obj.traverse(o => { if (o.name === 'Berries') r.berries = o; });
  if (def.kind === 'tree') { r.mats = []; obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; r.mats.push(o.material); } }); r.fade = 1; }
  if (pop) { obj.scale.setScalar(0.001); fx.emit('puff', pos.clone().add(new V3(0, 0.3, 0)), 6, { colors: ['#fff6e2'], size: 0.6, up: 1, gravity: -0.5, life: 0.8 }); }
  resources.push(r);
  return r;
}
function damageMul() { return (1 + S.tier) * (1 + 0.35 * perk('strong')); }

function hitResource(r) {
  const def = r.def;
  if (def.kind === 'bush' && r.state === 'empty') { wobble(r); audio.play('bush', { pos: r.pos, vol: 0.6 }); return; }
  if (def.minTier > S.tier) {
    toastText('צריך מכוש ברזל כדי לכרות את זה', 'warn');
    audio.play('ore_clink', { pos: r.pos, vol: 0.7, pitch: 1.2 }); audio.play('ui_error', { vol: 0.6 });
    shake(0.08); spark(r, ['#cfd3d6', '#fff']); wobble(r); return;
  }
  r.hp -= damageMul();
  const p = r.pos.clone().add(new V3(0, def.kind === 'tree' ? 0.9 : 0.45, 0));
  if (def.sfx === 'chop') { audio.play('chop', { pos: p }); fx.emit('chip', p, 7, { colors: ['#8a5a2b', '#b07a43', '#5e3a1a'], size: 0.13, speed: 3, up: 3, gravity: 12 });
    fx.emit('chip', p.clone().add(new V3(0, 1.6, 0)), 5, { colors: r.kind === 'snowpine' ? ['#f2f5fa', '#dfe8f2'] : ['#4e8a2c', '#6aa83a', '#2f6a20'], size: 0.15, speed: 1.2, up: 0.5, gravity: 2.5, life: 1.3, drag: 2.5 });
    r.act.Hit?.reset().play();
  } else if (def.sfx === 'mine') { audio.play('mine', { pos: p }); spark(r, ['#9d958a', '#c9c2b6', '#6f675e']); wobble(r); }
  else if (def.sfx === 'ore') { audio.play('ore_clink', { pos: p }); spark(r, r.kind === 'gold' ? ['#f2c14e', '#fff2b0', '#8c7a5e'] : ['#b5562a', '#8c4a2a', '#9d958a']); wobble(r); }
  else if (def.sfx === 'crystal') { audio.play('crystal_hit', { pos: p }); spark(r, ['#bfe6ff', '#ffffff', '#7ec3ea']); wobble(r); }
  else if (def.sfx === 'bush') { audio.play('bush', { pos: p }); wobble(r); fx.emit('chip', p, 6, { colors: ['#4e8a2c', '#6aa83a'], size: 0.12, speed: 1.5, up: 1.5, gravity: 4, life: 0.9 }); }
  hitStop(0.045); shake(def.kind === 'tree' ? 0.1 : 0.12); buzz(12);
  showBar(r, Math.max(0, r.hp) / def.hp, def.kind === 'tree' ? 3.2 : 1.3);
  if (S.tut === 1) advanceTut();
  if (r.hp <= 0) breakResource(r);
}
function spark(r, colors) {
  const p = r.pos.clone().add(new V3(0, 0.55, 0)).addScaledVector(new V3().subVectors(player.pos, r.pos).setY(0).normalize(), r.def.r * 0.8);
  fx.emit('chip', p, 8, { colors, size: 0.12, speed: 3.2, up: 3, gravity: 12 });
  fx.emit('puff', p, 2, { colors: ['#e8dcc6'], size: 0.5, up: 0.6, gravity: -0.4, life: 0.6, opacity: 0.6 });
}
function wobble(r) { r.wob = 0.28; }

function breakResource(r) {
  const def = r.def;
  gainXP(def.xp, r.pos);
  S.broken++;
  const drops = [];
  for (const [item, a, b] of def.drops) {
    let n = irand(a, b);
    if (n > 0 && def.kind === 'tree' && item === 'wood') n += perk('lumber');
    if (n > 0 && def.kind === 'rock' && item !== 'stone') n += perk('miner');
    if (n > 0 && def.kind === 'rock' && r.kind === 'rock') n += perk('miner');
    if (n > 0 && Math.random() < 0.25 * perk('luck')) n *= 2;
    for (let i = 0; i < n; i++) drops.push(item);
  }
  if (def.kind === 'bush') {
    r.state = 'empty'; r.hp = def.hp; r.regrowAt = S.time + 28;
    if (r.berries) r.berries.visible = false;
    dropItems(drops, r.pos.clone().add(new V3(0, 0.5, 0)));
    return;
  }
  if (def.kind === 'tree') {
    r.state = 'falling';
    // fall away from the player (Fall tips the tree toward its local +Z)
    const away = new V3().subVectors(r.pos, player.pos).setY(0).normalize();
    r.obj.rotation.y = Math.atan2(away.x, away.z);
    r.act.Sway?.stop(); r.act.Hit?.stop();
    r.act.Fall?.reset().play();
    audio.play('tree_fall', { pos: r.pos, duck: 0.6 });
    r.fallT = 0; r.fallDir = away; r.drops = drops;
    hideBar();
  } else {
    r.state = 'dead';
    audio.play(r.kind === 'crystal' ? 'crystal_break' : 'rock_break', { pos: r.pos, duck: 0.7 });
    const p = r.pos.clone().add(new V3(0, 0.4, 0));
    const cols = r.kind === 'crystal' ? ['#bfe6ff', '#e9f6ff', '#7ec3ea'] : r.kind === 'gold' ? ['#f2c14e', '#9d958a', '#c9c2b6'] : r.kind === 'iron' ? ['#b5562a', '#6f675e', '#9d958a'] : ['#9d958a', '#c9c2b6', '#6f675e'];
    fx.emit('chip', p, 22, { colors: cols, size: 0.2, speed: 4.5, up: 4.5, gravity: 14, life: 1.0 });
    fx.emit('puff', p, 9, { colors: ['#e8dcc6', '#d6cab2'], size: 1.1, speed: 1.6, up: 1, gravity: -0.3, life: 1.1, opacity: 0.75 });
    scene.remove(r.obj);
    dropItems(drops, p);
    hitStop(0.07); shake(0.25);
    hideBar();
  }
}

// ------------------------------------------------------------------- items
const itemProto = {};
function itemMesh(type) {
  if (!itemProto[type]) itemProto[type] = Assets.mesh('items', D.ITEMS[type].mesh);
  const m = itemProto[type];
  if (!m) { const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), new THREE.MeshStandardMaterial({ color: '#c8a060' })); return g; }
  const c = m.clone(); c.castShadow = true;   // keep the node's quantization scale/offset
  return c;
}
function dropItems(list, from) {
  list.forEach((type, i) => {
    const o = new THREE.Group(); o.add(itemMesh(type));
    o.position.copy(from); scene.add(o);
    const a = Math.random() * Math.PI * 2, sp = rand(1.2, 2.6);
    items.push({ type, obj: o, pos: o.position, vel: new V3(Math.cos(a) * sp, rand(4, 6), Math.sin(a) * sp), t: -i * 0.05, rest: false, spin: rand(-6, 6) });
  });
}
function updateItems(dt) {
  const range = 1.7 * (1 + 0.6 * perk('magnet'));
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.t += dt;
    if (it.t < 0) { it.obj.visible = false; continue; }
    it.obj.visible = true;
    const toP = new V3().subVectors(player.pos, it.pos).add(new V3(0, 0.55, 0));
    const d = toP.length();
    if (it.t > 0.5 && d < range && mode === 'play') {
      it.mag = true;
    }
    if (it.mag) {
      it.vel.lerp(toP.normalize().multiplyScalar(11), clamp(dt * 9, 0, 1));
      it.pos.addScaledVector(it.vel, dt);
      if (d < 0.45) { collect(it.type, 1); scene.remove(it.obj); items.splice(i, 1); continue; }
    } else {
      it.vel.y -= 16 * dt;
      it.pos.addScaledVector(it.vel, dt);
      const g = islands.heightAt(it.pos.x, it.pos.z) + 0.14;
      if (it.pos.y < g) { it.pos.y = g; it.vel.y = Math.abs(it.vel.y) > 1.5 ? -it.vel.y * 0.38 : 0; it.vel.x *= 0.6; it.vel.z *= 0.6; }
      if (it.t > 25 || it.pos.y < SEA_Y - 0.5) { scene.remove(it.obj); items.splice(i, 1); continue; }
      if (it.t > 2.5 && d < 6) it.mag = true;   // gentle auto-collect when nearby
    }
    it.obj.rotation.y += it.spin * dt; it.spin *= 0.995; if (Math.abs(it.spin) < 1.2) it.spin = 1.2 * Math.sign(it.spin || 1);
    it.obj.children[0].position.y = it.vel.y === 0 && !it.mag ? Math.sin(S.time * 3 + i) * 0.04 : 0;
  }
}
function collect(type, n) {
  if (type === 'coin') { S.coins += n; audio.play('coin', { vol: 0.55, minGap: 0.07 }); bump('coins'); }
  else { S.inv[type] = (S.inv[type] || 0) + n; audio.play('pickup', { vol: 0.55, minGap: 0.06 }); }
  toastItem(type, n);
  updateHUD();
}

// ------------------------------------------------------------------- slimes
function spawnSlime(iname, kind) {
  const pos = freeSpot(iname, 1.0); if (!pos) return;
  if (player.obj && pos.distanceTo(player.pos) < 6) return;
  const obj = Assets.clone(kind);
  obj.position.copy(pos); scene.add(obj);
  const mixer = new THREE.AnimationMixer(obj), act = {};
  for (const c of Assets.anims(kind)) act[c.name] = mixer.clipAction(c);
  for (const n of ['Hop', 'Hurt', 'Die']) if (act[n]) { act[n].setLoop(THREE.LoopOnce); act[n].clampWhenFinished = true; }
  act.Idle?.play();
  const sl = { kind, obj, mixer, act, pos, island: iname, hp: kind === 'frostslime' ? 5 : 3, maxHp: kind === 'frostslime' ? 5 : 3,
    state: 'rest', t: rand(0.3, 1.5), dir: new V3(1, 0, 0), chase: false, kb: new V3(), cur: 'Idle', dead: false, scale: 0.001 };
  obj.scale.setScalar(0.001);
  fx.emit('puff', pos.clone().add(new V3(0, 0.2, 0)), 5, { colors: ['#fff6e2'], size: 0.5, up: 0.8, gravity: -0.4 });
  slimes.push(sl);
}
function slimePlay(sl, name, fade = 0.12) {
  const a = sl.act[name]; if (!a) return;
  const prev = sl.act[sl.cur];
  a.reset().play(); if (prev && prev !== a) a.crossFadeFrom(prev, fade, false);
  sl.cur = name;
}
function updateSlimes(dt) {
  let danger = false;
  for (let i = slimes.length - 1; i >= 0; i--) {
    const sl = slimes[i];
    sl.scale = Math.min(1, sl.scale + dt * 3); sl.obj.scale.setScalar(easeBack(sl.scale));
    if (sl.dead) { sl.deadT += dt; if (sl.deadT > 0.8) { scene.remove(sl.obj); slimes.splice(i, 1); } continue; }
    const toP = new V3().subVectors(player.pos, sl.pos).setY(0);
    const dP = toP.length();
    const onIsland = islands.islandAt(player.pos.x, player.pos.z, true)?.name === sl.island;
    if (!sl.chase && dP < 5.5 && onIsland && mode === 'play') { sl.chase = true; sl.t = Math.min(sl.t, 0.3); }
    if (sl.chase && (dP > 9 || !onIsland || mode !== 'play')) sl.chase = false;
    if (sl.chase && dP < 8) danger = true;
    // knockback
    if (sl.kb.lengthSq() > 0.0001) { tryMove(sl.pos, sl.kb.x * dt * 6, sl.kb.z * dt * 6, 0.3, sl.island); sl.kb.multiplyScalar(Math.max(0, 1 - dt * 6)); }
    sl.t -= dt;
    if (sl.state === 'rest' && sl.t <= 0) {
      sl.state = 'hop'; sl.ht = 0;
      if (sl.chase) sl.dir.copy(toP).normalize();
      else { const a = Math.random() * Math.PI * 2; sl.dir.set(Math.cos(a), 0, Math.sin(a)); }
      sl.obj.rotation.y = Math.atan2(sl.dir.x, sl.dir.z);
      slimePlay(sl, 'Hop'); sl.landed = false;
    }
    if (sl.state === 'hop') {
      sl.ht += dt;
      const k = sl.ht / 0.92;
      if (k > 0.26 && k < 0.6) {
        const sp = (sl.chase ? 2.7 : 1.6) * (sl.kind === 'frostslime' ? 0.9 : 1);
        if (sl.chase) sl.dir.lerp(toP.clone().normalize(), dt * 3).normalize();
        tryMove(sl.pos, sl.dir.x * sp * dt, sl.dir.z * sp * dt, 0.3, sl.island);
        sl.obj.rotation.y = Math.atan2(sl.dir.x, sl.dir.z);
      }
      if (k > 0.6 && !sl.landed) {
        sl.landed = true;
        audio.play('slime_hop', { pos: sl.pos, vol: 0.6, minGap: 0.1 });
        fx.emit('puff', sl.pos.clone().add(new V3(0, 0.05, 0)), 3, { colors: ['#e8dcc6'], size: 0.4, up: 0.3, gravity: -0.2, life: 0.5, opacity: 0.6, speed: 1.2 });
        if (dP < 0.85) hurtPlayer(sl);
      }
      if (k >= 1) { sl.state = 'rest'; sl.t = sl.chase ? rand(0.12, 0.3) : rand(0.7, 2.2); slimePlay(sl, 'Idle', 0.2); }
    }
    sl.pos.y = islands.heightAt(sl.pos.x, sl.pos.z);
    sl.obj.position.copy(sl.pos);
  }
  return danger;
}
function hitSlime(sl) {
  const dmg = damageMul();
  sl.hp -= dmg;
  const away = new V3().subVectors(sl.pos, player.pos).setY(0).normalize();
  sl.kb.copy(away).multiplyScalar(1.6);
  const p = sl.pos.clone().add(new V3(0, 0.3, 0));
  const goo = sl.kind === 'frostslime' ? ['#bfe6ff', '#8ec9ee', '#ffffff'] : ['#7cc44a', '#4e9a2c', '#b5e38a'];
  fx.emit('chip', p, 10, { colors: goo, size: 0.14, speed: 3, up: 3, gravity: 10 });
  hitStop(0.08); shake(0.16); buzz(18);
  showBar(sl, Math.max(0, sl.hp) / sl.maxHp, 0.85);
  if (sl.hp <= 0) {
    sl.dead = true; sl.deadT = 0; slimePlay(sl, 'Die', 0.05);
    audio.play('slime_die', { pos: sl.pos });
    fx.emit('puff', p, 8, { colors: goo, size: 0.7, up: 1.5, speed: 2.5, gravity: 2, life: 0.8 });
    const drops = ['coin']; if (Math.random() < 0.6) drops.push('coin');
    if (sl.kind === 'slime' && Math.random() < 0.4) drops.push('berry');
    if (sl.kind === 'frostslime' && Math.random() < 0.2) drops.push('crystal');
    dropItems(drops, p);
    gainXP(6, sl.pos);
    hideBar();
  } else { slimePlay(sl, 'Hurt', 0.05); audio.play('slime_hurt', { pos: sl.pos }); sl.state = 'rest'; sl.t = 0.45; sl.chase = true; }
}
function hurtPlayer(src) {
  if (player.inv > 0 || mode !== 'play') return;
  S.hearts -= 1; player.inv = 1.3;
  audio.play('player_hurt', { vol: 1 });
  const away = new V3().subVectors(player.pos, src.pos).setY(0).normalize();
  player.kb = away.multiplyScalar(5);
  shake(0.3); hitStop(0.06); buzz(60);
  fx.emit('star', player.pos.clone().add(new V3(0, 0.9, 0)), 5, { colors: ['#fff6e2', '#ffd77a'], size: 0.25, speed: 2, up: 2, gravity: 4 });
  if (src.kb) src.kb.copy(away).multiplyScalar(-1.4);
  player.act.Hurt && (player.hurtT = 0.38, player.act.Hurt.reset().play(), player.act.Hurt.crossFadeFrom(player.act[player.cur], 0.06, false), player.cur = 'Hurt');
  updateHUD(true);
  if (S.hearts <= 0) faint();
}

// ------------------------------------------------------------------- walkability
function walkableAt(x, z) {
  if (islands.islandAt(x, z, true)) return true;
  for (const br of Object.values(bridges)) if (br.built && onBridge(br, x, z)) return true;
  return false;
}
function onBridge(br, x, z) {
  const ax = x - br.A.x, az = z - br.A.z;
  const t = ax * br.dir.x + az * br.dir.z;
  if (t < -0.3 || t > br.len + 0.3) return false;
  const perp = Math.abs(ax * -br.dir.z + az * br.dir.x);
  return perp < 0.52;
}
function groundAt(x, z) {
  for (const br of Object.values(bridges)) if (br.built && onBridge(br, x, z)) {
    const h = islands.heightAt(x, z);
    return Math.max(h, br.deckY + 0.04);
  }
  return islands.heightAt(x, z);
}
function surfaceAt(x, z) {
  for (const br of Object.values(bridges)) if (br.built && onBridge(br, x, z) && islands.heightAt(x, z) < br.deckY) return 'wood';
  const I = islands.islandAt(x, z);
  if (!I) return 'grass';
  return I.name === 'snow' ? 'snow' : (I.name === 'highlands' || I.name === 'ancient') ? 'stone' : 'grass';
}
function tryMove(pos, dx, dz, r, onlyIsland) {
  const ok = (x, z) => {
    if (onlyIsland) { const I = islands.list[onlyIsland]; if (!pointInPoly(x, z, I.walk)) return false; }
    else if (!walkableAt(x, z)) return false;
    return true;
  };
  let nx = pos.x + dx, nz = pos.z + dz;
  if (!ok(nx, nz)) {
    if (ok(pos.x + dx, pos.z)) nz = pos.z; else if (ok(pos.x, pos.z + dz)) nx = pos.x; else return false;
  }
  // push out of static colliders + resources
  const push = (cx, cz, cr) => {
    const ex = nx - cx, ez = nz - cz, d2 = ex * ex + ez * ez, rr = cr + r;
    if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); const nx2 = cx + ex / d * rr, nz2 = cz + ez / d * rr; if (ok(nx2, nz2)) { nx = nx2; nz = nz2; } }
  };
  for (const c of colliders) if (!c.sign || c.sign.active) push(c.x, c.z, c.r);
  for (const o of resources) if (o.state === 'alive' || o.state === 'empty') push(o.pos.x, o.pos.z, o.def.r * o.scale);
  pos.x = nx; pos.z = nz;
  return true;
}

// ===================================================================== player update + actions
const input = { x: 0, z: 0, act: false, actHeld: false, keys: new Set() };
function updatePlayer(dt) {
  // movement input
  let ix = input.x, iz = input.z;
  const k = input.keys;
  if (k.has('a') || k.has('arrowleft')) ix -= 1; if (k.has('d') || k.has('arrowright')) ix += 1;
  if (k.has('w') || k.has('arrowup')) iz -= 1; if (k.has('s') || k.has('arrowdown')) iz += 1;
  let mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; mag = 1; }
  if (mode !== 'play') { ix = iz = 0; mag = 0; }
  const swinging = player.swingT >= 0;
  const maxSp = 3.7 * (1 + 0.12 * perk('swift')) * (swinging ? 0.35 : 1) * (player.hurtT > 0 ? 0.4 : 1);
  const tv = new V3(ix * maxSp, 0, iz * maxSp);
  player.vel.lerp(tv, clamp(dt * (mag > 0.05 ? 14 : 10), 0, 1));
  if (player.kb) { player.vel.add(player.kb); player.kb.multiplyScalar(Math.max(0, 1 - dt * 10)); if (player.kb.lengthSq() < 0.01) player.kb = null; }
  const before = player.pos.clone();
  if (player.vel.lengthSq() > 0.0004) tryMove(player.pos, player.vel.x * dt, player.vel.z * dt, 0.28);
  const moved = before.distanceTo(player.pos);
  player.moved += moved;
  player.speed = moved / Math.max(dt, 1e-4);
  if (S.tut === 0 && player.moved > 2.5) advanceTut();
  // face movement, or the target while swinging
  if (swinging && player.target) {
    const t = player.target.o.pos; player.face = lerpAngle(player.face, Math.atan2(t.x - player.pos.x, t.z - player.pos.z), clamp(dt * 18, 0, 1));
  } else if (mag > 0.1) player.face = lerpAngle(player.face, Math.atan2(ix, iz), clamp(dt * 14, 0, 1));
  player.obj.rotation.y = player.face;
  player.pos.y += (groundAt(player.pos.x, player.pos.z) - player.pos.y) * clamp(dt * 20, 0, 1);
  player.obj.position.copy(player.pos);
  // animation state
  if (player.lockT > 0) player.lockT -= dt;          // faint / celebrate own the body
  else if (player.hurtT > 0) player.hurtT -= dt;
  else if (swinging) { /* swing owns the body */ }
  else if (player.speed > 2.6) playAnim('Run', 0.18, clamp(player.speed / 3.7, 0.7, 1.25));
  else if (player.speed > 0.35) playAnim('Walk', 0.18, clamp(player.speed / 2.0, 0.7, 1.4));
  else playAnim('Idle', 0.25);
  // footsteps synced to the clip phase (contacts at 25% and 75% of the cycle)
  const loco = player.act[player.cur];
  if ((player.cur === 'Walk' || player.cur === 'Run') && loco) {
    const ph = (loco.time / loco.getClip().duration) % 1;
    const prev = player.stepPhase;
    const crossed = (x) => (prev < x && ph >= x) || (ph < prev && (prev < x || ph >= x));
    if (crossed(0.25) || crossed(0.75)) {
      const surf = surfaceAt(player.pos.x, player.pos.z);
      audio.play('step_' + surf, { vol: player.cur === 'Run' ? 0.6 : 0.45, jitter: 0.08, minGap: 0.12 });
      if (surf === 'snow' || player.cur === 'Run') fx.emit('puff', player.pos.clone().add(new V3(0, 0.05, 0)), 1, { colors: [surf === 'snow' ? '#f4f7fb' : '#e8dcc6'], size: 0.35, up: 0.3, gravity: -0.2, life: 0.5, opacity: 0.55, speed: 0.6 });
    }
    player.stepPhase = ph;
  }
  // swing
  player.swingCd -= dt;
  if (swinging) {
    player.swingT += dt;
    const strike = 0.25 / 1.15;
    if (!player.swingHit && player.swingT >= strike) { player.swingHit = true; strikeNow(); }
    if (player.swingT > 0.54 / 1.15) { player.swingT = -1; player.cur = 'Swing'; playAnim(player.speed > 0.35 ? 'Walk' : 'Idle', 0.15); }
  }
  if (input.actHeld && mode === 'play' && !swinging && player.swingCd <= 0) doAction(true);
  // invulnerability blink
  if (player.inv > 0) { player.inv -= dt; player.obj.visible = player.inv <= 0 || Math.floor(player.inv * 14) % 2 === 0; }
  else player.obj.visible = true;
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; }

function findTarget() {
  let best = null, bestScore = 1e9;
  const fwd = new V3(Math.sin(player.face), 0, Math.cos(player.face));
  const consider = (o, reach, kind) => {
    const dx = o.pos.x - player.pos.x, dz = o.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d > reach) return;
    const dot = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
    const score = d - dot * 0.6 + (kind === 'ui' ? -0.4 : kind === 'slime' ? -0.9 : 0);
    if (score < bestScore) { bestScore = score; best = { o, kind }; }
  };
  for (const r of resources) if (r.state === 'alive') if (S.owned[r.island] || islands.islandAt(player.pos.x, player.pos.z, true)?.name === r.island) consider(r, r.def.r * r.scale + 0.95, 'res');
  for (const sl of slimes) if (!sl.dead) consider(sl, 1.45, 'slime');
  for (const s of signs) if (s.active) consider(s, 1.7, 'ui');
  for (const c of chests) if (!c.opened && S.owned[c.island]) consider(c, 1.5, 'ui');
  if (beacon && S.owned.ancient && !S.beacon) consider(beacon, 3.0, 'ui');
  for (const b of ['workbench', 'furnace']) if (S.built[b]) consider(structures[b], 1.5, 'ui');
  return best;
}
function doAction(fromHold = false) {
  if (mode !== 'play') return;
  const t = player.target;
  if (t && t.kind === 'ui') { if (!fromHold) interact(t.o); return; }
  if (player.swingT >= 0 || player.swingCd > 0) return;
  player.swingT = 0; player.swingHit = false; player.swingCd = 0.5 / 1.15;
  const a = player.act.Swing;
  if (a) { a.reset(); a.timeScale = 1.15; a.play(); const prev = player.act[player.cur]; if (prev && prev !== a) a.crossFadeFrom(prev, 0.07, false); player.cur = 'Swing'; }
  audio.play('swing', { vol: 0.5, jitter: 0.1 });
}
function strikeNow() {
  const t = player.target;
  if (t && t.kind === 'res' && (t.o.state === 'alive')) {
    const d = Math.hypot(t.o.pos.x - player.pos.x, t.o.pos.z - player.pos.z);
    if (d < t.o.def.r * t.o.scale + 1.1) hitResource(t.o);
  }
  // slimes in a frontal arc
  const fwd = new V3(Math.sin(player.face), 0, Math.cos(player.face));
  for (const sl of slimes) {
    if (sl.dead) continue;
    const v = new V3().subVectors(sl.pos, player.pos).setY(0); const d = v.length();
    if (d < 1.5 && (d < 0.5 || v.normalize().dot(fwd) > 0.2)) hitSlime(sl);
  }
}
function interact(o) {
  if (signs.includes(o)) return buyLand(o);
  if (chests.includes(o)) return openChest(o);
  if (o === beacon) return openBeacon();
  if (o === structures.workbench) return openCraft('tools');
  if (o === structures.furnace) return openCraft('furnace');
}

// ------------------------------------------------------------------- land, chests, beacon
function buyLand(sign) {
  const [a, b] = sign.link;
  if (S.coins < sign.price) {
    audio.play('ui_error'); toastText(`חסרים ${sign.price - S.coins} מטבעות`, 'warn');
    sign.shakeT = 0.4; return;
  }
  S.coins -= sign.price; S.owned[b] = true; islands.list[b].owned = true;
  audio.play('buy_land', { duck: 0.5 });
  setTimeout(() => audio.play('bridge_build', { pos: sign.br.A }), 250);
  fx.emit('star', sign.pos.clone().add(new V3(0, 1.4, 0)), 14, { colors: ['#ffd77a', '#fff6e2'], size: 0.3, speed: 3, up: 3, gravity: 4 });
  fx.emit('puff', sign.pos.clone().add(new V3(0, 0.6, 0)), 8, { colors: ['#fff6e2'], size: 0.8, up: 1, gravity: -0.3 });
  const br = sign.br; br.built = true; br.obj.visible = true; br.act?.reset().play();
  refreshSigns();
  gainXP(20, sign.pos);
  banner(D.ISLANDS[b].he, 'אי חדש נפתח!');
  // wake the island: refill resources with pops
  const I = D.ISLANDS[b];
  let n = 0;
  for (const [kind, cnt] of I.spawn) {
    const have = resources.filter(r => r.island === b && r.kind === kind && r.state !== 'dead').length;
    for (let i = have; i < cnt; i++) setTimeout(() => spawnResource(kind, b, true), 600 + (n++) * 120);
  }
  for (let i = 0; i < (I.slimes || 0); i++) setTimeout(() => spawnSlime(b, I.slimeKind), 3000 + i * 1500);
  if (b === 'forest' && S.tut === 5) advanceTut();
  updateHUD(); checkGoals(); save();
}
function openChest(c) {
  c.opened = true; S.chests[c.id] = true;
  if (c.act.Open) { c.act.Open.setLoop(THREE.LoopOnce); c.act.Open.clampWhenFinished = true; c.act.Open.reset().play(); }
  audio.play('chest_open', { pos: c.pos, duck: 0.6 });
  setTimeout(() => {
    const n = irand(10, 15);
    dropItems(Array(n).fill('coin'), c.pos.clone().add(new V3(0, 0.6, 0)));
    fx.emit('star', c.pos.clone().add(new V3(0, 0.7, 0)), 16, { colors: ['#ffd77a', '#fff6e2', '#f2c14e'], size: 0.28, speed: 2.5, up: 4, gravity: 5 });
  }, 380);
  gainXP(10, c.pos); save();
}
function openBeacon() {
  const rows = Object.entries(D.BEACON_COST).map(([k, n]) => costChip(k, n)).join('');
  const can = canAfford(D.BEACON_COST);
  showOverlay(`<div class="panel"><div class="phead"><h2>המגדלור העתיק</h2><button class="close" data-close aria-label="סגירה">×</button></div>
    <div class="pbody"><p class="lead">האור של המגדלור כבה לפני מאות שנים. אספו את החומרים כדי לתקן אותו ולהדליק אותו שוב.</p>
    <div class="costs" style="justify-content:center">${rows}</div>
    <button class="go gold wide" id="bFix" ${can ? '' : 'disabled'}>${can ? 'תקנו את המגדלור!' : 'חסרים עוד חומרים'}</button></div></div>`);
  $('bFix').onclick = () => { if (!canAfford(D.BEACON_COST)) return; pay(D.BEACON_COST); closeOverlay(); repairBeacon(); };
}
let beam = null;
function addBeam() {
  const g = new THREE.CylinderGeometry(0.22, 1.1, 16, 28, 1, true); g.translate(0, 8, 0);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float t; varying vec2 vU; void main(){ float a = (1.0 - vU.y) * 0.32 * (0.85 + 0.15*sin(t*2.0 + vU.y*8.0)); a *= smoothstep(0.0, 0.08, vU.y); gl_FragColor = vec4(1.0, 0.93, 0.74, a); }' });
  beam = new THREE.Mesh(g, m); beam.position.copy(beacon.pos).add(new V3(0, 2.6, 0)); scene.add(beam);
  const L = new THREE.PointLight('#ffe2a8', 6, 14, 1.4); L.position.copy(beacon.pos).add(new V3(0, 3, 0)); scene.add(L);
}
function repairBeacon() {
  S.beacon = true; save();
  mode = 'cutscene';
  audio.play('beacon_repair', { duck: 0.3 });
  if (beacon.rubble) { beacon.rubble.visible = false; fx.emit('puff', beacon.pos.clone().add(new V3(0, 0.6, 0)), 14, { colors: ['#e8dcc6'], size: 1.2, speed: 3, up: 1, gravity: -0.2, life: 1.2 }); }
  if (beacon.top) beacon.top.visible = true;
  const rise = beacon.act.Rise; if (rise) { rise.setLoop(THREE.LoopOnce); rise.clampWhenFinished = true; rise.reset().play(); }
  setTimeout(() => { rise?.stop(); beacon.act.Spin?.reset().play(); addBeam(); shake(0.4);
    fx.emit('star', beacon.pos.clone().add(new V3(0, 2.8, 0)), 40, { colors: ['#ffd77a', '#fff6e2', '#bfe6ff'], size: 0.35, speed: 5, up: 5, gravity: 3, life: 1.6 }); }, 1500);
  setTimeout(() => { playAnim('Celebrate', 0.2); player.lockT = 3.2; audio.stinger('music_win'); }, 1800);
  setTimeout(() => { S.won = true; checkGoals(); save(); showWin(); }, 4800);
}

// ===================================================================== XP / level / perks
function gainXP(n, pos) {
  S.xp += n;
  let need = D.xpForLevel(S.level);
  while (S.xp >= need) { S.xp -= need; S.level++; pendingPerks++; perkAt = S.time + 1.6; need = D.xpForLevel(S.level); levelUpFx(); }
  updateHUD();
}
function levelUpFx() {
  audio.play('levelup', { duck: 0.5 });
  fx.emit('star', player.pos.clone().add(new V3(0, 1.0, 0)), 24, { colors: ['#ffd77a', '#fff6e2', '#8ccf55'], size: 0.3, speed: 3.5, up: 4, gravity: 4, life: 1.2 });
  banner('רמה ' + S.level, 'בחרו יכולת חדשה');
  const lv = $('lvl'); lv.classList.remove('up'); void lv.offsetWidth; lv.classList.add('up');
  S.hearts = Math.min(maxHearts(), S.hearts + 1);
}
let perkAt = 0;
function maybePerk() {
  if (pendingPerks <= 0 || mode !== 'play' || player.swingT >= 0 || S.time < perkAt) return;
  const pool = D.PERKS.filter(p => perk(p.id) < p.max);
  if (!pool.length) { pendingPerks = 0; return; }
  const pick = []; while (pick.length < Math.min(3, pool.length)) { const p = pool[Math.floor(Math.random() * pool.length)]; if (!pick.includes(p)) pick.push(p); }
  pendingPerks--;
  showOverlay(`<div class="panel"><div class="phead"><h2>רמה ${S.level}! בחרו יכולת</h2></div><div class="perks">
    ${pick.map(p => `<button class="perk" data-perk="${p.id}"><div class="pi">${p.he[0]}</div><div><b>${p.he}</b><span>${p.desc}</span></div><small>${perk(p.id)}/${p.max}</small></button>`).join('')}</div></div>`, true, true);
  buzz([20, 40, 20]);
  document.querySelectorAll('[data-perk]').forEach(b => b.onclick = () => {
    const id = b.dataset.perk; S.perks[id] = perk(id) + 1;
    if (id === 'heart') S.hearts = maxHearts();
    audio.play('ui_select'); closeOverlay(); updateHUD(true); save();
  });
}

// ===================================================================== crafting
function canAfford(cost) { return Object.entries(cost).every(([k, n]) => (k === 'coin' ? S.coins : S.inv[k] || 0) >= n); }
function pay(cost) { for (const [k, n] of Object.entries(cost)) { if (k === 'coin') S.coins -= n; else S.inv[k] -= n; } }
const icons = {};
function costChip(k, n) {
  const have = k === 'coin' ? S.coins : S.inv[k] || 0;
  return `<span class="cost ${have >= n ? '' : 'miss'}"><img alt="" src="${icons[k] || ''}">${have}/${n}</span>`;
}
let craftTab = 'build';
function openCraft(tab) {
  if (mode !== 'play') return;
  craftTab = tab || craftTab;
  audio.play('ui_open');
  renderCraft();
}
function renderCraft() {
  const list = D.RECIPES.filter(r => r.tab === craftTab).map(r => {
    const locked = r.needs && !S.built[r.needs];
    const done = (r.once && S.built[r.id]) || (r.tier && S.tier >= r.tier);
    const ok = !locked && !done && canAfford(r.cost);
    const img = r.gives ? icons[Object.keys(r.gives)[0]] : r.tier ? icons[r.tier === 1 ? 'pickIron' : 'pickGold'] : icons[r.id];
    let tradeMul = r.tab === 'trade' && perk('trader') ? ` <b style="color:var(--leaf2)">(+${perk('trader')})</b>` : '';
    return `<div class="card${locked || done ? ' dim' : ''}"><img class="ico" alt="" src="${img || ''}"><div class="txt"><div class="t">${r.he}${tradeMul}</div>
      <div class="d">${locked ? (r.needs === 'furnace' ? 'צריך לבנות כבשן קודם' : 'צריך לבנות שולחן עבודה קודם') : r.desc}</div>
      <div class="costs">${Object.entries(r.cost).map(([k, n]) => costChip(k, n)).join('')}</div></div>
      ${done ? '<span class="owned">✓ יש לכם</span>' : `<button class="go${r.tab === 'trade' ? ' gold' : ''}" data-r="${r.id}" ${ok ? '' : 'disabled'}>${r.tab === 'build' ? 'בנו' : r.tab === 'trade' ? 'מכרו' : 'הכינו'}</button>`}</div>`;
  }).join('');
  showOverlay(`<div class="panel"><div class="phead"><h2>בנייה ומלאכה</h2><button class="close" data-close aria-label="סגירה">×</button></div>
    <div class="tabs">${D.TABS.map(([id, he]) => `<button class="tab ${id === craftTab ? 'on' : ''}" data-tab="${id}">${he}</button>`).join('')}</div>
    <div class="plist">${list}</div></div>`);
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { craftTab = b.dataset.tab; audio.play('ui_click'); renderCraft(); });
  document.querySelectorAll('[data-r]').forEach(b => b.onclick = () => craft(D.RECIPES.find(r => r.id === b.dataset.r)));
}
function craft(r) {
  if (!canAfford(r.cost)) { audio.play('ui_error'); return; }
  pay(r.cost);
  if (r.once) {
    S.built[r.id] = true; const st = structures[r.id];
    st.obj.visible = true; st.popT = 0;
    colliders.push({ x: st.pos.x, z: st.pos.z, r: 0.75, id: r.id });
    if (player.pos.distanceTo(st.pos) < 1.2) player.pos.add(new V3().subVectors(player.pos, st.pos).setY(0).normalize().multiplyScalar(1.3 - player.pos.distanceTo(st.pos)));
    audio.play('build', { duck: 0.6 }); fx.emit('puff', st.pos.clone().add(new V3(0, 0.3, 0)), 10, { colors: ['#e8dcc6'], size: 1, speed: 2.5, up: 0.8, gravity: -0.2 });
    banner(r.he, 'נבנה!');
    if (r.id === 'workbench' && S.tut <= 3) { S.tut = 3; advanceTut(); }
    if (r.id === 'furnace') startFurnace();
    closeOverlay();
  } else if (r.tier) {
    S.tier = r.tier; setTool(); audio.play('craft', { duck: 0.7 }); banner(r.he, 'הכלי שלכם שודרג!');
    playAnim('Celebrate', 0.15); player.lockT = 1.05; player.celebrateT = 1.05;
    closeOverlay();
  } else {
    let mult = 1;
    if (r.tab === 'trade' && perk('trader')) mult = 1 + perk('trader') * 0.5;
    for (const [k, n] of Object.entries(r.gives)) {
      const amt = Math.floor(n * mult + (Math.random() < (n * mult) % 1 ? 1 : 0));
      if (k === 'coin') S.coins += amt; else S.inv[k] = (S.inv[k] || 0) + amt;
      toastItem(k, amt);
    }
    if (r.tab === 'furnace') { audio.play('smelt'); smokeBurst(); if (r.id === 'ironBar') S.madeBar = true; }
    else audio.play('coin');
    renderCraft();
  }
  gainXP(r.tab === 'trade' ? 1 : 5);
  updateHUD(); checkGoals(); save();
}

// ===================================================================== HUD + UI
function heartSVG(full) {
  return `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z"
    fill="${full ? '#d8433b' : '#e2cfa8'}" stroke="${full ? '#8f1f19' : '#b9a47c'}" stroke-width="1.6"/>${full ? '<ellipse cx="8" cy="8.5" rx="2" ry="1.3" fill="#ff9a8f" opacity=".8"/>' : ''}</svg>`;
}
function buzz(ms) { try { if (isTouch && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not allowed */ } }
let lastHearts = -1;
function updateHUD(heartsChanged) {
  const mh = maxHearts();
  if (heartsChanged || lastHearts !== S.hearts || $('hearts').children.length !== mh) {
    $('hearts').innerHTML = Array.from({ length: mh }, (_, i) => heartSVG(i < S.hearts)).join('');
    if (lastHearts >= 0 && S.hearts < lastHearts) { const h = $('hearts'); h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit'); }
    lastHearts = S.hearts;
  }
  $('lvlN').textContent = S.level;
  $('xpRing').style.strokeDashoffset = (113.1 * (1 - S.xp / D.xpForLevel(S.level))).toFixed(1);
  $('coinN').textContent = S.coins;
  const inv = $('inv');
  const want = D.INV_ORDER.filter(k => (S.inv[k] || 0) > 0);
  const html = want.map(k => `<div class="tile" data-k="${k}" title="${D.ITEMS[k].he}"><img alt="${D.ITEMS[k].he}" src="${icons[k] || ''}"><b>${S.inv[k]}</b></div>`).join('');
  if (inv.dataset.h !== html) { inv.innerHTML = html; inv.dataset.h = html; }
  const eat = $('bEat');
  eat.classList.toggle('hidden', !((S.inv.berry || 0) > 0 && S.hearts < mh)); $('eatN').textContent = S.inv.berry || 0;
  updateGoal();
}
function bump(id) { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
const toastStack = new Map();
function addPop(html, cls = '') {
  const box = $('pops'); const el = document.createElement('div'); el.className = 'pop ' + cls; el.innerHTML = html;
  box.appendChild(el); setTimeout(() => el.remove(), 1750);
  while (box.children.length > 4) box.firstChild.remove();
  return el;
}
function toastItem(type, n) {
  let t = toastStack.get(type);
  if (t && t.el.isConnected && performance.now() - t.at < 1200) {
    t.n += n; t.at = performance.now(); t.el.querySelector('span').textContent = `+${t.n} ${D.ITEMS[type].he}`;
    t.el.style.animation = 'none'; void t.el.offsetWidth; t.el.style.animation = '';
  } else {
    const el = addPop(`<img alt="" src="${icons[type] || ''}"><span>+${n} ${D.ITEMS[type].he}</span>`);
    toastStack.set(type, { el, n, at: performance.now() });
  }
  const tile = document.querySelector(`.tile[data-k="${type}"]`); if (tile) { tile.classList.remove('bump'); void tile.offsetWidth; tile.classList.add('bump'); }
}
function toastText(msg) { addPop('<span></span>', 'warn').querySelector('span').textContent = msg; buzz(30); }
function banner(title, sub) {
  $('banner').innerHTML = `<div>${title}${sub ? `<small>${sub}</small>` : ''}</div>`;
}
let questOpenT = 0;
function questText() {
  if (S.tut < D.TUTORIAL.length) {
    const T = D.TUTORIAL[S.tut];
    let txt = (!isTouch && T.pc) ? T.pc : T.text;
    if (T.id === 'gather') txt += ` <b>${Math.min(6, S.inv.wood)}/6 עץ · ${Math.min(2, S.inv.stone)}/2 אבן</b>`;
    if (T.id === 'coins') txt += ` <b>${Math.min(8, S.coins)}/8</b>`;
    return txt;
  }
  if (S.goal < D.GOALS.length) {
    let txt = D.GOALS[S.goal].text;
    if (D.GOALS[S.goal].id === 'beacon') txt += ` <b>${Object.entries(D.BEACON_COST).map(([k, n]) => `${Math.min(n, S.inv[k] || 0)}/${n} ${D.ITEMS[k].he}`).join(' · ')}</b>`;
    return txt;
  }
  return 'המגדלור דולק! המשיכו לחקור, לאסוף ולעלות רמות.';
}
function updateGoal() {
  const html = questText();
  const t = $('questT');
  if (t.dataset.h !== html) { t.innerHTML = html; t.dataset.h = html; }
}
function flashQuest() {
  const g = $('quest'); g.classList.remove('done'); void g.offsetWidth; g.classList.add('done', 'open');
  questOpenT = 4.5; buzz(20);
}
function advanceTut() {
  S.tut++; flashQuest();
  audio.play('ui_select', { vol: 0.7 }); updateHUD(); save();
}
function checkTutorial() {
  if (S.tut === 2 && ((S.inv.wood >= 6 && S.inv.stone >= 2) || S.built.workbench)) advanceTut();
  if (S.tut === 3 && S.built.workbench) advanceTut();
  if (S.tut === 4 && (S.coins >= 8 || S.owned.forest)) advanceTut();
  if (S.tut === 5 && S.owned.forest) advanceTut();
}
function checkGoals() {
  if (S.tut < D.TUTORIAL.length) return;
  const done = {
    highlands: () => S.owned.highlands, furnace: () => S.built.furnace && S.madeBar, pickIron: () => S.tier >= 1,
    snow: () => S.owned.snow && (S.inv.crystal > 0 || S.beacon), ancient: () => S.owned.ancient, beacon: () => S.beacon,
  };
  let moved = false;
  while (S.goal < D.GOALS.length && done[D.GOALS[S.goal].id]()) { S.goal++; moved = true; }
  if (moved) { flashQuest(); audio.play('ui_select', { vol: 0.7 }); }
}

// ------------------------------------------------------------------- overlays
function showOverlay(html, modal = false, center = false) {
  const o = $('overlay'); o.innerHTML = html; o.classList.remove('hidden'); o.classList.toggle('center', center);
  if (mode === 'play') mode = 'menu';
  o.onclick = (e) => { if (!modal && (e.target === o || e.target.closest('[data-close]'))) { audio.play('ui_close'); closeOverlay(); } };
}
function closeOverlay() {
  $('overlay').classList.add('hidden'); $('overlay').innerHTML = '';
  if (mode === 'menu') mode = 'play';
  input.actHeld = false;
}
function openPause() {
  if (mode !== 'play') return;
  audio.play('ui_open');
  const t = Math.floor(S.time);
  const fsOk = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  showOverlay(`<div class="panel"><div class="phead"><h2>הפסקה</h2><button class="close" data-close aria-label="סגירה">×</button></div>
    <div class="pgrid"><div class="pcol">
    <div class="row"><label for="vMusic">מוזיקה</label><input type="range" min="0" max="1" step="0.05" value="${S.vol.music}" id="vMusic"></div>
    <div class="row"><label for="vSfx">צלילים</label><input type="range" min="0" max="1" step="0.05" value="${S.vol.sfx}" id="vSfx"></div>
    <div class="row">השתקה<button class="toggle ${S.vol.muted ? 'on' : ''}" id="vMute" aria-label="השתקה"></button></div>
    ${fsOk ? `<div class="row">מסך מלא<button class="toggle ${document.fullscreenElement ? 'on' : ''}" id="vFs" aria-label="מסך מלא"></button></div>` : ''}
    </div><div class="pbody"><div class="stat"><span>זמן משחק</span><span>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</span></div>
    <div class="stat"><span>יכולות</span><span>${Object.entries(S.perks).map(([k, v]) => D.PERKS.find(p => p.id === k).he + (v > 1 ? ' ×' + v : '')).join(', ') || 'עוד אין'}</span></div>
    <button class="go wide" data-close>חזרה למשחק</button>
    <button class="big sec" id="bReset">התחלה מחדש</button></div></div></div>`);
  const upd = () => { S.vol.music = +$('vMusic').value; S.vol.sfx = +$('vSfx').value; audio.vol = S.vol; audio.applyVolumes(); save(); };
  $('vMusic').oninput = upd; $('vSfx').oninput = upd;
  $('vMute').onclick = () => { S.vol.muted = !S.vol.muted; $('vMute').classList.toggle('on', S.vol.muted); upd(); };
  if ($('vFs')) $('vFs').onclick = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (e) { /* refused */ }
    $('vFs').classList.toggle('on', !!document.fullscreenElement);
  };
  $('bReset').onclick = () => { if ($('bReset').dataset.sure) { resetGame(); } else { $('bReset').dataset.sure = 1; $('bReset').textContent = 'בטוחים? כל ההתקדמות תימחק'; } };
}
function showWin() {
  mode = 'win';
  const t = Math.floor(S.time);
  $('overlay').innerHTML = `<div class="panel"><div class="phead"><h2>המגדלור דולק שוב!</h2></div><div class="pbody">
    <p class="lead">מאי קטן אחד בניתם עולם שלם של איים. האור של המגדלור נראה עכשיו מכל הים.</p>
    <div class="stat"><span>זמן</span><span>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</span></div>
    <div class="stat"><span>רמה</span><span>${S.level}</span></div>
    <div class="stat"><span>משאבים שנאספו</span><span>${S.broken}</span></div>
    <button class="go wide" id="bCont">המשיכו לחקור</button>
    <button class="big sec" id="bAgain">משחק חדש</button></div></div>`;
  $('overlay').classList.remove('hidden'); $('overlay').classList.add('center'); $('overlay').onclick = null;
  $('bCont').onclick = () => { closeOverlay(); mode = 'play'; audio.play('ui_click'); };
  $('bAgain').onclick = () => { resetGame(); };
}
function faint() {
  mode = 'faint';
  player.act.Faint?.reset().play(); if (player.act[player.cur] && player.cur !== 'Faint') player.act.Faint.crossFadeFrom(player.act[player.cur], 0.1, false);
  player.cur = 'Faint'; player.lockT = 99;
  audio.play('faint', { duck: 0.3 });
  const lost = Math.floor(S.coins * 0.25);
  setTimeout(() => { $('fade').innerHTML = `התעלפתם…<br>${lost ? `נפלו לכם ${lost} מטבעות. ` : ''}מתעוררים באוהל.`; $('fade').style.opacity = 1; }, 1100);
  setTimeout(() => {
    S.coins -= lost; S.hearts = maxHearts();
    player.pos.copy(spawnPoint()); player.vel.set(0, 0, 0); player.kb = null; player.inv = 2;
    for (const sl of slimes) sl.chase = false;
    player.cur = null; player.lockT = 0; playAnim('Idle', 0);
    camPos.copy(player.pos).add(camOffset());
    updateHUD(true); save();
  }, 2600);
  setTimeout(() => { $('fade').style.opacity = 0; mode = 'play'; }, 3600);
}

// ===================================================================== markers (ring, bar, arrow)
let ring, bar, arrow;
function makeMarkers() {
  ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({ color: '#fff6e2', transparent: true, opacity: 0.7, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 3; ring.visible = false; scene.add(ring);
  bar = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.13), new THREE.MeshBasicMaterial({ color: '#3a2615', depthTest: false, transparent: true, opacity: 0.85 }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.08), new THREE.MeshBasicMaterial({ color: '#8ccf55', depthTest: false, transparent: true }));
  fg.position.z = 0.001; bg.renderOrder = 10; fg.renderOrder = 11;
  bar.add(bg, fg); bar.fg = fg; bar.visible = false; scene.add(bar);
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#fff6e2'; g.strokeStyle = '#3a2615'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(14, 18); g.lineTo(50, 18); g.lineTo(32, 50); g.closePath(); g.stroke(); g.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  arrow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  arrow.scale.set(0.6, 0.6, 1); arrow.renderOrder = 12; arrow.visible = false; scene.add(arrow);
}
let barTarget = null, barT = 0;
function showBar(o, frac, h) { barTarget = o; barT = 2.2; bar.h = h; bar.fg.scale.x = Math.max(0.001, frac); bar.fg.position.x = -0.42 * (1 - frac); bar.fg.material.color.set(frac > 0.5 ? '#8ccf55' : frac > 0.25 ? '#e3a83a' : '#d8433b'); }
function hideBar() { barT = 0; }
function updateMarkers(dt) {
  const t = player.target;
  if (t && mode === 'play') {
    const o = t.o;
    const r = t.kind === 'res' ? o.def.r * o.scale + 0.15 : t.kind === 'slime' ? 0.45 : o === beacon ? 2.4 : 0.7;
    ring.visible = true; ring.position.set(o.pos.x, (o.pos.y ?? 0) + 0.04, o.pos.z);
    ring.scale.setScalar(r * (1 + Math.sin(S.time * 6) * 0.04));
    ring.material.color.set(t.kind === 'ui' ? '#ffd77a' : t.kind === 'slime' ? '#ffb4a8' : '#fff6e2');
  } else ring.visible = false;
  barT -= dt;
  if (barT > 0 && barTarget && !(barTarget.dead) && barTarget.state !== 'dead') {
    bar.visible = true; bar.position.set(barTarget.pos.x, barTarget.pos.y + bar.h, barTarget.pos.z); bar.quaternion.copy(camera.quaternion);
  } else bar.visible = false;
  // guide arrow over the sign that the current goal wants
  let aim = null;
  const want = S.tut === 5 ? 'forest' : S.tut >= D.TUTORIAL.length && S.goal < D.GOALS.length ? { highlands: 'highlands', snow: 'snow', ancient: 'ancient' }[D.GOALS[S.goal].id] : null;
  if (want) { const s = signs.find(s => s.link[1] === want && s.active); if (s && S.coins >= s.price) aim = s.pos.clone().add(new V3(0, 2.55, 0)); }
  if (!aim && S.tut >= D.TUTORIAL.length && D.GOALS[S.goal]?.id === 'beacon' && S.owned.ancient && canAfford(D.BEACON_COST)) aim = beacon.pos.clone().add(new V3(0, 3.6, 0));
  arrow.visible = !!aim && mode === 'play';
  if (aim) arrow.position.copy(aim).add(new V3(0, Math.abs(Math.sin(S.time * 3.5)) * 0.35, 0));
}

// ===================================================================== camera
let zoom = 1;
const camPos = new V3();
let shakeAmt = 0, freeze = 0;
function camOffset() { const portrait = innerHeight > innerWidth; const f = zoom * (portrait ? 1.22 : 0.92); return new V3(0, 9.4 * f, 8.8 * f); }
function shake(a) { shakeAmt = Math.min(0.6, shakeAmt + a); }
function hitStop(t) { freeze = Math.max(freeze, t); }
function updateCamera(dt) {
  if (mode === 'title') {
    const a = S.time * 0.07, I = islands.list.home;
    camera.position.set(I.cx + Math.sin(a) * 17, 8.5, I.cz + Math.cos(a) * 17 - 3);
    camera.lookAt(I.cx, 0.5, I.cz - 3);
    return;
  }
  const focus = mode === 'cutscene' && beacon ? beacon.pos.clone().lerp(player.pos, 0.25).add(new V3(0, 1.2, 0)) : null;
  const look = focus || player.pos.clone().add(new V3(player.vel.x * 0.25, 0.6, player.vel.z * 0.25));
  const want = look.clone().add(camOffset().multiplyScalar(focus ? 1.35 : 1));
  camPos.lerp(want, 1 - Math.exp(-dt * (focus ? 1.6 : 5)));
  camera.position.copy(camPos);
  if (shakeAmt > 0.001) { camera.position.x += (Math.random() - 0.5) * shakeAmt * 0.5; camera.position.y += (Math.random() - 0.5) * shakeAmt * 0.4; shakeAmt *= Math.exp(-dt * 12); }
  const k = focus ? 1.35 : 1;
  camera.lookAt(camPos.x, camPos.y - camOffset().y * k + (focus ? 1.8 : 0.6), camPos.z - camOffset().z * k);
}

// ===================================================================== spawning loop, ambience, furnace
let respawnT = 3, slimeT = 8;
function updateWorld(dt) {
  respawnT -= dt; slimeT -= dt;
  if (respawnT <= 0) {
    respawnT = 4.5;
    const owned = Object.keys(S.owned).filter(k => S.owned[k]);
    const iname = owned[Math.floor(Math.random() * owned.length)];
    for (const [kind, n] of D.ISLANDS[iname].spawn) {
      const have = resources.filter(r => r.island === iname && r.kind === kind && r.state !== 'dead').length;
      if (have < n) { spawnResource(kind, iname, true); break; }
    }
    // tidy dead
    for (let i = resources.length - 1; i >= 0; i--) if (resources[i].state === 'dead' && !resources[i].obj.parent) resources.splice(i, 1);
  }
  if (slimeT <= 0) {
    slimeT = 14;
    for (const [iname, d] of Object.entries(D.ISLANDS)) {
      if (!S.owned[iname] || !d.slimes) continue;
      const have = slimes.filter(s => s.island === iname && !s.dead).length;
      if (have < d.slimes) { spawnSlime(iname, d.slimeKind); break; }
    }
  }
  for (const r of resources) {
    if (r.pop < 1) { r.pop = Math.min(1, r.pop + dt * 2.6); r.obj.scale.setScalar(r.scale * easeBack(r.pop)); }
    if (r.wob > 0) { r.wob = Math.max(0, r.wob - dt); const w = Math.sin(r.wob * 50) * r.wob * 0.25; r.obj.scale.set(r.scale * (1 + w), r.scale * (1 - w), r.scale * (1 + w)); }
    if (r.state === 'empty' && S.time > r.regrowAt) { r.state = 'alive'; if (r.berries) { r.berries.visible = true; r.wob = 0.3; } }
    if (r.state === 'falling') {
      r.fallT += dt;
      if (r.fallT > 1.35 && !r.landed) {
        r.landed = true; shake(0.22);
        const top = r.pos.clone().addScaledVector(r.fallDir, 2.2 * r.scale).add(new V3(0, 0.3, 0));
        fx.emit('puff', top, 10, { colors: ['#e8dcc6', '#d6cab2'], size: 1.0, speed: 2, up: 0.6, gravity: -0.2, life: 1.0, opacity: 0.8 });
        fx.emit('chip', top, 10, { colors: r.kind === 'snowpine' ? ['#f2f5fa'] : ['#4e8a2c', '#6aa83a'], size: 0.16, speed: 2.5, up: 2.5, gravity: 8 });
        dropItems(r.drops, r.pos.clone().addScaledVector(r.fallDir, 1.3).add(new V3(0, 0.5, 0)));
      }
      if (r.fallT > 2.1) { const k = clamp((r.fallT - 2.1) / 0.45, 0, 1); r.obj.scale.setScalar(r.scale * (1 - k)); r.obj.position.y = r.pos.y - k * 0.3; }
      if (r.fallT > 2.6) { r.state = 'dead'; scene.remove(r.obj); }
    }
    if (r.mats) {   // fade trees standing between the camera and the hero
      const dz = r.pos.z - player.pos.z, dx = Math.abs(r.pos.x - player.pos.x);
      const occ = mode !== 'title' && dz > 0.3 && dz < 5.5 && dx < 1.5 + dz * 0.15;
      const want = occ ? 0.32 : 1;
      if (Math.abs(r.fade - want) > 0.01) { r.fade += (want - r.fade) * Math.min(1, dt * 8); for (const m of r.mats) { m.opacity = r.fade; m.depthWrite = r.fade > 0.95; } }
    }
    if (r.mixer) {
      const d2 = (r.pos.x - player.pos.x) ** 2 + (r.pos.z - player.pos.z) ** 2;
      if (d2 < 26 * 26 || r.state === 'falling') r.mixer.update(dt);
    }
  }
  for (const s of signs) if (s.shakeT > 0) { s.shakeT -= dt; s.obj.rotation.z = Math.sin(s.shakeT * 50) * s.shakeT * 0.3; } else if (s.obj.rotation.z) s.obj.rotation.z = 0;
  for (const s of signs) if (s.label.visible) s.label.position.y = s.pos.y + 1.75 + Math.sin(S.time * 2 + s.pos.x) * 0.05;
  for (const b of ['workbench', 'furnace']) { const st = structures[b]; if (st.popT !== undefined && st.popT < 1) { st.popT = Math.min(1, st.popT + dt * 2.5); st.obj.scale.setScalar(easeBack(st.popT)); } }
  for (const br of Object.values(bridges)) if (br.built && br.mixer) br.mixer.update(dt);
  for (const c of chests) c.mixer?.update(dt);
  structures.windmill.mixer?.update(dt);
  beacon.mixer?.update(dt);
  if (beam) beam.material.uniforms.t.value = S.time;
  // furnace fire
  const F = structures.furnace;
  if (S.built.furnace) {
    F.light.intensity = 2.2 + Math.sin(S.time * 13) * 0.3 + Math.sin(S.time * 7.3) * 0.4 + Math.random() * 0.2;
    F.smokeT = (F.smokeT || 0) - dt;
    if (F.smokeT <= 0) { F.smokeT = 0.35; fx.emit('puff', F.pos.clone().add(new V3(0, 1.85, 0)), 1, { colors: ['#bdb4a6', '#a39a8c'], size: 0.5, endSize: 1.4, speed: 0.3, up: 1.1, gravity: -0.4, life: 2.2, opacity: 0.55, drag: 0.4 }); }
    if (Math.random() < dt * 3) fx.emit('star', F.light.position.clone(), 1, { colors: ['#ffb35a', '#ffd77a'], size: 0.08, speed: 0.5, up: 1.4, gravity: -0.5, life: 0.9 });
  }
}
function startFurnace() { if (!structures.furnace.emitter) structures.furnace.emitter = audio.emitter('furnace_loop', structures.furnace.pos, 1); }
function smokeBurst() { const F = structures.furnace; fx.emit('puff', F.pos.clone().add(new V3(0, 1.8, 0)), 6, { colors: ['#bdb4a6'], size: 0.8, endSize: 1.6, up: 1.5, gravity: -0.5, life: 1.6, opacity: 0.6 }); }
function easeBack(t) { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

let musicHold = 0;
function updateAudio(dt, danger) {
  if (!audio.ready) return;
  audio.setListener(player.pos.clone().add(new V3(0, 3, 2)), new V3(0, -0.4, -1).normalize());
  const w = { amb_meadow: 0, amb_forest: 0, amb_snow: 0, amb_ancient: 0, amb_sea: 0.55 };
  let minEdge = 99;
  for (const I of Object.values(islands.list)) {
    const d = Math.hypot(player.pos.x - I.cx, player.pos.z - I.cz);
    const k = clamp(1 - (d - I.R * 0.6) / 10, 0, 1);
    const amb = D.ISLANDS[I.name].amb; w[amb] = Math.max(w[amb], k);
    minEdge = Math.min(minEdge, Math.abs(d - I.R));
  }
  w.amb_sea = clamp(0.45 + (minEdge < 3 ? 0.4 * (1 - minEdge / 3) : 0), 0, 1);
  audio.setAmbience(w);
  if (mode === 'win' || mode === 'cutscene') return;
  if (danger) musicHold = 4; else musicHold -= dt;
  audio.setMusic(musicHold > 0 ? 'music_danger' : 'music_explore');
}

// ===================================================================== input
function setupInput() {
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (mode === 'title' && (k === 'enter' || k === ' ')) { $('bPlay').click(); return; }
    const code = e.code;
    const key = code === 'KeyW' ? 'w' : code === 'KeyA' ? 'a' : code === 'KeyS' ? 's' : code === 'KeyD' ? 'd' : k;
    input.keys.add(key);
    if (k === ' ' || code === 'KeyJ' || code === 'KeyK' || k === 'enter') { input.actHeld = true; doAction(); }
    if (code === 'KeyE' || k === 'tab') { e.preventDefault(); if (mode === 'menu') { closeOverlay(); audio.play('ui_close'); } else openCraft(); }
    if (code === 'KeyQ') eat();
    if (code === 'KeyM') { S.vol.muted = !S.vol.muted; audio.vol = S.vol; audio.applyVolumes(); save(); }
    if (k === 'escape') { if (mode === 'menu' && !$('overlay').querySelector('[data-perk]')) { closeOverlay(); audio.play('ui_close'); } else openPause(); }
  });
  addEventListener('keyup', (e) => {
    const code = e.code, k = e.key.toLowerCase();
    const key = code === 'KeyW' ? 'w' : code === 'KeyA' ? 'a' : code === 'KeyS' ? 's' : code === 'KeyD' ? 'd' : k;
    input.keys.delete(key);
    if (k === ' ' || code === 'KeyJ' || code === 'KeyK' || k === 'enter') input.actHeld = false;
  });
  addEventListener('blur', () => { input.keys.clear(); input.actHeld = false; });
  addEventListener('wheel', (e) => { zoom = clamp(zoom + Math.sign(e.deltaY) * 0.08, 0.7, 1.35); }, { passive: true });
  // joystick: always visible at its rest spot; jumps to wherever the thumb lands in the left zone
  const zone = $('stickZone'), stick = $('stick'), knob = $('knob');
  let sid = null, ox = 0, oy = 0;
  const rest = () => { stick.style.left = ''; stick.style.bottom = ''; stick.classList.remove('on'); knob.style.transform = 'translate(0,0)'; };
  zone.addEventListener('pointerdown', (e) => {
    if (sid !== null) return; sid = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or lost pointer */ }
    const r = zone.getBoundingClientRect();
    ox = e.clientX; oy = e.clientY;
    stick.style.left = (ox - r.left) + 'px'; stick.style.bottom = (r.bottom - oy) + 'px'; stick.classList.add('on');
    knob.style.transform = 'translate(0,0)';
    if (S.tut === 0) $('stickHint').classList.add('hidden');
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== sid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy), R = 52;
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.min(1, d / R), dead = 0.12;
    const mm = m < dead ? 0 : (m - dead) / (1 - dead);
    input.x = d ? (dx / Math.min(d, R)) * mm * Math.min(1, d / R) / Math.max(m, 1e-6) : 0;
    input.z = d ? (dy / Math.min(d, R)) * mm * Math.min(1, d / R) / Math.max(m, 1e-6) : 0;
  });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; input.x = input.z = 0; rest(); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  // pinch to zoom (two fingers on the world)
  const pts = new Map(); let pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = zoom; } });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pinch0 > 0) { const [a, b] = [...pts.values()]; zoom = clamp(zoom0 * pinch0 / Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])), 0.7, 1.35); }
  });
  const pend = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
  canvas.addEventListener('pointerup', pend); canvas.addEventListener('pointercancel', pend);
  addEventListener('contextmenu', (e) => e.preventDefault());
  $('quest').onclick = () => { $('quest').classList.toggle('open'); questOpenT = $('quest').classList.contains('open') ? 8 : 0; audio.play('ui_click', { vol: 0.6 }); };
  // buttons
  const hold = (el, down, up) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('down'); down(); });
    const u = () => { el.classList.remove('down'); up?.(); };
    el.addEventListener('pointerup', u); el.addEventListener('pointerleave', u); el.addEventListener('pointercancel', u);
  };
  hold($('bAct'), () => { input.actHeld = true; doAction(); }, () => { input.actHeld = false; });
  hold($('bCraft'), () => openCraft());
  hold($('bEat'), () => eat());
  $('bPause').onclick = () => openPause();
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); audio.suspend(); } else if (mode !== 'title') audio.resume(); });
  addEventListener('resize', onResize);
  // keep the quest chip just under the status card, whatever its height (inventory row comes and goes)
  const card = $('card');
  const setH = () => document.documentElement.style.setProperty('--cardh', card.offsetHeight + 'px');
  if (window.ResizeObserver) new ResizeObserver(setH).observe(card); setH();
}
function eat() {
  if (mode !== 'play' || !(S.inv.berry > 0) || S.hearts >= maxHearts()) return;
  S.inv.berry--; S.hearts++;
  audio.play('eat'); fx.emit('chip', player.pos.clone().add(new V3(0, 0.75, 0.2)), 5, { colors: ['#b8202f', '#e0605a'], size: 0.1, speed: 1.2, up: 1.5, gravity: 6 });
  updateHUD(true); save();
}
const ACT_ICONS = {
  pick: '<svg viewBox="0 0 48 48" fill="none"><path d="M9 15c8-8 21-9 31-3-7-1-13 0-18 4z" fill="#fff8e6"/><path d="M21 17l16 25" stroke="#fff8e6" stroke-width="5" stroke-linecap="round"/></svg>',
  axe: '<svg viewBox="0 0 48 48" fill="none"><path d="M14 8l24 34" stroke="#fff8e6" stroke-width="5" stroke-linecap="round"/><path d="M17 12c-6-1-11 2-12 8 5 2 11 1 15-3z" fill="#fff8e6"/></svg>',
  berry: '<svg viewBox="0 0 48 48"><circle cx="17" cy="29" r="9" fill="#fff8e6"/><circle cx="31" cy="29" r="9" fill="#fff8e6"/><circle cx="24" cy="17" r="8" fill="#fff8e6"/><path d="M24 10c2-4 6-5 9-4-2 3-5 4-9 4z" fill="#cfe9a5"/></svg>',
  coin: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="#fff8e6"/><circle cx="24" cy="24" r="11" fill="none" stroke="#c98d22" stroke-width="3"/><path d="M24 16l2.4 5 5.4.6-4 3.7 1.1 5.3L24 28l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" fill="#c98d22"/></svg>',
  chest: '<svg viewBox="0 0 48 48"><path d="M8 22h32v16H8z" fill="#fff8e6"/><path d="M8 22c0-8 6-12 16-12s16 4 16 12z" fill="#fff8e6" opacity=".85"/><rect x="21" y="20" width="6" height="8" rx="1.5" fill="#2f7f9c"/></svg>',
  spark: '<svg viewBox="0 0 48 48"><path d="M24 4l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="#fff8e6"/></svg>',
  hammer: '<svg viewBox="0 0 48 48" fill="none"><rect x="7" y="9" width="21" height="11" rx="3" fill="#fff8e6" transform="rotate(-35 17 14)"/><path d="M21 19l17 19" stroke="#fff8e6" stroke-width="6" stroke-linecap="round"/></svg>',
};
let actKey = '';
function setAct(icon, label, cls) {
  const key = icon + label + cls;
  if (key === actKey) return; actKey = key;
  $('actIco').innerHTML = ACT_ICONS[icon]; $('actLbl').textContent = label;
  const b = $('bAct'); b.classList.toggle('gold', cls === 'gold'); b.classList.toggle('ui', cls === 'ui');
}
function updatePrompt() {
  const t = player.target, p = $('prompt');
  let txt = null;
  if (t && mode === 'play') {
    const o = t.o;
    if (t.kind === 'ui') {
      if (signs.includes(o)) { txt = `${D.ISLANDS[o.link[1]].he}: ${o.price} מטבעות`; setAct('coin', S.coins >= o.price ? 'קנו' : `${o.price}`, 'gold'); }
      else if (chests.includes(o)) { txt = 'תיבת אוצר'; setAct('chest', 'פתחו', 'ui'); }
      else if (o === beacon) { txt = 'המגדלור העתיק'; setAct('spark', 'תקנו', 'gold'); }
      else if (o === structures.workbench) { txt = 'שולחן עבודה'; setAct('hammer', 'מלאכה', 'ui'); }
      else if (o === structures.furnace) { txt = 'כבשן'; setAct('hammer', 'כבשן', 'ui'); }
    } else if (t.kind === 'slime') setAct('pick', 'הכו', '');
    else if (t.kind === 'res') {
      const k = o.def.kind;
      if (o.def.minTier > S.tier) { txt = 'צריך מכוש ברזל'; }
      setAct(k === 'tree' ? 'axe' : k === 'bush' ? 'berry' : 'pick', k === 'tree' ? 'חטבו' : k === 'bush' ? 'קטפו' : 'כרו', '');
    }
  } else setAct('pick', 'הכו', '');
  if (txt) { if (p.textContent !== txt) p.textContent = txt; p.classList.remove('hidden'); } else p.classList.add('hidden');
}

// ===================================================================== icons (rendered from the Blender item models)
function renderIcons() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
  const sc = new THREE.Scene();
  sc.environment = scene.environment; sc.environmentIntensity = 0.8;
  sc.add(new THREE.HemisphereLight('#ffffff', '#8a7a60', 1.4));
  const dl = new THREE.DirectionalLight('#fff1d6', 2.4); dl.position.set(-2, 3, 4); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const shot = (obj, key, tilt = 0.45) => {
    sc.add(obj);
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new V3()), s = box.getSize(new V3()).length();
    cam.position.copy(c).add(new V3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(s * 1.55));
    cam.lookAt(c); r.render(sc, cam); icons[key] = cv.toDataURL('image/png'); sc.remove(obj);
  };
  for (const [k, v] of Object.entries(D.ITEMS)) { const m = Assets.mesh('items', v.mesh); if (m) { const o = new THREE.Group(); o.add(m.clone()); o.rotation.set(0, k === 'coin' ? 0 : 0.6, 0); shot(o, k, k === 'coin' ? 0.1 : 0.5); } }
  const hero = Assets.gltf.hero?.scene;
  const pick = (name) => { let f = null; hero?.traverse(o => { if (o.name === name && o.isMesh) f = o; }); return f; };
  for (const [key, nm] of [['pickIron', 'Pick_Iron'], ['pickGold', 'Pick_Gold']]) { const m = pick(nm); if (m) { const o = new THREE.Group(); const c = m.clone(); c.position.set(0, 0, 0); c.quaternion.identity(); o.add(c); o.rotation.set(0.3, 0.6, 0.9); shot(o, key, 0.2); } }
  for (const k of ['workbench', 'furnace']) { const g = Assets.gltf[k]?.scene; if (g) shot(g.clone(), k, 0.55); }
  r.dispose();
  $('coinIcon').src = icons.coin || '';
}

// ===================================================================== main loop
function onResize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowQ ? 1.25 : isTouch ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  const card = $('card'); if (card) document.documentElement.style.setProperty('--cardh', card.offsetHeight + 'px');
  camera.aspect = innerWidth / innerHeight; camera.fov = innerHeight > innerWidth ? 50 : innerHeight < 540 ? 47 : 42; camera.updateProjectionMatrix();
}
let fpsAcc = 0, fpsN = 0, lowQ = false;
function loop() {
  requestAnimationFrame(loop);
  let dt = Math.min(clock.getDelta(), 0.05);
  const rawDt = dt;
  // adaptive resolution on slow devices
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 3) { const fps = fpsN / fpsAcc; if (fps < 40 && !lowQ) { lowQ = true; renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); } fpsAcc = 0; fpsN = 0; }
  S.time += upright.matches && mode !== 'title' ? 0 : mode === 'play' ? dt : dt * (mode === 'title' ? 1 : 0.0);
  windTime.value += dt;
  if (water) water.material.uniforms.t.value += dt;
  if (!islands) { renderer.render(scene, camera); return; }
  let danger = false;
  if (freeze > 0) { freeze -= dt; dt = 0.0; }
  if (upright.matches && mode !== 'title') { dt = 0; input.x = input.z = 0; input.actHeld = false; }
  if (mode === 'play' || mode === 'faint' || mode === 'cutscene' || mode === 'win' || mode === 'title') {
    updatePlayer(dt);
    player.target = mode === 'play' ? findTarget() : null;
    danger = updateSlimes(dt);
    updateItems(dt);
    updateWorld(dt);
    player.mixer.update(dt);
    for (const sl of slimes) sl.mixer.update(dt);
    if (mode === 'play') { checkTutorial(); checkGoals(); maybePerk(); }
  }
  if (player.celebrateT > 0) { player.celebrateT -= dt; if (player.celebrateT <= 0) playAnim('Idle', 0.2); }
  fx.update(dt);
  updateMarkers(dt);
  updatePrompt();
  if (questOpenT > 0) { questOpenT -= rawDt; if (questOpenT <= 0) $('quest').classList.remove('open'); }
  updateCamera(rawDt);
  sun.position.copy(player.pos).add(new V3(-9, 18, 7)); sun.target.position.copy(player.pos);
  updateAudio(dt, danger);
  if ((saveT -= dt) < 0) { saveT = 10; if (mode === 'play') save(); }
  renderer.render(scene, camera);
}
let saveT = 10;

// ===================================================================== boot
async function boot() {
  onResize();
  const hasSave = loadSave();
  camera.position.set(0, 12, 18); camera.lookAt(0, 0, 0);
  requestAnimationFrame(loop);
  const audioLoad = audio.preload();
  const names = ['hero', 'slime', 'frostslime', 'oak', 'pine', 'snowpine', 'rock', 'ironrock', 'goldrock', 'crystal', 'bush', 'items', 'decor',
    'workbench', 'furnace', 'tent', 'sign', 'chest', 'windmill', 'bridge', 'beacon',
    'island_home', 'island_forest', 'island_highlands', 'island_snow', 'island_ancient'];
  await Assets.load(names, (p) => { $('loadfill').style.width = (p * 100).toFixed(0) + '%'; });
  buildWorld();
  initPlayer();
  renderIcons();
  setupInput();
  updateHUD(true);
  $('loadtxt').classList.add('hidden'); $('loadbar').classList.add('hidden');
  $('tbtns').classList.remove('hidden');
  if (hasSave && (S.tut > 0 || S.coins > 0 || S.level > 1)) { $('bPlay').textContent = 'המשיכו'; $('bNew').classList.remove('hidden'); }
  $('bNew').onclick = () => { resetGame(); };
  $('bPlay').onclick = async () => {
    $('bPlay').disabled = true;
    if (isTouch) {   // best effort: full screen + lock sideways (browsers that refuse just keep the rotate screen)
      try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { /* refused */ }
      try { await screen.orientation?.lock?.('landscape'); } catch (e) { /* refused */ }
    }
    await audioLoad; audio.vol = S.vol;
    try { await audio.unlock(); } catch (e) { console.warn(e); }
    audio.play('ui_click');
    $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); $('controls').classList.remove('hidden');
    if (!isTouch) $('keys').classList.remove('hidden');
    mode = 'play'; camPos.copy(player.pos).add(camOffset());
    audio.setMusic('music_explore', 3);
    if (S.built.furnace) startFurnace();
    structures.windmill.emitter = audio.emitter('windmill_loop', structures.windmill.pos.clone().add(new V3(0, 2.5, 0)), 1);
    for (const [iname, d] of Object.entries(D.ISLANDS)) if (S.owned[iname] && d.slimes) for (let i = 0; i < d.slimes; i++) spawnSlime(iname, d.slimeKind);
    if (S.tut === 0) banner('אי אחרי אי', 'הרפתקה מתחילה מאי אחד קטן');
  };
  window.__game = { Assets, renderer, audio, icons, S, player, resources, slimes, items, signs, chests, bridges, beacon: () => beacon, islands: () => islands, mode: () => mode, setMode: (m) => mode = m, collect, gainXP, buyLand, repairBeacon, craft, D };
}
boot();
