// RARA, agen riset internet Gaby: mencari di internet dengan model teks yang teliti
// (bukan model suara), lalu mengembalikan jawaban + sumbernya untuk Gaby.
//
// Dicoba bertingkat (yang tidak punya kunci dilewati):
//   1. Groq GPT-OSS 120B + browser_search  (kunci Groq gratis, diisi pengguna)
//   2. Gemini 3.x Flash + Google Search     (jatah bulanan)
//   3. Gemini 2.5 Flash + Google Search     (jatah harian)
//   4. Semua habis → "pencarian cepat" = Google Search bawaan Gaby (kurang teliti).
// Tingkat yang habis dicatat di perangkat sampai jatahnya pulih.

import { memory } from './memory.js';
import { groqModels, groqChat, groqSources, cleanText, groqLabel } from './groq.js';
import { checkFacts } from './vera.js';

const REST = 'https://generativelanguage.googleapis.com/v1beta';
const STORE = 'gaby.research';
const TIMEOUT = 25000;

const TIERS = [
  { id: 'groq', label: 'Groq GPT-OSS 120B', period: 'day', needs: 'groq' },
  { id: 'g3', label: 'Gemini 3', period: 'month', needs: 'gemini' },
  { id: 'g25', label: 'Gemini 2.5', period: 'day', needs: 'gemini' },
];

// Tingkat yang kuncinya ada di perangkat ini.
const usable = () => {
  const { keys } = memory.get();
  return TIERS.filter((t) => keys[t.needs]);
};

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
  const tiers = usable();
  return tiers.length > 0 && tiers.every((t) => isExhausted(t.id, st));
}

// true = Rara bisa bekerja (ada kunci dan masih ada jatah).
export function canResearch() {
  return usable().length > 0 && !quickSearchMode();
}

// Untuk Pengaturan: keterangan status pencarian internet.
export function researchStatus() {
  const st = loadState();
  const fmt = (t) => new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const tiers = usable();
  if (!tiers.length) return 'Butuh kunci Groq atau Gemini';
  const active = tiers.find((t) => !isExhausted(t.id, st));
  if (active) return `Teliti (${active.id === 'groq' && st.groqModel ? `Groq ${groqLabel(st.groqModel)}` : active.label})`;
  const until = Math.min(...tiers.map((t) => st[t.id]));
  return `Cepat — jatah teliti habis sampai ${fmt(until)}`;
}

