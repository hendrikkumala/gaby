// Tampilan bola cahaya Gaby: bintang, garis energi, cincin emas, inti cahaya, HUD.

export const MOOD_COLORS = {
  tenang: [95, 212, 255],
  senang: [255, 200, 90],
  gemas: [255, 120, 200],
  ngambek: [255, 140, 60],
  marah: [255, 40, 55],
  mikir: [170, 120, 255],
  sedih: [110, 140, 255],
  kaget: [120, 255, 225],
};

const GOLD = [255, 200, 100];
const TAU = Math.PI * 2;

// Sifat bentuk tiap emosi: duri pada garis energi, getaran, dan apakah wajah tampil.
// face = visor mata tampil, heart = titik bola berubah jadi hati, glitch = efek layar tersobek,
// radar = sapuan pindai, warn = segmen peringatan berkedip.
const TRAITS = {
  tenang: { spikes: 0, shake: 0, face: 0, heart: 0, glitch: 0, radar: 0, warn: 0 },
  senang: { spikes: 0, shake: 0, face: 1, heart: 0, glitch: 0, radar: 0, warn: 0 },
  gemas: { spikes: 0, shake: 0, face: 0, heart: 1, glitch: 0, radar: 0, warn: 0 },
  ngambek: { spikes: 0.35, shake: 0.6, face: 1, heart: 0, glitch: 0.35, radar: 0, warn: 0.6 },
  marah: { spikes: 1, shake: 1.5, face: 1, heart: 0, glitch: 1, radar: 0, warn: 1 },
  mikir: { spikes: 0, shake: 0, face: 1, heart: 0, glitch: 0, radar: 1, warn: 0 },
  sedih: { spikes: 0, shake: 0, face: 1, heart: 0, glitch: 0, radar: 0, warn: 0 },
  kaget: { spikes: 0.15, shake: 0, face: 1, heart: 0, glitch: 0, radar: 0, warn: 0 },
};

// Titik-titik pembentuk hati hologram (sebagian di garis tepi, sebagian mengisi).
function heartPoints(n) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU * 7.31;
    const edge = i % 5 !== 0;
    const k = edge ? 1 : Math.sqrt(Math.random());
    const x = (16 * Math.sin(a) ** 3) / 17;
    const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17;
    return [x * k * 0.95, (y * k + 0.08) * 0.95, (Math.random() - 0.5) * 0.3 * (edge ? 0.4 : 1)];
  });
}

