// PANDU, perencana di tim Gaby: memecah tugas besar ("rencanakan liburan ke Bali, budget 5 juta")
// menjadi langkah, menjalankannya dengan alat (Rara untuk riset, cuaca, jarak, laci ingatan,
// jadwal pengguna), lalu menyerahkan rencana terstruktur. Vera mengeceknya sebelum disimpan;
// kalau Vera menemukan masalah, Pandu memperbaiki SEKALI.
// Memakai Groq (GPT-OSS 120B dengan pemanggilan alat). Pandu tidak pernah membeli,
// membayar, memesan, atau mengirim pesan.

import { memory, CATEGORIES } from './memory.js';
import { groqModels, groqChat, reasoningFor, waitNeeded } from './groq.js';
import { orModels, orChat, orAvailable, orRefreshLimit, orLabel } from './openrouter.js';
import { groqLabel } from './groq.js';
import { research } from './research.js';
import { weather } from './tools.js';
import { getPosition, geocode, route } from './location.js';

const MAX_TURNS = 14;
const MAX_SEARCH = 3; // 3 pencarian gabungan per topik (transportasi, penginapan, kuliner/wisata)

// Skema rencana (juga dipakai Vera & kartu). Keterangan sengaja singkat: daftar alat ini
// dikirim ulang di setiap langkah, dan jatah token per menit Groq terbatas.
const S = { type: 'string' };
const N = { type: 'number' };
const obj = (properties, required) => ({ type: 'object', properties, required });
export const PLAN_TYPES = ['perjalanan', 'proyek', 'acara', 'belajar', 'kesehatan', 'belanja', 'lainnya'];
export const TIERS = ['hemat', 'seimbang', 'nyaman'];
const KELAS = { type: 'string', enum: TIERS };
const PLAN_SCHEMA = obj({
  jenis: { type: 'string', enum: PLAN_TYPES },
  judul: { type: 'string', description: 'maks 6 kata + pembeda, misal "Liburan Bali (Hotel C)"' },
  ringkasan: S,
  tanggal: { type: 'string', description: 'misal "12–14 Des 2026" atau ""' },
  tanggal_mulai: { type: 'string', description: 'YYYY-MM-DD atau ""' },
  total_biaya: { type: 'number', description: 'rupiah = jumlah rincian_biaya' },
  rincian_biaya: { type: 'array', items: obj({ item: S, biaya: N }, ['item', 'biaya']) },
  tempat: { type: 'array', description: 'hotel (2–3 kelas) / tempat / toko / produk', items: obj({ jenis: S, kelas: KELAS, dipilih: { type: 'boolean' }, nama: S, area: S, harga: S, catatan: S }, ['jenis', 'nama']) },
  jadwal: { type: 'array', items: obj({ waktu: S, kegiatan: S }, ['waktu', 'kegiatan']) },
  transportasi: { type: 'array', description: 'perjalanan: 2–3 pilihan berjenjang, nama maskapai/kereta/bus', items: obj({ kelas: KELAS, dipilih: { type: 'boolean' }, moda: S, nama: S, rute: S, waktu: S, harga: S, catatan: S }, ['moda', 'nama']) },
  kuliner: { type: 'array', description: 'nama resto/warung/menu', items: obj({ nama: S, area: S, menu: S, harga: S, waktu: S }, ['nama']) },
  tujuan: S,
  fitur: { type: 'array', description: 'proyek: fitur/poin utama', items: obj({ nama: S, prioritas: { type: 'string', enum: ['wajib', 'nanti'] } }, ['nama']) },
  alat: { type: 'array', description: 'teknologi/aplikasi/bahan/sumber belajar', items: obj({ nama: S, kegunaan: S, biaya: S }, ['nama']) },
  risiko: { type: 'array', items: S },
  checklist: { type: 'array', items: S, description: 'tugas persiapan / langkah pertama' },
  pengingat: { type: 'array', description: 'tanggal masa depan saja', items: obj({ pesan: S, tanggal: { type: 'string', description: 'YYYY-MM-DD' }, jam: { type: 'string', description: 'HH:MM' } }, ['pesan', 'tanggal']) },
  catatan: { type: 'array', items: S, description: 'asumsi/perkiraan' },
}, ['jenis', 'judul', 'ringkasan', 'total_biaya', 'rincian_biaya', 'jadwal', 'checklist']);

