// GAMBAR RUANG KERJA GABY (karakter 2.5D, meja, denah kantor) — modul ES, dimuat hanya saat Ruang Kerja dibuka.
// Disalin dari prototipe/karakter.js + karakter25.js + meja.js + kantor.js (sumber sketsa & prototipe).
// Kalau mengubah gambar, ubah di sini; prototipe/ hanya arsip uji coba.
/* eslint-disable */
window.PROTO = true; // mode Ruang Kerja: kursi karakter dicatat (PROTO_SEATS), karakter digambar terpisah oleh office.js

// ===================== karakter.js =====================
// Gambar karakter tim Gaby (SVG). Dipakai karakter.html & meja.html.
// ---------- warna ----------
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))));
  return '#' + ch.map((x) => x.toString(16).padStart(2, '0')).join('');
}
let uid = 0;

// ---------- bagian tubuh ----------
const HEAD = { cx: 100, cy: 94, rx: 56, ry: 52 };

function hairBack(style, c) {
  const d = shade(c, -0.15);
  switch (style) {
    case 'long': return `<path d="M38,98 C28,12 172,12 162,98 L168,198 Q158,214 146,202 Q132,214 118,204 L82,204 Q68,214 54,202 Q42,214 32,198 Z" fill="${d}"/>`;
    case 'bob': return `<path d="M36,102 C26,12 174,12 164,102 L166,142 Q150,152 136,142 L64,142 Q50,152 34,142 Z" fill="${d}"/>`;
    case 'pony': return `<path d="M150,52 C206,48 204,136 176,178 C188,126 172,86 144,74 Z" fill="${d}"/><path d="M38,100 C28,12 172,12 162,100 Z" fill="${d}"/>`;
    case 'bun': return `<circle cx="100" cy="30" r="22" fill="${d}"/><path d="M38,100 C28,12 172,12 162,100 Z" fill="${d}"/>`;
    case 'twin': return `<path d="M50,66 C8,76 10,166 30,196 C30,152 42,112 62,88 Z" fill="${d}"/><path d="M150,66 C192,76 190,166 170,196 C170,152 158,112 138,88 Z" fill="${d}"/><path d="M38,100 C28,12 172,12 162,100 Z" fill="${d}"/>`;
    case 'curly': {
      let s = '';
      for (let a = 150; a <= 390; a += 20) {
        const r = (a * Math.PI) / 180;
        s += `<circle cx="${100 + 60 * Math.cos(r)}" cy="${92 + 56 * Math.sin(r)}" r="19" fill="${d}"/>`;
      }
      return s + `<circle cx="44" cy="128" r="16" fill="${d}"/><circle cx="156" cy="128" r="16" fill="${d}"/>`;
    }
    case 'short': case 'messy': case 'neat': return `<path d="M40,104 C30,14 170,14 160,104 Z" fill="${d}"/>`;
    default: return '';
  }
}

function hairFront(style, c) {
  const hl = shade(c, 0.25);
  const shine = `<path d="M70,46 Q86,38 104,40" stroke="${hl}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/>`;
  switch (style) {
    case 'long': return `<path d="M40,110 C32,14 168,14 160,110 C154,82 130,62 100,60 C70,62 46,82 40,110 Z" fill="${c}"/><path d="M42,100 Q34,134 46,156 L56,154 Q48,126 54,96 Z" fill="${c}"/><path d="M158,100 Q166,134 154,156 L144,154 Q152,126 146,96 Z" fill="${c}"/>${shine}`;
    case 'bob': return `<path d="M38,104 C30,14 170,14 162,104 C156,84 150,76 140,72 C120,76 88,84 68,94 C58,98 46,100 38,104 Z" fill="${c}"/>${shine}`;
    case 'pony': case 'bun': case 'twin': return `<path d="M40,100 C32,14 168,14 160,100 C154,84 148,76 138,72 C132,82 122,84 114,74 C106,84 94,84 86,74 C78,84 68,84 62,72 C52,76 46,86 40,100 Z" fill="${c}"/>${shine}`;
    case 'curly': {
      let s = `<path d="M42,96 C34,18 166,18 158,96 Z" fill="${c}"/>`;
      for (let x = 50; x <= 150; x += 16) s += `<circle cx="${x}" cy="${68 + Math.abs(x - 100) * 0.12}" r="11" fill="${c}"/>`;
      return s + shine;
    }
    case 'messy': return `<path d="M42,98 C34,14 166,14 158,98 C152,80 144,74 134,74 L128,62 L120,76 L108,60 L100,76 L88,60 L82,76 L70,64 L64,78 C54,80 46,88 42,98 Z" fill="${c}"/><path d="M76,44 L70,22 L88,36 L96,16 L106,34 L120,18 L122,38 L140,30 L130,48 Z" fill="${c}"/>${shine}`;
    case 'neat': return `<path d="M40,100 C32,14 168,14 160,100 C158,84 152,72 142,64 C120,68 96,62 76,54 C68,68 54,78 40,100 Z" fill="${c}"/><path d="M76,54 Q70,40 84,32" stroke="${shade(c, -0.3)}" stroke-width="2" fill="none"/>${shine}`;
    case 'short': return `<path d="M40,98 C32,14 168,14 160,98 C152,82 140,74 126,74 C112,80 96,70 84,74 C66,74 50,84 40,98 Z" fill="${c}"/>${shine}`;
    default: return '';
  }
}

