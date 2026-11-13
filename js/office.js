// RUANG KERJA GABY: kantor 2.5D tempat tim Gaby bekerja sesuai kejadian SUNGGUHAN
// (mic Gaby, ucapan, alat ingatan, papan kerja Rara/Pandu/Lukas/Vera). Dimuat hanya saat tombol 🏢 dibuka.
// Mesinnya berasal dari prototipe/proto.js (sudah disetujui pemilik); gambarnya dari office-art.js.
import { officeLayers, character25, CH, PROP_SVG } from './office-art.js';
import { officeListen, officeState } from './officebus.js';
import { CATEGORIES, guessCats } from './memory.js';

// v1.27 "barang hidup": teko, mug, joystick, bet & bola ping-pong, buku Rara, kuas Lukas… digambar & digerakkan di sini,
// bukan di latar (office-art.js membaca tanda ini saat officeLayers() dipanggil di bawah). false = latar lama (darurat).
window.LIVE_PROPS = window.LIVE_PROPS !== false;

// ---------- tampilan (harus sama dengan officeLayers: setView(24, 632, 200)) ----------
const VS = 24, VOX = 632, VOY = 200, VK = VS / 20;
const G = (x, y, z = 0) => [VOX + (x - y) * VS * 0.866, VOY + (x + y) * VS * 0.5 - z * VS];
const CS = 0.4 * VK; // skala karakter
const HEAD = 232 * CS; // dari kaki sampai ubun-ubun (piksel)
const NS = 'http://www.w3.org/2000/svg';
const FULL = { x: 0, y: 0, w: 1264, h: 920 };
let SPD = 1.5; // pengali kecepatan semua animasi (1,5× = pilihan pemilik; 1× terasa "seperti siput")

const $ = (id) => document.getElementById(`of-${id}`); // elemen Ruang Kerja di index.html berawalan of-
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
    it.liveG = el('g'); // barang hidup di atas perabot depan (teko & mug di meja pantry)
    it.overG = el('g'); // karakter / efek di depan perabot
    g.append(it.backG, it.fx0, it.slotG, it.frontG, it.liveG, it.overG);
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
  rara: { frontY: null, obs: [[0, 4.6, 0.8, 2.8], [0.9, 1.4, 1.4, 1.4], [0.9, 2.85, 1.8, 1.85], [3.6, 1.8, 3, 3]],
    spots: { santai: [2.0, 3.75, 0.75], shelf: [1.35, 6.1, 0, { face: -1 }], visit: [6.2, 6.9, 0, { face: -1 }] } },
  pandu: { frontY: 4.4, obs: [[3, 4.4, 3.6, 1.5], [1.2, 5.6, 1, 0.8], [6.8, 2.3, 0.6, 0.6]],
    spots: { board: [3.4, 1.3, 0, { view: 'back' }], pace: [6.9, 3.4, 0], pack: [2.8, 6.2, 0, { face: -1 }], visit: [7.0, 6.9, 0, { face: -1 }] } },
  lukas: { frontY: 5.6, obs: [[3.4, 2.0, 1.2, 1.2], [5.6, 5.6, 1.3, 1.3], [6.0, 0.2, 1.0, 1.8]],
    spots: { paint: [5.1, 3.3, 0, { face: -1 }], admire: [6.6, 5.0, 0, { face: -1 }], jars: [5.1, 6.4, 0], visit: [2.6, 5.6, 0] } },
  meri: { frontY: 3.3, obs: [[0.4, 0, 7.2, 0.6], [3.1, 3.3, 2.6, 2.6], [6.0, 5.8, 1.2, 1.2]],
    spots: { jurnal: [2.4, 5.2, 0], visit: [6.9, 4.4, 0, { face: -1 }] } },
  gaby: { frontY: 4.2, obs: [[3.7, 2.3, 1.2, 1.2], [2.2, 4.2, 4.6, 1.1], [6.8, 3.0, 1.0, 2.3]] },
  vera: { frontY: 4.0, obs: [[0.6, 5.4, 0.5, 0.5], [3.6, 2.5, 1.3, 1.4], [2.4, 4.0, 4.4, 1.4], [1.4, 0, 4.8, 0.3]],
    spots: { drop: [7.4, 3.7, 0, { face: -1 }], rack: [1.6, 5.0, 0, { face: -1 }], visit: [4.4, 6.5, 0] } },
  pantry: { frontY: 4.5, obs: [[0, 5.4, 1.2, 1.4], [1.6, 0, 3.8, 1.1], [10.4, 0.3, 0.8, 0.8], [9.4, 0, 2.2, 0.2], [4.3, 3.7, 2.2, 1.8], [7.2, 5.7, 0.4, 0.4], [11, 6.8, 0.9, 0.9]],
    spots: { s1: [4.0, 3.2, 0.6], s2: [6.75, 3.35, 0.6, { face: -1 }], s3: [3.95, 5.95, 0.6], s4: [7.0, 6.4, 0, { face: -1 }],
      coffee: [1.05, 1.55, 0, { view: 'back' }], micro: [7.4, 1.2, 0, { view: 'back', face: -1 }], water: [10.8, 1.9, 0, { view: 'back' }], fridge: [2.05, 4.95, 0, { face: -1 }] } },
  game: { frontY: null, obs: [[1.8, 0.05, 3.8, 1.05], [1.6, 3.6, 4.2, 1.4], [7.2, 2.0, 3.6, 2.0], [10.6, 0.3, 1.1, 1.0], [8.0, 5.9, 1.2, 1.0], [10.0, 5.1, 1.2, 1.0]],
    spots: { pongA: [6.5, 3.0, 0], pongB: [11.5, 3.0, 0, { face: -1 }], arcade: [11.15, 1.95, 0, { view: 'back' }],
      sofa1: [2.9, 4.1, 0.6, { view: 'back' }], sofa2: [4.5, 4.1, 0.6, { view: 'back' }], bean1: [8.6, 6.4, 0.45, { deep: true }], bean2: [10.6, 5.6, 0.45, { face: -1, deep: true }], dance: [6.6, 6.3, 0] } },
};
// DUDUK (v1.23): angka z di tempat duduk = TINGGI DUDUKAN kursi. Karakter diturunkan setinggi pinggulnya (HIP) supaya
// pinggul tepat di dudukan, lalu kakinya dilipat lewat kelas .sit (css) — dulu karakter berdiri tegak di atas kursi.
const HIP = 0.6; // tinggi pinggul gambar karakter dari telapak kaki (satuan kantor)
const SEAT_TOP = { gaby: 0.75, vera: 0.9 }; // kursi di meja kerja (kursi telur Gaby, kursi merah Vera)
// Pinggul di TEPI DEPAN dudukan (bukan tengahnya) supaya kaki menjuntai di depan kursi: turun SIT_DROP di layar.
const SIT_DROP = 0.35;
// Duduk membelakangi kamera (sofa menghadap TV) / bean bag (deep): pinggul di TENGAH dudukan (membelakangi: kaki tersembunyi).
const sitZ = (top, back) => top - HIP - (back ? 0 : SIT_DROP);
const spot = (room, k) => { const [x, y, z, opt] = NAV[room].spots[k]; const o = R[room].off; return { x: x + o[0], y: y + o[1], z: z > 0 ? sitZ(z, opt && (opt.view === 'back' || opt.deep)) : 0, seat: z > 0, id: `${room}.${k}`, ...(opt || {}) }; };
const seatOf = (name) => { const s = window.PROTO_SEATS.find((q) => q.name === name); const top = SEAT_TOP[name]; return { x: s.x, y: s.y, z: top ? sitZ(top) : s.z, seat: !!top || s.z > 0 }; };

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
// Ruang bos tidak dilintasi teman. Gaby sendiri tetap bisa keluar-masuk (titik awal/tujuan di dalam kotak ini dikecualikan).
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
const charSvg = (o, view) => character25({ ...o, nofloor: true }, view).replace('<svg ', `<svg x="${-100 * CS}" y="${-246 * CS}" width="${200 * CS}" height="${278 * CS}" `);
// barang di dada (dibawa sambil berjalan)
const PROPS = {
  folder: '<path d="M-11,-7 h8 l2,-3 h5 l2,3 h5 v15 h-22 z" fill="#fbbf24" stroke="#d97706" stroke-width="1.2"/><rect x="-7" y="-2" width="12" height="3" rx="1.5" fill="#fde68a"/>',
};
// barang di tangan kiri (koordinat gambar karakter, titik 0,0 = tangan)
const LPROPS = {
  book: '<path d="M-15,-26 q7,-4 15,0 q8,-4 15,0 v17 q-7,-4 -15,0 q-8,-4 -15,0 z" fill="#fff7ed" stroke="#b45309" stroke-width="1.6"/><path d="M0,-26 v17" stroke="#b45309" stroke-width="1.4"/><path d="M-12,-21 h9 M-12,-17 h9 M3,-21 h9 M3,-17 h9" stroke="#94a3b8" stroke-width="1.2"/>',
  ...Object.fromEntries(['#ef4444', '#3b82f6', '#22c55e'].map((c, i) => [`brush${i}`, `<path d="M-3,-2 L9,-26" stroke="#92400e" stroke-width="3" stroke-linecap="round"/><path d="M9,-26 l2,-5" stroke="${c}" stroke-width="4.5" stroke-linecap="round"/>`])),
  mug: '<rect x="-8" y="-20" width="16" height="18" rx="3" fill="#f8fafc" stroke="#94a3b8"/><path d="M8,-15 q7,2 0,9" stroke="#94a3b8" stroke-width="3" fill="none"/><rect x="-8" y="-20" width="16" height="4" fill="#78350f" opacity=".7"/><path d="M-3,-25 q-3,-5 0,-9 M3,-25 q-3,-5 0,-9" stroke="#e2e8f0" stroke-width="2" fill="none" opacity=".7"/>',
  glass: '<path d="M-7,-20 h14 l-2,18 h-10 z" fill="rgba(186,230,253,.75)" stroke="#7dd3fc"/><rect x="-6" y="-12" width="12" height="9" fill="#38bdf8" opacity=".6"/>',
  news: '<rect x="-30" y="-34" width="36" height="42" fill="#f5f5f4" stroke="#a8a29e"/><rect x="-27" y="-30" width="16" height="12" fill="#cbd5e1"/><path d="M-9,-28 h12 M-9,-22 h12 M-27,-14 h30 M-27,-8 h30 M-27,-2 h24 M-27,4 h30" stroke="#a8a29e" stroke-width="2"/>',
  diary: '<rect x="-16" y="-14" width="28" height="22" rx="3" fill="#a855f7"/><rect x="-13" y="-11" width="22" height="16" fill="#f5f3ff"/><path d="M-10,-6 h16 M-10,-1 h12" stroke="#a78bfa" stroke-width="1.6"/>',
  sketch: '<rect x="-18" y="-24" width="26" height="30" rx="2" fill="#fef3c7" stroke="#d97706"/><path d="M-14,-14 q6,-8 14,0 t6,6" stroke="#475569" stroke-width="1.6" fill="none"/>',
  duster: '<path d="M0,0 L-8,-30" stroke="#92400e" stroke-width="3.5" stroke-linecap="round"/><g transform="translate(-9 -34)"><circle r="8" fill="#f472b6"/><circle cx="-6" cy="-4" r="6" fill="#f9a8d4"/><circle cx="6" cy="-5" r="6" fill="#fbcfe8"/><circle cy="-10" r="6" fill="#f472b6"/></g>',
  can: '<path d="M-14,-18 h16 v14 h-16 z" fill="#22c55e" stroke="#15803d"/><path d="M2,-14 l12,-8" stroke="#15803d" stroke-width="4" stroke-linecap="round"/><path d="M-12,-18 q4,-10 12,0" stroke="#15803d" stroke-width="2.5" fill="none"/>',
  pad: '<rect x="-14" y="-12" width="26" height="14" rx="7" fill="#1f2937"/><circle cx="-7" cy="-5" r="2.4" fill="#ef4444"/><circle cx="5" cy="-5" r="2.4" fill="#3b82f6"/>',
  bowl: '<path d="M-14,-12 h26 q-2,12 -13,12 q-11,0 -13,-12 z" fill="#f8fafc" stroke="#cbd5e1"/><path d="M-10,-12 q4,-4 8,0 q4,-4 8,0" stroke="#fbbf24" stroke-width="2.4" fill="none"/><path d="M-4,-17 q-3,-5 0,-9 M4,-17 q-3,-5 0,-9" stroke="#e2e8f0" stroke-width="2" fill="none" opacity=".7"/>',
  juice: '<rect x="-7" y="-22" width="14" height="20" rx="2" fill="#f97316"/><rect x="-7" y="-16" width="14" height="7" fill="#fde68a"/><path d="M3,-22 l3,-7" stroke="#e5e7eb" stroke-width="2"/>',
  paddle: '<circle cx="-2" cy="-14" r="10" fill="#dc2626" stroke="#7f1d1d"/><rect x="-4" y="-5" width="4" height="10" rx="2" fill="#78350f"/>',
};
const FREE_BASES = { meri: ['main'], rara: ['santai'], pandu: ['main'], vera: ['main'], lukas: ['main'] };
const POSES = ['ngulet', 'working', 'painting', 'stamping', 'reaching', 'sipL', 'sipR', 'stretch', 'waving', 'dance', 'sleeping', 'listening', 'rush', 'talking'];

