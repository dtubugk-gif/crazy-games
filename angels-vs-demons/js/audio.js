// Audio engine: buses (music / sfx / ambience) -> compressor -> limiter -> out.
// Positional SFX through PannerNodes, variation rotation with pitch/volume jitter,
// music state crossfades, ducking, per-island ambience crossfades. Starts on the first tap.

const BASE = 'audio/';

export class Audio {
  constructor() {
    this.ctx = null; this.ready = false; this.manifest = null;
    this.raw = new Map(); this.buf = new Map(); this.rot = new Map();
    this.vol = { music: 0.8, sfx: 0.8, muted: false };
    this.loops = new Map(); this.music = new Map();
    this.musicState = null; this.ambState = new Map();
    this.duck = 1; this.lastPlay = new Map();
  }

  async preload() {
    try {
      const r = await fetch(BASE + 'manifest.json');
      this.manifest = await r.json();
    } catch (e) { console.warn('audio manifest missing', e); this.manifest = { sfx: {}, loops: {}, music: {} }; return; }
    const files = new Set();
    for (const g of ['sfx', 'loops', 'music']) {
      for (const [k, v] of Object.entries(this.manifest[g] || {})) {
        for (const f of (v.files || [v.file])) if (f) files.add(f);
      }
    }
    // Safari (esp. older iOS) cannot decode Ogg Vorbis: use the AAC copies there
    const a = document.createElement('audio');
    const ogg = a.canPlayType('audio/ogg; codecs="vorbis"') !== '' && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    await Promise.all([...files].map(async f => {
      const url = ogg ? BASE + f : BASE + 'm4a/' + f.replace(/\.ogg$/, '.mp4');
      try { const r = await fetch(url); if (r.ok) this.raw.set(f, await r.arrayBuffer()); } catch (e) { /* skip */ }
    }));
  }

