// VERA, pemeriksa di tim Gaby: mengecek hasil kerja teman lain sebelum disampaikan.
//   • checkFacts  → jawaban Rara dicocokkan dengan bukti dari sumbernya
//   • checkImage  → gambar Lukas dicocokkan dengan permintaan pengguna (lihat bawah)
//   • checkPlan   → rencana Pandu: hitungan, tanggal, hal yang tidak disukai (lihat bawah)
// Memakai Groq (Qwen3 32B dengan mode berpikir, beda keluarga dari Rara/Pandu).
// Kalau Vera tidak bisa bekerja, hasil tetap disampaikan dengan tanda "belum dicek".

import { memory } from './memory.js';
import { groqModels, groqChat, reasoningFor, parseJson } from './groq.js';

const REST = 'https://generativelanguage.googleapis.com/v1beta';

// Tanya Vera (teks). Hasil: objek JSON, atau null kalau Vera tidak bisa bekerja.
async function askVera(prompt, { careful = true, timeout = 20000 } = {}) {
  const { keys } = memory.get();
  if (!keys.groq) return null;
  for (const model of await groqModels(keys.groq, 'vera')) {
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_completion_tokens: 3000,
      ...reasoningFor(model, careful),
    };
    let r = await groqChat(keys.groq, body, timeout);
    if (r.error === 'minute') {
      await new Promise((ok) => setTimeout(ok, Math.min(Math.max(r.retryAfter * 1000, 1000), 5000)));
      r = await groqChat(keys.groq, body, timeout);
    }
    if (r.error === 'error' && /reasoning/i.test(r.message || '')) {
      // Model tidak menerima pengaturan berpikir: coba tanpa itu.
      const { reasoning_effort, reasoning_format, ...plain } = body; // eslint-disable-line no-unused-vars
      r = await groqChat(keys.groq, plain, timeout);
    }
    if (r.error) {
      console.warn('[Gaby] Vera', model, r.error, r.message);
      if (r.error === 'auth') return null;
      continue;
    }
    try {
      return { ...parseJson(r.data.choices?.[0]?.message?.content), _model: model };
    } catch (e) {
      console.warn('[Gaby] Vera balasan bukan JSON', model, e.message);
    }
  }
  return null;
}

// ---------- Cek fakta jawaban Rara ----------

// Hasil: { status: 'cocok'|'beda'|'lemah'|'skip', answer, support, note, badge }
//   badge = tanda singkat untuk kartu & Gaby, misal "✅ dicek Vera · 2 sumber".
export async function checkFacts({ question, answer, sources = [], evidence = '' }) {
  const n = sources.length;
  if (!String(evidence).trim()) {
    return { status: 'skip', answer, support: n, note: 'Bukti dari sumber tidak tersedia untuk dicek.', badge: n >= 2 ? `❓ belum dicek Vera · ${n} sumber` : '❓ belum dicek Vera' };
  }
  const prompt = `Kamu VERA, pemeriksa fakta untuk asisten suara Gaby. Periksa jawaban Rara terhadap BUKTI dari sumber.

Pertanyaan pengguna: "${question}"
Jawaban Rara: "${answer}"
Sumber (${n}): ${sources.map((s, i) => `${i + 1}. ${s.title}`).join('; ') || '-'}

BUKTI (kutipan dari sumber):
${String(evidence).slice(0, 7000)}

Tugas:
- Cek setiap angka, tanggal, nama, dan klaim penting di jawaban Rara: apakah benar ada di BUKTI?
- Buang klaim yang tidak ada di bukti. JANGAN menambah fakta dari pengetahuanmu sendiri.
- Kalau bukti dari sumber berbeda-beda, tulis kisarannya.
- "sumber_pendukung" = berapa sumber BERBEDA yang mendukung fakta utama.

Balas HANYA JSON:
{"status": "cocok" | "beda" | "lemah", "jawaban": "jawaban final bahasa Indonesia 1–3 kalimat, hanya yang didukung bukti; kosongkan kalau tidak ada yang didukung", "sumber_pendukung": 0, "catatan": "catatan singkat untuk Gaby"}
status: cocok = semua fakta utama didukung bukti; beda = sumber saling berbeda (sebut kisarannya); lemah = sebagian/semua fakta utama tidak ada di bukti.`;
  const v = await askVera(prompt);
  // Vera tidak bisa / balasannya tidak jelas: jawaban Rara tetap dipakai, ditandai "belum dicek".
  if (!v || !['cocok', 'beda', 'lemah'].includes(v.status)) {
    return { status: 'skip', answer, support: n, note: 'Vera sedang tidak bisa mengecek.', badge: '❓ belum dicek Vera' };
  }
  const status = v.status;
  const support = Math.max(0, Math.min(n || 0, parseInt(v.sumber_pendukung, 10) || 0)) || (status === 'cocok' ? Math.min(n, 1) : 0);
  const final = String(v.jawaban || '').trim();
  let badge;
  if (status === 'cocok') badge = support >= 2 ? `✅ dicek Vera · ${support} sumber` : '❓ dicek Vera · baru 1 sumber';
  else if (status === 'beda') badge = '⚠️ dicek Vera · sumber berbeda';
  else badge = '❓ dicek Vera · sebagian belum terbukti';
  return { status, answer: final || (status === 'lemah' ? '' : answer), support, note: String(v.catatan || '').slice(0, 300), badge, model: v._model };
}

