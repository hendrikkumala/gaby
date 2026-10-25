// Lokasi pengguna, alamat, pencarian tujuan, dan rute (semua gratis via OpenStreetMap).
// Lokasi hanya diambil saat dibutuhkan, tidak dipantau terus.

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const ROUTER = {
  mobil: 'https://routing.openstreetmap.de/routed-car',
  motor: 'https://routing.openstreetmap.de/routed-car',
  jalan: 'https://routing.openstreetmap.de/routed-foot',
};

let cache = null; // { lat, lon, acc, at, place }

export function getPosition() {
  if (cache && Date.now() - cache.at < 3 * 60000) return Promise.resolve(cache);
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Perangkat tidak mendukung lokasi'));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        cache = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy), at: Date.now(), place: null };
        resolve(cache);
      },
      (e) => reject(new Error(e.code === 1 ? 'Izin lokasi ditolak. Izinkan lokasi di pengaturan browser.' : 'Lokasi tidak bisa didapat. Coba lagi.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 },
    );
  });
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Layanan peta menolak (HTTP ${res.status})`);
  return res.json();
}

// Titik GPS → alamat yang mudah dibaca.
export async function describePosition(pos) {
  if (pos.place) return pos.place;
  try {
    const d = await getJson(`${NOMINATIM}/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lon}&zoom=18&accept-language=id`);
    const a = d.address || {};
    pos.place = {
      alamat: d.display_name || '',
      jalan: a.road || '',
      kelurahan: a.village || a.suburb || a.neighbourhood || a.quarter || '',
      kecamatan: a.city_district || a.district || a.subdistrict || '',
      kota: a.city || a.town || a.regency || a.county || a.municipality || '',
      provinsi: a.state || '',
    };
  } catch {
    pos.place = { alamat: '', kota: '' };
  }
  return pos.place;
}

export function shortPlace(place) {
  return [place.jalan, place.kelurahan, place.kecamatan, place.kota].filter(Boolean).join(', ') || place.alamat || 'lokasi kamu';
}

// Nama tempat → titik. Hasil yang dekat dengan pengguna diutamakan.
export async function geocode(query, near) {
  const q = new URLSearchParams({ format: 'jsonv2', q: query, limit: '1', 'accept-language': 'id' });
  if (near) {
    const d = 1.5; // sekitar 150 km
    q.set('viewbox', `${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`);
  }
  const list = await getJson(`${NOMINATIM}/search?${q}`);
  if (!list.length) throw new Error(`Tempat "${query}" tidak ditemukan`);
  return { lat: +list[0].lat, lon: +list[0].lon, nama: list[0].display_name.split(',').slice(0, 3).join(',') };
}

export function formatDuration(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60);
  return `${h} jam${m % 60 ? ` ${m % 60} menit` : ''}`;
}

// Rute dari → ke. Waktu tempuh perkiraan, tanpa data macet.
export async function route(from, to, mode = 'mobil') {
  const base = ROUTER[mode] || ROUTER.mobil;
  const url = `${base}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
  const d = await getJson(url);
  if (!d.routes || !d.routes.length) throw new Error('Rute tidak ditemukan');
  const r = d.routes[0];
  // Router gratis tidak punya profil motor; motor biasanya sedikit lebih cepat dari mobil.
  const duration = mode === 'motor' ? r.duration * 0.85 : r.duration;
  return {
    km: Math.round(r.distance / 100) / 10,
    duration,
    waktu: formatDuration(duration),
    line: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
  };
}

const TRAVEL = { mobil: 'driving', motor: 'driving', jalan: 'walking' };

export function googleDirections(from, to, mode = 'mobil') {
  const q = new URLSearchParams({ api: '1', origin: `${from.lat},${from.lon}`, destination: `${to.lat},${to.lon}`, travelmode: TRAVEL[mode] || 'driving' });
  return `https://www.google.com/maps/dir/?${q}`;
}

export function googleSearchNear(query, pos) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${pos.lat},${pos.lon},15z`;
}
