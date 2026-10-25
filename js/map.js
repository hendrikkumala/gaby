// Kartu peta bergaya hologram: rute, jarak, waktu tempuh. Peta dari OpenStreetMap (gratis).

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
// Peta OpenStreetMap standar (gratis, tanpa key); digelapkan lewat CSS agar serasi dengan Gaby.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

let loading = null;
let map = null;
let layer = null;

// Leaflet baru dimuat saat peta pertama kali dibutuhkan, supaya Gaby tetap cepat dibuka.
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = LEAFLET_CSS;
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = LEAFLET_JS;
    js.onload = () => resolve(window.L);
    js.onerror = () => { loading = null; reject(new Error('Peta tidak bisa dimuat')); };
    document.head.appendChild(js);
  });
  return loading;
}

function dot(L, color) {
  return L.divIcon({ className: 'map-dot', html: `<span style="--c:${color}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] });
}

// opts: { from, to?, line?, title, info, actions: [{label, href}] }
export async function showMapCard(opts) {
  const L = await loadLeaflet();
  const card = document.getElementById('mapcard');
  document.getElementById('map-title').textContent = opts.title || '';
  document.getElementById('map-info').textContent = opts.info || '';
  const acts = document.getElementById('map-actions');
  acts.innerHTML = '';
  for (const a of opts.actions || []) {
    const el = document.createElement(a.href ? 'a' : 'button');
    el.className = `btn${a.primary ? ' primary' : ''}`;
    el.textContent = a.label;
    if (a.href) { el.href = a.href; el.target = '_blank'; el.rel = 'noopener'; }
    if (a.onClick) el.onclick = a.onClick;
    if (a.active) el.classList.add('on');
    acts.appendChild(el);
  }
  card.hidden = false;
  requestAnimationFrame(() => card.classList.add('show'));

  if (!map) {
    map = L.map('map-view', { zoomControl: false, attributionControl: true });
    L.tileLayer(TILES, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  }
  if (layer) layer.remove();
  layer = L.layerGroup().addTo(map);
  const pts = [[opts.from.lat, opts.from.lon]];
  L.marker(pts[0], { icon: dot(L, '#5fd4ff') }).addTo(layer);
  if (opts.line) {
    L.polyline(opts.line, { color: '#7fe3ff', weight: 7, opacity: 0.25 }).addTo(layer);
    L.polyline(opts.line, { color: '#ffd27a', weight: 3.5, opacity: 0.95 }).addTo(layer);
  }
  if (opts.to) {
    pts.push([opts.to.lat, opts.to.lon]);
    L.marker(pts[1], { icon: dot(L, '#ff7aa8') }).addTo(layer);
  }
  setTimeout(() => {
    map.invalidateSize();
    if (pts.length > 1 || opts.line) map.fitBounds(opts.line || pts, { padding: [28, 28] });
    else map.setView(pts[0], 15);
  }, 60);
}

export function hideMapCard() {
  const card = document.getElementById('mapcard');
  card.classList.remove('show');
  card.hidden = true;
}
