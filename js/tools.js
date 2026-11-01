// Kemampuan Gaby: nama, ingatan, emosi, waktu, cuaca, pengingat, buka situs.

import { memory, CATEGORIES, guessCats } from './memory.js';
import { researchChecked, quickSearchMode } from './research.js';
import { getPosition, describePosition, shortPlace } from './location.js';
import { LANGS } from './persona.js';

// Penjelasan singkat tiap laci untuk Gaby, misal "makanan = Makanan & minuman".
const CAT_HELP = 'Laci: ' + Object.entries(CATEGORIES).map(([k, v]) => `${k} = ${v.replace(/^\S+\s/, '')}`).join('; ');

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
    description: 'Simpan satu fakta penting tentang pengguna untuk diingat lama, ke laci (kategori) yang paling pas. Isi rasa kalau itu kesukaan atau hal yang tidak disukai/dihindari. Kalau fakta lama berubah, isi menggantikan.',
    parameters: {
      type: 'object',
      properties: {
        fakta: { type: 'string', description: 'Fakta singkat, misal "suka kopi hitam tanpa gula"' },
        kategori: { type: 'string', enum: Object.keys(CATEGORIES), description: CAT_HELP },
        rasa: { type: 'string', enum: ['suka', 'tidak_suka', 'netral'], description: 'suka = kesukaan/favorit; tidak_suka = tidak suka, alergi, pantangan, dihindari; netral = fakta biasa' },
        menggantikan: { type: 'string', description: 'Kata kunci fakta lama yang sudah tidak berlaku (opsional), misal "kerja di"' },
      },
      required: ['fakta', 'kategori'],
    },
  },
  {
    name: 'buka_ingatan',
    description: 'Buka laci ingatan tentang pengguna untuk satu topik obrolan (makanan, olahraga, musik, film, jalan-jalan, kesehatan, keuangan, teknologi, ilmu, belajar, kebiasaan, kontak, dll.), atau cari nama orang/tempat. Hasilnya daftar hal yang diingat; 👍 = disukai, 👎 = tidak disukai.',
    parameters: {
      type: 'object',
      properties: { topik: { type: 'string', description: 'Topik atau nama laci, misal "makanan", "film", "rencana liburan ke Bali", "Joni"' } },
      required: ['topik'],
    },
  },
  {
    name: 'cari_info',
    description: 'Agen riset internet (cari di Google dengan teliti, pakai sumber). WAJIB dipakai untuk info faktual yang bisa berubah atau harus tepat: berita, harga, kurs, skor & jadwal pertandingan, data/angka, tanggal peristiwa, tokoh, produk, rekomendasi tempat, info kesehatan/obat, aturan/hukum. Hasilnya jawaban + sumber yang tampil di layar. Butuh beberapa detik.',
    parameters: {
      type: 'object',
      properties: {
        pertanyaan: { type: 'string', description: 'Pertanyaan lengkap dan jelas, sertakan nama kota/tanggal kalau perlu, misal "harga emas Antam hari ini" atau "skor Persib tadi malam"' },
        kesehatan: { type: 'boolean', description: 'true kalau tentang kesehatan, penyakit, obat, atau medis' },
      },
      required: ['pertanyaan'],
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
    description: 'Pasang pengingat / timer untuk tugas (ada WAKTU: "ingatkan jam 3 call Joni", "10 menit lagi angkat jemuran", "besok jam 9 meeting"). Untuk alarm bangun / jam weker pakai pasang_alarm. Otomatis juga masuk daftar catatan/to-do; kalau pesannya sama dengan catatan yang sudah ada, catatan itu yang diberi pengingat. Isi menit_lagi untuk "X menit lagi", atau jam (format 24 jam "HH:MM", opsional tanggal "YYYY-MM-DD").',
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
    name: 'pasang_alarm',
    description: 'Pasang ALARM sungguhan di aplikasi Jam HP (berdering terus sampai dimatikan, walau HP senyap/terkunci): "pasang alarm jam 5", "bangunkan aku jam 4.30", "alarm tiap hari kerja jam 6". Alarm hanya punya jam (berlaku kejadian terdekat jam itu), bukan tanggal; untuk tanggal tertentu yang jauh pakai buat_pengingat.',
    parameters: {
      type: 'object',
      properties: {
        jam: { type: 'string', description: 'Jam alarm, format 24 jam HH:MM (misal "05:00", "16:30")' },
        label: { type: 'string', description: 'Nama alarm singkat, misal "Bangun pagi". Boleh kosong.' },
        ulang: {
          type: 'array',
          items: { type: 'string', enum: ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'] },
          description: 'Hari berulang, misal tiap hari kerja = ["senin","selasa","rabu","kamis","jumat"]. Kosongkan untuk sekali saja.',
        },
      },
      required: ['jam'],
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
    description: 'Buka alamat situs web tertentu. Untuk aplikasi populer (WhatsApp, YouTube, Shopee, dll.) pakai buka_aplikasi.',
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
        aksi: { type: 'string', enum: ['nyalakan', 'matikan', 'ganti', 'layar', 'foto'], description: 'foto = kirim satu gambar tajam untuk membaca tulisan kecil (struk, dokumen, label) atau menghitung' },
        kamera: { type: 'string', enum: ['depan', 'belakang'], description: 'Opsional, untuk aksi nyalakan' },
      },
      required: ['aksi'],
    },
  },
  {
    name: 'buat_gambar',
    background: 'idle',
    description: 'Minta LUKAS (teman pelukismu) membuat gambar baru, atau gambar berdasarkan benda di kamera (pakai_kamera = true), misal "tambahkan anjing tidur di bantal ini". Lukas menulis perintah gambar yang rinci sendiri, lalu Vera mengecek hasilnya (kalau ada yang kurang, Lukas memperbaiki sekali). Butuh 10–45 detik; sambil menunggu, bilang singkat bahwa Lukas sedang menggambar (prosesnya tampil di papan kerja). Gambar tampil di layar dan pengguna memilih simpan, ulang, atau buang.',
    parameters: {
      type: 'object',
      properties: {
        permintaan: { type: 'string', description: 'WAJIB: permintaan pengguna PERSIS dengan kata-katanya sendiri (bahasa aslinya), lengkap dengan semua detail yang dia sebut' },
        perintah: { type: 'string', description: 'Draf singkat gambar dalam bahasa Inggris (Lukas yang menyempurnakan)' },
        ukuran: { type: 'string', enum: ['persegi', 'tegak', 'mendatar'], description: 'Isi hanya kalau pengguna menyebut bentuk: tegak (wallpaper HP/poster), mendatar (wallpaper laptop/pemandangan lebar), persegi' },
        pakai_kamera: { type: 'boolean', description: 'true untuk mengedit gambar dari kamera saat ini' },
      },
      required: ['permintaan', 'perintah'],
    },
  },
  {
    name: 'lokasi_saya',
    description: 'Dapatkan lokasi pengguna saat ini (alamat, kelurahan, kota). Pakai saat pengguna bertanya "di mana aku", tempat terdekat, atau butuh konteks lokasi.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'cari_tempat',
    description: 'Cari tempat di sekitar pengguna (misal "toko mochi", "bengkel", "apotek 24 jam"). Menampilkan peta lokasi pengguna dan tombol Google Maps. Setelah itu cari rekomendasi dengan nama daerah yang dikembalikan (ikuti catatan di hasilnya).',
    parameters: {
      type: 'object',
      properties: { kata_kunci: { type: 'string', description: 'Jenis tempat yang dicari' } },
      required: ['kata_kunci'],
    },
  },
  {
    name: 'rute',
    description: 'Tunjukkan rute ke suatu tujuan, dengan jarak dan perkiraan waktu tempuh, dan tampilkan peta di layar. Titik awal = lokasi pengguna, KECUALI pengguna menyebut asal ("dari Bandung ke Jakarta") — isi kolom dari.',
    parameters: {
      type: 'object',
      properties: {
        dari: { type: 'string', description: 'Titik awal kalau pengguna menyebutnya, misal "Bandung". Kosongkan untuk lokasi pengguna sekarang.' },
        tujuan: { type: 'string', description: 'Nama tempat/kota tujuan, misal "Surabaya" atau "Tunjungan Plaza Surabaya"' },
        moda: { type: 'string', enum: ['mobil', 'motor', 'jalan'], description: 'Kendaraan, bawaan mobil' },
      },
      required: ['tujuan'],
    },
  },
  {
    name: 'catatan',
    description: 'Daftar catatan / to-do pengguna (tugas TANPA waktu: "catat beli roti", "catatan aku apa aja?", "aku udah call Joni", "hapus yang roti"). Kartu daftar tampil di layar. Tugas dengan waktu pakai buat_pengingat.',
    parameters: {
      type: 'object',
      properties: {
        aksi: { type: 'string', enum: ['tambah', 'lihat', 'selesai', 'belum', 'hapus', 'tutup'], description: 'belum = batalkan centang' },
        item: { type: 'array', items: { type: 'string' }, description: 'Isi catatan, satu tugas per item, singkat (misal ["ke toko roti", "call Joni"]). Untuk selesai/hapus: sebut tugasnya.' },
      },
      required: ['aksi'],
    },
  },
  {
    name: 'buka_aplikasi',
    description: 'Buka aplikasi di HP pengguna (WhatsApp, Telegram, Instagram, Facebook, Threads, X, TikTok, YouTube, Netflix, Prime Video, Shopee, Tokopedia, Google Maps, browser, email, telepon, SMS), bisa langsung ke pencarian, chat WhatsApp ke nomor/kontak dengan pesan terisi, email terisi, atau panggilan telepon. Pesan TIDAK terkirim otomatis; pengguna menekan kirim sendiri.',
    parameters: {
      type: 'object',
      properties: {
        aplikasi: { type: 'string', enum: ['whatsapp', 'telegram', 'instagram', 'facebook', 'threads', 'x', 'tiktok', 'youtube', 'youtube_music', 'spotify', 'netflix', 'prime_video', 'shopee', 'tokopedia', 'google_maps', 'browser', 'email', 'telepon', 'sms'] },
        cari: { type: 'string', description: 'Kata pencarian (misal "sepatu lari", "resep rendang"), atau username Telegram' },
        kontak: { type: 'string', description: 'Nama kontak yang tersimpan di ingatan (kategori kontak), misal "Joni"' },
        nomor: { type: 'string', description: 'Nomor telepon kalau disebut langsung' },
        email: { type: 'string', description: 'Alamat email tujuan' },
        pesan: { type: 'string', description: 'Isi pesan WhatsApp/SMS/email' },
        subjek: { type: 'string', description: 'Subjek email' },
      },
      required: ['aplikasi'],
    },
  },
  {
    name: 'putar_musik',
    description: 'Cari dan putar lagu/musik ("putar lagu santai", "setel Tulus Hati-Hati di Jalan").',
    parameters: {
      type: 'object',
      properties: { lagu: { type: 'string', description: 'Judul, penyanyi, atau suasana lagu' } },
      required: ['lagu'],
    },
  },
  {
    name: 'buat_rencana',
    description: 'Minta PANDU (teman perencana) menyusun rencana berlangkah: liburan/perjalanan, acara (ultah, arisan), diet/olahraga mingguan, belanja besar, membandingkan produk, dll. Pandu bekerja 1–2 menit di belakang layar (riset lewat Rara, dicek Vera), lalu rencana bernomor tampil di Kartu Rencana dan kamu dikabari sistem. Untuk MENGUBAH rencana lama ("ganti hotel rencana 1 yang dekat pantai"), isi dari_nomor; hasilnya rencana baru (turunan), yang lama tetap ada.',
    parameters: {
      type: 'object',
      properties: {
        permintaan: { type: 'string', description: 'Permintaan pengguna lengkap dengan kata-katanya (tujuan, tanggal, budget, jumlah orang, kesukaan)' },
        dari_nomor: { type: 'number', description: 'Nomor rencana lama yang diubah (opsional)' },
      },
      required: ['permintaan'],
    },
  },
  {
    name: 'buka_rencana',
    description: 'Buka rencana tersimpan (Kartu Rencana tampil) dan ambil isinya untuk menjawab: "buka rencana 3", "rencana Bali kemarin budgetnya berapa?", "hotel di rencana Bali namanya apa?". Isi nomor kalau disebut, selain itu kata_kunci.',
    parameters: { type: 'object', properties: { nomor: { type: 'number' }, kata_kunci: { type: 'string' } } },
  },
  {
    name: 'daftar_rencana',
    description: 'Jumlah dan daftar rencana yang tersimpan ("ada berapa rencana?", "rencana-rencanaku apa aja?").',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'bandingkan_rencana',
    description: 'Bandingkan 2–3 rencana tersimpan ("bandingin rencana 1 dengan rencana 3"). Kartu Perbandingan tampil.',
    parameters: { type: 'object', properties: { nomor: { type: 'array', items: { type: 'number' } } }, required: ['nomor'] },
  },
  {
    name: 'hapus_rencana',
    description: 'Hapus rencana LANGSUNG tanpa konfirmasi: satu/beberapa nomor ("hapus rencana 2"), atau semua ("hapus semua rencana"). Bisa dibatalkan 1 menit dengan batal_hapus_rencana.',
    parameters: { type: 'object', properties: { nomor: { type: 'array', items: { type: 'number' } }, semua: { type: 'boolean' } } },
  },
  {
    name: 'batal_hapus_rencana',
    description: 'Kembalikan rencana yang baru saja dihapus ("eh batal", "jangan dihapus"), maksimal 1 menit setelah dihapus.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'rencana_ke_catatan',
    description: 'Masukkan persiapan (checklist) rencana ke catatan/to-do dan pasang pengingat usulannya, kalau pengguna setuju ("boleh, masukin ke catatan").',
    parameters: { type: 'object', properties: { nomor: { type: 'number' } }, required: ['nomor'] },
  },
  {
    name: 'tutup_kartu',
    description: 'Tutup kartu di layar dengan menyebut namanya: Papan Kerja (meteran teman yang sedang bekerja di atas; teman tetap bekerja di belakang layar), Kartu Berita (hasil Rara), Kartu Rencana, Kartu Perbandingan, Kartu Daftar Rencana, Kartu Catatan, Kartu Peta, Kartu Gambar, Galeri, atau semua ("tutup semua kartu", "bersihkan layar"). "Tutup beritanya / sumbernya" = berita.',
    parameters: {
      type: 'object',
      properties: {
        jenis: { type: 'string', enum: ['papan', 'berita', 'rencana', 'perbandingan', 'daftar_rencana', 'catatan', 'peta', 'gambar', 'galeri', 'semua'] },
      },
      required: ['jenis'],
    },
  },
  {
    name: 'peta_aksi',
    description: 'Tindakan untuk kartu peta yang sedang tampil: buka di Google Maps (pengguna bilang "buka di Google Maps", "navigasi ke sana", "oke berangkat"), atau tutup kartunya ("tutup petanya").',
    parameters: {
      type: 'object',
      properties: { aksi: { type: 'string', enum: ['buka', 'tutup'] } },
      required: ['aksi'],
    },
  },
  {
    name: 'gambar_aksi',
    description: 'Tindakan untuk kartu gambar yang sedang tampil: simpan ke galeri (kartu tertutup), ulang (gambar lagi; isi perubahan kalau pengguna minta ada yang diubah, misal "kucingnya lebih gemuk"), atau buang/tutup (kartu tertutup tanpa disimpan).',
    parameters: {
      type: 'object',
      properties: {
        aksi: { type: 'string', enum: ['simpan', 'ulang', 'buang', 'tutup'] },
        perubahan: { type: 'string', description: 'Untuk ulang: apa yang ingin diubah pengguna, dengan kata-katanya. Kosongkan kalau cuma ingin versi lain.' },
      },
      required: ['aksi'],
    },
  },
  {
    name: 'galeri',
    description: 'Buka atau tutup galeri gambar yang sudah disimpan ("buka galeri", "lihat gambar-gambarku", "tutup galeri").',
    parameters: {
      type: 'object',
      properties: { aksi: { type: 'string', enum: ['buka', 'tutup'] } },
      required: ['aksi'],
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

export async function weather(city) {
  let lat, lon, place;
  if (city) {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id`).then((r) => r.json());
    if (!g.results || !g.results.length) return { error: `Kota "${city}" tidak ditemukan` };
    ({ latitude: lat, longitude: lon } = g.results[0]);
    place = [g.results[0].name, g.results[0].country].filter(Boolean).join(', ');
  } else {
    try {
      const pos = await getPosition();
      ({ lat, lon } = pos);
      const p = await describePosition(pos);
      place = [p.kecamatan || p.kelurahan, p.kota].filter(Boolean).join(', ') || 'lokasi kamu sekarang';
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

const DAYS = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

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
        memory.remember(args.fakta, args.kategori, args.menggantikan, args.rasa);
        ui.refreshSettings();
        return { ok: true };

      case 'buka_ingatan': {
        const { laci, cocok } = memory.recall(args.topik);
        if (!Object.keys(laci).length && !cocok.length) {
          return { kosong: true, catatan: 'Belum ada ingatan tentang topik ini. Ngobrol biasa saja; kalau pengguna menyebut hal penting, simpan dengan ingat.' };
        }
        return { laci, ...(cocok.length ? { ingatan_lain_yang_cocok: cocok } : {}) };
      }

      case 'cari_info':
        return await searchTool(args, ui);

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
        const todo = memory.findTodo(args.pesan) || memory.addTodo(args.pesan);
        const r = memory.addReminder(args.pesan, due, todo ? todo.id : null);
        if (todo) memory.linkTodoReminder(todo.id, r.id);
        ui.requestNotify();
        ui.calendarToast(r, fmtTime(due));
        ui.refreshTodos();
        return {
          ok: true, id: r.id, waktu: fmtTime(due),
          catatan: ui.isNativeApp
            ? 'Notifikasi HP sudah dipasang; tetap berbunyi walau Gaby ditutup atau HP terkunci.' + await ui.reminderWarning()
            : 'Bilang singkat ke pengguna: ketuk tombol Kalender di layar supaya tetap diingatkan walau Gaby ditutup.',
        };
      }

      case 'pasang_alarm': {
        const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(args.jam || '').trim());
        if (!m || +m[1] > 23 || +m[2] > 59) return { error: 'Jamnya belum jelas. Tanyakan jam berapa alarmnya.' };
        const days = (Array.isArray(args.ulang) ? args.ulang : []).map((d) => String(d).toLowerCase()).filter((d) => DAYS.includes(d));
        return await ui.setAlarm({
          hour: +m[1], minute: +m[2],
          label: String(args.label || '').trim().slice(0, 40) || 'Alarm Gaby',
          days: [...new Set(days)],
        });
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
        return ui.openExternal(url, `↗ ${args.label || 'Buka'}`);
      }

      case 'buat_rencana':
        return ui.startPlan({ permintaan: args.permintaan, dari_nomor: args.dari_nomor ? Number(args.dari_nomor) : null });

      case 'buka_rencana':
        return ui.openPlan({ nomor: args.nomor ? Number(args.nomor) : null, kata_kunci: String(args.kata_kunci || '') });

      case 'daftar_rencana':
        return ui.listPlans();

      case 'bandingkan_rencana':
        return ui.comparePlans({ nomor: args.nomor });

      case 'hapus_rencana':
        return ui.deletePlans({ nomor: args.nomor, semua: !!args.semua });

      case 'batal_hapus_rencana':
        return ui.undoDelete();

      case 'rencana_ke_catatan': {
        const r = ui.planToTodos(Number(args.nomor));
        if (!r.error) ui.refreshTodos();
        return r;
      }

      case 'tutup_kartu':
        return ui.closeCards(String(args.jenis || 'semua'));

      case 'peta_aksi':
        return ui.mapAction(args.aksi === 'tutup' ? 'tutup' : 'buka');

      case 'kamera':
        return await ui.camera(args.aksi, args.kamera);

      case 'catatan':
        return ui.todoAction(args.aksi, Array.isArray(args.item) ? args.item : args.item ? [String(args.item)] : []);

      case 'buka_aplikasi':
        return ui.openApp(args);

      case 'putar_musik':
        return ui.playMusic(String(args.lagu || ''));

      case 'buat_gambar':
        return await ui.makeImage(String(args.perintah || args.permintaan || ''), !!args.pakai_kamera, {
          request: String(args.permintaan || ''),
          shape: ['persegi', 'tegak', 'mendatar'].includes(args.ukuran) ? args.ukuran : '',
        });

      case 'lokasi_saya': {
        const pos = await getPosition();
        const place = await describePosition(pos);
        return { lokasi: shortPlace(place), kota: place.kota, provinsi: place.provinsi, akurasi_meter: pos.acc };
      }

      case 'cari_tempat': {
        const pos = await getPosition();
        const place = await describePosition(pos);
        const area = [place.kelurahan || place.kecamatan, place.kota].filter(Boolean).join(', ');
        ui.showPlaces(String(args.kata_kunci || ''), pos, area);
        return {
          daerah_pengguna: area || shortPlace(place),
          catatan: `Peta & tombol Google Maps sudah tampil. Sekarang cari dengan ${quickSearchMode() ? 'Google Search' : 'cari_info'}: "${args.kata_kunci} terbaik dekat ${area}" lalu sebut 2–3 rekomendasi singkat beserta perkiraan jaraknya.`,
        };
      }

      case 'rute': {
        const mode = ['mobil', 'motor', 'jalan'].includes(args.moda) ? args.moda : 'mobil';
        return await ui.showRoute(String(args.tujuan || ''), mode, String(args.dari || '').trim());
      }

      case 'gambar_aksi':
        return await ui.imageAction(args.aksi === 'tutup' ? 'buang' : args.aksi, String(args.perubahan || ''));

      case 'galeri':
        return await ui.gallery(args.aksi === 'tutup' ? 'tutup' : 'buka');

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

// Agen riset internet. Hasil pencarian TIDAK disimpan ke ingatan (cepat basi).
async function searchTool(args, ui) {
  const q = String(args.pertanyaan || '').trim();
  if (!q) return { error: 'Pertanyaannya kosong' };
  const { keys } = memory.get();
  if (!keys.groq && !keys.gemini) {
    return { error: 'tidak_bisa', catatan: 'Rara butuh kunci Groq (gratis) atau Gemini. Bilang jujur kamu tidak bisa mengecek internet sekarang dan sarankan mengisi kunci Groq di Pengaturan; JANGAN menebak.' };
  }
  const health = !!args.kesehatan || guessCats(q).includes('kesehatan');
  // Papan kerja tim: Rara mencari → Vera mengecek.
  const job = ui.startJob('rara', `Mencari: ${q}`);
  let r;
  try {
    r = await researchChecked(q, { onStage: (who, text) => job.pass(who, text) });
  } catch (e) {
    job.fail('Gangguan saat mencari');
    throw e;
  }
  if (r.ok && r.found) {
    job.done(r.badge || 'Selesai');
    if (r.sources.length) ui.showSources(q, r.sources, r.queries, r.badge);
    const how = {
      cocok: r.support >= 2 ? 'Sudah dicek Vera dan cocok dengan sumber.' : 'Dicek Vera, tapi baru didukung 1 sumber; bilang singkat bahwa infonya baru dari satu sumber.',
      beda: 'Vera menemukan sumber berbeda-beda: sampaikan sebagai kisaran dan bilang sumbernya berbeda.',
      lemah: 'Vera: sebagian info belum terbukti; sampaikan hanya yang ada di jawaban ini dan bilang kamu belum yakin sepenuhnya.',
    }[r.status] || 'Belum sempat dicek Vera; sampaikan dengan hati-hati.';
    return {
      jawaban: r.text,
      jumlah_sumber: r.sources.length,
      cek_vera: r.badge || 'belum dicek',
      catatan: (r.sources.length
        ? 'Sampaikan HANYA isi jawaban ini dengan singkat (1–3 kalimat), jangan menambah angka atau detail sendiri. Sumbernya sudah tampil di layar (Kartu Berita); jangan membacakan link. '
        : 'Tidak ada sumber yang mendukung jawaban ini; sampaikan dengan hati-hati bahwa kamu belum yakin. ')
        + how
        + (health ? ' Tutup dengan pesan singkat: tetap konsultasi ke dokter ya.' : ''),
    };
  }
  if (r.ok) {
    job.fail(r.checked ? 'Vera: tidak ada yang terbukti' : 'Tidak ketemu');
    return { ketemu: false, catatan: r.checked
      ? 'Rara menemukan sesuatu, tetapi Vera tidak menemukan buktinya di sumber. Bilang jujur kamu belum menemukan info yang pasti; JANGAN menebak atau mengarang.'
      : 'Info ini tidak ditemukan di internet. Bilang jujur kamu tidak menemukannya; JANGAN menebak atau mengarang.' };
  }
  job.fail(r.reason === 'habis' ? 'Jatah habis' : r.reason === 'auth' ? 'Kunci ditolak' : 'Gangguan');
  if (r.reason === 'habis') {
    if (!ui.switchToQuickSearch(q)) {
      return { error: 'jatah_habis', catatan: 'Jatah pencarian internet hari ini habis. Bilang jujur kamu belum bisa mengecek sekarang; JANGAN menebak.' };
    }
    return {
      jatah_habis: true,
      catatan: r.nofree
        ? `Google belum memberi Rara jatah pencarian untuk kunci ini. Ucapkan SATU kalimat saja: "Rara belum dapat izin dari Google, aku pakai pencarian cepat ya, sebentar."${keys.groq ? '' : ' Boleh tambahkan singkat: Rara bisa semangat lagi kalau diberi kunci Groq gratis di Pengaturan.'} Jangan menjawab pertanyaannya sekarang.`
        : `Jatah pencarian teliti sedang habis. Ucapkan SATU kalimat saja: "Jatah cek Rara habis, aku pindah ke pencarian cepat ya, sebentar."${keys.groq ? '' : ' Boleh tambahkan singkat: Rara bisa semangat lagi kalau diberi kunci Groq gratis di Pengaturan.'} Jangan menjawab pertanyaannya sekarang.`,
    };
  }
  if (r.reason === 'auth') {
    return { error: 'kunci_ditolak', catatan: 'Kunci Gemini ditolak untuk pencarian. Bilang jujur kamu tidak bisa mengecek sekarang; JANGAN menebak.' };
  }
  return { error: 'gangguan', catatan: 'Pencarian sedang gangguan. Bilang jujur kamu belum bisa mengecek sekarang dan tawarkan coba lagi sebentar lagi; JANGAN menebak.' };
}
