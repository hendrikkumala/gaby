// Semua data Gaby disimpan di perangkat ini saja (localStorage).

const KEY = 'gaby.v1';

export const CATEGORIES = {
  diri: '👤 Tentang kamu',
  keluarga: '👨‍👩‍👧 Keluarga & hewan',
  kerja: '💼 Pekerjaan',
  suka: '❤️ Kesukaan',
  kebiasaan: '🔁 Kebiasaan',
  tanggal: '📅 Tanggal penting',
  rencana: '🗓️ Rencana',
  kontak: '📇 Kontak',
  lain: '📌 Lainnya',
};

const newId = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD waktu lokal

const DEFAULTS = {
  nickname: null,
  profile: [],       // [{ id, cat, text, at }] — ingatan tentang pengguna, per kategori
  journal: [],       // [{ id, date: 'YYYY-MM-DD', at, text }] — catatan harian ringkasan obrolan
  lastTidy: 0,       // kapan profil terakhir dirapikan
  history: [],       // [{ who: 'user' | 'gaby', text, at }]
  reminders: [],     // [{ id, text, due, done, todoId }]
  todos: [],         // [{ id, text, done, doneAt, createdAt, date, reminderId }] — catatan/to-do
  pinOk: false,
  keys: { gemini: '', openai: '', pollinations: '' },
  settings: {
    mode: null,      // 'wake' | 'always' | 'tap' (null = pilih otomatis)
    voice: 'Aoede',
    lang: 'id',      // 'id' | 'en' | 'auto'
    model: 'auto',   // nama model Gemini, atau 'auto'
    vadMode: 'local', // 'local' = perangkat menentukan selesai bicara, 'server' = Gemini
    diag: false,     // tampilkan panel diagnosa
    imageEngine: 'free', // 'free' (Pollinations) | 'google' (berbayar, bisa edit foto)
    musicApp: 'ytmusic', // 'ytmusic' | 'youtube' | 'spotify'
    briefing: true,  // briefing pagi & sapaan malam
    affective: true, // Gemini merasakan nada suara (eksperimental)
    captions: true,
    antiEcho: false,
  },
  exhausted: {},     // { providerId: timestampHabisKuota }
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const data = JSON.parse(raw);
    const st = {
      ...structuredClone(DEFAULTS),
      ...data,
      keys: { ...DEFAULTS.keys, ...data.keys },
      settings: { ...DEFAULTS.settings, ...data.settings },
    };
    // Pindahkan ingatan versi lama (daftar biasa) ke profil berkategori.
    if (Array.isArray(data.memories) && data.memories.length) {
      for (const m of data.memories) st.profile.push({ id: newId(), cat: 'lain', text: m.text, at: m.at || Date.now() });
    }
    delete st.memories;
    return st;
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Penyimpanan penuh atau diblokir: aplikasi tetap jalan tanpa menyimpan.
  }
}

