// PROTOTIPE Ruang Kerja Gaby: kantor 2.5D yang bergerak, dipicu tombol uji.
// Belum tersambung ke Gaby sungguhan — tujuannya menilai rasa animasi & kelancaran (FPS) di HP.
'use strict';
(() => { // ruang nama sendiri supaya tidak bentrok dengan karakter.js / meja.js

// ---------- tampilan (harus sama dengan officeLayers: setView(24, 632, 200)) ----------
const VS = 24, VOX = 632, VOY = 200, VK = VS / 20;
const G = (x, y, z = 0) => [VOX + (x - y) * VS * 0.866, VOY + (x + y) * VS * 0.5 - z * VS];
const CS = 0.4 * VK; // skala karakter
const HEAD = 232 * CS; // dari kaki sampai ubun-ubun (piksel)
const NS = 'http://www.w3.org/2000/svg';
const FULL = { x: 0, y: 0, w: 1264, h: 920 };
let SPD = 1; // pengali kecepatan semua animasi

const $ = (id) => document.getElementById(id);
function el(tag, attrs = {}, html) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (html != null) e.innerHTML = html;
  return e;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms / SPD));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ---------- adegan statis ----------
const svg = $('scene');
const { shell, items } = officeLayers();
const gShell = el('g', { class: 'static' }, shell);
const afterShell = el('g');
svg.append(gShell, afterShell);
const ITEMS = items.map((it) => {
  const g = el('g', { class: `item ${it.key || 'junction'}` });
  if (it.kind === 'junction') g.append(el('g', { class: 'static' }, it.svg));
  else {
    it.backG = el('g', { class: 'static' }, it.back);
    it.fx0 = el('g'); // efek di belakang karakter (laci menyala)
    it.slotG = el('g'); // karakter yang berada di belakang perabot depan
    it.frontG = el('g', { class: 'static' }, it.front2);
    it.overG = el('g'); // karakter / efek di depan perabot
    g.append(it.backG, it.fx0, it.slotG, it.frontG, it.overG);
  }
  it.g = g;
  it.afterG = el('g'); // karakter yang lewat di lorong setelah ruangan ini
  svg.append(g, it.afterG);
  return it;
});
const R = Object.fromEntries(ITEMS.filter((i) => i.key).map((i) => [i.key, i]));
const fxG = el('g', { class: 'fx' });
const nightG = el('g', { class: 'night' });
const uiG = el('g', { class: 'ui' });
svg.append(nightG, fxG, uiG);
const measureEl = el('text', { 'font-size': 13, 'font-weight': 700, 'font-family': 'system-ui', opacity: 0 });
uiG.append(measureEl);
for (const k of ['pantry', 'game']) {
  const it = R[k];
  const [a, b] = G(it.off[0] + it.tag[0], it.off[1] + it.tag[1], 0);
  uiG.append(el('g', { class: 'tag', transform: `translate(${a} ${b})` }, `<rect x="-46" y="-12" width="92" height="22" rx="11" fill="rgba(2,6,23,.78)" stroke="#38bdf8"/><text y="4" text-anchor="middle" font-size="12" font-weight="800" fill="#e0f2fe" font-family="system-ui">${it.label}</text>`));
}

// ---------- denah untuk berjalan ----------
// Perabot yang tidak boleh ditembus (koordinat lokal ruangan: x, y, lebar, dalam).
// frontY: karakter dengan y lokal < frontY digambar DI BELAKANG perabot depan ruangan itu.
const NAV = {
  rara: { frontY: null, obs: [[0, 4.6, 0.8, 2.8], [0.9, 1.4, 1.4, 1.4], [0.9, 2.85, 1.8, 1.85], [3.6, 1.8, 3, 3]], spots: { santai: [2.0, 3.75, 0.35] } },
  pandu: { frontY: 4.4, obs: [[3, 4.4, 3.6, 1.5], [1.2, 5.6, 1, 0.8], [6.8, 2.3, 0.6, 0.6]] },
  lukas: { frontY: 5.6, obs: [[3.4, 2.0, 1.2, 1.2], [5.6, 5.6, 1.3, 1.3], [6.0, 0.2, 1.0, 1.8]] },
  meri: { frontY: 3.3, obs: [[0.4, 0, 7.2, 0.6], [3.1, 3.3, 2.6, 2.6], [6.0, 5.8, 1.2, 1.2]], spots: { jurnal: [2.4, 5.2, 0] } },
  gaby: { frontY: 4.2, obs: [[3.7, 2.3, 1.2, 1.2], [2.2, 4.2, 4.6, 1.1], [6.8, 3.0, 1.0, 2.3]] },
  vera: { frontY: 4.0, obs: [[0.6, 5.4, 0.5, 0.5], [3.6, 2.5, 1.3, 1.4], [2.4, 4.0, 4.4, 1.4], [1.4, 0, 4.8, 0.3]], spots: { drop: [4.4, 6.5, 0] } },
  pantry: { frontY: 4.5, obs: [[0, 5.4, 1.2, 1.4], [1.6, 0, 3.8, 1.1], [10.4, 0.3, 0.8, 0.8], [9.4, 0, 2.2, 0.2], [4.3, 3.7, 2.2, 1.8], [7.2, 5.7, 0.4, 0.4], [11, 6.8, 0.9, 0.9]],
    spots: { s1: [4.35, 3.55, 0.3], s2: [6.75, 3.35, 0.3], s3: [3.95, 5.95, 0.3], s4: [7.0, 6.4, 0] } },
  game: { frontY: null, obs: [[1.8, 0.05, 3.8, 1.05], [1.6, 3.6, 4.2, 1.4], [7.2, 2.0, 3.6, 2.0], [10.6, 0.3, 1.1, 1.0], [8.0, 5.9, 1.2, 1.0], [10.0, 5.1, 1.2, 1.0]],
    spots: { pongA: [6.5, 3.0, 0], pongB: [11.5, 3.0, 0] } },
};
const spot = (room, k) => { const [x, y, z] = NAV[room].spots[k]; const o = R[room].off; return { x: x + o[0], y: y + o[1], z, seat: z > 0 }; };
const seatOf = (name) => { const s = window.PROTO_SEATS.find((q) => q.name === name); return { x: s.x, y: s.y, z: s.z, seat: s.z > 0 }; };

