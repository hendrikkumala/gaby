// Sketsa meja kerja tim Gaby: ruangan 2.5D (isometrik) yang digambar dengan kode.
// x = ke kanan-bawah (sepanjang dinding kanan), y = ke kiri-bawah (sepanjang dinding kiri), z = ke atas.

const W = 8, D = 8, H = 5.5;
let S = 20, OX = 160, OY = 125, K = 1; // skala & titik awal gambar (K = ukuran benda kecil relatif terhadap S=20)
let OFF = [0, 0]; // posisi ruangan di dalam kantor (untuk denah)
let MODE = { L: true, R: true, combined: false }; // dinding kiri/kanan: true = dinding luar, false = kaca antar-ruangan
function setView(s, ox, oy) { S = s; OX = ox; OY = oy; K = s / 20; }
const P = (x, y, z = 0) => { x += OFF[0]; y += OFF[1]; return [+(OX + (x - y) * S * 0.866).toFixed(1), +(OY + (x + y) * S * 0.5 - z * S).toFixed(1)]; };
const pts = (a) => a.map((p) => p.join(',')).join(' ');
const poly = (a, f, ex = '') => `<polygon points="${pts(a)}" fill="${f}" ${ex}/>`;
const EDGE = 'stroke="rgba(0,0,0,.18)" stroke-width=".6" stroke-linejoin="round"';

// Balok: sisi atas, sisi depan-kiri (menghadap +y), sisi depan-kanan (menghadap +x).
function box(x, y, z, w, d, h, c, top) {
  return poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade(c, -0.12), EDGE)
    + poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], shade(c, -0.28), EDGE)
    + poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top || shade(c, 0.1), EDGE);
}
// Bidang tegak menghadap +y (di dinding kanan / sisi depan-kiri benda): membentang x..x+w, z..z+h.
const faceY = (x, y, z, w, h, f, ex = '') => poly([P(x, y, z), P(x + w, y, z), P(x + w, y, z + h), P(x, y, z + h)], f, ex);
// Bidang tegak menghadap +x (di dinding kiri / sisi depan-kanan benda): membentang y..y+d, z..z+h.
const faceX = (x, y, z, d, h, f, ex = '') => poly([P(x, y, z), P(x, y + d, z), P(x, y + d, z + h), P(x, y, z + h)], f, ex);
const floorQuad = (x, y, w, d, f, ex = '') => poly([P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], f, ex);
// Tulisan menempel pada bidang menghadap +y (berjalan ke arah +x) / menghadap +x (berjalan ke arah -y).
const textY = (x, y, z, s, size, fill, ex = '') => { const [a, b] = P(x, y, z); return `<text transform="matrix(.866 .5 0 1 ${a} ${b})" font-size="${size * K}" fill="${fill}" font-weight="800" font-family="system-ui" ${ex}>${s}</text>`; };
const textX = (x, y, z, s, size, fill, ex = '') => { const [a, b] = P(x, y, z); return `<text transform="matrix(.866 -.5 0 1 ${a} ${b})" font-size="${size * K}" fill="${fill}" font-weight="800" font-family="system-ui" ${ex}>${s}</text>`; };
// Benda kecil 2D yang menghadap kita, diletakkan di titik ruang (x,y,z).
const at = (x, y, z, svg, s = 1) => { const [a, b] = P(x, y, z); return `<g transform="translate(${a} ${b}) scale(${s * K})">${svg}</g>`; };
const emoji = (x, y, z, e, size = 14) => at(x, y, z, `<text text-anchor="middle" font-size="${size}">${e}</text>`);

function charAt(o, x, y, z = 0, s = 0.4) {
  // Prototipe: karakter digambar terpisah (bisa bergerak); di sini cukup catat tempat duduknya.
  if (window.PROTO) { window.PROTO_SEATS.push({ name: o._name, x: x + OFF[0], y: y + OFF[1], z }); return '<!--SLOT-->'; }
  const [a, b] = P(x, y, z);
  s *= K;
  return character({ ...o, nofloor: true }).replace('<svg ', `<svg x="${a - 100 * s}" y="${b - 246 * s}" width="${200 * s}" height="${278 * s}" `);
}

// ---------- ruangan ----------
const GLASS = 'rgba(148,197,255,.07)', GLASS_EDGE = 'stroke="rgba(165,210,255,.45)" stroke-width="1.2"';
function room({ floor = ['#334155', '#2b3648'], wallL = '#1e3a5f', wallR = '#23446e', planks = false, slab = '#0f172a', w = W, d = D } = {}) {
  let s = MODE.combined ? '' : box(0, 0, -0.5, w, d, 0.5, slab);
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    if (planks) s += floorQuad(i, j, 1, 1, floor[j % 2], `stroke="${shade(floor[0], -0.25)}" stroke-width=".5"`);
    else s += floorQuad(i, j, 1, 1, floor[(i + j) % 2]);
  }
  // Dinding luar = tembok berwarna; antar-ruangan = kaca bening (ruangan di belakangnya tetap terlihat).
  // MODE.L/R: true = tembok tinggi, 'low' = sekat kaca rendah berpintu (kantor terbuka), false = tanpa dinding.
  s += MODE.L === true ? faceX(0, 0, 0, d, H, wallL, EDGE) + faceX(0, 0, 0, d, 0.25, shade(wallL, -0.3)) : MODE.L === 'low' ? lowX(0, d) : '';
  s += MODE.R === true ? faceY(0, 0, 0, w, H, wallR, EDGE) + faceY(0, 0, 0, w, 0.25, shade(wallR, -0.3)) : MODE.R === 'low' ? lowY(0, w) : '';
  return s;
}
const glassX = (d) => faceX(0, 0, 0, d, H, GLASS, GLASS_EDGE) + Array.from({ length: Math.floor(d / 2) }, (_, i) => faceX(0, 2 * i + 2, 0, 0.06, H, 'rgba(165,210,255,.35)')).join('') + faceX(0, 0, 0, d, 0.2, '#64748b');
const glassY = (w) => faceY(0, 0, 0, w, H, GLASS, GLASS_EDGE) + Array.from({ length: Math.floor(w / 2) }, (_, i) => faceY(2 * i + 2, 0, 0, 0.06, H, 'rgba(165,210,255,.35)')).join('') + faceY(0, 0, 0, w, 0.2, '#64748b');
// Sekat kaca rendah dengan pintu di tengah (lebar pintu 2).
const LOW = 1.3, DOOR = 2;
const segs = (len) => [[0, len / 2 - DOOR / 2], [len / 2 + DOOR / 2, len]];
const lowX = (x, d) => segs(d).map(([a, b]) => faceX(x, a, 0, b - a, LOW, 'rgba(148,197,255,.12)', GLASS_EDGE) + faceX(x, a, 0, b - a, 0.15, '#64748b') + box(x - 0.05, a, LOW, 0.1, b - a, 0.08, '#cbd5e1')).join('');
const lowY = (y, w) => segs(w).map(([a, b]) => faceY(a, y, 0, b - a, LOW, 'rgba(148,197,255,.12)', GLASS_EDGE) + faceY(a, y, 0, b - a, 0.15, '#64748b') + box(a, y - 0.05, LOW, b - a, 0.1, 0.08, '#cbd5e1')).join('');
// Hiasan yang menempel di tembok hanya digambar kalau temboknya ada.
const onL = (svg) => (MODE.L === true ? svg : '');
const onR = (svg) => (MODE.R === true ? svg : '');
const windowL = (y, z, w, h, sky = '#7dd3fc') => MODE.L !== true ? '' : faceX(0.01, y, z, w, h, '#e2e8f0') + faceX(0.02, y + 0.15, z + 0.15, w - 0.3, h - 0.3, sky)
  + faceX(0.03, y + w / 2 - 0.05, z + 0.15, 0.1, h - 0.3, '#e2e8f0') + faceX(0.03, y + 0.15, z + h / 2 - 0.05, w - 0.3, 0.1, '#e2e8f0');