const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export class Visual {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.state = 'sleep';       // sleep | connecting | listening | speaking | thinking
    this.color = [...MOOD_COLORS.tenang];
    this.target = MOOD_COLORS.tenang;
    this.energy = 0;
    this.wake = 0;              // 0 = tidur, 1 = aktif (transisi halus)
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.ripples = [];
    this.lastRipple = 0;
    this.t = 0;
    this.last = performance.now();
    this.mood = 'tenang';
    this.prevMood = 'tenang';
    this.faceK = 1;             // 0 → 1 saat berganti ekspresi
    this.emotes = [];           // hati, kilau, uap, air mata, percikan
    this.emoteAcc = 0;

    this.stars = Array.from({ length: 170 }, () => this.newStar(true));
    this.loops = Array.from({ length: 8 }, (_, i) => ({
      rot: Math.random() * TAU,
      spin: (Math.random() - 0.5) * 0.12,
      squash: 0.3 + Math.random() * 0.7,
      size: 1.0 + i * 0.045 + Math.random() * 0.12,
      p: [Math.random() * TAU, Math.random() * TAU, Math.random() * TAU],
      speed: 0.2 + Math.random() * 0.35,
    }));
    // Titik-titik pada bola (sebaran Fibonacci).
    const n = 260;
    this.sphere = Array.from({ length: n }, (_, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    });
    this.heart = heartPoints(n);
    this.arcs = [
      { r: 1.3, len: 0.9, speed: 0.25, start: 0 },
      { r: 1.3, len: 0.35, speed: 0.25, start: 2.6 },
      { r: 1.36, len: 1.6, speed: -0.15, start: 1 },
      { r: 1.22, len: 0.5, speed: 0.4, start: 4 },
    ];

    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => this.resizeSoon());
    addEventListener('pageshow', () => this.resizeSoon());
    if (window.visualViewport) visualViewport.addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => {
      this.pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
      this.pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
    });
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      this.pointer.tx = Math.max(-1, Math.min(1, e.gamma / 30));
      this.pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    });
    requestAnimationFrame((t) => this.frame(t));
  }

  newStar(anywhere) {
    return {
      a: Math.random() * TAU,
      d: anywhere ? Math.random() : 0.02 + Math.random() * 0.1,
      z: 0.2 + Math.random() * 0.8,
      tw: Math.random() * TAU,
    };
  }

  resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    // Pakai ukuran kanvas sebenarnya di layar: setelah pindah aplikasi, iPhone kadang
    // melaporkan innerWidth/innerHeight yang keliru sehingga gambar jadi memanjang.
    this.w = this.canvas.clientWidth || innerWidth;
    this.h = this.canvas.clientHeight || innerHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // Hitung ulang ukuran beberapa kali (layar HP kadang baru stabil setelah sesaat).
  resizeSoon() {
    for (const ms of [0, 250, 800, 1600]) setTimeout(() => this.resize(), ms);
  }

  setMood(name) {
    if (!MOOD_COLORS[name] || name === this.mood) return;
    this.target = MOOD_COLORS[name];
    this.prevMood = this.mood;
    this.mood = name;
    this.faceK = 0;
    if (name === 'kaget') {
      this.emotes.push({ type: 'shock', r: 1, life: 1 }, { type: 'shock', r: 0.85, life: 1.15 });
      for (let i = 0; i < 24; i++) {
        this.emotes.push({ type: 'spark', a: (i / 24) * TAU, d: 1.05, v: 0.9 + Math.random() * 0.6, life: 1 });
      }
    }
  }

  trait(key) {
    const k = this.faceK;
    return TRAITS[this.mood][key] * k + TRAITS[this.prevMood][key] * (1 - k);
  }

  spawnEmotes(dt) {
    const rate = { senang: 14, gemas: 6, ngambek: 6, marah: 14, sedih: 22 }[this.mood] || 0;
    this.emoteAcc += dt * rate;
    while (this.emoteAcc >= 1) {
      this.emoteAcc -= 1;
      const r = Math.random;
      if (this.mood === 'senang') this.emotes.push({ type: 'bit', a: r() * TAU, d: 1.08, v: 0.25 + r() * 0.35, life: 1, gold: true });
      if (this.mood === 'gemas') this.emotes.push({ type: 'glint', x: (r() - 0.5) * 1.3, y: (r() - 0.5) * 1.2, life: 1 });
      if (this.mood === 'ngambek' || this.mood === 'marah') this.emotes.push({ type: 'bit', a: r() * TAU, d: 1.08, v: 0.5 + r() * 0.6, life: 1 });
      if (this.mood === 'sedih') this.emotes.push({ type: 'rain', x: (r() - 0.5) * 1.7, y: -0.95, v: 0.5 + r() * 0.5, len: 0.05 + r() * 0.1, life: 1 });
    }
  }

  setState(s) {
    this.state = s;
  }

  get center() {
    return { x: this.w / 2, y: this.h * 0.46 };
  }

  get radius() {
    return Math.max(70, Math.min(this.w * 0.3, this.h * 0.24, 230));
  }

  hitTest(x, y) {
    const c = this.center;
    return Math.hypot(x - c.x, y - c.y) < this.radius * 1.25;
  }

  frame(now) {
    // Penjaga ukuran: iPhone tidak selalu mengirim sinyal saat ukuran layar berubah
    // (misalnya setelah menutup jendela web), jadi dicek setiap gambar.
    if (this.canvas.clientWidth !== this.w || this.canvas.clientHeight !== this.h) this.resize();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.update(dt, now);
    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt, now) {
    const k = 1 - Math.pow(0.02, dt);
    this.color = mix(this.color, this.target, k * 0.8);
    this.wake += ((this.state === 'sleep' ? 0 : 1) - this.wake) * k * 0.6;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * k * 0.3;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * k * 0.3;

    let level = 0;
    if (this.state === 'speaking') level = Math.min(1, this.audio.outLevel() * 3.2);
    else if (this.state === 'listening') level = Math.min(1, this.audio.micLevel * 9);
    this.energy += (level - this.energy) * (level > this.energy ? 0.5 : 0.12);

    if (this.state === 'listening' && level > 0.18 && now - this.lastRipple > 260) {
      this.ripples.push({ r: 1, a: 0.5 * level + 0.15 });
      this.lastRipple = now;
    }
    this.ripples = this.ripples.filter((r) => {
      r.r += dt * 0.55;
      r.a -= dt * 0.35;
      return r.a > 0;
    });

    this.faceK = Math.min(1, this.faceK + dt * 3);
    this.spawnEmotes(dt);
    for (const m of this.emotes) {
      if (m.type === 'bit' || m.type === 'spark') { m.d += m.v * dt; m.life -= dt * (m.type === 'spark' ? 1.4 : 0.9); }
      else if (m.type === 'rain') { m.y += m.v * dt; if (m.y > 0.95) m.life = 0; }
      else if (m.type === 'shock') { m.r += dt * 1.6; m.life -= dt * 1.1; }
      else m.life -= dt * 1.2;
    }
    this.emotes = this.emotes.filter((m) => m.life > 0);

    const warp = 0.012 + this.wake * 0.02 + this.energy * 0.08;
    for (const s of this.stars) {
      s.d += dt * warp * (0.4 + s.z);
      s.tw += dt * 2;
      if (s.d > 1.1) Object.assign(s, this.newStar(false));
    }
  }

  draw() {
    const { ctx, w, h } = this;
    const base = this.center;
    const shake = this.trait('shake');
    const c = { x: base.x + (Math.random() - 0.5) * shake * 2, y: base.y + (Math.random() - 0.5) * shake * 2 };
    const spikes = this.trait('spikes');
    const R = this.radius * (1 + this.energy * 0.04);
    const col = this.color;
    const wake = 0.45 + this.wake * 0.55;
    const e = this.energy;
    const t = this.t;
    const px = this.pointer.x, py = this.pointer.y;

    // Latar
    ctx.globalCompositeOperation = 'source-over';
    const bg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(w, h) * 0.8);
    bg.addColorStop(0, rgba(mix([6, 14, 26], col, 0.12), 1));
    bg.addColorStop(0.5, '#040a14');
    bg.addColorStop(1, '#010308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';

    // Bintang (efek melaju pelan)
    const maxD = Math.hypot(w, h) * 0.6;
    for (const s of this.stars) {
      const d = s.d * s.d * maxD;
      const x = c.x + Math.cos(s.a) * d - px * 18 * s.z;
      const y = c.y + Math.sin(s.a) * d - py * 18 * s.z;
      const a = Math.min(1, s.d * 3) * (0.35 + 0.35 * Math.sin(s.tw)) * s.z;
      ctx.fillStyle = rgba(mix([200, 230, 255], col, 0.3), a);
      const size = 0.6 + s.z * 1.4 * s.d;
      ctx.fillRect(x, y, size, size);
    }

    // Kisi HUD halus
    ctx.save();
    ctx.translate(c.x + px * 6, c.y + py * 6);
    ctx.strokeStyle = rgba(col, 0.05 * wake);
    ctx.lineWidth = 1;
    for (let i = 2; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, R * (0.8 + i * 0.42), 0, TAU);
      ctx.stroke();
    }
    ctx.rotate(t * 0.02);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 1.55, Math.sin(a) * R * 1.55);
      ctx.lineTo(Math.cos(a) * R * 3, Math.sin(a) * R * 3);
      ctx.stroke();
    }
    ctx.restore();

    // Garis energi berputar (seperti orbit)
    ctx.save();
    ctx.translate(c.x, c.y);
    for (let li = 0; li < this.loops.length; li++) {
      const L = this.loops[li];
      L.rot += L.spin * 0.016 * (1 + e * 3);
      const amp = 0.1 + e * 0.32 + this.wake * 0.04;
      ctx.save();
      ctx.rotate(L.rot + px * 0.05);
      ctx.scale(1, L.squash);
      ctx.beginPath();
      const steps = 110;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * TAU;
        const n = Math.sin(a * 2 + L.p[0] + t * L.speed) * 0.5
          + Math.sin(a * 3 + L.p[1] - t * L.speed * 0.7) * 0.3
          + Math.sin(a * 5 + L.p[2] + t * L.speed * 1.6) * 0.2;
        const spike = spikes ? Math.abs(Math.sin(a * 18 + t * 9 + li)) * 0.16 * spikes : 0;
        const r = R * (L.size + 0.12 + n * amp + spike);
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.restore();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = rgba(col, 0.05 * wake);
      ctx.stroke();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = rgba(mix(col, [255, 255, 255], 0.25), (0.22 + e * 0.3) * wake);
      ctx.stroke();
    }
    ctx.restore();

    // Gelombang saat kamu bicara
    for (const r of this.ripples) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, R * r.r, 0, TAU);
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(col, r.a);
      ctx.stroke();
    }

    // Spektrum suara melingkar
    const spec = this.state === 'speaking' ? this.audio.spectrum() : null;
    const bars = 72;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-Math.PI / 2);
    for (let i = 0; i < bars; i++) {
      let v;
      if (spec) {
        // Lipat jadi 4 bagian supaya suara (frekuensi rendah) menyebar ke seluruh cincin.
        const q = i % 18, f = q < 9 ? q : 17 - q;
        v = spec[1 + f * 2] / 255;
      } else {
        v = e * (0.5 + 0.5 * Math.sin(i * 0.9 + t * 7)) + 0.04 * Math.sin(i * 0.5 + t);
      }
      const a = (i / bars) * TAU;
      const r0 = R * 1.1;
      const r1 = r0 + Math.max(1.5, v * R * 0.32);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(mix(col, [255, 255, 255], v * 0.4), (0.18 + v * 0.7) * wake);
      ctx.stroke();
    }
    ctx.restore();

    // Cincin HUD luar: tanda derajat + busur berputar
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(t * 0.05);
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU;
      const long = i % 10 === 0;
      const r0 = R * 1.5, r1 = r0 + (long ? 10 : 4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineWidth = long ? 1.5 : 1;
      ctx.strokeStyle = rgba(col, (long ? 0.45 : 0.18) * wake);
      ctx.stroke();
    }
    ctx.restore();
    for (const A of this.arcs) {
      const s = A.start + t * A.speed * (1 + e * 2);
      ctx.beginPath();
      ctx.arc(c.x, c.y, R * A.r, s, s + A.len);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = rgba(mix(col, GOLD, 0.35), 0.5 * wake);
      ctx.stroke();
    }

    // Isi bola: piringan gelap + titik-titik bola 3D
    ctx.globalCompositeOperation = 'source-over';
    const disc = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R);
    disc.addColorStop(0, rgba(mix([10, 30, 48], col, 0.35), 0.95));
    disc.addColorStop(0.75, rgba(mix([4, 14, 26], col, 0.12), 0.95));
    disc.addColorStop(1, rgba([3, 10, 20], 0.95));
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(c.x, c.y, R * 0.97, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    const ry = t * 0.25 + px * 0.4, rx = 0.35 + py * 0.3;
    const cy1 = Math.cos(ry), sy1 = Math.sin(ry), cx1 = Math.cos(rx), sx1 = Math.sin(rx);
    const sr = R * (0.78 + e * 0.06);
    const morph = this.trait('heart');
    const hy = Math.sin(t * 0.9) * 0.4, chy = Math.cos(hy), shy = Math.sin(hy);
    const beat = 1 + 0.09 * Math.pow(Math.abs(Math.sin(t * 3.2)), 6) + e * 0.08;
    for (let i = 0; i < this.sphere.length; i++) {
      const p = this.sphere[i];
      let x = p[0] * cy1 - p[2] * sy1;
      let z = p[0] * sy1 + p[2] * cy1;
      let y = p[1] * cx1 - z * sx1;
      z = p[1] * sx1 + z * cx1;
      if (morph > 0.001) {
        const H = this.heart[i];
        const hx = (H[0] * chy - H[2] * shy) * beat, hz = H[0] * shy + H[2] * chy, hy2 = H[1] * beat;
        const k = morph * morph * (3 - 2 * morph);
        x += (hx - x) * k; y += (hy2 - y) * k; z += (hz * 2 - z) * k;
      }
      const persp = 1 / (1.8 - z * 0.6);
      const X = c.x + x * sr * persp * 1.2;
      const Y = c.y + y * sr * persp * 1.2;
      const depth = Math.max(0, Math.min(1, (z + 1) / 2));
      const a = (0.12 + depth * 0.6) * (0.6 + e * 0.6 + morph * 0.6) * wake;
      const s = 0.8 + depth * 1.6 + morph * 0.6;
      ctx.fillStyle = rgba(mix(col, [255, 255, 255], depth * 0.5), a);
      ctx.fillRect(X - s / 2, Y - s / 2, s, s);
    }

    // Sapuan radar saat berpikir
    const radar = this.trait('radar');
    if (radar > 0.01) drawRadar(ctx, c, R, t, col, radar * wake);

    // Inti cahaya
    const breathe = 1 + Math.sin(t * (this.state === 'sleep' ? 1.1 : 2)) * 0.06;
    const faceAmt = this.trait('face');
    const coreR = R * (0.42 + e * 0.35) * breathe * (0.75 + this.wake * 0.25) * (1 - faceAmt * 0.82) * (1 - morph * 0.6);
    const core = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, coreR);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.12, rgba(mix([255, 255, 255], col, 0.3), 0.8));
    core.addColorStop(0.4, rgba(col, 0.25));
    core.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(c.x, c.y, coreR, 0, TAU);
    ctx.fill();

    // Kilau horizontal
    const flare = ctx.createLinearGradient(c.x - R * 1.3, 0, c.x + R * 1.3, 0);
    flare.addColorStop(0, rgba(col, 0));
    flare.addColorStop(0.5, rgba(mix(col, [255, 255, 255], 0.6), 0.35 * (0.5 + e) * wake * (1 - Math.max(faceAmt, this.trait('heart')))));
    flare.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = flare;
    ctx.fillRect(c.x - R * 1.3, c.y - 1, R * 2.6, 2);

    // Visor mata + gelombang suara
    const speaking = this.state === 'speaking';
    const wave = speaking ? this.audio.waveform() : null;
    if (this.faceK < 1) drawVisor(ctx, this.prevMood, (1 - this.faceK) * wake, c, R, t, col, wave);
    drawVisor(ctx, this.mood, this.faceK * wake, c, R, t, col, wave);

    // Cincin emas utama
    ctx.globalCompositeOperation = 'source-over';
    const ringCol = mix(GOLD, col, 0.18);
    const ringW = R * (0.05 + e * 0.02);
    ctx.save();
    ctx.shadowColor = rgba(ringCol, 0.9);
    ctx.shadowBlur = 22 + e * 30;
    ctx.beginPath();
    ctx.arc(c.x, c.y, R, 0, TAU);
    ctx.lineWidth = ringW;
    const rg = ctx.createLinearGradient(c.x - R, c.y - R, c.x + R, c.y + R);
    rg.addColorStop(0, rgba(mix(ringCol, [255, 255, 255], 0.35), 0.95 * wake + 0.05));
    rg.addColorStop(0.5, rgba(ringCol, 0.9 * wake + 0.1));
    rg.addColorStop(1, rgba(mix(ringCol, [255, 140, 40], 0.3), 0.95 * wake + 0.05));
    ctx.strokeStyle = rg;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(c.x, c.y, R - ringW * 0.9, 0, TAU);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(ringCol, 0.35 * wake);
    ctx.stroke();

    // Kilatan yang berputar di cincin
    ctx.globalCompositeOperation = 'lighter';
    const ga = t * 0.9;
    for (let i = 0; i < 2; i++) {
      const a = ga + i * Math.PI;
      const gx = c.x + Math.cos(a) * R, gy = c.y + Math.sin(a) * R;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, ringW * 3);
      g.addColorStop(0, `rgba(255,255,255,${0.7 * wake})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, ringW * 3, 0, TAU);
      ctx.fill();
    }

    // Segmen peringatan saat kesal/marah
    const warn = this.trait('warn');
    if (warn > 0.01) drawWarning(ctx, c, R, t, warn * wake);

    // Partikel data, hujan data, gelombang kejut
    drawEmotes(ctx, this.emotes, c, R, col);

    // Kamera menyala: garis pindai + bingkai sudut
    if (this.scanning) drawScan(ctx, c, R, t, col);
    // Sedang menggambar: busur pelangi berputar
    if (this.painting) drawPainting(ctx, c, R, t);

    // Menyambung: busur berputar cepat
    if (this.state === 'connecting') {
      const s = t * 5;
      ctx.beginPath();
      ctx.arc(c.x, c.y, R * 1.16, s, s + 1.2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = rgba(col, 0.9);
      ctx.stroke();
    }

    // Berpikir: tiga titik mengorbit
    if (this.state === 'thinking') {
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + (i * TAU) / 3;
        const x = c.x + Math.cos(a) * R * 1.16, y = c.y + Math.sin(a) * R * 1.16;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
        g.addColorStop(0, rgba([255, 255, 255], 0.9));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, TAU);
        ctx.fill();
      }
    }

    // Efek glitch digital saat kesal/marah
    const glitch = this.trait('glitch');
    if (glitch > 0.01 && Math.random() < 0.3 * glitch) {
      ctx.globalCompositeOperation = 'source-over';
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const y = c.y - R * 1.4 + Math.random() * R * 2.8;
        const hh = 3 + Math.random() * 18;
        const dx = (Math.random() - 0.5) * 50 * glitch;
        ctx.drawImage(this.canvas, 0, y * this.dpr, w * this.dpr, hh * this.dpr, dx, y, w, hh);
        ctx.fillStyle = `rgba(255,40,70,${0.12 * glitch})`;
        ctx.fillRect(0, y, w, hh);
      }
    }

    // Vinyet
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}

// ---------- Ekspresi hologram: visor, radar, peringatan, partikel ----------

// Bentuk satu mata visor per emosi (s = -1 kiri, 1 kanan).
function eyePath(ctx, mood, s, ex, ey, w, h, u) {
  const x0 = s * ex;
  ctx.beginPath();
  switch (mood) {
    case 'senang': // lengkung ke atas
      ctx.arc(x0, ey + u * 0.09, u * 0.15, 1.08 * Math.PI, 1.92 * Math.PI);
      ctx.arc(x0, ey + u * 0.15, u * 0.14, 1.88 * Math.PI, 1.12 * Math.PI, true);
      break;
    case 'ngambek':
    case 'marah': { // sisi dalam turun tajam
      const drop = mood === 'marah' ? 0.8 : 0.5;
      const hh = mood === 'marah' ? h * 0.85 : h;
      ctx.moveTo(x0 + s * w / 2, ey - hh / 2);
      ctx.lineTo(x0 - s * w / 2, ey - hh / 2 + hh * drop);
      ctx.lineTo(x0 - s * w / 2, ey + hh / 2);
      ctx.lineTo(x0 + s * w / 2, ey + hh / 2);
      break;
    }
    case 'sedih': { // sisi luar turun
      const y = ey + u * 0.03;
      ctx.moveTo(x0 - s * w / 2, y - h / 2);
      ctx.lineTo(x0 + s * w / 2, y - h / 2 + h * 0.55);
      ctx.lineTo(x0 + s * w / 2, y + h / 2);
      ctx.lineTo(x0 - s * w / 2, y + h / 2);
      break;
    }
    case 'kaget':
      ctx.arc(x0, ey, u * 0.11, 0, TAU);
      break;
    case 'mikir': { // kapsul tipis
      const hh = h * 0.55;
      ctx.arc(x0 - w / 2 + hh / 2, ey, hh / 2, Math.PI / 2, Math.PI * 1.5);
      ctx.arc(x0 + w / 2 - hh / 2, ey, hh / 2, Math.PI * 1.5, Math.PI / 2);
      break;
    }
  }
  ctx.closePath();
}

function drawVisor(ctx, mood, alpha, c, R, t, col, wave) {
  if (alpha < 0.01 || mood === 'tenang' || mood === 'gemas') return;
  const u = R * 0.85;
  const ex = u * 0.31, ey = -u * 0.1, w = u * 0.32, h = u * 0.19;
  const eyeCol = mix([255, 255, 255], col, 0.35);
  const blink = t % 4.6 < 0.12 ? 0.1 : 1;

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.globalCompositeOperation = 'lighter';

  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * ex, ey);
    ctx.scale(1, blink);
    ctx.translate(-s * ex, -ey);

    // Cahaya pendar di belakang mata
    eyePath(ctx, mood, s, ex, ey, w, h, u);
    ctx.shadowColor = rgba(col, alpha);
    ctx.shadowBlur = 22;
    ctx.fillStyle = rgba(col, alpha * 0.35);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Garis-garis LED
    ctx.clip();
    const top = ey - u * 0.22, bottom = ey + u * 0.22;
    ctx.fillStyle = rgba(eyeCol, alpha * 0.95);
    for (let y = top; y < bottom; y += 3) ctx.fillRect(s * ex - u * 0.25, y, u * 0.5, 1.7);
    // Garis pindai yang bergerak
    const scan = top + ((t * 0.7 + (s > 0 ? 0.5 : 0)) % 1) * (bottom - top);
    ctx.fillStyle = rgba([255, 255, 255], alpha * 0.8);
    ctx.fillRect(s * ex - u * 0.25, scan, u * 0.5, 2.5);
    if (mood === 'mikir') {
      const gx = s * ex + Math.sin(t * 3) * w * 0.35;
      const g = ctx.createRadialGradient(gx, ey, 0, gx, ey, w * 0.3);
      g.addColorStop(0, rgba([255, 255, 255], alpha));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(gx - w * 0.3, ey - h, w * 0.6, h * 2);
    }
    ctx.restore();

    if (mood === 'kaget') {
      ctx.beginPath();
      ctx.arc(s * ex, ey, u * 0.15, 0, TAU);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(eyeCol, alpha * 0.6);
      ctx.stroke();
    }
  }

  // Gelombang suara sebagai "mulut"
  const my = u * 0.27, mw = u * 0.6, n = 56;
  const bow = { senang: 0.06, sedih: -0.05 }[mood] || 0;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const f = i / n, xx = -mw / 2 + mw * f;
    const env = Math.sin(f * Math.PI);
    let v = 0;
    if (wave) v = ((wave[Math.floor(f * (wave.length - 1))] - 128) / 128) * 2.2;
    else v = Math.sin(f * 20 + t * 4) * 0.04;
    if (mood === 'marah' && !wave) v += (i % 2 ? 0.12 : -0.12);
    const yy = my + bow * u * (1 - (2 * f - 1) ** 2) + Math.max(-1, Math.min(1, v)) * u * 0.11 * env;
    i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(eyeCol, alpha * (wave ? 0.95 : 0.5));
  ctx.shadowColor = rgba(col, alpha);
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();
}

function drawRadar(ctx, c, R, t, col, alpha) {
  const r = R * 0.9, a0 = t * 2.2;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 14; k++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, a0 - (k + 1) * 0.06, a0 - k * 0.06);
    ctx.closePath();
    ctx.fillStyle = rgba(col, alpha * 0.16 * (1 - k / 14));
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba(mix(col, [255, 255, 255], 0.5), alpha * 0.8);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(col, alpha * 0.18);
  for (const f of [0.33, 0.66]) {
    ctx.beginPath();
    ctx.arc(0, 0, r * f, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWarning(ctx, c, R, t, alpha) {
  const on = Math.floor(t * 5) % 2 === 0 ? 1 : 0.35;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(-t * 0.4);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.24, a, a + 0.32);
    ctx.strokeStyle = `rgba(255,50,60,${alpha * on * 0.85})`;
    ctx.stroke();
    // Garis miring "hazard" kecil
    for (let k = 0; k < 3; k++) {
      const b = a + 0.4 + k * 0.05;
      ctx.beginPath();
      ctx.moveTo(Math.cos(b) * R * 1.2, Math.sin(b) * R * 1.2);
      ctx.lineTo(Math.cos(b + 0.03) * R * 1.28, Math.sin(b + 0.03) * R * 1.28);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(255,90,90,${alpha * 0.5})`;
      ctx.stroke();
      ctx.lineWidth = 4;
    }
  }
  ctx.restore();
}

