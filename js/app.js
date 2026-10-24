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
import { GEMINI_VOICES, listLiveModels } from './gemini.js';

const $ = (id) => document.getElementById(id);
const IDLE_MS = 20000;          // Gaby tidur lagi setelah 20 detik tanpa obrolan (mode "Hai Gaby")
const MOOD_EMOJI = { tenang: '💙', senang: '😄', gemas: '🥰', ngambek: '😤', mikir: '🤔', sedih: '🥺', kaget: '😲' };

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
let dropAudio = false;          // abaikan sisa suara Gaby setelah kamu memotongnya
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
  if (m !== 'tenang') moodTimer = setTimeout(() => setMood('tenang'), 30000);
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
    if (dropAudio) return;
    audio.play(buf, rate);
    lastAudioAt = Date.now();
    touch();
  },
  onInterrupted() {
    dropAudio = false;
    audio.interrupt();
    finishCaption('gaby');
  },
  onUserText(t) {
    caption('user', t);
    memory.addHistory('user', t);
    touch();
  },
  onGabyText(t) {
    if (dropAudio) return;
    caption('gaby', t);
    memory.addHistory('gaby', t);
    gabyTurnText = (gabyTurnText + t).slice(-120);
    const m = detectMood(gabyTurnText.slice(-60));
    if (m && m !== mood) setMood(m);
  },
  onTurnComplete() {
    dropAudio = false;
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

// Kamu memotong Gaby: hentikan suaranya saat itu juga, tanpa menunggu server.
audio.onBargeIn = () => {
  audio.interrupt();
  dropAudio = true;
  finishCaption('gaby');
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
    audio.onChunk = (pcm) => brain.sendAudio(pcm);
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
  brain.close();
  audio.onChunk = null;
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
    } else if (currentMode() !== 'always' && !thinking && Date.now() - lastActivity > IDLE_MS) {
      goSleep();
    }
  }
  if (phase !== 'locked') checkReminders();
  render();
}, 250);

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
  $('wake-support').textContent = WakeListener.supported && !wakeBroken
    ? '"Hai Gaby" bekerja selama aplikasi terbuka di layar.'
    : '"Hai Gaby" tidak didukung browser ini — pakai Chrome (Android/komputer) atau Safari (iPhone).';
  $('set-captions').checked = st.settings.captions;
  $('set-echo').checked = st.settings.antiEcho;
  $('set-voice').value = st.settings.voice;
  if (document.activeElement !== $('set-gemini')) $('set-gemini').value = st.keys.gemini;
  if (document.activeElement !== $('set-openai')) $('set-openai').value = st.keys.openai;
}

async function fillChain() {
  try {
    const order = brain.describeChain(await brain.chain());
    const active = brain.connected && brain.current ? (brain.current.model || 'OpenAI') : null;
    $('set-chain').textContent = active ? `${order}  ·  sedang aktif: ${active}` : order;
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

$('set-captions').addEventListener('change', (e) => { memory.setSetting('captions', e.target.checked); applySettings(); });
$('set-echo').addEventListener('change', (e) => { memory.setSetting('antiEcho', e.target.checked); applySettings(); });

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
