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
  if (!v) return { status: 'skip', answer, support: n, note: 'Vera sedang tidak bisa mengecek.', badge: '❓ belum dicek Vera' };
  const status = ['cocok', 'beda', 'lemah'].includes(v.status) ? v.status : 'lemah';
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

export const _internal = { askVera, REST };
