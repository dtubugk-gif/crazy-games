// מלאכים נגד שדים - main: boot, title, face scan + verdict, the battle (waves, upgrades, boss), HUD, input, camera.
import * as THREE from 'three';
import { Assets, COMMON, SIDE_MODELS } from './assets.js?v=6';
import { makeRenderer, makeScene, buildArena, updateWorld, ARENA } from './world.js?v=6';
import { FX, C } from './fx.js?v=6';
import { Player, Enemy, Shot, Orb, makeModel, animName } from './actors.js?v=6';
import { SIDES, WAVES, UPGRADES, CREDITS, FORMS, EVO_WAVES, EVO_XP, XP_GAIN } from './roster.js?v=6';
import { EvoPlayer } from './evolve.js?v=6';
import { FaceScan, paintVerdict, portrait } from './scan.js?v=6';
import { Audio } from './audio.js?v=6';

const DEDICATION = 'המשחק מוקדש לישי'; // the follower who asked for the game
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const isPC = matchMedia('(hover:hover) and (pointer:fine)').matches;
const SAVE_KEY = 'angels-vs-demons-v1';

function loadSave() {
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
  return Object.assign({ last: null, pct: 50, wins: { angel: 0, demon: 0 }, best: {}, vol: { music: .8, sfx: .85, muted: false }, help: false }, s || {});
}
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { } }

// ================================================================ input
class Input {
  constructor() {
    this.keys = new Set(); this.prev = new Set();
    this.btn = { atk: false, shot: false, dash: false, spec: false }; this.btnPrev = { ...this.btn };
    this.stick = { x: 0, y: 0, id: null };
    addEventListener('keydown', e => { this.keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); for (const k in this.btn) this.btn[k] = false; this.stick.x = this.stick.y = 0; });
    const zone = $('stickZone'), stick = $('stick'), knob = $('knob'), R = 50;
    let home = null;
    const move = (e) => {
      const cx = home.x, cy = home.y;
      let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick.x = clamp(dx / (R * .8), -1, 1); this.stick.y = clamp(-dy / (R * .8), -1, 1);
    };
    zone.addEventListener('pointerdown', e => {
      if (this.stick.id != null) return; this.stick.id = e.pointerId; zone.setPointerCapture(e.pointerId);
      const r = stick.getBoundingClientRect(); home = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      // floating stick: if the thumb lands away from it, the stick comes to the thumb
      if (Math.hypot(e.clientX - home.x, e.clientY - home.y) > R * 1.3) { stick.style.transform = `translate(${e.clientX - home.x}px, ${e.clientY - home.y}px)`; home = { x: e.clientX, y: e.clientY }; }
      stick.classList.add('on'); move(e); window.__audioUnlock?.();
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === this.stick.id) move(e); });
    const end = e => { if (e.pointerId !== this.stick.id) return; this.stick.id = null; this.stick.x = this.stick.y = 0; knob.style.transform = ''; stick.style.transform = ''; stick.classList.remove('on'); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
    const bind = (id, key) => {
      const el = $(id);
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); this.btn[key] = true; el.classList.add('down'); window.__audioUnlock?.(); });
      const up = () => { this.btn[key] = false; el.classList.remove('down'); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    };
    bind('bAtk', 'atk'); bind('bShot', 'shot'); bind('bDash', 'dash'); bind('bSpec', 'spec');
  }
  k(...c) { return c.some(x => this.keys.has(x)); }
  kp(...c) { return c.some(x => this.keys.has(x) && !this.prev.has(x)); }
  read() {
    const b = this.btn, p = this.btnPrev;
    let x = this.stick.x, y = this.stick.y;
    const L = this.k('ArrowLeft', 'KeyA'), Rr = this.k('ArrowRight', 'KeyD'), U = this.k('ArrowUp', 'KeyW'), D = this.k('ArrowDown', 'KeyS');
    if (L || Rr) x = (Rr ? 1 : 0) - (L ? 1 : 0); if (U || D) y = (U ? 1 : 0) - (D ? 1 : 0);
    const o = {
      x: Math.abs(x) < .12 ? 0 : x, y: Math.abs(y) < .12 ? 0 : y,
      attack: (b.atk && !p.atk) || this.kp('KeyJ', 'KeyZ'),
      shoot: b.shot || this.k('KeyK', 'KeyX'),
      dash: (b.dash && !p.dash) || this.kp('KeyL', 'ShiftLeft', 'ShiftRight', 'Space'),
      special: (b.spec && !p.spec) || this.kp('KeyI', 'KeyC'),
      pause: this.kp('Escape', 'KeyP'),
    };
    this.prev = new Set(this.keys); this.btnPrev = { ...b };
    return o;
  }
}

