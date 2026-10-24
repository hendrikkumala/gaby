// Pengendali utama Gaby: menyatukan tampilan, suara, otak AI, dan ingatan.

import { VERSION, PIN_HASH, PIN_LENGTH } from './config.js';
import { memory } from './memory.js';
import { openingCue, LANGS } from './persona.js';
import { detectMood } from './mood.js';
import { AudioEngine } from './audio.js';
import { Visual, MOOD_COLORS } from './visual.js';
import { Brain } from './brain.js';
import { WakeListener } from './wake.js';
import { runTool } from './tools.js';
import { GEMINI_VOICES, listLiveModels, isSlowModel } from './gemini.js';
import { LocalVad } from './vad.js';
import { Camera } from './camera.js';
import { gallery } from './gallery.js';
import { generateImage } from './imagegen.js';
import { googleCalendarUrl, icsUrl, isApple } from './calendar.js';

const $ = (id) => document.getElementById(id);
const IDLE_MS = 40000;          // Gaby tidur lagi setelah 40 detik tanpa obrolan (mode "Hai Gaby")
const MOOD_EMOJI = { tenang: '💙', senang: '😄', gemas: '🥰', ngambek: '😤', marah: '😡', mikir: '🤔', sedih: '🥺', kaget: '😲' };

const audio = new AudioEngine();
const visual = new Visual($('stage'), audio);

let phase = 'locked';           // locked | sleep | connecting | active
let micMuted = false;
let thinking = 0;
let lastActivity = 0;
let lastAudioAt = 0;
let sleepRequestedAt = 0;
let pendingCue = null;
let wakeBroken = false;
let mood = 'tenang';
let moodTimer = null;
let reconnects = [];
let wakeLock = null;
let duckTimer = null;
let userSpokeAt = 0;            // kapan kamu terakhir bicara (untuk mengukur waktu respons)
let awaitingReply = false;
const latencies = [];
const vad = new LocalVad();
let preroll = [];               // 300 ms suara terakhir sebelum kamu terdeteksi bicara
const diag = { end: 0, text: 0, audio: 0, state: '' };

// Catat waktu respons per model, supaya bisa dibandingkan di Pengaturan.
function recordLatency(ms) {
  latencies.push(ms);
  if (latencies.length > 10) latencies.shift();
  const model = brain.current && (brain.current.model || 'openai');
  if (!model) return;
  try {
    const all = JSON.parse(localStorage.getItem('gaby.lat') || '{}');
    all[model] = [...(all[model] || []), ms].slice(-10);
    localStorage.setItem('gaby.lat', JSON.stringify(all));
  } catch {}
}

function modelLatency(model) {
  try {
    const list = JSON.parse(localStorage.getItem('gaby.lat') || '{}')[model] || [];
    return list.length ? list.reduce((a, b) => a + b, 0) / list.length / 1000 : null;
  } catch {
    return null;
  }
}

// Suara mic masuk tiap 50 ms. Mode manual: perangkat menentukan kapan kamu bicara.
function handleMic(pcm, level) {
  if (!brain.manual) {
    brain.sendAudio(pcm);
    return;
  }
  const ev = vad.update(level, audio.isSpeaking(), audio.echoBase);
  if (ev === 'start') {
    if (audio.isSpeaking()) audio.duck(true);
    brain.activityStart();
    for (const p of preroll) brain.sendAudio(p);
    preroll = [];
    diag.state = 'bicara';
    touch();
  }
  if (vad.active || ev === 'end') brain.sendAudio(pcm);
  else {
    preroll.push(pcm);
    if (preroll.length > 6) preroll.shift();
  }
  if (ev === 'end') {
    brain.activityEnd();
    audio.duck(false);
    userSpokeAt = diag.end = Date.now();
    diag.text = diag.audio = 0;
    diag.state = 'menunggu jawaban';
    awaitingReply = true;
    touch();
  }
}
let gabyTurnText = '';

// ---------- Tampilan kecil ----------

function toast(msg, kind = 'info', ms = 5000) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