const M = 0.36; // jarak aman dari perabot
const OBS = [];
const addObs = (x, y, w, d) => OBS.push({ x0: x, y0: y, x1: x + w, y1: y + d });
for (const it of ITEMS) {
  if (it.kind === 'junction') { const [x, y] = it.box; addObs(x + 0.15, y + 0.15, 0.84, 0.84); addObs(x + 1.95, y + 1.95, 0.4, 0.4); continue; }
  const [ox, oy] = it.off, [w, d] = it.size;
  for (const [x, y, a, b] of NAV[it.key].obs) addObs(ox + x, oy + y, a, b);
  // sekat kaca rendah: dua potong dengan pintu selebar 2 di tengah
  const side = (horiz, fixed, len) => {
    for (const [s0, s1] of [[0, len / 2 - 1], [len / 2 + 1, len]]) {
      if (horiz) addObs(ox + s0, oy + fixed - 0.1, s1 - s0, 0.2); else addObs(ox + fixed - 0.1, oy + s0, 0.2, s1 - s0);
    }
  };
  if (it.wall.L === 'low') side(false, 0, d);
  if (it.wall.R === 'low') side(true, 0, w);
  if (it.front.Y === 'low') side(true, d, w);
  if (it.front.X === 'low') side(false, w, d);
}
// Ruang bos tidak dilintasi teman (Gaby tidak pernah keluar ruangannya di prototipe ini).
addObs(R.gaby.off[0] + 0.2, R.gaby.off[1] + 0.2, 7.6, 7.6);
const OBI = OBS.map((r) => ({ x0: r.x0 - M, y0: r.y0 - M, x1: r.x1 + M, y1: r.y1 + M }));
const inside = (p, r) => p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1;
function hits(a, b, r) { // Liang–Barsky: apakah garis a→b menembus kotak r
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  const clip = (p, q) => {
    if (p === 0) return q > 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  return clip(-dx, a.x - r.x0) && clip(dx, r.x1 - a.x) && clip(-dy, a.y - r.y0) && clip(dy, r.y1 - a.y) && t1 - t0 > 1e-6;
}
function free(a, b, skip) {
  for (let i = 0; i < OBI.length; i++) {
    if (skip && skip.has(i)) continue;
    const r = OBI[i];
    if (Math.max(a.x, b.x) <= r.x0 || Math.min(a.x, b.x) >= r.x1 || Math.max(a.y, b.y) <= r.y0 || Math.min(a.y, b.y) >= r.y1) continue;
    if (hits(a, b, r)) return false;
  }
  return true;
}
const NODES = [];
for (const r of OBS) {
  const m = M + 0.06;
  for (const p of [{ x: r.x0 - m, y: r.y0 - m }, { x: r.x1 + m, y: r.y0 - m }, { x: r.x1 + m, y: r.y1 + m }, { x: r.x0 - m, y: r.y1 + m }]) {
    if (p.x < 0.4 || p.y < 0.4 || p.x > 28.6 || p.y > 28.6) continue;
    if (OBI.some((q) => inside(p, q))) continue;
    NODES.push(p);
  }
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ADJ = NODES.map(() => []);
for (let i = 0; i < NODES.length; i++) for (let j = i + 1; j < NODES.length; j++) {
  if (free(NODES[i], NODES[j])) { const d = dist(NODES[i], NODES[j]); ADJ[i].push([j, d]); ADJ[j].push([i, d]); }
}
// Jalur terpendek a → b lewat pojok-pojok perabot (titik di dalam perabot, misalnya kursi, dibolehkan).
function plan(a, b) {
  const sa = new Set(), sb = new Set();
  OBI.forEach((r, i) => { if (inside(a, r)) sa.add(i); if (inside(b, r)) sb.add(i); });
  if (free(a, b, new Set([...sa, ...sb]))) return [b];
  const N = NODES.length, S = N, T = N + 1;
  const pts = [...NODES, a, b];
  const best = new Array(N + 2).fill(Infinity), prev = new Array(N + 2).fill(-1), done = new Array(N + 2).fill(false);
  const toT = new Map();
  for (let i = 0; i < N; i++) if (free(NODES[i], b, sb)) toT.set(i, dist(NODES[i], b));
  best[S] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < N + 2; i++) if (!done[i] && best[i] < Infinity && (u < 0 || best[i] < best[u])) u = i;
    if (u < 0 || u === T) break;
    done[u] = true;
    const relax = (v, d) => { if (best[u] + d < best[v]) { best[v] = best[u] + d; prev[v] = u; } };
    if (u === S) { for (let i = 0; i < N; i++) if (free(a, NODES[i], sa)) relax(i, dist(a, NODES[i])); continue; }
    for (const [v, d] of ADJ[u]) relax(v, d);
    if (toT.has(u)) relax(T, toT.get(u));
  }
  if (best[T] === Infinity) return [b];
  const path = [];
  for (let v = T; v !== S; v = prev[v]) path.unshift(pts[v]);
  return path;
}

