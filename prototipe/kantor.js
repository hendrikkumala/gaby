// Denah kantor tim Gaby: semua ruangan terpilih disambung, + pantry & ruang game.
// Kantor terbuka (x = ke kanan-bawah, y = ke kiri-bawah). Ruangan 8×8, lorong 2,5 di antaranya:
//   [ Rara  ] ░ [ Pandu ] ░ [ Lukas ]     ← belakang (y 0–8)
//   ░░░░░░░░░░░░░ lorong ░░░░░░░░░░░░
//   [ Meri  ] ░ [ GABY  ] ░ [ Vera  ]     ← tengah (y 10,5–18,5)
//   ░░░░░░░░░░░░░ lorong ░░░░░░░░░░░░
//   [  Pantry 13×8 ] ░ [ Ruang Game 13×8 ] ← depan (y 21–29)

const chair = (x, y, c = '#f97316') => box(x, y, 0, 0.7, 0.7, 0.6, c) + box(x, y, 0.6, 0.7, 0.15, 0.7, shade(c, -0.15));

function pantry() {
  return room({ w: 13, d: 8, floor: ['#fde68a', '#f8dc80'], wallL: '#fef3c7', wallR: '#fdf0c4' })
    + windowL(2.2, 1.8, 2.8, 2.2, '#bae6fd')
    // kulkas di dinding kiri
    + box(0, 5.4, 0, 1.2, 1.4, 3.3, '#e2e8f0') + faceX(1.21, 5.6, 2.2, 0.08, 0.7, '#64748b') + faceX(1.21, 5.6, 1.0, 0.08, 0.9, '#64748b') + faceX(1.21, 5.45, 1.9, 1.3, 0.05, '#94a3b8')
    + at(0.6, 6.1, 3.3, '<text text-anchor="middle" font-size="11">🧲</text>')
    // meja dapur menempel ke kaca belakang: mesin kopi, microwave, rak piring
    + box(1.6, 0, 0, 3.8, 1.1, 1.4, '#f8fafc', '#cbd5e1') + [0, 1, 2].map((i) => faceY(1.75 + i * 1.18, 1.11, 0.15, 1.05, 1.05, '#e2e8f0', EDGE)).join('')
    + box(2.0, 0.15, 1.4, 0.9, 0.7, 1.05, '#1f2937') + faceY(2.15, 0.86, 1.95, 0.6, 0.35, '#ef4444') + mug(2.45, 0.95, 1.4, '#fef3c7')
    + box(4.0, 0.15, 1.4, 1.3, 0.8, 0.7, '#94a3b8') + faceY(4.1, 0.96, 1.5, 0.8, 0.5, '#1e293b')

    // papan menu (berkaki kalau tidak menempel di tembok)
    + (MODE.R === true ? '' : box(9.5, 0, 0, 0.12, 0.12, 2.0, '#374151') + box(11.4, 0, 0, 0.12, 0.12, 2.0, '#374151'))
    + faceY(9.2, 0.02, 2.0, 2.4, 2.0, '#1f2937', EDGE) + textY(9.4, 0.03, 3.6, 'MENU HARI INI', 6, '#fde68a') + textY(9.4, 0.03, 3.0, '☕ Kopi susu', 6, '#fff') + textY(9.4, 0.03, 2.5, '🍌 Pisang goreng', 6, '#fff')
    // dispenser air
    + box(10.4, 0.3, 0, 0.8, 0.8, 1.5, '#e2e8f0') + at(10.8, 0.7, 1.5, '<rect x="-6" y="-18" width="12" height="18" rx="5" fill="rgba(56,189,248,.6)"/>')
    // meja makan bundar + kursi + camilan
    + chair(4.0, 3.2) + chair(6.4, 3.0, '#22c55e') + (window.PROTO ? '<!--SLOT-->' : '')
    + box(5.2, 4.4, 0, 0.3, 0.3, 1.1, '#78350f') + at(5.35, 4.55, 1.1, '<ellipse rx="44" ry="22" fill="#a16207"/><ellipse cy="-3" rx="44" ry="22" fill="#ca8a04"/>')
    + at(5.0, 4.4, 1.25, '<ellipse rx="11" ry="4.5" fill="#f8fafc"/><path d="M-7,-2 q3,-6 6,0 M0,-2 q3,-6 6,0" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>') + mug(5.9, 4.7, 1.2, '#38bdf8') + mug(4.7, 5.0, 1.2, '#f472b6') + teapot(5.7, 4.1, 1.2)
    + at(7.4, 5.9, 0, '<rect x="-6" y="-14" width="12" height="14" rx="2" fill="#0ea5e9"/><rect x="-7" y="-15" width="14" height="3" fill="#0369a1"/>') + chair(3.6, 5.6, '#3b82f6')
    + plant(11, 6.8, 0, 1.2);
}