const fn = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

const TOOLS = [
  fn('tentukan_langkah', 'Pertama: 3–7 langkah singkat.', { langkah: { type: 'array', items: S } }, ['langkah']),
  fn('cari_internet', 'Rara mencari info terbaru (harga, hotel, tiket, jadwal, produk); sudah dicek Vera.', { pertanyaan: S }, ['pertanyaan']),
  fn('cuaca', 'Cuaca hari ini & besok di kota.', { kota: S }, ['kota']),
  fn('jarak', 'Jarak & waktu tempuh (tanpa macet). dari kosong = lokasi pengguna.', { dari: S, ke: S, kendaraan: { type: 'string', enum: ['mobil', 'motor', 'jalan'] } }, ['ke']),
  fn('buka_ingatan', 'Ingatan tentang pengguna untuk satu topik.', { topik: S }, ['topik']),
  fn('jadwal_saya', 'Pengingat & to-do aktif pengguna.'),
  fn('lihat_rencana', 'Isi rencana tersimpan.', { nomor: N }, ['nomor']),
  { type: 'function', function: { name: 'simpan_rencana', description: 'Rencana final (dicek Vera). Sekali di akhir.', parameters: PLAN_SCHEMA } },
];

const num = (v) => {
  if (typeof v === 'number' && isFinite(v)) return Math.round(v);
  const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10);
  return isFinite(n) ? n : 0;
};
const str = (v, max = 300) => String(v == null ? '' : v).trim().slice(0, max);
const arr = (v) => (Array.isArray(v) ? v : []);

// Dari beberapa pilihan berjenjang, pastikan tepat SATU yang "dipilih" (dipakai di total biaya).
// Kalau model tidak memilih: ambil kelas seimbang, kalau tidak ada ya yang pertama.
function pickOne(list, isTiered = () => true) {
  const tiered = list.filter(isTiered);
  if (!tiered.length) return list;
  const chosen = tiered.filter((t) => t.dipilih);
  if (chosen.length !== 1) {
    tiered.forEach((t) => { t.dipilih = false; });
    (tiered.find((t) => t.kelas === 'seimbang') || chosen[0] || tiered[0]).dipilih = true;
  }
  return list;
}