// ---------- pemain ----------
const charSvg = (o) => character({ ...o, nofloor: true }).replace('<svg ', `<svg x="${-100 * CS}" y="${-246 * CS}" width="${200 * CS}" height="${278 * CS}" `);
const PROPS = {
  folder: '<path d="M-11,-7 h8 l2,-3 h5 l2,3 h5 v15 h-22 z" fill="#fbbf24" stroke="#d97706" stroke-width="1.2"/><rect x="-7" y="-2" width="12" height="3" rx="1.5" fill="#fde68a"/>',
  paddle: '<circle cx="2" cy="-4" r="7" fill="#dc2626" stroke="#7f1d1d"/><rect x="0.5" y="2" width="3" height="8" rx="1.5" fill="#78350f"/>',
  diary: '<rect x="-10" y="-8" width="20" height="14" rx="2" fill="#a855f7"/><rect x="-8" y="-6" width="16" height="10" fill="#f5f3ff"/><path d="M-6,-3 h12 M-6,0 h9" stroke="#a78bfa" stroke-width="1.2"/>',
};

class Actor {
  constructor(key, label, variants, home) {
    this.key = key; this.label = label; this.home = home;
    Object.assign(this, { x: home.x, y: home.y, z: home.z || 0, seated: !!home.seat });
    this.path = null; this.tok = 0; this.away = false; this.face = 1;
    this.g = el('g', { class: `actor a-${key}` });
    this.flip = el('g');
    this.hopG = el('g');
    this.bob = el('g', { class: 'bob' });
    this.lines = el('g', { class: 'speedlines' }, '<path d="M-34,-70 h-16 M-32,-56 h-22 M-34,-42 h-14" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>');
    this.vars = {};
    for (const [vk, o] of Object.entries(variants)) { this.vars[vk] = el('g', {}, charSvg(o)); this.bob.append(this.vars[vk]); }
    this.carryG = el('g', { transform: `translate(0 ${-0.3 * HEAD})` });
    this.bob.append(this.carryG);
    this.hopG.append(this.bob);
    this.flip.append(this.lines, this.hopG);
    this.ui = el('g');
    this.nameTag = el('g', { class: 'tag', transform: `translate(0 ${-HEAD - 6})` }, `<rect x="-34" y="-9" width="68" height="18" rx="9" fill="rgba(2,6,23,.75)" stroke="#38bdf8" stroke-width=".8"/><text y="4" text-anchor="middle" font-size="10.5" font-weight="800" fill="#e0f2fe" font-family="system-ui">${label}</text>`);
    this.prog = el('g', { class: 'prog', transform: 'translate(0 12)', style: 'display:none' }, '<rect x="-24" y="-4" width="48" height="8" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width=".8"/><rect class="pf" x="-23" y="-3" width="0" height="6" rx="3" fill="#22d3ee"/>');
    this.sweat = el('g', { class: 'sweat' }, `<path d="M26,${-HEAD + 26} q-4,6 0,8 q4,-2 0,-8 z" fill="#7dd3fc"/><path d="M-24,${-HEAD + 34} q-3,5 0,7 q3,-2 0,-7 z" fill="#7dd3fc"/>`);
    this.bub = el('g', { transform: `translate(0 ${-HEAD - 20})` });
    this.ring = el('g', { class: 'rings', transform: `translate(0 ${-HEAD * 0.62})` }, '<circle r="18" fill="none" stroke="#67e8f9" stroke-width="2"/><circle r="18" fill="none" stroke="#67e8f9" stroke-width="2"/>');
    this.ui.append(this.ring, this.sweat, this.prog, this.nameTag, this.bub);
    this.g.append(this.flip, this.ui);
    this.variant(Object.keys(variants)[0]);
    this.place();
  }
  variant(v) { for (const [k, g] of Object.entries(this.vars)) g.style.display = k === v ? '' : 'none'; this.v = v; }
  carry(kind) { this.carryG.innerHTML = kind ? PROPS[kind] : ''; }
  cls(name, on) { this.g.classList.toggle(name, on); }
  hop() { this.hopG.classList.remove('hop'); void this.hopG.getBBox(); this.hopG.classList.add('hop'); }
  say(text, ms) {
    clearTimeout(this.bt);
    if (!text) { this.bub.innerHTML = ''; return; }
    measureEl.textContent = text;
    const w = Math.max(34, measureEl.getComputedTextLength() + 22);
    this.bub.innerHTML = `<g class="pop"><rect x="${-w / 2}" y="-26" width="${w}" height="26" rx="13" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><path d="M-6,-1 L0,8 L6,-1 Z" fill="#fff" stroke="#0f172a" stroke-width="1.5"/><rect x="-7" y="-3" width="14" height="4" fill="#fff"/><text y="-8" text-anchor="middle" font-size="13" font-weight="700" font-family="system-ui" fill="#0f172a">${esc(text)}</text></g>`;
    if (ms) this.bt = setTimeout(() => this.say(''), ms / SPD);
  }
  async talk(text, ms) { this.cls('talking', true); this.say(text, ms); await wait(ms); this.cls('talking', false); }
  progress(f) { this.prog.style.display = f == null ? 'none' : ''; if (f != null) this.prog.querySelector('.pf').setAttribute('width', Math.round(46 * f)); }
  // Berjalan ke target lewat pintu & lorong. Hasil: true kalau sampai (false kalau dibatalkan perintah lain).
  walk(target, { run = false } = {}) {
    const tok = ++this.tok;
    if (this.resolve) this.resolve(false);
    this.path = plan({ x: this.x, y: this.y }, target);
    this.target = target; this.run = run; this.seated = false; this.z = 0;
    this.cls('walking', !run); this.cls('running', run);
    return new Promise((ok) => { this.resolve = (v) => { if (tok === this.tok || !v) ok(v); }; });
  }
  step(dt) {
    if (!this.path) return;
    let move = (this.run ? 4.6 : 2.3) * SPD * dt;
    while (move > 0 && this.path.length) {
      const p = this.path[0];
      const d = dist(this, p);
      const [sx0] = G(this.x, this.y), [sx1] = G(p.x, p.y);
      if (Math.abs(sx1 - sx0) > 0.5) this.face = sx1 > sx0 ? 1 : -1;
      if (d <= move) { this.x = p.x; this.y = p.y; this.path.shift(); move -= d; } else { this.x += (p.x - this.x) / d * move; this.y += (p.y - this.y) / d * move; move = 0; }
    }
    if (!this.path.length) {
      this.path = null;
      this.z = this.target.z || 0; this.seated = !!this.target.seat;
      this.cls('walking', false); this.cls('running', false);
      if (this.seated || this.target.faceFront) this.face = 1;
      const r = this.resolve; this.resolve = null;
      if (r) r(true);
    }
    this.place();
  }
  container() {
    const p = { x: this.x, y: this.y };
    for (const it of ITEMS) {
      if (it.kind !== 'room') continue;
      const [x0, y0, x1, y1] = it.box;
      if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) {
        const fy = NAV[it.key].frontY;
        return fy != null && p.y - y0 < fy ? it.slotG : it.overG;
      }
    }
    // Di lorong: tepat sebelum ruangan pertama yang pasti ada di depannya.
    let i = ITEMS.findIndex((it) => { const [x0, y0, x1, y1] = it.box; const after = p.x >= x1 || p.y >= y1; return !after && (p.x <= x0 || p.y <= y0); });
    if (i < 0) i = ITEMS.length;
    return i === 0 ? afterShell : ITEMS[i - 1].afterG;
  }
  place() {
    const [a, b] = G(this.x, this.y, this.z);
    this.g.setAttribute('transform', `translate(${a.toFixed(1)} ${b.toFixed(1)})`);
    this.flip.setAttribute('transform', `scale(${this.face} 1)`);
    this.g.dataset.d = this.x + this.y;
    const c = this.container();
    if (this.g.parentNode !== c) c.append(this.g);
    // beberapa pemain di wadah yang sama: yang lebih depan digambar belakangan
    const sib = [...c.children].filter((n) => n.classList && n.classList.contains('actor'));
    if (sib.length > 1) sib.sort((p, q) => p.dataset.d - q.dataset.d).forEach((n) => c.append(n));
  }
  headPt() { const [a, b] = G(this.x, this.y, this.z); return [a, b - HEAD * 0.8]; }
  handPt() { const [a, b] = G(this.x, this.y, this.z); return [a, b - HEAD * 0.35]; }
}

