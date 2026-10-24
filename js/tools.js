// Kemampuan Gaby: nama, ingatan, emosi, waktu, cuaca, pengingat, buka situs.

import { memory } from './memory.js';
import { LANGS } from './persona.js';

// Definisi alat dalam format umum (JSON Schema sederhana).
export const TOOL_DEFS = [
  {
    name: 'simpan_nama',
    background: true,
    description: 'Simpan nama panggilan pengguna. Panggil begitu pengguna menyebut nama panggilannya atau minta dipanggil dengan nama lain.',
    parameters: {
      type: 'object',
      properties: { nama: { type: 'string', description: 'Nama panggilan, misal "Hendrik" atau "Bos"' } },
      required: ['nama'],
    },
  },
  {
    name: 'ingat',
    background: true,
    description: 'Simpan satu fakta penting tentang pengguna untuk diingat selamanya (hobi, pekerjaan, kesukaan, ulang tahun, keluarga, rencana).',
    parameters: {
      type: 'object',
      properties: { fakta: { type: 'string', description: 'Fakta singkat, misal "suka kopi hitam tanpa gula"' } },
      required: ['fakta'],
    },
  },
  {
    name: 'lupakan',
    background: true,
    description: 'Hapus ingatan tentang pengguna yang mengandung kata kunci tertentu, jika pengguna memintanya.',
    parameters: {
      type: 'object',
      properties: { kata_kunci: { type: 'string' } },
      required: ['kata_kunci'],
    },
  },
  {
    name: 'ganti_bahasa',
    background: true,
    description: 'Ganti bahasa bicara Gaby secara permanen: id = Indonesia, en = Inggris, auto = ikuti bahasa pengguna.',
    parameters: {
      type: 'object',
      properties: { bahasa: { type: 'string', enum: Object.keys(LANGS) } },
      required: ['bahasa'],
    },
  },
  {
    name: 'waktu_sekarang',
    description: 'Dapatkan tanggal, hari, dan jam saat ini di perangkat pengguna.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'cuaca',
    description: 'Cek cuaca saat ini dan prakiraan hari ini. Kosongkan kota untuk memakai lokasi pengguna.',
    parameters: {
      type: 'object',
      properties: { kota: { type: 'string', description: 'Nama kota, misal "Jakarta". Boleh kosong.' } },
    },
  },
  {
    name: 'buat_pengingat',
    description: 'Pasang pengingat / alarm / timer. Isi menit_lagi untuk "X menit lagi", atau jam untuk waktu tertentu (format 24 jam "HH:MM", opsional tanggal "YYYY-MM-DD").',
    parameters: {
      type: 'object',
      properties: {
        pesan: { type: 'string', description: 'Apa yang perlu diingatkan' },
        menit_lagi: { type: 'number', description: 'Berapa menit dari sekarang' },
        jam: { type: 'string', description: 'Jam, format HH:MM' },
        tanggal: { type: 'string', description: 'Tanggal, format YYYY-MM-DD. Kosongkan untuk hari ini/besok terdekat.' },
      },
      required: ['pesan'],
    },
  },
  {
    name: 'daftar_pengingat',
    description: 'Lihat semua pengingat yang masih aktif.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'hapus_pengingat',
    description: 'Batalkan pengingat berdasarkan id-nya (lihat daftar_pengingat dulu).',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'buka_situs',
    description: 'Tampilkan tombol untuk membuka situs web atau aplikasi (YouTube, Google Maps, WhatsApp, dll.) di layar pengguna.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Alamat lengkap, misal https://www.youtube.com/results?search_query=lagu+santai' },
        label: { type: 'string', description: 'Teks tombol singkat' },
      },
      required: ['url'],
    },
  },
  {
    name: 'kamera',
    description: 'Nyalakan, matikan, atau ganti kamera (depan/belakang), atau bagikan layar komputer, supaya Gaby bisa melihat. Pakai saat pengguna bilang "lihat ini", "buka kamera", dsb.',
    parameters: {
      type: 'object',
      properties: {
        aksi: { type: 'string', enum: ['nyalakan', 'matikan', 'ganti', 'layar'] },
        kamera: { type: 'string', enum: ['depan', 'belakang'], description: 'Opsional, untuk aksi nyalakan' },
      },
      required: ['aksi'],
    },
  },
  {
    name: 'buat_gambar',
    background: 'idle',
    description: 'Buat gambar baru, atau edit foto dari kamera (pakai_kamera = true), misal "tambahkan anjing tidur di bantal ini". Butuh 5–15 detik; sambil menunggu, bilang singkat bahwa kamu sedang menggambar.',
    parameters: {
      type: 'object',
      properties: {
        perintah: { type: 'string', description: 'Deskripsi gambar yang detail, dalam bahasa Inggris' },
        pakai_kamera: { type: 'boolean', description: 'true untuk mengedit gambar dari kamera saat ini' },
      },
      required: ['perintah'],
    },
  },
  {
    name: 'istirahat',
    description: 'Gaby kembali tidur / berhenti mendengarkan setelah selesai bicara. Panggil saat pengguna pamit.',
    parameters: { type: 'object', properties: {} },
  },
];

