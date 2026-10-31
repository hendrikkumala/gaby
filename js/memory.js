// Semua data Gaby disimpan di perangkat ini saja (localStorage).

const KEY = 'gaby.v1';

// Laci-laci ingatan tentang pengguna. Urutan ini juga urutan tampil di Pengaturan.
export const CATEGORIES = {
  diri: '👤 Tentang kamu',
  keluarga: '👨‍👩‍👧 Keluarga & hewan',
  kerja: '💼 Pekerjaan',
  kontak: '📇 Kontak',
  tanggal: '📅 Tanggal penting',
  rencana: '🗓️ Rencana',
  kebiasaan: '🔁 Kebiasaan',
  makanan: '🍜 Makanan & minuman',
  olahraga: '⚽ Olahraga',
  musik: '🎵 Musik',
  hiburan: '🎬 Film & hiburan',
  jalan: '✈️ Jalan-jalan',
  kesehatan: '🩺 Kesehatan & kedokteran',
  keuangan: '💰 Keuangan',
  teknologi: '💻 Teknologi',
  ilmu: '🔬 Ilmu pengetahuan',
  belajar: '📚 Pelajaran & belajar',
  lain: '📌 Lainnya',
};

// Tanda perasaan pengguna terhadap suatu hal: 'suka' (👍), 'tidak' (👎), '' (biasa saja).
export const RASA = { suka: '👍', tidak: '👎' };

// Laci yang selalu dibawa Gaby di setiap obrolan (selain semua hal bertanda 👎).
export const ALWAYS_CATS = ['diri', 'keluarga', 'kerja', 'tanggal', 'rencana'];

// Kalau jumlah ingatan masih sedikit, semua laci dibawa sekaligus (tidak perlu buka laci).
export const DRAWER_LIMIT = 40;

// Kata kunci "penjaga laci": dipakai untuk menebak laci dari ucapan/topik (tanpa AI, gratis).
const TOPIC_WORDS = {
  keluarga: 'keluarga istri suami anak ayah ibu papa mama bapak kakak adik nenek kakek pacar kucing anjing hewan peliharaan mertua sepupu ponakan keponakan',
  kerja: 'kerja kerjaan kantor pekerjaan bos atasan rekan meeting rapat proyek klien lembur karir karier jabatan',
  kontak: 'kontak nomor telepon whatsapp',
  tanggal: 'ulang tahun ultah anniversary hari jadi peringatan',
  rencana: 'rencana target resolusi impian cita-cita',
  kebiasaan: 'kebiasaan rutinitas rutin biasanya bangun',
  makanan: 'makan makanan minum minuman kuliner masak masakan resep menu restoran resto warung kafe cafe kopi teh sarapan lapar haus jajan camilan cemilan snack nasi mie bakso sate rendang ayam ikan daging sayur buah pedas manis gurih alergi vegetarian seafood udang kue roti es jus boba pizza burger sushi martabak soto',
  olahraga: 'olahraga sport bola lari jogging gym fitness sepak bola futsal badminton bulu tangkis basket voli renang sepeda gowes yoga tenis golf pertandingan liga klub timnas piala motogp f1 tinju ufc maraton senam pemain',
  musik: 'musik lagu penyanyi band album konser playlist spotify nyanyi karaoke gitar piano dangdut pop rock jazz kpop k-pop',
  hiburan: 'film movie bioskop nonton serial series drama drakor anime netflix youtube game gim komik novel tv acara podcast aktor aktris',
  jalan: 'jalan-jalan liburan libur wisata traveling travel trip pantai gunung hotel pesawat tiket mudik piknik luar negeri destinasi staycation kereta bali',
  kesehatan: 'sehat kesehatan sakit dokter obat rumah sakit klinik puskesmas demam batuk pilek flu pusing kolesterol darah tinggi hipertensi diabetes gula darah asam urat alergi vitamin tidur insomnia diet berat badan kedokteran medis penyakit gejala operasi jantung gigi vaksin stres mental',
  keuangan: 'uang duit keuangan gaji tabungan nabung investasi saham reksa dana crypto kripto bitcoin emas utang hutang cicilan kredit pinjaman bank budget anggaran tagihan pajak asuransi bisnis usaha cuan',
  teknologi: 'teknologi hp handphone ponsel smartphone iphone android samsung laptop komputer pc gadget aplikasi internet wifi ai coding program software website robot elektronik',
  ilmu: 'ilmu sains science fisika kimia biologi astronomi angkasa planet bintang semesta sejarah geografi matematika penelitian riset ilmuwan evolusi dinosaurus',
  belajar: 'belajar pelajaran sekolah kuliah kampus kursus les ujian pr skripsi guru dosen murid mahasiswa sertifikat',
};

// Frasa dua kata dicocokkan utuh; sisanya per kata.
const TOPIC_PHRASES = ['ulang tahun', 'hari jadi', 'sepak bola', 'bulu tangkis', 'rumah sakit', 'darah tinggi', 'gula darah',
  'asam urat', 'berat badan', 'reksa dana', 'luar negeri'];
const TOPIC_LIST = Object.fromEntries(Object.entries(TOPIC_WORDS).map(([cat, list]) => {
  for (const p of TOPIC_PHRASES) list = list.replace(p, p.replace(' ', '_'));
  return [cat, list.split(' ').map((w) => w.replace('_', ' '))];
}));

const words = (s) => String(s || '').toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];

// Laci yang cocok dengan sebuah teks (ucapan pengguna atau topik).
export function guessCats(text) {
  const t = ` ${words(text).join(' ')} `;
  return Object.keys(TOPIC_LIST).filter((cat) => TOPIC_LIST[cat].some((w) => t.includes(` ${w} `)));
}