function gameRoom() {
  return room({ w: 13, d: 8, floor: ['#312e81', '#2c2876'], wallL: '#1e1b4b', wallR: '#221f55' })
    + floorQuad(1.4, 2.6, 5.4, 4.6, '#4c1d95') + floorQuad(1.7, 2.9, 4.8, 4.0, '#5b21b6')
    // TV besar + konsol
    + box(1.8, 0.2, 0, 3.8, 0.9, 0.8, '#1f2937') + box(2.0, 0.4, 0.8, 3.4, 0.15, 2.0, '#0f172a')
    + faceY(2.1, 0.56, 0.9, 3.2, 1.8, '#0ea5e9') + faceY(2.1, 0.57, 0.9, 3.2, 0.4, '#16a34a') + faceY(2.9, 0.58, 1.3, 0.4, 0.4, '#facc15') + faceY(4.2, 0.58, 1.3, 0.5, 0.7, '#ef4444') + textY(2.4, 0.58, 2.35, '★', 12, '#fde047')
    + box(3.0, 0.4, 0.8, 0.6, 0.4, 0.15, '#e5e7eb')
    // sofa menghadap TV
    + box(1.8, 4.6, 0, 3.8, 0.4, 1.3, '#be185d') + box(1.8, 3.6, 0, 3.8, 1.0, 0.6, '#db2777') + box(1.6, 3.6, 0, 0.3, 1.4, 0.9, '#be185d') + box(5.5, 3.6, 0, 0.3, 1.4, 0.9, '#be185d')
    + at(3.0, 2.6, 0, '<rect x="-7" y="-4" width="14" height="6" rx="3" fill="#e5e7eb"/><circle cx="-3" cy="-1" r="1.4" fill="#ef4444"/><circle cx="3" cy="-1" r="1.4" fill="#3b82f6"/>')
    // meja ping-pong
    + box(7.2, 2.0, 0.7, 3.6, 2.0, 0.15, '#15803d', '#16a34a') + [7.4, 10.5].map((x) => box(x, 2.2, 0, 0.15, 0.15, 0.7, '#1f2937') + box(x, 3.7, 0, 0.15, 0.15, 0.7, '#1f2937')).join('')
    + faceX(9.0, 2.0, 0.85, 2.0, 0.3, 'rgba(255,255,255,.75)') + at(9.0, 3.0, 0.85, '<path d="M-30,0 L30,0" stroke="#fff" stroke-width="1" opacity=".0"/>')
    + at(8.0, 2.5, 0.85, '<circle cx="0" cy="-2" r="5" fill="#dc2626"/><rect x="-1" y="2" width="2" height="6" fill="#78350f"/>') + at(10.2, 3.6, 0.85, '<circle cx="0" cy="-2" r="5" fill="#111827"/><rect x="-1" y="2" width="2" height="6" fill="#78350f"/>') + at(9.6, 2.6, 1.6, '<circle r="2.4" fill="#fff"/>')
    // mesin arcade
    + box(10.6, 0.3, 0, 1.1, 1.0, 2.8, '#7c3aed') + faceY(10.7, 1.31, 1.5, 0.9, 0.8, '#22d3ee') + textY(10.75, 1.32, 1.9, '👾', 9, '#fff') + faceY(10.7, 1.31, 2.4, 0.9, 0.3, '#f472b6')
    // tulisan neon & bean bag
    + box(2.0, 0.05, 0, 0.12, 0.12, 3.0, '#334155') + box(5.3, 0.05, 0, 0.12, 0.12, 3.0, '#334155') + faceY(1.8, 0.18, 2.95, 3.8, 0.9, '#1e1b4b', 'stroke="#c026d3"') + textY(2.15, 0.19, 3.2, 'GAME ON', 13, '#f0abfc')
    + at(8.6, 6.4, 0, '<ellipse cy="-9" rx="24" ry="13" fill="#f59e0b"/><ellipse cy="-14" rx="16" ry="7" fill="#fbbf24"/>') + at(10.6, 5.6, 0, '<ellipse cy="-9" rx="22" ry="12" fill="#22c55e"/><ellipse cy="-13" rx="15" ry="6" fill="#4ade80"/>');
}