function hat(kind, c) {
  const d = shade(c, -0.25);
  switch (kind) {
    case 'beret': return `<ellipse cx="110" cy="44" rx="54" ry="17" transform="rotate(-12 110 44)" fill="${c}"/><ellipse cx="110" cy="48" rx="48" ry="8" transform="rotate(-12 110 48)" fill="${d}" opacity=".5"/><circle cx="114" cy="27" r="4" fill="${d}"/>`;
    case 'safari': return `<ellipse cx="100" cy="58" rx="70" ry="13" fill="${d}"/><path d="M54,58 C54,8 146,8 146,58 Z" fill="${c}"/><rect x="54" y="46" width="92" height="9" fill="${shade(c, -0.45)}"/>`;
    case 'cap': return `<path d="M46,66 C44,6 156,6 154,66 Z" fill="${c}"/><ellipse cx="100" cy="66" rx="58" ry="10" fill="${d}"/><circle cx="100" cy="18" r="4" fill="${d}"/><path d="M78,40 h44" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
    case 'fedora': return `<ellipse cx="100" cy="54" rx="68" ry="13" fill="${d}"/><path d="M60,54 L66,20 Q100,8 134,20 L140,54 Z" fill="${c}"/><path d="M84,16 Q100,26 116,16" stroke="${d}" stroke-width="3" fill="none"/><rect x="61" y="42" width="78" height="9" fill="${shade(c, -0.5)}"/>`;
    default: return '';
  }
}

function eyes(kind, color, fem) {
  const one = (x, s) => {
    if (kind === 'happy') return `<path d="M${x - 9},108 Q${x},96 ${x + 9},108" stroke="#2b2035" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    let e = `<ellipse cx="${x}" cy="104" rx="9" ry="11.5" fill="#2b2035"/><ellipse cx="${x}" cy="106" rx="6.5" ry="8.5" fill="${color}"/><ellipse cx="${x}" cy="108" rx="3.6" ry="4.6" fill="${shade(color, -0.6)}"/>`;
    e += `<circle cx="${x - 3.2}" cy="99.5" r="3.4" fill="#fff"/><circle cx="${x + 3}" cy="110" r="1.6" fill="#fff" opacity=".85"/>`;
    if (kind === 'sparkle') e += `<path d="M${x + 4},97 l1.2,3 3,1.2 -3,1.2 -1.2,3 -1.2,-3 -3,-1.2 3,-1.2 z" fill="#fff"/>`;
    if (kind === 'calm') e += `<path d="M${x - 11},91 H${x + 11} V101 Q${x},96 ${x - 11},101 Z" fill="var(--skin)"/><path d="M${x - 10},100.5 Q${x},95.5 ${x + 10},100.5" stroke="#2b2035" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (fem) e += `<path d="M${x + 8 * s},96 l${5 * s},-4" stroke="#2b2035" stroke-width="2.4" stroke-linecap="round"/>`;
    return e;
  };
  return one(80, -1) + one(120, 1);
}

function mouth(kind) {
  switch (kind) {
    case 'open': return `<path d="M92,120 Q100,133 108,120 Z" fill="#a8434e"/><path d="M95,126 Q100,131 105,126 Z" fill="#f08a95"/>`;
    case 'cat': return `<path d="M91,121 Q95.5,126 100,121 Q104.5,126 109,121" stroke="#7a3b3b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    case 'grin': return `<path d="M90,119 Q100,131 110,119 Z" fill="#fff" stroke="#7a3b3b" stroke-width="2"/>`;
    default: return `<path d="M93,121 Q100,127 107,121" stroke="#7a3b3b" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  }
}

function glasses(kind) {
  if (kind === 'round') return `<circle cx="80" cy="105" r="14" fill="rgba(255,255,255,.12)" stroke="#3b2f2f" stroke-width="3"/><circle cx="120" cy="105" r="14" fill="rgba(255,255,255,.12)" stroke="#3b2f2f" stroke-width="3"/><path d="M94,103 Q100,99 106,103" stroke="#3b2f2f" stroke-width="3" fill="none"/>`;
  if (kind === 'square') return `<rect x="65" y="94" width="30" height="22" rx="5" fill="rgba(255,255,255,.12)" stroke="#1e293b" stroke-width="3"/><rect x="105" y="94" width="30" height="22" rx="5" fill="rgba(255,255,255,.12)" stroke="#1e293b" stroke-width="3"/><path d="M95,103 H105" stroke="#1e293b" stroke-width="3"/>`;
  if (kind === 'visor') return `<rect x="58" y="92" width="84" height="24" rx="12" fill="rgba(34,211,238,.35)" stroke="#22d3ee" stroke-width="2.5"/><path d="M66,100 H96" stroke="#a5f3fc" stroke-width="2" opacity=".8"/><circle cx="134" cy="104" r="3" fill="#22d3ee"/>`;
  return '';
}

function head(o) {
  const skin = o.skin;
  const ears = o.hijab ? '' : `<circle cx="44" cy="102" r="10" fill="${shade(skin, -0.08)}"/><circle cx="156" cy="102" r="10" fill="${shade(skin, -0.08)}"/>`;
  return `${ears}
    <ellipse cx="${HEAD.cx}" cy="${HEAD.cy}" rx="${o.hijab ? 47 : HEAD.rx}" ry="${o.hijab ? 49 : HEAD.ry}" fill="url(#sk${o.id})"/>`;
}

// ---------- badan ----------
function body(o) {
  const c = o.outfit, c2 = o.outfit2 || '#ffffff';
  const torso = o.style === 'coat' ? 'M64,162 Q100,150 136,162 L148,234 Q100,242 52,234 Z'
    : o.style === 'dress' ? 'M70,162 Q100,150 130,162 L150,228 Q100,238 50,228 Z'
    : 'M68,162 Q100,150 132,162 L140,214 Q100,224 60,214 Z';
  let s = `<path d="${torso}" fill="url(#of${o.id})"/>`;
  switch (o.style) {
    case 'blazer': s += `<path d="M88,156 L100,190 L112,156 Z" fill="${c2}"/><path d="M86,156 L100,196 L92,212 M114,156 L100,196 L108,212" stroke="${shade(c, -0.35)}" stroke-width="2.5" fill="none"/><circle cx="100" cy="204" r="2.6" fill="${shade(c, 0.4)}"/>`; break;
    case 'cardigan': s += `<path d="M92,156 L100,214 L108,156 Z" fill="${c2}"/><circle cx="96" cy="182" r="2.4" fill="${shade(c, -0.4)}"/><circle cx="96" cy="198" r="2.4" fill="${shade(c, -0.4)}"/>`; break;
    case 'labcoat': s += `<path d="M90,156 L100,182 L110,156 Z" fill="${c2}"/><path d="M100,182 V216" stroke="#cbd5e1" stroke-width="2"/><rect x="108" y="192" width="14" height="10" rx="2" fill="none" stroke="#cbd5e1" stroke-width="2"/><path d="M112,190 v6" stroke="#2563eb" stroke-width="2.5"/>`; break;
    case 'hoodie': s += `<path d="M78,160 Q100,176 122,160" stroke="${shade(c, -0.3)}" stroke-width="5" fill="none"/><path d="M94,168 v18 M106,168 v18" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M80,196 Q100,190 120,196 L118,212 Q100,216 82,212 Z" fill="${shade(c, -0.15)}"/>`; break;
    case 'sweater': s += `<path d="M84,158 Q100,170 116,158" stroke="${shade(c, -0.25)}" stroke-width="5" fill="none"/><path d="M62,208 Q100,218 138,208" stroke="${shade(c, -0.2)}" stroke-width="6" fill="none"/><path d="M76,180 h48 M74,192 h52" stroke="${shade(c, -0.12)}" stroke-width="2" stroke-dasharray="3 4"/>`; break;
    case 'vest': s = `<path d="${torso}" fill="${c2}"/><path d="M68,162 Q80,156 90,156 L96,214 Q76,220 60,214 Z M132,162 Q120,156 110,156 L104,214 Q124,220 140,214 Z" fill="url(#of${o.id})"/><rect x="72" y="184" width="14" height="10" rx="2" fill="${shade(c, -0.25)}"/><rect x="114" y="184" width="14" height="10" rx="2" fill="${shade(c, -0.25)}"/>`; break;
    case 'shirt': s += `<path d="M90,156 L100,166 L110,156" stroke="${shade(c, -0.3)}" stroke-width="2.5" fill="none"/><path d="M100,164 L94,172 L100,206 L106,172 Z" fill="${c2}"/>`; break;
    case 'overall': s = `<path d="${torso}" fill="${c2}"/><path d="M76,186 H124 L138,214 Q100,224 62,214 Z" fill="url(#of${o.id})"/><rect x="82" y="168" width="36" height="22" rx="4" fill="url(#of${o.id})"/><path d="M82,170 L74,158 M118,170 L126,158" stroke="${c}" stroke-width="5"/><circle cx="86" cy="174" r="2.5" fill="#fde68a"/><circle cx="114" cy="174" r="2.5" fill="#fde68a"/>`; break;
    case 'apron': s = `<path d="${torso}" fill="${c2}"/><path d="M68,170 h64 M66,184 h68 M64,198 h72" stroke="${shade(c2, -0.3)}" stroke-width="5"/><path d="M80,166 H120 L126,216 Q100,222 74,216 Z" fill="url(#of${o.id})"/><circle cx="92" cy="186" r="4" fill="#ef4444"/><circle cx="108" cy="198" r="3.5" fill="#3b82f6"/><circle cx="104" cy="178" r="3" fill="#facc15"/>`; break;
    case 'stripe': s += `<path d="M66,176 h68 M64,190 h72 M62,204 h76" stroke="${c2}" stroke-width="5"/>`; break;
    case 'coat': s += `<path d="M86,156 L100,184 L114,156 Z" fill="${c2}"/><path d="M100,184 V238" stroke="${shade(c, -0.3)}" stroke-width="2.5"/><rect x="58" y="202" width="84" height="8" fill="${shade(c, -0.35)}"/><rect x="94" y="200" width="12" height="12" rx="2" fill="none" stroke="#fbbf24" stroke-width="2"/><circle cx="108" cy="176" r="2.4" fill="${shade(c, -0.4)}"/><circle cx="108" cy="190" r="2.4" fill="${shade(c, -0.4)}"/>`; break;
    case 'dress': s += `<path d="M84,158 Q100,168 116,158" stroke="${c2}" stroke-width="4" fill="none"/><path d="M58,206 Q100,216 142,206" stroke="${c2}" stroke-width="4" fill="none"/>`; break;
    case 'tunic': s += `<path d="M100,170 V220" stroke="${shade(c, -0.25)}" stroke-width="2"/><circle cx="100" cy="182" r="2.4" fill="${c2}"/><circle cx="100" cy="196" r="2.4" fill="${c2}"/><path d="M60,212 Q100,222 140,212" stroke="${c2}" stroke-width="4" fill="none"/>`; break;
  }
  if (o.badge) s += `<g transform="translate(118 176)"><path d="M0,4 Q-7,-3 -12,2 Q-7,2 0,8 Q7,2 12,2 Q7,-3 0,4 Z" fill="#7dd3fc"/><circle cx="0" cy="5" r="1.6" fill="#e0f2fe"/></g>`;
  return s;
}