// Rapikan rencana dari model: angka jadi angka, total = jumlah rincian (dihitung ulang di sini).
export function normalizePlan(raw) {
  const p = raw || {};
  const rincian = arr(p.rincian_biaya).map((r) => ({ item: str(r.item, 80), biaya: num(r.biaya) })).filter((r) => r.item).slice(0, 15);
  const sum = rincian.reduce((a, r) => a + r.biaya, 0);
  let total = num(p.total_biaya);
  const fixes = [];
  if (rincian.length && total !== sum) {
    if (total) fixes.push(`Total diperbaiki dari Rp${total.toLocaleString('id-ID')} menjadi Rp${sum.toLocaleString('id-ID')} (jumlah rincian).`);
    total = sum;
  }
  // Pengingat yang tanggalnya sudah lewat langsung dibuang (bukan kesalahan besar).
  const today = new Date().toLocaleDateString('sv-SE');
  const reminders = arr(p.pengingat).map((r) => ({ pesan: str(r.pesan, 120), tanggal: str(r.tanggal, 10), jam: /^\d{1,2}[:.]\d{2}$/.test(str(r.jam)) ? str(r.jam).replace('.', ':') : '09:00' }))
    .filter((r) => r.pesan && /^\d{4}-\d{2}-\d{2}$/.test(r.tanggal));
  const past = reminders.filter((r) => r.tanggal < today);
  if (past.length) fixes.push(`Pengingat yang tanggalnya sudah lewat dihapus: ${past.map((r) => r.pesan).join(', ')}.`);
  return {
    plan: {
      jenis: PLAN_TYPES.includes(p.jenis) ? p.jenis : 'lainnya',
      judul: str(p.judul, 80) || 'Rencana',
      ringkasan: str(p.ringkasan, 400),
      tanggal: str(p.tanggal, 60),
      tanggal_mulai: /^\d{4}-\d{2}-\d{2}$/.test(str(p.tanggal_mulai)) ? str(p.tanggal_mulai) : '',
      total_biaya: total,
      rincian_biaya: rincian,
      tempat: pickOne(arr(p.tempat).map((t) => ({ jenis: str(t.jenis, 20) || 'tempat', kelas: TIERS.includes(t.kelas) ? t.kelas : '', dipilih: t.dipilih === true, nama: str(t.nama, 80), area: str(t.area, 80), harga: str(t.harga, 60), catatan: str(t.catatan, 160) })).filter((t) => t.nama).slice(0, 8), (t) => /hotel|penginapan|villa|resort|homestay/i.test(t.jenis)),
      jadwal: arr(p.jadwal).map((j) => ({ waktu: str(j.waktu, 40), kegiatan: str(j.kegiatan, 240) })).filter((j) => j.kegiatan).slice(0, 20),
      transportasi: pickOne(arr(p.transportasi).map((t) => ({ kelas: TIERS.includes(t.kelas) ? t.kelas : '', dipilih: t.dipilih === true, moda: str(t.moda, 20), nama: str(t.nama, 80), rute: str(t.rute, 80), waktu: str(t.waktu, 60), harga: str(t.harga, 60), catatan: str(t.catatan, 120) })).filter((t) => t.nama).slice(0, 6)),
      kuliner: arr(p.kuliner).map((k) => ({ nama: str(k.nama, 80), area: str(k.area, 60), menu: str(k.menu, 100), harga: str(k.harga, 60), waktu: str(k.waktu, 40) })).filter((k) => k.nama).slice(0, 10),
      tujuan: str(p.tujuan, 300),
      fitur: arr(p.fitur).map((f) => ({ nama: str(typeof f === 'string' ? f : f.nama, 120), prioritas: (f && f.prioritas === 'nanti') ? 'nanti' : 'wajib' })).filter((f) => f.nama).slice(0, 12),
      alat: arr(p.alat).map((a) => ({ nama: str(typeof a === 'string' ? a : a.nama, 80), kegunaan: str(a && a.kegunaan, 120), biaya: str(a && a.biaya, 60) })).filter((a) => a.nama).slice(0, 10),
      risiko: arr(p.risiko).map((r) => str(r, 160)).filter(Boolean).slice(0, 6),
      checklist: arr(p.checklist).map((c) => str(c, 120)).filter(Boolean).slice(0, 15),
      pengingat: reminders.filter((r) => r.tanggal >= today).slice(0, 8),
      catatan: arr(p.catatan).map((c) => str(c, 200)).filter(Boolean).slice(0, 8),
      sumber: [],
    },
    fixes,
  };
}

function userContext(base) {
  const st = memory.get();
  const dislikes = st.profile.filter((m) => m.rasa === 'tidak').map((m) => `- ${m.text}`).join('\n') || '- (tidak ada)';
  const about = st.profile.filter((m) => ['diri', 'keluarga', 'keuangan'].includes(m.cat)).slice(-15)
    .map((m) => `- [${CATEGORIES[m.cat].replace(/^\S+\s/, '')}] ${m.text}`).join('\n') || '- (belum ada)';
  const now = new Date();
  const when = now.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `Waktu sekarang: ${when} (${now.toLocaleDateString('sv-SE')}).
Pengguna: ${st.nickname || 'pengguna'}.
Hal yang TIDAK disukai / alergi / pantangan pengguna (JANGAN disarankan):
${dislikes}
Sekilas tentang pengguna:
${about}${base ? `

INI PERUBAHAN dari Rencana #${base.no} "${base.title}". Isi rencana lama:
${JSON.stringify(base.data).slice(0, 4000)}
Pertahankan semua yang tidak diminta berubah. Judul baru harus menyebut pembedanya.` : ''}`;
}