const pickDesk = (who, i) => DESKS.find((m) => m.name.includes(who)).opts[i];

const C0 = 0, C1 = 10.5, C2 = 21; // posisi kolom/baris (ruangan 8 + lorong 2,5)
const SIZE = 29;
// wall = dinding belakang ruangan; front = sekat depan (menghadap lorong). true = tembok tinggi, 'low' = kaca rendah berpintu.
const OFFICE = [
  { key: 'rara', label: '🔎 Rara', tag: [7.3, 5.4, 5.4], off: [C0, C0], wall: { L: true, R: true }, front: { Y: 'low', X: 'low' }, draw: () => pickDesk('Rara', 0).draw() },
  { key: 'pandu', label: '🗺️ Pandu', tag: [3.4, 2.4, 5.6], off: [C1, C0], wall: { L: 'low', R: true }, front: { Y: 'low', X: 'low' }, draw: () => pickDesk('Pandu', 0).draw() },
  { key: 'meri', label: '📝 Meri', tag: [2.6, 2.2, 5.4], off: [C0, C1], wall: { L: true, R: 'low' }, front: { Y: 'low', X: 'low' }, draw: () => pickDesk('Meri', 2).draw() },
  { junction: [8, 8] },
  { key: 'lukas', label: '🎨 Lukas', tag: [6.2, 3.4, 5.6], off: [C2, C0], wall: { L: 'low', R: true }, front: { Y: 'low' }, draw: () => pickDesk('Lukas', 0).draw() },
  { key: 'gaby', label: '👑 Gaby', tag: [4.6, 6.6, 0.05], off: [C1, C1], wall: { L: 'low', R: 'low' }, front: { Y: 'low', X: 'low' }, draw: () => pickDesk('Gaby', 1).draw() },
  { junction: [18.5, 8] },
  { key: 'vera', label: '✅ Vera', tag: [4.3, 3.2, 6.0], off: [C2, C1], wall: { L: 'low', R: 'low' }, front: { Y: 'low' }, draw: () => pickDesk('Vera', 0).draw() },
  { junction: [8, 18.5] },
  { junction: [18.5, 18.5] },
  { key: 'pantry', label: '🍔 Pantry', tag: [9.2, 5.6, 0.05], off: [0, C2], size: [13, 8], wall: { L: true, R: 'low' }, front: { X: 'low' }, draw: pantry },
  { key: 'game', label: '🎮 Ruang Game', tag: [4.0, 6.9, 0.05], off: [16, C2], size: [13, 8], wall: { L: 'low', R: 'low' }, front: {}, draw: gameRoom },
];