  // must be called from a user gesture
  async unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.out = c.createGain();
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.knee.value = 8; this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.005; this.comp.release.value = 0.18;
    this.lim = c.createDynamicsCompressor();
    this.lim.threshold.value = -2; this.lim.knee.value = 0; this.lim.ratio.value = 20;
    this.lim.attack.value = 0.001; this.lim.release.value = 0.08;
    this.comp.connect(this.lim); this.lim.connect(this.out); this.out.connect(c.destination);
    this.musicBus = c.createGain(); this.musicDuck = c.createGain();
    this.musicBus.connect(this.musicDuck); this.musicDuck.connect(this.comp);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.comp);
    this.ambBus = c.createGain(); this.ambBus.connect(this.comp);
    this.applyVolumes();
    if (c.state !== 'running') await c.resume();
    // decode everything that is already downloaded
    await Promise.all([...this.raw.entries()].map(async ([f, ab]) => {
      try { this.buf.set(f, await c.decodeAudioData(ab.slice(0))); } catch (e) { console.warn('decode', f, e); }
    }));
    this.ready = true;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, m = this.vol.muted ? 0 : 1;
    // mix: SFX files peak near -3 dBFS while the music averages about -17 LUFS, so the effects bus is
    // trimmed (0.5) so a chop peaks level with the music peaks instead of ~6 dB over them (measured offline)
    this.musicBus.gain.setTargetAtTime(this.vol.music * m * 1.0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx * m * 1.0, t, 0.05); // pack gains are measured against the music at equal bus levels
    this.ambBus.gain.setTargetAtTime(this.vol.sfx * m * 1.0, t, 0.05);
  }

  setListener(pos, fwd) {
    if (!this.ctx) return;
    const L = this.ctx.listener, t = this.ctx.currentTime;
    if (L.positionX) {
      L.positionX.setTargetAtTime(pos.x, t, 0.03); L.positionY.setTargetAtTime(pos.y, t, 0.03); L.positionZ.setTargetAtTime(pos.z, t, 0.03);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.03); L.forwardY.setTargetAtTime(fwd.y, t, 0.03); L.forwardZ.setTargetAtTime(fwd.z, t, 0.03);
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
  }

  pickFile(name) {
    const e = this.manifest?.sfx?.[name];
    if (!e) return null;
    const files = e.files.filter(f => this.buf.has(f));
    if (!files.length) return null;
    // rotate variations, never the same one twice in a row
    let i = this.rot.get(name) ?? Math.floor(Math.random() * files.length);
    i = (i + 1 + Math.floor(Math.random() * Math.max(1, files.length - 1))) % files.length;
    this.rot.set(name, i);
    return { buffer: this.buf.get(files[i]), gain: e.gain ?? 1 };
  }

  /** play a one-shot. opts: {pos: Vector3, vol, pitch, jitter, minGap, duck} */
  play(name, opts = {}) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const gap = opts.minGap ?? 0.03;
    if (now - (this.lastPlay.get(name) ?? -1) < gap) return;
    this.lastPlay.set(name, now);
    const f = this.pickFile(name); if (!f) return;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = f.buffer;
    const j = opts.jitter ?? 0.07;
    src.playbackRate.value = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * j);
    const g = c.createGain();
    g.gain.value = f.gain * (opts.vol ?? 1) * (1 + (Math.random() * 2 - 1) * 0.08);
    src.connect(g);
    let tail = g;
    if (opts.pos) {
      const p = c.createPanner();
      p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
      p.refDistance = 4; p.maxDistance = 60; p.rolloffFactor = 1.2;
      if (p.positionX) { p.positionX.value = opts.pos.x; p.positionY.value = opts.pos.y; p.positionZ.value = opts.pos.z; }
      else p.setPosition(opts.pos.x, opts.pos.y, opts.pos.z);
      g.connect(p); tail = p;
    }
    tail.connect(this.sfxBus);
    src.start();
    if (opts.duck) this.duckMusic(opts.duck, f.buffer.duration);
    return src;
  }

  duckMusic(amount = 0.45, dur = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, gn = this.musicDuck.gain;
    gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t);
    gn.linearRampToValueAtTime(amount, t + 0.06);
    gn.setTargetAtTime(1, t + Math.min(dur, 2.5), 0.5);
  }

  _loop(file, bus, gain) {
    const b = this.buf.get(file); if (!b) return null;
    const src = this.ctx.createBufferSource(); src.buffer = b; src.loop = true;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(g); g.connect(bus); src.start(0, Math.random() * b.duration * 0.5);
    return { src, g, base: gain };
  }

  /** music: any looping 'music_*' entry of the manifest, or null for silence */
  setMusic(state, fade = 2.2) {
    if (!this.ready || state === this.musicState) return;
    this.musicState = state;
    const t = this.ctx.currentTime;
    for (const name of Object.keys(this.manifest.music || {}).filter(n => n.startsWith('music_'))) {
      let m = this.music.get(name);
      const e = this.manifest.music?.[name];
      if (!m && e) { m = this._loop(e.file, this.musicBus, e.gain ?? 1); if (m) { m.src.loopStart = 0; this.music.set(name, m); } }
      if (!m) continue;
      const target = name === state ? m.base : 0;
      m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t);
      m.g.gain.linearRampToValueAtTime(target, t + fade);
    }
  }

  stinger(name) {
    if (!this.ready) return;
    const e = this.manifest.music?.[name]; const b = e && this.buf.get(e.file); if (!b) return;
    const src = this.ctx.createBufferSource(); src.buffer = b;
    const g = this.ctx.createGain(); g.gain.value = e.gain ?? 1;
    src.connect(g); g.connect(this.musicDuck);
    const t = this.ctx.currentTime;
    for (const m of this.music.values()) { m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(0.05, t + 0.4); }
    src.start();
    src.onended = () => { const s = this.musicState; if (!s) return; this.musicState = null; this.setMusic(s, 3); };
  }

  /** ambience weights {amb_meadow: 0..1, ...} crossfaded */
  setAmbience(weights) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (const [name, w] of Object.entries(weights)) {
      let l = this.loops.get(name);
      if (!l) {
        const e = this.manifest.loops?.[name]; if (!e) continue;
        l = this._loop(e.file, this.ambBus, e.gain ?? 1); if (!l) continue; this.loops.set(name, l);
      }
      const prev = this.ambState.get(name) ?? -1;
      if (Math.abs(prev - w) < 0.02) continue;
      this.ambState.set(name, w);
      l.g.gain.setTargetAtTime(l.base * w, t, 0.8);
    }
  }

  /** a looping positional emitter (furnace fire, windmill). returns {setPos, stop} */
  emitter(name, pos, vol = 1) {
    if (!this.ready) return null;
    const e = this.manifest.loops?.[name]; const b = e && this.buf.get(e.file); if (!b) return null;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = b; src.loop = true;
    const g = c.createGain(); g.gain.value = (e.gain ?? 1) * vol;
    const p = c.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
    p.refDistance = 2.5; p.maxDistance = 40; p.rolloffFactor = 1.6;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    src.connect(g); g.connect(p); p.connect(this.sfxBus); src.start(0, Math.random() * b.duration);
    return { stop: () => { try { src.stop(); } catch (e) { } } };
  }

  /** a controllable loop (charge hum, flight wind, ice beam, burning barricade, drone buzz).
   *  Looks in loops first, then sfx (first file). opts: {pos, vol, fadeIn}. Returns {setVol, setPos, setRate, stop} or null. */
  loop(name, opts = {}) {
    if (!this.ready) return null;
    const e = this.manifest.loops?.[name] || this.manifest.sfx?.[name];
    const file = e && (e.file || e.files?.[0]); const b = file && this.buf.get(file); if (!b) return null;
    const c = this.ctx, t = c.currentTime, base = (e.gain ?? 1);
    const src = c.createBufferSource(); src.buffer = b; src.loop = true;
    const g = c.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(base * (opts.vol ?? 1), t, opts.fadeIn ?? 0.05);
    src.connect(g);
    let p = null;
    if (opts.pos) {
      p = c.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
      p.refDistance = 3; p.maxDistance = 45; p.rolloffFactor = 1.4;
      g.connect(p); p.connect(this.sfxBus);
    } else g.connect(this.sfxBus);
    const setPos = (q) => { if (!p) return; if (p.positionX) { p.positionX.value = q.x; p.positionY.value = q.y; p.positionZ.value = q.z; } else p.setPosition(q.x, q.y, q.z); };
    if (opts.pos) setPos(opts.pos);
    src.start(0, Math.random() * b.duration);
    let dead = false;
    return {
      setVol: (v, tc = 0.06) => { if (!dead) g.gain.setTargetAtTime(base * v, c.currentTime, tc); },
      setRate: (r) => { if (!dead) src.playbackRate.setTargetAtTime(r, c.currentTime, 0.05); },
      setPos,
      stop: (fade = 0.12) => { if (dead) return; dead = true; const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(0, n + fade); try { src.stop(n + fade + 0.02); } catch (er) { } },
    };
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
}