const SYSTEM = `Kamu PANDU, perencana di tim asisten suara Gaby. Kerjakan permintaan pengguna sampai menjadi rencana yang rapi dan bisa langsung dipakai.

Cara kerja:
1. Panggil tentukan_langkah dulu (3–7 langkah).
2. HEMAT LANGKAH: panggil beberapa alat sekaligus dalam satu giliran (misal tentukan_langkah bersama cari_internet, atau buka_ingatan bersama jadwal_saya).
   cari_internet paling banyak ${MAX_SEARCH} kali, SATU per topik dan gabungkan isinya, misal perjalanan: (1) "transportasi Jakarta–Bali 12 Des semua maskapai (AirAsia, Lion, Super Air Jet, Citilink, Batik, Garuda) harga termurah sampai ternyaman", (2) "hotel di Kuta kelas hemat, menengah, nyaman beserta harga per malam", (3) "kuliner terkenal & tempat wisata Kuta dan Ubud beserta kisaran harga". Harga, hotel, tiket, jadwal, dan produk HARUS dari cari_internet (paling banyak ${MAX_SEARCH} kali; gabungkan pertanyaan yang mirip). Jangan mengarang angka; kalau tidak ketemu, tulis perkiraan wajar dan sebut di catatan bahwa itu perkiraan.
3. Pakai buka_ingatan / jadwal_saya kalau rencana menyangkut keluarga, kesehatan, keuangan, atau tanggal tertentu.
4. Akhiri dengan simpan_rencana. total_biaya = jumlah rincian_biaya (rupiah, angka). Tulis semua teks dalam bahasa Indonesia yang ringkas.

Isi sesuai jenis (tentukan dulu jenisnya):
- perjalanan: WAJIB transportasi berisi 2–3 pilihan BERJENJANG (kelas hemat / seimbang / nyaman, misal AirAsia atau Lion / Citilink atau Batik / Garuda) dengan nama, rute, perkiraan jam, kisaran harga, catatan (bagasi, "cek ulang saat pesan"); hotel juga 2–3 kelas di tempat (jenis "hotel"). Tandai dipilih=true pada SATU pilihan transportasi dan SATU hotel yang dipakai di total_biaya (sesuai budget & kesukaan; tanpa budget → seimbang). Kuliner berisi NAMA resto/warung per hari (area & kisaran harga). Jadwal per hari menyebut nama tempat & resto.
- proyek (bikin aplikasi, usaha, renovasi): tujuan, fitur (prioritas wajib/nanti), alat/teknologi + biaya, jadwal = tahapan per minggu, rincian biaya, risiko, checklist = langkah pertama. Kamu hanya merencanakan, bukan membuatnya.
- acara: tempat, kuliner = menu/katering, checklist = persiapan & belanja.
- belajar / kesehatan: tujuan, jadwal per minggu, alat = materi/sumber/peralatan.
- belanja: tempat berisi produk (jenis "produk", harga, catatan kelebihan/kekurangan) lalu rekomendasi di ringkasan.

Aturan:
- JANGAN pernah membeli, membayar, memesan, atau mengirim pesan; kamu hanya merencanakan.
- Jangan menyarankan hal yang tidak disukai pengguna.
- Pengingat hanya untuk tanggal di masa depan.
`;

// Hemat token (khusus Groq yang dibatasi token per menit): hasil alat lama dipadatkan, karena
// seluruh percakapan dikirim ulang di setiap langkah. hard = padatkan lebih keras (setelah ditolak "terlalu besar").
function compact(messages, hard = false) {
  const tools = messages.filter((m) => m.role === 'tool');
  const keep = hard ? 1 : 2;
  const max = hard ? 250 : 450;
  for (const m of tools.slice(0, -keep)) {
    if (m.content.length > max) m.content = `${m.content.slice(0, max - 30)}… (dipadatkan)`;
  }
  if (hard) for (const m of tools.slice(-keep)) if (m.content.length > 1200) m.content = `${m.content.slice(0, 1170)}… (dipadatkan)`;
}