function legs(o) {
  if (o.style === 'coat') return `<rect x="84" y="226" width="13" height="16" rx="5" fill="${o.pants}"/><rect x="103" y="226" width="13" height="16" rx="5" fill="${o.pants}"/><ellipse cx="89" cy="243" rx="11" ry="6" fill="${o.shoes}"/><ellipse cx="111" cy="243" rx="11" ry="6" fill="${o.shoes}"/>`;
  const top = o.style === 'dress' ? 222 : 206;
  const c = o.style === 'dress' ? (o.pants || o.skin) : o.pants;
  return `<rect x="84" y="${top}" width="13" height="${242 - top}" rx="6" fill="${c}"/><rect x="103" y="${top}" width="13" height="${242 - top}" rx="6" fill="${c}"/><ellipse cx="89" cy="243" rx="11" ry="6" fill="${o.shoes}"/><ellipse cx="111" cy="243" rx="11" ry="6" fill="${o.shoes}"/>`;
}

// ---------- barang yang dipegang (posisi tangan ikut barangnya) ----------
const ITEMS = {
  mic: { L: [60, 206], R: [128, 178], draw: () => `<rect x="123" y="146" width="9" height="36" rx="4" fill="#27272a"/><circle cx="127.5" cy="140" r="11" fill="#9ca3af"/><path d="M118,138 h19 M120,143 h15 M122,134 h11" stroke="#6b7280" stroke-width="1.6"/><circle cx="124" cy="136" r="3" fill="#fff" opacity=".6"/>` },
  teacup: { L: [60, 206], R: [124, 194], draw: () => `<ellipse cx="124" cy="196" rx="18" ry="4.5" fill="#f1f5f9"/><path d="M110,178 H138 Q137,196 124,196 Q111,196 110,178 Z" fill="#fef3c7" stroke="#d6b88a" stroke-width="1.5"/><path d="M138,182 q8,2 1,10" stroke="#d6b88a" stroke-width="3" fill="none"/><ellipse cx="124" cy="179" rx="13" ry="3" fill="#b45309"/><path d="M118,170 q-4,-6 0,-11 M126,170 q-4,-6 0,-11" stroke="#e2e8f0" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/><circle cx="118" cy="186" r="3" fill="#86efac"/>` },
  book: { L: [76, 196], R: [124, 196], draw: () => `<path d="M100,180 Q86,172 72,176 L74,206 Q88,202 100,210 Z" fill="#fff7ed" stroke="#b45309" stroke-width="2"/><path d="M100,180 Q114,172 128,176 L126,206 Q112,202 100,210 Z" fill="#fff7ed" stroke="#b45309" stroke-width="2"/><path d="M80,184 h12 M80,190 h12 M80,196 h10 M108,184 h12 M108,190 h12 M108,196 h9" stroke="#cbd5e1" stroke-width="1.6"/>` },
  folder: { L: [80, 200], R: [120, 200], draw: () => `<rect x="80" y="174" width="44" height="6" rx="1" fill="#fff"/><path d="M76,178 h16 l4,-6 h10 l4,6 h18 v32 h-52 Z" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/><rect x="84" y="190" width="20" height="5" rx="2" fill="#fde68a"/>` },
  tablet: { L: [78, 198], R: [124, 190], draw: () => `<rect x="74" y="172" width="52" height="38" rx="5" fill="#1e293b"/><rect x="78" y="176" width="44" height="30" rx="3" fill="#0ea5e9"/><path d="M82,200 l8,-8 6,5 10,-12 10,8" stroke="#e0f2fe" stroke-width="2" fill="none"/><circle cx="112" cy="184" r="4" fill="#fde047"/><path d="M126,192 L142,168" stroke="#f472b6" stroke-width="3.5" stroke-linecap="round"/>` },
  clipboard: { L: [80, 206], R: [120, 206], draw: () => `<rect x="78" y="166" width="44" height="50" rx="4" fill="#a16207"/><rect x="83" y="172" width="34" height="40" rx="2" fill="#fff"/><rect x="90" y="162" width="20" height="8" rx="3" fill="#94a3b8"/><path d="M87,182 l3,3 5,-6 M87,194 l3,3 5,-6 M87,206 l3,3 5,-6" stroke="#16a34a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M99,182 h13 M99,194 h13 M99,206 h11" stroke="#94a3b8" stroke-width="2"/>` },
  compass: { L: [60, 206], R: [124, 194], draw: () => `<circle cx="130" cy="186" r="15" fill="#d4a017" stroke="#92400e" stroke-width="2"/><circle cx="130" cy="186" r="11" fill="#fff8e1"/><path d="M130,176 L133,186 L130,196 L127,186 Z" fill="#ef4444"/><path d="M130,186 L133,186 L130,196 L127,186 Z" fill="#3b82f6"/><circle cx="130" cy="186" r="2" fill="#1f2937"/><circle cx="130" cy="170" r="3" fill="none" stroke="#92400e" stroke-width="2"/>` },
  map: { L: [70, 194], R: [130, 194], draw: () => `<rect x="70" y="180" width="60" height="28" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><rect x="64" y="178" width="9" height="32" rx="4" fill="#d97706"/><rect x="127" y="178" width="9" height="32" rx="4" fill="#d97706"/><path d="M78,202 Q90,186 100,196 T122,186" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 3" fill="none"/><path d="M118,182 l4,4 m0,-4 l-4,4" stroke="#ef4444" stroke-width="2.2"/>` },
  magnifier: { L: [60, 206], R: [132, 188], draw: () => `<path d="M134,184 L144,166" stroke="#78350f" stroke-width="6" stroke-linecap="round"/><circle cx="150" cy="152" r="16" fill="rgba(186,230,253,.45)" stroke="#b45309" stroke-width="5"/><path d="M142,146 q4,-6 10,-6" stroke="#fff" stroke-width="2.5" fill="none" opacity=".8" stroke-linecap="round"/>` },
  stamp: { L: [60, 206], R: [124, 182], draw: () => `<circle cx="124" cy="170" r="8" fill="#dc2626"/><rect x="120" y="176" width="8" height="10" fill="#7f1d1d"/><rect x="110" y="186" width="28" height="10" rx="2" fill="#991b1b"/><g transform="translate(70 196)"><rect width="30" height="20" rx="2" fill="#fff"/><circle cx="15" cy="10" r="7" fill="none" stroke="#16a34a" stroke-width="2"/><path d="M11,10 l3,3 5,-6" stroke="#16a34a" stroke-width="2" fill="none"/></g>` },
  brush: { L: [60, 206], R: [130, 186], draw: () => `<path d="M126,198 L152,150" stroke="#92400e" stroke-width="5" stroke-linecap="round"/><path d="M150,152 L156,140" stroke="#cbd5e1" stroke-width="7"/><path d="M153,144 Q160,128 162,134 Q164,142 156,146 Z" fill="#ef4444"/>` },
  palette: { L: [76, 192], R: [126, 186], draw: () => `<path d="M48,190 C46,170 80,164 92,178 C98,186 88,190 86,196 C84,204 92,206 86,212 C74,220 50,210 48,190 Z" fill="#e7c9a0" stroke="#a16207" stroke-width="2"/><circle cx="60" cy="182" r="4.5" fill="#ef4444"/><circle cx="72" cy="176" r="4.5" fill="#facc15"/><circle cx="84" cy="180" r="4.5" fill="#22c55e"/><circle cx="58" cy="198" r="4.5" fill="#3b82f6"/><circle cx="70" cy="206" r="4.5" fill="#a855f7"/><path d="M122,198 L146,158" stroke="#92400e" stroke-width="4" stroke-linecap="round"/><path d="M145,160 Q150,146 152,150 Q153,158 147,162 Z" fill="#3b82f6"/>` },
};