class Actor {
  constructor(key, label, bases, home) {
    this.key = key; this.label = label; this.home = home;
    Object.assign(this, { x: home.x, y: home.y, z: home.z || 0, seated: !!home.seat });
    this.path = null; this.tok = 0; this.act = null; this.face = 1; this.view = 'front'; this.restUntil = 0; this.free = false;
    this.g = el('g', { class: `actor a-${key}` });
    this.flip = el('g', { class: 'flipG' });
    this.hopG = el('g');
    this.bob = el('g', { class: 'bob' });
    this.lines = el('g', { class: 'speedlines' }, '<path d="M-34,-70 h-16 M-32,-56 h-22 M-34,-42 h-14" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>');
    this.vars = {}; // versi yang sudah dibuat
    this.make = {}; // resep versi (dibuat saat pertama kali dibutuhkan → hemat memori, penting di iPhone)
    for (const [bk, o] of Object.entries(bases)) {
      for (const v of ['front', 'back']) this.make[`${bk}:${v}`] = () => el('g', {}, charSvg(o, v));
      // versi tangan kosong (barangnya ditaruh di meja saat keluar ruangan); tampak belakang memang tanpa barang
      if (o.item && (FREE_BASES[key] || []).includes(bk)) this.make[`${bk}-free:front`] = () => el('g', {}, charSvg({ ...o, item: undefined }, 'front'));
    }
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
    this.base = Object.keys(bases)[0];
    this.show();
    this.place();
  }
  show() {
    const fk = `${this.base}-free:${this.view}`;
    const k = this.free && this.make[fk] ? fk : `${this.base}:${this.view}`;
    if (!this.vars[k]) { this.vars[k] = this.make[k](); this.bob.insertBefore(this.vars[k], this.carryG); if (this.held) this.holdL(this.held); }
    for (const [n, g] of Object.entries(this.vars)) g.style.display = n === k ? '' : 'none';
  }
  variant(b) { this.base = b; this.show(); }
  setView(v) { if (v !== this.view) { this.view = v; this.show(); } }
  carry(kind) { this.carryG.innerHTML = kind ? PROPS[kind] : ''; }
  holdL(kind) {
    this.held = kind;
    for (const lp of this.g.querySelectorAll('.lprop')) lp.innerHTML = kind ? `<g transform="translate(${lp.dataset.hx} ${lp.dataset.hy})">${LPROPS[kind]}</g>` : '';
  }
  cls(name, on = true) { this.g.classList.toggle(name, on); }
  pose(name, on = true) { this.cls(name, on); }
  clearPose() { for (const p of POSES) this.g.classList.remove(p); this.holdL(null); this.carry(null); this.progress(null); }
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
  lookAt(b) { const [ax] = G(this.x, this.y), [bx] = G(b.x, b.y); this.face = bx >= ax ? 1 : -1; this.setView('front'); this.place(); }
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
      const [sx0, sy0] = G(this.x, this.y), [sx1, sy1] = G(p.x, p.y);
      if (Math.abs(sx1 - sx0) > 0.5) this.face = sx1 > sx0 ? 1 : -1;
      if (Math.abs(sy1 - sy0) > 0.3) this.setView(sy1 < sy0 ? 'back' : 'front'); // menjauh = tampak belakang
      if (d <= move) { this.x = p.x; this.y = p.y; this.path.shift(); move -= d; } else { this.x += (p.x - this.x) / d * move; this.y += (p.y - this.y) / d * move; move = 0; }
    }
    if (!this.path.length) {
      this.path = null;
      const t = this.target;
      if (t === this.home && this.free) pickUp(this);
      this.z = t.z || 0; this.seated = !!t.seat;
      this.cls('walking', false); this.cls('running', false);
      this.setView(t.view || 'front');
      if (t.face) this.face = t.face; else if (this.seated || t.faceFront) this.face = 1;
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
    const sit = this.seated && !this.path;
    if (sit !== this.sitting) { this.sitting = sit; this.g.classList.toggle('sit', sit); } // kaki dilipat saat duduk
    const sb = sit && this.view === 'back';
    if (sb !== this.sitBack) { this.sitBack = sb; this.g.classList.toggle('sit-back', sb); }
    const [a, b] = G(this.x, this.y, this.z);
    this.g.setAttribute('transform', `translate(${a.toFixed(1)} ${b.toFixed(1)})`);
    this.flip.setAttribute('transform', `scale(${this.face} 1)`);
    this.g.dataset.d = this.x + this.y;
    const c = this.container();
    if (this.g.parentNode !== c) c.append(this.g);
    const sib = [...c.children].filter((n) => n.classList && n.classList.contains('actor'));
    if (sib.length > 1) {
      const sorted = [...sib].sort((p, q) => p.dataset.d - q.dataset.d);
      if (sorted.some((n, i) => n !== sib[i])) sorted.forEach((n) => c.append(n)); // susun ulang hanya kalau urutannya berubah
    }
  }
  headPt() { const [a, b] = G(this.x, this.y, this.z); return [a, b - HEAD * 0.8]; }
  handPt() { const [a, b] = G(this.x, this.y, this.z); return [a, b - HEAD * 0.35]; }
}

const A = {
  gaby: new Actor('gaby', '👑 Gaby', { nomic: { ...CH.gaby, item: undefined }, main: CH.gaby }, seatOf('gaby')),
  meri: new Actor('meri', '📝 Meri', { main: CH.meri }, seatOf('meri')),
  rara: new Actor('rara', '🔎 Rara', { santai: CH.rara, kerja: CH.raraK }, spot('rara', 'santai')),
  pandu: new Actor('pandu', '🗺️ Pandu', { main: CH.pandu }, seatOf('pandu')),
  vera: new Actor('vera', '✅ Vera', { main: CH.vera }, seatOf('vera')),
  lukas: new Actor('lukas', '🎨 Lukas', { main: CH.lukas }, seatOf('lukas')),
};
// Rara bekerja di samping kanan bola bumi, menghadap bola (tampak belakang, serong kiri) — bola & layarnya tetap terlihat.
const RARA_KERJA = { x: R.rara.off[0] + 7.4, y: R.rara.off[1] + 3.3, z: 0, seat: false, view: 'back', face: -1 };
// Mic Gaby: dipegang saat bicara, ditaruh di meja saat tidak ngobrol.
const deskMic = el('g', { class: 'deskmic' });
function gabyMic(hold) {
  A.gaby.variant(hold ? 'main' : 'nomic');
  const [x, y] = G(R.gaby.off[0] + 5.7, R.gaby.off[1] + 4.6, 1.3);
  deskMic.innerHTML = hold ? '' : `<g transform="translate(${x} ${y})"><ellipse rx="7" ry="2.5" fill="#334155"/><rect x="-1.2" y="-14" width="2.4" height="14" fill="#475569"/><rect x="-3" y="-27" width="6" height="14" rx="3" fill="#27272a"/><circle cy="-29" r="5" fill="#9ca3af"/></g>`;
}
const VERA_DROP = { ...spot('vera', 'drop'), faceFront: true };
// Barang khas tiap teman: ditaruh di meja saat keluar ruangan, diambil lagi saat kembali.
const DESK_ITEM = {
  meri: { at: [4.5, 4.4, 1.25], svg: '<path d="M-12,-2 h8 l2,-3 h5 l2,3 h6 v10 h-23 z" fill="#fbbf24" stroke="#d97706"/><rect x="-8" y="2" width="12" height="2.5" fill="#fde68a"/>' },
  rara: { at: [1.75, 2.0, 1.0], back: true, svg: '<ellipse rx="9" ry="3" fill="#f1f5f9"/><path d="M-6,-9 h12 q-1,9 -6,9 q-5,0 -6,-9 z" fill="#fef3c7" stroke="#d6b88a"/><path d="M6,-7 q4,1 0,5" stroke="#d6b88a" stroke-width="1.6" fill="none"/><path d="M-2,-12 q-2,-4 0,-7 M2,-12 q-2,-4 0,-7" stroke="#e2e8f0" stroke-width="1.2" fill="none" opacity=".7"/>' },
  pandu: { at: [4.1, 5.2, 1.35], svg: '<ellipse rx="9" ry="4.5" fill="#d4a017" stroke="#92400e"/><ellipse rx="6" ry="3" fill="#fff8e1"/><path d="M-4,0 L4,0" stroke="#ef4444" stroke-width="1.8"/>' },
  vera: { at: [5.7, 4.6, 1.4], svg: '<path d="M2,-2 L13,3" stroke="#78350f" stroke-width="3" stroke-linecap="round"/><ellipse cx="-4" cy="-3" rx="8" ry="4.5" fill="rgba(186,230,253,.65)" stroke="#b45309" stroke-width="2.2"/>' },
  lukas: { at: [6.3, 6.15, 1.1], svg: '<path d="M-12,2 L9,-3" stroke="#92400e" stroke-width="2.6" stroke-linecap="round"/><path d="M9,-3 l6,-1.5" stroke="#ef4444" stroke-width="3.6" stroke-linecap="round"/>' },
};
const deskItemG = {};
for (const [k, d] of Object.entries(DESK_ITEM)) {
  const it = R[k];
  const [x, y] = G(it.off[0] + d.at[0], it.off[1] + d.at[1], d.at[2]);
  deskItemG[k] = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, style: 'display:none' }, d.svg);
  (d.back ? it.fx0 : it.overG).append(deskItemG[k]);
}
const canFree = (a) => !!deskItemG[a.key] && !!a.make[`${a.base}-free:front`];
async function putDown(a) {
  if (a.free || !canFree(a)) return;
  a.pose('reaching'); await wait(380); a.pose('reaching', false);
  a.free = true; a.show(); deskItemG[a.key].style.display = '';
}
function pickUp(a) {
  if (!a.free) return;
  a.free = false; a.show(); if (deskItemG[a.key]) deskItemG[a.key].style.display = 'none';
  a.pose('reaching'); setTimeout(() => a.pose('reaching', false), 350 / SPD);
}
const inBox = (p, b) => !!b && p.x >= b[0] && p.x <= b[2] && p.y >= b[1] && p.y <= b[3];
const ownBox = (a) => (R[a.key] ? R[a.key].box : null);
const atHome = (a) => dist(a, a.home) < 0.05 && !a.path;
const arrive = async (a) => { while (a.path) await wait(120); };

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
const rise = (pt, txt, size = 18, ms = 1300) => pop(pt, `<text class="rise" text-anchor="middle" font-size="${size}">${txt}</text>`, ms);
const sparkle = (pt) => rise(pt, '✨', 22, 1200);
async function notes(a, n = 3) { for (let i = 0; i < n; i++) { const [x, y] = a.headPt(); rise([x + 20 - i * 6, y - 6], ['🎵', '🎶'][i % 2], 15); await wait(420); } }
async function zzzOf(a, ms) { const end = performance.now() + ms / SPD; while (performance.now() < end) { const [x, y] = a.headPt(); rise([x + 18, y - 8], '💤', 15, 1400); await wait(800); } }
const busy = (room, on) => R[room].g.classList.toggle('busy', on);
const GABY_SCREEN = () => G(R.gaby.off[0] + 4.1, R.gaby.off[1] + 1.8, 4.6);
const ORB = () => G(R.gaby.off[0] + 3, R.gaby.off[1] + 4.6, 1.9);
const CANVAS = () => G(R.lukas.off[0] + 4.0, R.lukas.off[1] + 2.6, 3.3);
const BOARD = () => G(R.pandu.off[0] + 2.4 + Math.random() * 3, R.pandu.off[1] + 0.05, 2.3 + Math.random() * 1.8);

// Laci Meri (urutan sama dengan CATEGORIES di memory.js; 7 = 🍜 makanan)
function drawerGeo(k) {
  const c = k % 6, r = Math.floor(k / 6), o = R.meri.off;
  return { x: o[0] + 0.55 + c * 1.17, y: o[1] + 0.61, z: 2.65 - r * 1.2, w: 1.07, h: 1.05 };
}
const drawerPt = (k) => { const d = drawerGeo(k); return G(d.x + d.w / 2, d.y, d.z + d.h / 2); };
// Berdiri di samping laci (bukan tepat di depannya) supaya laci yang menyala tetap terlihat.
const drawerStand = (k) => { const d = drawerGeo(k); return { x: Math.min(d.x + d.w + 0.45, R.meri.off[0] + 7.4), y: d.y + 0.9, z: 0, face: -1 }; };
const poly = (pts, attrs) => `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" ${attrs}/>`;

