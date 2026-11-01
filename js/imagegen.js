import { groqModels, groqChat, cleanText } from './groq.js';

// LUKAS, teman pelukis Gaby: menulis perintah gambar yang rinci (writeImagePrompt), lalu
// menggambar dengan mesin gratis (Pollinations) atau model gambar Gemini ("Nano Banana").
// Catatan: model gambar Google di banyak akun butuh billing (bukan kuota gratis).

const REST = 'https://generativelanguage.googleapis.com/v1beta';
const FALLBACK = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'];

let cachedModels = null;

async function imageModels(key) {
  if (cachedModels) return cachedModels;
  try {
    const res = await fetch(`${REST}/models?pageSize=1000&key=${encodeURIComponent(key)}`);
    const data = await res.json();
    const names = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((n) => /gemini.*image/.test(n) && !/imagen|tts/.test(n));
    // Utamakan model Flash (murah & cepat), versi terbaru dulu.
    const score = (n) => (/flash/.test(n) ? 0 : 1) + (/preview|exp/.test(n) ? 0.2 : 0);
    names.sort((a, b) => score(a) - score(b) || b.localeCompare(a));
    cachedModels = names.length ? names : FALLBACK;
  } catch {
    cachedModels = FALLBACK;
  }
  return cachedModels;
}

function explain(status, message) {
  const m = String(message || '').toLowerCase();
  if (status === 429 || /quota|exhaust|free tier|billing|limit: 0/.test(m)) {
    return { kind: 'billing', pesan: 'Pembuatan gambar butuh billing Google atau kuotanya habis. Aktifkan billing di aistudio.google.com untuk memakainya.' };
  }
  if (/safety|blocked|prohibited|policy/.test(m)) {
    return { kind: 'ditolak', pesan: 'Google menolak membuat gambar ini karena aturan keamanan konten.' };
  }
  if (status === 400 || status === 403) return { kind: 'key', pesan: `Google menolak permintaan: ${message}` };
  return { kind: 'lain', pesan: message || `Gagal (HTTP ${status})` };
}

// Bentuk gambar → ukuran (mesin gratis) dan rasio (mesin Google).
export const SHAPES = {
  persegi: { width: 1024, height: 1024, ratio: '1:1', en: 'square 1:1' },
  tegak: { width: 768, height: 1344, ratio: '9:16', en: 'vertical portrait 9:16' },
  mendatar: { width: 1344, height: 768, ratio: '16:9', en: 'horizontal landscape 16:9' },
};
const shapeOf = (s) => SHAPES[s] || SHAPES.persegi;

