// Pengatur sapaan harian: briefing pagi, sapaan malam, dan hal penting hari ini.
// Satu tempat supaya Gaby tidak menyapa dua kali dengan isi yang sama.

import { memory } from './memory.js';
import { weather } from './tools.js';

const KEY = 'gaby.daily';
const today = () => new Date().toLocaleDateString('sv-SE');
const hhmm = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

function loadFlags() {
  try {
    const f = JSON.parse(localStorage.getItem(KEY) || '{}');
    return f.date === today() ? f : { date: today() };
  } catch {
    return { date: today() };
  }
}

function saveFlags(f) {
  try { localStorage.setItem(KEY, JSON.stringify(f)); } catch {}
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

// Cuaca hanya kalau izin lokasi sudah diberikan (tidak memunculkan permintaan izin saat menyapa).
async function weatherIfAllowed() {
  try {
    const perm = navigator.permissions && (await navigator.permissions.query({ name: 'geolocation' }));
    if (!perm || perm.state !== 'granted') return null;
    const w = await withTimeout(weather(''), 3500);
    return w && !w.error ? w : null;
  } catch {
    return null;
  }
}

function list(items) {
  return items.length ? items.map((t) => `"${t}"`).join(', ') : 'tidak ada';
}

// Mengembalikan { text, commit } — commit() dipanggil setelah sapaan benar-benar terkirim.
export async function dailyHint() {
  const st = memory.get();
  const carried = memory.dailyCleanup(); // yang sudah dicentang kemarin dihapus otomatis
  const flags = loadFlags();
  const h = new Date().getHours();
  const open = memory.openTodos();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const todaysReminders = st.reminders
    .filter((r) => !r.done && r.due > Date.now() && r.due <= end.getTime())
    .map((r) => `${r.text} jam ${hhmm(r.due)}`);
  const commitWith = (patch) => () => saveFlags({ ...flags, ...patch, first: true });
  const briefing = st.settings.briefing !== false;

  if (briefing && h >= 4 && h < 11 && !flags.morning) {
    const w = await weatherIfAllowed();
    const todayItems = open.filter((t) => t.date === today()).map((t) => t.text);
    return {
      text: ` Ini BRIEFING PAGI (pertama kali dibuka pagi ini). Sampaikan ringkas dan natural, maksimal 4 kalimat:`
        + ` cuaca: ${w ? `${w.tempat}: ${w.sekarang}; hari ini ${w.hari_ini}` : 'belum diketahui (boleh tawarkan cek cuaca)'}.`
        + ` Catatan belum selesai dari hari sebelumnya: ${list(carried.map((t) => t.text))}${carried.length ? ' — tanyakan masih mau dijalankan hari ini atau dihapus' : ''}.`
        + ` Catatan hari ini: ${list(todayItems)}. Pengingat hari ini: ${list(todaysReminders)}.`
        + ' Lewati bagian yang kosong.',
      commit: commitWith({ morning: true }),
    };
  }

  if (briefing && h >= 18 && !flags.evening && open.length) {
    return {
      text: ` Ini sapaan malam: masih ada ${open.length} catatan belum selesai: ${list(open.map((t) => t.text))}.`
        + ' Singgung dengan santai, tanya mau diselesaikan, dipindah ke besok, atau dihapus. Maksimal 2 kalimat.',
      commit: commitWith({ evening: true }),
    };
  }

  if (!flags.first) {
    return {
      text: ' Ini pembukaan pertama hari ini: setelah menyapa, boleh singgung SATU hal yang paling relevan secara natural,'
        + ' misalnya rencana dari catatan harian ("jadi ke Surabaya?"), tanggal penting dalam 7 hari ke depan dari profil,'
        + ` atau pengingat hari ini (${list(todaysReminders)}). Kalau tidak ada yang relevan, cukup menyapa. Maksimal dua kalimat.`,
      commit: commitWith({}),
    };
  }

  return { text: '', commit: () => {} };
}
