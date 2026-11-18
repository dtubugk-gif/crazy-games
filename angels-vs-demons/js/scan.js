// Face scan: selfie camera -> one photo -> face box + eye/nose/mouth points (MediaPipe face detector, optional)
// -> numbers read from the photo -> angel or demon. Then a halo + white wings or horns + bat wings are painted on it.
// The photo never leaves this device: no upload, nothing stored, the camera is switched off right after the photo.

const MP_VER = '0.10.14';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/vision_bundle.mjs`;
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/wasm`;
const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class FaceScan {
  constructor() { this.stream = null; this.det = null; this.detTried = false; this.last = null; this.video = null; this.loop = 0; }

  static supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && isSecureContext; }

  async loadDetector() {
    if (this.detTried) return this.det; this.detTried = true;
    try {
      const mp = await Promise.race([import(MP_URL), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 9000))]);
      const files = await mp.FilesetResolver.forVisionTasks(MP_WASM);
      const make = (delegate) => mp.FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: MP_MODEL, delegate }, runningMode: 'VIDEO', minDetectionConfidence: .45 });
      try { this.det = await make('GPU'); } catch (e) { this.det = await make('CPU'); }
    } catch (e) { console.warn('face detector unavailable, using the centre of the photo', e); this.det = null; }
    return this.det;
  }

  /** start the front camera into <video>; resolves when frames arrive. Throws {code} on failure. */
  async start(video) {
    this.video = video;
    if (!FaceScan.supported()) throw { code: 'unsupported' };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      throw { code: e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : (e && e.name === 'NotFoundError' ? 'nocam' : 'error'), e };
    }
    video.srcObject = this.stream; video.muted = true; video.playsInline = true;
    await video.play().catch(() => { });
    await new Promise(r => { if (video.videoWidth) r(); else video.onloadedmetadata = () => r(); setTimeout(r, 2500); });
    this.loadDetector();
  }

  /** live tracking: calls cb(face|null) about 12 times a second (face in video pixels, unmirrored) */
  track(cb) {
    cancelAnimationFrame(this.loop);
    let lastT = 0;
    const tick = (t) => {
      this.loop = requestAnimationFrame(tick);
      if (t - lastT < 80 || !this.video || this.video.readyState < 2) return; lastT = t;
      const f = this.detect(t); this.last = f; cb(f);
    };
    this.loop = requestAnimationFrame(tick);
  }
  detect(t = performance.now()) {
    if (!this.det || !this.video) return null;
    try {
      const r = this.det.detectForVideo(this.video, t);
      const d = r && r.detections && r.detections.sort((a, b) => b.boundingBox.width - a.boundingBox.width)[0];
      if (!d) return null;
      const b = d.boundingBox, W = this.video.videoWidth, H = this.video.videoHeight;
      const kp = (d.keypoints || []).map(k => ({ x: k.x * W, y: k.y * H }));
      return { x: b.originX, y: b.originY, w: b.width, h: b.height, kp, score: d.categories?.[0]?.score || 0 };
    } catch (e) { return null; }
  }

  /** freeze one frame (mirrored like a selfie) + the face found in it */
  capture() {
    const v = this.video, W = v.videoWidth || 640, H = v.videoHeight || 480;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.translate(W, 0); x.scale(-1, 1); x.drawImage(v, 0, 0, W, H);
    let f = this.detect() || this.last;
    let face;
    if (f) face = { x: W - f.x - f.w, y: f.y, w: f.w, h: f.h, kp: f.kp.map(k => ({ x: W - k.x, y: k.y })), found: true };
    else { const w = Math.min(W, H) * .46; face = { x: W / 2 - w / 2, y: H * .44 - w * .6, w, h: w * 1.15, kp: [], found: false }; }
    // MediaPipe keypoints: 0 right eye, 1 left eye, 2 nose, 3 mouth, 4/5 ears. Make sure we always have eyes/nose/mouth.
    if (face.kp.length < 4) {
      const { x: fx, y: fy, w, h } = face;
      face.kp = [{ x: fx + w * .68, y: fy + h * .4 }, { x: fx + w * .32, y: fy + h * .4 }, { x: fx + w * .5, y: fy + h * .6 }, { x: fx + w * .5, y: fy + h * .78 }];
    }
    return { canvas: c, face };
  }

  stop() {
    cancelAnimationFrame(this.loop);
    if (this.stream) for (const t of this.stream.getTracks()) t.stop();
    this.stream = null; if (this.video) this.video.srcObject = null;
  }

  /** read the photo: light, warmth, colour, contrast, the eyes and the smile + a stable fingerprint of the face */
  analyse(photo) {
    const { canvas, face } = photo, W = canvas.width, H = canvas.height;
    const x = canvas.getContext('2d', { willReadFrequently: true });
    const rx = clamp(Math.round(face.x), 0, W - 2), ry = clamp(Math.round(face.y), 0, H - 2);
    const rw = clamp(Math.round(face.w), 2, W - rx), rh = clamp(Math.round(face.h), 2, H - ry);
    const d = x.getImageData(rx, ry, rw, rh).data;
    let sr = 0, sg = 0, sb = 0, sl = 0, sl2 = 0, ss = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, l = .299 * r + .587 * g + .114 * b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      sr += r; sg += g; sb += b; sl += l; sl2 += l * l; ss += mx > 0 ? (mx - mn) / mx : 0; n++;
    }
    const lum = sl / n, contrast = Math.sqrt(Math.max(0, sl2 / n - lum * lum)), warm = (sr - sb) / n, sat = ss / n, red = (sr - sg) / n;
    const patch = (px, py, s) => {
      const a = clamp(Math.round(px - s / 2), 0, W - 2), b = clamp(Math.round(py - s / 2), 0, H - 2), z = Math.max(2, Math.round(s));
      const p = x.getImageData(a, b, Math.min(z, W - a), Math.min(z, H - b)).data; let l = 0, lmax = 0, r = 0, gg = 0, m = 0;
      for (let i = 0; i < p.length; i += 4) { const v = (.299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]) / 255; l += v; lmax = Math.max(lmax, v); r += p[i] / 255; gg += p[i + 1] / 255; m++; }
      return { l: l / m, max: lmax, red: (r - gg) / m };
    };
    const s = face.w * .14, e1 = patch(face.kp[0].x, face.kp[0].y, s), e2 = patch(face.kp[1].x, face.kp[1].y, s), mo = patch(face.kp[3].x, face.kp[3].y, s * 1.4);
    const sparkle = ((e1.max - e1.l) + (e2.max - e2.l)) / 2; // catch-lights in the eyes
    // fingerprint: 16x16 average hash of the face -> FNV-1a -> 0..1 (the same face in the same light gives the same answer)
    const t = document.createElement('canvas'); t.width = t.height = 16; const tx = t.getContext('2d', { willReadFrequently: true });
    tx.drawImage(canvas, rx, ry, rw, rh, 0, 0, 16, 16); const td = tx.getImageData(0, 0, 16, 16).data;
    let mean = 0; const g = []; for (let i = 0; i < td.length; i += 4) { const v = td[i] * .3 + td[i + 1] * .59 + td[i + 2] * .11; g.push(v); mean += v; } mean /= g.length;
    let h = 2166136261; for (let i = 0; i < g.length; i++) { h ^= g[i] > mean ? 1 + (i & 7) : 0; h = Math.imul(h, 16777619) >>> 0; }
    h ^= Math.round(lum * 40) * 2654435761 >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; h ^= h >>> 16;
    const hashU = (h >>> 0) / 4294967296;

    // the readouts (0..100) the scan shows, all computed from the photo
    const pct = v => Math.round(clamp(v, 0, 1) * 100);
    const R = {
      light: pct(.15 + lum * 1.1),
      sparkle: pct(.25 + sparkle * 2.4),
      smile: pct(.35 + mo.red * 6 + (mo.l - lum) * .8),
      fire: pct(.2 + warm * 3.2 + red * 2),
      shadow: pct(1.05 - lum * 1.2 + contrast * .8),
    };
    // decision: mostly the face's fingerprint (so it is about half and half), nudged by what the photo shows
    let angel = .5 + (hashU - .5) * .92 + (R.light - 55) / 100 * .18 + (R.sparkle - 50) / 100 * .12 - (R.fire - 50) / 100 * .14 - (R.shadow - 50) / 100 * .1;
    angel = clamp(angel, .04, .96);
    let pctAngel = Math.round(angel * 100); if (pctAngel === 50) pctAngel = hashU > .5 ? 51 : 49;
    return { side: pctAngel > 50 ? 'angel' : 'demon', pctAngel, read: R, face, found: face.found };
  }

  /** fallback without a camera: decided by how steadily you hold the pad + luck */
  static fingerResult(samples) {
    let jitter = 0; for (let i = 1; i < samples.length; i++) jitter += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
    const u = (Math.sin(jitter * 12.9898 + samples.length * 78.233 + Date.now() % 997) * 43758.5453) % 1;
    const a = clamp(.5 + (Math.abs(u) - .5) * .9, .04, .96);
    let p = Math.round(a * 100); if (p === 50) p = 51;
    const r = v => Math.round(clamp(v, 0, 1) * 100);
    return { side: p > 50 ? 'angel' : 'demon', pctAngel: p, read: { light: r(a * .9 + .1), sparkle: r(.3 + a * .5), smile: r(.6 - jitter * .002), fire: r(1 - a), shadow: r(.95 - a * .8) }, face: null, found: false, finger: true };
  }
}