// prompt: teks perintah. photo: JPEG base64 (opsional) untuk diedit. shape: persegi/tegak/mendatar.
export async function generateImage(key, prompt, photo, shape = 'persegi') {
  const models = await imageModels(key);
  const parts = [{ text: shape !== 'persegi' ? `${prompt}\nImage format: ${shapeOf(shape).en}.` : prompt }];
  if (photo) parts.push({ inline_data: { mime_type: 'image/jpeg', data: photo } });
  let last = null;
  for (const model of models.slice(0, 3)) {
    const res = await fetch(`${REST}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      last = explain(res.status, data.error?.message);
      if (res.status === 404) continue; // model tidak ada, coba berikutnya
      throw Object.assign(new Error(last.pesan), last);
    }
    const out = (data.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
    if (!out) {
      const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'tanpa gambar';
      last = explain(200, `safety ${reason}`);
      throw Object.assign(new Error(last.pesan), last);
    }
    const inline = out.inlineData || out.inline_data;
    const bin = atob(inline.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { blob: new Blob([bytes], { type: inline.mimeType || inline.mime_type || 'image/png' }), model, base64: inline.data };
  }
  throw Object.assign(new Error(last?.pesan || 'Model gambar tidak tersedia'), last || { kind: 'lain' });
}

// ---------- Mesin gratis (Pollinations) ----------
// Tidak butuh billing. Kalau layanan meminta key, pengguna bisa mengisi key gratis
// dari pollinations.ai di Pengaturan.

function loadImage(url, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('ditolak')); };
    img.src = url;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => resolve(null);
    r.readAsDataURL(blob);
  });
}

export async function generateFree(prompt, key = '', shape = 'persegi') {
  const seed = Math.floor(Math.random() * 1e9);
  const { width, height } = shapeOf(shape);
  const q = new URLSearchParams({ width: String(width), height: String(height), nologo: 'true', seed: String(seed) });
  const p = encodeURIComponent(prompt);

  // 1) Dengan key: kirim lewat header (tersembunyi), supaya key tidak muncul di alamat gambar.
  if (key) {
    try {
      const res = await fetch(`https://gen.pollinations.ai/image/${p}?${q}`, { headers: { Authorization: `Bearer ${key}` } });
      if (res.ok && /^image\//.test(res.headers.get('content-type') || '')) {
        const blob = await res.blob();
        return { url: null, blob, base64: await blobToBase64(blob), model: 'pollinations' };
      }
      if (res.status === 401 || res.status === 403) {
        throw Object.assign(new Error('Key Pollinations ditolak. Cek lagi key-nya di Pengaturan.'), { kind: 'key' });
      }
      if (res.status === 402 || res.status === 429) {
        throw Object.assign(new Error('Jatah gambar gratis Pollinations hari ini habis. Coba lagi nanti.'), { kind: 'kuota' });
      }
    } catch (e) {
      if (e.kind) { e.pesan = e.message; throw e; }
      // Gagal jaringan/CORS: lanjut ke cara cadangan di bawah.
    }
  }

  // 2) Cadangan: muat sebagai gambar biasa (tanpa key, atau key di alamat bila terpaksa).
  const urls = [`https://image.pollinations.ai/prompt/${p}?${q}`];
  if (key) {
    const qk = new URLSearchParams(q);
    qk.set('key', key);
    urls.push(`https://gen.pollinations.ai/image/${p}?${qk}`);
  }
  for (const url of urls) {
    try {
      await loadImage(url);
    } catch {
      continue;
    }
    let blob = null;
    try {
      const res = await fetch(url);
      if (res.ok) blob = await res.blob();
    } catch {}
    // Jangan simpan alamat yang berisi key.
    const safeUrl = url.includes('key=') ? null : url;
    if (!blob && !safeUrl) continue;
    return { url: safeUrl, blob, base64: blob ? await blobToBase64(blob) : null, model: 'pollinations' };
  }
  const err = new Error(key
    ? 'Layanan gambar gratis sedang menolak atau sibuk. Coba lagi sebentar lagi.'
    : 'Layanan gambar gratis sekarang wajib daftar. Ambil key gratis di enter.pollinations.ai lalu isi di Pengaturan.');
  throw Object.assign(err, { kind: key ? 'sibuk' : 'butuh_key', pesan: err.message });
}

// ---------- Lukas: penulis perintah gambar ----------
// Memakai model teks Gemini (jatah teks biasa, terpisah dari jatah pencarian Rara).

const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

function lukasPrompt({ request, draft, hints, hasPhoto, engine, previous, change, shape }) {
  const parts = [`Kamu LUKAS, pelukis dan penulis prompt gambar untuk asisten suara Gaby. Tulis SATU prompt gambar dalam bahasa Inggris yang membuat hasilnya PERSIS sesuai permintaan pengguna.

Permintaan pengguna (kata-katanya sendiri): "${request}"
Draf singkat dari Gaby: "${draft}"`];
  if (hints.length) {
    parts.push(`Ingatan tentang pengguna yang MUNGKIN relevan (pakai hanya kalau permintaan memang menyinggungnya, misal "kucingku", "aku", "istriku"; jangan menambah hal yang tidak diminta):\n${hints.map((h) => `- ${h}`).join('\n')}`);
  }
  if (previous) {
    parts.push(`Ini PERBAIKAN gambar sebelumnya. Prompt sebelumnya: "${previous}"\nPerubahan yang diminta: "${change}"\nPertahankan semua hal lain yang tidak diminta berubah.`);
  }
  if (hasPhoto) {
    parts.push(engine === 'google'
      ? 'Foto dari kamera pengguna terlampir dan mesin gambar JUGA menerima foto ini. Tulis instruksi edit yang dimulai "Using the provided photo, ..." lalu jelaskan perubahan yang diminta, dan sebut detail penting foto yang harus tetap sama.'
      : 'Foto dari kamera pengguna terlampir, tetapi mesin gambar TIDAK melihat foto: ia menggambar ulang hanya dari teks. Jadi deskripsikan isi foto dengan sangat rinci (benda, bentuk, warna, bahan, posisi, latar, cahaya), lalu terapkan perubahan yang diminta.');
  }
  parts.push(`Aturan prompt:
- Mulai dari subjek utama dan SEMUA detail yang diminta (jumlah, warna, pakaian, ekspresi, aksi, tempat). Jangan menghilangkan satu pun permintaan pengguna.
- Sebut gaya visual yang jelas (photorealistic photo, cartoon, anime, watercolor painting, 3D render, pixel art, dll.). Kalau pengguna tidak menyebut gaya, pilih yang paling cocok.
- Tambahkan komposisi/sudut kamera, pencahayaan, palet warna, suasana, dan latar.
- Hal khas Indonesia (makanan, pakaian adat, bangunan, tempat) jelaskan wujudnya secara visual, misal rendang = "dark brown slow-cooked beef chunks coated in thick dry coconut-chili paste".
- Tulisan di dalam gambar hanya kalau diminta: maksimal 3 kata, di dalam tanda kutip.
- 50–120 kata, satu paragraf, tanpa penjelasan.
Pilih "bentuk": "tegak" (potret, wallpaper HP, poster), "mendatar" (pemandangan lebar, banner, wallpaper laptop), atau "persegi" (lainnya).${shape ? ` Pengguna sudah memilih bentuk "${shape}", pakai itu.` : ' Ikuti kalau pengguna menyebutnya.'}

Balas JSON: {"prompt": "...", "bentuk": "persegi|tegak|mendatar"}`);
  return parts.join('\n\n');
}