function linkToast(url, label) {
  const el = toast('🔗 ' + url.replace(/^https?:\/\//, '').slice(0, 40), 'info', 30000);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = label + ' ↗';
  a.onclick = () => el.remove();
  el.appendChild(a);
}

// Pengingat dengan tombol "Tambahkan ke Kalender".
function calendarToast(r, when) {
  const el = toast(`⏰ ${r.text} — ${when}`, 'info', 90000);
  el.classList.add('stack');
  const row = document.createElement('div');
  row.className = 'toast-actions';
  const apple = isApple();
  const links = [
    { label: apple ? '📅 Tambahkan ke Kalender' : '📅 Kalender iPhone / .ics', href: icsUrl(r.id, r.text, r.due), ics: true },
    { label: apple ? 'Google Calendar' : '📅 Tambahkan ke Google Calendar', href: googleCalendarUrl(r.text, r.due) },
  ];
  if (!apple) links.reverse();
  links.forEach((l, i) => {
    const a = document.createElement('a');
    a.href = l.href;
    a.textContent = l.label;
    a.className = i === 0 ? 'act primary' : 'act';
    if (l.ics && !apple) a.download = 'pengingat-gaby.ics';
    else if (!l.ics) { a.target = '_blank'; a.rel = 'noopener'; }
    a.onclick = () => setTimeout(() => el.remove(), 300);
    row.appendChild(a);
  });
  const close = document.createElement('button');
  close.className = 'act ghost';
  close.textContent = 'Nanti saja';
  close.onclick = () => el.remove();
  row.appendChild(close);
  el.appendChild(row);
}

const caps = { user: null, gaby: null };

function caption(who, text) {
  const box = $('captions');
  const other = who === 'user' ? 'gaby' : 'user';
  if (caps[other]) finishCaption(other);
  if (!caps[who]) {
    caps[who] = document.createElement('div');
    caps[who].className = `cap ${who}`;
    box.appendChild(caps[who]);
    while (box.children.length > 2) box.firstChild.remove();
  }
  const el = caps[who];
  el.textContent = (el.textContent + text).replace(/\s+/g, ' ').trimStart().slice(-220);
}

function finishCaption(who) {
  const el = caps[who];
  caps[who] = null;
  if (!el) return;
  setTimeout(() => el.classList.add('fade'), 5000);
  setTimeout(() => el.remove(), 6500);
}

function setMood(m) {
  if (!MOOD_COLORS[m]) return;
  mood = m;
  visual.setMood(m);
  document.documentElement.style.setProperty('--mood', `rgb(${MOOD_COLORS[m].join(',')})`);
  clearTimeout(moodTimer);
  if (m !== 'tenang') moodTimer = setTimeout(() => setMood('tenang'), 20000);
}

let lastChip = '';
function render() {
  let s, text;
  if (phase === 'locked') { s = 'sleep'; text = 'Halo!'; }
  else if (phase === 'connecting') { s = 'connecting'; text = 'Menyambung…'; }
  else if (phase === 'active') {
    if (thinking) { s = 'thinking'; text = 'Sebentar ya…'; }
    else if (audio.isSpeaking()) { s = 'speaking'; text = 'Gaby bicara'; }
    else { s = 'listening'; text = micMuted ? 'Mikrofon mati' : 'Mendengarkan…'; }
  } else {
    s = 'sleep';
    const m = currentMode();
    text = micMuted ? 'Mikrofon mati' : m === 'wake' ? 'Bilang "Hai Gaby"' : 'Ketuk bola untuk bicara';
  }
  visual.setState(s);
  const chip = `${MOOD_EMOJI[mood]} ${text}`;
  if (chip !== lastChip) {
    $('chip-text').textContent = chip;
    lastChip = chip;
  }
  $('btn-mic').classList.toggle('off', micMuted);
}

// ---------- Alat untuk tools.js ----------

const ui = {
  toast,
  linkToast,
  calendarToast,
  camera: (aksi, kamera) => cameraTool(aksi, kamera),
  makeImage: (prompt, useCam) => makeImage(prompt, useCam),
  setMood,
  refreshSettings: () => fillSettings(),
  setLang(lang) {
    memory.setSetting('lang', lang);
    fillSettings();
  },
  requestNotify() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  },
  sleepAfterSpeech() {
    sleepRequestedAt = Date.now();
  },
};

// ---------- Otak AI ----------

const brain = new Brain({
  onAudio(buf, rate) {
    if (awaitingReply) {
      awaitingReply = false;
      diag.audio = Date.now();
      diag.state = 'Gaby menjawab';
      recordLatency(Date.now() - userSpokeAt);
    }
    audio.play(buf, rate);
    lastAudioAt = Date.now();
    touch();
  },
  onInterrupted() {
    clearTimeout(duckTimer);
    audio.interrupt();
    audio.duck(false);
    finishCaption('gaby');
  },
  onUserText(t) {
    if (!diag.text && diag.end) diag.text = Date.now();
    if (!brain.manual && !audio.isSpeaking()) {
      userSpokeAt = Date.now();
      awaitingReply = true;
    }
    caption('user', t);
    memory.addHistory('user', t);
    touch();
  },
  onGabyText(t) {
    caption('gaby', t);
    memory.addHistory('gaby', t);
    gabyTurnText = (gabyTurnText + t).slice(-120);
    const m = detectMood(gabyTurnText.slice(-60));
    if (m && m !== mood) setMood(m);
  },
  onTurnComplete() {
    gabyTurnText = '';
    finishCaption('gaby');
    touch();
  },
  async onToolCall(name, args) {
    thinking++;
    try {
      return await runTool(name, args, ui);
    } finally {
      thinking--;
      touch();
    }
  },
  onLost(info) {
    if (phase !== 'active') return;
    reconnects = reconnects.filter((t) => Date.now() - t < 60000);
    if (reconnects.length >= 3) {
      toast('Sambungan terus terputus. Gaby tidur dulu, coba lagi sebentar lagi ya.', 'err');
      goSleep();
      return;
    }
    reconnects.push(Date.now());
    brain.close();
    phase = 'sleep';
    activate('resume');
  },
  notice: (msg, kind) => toast(msg, kind),
});

function touch() {
  lastActivity = Date.now();
}

function currentMode() {
  const m = memory.get().settings.mode || (WakeListener.supported ? 'wake' : 'tap');
  if (m === 'wake' && (!WakeListener.supported || wakeBroken)) return 'tap';
  return m;
}

// Mungkin kamu memotong Gaby: kecilkan suaranya dulu. Kalau Gemini memastikan kamu bicara,
// suara dihentikan (onInterrupted); kalau ternyata cuma gema, volume kembali normal.
audio.onBargeIn = () => {
  if (brain.manual) return; // mode manual: ditangani handleMic
  audio.duck(true);
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => audio.duck(false), 1300);
  touch();
};

