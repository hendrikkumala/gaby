// PANDU, perencana di tim Gaby: memecah tugas besar ("rencanakan liburan ke Bali, budget 5 juta")
// menjadi langkah, menjalankannya dengan alat (Rara untuk riset, cuaca, jarak, laci ingatan,
// jadwal pengguna), lalu menyerahkan rencana terstruktur. Vera mengeceknya sebelum disimpan;
// kalau Vera menemukan masalah, Pandu memperbaiki (2 kali lewat OpenRouter, 1 kali lewat Groq).
// Memakai Groq (GPT-OSS 120B dengan pemanggilan alat). Pandu tidak pernah membeli,
// membayar, memesan, atau mengirim pesan.

import { memory, CATEGORIES } from './memory.js';
import { groqModels, groqChat, groqPatient, reasoningFor, waitNeeded } from './groq.js';
import { orModels, orChat, orAvailable, orRefreshLimit, orLabel } from './openrouter.js';
import { groqLabel } from './groq.js';
import { research } from './research.js';
import { weather } from './tools.js';
import { getPosition, geocode, route } from './location.js';
import { scheduleGaps, dayOf, tripEnds, quickIssues } from './vera.js';

const MAX_TURNS = 24; // v1.25: lebih banyak giliran karena otak Groq menulis bertahap (draf per bagian / per 2 hari)
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
  tanggal_selesai: { type: 'string', description: 'hari terakhir, YYYY-MM-DD atau ""' },
  total_biaya: { type: 'number', description: 'rupiah = jumlah rincian_biaya' },
  rincian_biaya: { type: 'array', items: obj({ item: S, biaya: N }, ['item', 'biaya']) },
  tempat: { type: 'array', description: 'hotel (2–3 kelas) / tempat / toko / produk', items: obj({ jenis: S, kelas: KELAS, dipilih: { type: 'boolean' }, nama: S, area: S, harga: S, catatan: S }, ['jenis', 'nama']) },
  jadwal: { type: 'array', items: obj({ waktu: { type: 'string', description: 'perjalanan: "Hari 1, 08:00"' }, kegiatan: S }, ['waktu', 'kegiatan']) },
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
  // Draf: menulis sebagian rencana (bertahap / melanjutkan yang terpotong / memperbaiki sebagian). Belum dicek Vera.
  { type: 'function', function: { name: 'tulis_draf', description: 'Tulis SEBAGIAN rencana ke draf (belum dicek Vera). Kolom sama seperti simpan_rencana (jadwal, rincian_biaya, tempat, transportasi, kuliner, risiko, checklist, pengingat, catatan, dll.). Kolom yang diisi menggantikan yang lama; jadwal digabung PER HARI (hari yang ditulis menggantikan hari yang sama).', parameters: { type: 'object', properties: { jadwal: PLAN_SCHEMA.properties.jadwal }, additionalProperties: true } } },
  { type: 'function', function: { name: 'simpan_rencana', description: 'Rencana final → dicek Vera. Bagian yang sudah ada di draf boleh dikosongkan ([] / ""), otomatis dipakai; jadwal digabung per hari.', parameters: PLAN_SCHEMA } },
];
const PLAN_KEYS = Object.keys(PLAN_SCHEMA.properties);

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
  const plan = {
      jenis: PLAN_TYPES.includes(p.jenis) ? p.jenis : 'lainnya',
      judul: str(p.judul, 80) || 'Rencana',
      ringkasan: str(p.ringkasan, 400),
      tanggal: str(p.tanggal, 60),
      tanggal_mulai: /^\d{4}-\d{2}-\d{2}$/.test(str(p.tanggal_mulai)) ? str(p.tanggal_mulai) : '',
      tanggal_selesai: /^\d{4}-\d{2}-\d{2}$/.test(str(p.tanggal_selesai)) ? str(p.tanggal_selesai) : '',
      total_biaya: total,
      rincian_biaya: rincian,
      tempat: pickOne(arr(p.tempat).map((t) => ({ jenis: str(t.jenis, 20) || 'tempat', kelas: TIERS.includes(t.kelas) ? t.kelas : '', dipilih: t.dipilih === true, nama: str(t.nama, 80), area: str(t.area, 80), harga: str(t.harga, 60), catatan: str(t.catatan, 160) })).filter((t) => t.nama).slice(0, 8), (t) => /hotel|penginapan|villa|resort|homestay/i.test(t.jenis)),
      jadwal: arr(p.jadwal).map((j) => ({ waktu: str(j.waktu, 40), kegiatan: str(j.kegiatan, 240) })).filter((j) => j.kegiatan).slice(0, 150),
      transportasi: pickOne(arr(p.transportasi).map((t) => ({ kelas: TIERS.includes(t.kelas) ? t.kelas : '', dipilih: t.dipilih === true, moda: str(t.moda, 20), nama: str(t.nama, 80), rute: str(t.rute, 80), waktu: str(t.waktu, 60), harga: str(t.harga, 60), catatan: str(t.catatan, 120) })).filter((t) => t.nama).slice(0, 6)),
      kuliner: arr(p.kuliner).map((k) => ({ nama: str(k.nama, 80), area: str(k.area, 60), menu: str(k.menu, 100), harga: str(k.harga, 60), waktu: str(k.waktu, 40) })).filter((k) => k.nama).slice(0, 30),
      tujuan: str(p.tujuan, 300),
      fitur: arr(p.fitur).map((f) => ({ nama: str(typeof f === 'string' ? f : f.nama, 120), prioritas: (f && f.prioritas === 'nanti') ? 'nanti' : 'wajib' })).filter((f) => f.nama).slice(0, 12),
      alat: arr(p.alat).map((a) => ({ nama: str(typeof a === 'string' ? a : a.nama, 80), kegunaan: str(a && a.kegunaan, 120), biaya: str(a && a.biaya, 60) })).filter((a) => a.nama).slice(0, 10),
      risiko: arr(p.risiko).map((r) => str(r, 160)).filter(Boolean).slice(0, 6),
      checklist: arr(p.checklist).map((c) => str(c, 120)).filter(Boolean).slice(0, 15),
      pengingat: reminders.filter((r) => r.tanggal >= today).slice(0, 8),
      catatan: arr(p.catatan).map((c) => str(c, 200)).filter(Boolean).slice(0, 8),
      sumber: [],
  };
  if (plan.jenis === 'perjalanan') addTripEnds(plan, fixes);
  return { plan, fixes };
}

