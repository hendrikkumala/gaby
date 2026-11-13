// VERA, pemeriksa di tim Gaby: mengecek hasil kerja teman lain sebelum disampaikan.
//   • checkFacts  → jawaban Rara dicocokkan dengan bukti dari sumbernya
//   • checkImage  → gambar Lukas dicocokkan dengan permintaan pengguna (lihat bawah)
//   • checkPlan   → rencana Pandu: hitungan, tanggal, hal yang tidak disukai (lihat bawah)
// Memakai Groq (Qwen3 32B dengan mode berpikir, beda keluarga dari Rara/Pandu).
// Kalau Vera tidak bisa bekerja, hasil tetap disampaikan dengan tanda "belum dicek".

import { memory } from './memory.js';
import { groqModels, groqChat, groqPatient, reasoningFor, parseJson } from './groq.js';
import { planSections } from './planexport.js';

const REST = 'https://generativelanguage.googleapis.com/v1beta';

// Tanya Vera (teks). Hasil: objek JSON, atau null kalau Vera tidak bisa bekerja.
// Batas per menit (v1.25): Vera MENUNGGU sampai jatah pulih (maks 3x, groqPatient); tidak pulih / terlalu
// besar / habis harian → coba model Vera berikutnya (jatah Groq dihitung per model).
async function askVera(prompt, { careful = true, timeout = 20000, maxTokens = 3000, onWait = null } = {}) {
  const { keys } = memory.get();
  if (!keys.groq) return null;
  for (const model of await groqModels(keys.groq, 'vera')) {
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_completion_tokens: maxTokens,
      ...reasoningFor(model, careful),
    };
    let r = await groqPatient(keys.groq, body, { timeoutMs: timeout, onWait });
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

// Hari yang belum punya jadwal (dipakai Pandu untuk melanjutkan jadwal sebelum diserahkan ke Vera).
// Hasil: { days, missing[] } — days 0 = lama perjalanan tidak bisa dipastikan.
export function scheduleGaps(plan) {
  const days = plan && plan.jenis === 'perjalanan' ? tripDays(plan) : 0;
  if (days < 2) return { days, missing: [] };
  const all = (plan.jadwal || []).map((j) => `${j.waktu} ${j.kegiatan}`).join(' \n ').toLowerCase();
  const seen = scheduledDays(plan);
  if (/hari\s+terakhir/.test(all)) seen.add(days);
  return { days, missing: seen.size ? [...Array(days).keys()].map((i) => i + 1).filter((d) => !seen.has(d)) : [] };
}

// Apakah jadwal perjalanan sudah punya check-out & perjalanan pulang (dipakai Vera DAN tambalan pasti Pandu).
const STAY = '(?!hotel|penginapan|villa|resort|homestay|kamar)';
const RETURN_RE = new RegExp(`pulang|(?:penerbangan|perjalanan|kereta|bus|terbang) (?:kembali|balik)|(?:kembali|balik) ke ${STAY}`);
const CHECKOUT_RE = /check[\s-]?out|checkout/;
export function tripEnds(plan) {
  const all = (plan.jadwal || []).map((j) => `${j.waktu} ${j.kegiatan}`).join(' \n ').toLowerCase();
  const days = tripDays(plan);
  const seen = scheduledDays(plan);
  const hotel = (plan.tempat || []).some((t) => /hotel|penginapan|villa|resort|homestay/i.test(t.jenis));
  return {
    days,
    lastDay: days || (seen.size ? Math.max(...seen) : 0),
    needReturn: !RETURN_RE.test(all),
    needCheckout: hotel && (days === 0 || days >= 2) && !CHECKOUT_RE.test(all),
  };
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
  const ends = tripEnds(plan);
  if (ends.needCheckout) issues.push({ serius: true, text: 'Belum ada jadwal check-out hotel di hari terakhir.' });
  if (ends.needReturn) issues.push({ serius: true, text: 'Belum ada jadwal perjalanan pulang di hari terakhir (jam & transportasinya).' });
  return issues;
}

// Catatan serius dari pemeriksaan pasti saja (tanpa AI) — dipakai Pandu untuk tahu catatan mana yang sudah beres.
export function quickIssues(plan) {
  return localPlanIssues(plan).filter((i) => i.serius).map((i) => i.text);
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

// Rencana sebagai teks ringkas & UTUH untuk Vera (v1.25: dulu JSON dipotong 6.000 huruf, sehingga Vera
// hanya membaca separuh rencana panjang). Jadwal dikelompokkan per hari. Hasil: { head, core, days[] }.
export const dayOf = (j) => {
  const m = `${j.waktu || ''} ${j.kegiatan || ''}`.toLowerCase().match(/\bhari\s*(?:ke[-\s]?)?(\d{1,2})\b/);
  return m ? +m[1] : null;
};
function planDigest(plan) {
  const sections = planSections({ data: { ...plan, sumber: [] } }).filter((x) => !['vera', 'sumber', 'jadwal'].includes(x.key));
  const days = tripDays(plan);
  const head = [
    `Judul: ${plan.judul || '-'} (${plan.jenis || 'lainnya'})`,
    `Tanggal: ${plan.tanggal || '-'}${plan.tanggal_mulai ? ` (mulai ${plan.tanggal_mulai}${plan.tanggal_selesai ? `, hari terakhir ${plan.tanggal_selesai}` : ''})` : ''}${days ? ` = ${days} hari` : ''}`,
    `Total biaya: Rp${Number(plan.total_biaya || 0).toLocaleString('id-ID')}`,
    plan.ringkasan ? `Ringkasan: ${plan.ringkasan}` : '',
  ].filter(Boolean).join('\n');
  const core = sections.map((x) => `${x.title.replace(/^\S+\s/, '').toUpperCase()}${x.total ? ` (${x.total})` : ''}\n${x.lines.map((l) => `- ${l}`).join('\n')}`).join('\n\n');
  // Jadwal per hari (yang tanpa "Hari N", misal tahapan proyek, jadi satu kelompok).
  const groups = new Map();
  for (const j of plan.jadwal || []) {
    const d = dayOf(j);
    const k = d == null ? 'lain' : d;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(`- ${j.waktu} — ${j.kegiatan}`);
  }
  const dayTexts = [...groups.entries()].map(([k, lines]) => ({ day: k, text: `${k === 'lain' ? 'JADWAL' : `HARI ${k}`}\n${lines.join('\n')}` }));
  return { head, core, days: dayTexts };
}

// Bagi rencana menjadi beberapa bacaan yang muat di jatah per menit Groq (±5.500 huruf per bacaan).
const PART_CHARS = 5500;
function digestParts(d) {
  const sched = d.days.map((x) => x.text).join('\n\n');
  if (d.core.length + sched.length <= PART_CHARS) return [{ label: '', text: `${d.core}\n\nJADWAL LENGKAP\n${sched}` }];
  const parts = [];
  // Bagian inti (biaya, transportasi, hotel, kuliner, …); kalau sangat panjang, dibagi juga.
  let buf = '';
  for (const block of d.core.split('\n\n')) {
    if (buf && buf.length + block.length > PART_CHARS) { parts.push({ label: 'isi utama', text: buf }); buf = ''; }
    buf = buf ? `${buf}\n\n${block}` : block;
  }
  if (buf) parts.push({ label: 'isi utama', text: buf });
  // Jadwal: beberapa hari per bacaan.
  let group = [];
  let len = 0;
  const flush = () => {
    if (!group.length) return;
    const ds = group.map((x) => x.day).filter((x) => x !== 'lain');
    parts.push({ label: ds.length ? `jadwal hari ${ds[0]}${ds.length > 1 ? `–${ds[ds.length - 1]}` : ''}` : 'jadwal', text: group.map((x) => x.text).join('\n\n') });
    group = []; len = 0;
  };
  for (const x of d.days) {
    if (group.length && len + x.text.length > PART_CHARS) flush();
    group.push(x); len += x.text.length;
  }
  flush();
  return parts;
}

// Hasil: { ok, feedback, badge, issues[] }. ok=false + feedback → Pandu memperbaiki (maks 2 kali lewat OpenRouter).
// fixes = koreksi otomatis yang sudah dilakukan (misal total dihitung ulang).
// Rencana panjang dibaca BERTAHAP (beberapa bacaan), catatannya digabung. onWait(detik) = menunggu jatah Groq.
export async function checkPlan(plan, fixes = [], { onWait = null, onPart = null } = {}) {
  const local = localPlanIssues(plan);
  const d = planDigest(plan);
  const parts = digestParts(d);
  const many = parts.length > 1;
  const dislikes = memory.get().profile.filter((m) => m.rasa === 'tidak').map((m) => m.text).join('; ') || '-';
  const results = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (onPart && many) onPart(i, parts.length, part.label);
    const prompt = `Kamu VERA, pemeriksa rencana untuk asisten Gaby. Periksa rencana dari Pandu ini dengan teliti.

Hari ini: ${new Date().toLocaleDateString('sv-SE')}.
Hal yang tidak disukai pengguna: ${dislikes}

RENCANA${many ? ` — BACAAN ${i + 1} DARI ${parts.length} (${part.label}). Rencana ini panjang, jadi dibaca bertahap: periksa HANYA isi bacaan ini; bagian lain ada di bacaan lain, jangan laporkan sebagai hilang` : ''}:
${d.head}

${part.text}

Cek: (1) hitungan biaya masuk akal dan tidak ada biaya penting yang terlupa (misal transport/makan untuk perjalanan), (2) tanggal & urutan jadwal masuk akal dan bisa dijalani, (3) tidak ada saran yang bertentangan dengan hal yang tidak disukai, (4) tidak ada janji pasti yang sebenarnya hanya perkiraan${many ? '' : ', (5) khusus perjalanan: ada jadwal untuk SETIAP hari sampai hari terakhir, termasuk check-out hotel dan perjalanan pulang'}.
Jangan rewel soal selera; laporkan hanya masalah NYATA.

Balas HANYA JSON:
{"status": "ok" | "perlu_perbaikan", "masalah": ["masalah singkat bahasa Indonesia"], "perbaikan": "instruksi singkat untuk Pandu (kosong kalau ok)"}`;
    const raw = await askVera(prompt, { timeout: 45000, maxTokens: 3000, onWait });
    results.push(raw && ['ok', 'perlu_perbaikan'].includes(raw.status) ? raw : null); // balasan tidak jelas = belum dicek
  }
  const answered = results.filter(Boolean);
  const v = answered.length ? {
    status: answered.some((r) => r.status === 'perlu_perbaikan') ? 'perlu_perbaikan' : 'ok',
    masalah: answered.filter((r) => r.status === 'perlu_perbaikan').flatMap((r) => (Array.isArray(r.masalah) ? r.masalah : [])),
    perbaikan: answered.map((r) => (r.status === 'perlu_perbaikan' ? String(r.perbaikan || '').trim() : '')).filter(Boolean).join(' '),
    _model: answered[0]._model,
  } : null;
  const llmIssues = v && v.status === 'perlu_perbaikan'
    ? [...new Set(v.masalah.map((t) => String(t).slice(0, 200)))].map((text) => ({ serius: true, text })).slice(0, 6)
    : [];
  const issues = [...local, ...llmIssues];
  const serious = issues.filter((i) => i.serius);
  const feedback = serious.length
    ? [...serious.map((i) => i.text), v && v.perbaikan ? String(v.perbaikan).slice(0, 400) : ''].filter(Boolean).join(' ')
    : '';
  let badge;
  if (!v && !serious.length) badge = '❓ belum dicek Vera';
  else if (serious.length) {
    // Dipotong di batas kata (dulu di tengah kata: "…(jam & transportas"), + jumlah catatan lain.
    const t = serious[0].text;
    const cut = t.length > 80 ? `${t.slice(0, 80).replace(/\s+\S*$/, '')}…` : t;
    badge = `⚠️ Vera: ${cut}${serious.length > 1 ? ` (+${serious.length - 1} catatan)` : ''}`;
  }
  else badge = '✅ dicek Vera';
  // Sebagian bacaan tidak terjawab: jujur di catatan.
  const partial = v && answered.length < results.length ? [`Vera hanya sempat membaca ${answered.length} dari ${results.length} bagian rencana.`] : [];
  return { ok: !serious.length, feedback, badge, issues, notes: [...fixes, ...partial, ...issues.filter((i) => !i.serius).map((i) => i.text)], model: v && v._model };
}

export const _internal = { askVera, REST, tripDays, tripScheduleIssues, planDigest, digestParts };
