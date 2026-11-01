// PANDU, perencana di tim Gaby: memecah tugas besar ("rencanakan liburan ke Bali, budget 5 juta")
// menjadi langkah, menjalankannya dengan alat (Rara untuk riset, cuaca, jarak, laci ingatan,
// jadwal pengguna), lalu menyerahkan rencana terstruktur. Vera mengeceknya sebelum disimpan;
// kalau Vera menemukan masalah, Pandu memperbaiki SEKALI.
// Memakai Groq (GPT-OSS 120B dengan pemanggilan alat). Pandu tidak pernah membeli,
// membayar, memesan, atau mengirim pesan.

import { memory, CATEGORIES } from './memory.js';
import { groqModels, groqChat, reasoningFor } from './groq.js';
import { researchChecked } from './research.js';
import { weather } from './tools.js';
import { getPosition, geocode, route } from './location.js';

const MAX_TURNS = 14;
const MAX_SEARCH = 6;

// Skema rencana (juga dipakai Vera & kartu).
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    judul: { type: 'string', description: 'Judul singkat, maks 6 kata, sebut pembeda utama, misal "Liburan Bali (Hotel C)"' },
    ringkasan: { type: 'string', description: '1–2 kalimat ringkasan rencana' },
    tanggal: { type: 'string', description: 'Tanggal/periode yang mudah dibaca, misal "12–14 Des 2026", atau "" kalau tidak ada' },
    tanggal_mulai: { type: 'string', description: 'YYYY-MM-DD kalau ada tanggal pasti, selain itu ""' },
    total_biaya: { type: 'number', description: 'Total perkiraan biaya dalam rupiah (jumlah rincian_biaya), 0 kalau tidak relevan' },
    rincian_biaya: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, biaya: { type: 'number' } }, required: ['item', 'biaya'] } },
    tempat: {
      type: 'array',
      description: 'Hotel / tempat / toko / produk utama yang dipilih',
      items: { type: 'object', properties: { jenis: { type: 'string', description: 'hotel | tempat | restoran | toko | produk | lainnya' }, nama: { type: 'string' }, area: { type: 'string' }, harga: { type: 'string' }, catatan: { type: 'string' } }, required: ['jenis', 'nama'] },
    },
    jadwal: { type: 'array', items: { type: 'object', properties: { waktu: { type: 'string', description: 'misal "Hari 1" atau "Sabtu 09:00"' }, kegiatan: { type: 'string' } }, required: ['waktu', 'kegiatan'] } },
    checklist: { type: 'array', items: { type: 'string' }, description: 'Tugas persiapan singkat (masuk ke catatan/to-do kalau pengguna setuju)' },
    pengingat: {
      type: 'array',
      description: 'Pengingat penting yang bertanggal (misal beli tiket H-30), hanya tanggal di masa depan',
      items: { type: 'object', properties: { pesan: { type: 'string' }, tanggal: { type: 'string', description: 'YYYY-MM-DD' }, jam: { type: 'string', description: 'HH:MM' } }, required: ['pesan', 'tanggal'] },
    },
    catatan: { type: 'array', items: { type: 'string' }, description: 'Catatan penting / asumsi (misal "harga perkiraan, belum termasuk macet")' },
  },
  required: ['judul', 'ringkasan', 'total_biaya', 'rincian_biaya', 'jadwal', 'checklist'],
};

const fn = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

