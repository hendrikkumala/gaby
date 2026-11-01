// Agen riset internet: mencari di Google lewat model teks Gemini yang lebih teliti
// (bukan model suara), lalu mengembalikan jawaban + sumbernya untuk Gaby.
//
// Jatah gratis pencarian Google berbeda per keluarga model, jadi dicoba bertingkat:
//   1. Gemini 3.x Flash  (jatah bulanan)
//   2. Gemini 2.5 Flash  (jatah harian)
//   3. Kalau dua-duanya habis → "pencarian cepat" = Google Search bawaan Gaby (kurang teliti).
// Tingkat yang habis dicatat di perangkat sampai jatahnya pulih.

const REST = 'https://generativelanguage.googleapis.com/v1beta';
const STORE = 'gaby.research';
const TIMEOUT = 25000;

const TIERS = [
  { id: 'g3', label: 'Gemini 3', period: 'month' },
  { id: 'g25', label: 'Gemini 2.5', period: 'day' },
];

let models = null; // { g3: 'gemini-3-flash…' | null, g25: 'gemini-2.5-flash' }

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { return {}; }
}

function saveState(st) {
  try { localStorage.setItem(STORE, JSON.stringify(st)); } catch {}
}

// Jatah Google pulih tengah malam waktu Pasifik (±08:00 UTC). Dipakai 08:00 UTC supaya aman.
function nextReset(period, now = new Date()) {
  if (period === 'hour') return now.getTime() + 3600000;
  if (period === 'week') return now.getTime() + 7 * 86400000;
  if (period === 'month') return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 8);
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8);
  return t > now.getTime() ? t : t + 86400000;
}

// why: alasan asli dari Google (disimpan supaya bisa dilihat di Pengaturan).
function markExhausted(id, period, why = '') {
  const st = loadState();
  st[id] = nextReset(period);
  st.why = { ...(st.why || {}), [id]: { text: String(why || '').slice(0, 240), at: Date.now() } };
  saveState(st);
}

const isExhausted = (id, st = loadState()) => (st[id] || 0) > Date.now();

// true = semua jatah pencarian teliti habis → Gaby memakai Google Search bawaannya.
export function quickSearchMode() {
  const st = loadState();
  return TIERS.every((t) => isExhausted(t.id, st));
}

// Untuk Pengaturan: keterangan status pencarian internet.
export function researchStatus() {
  const st = loadState();
  const fmt = (t) => new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const active = TIERS.find((t) => !isExhausted(t.id, st));
  if (active) return `Teliti (${active.label})`;
  const until = Math.min(...TIERS.map((t) => st[t.id]));
  return `Cepat — jatah teliti habis sampai ${fmt(until)}`;
}

// Alasan terakhir tiap tingkat ditolak, untuk Pengaturan. [{ label, text }]
export function researchReasons() {
  const st = loadState();
  return TIERS.filter((t) => isExhausted(t.id, st) && st.why && st.why[t.id])
    .map((t) => ({ label: t.label, text: st.why[t.id].text }));
}

// Lupakan semua catatan "habis" (tombol "Coba Rara lagi").
export function resetResearch() {
  saveState({});
  models = null;
}

// Pilih nama model yang tersedia untuk kunci ini.
async function pickModels(key) {
  if (models) return models;
  const found = { g3: null, g25: 'gemini-2.5-flash' };
  try {
    const res = await fetch(`${REST}/models?pageSize=1000&key=${encodeURIComponent(key)}`);
    const data = await res.json();
    const names = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((n) => !/image|tts|audio|live|embedding|thinking|computer|robotics/.test(n));
    // Gemini 3.x Flash: utamakan yang bukan "lite" (lebih teliti), lalu versi terbaru.
    const g3 = names.filter((n) => /^gemini-3(\.\d+)?-flash/.test(n));
    const score = (n) => (/lite/.test(n) ? 1 : 0) + (/exp/.test(n) ? 0.5 : 0);
    g3.sort((a, b) => score(a) - score(b) || b.localeCompare(a));
    found.g3 = g3[0] || null;
    if (names.length && !names.includes('gemini-2.5-flash')) {
      found.g25 = names.find((n) => /^gemini-2\.5-flash(?!-lite)/.test(n)) || 'gemini-2.5-flash';
    }
  } catch {
    // Daftar model tidak bisa diambil: pakai nama baku saja.
  }
  models = found;
  return models;
}

