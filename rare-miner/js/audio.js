// Audio engine: music / sfx / ambience buses -> compressor -> limiter -> out.
// Variation rotation with pitch/volume jitter, synced music crossfades (dig <-> deep), ambience
// crossfades, ducking. Starts on the first tap (mobile rule). Same family as the channel's earlier games.

const BASE = 'audio/';

export class Audio {
  constructor() {
    this.ctx = null; this.ready = false; this.manifest = null;
    this.raw = new Map(); this.buf = new Map(); this.rot = new Map();
    this.vol = { music: 0.8, sfx: 0.8, muted: false };
    this.music = new Map(); this.loops = new Map(); this.ambState = new Map(); this.musicW = {};
    this.lastPlay = new Map();
  }

  async preload() {
    try { const r = await fetch(BASE + 'manifest.json'); this.manifest = await r.json(); }
    catch (e) { console.warn('audio manifest missing', e); this.manifest = { sfx: {}, loops: {}, music: {} }; return; }
    const files = new Set();
    for (const grp of ['sfx', 'loops', 'music']) for (const v of Object.values(this.manifest[grp] || {})) for (const f of (v.files || [v.file])) if (f) files.add(f);
    // Safari cannot decode Ogg Vorbis everywhere: use the AAC copies there
    const a = document.createElement('audio');
    const ogg = a.canPlayType('audio/ogg; codecs="vorbis"') !== '' && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    await Promise.all([...files].map(async f => {
      const url = ogg ? BASE + f : BASE + 'm4a/' + f.replace(/\.ogg$/, '.mp4');
      try { const r = await fetch(url); if (r.ok) this.raw.set(f, await r.arrayBuffer()); } catch (e) { /* skip */ }
    }));
  }

  /** must be called from a user gesture */
  async unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.out = c.createGain();
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.knee.value = 8; this.comp.ratio.value = 3.5; this.comp.attack.value = 0.005; this.comp.release.value = 0.18;
    this.lim = c.createDynamicsCompressor();
    this.lim.threshold.value = -2; this.lim.knee.value = 0; this.lim.ratio.value = 20; this.lim.attack.value = 0.001; this.lim.release.value = 0.08;
    this.comp.connect(this.lim); this.lim.connect(this.out); this.out.connect(c.destination);
    this.musicBus = c.createGain(); this.musicDuck = c.createGain(); this.musicBus.connect(this.musicDuck); this.musicDuck.connect(this.comp);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.comp);
    this.ambBus = c.createGain(); this.ambBus.connect(this.comp);
    this.applyVolumes();
    if (c.state !== 'running') { try { await c.resume(); } catch (e) { } }
    await Promise.all([...this.raw.entries()].map(async ([f, ab]) => {
      try { this.buf.set(f, await c.decodeAudioData(ab.slice(0))); } catch (e) { console.warn('decode', f, e); }
    }));
    this.ready = true;
    // start every music loop together (silent) so music_dig and music_deep stay in sync for crossfades
    const t0 = c.currentTime + 0.05;
    for (const [name, e] of Object.entries(this.manifest.music || {})) {
      if (name.startsWith('stinger')) continue;
      const b = this.buf.get(e.file); if (!b) continue;
      const src = c.createBufferSource(); src.buffer = b; src.loop = true;
      const g = c.createGain(); g.gain.value = 0; src.connect(g); g.connect(this.musicBus); src.start(t0);
      this.music.set(name, { src, g, base: e.gain ?? 1 });
    }
    if (this.pendingMusic) this.setMusic(this.pendingMusic, 1.2);
    if (this.pendingAmb) this.setAmbience(this.pendingAmb);
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, m = this.vol.muted ? 0 : 1;
    this.musicBus.gain.setTargetAtTime(this.vol.music * m, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx * m, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.sfx * m, t, 0.05);
  }

  pickFile(name) {
    const e = this.manifest?.sfx?.[name]; if (!e) return null;
    const files = (e.files || [e.file]).filter(f => this.buf.has(f)); if (!files.length) return null;
    let i = this.rot.get(name) ?? Math.floor(Math.random() * files.length);
    i = (i + 1 + Math.floor(Math.random() * Math.max(1, files.length - 1))) % files.length;
    this.rot.set(name, i);
    return { buffer: this.buf.get(files[i]), gain: e.gain ?? 1 };
  }

  /** one-shot. opts: {vol, pitch, jitter, minGap, duck, delay} */
  play(name, opts = {}) {
    if (!this.ready) return null;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlay.get(name) ?? -1) < (opts.minGap ?? 0.03)) return null;
    this.lastPlay.set(name, now);
    const f = this.pickFile(name); if (!f) return null;
    const c = this.ctx, src = c.createBufferSource(); src.buffer = f.buffer;
    const j = opts.jitter ?? 0.06;
    src.playbackRate.value = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * j);
    const g = c.createGain(); g.gain.value = f.gain * (opts.vol ?? 1) * (1 + (Math.random() * 2 - 1) * 0.08);
    src.connect(g); g.connect(this.sfxBus); src.start(now + (opts.delay || 0));
    if (opts.duck) this.duckMusic(opts.duck, f.buffer.duration);
    return src;
  }

  duckMusic(amount = 0.5, dur = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, gn = this.musicDuck.gain;
    gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t);
    gn.linearRampToValueAtTime(amount, t + 0.06); gn.setTargetAtTime(1, t + Math.min(dur, 2.5), 0.45);
  }

  /** state: one loop name, or a weights object {music_dig: .7, music_deep: .3}; null = silence */
  setMusic(state, fade = 1.8) {
    const weights = typeof state === 'string' ? { [state]: 1 } : (state || {});
    if (!this.ready) { this.pendingMusic = weights; return; }
    const key = JSON.stringify(weights);
    if (key === this.musicKey) return; this.musicKey = key;
    const t = this.ctx.currentTime;
    for (const [name, m] of this.music) {
      const target = (weights[name] || 0) * m.base;
      m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(target, t + fade);
    }
  }

  stinger(name) {
    if (!this.ready) return;
    const e = this.manifest.music?.[name]; const b = e && this.buf.get(e.file); if (!b) return;
    const c = this.ctx, src = c.createBufferSource(); src.buffer = b;
    const g = c.createGain(); g.gain.value = e.gain ?? 1; src.connect(g); g.connect(this.musicDuck);
    const t = c.currentTime;
    for (const m of this.music.values()) { m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(m.g.gain.value * 0.12, t + 0.3); }
    src.start();
    src.onended = () => { const k = this.musicKey; this.musicKey = null; if (k) this.setMusic(JSON.parse(k), 2.5); };
  }

  /** ambience weights {amb_cave: 0..1, ...}, crossfaded */
  setAmbience(weights) {
    if (!this.ready) { this.pendingAmb = weights; return; }
    const t = this.ctx.currentTime;
    for (const name of Object.keys(this.manifest.loops || {})) {
      const w = weights[name] || 0;
      let l = this.loops.get(name);
      if (!l) {
        if (w <= 0) continue;
        const e = this.manifest.loops[name]; const b = this.buf.get(e.file); if (!b) continue;
        const src = this.ctx.createBufferSource(); src.buffer = b; src.loop = true;
        const g = this.ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(this.ambBus);
        src.start(0, Math.random() * b.duration * 0.6);
        l = { src, g, base: e.gain ?? 1 }; this.loops.set(name, l);
      }
      if (Math.abs((this.ambState.get(name) ?? -1) - w) < 0.02) continue;
      this.ambState.set(name, w); l.g.gain.setTargetAtTime(l.base * w, t, 0.9);
    }
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
}