// Alasan terakhir tiap tingkat ditolak, untuk Pengaturan. [{ label, text }]
export function researchReasons() {
  const st = loadState();
  const out = usable().filter((t) => isExhausted(t.id, st) && st.why && st.why[t.id])
    .map((t) => ({ label: t.label, text: st.why[t.id].text }));
  // Gangguan (bukan jatah) dalam 24 jam terakhir, misal Groq tidak bisa dihubungi.
  if (st.lastFail && Date.now() - st.lastFail.at < 86400000 && !out.some((o) => o.label === st.lastFail.label)) {
    out.push({ label: st.lastFail.label, text: `gangguan — ${st.lastFail.text}` });
  }
  return out;
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
    // Bukti untuk Vera: bagian jawaban yang didukung sumber (Gemini tidak memberi isi halamannya).
    const evidence = (meta.groundingSupports || []).map((g) => {
      const idx = [...new Set(g.groundingChunkIndices || [])];
      const names = idx.map((i) => meta.groundingChunks?.[i]?.web?.title).filter(Boolean);
      return g.segment?.text ? `• "${g.segment.text}" — didukung ${names.length} sumber (${names.join(', ')})` : '';
    }).filter(Boolean).join('\n');
    return { text, sources, queries: (meta.webSearchQueries || []).slice(0, 3), evidence };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

// Bukti untuk Vera dari hasil browsing Groq: isi halaman/kutipan yang dibaca Rara.
function groqEvidence(msg) {
  const parts = [];
  for (const t of msg.executed_tools || []) {
    for (const r of t.search_results?.results || []) {
      if (r.content) parts.push(`[${r.title || r.url}] ${String(r.content).slice(0, 1500)}`);
    }
    if (t.output) parts.push(String(t.output).slice(0, 4000));
  }
  return parts.join('\n\n').slice(0, 8000);
}

// Rara lewat Groq: GPT-OSS + browser_search.
// small = utamakan GPT-OSS 20B (dipakai saat Pandu bekerja, supaya jatah token per menit
// tidak berebut dengan Pandu yang memakai GPT-OSS 120B).
async function askGroq(key, question, small = false) {
  let list = await groqModels(key, 'rara');
  if (small) list = [...list].sort((a, b) => (/gpt-oss-20b/.test(b) ? 1 : 0) - (/gpt-oss-20b/.test(a) ? 1 : 0));
  let last = { error: 'model', message: 'Model GPT-OSS tidak tersedia di Groq' };
  for (const model of list) {
    const body = {
      model,
      messages: [{ role: 'user', content: buildPrompt(question).replace('Cari di Google', 'Cari di internet dengan browser_search') }],
      tools: [{ type: 'browser_search' }],
      tool_choice: 'required',
      reasoning_effort: 'low',
      temperature: 0.2,
      max_completion_tokens: 2048,
    };
    let r = await groqChat(key, body, TIMEOUT + 10000);
    if (r.error === 'minute') {
      await sleep(Math.min(Math.max(r.retryAfter * 1000, 1000), 6000));
      r = await groqChat(key, body, TIMEOUT + 10000);
    }
    if (r.error) {
      last = { ...r, model, raw: { message: r.message } };
      if (r.error === 'model') continue; // coba model GPT-OSS berikutnya
      return last;
    }
    const msg = r.data.choices?.[0]?.message || {};
    const st = loadState();
    st.groqModel = model;
    saveState(st);
    return { text: cleanText(msg.content), sources: groqSources(msg), queries: [], model, evidence: groqEvidence(msg) };
  }
  return last;
}

// Cari jawaban. Hasil:
//   { ok: true, found: true, text, sources, queries, tier }
//   { ok: true, found: false }              → tidak ketemu di internet
//   { ok: false, reason: 'habis', nofree }  → semua jatah teliti habis / tidak diberi (pindah ke pencarian cepat)
//   { ok: false, reason: 'auth' | 'gagal' } → kunci ditolak / gangguan
export async function research(question, { small = false } = {}) {
  const { keys } = memory.get();
  let failed = false;
  let nofree = false;
  let lastFail = '';
  for (const tier of usable()) {
    if (isExhausted(tier.id)) continue;
    let r;
    let model;
    if (tier.id === 'groq') {
      r = await askGroq(keys.groq, question, small);
      model = r.model || 'Groq';
    } else {
      const list = await pickModels(keys.gemini);
      model = list[tier.id];
      if (!model) { markExhausted(tier.id, 'week', 'Model ini belum tersedia untuk kunci Gemini kamu'); continue; }
      r = await ask(model, keys.gemini, question);
      if (r.error === 'minute') {
        await sleep(retryDelay(r.raw));
        r = await ask(model, keys.gemini, question);
      }
    }
    if (!r.error) {
      const st = loadState();
      if (st.lastFail && st.lastFail.label === tier.label) { delete st.lastFail; saveState(st); }
      if (!r.text || /^TIDAK_KETEMU\b/.test(r.text)) return { ok: true, found: false, tier: tier.id };
      return { ok: true, found: true, text: r.text.replace(/TIDAK_KETEMU/g, '').trim(), sources: r.sources, queries: r.queries, evidence: r.evidence || '', tier: tier.id };
    }
    console.warn('[Gaby] cari_info', tier.id, model, r.error, r.raw?.message || '');
    const why = `${model}: ${r.raw?.message || r.error}`;
    // Kunci Groq salah: jangan hentikan Rara, lanjut ke Gemini; catat alasannya.
    if (r.error === 'auth' && tier.id === 'groq') { markExhausted(tier.id, 'hour', `Kunci Groq ditolak. Cek lagi kuncinya di Pengaturan. (${r.raw?.message || ''})`); continue; }
    if (r.error === 'auth') return { ok: false, reason: 'auth' };
    if (['day', 'month', 'hour'].includes(r.error)) markExhausted(tier.id, r.error, why);
    else if (r.error === 'minute') markExhausted(tier.id, 'hour', why);
    else if (r.error === 'model') markExhausted(tier.id, 'week', why);
    else if (r.error === 'nosearch') markExhausted(tier.id, 'day', why);
    else if (r.error === 'nofree') { nofree = true; markExhausted(tier.id, 'day', why); }
    else { // gangguan jaringan / server: coba tingkat berikutnya, jangan tandai habis; catat untuk Pengaturan
      failed = true;
      lastFail = why;
      const st = loadState();
      st.lastFail = { label: tier.label, text: String(why).slice(0, 240), at: Date.now() };
      saveState(st);
    }
  }
  if (!failed && quickSearchMode()) return { ok: false, reason: 'habis', nofree };
  if (lastFail) console.warn('[Gaby] cari_info gagal:', lastFail);
  return { ok: false, reason: 'gagal' };
}

// Rara + Vera: cari, lalu dicek Vera. Kalau Vera menemukan klaim yang tidak didukung sumber,
// Rara diminta mencari ulang SEKALI dengan catatan Vera, lalu dicek lagi.
// onStage(siapa, keterangan) dipakai untuk papan kerja tim.
// Hasil: sama seperti research(), ditambah { badge, status, note } kalau ketemu.
export async function researchChecked(question, { onStage = () => {}, small = false } = {}) {
  onStage('rara', `Mencari: ${question}`);
  let r = await research(question, { small });
  if (!r.ok || !r.found) return r;
  onStage('vera', 'Mengecek fakta dari sumber…');
  let v = await checkFacts({ question, answer: r.text, sources: r.sources, evidence: r.evidence });
  if (v.status === 'lemah') {
    onStage('rara', 'Vera minta cek ulang, mencari lagi…');
    const again = await research(`${question} (cari data resmi & terbaru; catatan pemeriksa: ${v.note || 'jawaban sebelumnya tidak didukung sumber'})`, { small });
    if (again.ok && again.found) {
      onStage('vera', 'Mengecek ulang…');
      const v2 = await checkFacts({ question, answer: again.text, sources: again.sources, evidence: again.evidence });
      if (v2.status !== 'lemah' || (v2.answer && !v.answer)) { r = again; v = v2; }
    }
  }
  if (v.status === 'lemah' && !v.answer) {
    return { ok: true, found: false, tier: r.tier, note: v.note, checked: true };
  }
  return { ...r, text: v.answer || r.text, badge: v.badge, status: v.status, note: v.note, support: v.support };
}