// Tambalan PASTI (tanpa AI): perjalanan tanpa check-out / tanpa perjalanan pulang di hari terakhir.
// Model kadang lupa walau sudah diminta Vera 2x (keluhan pemilik 13 Nov 2026: rencana Cirebon #1 & #2
// berhenti di 12:30 Hari 2). Barisnya memakai transportasi yang dipilih + jam perkiraan, dan dicatat di fixes.
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function addTripEnds(plan, fixes) {
  const ends = tripEnds(plan);
  const d = ends.lastDay;
  if (!d || (!ends.needReturn && !ends.needCheckout) || plan.jadwal.length >= 150) return;
  const onLast = plan.jadwal.filter((j) => dayOf(j) === d);
  // Hanya kalau SEMUA hari sudah terisi: hari yang masih kosong harus dilengkapi Pandu dulu (scheduleGaps),
  // jangan sampai baris "pulang" membuat hari terakhir yang kosong tampak sudah ada.
  if (!onLast.length || scheduleGaps(plan).missing.length) return;
  const times = onLast.map(timeOf).filter((t) => t >= 0);
  const lastT = times.length ? Math.max(...times) : -1;
  const added = [];
  let backT = -1;
  if (ends.needReturn) {
    backT = lastT >= 0 ? Math.min(Math.ceil((lastT + 90) / 30) * 30, 23 * 60) : 15 * 60;
    const t = plan.transportasi.find((x) => x.dipilih) || plan.transportasi[0];
    const from = t ? str(t.rute.split(/\s*[–—-]\s*/)[0].replace(/\bPP\b/i, ''), 40) : '';
    const how = t ? ` naik ${t.nama}${t.waktu ? ` (${t.waktu})` : ''}` : '';
    plan.jadwal.push({ waktu: `Hari ${d}, ${hhmm(backT)}`, kegiatan: str(`Perjalanan pulang${from ? ` ke ${from}` : ''}${how} — jam perkiraan, sesuaikan`, 240) });
    added.push(`perjalanan pulang (Hari ${d}, ${hhmm(backT)})`);
  } else {
    const back = onLast.filter((j) => /pulang|kembali|balik/i.test(j.kegiatan)).map(timeOf).filter((x) => x >= 0);
    if (back.length) backT = Math.min(...back);
  }
  if (ends.needCheckout) {
    const h = plan.tempat.find((x) => x.dipilih && /hotel|penginapan|villa|resort|homestay/i.test(x.jenis))
      || plan.tempat.find((x) => /hotel|penginapan|villa|resort|homestay/i.test(x.jenis));
    // Setelah kegiatan terakhir sebelum pulang, paling lambat 30 menit sebelum pulang; pulang sore → jam check-out biasa 11:00.
    const before = times.filter((t) => backT < 0 || t < backT);
    const outT = backT >= 0 && backT <= 13 * 60
      ? Math.max(Math.min(Math.max(backT - 60, before.length ? Math.max(...before) + 30 : 0), backT - 30), 0)
      : 11 * 60;
    plan.jadwal.push({ waktu: `Hari ${d}, ${hhmm(outT)}`, kegiatan: str(`Check-out${h ? ` ${h.nama}` : ' hotel'} — jam perkiraan, sesuaikan`, 240) });
    added.push(`check-out hotel (Hari ${d}, ${hhmm(outT)})`);
  }
  plan.jadwal = mergeSchedule([], plan.jadwal);
  fixes.push(`Jadwal ${added.join(' & ')} ditambahkan otomatis karena belum ada — jamnya perkiraan.`);
}

// ---------- Draf rencana (v1.25) ----------
// Pandu boleh menulis rencana bertahap (tulis_draf) dan memperbaiki SEBAGIAN saja; kode yang
// menggabungkan. Jadwal digabung per hari: hari yang ditulis menggantikan hari yang sama.

const timeOf = (j) => {
  const m = String(j.waktu || '').match(/(\d{1,2})[:.](\d{2})/);
  return m ? +m[1] * 60 + +m[2] : -1;
};

export function mergeSchedule(old, add) {
  const fresh = arr(add).filter((j) => j && (j.kegiatan || j.waktu));
  if (!fresh.length) return arr(old);
  const days = new Set(fresh.map(dayOf).filter((d) => d != null));
  if (!days.size) return fresh; // tanpa "Hari N" (misal tahapan proyek): ganti seluruhnya
  const keep = arr(old).filter((j) => { const d = dayOf(j); return d == null ? !fresh.some((f) => f.kegiatan === j.kegiatan) : !days.has(d); });
  // Urut per hari lalu jam (yang tanpa jam tetap di urutan aslinya).
  return [...keep, ...fresh].map((j, i) => ({ j, i, d: dayOf(j) ?? 1000, t: timeOf(j) }))
    .sort((a, b) => a.d - b.d || (a.t >= 0 && b.t >= 0 ? a.t - b.t : 0) || a.i - b.i)
    .map((x) => x.j);
}

