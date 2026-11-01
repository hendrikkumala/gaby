// Groq: satu kunci untuk dua teman Gaby.
//   Rara  → GPT-OSS 120B + browser_search (bisa mencari di internet sendiri)
//   Lukas → Qwen3 32B (menulis perintah gambar, cepat; mode berpikir dimatikan)
// Kalau Groq mengganti/menghapus model, dipilih pengganti terdekat dari daftar model Groq.

const API = 'https://api.groq.com/openai/v1';

// Urutan pilihan model. Yang pertama tersedia di akun Groq yang dipakai.
const PREFS = {
  rara: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'], // hanya GPT-OSS yang punya browser_search
  lukas: ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'],
  // Vera sengaja beda keluarga dari Rara & Pandu (GPT-OSS) supaya tidak "sepemikiran".
  vera: ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
  // Vera melihat gambar: model penglihatan (Llama 4); dicari juga dari daftar model Groq.
  vision: ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'],
  // Pandu: perencana yang memakai alat (function calling).
  pandu: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3-32b', 'llama-3.3-70b-versatile'],
};

export const GROQ_LABEL = {
  'openai/gpt-oss-120b': 'GPT-OSS 120B',
  'openai/gpt-oss-20b': 'GPT-OSS 20B',
  'qwen/qwen3-32b': 'Qwen3 32B',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.1-8b-instant': 'Llama 3.1 8B',
  'meta-llama/llama-4-scout-17b-16e-instruct': 'Llama 4 Scout',
  'meta-llama/llama-4-maverick-17b-128e-instruct': 'Llama 4 Maverick',
};
export const groqLabel = (m) => GROQ_LABEL[m] || m;

let listed = null; // { key, names: Set }

async function available(key) {
  if (listed && listed.key === key) return listed.names;
  try {
    const res = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return null;
    const data = await res.json();
    const names = new Set((data.data || []).filter((m) => m.active !== false).map((m) => m.id));
    listed = { key, names };
    return names;
  } catch {
    return null; // daftar tidak bisa diambil: coba urutan pilihan apa adanya
  }
}

// Model yang dicoba untuk sebuah peran, urut dari yang paling disukai.
export async function groqModels(key, role) {
  const names = await available(key);
  const prefs = PREFS[role] || [];
  if (!names) return prefs;
  const ok = prefs.filter((m) => names.has(m));
  if (role === 'vision') {
    // Model penglihatan lain yang ada di akun (misal versi Llama 4 yang lebih baru).
    for (const n of names) if (!ok.includes(n) && /llama-4|vision|-vl\b|scout|maverick/i.test(n)) ok.push(n);
    return ok; // kosong = Groq tidak punya model penglihatan
  }
  return ok.length ? ok : prefs.slice(0, 1);
}

// Kelompokkan penolakan Groq, mirip classifyError di research.js.
export function classifyGroq(status, message) {
  const m = String(message || '');
  if (status === 401 || /invalid api key|invalid_api_key/i.test(m)) return 'auth';
  if (status === 429 || /rate limit/i.test(m)) {
    if (/per day|\(RPD\)|\(TPD\)|daily/i.test(m)) return 'day';
    if (/per minute|\(RPM\)|\(TPM\)/i.test(m)) return 'minute';
    return 'hour';
  }
  if (status === 404 || /decommissioned|does not exist|not found|model_not_found/i.test(m)) return 'model';
  if (status === 400 && /tool|browser_search/i.test(m)) return 'nosearch';
  return 'error';
}

// Panggil Groq (format OpenAI). Hasil: { data } atau { error, message, retryAfter }.
export async function groqChat(key, body, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data.error?.message || `HTTP ${res.status}`;
      const retryAfter = parseFloat(res.headers.get('retry-after') || '') || 0;
      return { error: classifyGroq(res.status, message), message, retryAfter };
    }
    return { data };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : 'network', message: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// Buang penanda kutipan bawaan GPT-OSS (misal "【3†L4-L9】") dan isi berpikir Qwen.
export function cleanText(t) {
  return String(t || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// Kumpulkan sumber (judul + alamat) dari hasil browser_search Groq.
export function groqSources(message) {
  const seen = new Set();
  const out = [];
  const add = (title, url) => {
    if (!url || !/^https?:\/\//.test(url)) return;
    const key = url.replace(/[#?].*$/, '');
    if (seen.has(key)) return;
    seen.add(key);
    let name = String(title || '').trim();
    if (!name) { try { name = new URL(url).hostname.replace(/^www\./, ''); } catch { name = url; } }
    out.push({ title: name.slice(0, 90), url });
  };
  for (const t of message?.executed_tools || []) {
    for (const r of t.search_results?.results || []) add(r.title, r.url);
    // Cadangan: alamat yang tertulis di keluaran alat.
    for (const u of String(t.output || '').match(/https?:\/\/[^\s)\]"'<>]+/g) || []) add('', u);
  }
  for (const u of String(message?.content || '').match(/https?:\/\/[^\s)\]"'<>]+/g) || []) add('', u);
  return out.slice(0, 5);
}

// Pengaturan "berpikir" per keluarga model.
//   careful = true → berpikir dulu (Vera, Pandu); false → langsung menjawab (Lukas).
export function reasoningFor(model, careful) {
  if (/qwen3/.test(model)) return careful ? { reasoning_effort: 'default', reasoning_format: 'hidden' } : { reasoning_effort: 'none' };
  if (/gpt-oss/.test(model)) return { reasoning_effort: careful ? 'medium' : 'low' };
  return {};
}

// Ambil objek JSON pertama dari teks jawaban model.
export function parseJson(text) {
  const t = cleanText(text);
  const m = t.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : t);
}