const A = {
  gaby: new Actor('gaby', '👑 Gaby', { main: CH.gaby }, seatOf('gaby')),
  meri: new Actor('meri', '📝 Meri', { main: CH.meri }, seatOf('meri')),
  rara: new Actor('rara', '🔎 Rara', { santai: CH.rara, kerja: CH.raraK }, spot('rara', 'santai')),
  pandu: new Actor('pandu', '🗺️ Pandu', { main: CH.pandu }, seatOf('pandu')),
  vera: new Actor('vera', '✅ Vera', { main: CH.vera }, seatOf('vera')),
  lukas: new Actor('lukas', '🎨 Lukas', { main: CH.lukas }, seatOf('lukas')),
};
const RARA_KERJA = { ...seatOf('raraK'), seat: false, faceFront: true };
const VERA_DROP = { ...spot('vera', 'drop'), faceFront: true };

// ---------- efek ----------
const ANIMS = [];
const anim = (ms, f) => new Promise((ok) => ANIMS.push({ t0: performance.now(), ms: ms / SPD, f, ok }));
const SPR = {
  plane: '<path d="M14,0 L-12,-8 L-6,0 L-12,8 Z" fill="#fff" stroke="#94a3b8" stroke-width="1"/><path d="M14,0 L-6,0" stroke="#cbd5e1"/>',
  note: '<g transform="rotate(-8)"><rect x="-9" y="-9" width="18" height="18" fill="#fde047" stroke="#ca8a04"/><path d="M-5,-3 h10 M-5,1 h8 M-5,5 h6" stroke="#a16207" stroke-width="1.2"/></g>',
  folder: PROPS.folder,
  signal: '<circle r="13" fill="rgba(103,232,249,.25)"/><circle r="6" fill="#67e8f9"/>',
};
function fly(a, b, kind, ms = 1000) {
  const g = el('g', { class: `fly ${kind}` }, SPR[kind]);
  fxG.append(g);
  const lift = kind === 'signal' ? 40 : 110;
  const c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - lift];
  const at = (e) => [(1 - e) ** 2 * a[0] + 2 * (1 - e) * e * c[0] + e * e * b[0], (1 - e) ** 2 * a[1] + 2 * (1 - e) * e * c[1] + e * e * b[1]];
  return anim(ms, (t) => {
    const e = ease(t);
    const [x, y] = at(e);
    const [x2, y2] = at(Math.min(1, e + 0.02));
    const rot = kind === 'plane' ? Math.atan2(y2 - y, x2 - x) * 180 / Math.PI : 0;
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`);
  }).then(() => g.remove());
}
function pop(pt, html, ms = 900, layer = fxG) {
  const g = el('g', { transform: `translate(${pt[0]} ${pt[1]})` }, `<g class="pop">${html}</g>`);
  layer.append(g);
  setTimeout(() => g.remove(), ms / SPD);
  return g;
}
const sparkle = (pt) => pop(pt, '<text class="rise" text-anchor="middle" font-size="22">✨</text>', 1200);
const busy = (room, on) => R[room].g.classList.toggle('busy', on);
const GABY_SCREEN = () => G(R.gaby.off[0] + 4.1, R.gaby.off[1] + 1.8, 4.6);

// Laci Meri (urutan sama dengan CATEGORIES di memory.js; 7 = 🍜 makanan)
function drawerGeo(k) {
  const c = k % 6, r = Math.floor(k / 6), o = R.meri.off;
  return { x: o[0] + 0.55 + c * 1.17, y: o[1] + 0.61, z: 2.65 - r * 1.2, w: 1.07, h: 1.05 };
}
const drawerPt = (k) => { const d = drawerGeo(k); return G(d.x + d.w / 2, d.y, d.z + d.h / 2); };
// Berdiri di samping laci (bukan tepat di depannya) supaya laci yang menyala tetap terlihat.
const drawerStand = (k) => { const d = drawerGeo(k); return { x: d.x + d.w + 0.45, y: d.y + 0.9, z: 0, faceFront: true }; };
const poly = (pts, attrs) => `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" ${attrs}/>`;
function drawer(k, mode) {
  const d = drawerGeo(k);
  const old = R.meri.fx0.querySelector(`[data-k="${k}"]`);
  if (old) old.remove();
  if (mode === 'off') return;
  const out = mode === 'open' ? 0.5 : 0;
  const f = (x, z, dy = 0) => G(x, d.y + dy, z);
  let s = '';
  if (out) {
    s += poly([f(d.x, d.z + d.h), f(d.x + d.w, d.z + d.h), f(d.x + d.w, d.z + d.h, out), f(d.x, d.z + d.h, out)], 'fill="#c2410c"');
    s += poly([f(d.x + d.w, d.z), f(d.x + d.w, d.z, out), f(d.x + d.w, d.z + d.h, out), f(d.x + d.w, d.z + d.h)], 'fill="#7c2d12"');
    s += poly([f(d.x + 0.25, d.z + d.h), f(d.x + 0.8, d.z + d.h), f(d.x + 0.8, d.z + d.h + 0.35, 0.2), f(d.x + 0.25, d.z + d.h + 0.35, 0.2)], 'fill="#fbbf24" stroke="#d97706"');
  }
  s += poly([f(d.x, d.z, out), f(d.x + d.w, d.z, out), f(d.x + d.w, d.z + d.h, out), f(d.x, d.z + d.h, out)], 'class="glow" fill="rgba(253,224,71,.55)" stroke="#fde047" stroke-width="2"');
  R.meri.fx0.append(el('g', { 'data-k': k }, s));
}

// Meja Vera: kertas, kaca pembesar, centang, stempel
const VERA_PAPER = () => G(R.vera.off[0] + 4.6, R.vera.off[1] + 4.7, 1.45);
function veraPaper(on) {
  const old = R.vera.overG.querySelector('.paper');
  if (old) old.remove();
  if (!on) return;
  const o = R.vera.off, z = 1.42;
  R.vera.overG.append(el('g', { class: 'paper' }, poly([G(o[0] + 4.1, o[1] + 4.35, z), G(o[0] + 5.1, o[1] + 4.35, z), G(o[0] + 5.1, o[1] + 5.05, z), G(o[0] + 4.1, o[1] + 5.05, z)], 'fill="#fffbeb" stroke="#d6b88a"')));
}
async function inspect(ok) {
  const p = VERA_PAPER();
  A.vera.say('🔍 Aku cek dulu…', 1300);
  busy('vera', true);
  const lens = pop([p[0], p[1] - 14], '<g class="sweep"><circle r="11" fill="rgba(186,230,253,.45)" stroke="#b45309" stroke-width="3.5"/><path d="M8,8 L16,16" stroke="#78350f" stroke-width="4" stroke-linecap="round"/></g>', 1600 * 3, R.vera.overG);
  await wait(1500);
  lens.remove();
  const marks = [];
  for (let i = 0; i < 3; i++) {
    const bad = !ok && i === 2;
    marks.push(pop([p[0] - 16 + i * 16, p[1] - 22], `<text text-anchor="middle" font-size="16" font-weight="900" fill="${bad ? '#dc2626' : '#16a34a'}">${bad ? '✗' : '✓'}</text>`, 4000, R.vera.overG));
    await wait(350);
  }
  pop([p[0], p[1] - 40], `<g class="stamp"><text text-anchor="middle" font-size="34">${ok ? '✅' : '⚠️'}</text><text y="22" text-anchor="middle" font-size="15" font-weight="900" fill="${ok ? '#16a34a' : '#d97706'}" font-family="system-ui" stroke="#fff" stroke-width="3" paint-order="stroke">DOK!</text></g>`, 1500);
  A.vera.hop();
  await wait(1000);
  marks.forEach((m) => m.remove());
  busy('vera', false);
  return ok;
}

// Bekerja buru-buru: bar progres, keringat, ruangan "sibuk"
async function work(a, room, ms, text) {
  busy(room, true); a.cls('rush', true); a.say(text);
  await anim(ms, (t) => a.progress(t));
  a.progress(null); a.cls('rush', false); busy(room, false); a.say('');
}

// ---------- status & kunci adegan ----------
const state = { busy: new Set(), santai: false, tidur: false };
const NAMES = { gaby: 'Gaby', meri: 'Meri', rara: 'Rara', pandu: 'Pandu', vera: 'Vera', lukas: 'Lukas' };
function toast(t) { const d = $('toast'); d.textContent = t; d.classList.add('show'); clearTimeout(d.t); d.t = setTimeout(() => d.classList.remove('show'), 2200); }
function status(t) { $('status').textContent = t; }
function claim(keys, label) {
  const b = keys.find((k) => state.busy.has(k));
  if (b) { toast(`${NAMES[b]} masih sibuk, tunggu sebentar ya`); return false; }
  keys.forEach((k) => state.busy.add(k));
  // Teman yang sedang santai langsung lari balik ke mejanya (adegan bisa menyuruhnya ke tempat lain sesudahnya).
  for (const k of keys) { const a = A[k]; if (a.away) { a.away = false; a.carry(null); a.say('Balik kerja! 🏃', 900); a.walk(a.home, { run: true }); } }
  status(label);
  return true;
}
function release(keys) { keys.forEach((k) => state.busy.delete(k)); if (!state.busy.size) status(state.santai ? 'Waktu santai ☕🎮' : 'Semua di mejanya'); }

// ---------- adegan ----------
async function flowIngat() {
  const k = 7; // 🍜 makanan
  if (!claim(['gaby', 'meri'], 'Gaby menyimpan ingatan baru → Meri')) return;
  focus(A.gaby);
  A.gaby.talk('Oke, aku ingat: kamu suka rendang 🍜', 2000);
  await wait(800);
  pop(GABY_SCREEN(), '<rect x="-20" y="-14" width="40" height="28" rx="5" fill="rgba(14,165,233,.85)" stroke="#e0f2fe"/><text y="6" text-anchor="middle" font-size="16">🍜</text>', 700);
  await wait(600);
  const go = A.meri.walk(drawerStand(k));
  focus(A.meri);
  await fly(GABY_SCREEN(), drawerPt(k), 'plane', 1500);
  await go;
  A.meri.say('📥 Dapat!', 900);
  drawer(k, 'open');
  await wait(1000);
  A.meri.say('Masuk laci 🍜 ✨', 1100);
  drawer(k, 'glow');
  sparkle(drawerPt(k));
  await wait(900);
  drawer(k, 'off');
  await A.meri.walk(A.meri.home);
  release(['gaby', 'meri']);
}

async function flowButuh() {
  const k = 7;
  if (!claim(['gaby', 'meri'], 'Gaby butuh ingatan → Meri mengambilkan')) return;
  focus(A.gaby);
  A.gaby.say('🔍 butuh: laci 🍜 makanan', 1500);
  await wait(800);
  await fly(GABY_SCREEN(), A.meri.headPt(), 'signal', 650);
  A.meri.say('❗', 700); A.meri.hop();
  focus(A.meri);
  await wait(350);
  drawer(k, 'glow');
  await A.meri.walk(drawerStand(k), { run: true });
  drawer(k, 'open');
  await wait(600);
  drawer(k, 'off');
  A.meri.carry('folder');
  A.meri.say('Ini dia! 📂', 900);
  await wait(500);
  A.meri.carry(null);
  focus(A.gaby);
  const back = A.meri.walk(A.meri.home);
  await fly(A.meri.handPt(), GABY_SCREEN(), 'folder', 1100);
  busy('gaby', true);
  A.gaby.say('📖 …', 1000);
  await wait(1100);
  busy('gaby', false);
  await A.gaby.talk('Kamu suka rendang! Mau aku carikan resepnya? 🍛', 2600);
  await back;
  release(['gaby', 'meri']);
}

async function flowRara(reject) {
  if (!claim(['gaby', 'rara', 'vera'], reject ? 'Rara cari info → Vera menolak dulu → diperbaiki' : 'Gaby → Rara cari info → Vera → Gaby')) return;
  focus(A.gaby);
  await A.gaby.talk('Rara, tolong carikan harga tiket ke Bali ya! ✈️', 1900);
  await fly(GABY_SCREEN(), A.rara.headPt(), 'note', 1000);
  A.rara.say('❗ Siap, Bos!', 900); A.rara.hop();
  focus(A.rara);
  await wait(450);
  A.rara.variant('kerja');
  await A.rara.walk(RARA_KERJA, { run: true });
  await work(A.rara, 'rara', 3200, 'Mencari di internet… 💦');
  let ok = !reject;
  for (;;) {
    A.rara.carry('folder');
    A.rara.say('Ke Vera! 🏃‍♀️', 900);
    await A.rara.walk(VERA_DROP, { run: true });
    while (A.vera.path) await wait(150); // tunggu Vera duduk dulu (misalnya baru balik dari pantry)
    A.rara.carry(null);
    focus(A.vera);
    await fly(A.rara.handPt(), VERA_PAPER(), 'folder', 450);
    veraPaper(true);
    if (await inspect(ok)) break;
    A.vera.say('⚠️ Sumbernya baru satu!', 1500);
    await wait(900);
    veraPaper(false);
    await fly(VERA_PAPER(), A.rara.handPt(), 'folder', 450);
    A.rara.carry('folder');
    A.rara.say('Siap, aku perbaiki! 💦', 1000);
    focus(A.rara);
    await A.rara.walk(RARA_KERJA, { run: true });
    A.rara.carry(null);
    await work(A.rara, 'rara', 1800, 'Cari sumber kedua… 💦');
    ok = true;
  }
  const back = (async () => {
    await wait(500);
    A.rara.say('Fiuh 😮‍💨', 1100);
    await A.rara.walk(A.rara.home);
    A.rara.variant('santai');
  })();
  veraPaper(false);
  focus(A.gaby);
  await fly(VERA_PAPER(), GABY_SCREEN(), 'plane', 1300);
  busy('gaby', true);
  await wait(900);
  busy('gaby', false);
  await A.gaby.talk('Tiket Jakarta–Bali mulai Rp1,2 juta! ✅ dicek Vera', 2800);
  await back;
  release(['gaby', 'rara', 'vera']);
}

async function flowSantai() {
  if (state.santai) { kembaliKerja(); return; }
  state.santai = true;
  $('b-santai').textContent = '💼 Kembali kerja';
  status('Waktu santai ☕🎮');
  const plan2 = [['meri', 'pantry', 's1'], ['vera', 'pantry', 's2'], ['rara', 'pantry', 's3'], ['pandu', 'game', 'pongA'], ['lukas', 'game', 'pongB']];
  for (const [k, room, sp] of plan2) {
    if (state.busy.has(k) || !state.santai) continue;
    const a = A[k];
    a.away = true;
    a.walk(spot(room, sp)).then((arrived) => { if (arrived && a.away && room === 'game') a.carry('paddle'); });
    await wait(450);
  }
  focus(A.rara);
}
function kembaliKerja() {
  state.santai = false;
  $('b-santai').textContent = '☕ Waktu santai';
  for (const a of Object.values(A)) if (a.away) { a.away = false; a.carry(null); a.say('Balik kerja! 🏃', 900); a.walk(a.home, { run: true }); }
  status(state.busy.size ? $('status').textContent : 'Semua di mejanya');
}
const GOSSIP = ['😂', '👀 Masa sih?!', '☕', '🤭', 'Hahaha 😆', 'Eh tau gak…', '🍌 enak!'];
setInterval(() => {
  if (!state.santai) return;
  const sit = ['meri', 'vera', 'rara'].map((k) => A[k]).filter((a) => a.away && !a.path);
  if (sit.length) sit[Math.floor(Math.random() * sit.length)].say(GOSSIP[Math.floor(Math.random() * GOSSIP.length)], 1300);
}, 1100);
// bola ping-pong
let pong = null;
setInterval(async () => {
  if (!state.santai || pong) return;
  const p1 = A.pandu, p2 = A.lukas;
  if (!(p1.away && p2.away && !p1.path && !p2.path)) return;
  const ball = el('g', {}, '<circle r="3.2" fill="#fff" stroke="#94a3b8" stroke-width=".6"/>');
  R.game.overG.append(ball);
  pong = ball;
  const a = G(p1.x + 0.5, p1.y, 1.3), b = G(p2.x - 0.5, p2.y, 1.3);
  for (let i = 0; i < 4 && state.santai; i++) {
    const [s, e] = i % 2 ? [b, a] : [a, b];
    (i % 2 ? p2 : p1).hop();
    await anim(650, (t) => ball.setAttribute('transform', `translate(${s[0] + (e[0] - s[0]) * t} ${s[1] + (e[1] - s[1]) * t - Math.sin(t * Math.PI) * 26})`));
  }
  ball.remove();
  pong = null;
}, 900);

async function flowTidur() {
  state.tidur = !state.tidur;
  $('b-tidur').textContent = state.tidur ? '☀️ Bangunkan Gaby' : '🌙 Gaby tidur';
  nightG.innerHTML = state.tidur ? `<rect x="-200" y="-200" width="1700" height="1400" fill="rgba(2,6,23,.55)"/><circle cx="${GABY_SCREEN()[0]}" cy="${GABY_SCREEN()[1] + 60}" r="90" fill="rgba(56,189,248,.10)"/>` : '';
  A.gaby.cls('sleeping', state.tidur);
  if (state.tidur) {
    status('Gaby tidur 💤 · Meri menulis jurnal & merapikan laci');
    focus(A.meri);
    zzz();
    if (!state.busy.has('meri')) {
      state.busy.add('meri');
      A.meri.away = false;
      await A.meri.walk(spot('meri', 'jurnal'));
      if (!state.tidur) return;
      A.meri.carry('diary');
      for (let i = 0; state.tidur; i++) { A.meri.say(['✍️ menulis jurnal hari ini', '🧹 merapikan laci', '📝 …'][i % 3], 1600); await wait(2000); }
    }
  } else {
    A.gaby.say('Pagi! ☀️', 1400);
    A.meri.carry(null);
    await A.meri.walk(A.meri.home);
    state.busy.delete('meri');
    status('Semua di mejanya');
  }
}
async function zzz() {
  while (state.tidur) {
    const [a, b] = A.gaby.headPt();
    pop([a + 18, b - 10], '<text class="rise" font-size="16" font-weight="900" fill="#bae6fd">Z</text>', 1500);
    await wait(700);
  }
}

async function pushToTalk() {
  if (state.tidur) { toast('Gaby sedang tidur 💤'); return; }
  if (!claim(['gaby'], 'Push to talk: Gaby mendengarkan → menjawab')) return;
  focus(A.gaby);
  A.gaby.cls('listening', true);
  A.gaby.say('🎧 aku dengar…', 1700);
  await wait(1800);
  A.gaby.cls('listening', false);
  await A.gaby.talk('Halo! Ada yang bisa aku bantu? 😊', 2200);
  release(['gaby']);
}
// area layar hologram Gaby bisa diketuk
{
  const o = R.gaby.off;
  const hit = el('polygon', { points: [G(o[0] + 1.4, o[1] + 1.8, 3.3), G(o[0] + 6.8, o[1] + 1.8, 3.3), G(o[0] + 6.8, o[1] + 1.8, 5.8), G(o[0] + 1.4, o[1] + 1.8, 5.8)].map((p) => p.join(',')).join(' '), fill: 'rgba(0,0,0,0)', class: 'ptt' });
  hit.addEventListener('click', (e) => { e.stopPropagation(); pushToTalk(); });
  uiG.append(hit);
}

// ---------- kamera ----------
let cam = { ...FULL }, camT = { ...FULL }, follow = null, manualUntil = 0;
function aspect() { return svg.clientHeight / Math.max(1, svg.clientWidth); }
function fitFull() { const ar = aspect(); const w = Math.max(FULL.w, FULL.h / ar); return { x: (FULL.w - w) / 2, y: (FULL.h - w * ar) / 2, w, h: w * ar }; }
function zoomTo(w, cx, cy) { const ar = aspect(); camT = { x: cx - w / 2, y: cy - w * ar / 2, w, h: w * ar }; }
function focus(a) { follow = a; }
function camStep() {
  if ($('autocam').checked && follow && performance.now() > manualUntil && camT.w < fitFull().w * 0.95) {
    const [x, y] = G(follow.x, follow.y, follow.z);
    zoomTo(camT.w, x, y - HEAD * 0.6);
  }
  for (const k of ['x', 'y', 'w', 'h']) cam[k] += (camT[k] - cam[k]) * 0.08;
  svg.setAttribute('viewBox', `${cam.x.toFixed(1)} ${cam.y.toFixed(1)} ${cam.w.toFixed(1)} ${cam.h.toFixed(1)}`);
}
$('zin').onclick = () => { const c = [camT.x + camT.w / 2, camT.y + camT.h / 2]; zoomTo(Math.max(320, camT.w * 0.75), ...c); };
$('zout').onclick = () => { const c = [camT.x + camT.w / 2, camT.y + camT.h / 2]; zoomTo(Math.min(fitFull().w, camT.w / 0.75), ...c); };
$('zall').onclick = () => { camT = fitFull(); };
{
  let drag = null;
  svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: camT.x, cy: camT.y }; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = cam.w / svg.clientWidth;
    camT.x = drag.cx - (e.clientX - drag.x) * k; camT.y = drag.cy - (e.clientY - drag.y) * k;
    manualUntil = performance.now() + 5000;
  });
  window.addEventListener('pointerup', () => { drag = null; });
}
window.addEventListener('resize', () => { const c = [camT.x + camT.w / 2, camT.y + camT.h / 2]; zoomTo(Math.min(camT.w, fitFull().w), ...c); });