// Gabungkan tulisan Pandu ke draf. Kolom kosong ([] / "" / 0) = pertahankan yang lama.
export function mergeDraft(draft, raw) {
  const src = { ...(raw && typeof raw.lainnya === 'object' ? raw.lainnya : {}), ...(raw || {}) };
  for (const k of PLAN_KEYS) {
    const v = src[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      draft[k] = k === 'jadwal' ? mergeSchedule(draft.jadwal, v) : v;
    } else if (typeof v === 'string') {
      if (v.trim()) draft[k] = v;
    } else if (typeof v === 'number') {
      if (v) draft[k] = v;
    } else if (typeof v === 'boolean' || typeof v === 'object') {
      draft[k] = v;
    }
  }
  return draft;
}

// Argumen alat yang TERPOTONG (jawaban model melewati batas panjang): ambil bagian yang masih utuh.
// Hasil: { value, cut } — value null kalau tidak ada yang bisa diselamatkan.
export function repairJson(text) {
  const s = String(text || '');
  try { return { value: JSON.parse(s || '{}'), cut: false }; } catch {}
  const cuts = [];
  const stack = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') { stack.pop(); cuts.push([i + 1, stack.slice()]); }
    else if (c === ',') cuts.push([i, stack.slice()]);
  }
  for (let k = cuts.length - 1; k >= 0 && k >= cuts.length - 300; k--) {
    const [pos, st] = cuts[k];
    if (!st.length) continue;
    const txt = s.slice(0, pos) + st.reverse().map((b) => (b === '{' ? '}' : ']')).join('');
    try {
      const value = JSON.parse(txt);
      if (value && typeof value === 'object' && !Array.isArray(value)) return { value, cut: true };
    } catch {}
  }
  return { value: null, cut: true };
}

// "1–3, 5" dari [1,2,3,5]
const ranges = (nums) => {
  const out = [];
  for (const n of [...new Set(nums)].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && n === last[1] + 1) last[1] = n; else out.push([n, n]);
  }
  return out.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ');
};

// Ringkasan isi draf untuk Pandu (dia tidak perlu menulis ulang yang sudah ada).
export function draftSummary(draft) {
  const has = [];
  const days = arr(draft.jadwal).map(dayOf).filter((d) => d != null);
  if (arr(draft.jadwal).length) has.push(`jadwal ${days.length ? `hari ${ranges(days)} ` : ''}(${arr(draft.jadwal).length} kegiatan)`);
  for (const k of ['rincian_biaya', 'tempat', 'transportasi', 'kuliner', 'fitur', 'alat', 'risiko', 'checklist', 'pengingat', 'catatan']) {
    if (arr(draft[k]).length) has.push(`${k} ${arr(draft[k]).length}`);
  }
  for (const k of ['judul', 'ringkasan', 'tanggal', 'tanggal_mulai', 'tanggal_selesai', 'tujuan']) if (str(draft[k])) has.push(k);
  return has.length ? has.join('; ') : '(kosong)';
}