export const memory = {
  get: () => state,

  setNickname(name) {
    state.nickname = String(name).trim().slice(0, 40) || null;
    save();
  },

  // Simpan fakta. Kalau `replaces` diisi, fakta lama yang mengandung kata itu diganti.
  remember(text, cat = 'lain', replaces = '') {
    text = String(text).trim().slice(0, 300);
    if (!text) return false;
    if (!CATEGORIES[cat]) cat = 'lain';
    const k = String(replaces || '').toLowerCase().trim();
    const old = k && state.profile.find((m) => m.text.toLowerCase().includes(k));
    if (old) {
      Object.assign(old, { text, cat, at: Date.now() });
    } else if (!state.profile.some((m) => m.text.toLowerCase() === text.toLowerCase())) {
      state.profile.push({ id: newId(), cat, text, at: Date.now() });
      if (state.profile.length > 150) state.profile.shift();
    }
    save();
    return true;
  },

  updateFact(id, text, cat) {
    const m = state.profile.find((x) => x.id === id);
    if (!m) return;
    if (text != null) m.text = String(text).trim().slice(0, 300) || m.text;
    if (cat && CATEGORIES[cat]) m.cat = cat;
    m.at = Date.now();
    save();
  },

  removeFact(id) {
    state.profile = state.profile.filter((x) => x.id !== id);
    save();
  },

  // Ganti seluruh profil (hasil dirapikan otomatis).
  replaceProfile(items) {
    state.profile = items
      .filter((m) => m && m.text)
      .map((m) => ({ id: newId(), cat: CATEGORIES[m.cat] ? m.cat : 'lain', text: String(m.text).slice(0, 300), at: Date.now() }));
    state.lastTidy = Date.now();
    save();
  },

  forget(keyword) {
    const k = String(keyword).toLowerCase().trim();
    const before = state.profile.length;
    state.profile = state.profile.filter((m) => !m.text.toLowerCase().includes(k));
    save();
    return before - state.profile.length;
  },

  addJournal(text, date = today()) {
    text = String(text).trim().slice(0, 600);
    if (!text) return;
    state.journal.push({ id: newId(), date, at: Date.now(), text });
    if (state.journal.length > 400) state.journal.shift();
    save();
  },

  updateJournal(id, text) {
    const j = state.journal.find((x) => x.id === id);
    if (j) { j.text = String(text).trim().slice(0, 600) || j.text; save(); }
  },

  removeJournal(id) {
    state.journal = state.journal.filter((x) => x.id !== id);
    save();
  },

  forgetAll() {
    state.nickname = null;
    state.profile = [];
    state.journal = [];
    state.history = [];
    save();
  },

  addHistory(who, text) {
    text = String(text).trim();
    if (!text) return;
    const last = state.history[state.history.length - 1];
    // Gabungkan potongan transkrip yang berurutan dari pembicara yang sama.
    if (last && last.who === who && Date.now() - last.at < 15000) {
      last.text = (last.text + ' ' + text).replace(/\s+/g, ' ').slice(-600);
      last.at = Date.now();
    } else {
      state.history.push({ who, text: text.slice(0, 600), at: Date.now() });
      if (state.history.length > 60) state.history.shift();
    }
    save();
  },

  addReminder(text, due, todoId = null) {
    const r = { id: newId().slice(0, 6), text, due, done: false, todoId };
    state.reminders.push(r);
    save();
    return r;
  },

  completeReminder(id) {
    const r = state.reminders.find((x) => x.id === id);
    if (r) r.done = true;
    state.reminders = state.reminders.filter((x) => !x.done || Date.now() - x.due < 86400000);
    save();
  },

  removeReminder(id) {
    const before = state.reminders.length;
    state.reminders = state.reminders.filter((x) => x.id !== id);
    for (const t of state.todos) if (t.reminderId === id) t.reminderId = null;
    save();
    return before !== state.reminders.length;
  },

  // ---------- Catatan / to-do ----------

  addTodo(text) {
    text = String(text).trim().replace(/[.。]+$/, '').slice(0, 200);
    if (!text) return null;
    const open = state.todos.find((t) => !t.done && t.text.toLowerCase() === text.toLowerCase());
    if (open) return open;
    const t = { id: newId(), text, done: false, doneAt: 0, createdAt: Date.now(), date: today(), reminderId: null };
    state.todos.push(t);
    if (state.todos.length > 200) state.todos.shift();
    save();
    return t;
  },

  // Cari item berdasarkan ucapan pengguna ("call joni" → "call Joni").
  findTodo(query, { includeDone = false } = {}) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return null;
    const pool = state.todos.filter((t) => includeDone || !t.done);
    const exact = pool.find((t) => t.text.toLowerCase() === q);
    if (exact) return exact;
    const contains = pool.find((t) => t.text.toLowerCase().includes(q) || q.includes(t.text.toLowerCase()));
    if (contains) return contains;
    // Kecocokan kata: item dengan kata sama terbanyak.
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    let best = null, score = 0;
    for (const t of pool) {
      const tw = t.text.toLowerCase();
      const s = words.filter((w) => tw.includes(w)).length;
      if (s > score) { best = t; score = s; }
    }
    return score ? best : null;
  },

  setTodoDone(id, done = true) {
    const t = state.todos.find((x) => x.id === id);
    if (!t) return null;
    t.done = done;
    t.doneAt = done ? Date.now() : 0;
    // Tugas selesai → pengingatnya tidak perlu berbunyi lagi.
    if (done && t.reminderId) {
      const r = state.reminders.find((x) => x.id === t.reminderId);
      if (r && !r.done) r.done = true;
    }
    save();
    return t;
  },

  removeTodo(id) {
    const t = state.todos.find((x) => x.id === id);
    if (!t) return false;
    if (t.reminderId) state.reminders = state.reminders.filter((r) => r.id !== t.reminderId || r.done);
    state.todos = state.todos.filter((x) => x.id !== id);
    save();
    return true;
  },

  linkTodoReminder(todoId, reminderId) {
    const t = state.todos.find((x) => x.id === todoId);
    if (t) { t.reminderId = reminderId; save(); }
  },

  // Bersihkan harian: yang sudah dicentang sebelum hari ini dihapus.
  // Mengembalikan item belum selesai dari hari-hari sebelumnya.
  dailyCleanup() {
    const d = today();
    const before = state.todos.length;
    state.todos = state.todos.filter((t) => !(t.done && new Date(t.doneAt).toLocaleDateString('sv-SE') < d));
    if (state.todos.length !== before) save();
    return state.todos.filter((t) => !t.done && t.date < d);
  },

  openTodos() {
    return state.todos.filter((t) => !t.done);
  },

  setKeys(keys) {
    state.keys = { ...state.keys, ...keys };
    save();
  },

  setSetting(name, value) {
    state.settings[name] = value;
    save();
  },

  setPinOk() {
    state.pinOk = true;
    save();
  },

  markExhausted(id) {
    state.exhausted[id] = Date.now();
    save();
  },

  clearExhausted(id) {
    delete state.exhausted[id];
    save();
  },
};