// ======================================================================== painting the verdict on the photo
/** returns a canvas: the photo graded warm-gold (angel) or ember-red (demon) with halo+wings or horns+bat wings */
export function paintVerdict(photo, res) {
  const src = photo.canvas, W = src.width, H = src.height, f = res.face;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const angel = res.side === 'angel';
  x.drawImage(src, 0, 0);
  // colour grade
  x.globalCompositeOperation = 'soft-light';
  const gr = x.createRadialGradient(f.x + f.w / 2, f.y + f.h * .4, f.w * .3, W / 2, H / 2, Math.max(W, H) * .75);
  if (angel) { gr.addColorStop(0, 'rgba(255,236,190,.85)'); gr.addColorStop(1, 'rgba(255,200,120,.6)'); }
  else { gr.addColorStop(0, 'rgba(255,120,70,.7)'); gr.addColorStop(1, 'rgba(90,10,0,.9)'); }
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, angel ? 'rgba(255,240,200,.45)' : 'rgba(30,4,0,.65)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);

  const cx = f.x + f.w / 2, top = f.y - f.h * .08, w = f.w;
  if (angel) {
    drawWing(x, cx - w * .7, f.y + f.h * 1.3, w * 1.5, -1, false);
    drawWing(x, cx + w * .7, f.y + f.h * 1.3, w * 1.5, 1, false);
    // halo
    const hy = f.y - f.h * .55, hw = w * .44, hh = w * .11; // floats above the hair
    x.save(); x.shadowColor = 'rgba(255,210,120,.9)'; x.shadowBlur = w * .12;
    x.lineWidth = w * .05; const hg = x.createLinearGradient(cx - hw, hy, cx + hw, hy); hg.addColorStop(0, '#b8801f'); hg.addColorStop(.35, '#ffe9a6'); hg.addColorStop(.6, '#f2c04f'); hg.addColorStop(1, '#a8701a');
    x.strokeStyle = hg; x.beginPath(); x.ellipse(cx, hy, hw, hh, 0, 0, Math.PI * 2); x.stroke();
    x.shadowBlur = 0; x.lineWidth = w * .012; x.strokeStyle = 'rgba(255,250,230,.9)'; x.beginPath(); x.ellipse(cx, hy - hh * .25, hw * .96, hh * .7, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    x.restore();
    // sparkles
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = w * (.6 + Math.random() * .9); sparkle(x, cx + Math.cos(a) * r, f.y + f.h * .45 + Math.sin(a) * r * .9, w * (.012 + Math.random() * .025), 'rgba(255,246,215,.95)'); }
    for (const k of f.kp.slice(0, 2)) sparkle(x, k.x + w * .02, k.y - w * .02, w * .03, 'rgba(255,255,255,.95)');
  } else {
    drawWing(x, cx - w * .68, f.y + f.h * 1.3, w * 1.45, -1, true);
    drawWing(x, cx + w * .68, f.y + f.h * 1.3, w * 1.45, 1, true);
    drawHorn(x, cx - w * .24, f.y + f.h * .06, w * .7, -1);
    drawHorn(x, cx + w * .24, f.y + f.h * .06, w * .7, 1);
    for (const k of f.kp.slice(0, 2)) { const g2 = x.createRadialGradient(k.x, k.y, 0, k.x, k.y, w * .07); g2.addColorStop(0, 'rgba(255,190,90,.75)'); g2.addColorStop(.4, 'rgba(255,90,20,.35)'); g2.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g2; x.fillRect(k.x - w * .08, k.y - w * .08, w * .16, w * .16); }
    for (let i = 0; i < 40; i++) { const ex = Math.random() * W, ey = H * (.35 + Math.random() * .65), r = w * (.006 + Math.random() * .014); const g3 = x.createRadialGradient(ex, ey, 0, ex, ey, r * 3); g3.addColorStop(0, 'rgba(255,200,120,.95)'); g3.addColorStop(.35, 'rgba(255,110,30,.6)'); g3.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g3; x.fillRect(ex - r * 3, ey - r * 3, r * 6, r * 6); }
  }
  return c;
}

