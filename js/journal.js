// Catatan harian & perapian profil. Dijalankan saat Gaby tidur, memakai model teks
// Gemini (gratis), jadi tidak memperlambat obrolan.

import { memory, CATEGORIES } from './memory.js';

const REST = 'https://generativelanguage.googleapis.com/v1beta';
const TIDY_EVERY = 7 * 24 * 3600000; // rapikan profil paling sering seminggu sekali

let textModel = null;

async function pickTextModel(key) {
  if (textModel) return textModel;
  const fallback = 'gemini-2.5-flash-lite';
  try {
    const res = await fetch(`${REST}/models?pageSize=1000&key=${encodeURIComponent(key)}`);
    const data = await res.json();
    const names = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((n) => /gemini.*flash/.test(n) && !/image|tts|audio|live|embedding|thinking/.test(n));
    // Utamakan versi "lite" (paling hemat), lalu yang stabil.
    const score = (n) => (/lite/.test(n) ? 0 : 1) + (/preview|exp/.test(n) ? 0.5 : 0);
    names.sort((a, b) => score(a) - score(b) || b.localeCompare(a));
    textModel = names[0] || fallback;
  } catch {
    textModel = fallback;
  }
  return textModel;
}

async function askJson(key, prompt) {
  const model = await pickTextModel(key);
  const res = await fetch(`${REST}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  return JSON.parse(text);
}

// Daftar laci untuk AI, misal "makanan (Makanan & minuman)".
const CAT_LIST = Object.entries(CATEGORIES).map(([k, v]) => `${k} (${v.replace(/^\S+\s/, '')})`).join(', ');
const RASA_RULE = '"rasa": "suka" kalau kesukaan/favorit, "tidak_suka" kalau tidak suka/alergi/pantangan/dihindari, selain itu ""';

function profileText() {
  return memory.get().profile
    .map((m) => `- [${m.cat}${m.rasa === 'suka' ? ', suka' : m.rasa === 'tidak' ? ', tidak_suka' : ''}] ${m.text}`)
    .join('\n') || '(kosong)';
}

// Ringkas obrolan satu sesi → catatan harian + fakta baru untuk profil.
export async function summarizeSession(lines) {
  const { keys, nickname } = memory.get();
  if (!keys.gemini || lines.length < 2) return null;
  const who = nickname || 'Pengguna';
  const transcript = lines.map((h) => `${h.who === 'user' ? who : 'Gaby'}: ${h.text}`).join('\n').slice(-8000);
  const out = await askJson(keys.gemini, `Kamu membantu asisten suara "Gaby" mengingat penggunanya (${who}).

PROFIL YANG SUDAH ADA:
${profileText()}

OBROLAN BARUSAN:
${transcript}

Tugas:
1. "ringkasan": 1–2 kalimat bahasa Indonesia tentang hal penting dari obrolan ini (topik, rencana, perasaan, permintaan). Tulis dari sudut pandang catatan, misal "${who} cari mochi enak, rencana ke Surabaya minggu depan." Kalau obrolan hanya basa-basi, isi "".
2. "fakta": fakta BARU atau yang BERUBAH tentang ${who} yang layak diingat lama (bukan hal sesaat). Tiap item: {"kategori": salah satu kode laci [${CAT_LIST}], "teks": fakta singkat, ${RASA_RULE}, "menggantikan": kata kunci fakta lama yang sudah tidak berlaku atau ""}. Jangan ulangi fakta yang sudah ada di profil. JANGAN masukkan tugas kecil/to-do atau pengingat (misal "beli roti", "call Joni jam 3") karena itu sudah dicatat terpisah. Boleh kosong.

Balas JSON: {"ringkasan": "...", "fakta": [...]}`);
  if (out.ringkasan) memory.addJournal(out.ringkasan);
  for (const f of out.fakta || []) {
    if (f && f.teks) memory.remember(f.teks, f.kategori, f.menggantikan, f.rasa);
  }
  return out;
}

// Rapikan profil: gabungkan yang dobel, perbaiki kategori, buang yang usang.
export async function tidyProfile(force = false) {
  const st = memory.get();
  // Setelah laci baru dipasang (needResort), semua ingatan dipilah ulang sekali.
  if (st.needResort) force = true;
  if (!st.keys.gemini || st.profile.length < (st.needResort ? 1 : 6)) return null;
  if (!force && Date.now() - (st.lastTidy || 0) < TIDY_EVERY) return null;
  const out = await askJson(st.keys.gemini, `Rapikan daftar ingatan tentang pengguna berikut.

${profileText()}

Aturan: gabungkan fakta yang sama/dobel, kalau ada yang bertentangan pakai yang terbaru (yang lebih bawah), pindahkan tiap fakta ke laci yang paling pas (kode laci: ${CAT_LIST}; pakai "lain" hanya kalau benar-benar tidak ada yang cocok), beri ${RASA_RULE}, tulis singkat dan jelas dalam bahasa Indonesia. JANGAN menambah fakta baru dan jangan membuang fakta penting.

Balas JSON: {"profil": [{"kategori": "...", "teks": "...", "rasa": "..."}]}`);
  const items = (out.profil || []).filter((m) => m && m.teks);
  // Pengaman: kalau hasilnya terlalu sedikit (kemungkinan salah), jangan dipakai.
  if (items.length < Math.ceil(st.profile.length * 0.5)) return null;
  memory.replaceProfile(items.map((m) => ({ cat: m.kategori, text: m.teks, rasa: m.rasa })));
  return items.length;
}