// ---------- v1.22: papan rute Pandu — paku & benang mengikuti langkah ASLI rencananya ----------
// Semua elemen dibuat SEKALI (jumlah tetap, hanya disembunyikan/ditampilkan) supaya memori tidak bertambah — penting untuk iPhone.
const PIN_MAX = 8;
const PIN_COL = { todo: '#cbd5e1', run: '#facc15', done: '#ef4444', ok: '#22c55e', fail: '#94a3b8' };
// Keadaan papan: tetap dicatat walau Ruang Kerja tertutup (murah), digambar saat dibuka.
const route = { job: null, list: [], at: -1, end: null, pinned: -1 };
const BPT = (x, z, y = 0.05) => G(R.pandu.off[0] + x, R.pandu.off[1] + y, z);
const pinXZ = (i, n) => [n > 1 ? 1.8 + (i / (n - 1)) * 4.4 : 4, (i % 2 ? 2.45 : 3.75) + (((i * 37) % 5) - 2) * 0.07];
const routeG = el('g', { class: 'route', style: 'display:none' });
const routeLines = [], routePins = [];
{
  const f = (x, z, w, h, c, y) => poly([BPT(x, z, y), BPT(x + w, z, y), BPT(x + w, z + h, y), BPT(x, z + h, y)], `fill="${c}"`);
  // peta bersih menutupi rute contoh yang tergambar di papan
  routeG.innerHTML = f(1.3, 1.7, 5.2, 2.8, '#e7d3a4', 0.035) + f(1.6, 2.4, 1.8, 1.4, '#86efac', 0.04) + f(3.8, 2.0, 1.6, 1.8, '#86efac', 0.04) + f(5.6, 3.2, 0.7, 0.9, '#86efac', 0.04);
  for (let i = 0; i < PIN_MAX - 1; i++) { const l = el('line', { stroke: '#dc2626', 'stroke-width': 1.8, 'stroke-linecap': 'round', style: 'display:none' }); routeLines.push(l); routeG.append(l); }
  for (let i = 0; i < PIN_MAX; i++) {
    const p = el('g', { style: 'display:none' }, `<circle r="${(4.4 * VK).toFixed(1)}" stroke="#0f172a" stroke-width=".8"/><text y="${(2.2 * VK).toFixed(1)}" text-anchor="middle" font-size="${(6 * VK).toFixed(1)}" font-weight="900" font-family="system-ui" fill="#0f172a">${i + 1}</text>`);
    routePins.push(p); routeG.append(p);
  }
  R.pandu.fx0.append(routeG);
}
const routeN = () => Math.min(PIN_MAX, route.list.length);
// Gambar papan sesuai `route` (tanpa animasi). Dipanggil saat ada kabar langkah & saat Ruang Kerja dibuka.
function drawRoute() {
  const n = routeN();
  routeG.style.display = n ? '' : 'none';
  if (!n) return;
  for (let i = 0; i < PIN_MAX; i++) {
    const p = routePins[i];
    if (i >= n) { p.style.display = 'none'; continue; }
    const [x, z] = pinXZ(i, n);
    const [sx, sy] = BPT(x, z);
    const st = route.end ? route.end : i < route.at ? 'done' : i === route.at ? 'run' : 'todo';
    const big = st === 'run' ? 1.35 : 1;
    p.style.display = '';
    p.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${big})`);
    p.firstChild.setAttribute('fill', PIN_COL[st]);
    p.style.opacity = st === 'todo' ? 0.55 : 1;
  }
  for (let i = 0; i < PIN_MAX - 1; i++) {
    const l = routeLines[i];
    const on = i < n - 1 && (route.end || i < route.at);
    l.style.display = on ? '' : 'none';
    if (!on) continue;
    const [ax, ay] = BPT(...pinXZ(i, n)), [bx, by] = BPT(...pinXZ(i + 1, n));
    l.setAttribute('x1', ax.toFixed(1)); l.setAttribute('y1', ay.toFixed(1)); l.setAttribute('x2', bx.toFixed(1)); l.setAttribute('y2', by.toFixed(1));
    l.setAttribute('stroke', route.end === 'ok' ? '#16a34a' : route.end === 'fail' ? '#94a3b8' : '#dc2626');
  }
}
// Benang baru "ditarik" dari paku sebelumnya ke paku yang sedang dikerjakan.
function pullString(i) {
  const n = routeN(), l = routeLines[i - 1];
  if (!l || i >= n) return Promise.resolve();
  const [ax, ay] = BPT(...pinXZ(i - 1, n)), [bx, by] = BPT(...pinXZ(i, n));
  l.style.display = '';
  l.setAttribute('x1', ax.toFixed(1)); l.setAttribute('y1', ay.toFixed(1));
  return anim(500, (t) => { const e = ease(t); l.setAttribute('x2', (ax + (bx - ax) * e).toFixed(1)); l.setAttribute('y2', (ay + (by - ay) * e).toFixed(1)); });
}
const shortStep = (t) => { const s = String(t || '').replace(/…$/, ''); return s.length > 30 ? `${s.slice(0, 29)}…` : s; };
// Pandu berjalan ke paku langkah ke-i, menancapkannya, lalu menarik benang.
let pinBusy = Promise.resolve();
function panduPin(i, text) {
  pinBusy = pinBusy.then(async () => {
    const a = A.pandu, n = routeN();
    if (!running) return drawRoute();
    if (i >= n) { drawRoute(); return; }
    // Pandu sering mengabarkan langkah yang SAMA berkali-kali (tiap memakai alat): cukup ganti tulisan gelembungnya.
    if (i === route.pinned) { if (text) a.say(`📍 ${shortStep(text)}`, 1800); return; }
    route.pinned = i;
    if (a.working != null) {
      const [x] = pinXZ(i, n);
      const t = { x: R.pandu.off[0] + Math.min(6, Math.max(1.9, x)), y: R.pandu.off[1] + 1.3, z: 0, view: 'back' };
      a.pose('working', false);
      if (dist(a, t) > 0.15) await a.walk(t, { run: true });
      if (a.working == null) return drawRoute();
      a.pose('reaching');
      await wait(350);
    }
    drawRoute();
    if (i > 0) await pullString(i);
    if (text) a.say(`📍 ${shortStep(text)}`, 1800);
    await wait(250);
    if (a.working != null) { a.pose('reaching', false); a.pose('working'); }
  }).catch((e) => console.warn('[Gaby] papan Pandu', e));
}
async function routeFinish(ok) {
  route.end = ok ? 'ok' : 'fail';
  if (!running) return;
  if (!ok) { drawRoute(); return; }
  // paku menghijau satu per satu, lalu bendera 🏁 di paku terakhir
  const n = routeN(), save = route.end;
  route.end = null; route.at = n;
  for (let i = 0; i < n; i++) { routePins[i].firstChild.setAttribute('fill', PIN_COL.ok); await wait(90); }
  route.end = save; drawRoute();
  const [x, y] = BPT(...pinXZ(n - 1, n));
  rise([x, y - 6], '🏁', 16, 1400);
}

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

// ---------- v1.23: meja periksa Vera — kertasnya sesuai pekerjaan ASLI yang diperiksa ----------
// rencana Pandu = daftar centang, berita Rara = koran, gambar Lukas = foto berbingkai.
// Semua elemen dibuat SEKALI (hanya disembunyikan/ditampilkan) supaya memori tetap — penting untuk iPhone.
const VZ = 1.43;
const VD = (x, y) => G(R.vera.off[0] + x, R.vera.off[1] + y, VZ);
const vquad = (x0, y0, x1, y1, attrs) => poly([VD(x0, y0), VD(x1, y0), VD(x1, y1), VD(x0, y1)], attrs);
const vline = (x0, x1, y, c = '#94a3b8', w = 1.6) => { const [a, b] = VD(x0, y), [c2, d] = VD(x1, y); return `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c2.toFixed(1)}" y2="${d.toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; };
const DOC_MARKS = { // tempat centang tiap jenis kertas (x, y lokal di meja)
  plan: [[5.12, 4.45], [5.12, 4.65], [5.12, 4.85], [5.12, 5.05]],
  news: [[5.32, 4.6], [5.32, 4.8], [5.32, 5.0]],
  image: [[3.85, 4.3], [5.35, 4.3], [5.35, 5.1]],
};
const DOC_THINK = {
  plan: ['🧮 cek hitungannya…', '📅 tanggalnya bentrok?', '🏨 check-out ada?', '👎 ada pantangan?', '🗓️ tiap hari terisi?'],
  news: ['🔗 cek sumbernya…', '📰 beritanya baru?', '🤔 angkanya cocok?'],
  image: ['🖼️ sesuai permintaan?', '🔍 detailnya ada?', '🎨 warnanya pas?'],
};
const DOC_STAMP = { plan: 'RENCANA', news: 'FAKTA', image: 'GAMBAR' };
const docKind = (j) => (j && j.owner === 'rara' ? 'news' : j && j.owner === 'lukas' ? 'image' : 'plan');
const veraDocs = {}, veraMarks = [];
const veraDeskG = el('g', { class: 'veradesk' });
{
  veraDocs.plan = el('g', { style: 'display:none' }, vquad(3.95, 4.25, 5.3, 5.2, 'fill="#fffbeb" stroke="#d6b88a"') + vquad(4.45, 4.2, 4.8, 4.3, 'fill="#78350f"')
    + [4.45, 4.65, 4.85, 5.05].map((y, k) => vline(4.1, k % 2 ? 4.8 : 4.95, y)).join(''));
  veraDocs.news = el('g', { style: 'display:none' }, vquad(3.95, 4.25, 5.45, 5.2, 'fill="#f5f5f4" stroke="#a8a29e"') + vline(4.05, 5.3, 4.38, '#334155', 3)
    + vquad(4.05, 4.52, 4.55, 4.92, 'fill="#cbd5e1"') + [4.6, 4.8, 5.0].map((y) => vline(4.65, 5.2, y)).join('') + vline(4.05, 4.55, 5.08));
  veraDocs.image = el('g', { style: 'display:none' }, vquad(3.9, 4.2, 5.35, 5.2, 'fill="#92400e" stroke="#78350f"') + vquad(4.0, 4.3, 5.25, 4.75, 'fill="#7dd3fc"')
    + vquad(4.0, 4.75, 5.25, 5.1, 'fill="#86efac"') + (() => { const [x, y] = VD(4.95, 4.48); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#fbbf24"/>`; })());
  for (const k of Object.keys(veraDocs)) veraDeskG.append(veraDocs[k]);
  for (let i = 0; i < 4; i++) { const t = el('text', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, 'font-family': 'system-ui', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', style: 'display:none' }); veraMarks.push(t); veraDeskG.append(t); }
  R.vera.overG.append(veraDeskG);
}
const roundTag = el('g', { class: 'tag', style: 'display:none' });
uiG.append(roundTag);
let docShown = null;
function veraDoc(kind) {
  docShown = kind;
  for (const k of Object.keys(veraDocs)) veraDocs[k].style.display = k === kind ? '' : 'none';
  for (const m of veraMarks) m.style.display = 'none';
  if (!kind) roundTag.style.display = 'none';
}
function veraPaper(on, j) { veraDoc(on ? docKind(j) : null); } // nama lama tetap dipakai pengatur adegan
function mark(i, good) {
  const pos = (DOC_MARKS[docShown] || [])[i], m = veraMarks[i];
  if (!pos || !m) return;
  const [x, y] = VD(...pos);
  m.setAttribute('x', x.toFixed(1)); m.setAttribute('y', (y + 4).toFixed(1));
  m.setAttribute('fill', good ? '#16a34a' : '#dc2626');
  m.textContent = good ? '✓' : '✗';
  m.style.display = '';
}
function showRound(n) {
  if (n < 2) { roundTag.style.display = 'none'; return; }
  const [x, y] = VD(4.6, 4.2);
  roundTag.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - 46).toFixed(1)})`);
  roundTag.innerHTML = `<rect x="-38" y="-10" width="76" height="20" rx="10" fill="#7c2d12" stroke="#fdba74"/><text y="4" text-anchor="middle" font-size="11" font-weight="800" fill="#ffedd5" font-family="system-ui">Putaran ${n}</text>`;
  roundTag.style.display = '';
}
// Alasan penolakan ASLI (dari kabar aplikasi), dipendekkan untuk gelembung Vera.
function reasonOf(j) {
  let t = String((j && j.reason) || '').replace(/^Memperbaiki(\s*\(ke-\d+\))?:\s*/i, '').replace(/…+$/, '').trim();
  if (j) j.reason = '';
  if (!t) t = j && j.owner === 'rara' ? 'sumbernya kurang kuat' : 'masih ada yang kurang';
  return t.length > 34 ? `${t.slice(0, 33)}…` : t;
}

// Bekerja buru-buru: tangan bergerak cepat, bar progres, keringat, ruangan "sibuk"
async function work(a, room, ms, text, pose = 'working') {
  busy(room, true); a.cls('rush', true); a.pose(pose); a.say(text);
  await anim(ms, (t) => a.progress(t));
  a.progress(null); a.cls('rush', false); a.pose(pose, false); busy(room, false); a.say('');
}

// ---------- BARANG HIDUP (v1.27; pemilik 14 Nov 2026: "joystick cuma pajangan di lantai, bet pingpong tetap di meja
// walau dimainkan, teko di pantry gak pernah dituang"). Barang yang bisa dipakai TIDAK digambar di latar
// (office-art: window.LIVE_PROPS) tapi di sini: dibuat SEKALI, lalu hanya dipindah / disembunyikan (jumlah elemen tetap).
// Barang yang dipinjam karakter otomatis kembali ke tempatnya saat aktivitasnya selesai/dibatalkan (cancelAct → giveBack).
const LIVE = window.LIVE_PROPS === true;
const P = {};
const setT = (g, x, y, rot = 0) => g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})${rot ? ` rotate(${rot.toFixed(0)})` : ''}`);
function propAt(room, x, y, z, svgText, layer = 'fx0') {
  const [gx, gy] = G(R[room].off[0] + x, R[room].off[1] + y, z);
  const g = el('g', { class: 'liveprop' }, `<g transform="scale(${VK})">${svgText}</g>`);
  g.home = [gx, gy];
  g.homeLayer = R[room][layer];
  g.homeLayer.append(g);
  setT(g, gx, gy);
  return g;
}
const showP = (g, on = true) => { if (g) g.style.display = on ? '' : 'none'; };
function homeP(g) { if (!g) return; if (g.parentNode !== g.homeLayer) g.homeLayer.append(g); setT(g, ...g.home); showP(g, true); }
// Pinjam barang (hilang dari tempatnya) — kembali sendiri saat aktivitas si peminjam berakhir.
function borrow(a, g) { if (!g || g.style.display === 'none') return false; showP(g, false); (a.loans || (a.loans = [])).push(g); return true; }
function giveBack(a) { for (const g of a.loans || []) homeP(g); a.loans = []; }
function facePoly(room, pts, fill, layer = 'fx0') {
  const o = R[room].off;
  const g = el('g', { class: 'liveprop', style: 'display:none' }, poly(pts.map(([x, y, z]) => G(o[0] + x, o[1] + y, z)), `fill="${fill}"`));
  R[room][layer].append(g);
  return g;
}
if (LIVE) {
  // pantry: mug di mesin kopi, teko + 2 mug + piring pisang goreng di meja, layar microwave, pintu kulkas
  P.machMug = propAt('pantry', 2.45, 0.95, 1.4, PROP_SVG.mug('#fef3c7', false));
  P.teapot = propAt('pantry', 5.7, 4.1, 1.2, PROP_SVG.teapot, 'liveG');
  P.mugA = propAt('pantry', 5.9, 4.7, 1.2, PROP_SVG.mug('#38bdf8', false), 'liveG');
  P.mugB = propAt('pantry', 4.7, 5.0, 1.2, PROP_SVG.mug('#f472b6', false), 'liveG');
  P.plate = propAt('pantry', 5.0, 4.4, 1.25, PROP_SVG.plate, 'liveG');
  P.fritters = [-7, 0].map((dx) => propAt('pantry', 5.0, 4.4, 1.25, PROP_SVG.fritter(dx), 'liveG'));
  P.microLight = facePoly('pantry', [[4.1, 0.97, 1.5], [4.9, 0.97, 1.5], [4.9, 0.97, 2.0], [4.1, 0.97, 2.0]], '#fde68a');
  { const [mx, my] = G(R.pantry.off[0] + 4.5, R.pantry.off[1] + 0.97, 1.6); P.microBowl = el('text', { 'text-anchor': 'middle', 'font-size': 11, x: mx.toFixed(1), y: my.toFixed(1) }, '🍜'); P.microLight.append(P.microBowl); }
  {
    const o = R.pantry.off, Q = (x, y, z) => G(o[0] + x, o[1] + y, z);
    const shelf = (z) => poly([Q(1.22, 5.45, z), Q(1.22, 6.75, z), Q(1.22, 6.75, z + 0.06), Q(1.22, 5.45, z + 0.06)], 'fill="#cbd5e1"');
    const bottle = (y, z, c) => poly([Q(1.23, y, z), Q(1.23, y + 0.22, z), Q(1.23, y + 0.22, z + 0.6), Q(1.23, y + 0.15, z + 0.75), Q(1.23, y + 0.07, z + 0.75), Q(1.23, y, z + 0.6)], `fill="${c}"`);
    P.fridgeOpen = el('g', { class: 'liveprop', style: 'display:none' },
      poly([Q(1.21, 5.45, 0.15), Q(1.21, 6.75, 0.15), Q(1.21, 6.75, 3.15), Q(1.21, 5.45, 3.15)], 'fill="#fefce8"')
      + shelf(1.05) + shelf(2.1) + bottle(5.65, 1.11, '#f97316') + bottle(5.95, 1.11, '#22c55e') + bottle(6.3, 1.11, '#facc15')
      + bottle(5.8, 2.16, '#38bdf8') + bottle(6.15, 2.16, '#ef4444'));
    R.pantry.fx0.append(P.fridgeOpen);
    // pintu dibuka ±150° (engsel depan-kiri, mengayun ke arah kamera-kiri) → tampak sebagai panel di kiri kulkas, isinya tidak tertutup
    P.fridgeDoor = el('g', { class: 'liveprop', style: 'display:none' },
      poly([Q(1.2, 6.8, 0.05), Q(1.8, 7.84, 0.05), Q(1.8, 7.84, 3.3), Q(1.2, 6.8, 3.3)], 'fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"')
      + poly([Q(1.68, 7.6, 1.6), Q(1.74, 7.7, 1.6), Q(1.74, 7.7, 2.4), Q(1.68, 7.6, 2.4)], 'fill="#64748b"'));
    R.pantry.liveG.append(P.fridgeDoor);
  }
  // ruang game: joystick di lantai, tokoh kecil di layar TV, 2 bet & bola di meja ping-pong, layar arcade
  P.pad = propAt('game', 3.0, 2.6, 0, PROP_SVG.pad);
  P.tvHero = propAt('game', 2.6, 0.6, 0.95, '<rect x="-4" y="-9" width="8" height="9" rx="1.5" fill="#fde047" stroke="#0f172a" stroke-width="1"/><circle cx="1.5" cy="-6" r="1" fill="#0f172a"/>');
  showP(P.tvHero, false);
  P.padR = propAt('game', 8.0, 2.5, 0.85, PROP_SVG.paddle('#dc2626'));
  P.padB = propAt('game', 10.2, 3.6, 0.85, PROP_SVG.paddle('#111827'));
  P.ball = propAt('game', 9.6, 2.6, 1.6, PROP_SVG.ball);
  // Rara: buku terbuka di kursi baca & 1 buku di rak; Lukas: kuas di 3 toples (gambar dari office-art: window.LIVE_ABS)
  const absProp = (room, key, layer = 'fx0') => {
    const g = el('g', { class: 'liveprop' }, (window.LIVE_ABS || {})[key] || '');
    g.home = [0, 0]; g.homeLayer = R[room][layer]; g.homeLayer.append(g);
    return g;
  };
  P.raraOpenBook = absProp('rara', 'raraOpenBook');
  P.raraShelfBook = absProp('rara', 'raraShelfBook');
  P.brushes = [0, 1, 2].map((i) => absProp('lukas', `lukasBrush${i}`, 'liveG'));
  P.arcadeFlash = facePoly('game', [[10.7, 1.32, 1.5], [11.6, 1.32, 1.5], [11.6, 1.32, 2.3], [10.7, 1.32, 2.3]], '#f0abfc');
}
const ptOf = (g, dy = 0) => [g.home[0], g.home[1] + dy];
// Teko terangkat, miring di atas mug, tetesan teh, lalu kembali.
async function pourTea(mug) {
  if (!LIVE || !mug) return;
  const [hx, hy] = P.teapot.home, [mx, my] = mug.home;
  const tx = mx - 12, ty = my - 22;
  await anim(450, (t) => setT(P.teapot, hx + (tx - hx) * ease(t), hy + (ty - hy) * ease(t) - Math.sin(t * Math.PI) * 10));
  await anim(300, (t) => setT(P.teapot, tx, ty, 38 * t));
  for (let i = 0; i < 3; i++) { rise([mx + 2, my - 14], '💧', 9, 500); await wait(220); }
  rise([mx, my - 18], '♨️', 12, 900);
  await anim(300, (t) => setT(P.teapot, tx, ty, 38 * (1 - t)));
  await anim(450, (t) => setT(P.teapot, tx + (hx - tx) * ease(t), ty + (hy - ty) * ease(t) - Math.sin(t * Math.PI) * 10));
  homeP(P.teapot);
}
// Pisang goreng di piring: diambil satu-satu, terisi lagi 40 dtk setelah habis.
let refillT = 0;
function takeFritter() {
  if (!LIVE) return true;
  const f = P.fritters.find((g) => g.style.display !== 'none');
  if (!f) return false;
  showP(f, false);
  if (!P.fritters.some((g) => g.style.display !== 'none') && !refillT) {
    refillT = setTimeout(() => { refillT = 0; P.fritters.forEach((g) => showP(g, true)); rise(ptOf(P.plate, -10), '🍌', 14, 1200); }, 40000 / SPD);
  }
  return true;
}

// ---------- status & kunci adegan ----------
const state = { busy: new Set(), santai: true, tidur: false, ptt: false }; // santai = waktu bebas (mic OFF)
const NAMES = { gaby: 'Gaby', meri: 'Meri', rara: 'Rara', pandu: 'Pandu', vera: 'Vera', lukas: 'Lukas' };
function toast(t) { const d = $('toast'); d.textContent = t; d.classList.add('show'); clearTimeout(d.t); d.t = setTimeout(() => d.classList.remove('show'), 2200); }
function status(t) { $('status').textContent = t; }
const idleStatus = () => (state.tidur ? 'Malam: Gaby tidur 💤' : state.ptt ? 'Mic ON: kamu ngobrol dengan Gaby · tim standby 👂' : state.santai ? 'Mic OFF: waktu bebas ☕🎮' : 'Tim standby');
const TAKEN = new Map(); // tempat yang sedang dipakai (kursi pantry, arcade, …) → pemain
function cancelAct(a) {
  if (!a.act) return;
  a.act = null;
  for (const [id, who] of [...TAKEN]) if (who === a) TAKEN.delete(id);
  a.clearPose();
  giveBack(a);
  if (a.key === 'rara') a.variant('santai');
}
function claim(keys, label) {
  const b = keys.find((k) => state.busy.has(k));
  if (b) { toast(`${NAMES[b]} masih sibuk, tunggu sebentar ya`); return false; }
  keys.forEach((k) => state.busy.add(k));
  // Teman yang sedang beraktivitas langsung berhenti dan lari balik ke mejanya.
  for (const k of keys) {
    const a = A[k];
    cancelAct(a);
    if (!atHome(a)) { a.say('Siap, balik kerja! 🏃', 900); a.walk(a.home, { run: true }); }
  }
  status(label);
  return true;
}
function release(keys) { keys.forEach((k) => { state.busy.delete(k); A[k].restUntil = performance.now() + 2500; }); if (!state.busy.size) status(idleStatus()); }


// ---------- KANTOR HIDUP: aktivitas acak saat tidak ada tugas ----------
// who: siapa yang boleh (daftar kunci, atau 'any' = siapa saja selain Gaby; Gaby ikut hanya saat santai)
// w: bobot saat jam kerja biasa, s: bobot saat waktu santai, n: jumlah pemain (2 = berdua)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const LINES = ['Udah makan? 🍛', 'Hehe 😆', 'Kopi lagi? ☕', 'Eh tau gak… 👀', 'Masa sih?! 😲', 'Wkwkwk 🤣', 'Semangat! 💪', 'Liburan ke mana? ✈️', 'Buku ini seru 📚', 'Gambar baru nih 🎨', 'Cuacanya cerah ☀️', 'Nanti main ping-pong? 🏓', 'Setuju! 👍', 'Hmm iya juga 🤔', 'Lucu banget 😂'];
const CORRIDOR = [[14.5, 9.25], [9.25, 14.5], [19.75, 14.5], [14.5, 19.75], [4, 9.25], [25, 9.25], [4, 19.75], [25, 19.75]];
const JUNCTIONS = [[8, 8], [18.5, 8], [8, 18.5], [18.5, 18.5]];
const WINDOWS = [{ x: 9.25, y: 0.9, view: 'back' }, { x: 19.75, y: 0.9, view: 'back' }, { x: 0.9, y: 9.25, view: 'back', face: -1 }, { x: 0.9, y: 19.75, view: 'back', face: -1 }];
function takeSpot(cands, a) { const s = cands.filter((c) => !TAKEN.has(c.id)); if (!s.length) return null; const c = pick(s); TAKEN.set(c.id, a); return c; }
const pt = (x, y, opt = {}) => ({ x, y, z: 0, ...opt });
async function go(a, t, ok, run = false) {
  if (!ok()) return false;
  const box = ownBox(a);
  if (box && !a.free && canFree(a) && inBox(a, box) && !inBox(t, box)) {
    if (!atHome(a)) { const r = await a.walk(a.home); if (!r || !ok()) return false; }
    await putDown(a);
    if (!ok()) return false;
  }
  const r = await a.walk(t, { run });
  return r && ok();
}
async function hold(ms, ok) { await wait(ms); return ok(); }
async function chat(a, b, ok, rounds = 3) {
  for (let i = 0; i < rounds; i++) {
    const s = i % 2 ? b : a;
    s.cls('talking'); s.say(pick(LINES), 1500);
    if (!await hold(1600, ok)) { s.cls('talking', false); return false; }
    s.cls('talking', false);
  }
  return true;
}
async function sipLoop(a, side, ok, n = 2) {
  for (let i = 0; i < n; i++) { a.pose(side); if (!await hold(1100, ok)) return false; a.pose(side, false); if (!await hold(900, ok)) return false; }
  return true;
}
const homeFirst = async (a, ok) => atHome(a) || go(a, a.home, ok);

const ACTS = [
  // ----- Gaby (di mejanya) -----
  { who: ['gaby'], w: 3, s: 1, run: async ([a], ok) => { a.holdL('mug'); a.say('☕ ahh~ enak', 1500); await sipLoop(a, 'sipL', ok, 2); } },
  { who: ['gaby'], w: 2, s: 1, run: async ([a], ok) => { a.pose('stretch'); a.say('🙆‍♀️ hmmh~', 1500); await hold(1700, ok); } },
  { who: ['gaby'], w: 3, s: 0.5, run: async ([a], ok) => { busy('gaby', true); a.pose('working'); a.say('📊 cek laporan tim…', 2400); await hold(2600, ok); busy('gaby', false); } },
  { who: ['gaby'], w: 2, s: 1, run: async ([a], ok) => { a.cls('talking'); a.say('🎶 la la la~', 2200); await notes(a, 4); a.cls('talking', false); } },
  { who: ['gaby'], w: 1.5, s: 1, run: async ([a], ok) => { a.say('Wiii~ 🌀', 1800); for (let i = 0; i < 8 && ok(); i++) { a.face *= -1; a.place(); await wait(170); } a.face = 1; a.place(); } },
  { who: ['gaby'], w: 2, s: 1, run: async ([a], ok) => {
    const b = pick(Object.values(A).filter((x) => x !== a));
    a.pose('waving'); a.say(`👋 Hai ${NAMES[b.key]}!`, 1400);
    await hold(700, ok);
    if (!b.act && !state.busy.has(b.key)) { b.say('👋 Hai Bos!', 1200); b.pose('waving'); setTimeout(() => b.pose('waving', false), 1200 / SPD); }
    await hold(900, ok);
  } },
  { who: ['gaby'], w: 1.5, s: 0.5, run: async ([a], ok) => { a.pose('reaching'); sparkle(ORB()); a.say('✨ bola hologramku', 1300); await hold(1300, ok); } },
  { who: ['gaby'], w: 2, s: 1, run: async ([a], ok) => { a.say(pick(['😊', '😎', '🤩', '💙', '🤔 hmm…', '🥱']), 1300); a.hop(); await hold(1400, ok); } },
  // ----- Meri -----
  { who: ['meri'], w: 3, s: 1, run: async ([a], ok) => {
    a.holdL('duster'); a.say('🧹 bersih-bersih laci', 1300);
    for (let i = 0; i < 3; i++) { const k = Math.floor(Math.random() * 18); if (!await go(a, drawerStand(k), ok)) return; drawer(k, 'glow'); a.pose('working'); await hold(1100, ok); a.pose('working', false); drawer(k, 'off'); }
    await go(a, a.home, ok);
  } },
  { who: ['meri'], w: 3, s: 1, run: async ([a], ok) => {
    const k = Math.floor(Math.random() * 18);
    if (!await go(a, drawerStand(k), ok)) return;
    drawer(k, 'open'); a.pose('reaching'); await hold(1100, ok); a.pose('reaching', false); drawer(k, 'off');
    a.say('🗂️ rapi!', 1100); await hold(600, ok); await go(a, a.home, ok);
  } },
  { who: ['meri'], w: 2, s: 1, run: async ([a], ok) => { if (!await go(a, spot('meri', 'jurnal'), ok)) return; a.holdL('diary'); a.say('📖 baca catatan kemarin', 2000); await hold(3000, ok); a.holdL(null); await go(a, a.home, ok); } },
  { who: ['meri'], w: 2, s: 1, run: async ([a], ok) => { if (!await go(a, spot('meri', 'jurnal'), ok)) return; a.holdL('mug'); a.say('🍵', 1000); await sipLoop(a, 'sipL', ok, 2); a.holdL(null); await go(a, a.home, ok); } },
  // ----- Rara -----
  { name: 'baca', who: ['rara'], w: 3, s: 1, run: async ([a], ok) => {
    if (LIVE && P.raraShelfBook.style.display !== 'none' && Math.random() < 0.55) {
      // ke rak dulu, pilih buku
      if (!await go(a, spot('rara', 'shelf'), ok)) return;
      a.pose('reaching'); a.say('📚 baca yang mana ya…', 1300); if (!await hold(1200, ok)) return; a.pose('reaching', false);
      borrow(a, P.raraShelfBook); a.holdL('book');
      if (!await go(a, a.home, ok)) return;
    } else {
      if (!await homeFirst(a, ok)) return;
      borrow(a, P.raraOpenBook); a.holdL('book'); // buku yang terbuka di kursi diangkat
    }
    a.say('📖 hmm, seru…', 2600); if (!await hold(3200, ok)) return;
    rise(a.headPt(), pick(['😮', '🤓', '💡']), 14, 1000); await hold(1600, ok);
  } },
  { who: ['rara'], w: 3, s: 1, run: async ([a], ok) => { if (!await homeFirst(a, ok)) return; a.say('🍵 teh melati', 1300); await sipLoop(a, 'sipR', ok, 2); } },
  { who: ['rara'], w: 0, s: 1.5, run: async ([a], ok) => { if (!await homeFirst(a, ok)) return; a.pose('sleeping'); await zzzOf(a, 3600); a.pose('sleeping', false); a.say('Eh, ketiduran 😳', 1200); await hold(1000, ok); } },
  { who: ['rara'], w: 2, s: 0.5, run: async ([a], ok) => {
    a.variant('kerja');
    if (!await go(a, RARA_KERJA, ok)) return;
    busy('rara', true); a.pose('working'); a.say('🌍 cek berita dunia', 2000); await hold(2400, ok); busy('rara', false); a.pose('working', false);
    await go(a, a.home, ok); a.variant('santai');
  } },
  // ----- Pandu -----
  { who: ['pandu'], w: 2, s: 1, run: async ([a], ok) => { a.pose('working'); a.say('🧭 utara di sana!', 1500); await hold(1600, ok); } },
  { who: ['pandu'], w: 3, s: 1, run: async ([a], ok) => {
    if (!await go(a, spot('pandu', 'board'), ok)) return;
    a.pose('reaching'); await hold(700, ok); rise(BOARD(), '📍', 16, 1500); a.say('📍 rute baru!', 1100); await hold(800, ok); a.pose('reaching', false);
    await go(a, a.home, ok);
  } },
  { who: ['pandu'], w: 2, s: 1, run: async ([a], ok) => { if (!await go(a, spot('pandu', 'pace'), ok)) return; a.say('🤔 lewat mana ya…', 1200); await hold(1300, ok); await go(a, a.home, ok); } },
  { who: ['pandu'], w: 2, s: 1, run: async ([a], ok) => { if (!await go(a, spot('pandu', 'pack'), ok)) return; a.pose('working'); a.say('🎒 cek bekal', 1300); await hold(1500, ok); a.pose('working', false); await go(a, a.home, ok); } },
  // ----- Vera -----
  { who: ['vera'], w: 3, s: 1, run: async ([a], ok) => { a.pose('working'); a.say('✨🔍 lap kaca pembesar', 1600); await hold(1800, ok); } },
  { who: ['vera'], w: 3, s: 1, run: async ([a], ok) => { a.holdL('news'); a.say('📰 berita pagi', 2400); await hold(3200, ok); } },
  { who: ['vera'], w: 2, s: 0.5, run: async ([a], ok) => { a.pose('stamping'); await hold(500, ok); rise(VERA_PAPER(), '✅', 20); a.say('DOK! 😤', 900); await hold(800, ok); } },
  { who: ['vera'], w: 1.5, s: 1, run: async ([a], ok) => { if (!await go(a, spot('vera', 'rack'), ok)) return; a.say('🕵️‍♀️ topinya miring', 1200); a.pose('reaching'); await hold(1200, ok); a.pose('reaching', false); await go(a, a.home, ok); } },
  // ----- Lukas -----
  { name: 'lukis', who: ['lukas'], w: 4, s: 1, run: async ([a], ok) => {
    // ambil kuas dari toples dulu (warna kuas = warna cat yang dipakai), kembalikan sesudahnya
    let dot = ['🔴', '🟡', '🔵', '🟣'];
    if (LIVE) {
      const i = [0, 1, 2].filter((k) => P.brushes[k].style.display !== 'none').sort(() => Math.random() - 0.5)[0];
      if (i != null) {
        if (!await go(a, spot('lukas', 'jars'), ok)) return;
        a.pose('reaching'); if (!await hold(600, ok)) return; a.pose('reaching', false);
        borrow(a, P.brushes[i]); a.holdL(`brush${i}`); a.say(['🔴 merah dulu', '🔵 biru dulu', '🟢 hijau dulu'][i], 1200);
        dot = [['🔴', '🟠'], ['🔵', '🟣'], ['🟢', '🟡']][i];
      }
    }
    if (!await go(a, spot('lukas', 'paint'), ok)) return;
    a.pose('painting'); a.say('🎨', 1000);
    for (let i = 0; i < 5 && ok(); i++) { const [x, y] = CANVAS(); rise([x + rnd(-20, 20), y + rnd(-14, 10)], pick(dot), 8, 900); await wait(600); }
    a.pose('painting', false);
    if (LIVE && a.loans && a.loans.length) { if (!await go(a, spot('lukas', 'jars'), ok)) return; rise(G(R.lukas.off[0] + 6.25, R.lukas.off[1] + 6.15, 1.6), '🫧', 11, 900); await hold(700, ok); giveBack(a); a.holdL(null); }
    await go(a, a.home, ok);
  } },
  { who: ['lukas'], w: 2, s: 1, run: async ([a], ok) => { if (!await go(a, spot('lukas', 'admire'), ok)) return; a.say('🤔…', 1200); await hold(1300, ok); a.say('😍 mahakarya!', 1200); a.hop(); await hold(1200, ok); await go(a, a.home, ok); } },
  { who: ['lukas'], w: 2, s: 1, run: async ([a], ok) => { a.holdL('sketch'); a.pose('working'); a.say('✏️ sketsa', 1500); await hold(2200, ok); } },
  { name: 'kuas', who: ['lukas'], w: 1.5, s: 0.5, run: async ([a], ok) => {
    if (!await go(a, spot('lukas', 'jars'), ok)) return;
    const i = LIVE ? [0, 1, 2].find((k) => P.brushes[k].style.display !== 'none') : null;
    if (i != null) { borrow(a, P.brushes[i]); a.holdL(`brush${i}`); }
    a.pose('working'); a.say('🧼 cuci kuas', 1400);
    for (let k = 0; k < 3; k++) { rise(G(R.lukas.off[0] + 6.25, R.lukas.off[1] + 6.15, 1.6), '🫧', 11, 900); if (!await hold(550, ok)) return; }
    a.pose('working', false); giveBack(a); a.holdL(null);
    await go(a, a.home, ok);
  } },
  // ----- siapa saja: pantry -----
  { name: 'kopi', who: 'any', w: 1, s: 3, run: async ([a], ok) => {
    const c = takeSpot([spot('pantry', 'coffee')], a); if (!c) return;
    if (!await go(a, c, ok)) return;
    a.pose('working'); a.say('☕ bikin kopi', 1200);
    if (LIVE) { rise(ptOf(P.machMug, -16), '☕', 11, 900); if (!await hold(500, ok)) return; rise(ptOf(P.machMug, -16), '♨️', 13, 900); }
    if (!await hold(LIVE ? 800 : 1300, ok)) return; a.pose('working', false);
    rise(G(c.x - 0.6, c.y - 0.6, 2.4), '♨️', 16); borrow(a, P.machMug); a.holdL('mug'); TAKEN.delete(c.id);
    const seat = state.santai ? takeSpot(['s1', 's2', 's3', 's4'].map((k) => spot('pantry', k)), a) : null;
    if (seat) { if (!await go(a, seat, ok)) return; await sipLoop(a, 'sipL', ok, 3); }
    else { if (!await go(a, a.home, ok)) return; await sipLoop(a, 'sipL', ok, 2); }
  } },
  { name: 'mie', who: 'any', w: 0, s: 2, run: async ([a], ok) => {
    const c = takeSpot([spot('pantry', 'micro')], a); if (!c) return;
    if (!await go(a, c, ok)) return;
    a.say('⏳ panasin mie', 1500);
    if (LIVE) { // layar microwave menyala berkedip selama memanaskan
      showP(P.microLight, true);
      for (let i = 0; i < 6; i++) { P.microLight.style.opacity = i % 2 ? '1' : '.75'; P.microBowl.setAttribute('transform', `translate(${(i % 2 ? 4 : -4)} 0)`); if (!await hold(330, ok)) { showP(P.microLight, false); return; } }
      showP(P.microLight, false);
    } else await hold(1700, ok);
    rise(G(c.x, c.y - 0.6, 2.6), '🔔', 18); a.say('Ting! 😋', 900); a.holdL('bowl'); TAKEN.delete(c.id);
    const seat = takeSpot(['s1', 's2', 's3', 's4'].map((k) => spot('pantry', k)), a);
    if (seat && await go(a, seat, ok)) { a.say('😋 nyam nyam', 1600); await hold(2400, ok); }
  } },
  { name: 'air', who: 'any', w: 1, s: 1, run: async ([a], ok) => {
    const c = takeSpot([spot('pantry', 'water')], a); if (!c) return; if (!await go(a, c, ok)) return;
    if (LIVE) { a.pose('reaching'); for (let i = 0; i < 3; i++) { rise(G(R.pantry.off[0] + 10.8, R.pantry.off[1] + 0.7, 2.1), '🫧', 10, 800); if (!await hold(280, ok)) return; } a.pose('reaching', false); }
    a.holdL('glass'); a.say('💧 minum dulu', 1200); await sipLoop(a, 'sipL', ok, 2);
  } },
  { name: 'jus', who: 'any', w: 0.5, s: 1.5, run: async ([a], ok) => {
    const c = takeSpot([spot('pantry', 'fridge')], a); if (!c) return; if (!await go(a, c, ok)) return;
    showP(P.fridgeOpen, true); showP(P.fridgeDoor, true); // pintu kulkas terbuka, dalamnya terang
    if (LIVE) rise(G(R.pantry.off[0] + 1.6, R.pantry.off[1] + 6.1, 2.6), '❄️', 13, 1100);
    a.pose('reaching'); a.say('🧃 ada jus!', 1200); const fine = await hold(1200, ok);
    a.pose('reaching', false); showP(P.fridgeOpen, false); showP(P.fridgeDoor, false); if (!fine) return;
    a.holdL('juice'); await sipLoop(a, 'sipL', ok, 1);
  } },
  { name: 'teh', who: 'any', w: 0.6, s: 1.5, run: async ([a], ok) => {
    const seat = takeSpot(['s1', 's2', 's3'].map((k) => spot('pantry', k)), a); if (!seat) return;
    if (!await go(a, seat, ok)) return;
    const mug = LIVE ? [P.mugA, P.mugB].find((m) => m.style.display !== 'none') : null;
    a.say('🫖 ngeteh dulu~', 1300);
    await pourTea(mug); if (!ok()) return;
    if (mug) borrow(a, mug);
    a.holdL('mug'); await sipLoop(a, 'sipL', ok, 3);
  } },
  { name: 'pisang', who: 'any', w: 0.5, s: 1.2, run: async ([a], ok) => {
    const seat = takeSpot(['s1', 's2', 's3'].map((k) => spot('pantry', k)), a); if (!seat) return;
    if (!await go(a, seat, ok)) return;
    if (!takeFritter()) { a.say('Yah, pisangnya habis 😢', 1500); await hold(1500, ok); return; }
    a.pose('reaching'); a.say('🍌 pisang goreng!', 1200); if (!await hold(700, ok)) return; a.pose('reaching', false);
    for (let i = 0; i < 3; i++) { a.pose('sipL'); if (!await hold(600, ok)) return; a.pose('sipL', false); rise(a.headPt(), '😋', 13, 800); if (!await hold(500, ok)) return; }
  } },
  // ----- siapa saja: ruang game -----
  { name: 'arcade', who: 'any', w: 0, s: 3, run: async ([a], ok) => {
    const c = takeSpot([spot('game', 'arcade')], a); if (!c) return;
    if (!await go(a, c, ok)) return;
    a.pose('working'); a.cls('rush');
    for (const t of ['👾 ayo!', 'COMBO! 💥', 'yesss! 🙌']) {
      a.say(t, 1200);
      if (!LIVE) { if (!await hold(1400, ok)) return; continue; }
      for (let i = 0; i < 4; i++) { showP(P.arcadeFlash, i % 2 === 0); P.arcadeFlash.style.opacity = '.55'; if (!await hold(350, ok)) { showP(P.arcadeFlash, false); return; } }
    }
    showP(P.arcadeFlash, false);
  } },
  { who: 'any', w: 0, s: 2, run: async ([a], ok) => { const c = takeSpot([spot('game', 'bean1'), spot('game', 'bean2')], a); if (!c) return; if (!await go(a, c, ok)) return; a.pose('sleeping'); await zzzOf(a, 4200); } },
  { name: 'konsol', who: 'any', w: 0, s: 2, run: async ([a], ok) => {
    const c = takeSpot([spot('game', 'sofa1'), spot('game', 'sofa2')], a); if (!c) return; if (!await go(a, c, ok)) return;
    borrow(a, P.pad); a.holdL('pad'); a.pose('working'); a.say('🎮 main game', 1500); // joystick diambil dari lantai
    if (!LIVE) { await hold(4200, ok); return; }
    // tokoh kecil di layar TV berlari & melompat selama dimainkan
    const [x0, y0] = P.tvHero.home; showP(P.tvHero, true);
    for (let i = 0; i < 12 && ok(); i++) {
      const k = i % 6, jump = i % 3 === 2;
      await anim(330, (t) => setT(P.tvHero, x0 + (k + t) * 9, y0 + (k + t) * 5.2 - (jump ? Math.sin(t * Math.PI) * 9 : 0)));
      if (i === 5) rise([x0 + 30, y0 + 4], '⭐', 11, 700);
    }
    homeP(P.tvHero); showP(P.tvHero, false);
    if (ok()) { a.say(pick(['Menang! 🏆', 'Kalah 😭', 'Lagi ah 🎮']), 1200); await hold(1200, ok); }
  } },
  { who: 'any', w: 0, s: 2, run: async ([a], ok) => { const c = takeSpot([spot('game', 'dance')], a); if (!c) return; if (!await go(a, c, ok)) return; a.pose('dance'); a.say('💃 joget dulu~', 1400); await notes(a, 5); await hold(800, ok); } },
  // ----- siapa saja: lorong -----
  { who: 'any', w: 0.6, s: 1, run: async ([a], ok) => {
    a.holdL('can'); a.say('🌱 siram tanaman', 1300);
    for (const [x, y] of [pick(JUNCTIONS), pick(JUNCTIONS)]) { if (!await go(a, pt(x + 0.6, y + 1.5, { face: -1 }), ok)) return; a.pose('working'); rise(G(x + 0.6, y + 0.6, 1.4), '💧', 14); await hold(1000, ok); a.pose('working', false); }
  } },
  { who: 'any', w: 0, s: 1.5, run: async ([a], ok) => { a.say('🏃 olahraga dulu!', 1300); for (let i = 0; i < 4; i++) { const [x, y] = pick(CORRIDOR); if (!await go(a, pt(x, y), ok, true)) return; } a.say('Fiuh 😅', 1000); } },
  { who: 'any', w: 0.6, s: 1, run: async ([a], ok) => { const w = pick(WINDOWS); if (!await go(a, pt(w.x, w.y, { view: 'back', face: w.face }), ok)) return; a.say('🌤️ cerah ya', 1400); await hold(2200, ok); } },
  // ----- berdua -----
  { name: 'ngobrol', who: 'any', n: 2, w: 0, s: 4, run: async ([a, b], ok) => {
    const seats = ['s1', 's2', 's3'].map((k) => spot('pantry', k));
    const sa = takeSpot(seats, a), sb = takeSpot(seats, b); if (!sa || !sb) return;
    const [ra, rb] = await Promise.all([go(a, sa, ok), go(b, sb, ok)]); if (!ra || !rb) return;
    if (LIVE) { // teh dituang ke 2 mug di meja, lalu mugnya diambil
      a.say('Aku tuangin teh ya 🫖', 1300);
      for (const m of [P.mugA, P.mugB]) { if (m.style.display === 'none') continue; await pourTea(m); if (!ok()) return; }
      borrow(a, P.mugA); borrow(b, P.mugB);
    }
    a.holdL('mug'); b.holdL(LIVE ? 'mug' : 'glass');
    await chat(a, b, ok, 5);
  } },
  { name: 'pingpong', who: 'any', n: 2, w: 0, s: 3, run: async ([a, b], ok) => {
    const pa = takeSpot([spot('game', 'pongA')], a), pb = takeSpot([spot('game', 'pongB')], b); if (!pa || !pb) return;
    const [ra, rb] = await Promise.all([go(a, pa, ok), go(b, pb, ok)]); if (!ra || !rb) return;
    borrow(a, P.padR); borrow(b, P.padB); // bet diambil dari meja
    a.holdL('paddle'); b.holdL('paddle');
    // bola meja dipakai (dipindah ke depan selama main, kembali ke meja sesudahnya)
    const ball = LIVE ? P.ball : el('g', {}, '<circle r="3.2" fill="#fff" stroke="#94a3b8" stroke-width=".6"/>');
    R.game.overG.append(ball);
    const s = G(a.x + 0.5, a.y, 1.3), e = G(b.x - 0.5, b.y, 1.3);
    for (let i = 0; i < 7 && ok(); i++) {
      const [p, q] = i % 2 ? [e, s] : [s, e];
      (i % 2 ? b : a).hop();
      await anim(620, (t) => ball.setAttribute('transform', `translate(${p[0] + (q[0] - p[0]) * t} ${p[1] + (q[1] - p[1]) * t - Math.sin(t * Math.PI) * 26})`));
    }
    if (LIVE) homeP(ball); else ball.remove();
    if (ok()) { const win = pick([a, b]); win.say('Menang! 🏆', 1300); win.hop(); await hold(1200, ok); }
  } },
  { who: 'any', n: 2, w: 0.6, s: 2.5, run: async ([a, b], ok) => {
    const [x, y] = pick(CORRIDOR);
    const along = Math.abs(y - 9.25) < 0.1 || Math.abs(y - 19.75) < 0.1;
    const pa = pt(x - (along ? 0.55 : 0), y - (along ? 0 : 0.55)), pb = pt(x + (along ? 0.55 : 0), y + (along ? 0 : 0.55));
    const [ra, rb] = await Promise.all([go(a, pa, ok), go(b, pb, ok)]); if (!ra || !rb) return;
    a.lookAt(b); b.lookAt(a);
    await chat(a, b, ok, 4);
  } },
  { who: 'any', n: 2, w: 0.8, s: 1.5, partnerHome: true, run: async ([a, b], ok) => {
    if (!NAV[b.key].spots || !NAV[b.key].spots.visit) return;
    if (!await go(a, spot(b.key, 'visit'), ok)) return;
    a.lookAt(b);
    await chat(a, b, ok, 3);
    if (ok()) await go(a, a.home, ok);
  } },
  { who: 'any', n: 2, w: 0.3, s: 1.5, run: async ([a, b], ok) => {
    const [x, y] = pick(CORRIDOR);
    const [ra, rb] = await Promise.all([go(a, pt(x - 0.5, y), ok), go(b, pt(x + 0.5, y), ok)]); if (!ra || !rb) return;
    a.lookAt(b); b.lookAt(a); a.pose('waving'); b.pose('waving'); a.hop(); b.hop();
    rise(G(x, y, 3.6), '🙌', 22); a.say('Tos! 🙌', 1100); await hold(1200, ok);
  } },
];

function isFree(a) { return !state.busy.has(a.key) && !a.act && !a.path; }
async function runAct(def, actors) {
  const tok = {};
  actors.forEach((a) => { a.act = tok; a.actDef = def; });
  const ok = () => actors.every((a) => a.act === tok) && !state.tidur;
  try { await def.run(actors, ok); } catch (e) { console.warn('[aktivitas]', e); }
  for (const a of actors) {
    if (a.act !== tok) continue;
    cancelAct(a);
    a.restUntil = performance.now() + rnd(1200, 3500) / SPD;
    // jam kerja: balik ke meja; waktu santai: boleh tetap di tempat (aktivitas berikutnya mulai dari sana)
    if (!state.santai && !atHome(a) && !state.busy.has(a.key)) a.walk(a.home);
    if (a.key === 'rara' && !state.busy.has('rara')) a.variant('santai');
  }
}
function startRandom(a) {
  const free = Object.values(A).filter((x) => x !== a && isFree(x) && performance.now() > x.restUntil);
  const allowed = (def, who) => def.who === 'any' ? (who.key !== 'gaby' || state.santai) : def.who.includes(who.key);
  const cands = ACTS.filter((d) => allowed(d, a) && (state.santai ? d.s ?? d.w : d.w) > 0 && (!d.n || d.n === 1 || free.some((b) => allowed(d, b) && (!d.partnerHome || atHome(b)))));
  if (!cands.length) return;
  let r = Math.random() * cands.reduce((s, d) => s + (state.santai ? d.s ?? d.w : d.w), 0);
  const def = cands.find((d) => (r -= (state.santai ? d.s ?? d.w : d.w)) <= 0) || cands[0];
  const actors = [a];
  if (def.n === 2) actors.push(pick(free.filter((b) => allowed(def, b) && (!def.partnerHome || atHome(b)))));
  runAct(def, actors);
}
// MODE HEMAT (iPhone/Safari, atau HP yang tadi "tumbang" saat Ruang Kerja terbuka — lihat app.js):
// kantor dicetak resolusi lebih rendah, gerakan tangan/kaki sederhana, lebih sedikit teman beraktivitas bersamaan.
const LITE = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(navigator.userAgent))
  || (() => { try { return localStorage.getItem('gaby.officeLite') === '1'; } catch { return false; } })();
if (LITE) document.getElementById('office').classList.add('lite');
setInterval(() => {
  if (!running || state.tidur) return;
  const busyNow = Object.values(A).filter((a) => a.act || a.path).length;
  for (const a of Object.values(A)) {
    if (!isFree(a) || performance.now() < a.restUntil) continue;
    if (LITE && busyNow >= 3) break; // hemat: paling banyak 3 teman beraktivitas bersamaan
    if (Math.random() < (state.santai ? 0.4 : 0.25) * (LITE ? 0.6 : 1)) startRandom(a);
  }
}, 600);

// Mode kantor mengikuti mic Gaby: mic OFF = WAKTU BEBAS, mic ON = STANDBY
// (yang jauh kembali ke ruangannya; masih boleh jalan-jalan & aktivitas ringan, bobot `w`).
function setBebas(on) {
  if (state.santai === on) return;
  state.santai = on;
  for (const a of Object.values(A)) {
    if (state.busy.has(a.key)) continue;
    if (on) { if (!a.act) a.restUntil = performance.now() + rnd(0, 1500); continue; }
    if (a.act && inBox(a, ownBox(a)) && a.actDef && a.actDef.w > 0) continue; // aktivitas ringan di ruangannya: lanjut
    cancelAct(a);
    if (!atHome(a)) { a.say('Standby! 👍', 900); a.walk(a.home); }
  }
  if (!state.busy.size) status(idleStatus());
}


// ---------- kamera ----------
// Kantor DICETAK SEKALI pada ukuran zoom saat ini; menggeser = memindahkan "lembaran" itu (CSS transform,
// dikerjakan GPU) — tidak menggambar ulang ±3.000 elemen (dulu viewBox diubah tiap gambar → lag & berkedip di HP).
// Cetakan baru dibuat sekali setelah zoom selesai; selama zoom berjalan lembaran hanya diperbesar/diperkecil.
const officeEl = document.getElementById('office');
let cam = { ...FULL }, camT = { ...FULL }, follow = null, manualUntil = 0;
const VW = () => Math.max(1, officeEl.clientWidth);
const VH = () => Math.max(1, officeEl.clientHeight);
function aspect() { return VH() / VW(); }
const MAXPX = LITE ? 2048 : 4096; // batas sisi cetakan (piksel asli layar) supaya memori aman, terutama di iPhone
const PRINT_RES = LITE ? 0.6 : 1; // mode hemat: dicetak lebih kecil lalu diperbesar (memori gambar ±1/3)
const printTarget = () => (VW() / cam.w) * PRINT_RES;
const minW = () => Math.max(300, (FULL.w * VW() * (window.devicePixelRatio || 1) * PRINT_RES) / MAXPX);
function fitFull() { const ar = aspect(); const w = Math.max(FULL.w, FULL.h / ar); return { x: (FULL.w - w) / 2, y: (FULL.h - w * ar) / 2, w, h: w * ar }; }
function zoomTo(w, cx, cy) { w = Math.max(minW(), w); const ar = aspect(); camT = { x: cx - w / 2, y: cy - w * ar / 2, w, h: w * ar }; }
function focus(a) { follow = a; manualUntil = 0; }
let printS = 0; // skala cetakan saat ini (piksel per satuan kantor)
function applyCam() {
  const sc = VW() / cam.w;
  const settled = Math.abs(camT.w - cam.w) < 0.4;
  const target = printTarget();
  if (!printS || (settled && Math.abs(target - printS) / printS > 0.002)) {
    printS = target;
    svg.style.width = `${(FULL.w * printS).toFixed(1)}px`;
    svg.style.height = `${(FULL.h * printS).toFixed(1)}px`;
  }
  svg.style.transform = `translate3d(${(-cam.x * sc).toFixed(1)}px, ${(-cam.y * sc).toFixed(1)}px, 0) scale(${(sc / printS).toFixed(4)})`;
}
let camLast = '';
function camStep() {
  if (follow && performance.now() > manualUntil && camT.w < fitFull().w * 0.95) {
    // Zona tenang: kamera baru bergeser kalau yang diikuti mendekati tepi layar.
    const [x, y] = G(follow.x, follow.y, follow.z);
    const cx = camT.x + camT.w / 2, cy = camT.y + camT.h / 2;
    if (Math.abs(x - cx) > camT.w * 0.22 || Math.abs(y - HEAD * 0.6 - cy) > camT.h * 0.22) zoomTo(camT.w, x, y - HEAD * 0.6);
  }
  for (const k of ['x', 'y', 'w', 'h']) {
    const d = camT[k] - cam[k];
    if (Math.abs(d) < 0.4) cam[k] = camT[k]; else cam[k] += d * 0.12;
  }
  const key = `${cam.x.toFixed(1)},${cam.y.toFixed(1)},${cam.w.toFixed(1)}`;
  if (key !== camLast || (printS && Math.abs(printTarget() - printS) / printS > 0.002)) { camLast = key; applyCam(); }
}
const toScreen = (x, y) => { const r = officeEl.getBoundingClientRect(), sc = VW() / cam.w; return { x: r.left + (x - cam.x) * sc, y: r.top + (y - cam.y) * sc }; };
const center = () => [camT.x + camT.w / 2, camT.y + camT.h / 2];
$('zin').onclick = () => zoomTo(camT.w * 0.75, ...center());
$('zout').onclick = () => zoomTo(Math.min(fitFull().w, camT.w / 0.75), ...center());
$('zall').onclick = () => { camT = fitFull(); };
{
  let drag = null;
  svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: camT.x, cy: camT.y }; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = cam.w / VW();
    camT.x = drag.cx - (e.clientX - drag.x) * k; camT.y = drag.cy - (e.clientY - drag.y) * k;
    cam.x = camT.x; cam.y = camT.y; // langsung ikut jari (tanpa jeda)
    manualUntil = performance.now() + 6000;
  });
  window.addEventListener('pointerup', () => { drag = null; });
}
window.addEventListener('resize', () => { printS = 0; zoomTo(Math.min(camT.w, fitFull().w), ...center()); }); // HP lipat dibuka/ditutup
// tombol pintas ruangan
for (const b of document.querySelectorAll('#office [data-room]')) {
  b.onclick = () => {
    const k = b.dataset.room;
    const actor = A[k];
    if (actor) { focus(actor); zoomTo(Math.min(camT.w, VW() < 900 ? 520 : 760), ...G(actor.x, actor.y, 2)); return; }
    const it = R[k];
    follow = null; manualUntil = performance.now() + 8000;
    zoomTo(Math.min(camT.w, VW() < 900 ? 560 : 800), ...G(it.off[0] + it.size[0] / 2, it.off[1] + it.size[1] / 2, 1.5));
  };
}