function sparkle(x, px, py, r, col) {
  x.save(); x.fillStyle = col; x.shadowColor = col; x.shadowBlur = r * 3; x.beginPath();
  x.moveTo(px, py - r * 2.4); x.quadraticCurveTo(px, py, px + r * 2.4, py); x.quadraticCurveTo(px, py, px, py + r * 2.4); x.quadraticCurveTo(px, py, px - r * 2.4, py); x.quadraticCurveTo(px, py, px, py - r * 2.4);
  x.fill(); x.restore();
}

/** a feathered angel wing or a leathery bat wing, rooted at (rx, ry), opening toward dir (-1 left, 1 right) */
function drawWing(x, rx, ry, size, dir, bat) {
  x.save(); x.translate(rx, ry); x.scale(dir, 1);
  if (!bat) {
    // a real wing: a curved leading edge (the arm) rising from the shoulder, flight feathers hanging from it,
    // longest at the tip (primaries), drawn back-to-front: primaries, secondaries, then the small coverts on top
    const edge = t => { const u = 1 - t; return { x: 3 * u * t * t * size * .5 + 3 * u * u * t * size * .08 + t * t * t * size * .92, y: 3 * u * u * t * -size * .95 + 3 * u * t * t * -size * 1.12 + t * t * t * -size * .55 }; };
    const rows = [
      { n: 15, len: t => size * (.34 + .62 * t * t), w: .085, off: 0, col: ['#f4efe4', '#cfc6b4'] },
      { n: 13, len: t => size * (.22 + .3 * t), w: .085, off: .02, col: ['#fbf8f1', '#dcd3c2'] },
      { n: 11, len: t => size * (.1 + .12 * t), w: .07, off: .03, col: ['#ffffff', '#e8e1d3'] },
    ];
    for (const R of rows) {
      for (let i = 0; i < R.n; i++) {
        const t = .05 + .95 * i / (R.n - 1), e = edge(t);
        const ang = Math.PI / 2 - .25 - t * 1.05; // hangs down near the body, sweeps outward toward the tip
        const L = R.len(t), Wd = size * R.w * (1 - t * .25);
        x.save(); x.translate(e.x, e.y + size * R.off); x.rotate(ang - Math.PI / 2);
        const g = x.createLinearGradient(0, 0, 0, L); g.addColorStop(0, R.col[0]); g.addColorStop(1, R.col[1]);
        x.fillStyle = g; x.shadowColor = 'rgba(90,70,40,.35)'; x.shadowBlur = size * .015;
        x.beginPath(); x.moveTo(-Wd * .5, 0); x.quadraticCurveTo(-Wd * .7, L * .55, -Wd * .08, L); x.quadraticCurveTo(Wd * .55, L * .6, Wd * .5, 0); x.closePath(); x.fill();
        x.shadowBlur = 0; x.strokeStyle = 'rgba(150,130,100,.5)'; x.lineWidth = Math.max(1, size * .004);
        x.beginPath(); x.moveTo(0, 0); x.lineTo(-Wd * .05, L * .92); x.stroke();
        x.restore();
      }
    }
    // the arm bone along the leading edge
    x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = size * .05; x.lineCap = 'round'; x.beginPath();
    for (let i = 0; i <= 20; i++) { const e = edge(i / 20); i ? x.lineTo(e.x, e.y) : x.moveTo(e.x, e.y); } x.stroke();
  } else {
    // bat wing: arm bone + 4 finger bones with membrane between them
    const arm = { x: size * .42, y: -size * .55 };
    const tips = [[size * .98, -size * .62], [size * 1.02, -size * .22], [size * .86, size * .12], [size * .58, size * .32], [size * .18, size * .3]];
    const mem = x.createLinearGradient(0, -size * .6, size, size * .3); mem.addColorStop(0, 'rgba(70,16,14,.94)'); mem.addColorStop(1, 'rgba(40,8,8,.9)');
    x.fillStyle = mem; x.beginPath(); x.moveTo(0, 0); x.lineTo(arm.x, arm.y);
    for (let i = 0; i < tips.length; i++) {
      const [tx, ty] = tips[i];
      if (i === 0) x.lineTo(tx, ty);
      else { const [px, py] = tips[i - 1]; x.quadraticCurveTo((px + tx) / 2 - size * .05, (py + ty) / 2 - size * .02 + size * .06, tx, ty); }
    }
    x.quadraticCurveTo(size * .05, size * .2, 0, 0); x.fill();
    x.strokeStyle = '#2a0c08'; x.lineWidth = size * .028; x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, 0); x.lineTo(arm.x, arm.y); x.stroke();
    x.lineWidth = size * .016; for (const [tx, ty] of tips.slice(0, 4)) { x.beginPath(); x.moveTo(arm.x, arm.y); x.lineTo(tx, ty); x.stroke(); }
    x.fillStyle = '#c9a98a'; x.beginPath(); x.moveTo(arm.x, arm.y); x.lineTo(arm.x - size * .02, arm.y - size * .1); x.lineTo(arm.x + size * .04, arm.y - size * .01); x.fill();
    // a faint warm rim from the fire light
    x.strokeStyle = 'rgba(255,120,50,.35)'; x.lineWidth = size * .008; x.beginPath(); x.moveTo(arm.x, arm.y); x.lineTo(tips[0][0], tips[0][1]); x.stroke();
  }
  x.restore();
}