// ---------- loop utama + FPS ----------
let last = performance.now(), frames = 0, fpsT = last;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const a of Object.values(A)) a.step(dt);
  for (let i = ANIMS.length - 1; i >= 0; i--) {
    const q = ANIMS[i];
    const t = Math.min(1, (now - q.t0) / q.ms);
    q.f(t);
    if (t >= 1) { ANIMS.splice(i, 1); q.ok(); }
  }
  camStep();
  frames++;
  if (now - fpsT >= 1000) { $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} FPS`; frames = 0; fpsT = now; }
  requestAnimationFrame(tick);
}

// ---------- mode ringan: gambar diam dijadikan foto sekali, hanya yang bergerak digambar ulang ----------
async function setLight(on) {
  for (const g of svg.querySelectorAll('g.static')) {
    if (on) {
      if (g.querySelector('.globe, .holo-lines')) continue; // yang beranimasi tetap gambar hidup
      if (!g._img) {
        const bb = g.getBBox();
        if (bb.width < 1 || bb.height < 1) continue;
        const sc = 2;
        const src = `<svg xmlns="${NS}" width="${Math.ceil(bb.width * sc)}" height="${Math.ceil(bb.height * sc)}" viewBox="${bb.x} ${bb.y} ${bb.width} ${bb.height}">${g.innerHTML}</svg>`;
        g._img = el('image', { href: URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })), x: bb.x, y: bb.y, width: bb.width, height: bb.height });
      }
      g.after(g._img);
      g.style.display = 'none';
    } else if (g._img) { g._img.remove(); g.style.display = ''; }
  }
}

// ---------- tombol ----------
const run = (f) => () => { f().catch((e) => { console.error(e); toast(`Error: ${e.message}`); }); };
$('b-ingat').onclick = run(flowIngat);
$('b-butuh').onclick = run(flowButuh);
$('b-rara').onclick = run(() => flowRara(false));
$('b-tolak').onclick = run(() => flowRara(true));
$('b-santai').onclick = run(flowSantai);
$('b-tidur').onclick = run(flowTidur);
$('b-ptt').onclick = run(pushToTalk);
$('spd').oninput = (e) => { SPD = Number(e.target.value); $('spdv').textContent = `${SPD}×`; };
$('tags').onchange = (e) => svg.classList.toggle('notags', !e.target.checked);
$('light').onchange = (e) => setLight(e.target.checked);

// mulai: HP tegak → dekat ke Gaby; layar lebar → seluruh kantor
camT = fitFull();
{ const [x, y] = G(A.gaby.x, A.gaby.y, 2); zoomTo(svg.clientWidth < 760 ? 560 : 900, x, y); } // mulai dekat ke Gaby; ⤢ = lihat semua
cam = { ...camT };
focus(A.gaby);
status('Semua di mejanya');
requestAnimationFrame(tick);
window.proto = { A, R, plan, state, NODES, flowIngat, flowButuh, flowRara, flowSantai, flowTidur, pushToTalk, setLight };
})();