const TOOLS = [
  fn('tentukan_langkah', 'WAJIB dipanggil pertama: 3–7 langkah singkat (bahasa Indonesia) yang akan kamu kerjakan.', { langkah: { type: 'array', items: { type: 'string' } } }, ['langkah']),
  fn('cari_internet', 'Minta Rara mencari info terbaru di internet (harga, hotel, tiket, jadwal, ulasan, produk). Hasilnya sudah dicek Vera.', { pertanyaan: { type: 'string', description: 'Pertanyaan lengkap, sertakan kota/tanggal' } }, ['pertanyaan']),
  fn('cuaca', 'Cuaca/prakiraan hari ini & besok di sebuah kota (bukan prakiraan jauh ke depan).', { kota: { type: 'string' } }, ['kota']),
  fn('jarak', 'Jarak & perkiraan waktu tempuh antara dua tempat (tanpa macet). Kosongkan dari untuk lokasi pengguna.', { dari: { type: 'string' }, ke: { type: 'string' }, kendaraan: { type: 'string', enum: ['mobil', 'motor', 'jalan'] } }, ['ke']),
  fn('buka_ingatan', 'Buka laci ingatan tentang pengguna untuk satu topik (keluarga, makanan, keuangan, kesehatan, dll.).', { topik: { type: 'string' } }, ['topik']),
  fn('jadwal_saya', 'Daftar pengingat & to-do pengguna yang masih aktif (supaya rencana tidak bentrok).'),
  fn('lihat_rencana', 'Lihat isi rencana tersimpan berdasarkan nomornya.', { nomor: { type: 'number' } }, ['nomor']),
  { type: 'function', function: { name: 'simpan_rencana', description: 'Serahkan rencana final (dicek Vera dulu). Panggil sekali di akhir.', parameters: PLAN_SCHEMA } },
];

const num = (v) => {
  if (typeof v === 'number' && isFinite(v)) return Math.round(v);
  const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10);
  return isFinite(n) ? n : 0;
};
const str = (v, max = 300) => String(v == null ? '' : v).trim().slice(0, max);
const arr = (v) => (Array.isArray(v) ? v : []);

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
      judul: str(p.judul, 80) || 'Rencana',
      ringkasan: str(p.ringkasan, 400),
      tanggal: str(p.tanggal, 60),
      tanggal_mulai: /^\d{4}-\d{2}-\d{2}$/.test(str(p.tanggal_mulai)) ? str(p.tanggal_mulai) : '',
      total_biaya: total,
      rincian_biaya: rincian,
      tempat: arr(p.tempat).map((t) => ({ jenis: str(t.jenis, 20) || 'tempat', nama: str(t.nama, 80), area: str(t.area, 80), harga: str(t.harga, 60), catatan: str(t.catatan, 160) })).filter((t) => t.nama).slice(0, 8),
      jadwal: arr(p.jadwal).map((j) => ({ waktu: str(j.waktu, 40), kegiatan: str(j.kegiatan, 240) })).filter((j) => j.kegiatan).slice(0, 20),
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
2. Kerjakan langkahnya dengan alat. Harga, hotel, tiket, jadwal, dan produk HARUS dari cari_internet (paling banyak ${MAX_SEARCH} kali; gabungkan pertanyaan yang mirip). Jangan mengarang angka; kalau tidak ketemu, tulis perkiraan wajar dan sebut di catatan bahwa itu perkiraan.
3. Pakai buka_ingatan / jadwal_saya kalau rencana menyangkut keluarga, kesehatan, keuangan, atau tanggal tertentu.
4. Akhiri dengan simpan_rencana. total_biaya = jumlah rincian_biaya (rupiah, angka). Tulis semua teks dalam bahasa Indonesia yang ringkas.