function parseLukas(raw, opts) {
  const text = cleanText(raw);
  const json = text.match(/\{[\s\S]*\}/);
  const out = JSON.parse(json ? json[0] : text);
  const prompt = String(out.prompt || '').trim();
  if (prompt.length < 15) throw new Error('prompt kosong');
  const bentuk = SHAPES[opts.shape] ? opts.shape : (SHAPES[out.bentuk] ? out.bentuk : 'persegi');
  return { prompt: prompt.slice(0, 1500), bentuk };
}

// Lukas lewat Groq (Qwen3 32B dkk.). Hanya teks; foto kamera ditangani Gemini.
async function lukasGroq(key, opts) {
  const text = lukasPrompt({ ...opts, hasPhoto: false });
  let lastErr = null;
  for (const model of await groqModels(key, 'lukas')) {
    const body = {
      model,
      messages: [{ role: 'user', content: text }],
      temperature: 0.6,
      max_completion_tokens: 1024,
      response_format: { type: 'json_object' },
    };
    if (/qwen3/.test(model)) body.reasoning_effort = 'none'; // langsung menulis, tanpa "berpikir"
    else if (/gpt-oss/.test(model)) body.reasoning_effort = 'low';
    const r = await groqChat(key, body, 15000);
    if (r.error) { lastErr = new Error(`${model}: ${r.message}`); if (r.error === 'auth') break; continue; }
    try {
      return { ...parseLukas(r.data.choices?.[0]?.message?.content, opts), model: `groq:${model}` };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Groq tidak bisa dipakai Lukas');
}

// keys: { groq, gemini }. Hasil: { prompt, bentuk, model }. Gagal → lempar error (pemanggil memakai draf Gaby).
// Urutan: Groq (kalau ada kunci & tanpa foto) → Gemini 2.5 Flash → Flash-Lite.
export async function writeImagePrompt(keys, opts) {
  let lastErr = null;
  if (keys.groq && !opts.photo) {
    try {
      return await lukasGroq(keys.groq, opts);
    } catch (e) {
      lastErr = e;
      console.warn('[Gaby] Lukas via Groq gagal, coba Gemini:', e.message);
    }
  }
  if (!keys.gemini) throw lastErr || new Error('Lukas butuh kunci Groq atau Gemini');
  const text = lukasPrompt({ ...opts, hasPhoto: !!opts.photo });
  const parts = [{ text }];
  if (opts.photo) parts.push({ inline_data: { mime_type: 'image/jpeg', data: opts.photo } });
  for (const model of TEXT_MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${REST}/models/${model}:generateContent?key=${encodeURIComponent(keys.gemini)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { lastErr = new Error(data.error?.message || `HTTP ${res.status}`); continue; }
      const raw = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      return { ...parseLukas(raw, opts), model };
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error('Lukas tidak bisa menulis perintah');
}