// ---------- loop utama + FPS ----------
let last = performance.now(), frames = 0, fpsT = last, lowFps = 0;
// Layar penuh lain (galeri, ingatan, pengaturan) menutupi kantor: kantor berhenti digambar
// supaya memori & tenaga HP dipakai layar itu (iPhone sempat menutup paksa halaman saat galeri dibuka dari kanvas Lukas).
const OVERLAYS = ['memories', 'viewer', 'settings', 'gate'].map((id) => document.getElementById(id)).filter(Boolean);
function tick(now) {
  if (!running) return; // Ruang Kerja ditutup: berhenti total (hemat baterai)
  const covered = OVERLAYS.some((o) => !o.hidden);
  if (officeEl.classList.contains('paused') !== covered) officeEl.classList.toggle('paused', covered);
  if (covered) { last = now; requestAnimationFrame(tick); return; }
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
  if (now - fpsT >= 1000) {
    const fps = Math.round(frames * 1000 / (now - fpsT));
    if (SHOW_FPS) $('fps').textContent = `${fps} FPS`; // angka FPS hanya untuk pengujian (?fps di alamat)
    frames = 0; fpsT = now;
    // HP kurang kuat: kalau beberapa detik di bawah 40 FPS, mode ringan menyala sendiri
    lowFps = fps < 40 ? lowFps + 1 : 0;
  }
  requestAnimationFrame(tick);
}