// ---------- Cek gambar Lukas ----------

function imagePrompt(request) {
  return `Kamu VERA, pemeriksa gambar untuk asisten Gaby. Pelukis Lukas membuat gambar ini untuk permintaan pengguna:
"${request}"

1. Tulis 2–6 hal PENTING yang diminta (objek, jumlah, warna, pakaian/aksesori, aksi, gaya, tulisan). Jangan menambah hal yang tidak diminta.
2. Lihat gambarnya: apakah tiap hal itu benar-benar ada dan sesuai?
3. "lolos" = false HANYA kalau ada hal penting yang jelas tidak ada atau salah (bukan soal selera).
4. "perbaikan" = instruksi singkat bahasa Inggris untuk pelukis, khusus hal yang kurang/salah.

Balas HANYA JSON:
{"cek": [{"hal": "kucing oranye", "ada": true}], "lolos": true, "perbaikan": ""}`;
}

function summarize(v, model) {
  const items = (Array.isArray(v.cek) ? v.cek : []).filter((c) => c && c.hal).slice(0, 6)
    .map((c) => ({ hal: String(c.hal).slice(0, 60), ada: c.ada !== false }));
  if (!items.length) return null;
  const ok = items.filter((c) => c.ada).length;
  const missing = items.filter((c) => !c.ada).map((c) => c.hal);
  const pass = v.lolos !== false && !missing.length;
  return {
    checked: true,
    pass,
    items,
    missing,
    fix: String(v.perbaikan || '').slice(0, 400) || (missing.length ? `Make sure the image clearly shows: ${missing.join(', ')}.` : ''),
    badge: pass ? `✅ dicek Vera ${ok}/${items.length}` : `⚠️ Vera ${ok}/${items.length}: kurang ${missing.join(', ')}`,
    model,
  };
}