const wake = new WakeListener({
  getLang: () => (memory.get().settings.lang === 'en' ? 'en-US' : 'id-ID'),
  onWake: (rest) => activate('wake', rest),
  onUnavailable: () => {
    wakeBroken = true;
    toast('"Hai Gaby" tidak bisa dipakai di browser ini. Ketuk bola cahaya untuk bicara.', 'warn', 8000);
    render();
  },
});

async function activate(reason, spoken = '') {
  if (phase === 'locked') return;
  if (phase === 'connecting') return;
  if (phase === 'active') {
    if (spoken) brain.sendText(spoken);
    return;
  }
  wake.stop();
  phase = 'connecting';
  render();
  if (reason !== 'resume') audio.chime('wake');

  try {
    await brain.connect();
  } catch (e) {
    connectFailed(e);
    return;
  }
  if (phase !== 'connecting') { brain.close(); return; }

  try {
    vad.reset();
    preroll = [];
    audio.onChunk = handleMic;
    await audio.startMic(brain.inputRate);
  } catch {
    toast('Mikrofon tidak bisa dipakai. Izinkan akses mikrofon di pengaturan browser.', 'err', 9000);
    brain.close();
    phase = 'sleep';
    goSleep();
    return;
  }

  phase = 'active';
  sleepRequestedAt = 0;
  touch();
  render();
  fillChain();

  let cue = pendingCue;
  pendingCue = null;
  if (!cue && reason !== 'resume') cue = openingCue(reason, spoken);
  if (cue) brain.sendText(cue);
}

function connectFailed(e) {
  const msg = {
    nokey: 'Belum ada API key. Isi dulu di Pengaturan ⚙️',
    auth: 'API key ditolak. Cek lagi key-nya di Pengaturan ⚙️',
    quota: 'Kuota semua otak Gaby sedang habis. Coba lagi nanti ya.',
    network: 'Tidak bisa tersambung. Cek koneksi internet kamu.',
  }[e.kind] || `Gagal tersambung: ${e.message}`;
  toast(msg, 'err', 8000);
  phase = 'sleep';
  goSleep(true);
  if (e.kind === 'nokey' || e.kind === 'auth') openSettings();
}

function goSleep(silent = false) {
  const wasActive = phase === 'active';
  closeCamera();
  brain.close();
  audio.onChunk = null;
  vad.reset();
  audio.releaseMic();
  finishCaption('user');
  finishCaption('gaby');
  sleepRequestedAt = 0;
  phase = 'sleep';
  if (wasActive && !silent) audio.chime('sleep');
  if (currentMode() === 'wake' && !micMuted && document.visibilityState === 'visible') wake.start();
  else wake.stop();
  render();
}

function restartSession() {
  if (phase !== 'active') return;
  brain.close();
  phase = 'sleep';
  activate('resume');
}

// ---------- Pengingat ----------

function checkReminders() {
  const now = Date.now();
  for (const r of memory.get().reminders) {
    if (r.done || r.due > now) continue;
    memory.completeReminder(r.id);
    if (now - r.due > 12 * 3600000) continue; // terlalu lama terlewat
    fireReminder(r);
  }
}