Aturan:
- JANGAN pernah membeli, membayar, memesan, atau mengirim pesan; kamu hanya merencanakan.
- Jangan menyarankan hal yang tidak disukai pengguna.
- Pengingat hanya untuk tanggal di masa depan.
- Kalau permintaan bukan perjalanan (acara, diet, belanja, membandingkan produk), sesuaikan isinya: tempat bisa berisi toko/produk, jadwal bisa berisi langkah per hari.`;

function trimResult(obj) {
  const s = JSON.stringify(obj);
  return s.length > 1800 ? `${s.slice(0, 1800)}…` : s;
}

// Jalankan Pandu.
//   request: permintaan pengguna; base: rencana lama (kalau mengubah) atau null
//   hooks: { onSteps(list), onStep(i, text), onRara(text), verify(plan) → { ok, feedback } }
// Hasil: { plan, fixes, sources, model } atau lempar Error (pesan ramah).
export async function runPandu({ request, base = null, hooks = {} }) {
  const { keys } = memory.get();
  if (!keys.groq) throw new Error('Pandu butuh kunci Groq (Pengaturan → Otak Gaby).');
  const models = await groqModels(keys.groq, 'pandu');
  let mi = 0;
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `${userContext(base)}\n\nPERMINTAAN PENGGUNA: "${request}"` },
  ];
  const sources = [];
  let searches = 0;
  let stepsCount = 0;
  let calls = 0;
  let verified = false;
  const step = (text) => {
    calls++;
    if (hooks.onStep) hooks.onStep(Math.min(calls, Math.max(stepsCount - 1, 0)), text);
  };

  const runTool = async (name, a) => {
    switch (name) {
      case 'tentukan_langkah': {
        const list = arr(a.langkah).map((x) => str(x, 60)).filter(Boolean).slice(0, 7);
        stepsCount = list.length;
        if (hooks.onSteps) hooks.onSteps(list);
        if (hooks.onStep && list.length) hooks.onStep(0, list[0]);
        return { ok: true };
      }
      case 'cari_internet': {
        if (searches >= MAX_SEARCH) return { error: 'Batas pencarian tercapai. Lanjutkan dengan info yang ada, lalu simpan_rencana.' };
        searches++;
        const q = str(a.pertanyaan, 200);
        step(`Rara mencari: ${q}`);
        const r = await researchChecked(q, { onStage: (who, t) => hooks.onRara && hooks.onRara(who, t) });
        if (r.ok && r.found) {
          for (const s of r.sources || []) if (!sources.some((x) => x.url === s.url)) sources.push(s);
          return { jawaban: r.text, cek_vera: r.badge || '', sumber: (r.sources || []).map((s) => s.title).slice(0, 4) };
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

  for (let turn = 0; turn < MAX_TURNS + 2; turn++) {
    const last = turn >= MAX_TURNS;
    if (last) messages.push({ role: 'user', content: 'Waktunya hampir habis. Segera panggil simpan_rencana dengan data yang sudah ada.' });
    const model = models[mi];
    if (!model) throw new Error('Pandu tidak menemukan model Groq yang bisa dipakai.');
    const body = {
      model,
      messages,
      tools: TOOLS,
      tool_choice: last ? { type: 'function', function: { name: 'simpan_rencana' } } : 'required',
      temperature: 0.3,
      max_completion_tokens: 4000,
      ...reasoningFor(model, false),
    };
    let r = await groqChat(keys.groq, body, 60000);
    for (let wait = 0; r.error === 'minute' && wait < 3; wait++) {
      if (hooks.onWait) hooks.onWait();
      await new Promise((ok) => setTimeout(ok, Math.min(Math.max(r.retryAfter * 1000, 2000), 20000)));
      r = await groqChat(keys.groq, body, 60000);
    }
    if (r.error === 'network' || r.error === 'timeout') r = await groqChat(keys.groq, body, 60000);
    if (r.error) {
      if (['model', 'day', 'hour', 'minute', 'nosearch'].includes(r.error) && mi + 1 < models.length) { mi++; turn--; continue; }
      throw new Error(r.error === 'auth' ? 'Kunci Groq ditolak.' : r.error === 'day' ? 'Jatah Groq hari ini habis.' : `Groq: ${r.message || r.error}`);
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
          result = { error: 'Rencana masih kosong. Isi jadwal / rincian_biaya / checklist, lalu simpan_rencana lagi.' };
        } else if (!verified && hooks.verify) {
          verified = true;
          if (hooks.onStep) hooks.onStep(Math.max(stepsCount - 1, 0), 'Menyerahkan ke Vera…');
          const v = await hooks.verify(plan, fixes);
          if (v && !v.ok && v.feedback) {
            result = { ditolak_vera: true, perbaiki: v.feedback, catatan: 'Perbaiki hal ini saja, lalu panggil simpan_rencana lagi.' };
            if (hooks.onFix) hooks.onFix(v.feedback);
          } else {
            return { plan, fixes, sources, model, vera: v };
          }
        } else {
          return { plan, fixes, sources, model, vera: null, rechecked: verified };
        }
      } else {
        result = await runTool(name, args);
      }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: trimResult(result) });
    }
  }
  throw new Error('Pandu belum berhasil menyelesaikan rencana. Coba lagi dengan permintaan yang lebih spesifik.');
}