// ---------- mode ringan: gambar diam dijadikan foto sekali, hanya yang bergerak digambar ulang ----------
let lightOn = false;
const UA = navigator.userAgent;
const IS_WEBKIT_SAFARI = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || (/Safari/.test(UA) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(UA));
const SHOW_FPS = /[?&]fps\b/.test(location.search);
if (SHOW_FPS) $('fps').hidden = false;
async function setLight(on) {
  lightOn = on;
  for (const g of svg.querySelectorAll('g.static')) {
    if (on) {
      if (g.querySelector('.globe, .holo-lines')) continue;
      if (!g._img) {
        const bb = g.getBBox();
        if (bb.width < 1 || bb.height < 1) continue;
        const sc = 1.25; // resolusi foto (lebih kecil = hemat memori)
        const src = `<svg xmlns="${NS}" width="${Math.ceil(bb.width * sc)}" height="${Math.ceil(bb.height * sc)}" viewBox="${bb.x} ${bb.y} ${bb.width} ${bb.height}">${g.innerHTML}</svg>`;
        g._img = el('image', { href: URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })), x: bb.x, y: bb.y, width: bb.width, height: bb.height });
      }
      g.after(g._img);
      g.style.display = 'none';
    } else if (g._img) { g._img.remove(); g.style.display = ''; }
  }
}