// image = { base64, mime }. Hasil: { checked, pass, items, missing, fix, badge } atau { checked: false, badge }.
export async function checkImage({ request, image }) {
  const { keys } = memory.get();
  const unchecked = { checked: false, pass: true, badge: '❓ belum dicek Vera' };
  if (!image || !image.base64) return unchecked;
  const prompt = imagePrompt(request);
  const dataUrl = `data:${image.mime || 'image/jpeg'};base64,${image.base64}`;
  // 1) Groq: model penglihatan (Llama 4).
  if (keys.groq) {
    for (const model of await groqModels(keys.groq, 'vision')) {
      const body = {
        model,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
        temperature: 0.1,
        max_completion_tokens: 800,
      };
      const r = await groqChat(keys.groq, body, 25000);
      if (r.error) { console.warn('[Gaby] Vera gambar', model, r.error, r.message); if (r.error === 'auth') break; continue; }
      try {
        const out = summarize(parseJson(r.data.choices?.[0]?.message?.content), `groq:${model}`);
        if (out) return out;
      } catch (e) {
        console.warn('[Gaby] Vera gambar balasan bukan JSON', e.message);
      }
    }
  }
  // 2) Cadangan: Gemini (bisa melihat gambar), kalau jatahnya ada.
  if (keys.gemini) {
    for (const model of ['gemini-2.5-flash-lite', 'gemini-2.5-flash']) {
      try {
        const res = await fetch(`${REST}/models/${model}:generateContent?key=${encodeURIComponent(keys.gemini)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: image.mime || 'image/jpeg', data: image.base64 } }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) continue;
        const raw = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
        const out = summarize(parseJson(raw), model);
        if (out) return out;
      } catch {
        // coba model berikutnya
      }
    }
  }
  return unchecked;
}

// ---------- Cek rencana Pandu ----------

// Kata penting dari hal yang tidak disukai ("tidak suka makanan pedas" → "pedas").
const STOP = new Set(['tidak', 'suka', 'gak', 'nggak', 'ngga', 'enggak', 'kurang', 'alergi', 'benci', 'anti', 'pantang', 'menghindari',
  'makan', 'makanan', 'minum', 'minuman', 'yang', 'dan', 'atau', 'sama', 'dengan', 'terlalu', 'banget', 'sangat', 'doyan', 'bisa', 'tahan']);
function dislikeTerms() {
  return memory.get().profile.filter((m) => m.rasa === 'tidak').flatMap((m) =>
    (m.text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => ({ w, fact: m.text })));
}

// Lama perjalanan (hari): dari tanggal_mulai–tanggal_selesai, atau dari teks ("12–14 Des", "3 hari 2 malam").
// 0 = tidak bisa dipastikan (pemeriksaan per hari dilewati, bukan dianggap salah).
function tripDays(plan) {
  if (plan.tanggal_mulai && plan.tanggal_selesai) {
    const d = Math.round((Date.parse(plan.tanggal_selesai) - Date.parse(plan.tanggal_mulai)) / 864e5) + 1;
    if (d >= 1 && d <= 30) return d;
  }
  const t = `${plan.tanggal || ''} ${plan.judul || ''} ${plan.ringkasan || ''}`.toLowerCase();
  const range = t.match(/\b(\d{1,2})\s*[–—-]\s*(\d{1,2})\s+(?:jan|feb|mar|apr|mei|jun|jul|agu|agt|sep|okt|nov|des)/);
  if (range && +range[2] > +range[1] && +range[2] - +range[1] < 30) return +range[2] - +range[1] + 1;
  const n = t.match(/\b(\d{1,2})\s*hari\b/);
  return n && +n[1] >= 1 && +n[1] <= 30 ? +n[1] : 0;
}

// Hari ke berapa saja yang ada di jadwal ("Hari 1, 08:00" / "Hari ke-2").
function scheduledDays(plan) {
  const days = new Set();
  for (const j of plan.jadwal || []) {
    const m = `${j.waktu} ${j.kegiatan}`.toLowerCase().match(/\bhari\s*(?:ke[-\s]?)?(\d{1,2})\b/);
    if (m) days.add(+m[1]);
  }
  return days;
}

// Perjalanan: jadwal tiap hari sampai hari terakhir, check-out hotel, dan perjalanan pulang.
function tripScheduleIssues(plan) {
  const issues = [];
  const all = (plan.jadwal || []).map((j) => `${j.waktu} ${j.kegiatan}`).join(' \n ').toLowerCase();
  const days = tripDays(plan);
  const seen = scheduledDays(plan);
  if (days && /hari\s+terakhir/.test(all)) seen.add(days);
  if (days >= 2) {
    const missing = [...Array(days).keys()].map((i) => i + 1).filter((d) => !seen.has(d));
    if (missing.length && seen.size) {
      const last = missing.includes(days) ? ' (termasuk hari terakhir)' : '';
      issues.push({ serius: true, text: `Jadwal belum lengkap: belum ada kegiatan untuk hari ${missing.join(', ')}${last}. Perjalanan ${days} hari, isi jadwal setiap hari ("Hari N, jam").` });
    } else if (!seen.size) {
      issues.push({ serius: true, text: `Jadwal belum dibagi per hari: perjalanan ${days} hari, tulis waktu seperti "Hari 1, 08:00" sampai "Hari ${days}".` });
    }
  }
  const hotel = (plan.tempat || []).some((t) => /hotel|penginapan|villa|resort|homestay/i.test(t.jenis));
  if (hotel && (days === 0 || days >= 2) && !/check[\s-]?out|checkout/.test(all)) {
    issues.push({ serius: true, text: 'Belum ada jadwal check-out hotel di hari terakhir.' });
  }
  const stay = '(?!hotel|penginapan|villa|resort|homestay|kamar)';
  if (!new RegExp(`pulang|(?:penerbangan|perjalanan|kereta|bus|terbang) (?:kembali|balik)|(?:kembali|balik) ke ${stay}`).test(all)) {
    issues.push({ serius: true, text: 'Belum ada jadwal perjalanan pulang di hari terakhir (jam & transportasinya).' });
  }
  return issues;
}

// Pemeriksaan pasti tanpa AI: hal yang tidak disukai, pengingat yang sudah lewat, bentrok jadwal.
function localPlanIssues(plan) {
  const issues = [];
  const text = ` ${JSON.stringify({ ...plan, sumber: undefined, catatan: undefined }).toLowerCase()} `;
  const hits = dislikeTerms().filter(({ w }) => new RegExp(`[^a-z0-9]${w}[^a-z0-9]`).test(text));
  for (const h of [...new Map(hits.map((x) => [x.fact, x])).values()]) {
    issues.push({ serius: true, text: `Ada saran yang bertentangan dengan "${h.fact}" (kata "${h.w}"). Ganti dengan pilihan lain.` });
  }
  // Kelengkapan sesuai jenis rencana.
  if (plan.jenis === 'perjalanan') {
    if (!(plan.transportasi || []).length) issues.push({ serius: true, text: 'Rencana perjalanan belum punya transportasi: tambahkan pilihan maskapai/kereta/bus dengan nama, rute, perkiraan jam, dan harga.' });
    if (!(plan.kuliner || []).length) issues.push({ serius: true, text: 'Belum ada rekomendasi tempat makan: tambahkan nama resto/warung (area & kisaran harga) di kuliner.' });
    issues.push(...tripScheduleIssues(plan));
  }
  if (plan.jenis === 'proyek' && !(plan.fitur || []).length && !(plan.tujuan || '').trim()) {
    issues.push({ serius: true, text: 'Rencana proyek belum punya tujuan & fitur utama: tambahkan.' });
  }
  const today = new Date().toLocaleDateString('sv-SE');
  for (const r of plan.pengingat || []) {
    if (r.tanggal < today) issues.push({ serius: true, text: `Pengingat "${r.pesan}" bertanggal ${r.tanggal}, sudah lewat. Pakai tanggal di masa depan atau hapus.` });
  }
  if (plan.tanggal_mulai) {
    const same = memory.get().reminders.filter((r) => !r.done && new Date(r.due).toLocaleDateString('sv-SE') === plan.tanggal_mulai);
    if (same.length) issues.push({ serius: false, text: `Di tanggal mulai sudah ada pengingat: ${same.map((r) => r.text).join(', ')}.` });
  }
  return issues;
}

// Hasil: { ok, feedback, badge, issues[] }. ok=false + feedback → Pandu memperbaiki (maks 2 kali lewat OpenRouter).
// fixes = koreksi otomatis yang sudah dilakukan (misal total dihitung ulang).
export async function checkPlan(plan, fixes = []) {
  const local = localPlanIssues(plan);
  const prompt = `Kamu VERA, pemeriksa rencana untuk asisten Gaby. Periksa rencana dari Pandu ini dengan teliti.

Hari ini: ${new Date().toLocaleDateString('sv-SE')}.
Hal yang tidak disukai pengguna: ${memory.get().profile.filter((m) => m.rasa === 'tidak').map((m) => m.text).join('; ') || '-'}

RENCANA (JSON):
${JSON.stringify({ ...plan, sumber: (plan.sumber || []).map((x) => x.title) }).slice(0, 6000)}

Cek: (1) hitungan biaya masuk akal dan tidak ada biaya penting yang terlupa (misal transport/makan untuk perjalanan), (2) tanggal & urutan jadwal masuk akal dan bisa dijalani, (3) tidak ada saran yang bertentangan dengan hal yang tidak disukai, (4) tidak ada janji pasti yang sebenarnya hanya perkiraan, (5) khusus perjalanan: ada jadwal untuk SETIAP hari sampai hari terakhir, termasuk check-out hotel dan perjalanan pulang.
Jangan rewel soal selera; laporkan hanya masalah NYATA.

Balas HANYA JSON:
{"status": "ok" | "perlu_perbaikan", "masalah": ["masalah singkat bahasa Indonesia"], "perbaikan": "instruksi singkat untuk Pandu (kosong kalau ok)"}`;
  const raw = await askVera(prompt, { timeout: 30000 });
  const v = raw && ['ok', 'perlu_perbaikan'].includes(raw.status) ? raw : null; // balasan tidak jelas = belum dicek
  const llmIssues = v && v.status === 'perlu_perbaikan'
    ? (Array.isArray(v.masalah) ? v.masalah : []).map((t) => ({ serius: true, text: String(t).slice(0, 200) })).slice(0, 5)
    : [];
  const issues = [...local, ...llmIssues];
  const serious = issues.filter((i) => i.serius);
  const feedback = serious.length
    ? [...serious.map((i) => i.text), v && v.perbaikan ? String(v.perbaikan).slice(0, 300) : ''].filter(Boolean).join(' ')
    : '';
  let badge;
  if (!v && !serious.length) badge = '❓ belum dicek Vera';
  else if (serious.length) badge = `⚠️ Vera: ${serious[0].text.slice(0, 70)}`;
  else badge = '✅ dicek Vera';
  return { ok: !serious.length, feedback, badge, issues, notes: [...fixes, ...issues.filter((i) => !i.serius).map((i) => i.text)], model: v && v._model };
}

export const _internal = { askVera, REST, tripDays, tripScheduleIssues };
