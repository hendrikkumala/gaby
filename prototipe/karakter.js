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
