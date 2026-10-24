// Semua data Gaby disimpan di perangkat ini saja (localStorage).

const KEY = 'gaby.v1';

const DEFAULTS = {
  nickname: null,
  memories: [],      // [{ text, at }]
  history: [],       // [{ who: 'user' | 'gaby', text, at }]
  reminders: [],     // [{ id, text, due, done }]
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
    return {
      ...structuredClone(DEFAULTS),
      ...data,
      keys: { ...DEFAULTS.keys, ...data.keys },
      settings: { ...DEFAULTS.settings, ...data.settings },
    };
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

  remember(text) {
    text = String(text).trim().slice(0, 300);
    if (!text) return false;
    const exists = state.memories.some((m) => m.text.toLowerCase() === text.toLowerCase());
    if (!exists) {
      state.memories.push({ text, at: Date.now() });
      if (state.memories.length > 80) state.memories.shift();
      save();
    }
    return true;
  },

  forget(keyword) {
    const k = String(keyword).toLowerCase().trim();
    const before = state.memories.length;
    state.memories = state.memories.filter((m) => !m.text.toLowerCase().includes(k));
    save();
    return before - state.memories.length;
  },

  forgetAll() {
    state.nickname = null;
    state.memories = [];
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
      if (state.history.length > 30) state.history.shift();
    }
    save();
  },

  addReminder(text, due) {
    const r = { id: Math.random().toString(36).slice(2, 8), text, due, done: false };
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
    save();
    return before !== state.reminders.length;
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