function fireReminder(r) {
  audio.chime('alarm');
  toast(`⏰ ${r.text}`, 'warn', 20000);
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    try { new Notification('Gaby mengingatkan', { body: r.text, icon: 'icons/icon-192.png' }); } catch {}
  }
  const nick = memory.get().nickname || 'pengguna';
  const late = Date.now() - r.due > 120000 ? ' (pengingat ini sedikit terlambat karena aplikasi tadi tertutup)' : '';
  const cue = `[SISTEM] Waktunya pengingat: "${r.text}"${late}. Sampaikan ke ${nick} sekarang dengan gayamu.`;
  if (phase === 'active') brain.sendText(cue);
  else if (phase === 'sleep') {
    pendingCue = cue;
    activate('reminder').then(() => {
      if (phase !== 'active' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(`${nick}, waktunya: ${r.text}`);
        u.lang = 'id-ID';
        speechSynthesis.speak(u);
      }
    });
  }
}

// ---------- Putaran utama ----------

setInterval(() => {
  if (phase === 'active') {
    if (audio.isSpeaking()) touch();
    const quietFor = Date.now() - lastAudioAt;
    if (sleepRequestedAt && Date.now() - sleepRequestedAt > 2500 && !audio.isSpeaking() && quietFor > 1500) {
      goSleep();
    } else if (currentMode() !== 'always' && !thinking && !painting
      && Date.now() - lastActivity > (camera.active ? IDLE_MS * 2.5 : IDLE_MS)) {
      goSleep();
    }
  }
  if (phase !== 'locked') checkReminders();
  render();
  renderDiag();
}, 250);

function renderDiag() {
  const on = memory.get().settings.diag;
  $('diag').hidden = !on;
  if (!on) return;
  const sec = (a, b) => (a && b && b >= a ? `${((b - a) / 1000).toFixed(1)} dtk` : '–');
  const cur = brain.current;
  const model = phase === 'active' && cur ? (cur.model || 'OpenAI') : '(Gaby tidur)';
  const lvl = cur ? brain.levels[cur.id] : null;
  const bars = Math.min(10, Math.round(audio.micLevel * 200));
  const avg = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length / 1000).toFixed(1) + ' dtk' : '–';
  $('diag').textContent = [
    `Model : ${model}${lvl != null && phase === 'active' ? ` (tingkat ${lvl})` : ''}`,
    `Deteksi: ${brain.manual ? 'Gaby (perangkat)' : 'Gemini (server)'}`,
    `Mic   : [${'#'.repeat(bars)}${'-'.repeat(10 - bars)}] ${vad.active ? 'kamu bicara' : ''}`,
    `Status: ${phase === 'active' ? diag.state || 'mendengarkan' : phase}`,
    `Diam → teks muncul : ${sec(diag.end, diag.text)}`,
    `Diam → Gaby bicara : ${sec(diag.end, diag.audio)}`,
    `Rata-rata respons  : ${avg}`,
  ].join('\n');
}

// ---------- Interaksi ----------

$('stage').addEventListener('click', (e) => {
  if (phase === 'locked' || !visual.hitTest(e.clientX, e.clientY)) return;
  if (phase === 'sleep') {
    if (micMuted) toggleMic();
    activate('tap');
  } else {
    goSleep();
  }
});

function toggleMic() {
  micMuted = !micMuted;
  audio.muted = micMuted;
  if (micMuted && vad.active) {
    vad.reset();
    brain.activityEnd();
  }
  if (phase === 'sleep') {
    if (micMuted) wake.stop();
    else if (currentMode() === 'wake') wake.start();
  }
  render();
}
$('btn-mic').addEventListener('click', toggleMic);

async function keepAwake() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch {}
}

document.addEventListener('visibilitychange', async () => {
  if (phase === 'locked') return;
  if (document.visibilityState === 'hidden') {
    wake.stop();
    return;
  }
  keepAwake();
  if (audio.ctx && audio.ctx.state !== 'running') {
    try { await audio.ctx.resume(); } catch {}
  }
  if (audio.ctx && audio.ctx.state !== 'running') {
    // iPhone butuh ketukan lagi untuk menyalakan suara.
    if (phase === 'active') goSleep(true);
    phase = 'locked';
    $('tap-lead').textContent = 'Ketuk untuk melanjutkan';
    showGate('tap');
    return;
  }
  if (phase === 'sleep' && currentMode() === 'wake' && !micMuted) wake.start();
});

// ---------- Layar awal: PIN, API key, ketuk mulai ----------