// Kelompokkan penolakan dari Google.
function classifyError(status, err) {
  const text = `${err?.message || ''} ${JSON.stringify(err?.details || [])}`;
  // "limit: 0" = kunci ini tidak diberi jatah sama sekali (biasanya paket gratis tanpa akses fitur ini).
  if (/limit:\s*0\b/i.test(text)) return 'nofree';
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) {
    if (/PerMinute|per minute|PerSecond/i.test(text)) return 'minute';
    if (/PerMonth|per month|monthly/i.test(text)) return 'month';
    if (/PerDay|per day|daily/i.test(text)) return 'day';
    return 'hour'; // tidak jelas: anggap habis sebentar saja
  }
  if (/api key|API_KEY_INVALID|unauthenticated/i.test(text) && (status === 400 || status === 401 || status === 403)) return 'auth';
  if (status === 404 || /not found|is not supported|not available/i.test(text)) return 'model';
  if ((status === 400 || status === 403) && /search|grounding/i.test(text)) return 'nosearch';
  return 'error';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryDelay(err) {
  const d = (err?.details || []).find((x) => x && x.retryDelay);
  const s = d ? parseFloat(String(d.retryDelay)) : 2;
  return Math.min(Math.max(s || 2, 1), 6) * 1000;
}

function buildPrompt(question) {
  const now = new Date();
  const when = now.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `Kamu agen riset untuk asisten suara bernama Gaby. Cari di Google, lalu jawab pertanyaan ini dalam bahasa Indonesia:

"${question}"

Waktu sekarang: ${when} (${tz}).

Aturan:
- Pakai HANYA informasi dari hasil pencarian. Jangan menebak atau mengarang angka, nama, harga, skor, atau tanggal.
- Jawab ringkas 2–4 kalimat. Sebut angka/tanggal penting dan kapan info itu berlaku.
- Kalau sumber saling berbeda, katakan bahwa sumbernya berbeda dan sebut kisarannya.
- Kalau hasil pencarian tidak memuat jawabannya, balas persis satu kata: TIDAK_KETEMU`;
}

async function ask(model, key, question) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(`${REST}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(question) }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2 },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: classifyError(res.status, data.error), raw: data.error };
    const cand = data.candidates?.[0] || {};
    const text = (cand.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
    const meta = cand.groundingMetadata || {};
    const seen = new Set();
    const sources = [];
    for (const c of meta.groundingChunks || []) {
      const w = c.web;
      if (!w || !w.uri) continue;
      const title = String(w.title || w.uri).trim();
      if (seen.has(title)) continue;
      seen.add(title);
      sources.push({ title, url: w.uri });
      if (sources.length >= 5) break;
    }
    return { text, sources, queries: (meta.webSearchQueries || []).slice(0, 3) };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

// Cari jawaban. Hasil:
//   { ok: true, found: true, text, sources, queries, tier }
//   { ok: true, found: false }              → tidak ketemu di internet
//   { ok: false, reason: 'habis', nofree }  → semua jatah teliti habis / tidak diberi (pindah ke pencarian cepat)
//   { ok: false, reason: 'auth' | 'gagal' } → kunci ditolak / gangguan
export async function research(question, key) {
  const list = await pickModels(key);
  let failed = false;
  let nofree = false;
  for (const tier of TIERS) {
    if (isExhausted(tier.id)) continue;
    const model = list[tier.id];
    if (!model) { markExhausted(tier.id, 'week', 'Model ini belum tersedia untuk kunci Gemini kamu'); continue; }
    let r = await ask(model, key, question);
    if (r.error === 'minute') {
      await sleep(retryDelay(r.raw));
      r = await ask(model, key, question);
    }
    if (!r.error) {
      if (!r.text || /^TIDAK_KETEMU\b/.test(r.text)) return { ok: true, found: false, tier: tier.id };
      return { ok: true, found: true, text: r.text.replace(/TIDAK_KETEMU/g, '').trim(), sources: r.sources, queries: r.queries, tier: tier.id };
    }
    console.warn('[Gaby] cari_info', tier.id, model, r.error, r.raw?.message || '');
    if (r.error === 'auth') return { ok: false, reason: 'auth' };
    const why = `${model}: ${r.raw?.message || r.error}`;
    if (['day', 'month', 'hour'].includes(r.error)) markExhausted(tier.id, r.error, why);
    else if (r.error === 'minute') markExhausted(tier.id, 'hour', why);
    else if (r.error === 'model') markExhausted(tier.id, 'week', why);
    else if (r.error === 'nosearch') markExhausted(tier.id, 'day', why);
    else if (r.error === 'nofree') { nofree = true; markExhausted(tier.id, 'day', why); }
    else failed = true; // gangguan jaringan / server: coba tingkat berikutnya, jangan tandai habis
  }
  if (!failed && quickSearchMode()) return { ok: false, reason: 'habis', nofree };
  return { ok: false, reason: 'gagal' };
}
