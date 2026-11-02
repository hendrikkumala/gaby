// OpenRouter: otak cadangan-utama untuk PANDU. Jatah model gratisnya dihitung PER PERMINTAAN
// (±20/menit, 50/hari; 1.000/hari kalau akun pernah isi saldo ≥ $10), bukan per token, jadi Pandu
// bisa membaca hasil riset lengkap tanpa kena batas token per menit seperti di Groq.
// Model dipilih otomatis: yang gratis DAN bisa memakai alat, dengan urutan pilihan di bawah.

const API = 'https://openrouter.ai/api/v1';
const STORE = 'gaby.openrouter'; // { day: 'YYYY-MM-DD' (UTC), used, limit, blockedUntil, why, lastModel }

// Urutan pilihan untuk Pandu (yang tidak ada / tidak bisa memakai alat dilewati).
const PREFS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

const LABELS = {
  'nvidia/nemotron-3-ultra-550b-a55b:free': 'Nemotron Ultra 550B',
  'nvidia/nemotron-3-super-120b-a12b:free': 'Nemotron Super 120B',
};
export const orLabel = (m) => LABELS[m] || String(m || '').replace(/^[^/]+\//, '').replace(/:free$/, '');

const utcDay = () => new Date().toISOString().slice(0, 10);
const nextUtcMidnight = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); };

function load() {
  let st = {};
  try { st = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch {}
  if (st.day !== utcDay()) st = { ...st, day: utcDay(), used: 0 }; // jatah harian pulih tengah malam UTC
  return st;
}
function save(st) {
  try { localStorage.setItem(STORE, JSON.stringify(st)); } catch {}
}

// Untuk Pengaturan: "Nemotron Ultra 550B · 12/50 permintaan hari ini".
export function orStatus(hasKey) {
  if (!hasKey) return 'Belum ada kunci (Pandu memakai Groq)';
  const st = load();
  const usage = `${st.used || 0}/${st.limit || 50} permintaan hari ini`;
  if (st.blockedUntil && st.blockedUntil > Date.now()) {
    return `Istirahat sampai ${new Date(st.blockedUntil).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} (${st.why || 'jatah habis'}) · ${usage}`;
  }
  return `${st.lastModel ? orLabel(st.lastModel) : 'Siap'} · ${usage}`;
}

export function orAvailable(hasKey) {
  if (!hasKey) return false;
  const st = load();
  return !(st.blockedUntil && st.blockedUntil > Date.now());
}

function block(ms, why) {
  const st = load();
  st.blockedUntil = Date.now() + ms;
  st.why = why;
  save(st);
}

export function resetOpenRouter() {
  const st = load();
  delete st.blockedUntil;
  delete st.why;
  save(st);
  listed = null;
}

let listed = null; // { at, models: [id] }

// Model gratis yang bisa memakai alat, diurutkan: pilihan kita dulu, lalu yang konteksnya terbesar.
export async function orModels() {
  if (listed && Date.now() - listed.at < 3600000) return listed.models;
  try {
    const res = await fetch(`${API}/models`, { signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined });
    const data = await res.json();
    const free = (data.data || []).filter((m) => /:free$/.test(m.id) && (m.supported_parameters || []).includes('tools'));
    const ids = new Set(free.map((m) => m.id));
    const ordered = [
      ...PREFS.filter((p) => ids.has(p)),
      ...free.filter((m) => !PREFS.includes(m.id)).sort((a, b) => (b.context_length || 0) - (a.context_length || 0)).map((m) => m.id),
    ].slice(0, 4);
    listed = { at: Date.now(), models: ordered.length ? ordered : PREFS };
  } catch {
    listed = { at: Date.now(), models: PREFS }; // daftar tidak bisa diambil: coba pilihan kita apa adanya
  }
  return listed.models;
}

// Cek batas harian akun (50 atau 1.000) — sekali sehari, diam-diam.
export async function orRefreshLimit(key) {
  const st = load();
  if (st.limitChecked === st.day) return;
  try {
    const res = await fetch(`${API}/key`, { headers: { Authorization: `Bearer ${key}` } });
    const d = (await res.json()).data || {};
    st.limit = d.is_free_tier === false ? 1000 : 50;
    st.limitChecked = st.day;
    save(st);
  } catch {}
}

// Kelompokkan penolakan OpenRouter.
export function classifyOR(status, message) {
  const m = String(message || '');
  if (status === 401 || (status === 403 && /key|auth|user/i.test(m))) return 'auth';
  if (status === 429) return /per[- ]day|daily|free-models-per-day/i.test(m) ? 'day' : 'minute';
  if (status === 404 || /no endpoints|not a valid model|data policy/i.test(m)) return /data policy|privacy/i.test(m) ? 'privacy' : 'model';
  if (status === 402) return 'credits';
  if (status >= 500 || status === 408) return 'busy';
  return 'error';
}

// Panggil OpenRouter (format OpenAI). Hasil: { data } atau { error, message }.
export async function orChat(key, body, timeoutMs = 150000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const st = load();
  st.used = (st.used || 0) + 1; // permintaan gagal pun ikut dihitung OpenRouter
  save(st);
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://hendrikkumala.github.io/gaby/',
        'X-Title': 'Gaby',
      },
      signal: ctrl.signal,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    // OpenRouter kadang membalas 200 berisi { error } dari penyedia model.
    const err = !res.ok ? data.error : data.error || (data.choices ? null : { message: 'Balasan kosong', code: 502 });
    if (err) {
      const message = err.metadata?.raw ? `${err.message}: ${String(err.metadata.raw).slice(0, 200)}` : (err.message || `HTTP ${res.status}`);
      const kind = classifyOR(res.ok ? (err.code || 502) : res.status, message);
      if (kind === 'day') block(nextUtcMidnight() - Date.now(), 'jatah harian habis');
      else if (kind === 'privacy') block(3600000, 'izin privasi model gratis belum dinyalakan');
      else if (kind === 'credits') block(3600000, 'saldo/kredit dibutuhkan');
      return { error: kind, message };
    }
    const s2 = load();
    s2.lastModel = body.model;
    save(s2);
    return { data };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : 'network', message: e.message };
  } finally {
    clearTimeout(timer);
  }
}