function showGate(step) {
  $('gate').hidden = false;
  for (const s of ['pin', 'key', 'tap']) $(`step-${s}`).hidden = s !== step;
  if (step === 'key') setTimeout(() => $('key-input').focus(), 50);
}

function nextGateStep() {
  const st = memory.get();
  if (PIN_HASH && !st.pinOk) return showGate('pin');
  if (!st.keys.gemini && !st.keys.openai) return showGate('key');
  showGate('tap');
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

let pin = '';
function buildPinPad() {
  const dots = $('pin-dots');
  dots.innerHTML = '<span></span>'.repeat(PIN_LENGTH);
  const pad = $('pin-pad');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  for (const k of keys) {
    const b = document.createElement('button');
    b.textContent = k;
    if (k === '' || k === '⌫') b.className = 'ghost';
    if (k === '') b.disabled = true;
    b.onclick = () => pressPin(k);
    pad.appendChild(b);
  }
  addEventListener('keydown', (e) => {
    if ($('step-pin').hidden) return;
    if (/^\d$/.test(e.key)) pressPin(e.key);
    if (e.key === 'Backspace') pressPin('⌫');
  });
}

async function pressPin(k) {
  if (k === '⌫') pin = pin.slice(0, -1);
  else if (pin.length < PIN_LENGTH) pin += k;
  [...$('pin-dots').children].forEach((d, i) => d.classList.toggle('on', i < pin.length));
  $('pin-error').textContent = '';
  if (pin.length === PIN_LENGTH) {
    const ok = (await sha256('gaby:' + pin)) === PIN_HASH;
    if (ok) {
      memory.setPinOk();
      nextGateStep();
    } else {
      $('pin-error').textContent = 'PIN salah';
      $('pin-dots').classList.add('shake');
      setTimeout(() => $('pin-dots').classList.remove('shake'), 400);
    }
    pin = '';
    setTimeout(() => [...$('pin-dots').children].forEach((d) => d.classList.remove('on')), 300);
  }
}

async function checkGeminiKey(key) {
  try {
    await listLiveModels(key);
    return null;
  } catch (e) {
    if (e.kind === 'auth') return 'Key ditolak Google. Pastikan kamu menyalin key yang lengkap.';
    return null; // masalah jaringan: simpan saja, dicek lagi saat menyambung
  }
}

$('key-save').addEventListener('click', async () => {
  const key = $('key-input').value.trim();
  $('key-error').textContent = '';
  // Format key Google bisa berubah (AIza…, AQ.…), jadi cukup cek panjang; Google yang menilai valid atau tidak.
  if (key.length < 20 || /\s/.test(key)) {
    $('key-error').textContent = 'Key-nya sepertinya belum lengkap. Coba salin lagi.';
    return;
  }
  $('key-save').disabled = true;
  $('key-save').textContent = 'Memeriksa…';
  const err = await checkGeminiKey(key);
  $('key-save').disabled = false;
  $('key-save').textContent = 'Simpan & lanjut';
  if (err) { $('key-error').textContent = err; return; }
  memory.setKeys({ gemini: key });
  brain.models = null;
  nextGateStep();
});
$('key-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('key-save').click(); });

$('tap-start').addEventListener('click', async () => {
  try {
    await audio.unlock();
  } catch {
    toast('Browser ini tidak mendukung suara. Coba Chrome atau Safari terbaru.', 'err', 9000);
    return;
  }
  $('gate').hidden = true;
  phase = 'sleep';
  keepAwake();
  render();
  activate('open');
});

// ---------- Pengaturan ----------

function openSettings() {
  fillSettings();
  fillChain();
  $('settings').hidden = false;
}

function fillSettings() {
  const st = memory.get();
  $('set-nick').textContent = st.nickname || 'belum ada';
  $('set-mem-count').textContent = st.memories.length;
  const list = $('set-mem-list');
  list.innerHTML = '';
  for (const m of st.memories) {
    const li = document.createElement('li');
    li.textContent = m.text;
    list.appendChild(li);
  }
  const mode = currentMode();
  document.querySelectorAll('input[name="mode"]').forEach((r) => { r.checked = r.value === mode; });
  document.querySelectorAll('input[name="lang"]').forEach((r) => { r.checked = r.value === (st.settings.lang || 'id'); });
  document.querySelectorAll('input[name="vad"]').forEach((r) => { r.checked = r.value === (st.settings.vadMode || 'local'); });
  $('set-diag').checked = !!st.settings.diag;
  const wakeOk = WakeListener.supported && !wakeBroken;
  document.querySelector('input[name="mode"][value="wake"]').disabled = !wakeOk;
  $('wake-support').textContent = wakeOk
    ? '"Hai Gaby" bekerja selama aplikasi terbuka di layar.'
    : /Android/i.test(navigator.userAgent)
      ? '"Hai Gaby" dimatikan di Android karena Android terus berbunyi "tetung" saat Gaby mendengarkan. Pakai "Ketuk bola" atau "Selalu dengar".'
      : '"Hai Gaby" tidak didukung browser ini — pakai Chrome (komputer) atau Safari (iPhone).';
  $('set-captions').checked = st.settings.captions;
  $('set-echo').checked = st.settings.antiEcho;
  $('set-voice').value = st.settings.voice;
  if (document.activeElement !== $('set-gemini')) $('set-gemini').value = st.keys.gemini;
  if (document.activeElement !== $('set-openai')) $('set-openai').value = st.keys.openai;
}

async function fillModels() {
  const sel = $('set-model');
  let models = [];
  try { models = await brain.discover(); } catch {}
  const pick = memory.get().settings.model || 'auto';
  sel.innerHTML = '';
  for (const m of ['auto', ...models]) {
    const o = document.createElement('option');
    o.value = m;
    if (m === 'auto') o.textContent = 'Otomatis (tercepat)';
    else {
      const lat = modelLatency(m);
      o.textContent = `${isSlowModel(m) ? '🐢 ' : ''}${m}${lat ? ` · ${lat.toFixed(1)} dtk` : ''}`;
    }
    sel.appendChild(o);
  }
  sel.value = models.includes(pick) ? pick : 'auto';
}

async function fillChain() {
  fillModels();
  try {
    const order = brain.describeChain(await brain.chain());
    const active = brain.connected && brain.current ? (brain.current.model || 'OpenAI') : null;
    $('set-chain').textContent = active ? `${order}  ·  sedang aktif: ${active}` : order;
    $('set-latency').textContent = latencies.length
      ? `${(latencies.reduce((a, b) => a + b, 0) / latencies.length / 1000).toFixed(1)} detik (terakhir ${(latencies[latencies.length - 1] / 1000).toFixed(1)} dtk)`
      : 'belum ada data';
  } catch {
    $('set-chain').textContent = '–';
  }
}

function applySettings() {
  const st = memory.get().settings;
  $('captions').classList.toggle('hidden', !st.captions);
  audio.antiEcho = st.antiEcho;
}

$('btn-settings').addEventListener('click', openSettings);
document.querySelectorAll('#settings-tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#settings-tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $(b.dataset.go).scrollIntoView({ behavior: 'smooth', block: 'start' });
}));
$('settings-close').addEventListener('click', () => { $('settings').hidden = true; });
$('settings').addEventListener('click', (e) => { if (e.target === $('settings')) $('settings').hidden = true; });