function arms(o, it) {
  const sleeve = o.sleeve || o.outfit;
  const [lx, ly] = it ? it.L : [60, 206];
  const [rx, ry] = it ? it.R : [140, 206];
  return {
    back: `<path d="M74,168 L${lx},${ly}" stroke="${shade(sleeve, -0.1)}" stroke-width="15" stroke-linecap="round"/><path d="M126,168 L${rx},${ry}" stroke="${shade(sleeve, -0.1)}" stroke-width="15" stroke-linecap="round"/>`,
    hands: `<circle cx="${lx}" cy="${ly}" r="8" fill="${o.skin}"/><circle cx="${rx}" cy="${ry}" r="8" fill="${o.skin}"/>`,
  };
}

function extras(o) {
  let s = '';
  const x = o.extras || [];
  if (x.includes('freckles')) s += `<g fill="#c2410c" opacity=".45"><circle cx="70" cy="116" r="1.4"/><circle cx="75" cy="119" r="1.4"/><circle cx="66" cy="120" r="1.4"/><circle cx="130" cy="116" r="1.4"/><circle cx="125" cy="119" r="1.4"/><circle cx="134" cy="120" r="1.4"/></g>`;
  if (x.includes('earrings')) s += `<circle cx="44" cy="116" r="3.2" fill="#fbbf24"/><circle cx="156" cy="116" r="3.2" fill="#fbbf24"/>`;
  return s;
}
function topExtras(o) {
  let s = '';
  const x = o.extras || [];
  if (x.includes('clip')) s += `<path d="M138,64 l3,7 7,1 -5,5 1,7 -6,-3 -6,3 1,-7 -5,-5 7,-1 z" fill="#fde047" stroke="#f59e0b" stroke-width="1"/>`;
  if (x.includes('flower')) s += `<g transform="translate(140 68)"><circle r="5" cx="0" cy="-6" fill="#f9a8d4"/><circle r="5" cx="6" cy="0" fill="#f9a8d4"/><circle r="5" cx="0" cy="6" fill="#f9a8d4"/><circle r="5" cx="-6" cy="0" fill="#f9a8d4"/><circle r="3.5" fill="#fde047"/></g>`;
  if (x.includes('pencil')) s += `<g transform="rotate(-35 160 80)"><rect x="150" y="76" width="34" height="7" fill="#facc15"/><path d="M184,76 l8,3.5 -8,3.5 z" fill="#fde68a"/><rect x="146" y="76" width="5" height="7" fill="#f472b6"/></g>`;
  if (x.includes('headphones')) s += `<path d="M42,96 C36,10 164,10 158,96" stroke="#334155" stroke-width="8" fill="none"/><rect x="32" y="84" width="16" height="30" rx="7" fill="${o.accent || '#38bdf8'}"/><rect x="152" y="84" width="16" height="30" rx="7" fill="${o.accent || '#38bdf8'}"/>`;
  if (x.includes('headset')) s += `<path d="M44,92 C40,18 160,18 156,92" stroke="#cbd5e1" stroke-width="4" fill="none"/><rect x="34" y="88" width="14" height="24" rx="6" fill="#38bdf8"/><path d="M42,110 Q52,134 80,128" stroke="#cbd5e1" stroke-width="3" fill="none"/><circle cx="82" cy="128" r="4" fill="#38bdf8"/>`;
  if (x.includes('bandana')) s += `<path d="M40,86 C60,62 140,62 160,86 L160,76 C140,52 60,52 40,76 Z" fill="${o.accent}"/><circle cx="62" cy="70" r="2" fill="#fff"/><circle cx="100" cy="62" r="2" fill="#fff"/><circle cx="138" cy="70" r="2" fill="#fff"/>`;
  return s;
}

function hijab(c) {
  const d = shade(c, -0.18);
  return {
    back: `<path d="M100,24 C34,24 22,96 36,140 C44,166 56,180 72,186 Q100,194 128,186 C144,180 156,166 164,140 C178,96 166,24 100,24 Z" fill="${c}"/><path d="M62,152 Q100,178 138,152" stroke="${d}" stroke-width="3" fill="none"/>`,
    rim: `<path d="M51,104 C50,38 150,38 149,104" stroke="${d}" stroke-width="7" fill="none"/><path d="M58,72 Q100,52 142,72" stroke="${shade(c, 0.3)}" stroke-width="3" fill="none" opacity=".6"/><circle cx="146" cy="140" r="3.5" fill="#fde68a"/>`,
  };
}