const WEATHER_CODES = {
  0: 'cerah', 1: 'cerah berawan', 2: 'berawan sebagian', 3: 'mendung',
  45: 'berkabut', 48: 'berkabut', 51: 'gerimis ringan', 53: 'gerimis', 55: 'gerimis lebat',
  61: 'hujan ringan', 63: 'hujan', 65: 'hujan lebat', 66: 'hujan es ringan', 67: 'hujan es',
  71: 'salju ringan', 73: 'salju', 75: 'salju lebat', 80: 'hujan lokal ringan', 81: 'hujan lokal',
  82: 'hujan lokal lebat', 95: 'badai petir', 96: 'badai petir dengan hujan es', 99: 'badai petir hebat',
};

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('lokasi tidak didukung'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => reject(new Error('izin lokasi ditolak')),
      { timeout: 8000, maximumAge: 600000 },
    );
  });
}

async function weather(city) {
  let lat, lon, place;
  if (city) {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id`).then((r) => r.json());
    if (!g.results || !g.results.length) return { error: `Kota "${city}" tidak ditemukan` };
    ({ latitude: lat, longitude: lon } = g.results[0]);
    place = [g.results[0].name, g.results[0].country].filter(Boolean).join(', ');
  } else {
    try {
      ({ lat, lon } = await getPosition());
      place = 'lokasi kamu sekarang';
    } catch (e) {
      return { error: `Tidak bisa mengambil lokasi (${e.message}). Tanyakan nama kotanya.` };
    }
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m'
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=2&timezone=auto';
  const w = await fetch(url).then((r) => r.json());
  const c = w.current;
  return {
    tempat: place,
    sekarang: `${WEATHER_CODES[c.weather_code] || 'tidak diketahui'}, ${Math.round(c.temperature_2m)}°C (terasa ${Math.round(c.apparent_temperature)}°C), kelembapan ${c.relative_humidity_2m}%, angin ${Math.round(c.wind_speed_10m)} km/jam`,
    hari_ini: `${WEATHER_CODES[w.daily.weather_code[0]] || ''}, ${Math.round(w.daily.temperature_2m_min[0])}–${Math.round(w.daily.temperature_2m_max[0])}°C, peluang hujan ${w.daily.precipitation_probability_max[0]}%`,
    besok: `${WEATHER_CODES[w.daily.weather_code[1]] || ''}, ${Math.round(w.daily.temperature_2m_min[1])}–${Math.round(w.daily.temperature_2m_max[1])}°C, peluang hujan ${w.daily.precipitation_probability_max[1]}%`,
  };
}

function computeDue({ menit_lagi, jam, tanggal }) {
  if (typeof menit_lagi === 'number' && menit_lagi > 0) return Date.now() + menit_lagi * 60000;
  if (jam && /^\d{1,2}[:.]\d{2}$/.test(jam)) {
    const [h, m] = jam.split(/[:.]/).map(Number);
    const d = tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? new Date(`${tanggal}T00:00:00`) : new Date();
    d.setHours(h, m, 0, 0);
    if (!tanggal && d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  return null;
}

const fmtTime = (t) => new Date(t).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Jalankan alat. `ui` berisi fungsi tampilan dari app.js.
export async function runTool(name, args, ui) {
  args = args || {};
  try {
    switch (name) {
      case 'simpan_nama':
        memory.setNickname(args.nama);
        ui.refreshSettings();
        return { ok: true, nama: memory.get().nickname };

      case 'ingat':
        memory.remember(args.fakta);
        ui.refreshSettings();
        return { ok: true };

      case 'lupakan':
        return { ok: true, dihapus: memory.forget(args.kata_kunci) };

      case 'ganti_bahasa':
        if (!LANGS[args.bahasa]) return { error: 'Bahasa tidak dikenal' };
        ui.setLang(args.bahasa);
        return { ok: true, bahasa: LANGS[args.bahasa] };

      case 'waktu_sekarang': {
        const d = new Date();
        return {
          tanggal: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          jam: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          zona_waktu: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      case 'cuaca':
        return await weather(args.kota && String(args.kota).trim());

      case 'buat_pengingat': {
        const due = computeDue(args);
        if (!due) return { error: 'Waktunya belum jelas. Tanyakan berapa menit lagi atau jam berapa.' };
        const r = memory.addReminder(args.pesan, due);
        ui.requestNotify();
        ui.calendarToast(r, fmtTime(due));
        return {
          ok: true, id: r.id, waktu: fmtTime(due),
          catatan: 'Bilang singkat ke pengguna: ketuk tombol Kalender di layar supaya tetap diingatkan walau Gaby ditutup.',
        };
      }

      case 'daftar_pengingat': {
        const list = memory.get().reminders.filter((r) => !r.done && r.due > Date.now());
        return { pengingat: list.map((r) => ({ id: r.id, pesan: r.text, waktu: fmtTime(r.due) })) };
      }

      case 'hapus_pengingat':
        return { ok: memory.removeReminder(args.id) };

      case 'buka_situs': {
        let url = String(args.url || '');
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        ui.linkToast(url, args.label || 'Buka');
        return { ok: true, catatan: 'Tombol ditampilkan di layar; pengguna perlu mengetuknya.' };
      }

      case 'kamera':
        return await ui.camera(args.aksi, args.kamera);

      case 'buat_gambar':
        return await ui.makeImage(String(args.perintah || ''), !!args.pakai_kamera);

      case 'istirahat':
        ui.sleepAfterSpeech();
        return { ok: true };

      default:
        return { error: `Alat ${name} tidak dikenal` };
    }
  } catch (e) {
    return { error: String(e.message || e) };
  }
}