const plant = (x, y, z = 0, s = 1) => box(x, y, z, 0.7 * s, 0.7 * s, 0.7 * s, '#b45309')
  + at(x + 0.35 * s, y + 0.35 * s, z + 0.7 * s, `<circle cx="0" cy="-14" r="11" fill="#16a34a"/><circle cx="-9" cy="-6" r="8" fill="#22c55e"/><circle cx="9" cy="-7" r="8" fill="#15803d"/><circle cx="2" cy="-24" r="7" fill="#4ade80"/>`, s);
const mug = (x, y, z, c = '#f8fafc', steam = true) => at(x, y, z, `<rect x="-5" y="-11" width="10" height="11" rx="2" fill="${c}"/><path d="M5,-8 q5,2 0,6" stroke="${c}" stroke-width="2" fill="none"/>${steam ? '<path d="M-2,-14 q-3,-4 0,-8 M3,-14 q-3,-4 0,-8" stroke="#e2e8f0" stroke-width="1.4" fill="none" opacity=".7"/>' : ''}`);
const teapot = (x, y, z) => at(x, y, z, `<ellipse cx="0" cy="-8" rx="10" ry="8" fill="#f8fafc" stroke="#94a3b8"/><path d="M9,-10 q7,-3 9,-9" stroke="#f8fafc" stroke-width="3" fill="none"/><path d="M-10,-11 q-6,0 -5,6" stroke="#f8fafc" stroke-width="2.4" fill="none"/><ellipse cx="0" cy="-15" rx="5" ry="2" fill="#93c5fd"/><circle cx="0" cy="-17.5" r="1.8" fill="#93c5fd"/><path d="M-3,-22 q-3,-4 0,-8" stroke="#e2e8f0" stroke-width="1.4" fill="none" opacity=".7"/>`);
const books = (x, y, z, cols = ['#ef4444', '#3b82f6', '#facc15', '#22c55e']) => cols.map((c, i) => box(x, y, z + i * 0.18, 0.9 - i * 0.06, 0.6, 0.18, c)).join('');
const globe = (x, y, z, r = 22) => at(x, y, z, `<g class="globe">
  <circle r="${r * 1.6}" fill="rgba(56,189,248,.12)"/>
  <circle r="${r}" fill="rgba(14,165,233,.28)" stroke="#38bdf8" stroke-width="1.5"/>
  <ellipse rx="${r}" ry="${r * 0.35}" fill="none" stroke="#7dd3fc" stroke-width=".8" opacity=".8"/>
  <ellipse class="m" rx="${r * 0.45}" ry="${r}" fill="none" stroke="#7dd3fc" stroke-width=".8" opacity=".8"/>
  <ellipse class="m m2" rx="${r * 0.85}" ry="${r}" fill="none" stroke="#7dd3fc" stroke-width=".6" opacity=".5"/>
  <ellipse class="m m3" rx="${r * 0.65}" ry="${r}" fill="none" stroke="#7dd3fc" stroke-width=".6" opacity=".5"/>
  <g class="land"><path d="M${-r * 0.5},${-r * 0.3} q8,-6 14,0 q4,6 -6,10 z M${r * 0.15},${r * 0.2} q8,-2 10,6 q-6,6 -12,0 z" fill="rgba(125,211,252,.55)"/>
  <circle class="dot" cx="${-r * 0.35}" cy="${-r * 0.25}" r="2.6" fill="#ef4444"/><circle class="dot d2" cx="${r * 0.4}" cy="${r * 0.1}" r="2.6" fill="#facc15"/><circle class="dot d3" cx="${-r * 0.05}" cy="${r * 0.45}" r="2.6" fill="#60a5fa"/></g>
  <path d="M${-r * 1.2},${r * 0.6} A${r * 1.3},${r * 0.4} 0 0 0 ${r * 1.2},${r * 0.6}" stroke="#38bdf8" stroke-width="1" fill="none" stroke-dasharray="3 3"/></g>`);
const holoScreen = (x, y, z, w, h, ex = '') => faceY(x, y, z, w, h, 'rgba(56,189,248,.16)', 'stroke="#38bdf8" stroke-width="1.2"')
  + `<g class="holo-lines">${[0.25, 0.4, 0.55, 0.7].map((k, i) => faceY(x + 0.2, y, z + h * (1 - k), w * (0.8 - (i % 3) * 0.15), 0.08, 'rgba(165,243,252,.75)', `class="hl hl${i}"`)).join('')}</g>` + ex;
const lines = (x, y, z, w, n, c, face = 'Y', gap = 0.22) => Array.from({ length: n }, (_, i) => (face === 'Y' ? faceY(x, y, z - i * gap, w * (i % 2 ? 0.7 : 0.9), 0.07, c) : faceX(x, y, z - i * gap, w * (i % 2 ? 0.7 : 0.9), 0.07, c))).join('');

// ---------- tim terpilih ----------
const CH = Object.fromEntries(CHOSEN.map((c) => { const k = c.tag.split(' ')[0].toLowerCase() + (c.tag.includes('kerja') ? 'K' : ''); return [k, { ...c.o, _name: k }]; }));

