// Tampilan bola cahaya Gaby: bintang, garis energi, cincin emas, inti cahaya, HUD.

export const MOOD_COLORS = {
  tenang: [95, 212, 255],
  senang: [255, 200, 90],
  gemas: [255, 120, 200],
  ngambek: [255, 84, 96],
  mikir: [170, 120, 255],
  sedih: [110, 140, 255],
  kaget: [120, 255, 225],
};

const GOLD = [255, 200, 100];
const TAU = Math.PI * 2;

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
    this.arcs = [
      { r: 1.3, len: 0.9, speed: 0.25, start: 0 },
      { r: 1.3, len: 0.35, speed: 0.25, start: 2.6 },
      { r: 1.36, len: 1.6, speed: -0.15, start: 1 },
      { r: 1.22, len: 0.5, speed: 0.4, start: 4 },
    ];

    this.resize();
    addEventListener('resize', () => this.resize());
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
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setMood(name) {
    if (MOOD_COLORS[name]) this.target = MOOD_COLORS[name];
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

    const warp = 0.012 + this.wake * 0.02 + this.energy * 0.08;
    for (const s of this.stars) {
      s.d += dt * warp * (0.4 + s.z);
      s.tw += dt * 2;
      if (s.d > 1.1) Object.assign(s, this.newStar(false));
    }
  }

  draw() {
    const { ctx, w, h } = this;
    const c = this.center;
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
        const r = R * (L.size + 0.12 + n * amp);
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
    for (const p of this.sphere) {
      let x = p[0] * cy1 - p[2] * sy1;
      let z = p[0] * sy1 + p[2] * cy1;
      let y = p[1] * cx1 - z * sx1;
      z = p[1] * sx1 + z * cx1;
      const persp = 1 / (1.8 - z * 0.6);
      const X = c.x + x * sr * persp * 1.2;
      const Y = c.y + y * sr * persp * 1.2;
      const depth = (z + 1) / 2;
      const a = (0.12 + depth * 0.6) * (0.6 + e * 0.6) * wake;
      const s = 0.8 + depth * 1.6;
      ctx.fillStyle = rgba(mix(col, [255, 255, 255], depth * 0.5), a);
      ctx.fillRect(X - s / 2, Y - s / 2, s, s);
    }

    // Inti cahaya
    const breathe = 1 + Math.sin(t * (this.state === 'sleep' ? 1.1 : 2)) * 0.06;
    const coreR = R * (0.42 + e * 0.35) * breathe * (0.75 + this.wake * 0.25);
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
    flare.addColorStop(0.5, rgba(mix(col, [255, 255, 255], 0.6), 0.35 * (0.5 + e) * wake));
    flare.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = flare;
    ctx.fillRect(c.x - R * 1.3, c.y - 1, R * 2.6, 2);

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

    // Vinyet
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}