function drawEmotes(ctx, emotes, c, R, col) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of emotes) {
    const life = Math.max(0, Math.min(1, m.life));
    if (m.type === 'bit') {
      const x = c.x + Math.cos(m.a) * m.d * R, y = c.y + Math.sin(m.a) * m.d * R;
      const s = 2 + life * 2.5;
      ctx.fillStyle = m.gold ? `rgba(255,220,140,${life})` : rgba(mix(col, [255, 255, 255], 0.3), life);
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    } else if (m.type === 'spark') {
      ctx.strokeStyle = rgba(mix(col, [255, 255, 255], 0.5), life);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(m.a) * m.d * R, c.y + Math.sin(m.a) * m.d * R);
      ctx.lineTo(c.x + Math.cos(m.a) * (m.d + 0.1) * R, c.y + Math.sin(m.a) * (m.d + 0.1) * R);
      ctx.stroke();
    } else if (m.type === 'shock') {
      ctx.beginPath();
      ctx.arc(c.x, c.y, R * m.r, 0, TAU);
      ctx.lineWidth = 6 * life;
      ctx.strokeStyle = rgba(mix(col, [255, 255, 255], 0.4), life * 0.8);
      ctx.stroke();
    } else if (m.type === 'glint') {
      const x = c.x + m.x * R, y = c.y + m.y * R, s = R * 0.04 * Math.sin(life * Math.PI);
      ctx.strokeStyle = `rgba(255,190,230,${Math.sin(life * Math.PI)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
      ctx.stroke();
    } else if (m.type === 'rain') {
      // Hujan data hanya di dalam bola
      const x = c.x + m.x * R, y = c.y + m.y * R;
      if (Math.hypot(x - c.x, y - c.y) > R * 0.9) continue;
      const g = ctx.createLinearGradient(x, y - m.len * R, x, y);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(1, rgba(mix(col, [255, 255, 255], 0.5), 0.8));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - m.len * R);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawScan(ctx, c, R, t, col) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.globalCompositeOperation = 'lighter';
  // Garis pindai naik-turun di dalam bola
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.95, 0, TAU);
  ctx.clip();
  const y = Math.sin(t * 1.8) * R * 0.9;
  const g = ctx.createLinearGradient(0, y - R * 0.12, 0, y + 2);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(1, rgba(mix(col, [255, 255, 255], 0.5), 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(-R, y - R * 0.12, R * 2, R * 0.12 + 2);
  ctx.restore();
  // Bingkai sudut seperti bidikan kamera
  const s = R * 1.32, k = R * 0.22;
  ctx.strokeStyle = rgba(mix(col, [255, 255, 255], 0.3), 0.75);
  ctx.lineWidth = 2.5;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.beginPath();
    ctx.moveTo(sx * s, sy * (s - k));
    ctx.lineTo(sx * s, sy * s);
    ctx.lineTo(sx * (s - k), sy * s);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPainting(ctx, c, R, t) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = t * 2.4 + (i * TAU) / 6;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.17, a, a + 0.5);
    ctx.strokeStyle = `hsla(${(i * 60 + t * 120) % 360}, 95%, 65%, 0.85)`;
    ctx.stroke();
  }
  ctx.restore();
}