// Lantai & dinding luar kantor (lorong berlantai kayu terang dengan jalur jalan).
function officeShell() {
  OFF = [0, 0];
  // Lantai lorong: papan kayu hangat (bukan jalan raya 😄) + karpet bundar kecil di tiap persimpangan.
  let s = box(0, 0, -0.6, SIZE, SIZE, 0.6, '#3b2a1c') + floorQuad(0, 0, SIZE, SIZE, '#c49a6c');
  for (let j = 0; j < SIZE * 2; j++) {
    const off = (j % 3) * 1.3;
    s += floorQuad(0, j / 2, SIZE, 0.5, j % 2 ? '#c49a6c' : '#bb9064', 'stroke="#a67c52" stroke-width=".35"');
    for (let x = off + 2.4; x < SIZE; x += 4) s += `<path d="M${P(x, j / 2).join(',')} L${P(x, j / 2 + 0.5).join(',')}" stroke="#a67c52" stroke-width=".5"/>`;
  }
  for (const [x, y] of [[9.25, 9.25], [19.75, 9.25], [9.25, 19.75], [19.75, 19.75]]) {
    s += at(x, y, 0, '<ellipse rx="34" ry="19" fill="#0f766e" opacity=".85"/><ellipse rx="27" ry="15" fill="none" stroke="#5eead4" stroke-width="1.5" opacity=".7"/>');
  }
  // dinding luar + jendela di bagian lorong + papan nama kantor
  s += faceX(0, 0, 0, SIZE, H, '#334155', EDGE) + faceY(0, 0, 0, SIZE, H, '#3b4a63', EDGE);
  for (const c of [8.25, 18.75]) {
    s += faceX(0.01, c, 1.6, 2, 2.8, '#e2e8f0') + faceX(0.02, c + 0.15, 1.75, 1.7, 2.5, '#7dd3fc');
    s += faceY(c, 0.01, 1.6, 2, 2.8, '#e2e8f0') + faceY(c + 0.15, 0.02, 1.75, 1.7, 2.5, '#7dd3fc');
  }
  return s;
}

function junction([x, y]) {
  OFF = [0, 0];
  return plant(x + 0.15, y + 0.15, 0, 1.2) + at(x + 2.15, y + 2.15, 0, '<rect x="-5" y="-22" width="10" height="22" rx="3" fill="#e2e8f0"/><rect x="-4" y="-34" width="8" height="12" rx="4" fill="rgba(56,189,248,.65)"/>');
}

function frontParts(w, d, f) {
  return (f.Y === 'low' ? lowY(d, w) : '') + (f.X === 'low' ? lowX(w, d) : '');
}

function officeSvg() {
  setView(24, 632, 200);
  MODE = { L: true, R: true, combined: true };
  let s = officeShell();
  for (const r of OFFICE) {
    if (r.junction) { s += junction(r.junction); continue; }
    OFF = r.off;
    MODE = { ...r.wall, combined: true };
    const [w, d] = r.size || [8, 8];
    s += r.draw() + frontParts(w, d, r.front);
  }
  // papan nama melayang di atas kepala karakter (pantry & ruang game: di lantai)
  for (const r of OFFICE) {
    if (r.junction) continue;
    OFF = r.off;
    const [lx, ly, lz] = r.tag;
    s += at(lx, ly, lz, `<rect x="-38" y="-13" width="76" height="22" rx="11" fill="rgba(2,6,23,.78)" stroke="#38bdf8" stroke-width="1"/><text y="3" text-anchor="middle" font-size="11" font-weight="800" fill="#e0f2fe" font-family="system-ui">${r.label}</text>`, 1 / K * 1.15);
  }
  OFF = [0, 0];
  MODE = { L: true, R: true, combined: false };
  setView(20, 160, 125);
  return `<svg viewBox="0 0 1264 920" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// Prototipe: kantor dipotong per ruangan (belakang / tempat karakter / depan) supaya karakter bisa
// diselipkan di urutan yang benar saat berjalan. Tempat duduk dicatat di window.PROTO_SEATS.
function officeLayers() {
  setView(24, 632, 200);
  window.PROTO_SEATS = [];
  MODE = { L: true, R: true, combined: true };
  const shell = officeShell();
  const items = [];
  for (const r of OFFICE) {
    if (r.junction) {
      const [x, y] = r.junction;
      items.push({ kind: 'junction', box: [x, y, x + 2.5, y + 2.5], svg: junction(r.junction) });
      continue;
    }
    OFF = r.off;
    MODE = { ...r.wall, combined: true };
    const [w, d] = r.size || [8, 8];
    const parts = r.draw().split('<!--SLOT-->');
    items.push({ kind: 'room', key: r.key, label: r.label, tag: r.tag, off: r.off, size: [w, d], wall: r.wall, front: r.front,
      box: [r.off[0], r.off[1], r.off[0] + w, r.off[1] + d], back: parts[0], front2: parts.slice(1).join('') + frontParts(w, d, r.front) });
  }
  OFF = [0, 0];
  MODE = { L: true, R: true, combined: false };
  return { shell, items };
}