// ---------- satu karakter ----------
function character(o) {
  o.id = ++uid;
  const it = ITEMS[o.item];
  const a = arms(o, it);
  const h = o.hijab ? hijab(o.hijab) : null;
  return `<svg viewBox="0 0 200 278" xmlns="http://www.w3.org/2000/svg" style="--skin:${o.skin}">
  <defs>
    <linearGradient id="sk${o.id}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${shade(o.skin, 0.12)}"/><stop offset="1" stop-color="${shade(o.skin, -0.06)}"/></linearGradient>
    <linearGradient id="of${o.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(o.outfit, 0.15)}"/><stop offset="1" stop-color="${shade(o.outfit, -0.2)}"/></linearGradient>
  </defs>
  ${o.nofloor ? '' : '<polygon points="100,226 176,250 100,274 24,250" fill="rgba(56,189,248,.10)" stroke="rgba(56,189,248,.25)"/>'}
  <ellipse cx="100" cy="246" rx="48" ry="9" fill="rgba(0,0,0,.35)"/>
  ${o.hijab ? '' : hairBack(o.hair, o.hairColor)}
  ${legs(o)}
  ${a.back}
  ${body(o)}
  <rect x="92" y="140" width="16" height="18" rx="6" fill="${shade(o.skin, -0.1)}"/>
  ${h ? h.back : ''}
  ${head(o)}
  <g class="eyes">${eyes(o.eyes || 'round', o.eyeColor || '#5b3a29', o.fem)}</g>
  <path d="M71,${o.eyes === 'calm' ? 86 : 88} q9,-5 18,0 M111,${o.eyes === 'calm' ? 86 : 88} q9,-5 18,0" stroke="${o.hijab ? '#3b2a20' : shade(o.hairColor || '#333', -0.25)}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="68" cy="118" rx="8" ry="4.5" fill="#fb7185" opacity=".35"/><ellipse cx="132" cy="118" rx="8" ry="4.5" fill="#fb7185" opacity=".35"/>
  <circle cx="100" cy="114" r="1.3" fill="${shade(o.skin, -0.3)}"/>
  <g class="mouth">${mouth(o.mouth)}</g>
  ${extras(o)}
  ${o.hijab ? h.rim : hairFront(o.hair, o.hairColor)}
  ${glasses(o.glasses)}
  ${o.hat ? hat(o.hat, o.hatColor) : ''}
  ${topExtras(o)}
  ${it ? it.draw() : ''}
  ${a.hands}
</svg>`;
}

// ---------- tim ----------
const SK = ['#ffdcc4', '#f5c6a0', '#e8b08a', '#c98b62'];
const TEAM = [
  { name: '👑 Gaby', role: 'Bos tim. Duduk di kubikel bos, monitor besar PUSH TO TALK, menjawab sambil pegang mic.', opts: [
    { t: 'Bos Elegan', d: 'Rambut panjang cokelat tua, blazer navy, anting emas, lencana sayap Gabriella.', fem: true, skin: SK[0], hair: 'long', hairColor: '#4a2c2a', eyeColor: '#7c4a2d', outfit: '#1e3a8a', outfit2: '#f8fafc', style: 'blazer', pants: '#1e293b', shoes: '#111827', item: 'mic', badge: true, extras: ['earrings'] },
    { t: 'Bos Hologram', d: 'Rambut bob biru menyala seperti hologram Gaby, jas putih, headset, mata berbinar.', fem: true, skin: SK[1], hair: 'bob', hairColor: '#38bdf8', eyes: 'sparkle', eyeColor: '#0ea5e9', outfit: '#e2e8f0', outfit2: '#38bdf8', style: 'blazer', pants: '#334155', shoes: '#0f172a', item: 'mic', badge: true, extras: ['headset'] },
    { t: 'Bos Ceria', d: 'Kuncir kuda merah bata, kardigan pink, jepit bintang, sedang tertawa.', fem: true, skin: SK[0], hair: 'pony', hairColor: '#b45309', eyes: 'happy', mouth: 'open', outfit: '#ec4899', outfit2: '#fdf2f8', style: 'cardigan', pants: '#475569', shoes: '#be185d', item: 'mic', badge: true, extras: ['clip'] },
  ] },
  { name: '📝 Meri', role: 'Penjaga ingatan. Ruang sebelah dengan lemari 18 laci, mengirim berkas ke komputer Gaby.', opts: [
    { t: 'Meri Pustakawan', d: 'Rambut sanggul, kacamata bulat, kardigan hijau, membawa map berkas.', fem: true, skin: SK[1], hair: 'bun', hairColor: '#3f2a1d', eyeColor: '#6b4226', glasses: 'round', outfit: '#15803d', outfit2: '#fef9c3', style: 'cardigan', pants: '#3f3f46', shoes: '#78350f', item: 'folder', extras: ['freckles'] },
    { t: 'Meri Rajin', d: 'Kuncir dua, overall kuning, pensil di telinga, membawa buku catatan.', fem: true, skin: SK[0], hair: 'twin', hairColor: '#1f1b2e', eyes: 'happy', mouth: 'cat', outfit: '#facc15', outfit2: '#ffffff', style: 'overall', sleeve: '#ffffff', pants: '#ca8a04', shoes: '#7c2d12', item: 'book', extras: ['pencil'] },
    { t: 'Meri Berhijab', d: 'Hijab peach, tunik hijau sage, membawa map berkas ingatan.', fem: true, skin: SK[2], hijab: '#fb923c', eyeColor: '#5b3a29', outfit: '#84a98c', outfit2: '#fef3c7', style: 'tunic', pants: '#52525b', shoes: '#44403c', item: 'folder' },
  ] },
  { name: '🔎 Rara', role: 'Peneliti internet. Meja santai (buku & teh) dan meja teknologi dengan hologram bumi.', opts: [
    { t: 'Rara Kutu Buku', d: 'Rambut panjang hitam, sweater ungu kebesaran, headphone, sedang minum teh.', fem: true, skin: SK[0], hair: 'long', hairColor: '#1c1917', eyes: 'calm', eyeColor: '#4b3621', outfit: '#a78bfa', style: 'sweater', pants: '#3730a3', shoes: '#e5e7eb', item: 'teacup', extras: ['headphones'], accent: '#c4b5fd' },
    { t: 'Rara Ilmuwan', d: 'Rambut keriting oranye, jas lab, kacamata hologram, membawa tablet.', fem: true, skin: SK[1], hair: 'curly', hairColor: '#ea580c', eyes: 'sparkle', eyeColor: '#0d9488', glasses: 'visor', outfit: '#f8fafc', outfit2: '#14b8a6', style: 'labcoat', pants: '#0f766e', shoes: '#1f2937', item: 'tablet', extras: ['freckles'] },
    { t: 'Rara Berhijab', d: 'Hijab biru, kacamata bulat, sweater krem, membawa buku terbuka.', fem: true, skin: SK[1], hijab: '#2563eb', eyeColor: '#4b3621', glasses: 'round', outfit: '#fde68a', style: 'sweater', pants: '#1e3a8a', shoes: '#f8fafc', item: 'book' },
  ] },
  { name: '🗺️ Pandu', role: 'Perencana. Papan peta besar, menancapkan pin dan menarik benang rute.', opts: [
    { t: 'Pandu Penjelajah', d: 'Topi safari, rompi khaki, kompas emas.', skin: SK[2], hair: 'short', hairColor: '#5b3a1e', eyeColor: '#4b3621', hat: 'safari', hatColor: '#c8a26b', outfit: '#a3824f', outfit2: '#3f6212', style: 'vest', sleeve: '#3f6212', pants: '#78716c', shoes: '#57534e', item: 'compass', mouth: 'grin' },
    { t: 'Pandu Rapi', d: 'Rambut belah samping, kacamata kotak, kemeja biru + dasi, papan jalan.', skin: SK[0], hair: 'neat', hairColor: '#1f2937', eyeColor: '#374151', glasses: 'square', outfit: '#93c5fd', outfit2: '#1d4ed8', style: 'shirt', pants: '#334155', shoes: '#111827', item: 'clipboard' },
    { t: 'Pandu Santai', d: 'Rambut berantakan, topi biru, hoodie oranye, membawa gulungan peta.', skin: SK[1], hair: 'messy', hairColor: '#292524', eyes: 'happy', mouth: 'grin', hat: 'cap', hatColor: '#2563eb', outfit: '#f97316', style: 'hoodie', pants: '#1e3a8a', shoes: '#f8fafc', item: 'map' },
  ] },
  { name: '✅ Vera', role: 'Pemeriksa. Kaca pembesar, lalu stempel ✅ atau ⚠️ pada hasil kerja teman.', opts: [
    { t: 'Vera Detektif', d: 'Topi fedora, jas panjang cokelat, rambut bob merah, kaca pembesar.', fem: true, skin: SK[0], hair: 'bob', hairColor: '#9f1239', eyeColor: '#166534', hat: 'fedora', hatColor: '#7c5a3a', outfit: '#c8a26b', outfit2: '#f5f5f4', style: 'coat', pants: '#44403c', shoes: '#292524', item: 'magnifier' },
    { t: 'Vera Analis', d: 'Kuncir kuda hitam, kacamata kotak, jas lab ungu, papan centang.', fem: true, skin: SK[1], hair: 'pony', hairColor: '#111827', eyeColor: '#6d28d9', glasses: 'square', outfit: '#f8fafc', outfit2: '#8b5cf6', style: 'labcoat', pants: '#4c1d95', shoes: '#1f2937', item: 'clipboard' },
    { t: 'Vera Tegas', d: 'Rambut perak samping, blazer ungu, tatapan tenang, stempel merah.', fem: true, skin: SK[0], hair: 'bob', hairColor: '#cbd5e1', eyes: 'calm', eyeColor: '#7c3aed', outfit: '#7c3aed', outfit2: '#ede9fe', style: 'blazer', pants: '#312e81', shoes: '#111827', item: 'stamp', extras: ['earrings'] },
  ] },
  { name: '🎨 Lukas', role: 'Pelukis. Kanvas besar; menggambar sesuai permintaanmu.', opts: [
    { t: 'Lukas Klasik', d: 'Baret merah, celemek penuh cat di atas kaos garis, kuas.', skin: SK[0], hair: 'messy', hairColor: '#3f2a1d', eyeColor: '#4b3621', hat: 'beret', hatColor: '#dc2626', outfit: '#f5f5f4', outfit2: '#1e3a8a', style: 'apron', sleeve: '#1e3a8a', pants: '#44403c', shoes: '#292524', item: 'brush' },
    { t: 'Lukas Ceria', d: 'Rambut keriting, bandana, overall jins penuh cat, palet warna.', skin: SK[3], hair: 'curly', hairColor: '#1c1917', eyes: 'happy', mouth: 'grin', outfit: '#3b82f6', outfit2: '#fef08a', style: 'overall', sleeve: '#fef08a', pants: '#1d4ed8', shoes: '#f8fafc', item: 'palette', extras: ['bandana'], accent: '#ef4444' },
    { t: 'Lukas Digital', d: 'Rambut pirang rapi, headphone, hoodie ungu, tablet gambar + pena.', skin: SK[0], hair: 'neat', hairColor: '#eab308', eyes: 'sparkle', eyeColor: '#2563eb', outfit: '#7c3aed', style: 'hoodie', pants: '#1f2937', shoes: '#f43f5e', item: 'tablet', extras: ['headphones'], accent: '#f472b6' },
  ] },
];