// Rencana sebagai teks ringkas (untuk otak kecil yang tidak muat membaca JSON panjang).
function briefPlan(data, max) {
  const lines = [];
  for (const [k, v] of Object.entries(data || {})) {
    if (k === 'sumber' || v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (Array.isArray(v)) lines.push(`${k}:\n${v.map((x) => `- ${typeof x === 'object' ? Object.values(x).filter((y) => y !== '' && y != null && y !== false).join(' · ') : x}`).join('\n')}`);
    else lines.push(`${k}: ${v}`);
  }
  const t = lines.join('\n');
  return t.length > max ? `${t.slice(0, max)}… (dipotong; isi lengkap tetap ada di draf)` : t;
}

function userContext(base, full = true) {
  const st = memory.get();
  const dislikes = st.profile.filter((m) => m.rasa === 'tidak').map((m) => `- ${m.text}`).join('\n') || '- (tidak ada)';
  const about = st.profile.filter((m) => ['diri', 'keluarga', 'keuangan'].includes(m.cat)).slice(-15)
    .map((m) => `- [${CATEGORIES[m.cat].replace(/^\S+\s/, '')}] ${m.text}`).join('\n') || '- (belum ada)';
  const now = new Date();
  const when = now.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  // Catatan Vera untuk rencana lama: Pandu wajib membereskannya di rencana turunan.
  const veraNotes = base && base.vera && !base.vera.ok ? arr(base.vera.issues).map((t) => `- ${str(t, 200)}`).join('\n') : '';
  return `Waktu sekarang: ${when} (${now.toLocaleDateString('sv-SE')}).
Pengguna: ${st.nickname || 'pengguna'}.
Hal yang TIDAK disukai / alergi / pantangan pengguna (JANGAN disarankan):
${dislikes}
Sekilas tentang pengguna:
${about}${base ? `

INI PERUBAHAN dari Rencana #${base.no} "${base.title}". Isi rencana lama (SUDAH ADA di draf, tidak perlu ditulis ulang):
${full ? JSON.stringify({ ...base.data, sumber: undefined }) : briefPlan(base.data, 5000)}
Pertahankan semua yang tidak diminta berubah: tulis HANYA bagian yang berubah atau kurang (tulis_draf / simpan_rencana dengan bagian lain dikosongkan). Judul baru harus menyebut pembedanya.${veraNotes ? `
Catatan Vera untuk rencana lama (WAJIB dibereskan):
${veraNotes}` : ''}` : ''}`;
}

const SYSTEM = `Kamu PANDU, perencana di tim asisten suara Gaby. Kerjakan permintaan pengguna sampai menjadi rencana yang rapi dan bisa langsung dipakai.

Cara kerja:
1. Panggil tentukan_langkah dulu (3–7 langkah).
2. HEMAT LANGKAH: panggil beberapa alat sekaligus dalam satu giliran (misal tentukan_langkah bersama cari_internet, atau buka_ingatan bersama jadwal_saya).
   cari_internet paling banyak ${MAX_SEARCH} kali, SATU per topik dan gabungkan isinya, misal perjalanan: (1) "transportasi Jakarta–Bali 12 Des semua maskapai (AirAsia, Lion, Super Air Jet, Citilink, Batik, Garuda) harga termurah sampai ternyaman", (2) "hotel di Kuta kelas hemat, menengah, nyaman beserta harga per malam", (3) "kuliner terkenal & tempat wisata Kuta dan Ubud beserta kisaran harga". Harga, hotel, tiket, jadwal, dan produk HARUS dari cari_internet (paling banyak ${MAX_SEARCH} kali; gabungkan pertanyaan yang mirip). Jangan mengarang angka; kalau tidak ketemu, tulis perkiraan wajar dan sebut di catatan bahwa itu perkiraan.
3. Pakai buka_ingatan / jadwal_saya kalau rencana menyangkut keluarga, kesehatan, keuangan, atau tanggal tertentu.
4. Akhiri dengan simpan_rencana. total_biaya = jumlah rincian_biaya (rupiah, angka). Tulis semua teks dalam bahasa Indonesia yang ringkas.
5. DRAF: tulis_draf menyimpan sebagian rencana tanpa dicek Vera. Isi draf otomatis ikut di simpan_rencana, jadi bagian yang sudah ada di draf cukup dikosongkan ([] / "") — JANGAN menulis ulang. Jadwal digabung per hari. Kalau tulisanmu terpotong, ditolak Vera, atau ada hari yang belum terisi: tulis HANYA bagian yang kurang/berubah, lalu simpan_rencana lagi.

Isi sesuai jenis (tentukan dulu jenisnya):
- perjalanan: WAJIB transportasi berisi 2–3 pilihan BERJENJANG (kelas hemat / seimbang / nyaman, misal AirAsia atau Lion / Citilink atau Batik / Garuda) dengan nama, rute, perkiraan jam, kisaran harga, catatan (bagasi, "cek ulang saat pesan"); hotel juga 2–3 kelas di tempat (jenis "hotel"). Tandai dipilih=true pada SATU pilihan transportasi dan SATU hotel yang dipakai di total_biaya (sesuai budget & kesukaan; tanpa budget → seimbang). Kuliner berisi NAMA resto/warung per hari (area & kisaran harga). Jadwal WAJIB ada untuk SETIAP hari sampai hari terakhir (waktu ditulis "Hari 1, 08:00", "Hari 2, 12:00", …), 4–6 kegiatan per hari dengan kalimat pendek, menyebut nama tempat & resto, termasuk check-out hotel dan perjalanan pulang di hari terakhir. Isi tanggal_mulai & tanggal_selesai kalau tanggalnya diketahui.
- proyek (bikin aplikasi, usaha, renovasi): tujuan, fitur (prioritas wajib/nanti), alat/teknologi + biaya, jadwal = tahapan per minggu, rincian biaya, risiko, checklist = langkah pertama. Kamu hanya merencanakan, bukan membuatnya.
- acara: tempat, kuliner = menu/katering, checklist = persiapan & belanja.
- belajar / kesehatan: tujuan, jadwal per minggu, alat = materi/sumber/peralatan.
- belanja: tempat berisi produk (jenis "produk", harga, catatan kelebihan/kekurangan) lalu rekomendasi di ringkasan.

Aturan:
- JANGAN pernah membeli, membayar, memesan, atau mengirim pesan; kamu hanya merencanakan.
- Jangan menyarankan hal yang tidak disukai pengguna.
- Pengingat hanya untuk tanggal di masa depan.
`;

// Petunjuk sesuai otak yang sedang dipakai (dikirim saat mulai & saat otak berganti jenis).
const MODE = {
  openrouter: 'MODE OTAK BESAR: tulis rencana LENGKAP sekaligus di simpan_rencana (jadwal semua hari sampai hari terakhir). Kalau tulisanmu terpotong, lanjutkan bagian yang kurang dengan tulis_draf.',
  groq: 'MODE OTAK KECIL (jatah jawaban ±1.500 token per giliran): tulis rencana BERTAHAP, satu tulis_draf per giliran: (a) transportasi + tempat + kuliner, (b) rincian_biaya + risiko + checklist + pengingat + catatan, (c) jadwal paling banyak 2 hari per panggilan sampai hari terakhir. Terakhir simpan_rencana berisi jenis, judul, ringkasan, tanggal, total_biaya; kolom lain kosongkan ([]) karena otomatis diambil dari draf. Rencana pendek (1–2 hari) boleh langsung simpan_rencana.',
};

// Hemat token (khusus Groq yang dibatasi token per menit): hasil alat lama dipadatkan, karena
// seluruh percakapan dikirim ulang di setiap langkah. hard = padatkan lebih keras (setelah ditolak "terlalu besar").
// Tulisan rencana lama (tulis_draf / simpan_rencana) sudah tersimpan di draf: cukup diganti penanda.
function shrinkDrafts(messages) {
  const asst = messages.filter((m) => m.role === 'assistant' && m.tool_calls);
  for (const m of asst.slice(0, -1)) {
    for (const tc of m.tool_calls) {
      const f = tc.function || {};
      if (['tulis_draf', 'simpan_rencana'].includes(f.name) && String(f.arguments || '').length > 200) f.arguments = '{"catatan":"(isi sudah masuk draf)"}';
    }
  }
}

function compact(messages, hard = false) {
  shrinkDrafts(messages);
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
    const pend = panduPending();
    const wait = pend ? `⏸️ tertunda: "${str(pend.request, 60)}" (bilang "lanjutkan rencananya")` : '';
    return [wait, ok, fail].filter(Boolean).join(' · ');
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

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
// Alat kecil (cuaca, jarak/GPS) tidak boleh membuat Pandu menggantung (misal izin lokasi belum dijawab).
const within = (p, label, ms = 30000) => Promise.race([p, sleep(ms).then(() => ({ error: `${label} terlalu lama menjawab, dilewati. Lanjutkan tanpa data ini.` }))]);

// Satu giliran Pandu pada satu otak. Hasil: { data } atau { error, message }.
// v1.25: SABAR — batas per menit ditunggu sampai pulih (maks 3x), baru dianggap habis.
async function think(b, keys, messages, toolChoice, hooks) {
  if (b.via === 'openrouter') {
    // Tidak ada batas token per menit: hasil riset dibaca lengkap, jatah jawaban longgar (16.000) supaya
    // rencana panjang (misal 8 hari) muat sekaligus. Model "berpikir dulu" memakai jatah jawaban untuk berpikir.
    shrinkDrafts(messages);
    const body = { model: b.model, messages, tools: TOOLS, tool_choice: toolChoice, temperature: 0.3, max_tokens: 16000, reasoning: { effort: 'low', exclude: true } };
    let r = await orChat(keys.openrouter, body, 300000);
    for (let n = 0; r.error === 'minute' && n < 3; n++) {
      // ±20 permintaan per menit (atau penyedia model sedang padat): tunggu lalu lanjut.
      const sec = 20 * (n + 1);
      if (hooks.onWait) hooks.onWait(sec);
      await sleep(sec * 1000);
      r = await orChat(keys.openrouter, body, 300000);
    }
    for (let n = 0; ['busy', 'timeout', 'network'].includes(r.error) && n < 2; n++) {
      if (hooks.onWait) hooks.onWait(5 * (n + 1));
      await sleep(5000 * (n + 1));
      r = await orChat(keys.openrouter, body, 300000);
    }
    return r;
  }
  // Groq: jatah jawaban 1.700 per langkah, sampai 2.500 kalau masih ada ruang.
  compact(messages);
  if (GROQ_TPM - tokensOf(messages) < 1700) compact(messages, true);
  const maxTok = Math.max(1700, Math.min(2500, GROQ_TPM - tokensOf(messages)));
  const body = (max) => ({ model: b.model, messages, tools: TOOLS, tool_choice: toolChoice, temperature: 0.3, max_completion_tokens: max, ...reasoningFor(b.model, false) });
  const opts = { timeoutMs: 60000, onWait: (sec) => hooks.onWait && hooks.onWait(sec) };
  let r = await groqPatient(keys.groq, body(maxTok), opts);
  if (r.error === 'toolarge') {
    // Satu permintaan melebihi batas per menit: padatkan keras & kecilkan jatah jawaban, coba sekali lagi.
    compact(messages, true);
    r = await groqPatient(keys.groq, body(1700), opts);
  }
  if (r.error === 'network' || r.error === 'timeout') r = await groqPatient(keys.groq, body(maxTok), opts);
  return r;
}

// Berapa kali Pandu boleh memperbaiki setelah ditolak Vera. Sejak v1.25 perbaikan cukup menulis bagian
// yang berubah (draf), jadi Groq pun murah: 2 kali untuk keduanya. Hari yang belum terisi dilanjutkan dulu
// sebelum ke Vera (tidak dihitung sebagai perbaikan).
const maxFixes = () => 2;
// Pandu diminta melanjutkan jadwal yang belum sampai hari terakhir SELAMA ada kemajuan (hari kosong berkurang),
// maksimal MAX_FILL kali (cukup untuk perjalanan panjang, misal 30 hari / 2 hari per panggilan Groq).
const MAX_FILL = 15;

const BRAIN_ERR = {
  auth: 'kunci ditolak', day: 'jatah harian habis', privacy: 'izin privasi model gratis OpenRouter belum dinyalakan',
  credits: 'OpenRouter minta saldo', model: 'model tidak tersedia', toolarge: 'permintaan terlalu besar untuk batas per menit',
  minute: 'batas per menit', busy: 'server sibuk', timeout: 'terlalu lama menjawab', network: 'gangguan jaringan',
};

// ---------- Titik simpan (v1.25) ----------
// Semua otak gagal di tengah jalan (jatah habis / internet putus) → pekerjaan disimpan di HP selama 2 hari,
// supaya "lanjutkan rencananya" meneruskan dari titik itu tanpa riset ulang.
const RESUME = 'gaby.panduResume';
const RESUME_MS = 2 * 86400000;

export class PanduPaused extends Error {
  constructor(message, info) { super(message); this.paused = true; this.info = info; }
}

export function panduPending() {
  try {
    const st = JSON.parse(localStorage.getItem(RESUME) || 'null');
    if (!st || !st.request) return null;
    if (Date.now() - (st.at || 0) > RESUME_MS) { localStorage.removeItem(RESUME); return null; }
    return st;
  } catch { return null; }
}
export function clearPanduPending() { try { localStorage.removeItem(RESUME); } catch {} }
function saveResume(state) {
  try { localStorage.setItem(RESUME, JSON.stringify(state)); return true; } catch {}
  try { // terlalu besar: padatkan hasil alat lama dulu
    compact(state.messages, true);
    localStorage.setItem(RESUME, JSON.stringify(state));
    return true;
  } catch { return false; }
}

// Jalankan Pandu.
//   request: permintaan pengguna; base: rencana lama (kalau mengubah) atau null
//   resume: titik simpan dari panduPending() (melanjutkan pekerjaan yang tertunda)
//   hooks: { onSteps(list), onStep(i, text), onRara(who, text), onWait(sec), onBrain(label), onFix(text, ke), verify(plan) → { ok, feedback } }
// Hasil: { plan, fixes, sources, model, vera } atau lempar Error (pesan ramah) / PanduPaused (tersimpan, bisa dilanjutkan).
export async function runPandu({ request, base = null, hooks = {}, resume = null }) {
  const { keys } = memory.get();
  if (!keys.groq && !keys.openrouter) throw new Error('Pandu butuh kunci Groq atau OpenRouter (Pengaturan → Otak Gaby).');
  const list = await brains(keys);
  if (!list.length) throw new Error('Pandu belum punya otak yang bisa dipakai (OpenRouter sedang istirahat dan belum ada kunci Groq).');
  let bi = 0;
  const R = resume || {};
  const messages = R.messages || [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `${userContext(base, list[0].via === 'openrouter')}\n\nPERMINTAAN PENGGUNA: "${request}"` },
  ];
  // Draf rencana: rencana turunan dimulai dari isi rencana lama (Pandu cukup menulis yang berubah).
  const draft = R.draft || (base ? { ...base.data, sumber: undefined } : {});
  const sources = R.sources || [];
  const failures = [];
  let searches = R.searches || 0;
  let steps = R.steps || [];
  let stepsCount = steps.length;
  let calls = R.calls || 0;
  let checks = R.checks || 0; // berapa kali Vera sudah mengecek di dalam Pandu
  let fills = R.fills || 0; // berapa kali diminta melanjutkan hari yang belum terisi
  let lastGap = R.lastGap ?? Infinity; // jumlah hari kosong saat terakhir diminta melanjutkan
  let lastStep = R.lastStep || '';
  let modeVia = '';
  let touched = !!R.draft; // Pandu sudah menulis sesuatu ke draf
  // Penjaga "tidak berubah" (v1.26, keluhan pemilik 13 Nov 2026: "Vera komennya selalu sama, Pandu gak pernah selesai"):
  // model kadang menyimpan ulang isi yang SAMA (hanya judul/ringkasan beda) setelah ditolak Vera, atau saat "lengkapi"
  // cuma mengganti judul. Itu tidak dihitung sebagai perbaikan & tidak diserahkan ke Vera; Pandu ditegur (maks 2x).
  const sigOf = (p) => JSON.stringify({ ...p, judul: '', ringkasan: '', sumber: [] });
  let rejected = R.rejected || null; // { sig, issues[], local[] } = isi yang terakhir ditolak + catatannya
  if (!rejected && base && base.vera && base.vera.ok === false && arr(base.vera.issues).length) {
    rejected = { sig: sigOf(normalizePlan({ ...base.data }).plan), issues: arr(base.vera.issues).map(String), local: quickIssues({ ...base.data }) };
  }
  let nudges = R.nudges || 0;
  // Catatan yang masih berlaku: catatan pasti (tanpa AI) yang sekarang sudah hilang = sudah beres (misal ditambal otomatis).
  const stillOpen = (plan) => {
    const now = quickIssues(plan);
    return rejected.issues.filter((t) => !(rejected.local.includes(t) && !now.includes(t)));
  };
  const step = (text) => {
    calls++;
    lastStep = text;
    if (hooks.onStep) hooks.onStep(Math.min(calls, Math.max(stepsCount - 1, 0)), text);
  };
  if (resume) {
    if (hooks.onSteps && steps.length) hooks.onSteps(steps);
    messages.push({ role: 'user', content: `LANJUTKAN pekerjaan yang tadi tertunda (jatah AI sempat habis). JANGAN mengulang pencarian yang sudah ada (sudah ${searches} kali mencari). Isi draf saat ini: ${draftSummary(draft)}. Lengkapi yang kurang, lalu simpan_rencana.` });
    if (hooks.onStep) hooks.onStep(Math.min(calls, Math.max(stepsCount - 1, 0)), 'Melanjutkan dari titik terakhir…');
  }

  const runTool = async (name, a) => {
    switch (name) {
      case 'tentukan_langkah': {
        steps = arr(a.langkah).map((x) => str(x, 60)).filter(Boolean).slice(0, 7);
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
        // Batas per menit Groq: Rara MENUNGGU sampai jatah pulih (maks 3x), tidak langsung menyerah.
        const r = await research(q, { small: true, detail: true, onWait: (sec) => hooks.onRara && hooks.onRara('rara', `☕ Menunggu jatah Groq pulih (±${sec} dtk)…`) });
        if (hooks.onRara) hooks.onRara('pandu', 'Mengolah hasil Rara…');
        if (r.ok && r.found) {
          for (const x of r.sources || []) if (!sources.some((y) => y.url === x.url)) sources.push(x);
          return { jawaban: r.text, sumber: (r.sources || []).map((x) => x.title).slice(0, 5) };
        }
        return { ketemu: false, catatan: r.reason === 'habis' ? 'Jatah pencarian habis; pakai perkiraan wajar dan tulis di catatan.' : 'Tidak ketemu; pakai perkiraan wajar dan tulis di catatan.' };
      }
      case 'cuaca': {
        step(`Cek cuaca ${str(a.kota, 40)}`);
        try { return await within(weather(str(a.kota, 60)), 'cuaca'); } catch (e) { return { error: e.message }; }
      }
      case 'jarak': {
        step(`Hitung jarak ke ${str(a.ke, 40)}`);
        return within((async () => {
          let from;
          if (str(a.dari)) from = await geocode(str(a.dari, 80));
          else { const pos = await getPosition(); from = { lat: pos.lat, lon: pos.lon, nama: 'lokasi pengguna' }; }
          const to = await geocode(str(a.ke, 80), from);
          const r = await route(from, to, ['mobil', 'motor', 'jalan'].includes(a.kendaraan) ? a.kendaraan : 'mobil');
          return { dari: from.nama, ke: to.nama, km: r.km, waktu: r.waktu, catatan: 'tanpa data macet' };
        })().catch((e) => ({ error: e.message })), 'jarak');
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
    logPandu({ lastOk: { label: b.label, at: Date.now() } });
    if (resume) clearPanduPending();
    return { plan, fixes, sources, model: b.model, brain: b.label, vera, rechecked };
  };

  // Hari yang ditulis di draf (untuk papan kerja): "Menulis jadwal hari 3–4".
  const draftStep = (args, cut) => {
    const days = arr(args && args.jadwal).map(dayOf).filter((d) => d != null);
    step(cut ? 'Tulisan terpotong, melanjutkan…' : days.length ? `Menulis jadwal hari ${ranges(days)}` : 'Menulis rencana…');
  };

  for (let turn = 0; turn < MAX_TURNS + 2; turn++) {
    const b = list[bi];
    if (!b) break;
    if (hooks.onBrain) hooks.onBrain(b.label);
    const last = turn >= MAX_TURNS;
    if (turn === MAX_TURNS) messages.push({ role: 'user', content: 'Waktunya hampir habis. Segera panggil simpan_rencana (bagian yang sudah ada di draf dikosongkan saja).' });
    // Groq: kalau model utama harus menunggu lama, pinjam model Groq lain yang jatahnya kosong untuk giliran ini.
    let use = b;
    if (b.via === 'groq' && waitNeeded(b.model, tokensOf(messages) + 1700) > 8000) {
      const free = list.slice(bi + 1).find((x) => x.via === 'groq' && waitNeeded(x.model, tokensOf(messages) + 1700) === 0);
      if (free) use = free;
    }
    if (use.via !== modeVia) {
      messages.push({ role: 'user', content: `${modeVia ? 'OTAK BERGANTI. ' : ''}${MODE[use.via]}${modeVia || resume ? ` Isi draf saat ini: ${draftSummary(draft)}.` : ''}` });
      modeVia = use.via;
    }
    const r = await think(use, keys, messages, last ? { type: 'function', function: { name: 'simpan_rencana' } } : 'required', hooks);
    if (r.error) {
      failures.push(`${use.label}: ${BRAIN_ERR[r.error] || r.message || r.error}`);
      console.warn('[Gaby] Pandu', use.label, r.error, r.message);
      // OpenRouter: masalah akun (kunci / jatah harian / privasi / saldo) berlaku untuk semua modelnya → lewati.
      // Groq: jatah dihitung per model, jadi model Groq berikutnya tetap dicoba.
      const skipVia = ['auth', 'privacy', 'credits'].includes(r.error) || (r.error === 'day' && use.via === 'openrouter') ? use.via : null;
      bi++;
      while (skipVia && list[bi] && list[bi].via === skipVia) bi++;
      if (!list[bi]) break;
      turn--;
      continue; // otak berikutnya MELANJUTKAN percakapan & draf yang sama (tidak mengulang dari awal)
    }
    const choice = r.data.choices?.[0] || {};
    const msg = choice.message || {};
    const toolCalls = msg.tool_calls || [];
    if (!toolCalls.length) {
      messages.push({ role: 'assistant', content: msg.content || '' });
      messages.push({ role: 'user', content: choice.finish_reason === 'length'
        ? 'Jawabanmu terpotong sebelum memanggil alat. Tulis lebih pendek: pakai tulis_draf per bagian (jadwal maks 2 hari per panggilan).'
        : 'Gunakan alat. Kalau sudah cukup, panggil simpan_rencana.' });
      continue;
    }
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls });
    for (const tc of toolCalls) {
      const name = tc.function?.name;
      const parsed = repairJson(tc.function?.arguments || '{}');
      const args = parsed.value || {};
      let result;
      if ((name === 'simpan_rencana' || name === 'tulis_draf') && parsed.cut) {
        // Terpotong (melewati batas panjang jawaban): simpan bagian yang utuh, minta LANJUTKAN (bukan "ringkas").
        if (parsed.value) { mergeDraft(draft, args); touched = true; }
        draftStep(args, true);
        result = { terpotong: true, draf: draftSummary(draft), catatan: 'Tulisanmu terpotong karena terlalu panjang; bagian yang utuh sudah masuk draf. LANJUTKAN bagian yang belum ada lewat tulis_draf (jadwal maks 2–3 hari per panggilan), lalu simpan_rencana dengan kolom yang sudah ada di draf dikosongkan.' };
      } else if (name === 'tulis_draf') {
        mergeDraft(draft, args);
        touched = true;
        draftStep(args, false);
        result = { ok: true, draf: draftSummary(draft) };
      } else if (name === 'simpan_rencana') {
        mergeDraft(draft, args);
        touched = true;
        const { plan, fixes } = normalizePlan(draft);
        plan.sumber = sources.slice(0, 8);
        const gaps = scheduleGaps(plan);
        const open = rejected && nudges < 2 && !last && sigOf(plan) === rejected.sig ? stillOpen(plan) : [];
        if (!plan.jadwal.length && !plan.rincian_biaya.length && !plan.checklist.length) {
          result = { error: 'Rencana masih kosong. Isi jadwal / rincian_biaya / checklist (boleh bertahap lewat tulis_draf), lalu simpan_rencana lagi.' };
        } else if (gaps.missing.length && gaps.missing.length < lastGap && fills < MAX_FILL && !last) {
          // Jadwal belum sampai hari terakhir: lanjutkan dulu (pasti, tanpa AI), baru diserahkan ke Vera.
          // Hanya selama ada kemajuan (hari kosong berkurang), supaya tidak berputar-putar.
          fills++;
          lastGap = gaps.missing.length;
          const next = gaps.missing.slice(0, use.via === 'groq' ? 2 : 4);
          step(`Melengkapi jadwal hari ${ranges(next)}`);
          result = { belum_lengkap: true, draf: draftSummary(draft), catatan: `Perjalanan ${gaps.days} hari, tapi jadwal hari ${ranges(gaps.missing)} belum ada. LANJUTKAN: tulis_draf berisi jadwal hari ${ranges(next)}${gaps.missing.length > next.length ? ' (sisanya di panggilan berikutnya)' : ''}, termasuk check-out & perjalanan pulang di hari terakhir. Lalu simpan_rencana lagi dengan kolom lain dikosongkan (otomatis dari draf).` };
        } else if (open.length) {
          nudges++;
          step('Isinya belum berubah — Pandu diminta memperbaiki dulu');
          result = {
            tidak_berubah: true,
            perbaiki: open.join(' '),
            draf: draftSummary(draft),
            catatan: `Isi rencanamu SAMA PERSIS dengan ${checks === 0 && base ? `Rencana #${base.no}` : 'yang tadi ditolak Vera'} (mengganti judul/ringkasan saja tidak dihitung), jadi belum ada yang diperbaiki dan TIDAK diserahkan ke Vera. Tulis ISI yang kurang dulu lewat tulis_draf — misal baris jadwal baru {"jadwal":[{"waktu":"Hari N, 14:00","kegiatan":"…"}]} atau isi kuliner/transportasi/biaya yang diminta — lalu simpan_rencana lagi.`,
          };
        } else if (checks < maxFixes(use) && hooks.verify) {
          checks++;
          if (hooks.onStep) hooks.onStep(Math.max(stepsCount - 1, 0), 'Menyerahkan ke Vera…');
          const v = await hooks.verify(plan, fixes);
          if (v && !v.ok && v.feedback) {
            const lastFix = checks >= maxFixes(use);
            const serious = arr(v.issues).filter((i) => i && i.serius).map((i) => String(i.text));
            rejected = { sig: sigOf(plan), issues: serious.length ? serious : [str(v.feedback, 400)], local: quickIssues(plan) };
            nudges = 0;
            result = {
              ditolak_vera: true,
              perbaiki: v.feedback,
              draf: draftSummary(draft),
              ...(use.via === 'openrouter' ? { isi_draf_sekarang: JSON.stringify({ ...plan, sumber: undefined }).slice(0, 12000) } : {}),
              catatan: `Perbaiki HANYA hal ini: tulis_draf untuk bagian yang berubah (jadwal per 2–3 hari kalau panjang), lalu simpan_rencana lagi dengan kolom yang tidak berubah dikosongkan — semuanya otomatis dipertahankan dari draf.${lastFix ? ' Ini kesempatan perbaikan terakhir.' : ''}`,
            };
            if (hooks.onFix) hooks.onFix(v.feedback, checks);
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
      messages.push({ role: 'tool', tool_call_id: tc.id, content: trimResult(result, use.via === 'openrouter' ? 14000 : 1800) });
    }
  }
  const why = failures.length ? failures.slice(-2).join('; ') : 'tidak berhasil menyelesaikan rencana';
  logPandu({ lastFail: { text: why.slice(0, 200), at: Date.now() } });
  // Sudah ada hasil kerja (riset / draf): simpan titik lanjut, jangan dibuang.
  const progress = searches > 0 || touched || calls > 2;
  if (failures.length && progress) {
    compact(messages);
    const saved = saveResume({ v: 1, request, baseNo: base ? base.no : null, at: Date.now(), why, messages, draft, sources, searches, steps, calls, checks, fills, lastGap: Number.isFinite(lastGap) ? lastGap : null, lastStep, rejected, nudges });
    if (saved) {
      logPandu({ paused: { request: str(request, 120), at: Date.now() } });
      throw new PanduPaused(`Pandu berhenti sementara (${why}). Hasil kerjanya sudah disimpan di HP selama 2 hari.`, { why, lastStep, request });
    }
  }
  throw new Error(`Pandu belum berhasil (${why}). Coba lagi sebentar lagi.`);
}