// =====================================================================================
// PENGATUR ADEGAN: kejadian asli dari aplikasi (lewat officebus.js) → animasi di kantor
// =====================================================================================
const sleepMs = (ms) => new Promise((ok) => setTimeout(ok, ms));
const tail = (t, n) => (t.length > n ? `…${t.slice(-n)}` : t);
const CAT_KEYS = Object.keys(CATEGORIES);
const catIndex = (k) => { const i = CAT_KEYS.indexOf(k); return i >= 0 ? i : CAT_KEYS.length - 1; };
const MIC_ON = new Set(['connecting', 'listening', 'thinking', 'speaking']);
let running = false; // Ruang Kerja sedang dibuka?
let api = {};

function claimQuiet(keys) {
  if (keys.some((k) => state.busy.has(k))) return false;
  keys.forEach((k) => state.busy.add(k));
  for (const k of keys) { const a = A[k]; cancelAct(a); if (!atHome(a)) a.walk(a.home, { run: true }); }
  return true;
}
function releaseQuiet(keys) { keys.forEach((k) => { state.busy.delete(k); A[k].restUntil = performance.now() + 2500; }); if (!state.busy.size) status(idleStatus()); }

// ---------- mic Gaby: ON = standby (Gaby di meja pegang mic), OFF = waktu bebas ----------
let micSeq = 0;
async function micChanged(on, instant = false) {
  const seq = ++micSeq;
  state.ptt = on;
  const g = A.gaby;
  if (on) {
    setBebas(false);
    state.busy.add('gaby');
    cancelAct(g);
    if (!atHome(g)) {
      if (instant) { Object.assign(g, { x: g.home.x, y: g.home.y, z: g.home.z || 0, path: null, seated: !!g.home.seat }); g.place(); }
      else { g.say('Datang! 🏃‍♀️', 900); await g.walk(g.home, { run: true }); }
    }
    if (seq !== micSeq) return;
    if (!instant) { g.pose('reaching'); await wait(300); g.pose('reaching', false); }
    gabyMic(true);
    status(idleStatus());
    applyGabyLook();
  } else {
    g.cls('listening', false); g.cls('talking', false); g.pose('working', false); busy('gaby', false);
    if (instant) { gabyMic(false); state.busy.delete('gaby'); setBebas(true); return; }
    await arrive(g);
    g.pose('reaching'); await wait(300); g.pose('reaching', false);
    if (seq !== micSeq) return;
    gabyMic(false);
    g.pose('ngulet'); g.say('Ahh~ waktu bebas! 🙆‍♀️', 1800);
    await wait(1900);
    g.pose('ngulet', false);
    if (seq !== micSeq) return;
    state.busy.delete('gaby');
    g.restUntil = performance.now() + 800;
    setBebas(true);
  }
}
let gabyLook = 'sleep';
function applyGabyLook() {
  const g = A.gaby, s = gabyLook, here = state.ptt && atHome(g);
  g.cls('listening', here && s === 'listening');
  g.cls('talking', here && s === 'speaking');
  g.pose('working', here && s === 'thinking');
  busy('gaby', here && s === 'thinking');
}
function onGabyState(s, instant = false) {
  gabyLook = s;
  const on = MIC_ON.has(s);
  if (on !== state.ptt) micChanged(on, instant);
  else applyGabyLook();
}