// Tim terpilih (rekomendasi yang disetujui pemilik, 3 Nov 2026) + ubahan kecil.
const pick = (who, i, patch) => ({ ...TEAM.find((m) => m.name.includes(who)).opts[i], ...patch });
const CHOSEN = [
  { tag: 'Gaby', note: 'Bos Hologram, tanpa headset (pegang mic)', o: pick('Gaby', 1, { extras: [] }) },
  { tag: 'Meri', note: 'Pustakawan', o: pick('Meri', 0, {}) },
  { tag: 'Rara · santai', note: 'Baca buku & minum teh', o: pick('Rara', 0, {}) },
  { tag: 'Rara · kerja', note: 'Pakai kacamata hologram di meja bumi', o: pick('Rara', 0, { glasses: 'visor', eyes: 'sparkle', item: 'tablet', mouth: 'cat' }) },
  { tag: 'Pandu', note: 'Penjelajah', o: pick('Pandu', 0, {}) },
  { tag: 'Vera', note: 'Detektif, jas abu-abu tua (beda dari Pandu)', o: pick('Vera', 0, { outfit: '#4b5563', outfit2: '#e5e7eb', hatColor: '#374151', pants: '#1f2937' }) },
  { tag: 'Lukas', note: 'Klasik', o: pick('Lukas', 0, {}) },
];

// ===================== karakter25.js =====================
// Karakter 2.5D untuk prototipe Ruang Kerja (memakai potongan gambar dari karakter.js).
// • tampak ¾ (wajah sedikit menyamping) dan tampak belakang (saat berjalan menjauh)
// • volume: sisi badan / wajah / kaki yang jauh dari cahaya lebih gelap, bayangan leher, garis tepi tipis
// • lengan & kaki terpisah: kelas .arm-l/.arm-r/.leg-l/.leg-r; sudut lengan lewat CSS --al/--ar,
//   angkat kaki lewat --ll/--lr. Barang di tangan kanan (.ritem) diputar balik supaya tetap tegak.
// • .lprop = tempat barang di tangan kiri (kopi, koran, buku sketsa…), diisi dari proto.js.

const RIGHT_ITEMS = ['mic', 'teacup', 'compass', 'magnifier', 'stamp', 'brush'];

function torsoPath(o) {
  if (o.style === 'coat') return 'M64,162 Q100,150 136,162 L148,234 Q100,242 52,234 Z';
  if (o.style === 'dress') return 'M70,162 Q100,150 130,162 L150,228 Q100,238 50,228 Z';
  return 'M68,162 Q100,150 132,162 L140,214 Q100,224 60,214 Z';
}

function legs25(o) {
  const top = o.style === 'coat' ? 226 : o.style === 'dress' ? 222 : 206;
  const c = o.style === 'dress' ? (o.pants || o.skin) : o.pants;
  const leg = (x, cls, dark) => `<g class="leg ${cls}"><rect x="${x}" y="${top}" width="13" height="${242 - top}" rx="6" fill="${dark ? shade(c, -0.2) : c}"/>`
    + `<ellipse cx="${x + 5}" cy="243" rx="11" ry="6" fill="${dark ? shade(o.shoes, -0.25) : o.shoes}"/><ellipse cx="${x + 3}" cy="240.5" rx="4" ry="1.8" fill="#fff" opacity=".2"/></g>`;
  return leg(84, 'leg-l', true) + leg(103, 'leg-r', false);
}

function arm25(o, side, hx, hy, inner = '') {
  const left = side === 'l';
  const sleeve = o.sleeve || o.outfit;
  const sx = left ? 74 : 126;
  return `<g class="arm arm-${side}"><path d="M${sx},166 L${hx},${hy}" stroke="${shade(sleeve, left ? -0.2 : -0.04)}" stroke-width="15" stroke-linecap="round"/>`
    + `<path d="M${sx},166 L${hx},${hy}" stroke="${shade(sleeve, 0.25)}" stroke-width="3" stroke-linecap="round" opacity="${left ? 0 : 0.35}" transform="translate(3 -1)"/>`
    + inner
    + `<circle cx="${hx}" cy="${hy}" r="8" fill="${left ? shade(o.skin, -0.1) : o.skin}"/>`
    + (left ? `<g class="lprop" data-hx="${hx}" data-hy="${hy}" style="transform-origin:${hx}px ${hy}px"></g>` : '')
    + '</g>';
}