function drawHorn(x, bx, by, size, dir) {
  x.save(); x.translate(bx, by); x.scale(dir, 1);
  const g = x.createLinearGradient(0, 0, size * .6, -size); g.addColorStop(0, '#3b2418'); g.addColorStop(.5, '#1d120d'); g.addColorStop(1, '#d8c2a0');
  x.fillStyle = g; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = size * .08;
  x.beginPath();
  x.moveTo(-size * .14, 0);
  x.bezierCurveTo(-size * .05, -size * .45, size * .22, -size * .75, size * .6, -size * 1.02); // outer edge to the tip
  x.bezierCurveTo(size * .3, -size * .62, size * .14, -size * .35, size * .16, 0);       // inner edge back down
  x.closePath(); x.fill(); x.shadowBlur = 0;
  // ridges
  x.strokeStyle = 'rgba(230,200,160,.35)'; x.lineWidth = Math.max(1, size * .02);
  for (let i = 1; i < 7; i++) { const t = i / 7; const px = -size * .1 + t * size * .55, py = -t * size * .9; x.beginPath(); x.moveTo(px - size * .1 * (1 - t), py + size * .02); x.quadraticCurveTo(px, py - size * .04, px + size * .14 * (1 - t) + size * .03, py + size * .03); x.stroke(); }
  x.restore();
}

/** a round portrait for the HUD, centred on the face */
export function portrait(painted, face, size = 160) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const f = face || { x: painted.width * .3, y: painted.height * .2, w: painted.width * .4, h: painted.height * .5 };
  const s = Math.max(f.w, f.h) * 1.9, cx = f.x + f.w / 2, cy = f.y + f.h * .38;
  x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, 7); x.clip();
  x.drawImage(painted, cx - s / 2, cy - s / 2, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', .85);
}