// ---------- ucapan: gelembung di atas Gaby & "Kamu: …" di dekat layar PUSH TO TALK ----------
let gabyTxt = '', gabyTimer = 0, userTxt = '', userTimer = 0;
const userBub = el('g', { class: 'userbub' });
uiG.append(userBub);
function showUser(text) {
  const [x, y] = G(R.gaby.off[0] + 4.1, R.gaby.off[1] + 1.8, 6.4);
  measureEl.textContent = text;
  const w = Math.max(40, measureEl.getComputedTextLength() + 24);
  userBub.innerHTML = text ? `<g transform="translate(${x} ${y})"><g class="pop"><rect x="${-w / 2}" y="-26" width="${w}" height="26" rx="13" fill="#0f2747" stroke="#7dd3fc" stroke-width="1.5"/><text y="-8" text-anchor="middle" font-size="13" font-weight="700" font-family="system-ui" fill="#e0f2fe">${esc(text)}</text></g></g>` : '';
}
function onSay({ who, text, end }) {
  if (who === 'gaby') {
    clearTimeout(gabyTimer);
    if (end) { gabyTimer = setTimeout(() => { gabyTxt = ''; A.gaby.say(''); }, 2500); return; }
    gabyTxt = (gabyTxt + text).replace(/\s+/g, ' ').trimStart().slice(-400);
    A.gaby.say(tail(gabyTxt, 44));
    gabyTimer = setTimeout(() => { gabyTxt = ''; A.gaby.say(''); }, 7000);
  } else {
    clearTimeout(userTimer);
    userTxt = (userTxt + text).replace(/\s+/g, ' ').trimStart().slice(-300);
    showUser(`Kamu: ${tail(userTxt, 38)}`);
    userTimer = setTimeout(() => { userTxt = ''; showUser(''); }, 3500);
  }
}

// ---------- alat Gaby ----------
async function gabyTyping() {
  const g = A.gaby;
  if (!state.ptt || !atHome(g) || gabyLook === 'thinking') return;
  busy('gaby', true); g.pose('working');
  await wait(1200);
  if (gabyLook !== 'thinking') { busy('gaby', false); g.pose('working', false); }
}
function onTool({ name, args }) {
  if (name === 'ingat') { flowIngat(catIndex(args.kategori || guessCats(String(args.fakta || ''))[0])); return; }
  if (['buka_ingatan', 'cari_info', 'buat_rencana', 'gambar', 'buat_gambar'].includes(name)) return; // ditangani hasil / papan kerja
  gabyTyping();
}
function onToolDone({ name, args, result }) {
  if (name !== 'buka_ingatan' || !result || result.kosong) return;
  const k = Object.keys(result.laci || {})[0] || guessCats(String(args.topik || ''))[0];
  flowButuh(catIndex(k));
}

// Meri menyimpan ingatan baru dari Gaby.
async function flowIngat(k) {
  if (!claimQuiet(['meri'])) { drawer(k, 'glow'); sparkle(drawerPt(k)); setTimeout(() => drawer(k, 'off'), 1200); return; }
  const go = A.meri.walk(drawerStand(k));
  if (state.ptt) {
    pop(GABY_SCREEN(), `<rect x="-20" y="-14" width="40" height="28" rx="5" fill="rgba(14,165,233,.85)" stroke="#e0f2fe"/><text y="6" text-anchor="middle" font-size="16">${Object.values(CATEGORIES)[k].split(' ')[0]}</text>`, 700);
    await wait(500);
    await fly(GABY_SCREEN(), drawerPt(k), 'plane', 1300);
  }
  await go;
  A.meri.say('📥 Dapat!', 900);
  drawer(k, 'open'); A.meri.pose('reaching');
  await wait(900);
  A.meri.pose('reaching', false);
  drawer(k, 'glow'); sparkle(drawerPt(k));
  A.meri.say(`Masuk laci ${Object.values(CATEGORIES)[k].split(' ')[0]} ✨`, 1100);
  await wait(800);
  drawer(k, 'off');
  await A.meri.walk(A.meri.home);
  releaseQuiet(['meri']);
}
// Gaby butuh ingatan: Meri mengambil map dari laci dan mengirimnya ke layar Gaby.
async function flowButuh(k) {
  if (!claimQuiet(['meri'])) { drawer(k, 'glow'); setTimeout(() => drawer(k, 'off'), 1200); return; }
  await fly(GABY_SCREEN(), A.meri.headPt(), 'signal', 600);
  A.meri.say('❗', 600); A.meri.hop();
  drawer(k, 'glow');
  await A.meri.walk(drawerStand(k), { run: true });
  drawer(k, 'open'); A.meri.pose('reaching');
  await wait(600);
  A.meri.pose('reaching', false); drawer(k, 'off');
  A.meri.carry('folder'); A.meri.say('Ini dia! 📂', 900);
  await wait(400);
  A.meri.carry(null);
  const back = A.meri.walk(A.meri.home);
  await fly(A.meri.handPt(), GABY_SCREEN(), 'folder', 1000);
  gabyTyping();
  await back;
  releaseQuiet(['meri']);
}

// ---------- kanvas Lukas: gambar jadi bertahap (sketsa → warna → detail → bingkai) ----------
// Semua elemen dibuat SEKALI lalu hanya ditampilkan/disembunyikan (jumlah elemen tetap, aman untuk iPhone).
// Gambar asli TIDAK dimuat di sini (decode gambar di dalam SVG = risiko memori); ini lukisan hiasan.
const easel = { job: null, stage: -1, tok: 0, gal: 0, shown: -2, galShown: 0 };
const eP = {}, eFrames = [];
const easelG = el('g', { class: 'easel', style: 'display:none' });
const EASEL_MIN = { cover: 0, sketch: 1, sky: 2, hill: 2, sun: 3, detail: 4, glow: 5 };
{
  const [bx, by] = G(R.lukas.off[0] + 4.0, R.lukas.off[1] + 2.6, 0);
  easelG.setAttribute('transform', `translate(${bx.toFixed(1)} ${(by - 84).toFixed(1)})`);
  const mk = (k, svg) => { eP[k] = el('g', { style: 'display:none' }, svg); easelG.append(eP[k]); };
  mk('cover', '<rect x="-32.4" y="-22.8" width="64.8" height="45.6" fill="#fffaf0"/>');
  mk('sky', '<rect x="-32.4" y="-22.8" width="64.8" height="45.6" fill="#7dd3fc"/><rect x="-32.4" y="-22.8" width="64.8" height="14" fill="#38bdf8" opacity=".55"/>');
  mk('sun', '<circle cx="14" cy="-8" r="8" fill="#fbbf24"/><circle cx="14" cy="-8" r="11" fill="#fde68a" opacity=".45"/>');
  mk('hill', '<path d="M-32.4,22.8 V6 Q-18,-8 -2,4 T32.4,2 V22.8Z" fill="#22c55e"/><path d="M-32.4,22.8 V13 Q-10,4 12,13 T32.4,12 V22.8Z" fill="#15803d"/>');
  mk('detail', '<ellipse cx="-16" cy="-14" rx="8" ry="3.4" fill="#fff"/><ellipse cx="-11" cy="-16" rx="5" ry="3" fill="#fff"/><rect x="-24" y="2" width="3" height="9" fill="#78350f"/><circle cx="-22.5" cy="0" r="6" fill="#16a34a"/>'
    + '<circle cx="4" cy="15" r="1.8" fill="#ef4444"/><circle cx="10" cy="17" r="1.8" fill="#f9a8d4"/><circle cx="20" cy="15" r="1.8" fill="#ef4444"/><path d="M22,-17 q2,-3 4,0 q2,-3 4,0" stroke="#334155" stroke-width="1.2" fill="none"/>');
  mk('sketch', '<path d="M-32.4,8 Q-18,-6 -2,6 T32.4,4" stroke="#57534e" stroke-width="1.4" fill="none" stroke-dasharray="3 2"/><circle cx="14" cy="-8" r="8" stroke="#57534e" stroke-width="1.4" fill="none" stroke-dasharray="3 2"/>'
    + '<path d="M-22,2 v9 M-22.5,-1 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M-24,-14 q4,-4 10,0" stroke="#57534e" stroke-width="1.2" fill="none"/>');
  mk('glow', '<rect x="-31.4" y="-21.8" width="62.8" height="43.6" fill="none" stroke="#facc15" stroke-width="3"/>');
  // 3 bingkai kecil di dinding belakang untuk lukisan yang sudah jadi (terbaru menimpa yang tertua)
  const o = R.lukas.off;
  [3.5, 4.35, 5.2].forEach((x, i) => {
    const pt = (a, b) => G(o[0] + x + a, o[1] + 0.06, 1.7 + b);
    const f = el('g', { style: 'display:none' }, poly([pt(0, 0), pt(0.72, 0), pt(0.72, 0.95), pt(0, 0.95)], 'fill="#92400e"')
      + poly([pt(0.08, 0.08), pt(0.64, 0.08), pt(0.64, 0.87), pt(0.08, 0.87)], 'fill="#7dd3fc"')
      + poly([pt(0.08, 0.08), pt(0.64, 0.08), pt(0.64, 0.38), pt(0.08, 0.3)], `fill="${['#22c55e', '#f97316', '#a855f7'][i]}"`));
    eFrames.push(f);
    R.lukas.fx0.append(f);
  });
  R.lukas.fx0.append(easelG); // di belakang karakter (lapisan fx0 ada di bawah slotG/overG)
}
function showEl(e, on, fade) {
  const vis = e.style.display !== 'none';
  if (on === vis) return;
  e.style.display = on ? '' : 'none';
  if (on && fade && !LITE) { e.style.opacity = '0'; e.style.transition = 'opacity .8s'; requestAnimationFrame(() => requestAnimationFrame(() => { e.style.opacity = '1'; })); }
}
function setStage(n, fade = true) {
  easel.stage = n;
  if (!running) return; // tertutup: hanya catat; digambar saat dibuka (syncAll)
  easel.shown = n;
  easelG.style.display = n < 0 ? 'none' : '';
  for (const k of Object.keys(EASEL_MIN)) {
    let on = n >= EASEL_MIN[k];
    if (k === 'sketch' && n >= 3) on = false;
    showEl(eP[k], on, fade);
  }
  eFrames.forEach((f, i) => showEl(f, i < easel.gal, false));
}
async function easelLoop() {
  const tok = ++easel.tok;
  while (tok === easel.tok && running && easel.job && easel.stage < 4) {
    await wait(2300);
    if (tok !== easel.tok || !running || !easel.job) return;
    setStage(easel.stage + 1);
  }
}
// Dicatat SELALU (juga saat Ruang Kerja tertutup) — hanya angka.
function easelEvent(d) {
  if (d.kind === 'start' && d.who === 'lukas') { Object.assign(easel, { job: d.id, tok: easel.tok + 1 }); setStage(0); return; }
  if (d.id !== easel.job) return;
  if (d.kind === 'step') {
    if (/^Memperbaiki/i.test(d.text || '')) { setStage(Math.min(easel.stage, 3)); easelLoop(); if (running && A.lukas) A.lukas.say('🖌️ ' + (reasonShort(d.text)), 2200); }
    else if (/gambar|lukis/i.test(d.text || '') && !/perintah|mengecek/i.test(d.text || '')) { setStage(Math.max(easel.stage, 1)); easelLoop(); }
    else if (/perintah/i.test(d.text || '') && running && A.lukas) A.lukas.say('💭 mau gambar apa ya…', 1800);
  }
  if (d.kind === 'end') {
    easel.job = null; easel.tok++;
    if (d.ok) { easel.gal = Math.min(3, easel.gal + 1); setStage(5); if (running) { sparkle(CANVAS()); sparkle([CANVAS()[0] - 26, CANVAS()[1] + 10]); sparkle([CANVAS()[0] + 28, CANVAS()[1] - 12]); } }
    else setStage(-1);
  }
}
const reasonShort = (t) => String(t || '').replace(/^Memperbaiki(\s*\(ke-\d+\))?:\s*/i, '').replace(/…+$/, '').slice(0, 30);

// ---------- pekerjaan tim dari papan kerja (Rara, Pandu, Lukas → Vera → Gaby) ----------
const WORK_SPOT = { rara: () => RARA_KERJA, pandu: () => spot('pandu', 'board'), lukas: () => spot('lukas', 'paint') };
const WORK_POSE = { lukas: 'painting', pandu: 'working' };
const JOBS = new Map();
function inAnyJob(key, except) { return [...JOBS.values()].some((j) => j !== except && !j.ended && j.parts.has(key)); }
function stopWork(a) {
  if (!a.working) return;
  a.working = null;
  a.cls('rush', false); a.pose('working', false); a.pose('painting', false); a.progress(null);
  if (R[a.key]) busy(a.key, false);
}
async function goWork(j, a, teleport = false) {
  if (a.key === 'rara') a.variant('kerja');
  const t = WORK_SPOT[a.key] ? WORK_SPOT[a.key]() : a.home;
  if (teleport) { Object.assign(a, { x: t.x, y: t.y, z: t.z || 0, path: null }); a.setView(t.view || 'front'); if (t.face) a.face = t.face; a.place(); }
  else if (dist(a, t) > 0.1) await a.walk(t, { run: true });
  if (j.ended || j.who !== a.key) return;
  a.working = j.id;
  if (R[a.key]) busy(a.key, true);
  a.cls('rush'); a.pose(WORK_POSE[a.key] || 'working');
  // Animasi kerja berjalan sendiri (TIDAK ditunggu): pengatur adegan harus tetap bisa memproses kabar berikutnya.
  (async () => {
    for (let i = 0; a.working === j.id && !j.ended && j.who === a.key; i++) {
      a.progress(j.progress != null ? j.progress : ((performance.now() / 1800) % 1));
      if (a.key === 'lukas' && i % 2 === 0) { const [x, y] = CANVAS(); rise([x + rnd(-20, 20), y + rnd(-14, 10)], pick(['🔴', '🟡', '🔵', '🟣']), 8, 900); }
      if (a.key === 'pandu' && i % 4 === 0 && !routeN()) rise(BOARD(), '📍', 15, 1300); // tanpa daftar langkah: paku hiasan
      await wait(500);
    }
    if (a.working === j.id) stopWork(a);
  })();
}
let lens = null;
let inspTok = 0, inspTicks = 0;
function startInspect(j) {
  const p = VERA_PAPER();
  veraPaper(true, j);
  busy('vera', true); A.vera.pose('working');
  const rounds = (j && j.veraRounds) || 1;
  showRound(rounds);
  A.vera.say(rounds > 1 ? '🔍 Aku cek lagi ya…' : '🔍 Aku cek dulu…', 1600);
  if (!lens) { lens = el('g', { transform: `translate(${p[0]} ${p[1] - 14})` }, '<g class="sweep"><circle r="11" fill="rgba(186,230,253,.45)" stroke="#b45309" stroke-width="3.5"/><path d="M8,8 L16,16" stroke="#78350f" stroke-width="4" stroke-linecap="round"/></g>'); R.vera.overG.append(lens); }
  // Centang muncul satu per satu (baris terakhir menunggu hasil asli), lalu Vera bergumam sesuai jenis kertasnya.
  const tok = ++inspTok, kind = docShown, n = (DOC_MARKS[kind] || []).length;
  inspTicks = 0;
  (async () => {
    await wait(1400);
    for (let k = 0; tok === inspTok; k++) {
      if (inspTicks < n - 1) { mark(inspTicks, true); inspTicks++; await wait(1100); continue; }
      const t = DOC_THINK[kind] || DOC_THINK.plan;
      A.vera.say(t[k % t.length], 1800);
      await wait(3600);
    }
  })();
}
async function stamp(ok, j) {
  const p = VERA_PAPER();
  inspTok++; // hentikan centang & gumaman
  if (lens) { lens.remove(); lens = null; }
  A.vera.pose('working', false);
  const n = (DOC_MARKS[docShown] || []).length;
  for (let i = inspTicks; i < n; i++) { mark(i, ok || i < n - 1); await wait(200); }
  A.vera.pose('stamping');
  await wait(250);
  const word = ok ? `${DOC_STAMP[docShown] || ''} LOLOS`.trim() : 'PERBAIKI';
  pop([p[0], p[1] - 40], `<g class="stamp"><text text-anchor="middle" font-size="34">${ok ? '✅' : '⚠️'}</text><text y="22" text-anchor="middle" font-size="13" font-weight="900" fill="${ok ? '#16a34a' : '#d97706'}" font-family="system-ui" stroke="#fff" stroke-width="3" paint-order="stroke">${word}</text></g>`, 1500);
  A.vera.hop();
  if (ok && j && j.veraRounds > 1) A.vera.say('✅ Sekarang sudah beres!', 1500);
  await wait(600);
  A.vera.pose('stamping', false);
  busy('vera', false);
}
function jobActors(j) { return [...new Set([...j.parts, j.who, j.holder].filter((k) => k && A[k] && k !== 'gaby'))]; }