// Tebak perasaan dari teks fakta (dipakai saat memindahkan ingatan lama).
export function guessRasa(text) {
  const s = String(text || '').toLowerCase();
  if (/\b(tidak|gak|nggak|ngga|ga|enggak|kurang) (suka|doyan|bisa makan|tahan)|\bbenci\b|\balergi\b|\banti\b|\bmenghindari\b|\bpantang\b/.test(s)) return 'tidak';
  if (/\b(suka|doyan|favorit|senang|gemar|hobi|cinta|penggemar|fans?)\b/.test(s)) return 'suka';
  return '';
}

const cleanRasa = (r) => (r === 'suka' || r === 'tidak' ? r : r === 'tidak_suka' ? 'tidak' : '');

const newId = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD waktu lokal

const DEFAULTS = {
  nickname: null,
  profile: [],       // [{ id, cat, text, rasa, at }] — ingatan tentang pengguna, per laci
  profileVer: 2,     // versi susunan laci (2 = laci lengkap + tanda 👍/👎)
  needResort: false, // true = minta AI memilah ulang semua ingatan ke laci yang pas
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
    // Versi 1 → 2: laci baru & tanda 👍/👎. Dipilah cepat di sini dengan kata kunci,
    // lalu dirapikan AI saat Gaby tidur berikutnya (needResort).
    if ((data.profileVer || 1) < 2) {
      for (const m of st.profile) {
        const wasSuka = m.cat === 'suka';
        const rasa = cleanRasa(m.rasa) || guessRasa(m.text);
        if (wasSuka || m.cat === 'lain' || !CATEGORIES[m.cat]) {
          const g = guessCats(m.text).filter((c) => !['kontak', 'tanggal', 'rencana', 'kebiasaan'].includes(c));
          m.cat = g[0] || 'lain';
        }
        // Ingatan lama di laci "Kesukaan" otomatis bertanda 👍 kalau tidak jelas 👎.
        m.rasa = rasa || (wasSuka ? 'suka' : '');
      }
      st.profileVer = 2;
      st.needResort = st.profile.length > 0;
    }
    for (const m of st.profile) {
      m.rasa = cleanRasa(m.rasa);
      if (!CATEGORIES[m.cat]) m.cat = 'lain';
    }
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
  // rasa: 'suka' (👍), 'tidak' / 'tidak_suka' (👎), atau kosong.
  remember(text, cat = 'lain', replaces = '', rasa = '') {
    text = String(text).trim().slice(0, 300);
    if (!text) return false;
    if (!CATEGORIES[cat]) cat = 'lain';
    rasa = cleanRasa(rasa);
    const k = String(replaces || '').toLowerCase().trim();
    const old = k && state.profile.find((m) => m.text.toLowerCase().includes(k));
    if (old) {
      Object.assign(old, { text, cat, rasa, at: Date.now() });
    } else {
      const same = state.profile.find((m) => m.text.toLowerCase() === text.toLowerCase());
      if (same) {
        Object.assign(same, { cat, rasa: rasa || same.rasa, at: Date.now() });
      } else {
        state.profile.push({ id: newId(), cat, text, rasa, at: Date.now() });
        if (state.profile.length > 300) state.profile.shift();
      }
    }
    save();
    return true;
  },

  updateFact(id, text, cat, rasa) {
    const m = state.profile.find((x) => x.id === id);
    if (!m) return;
    if (text != null) m.text = String(text).trim().slice(0, 300) || m.text;
    if (cat && CATEGORIES[cat]) m.cat = cat;
    if (rasa !== undefined) m.rasa = cleanRasa(rasa);
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
      .map((m) => ({
        id: newId(),
        cat: CATEGORIES[m.cat] ? m.cat : 'lain',
        text: String(m.text).slice(0, 300),
        rasa: cleanRasa(m.rasa),
        at: Date.now(),
      }));
    state.lastTidy = Date.now();
    state.needResort = false;
    save();
  },

  // "Penjaga laci": cari ingatan untuk sebuah topik obrolan, tanpa AI.
  // Topik bisa nama laci ("makanan"), ucapan ("nanti malam makan apa"), atau nama ("Joni").
  // Hasil: { laci: { 'Label laci': ['👍 suka rendang', ...] }, cocok: [...] }.
  recall(topic) {
    const q = String(topic || '').toLowerCase().trim();
    const cats = new Set(guessCats(q));
    for (const [k, label] of Object.entries(CATEGORIES)) {
      const name = label.replace(/^\S+\s/, '').toLowerCase();
      if (q === k || q.includes(name) || name.split(/ & /).some((n) => q.split(/\s+/).includes(n))) cats.add(k);
    }
    const line = (m) => `${RASA[m.rasa] ? `${RASA[m.rasa]} ` : ''}${m.text}`;
    const laci = {};
    for (const cat of Object.keys(CATEGORIES)) {
      if (!cats.has(cat)) continue;
      const items = state.profile.filter((m) => m.cat === cat);
      if (items.length) laci[CATEGORIES[cat]] = items.slice(-30).map(line);
    }
    // Ingatan di laci lain yang menyebut kata dari topik (misal nama orang/tempat).
    const keys = words(q).filter((w) => w.length > 3);
    const cocok = state.profile
      .filter((m) => !cats.has(m.cat) && keys.some((w) => m.text.toLowerCase().includes(w)))
      .slice(-10)
      .map((m) => `${line(m)} (${CATEGORIES[m.cat]})`);
    return { laci, cocok };
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
