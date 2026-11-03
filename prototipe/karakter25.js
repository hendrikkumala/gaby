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