// ---------- 18 sketsa ----------
const DESKS = [
  { name: '👑 Gaby', role: 'Kubikel bos. Monitor besar PUSH TO TALK: diketuk → kamu bicara, Gaby menjawab sambil pegang mic.', opts: [
    { t: 'Kantor Eksekutif', d: 'Meja kayu besar, layar dinding raksasa, rak buku, jendela kota, papan nama "BOS GABY".', draw: () =>
      room({ floor: ['#7c5a3e', '#6d4f36'], planks: true, wallL: '#1e3a5f', wallR: '#24456f' })
      + windowL(2.2, 2, 3, 2.3, '#fbbf24') + faceX(0.03, 2.4, 2.2, 2.6, 0.8, 'rgba(30,58,138,.5)')
      + faceY(1, 0.01, 1.7, 5.6, 3.2, '#0b1220', EDGE) + faceY(1.2, 0.02, 1.9, 5.2, 2.8, '#0e2a47')
      + textY(1.75, 0.03, 3.5, 'PUSH TO TALK', 15, '#7dd3fc') + textY(3.2, 0.03, 2.35, '🎤', 20, '#fff') + textY(2.0, 0.03, 2.1, 'ketuk untuk bicara', 7, '#94a3b8')
      + box(0, 5.4, 0, 0.8, 2.2, 3.4, '#7c4a2d') + [0.6, 1.5, 2.4].map((z) => books(0.05, 5.6, z) + books(0.05, 6.6, z, ['#a855f7', '#f97316', '#14b8a6'])).join('')
      + floorQuad(2, 2.6, 5.4, 4, '#7f1d1d') + floorQuad(2.3, 2.9, 4.8, 3.4, '#991b1b')
      + box(3.6, 2.6, 0, 1.4, 1.2, 0.9, '#111827') + box(3.6, 2.5, 0.9, 1.4, 0.3, 1.9, '#1f2937')
      + charAt(CH.gaby, 4.3, 3.2, 0.2)
      + box(2.4, 3.9, 0, 4.4, 1.5, 1.45, '#8b5a2b') + faceY(3.6, 5.41, 0.55, 2, 0.5, '#fbbf24') + textY(3.75, 5.42, 0.68, 'BOS GABY', 7, '#78350f')
      + mug(6, 4.4, 1.45, '#38bdf8') + box(2.7, 4.1, 1.45, 0.9, 0.7, 0.1, '#f8fafc') + plant(7, 0.6, 0, 1.3) },
    { t: 'Kokpit Hologram', d: 'Ruang futuristik, meja putih melengkung bercahaya biru, layar hologram melayang, bola lampu Gaby.', draw: () =>
      room({ floor: ['#0f172a', '#131d33'], wallL: '#0b1324', wallR: '#0e1830', slab: '#020617' })
      + onL(faceX(0.02, 0, 4.6, D, 0.1, '#22d3ee') + faceX(0.02, 0, 0.3, D, 0.06, '#0ea5e9')) + onR(faceY(0, 0.02, 4.6, W, 0.1, '#22d3ee') + faceY(0, 0.02, 0.3, W, 0.06, '#0ea5e9'))
      + floorQuad(1.5, 1.5, 6, 5.4, 'rgba(56,189,248,.08)', 'stroke="#38bdf8" stroke-width=".8" stroke-dasharray="4 4"')
      + holoScreen(1.4, 1.8, 3.3, 5.4, 2.5) + textY(2.0, 1.81, 5.0, 'PUSH TO TALK', 12, '#e0f2fe') + textY(5.6, 1.81, 3.9, '🎤', 16, '#fff') + textY(2.4, 1.81, 4.45, 'ketuk untuk bicara', 6.5, '#bae6fd')
      + at(4.3, 2.9, 0, '<ellipse cx="0" cy="-26" rx="16" ry="22" fill="#e2e8f0"/><ellipse cx="0" cy="-24" rx="11" ry="16" fill="#38bdf8" opacity=".4"/>')
      + charAt(CH.gaby, 4.3, 3.3, 0.2)
      + box(2.2, 4.2, 0, 4.6, 1.1, 1.3, '#e2e8f0') + faceY(2.2, 5.31, 1.0, 4.6, 0.12, '#22d3ee') + box(6.8, 3.0, 0, 1.0, 2.3, 1.3, '#e2e8f0') + faceX(7.81, 3.0, 1.0, 2.3, 0.12, '#22d3ee')
      + at(3, 4.6, 1.3, '<circle cy="-9" r="9" fill="#7dd3fc"/><circle cy="-9" r="15" fill="rgba(125,211,252,.25)"/><path d="M-4,-10 q-3,-4 0,-6" stroke="#fff" stroke-width="1.5" fill="none"/>')
      + mug(6, 4.6, 1.3, '#0ea5e9') + [[1, 6.5, 3], [6.8, 0.8, 4], [2.4, 1, 4.5]].map(([x, y, z]) => at(x, y, z, '<circle r="2.5" fill="#67e8f9"/><circle r="6" fill="rgba(103,232,249,.25)"/>')).join('') },
    { t: 'Studio Radio', d: 'Gaby seperti penyiar: lampu ON AIR, peredam suara di dinding, meja mixer, speaker.', draw: () =>
      room({ floor: ['#4c1d95', '#45198a'], wallL: '#27272a', wallR: '#2e2e33' })
      + Array.from({ length: 12 }, (_, k) => faceX(0.02, 0.4 + (k % 6) * 1.2, 0.6 + Math.floor(k / 6) * 1.4, 1, 1.2, k % 2 ? '#3f3f46' : '#52525b')).join('')
      + faceX(0.03, 4.6, 3.6, 2.6, 1, '#dc2626', EDGE) + textX(0.04, 6.9, 3.85, 'ON AIR', 13, '#fee2e2')
      + faceY(1.2, 0.01, 1.8, 5.4, 3.1, '#0b1220', EDGE) + textY(1.8, 0.02, 3.6, 'PUSH TO TALK', 15, '#a78bfa')
      + [0.6, 1.4, 2.6, 1.8, 0.9, 2.2, 1.2, 0.7, 1.9, 1.1].map((h, i) => faceY(1.9 + i * 0.42, 0.02, 2.2, 0.25, h * 0.6, '#c4b5fd')).join('')
      + box(3.6, 2.6, 0, 1.4, 1.2, 0.9, '#18181b') + box(3.6, 2.5, 0.9, 1.4, 0.3, 1.6, '#27272a')
      + charAt(CH.gaby, 4.3, 3.2, 0.2)
      + box(2.4, 4, 0, 4.6, 1.4, 1.35, '#3f3f46') + box(3.2, 4.2, 1.35, 2.4, 0.9, 0.18, '#18181b')
      + [0, 1, 2, 3, 4, 5].map((i) => faceY(3.35 + i * 0.36, 5.11, 1.36, 0.14, 0.3, i % 2 ? '#f472b6' : '#22c55e')).join('')
      + box(1.3, 4.4, 0, 0.9, 0.9, 2.1, '#18181b') + at(1.75, 5.3, 1.1, '<circle cy="-4" r="6" fill="#52525b"/><circle cy="-4" r="3" fill="#18181b"/><circle cy="-16" r="3.5" fill="#52525b"/>')
      + box(7.1, 3.0, 0, 0.9, 0.9, 2.1, '#18181b') + at(7.55, 3.9, 1.1, '<circle cy="-4" r="6" fill="#52525b"/><circle cy="-4" r="3" fill="#18181b"/><circle cy="-16" r="3.5" fill="#52525b"/>')
      + at(6.1, 4.6, 1.35, '<path d="M-7,-2 a7,7 0 0 1 14,0" stroke="#e5e7eb" stroke-width="2.5" fill="none"/><rect x="-9" y="-3" width="4" height="6" rx="2" fill="#a78bfa"/><rect x="5" y="-3" width="4" height="6" rx="2" fill="#a78bfa"/>') },
  ] },
  { name: '📝 Meri', role: 'Penjaga ingatan: lemari 18 laci (sesuai laci ingatan Gaby). Berkas dikirim ke komputer Gaby.', opts: [
    { t: 'Perpustakaan Klasik', d: 'Lemari kayu 18 laci berlabel, komputer tabung lucu, lampu hijau, map menumpuk, tangga kecil.', draw: () =>
      room({ floor: ['#a16207', '#92580a'], planks: true, wallL: '#e7d7b8', wallR: '#ddc9a3' })
      + box(0.6, 0, 0, 6.2, 0.9, 3.5, '#7c4a2d')
      + Array.from({ length: 18 }, (_, k) => { const c = k % 6, r = Math.floor(k / 6); return faceY(0.75 + c * 1.0, 0.91, 2.35 - r * 1.05, 0.9, 0.9, '#a0522d', EDGE) + faceY(1.1 + c * 1.0, 0.92, 2.75 - r * 1.05, 0.2, 0.08, '#fde68a'); }).join('')
      + at(7.2, 1.2, 0, '<path d="M0,0 L-14,-70 M10,0 L-4,-70" stroke="#a16207" stroke-width="2.5"/><path d="M-2,-12 h10 M-5,-26 h10 M-8,-40 h10 M-11,-54 h10" stroke="#a16207" stroke-width="2"/>')
      + charAt(CH.meri, 3.9, 3.9, 0.2)
      + box(2.4, 4.6, 0, 3.8, 1.4, 1.4, '#8b5a2b')
      + box(2.6, 4.75, 1.4, 1.3, 1.0, 1.1, '#e7e5e4') + faceY(2.75, 5.76, 1.55, 1.0, 0.8, '#14532d') + lines(2.85, 5.77, 2.15, 0.8, 3, '#4ade80')
      + box(4.4, 4.8, 1.4, 1.0, 0.8, 0.12, '#fbbf24') + box(4.45, 4.85, 1.52, 0.9, 0.7, 0.12, '#f59e0b') + box(4.5, 4.8, 1.64, 0.9, 0.75, 0.12, '#fbbf24')
      + at(5.9, 4.9, 1.4, '<rect x="-1.5" y="-18" width="3" height="16" fill="#a16207"/><path d="M-9,-18 h18 l-4,-8 h-10 z" fill="#15803d"/><ellipse cx="0" cy="-1" rx="6" ry="2" fill="#a16207"/>')
      + at(7.3, 5.8, 2.2, '<g transform="rotate(-20)"><path d="M0,0 h16 l3,-4 h7 v14 h-26 z" fill="#fbbf24" stroke="#d97706"/></g><path d="M-14,4 h-8 M-12,9 h-10 M-14,14 h-6" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>')
      + textY(6.2, 6.6, 1.2, 'ke Gaby →', 8, '#fde68a') },
    { t: 'Arsip Modern', d: '3 lemari besi × 6 laci, pipa kirim berkas (kapsul meluncur ke komputer Gaby), meja putih.', draw: () =>
      room({ floor: ['#cbd5e1', '#bfc9d6'], wallL: '#64748b', wallR: '#6b7a90' })
      + [0.8, 2.4, 4.0].map((y) => box(0, y, 0, 1, 1.4, 3.3, '#94a3b8') + Array.from({ length: 6 }, (_, r) => faceX(1.01, y + 0.1, 0.15 + r * 0.52, 1.2, 0.45, '#cbd5e1', EDGE) + faceX(1.02, y + 0.55, 0.32 + r * 0.52, 0.3, 0.08, '#475569')).join('')).join('')
      + `<path d="M${P(5, 5.2, 1.4).join(',')} L${P(5, 5.2, 4.6).join(',')} L${P(5, 0.05, 4.6).join(',')} L${P(8, 0.05, 4.6).join(',')}" stroke="#94a3b8" stroke-width="9" fill="none" stroke-linejoin="round" opacity=".9"/>`
      + `<path d="M${P(5, 5.2, 1.4).join(',')} L${P(5, 5.2, 4.6).join(',')} L${P(5, 0.05, 4.6).join(',')} L${P(8, 0.05, 4.6).join(',')}" stroke="rgba(224,242,254,.6)" stroke-width="5" fill="none" stroke-linejoin="round"/>`
      + at(5, 2.6, 4.6, '<rect x="-7" y="-4" width="14" height="8" rx="4" fill="#f59e0b"/>') + textY(5.6, 0.06, 4.9, 'ke Gaby →', 8, '#e2e8f0')
      + charAt(CH.meri, 3.6, 4.0, 0.2)
      + box(2.2, 4.7, 0, 3.8, 1.3, 1.4, '#f8fafc') + box(2.5, 4.9, 1.4, 1.3, 0.3, 1.0, '#1e293b') + faceY(2.55, 5.21, 1.5, 1.2, 0.85, '#0ea5e9') + lines(2.65, 5.22, 2.15, 0.9, 3, '#e0f2fe')
      + box(4.6, 5, 1.4, 0.8, 0.6, 0.3, '#fbbf24') + plant(6.8, 6.8, 0) },
    { t: 'Lemari Laci Ajaib', d: 'Dinding penuh 18 laci bergambar (makanan, musik, film…), lampu hias, meja bundar dengan laptop & teh.', draw: () =>
      room({ floor: ['#3f6212', '#3a5a10'], wallL: '#6b8f71', wallR: '#5e8064' })
      + box(0.4, 0, 0, 7.2, 0.6, 3.9, '#5b3a1e')
      + ['👤', '👨‍👩‍👧', '💼', '📇', '📅', '🗓️', '🔁', '🍜', '⚽', '🎵', '🎬', '✈️', '🩺', '💰', '💻', '🔬', '📚', '📌'].map((e, k) => { const c = k % 6, r = Math.floor(k / 6); return faceY(0.55 + c * 1.17, 0.61, 2.65 - r * 1.2, 1.07, 1.05, '#8b5a2b', EDGE) + textY(0.82 + c * 1.17, 0.62, 2.95 - r * 1.2, e, 12, '#fff'); }).join('')
      + onR(Array.from({ length: 9 }, (_, i) => at(0.4 + i * 0.9, 0.3, 4.6 - (i % 2) * 0.15, `<circle r="3" fill="${['#fde047', '#f9a8d4', '#86efac'][i % 3]}"/><circle r="6" fill="rgba(253,224,71,.2)"/>`)).join(''))
      + floorQuad(2.4, 3.6, 4, 3.6, '#ca8a04', 'rx="20"') + floorQuad(2.6, 3.8, 3.6, 3.2, '#eab308')
      + charAt(CH.meri, 2.6, 2.2, 0)
      + box(4.2, 4.4, 0, 0.4, 0.4, 1.1, '#78350f') + at(4.4, 4.6, 1.1, '<ellipse rx="34" ry="17" fill="#a16207"/><ellipse rx="34" ry="17" cy="-3" fill="#ca8a04"/>')
      + at(4.2, 4.5, 1.25, '<path d="M-14,0 h18 l4,-14 h-18 z" fill="#334155"/><path d="M-12,-2 h14 l3,-10 h-14 z" fill="#38bdf8"/><rect x="-18" y="0" width="26" height="3" fill="#475569"/>')
      + teapot(4.9, 4.8, 1.2) + mug(4.4, 5.3, 1.2, '#fef3c7') + at(6.6, 6.4, 0, '<ellipse cy="-6" rx="18" ry="9" fill="#f97316"/><ellipse cy="-9" rx="14" ry="6" fill="#fb923c"/>') },
  ] },
  { name: '🔎 Rara', role: 'Peneliti internet, punya DUA meja: santai (buku & teh) dan kerja (hologram bumi berputar + layar hologram).', opts: [
    { t: 'Observatorium', d: 'Dinding berbintang. Santai: kursi baca ungu, rak buku, meja teh. Kerja: panggung bundar dengan hologram bumi.', draw: () =>
      room({ floor: ['#1e1b4b', '#221f52'], wallL: '#13123a', wallR: '#171648', slab: '#0b0a26' })
      + Array.from({ length: 28 }, (_, i) => (i % 2 ? faceX(0.02, (i * 1.7) % 8, 1 + ((i * 2.3) % 4.2), 0.07, 0.07, '#fde68a') : faceY((i * 1.3) % 8, 0.02, 1 + ((i * 1.9) % 4.2), 0.07, 0.07, '#fff'))).join('')
      + box(0, 4.6, 0, 0.8, 2.8, 3.6, '#4c1d95') + [0.5, 1.4, 2.3].map((z) => books(0.05, 4.8, z) + books(0.05, 5.9, z, ['#f472b6', '#38bdf8', '#fde047'])).join('')
      // meja teh (lebih besar) di samping kursi; teko & cangkir berjauhan supaya tidak menempel
      + box(0.9, 1.4, 0, 1.4, 1.4, 1.0, '#a16207') + at(1.6, 2.1, 1.0, '<ellipse rx="22" ry="11" fill="#fef3c7" opacity=".5"/>')
      + teapot(1.2, 2.5, 1.0) + at(2.0, 1.75, 1.0, '<ellipse cx="0" cy="0" rx="8" ry="2.6" fill="#f1f5f9"/>') + mug(2.0, 1.75, 1.0, '#fef3c7')
      // kursi baca di sebelah lemari, menghadap ke hologram bumi
      + box(0.9, 3.0, 0, 0.3, 1.5, 2.1, '#6d28d9') + box(1.2, 2.85, 0.75, 1.5, 0.25, 0.45, '#6d28d9')
      + box(1.2, 3.0, 0, 1.5, 1.5, 0.75, '#7c3aed') + box(1.2, 4.45, 0.75, 1.5, 0.25, 0.45, '#6d28d9')
      + at(2.0, 3.75, 0.75, '<path d="M-10,-2 q10,-6 20,0 l-2,-6 q-8,-4 -16,0 z" fill="#fff7ed" stroke="#b45309"/>')
      + box(3.6, 1.8, 0, 3, 3, 0.4, '#312e81') + box(4.6, 2.8, 0.4, 1, 1, 0.9, '#4338ca')
      + globe(5.1, 3.3, 2.9, 26) + holoScreen(3.6, 1.6, 2.4, 2.6, 1.6)
      + charAt(CH.raraK, 7.3, 5.4, 0) },
    { t: 'Lab Sains', d: 'Ruang lab putih-toska. Kerja: meja panjang + proyektor sinar ke hologram bumi + 3 layar. Santai: bean bag & tumpukan buku.', draw: () =>
      room({ floor: ['#e2e8f0', '#d5dde8'], wallL: '#99f6e4', wallR: '#a7f3d0' })
      + box(1.6, 0.3, 0, 5.6, 1.3, 1.4, '#f8fafc') + faceY(1.6, 1.61, 1.2, 5.6, 0.1, '#14b8a6')
      + [1.8, 3.6, 5.4].map((x, i) => box(x, 0.4, 1.4, 1.5, 0.15, 1.0, '#1e293b') + faceY(x + 0.08, 0.56, 1.5, 1.34, 0.82, ['#0ea5e9', '#14b8a6', '#6366f1'][i]) + lines(x + 0.2, 0.57, 2.1, 1.0, 3, '#e0f2fe')).join('')
      + box(4.2, 3.0, 0, 1, 1, 0.5, '#334155') + `<polygon points="${pts([P(4.5, 3.4, 0.5), P(4.9, 3.6, 0.5), P(5.3, 3.4, 2.6), P(3.9, 3.4, 2.6)])}" fill="rgba(56,189,248,.18)"/>`
      + globe(4.7, 3.5, 3.4, 24)
      + charAt(CH.raraK, 6.6, 3.4, 0)
      + at(1.6, 5.8, 0, '<ellipse cy="-10" rx="30" ry="16" fill="#a78bfa"/><ellipse cy="-16" rx="22" ry="10" fill="#c4b5fd"/>')
      + books(2.6, 6.8, 0) + books(3.2, 7.1, 0, ['#14b8a6', '#f97316'])
      + box(0.4, 6.8, 0, 1.1, 0.8, 0.15, '#a16207') + teapot(0.8, 7.1, 0.15) + mug(1.25, 7.4, 0.15, '#fef3c7') + plant(7, 7, 0) },
    { t: 'Pojok Teh Jepang', d: 'Lantai tatami, dinding shoji. Santai: meja pendek + bantal duduk + set teh + lampion. Kerja: meja hitam ramping + hologram bumi.', draw: () =>
      room({ floor: ['#d9c88f', '#cdbb80'], planks: true, wallL: '#f5ecd7', wallR: '#efe3c8' })
      + Array.from({ length: 6 }, (_, i) => faceX(0.02, i * 1.35, 0, 0.08, H, '#8b5a2b')).join('') + faceX(0.02, 0, 2.8, D, 0.08, '#8b5a2b')
      + Array.from({ length: 6 }, (_, i) => faceY(i * 1.35, 0.02, 0, 0.08, H, '#8b5a2b')).join('') + faceY(0, 0.02, 2.8, W, 0.08, '#8b5a2b')
      + box(4.2, 1.2, 0, 3.2, 1.2, 1.3, '#1f2937') + box(4.4, 1.3, 1.3, 0.4, 0.4, 0.2, '#374151')
      + globe(6.2, 1.5, 3.2, 22) + holoScreen(4.3, 1.0, 2.0, 2.6, 1.3)
      + charAt(CH.raraK, 3.5, 2.9, 0)
      + floorQuad(1.4, 4.6, 3.2, 3, '#9a3412', 'opacity=".25"') + box(1.8, 5.0, 0, 2.2, 1.8, 0.55, '#7c2d12')
      + teapot(2.6, 5.7, 0.55) + mug(3.3, 6.0, 0.55, '#f5f5f4') + mug(2.4, 6.4, 0.55, '#f5f5f4', false)
      + at(2.9, 7.5, 0, '<ellipse cy="-4" rx="16" ry="7" fill="#be123c"/>') + at(4.6, 6.2, 0, '<ellipse cy="-4" rx="16" ry="7" fill="#be123c"/>')
      + at(1, 6.6, 0, '<rect x="-1.5" y="-50" width="3" height="50" fill="#57534e"/><ellipse cy="-58" rx="10" ry="13" fill="#fde68a" stroke="#dc2626"/><circle cy="-58" r="18" fill="rgba(253,224,71,.18)"/>') },
  ] },
  { name: '🗺️ Pandu', role: 'Perencana: papan peta dengan pin & benang rute.', opts: [
    { t: 'Basecamp Penjelajah', d: 'Papan gabus besar dengan peta, pin & benang merah; meja kayu, ransel, lentera, bendera segitiga.', draw: () =>
      room({ floor: ['#8b6b45', '#7d603d'], planks: true, wallL: '#4d5b32', wallR: '#56663a' })
      + faceY(1, 0.01, 1.4, 5.8, 3.4, '#c08a4f', EDGE) + faceY(1.3, 0.02, 1.7, 5.2, 2.8, '#e7d3a4')
      + faceY(1.6, 0.03, 2.4, 1.8, 1.4, '#86efac') + faceY(3.8, 0.03, 2.0, 1.6, 1.8, '#86efac') + faceY(5.6, 0.03, 3.2, 0.7, 0.9, '#86efac')
      + `<polyline points="${pts([P(2.2, 0.04, 3.4), P(4.4, 0.04, 2.6), P(5.9, 0.04, 3.7), P(3.2, 0.04, 4.1)])}" stroke="#dc2626" stroke-width="1.6" fill="none"/>`
      + [[2.2, 3.4], [4.4, 2.6], [5.9, 3.7], [3.2, 4.1]].map(([x, z], i) => at(x, 0.05, z, `<circle r="3.4" fill="${['#ef4444', '#facc15', '#3b82f6', '#22c55e'][i]}"/>`)).join('')
      + (MODE.L === true ? `<polygon points="${pts([P(0.02, 2, 4.2), P(0.02, 4, 3.9), P(0.02, 2, 3.4)])}" fill="#f97316"/>` : '')
      + charAt(CH.pandu, 3.4, 2.4, 0)
      + box(3.0, 4.4, 0, 3.6, 1.5, 1.35, '#92400e') + at(4.0, 5.0, 1.35, '<rect x="-14" y="-6" width="28" height="12" fill="#fef3c7" transform="skewX(-20)"/><path d="M-10,-1 q8,-6 16,2" stroke="#dc2626" stroke-dasharray="2 2" fill="none"/>')
      + at(5.6, 4.9, 1.35, '<circle cy="-5" r="6" fill="#d4a017"/><circle cy="-5" r="4" fill="#fff8e1"/><path d="M0,-9 l1,4 -1,4 -1,-4z" fill="#ef4444"/>')
      + box(1.2, 5.6, 0, 1, 0.8, 1.4, '#65a30d') + box(1.3, 6.35, 0.3, 0.8, 0.12, 0.6, '#4d7c0f')
      + at(7.1, 2.6, 0, '<rect x="-6" y="-20" width="12" height="18" rx="3" fill="#78350f"/><rect x="-4" y="-17" width="8" height="12" fill="#fde047"/><circle cy="-11" r="12" fill="rgba(253,224,71,.2)"/><path d="M-5,-20 q5,-8 10,0" stroke="#78350f" stroke-width="2" fill="none"/>') },
    { t: 'Ruang Strategi', d: 'Meja besar berisi peta 3D (gunung, laut, bendera rute), papan jadwal dengan catatan tempel di dinding.', draw: () =>
      room({ floor: ['#334155', '#2d3a4e'], wallL: '#1e293b', wallR: '#243247' })
      + faceX(0.02, 1, 1.6, 5.6, 2.8, '#f8fafc', EDGE) + Array.from({ length: 4 }, (_, i) => faceX(0.03, 1.1 + i * 1.4, 4.0, 0.05, 0.25, '#334155') + textX(0.04, 6.3 - i * 1.4, 3.75, ['Sen', 'Sel', 'Rab', 'Kam'][i], 6, '#334155')).join('')
      + Array.from({ length: 7 }, (_, i) => faceX(0.04, 1.2 + (i % 4) * 1.35, 2.0 + Math.floor(i / 4) * 0.9, 0.9, 0.7, ['#fde047', '#f9a8d4', '#86efac', '#93c5fd'][i % 4])).join('')
      + charAt(CH.pandu, 4.6, 2.0, 0)
      + box(2.2, 3.0, 0, 5.2, 3.6, 1.2, '#475569', '#1d4ed8')
      + floorQuad(2.6, 3.4, 2.6, 2.2, '#16a34a').replace(/points="([^"]+)"/, (m, p) => `points="${p.split(' ').map((q) => { const [a, b] = q.split(','); return `${a},${+b - 24}`; }).join(' ')}"`)
      + at(3.5, 4.3, 1.2, '<path d="M-12,0 L-2,-16 L8,0 Z" fill="#a8a29e"/><path d="M-6,-10 L-2,-16 L2,-10 Z" fill="#fff"/><path d="M2,2 L10,-10 L18,2 Z" fill="#78716c"/>')
      + at(5.6, 5.2, 1.2, '<path d="M0,0 v-16" stroke="#7c2d12" stroke-width="1.5"/><path d="M0,-16 l9,3 -9,3z" fill="#ef4444"/>') + at(6.4, 4.0, 1.2, '<path d="M0,0 v-16" stroke="#7c2d12" stroke-width="1.5"/><path d="M0,-16 l9,3 -9,3z" fill="#facc15"/>')
      + `<path d="M${P(3.4, 4.6, 1.25).join(',')} Q${P(4.8, 5.6, 1.25).join(',')} ${P(5.6, 5.2, 1.25).join(',')}" stroke="#fff" stroke-dasharray="3 3" fill="none"/>` },
    { t: 'Pos Pramuka', d: 'Tenda kecil di pojok, globe kuno, tong gulungan peta, peta di atas penyangga, api unggun lampu.', draw: () =>
      room({ floor: ['#65a30d', '#5c9a0c'], wallL: '#7c5a3a', wallR: '#8b6a48' })
      + `<polygon points="${pts([P(0.4, 0.4, 0), P(3, 0.4, 0), P(1.7, 0.4, 2.6)])}" fill="#f97316"/><polygon points="${pts([P(3, 0.4, 0), P(3, 3, 0), P(1.7, 3, 2.6), P(1.7, 0.4, 2.6)])}" fill="#ea580c"/><polygon points="${pts([P(0.4, 3, 0), P(3, 3, 0), P(1.7, 3, 2.6)])}" fill="#c2410c"/><polygon points="${pts([P(1.2, 3.01, 0), P(2.2, 3.01, 0), P(1.7, 3.01, 1.5)])}" fill="#431407"/>`
      + at(5.4, 1.2, 0, '<path d="M-14,0 L0,-8 L14,0" stroke="#78350f" stroke-width="2.5" fill="none"/><path d="M0,-8 V-62" stroke="#78350f" stroke-width="2.5"/><rect x="-26" y="-64" width="52" height="38" fill="#fef3c7" stroke="#a16207" stroke-width="2"/><path d="M-20,-36 q10,-16 20,-6 t18,-12" stroke="#dc2626" stroke-dasharray="3 3" fill="none"/><circle cx="18" cy="-54" r="3" fill="#ef4444"/>')
      + charAt(CH.pandu, 4.4, 3.6, 0)
      + at(7.0, 3.6, 0, '<rect x="-3" y="-34" width="6" height="34" fill="#78350f"/><circle cy="-48" r="16" fill="#0ea5e9" stroke="#a16207" stroke-width="3"/><path d="M-8,-52 q6,-6 12,0 q2,8 -6,8 z" fill="#65a30d"/><path d="M-18,-48 a18,18 0 0 0 36,0" stroke="#a16207" stroke-width="2" fill="none"/>')
      + box(1.0, 5.8, 0, 1.1, 1.1, 1.2, '#92400e') + [0, 1, 2].map((i) => at(1.3 + i * 0.3, 6.2, 1.2, `<rect x="-3" y="-20" width="6" height="20" rx="3" fill="${['#fef3c7', '#fde68a', '#fcd34d'][i]}" transform="rotate(${-10 + i * 10})"/>`)).join('')
      + at(4.6, 6.4, 0, '<path d="M-14,0 l28,-6 M-14,-6 l28,6" stroke="#78350f" stroke-width="4"/><path d="M0,-8 q-10,-10 0,-26 q10,14 0,26 z" fill="#f97316"/><path d="M0,-8 q-5,-6 0,-15 q5,8 0,15 z" fill="#fde047"/><circle cy="-14" r="22" fill="rgba(251,146,60,.2)"/>') },
  ] },
  { name: '✅ Vera', role: 'Pemeriksa: kaca pembesar, lalu stempel ✅ atau ⚠️.', opts: [
    { t: 'Kantor Detektif', d: 'Wallpaper hijau tua, meja kayu dengan lampu hijau, stempel & bantalan tinta, papan bukti dengan benang, gantungan topi.', draw: () =>
      room({ floor: ['#57534e', '#4f4b47'], planks: true, wallL: '#1f3d2f', wallR: '#244635' })
      + (MODE.R === true ? '' : box(1.8, 0, 0, 0.15, 0.15, 1.8, '#78350f') + box(5.8, 0, 0, 0.15, 0.15, 1.8, '#78350f'))
      + faceY(1.4, 0.01, 1.8, 4.8, 2.9, '#a16207', EDGE) + faceY(1.6, 0.02, 2.0, 4.4, 2.5, '#d6b88a')
      + [[2, 3.6], [3.4, 2.4], [4.8, 3.8], [3.0, 3.9], [5.2, 2.6]].map(([x, z], i) => faceY(x, 0.03, z - 0.3, 0.9, 0.7, i % 2 ? '#f8fafc' : '#fef3c7') + textY(x + 0.2, 0.04, z, i === 4 ? '⚠️' : '✅', 8, '#000')).join('')
      + `<polyline points="${pts([P(2.4, 0.05, 3.9), P(3.8, 0.05, 2.7), P(5.2, 0.05, 4.1), P(3.4, 0.05, 4.2)])}" stroke="#dc2626" stroke-width="1.4" fill="none"/>`
      + at(0.8, 5.6, 0, '<path d="M0,0 V-70" stroke="#44403c" stroke-width="3"/><path d="M-10,0 h20" stroke="#44403c" stroke-width="3"/><path d="M0,-64 l-10,6 M0,-64 l10,6" stroke="#44403c" stroke-width="2.5"/><ellipse cx="-9" cy="-60" rx="9" ry="4" fill="#374151"/><path d="M-15,-61 L-12,-70 Q-9,-74 -4,-70 L-3,-61 Z" fill="#374151"/>')
      + box(3.6, 2.6, 0, 1.3, 1.2, 0.9, '#7f1d1d') + box(3.6, 2.5, 0.9, 1.3, 0.3, 1.5, '#991b1b')
      + charAt(CH.vera, 4.3, 3.2, 0.2)
      + box(2.4, 4.0, 0, 4.4, 1.4, 1.4, '#6b3e1f')
      + at(3.1, 4.4, 1.4, '<rect x="-1.5" y="-16" width="3" height="15" fill="#a16207"/><path d="M-10,-16 h20 l-3,-8 h-14 z" fill="#15803d"/><circle cy="-10" r="16" fill="rgba(253,224,71,.15)"/>')
      + box(4.0, 4.3, 1.4, 1.0, 0.7, 0.06, '#f8fafc') + box(4.1, 4.4, 1.46, 1.0, 0.7, 0.06, '#fef3c7')
      + at(5.6, 4.6, 1.4, '<rect x="-9" y="-3" width="18" height="5" rx="1" fill="#1f2937"/><rect x="-6" y="-14" width="12" height="9" fill="#7f1d1d"/><circle cy="-17" r="5" fill="#dc2626"/>') },
    { t: 'Lab Pemeriksa', d: 'Ban berjalan membawa berkas di bawah lampu kaca pembesar, lalu masuk ke baki ✅ atau ⚠️.', draw: () =>
      room({ floor: ['#f1f5f9', '#e2e8f0'], wallL: '#c7d2fe', wallR: '#d4dafe' })
      + box(0.6, 2.2, 0, 6.6, 1.0, 0.9, '#64748b', '#334155') + Array.from({ length: 12 }, (_, i) => faceY(0.8 + i * 0.55, 3.21, 0.6, 0.05, 0.3, '#cbd5e1')).join('')
      + [1.2, 2.8, 4.4].map((x, i) => box(x, 2.4, 0.9, 0.8, 0.6, 0.06, '#f8fafc') + box(x + 0.05, 2.45, 0.96, 0.8, 0.6, 0.06, i === 2 ? '#dcfce7' : '#fff')).join('')
      + at(3.2, 1.8, 0, '<path d="M0,0 V-60 L30,-80" stroke="#475569" stroke-width="4" fill="none"/><circle cx="34" cy="-74" r="16" fill="rgba(186,230,253,.45)" stroke="#475569" stroke-width="4"/><circle cx="34" cy="-74" r="24" fill="rgba(255,255,255,.12)"/>')
      + box(6.4, 4.0, 0, 1.2, 1.2, 0.8, '#16a34a') + textY(6.6, 5.21, 0.25, '✅', 12, '#fff') + box(6.4, 5.6, 0, 1.2, 1.2, 0.8, '#f59e0b') + textY(6.6, 6.81, 0.25, '⚠️', 12, '#fff')
      + charAt(CH.vera, 4.6, 4.6, 0)
      + plant(0.6, 6.6, 0) },
    { t: 'Meja Hakim', d: 'Meja tinggi seperti di pengadilan, palu & stempel besar, timbangan keadilan di dinding, rak buku tebal.', draw: () =>
      room({ floor: ['#7f1d1d', '#741b1b'], wallL: '#3b2416', wallR: '#44291a' })
      + textY(3.3, 0.02, 2.6, '⚖️', 52, '#fbbf24') + faceY(1.5, 0.01, 4.4, 5, 0.18, '#b45309')
      + box(0, 4.4, 0, 0.8, 3, 3.8, '#5b3a1e') + [0.5, 1.4, 2.3, 3.1].map((z) => books(0.05, 4.6, z, ['#7f1d1d', '#1e3a8a', '#14532d', '#78350f']) + books(0.05, 5.8, z, ['#1e3a8a', '#7f1d1d', '#713f12'])).join('')
      + charAt(CH.vera, 4.4, 2.6, 1.2)
      + box(2.4, 1.8, 0, 4.6, 1.0, 1.2, '#78350f') + box(2.2, 3.0, 0, 5.0, 1.5, 2.1, '#92400e') + faceY(3.6, 4.51, 0.8, 2.2, 0.7, '#fbbf24') + textY(3.85, 4.52, 1.05, 'PEMERIKSA', 8, '#78350f')
      + at(3.0, 3.4, 2.1, '<rect x="-10" y="-5" width="16" height="7" rx="3" fill="#78350f" transform="rotate(-20)"/><rect x="3" y="-12" width="3" height="14" fill="#a16207" transform="rotate(-20)"/>')
      + at(6.2, 3.6, 2.1, '<rect x="-10" y="-4" width="20" height="6" rx="1" fill="#991b1b"/><rect x="-5" y="-14" width="10" height="10" fill="#7f1d1d"/><circle cy="-17" r="6" fill="#dc2626"/>') },
  ] },
  { name: '🎨 Lukas', role: 'Pelukis: kanvas besar, menggambar sesuai permintaanmu.', opts: [
    { t: 'Atelier Klasik', d: 'Jendela besar bercahaya, penyangga kanvas dengan lukisan matahari terbenam, toples kuas, cipratan cat di lantai.', draw: () =>
      room({ floor: ['#a8a29e', '#9f9893'], planks: true, wallL: '#f5f5f4', wallR: '#ecebea' })
      + windowL(1.4, 1.2, 4.2, 3.6, '#bae6fd')
      + [[3, 5, '#ef4444'], [5.5, 3, '#3b82f6'], [6.4, 6.4, '#facc15'], [2.2, 3.2, '#22c55e'], [4.6, 6.8, '#a855f7']].map(([x, y, c]) => at(x, y, 0, `<ellipse rx="9" ry="4" fill="${c}" opacity=".75"/><circle cx="10" cy="2" r="2" fill="${c}"/>`)).join('')
      + box(6.0, 0.2, 0, 0.25, 1.6, 2.2, '#f8fafc') + box(6.5, 0.3, 0, 0.25, 1.4, 1.8, '#fde68a')
      + at(4.0, 2.6, 0, '<path d="M-20,0 L-6,-96 M20,0 L6,-96 M0,0 L0,-100" stroke="#92400e" stroke-width="3"/><rect x="-30" y="-92" width="60" height="44" fill="#fff" stroke="#92400e" stroke-width="3"/><rect x="-27" y="-89" width="54" height="38" fill="#fdba74"/><circle cx="0" cy="-62" r="10" fill="#f97316"/><rect x="-27" y="-62" width="54" height="11" fill="#7c3aed" opacity=".6"/><path d="M-27,-58 q14,-8 27,0 t27,0" stroke="#4c1d95" fill="none"/><path d="M-28,-48 h56" stroke="#92400e" stroke-width="4"/>')
      + charAt(CH.lukas, 6.2, 3.4, 0)
      + box(5.6, 5.6, 0, 1.3, 1.3, 1.1, '#78350f') + [0, 1, 2].map((i) => at(5.9 + i * 0.35, 6.0 + i * 0.1, 1.1, `<rect x="-4" y="-10" width="8" height="10" rx="2" fill="rgba(186,230,253,.7)"/><path d="M-2,-10 l-2,-10 M1,-10 v-12 M3,-10 l3,-9" stroke="#92400e" stroke-width="1.5"/><circle cx="-4" cy="-20" r="1.8" fill="${['#ef4444', '#3b82f6', '#22c55e'][i]}"/>`)).join('') },
    { t: 'Studio Grafiti', d: 'Dinding bata penuh grafiti warna-warni bertuliskan LUKAS, kaleng semprot, tangga, kanvas besar di dinding.', draw: () =>
      room({ floor: ['#78716c', '#6f6964'], wallL: '#9a3412', wallR: '#a33a16' })
      + Array.from({ length: 10 }, (_, r) => faceX(0.02, 0, 0.5 * r + 0.25, D, 0.04, '#7c2d12') + faceY(0, 0.02, 0.5 * r + 0.25, W, 0.04, '#7c2d12')).join('')
      + textY(1.2, 0.03, 3.4, 'LUKAS', 30, '#facc15', 'stroke="#7c3aed" stroke-width="2"') + faceY(1.3, 0.03, 4.1, 1.2, 0.5, '#22d3ee') + faceY(5.3, 0.03, 1.4, 1.6, 0.7, '#f472b6')
      + textX(0.03, 6.8, 2.2, '★', 40, '#22c55e') + textX(0.03, 3.6, 3.6, '✿', 34, '#38bdf8')
      + faceX(0.04, 1.2, 0.6, 2.2, 1.8, '#fff', EDGE) + faceX(0.05, 1.35, 0.75, 1.9, 1.5, '#f0abfc') + textX(0.06, 3.0, 1.1, '☺', 22, '#7c3aed')
      + at(7, 1.6, 0, '<path d="M-10,0 L-2,-80 M12,0 L18,-80 M-8,-14 h22 M-6,-30 h22 M-4,-46 h22 M-2,-62 h22" stroke="#d6d3d1" stroke-width="3"/>')
      + charAt(CH.lukas, 4.2, 3.6, 0)
      + [['#ef4444', 5.6], ['#3b82f6', 6.0], ['#22c55e', 6.4], ['#facc15', 5.9]].map(([c, x], i) => at(x, 5.6 + i * 0.3, 0, `<rect x="-4" y="-16" width="8" height="16" rx="2" fill="${c}"/><rect x="-2" y="-20" width="4" height="4" fill="#1f2937"/>`)).join('')
      + at(2.6, 6.2, 0, '<ellipse rx="14" ry="5" fill="#a855f7" opacity=".7"/>') },
    { t: 'Studio Digital', d: 'Ruang gelap dengan lampu LED ungu-pink, monitor besar berisi gambar, tablet gambar, ring light, bean bag.', draw: () =>
      room({ floor: ['#1e1b2e', '#231f36'], wallL: '#191427', wallR: '#1d172e', slab: '#0c0a16' })
      + faceX(0.02, 0, 4.7, D, 0.1, '#e879f9') + faceY(0, 0.02, 4.7, W, 0.1, '#a855f7')
      + faceY(1.4, 0.03, 1.8, 5.0, 2.8, '#0f172a', EDGE) + faceY(1.6, 0.04, 2.0, 4.6, 2.4, '#312e81')
      + faceY(1.6, 0.05, 2.0, 4.6, 1.0, '#7c3aed') + textY(3.2, 0.06, 2.6, '🐉', 26, '#fff') + textY(4.9, 0.06, 3.6, '☁', 16, '#f0abfc')
      + at(1.2, 3.0, 0, '<path d="M0,0 V-70" stroke="#94a3b8" stroke-width="2.5"/><circle cy="-80" r="16" fill="none" stroke="#f8fafc" stroke-width="5"/><circle cy="-80" r="26" fill="rgba(255,255,255,.08)"/>')
      + box(3.6, 2.6, 0, 1.3, 1.2, 0.9, '#7c3aed') + box(3.6, 2.5, 0.9, 1.3, 0.3, 1.5, '#6d28d9')
      + charAt(CH.lukas, 4.3, 3.2, 0.2)
      + box(2.4, 4.0, 0, 4.4, 1.4, 1.35, '#27272a') + faceY(2.4, 5.41, 1.2, 4.4, 0.08, '#e879f9')
      + box(3.3, 4.3, 1.35, 1.6, 1.0, 0.1, '#111827') + box(3.4, 4.4, 1.45, 1.4, 0.8, 0.02, '#38bdf8')
      + at(6.6, 6.6, 0, '<ellipse cy="-10" rx="26" ry="14" fill="#db2777"/><ellipse cy="-15" rx="18" ry="8" fill="#ec4899"/>') + plant(7.1, 1, 0) },
  ] },
];

function deskCard(o, tag) {
  return `<div class="card"><svg viewBox="0 0 320 305" xmlns="http://www.w3.org/2000/svg">${o.draw()}</svg><span class="tag">${tag}</span><div class="name">${o.t}</div><div class="desc">${o.d}</div></div>`;
}