for (const v of GEMINI_VOICES) {
  const o = document.createElement('option');
  o.value = v;
  o.textContent = v;
  $('set-voice').appendChild(o);
}
$('set-voice').addEventListener('change', (e) => {
  memory.setSetting('voice', e.target.value);
  toast(`Suara diganti ke ${e.target.value}`);
  restartSession();
});

document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', () => {
  memory.setSetting('mode', r.value);
  if (r.value === 'wake') wakeBroken = false;
  if (phase === 'sleep') goSleep(true);
  render();
}));

document.querySelectorAll('input[name="lang"]').forEach((r) => r.addEventListener('change', () => {
  memory.setSetting('lang', r.value);
  toast(`Bahasa Gaby: ${LANGS[r.value]}`);
  restartSession();
}));

for (const m of Object.keys(MOOD_COLORS)) {
  const b = document.createElement('button');
  b.className = 'btn emo';
  b.textContent = MOOD_EMOJI[m];
  b.title = m;
  b.onclick = () => {
    $('settings').hidden = true;
    setMood(m);
  };
  $('set-emotes').appendChild(b);
}

$('set-model').addEventListener('change', (e) => {
  memory.setSetting('model', e.target.value);
  toast(e.target.value === 'auto' ? 'Model: otomatis' : `Model: ${e.target.value}`);
  restartSession();
  setTimeout(fillChain, 2500);
});
document.querySelectorAll('input[name="vad"]').forEach((r) => r.addEventListener('change', () => {
  memory.setSetting('vadMode', r.value);
  restartSession();
}));
$('set-diag').addEventListener('change', (e) => { memory.setSetting('diag', e.target.checked); renderDiag(); });

$('set-captions').addEventListener('change', (e) => { memory.setSetting('captions', e.target.checked); applySettings(); });
$('set-echo').addEventListener('change', (e) => { memory.setSetting('antiEcho', e.target.checked); applySettings(); });

