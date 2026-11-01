// Papan kerja tim: meteran di bawah status yang menunjukkan teman Gaby yang sedang bekerja
// (Rara mencari, Lukas menggambar, Vera mengecek, Pandu menyusun rencana), supaya pengguna
// tidak menunggu tanpa kabar. Ketuk papan untuk melihat langkah-langkahnya.

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
let box = null;

function el() {
  if (!box) {
    box = document.getElementById('teamboard');
    if (box) box.addEventListener('click', () => { expanded = !expanded; render(); });
  }
  return box;
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
  b.hidden = list.length === 0;
  if (!list.length) {
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
    return `<div class="tb-row ${j.state}"><b>${esc(WHO[j.who] || j.who)}</b>${bar}<span class="tb-text">${esc(j.text)}${count}</span></div>${steps}`;
  });
  const more = !expanded && list.length > 2 ? `<div class="tb-more">+${list.length - 2} lagi · ketuk untuk lihat</div>` : '';
  b.innerHTML = rows.join('') + more;
  b.classList.toggle('expanded', expanded);
  // Kartu di bawah papan ikut turun supaya tidak tertutup.
  document.documentElement.style.setProperty('--board-h', `${b.offsetHeight + 6}px`);
}

// Mulai satu pekerjaan. Mengembalikan pengendali untuk memperbarui papan.
export function startJob(who, text, { steps = [] } = {}) {
  const id = ++seq;
  const job = { id, who, text: String(text || ''), frac: null, state: 'run', steps: [] };
  jobs.set(id, job);
  const setSteps = (list) => { job.steps = (list || []).map((t) => ({ text: String(t), state: 'todo' })); };
  setSteps(steps);
  render();
  const finish = (state, msg, ms) => {
    if (!jobs.has(id) || job.state !== 'run') return;
    job.state = state;
    if (msg) job.text = String(msg);
    for (const s of job.steps) if (s.state === 'run') s.state = state === 'done' ? 'done' : 'todo';
    render();
    setTimeout(() => { jobs.delete(id); render(); }, ms);
  };
  return {
    id,
    // Ganti siapa yang sedang bekerja (misal dari Rara ke Vera) dan keterangannya.
    pass(nextWho, msg) { if (job.state !== 'run') return; job.who = nextWho; if (msg != null) job.text = String(msg); job.frac = null; render(); },
    update(msg, frac = null) { if (job.state !== 'run') return; if (msg != null) job.text = String(msg); job.frac = frac; render(); },
    setSteps(list) { if (job.state !== 'run') return; setSteps(list); render(); },
    // Tandai langkah ke-i sedang dikerjakan (langkah sebelumnya dianggap selesai).
    step(i, msg) {
      if (job.state !== 'run') return;
      job.steps.forEach((s, k) => { if (k < i) s.state = 'done'; else if (k === i) s.state = 'run'; });
      if (msg != null) job.text = String(msg);
      render();
    },
    addStep(text) { if (job.state !== 'run') return job.steps.length - 1; job.steps.push({ text: String(text), state: 'todo' }); render(); return job.steps.length - 1; },
    done(msg) { finish('done', msg, 2500); },
    fail(msg) { finish('fail', msg, 7000); },
  };
}

// true = masih ada teman yang bekerja (Gaby jangan ketiduran).
export function boardBusy() {
  return [...jobs.values()].some((j) => j.state === 'run');
}