// Rambut tampak belakang: seluruh kepala tertutup rambut + gaya khasnya.
function hairBackView(style, c) {
  const d = shade(c, -0.15);
  const cap = `<path d="M40,104 C30,12 170,12 160,104 Q158,148 100,152 Q42,148 40,104 Z" fill="${c}"/>`;
  const nape = `<path d="M70,138 Q100,152 130,138" stroke="${d}" stroke-width="3" fill="none" opacity=".7"/>`;
  switch (style) {
    case 'long': return `<path d="M36,98 C26,12 174,12 164,98 L170,200 Q150,214 132,204 Q116,214 100,204 Q84,214 68,204 Q50,214 30,200 Z" fill="${d}"/>${cap}<path d="M100,30 V200" stroke="${shade(c, -0.3)}" stroke-width="2" opacity=".35"/>`;
    case 'bob': return `${cap}<path d="M34,100 C26,30 174,30 166,100 L168,142 Q100,160 32,142 Z" fill="${c}"/><path d="M60,142 v-30 M100,150 v-40 M140,142 v-30" stroke="${d}" stroke-width="2" opacity=".5"/>`;
    case 'pony': return `${cap}<path d="M90,70 C76,130 88,176 100,190 C112,176 124,130 110,70 Z" fill="${d}"/><circle cx="100" cy="74" r="8" fill="#f472b6"/>${nape}`;
    case 'bun': return `${cap}<circle cx="100" cy="58" r="24" fill="${d}"/><path d="M80,58 Q100,44 120,58" stroke="${shade(c, 0.2)}" stroke-width="3" fill="none" opacity=".5"/>${nape}`;
    case 'twin': return `${hairBack('twin', c)}${cap}${nape}`;
    case 'curly': return `${hairBack('curly', c)}${cap}`;
    default: return `${cap}${nape}`;
  }
}

function character25(o, view = 'front', turn = 0.32) {
  o = { ...o, id: ++uid };
  const id = o.id;
  const front = view === 'front';
  const it = front ? ITEMS[o.item] : null;
  const [lx, ly] = it ? it.L : [62, 206];
  const [rx, ry] = it ? it.R : [138, 206];
  const rItem = it && RIGHT_ITEMS.includes(o.item);
  const dx = front ? turn * 16 : 0;
  const h = o.hijab ? hijab(o.hijab) : null;
  const torso = torsoPath(o);
  const outfitEdge = `<path d="${torso}" fill="none" stroke="${shade(o.outfit, -0.5)}" stroke-width="1.6" opacity=".5"/>`;
  const sideShade = `<path d="M68,162 Q74,159 84,157 L80,${o.style === 'coat' ? 238 : 224} Q66,222 ${o.style === 'coat' ? 52 : 58},${o.style === 'coat' ? 232 : 214} Z" fill="rgba(15,23,42,.2)"/>`;
  const neck = `<rect x="92" y="140" width="16" height="18" rx="6" fill="${shade(o.skin, -0.12)}"/><ellipse cx="100" cy="147" rx="11" ry="5" fill="rgba(60,20,10,.18)"/>`;
  const defs = `<defs>
    <linearGradient id="sk${id}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${shade(o.skin, 0.12)}"/><stop offset="1" stop-color="${shade(o.skin, -0.06)}"/></linearGradient>
    <linearGradient id="of${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(o.outfit, 0.18)}"/><stop offset="1" stop-color="${shade(o.outfit, -0.22)}"/></linearGradient>
    <linearGradient id="fs${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(120,53,15,.24)"/><stop offset=".42" stop-color="rgba(120,53,15,0)"/><stop offset=".85" stop-color="rgba(255,255,255,0)"/><stop offset="1" stop-color="rgba(255,255,255,.16)"/></linearGradient>
  </defs>`;
  const floor = `${o.nofloor ? '' : '<polygon points="100,226 176,250 100,274 24,250" fill="rgba(56,189,248,.10)" stroke="rgba(56,189,248,.25)"/>'}<ellipse cx="100" cy="246" rx="46" ry="9" fill="rgba(0,0,0,.35)"/>`;
  const headEdge = shade(o.skin, -0.35);
  const hx = o.hijab ? 47 : HEAD.rx, hy = o.hijab ? 49 : HEAD.ry;

  if (!front) {
    let back = '';
    if (o.style === 'coat') back = `<rect x="58" y="202" width="84" height="8" fill="${shade(o.outfit, -0.35)}"/><path d="M100,210 V238" stroke="${shade(o.outfit, -0.35)}" stroke-width="2.5"/>`;
    if (o.style === 'hoodie') back = `<path d="M74,158 Q100,196 126,158 Z" fill="${shade(o.outfit, -0.15)}"/>`;
    if (o.style === 'apron') back = `<path d="M88,198 l-14,-8 v16 z M112,198 l14,-8 v16 z" fill="${o.outfit}"/><circle cx="100" cy="198" r="5" fill="${shade(o.outfit, -0.2)}"/>`;
    if (o.style === 'overall') back = `<path d="M82,212 L118,160 M118,212 L82,160" stroke="${o.outfit}" stroke-width="6"/>`;
    const ears = o.hijab ? '' : `<circle cx="44" cy="102" r="10" fill="${shade(o.skin, -0.12)}"/><circle cx="156" cy="102" r="10" fill="${shade(o.skin, -0.04)}"/>`;
    return `<svg viewBox="0 0 200 278" xmlns="http://www.w3.org/2000/svg" style="--skin:${o.skin}">${defs}${floor}
  ${legs25(o)}
  <path d="${torso}" fill="url(#of${id})"/>${sideShade}${back}${outfitEdge}
  ${neck}
  ${arm25(o, 'l', 62, 206)}${arm25(o, 'r', 138, 206)}
  ${ears}<ellipse cx="${HEAD.cx}" cy="${HEAD.cy}" rx="${hx}" ry="${hy}" fill="url(#sk${id})"/>
  ${h ? h.back.replace('<path d="M62,152', '<path opacity="0" d="M62,152') : hairBackView(o.hair, o.hairColor)}
  ${o.hat ? hat(o.hat, o.hatColor) : ''}
  ${topExtras({ ...o, extras: (o.extras || []).filter((e) => e !== 'pencil') })}
  <path d="M74,44 Q100,32 126,44" stroke="${shade(o.hairColor || o.hijab || '#333', 0.3)}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".35"/>
</svg>`;
  }

  // ---- tampak ¾ depan ----
  const ears = o.hijab ? '' : `<circle cx="44" cy="102" r="10" fill="${shade(o.skin, -0.12)}"/>${(o.extras || []).includes('earrings') ? '<circle cx="44" cy="116" r="3.2" fill="#fbbf24"/>' : ''}`;
  const face = `<g transform="translate(${dx} 0)">
    <g class="eyes">${eyes(o.eyes || 'round', o.eyeColor || '#5b3a29', o.fem)}</g>
    <path d="M71,${o.eyes === 'calm' ? 86 : 88} q9,-5 18,0 M111,${o.eyes === 'calm' ? 86 : 88} q9,-5 18,0" stroke="${o.hijab ? '#3b2a20' : shade(o.hairColor || '#333', -0.25)}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="68" cy="118" rx="7" ry="4.5" fill="#fb7185" opacity=".3"/><ellipse cx="132" cy="118" rx="8.5" ry="4.8" fill="#fb7185" opacity=".38"/>
    <path d="M101,111 q3,3 0,5" stroke="${shade(o.skin, -0.35)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <g class="mouth">${mouth(o.mouth)}</g>
    ${extras({ ...o, extras: (o.extras || []).filter((e) => e !== 'earrings') })}
  </g>`;
  return `<svg viewBox="0 0 200 278" xmlns="http://www.w3.org/2000/svg" style="--skin:${o.skin}">${defs}${floor}
  ${o.hijab ? '' : hairBack(o.hair, o.hairColor)}
  ${legs25(o)}
  ${body({ ...o, id })}${sideShade}${outfitEdge}
  ${neck}
  ${h ? h.back : ''}
  ${ears}
  <ellipse cx="${HEAD.cx}" cy="${HEAD.cy}" rx="${hx}" ry="${hy}" fill="url(#sk${id})" stroke="${headEdge}" stroke-width="1.2" stroke-opacity=".5"/>
  <ellipse cx="${HEAD.cx}" cy="${HEAD.cy}" rx="${hx}" ry="${hy}" fill="url(#fs${id})"/>
  ${face}
  <g transform="translate(${dx * 0.45} 0)">${o.hijab ? h.rim : hairFront(o.hair, o.hairColor)}</g>
  <g transform="translate(${dx} 0)">${glasses(o.glasses)}</g>
  <g transform="translate(${dx * 0.3} 0)">${o.hat ? hat(o.hat, o.hatColor) : ''}${topExtras(o)}</g>
  ${it && !rItem ? it.draw() : ''}
  ${arm25(o, 'l', lx, ly)}
  ${arm25(o, 'r', rx, ry, rItem ? `<g class="ritem" style="transform-origin:${rx}px ${ry}px">${it.draw()}</g>` : '')}
</svg>`;
}