function trimResult(obj, max = 1800) {
  const s = JSON.stringify(obj);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

const tokensOf = (messages) => Math.ceil((JSON.stringify(messages).length + JSON.stringify(TOOLS).length) / 3.5);
const GROQ_TPM = 7600; // batas aman token per menit Groq gratis (isi + jatah jawaban)

// Catatan Pandu untuk Pengaturan: otak terakhir & alasan gagal terakhir.
const LOG = 'gaby.pandu';
function logPandu(patch) {
  try {
    const st = JSON.parse(localStorage.getItem(LOG) || '{}') || {};
    localStorage.setItem(LOG, JSON.stringify({ ...st, ...patch }));
  } catch {}
}
export function panduStatus() {
  try {
    const st = JSON.parse(localStorage.getItem(LOG) || '{}') || {};
    const ok = st.lastOk ? `terakhir pakai ${st.lastOk.label}` : '';
    const fail = st.lastFail && (!st.lastOk || st.lastFail.at > st.lastOk.at) ? `terakhir gagal: ${st.lastFail.text}` : '';
    return [ok, fail].filter(Boolean).join(' · ');
  } catch { return ''; }
}

// Daftar "otak" Pandu, berurutan: OpenRouter (Nemotron, jatah per permintaan) → Groq (GPT-OSS, jatah per token).
async function brains(keys) {
  const list = [];
  if (keys.openrouter && orAvailable(true)) {
    orRefreshLimit(keys.openrouter);
    for (const m of await orModels()) list.push({ via: 'openrouter', model: m, label: `OpenRouter ${orLabel(m)}` });
  }
  if (keys.groq) for (const m of await groqModels(keys.groq, 'pandu')) list.push({ via: 'groq', model: m, label: `Groq ${groqLabel(m)}` });
  return list;
}

// Satu giliran Pandu pada satu otak. Hasil: { data } atau { error, message }.
async function think(b, keys, messages, toolChoice, hooks) {
  if (b.via === 'openrouter') {
    // Tidak ada batas token per menit: hasil riset dibaca lengkap, jatah jawaban longgar
    // (model "berpikir dulu" memakai jatah jawaban untuk berpikir).
    const body = { model: b.model, messages, tools: TOOLS, tool_choice: toolChoice, temperature: 0.3, max_tokens: 8000, reasoning: { effort: 'low', exclude: true } };
    let r = await orChat(keys.openrouter, body);
    if (['minute', 'busy', 'timeout', 'network'].includes(r.error)) {
      if (hooks.onWait) hooks.onWait(5);
      await new Promise((ok) => setTimeout(ok, 5000));
      r = await orChat(keys.openrouter, body);
    }
    return r;
  }
  // Groq: jatah jawaban 1.700 per langkah, sampai 2.500 kalau masih ada ruang (untuk menyimpan rencana).
  compact(messages);
  if (GROQ_TPM - tokensOf(messages) < 1700) compact(messages, true);
  const maxTok = Math.max(1700, Math.min(2500, GROQ_TPM - tokensOf(messages)));
  const body = (max) => ({ model: b.model, messages, tools: TOOLS, tool_choice: toolChoice, temperature: 0.3, max_completion_tokens: max, ...reasoningFor(b.model, false) });
  const opts = { onWait: (sec) => hooks.onWait && hooks.onWait(sec) };
  let r = await groqChat(keys.groq, body(maxTok), 60000, opts);
  for (let wait = 0; r.error === 'minute' && wait < 3; wait++) {
    const sec = Math.ceil(Math.min(Math.max(r.retryAfter * 1000, 2000), 20000) / 1000);
    if (hooks.onWait) hooks.onWait(sec);
    await new Promise((ok) => setTimeout(ok, sec * 1000));
    r = await groqChat(keys.groq, body(maxTok), 60000, opts);
  }
  if (r.error === 'toolarge') {
    // Satu permintaan melebihi batas per menit: padatkan keras & kecilkan jatah jawaban, coba sekali lagi.
    compact(messages, true);
    r = await groqChat(keys.groq, body(1700), 60000, opts);
  }
  if (r.error === 'network' || r.error === 'timeout') r = await groqChat(keys.groq, body(maxTok), 60000, opts);
  return r;
}

const BRAIN_ERR = {
  auth: 'kunci ditolak', day: 'jatah harian habis', privacy: 'izin privasi model gratis OpenRouter belum dinyalakan',
  credits: 'OpenRouter minta saldo', model: 'model tidak tersedia', toolarge: 'permintaan terlalu besar untuk batas per menit',
  minute: 'batas per menit', busy: 'server sibuk', timeout: 'terlalu lama menjawab', network: 'gangguan jaringan',
};

// Jalankan Pandu.
//   request: permintaan pengguna; base: rencana lama (kalau mengubah) atau null
//   hooks: { onSteps(list), onStep(i, text), onRara(who, text), onWait(sec), onBrain(label), onFix(text), verify(plan) → { ok, feedback } }
// Hasil: { plan, fixes, sources, model, vera } atau lempar Error (pesan ramah).
export async function runPandu({ request, base = null, hooks = {} }) {
  const { keys } = memory.get();
  if (!keys.groq && !keys.openrouter) throw new Error('Pandu butuh kunci Groq atau OpenRouter (Pengaturan → Otak Gaby).');
  const list = await brains(keys);
  if (!list.length) throw new Error('Pandu belum punya otak yang bisa dipakai (OpenRouter sedang istirahat dan belum ada kunci Groq).');
  let bi = 0;
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `${userContext(base)}\n\nPERMINTAAN PENGGUNA: "${request}"` },
  ];
  const sources = [];
  const failures = [];
  let searches = 0;
  let stepsCount = 0;
  let calls = 0;
  let verified = false;
  let salvage = false; // jatah mentok di tengah jalan: minta Pandu menyimpan dari data yang ada
  const step = (text) => {
    calls++;
    if (hooks.onStep) hooks.onStep(Math.min(calls, Math.max(stepsCount - 1, 0)), text);
  };

  const runTool = async (name, a) => {
    switch (name) {
      case 'tentukan_langkah': {
        const steps = arr(a.langkah).map((x) => str(x, 60)).filter(Boolean).slice(0, 7);
        stepsCount = steps.length;
        if (hooks.onSteps) hooks.onSteps(steps);
        if (hooks.onStep && steps.length) hooks.onStep(0, steps[0]);
        return { ok: true };
      }
      case 'cari_internet': {
        if (searches >= MAX_SEARCH) return { error: `Batas ${MAX_SEARCH} pencarian tercapai. Lanjutkan dengan info yang ada, lalu simpan_rencana.` };
        searches++;
        const q = str(a.pertanyaan, 300);
        step(`Rara mencari: ${q}`);
        if (hooks.onRara) hooks.onRara('rara', `Mencari: ${q}`);
        // Hemat: tanpa Vera per pencarian (Vera mengecek rencana akhirnya), jawaban Rara rinci per pilihan.
        const r = await research(q, { small: true, detail: true });
        if (hooks.onRara) hooks.onRara('pandu', 'Mengolah hasil Rara…');
        if (r.ok && r.found) {
          for (const x of r.sources || []) if (!sources.some((y) => y.url === x.url)) sources.push(x);
          return { jawaban: r.text, sumber: (r.sources || []).map((x) => x.title).slice(0, 5) };
        }
        return { ketemu: false, catatan: r.reason === 'habis' ? 'Jatah pencarian habis; pakai perkiraan wajar dan tulis di catatan.' : 'Tidak ketemu; pakai perkiraan wajar dan tulis di catatan.' };
      }
      case 'cuaca': {
        step(`Cek cuaca ${str(a.kota, 40)}`);
        try { return await weather(str(a.kota, 60)); } catch (e) { return { error: e.message }; }
      }
      case 'jarak': {
        step(`Hitung jarak ke ${str(a.ke, 40)}`);
        try {
          let from;
          if (str(a.dari)) from = await geocode(str(a.dari, 80));
          else { const pos = await getPosition(); from = { lat: pos.lat, lon: pos.lon, nama: 'lokasi pengguna' }; }
          const to = await geocode(str(a.ke, 80), from);
          const r = await route(from, to, ['mobil', 'motor', 'jalan'].includes(a.kendaraan) ? a.kendaraan : 'mobil');
          return { dari: from.nama, ke: to.nama, km: r.km, waktu: r.waktu, catatan: 'tanpa data macet' };
        } catch (e) {
          return { error: e.message };
        }
      }
      case 'buka_ingatan': {
        step(`Buka laci ${str(a.topik, 30)}`);
        return memory.recall(str(a.topik, 80));
      }
      case 'jadwal_saya': {
        step('Cek jadwalmu');
        const st = memory.get();
        const fmt = (t) => new Date(t).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return {
          pengingat: st.reminders.filter((r) => !r.done && r.due > Date.now()).slice(0, 15).map((r) => `${fmt(r.due)}: ${r.text}`),
          todo: memory.openTodos().slice(0, 15).map((t) => t.text),
        };
      }
      case 'lihat_rencana': {
        const p = memory.getPlan(a.nomor);
        return p ? { nomor: p.no, judul: p.title, isi: p.data } : { error: `Rencana #${a.nomor} tidak ada` };
      }
      default:
        return { error: `Alat ${name} tidak dikenal` };
    }
  };

  const finish = (plan, fixes, b, vera, rechecked = false) => {
    if (salvage) plan.catatan = [...plan.catatan, 'Sebagian data masih perkiraan karena jatah AI sedang terbatas.'].slice(0, 9);
    logPandu({ lastOk: { label: b.label, at: Date.now() } });
    return { plan, fixes, sources, model: b.model, brain: b.label, vera, rechecked };
  };

  for (let turn = 0; turn < MAX_TURNS + 2; turn++) {
    const b = list[bi];
    if (!b) break;
    if (hooks.onBrain) hooks.onBrain(b.label);
    const last = turn >= MAX_TURNS || salvage;
    if (turn === MAX_TURNS) messages.push({ role: 'user', content: 'Waktunya hampir habis. Segera panggil simpan_rencana dengan data yang sudah ada.' });
    // Groq: kalau model utama harus menunggu lama, pinjam model Groq lain yang jatahnya kosong untuk giliran ini.
    let use = b;
    if (b.via === 'groq' && waitNeeded(b.model, tokensOf(messages) + 1700) > 8000) {
      const free = list.slice(bi + 1).find((x) => x.via === 'groq' && waitNeeded(x.model, tokensOf(messages) + 1700) === 0);
      if (free) use = free;
    }
    const r = await think(use, keys, messages, last ? { type: 'function', function: { name: 'simpan_rencana' } } : 'required', hooks);
    if (r.error) {
      failures.push(`${use.label}: ${BRAIN_ERR[r.error] || r.message || r.error}`);
      console.warn('[Gaby] Pandu', use.label, r.error, r.message);
      // Lewati otak yang sama jenisnya kalau masalahnya ada di akun (kunci / jatah harian / privasi / saldo).
      const skipVia = ['auth', 'day', 'privacy', 'credits'].includes(r.error) ? use.via : null;
      bi++;
      while (skipVia && list[bi] && list[bi].via === skipVia) bi++;
      if (!list[bi]) break;
      // Sudah ada data riset: otak berikutnya diminta langsung menyimpan supaya tidak gagal total.
      if (searches > 0 || calls > 2) {
        salvage = true;
        messages.push({ role: 'user', content: 'Sebagian langkah gagal karena jatah AI. Segera simpan_rencana dengan data yang sudah ada; tulis di catatan bagian mana yang masih perkiraan.' });
      }
      turn--;
      continue;
    }
    const msg = r.data.choices?.[0]?.message || {};
    const toolCalls = msg.tool_calls || [];
    if (!toolCalls.length) {
      messages.push({ role: 'assistant', content: msg.content || '' });
      messages.push({ role: 'user', content: 'Gunakan alat. Kalau sudah cukup, panggil simpan_rencana.' });
      continue;
    }
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls });
    for (const tc of toolCalls) {
      let args = {};
      try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { args = {}; }
      const name = tc.function?.name;
      let result;
      if (name === 'simpan_rencana') {
        const { plan, fixes } = normalizePlan(args);
        plan.sumber = sources.slice(0, 8);
        if (!plan.jadwal.length && !plan.rincian_biaya.length && !plan.checklist.length) {
          result = { error: 'Rencana masih kosong (atau terpotong). Isi jadwal / rincian_biaya / checklist dengan ringkas, lalu simpan_rencana lagi.' };
        } else if (!verified && hooks.verify && !salvage) {
          verified = true;
          if (hooks.onStep) hooks.onStep(Math.max(stepsCount - 1, 0), 'Menyerahkan ke Vera…');
          const v = await hooks.verify(plan, fixes);
          if (v && !v.ok && v.feedback) {
            result = { ditolak_vera: true, perbaiki: v.feedback, catatan: 'Perbaiki hal ini saja, lalu panggil simpan_rencana lagi.' };
            if (hooks.onFix) hooks.onFix(v.feedback);
          } else {
            return finish(plan, fixes, use, v);
          }
        } else {
          return finish(plan, fixes, use, null, true);
        }
      } else {
        result = await runTool(name, args);
      }
      // OpenRouter tidak dibatasi token per menit: hasil riset dikirim lebih lengkap.
      messages.push({ role: 'tool', tool_call_id: tc.id, content: trimResult(result, use.via === 'openrouter' ? 6000 : 1800) });
    }
  }
  const why = failures.length ? failures.slice(-2).join('; ') : 'tidak berhasil menyelesaikan rencana';
  logPandu({ lastFail: { text: why.slice(0, 200), at: Date.now() } });
  throw new Error(`Pandu belum berhasil (${why}). Coba lagi sebentar lagi.`);
}
