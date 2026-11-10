// Papan kerja tim: meteran di bawah status yang menunjukkan teman Gaby yang sedang bekerja
// (Rara mencari, Lukas menggambar, Vera mengecek, Pandu menyusun rencana), supaya pengguna
// tidak menunggu tanpa kabar. Ketuk papan untuk melihat langkah-langkahnya.

import { officeEmit } from './officebus.js';

const WHO = {
  rara: '🔎 Rara',
  lukas: '🎨 Lukas',
  vera: '✅ Vera',
  pandu: '🗺️ Pandu',
  meri: '📝 Meri',
};

const jobs = new Map();
let seq = 0;
let expanded = false;
let hiddenByUser = false; // pengguna menutup papan (✕ / "tutup papan kerja"); muncul lagi saat ada pekerjaan baru
let box = null;
const STUCK_MS = 6 * 60 * 1000; // pekerjaan yang DIAM (tanpa kabar) lebih dari 6 menit dihapus dari papan

function el() {
  if (!box) {
    box = document.getElementById('teamboard');
    if (box) {
      box.addEventListener('click', (e) => {
        if (e.target.closest('.tb-x')) { e.stopPropagation(); hideBoard(); return; }
        expanded = !expanded;
        render();
      });
    }
  }
  return box;
}

// Sembunyikan papan (teman-teman tetap bekerja di belakang layar).
export function hideBoard() {
  hiddenByUser = true;
  expanded = false;
  render();
}