// ===================== meja.js =====================
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
// Barang yang bisa DIPAKAI karakter (v1.27 "barang hidup"): gambarnya juga dipakai office.js.
// window.LIVE_PROPS = true → barang ini TIDAK digambar di latar (office.js menggambarnya terpisah & menggerakkannya).
const LIVE = () => window.LIVE_PROPS === true;
const PROP_SVG = {
  mug: (c = '#f8fafc', steam = true) => `<rect x="-5" y="-11" width="10" height="11" rx="2" fill="${c}"/><path d="M5,-8 q5,2 0,6" stroke="${c}" stroke-width="2" fill="none"/>${steam ? '<path d="M-2,-14 q-3,-4 0,-8 M3,-14 q-3,-4 0,-8" stroke="#e2e8f0" stroke-width="1.4" fill="none" opacity=".7"/>' : ''}`,
  teapot: `<ellipse cx="0" cy="-8" rx="10" ry="8" fill="#f8fafc" stroke="#94a3b8"/><path d="M9,-10 q7,-3 9,-9" stroke="#f8fafc" stroke-width="3" fill="none"/><path d="M-10,-11 q-6,0 -5,6" stroke="#f8fafc" stroke-width="2.4" fill="none"/><ellipse cx="0" cy="-15" rx="5" ry="2" fill="#93c5fd"/><circle cx="0" cy="-17.5" r="1.8" fill="#93c5fd"/><path d="M-3,-22 q-3,-4 0,-8" stroke="#e2e8f0" stroke-width="1.4" fill="none" opacity=".7"/>`,
  plate: '<ellipse rx="11" ry="4.5" fill="#f8fafc"/>',
  fritter: (dx) => `<path d="M${dx},-2 q3,-6 6,0" stroke="#b45309" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  pad: '<rect x="-7" y="-4" width="14" height="6" rx="3" fill="#e5e7eb"/><circle cx="-3" cy="-1" r="1.4" fill="#ef4444"/><circle cx="3" cy="-1" r="1.4" fill="#3b82f6"/>',
  paddle: (c) => `<circle cx="0" cy="-2" r="5" fill="${c}"/><rect x="-1" y="2" width="2" height="6" fill="#78350f"/>`,
  ball: '<circle r="2.4" fill="#fff"/>',
};
const mug = (x, y, z, c = '#f8fafc', steam = true) => at(x, y, z, PROP_SVG.mug(c, steam));
const teapot = (x, y, z) => at(x, y, z, PROP_SVG.teapot);
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

// ===================== kantor.js =====================
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
    + box(2.0, 0.15, 1.4, 0.9, 0.7, 1.05, '#1f2937') + faceY(2.15, 0.86, 1.95, 0.6, 0.35, '#ef4444') + (LIVE() ? '' : mug(2.45, 0.95, 1.4, '#fef3c7'))
    + box(4.0, 0.15, 1.4, 1.3, 0.8, 0.7, '#94a3b8') + faceY(4.1, 0.96, 1.5, 0.8, 0.5, '#1e293b')

    // papan menu (berkaki kalau tidak menempel di tembok)
    + (MODE.R === true ? '' : box(9.5, 0, 0, 0.12, 0.12, 2.0, '#374151') + box(11.4, 0, 0, 0.12, 0.12, 2.0, '#374151'))
    + faceY(9.2, 0.02, 2.0, 2.4, 2.0, '#1f2937', EDGE) + textY(9.4, 0.03, 3.6, 'MENU HARI INI', 6, '#fde68a') + textY(9.4, 0.03, 3.0, '☕ Kopi susu', 6, '#fff') + textY(9.4, 0.03, 2.5, '🍌 Pisang goreng', 6, '#fff')
    // dispenser air
    + box(10.4, 0.3, 0, 0.8, 0.8, 1.5, '#e2e8f0') + at(10.8, 0.7, 1.5, '<rect x="-6" y="-18" width="12" height="18" rx="5" fill="rgba(56,189,248,.6)"/>')
    // meja makan bundar + kursi + camilan
    + chair(4.0, 3.2) + chair(6.4, 3.0, '#22c55e') + (window.PROTO ? '<!--SLOT-->' : '')
    + box(5.2, 4.4, 0, 0.3, 0.3, 1.1, '#78350f') + at(5.35, 4.55, 1.1, '<ellipse rx="44" ry="22" fill="#a16207"/><ellipse cy="-3" rx="44" ry="22" fill="#ca8a04"/>')
    + (LIVE() ? '' : at(5.0, 4.4, 1.25, '<ellipse rx="11" ry="4.5" fill="#f8fafc"/><path d="M-7,-2 q3,-6 6,0 M0,-2 q3,-6 6,0" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>') + mug(5.9, 4.7, 1.2, '#38bdf8') + mug(4.7, 5.0, 1.2, '#f472b6') + teapot(5.7, 4.1, 1.2))
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
    + (LIVE() ? '' : at(3.0, 2.6, 0, PROP_SVG.pad))
    // meja ping-pong
    + box(7.2, 2.0, 0.7, 3.6, 2.0, 0.15, '#15803d', '#16a34a') + [7.4, 10.5].map((x) => box(x, 2.2, 0, 0.15, 0.15, 0.7, '#1f2937') + box(x, 3.7, 0, 0.15, 0.15, 0.7, '#1f2937')).join('')
    + faceX(9.0, 2.0, 0.85, 2.0, 0.3, 'rgba(255,255,255,.75)') + at(9.0, 3.0, 0.85, '<path d="M-30,0 L30,0" stroke="#fff" stroke-width="1" opacity=".0"/>')
    + (LIVE() ? '' : at(8.0, 2.5, 0.85, PROP_SVG.paddle('#dc2626')) + at(10.2, 3.6, 0.85, PROP_SVG.paddle('#111827')) + at(9.6, 2.6, 1.6, PROP_SVG.ball))
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

export { officeLayers, character25, CH, PROP_SVG };