// ================================================================ game
class Game {
  constructor() {
    this.save = loadSave();
    this.canvas = $('c');
    this.renderer = makeRenderer(this.canvas);
    this.env = makeScene(this.renderer); this.scene = this.env.scene;
    // the title has its own little scene: a painted sky behind the two real 3D heroes
    this.titleScene = new THREE.Scene(); this.titleScene.environment = this.scene.environment; this.titleScene.environmentIntensity = .75;
    this.titleBg = new THREE.TextureLoader().load('ui/bg_title3d.webp', () => this.fitTitleBg()); this.titleBg.colorSpace = THREE.SRGBColorSpace;
    this.titleScene.background = this.titleBg;
    { const T = this.titleScene;
      T.add(new THREE.HemisphereLight(0xfff0dc, 0x5a2a1a, 1.2));
      const key = new THREE.DirectionalLight(0xffe6b8, 2.6); key.position.set(-9, 9, 10); T.add(key);   // heaven sun from the left
      const fire = new THREE.DirectionalLight(0xff6a2a, 1.8); fire.position.set(10, 1, 6); T.add(fire);  // lava glow from the right
      const rim = new THREE.DirectionalLight(0xfff0dc, 2.4); rim.position.set(0, 7, -10); T.add(rim); }
    this.camera = new THREE.PerspectiveCamera(38, 2, .1, 900);
    this.camera.position.set(0, 6, 15.5);
    this.fx = new FX(this.scene, this.camera);
    this.audio = new Audio(); this.audio.vol = this.save.vol;
    this.input = new Input();
    this.enemies = []; this.allies = []; this.shots = []; this.orbs = []; this.timers = []; this.showcase = [];
    this.lowEnd = this.renderer.userData.lowEnd;
    this.t = 0; this.state = 'boot'; this.paused = false; this.stopT = 0; this.slowT = 0; this.slowS = 1; this.shakeA = 0;
    this.cam = { x: 0, y: 6, z: 15.5, lx: 0, ly: 5.8, fov: 38 }; this.camGoal = { ...this.cam };
    this.side = SIDES.angel; this.foe = SIDES.demon; this.mode = 'army';
    this.verdict = null; this.portraitURL = null; this.paintedPhoto = null;
    addEventListener('resize', () => this.resize()); this.resize();
    window.__audioUnlock = () => this.unlockAudio();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.audio.suspend(); if (this.state === 'battle' && !this.paused) this.pause(true); } else this.audio.resume(); });
    window.__game = this;
    this.boot();
  }
  /** cover-fit the painted title sky to the screen shape */
  fitTitleBg() {
    const t = this.titleBg; if (!t || !t.image) return;
    const ia = t.image.width / t.image.height, a = this.camera.aspect;
    if (a > ia) { t.repeat.set(1, ia / a); t.offset.set(0, (1 - ia / a) / 2); } else { t.repeat.set(a / ia, 1); t.offset.set((1 - a / ia) / 2, 0); }
  }
  resize() {
    const w = innerWidth || screen.width, h = innerHeight || screen.height;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.fitTitleBg?.();
    this.fx.setScale(h * this.renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)));
  }
  async unlockAudio() { if (this.audio.ready) { this.audio.resume(); return; } await this.audio.unlock(); this.music(this.state === 'title' ? 'music_title' : null); }
  music(n) { this.audio.setMusic(n); }
  sfx(name, x, y, o = {}) { this.audio.play(name, { pos: x != null ? { x, y: y ?? 5, z: 0 } : null, vol: o.vol, pitch: o.rate, minGap: o.gap }); }
  after(sec, fn) { this.timers.push({ t: this.t + sec, fn }); }

  // ---------------------------------------------------------------- boot + title
  async boot() {
    if (DEDICATION) { $('dedic').textContent = DEDICATION + ' ❤'; $('dedic').classList.remove('hidden'); }
    this.audio.preload();
    this.renderer.setAnimationLoop(() => this.frame());
    await Assets.load(COMMON, f => { $('loadfill').style.width = (f * 100).toFixed(0) + '%'; });
    buildArena(this.env);
    this.toTitle(true);
    $('loadwrap').classList.add('hidden'); $('tbtns').classList.remove('hidden');
    this.wireUI();
    // start loading both enemy sets quietly in the background so the fight starts fast after the scan
    setTimeout(() => { Assets.load(SIDE_MODELS.demon); Assets.load(SIDE_MODELS.angel); }, 600);
  }
  toTitle(first) {
    this.clearBattle();
    this.state = 'title';
    for (const id of ['hud', 'controls', 'scan', 'verdict', 'overlay']) $(id).classList.add('hidden');
    $('title').classList.remove('hidden');
    if (this.save.last) { $('bAgain').classList.remove('hidden'); $('lastSide').textContent = SIDES[this.save.last].name; } else $('bAgain').classList.add('hidden');
    // showcase: the two heroes face each other in the middle of the sky
    for (const s of this.showcase) this.titleScene.remove(s.m.root); this.showcase = [];
    const mk = (name, x, face) => { const m = makeModel(name, 1.9); m.root.position.set(x, 4.0, 2); m.turn.rotation.y = face * 1.1; this.titleScene.add(m.root); const a = animName(m.anim, 'idle'); if (a) m.anim.play(a); this.showcase.push({ m, x, face, ph: rnd(0, 6) }); };
    mk('angel_hero', -6.4, 1); mk('demon_hero', 6.4, -1);
    this.camGoal = { x: 0, y: 5, z: 12, lx: 0, ly: 4.8, fov: 38 };
    if (first) Object.assign(this.cam, this.camGoal);
    this.env.skyU.uBias.value = 0;
    this.music('music_title'); this.audio.setAmbience({ amb_heaven: .5, amb_hell: .5, amb_scan: 0 });
  }
  wireUI() {
    const click = (id, fn) => $(id).addEventListener('click', e => { this.unlockAudio(); this.sfx('ui_click'); fn(e); });
    click('bStart', () => this.openScan());
    click('bAgain', () => { this.verdict = { side: this.save.last, pctAngel: this.save.pct, finger: true }; this.portraitURL = null; this.paintedPhoto = null; this.chooseMode(); });
    click('bHelp', () => this.showHelp());
    click('bCred', () => this.showCredits());
    click('bSound', () => this.toggleMute());
    click('scanBack', () => { this.scan?.stop(); this.toTitle(); });
    click('bSnap', () => this.snap());
    click('bNoCam', () => this.fingerScan());
    click('bFight', () => this.startBattle('army'));
    click('bEvo', () => this.startBattle('evo'));
    click('bPause', () => this.pause(true));
    this.soundIcon();
  }
  toggleMute() { this.save.vol.muted = !this.save.vol.muted; this.audio.applyVolumes(); writeSave(this.save); this.soundIcon(); }
  soundIcon() { $('soundImg').src = `ui/ic/${this.save.vol.muted ? 'ui_mute' : 'ui_sound'}.webp`; }
  overlay(html) { const o = $('overlay'); o.innerHTML = `<div class="card panel">${html}</div>`; o.classList.remove('hidden'); return o; }
  closeOverlay() { $('overlay').classList.add('hidden'); $('overlay').innerHTML = ''; }
  showHelp(then) {
    const o = this.overlay(`<h2>איך משחקים</h2>
      <p>סורק הנשמות מצלם את הפנים שלכם ומגלה אם אתם <b style="color:#ffe39a">מלאך</b> או <b style="color:#ff9a66">שד</b>. מלאך נלחם בשדים, שד נלחם במלאכים - ו<b>צבא שלם</b> מהצד שלכם נלחם איתכם! לוחמים שנופלים מוחלפים בתגבורת בכל גל.</p>
      <p><b>מצב התפתחות</b>: לבד נגד כל סוגי האויבים. מתחילים כקטן והחלש ביותר, וכל אויב שמנצחים נותן כוח. כשמד הכוח מתמלא מתפתחים לצורה גדולה וחזקה יותר - ולכל צורה יש התקפות משלה.</p>
      <div class="help">
        <div><b>תעופה</b><br>${isPC ? 'WASD או החצים' : 'הג׳ויסטיק ביד שמאל'}</div>
        <div><b>התקפה</b> (קומבו של 3)<br>${isPC ? 'J או Z' : 'הכפתור הגדול'}</div>
        <div><b>זריקה</b> (מכוונת לבד)<br>${isPC ? 'K או X (להחזיק)' : 'כפתור הזריקה (להחזיק)'}</div>
        <div><b>דאש</b> - חמיקה מהירה, בלי נזק<br>${isPC ? 'Shift / רווח / L' : 'כפתור הדאש'}</div>
        <div><b>כוח מיוחד</b> - מתמלא כשפוגעים<br>${isPC ? 'I או C' : 'הכוכב, כשהוא זוהר'}</div>
        <div><b>6 גלים</b>: אחרי כל גל בוחרים שדרוג. בגל 5 האלוף, בגל 6 הבוס.</div>
      </div>
      <div class="row"><button class="big" id="hOk"><img class="bi" src="ui/ic/ui_play.webp" alt="" draggable="false"><span class="bt">הבנתי</span></button></div>`);
    o.querySelector('#hOk').onclick = () => { this.sfx('ui_click'); this.closeOverlay(); this.save.help = true; writeSave(this.save); then?.(); };
  }
  showCredits() {
    const rows = CREDITS.map(([t, a, u, role]) => `<div>• <b>${role}</b>: "${t}" מאת ${a} - <a href="${u}" target="_blank" rel="noopener">Sketchfab</a>, רישיון CC-BY 4.0 (הוקטן, קיבל שלד, כנפיים ואנימציות בבלנדר)</div>`).join('');
    const o = this.overlay(`<h2>קרדיטים</h2><div class="creds">
      <div>משחק מקורי שנבנה לערוץ "משחקים מטורפים".</div>
      <div>המלאכים, הגרגויל, האיים והקליעים נבנו ואונפשו בבלנדר בשביל המשחק הזה.</div>
      ${rows}
      <div>צלילים: Sonniss GDC 2026 Game Audio Bundle (ללא תמלוגים). מוזיקה: מקורית, הולחנה בקוד.</div>
      <div>זיהוי פנים: MediaPipe Face Detector (Google, Apache 2.0) - רץ רק בטלפון שלכם.</div></div>
      <div class="row"><button class="big" id="cOk"><img class="bi" src="ui/ic/ui_back.webp" alt="" draggable="false"><span class="bt">סגור</span></button></div>`);
    o.querySelector('#cOk').onclick = () => { this.sfx('ui_back'); this.closeOverlay(); };
  }

  // ---------------------------------------------------------------- face scan
  async openScan() {
    this.state = 'scan';
    for (const id of ['title', 'verdict', 'overlay']) $(id).classList.add('hidden');
    $('scan').classList.remove('hidden');
    $('reads').classList.add('hidden'); $('reads').innerHTML = ''; $('scanPhoto').classList.add('hidden'); $('vid').classList.remove('hidden');
    $('scanText').textContent = 'הסתכלו ישר למצלמה. הסורק יצלם תמונה אחת של הפנים ויגלה אם אתם מלאך או שד.';
    $('bSnap').classList.remove('hidden'); $('bSnap').disabled = true; $('bNoCam').classList.remove('hidden');
    $('scanStatus').textContent = 'מדליקים את המצלמה…';
    this.music('music_scan'); this.audio.setAmbience({ amb_heaven: 0, amb_hell: 0, amb_scan: 1 });
    this.fxCanvas = $('scanFx'); this.sizeFx();
    $('camMsg').classList.add('hidden');
    this.scan?.stop(); this.scan = new FaceScan();
    try {
      await this.scan.start($('vid'));
      if (this.state !== 'scan') { this.scan.stop(); return; }
      $('bSnap').disabled = false; $('scanStatus').textContent = 'מחפשים פנים…';
      this.scan.track(f => this.drawTrack(f));
    } catch (err) {
      const code = err?.code || 'error';
      const msg = {
        unsupported: '<b>אין כאן גישה למצלמה</b>הדפדפן הזה לא נותן למשחק להשתמש במצלמה. אפשר לעשות סריקה בלי מצלמה, עם האצבע.',
        denied: '<b>המצלמה חסומה</b>כדי לסרוק פנים צריך לאשר מצלמה (בהגדרות האתר בדפדפן). או: סריקה בלי מצלמה, עם האצבע.',
        nocam: '<b>לא נמצאה מצלמה</b>אפשר לעשות סריקה בלי מצלמה, עם האצבע.',
        error: '<b>המצלמה לא נדלקה</b>אולי אפליקציה אחרת משתמשת בה. אפשר לנסות שוב, או לסרוק עם האצבע.',
      }[code] || '';
      $('camMsg').innerHTML = msg; $('camMsg').classList.remove('hidden');
      $('bSnap').classList.add('hidden'); $('scanStatus').textContent = '';
    }
  }
  sizeFx() { const r = $('scanFrame').getBoundingClientRect(); const c = this.fxCanvas; c.width = Math.round(r.width * devicePixelRatio); c.height = Math.round(r.height * devicePixelRatio); }
  /** map video pixels (unmirrored) or photo pixels (mirrored) to the frame canvas (object-fit: cover) */
  mapper(W, H, mirrored) {
    const c = this.fxCanvas, s = Math.max(c.width / W, c.height / H), ox = (c.width - W * s) / 2, oy = (c.height - H * s) / 2;
    return (x, y) => ({ x: mirrored ? ox + x * s : c.width - (ox + x * s), y: oy + y * s, s });
  }
  drawTrack(f) {
    const c = this.fxCanvas, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
    const v = $('vid'); if (!v.videoWidth) return;
    if (!f) { $('scanStatus').textContent = this.scan.det ? 'לא רואים פנים - התקרבו קצת למצלמה' : 'הסתכלו ישר למצלמה ולחצו צלם'; return; }
    $('scanStatus').textContent = 'הפנים נמצאו! לחצו צלם';
    const m = this.mapper(v.videoWidth, v.videoHeight, false);
    const a = m(f.x, f.y), b = m(f.x + f.w, f.y + f.h);
    const L = Math.min(a.x, b.x), T = a.y, Wd = Math.abs(b.x - a.x), Hd = b.y - a.y, k = Wd * .22;
    x.strokeStyle = 'rgba(255,226,150,.95)'; x.lineWidth = 3 * devicePixelRatio; x.lineCap = 'round';
    x.beginPath();
    x.moveTo(L, T + k); x.lineTo(L, T); x.lineTo(L + k, T); x.moveTo(L + Wd - k, T); x.lineTo(L + Wd, T); x.lineTo(L + Wd, T + k);
    x.moveTo(L, T + Hd - k); x.lineTo(L, T + Hd); x.lineTo(L + k, T + Hd); x.moveTo(L + Wd - k, T + Hd); x.lineTo(L + Wd, T + Hd); x.lineTo(L + Wd, T + Hd - k);
    x.stroke();
    x.fillStyle = 'rgba(255,236,190,.9)'; for (const p of f.kp.slice(0, 4)) { const q = m(p.x, p.y); x.beginPath(); x.arc(q.x, q.y, 3.5 * devicePixelRatio, 0, 7); x.fill(); }
  }
  async snap() {
    if (!this.scan?.stream) return;
    $('bSnap').disabled = true; $('bNoCam').classList.add('hidden');
    for (const n of [3, 2, 1]) { $('count').textContent = n; this.sfx('countdown_tick'); await this.wait(.75); if (this.state !== 'scan') return; }
    $('count').textContent = '';
    const photo = this.scan.capture(); this.scan.stop(); this._photo = photo; // memory only, gone on reload
    this.sfx('cam_shutter');
    const sh = $('shutter'); sh.style.transition = 'none'; sh.style.opacity = 1; void sh.offsetWidth; sh.style.transition = 'opacity .5s'; sh.style.opacity = 0;
    const pc = $('scanPhoto'); pc.width = photo.canvas.width; pc.height = photo.canvas.height; pc.getContext('2d').drawImage(photo.canvas, 0, 0);
    pc.classList.remove('hidden'); $('vid').classList.add('hidden'); $('bSnap').classList.add('hidden');
    const res = this.scan.analyse(photo);
    await this.scanShow(res, photo);
    if (this.state !== 'scan') return;
    this.paintedPhoto = paintVerdict(photo, res);
    this.portraitURL = portrait(this.paintedPhoto, res.face);
    this.showVerdict(res);
  }
  fingerScan() {
    this.scan?.stop();
    $('vid').classList.add('hidden'); $('scanPhoto').classList.add('hidden'); $('bSnap').classList.add('hidden'); $('bNoCam').classList.add('hidden');
    const c = this.fxCanvas; c.getContext('2d').clearRect(0, 0, c.width, c.height);
    $('camMsg').innerHTML = `<b>שימו אצבע על הסורק והחזיקו</b><div id="pad"><svg viewBox="0 0 74 96"><use href="#iFinger"/></svg><i></i></div><span id="padTxt">החזיקו 2 שניות…</span>`;
    $('camMsg').classList.remove('hidden'); $('scanStatus').textContent = '';
    $('scanText').textContent = 'בלי מצלמה, הסורק קורא את טביעת האצבע ואת היציבות של היד.';
    const pad = $('pad'); let t0 = 0, samples = [], held = 0, raf = 0, done = false;
    const tick = () => {
      if (!t0 || done) return; held = (performance.now() - t0) / 1000; $('padTxt').textContent = held < 2 ? `סורק… ${Math.round(held / 2 * 100)}%` : 'נקרא!';
      if (Math.random() < .3) this.sfx('scan_beep', null, null, { vol: .3, gap: .12 });
      if (held >= 2) { done = true; finish(); return; } raf = requestAnimationFrame(tick);
    };
    const finish = async () => {
      pad.classList.remove('on'); const res = FaceScan.fingerResult(samples);
      $('camMsg').classList.add('hidden');
      await this.scanShow(res, null); if (this.state !== 'scan') return;
      this.paintedPhoto = null; this.portraitURL = null; this.showVerdict(res);
    };
    pad.addEventListener('pointerdown', e => { if (done) return; e.preventDefault(); pad.setPointerCapture(e.pointerId); t0 = performance.now(); samples = []; pad.classList.add('on'); this.sfx('scan_sweep'); raf = requestAnimationFrame(tick); });
    pad.addEventListener('pointermove', e => { if (t0) samples.push({ x: e.clientX, y: e.clientY }); });
    const up = () => { if (done) return; t0 = 0; pad.classList.remove('on'); cancelAnimationFrame(raf); if ($('padTxt')) $('padTxt').textContent = 'לא עזבו! החזיקו 2 שניות…'; };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  }
  wait(s) { return new Promise(r => setTimeout(r, s * 1000)); }
  /** the scan show: sweep line + markers over the photo, readouts filling in one by one */
  async scanShow(res, photo) {
    $('scanText').textContent = 'סורק… אל תזוזו!';
    const reads = $('reads'); reads.classList.remove('hidden');
    const items = [['light', 'אור פנימי', false], ['sparkle', 'ניצוץ בעיניים', false], ['smile', 'חום החיוך', false], ['fire', 'אש בלב', true], ['shadow', 'צללים', true]];
    reads.innerHTML = items.map(([k, l, d]) => `<div class="rd ${d ? 'dark' : ''}"><span>${l}</span><div class="bar"><i id="rb_${k}"></i></div><b id="rv_${k}">--</b></div>`).join('');
    const c = this.fxCanvas, x = c.getContext('2d');
    let m = null, f = null;
    if (photo) { m = this.mapper(photo.canvas.width, photo.canvas.height, true); f = res.face; }
    const t0 = performance.now(), dur = 3200; let i = 0;
    this.sfx('scan_sweep');
    await new Promise(resolve => {
      const step = () => {
        if (this.state !== 'scan') return resolve();
        const t = (performance.now() - t0) / dur;
        x.clearRect(0, 0, c.width, c.height);
        const y = (Math.sin(t * Math.PI * 3 - Math.PI / 2) * .5 + .5) * c.height;
        const g = x.createLinearGradient(0, y - 40, 0, y + 40); g.addColorStop(0, 'rgba(255,220,140,0)'); g.addColorStop(.5, 'rgba(255,226,150,.55)'); g.addColorStop(1, 'rgba(255,220,140,0)');
        x.fillStyle = g; x.fillRect(0, y - 40, c.width, 80);
        if (f) {
          const a = m(f.x, f.y), b = m(f.x + f.w, f.y + f.h);
          x.strokeStyle = 'rgba(255,226,150,.5)'; x.lineWidth = 1 * devicePixelRatio;
          for (let k = 0; k <= 6; k++) { const yy = a.y + (b.y - a.y) * k / 6, xx = a.x + (b.x - a.x) * k / 6; x.beginPath(); x.moveTo(a.x, yy); x.lineTo(b.x, yy); x.moveTo(xx, a.y); x.lineTo(xx, b.y); x.stroke(); }
          f.kp.slice(0, 4).forEach((p, j) => {
            if (t < .15 + j * .15) return;
            const q = m(p.x, p.y), r = (10 + 6 * Math.sin(t * 20 + j)) * devicePixelRatio;
            x.strokeStyle = 'rgba(255,236,190,.95)'; x.lineWidth = 2 * devicePixelRatio; x.beginPath(); x.arc(q.x, q.y, r, 0, 7); x.stroke();
            x.beginPath(); x.moveTo(q.x - r * 1.6, q.y); x.lineTo(q.x - r * .6, q.y); x.moveTo(q.x + r * .6, q.y); x.lineTo(q.x + r * 1.6, q.y); x.stroke();
          });
        }
        while (i < items.length && t > .12 + i * .17) {
          const [k] = items[i]; const v = res.read[k];
          $('rb_' + k).style.width = v + '%'; $('rv_' + k).textContent = v; this.sfx('scan_beep', null, null, { vol: .5, rate: .9 + i * .06 });
          i++;
        }
        if (t >= 1) { x.clearRect(0, 0, c.width, c.height); return resolve(); }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    $('scanText').textContent = 'מחשבים…';
    await this.wait(.4);
  }
  showVerdict(res) {
    this.state = 'verdict'; this.verdict = res;
    const angel = res.side === 'angel';
    this.save.last = res.side; this.save.pct = res.pctAngel; writeSave(this.save);
    $('scan').classList.add('hidden'); const v = $('verdict'); v.classList.remove('hidden'); v.classList.toggle('demon', !angel);
    document.body.classList.toggle('demon', !angel); document.body.classList.toggle('angel', angel);
    const ph = $('vPhoto'); ph.innerHTML = ''; ph.classList.toggle('noimg', !this.paintedPhoto);
    if (this.paintedPhoto) ph.appendChild(this.paintedPhoto);
    else ph.innerHTML = `<svg viewBox="0 0 74 96" style="width:40%;opacity:.8"><use href="#iFinger"/></svg>`;
    $('vTitle').textContent = SIDES[res.side].youAre;
    $('vPa').textContent = `מלאך ${res.pctAngel}%`; $('vPd').textContent = `שד ${100 - res.pctAngel}%`;
    $('vBa').style.width = '50%'; requestAnimationFrame(() => { $('vBa').style.transition = 'width 1.2s cubic-bezier(.2,.8,.2,1)'; $('vBa').style.width = res.pctAngel + '%'; });
    const r = res.read;
    const best = angel ? (r.sparkle > r.light ? 'הניצוץ בעיניים שלך' : 'האור הפנימי שלך') : (r.fire > r.shadow ? 'האש שבלב שלך' : 'הצללים סביבך');
    $('vText').innerHTML = angel ? `${best} הסגיר אותך: יש לך נשמה של מלאך. <b>השדים</b> תוקפים את השמיים - רק אתה יכול לעצור אותם!`
      : `${best} הסגירו אותך: יש לך נשמה של שד. <b>המלאכים</b> חוסמים את הדרך - הגיע הזמן לנצח אותם!`;
    $('bFightS').textContent = `צבא ${angel ? 'מלאכים' : 'שדים'} נלחם איתך`;
    $('bEvoS').textContent = `מתחיל כ${FORMS[res.side][0].name} וגדל`;
    $('bEvoImg').src = angel ? 'ui/mode_evo.webp' : 'ui/mode_evo_d.webp';
    this.audio.play(angel ? 'verdict_angel' : 'verdict_demon', { duck: .25 });
    this.music(null); this.audio.setAmbience({ amb_scan: 0, amb_heaven: angel ? .7 : 0, amb_hell: angel ? 0 : .7 });
  }

  // ---------------------------------------------------------------- battle
  /** pick a mode without a new scan (title screen) */
  chooseMode() {
    const s = SIDES[this.verdict.side];
    const o = this.overlay(`<h2>איזה קרב?</h2><p>אתה ${s.name}. איך נלחמים היום?</p>
      <div id="ups"><button class="up mode" id="mArmy"><img src="ui/mode_army.webp" alt=""><b>מצב צבא</b><span>צבא שלם של ${s.names} נלחם איתך, 6 גלים</span></button>
      <button class="up mode" id="mEvo"><img src="ui/${s.key === 'angel' ? 'mode_evo' : 'mode_evo_d'}.webp" alt=""><b>מצב התפתחות</b><span>מתחיל כ${FORMS[s.key][0].name}, מנצח ומתפתח עד ${FORMS[s.key][6].name}</span></button></div>`);
    o.querySelector('#mArmy').onclick = () => { this.sfx('ui_click'); this.closeOverlay(); this.startBattle('army'); };
    o.querySelector('#mEvo').onclick = () => { this.sfx('ui_click'); this.closeOverlay(); this.startBattle('evo'); };
  }
  get waves() { return this.mode === 'evo' ? EVO_WAVES : WAVES; }
  async startBattle(mode) {
    const res = this.verdict; if (!res) return;
    if (mode) this.mode = mode;
    this.side = SIDES[res.side]; this.foe = SIDES[this.side.enemy];
    document.body.classList.toggle('demon', res.side === 'demon'); document.body.classList.toggle('angel', res.side === 'angel');
    for (const id of ['title', 'scan', 'verdict', 'overlay']) $(id).classList.add('hidden');
    $('fade').classList.add('on'); await this.wait(.35);
    // make sure the enemy side is loaded
    const need = [...SIDE_MODELS[this.foe.key], ...SIDE_MODELS[this.side.key]].filter(n => !Assets.has(n) && !Assets.missing.includes(n));
    if (need.length) { $('title').classList.remove('hidden'); $('tbtns').classList.add('hidden'); $('loadwrap').classList.remove('hidden'); $('logo').classList.add('hidden'); $('loadtxt').textContent = `מזמנים את הצבאות…`; $('fade').classList.remove('on'); await Assets.load(need, f => { $('loadfill').style.width = (f * 100).toFixed(0) + '%'; }); $('title').classList.add('hidden'); $('tbtns').classList.remove('hidden'); $('loadwrap').classList.add('hidden'); $('logo').classList.remove('hidden'); }
    for (const s of this.showcase) this.titleScene.remove(s.m.root); this.showcase = [];
    this.clearBattle();
    this.player = this.mode === 'evo' ? new EvoPlayer(this, this.side, 0) : new Player(this, this.side);
    this.wave = 0; this.kills = 0; this.score = 0; this.time0 = this.t; this.lives = 0;
    this.env.skyU.uBias.value = 0;
    $('meImg').src = this.portraitURL || heroBadge(this.side.key);
    $('xpRow').classList.toggle('hidden', this.mode !== 'evo'); $('armyN').classList.toggle('hidden', this.mode !== 'army');
    this.formButtons();
    $('hud').classList.remove('hidden'); $('controls').classList.toggle('hidden', isPC && !('ontouchstart' in window)); $('bossBar').classList.add('hidden');
    $('fade').classList.remove('on');
    this.state = 'intro'; this.hud();
    this.music(this.side.music); this.audio.setAmbience({ amb_scan: 0, amb_heaven: this.side.key === 'angel' ? .6 : .25, amb_hell: this.side.key === 'angel' ? .25 : .6 });
    // intro: the hero reveals, then wave 1
    const P = this.player; P.x = 0; P.y = 5.4; P.face = -this.side.homeDir;
    this.camGoal = { x: 0, y: 5.6, z: 8.5, lx: 0, ly: 5.4, fov: 38 }; Object.assign(this.cam, { ...this.camGoal, z: 7 });
    P.doAct('reveal', [{ t: .45, fn: () => { this.burstSide(P.x, P.y, 1.6); this.shake(.25); } }], { dur: 1.7 });
    if (this.mode === 'evo') this.ui_banner(`${FORMS[this.side.key][0].name}…`, `הכי קטן והכי חלש. נצח ${this.foe.names} ותתפתח!`);
    else this.ui_banner(this.side.youAre, `הצבא שלך איתך - ${this.foe.names} בדרך!`);
    this.armyLost = 0; this.reinforce(true);
    this.after(2.1, () => { if (this.state !== 'intro') return; this.state = 'battle'; if (!this.save.help && isPC) this.hint(`תעופה: WASD · התקפה: J · זריקה: K · דאש: Shift · מיוחד: I`, 7); else if (!this.save.help) this.hint('ג׳ויסטיק לעוף · הכפתור הגדול תוקף · הזריקה מכוונת לבד', 7); this.save.help = true; writeSave(this.save); this.nextWave(); });
  }
  burstSide(x, y, s = 1) {
    if (this.side.key === 'angel') { this.fx.rays(x, y, 9, 5 * s, .7, C.goldW); this.fx.feathers(x, y, 16, 1.2); this.fx.burst(x, y, 'light', 30, s); this.sfx('special_holy', x, y, { vol: .7 }); }
    else { this.fx.ring(x, y, .5, 4 * s, .6, C.fire); this.fx.burst(x, y, 'fire', 30, s); this.fx.embers(x, y, 30, 1.5); this.sfx('special_fire', x, y, { vol: .7 }); }
  }
  clearBattle() {
    for (const e of this.enemies) e.remove(); this.enemies = [];
    for (const a of this.allies) a.remove(); this.allies = [];
    for (const s of this.shots) s.remove(); this.shots = [];
    for (const o of this.orbs) o.remove(); this.orbs = [];
    if (this.player) { this.player.remove(); this.player = null; }
    this.timers = []; this.fx.clear(); this.queue = []; this.boss = null; this.lowLoop?.stop(); this.lowLoop = null; this.armyPending = new Set();
  }
  nextWave() {
    this.wave++; this.waveDone = false;
    const W = this.waves[this.wave - 1];
    this.queue = []; for (const [role, n] of W.spawn) for (let i = 0; i < n; i++) this.queue.push(role);
    this.cap = W.cap - (this.lowEnd ? 2 : 0); this.spawnT = .8; this.waveDef = W;
    if (this.wave > 1) this.reinforce(false);
    this.camGoal = { x: 0, y: 6, z: 15.5, lx: 0, ly: 5.9, fov: 38 };
    this.sfx('wave_start', null, null, { vol: .8 });
    if (W.rival) { this.ui_banner('האלוף מגיע!', `${this.foe.roles.rival.name} - הלוחם הכי חזק של ${this.foe.names}`); this.after(.5, () => this.sfx('rival_appear')); }
    else if (W.boss) { this.bossIntro(); }
    else this.ui_banner(`גל ${W.n}`, W.title);
    this.hud();
  }
  bossIntro() {
    const name = this.foe.roles.boss.name;
    this.ui_banner(name, 'הקרב האחרון');
    this.music('music_boss'); this.queue = this.queue.filter(r => r !== 'boss'); this.spawnT = 3.2; // escorts follow the boss in
    const from = -this.side.homeDir;
    const b = this.spawn('boss', { x: from * (ARENA.x1 + 6), y: 7, instant: false });
    this.boss = b; b.spawning = 2.4; b.vx = -from * 5;
    $('bossName').textContent = name; $('bossBar').classList.remove('hidden');
    this.camGoal = { x: from * 5, y: 6.5, z: 13, lx: from * 6, ly: 6.4, fov: 38 };
    this.after(1.1, () => { this.sfx(this.foe.bossRoar, b.x, b.y, { vol: 1 }); this.shake(.5); b.doAct('enrage', [], { dur: 1.3 }); });
    this.after(2.6, () => { this.camGoal = { x: 0, y: 5.8, z: 15.5, lx: 0, ly: 5.8, fov: 38 }; });
  }
  /** how many soldiers fly with you this wave (phones with few cores get a smaller army) */
  armySize() { return [6, 6, 7, 7, 8, 8][Math.max(0, this.wave - 1)] + (this.player?.up.army || 0) * 2 - (this.lowEnd ? 2 : 0); }
  /** fill your army back up to its size; the first time they fly in behind you during the reveal */
  reinforce(first) {
    if (this.mode !== 'army') return; // evolution mode: you fight alone
    const ROLES = ['small', 'heavy', 'caster', 'small', 'charger', 'diver', 'small', 'heavy', 'charger', 'diver', 'small', 'caster'];
    const alive = this.allies.filter(a => !a.dead);
    this.armyPending = this.armyPending || new Set(); // soldiers already on their way count too
    const used = new Set([...alive.map(a => a.slot), ...this.armyPending]);
    const n = Math.max(0, this.armySize() - alive.length - this.armyPending.size);
    if (!n) return;
    let slot = 0;
    for (let i = 0; i < n; i++) {
      while (used.has(slot)) slot++;
      used.add(slot); this.armyPending.add(slot);
      const s = slot, role = ROLES[s % ROLES.length];
      this.after(first ? .25 + i * .12 : i * .35, () => {
        this.armyPending.delete(s);
        if (!this.player || (this.state !== 'battle' && this.state !== 'intro')) return;
        const a = new Enemy(this, this.side, role, { team: 'ally', slot: s, y: clamp(this.player.y + rnd(-3, 3), ARENA.y0 + .5, ARENA.y1 - .5) });
        a.m.fit.userData.s0 = a.m.fit.scale.x; a.vx = -this.side.homeDir * 9;
        this.allies.push(a);
      });
    }
    if (!first) { this.pop(this.player.x, this.player.y + 1.6, `+${n} לוחמים`, 'heal'); this.sfx('rival_appear', null, null, { vol: .35 }); }
  }
  /** the buttons show this form's own moves */
  formButtons() {
    const P = this.player, tag = (id, t) => { $(id).querySelector('.tag').textContent = t; $(id).setAttribute('aria-label', t); };
    if (P && P.evo) {
      const f = P.form, s = this.side.key[0]; $('atkImg').src = `ui/ic/${s}_${f.moves.attack}.webp`; $('shotImg').src = `ui/ic/${s}_${f.moves.shoot}.webp`; $('specImg').src = `ui/ic/${s}_${f.moves.special}.webp`;
      tag('bAtk', f.names.attack); tag('bShot', f.names.shoot); $('specLbl').textContent = f.names.special; $('meName').textContent = f.name;
    } else {
      const s = this.side.key[0]; $('atkImg').src = `ui/ic/${s}_combo.webp`; $('shotImg').src = `ui/ic/${s}_throw.webp`; $('specImg').src = `ui/ic/${s}_nova.webp`;
      tag('bAtk', 'התקפה'); tag('bShot', 'זריקה'); $('specLbl').textContent = this.side.special; $('meName').textContent = this.side.name;
    }
    $('dashImg').src = `ui/ic/${this.side.key[0]}_dash.webp`;
    this._lvlShown = null;
  }
  /** evolution: a burst, a slow-motion moment, and you come out as the next, bigger form */
  evolve() {
    const P = this.player;
    if (!P || P.dead || !P.evo || this.evolving || P.level >= P.maxLevel || P.xp < EVO_XP[P.level + 1] || this.state !== 'battle') return;
    this.evolving = true; P.inv = 3; this.slowmo(1.2, .3);
    this.burstSide(P.x, P.y, 1.2); this.audio.play(this.side.key === 'angel' ? 'verdict_angel' : 'verdict_demon', { duck: .3 });
    this.after(.35, () => {
      if (!this.player || this.player.dead) { this.evolving = false; return; }
      P.applyForm(P.level + 1); P.inv = 2;
      this.burstSide(P.x, P.y, 2); this.shake(.5); P.doAct('reveal', [], { dur: 1 });
      if (this.side.key === 'angel') this.fx.feathers(P.x, P.y, 26, 2); else this.fx.embers(P.x, P.y, 40, 2.5);
      const n = P.form.names;
      this.ui_banner('התפתחת!', `${P.form.name} · שלב ${P.level + 1}/7`);
      this.hint(`התקפה: ${n.attack} · זריקה: ${n.shoot} · מיוחד: ${n.special}`, 6);
      this.formButtons(); this.evolving = false;
      this.after(.5, () => this.evolve()); // enough power for one more step?
    });
  }
  hurtAlly(a, dmg, fx, fy) {
    if (!a || a.dead || a.inv > 0 || this.state === 'ending' || this.state === 'intro') return;
    let d = Math.round(dmg);
    if (a.shield > 0) { const s = Math.min(a.shield, d); a.shield -= s; d -= s; this.fx.burst(a.x, a.y, 'block', 6); if (d <= 0) return; }
    a.hp -= d; a.setFlash(); a.inv = .2;
    const dx = a.x - fx, dy = a.y - fy, l = Math.hypot(dx, dy) || 1, km = { small: 1, caster: 1, diver: .9, charger: .6, heavy: .3 }[a.role] ?? 1;
    a.kx += dx / l * 5 * km; a.ky += dy / l * 3 * km;
    if (!a.act && km >= .9 && a.hp > 0) a.doAct('hit', [], { dur: .25 });
    this.fx.burst(a.x, a.y, 'hit', 4, .6);
    this.sfx(this.side.hurtSfx, a.x, a.y, { vol: .35, gap: .1 });
    if (a.hp <= 0) {
      a.dead = true; a.deadT = 0; a.lunging = false; a.act = null; a.play('die', { once: true, fade: .08 });
      if (this.side.key === 'angel') { this.fx.puff(a.x, a.y, 'light', 10); this.fx.feathers(a.x, a.y, 8); } else { this.fx.puff(a.x, a.y, 'smoke', 10); this.fx.embers(a.x, a.y, 10); }
      this.sfx(this.side.dieSfx, a.x, a.y, { vol: .5 }); this.armyLost++;
    }
  }
  spawn(role, o = {}) {
    let hpMul = o.hpMul || 1;
    if (this.mode === 'evo') hpMul *= ({ rival: .9, boss: 1.15 }[role] || (1 + (this.wave - 1) * .13));
    const e = new Enemy(this, this.foe, role, { ...o, hpMul });
    e.m.fit.userData.s0 = e.m.fit.scale.x;
    if (!o.instant && o.x == null) e.vx = this.side.homeDir * 8; // fly in from the enemy side
    if (o.instant) { this.fx.puff(e.x, e.y, this.foe.key === 'angel' ? 'light' : 'smoke', 10); }
    this.enemies.push(e); return e;
  }
  waveUpdate(dt) {
    if (!this.waveDef || this.state !== 'battle') return;
    const alive = this.enemies.filter(e => !e.dead).length;
    this.spawnT -= dt;
    if (this.queue.length && alive < this.cap && this.spawnT <= 0) {
      this.spawnT = rnd(.6, 1.1);
      this.spawn(this.queue.shift());
    }
    if (!this.queue.length && alive === 0 && !this.waveDone) {
      this.waveDone = true;
      if (this.wave >= this.waves.length) return; // boss death handles the win
      this.sfx('wave_clear', null, null, { vol: .8 });
      this.ui_banner('הגל הובס!', this.wave === 4 ? 'משהו חזק מתקרב…' : '');
      this.after(1.6, () => this.offerUpgrades());
    }
    this.hud();
  }
  offerUpgrades() {
    if (!this.player || this.player.dead) return;
    if (this.mode === 'evo') { this.heal(Math.round(this.player.maxHp * .15)); this.after(.4, () => this.nextWave()); return; }
    this.state = 'upgrade';
    const P = this.player, pool = UPGRADES.filter(u => (u.id === 'heal' ? P.hp < P.maxHp * .8 : true) && (P.up[u.id] || 0) < u.max);
    const pick = []; while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const word = this.side.key === 'angel' ? 'ברכה' : 'קללה';
    const o = this.overlay(`<h2>בחרו ${word}</h2><p>הגל הבא קשה יותר. ${this.side.key === 'angel' ? 'השמיים' : 'האש'} נותנים לכם כוח אחד:</p>
      <div id="ups">${pick.map((u, i) => `<button class="up" data-i="${i}"><img src="ui/ic/up_${u.id}.webp" alt=""><b>${u.t}</b><span>${u.d}</span>${u.max < 9 ? `<em>${(P.up[u.id] || 0)}/${u.max}</em>` : ''}</button>`).join('')}</div>`);
    this.sfx('ui_open');
    o.querySelectorAll('.up').forEach(b => b.onclick = () => {
      const u = pick[+b.dataset.i]; this.applyUpgrade(u); this.sfx('upgrade_pick'); this.closeOverlay();
      this.state = 'battle'; this.after(.6, () => this.nextWave());
    });
  }
  applyUpgrade(u) {
    const P = this.player; P.up[u.id] = (P.up[u.id] || 0) + 1;
    if (u.id === 'hp') { P.maxHp += 30; P.hp = Math.min(P.maxHp, P.hp + 30); }
    if (u.id === 'heal') P.hp = P.maxHp;
    this.burstSide(P.x, P.y, .8); this.pop(P.x, P.y + 1.2, u.t, 'heal');
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .15); // a small heal between waves
  }

  // ---------------------------------------------------------------- combat api (used by actors)
  hurtEnemy(e, dmg, kx = 0, ky = 0, o = {}) {
    if (e.dead || e.inv > 0) return;
    let d = Math.round(dmg);
    if (e.shield > 0) { const a = Math.min(e.shield, d); e.shield -= a; d -= a; this.fx.burst(e.x, e.y, 'block', 8); this.sfx('shield_block', e.x, e.y, { vol: .6 }); if (d <= 0) return; }
    if (o.ally && e.role === 'boss') d = Math.max(1, Math.round(d * .4));
    if (o.ally && e.role === 'rival') d = Math.max(1, Math.round(d * .6));
    e.hp -= d; e.setFlash(); e.hitCount++;
    const km = { small: 1, caster: 1, diver: .9, charger: .6, heavy: .3, rival: .5, boss: .06 }[e.role] ?? 1;
    e.kx += kx * km; e.ky += ky * km;
    if (o.melee && km >= .9) e.stun = Math.max(e.stun, .18);
    if (o.melee && e.role !== 'boss' && e.role !== 'heavy' && !e.act && e.hp > 0) e.doAct('hit', [], { dur: .28 });
    const P = this.player;
    if (!o.ally) { P.special = Math.min(1, P.special + d / 240 * (1 + P.up.special * .5)); this.pop(e.x, e.y + e.r + .4, d, d >= 18 ? 'crit' : ''); }
    this.fx.burst(e.x, e.y, 'hit', o.ally ? 4 : 6, .8);
    this.sfx(this.foe.hurtSfx, e.x, e.y, { vol: o.ally ? .35 : .55, gap: o.ally ? .12 : .06 });
    if (e.hp <= 0) this.killEnemy(e);
  }
  killEnemy(e) {
    e.dead = true; e.deadT = 0; e.lunging = false; e.act = null;
    e.play('die', { once: true, fade: .08 });
    const angelFoe = this.foe.key === 'angel';
    this.fx.puff(e.x, e.y, angelFoe ? 'light' : 'smoke', e.role === 'boss' ? 40 : 14, e.role === 'boss' ? 2.4 : 1);
    if (angelFoe) this.fx.feathers(e.x, e.y, e.role === 'boss' ? 40 : 10, e.role === 'boss' ? 3 : 1); else this.fx.embers(e.x, e.y, e.role === 'boss' ? 60 : 14, e.role === 'boss' ? 3 : 1);
    this.sfx(this.foe.dieSfx, e.x, e.y, { vol: .8 });
    this.kills++; this.score += e.stats.score;
    const P = this.player;
    if (P.up.vamp) this.heal(4 * P.up.vamp, true);
    if (P.evo && !e.summoned && P.gainXp(XP_GAIN[e.role] || 0)) this.after(.3, () => this.evolve());
    else if (P.evo && e.summoned) P.gainXp(3);
    if (!e.summoned && (Math.random() < .17 || this.kills % 7 === 0) && e.role !== 'boss') this.orbs.push(new Orb(this, e.x, e.y));
    if (e.role === 'rival') { this.orbs.push(new Orb(this, e.x, e.y)); this.slowmo(.8, .35); this.ui_banner('האלוף הובס!', ''); }
    if (e.role === 'boss') this.bossDown(e);
  }
  bossDown(e) {
    this.state = 'ending'; this.slowmo(2.2, .3); this.shake(.8);
    for (const o of this.enemies) if (o !== e && !o.dead) this.killEnemy(o);
    for (const s of this.shots) s.kill = true; // removed by the shots loop (this can run inside it)
    for (let i = 0; i < 6; i++) this.after(i * .25, () => { this.fx.burst(e.x + rnd(-2, 2), e.y + rnd(-2, 2), this.foe.key === 'angel' ? 'light' : 'fire', 24, 1.6); this.shake(.3); });
    this.sfx('boss_die', e.x, e.y, { vol: 1 });
    $('bossBar').classList.add('hidden');
    this.after(3, () => this.win());
  }
  hurtPlayer(dmg, fx, fy, dot = false) {
    const P = this.player; if (!P || P.dead || P.inv > 0 || this.state === 'ending' || this.state === 'intro') return;
    if (this.mode === 'evo') dmg = Math.ceil(dmg * 2.1); // alone against them all: every hit counts
    if (P.blockT > 0) { dmg = Math.ceil(dmg * .15); this.fx.burst(P.x + P.face, P.y, 'block', 10); this.sfx('shield_block', P.x, P.y, { vol: .7, gap: .08 }); }
    P.hp -= dmg; P.inv = dot ? .15 : .75; P.setFlash(.12);
    const dx = P.x - fx, dy = P.y - fy, l = Math.hypot(dx, dy) || 1;
    if (!dot) { P.kx += dx / l * 9; P.ky += dy / l * 6; }
    P.special = Math.min(1, P.special + dmg / 400);
    this.pop(P.x, P.y + .9, dmg, 'hurt');
    this.shake(dot ? .08 : .3); if (!dot) this.hitStop(.05);
    const f = $('flash'); f.style.transition = 'none'; f.style.opacity = dot ? .35 : .8; void f.offsetWidth; f.style.transition = 'opacity .45s'; f.style.opacity = 0;
    this.sfx('player_hurt', P.x, P.y, { vol: .8, gap: .1 });
    if (!dot && P.act !== 'special' && !P.act) P.doAct('hit', [], { dur: .25 });
    if (P.hp <= 0) this.playerDown();
  }
  heal(n, quiet) {
    const P = this.player; if (!P || P.dead) return;
    const before = P.hp; P.hp = Math.min(P.maxHp, P.hp + n);
    if (P.hp - before >= 1 && (!quiet || P.hp - before >= 4)) this.pop(P.x, P.y + 1, '+' + Math.round(P.hp - before), 'heal');
    if (!quiet) this.sfx('heal_pickup', P.x, P.y, { vol: .8 });
  }
  /** natural healing tick: about 2.5% of max health (at least 2) */
  regen(P) {
    const n = Math.max(2, Math.round(P.maxHp * .025)), before = P.hp; P.hp = Math.min(P.maxHp, P.hp + n);
    const got = Math.round(P.hp - before); if (got < 1) return;
    this.pop(P.x, P.y + P.r + .9, '+' + got, 'heal regen');
    for (let i = 0; i < 6; i++) this.fx.glow.emit({ x: P.x + rnd(-.6, .6), y: P.y + rnd(-.8, .6), z: .4, vy: rnd(.8, 1.6), life: .8, size: .22, size1: .04, alpha: .8, color: [.65, 1, .55], drag: .5 });
  }
  playerDown() {
    const P = this.player; P.hp = 0; P.dead = true; P.vy = 2; P.play('die', { once: true });
    this.state = 'ending'; this.slowmo(1.5, .35);
    if (this.side.key === 'angel') this.fx.feathers(P.x, P.y, 30, 1.5); else this.fx.embers(P.x, P.y, 40, 1.5);
    this.sfx(this.side.dieSfx, P.x, P.y);
    this.after(2.2, () => this.lose());
  }
  playerNova(P) {
    const R = 8.5, dmg = 48 * P.dmgMul;
    for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < R + e.r) this.hurtEnemy(e, e.role === 'boss' ? dmg * .8 : dmg, Math.sign(e.x - P.x) * 16, 4);
    for (const s of this.shots) if (s.from === 'enemy' && Math.hypot(s.x - P.x, s.y - P.y) < R) s.kill = true;
    if (this.side.key === 'angel') { this.fx.rays(P.x, P.y, 16, R, .8, C.goldW); this.fx.ring(P.x, P.y, .5, R, .6, C.goldW, .9); this.fx.burst(P.x, P.y, 'light', 50, 2); this.fx.feathers(P.x, P.y, 24, 2); }
    else { this.fx.ring(P.x, P.y, .5, R, .6, C.fire, .95); this.fx.ring(P.x, P.y, .3, R * .7, .5, C.fireHot, .7); this.fx.burst(P.x, P.y, 'fire', 60, 2.2); this.fx.embers(P.x, P.y, 50, 3); }
    this.sfx(this.side.specialSfx, P.x, P.y, { vol: 1 }); this.audio.duckMusic(.5, 1);
    this.shake(.7); this.hitStop(.08);
  }
  giveShield(e, angel) {
    e.shield = 30; e.shieldT = 6;
    if (!e.shieldMesh) {
      e.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(e.r * 1.25 + .35, 32, 20), shieldMaterial(angel ? 0xffd27a : 0xff6a2a, e.isAlly ? .45 : 1));
      e.shieldMesh.renderOrder = 6; this.scene.add(e.shieldMesh);
    }
    this.fx.burst(e.x, e.y, angel ? 'light' : 'fire', 10, .7);
  }
  shoot(kind, x, y, ang, from, o) { const s = new Shot(this, kind, x, y, ang, from, o); this.shots.push(s); return s; }
  shake(a) { this.shakeA = Math.max(this.shakeA, a); }
  hitStop(t) { this.stopT = Math.max(this.stopT, t); }
  slowmo(t, s) { this.slowT = Math.max(this.slowT, t); this.slowS = s; }

  // ---------------------------------------------------------------- end screens
  win() {
    this.state = 'over';
    const sec = Math.round(this.t - this.time0), key = this.side.key + (this.mode === 'evo' ? '_evo' : '');
    this.save.wins[key] = (this.save.wins[key] || 0) + 1;
    const best = this.save.best[key]; const newBest = !best || sec < best; if (newBest) this.save.best[key] = sec; writeSave(this.save);
    this.audio.stinger('stinger_victory'); this.sfx('victory_cheer', null, null, { vol: .7 });
    this.player.doAct('victory', [], { dur: 3 });
    this.camGoal = { x: this.player.x, y: this.player.y + .3, z: 8, lx: this.player.x, ly: this.player.y, fov: 38 };
    const other = SIDES[this.side.enemy];
    const o = this.overlay(`${this.portraitURL ? `<img class="endpic" src="${this.portraitURL}" alt="">` : ''}
      <h2>${this.side.names} ניצחו!</h2>${DEDICATION ? `<div class="dedicEnd">${DEDICATION} ❤</div>` : ''}
      <p>${this.mode === 'evo' ? `התחלת כ${FORMS[this.side.key][0].name} והגעת עד ${this.player.form.name}!` : (this.side.key === 'angel' ? 'מלך השדים נפל והשמיים בטוחים. כל הכבוד, מלאך!' : 'המלאך הגדול הובס והאש שולטת בשמיים. כל הכבוד, שד!')}</p>
      <div class="stats"><div><b>${fmtTime(sec)}</b><span>${newBest ? 'שיא חדש!' : 'זמן'}</span></div><div><b>${this.kills}</b><span>אויבים</span></div><div><b>${this.allies.filter(a => !a.dead).length}</b><span>לוחמים שרדו</span></div><div><b>${this.save.wins[key]}</b><span>ניצחונות כ${this.side.name}${this.mode === 'evo' ? ' (התפתחות)' : ''}</span></div></div>
      <div class="row"><button class="big side" id="eAgain"><img class="bi" src="ui/ic/ui_again.webp" alt="" draggable="false"><span class="bt">עוד קרב</span></button><button class="big ${this.side.key === 'angel' ? 'ember' : ''}" id="eOther"><img class="bi" src="ui/ic/ui_fight.webp" alt="" draggable="false"><span class="bt">לשחק כ${other.name}</span></button><button class="big sec" id="eScan"><img class="bi" src="ui/ic/ui_rescan.webp" alt="" draggable="false"><span class="bt">סריקה חדשה</span></button><button class="big sec" id="eMenu"><img class="bi" src="ui/ic/ui_menu.webp" alt="" draggable="false"><span class="bt">לתפריט</span></button></div>`);
    this.endButtons(o);
  }
  lose() {
    this.state = 'over'; this.audio.stinger('stinger_defeat'); this.sfx('defeat', null, null, { vol: .7 });
    const o = this.overlay(`<h2>נפלת בקרב…</h2><p>${this.foe.names} ניצחו הפעם, בגל ${this.wave} מתוך ${this.waves.length}. נסו שוב - אפשר להמשיך מאותו הגל.</p>
      <div class="row"><button class="big side" id="eRetry"><img class="bi" src="ui/ic/ui_again.webp" alt="" draggable="false"><span class="bt">שוב מגל ${this.wave}</span></button><button class="big sec" id="eAgain"><img class="bi" src="ui/ic/ui_again.webp" alt="" draggable="false"><span class="bt">מההתחלה</span></button><button class="big sec" id="eMenu"><img class="bi" src="ui/ic/ui_menu.webp" alt="" draggable="false"><span class="bt">לתפריט</span></button></div>`);
    o.querySelector('#eRetry').onclick = () => { this.sfx('ui_click'); this.closeOverlay(); this.retryWave(); };
    this.endButtons(o);
  }
  endButtons(o) {
    const on = (id, fn) => { const b = o.querySelector('#' + id); if (b) b.onclick = () => { this.sfx('ui_click'); this.closeOverlay(); fn(); }; };
    on('eAgain', () => this.startBattle(this.mode));
    on('eOther', () => { this.verdict = { ...this.verdict, side: this.side.enemy }; this.portraitURL = null; this.startBattle(this.mode); });
    on('eScan', () => { this.clearBattle(); $('hud').classList.add('hidden'); $('controls').classList.add('hidden'); this.openScan(); });
    on('eMenu', () => this.toTitle());
  }
  retryWave() {
    const w = this.wave, up = { ...this.player.up }, maxHp = this.player.maxHp;
    for (const e of this.enemies) e.remove(); this.enemies = []; for (const s of this.shots) s.remove(); this.shots = []; for (const o of this.orbs) o.remove(); this.orbs = [];
    this.timers = []; this.fx.clear(); this.boss = null; this.armyPending = new Set(); $('bossBar').classList.add('hidden');
    const lvl = this.player.level || 0, xp = this.player.xp || 0;
    this.player.remove(); this.player = this.mode === 'evo' ? new EvoPlayer(this, this.side, lvl) : new Player(this, this.side); this.player.up = up; this.player.maxHp = this.player.hp = maxHp;
    if (this.player.evo) this.player.xp = xp;
    this.formButtons();
    for (const a of this.allies) a.remove(); this.allies = [];
    this.player.inv = 2; this.wave = w - 1; this.waveDone = true; this.queue = []; this.state = 'battle';
    this.wave = w; this.reinforce(true); this.wave = w - 1;
    this.music(this.side.music); this.burstSide(this.player.x, this.player.y, 1);
    this.after(.8, () => this.nextWave());
  }
  pause(on) {
    if (on) {
      if (this.state !== 'battle' || this.paused) return; this.paused = true; this.audio.duckMusic(.35, 99);
      const o = this.overlay(`<h2>הפסקה</h2>
        <div class="vol"><span>מוזיקה</span><input type="range" min="0" max="1" step=".05" id="vMus" value="${this.save.vol.music}"><span>צלילים</span><input type="range" min="0" max="1" step=".05" id="vSfx" value="${this.save.vol.sfx}"></div>
        <div class="row"><button class="big side" id="pGo"><img class="bi" src="ui/ic/ui_play.webp" alt="" draggable="false"><span class="bt">להמשיך</span></button><button class="big sec" id="pHelp"><img class="bi" src="ui/ic/ui_help.webp" alt="" draggable="false"><span class="bt">איך משחקים</span></button><button class="big sec" id="pMenu"><img class="bi" src="ui/ic/ui_menu.webp" alt="" draggable="false"><span class="bt">לתפריט</span></button></div>`);
      o.querySelector('#vMus').oninput = e => { this.save.vol.music = +e.target.value; this.save.vol.muted = false; this.audio.applyVolumes(); writeSave(this.save); };
      o.querySelector('#vSfx').oninput = e => { this.save.vol.sfx = +e.target.value; this.save.vol.muted = false; this.audio.applyVolumes(); writeSave(this.save); };
      o.querySelector('#pGo').onclick = () => { this.sfx('ui_click'); this.pause(false); };
      o.querySelector('#pHelp').onclick = () => { this.sfx('ui_click'); this.showHelp(() => { this.paused = false; this.pause(true); }); };
      o.querySelector('#pMenu').onclick = () => { this.sfx('ui_back'); this.paused = false; this.closeOverlay(); this.toTitle(); };
    } else { this.paused = false; this.closeOverlay(); this.audio.duckMusic(1, .1); }
  }

  // ---------------------------------------------------------------- HUD
  hud() {
    const P = this.player; if (!P) return;
    $('hpM').firstElementChild.style.transform = `scaleX(${clamp(P.hp / P.maxHp, 0, 1)})`;
    $('hpM').classList.toggle('low', P.hp / P.maxHp < .28); $('hpN').textContent = `${Math.max(0, Math.ceil(P.hp))}/${P.maxHp}`;
    $('spM').firstElementChild.style.transform = `scaleX(${P.special})`; $('spM').classList.toggle('full', P.special >= 1);
    $('bSpec').classList.toggle('ready', P.special >= 1);
    const c = $('bSpec').querySelector('.ring circle'); c.style.strokeDashoffset = 100 - P.special * 100;
    $('bShot').classList.toggle('cool', P.shotCd > .05);
    $('waveN').textContent = `גל ${Math.max(1, this.wave)}/${this.waves.length}`;
    if (P.evo) { $('xpM').firstElementChild.style.transform = `scaleX(${P.xpFrac()})`; const lt = P.level >= P.maxLevel ? 'הצורה הכי חזקה!' : `שלב ${P.level + 1}/7`; if (lt !== this._lvlShown) { this._lvlShown = lt; $('xpLbl').textContent = lt; $('meName').textContent = P.form.name; } }
    const left = this.enemies.filter(e => !e.dead).length + (this.queue?.length || 0);
    $('waveLeft').textContent = this.wave ? (this.waveDef?.boss ? this.foe.roles.boss.name : `נשארו ${left} ${this.foe.names.replace('ה', '')}`) : '';
    const army = this.allies.filter(a => !a.dead).length;
    if (army !== this._armyShown) { this._armyShown = army; $('armyN').textContent = `הצבא שלך: ${army}`; $('armyN').classList.toggle('few', army <= 2); }
    if (this.boss) $('bossBar').querySelector('i').style.transform = `scaleX(${clamp(this.boss.hp / this.boss.maxHp, 0, 1)})`;
    $('lowv').style.opacity = P.hp / P.maxHp < .28 && !P.dead ? 1 : 0;
    const low = P.hp / P.maxHp < .28 && !P.dead && this.state === 'battle';
    if (low && !this.lowLoop) this.lowLoop = this.audio.loop('low_hp', { vol: .7, fadeIn: .3 }); else if (!low && this.lowLoop) { this.lowLoop.stop(.4); this.lowLoop = null; }
  }
  ui_banner(big, small = '') { $('banner').innerHTML = `<div>${big}${small ? `<small>${small}</small>` : ''}</div>`; }
  get ui() { return { banner: (a, b) => this.ui_banner(a, b) }; }
  hint(t, dur = 6) { const h = $('hint'); h.textContent = t; h.classList.remove('off'); clearTimeout(this._ht); this._ht = setTimeout(() => h.classList.add('off'), dur * 1000); }
  pop(x, y, text, cls = '') {
    const v = new THREE.Vector3(x + rnd(-.2, .2), y, 0).project(this.camera);
    if (v.z > 1) return;
    const d = document.createElement('div'); d.className = 'dn ' + cls; d.textContent = text;
    d.style.left = ((v.x * .5 + .5) * innerWidth) + 'px'; d.style.top = ((-v.y * .5 + .5) * innerHeight) + 'px';
    $('pops').appendChild(d); setTimeout(() => d.remove(), 850);
  }

  // ---------------------------------------------------------------- frame
  frame() {
    const now = performance.now(); let raw = Math.min(.05, (now - (this.lastNow || now)) / 1000); this.lastNow = now;
    if (this.paused) raw = 0;
    let dt = raw;
    if (this.stopT > 0) { this.stopT -= raw; dt = raw * .05; }
    if (this.slowT > 0) { this.slowT -= raw; dt *= this.slowS; }
    this.t += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].t <= this.t) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); }
    const inp = this.input.read();
    if (inp.pause && (this.state === 'battle')) this.pause(!this.paused);
    if (this.player && !this.paused) {
      const live = this.state === 'battle' || this.state === 'ending';
      this.player.update(dt, live && this.state === 'battle' ? inp : { x: 0, y: 0 });
      for (let i = this.enemies.length - 1; i >= 0; i--) { const e = this.enemies[i]; if (!e.update(dt)) { e.remove(); this.enemies.splice(i, 1); if (e === this.boss) this.boss = null; } }
      for (let i = this.allies.length - 1; i >= 0; i--) { const a = this.allies[i]; if (!a.update(dt)) { a.remove(); this.allies.splice(i, 1); } }
      for (let i = this.shots.length - 1; i >= 0; i--) if (!this.shots[i].update(dt)) { this.shots[i].remove(); this.shots.splice(i, 1); }
      for (let i = this.orbs.length - 1; i >= 0; i--) if (!this.orbs[i].update(dt)) { this.orbs[i].remove(); this.orbs.splice(i, 1); }
      this.waveUpdate(dt);
      if (this.state !== 'battle') this.hud(); else if ((this._hudT = (this._hudT || 0) - raw) <= 0) { this._hudT = .05; this.hud(); }
      // camera follows the player, leaning toward where the enemies come from
      if (this.state === 'battle') {
        const P = this.player, halfW = Math.tan(THREE.MathUtils.degToRad(this.camGoal.fov) / 2) * this.camGoal.z * this.camera.aspect;
        const lim = Math.max(0, ARENA.x1 + 1.5 - halfW);
        const cx = clamp(P.x * .75 - this.side.homeDir * 1.2, -lim, lim);
        this.camGoal.z = P.evo ? P.form.cam : 15.5;
        this.camGoal.x = cx; this.camGoal.lx = cx; this.camGoal.y = clamp(6.1 + (P.y - 5.2) * .12, 5.8, 6.4); this.camGoal.ly = this.camGoal.y - .1;
      }
      // sky leans toward the side that is winning the screen: the enemy world grows behind the fight
      const lean = this.state === 'battle' || this.state === 'ending' ? -this.side.homeDir * .5 : 0;
      this.env.skyU.uBias.value += (lean - this.env.skyU.uBias.value) * Math.min(1, raw * .5);
    }
    // title showcase hover
    const hw = Math.tan(THREE.MathUtils.degToRad(19)) * 10 * this.camera.aspect; // half width of the view at the heroes' depth
    for (const s of this.showcase) { s.m.anim.update(raw); s.m.root.position.x = -s.face * Math.min(6.4, hw * .72); s.m.root.position.y = 4.0 + Math.sin(this.t * 1.6 + s.ph) * .15; s.m.turn.rotation.z = Math.sin(this.t * .9 + s.ph) * .04; }
    this.fx.update(dt);
    updateWorld(this.env, raw, this.cam.x);
    // camera smoothing + shake
    const k = Math.min(1, raw * 3.2);
    for (const key of ['x', 'y', 'z', 'lx', 'ly']) this.cam[key] += (this.camGoal[key] - this.cam[key]) * k;
    this.shakeA = Math.max(0, this.shakeA - raw * 1.8);
    const s = this.shakeA * this.shakeA * .6;
    this.camera.position.set(this.cam.x + rnd(-s, s), this.cam.y + rnd(-s, s), this.cam.z);
    this.camera.lookAt(this.cam.lx, this.cam.ly, 0);
    if (this.audio.ready) this.audio.setListener({ x: this.cam.x, y: this.cam.y, z: 8 }, { x: 0, y: 0, z: -1 });
    if (this.state === 'title' || this.state === 'boot') this.renderer.render(this.titleScene, this.camera); // painted sky + the 3D heroes
    else if (this.state !== 'scan' && this.state !== 'verdict') this.renderer.render(this.scene, this.camera); // scan / result screens are painted full-screen
  }
}

/** a soap-bubble shield: clear in the middle, glowing at the rim, with slow ripples */
function shieldMaterial(color, strength = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color).multiplyScalar(strength) }, t: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 c; uniform float t; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float f = pow(1. - abs(dot(normalize(vN), vV)), 2.6); float rip = .5 + .5 * sin(vP.y * 9. + t * 4.) * sin(vP.x * 7. - t * 3.);
        float a = f * .9 + rip * .05; gl_FragColor = vec4(c * (f * 1.3 + .08), a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}
function fmtTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function heroBadge(key) {
  const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d');
  const g = x.createRadialGradient(60, 50, 10, 60, 60, 60); g.addColorStop(0, key === 'angel' ? '#fff3cf' : '#ffb07a'); g.addColorStop(1, key === 'angel' ? '#b9832a' : '#6e1f0c');
  x.fillStyle = g; x.fillRect(0, 0, 120, 120);
  x.font = '900 64px "Frank Ruhl Libre", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = key === 'angel' ? '#5a3a08' : '#fff1e2';
  x.fillText(key === 'angel' ? 'מ' : 'ש', 60, 64);
  return c.toDataURL();
}

new Game();
