// Membuat & mengedit gambar dengan model gambar Gemini ("Nano Banana").
// Catatan: di banyak akun fitur ini butuh billing Google (bukan kuota gratis).

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

// prompt: teks perintah. photo: JPEG base64 (opsional) untuk diedit.
export async function generateImage(key, prompt, photo) {
  const models = await imageModels(key);
  const parts = [{ text: prompt }];
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

export async function generateFree(prompt, key = '') {
  const seed = Math.floor(Math.random() * 1e9);
  const q = new URLSearchParams({ width: '1024', height: '1024', nologo: 'true', seed: String(seed) });
  if (key) q.set('key', key);
  const p = encodeURIComponent(prompt);
  const urls = [`https://image.pollinations.ai/prompt/${p}?${q}`];
  if (key) urls.push(`https://gen.pollinations.ai/image/${p}?${q}`);

  for (const url of urls) {
    try {
      await loadImage(url);
    } catch {
      continue;
    }
    // Gambar sudah tampil. Coba ambil datanya (butuh izin CORS) supaya bisa
    // disimpan utuh di galeri & dilihat Gaby; kalau tidak bisa, simpan alamatnya saja.
    let blob = null;
    try {
      const res = await fetch(url);
      if (res.ok) blob = await res.blob();
    } catch {}
    return { url, blob, base64: blob ? await blobToBase64(blob) : null, model: 'pollinations' };
  }
  const err = new Error(key
    ? 'Layanan gambar gratis sedang menolak atau sibuk. Coba lagi sebentar lagi.'
    : 'Layanan gambar gratis menolak. Mungkin sekarang perlu key gratis dari pollinations.ai (isi di Pengaturan).');
  throw Object.assign(err, { kind: key ? 'sibuk' : 'butuh_key', pesan: err.message });
}
