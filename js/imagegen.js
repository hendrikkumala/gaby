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