async function jobStep(j, d, teleport = false) {
  if (d.kind === 'start') {
    const a = A[d.who];
    if (!a) return;
    claimQuiet([a.key]); state.busy.add(a.key);
    if (!teleport && state.ptt && atHome(A.gaby)) {
      await fly(GABY_SCREEN(), a.headPt(), 'note', 900);
      a.say('❗ Siap, Bos!', 900); a.hop();
      await wait(350);
    }
    await goWork(j, a, teleport);
    return;
  }
  if (d.kind === 'pass') {
    const from = j.who, to = d.who;
    if (from === to || !A[to]) return;
    j.who = to;
    j.parts.add(to);
    const fa = A[from], ta = A[to];
    // Animasi tertinggal dari kejadian asli (masih ada kabar menunggu / pekerjaan sudah selesai):
    // lompati jalan kaki supaya tidak terlambat dari kartu hasilnya.
    teleport = teleport || j.pending > 1 || j.ended;
    stopWork(fa);
    state.busy.add(to); cancelAct(ta);
    if (to === 'vera' && !atHome(ta)) {
      if (teleport) { Object.assign(ta, { x: ta.home.x, y: ta.home.y, z: ta.home.z || 0, path: null, seated: true }); ta.setView('front'); ta.face = 1; ta.place(); }
      else ta.walk(ta.home, { run: true });
    }
    if (to === 'vera') {
      // hasil diantar ke Vera
      fa.carry('folder'); fa.say('Ke Vera! 🏃', 900);
      if (teleport) { Object.assign(fa, { x: VERA_DROP.x, y: VERA_DROP.y, z: 0, path: null }); fa.place(); }
      else await fa.walk(VERA_DROP, { run: true });
      await arrive(A.vera);
      fa.carry(null); j.holder = from;
      if (!teleport) await fly(fa.handPt(), VERA_PAPER(), 'folder', 400);
      if (j.ended) return;
      fa.say('⏳', 2000);
      startInspect(j);
      return;
    }
    if (from === 'vera') {
      // Vera menolak: map kembali ke yang memperbaiki
      await stamp(false, j);
      A.vera.say(`⚠️ ${reasonOf(j)}`, 2600); // alasan ASLI dari Vera
      await wait(700);
      veraPaper(false);
      await fly(VERA_PAPER(), ta.headPt(), 'folder', 450);
      ta.say('Siap, aku perbaiki! 💦', 1000);
      j.holder = null;
      await goWork(j, ta, teleport);
      return;
    }
    // minta tolong teman (misalnya Pandu → Rara untuk riset)
    if (to !== j.owner) {
      j.helpers.add(to);
      fa.say(`${NAMES[to]}, tolong! 🙏`, 1000);
      await fly(fa.headPt(), ta.headPt(), from === 'pandu' ? 'plane' : 'note', from === 'pandu' ? 1000 : 700); // Pandu: pesawat kertas
      ta.say('❗ Oke!', 700); ta.hop();
    } else if (A[from] && from !== j.owner) {
      // teman selesai membantu: hasilnya dikirim ke pemilik pekerjaan
      await fly(fa.handPt(), ta.headPt(), 'plane', 700);
      fa.say('Ini datanya! 📄', 900);
    }
    await goWork(j, ta, teleport);
    return;
  }
  if (d.kind === 'end') {
    for (const k of jobActors(j)) stopWork(A[k]);
    const atVera = j.who === 'vera' || j.holder;
    if (d.ok) {
      if (atVera && j.holder) { await stamp(true, j); veraPaper(false); await fly(VERA_PAPER(), GABY_SCREEN(), 'plane', 1100); }
      else { const a = A[j.who] || A[j.owner]; if (a) await fly(a.handPt(), GABY_SCREEN(), 'plane', 1100); }
      gabyTyping();
    } else {
      if (lens) { lens.remove(); lens = null; }
      veraPaper(false); busy('vera', false); A.vera.pose('working', false);
      const a = A[j.who] || A[j.owner];
      if (a) a.say(d.paused ? '⏸️ lanjut nanti ya' : '😥 belum berhasil', 1600);
    }
    for (const k of jobActors(j)) {
      if (inAnyJob(k, j)) continue;
      const a = A[k];
      state.busy.delete(k);
      a.restUntil = performance.now() + 2500;
      if (k === 'vera') continue;
      if (d.ok && k === j.owner) a.say('Fiuh 😮‍💨', 1100);
      a.walk(a.home).then((arrived) => { if (arrived && k === 'rara' && !state.busy.has('rara')) a.variant('santai'); });
    }
    if (!state.busy.size) status(idleStatus());
  }
}
function onJob(d) {
  if (d.kind === 'wait') {
    // v1.25: teman menunggu jatah AI pulih → cukup gelembung kecil (tanpa animasi/elemen baru).
    const a = A[d.who];
    const sec = (String(d.text || '').match(/±(\d+)/) || [])[1];
    if (a) a.say(`☕ nunggu jatah${sec ? ` ±${sec} dtk` : ''}…`, 2600);
    return;
  }
  let j = JOBS.get(d.id);
  if (d.kind === 'start') {
    j = { id: d.id, owner: d.who, who: d.who, helpers: new Set(), parts: new Set([d.who]), pending: 0, holder: null, progress: null, ended: false, chain: Promise.resolve() };
    JOBS.set(d.id, j);
  }
  if (!j) return;
  if (d.kind === 'progress') { j.progress = d.frac; return; }
  // Alasan Vera menolak (dikirim aplikasi sebagai teks "Memperbaiki: …" / "Vera minta cek ulang…") dicatat untuk gelembung Vera.
  if ((d.kind === 'pass' || d.kind === 'step') && /^(Memperbaiki|Vera minta)/i.test(d.text || '')) j.reason = /^Vera minta/i.test(d.text) ? '' : d.text;
  if (d.kind === 'pass' && d.who === 'vera') j.veraRounds = (j.veraRounds || 0) + 1;
  if (d.kind === 'steps' || d.kind === 'step') return; // ditangani routeEvent (papan Pandu)
  if (d.kind === 'end') j.ended = true;
  // Vera mengoper ke teman: tunggu sebentar — kalau pekerjaan langsung selesai, artinya DISETUJUI, bukan ditolak.
  const fromVera = d.kind === 'pass' && j.who === 'vera' && d.who !== 'vera';
  j.pending++;
  j.chain = j.chain
    .then(() => (fromVera && !j.ended ? sleepMs(600) : null))
    .then(() => (fromVera && j.ended ? null : jobStep(j, d)))
    .finally(() => { j.pending--; })
    .then(() => { if (d.kind === 'end') JOBS.delete(j.id); })
    .catch((e) => console.warn('[Gaby] Ruang Kerja job', e));
}

// ---------- menyamakan keadaan saat Ruang Kerja dibuka ----------
function syncAll() {
  onGabyState(officeState.gaby, true);
  drawRoute();
  setStage(easel.stage, false);
  if (easel.job && easel.stage >= 1 && easel.stage < 4) easelLoop();
  // pekerjaan yang selesai saat Ruang Kerja tertutup
  for (const [id, j] of JOBS) {
    if (officeState.jobs.has(id)) continue;
    j.ended = true;
    for (const k of jobActors(j)) { stopWork(A[k]); if (!inAnyJob(k, j)) { state.busy.delete(k); A[k].walk(A[k].home); } }
    if (lens) { lens.remove(); lens = null; }
    veraPaper(false); busy('vera', false);
    JOBS.delete(id);
  }
  // pekerjaan yang sedang berjalan: langsung tampilkan siapa yang sedang bekerja
  for (const [id, s] of officeState.jobs) {
    if (JOBS.has(id)) continue;
    const j = { id, owner: s.owner, who: s.owner, helpers: new Set(), parts: new Set([s.owner]), pending: 0, holder: null, progress: null, ended: false, chain: Promise.resolve() };
    JOBS.set(id, j);
    j.chain = jobStep(j, { kind: 'start', who: s.owner }, true)
      .then(() => (s.who !== s.owner ? jobStep(j, { kind: 'pass', who: s.who }, true) : null))
      .catch((e) => console.warn(e));
  }
}

// Papan rute Pandu dicatat SELALU (juga saat Ruang Kerja tertutup) — hanya angka & teks, sangat ringan.
function routeEvent(d) {
  if (d.kind === 'start' && d.who === 'pandu') Object.assign(route, { job: d.id, list: [], at: -1, end: null, pinned: -1 });
  if (d.id !== route.job) return;
  if (d.kind === 'steps') { route.list = (d.list || []).filter((t) => !/^Vera\b/.test(t)); route.at = -1; route.pinned = -1; }
  if (d.kind === 'step') route.at = d.i;
  if (d.kind === 'end') route.job = null;
  if (!running) { if (d.kind === 'end') route.end = d.ok ? 'ok' : 'fail'; return; }
  if (d.kind === 'start' || d.kind === 'steps') drawRoute();
  else if (d.kind === 'step') panduPin(d.i, d.text);
  else if (d.kind === 'end') pinBusy = pinBusy.then(() => routeFinish(d.ok));
}

officeListen((type, d) => {
  if (type === 'job') { routeEvent(d); easelEvent(d); }
  if (!running) return; // tertutup: tidak ada animasi; disamakan lagi saat dibuka (syncAll)
  if (type === 'gaby') onGabyState(d);
  else if (type === 'say') onSay(d);
  else if (type === 'tool') onTool(d);
  else if (type === 'toolDone') onToolDone(d);
  else if (type === 'job') onJob(d);
});

// ---------- benda yang bisa diketuk ----------
function hitPoly(pts, label, fn) {
  const p = el('polygon', { points: pts.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' '), fill: 'rgba(0,0,0,0)', class: 'hit' });
  p.appendChild(el('title', {}, label));
  p.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  uiG.append(p);
}
function hitCircle([x, y], r, label, fn) {
  const c = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: 'rgba(0,0,0,0)', class: 'hit' });
  c.appendChild(el('title', {}, label));
  c.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  uiG.append(c);
}
{
  const o = R.gaby.off;
  hitPoly([G(o[0] + 1.4, o[1] + 1.8, 3.3), G(o[0] + 6.8, o[1] + 1.8, 3.3), G(o[0] + 6.8, o[1] + 1.8, 5.8), G(o[0] + 1.4, o[1] + 1.8, 5.8)], 'PUSH TO TALK', () => api.ptt && api.ptt());
  const pd = R.pandu.off;
  hitPoly([G(pd[0] + 1, pd[1] + 0.05, 1.4), G(pd[0] + 6.8, pd[1] + 0.05, 1.4), G(pd[0] + 6.8, pd[1] + 0.05, 4.8), G(pd[0] + 1, pd[1] + 0.05, 4.8)], 'Daftar rencana Pandu', () => api.openPlans && api.openPlans());
  hitCircle(CANVAS(), 34, 'Galeri gambar Lukas', () => api.openGallery && api.openGallery());
  const m = R.meri.off;
  hitPoly([G(m[0] + 0.4, m[1] + 0.6, 0), G(m[0] + 7.6, m[1] + 0.6, 0), G(m[0] + 7.6, m[1] + 0.6, 3.9), G(m[0] + 0.4, m[1] + 0.6, 3.9)], 'Laci ingatan Meri', () => api.openMemory && api.openMemory());
  hitCircle(G(R.rara.off[0] + 5.1, R.rara.off[1] + 3.3, 2.9), 36, 'Berita terakhir Rara', () => api.openNews && api.openNews());
}

// ---------- kartu "keluar" dari layar hologram Gaby ----------
const CARD_IDS = ['plancard', 'srccard', 'todocard', 'mapcard', 'preview'];
const shown = new Map();
function cardVisible(c) { return c && !c.hidden && (c.classList.contains('show') || c.id === 'mapcard'); }
function ghostFromHolo(card) {
  const r = card.getBoundingClientRect();
  if (!r.width) return;
  const s = toScreen(...GABY_SCREEN());
  const g = document.createElement('div');
  g.className = 'office-ghost';
  document.body.append(g);
  g.animate([
    { left: `${s.x - 20}px`, top: `${s.y - 14}px`, width: '40px', height: '28px', opacity: 1 },
    { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, opacity: 0.0 },
  ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => g.remove();
}
const cardObserver = new MutationObserver(() => {
  for (const id of CARD_IDS) {
    const c = document.getElementById(id);
    const vis = cardVisible(c);
    if (vis && !shown.get(id) && running) ghostFromHolo(c);
    shown.set(id, vis);
  }
});

// ---------- mulai ----------
R.gaby.overG.append(deskMic);
gabyMic(false);
for (const id of ['zin', 'zout', 'zall']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());

// ---------- buka / tutup ----------
export function mountOffice(callbacks) { api = callbacks || {}; }
export function openOffice() {
  if (running) return;
  running = true;
  last = performance.now();
  for (const id of CARD_IDS) { const c = document.getElementById(id); shown.set(id, cardVisible(c)); if (c) cardObserver.observe(c, { attributes: true, attributeFilter: ['class', 'hidden'] }); }
  syncAll();
  focus(A.gaby);
  { const [x, y] = G(A.gaby.x, A.gaby.y, 2); camT = fitFull(); zoomTo(VW() < 900 ? 520 : 900, x, y); cam = { ...camT }; printS = 0; camLast = ''; applyCam(); }
  status(idleStatus());
  requestAnimationFrame(tick);
}
export function closeOffice() {
  running = false;
  cardObserver.disconnect();
}

// Untuk uji otomatis (tidak dipakai aplikasi).
// Uji (prototipe): jalankan aktivitas bernama dengan teman yang sedang bebas.
function playNamed(name) {
  const def = ACTS.find((d) => d.name === name); if (!def) return 'tidak ada';
  const free = Object.values(A).filter((x) => (def.who === 'any' ? x.key !== 'gaby' : def.who.includes(x.key)) && !state.busy.has(x.key) && !x.act && !x.path);
  if (free.length < (def.n || 1)) return null;
  const actors = free.sort(() => Math.random() - 0.5).slice(0, def.n || 1);
  actors.forEach((x) => { x.restUntil = performance.now() + 60000; });
  runAct(def, actors).then(() => actors.forEach((x) => { x.restUntil = performance.now() + 1500; }));
  return actors.map((x) => NAMES[x.key]).join(' & ');
}
export const _test = { playNamed, P, LIVE, A, state, JOBS, R, TAKEN, route, routePins, routeLines, veraDocs, veraMarks, roundTag, easel, eP, eFrames, easelG, get docShown() { return docShown; } };