function deleteKey(which, label) {
  if (!memory.get().keys[which]) { toast(`Belum ada key ${label}.`); return; }
  if (!confirm(`Hapus API key ${label} dari perangkat ini?`)) return;
  memory.setKeys({ [which]: '' });
  $(`set-${which}`).value = '';
  brain.models = null;
  if (phase === 'active' || phase === 'connecting') goSleep(true);
  toast(`Key ${label} sudah dihapus.`);
  fillChain();
  const { keys } = memory.get();
  if (!keys.gemini && !keys.openai) {
    $('settings').hidden = true;
    phase = 'locked';
    showGate('key');
  }
}
$('set-del-gemini').addEventListener('click', () => deleteKey('gemini', 'Gemini'));
$('set-del-openai').addEventListener('click', () => deleteKey('openai', 'OpenAI'));

$('set-save-keys').addEventListener('click', async () => {
  const gemini = $('set-gemini').value.trim();
  const openai = $('set-openai').value.trim();
  if (gemini && gemini !== memory.get().keys.gemini) {
    const err = await checkGeminiKey(gemini);
    if (err) { toast(err, 'err'); return; }
  }
  memory.setKeys({ gemini, openai });
  for (const id of Object.keys(memory.get().exhausted)) memory.clearExhausted(id);
  brain.models = null;
  toast('Key tersimpan ✓');
  fillChain();
});

$('set-rename').addEventListener('click', () => {
  memory.setNickname('');
  fillSettings();
  $('settings').hidden = true;
  const cue = '[SISTEM] Pengguna ingin mengganti nama panggilannya. Tanyakan dengan gaya lucu dia mau dipanggil apa sekarang, lalu simpan dengan simpan_nama.';
  if (phase === 'active') brain.sendText(cue);
  else if (phase === 'sleep') { pendingCue = cue; activate('rename'); }
});

$('set-forget').addEventListener('click', () => {
  if (!confirm('Hapus nama panggilan dan semua ingatan Gaby di perangkat ini?')) return;
  memory.forgetAll();
  fillSettings();
  toast('Ingatan Gaby di perangkat ini sudah dihapus.');
  restartSession();
});

// ---------- Kamera: Gaby bisa melihat ----------

const camera = new Camera($('cam-video'));
let painting = 0;
$('cam-screen').hidden = !Camera.canShareScreen;

// Kirim sekitar 1 gambar per detik selama kamera menyala dan Gaby bangun.
setInterval(() => {
  if (!camera.active || phase !== 'active' || !brain.connected) return;
  const f = camera.frame();
  if (f) brain.sendImage(f);
}, 1000);

camera.onEnded = () => closeCamera();

async function openCamera(kind = 'kamera', facing, announce = false) {
  if (phase === 'sleep') await activate('tap');
  if (phase !== 'active') return { error: 'Gaby belum tersambung' };
  if (!brain.canSee) {
    toast('Kamera hanya bisa dipakai saat otak Gaby memakai Gemini.', 'warn');
    return { error: 'Otak cadangan saat ini tidak bisa melihat kamera' };
  }
  try {
    if (kind === 'layar') await camera.startScreen();
    else await camera.start(facing);
  } catch (e) {
    const denied = /NotAllowed|Permission|denied/i.test(`${e.name} ${e.message}`);
    // Browser kadang hanya mengizinkan kamera/layar setelah ketukan pengguna.
    const el = toast(denied ? 'Izin kamera/layar ditolak atau perlu ketukan.' : 'Kamera tidak bisa dibuka.', 'warn', 15000);
    const b = document.createElement('a');
    b.href = '#';
    b.textContent = kind === 'layar' ? 'Bagikan layar' : 'Nyalakan kamera';
    b.onclick = (ev) => { ev.preventDefault(); el.remove(); openCamera(kind, facing, true); };
    el.appendChild(b);
    return { error: 'Kamera belum menyala. Minta pengguna mengetuk tombol di layar.' };
  }
  $('cam-box').hidden = false;
  $('btn-cam').classList.add('on');
  visual.scanning = true;
  touch();
  const f = camera.frame();
  if (f) brain.sendImage(f);
  if (announce) {
    setTimeout(() => {
      if (camera.active && phase === 'active') {
        brain.sendText(`[SISTEM] Pengguna baru saja ${camera.source === 'layar' ? 'membagikan layarnya' : 'menyalakan kamera'}. Komentari singkat apa yang kamu lihat.`);
      }
    }, 1200);
  }
  return { ok: true, sumber: camera.source, catatan: 'Sekarang kamu bisa melihat gambar dari kamera/layar pengguna.' };
}

function closeCamera() {
  if (!camera.active && $('cam-box').hidden) return;
  camera.stop();
  $('cam-box').hidden = true;
  $('btn-cam').classList.remove('on');
  visual.scanning = false;
}