// true = papan sedang terlihat di layar.
export function boardVisible() {
  return !!el() && !el().hidden;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function progressOf(job) {
  if (job.state !== 'run') return 1;
  if (job.steps.length) {
    const done = job.steps.filter((s) => s.state === 'done').length;
    return Math.min(0.95, Math.max(0.05, done / job.steps.length));
  }
  return job.frac; // null = tidak diketahui (bar berjalan bolak-balik)
}

function render() {
  const b = el();
  if (!b) return;
  const list = [...jobs.values()];
  b.hidden = list.length === 0 || hiddenByUser;
  if (b.hidden) {
    document.documentElement.style.setProperty('--board-h', '0px');
    return;
  }
  const shown = expanded ? list : list.slice(-2);
  const rows = shown.map((j) => {
    const p = progressOf(j);
    const bar = p == null
      ? '<span class="tb-bar run"><i></i></span>'
      : `<span class="tb-bar"><i style="width:${Math.round(p * 100)}%"></i></span>`;
    const count = j.steps.length && j.state === 'run'
      ? ` ${j.steps.filter((s) => s.state === 'done').length}/${j.steps.length}` : '';
    const steps = expanded && j.steps.length
      ? `<ol class="tb-steps">${j.steps.map((s) => `<li class="${s.state}">${s.state === 'done' ? '✅' : s.state === 'run' ? '⏳' : '⬜'} ${esc(s.text)}</li>`).join('')}</ol>`
      : '';
    return `<div class="tb-row ${j.state}${j.paused ? ' paused' : ''}"><b>${esc(WHO[j.who] || j.who)}</b>${bar}<span class="tb-text">${esc(j.text)}${count}</span></div>${steps}`;
  });
  const more = !expanded && list.length > 2 ? `<div class="tb-more">+${list.length - 2} lagi · ketuk untuk lihat</div>` : '';
  b.innerHTML = `<button class="tb-x" aria-label="Tutup papan kerja" title="Tutup papan (teman tetap bekerja)">✕</button>${rows.join('')}${more}`;
  b.classList.toggle('expanded', expanded);
  // Kartu di bawah papan ikut turun supaya tidak tertutup.
  document.documentElement.style.setProperty('--board-h', `${b.offsetHeight + 6}px`);
}

// Mulai satu pekerjaan. Mengembalikan pengendali untuk memperbarui papan.
export function startJob(who, text, { steps = [] } = {}) {
  const id = ++seq;
  const job = { id, who, text: String(text || ''), frac: null, state: 'run', steps: [], started: Date.now(), active: Date.now() };
  jobs.set(id, job);
  hiddenByUser = false; // pekerjaan baru: tampilkan lagi papannya
  const setSteps = (list) => { job.steps = (list || []).map((t) => ({ text: String(t), state: 'todo' })); };
  setSteps(steps);
  render();
  officeEmit('job', { id, kind: 'start', who, text: job.text }); // Ruang Kerja: teman mulai bekerja
  // Ruang Kerja v1.22: daftar langkah & langkah yang sedang dikerjakan (papan rute Pandu)
  const emitSteps = () => officeEmit('job', { id, kind: 'steps', list: job.steps.map((s) => s.text) });
  if (job.steps.length) emitSteps();
  const progress = () => officeEmit('job', { id, kind: 'progress', frac: progressOf(job) });
  // Ada kabar: pekerjaan masih hidup (pekerjaan panjang yang menunggu jatah AI tidak dianggap macet).
  const alive = () => { job.active = Date.now(); };
  // v1.25.2: pekerjaan yang sempat dianggap macet (misal HP ditinggal ke aplikasi lain sehingga semua jeda)
  // tetapi ternyata masih bekerja → muncul lagi di papan begitu ada kabar baru. true = boleh lanjut.
  const revive = () => {
    if (job.state === 'run') return true;
    if (!job.stuck) return false;
    job.stuck = false;
    job.state = 'run';
    job.active = Date.now();
    jobs.set(id, job);
    hiddenByUser = false;
    officeEmit('job', { id, kind: 'start', who: job.who, text: job.text });
    if (job.steps.length) emitSteps();
    return true;
  };
  // "☕ Menunggu jatah…" → gelembung kecil di Ruang Kerja (tanpa animasi baru).
  const noteWait = (msg) => { if (/^☕/.test(String(msg || ''))) officeEmit('job', { id, kind: 'wait', who: job.who, text: String(msg) }); };
  const finish = (state, msg, ms, extra = {}) => {
    if (!jobs.has(id) || job.state !== 'run') return;
    job.state = state === 'pause' ? 'fail' : state;
    if (state === 'pause') job.paused = true;
    if (msg) job.text = String(msg);
    for (const s of job.steps) if (s.state === 'run') s.state = state === 'done' ? 'done' : 'todo';
    render();
    officeEmit('job', { id, kind: 'end', ok: state === 'done', ...extra });
    setTimeout(() => { if (job.state !== 'run') { jobs.delete(id); render(); } }, ms);
  };
  return {
    id,
    // Ganti siapa yang sedang bekerja (misal dari Rara ke Vera) dan keterangannya.
    pass(nextWho, msg) {
      if (!revive()) return;
      alive();
      const changed = job.who !== nextWho;
      job.who = nextWho; if (msg != null) job.text = String(msg); job.frac = null; render();
      if (changed) officeEmit('job', { id, kind: 'pass', who: nextWho, text: job.text });
      noteWait(msg);
    },
    update(msg, frac = null) { if (!revive()) return; alive(); if (msg != null) job.text = String(msg); job.frac = frac; render(); progress(); noteWait(msg); },
    setSteps(list) { if (!revive()) return; alive(); setSteps(list); render(); emitSteps(); },
    // Tandai langkah ke-i sedang dikerjakan (langkah sebelumnya dianggap selesai).
    step(i, msg) {
      if (!revive()) return;
      alive();
      job.steps.forEach((s, k) => { if (k < i) s.state = 'done'; else if (k === i) s.state = 'run'; });
      if (msg != null) job.text = String(msg);
      render();
      progress();
      officeEmit('job', { id, kind: 'step', i, text: msg != null ? String(msg) : (job.steps[i] || {}).text });
    },
    addStep(text) { if (job.state !== 'run') return job.steps.length - 1; job.steps.push({ text: String(text), state: 'todo' }); render(); return job.steps.length - 1; },
    done(msg) { finish('done', msg, 2500); },
    fail(msg) { finish('fail', msg, 7000); },
    // Tertunda (v1.25): hasil kerja tersimpan, bisa dilanjutkan nanti.
    pause(msg) { finish('pause', msg, 9000, { paused: true }); },
    // Masih berjalan? (dipakai saat Gaby ditanya lagi: meterannya harus kelihatan)
    running() { return job.state === 'run'; },
    // Tampilkan lagi di papan (juga kalau papan ditutup pengguna atau sempat dianggap macet).
    show(msg) {
      if (job.state !== 'run' && job.stuck) { job.text = msg || 'Masih bekerja…'; revive(); }
      if (job.state !== 'run') return false;
      hiddenByUser = false;
      alive();
      render();
      return true;
    },
    // Ringkasan untuk Gaby: sudah berapa lama & sedang apa.
    info() { return { menit: Math.max(1, Math.round((Date.now() - job.started) / 60000)), sedang: job.text, langkah: job.steps.filter((x) => x.state === 'done').length, dari: job.steps.length }; },
  };
}

// true = masih ada teman yang bekerja (Gaby jangan ketiduran).
export function boardBusy() {
  return [...jobs.values()].some((j) => j.state === 'run');
}

// HP ditinggal ke aplikasi lain: semua jeda (iPhone/Android menghentikan halaman). Waktu di latar belakang
// tidak dihitung sebagai "diam", supaya pekerjaan yang masih jalan tidak dihapus dari papan saat kembali.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    for (const j of jobs.values()) if (j.state === 'run') j.active = now;
  });
}

// Pengaman: pekerjaan yang tidak pernah selesai (misal internet putus di tengah jalan)
// tidak dibiarkan menggantung di papan selamanya.
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  // Pengecek ini sendiri sempat terhenti (halaman dijeda di latar belakang): jangan anggap pekerjaan macet.
  if (now - lastTick > 60000) for (const j of jobs.values()) if (j.state === 'run') j.active = now;
  lastTick = now;
  let changed = false;
  for (const [id, j] of jobs) {
    if (j.state === 'run' && now - (j.active || j.started) > STUCK_MS) {
      j.state = 'fail';
      j.stuck = true; // kalau ternyata masih bekerja, muncul lagi saat ada kabar baru (revive)
      j.text = 'Terlalu lama, dihentikan';
      changed = true;
      officeEmit('job', { id, kind: 'end', ok: false });
      setTimeout(() => { if (j.state !== 'run') { jobs.delete(id); render(); } }, 7000);
    }
  }
  if (changed) render();
}, 15000);