async function cameraTool(aksi, kamera) {
  if (aksi === 'matikan') { closeCamera(); return { ok: true }; }
  if (aksi === 'ganti') {
    if (!camera.active) return openCamera('kamera');
    await camera.flip().catch(() => {});
    return { ok: true, kamera: camera.facing === 'user' ? 'depan' : 'belakang' };
  }
  if (aksi === 'layar') {
    if (!Camera.canShareScreen) return { error: 'Bagikan layar hanya bisa di komputer' };
    return openCamera('layar');
  }
  return openCamera('kamera', kamera === 'depan' ? 'user' : kamera === 'belakang' ? 'environment' : undefined);
}

$('btn-cam').addEventListener('click', () => (camera.active ? closeCamera() : openCamera('kamera', undefined, true)));
$('cam-close').addEventListener('click', closeCamera);
$('cam-flip').addEventListener('click', () => camera.flip().catch(() => toast('Tidak bisa ganti kamera', 'warn')));
$('cam-screen').addEventListener('click', () => openCamera('layar', undefined, true));

// ---------- Gambar buatan Gaby ----------

async function makeImage(prompt, useCam) {
  const key = memory.get().keys.gemini;
  if (!key) return { error: 'Butuh API key Gemini untuk membuat gambar' };
  const photo = useCam ? camera.frame(1024, 0.85) : null;
  if (useCam && !photo) return { error: 'Kamera belum menyala. Minta pengguna menyalakan kamera dulu.' };
  painting++;
  visual.painting = true;
  const note = toast('🎨 Gaby sedang menggambar…', 'info', 60000);
  try {
    const out = await generateImage(key, prompt, photo);
    const item = await gallery.add(out.blob, prompt);
    showViewer(item);
    brain.sendImage(out.base64, out.blob.type); // supaya Gaby bisa melihat hasilnya
    return { ok: true, catatan: 'Gambar sudah tampil di layar pengguna. Komentari hasilnya singkat dan ceria.' };
  } catch (e) {
    toast(`🎨 ${e.pesan || e.message}`, e.kind === 'billing' ? 'warn' : 'err', 12000);
    return { error: e.pesan || e.message, jenis: e.kind || 'lain' };
  } finally {
    note.remove();
    painting--;
    visual.painting = painting > 0;
    touch();
  }
}

let viewerUrl = null;
let viewerItem = null;

async function showViewer(item) {
  const list = await gallery.list();
  if (!list.length) { toast('Belum ada gambar. Coba bilang "Gaby, gambarin kucing astronot".'); return; }
  viewerItem = list.find((x) => x.id === item?.id) || list[0];
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(viewerItem.blob);
  $('viewer-img').src = viewerUrl;
  $('viewer-cap').textContent = viewerItem.prompt || '';
  const ext = (viewerItem.blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  $('viewer-save').href = viewerUrl;
  $('viewer-save').download = `gaby-${viewerItem.id}.${ext}`;
  const strip = $('viewer-strip');
  strip.querySelectorAll('img').forEach((im) => URL.revokeObjectURL(im.src));
  strip.innerHTML = '';
  for (const it of list) {
    const im = document.createElement('img');
    im.src = URL.createObjectURL(it.blob);
    im.className = it.id === viewerItem.id ? 'on' : '';
    im.onclick = () => showViewer(it);
    strip.appendChild(im);
  }
  $('viewer').hidden = false;
}

$('btn-gallery').addEventListener('click', () => showViewer());
$('viewer-close').addEventListener('click', () => { $('viewer').hidden = true; });
$('viewer').addEventListener('click', (e) => { if (e.target === $('viewer')) $('viewer').hidden = true; });
$('viewer-del').addEventListener('click', async () => {
  if (!viewerItem || !confirm('Hapus gambar ini dari galeri?')) return;
  await gallery.remove(viewerItem.id);
  const left = await gallery.list();
  if (left.length) showViewer(left[0]);
  else $('viewer').hidden = true;
});
$('viewer-share').addEventListener('click', async () => {
  if (!viewerItem) return;
  const file = new File([viewerItem.blob], $('viewer-save').download, { type: viewerItem.blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'Gambar dari Gaby' }).catch(() => {});
  } else {
    toast('Bagikan tidak didukung di browser ini. Pakai tombol Simpan.', 'warn');
  }
});

// ---------- Mulai ----------

$('set-version').textContent = VERSION;
buildPinPad();
applySettings();
setMood('tenang');
render();
nextGateStep();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Akses untuk debugging di konsol browser.
window.gaby = { audio, visual, brain, memory, setMood };
