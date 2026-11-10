// Pengendali utama Gaby: menyatukan tampilan, suara, otak AI, dan ingatan.

import { VERSION, PIN_HASH, PIN_LENGTH } from './config.js';
import { memory, CATEGORIES, RASA } from './memory.js';
import { showMapCard, hideMapCard } from './map.js';
import { getPosition, describePosition, shortPlace, geocode, route, googleDirections, googleSearchNear } from './location.js';
import { summarizeSession, tidyProfile } from './journal.js';
import { researchStatus, researchReasons, resetResearch, quickSearchMode } from './research.js';
import { groqLabel } from './groq.js';
import { startJob, boardBusy, hideBoard, boardVisible } from './teamboard.js';
import { officeEmit } from './officebus.js';
import { WHATS_NEW, newsSince, cmpVersion } from './whatsnew.js';
import { dailyHint } from './daily.js';
import { APPS, buildAppLink } from './apps.js';
import {
  isNativeApp, nativeOpen, nativeNotifyNow, nativeShareFile, nativeShareText, nativeShareAvailable, syncNativeReminders, nativeReminderScheduled, installedApk, checkApkUpdate, APK_URL,
  nativeAlarmAvailable, setNativeAlarm, reminderHealth, openPhoneSetting,
} from './native.js';
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
import { generateImage, generateFree, writeImagePrompt } from './imagegen.js';
import { checkImage, checkPlan } from './vera.js';
import { runPandu, panduStatus, panduPending } from './pandu.js';
import { orStatus, resetOpenRouter } from './openrouter.js';
import { planSections, planHeader, planText, compareSections, compareText, JENIS } from './planexport.js';
import { planPdf, comparePdf } from './planpdf.js';
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

const isInstalledApp = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// Buka tautan lewat perintah suara. Browser biasanya memblokir pembukaan tab tanpa ketukan,
// jadi: coba buka tab baru → kalau Gaby dipasang sebagai aplikasi, buka langsung →
// kalau tetap tidak bisa, tampilkan satu tombol besar untuk diketuk.
function openExternal(url, label) {
  // Di dalam APK: Android langsung membuka aplikasinya, tanpa tombol.
  if (isNativeApp) {
    nativeOpen(url).then((ok) => { if (!ok) bigButton(url, label); });
    return { ok: true, cara: 'langsung (aplikasi Android)' };
  }
  let win = null;
  try { win = window.open(url, '_blank'); } catch {}
  if (win) {
    try { win.opener = null; } catch {}
    return { ok: true, cara: 'tab baru' };
  }
  if (isInstalledApp()) {
    setTimeout(() => { location.href = url; }, 600); // beri waktu Gaby menjawab singkat
    return { ok: true, cara: 'langsung', catatan: 'Gaby akan berhenti mendengar sementara; saat kembali, ketuk sekali untuk menyalakan suaranya.' };
  }
  bigButton(url, label);
  return { ok: false, catatan: 'Browser memblokir pembukaan otomatis. Tombol besar sudah tampil; minta pengguna mengetuknya sekali.' };
}

// sameTab: dibuka di tab yang sama — perlu untuk tautan aplikasi (intent Android /
// universal link iPhone) supaya HP membukanya di aplikasi, bukan di browser.
function bigButton(url, label, { sameTab = false } = {}) {
  document.querySelectorAll('.toast.big').forEach((t) => t.remove());
  hideSources(); // satu hal saja di layar: tombol baru menggantikan kartu sumber
  const el = toast('', 'info big', 30000);
  el.textContent = '';
  const a = document.createElement('a');
  a.href = url;
  if (!sameTab) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  a.className = 'big-btn';
  a.textContent = label;
  a.onclick = () => el.remove();
  const x = document.createElement('button');
  x.className = 'icon-btn';
  x.textContent = '✕';
  x.onclick = () => el.remove();
  el.append(a, x);
}

// Pengingat dengan tombol "Tambahkan ke Kalender".
function calendarToast(r, when) {
  if (isNativeApp) {
    // Di APK pengingat jadi notifikasi Android asli, tidak perlu kalender.
    toast(`⏰ ${r.text} — ${when} · notifikasi HP dipasang`, 'info', 8000);
    syncNative();
    return;
  }
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

// ---------- Alarm di aplikasi Jam ----------
// Android (APK): langsung dipasang di aplikasi Jam. iPhone: tombol yang menjalankan
// Pintasan "Gaby Alarm" (dibuat sekali oleh pengguna). Perangkat lain: jadi pengingat biasa.

const ALARM_SHORTCUT = 'Gaby Alarm';
const DAY_NAMES = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const pad2 = (n) => String(n).padStart(2, '0');

function nextOccurrence(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

function describeDays(days) {
  if (!days.length) return '';
  if (days.length === 7) return 'setiap hari';
  const work = ['senin', 'selasa', 'rabu', 'kamis', 'jumat'];
  if (days.length === 5 && work.every((d) => days.includes(d))) return 'setiap hari kerja';
  return 'setiap ' + days.join(', ');
}

async function setAlarm({ hour, minute, label, days }) {
  const time = `${pad2(hour)}:${pad2(minute)}`;
  const when = new Date(nextOccurrence(hour, minute)).toLocaleDateString('id-ID', { weekday: 'long' });
  const repeat = describeDays(days);
  const info = { jam: time, berlaku: repeat || `sekali, ${when}` };

  if (isNativeApp) {
    const res = await setNativeAlarm({ hour, minute, message: label, days: days.map((d) => DAY_NAMES.indexOf(d) + 1) });
    if (res.ok) {
      toast(`⏰ Alarm ${time}${repeat ? ` (${repeat})` : ''} dipasang di aplikasi Jam`, 'info', 8000);
      return { ok: true, ...info, cara: 'aplikasi Jam HP', catatan: 'Alarm sudah terpasang di aplikasi Jam HP; berdering walau Gaby ditutup. Konfirmasi singkat.' };
    }
    const fb = alarmAsReminder(hour, minute, label);
    return {
      ok: true, ...info, cara: 'pengingat notifikasi',
      catatan: res.reason === 'old_apk'
        ? 'Aplikasi Gaby di HP ini masih versi lama, jadi alarmnya dipasang sebagai pengingat notifikasi dulu. Minta pengguna memperbarui aplikasi (Pengaturan → Fitur → Cek update) supaya alarm bisa masuk aplikasi Jam.'
        : 'Aplikasi Jam tidak bisa dibuka, jadi dipasang sebagai pengingat notifikasi.',
      ...fb,
    };
  }

  if (isApple()) {
    alarmToast(time, repeat);
    return {
      ok: true, ...info, cara: 'tombol Pintasan iPhone',
      catatan: `Minta pengguna mengetuk tombol "Pasang alarm" di layar; Pintasan "${ALARM_SHORTCUT}" memasangnya di aplikasi Jam.`
        + ' Kalau belum pernah membuat Pintasan itu, ada tombol "Cara membuatnya" (sekali saja, kira-kira 2 menit).'
        + (repeat ? ` Alarm berulang (${repeat}) perlu diatur sendiri di aplikasi Jam: buka alarmnya → Ulangi.` : ''),
    };
  }

  const fb = alarmAsReminder(hour, minute, label);
  return {
    ok: true, ...info, cara: 'pengingat',
    catatan: 'Perangkat ini tidak bisa memasang alarm di aplikasi Jam, jadi dipasang sebagai pengingat (berbunyi kalau Gaby terbuka) plus tombol Kalender. Untuk alarm sungguhan, pakai aplikasi Gaby di Android atau iPhone.',
    ...fb,
  };
}

// Cadangan: jadikan pengingat biasa di jam yang sama.
function alarmAsReminder(hour, minute, label) {
  const due = nextOccurrence(hour, minute);
  const r = memory.addReminder(label, due, null);
  ui.requestNotify();
  calendarToast(r, new Date(due).toLocaleString('id-ID', { weekday: 'long', hour: '2-digit', minute: '2-digit' }));
  return { id_pengingat: r.id };
}

function alarmToast(time, repeat) {
  document.querySelectorAll('.toast.alarm').forEach((t) => t.remove());
  const el = toast(`⏰ Alarm ${time}${repeat ? ` (${repeat})` : ''}`, 'info alarm stack', 90000);
  const row = document.createElement('div');
  row.className = 'toast-actions';
  const go = document.createElement('a');
  go.className = 'act primary';
  go.href = `shortcuts://run-shortcut?name=${encodeURIComponent(ALARM_SHORTCUT)}&input=text&text=${encodeURIComponent(time)}`;
  go.textContent = `⏰ Pasang alarm ${time}`;
  go.onclick = () => setTimeout(() => el.remove(), 300);
  const help = document.createElement('button');
  help.className = 'act';
  help.textContent = 'Cara membuatnya';
  help.onclick = () => { el.remove(); $('set-remind-ios').open = true; openSettings('set-remind-ios'); };
  const close = document.createElement('button');
  close.className = 'act ghost';
  close.textContent = 'Nanti saja';
  close.onclick = () => el.remove();
  row.append(go, help, close);
  el.appendChild(row);
}

// Ada yang membuat pengingat tidak bisa berbunyi di HP ini? (untuk dikabarkan Gaby)
async function reminderWarning() {
  const h = await reminderHealth();
  if (!h) return '';
  const issues = [];
  if (!h.notifications) issues.push('notifikasi Gaby dimatikan');
  if (!h.exactAlarm) issues.push('izin alarm tepat waktu belum diberikan');
  if (!h.batteryUnrestricted) issues.push('Gaby masih dibatasi penghemat baterai');
  return issues.length
    ? ` Tapi ${issues.join(' dan ')}, jadi pengingat bisa tidak berbunyi saat HP terkunci. Minta pengguna membuka Pengaturan → Fitur → bagian Pengingat untuk membereskannya (cukup sekali).`
    : '';
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
let lastOfficeS = '';
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
  if (s !== lastOfficeS) {
    lastOfficeS = s;
    officeEmit('gaby', s); // Ruang Kerja: mic ON (standby) / OFF (waktu bebas)
    const on = phase === 'active' || phase === 'connecting';
    $('of-mic').classList.toggle('on', on);
    $('of-mic').textContent = on ? '🔇 Selesai bicara' : '🎤 Bicara';
  }
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
  makeImage: (prompt, useCam, opts) => makeImage(prompt, useCam, opts),
  imageAction: (aksi, change) => imageAction(aksi, change),
  gallery: async (aksi) => {
    if (aksi === 'tutup') { $('viewer').hidden = true; return { ok: true }; }
    const count = (await gallery.list()).length;
    if (!count) return { ok: false, catatan: 'Galeri masih kosong.' };
    await showViewer();
    return { ok: true, jumlah_gambar: count };
  },
  showPlaces: (query, pos, area) => showPlaces(query, pos, area),
  showRoute: (tujuan, mode, dari) => showRoute(tujuan, mode, dari),
  mapAction: (aksi) => mapAction(aksi),
  todoAction: (aksi, items) => todoAction(aksi, items),
  setAlarm: (opts) => setAlarm(opts),
  reminderWarning: () => reminderWarning(),
  playMusic: (q) => playMusic(q),
  openApp: (args) => openApp(args),
  refreshTodos: () => { if (!$('todocard').hidden) renderTodos(); fillSettings(); },
  openExternal: (url, label) => openExternal(url, label),
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
  isNativeApp,
  showSources: (q, sources, queries, badge) => showSources(q, sources, queries, badge),
  startJob: (who, text, opts) => startJob(who, text, opts),
  closeCards: (jenis) => closeCards(jenis),
  startPlan: (a) => startPlan(a),
  resumePlan: () => resumePlan(),
  openPlan: (a) => openPlan(a),
  listPlans: () => listPlansTool(),
  comparePlans: (a) => comparePlans(a),
  deletePlans: (a) => deletePlans(a),
  undoDelete: () => undoDelete(),
  planToTodos: (no) => planToTodos(no),
  savePlan: (a) => savePlanTool(a),
  switchToQuickSearch: (q) => switchToQuickSearch(q),
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
    officeEmit('say', { who: 'gaby', end: true });
  },
  onUserText(t) {
    if (!diag.text && diag.end) diag.text = Date.now();
    if (!brain.manual && !audio.isSpeaking()) {
      userSpokeAt = Date.now();
      awaitingReply = true;
    }
    caption('user', t);
    officeEmit('say', { who: 'user', text: t });
    memory.addHistory('user', t);
    touch();
  },
  onGabyText(t) {
    caption('gaby', t);
    officeEmit('say', { who: 'gaby', text: t });
    memory.addHistory('gaby', t);
    gabyTurnText = (gabyTurnText + t).slice(-120);
    const m = detectMood(gabyTurnText.slice(-60));
    if (m && m !== mood) setMood(m);
  },
  onTurnComplete() {
    gabyTurnText = '';
    officeEmit('say', { who: 'gaby', end: true });
    if (diag.state === 'Gaby menjawab') diag.state = 'mendengarkan';
    finishCaption('gaby');
    touch();
  },
  async onToolCall(name, args) {
    thinking++;
    officeEmit('tool', { name, args });
    try {
      const result = await runTool(name, args, ui);
      officeEmit('toolDone', { name, args, result });
      return result;
    } finally {
      thinking--;
      touch();
      syncNative();
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
  if (reason !== 'resume') {
    audio.chime('wake');
    sessionStart = Date.now();
  }

  // Briefing pagi / sapaan malam disiapkan bersamaan dengan menyambung (tidak menambah jeda).
  const wantsDaily = !pendingCue && !spoken && !['resume', 'return', 'reminder'].includes(reason) && memory.get().nickname;
  const dailyP = wantsDaily ? dailyHint().catch(() => null) : Promise.resolve(null);

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
  markSession(true);
  sleepRequestedAt = 0;
  touch();
  render();
  fillChain();

  let cue = pendingCue;
  pendingCue = null;
  let daily = null;
  if (!cue && reason !== 'resume') {
    daily = await Promise.race([dailyP, new Promise((r) => setTimeout(() => r(null), 4000))]);
    cue = openingCue(reason, spoken, daily ? daily.text : '');
  }
  const missedCue = takeMissedCue();
  if (missedCue) cue = cue ? `${cue}\n${missedCue}` : missedCue;
  const planCue = takePlanNews(); // kabar dari Pandu saat Gaby tidur
  if (planCue) cue = cue ? `${cue}\n${planCue}` : planCue;
  // Update baru: diceritakan sekali, hanya saat dibuka biasa (bukan karena pengingat/ucapan langsung).
  const news = !spoken && ['tap', 'wake', 'open'].includes(reason) ? newsCue() : '';
  if (news) cue = cue ? `${cue}\n${news}` : news;
  if (cue) {
    brain.sendText(cue);
    if (daily) daily.commit();
    if (news) memory.setSeenVersion(VERSION);
  }
  // Cek update APK setelah sapaan selesai, supaya tidak memotong Gaby.
  if (isNativeApp && reason !== 'resume') setTimeout(() => maybeCheckApkUpdate(), 8000);
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

// keepSession: Gaby tidur karena pindah ke aplikasi lain, nanti dilanjutkan saat kembali.
function goSleep(silent = false, { keepSession = false } = {}) {
  const wasActive = phase === 'active';
  if (!keepSession) markSession(false);
  if (wasActive) writeJournal();
  closeCamera();
  brain.close();
  audio.onChunk = null;
  vad.reset();
  // iPhone menanyakan izin mikrofon lagi setiap kali mikrofon diminta ulang. Jadi saat
  // pindah aplikasi sebentar, mikrofon tidak dilepas, hanya berhenti dikirim.
  if (keepSession && isApple()) audio.pauseMic();
  else audio.releaseMic();
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

// Pengingat yang tiba saat Gaby di latar belakang / HP terkunci. Bunyinya dari notifikasi HP
// (APK); Gaby menyampaikannya begitu dibuka lagi, bukan bicara sendiri di belakang.
const missed = [];

function fireReminder(r) {
  if (document.visibilityState !== 'visible' && (isNativeApp || isPhone())) {
    missed.push(r);
    return;
  }
  // Di APK, notifikasi HP sudah berbunyi dengan nada HP sendiri; Gaby tidak menambah nada.
  const phoneRings = nativeReminderScheduled(r.id);
  if (!phoneRings) audio.chime('alarm');
  toast(`⏰ ${r.text}`, 'warn', 20000);
  if (!isNativeApp && 'Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    try { new Notification('Gaby mengingatkan', { body: r.text, icon: 'icons/icon-192.png' }); } catch {}
  }
  const nick = memory.get().nickname || 'pengguna';
  const late = Date.now() - r.due > 120000 ? ' (pengingat ini sedikit terlambat karena aplikasi tadi tertutup)' : '';
  const linked = r.todoId && memory.get().todos.find((t) => t.id === r.todoId && !t.done);
  const cue = `[SISTEM] Waktunya pengingat: "${r.text}"${late}. Sampaikan ke ${nick} sekarang dengan gayamu.`
    + (linked ? ' Ini juga ada di daftar catatan; kalau sudah dikerjakan, dia bisa bilang "sudah" dan kamu tandai selesai.' : '');
  // Nada dulu sampai selesai, baru Gaby bicara, supaya bunyinya tidak tertutup suara Gaby.
  setTimeout(() => speakReminder(r, cue, nick), phoneRings ? 2500 : 1700);
}

function speakReminder(r, cue, nick) {
  if (phase === 'active') brain.sendText(cue);
  else if (phase === 'sleep') {
    pendingCue = pendingCue ? `${pendingCue}\n${cue}` : cue;
    activate('reminder').then(() => {
      if (phase !== 'active' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(`${nick}, waktunya: ${r.text}`);
        u.lang = 'id-ID';
        speechSynthesis.speak(u);
      }
    });
  } else {
    missed.push(r); // layar "ketuk untuk lanjut": disampaikan setelah diketuk
  }
}

function takeMissedCue() {
  if (!missed.length) return '';
  const list = missed.splice(0);
  for (const r of list) toast(`⏰ ${r.text}`, 'warn', 20000);
  const nick = memory.get().nickname || 'pengguna';
  const items = list.map((r) => `"${r.text}" (jam ${new Date(r.due).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})`).join(', ');
  return `[SISTEM] Selama Gaby di latar belakang, pengingat ini sudah tiba waktunya${isNativeApp ? ' (notifikasi HP sudah berbunyi)' : ''}: ${items}. Sampaikan singkat ke ${nick} dengan gayamu, lalu tanya apakah sudah dikerjakan.`;
}

// ---------- Update APK ----------
// Di APK, Gaby mengecek sekali sehari apakah ada APK lebih baru di GitHub Releases.
// Isi Gaby sudah terbarui otomatis; ini hanya untuk cangkang Android yang jarang berubah.

const UPDATE_KEY = 'gaby.apkUpdateCheck';

async function maybeCheckApkUpdate({ force = false } = {}) {
  if (!isNativeApp) return null;
  const today = new Date().toLocaleDateString('sv-SE');
  try {
    if (!force && localStorage.getItem(UPDATE_KEY) === today) return null;
    localStorage.setItem(UPDATE_KEY, today);
  } catch {}
  let upd = null;
  try { upd = await checkApkUpdate(); } catch {}
  if (upd) showUpdateCard(upd);
  else if (force) toast('Aplikasi Gaby sudah versi terbaru ✓');
  return upd;
}

function showUpdateCard(upd) {
  document.querySelectorAll('.toast.update').forEach((t) => t.remove());
  const el = toast(`📦 Update aplikasi Gaby tersedia: ${upd.installed.version} → ${upd.latest.version}`, 'info update stack', 120000);
  const row = document.createElement('div');
  row.className = 'toast-actions';
  const go = document.createElement('button');
  go.className = 'act primary';
  go.textContent = '⬇️ Perbarui sekarang';
  go.onclick = () => { el.remove(); nativeOpen(APK_URL); };
  const later = document.createElement('button');
  later.className = 'act ghost';
  later.textContent = 'Nanti';
  later.onclick = () => el.remove();
  row.append(go, later);
  el.appendChild(row);
  if (phase === 'active') {
    brain.sendText(`[SISTEM] Ada update aplikasi Gaby (${upd.installed.version} → ${upd.latest.version}). Beri tahu ${memory.get().nickname || 'pengguna'} singkat dalam satu kalimat bahwa tombol Perbarui sudah tampil di layar.`);
  }
}

$('set-check-update').addEventListener('click', () => maybeCheckApkUpdate({ force: true }));

// Pengaturan → Fitur → Pengingat: apakah HP ini siap membunyikan pengingat saat terkunci?
async function fillReminderHealth() {
  $('set-remind-android').hidden = !isNativeApp;
  $('set-remind-ios').hidden = isNativeApp || !isApple();
  if (!isNativeApp) return;
  const h = await reminderHealth();
  const status = $('set-remind-status');
  document.querySelectorAll('[data-phone]').forEach((b) => { b.hidden = !nativeAlarmAvailable(); });
  if (!h) {
    status.textContent = 'Perbarui aplikasi Gaby (tombol Cek update di atas) untuk alarm di aplikasi Jam dan cek otomatis ini.';
    return;
  }
  const mark = (ok, yes, no) => `${ok ? '✅' : '⚠️'} ${ok ? yes : no}`;
  status.textContent = [
    mark(h.notifications, 'Notifikasi aktif', 'Notifikasi Gaby mati'),
    mark(h.exactAlarm, 'Tepat waktu', 'Belum tepat waktu'),
    mark(h.batteryUnrestricted, 'Boleh jalan di latar belakang', 'Dibatasi penghemat baterai'),
  ].join(' · ');
  $('set-phone-exact').hidden = h.exactAlarm;
}

document.querySelectorAll('[data-phone]').forEach((b) => b.addEventListener('click', async () => {
  await openPhoneSetting(b.dataset.phone);
  // Saat kembali dari pengaturan HP, perbarui statusnya.
  const again = () => { if (document.visibilityState === 'visible') { fillReminderHealth(); document.removeEventListener('visibilitychange', again); } };
  document.addEventListener('visibilitychange', again);
}));

// ---------- Notifikasi Android (APK) ----------

// Samakan notifikasi terjadwal di HP dengan daftar pengingat (baru → dijadwalkan,
// selesai/dihapus → dibatalkan). Di browser biasa tidak melakukan apa-apa.
function syncNative() {
  if (isNativeApp) syncNativeReminders(memory.get().reminders, memory.get().nickname).catch(() => {});
}
if (isNativeApp) setInterval(syncNative, 5000);

// ---------- Putaran utama ----------

// Penjaga mikrofon: iPhone bisa memutus mikrofon diam-diam (misalnya aplikasi/web lain
// memutar audio) tanpa memberi sinyal apa pun. Kalau suara berhenti mengalir, coba
// nyalakan lagi; kalau HP menolak tanpa ketukan, minta pengguna mengetuk sekali.
let recovering = false;
async function watchMic() {
  if (recovering || phase !== 'active' || micMuted || !audio.stream || audio.micHealthy()) return;
  recovering = true;
  try {
    try { await audio.ctx.resume(); } catch {}
    try { await audio.startMic(brain.inputRate); } catch {}
    await new Promise((r) => setTimeout(r, 900));
    if (phase === 'active' && !audio.micHealthy()) {
      console.warn('[Gaby] mikrofon terputus, minta ketukan');
      goSleep(true, { keepSession: true });
      returnPending = true;
      showResume();
    }
  } finally {
    recovering = false;
  }
}

setInterval(() => {
  if (phase === 'active') {
    watchMic();
    if (audio.isSpeaking()) touch();
    const quietFor = Date.now() - lastAudioAt;
    if (sleepRequestedAt && Date.now() - sleepRequestedAt > 2500 && !audio.isSpeaking() && quietFor > 1500) {
      goSleep();
    } else if (currentMode() !== 'always' && !thinking && !painting && !boardBusy()
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

// ---------- Ruang Kerja (🏢): kantor 2.5D tim Gaby, dimuat hanya saat dibuka ----------
let officeMod = null;
function officePtt() {
  if (phase === 'locked') { toast('Ketuk "Mulai" dulu ya.', 'warn'); return; }
  if (phase === 'sleep') {
    if (micMuted) toggleMic();
    activate('tap');
  } else if (phase === 'active') {
    goSleep();
  }
}
// Pendeteksi "tumbang": kalau halaman dimuat ulang saat Ruang Kerja masih terbuka (HP kehabisan memori,
// misalnya iPhone), berikutnya Ruang Kerja otomatis memakai mode hemat.
const OFFICE_OPEN_KEY = 'gaby.officeOpen';
try {
  if (sessionStorage.getItem(OFFICE_OPEN_KEY)) {
    sessionStorage.removeItem(OFFICE_OPEN_KEY);
    if (localStorage.getItem('gaby.officeLite') !== '1') {
      localStorage.setItem('gaby.officeLite', '1');
      setTimeout(() => toast('Ruang Kerja tadi berhenti mendadak. Sekarang memakai mode hemat supaya lebih ringan.', 'warn', 8000), 1500);
    }
  }
} catch {}
window.addEventListener('pagehide', () => { try { sessionStorage.removeItem(OFFICE_OPEN_KEY); } catch {} });
async function openOfficeScreen() {
  try { sessionStorage.setItem(OFFICE_OPEN_KEY, String(Date.now())); } catch {}
  $('office').hidden = false; // tampil dulu supaya ukuran layar terbaca saat kantor dibangun
  document.body.classList.add('office-open');
  visual.paused = true; // bola hologram tertutup: jeda dulu
  try {
    if (!officeMod) {
      $('of-status').textContent = 'Memuat kantor…';
      officeMod = await import('./office.js');
      officeMod.mountOffice({
        ptt: officePtt,
        openPlans: () => showPlanList(),
        openGallery: async () => { const r = await ui.gallery('buka'); if (!r.ok) toast(r.catatan || 'Galeri masih kosong.'); },
        openMemory: () => { memFilter = 'semua'; $('mem-search').value = ''; renderMemories(); $('memories').hidden = false; },
        openNews: () => { if (lastSources) showSources(...lastSources); else toast('Belum ada berita dari Rara. Coba tanya Gaby sesuatu yang perlu dicari.'); },
      });
    }
    officeMod.openOffice();
    touch();
  } catch (e) {
    console.warn('[Gaby] Ruang Kerja gagal dibuka', e);
    closeOfficeScreen();
    toast(`Ruang Kerja belum bisa dibuka: ${e.message}`, 'err');
  }
}
function closeOfficeScreen() {
  try { sessionStorage.removeItem(OFFICE_OPEN_KEY); } catch {}
  if (officeMod) officeMod.closeOffice();
  $('office').hidden = true;
  document.body.classList.remove('office-open');
  visual.paused = false;
}
$('btn-office').addEventListener('click', openOfficeScreen);
$('of-back').addEventListener('click', closeOfficeScreen);
$('of-mic').addEventListener('click', officePtt);

async function keepAwake() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch {}
}

// ---------- Pindah aplikasi & kembali ----------
// Saat pindah ke aplikasi lain (YouTube Music, Google Maps, dll.), Gaby tidur rapi:
// mikrofon dilepas supaya tidak bentrok. Saat kembali, Gaby langsung mendengar lagi —
// atau, kalau HP meminta ketukan (biasanya iPhone), cukup ketuk sekali untuk lanjut.

const SESSION_KEY = 'gaby.session';
let returnPending = false;

function markSession(active) {
  try {
    if (active) sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

// Halaman dimuat ulang (Android kadang begitu) saat Gaby sedang aktif dalam 15 menit terakhir?
function wasRecentlyActive() {
  try {
    const t = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    return t && Date.now() - t < 15 * 60000;
  } catch {
    return false;
  }
}

function showResume() {
  phase = 'locked';
  $('gate').hidden = true;
  $('resume').hidden = false;
  render();
}

$('resume').addEventListener('click', async () => {
  try {
    await audio.unlock();
  } catch {
    toast('Suara belum bisa dinyalakan. Coba ketuk lagi.', 'warn');
    return;
  }
  $('resume').hidden = true;
  returnPending = false;
  phase = 'sleep';
  keepAwake();
  visual.resizeSoon();
  activate('return');
});

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') {
    if (phase === 'active' || phase === 'connecting') {
      returnPending = true;
      goSleep(true, { keepSession: true });
    }
    wake.stop();
    return;
  }
  visual.resizeSoon();
  if (phase === 'locked') return;
  keepAwake();
  if (audio.ctx && audio.ctx.state !== 'running') {
    try { await audio.ctx.resume(); } catch {}
  }
  const running = !audio.ctx || audio.ctx.state === 'running';
  if (!running) {
    // HP meminta ketukan untuk menyalakan suara lagi.
    if (!returnPending && phase === 'active') goSleep(true, { keepSession: true });
    returnPending = true;
    showResume();
    return;
  }
  if (returnPending) {
    returnPending = false;
    activate('return');
    return;
  }
  if (phase === 'sleep' && missed.length) {
    pendingCue = takeMissedCue();
    activate('reminder');
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
  // Halaman dimuat ulang saat Gaby sedang aktif: cukup ketuk untuk lanjut, tanpa layar Mulai.
  if (wasRecentlyActive()) return showResume();
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

function openSettings(group) {
  fillSettings();
  fillChain();
  $('settings').hidden = false;
  if (group) setTimeout(() => $(group).scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

// Model yang terakhir dipakai Lukas untuk menulis perintah gambar.
function lukasStatus() {
  const { keys } = memory.get();
  if (!keys.groq && !keys.gemini) return 'Butuh kunci Groq atau Gemini';
  let m = '';
  try { m = localStorage.getItem('gaby.lukasModel') || ''; } catch {}
  if (!m) return keys.groq ? 'Groq (belum pernah menggambar)' : 'Gemini (belum pernah menggambar)';
  return m.startsWith('groq:') ? `Groq ${groqLabel(m.slice(5))}` : `Gemini ${m.replace(/^gemini-/, '').replace(/-/g, ' ')}`;
}

// Pengaturan → ✨ Apa yang baru.
function fillNews() {
  const box = $('set-news');
  if (box.childElementCount) return;
  $('set-news-sum').textContent = `Lihat riwayat versi (sekarang v${VERSION})`;
  for (const v of WHATS_NEW) {
    const h = document.createElement('h4');
    h.textContent = `v${v.version}`;
    const ul = document.createElement('ul');
    for (const it of v.items) {
      const li = document.createElement('li');
      li.textContent = it;
      ul.appendChild(li);
    }
    box.append(h, ul);
  }
}

// Cerita update baru: sekali per versi, hanya saat Gaby dibuka (bukan sambung ulang).
function newsCue() {
  const seen = memory.get().seenVersion;
  if (!memory.get().nickname || cmpVersion(VERSION, seen) <= 0) return '';
  const items = newsSince(seen, 4);
  if (!items.length) { memory.setSeenVersion(VERSION); return ''; }
  return `[SISTEM] Kamu baru saja di-update ke versi ${VERSION}. Setelah menyapa, ceritakan dengan antusias tapi SINGKAT (maksimal 4 kalimat, gaya ngobrol, tanpa nomor urut) bahwa kamu baru upgrade, dan sebut hal-hal baru ini sesuai urutannya: ${items.map((t) => `"${t}"`).join('; ')}. Tutup dengan satu ajakan singkat untuk mencoba.`;
}

function fillSettings() {
  const st = memory.get();
  $('set-nick').textContent = st.nickname || 'belum ada';
  $('set-mem-count').textContent = st.profile.length;
  $('set-journal-count').textContent = st.journal.length;
  $('set-todo-count').textContent = st.todos.filter((t) => !t.done).length;
  $('set-research').textContent = st.keys.gemini ? researchStatus() : 'Butuh kunci Gemini';
  // Kalau Rara ditolak Google: tampilkan alasan aslinya + tombol coba lagi.
  const reasons = st.keys.gemini ? researchReasons() : [];
  $('set-research-box').hidden = !reasons.length;
  $('set-research-why').textContent = reasons.map((r) => `${r.label} — ${r.text}`).join('\n\n');
  fillNews();
  fillPlans();
  $('set-briefing').checked = st.settings.briefing !== false;
  $('set-affective').checked = st.settings.affective !== false;
  $('set-vera-image').checked = st.settings.veraImage !== false;
  $('set-music').value = st.settings.musicApp || 'ytmusic';
  $('set-apk').hidden = !isNativeApp;
  if (isNativeApp) installedApk().then((a) => { if (a) $('set-apk-version').textContent = a.version; });
  fillReminderHealth();
  if (!$('memories').hidden) renderMemories();
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
  if (document.activeElement !== $('set-poll')) $('set-poll').value = st.keys.pollinations || '';
  if (document.activeElement !== $('set-groq')) $('set-groq').value = st.keys.groq || '';
  $('set-groq-rara').textContent = researchStatus();
  $('set-groq-lukas').textContent = lukasStatus();
  $('set-groq-vera').textContent = st.keys.groq ? 'Groq Qwen3 32B (fakta & rencana) · Llama 4 (gambar)' : 'Butuh kunci Groq (tanpa itu hasil tetap tampil, bertanda "belum dicek")';
  $('set-groq-pandu').textContent = [
    st.keys.openrouter ? 'OpenRouter Nemotron (cadangan Groq)' : st.keys.groq ? 'Groq GPT-OSS 120B' : 'Butuh kunci Groq atau OpenRouter',
    panduStatus(),
  ].filter(Boolean).join(' · ');
  if (document.activeElement !== $('set-openrouter')) $('set-openrouter').value = st.keys.openrouter || '';
  $('set-or-status').textContent = orStatus(!!st.keys.openrouter);
  document.querySelectorAll('input[name="imgengine"]').forEach((r) => { r.checked = r.value === (st.settings.imageEngine || 'free'); });
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

$('btn-settings').addEventListener('click', () => openSettings());
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
document.querySelectorAll('input[name="imgengine"]').forEach((r) => r.addEventListener('change', () => {
  memory.setSetting('imageEngine', r.value);
  toast(r.value === 'google' ? 'Mesin gambar: Google (berbayar)' : 'Mesin gambar: Gratis');
}));
$('set-briefing').addEventListener('change', (e) => memory.setSetting('briefing', e.target.checked));
$('set-music').addEventListener('change', (e) => {
  memory.setSetting('musicApp', e.target.value);
  toast(`Aplikasi musik: ${MUSIC[e.target.value].name}`);
});
$('set-affective').addEventListener('change', (e) => {
  memory.setSetting('affective', e.target.checked);
  // Coba ulang dari tingkat teratas supaya fitur ini dicoba lagi (atau dilewati).
  brain.levels = {};
  try { localStorage.removeItem('gaby.levels3'); } catch {}
  restartSession();
});
$('set-diag').addEventListener('change', (e) => { memory.setSetting('diag', e.target.checked); renderDiag(); });

$('set-captions').addEventListener('change', (e) => { memory.setSetting('captions', e.target.checked); applySettings(); });
$('set-vera-image').addEventListener('change', (e) => { memory.setSetting('veraImage', e.target.checked); });
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
$('set-del-openrouter').addEventListener('click', () => {
  if (!memory.get().keys.openrouter) { toast('Belum ada key OpenRouter.'); return; }
  if (!confirm('Hapus API key OpenRouter dari perangkat ini? Pandu kembali memakai Groq.')) return;
  memory.setKeys({ openrouter: '' });
  $('set-openrouter').value = '';
  resetOpenRouter();
  fillSettings();
  toast('Key OpenRouter sudah dihapus.');
});
$('set-del-groq').addEventListener('click', () => {
  if (!memory.get().keys.groq) { toast('Belum ada key Groq.'); return; }
  if (!confirm('Hapus API key Groq dari perangkat ini? Rara & Lukas kembali memakai Gemini.')) return;
  memory.setKeys({ groq: '' });
  $('set-groq').value = '';
  resetResearch();
  fillSettings();
  toast('Key Groq sudah dihapus.');
  if (phase === 'active') restartSession();
});

$('set-save-keys').addEventListener('click', async () => {
  const gemini = $('set-gemini').value.trim();
  const openai = $('set-openai').value.trim();
  const pollinations = $('set-poll').value.trim();
  const groq = $('set-groq').value.trim();
  const openrouter = $('set-openrouter').value.trim();
  if (openrouter && !/^sk-or-/.test(openrouter)) toast('Key OpenRouter biasanya diawali "sk-or-". Cek lagi kalau Pandu gagal.', 'warn', 7000);
  const orChanged = openrouter !== (memory.get().keys.openrouter || '');
  if (orChanged) resetOpenRouter();
  if (gemini && gemini !== memory.get().keys.gemini) {
    const err = await checkGeminiKey(gemini);
    if (err) { toast(err, 'err'); return; }
  }
  if (groq && !/^gsk_/.test(groq)) toast('Key Groq biasanya diawali "gsk_". Cek lagi kalau Rara gagal.', 'warn', 7000);
  const groqChanged = groq !== (memory.get().keys.groq || '');
  memory.setKeys({ gemini, openai, pollinations, groq, openrouter });
  for (const id of Object.keys(memory.get().exhausted)) memory.clearExhausted(id);
  brain.models = null;
  // Kunci Groq baru: Rara langsung dicoba lagi, dan Gaby disambung ulang supaya kenal Rara yang aktif.
  if (groqChanged) {
    resetResearch();
    try { localStorage.removeItem('gaby.lukasModel'); } catch {}
    if (phase === 'active') restartSession();
  }
  if (orChanged && phase === 'active' && !groqChanged) restartSession(); // Gaby perlu tahu Pandu sudah siap
  toast(groqChanged && groq ? 'Key tersimpan ✓ Rara & Lukas sekarang pakai Groq ⚡' : orChanged && openrouter ? 'Key tersimpan ✓ Pandu sekarang berpikir lewat OpenRouter 🧭' : 'Key tersimpan ✓');
  fillChain();
  fillSettings();
});

$('set-rename').addEventListener('click', () => {
  memory.setNickname('');
  fillSettings();
  $('settings').hidden = true;
  const cue = '[SISTEM] Pengguna ingin mengganti nama panggilannya. Tanyakan dengan gaya lucu dia mau dipanggil apa sekarang, lalu simpan dengan simpan_nama.';
  if (phase === 'active') brain.sendText(cue);
  else if (phase === 'sleep') { pendingCue = cue; activate('rename'); }
});

// ---------- Cadangan data (ekspor / impor satu file) ----------
$('set-backup').addEventListener('click', async () => {
  const json = JSON.stringify(memory.exportData(), null, 1);
  const filename = `gaby-cadangan-${new Date().toLocaleDateString('sv-SE')}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  // APK: menu Bagikan Android (Simpan ke Drive / Files / WhatsApp ke diri sendiri).
  if (isNativeApp) {
    const res = await nativeShareFile(await blobToB64(blob), filename, { title: 'Cadangan Gaby' });
    if (res === 'ok' || res === 'batal') return;
    if (res === 'tidak_ada') { toast('Untuk menyimpan cadangan, aplikasi Android perlu di-update dulu (Pengaturan → Fitur → Cek update aplikasi).', 'warn', 8000); return; }
  }
  const file = new File([blob], filename, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: 'Cadangan Gaby' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast(`💾 Cadangan tersimpan: ${filename}`);
});
$('set-restore').addEventListener('click', () => $('set-restore-file').click());
$('set-restore-file').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = ''; // supaya file yang sama bisa dipilih lagi
  if (!f) return;
  let obj = null;
  try { obj = JSON.parse(await f.text()); } catch { /* bukan JSON */ }
  const sum = memory.checkBackup(obj);
  if (!sum) { toast('File ini bukan cadangan Gaby.', 'warn'); return; }
  const tgl = sum.dibuat ? new Date(sum.dibuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '?';
  if (!confirm(`Pulihkan cadangan tanggal ${tgl}${sum.nama ? ` (${sum.nama})` : ''}?\n\n`
    + `${sum.ingatan} ingatan · ${sum.harian} catatan harian · ${sum.catatan} catatan/to-do · ${sum.pengingat} pengingat · ${sum.rencana} rencana\n\n`
    + 'Data yang sekarang ada di perangkat ini akan DIGANTI dengan isi file. API key & pengaturan tidak berubah. Gaby akan dimuat ulang.')) return;
  if (!memory.importData(obj)) { toast('Gagal memulihkan cadangan.', 'warn'); return; }
  toast('✅ Cadangan dipulihkan. Memuat ulang…');
  setTimeout(() => location.reload(), 1200);
});

$('set-forget').addEventListener('click', () => {
  if (!confirm('Hapus nama panggilan, semua ingatan, dan catatan harian Gaby di perangkat ini?')) return;
  memory.forgetAll();
  fillSettings();
  renderMemories();
  toast('Ingatan Gaby di perangkat ini sudah dihapus.');
  restartSession();
});

// ---------- Catatan harian ----------

let sessionStart = 0;
let journalUpTo = 0;   // obrolan sampai waktu ini sudah diringkas

// Ringkas obrolan sesi ini jadi catatan harian (dijalankan saat Gaby tidur).
function writeJournal() {
  const from = Math.max(sessionStart, journalUpTo);
  const lines = memory.get().history.filter((h) => h.at >= from);
  if (!lines.some((h) => h.who === 'user') || lines.length < 2) return;
  journalUpTo = Date.now();
  summarizeSession(lines)
    .then(() => tidyProfile())
    .then(() => fillSettings())
    .catch((e) => console.warn('[Gaby] catatan harian gagal:', e.message));
}

// ---------- Peta: tempat sekitar & rute ----------

const MODE_ICON = { mobil: '🚗', motor: '🏍️', jalan: '🚶' };

function haversineKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

let mapLink = null; // tautan Google Maps dari kartu peta yang sedang tampil

function mapAction(aksi) {
  if (aksi === 'tutup') {
    hideMapCard();
    return { ok: true };
  }
  if (!mapLink) return { error: 'Belum ada peta yang tampil. Tanyakan dulu tujuan atau tempat yang dicari.' };
  const res = openExternal(mapLink.url, '🧭 Buka Google Maps');
  if (res.ok) hideMapCard();
  return res;
}

function showPlaces(query, pos, area) {
  mapLink = { url: googleSearchNear(query, pos) };
  hideCards('map');
  showMapCard({
    from: pos,
    title: `📍 ${query} di sekitar ${area || 'kamu'}`,
    info: 'Titik biru = lokasi kamu',
    actions: [{ label: '🗺️ Cari di Google Maps', href: googleSearchNear(query, pos), primary: true }],
  }).catch(() => linkToast(googleSearchNear(query, pos), 'Google Maps'));
}

// Hasil pencarian tempat disimpan sementara, supaya ganti kendaraan tidak mencari ulang.
// Kuncinya nama + titik acuan, jadi "Jakarta" dari Bandung dan dari Surabaya tidak tertukar.
const placeCache = new Map();

async function findPlace(name, near) {
  const key = `${name.toLowerCase()}|${near ? `${near.lat.toFixed(1)},${near.lon.toFixed(1)}` : ''}`;
  if (!placeCache.has(key)) placeCache.set(key, await geocode(name, near));
  return placeCache.get(key);
}

const shortName = (nama) => nama.split(', ').slice(0, 2).join(', ');

// dari: titik awal yang disebut pengguna ("dari Bandung"); kosong = lokasi GPS pengguna.
async function showRoute(tujuan, mode = 'mobil', dari = '') {
  let pos, fromName, fromLabel;
  if (dari) {
    // Lokasi GPS hanya dipakai sebagai acuan pencarian; kalau tidak diizinkan, tetap jalan.
    const gps = await getPosition().catch(() => null);
    pos = await findPlace(dari, gps);
    fromName = pos.nama;
    fromLabel = shortName(pos.nama);
  } else {
    pos = await getPosition();
    const place = await describePosition(pos);
    fromName = shortPlace(place);
    fromLabel = place.kota || 'Kamu';
  }
  const dest = await findPlace(tujuan, pos);
  let r = null;
  try {
    r = await route(pos, dest, mode);
  } catch {}
  const km = r ? r.km : Math.round(haversineKm(pos, dest));
  const info = r
    ? `${MODE_ICON[mode]} ${km} km · ± ${r.waktu}`
    : `📏 ± ${km} km garis lurus (rute tidak tersedia)`;
  const actions = ['mobil', 'motor', 'jalan'].map((m) => ({
    label: `${MODE_ICON[m]} ${m[0].toUpperCase()}${m.slice(1)}`,
    active: m === mode,
    onClick: () => showRoute(tujuan, m, dari).catch((e) => toast(e.message, 'err')),
  }));
  actions.push({ label: '🧭 Buka di Google Maps', href: googleDirections(pos, dest, mode), primary: true });
  mapLink = { url: googleDirections(pos, dest, mode) };
  hideCards('map');
  showMapCard({
    from: pos,
    to: dest,
    line: r ? r.line : null,
    title: `${fromLabel} → ${shortName(dest.nama)}`,
    info: info + (r ? ' · tanpa data macet' : ''),
    actions,
  }).catch(() => linkToast(googleDirections(pos, dest, mode), 'Google Maps'));
  touch();
  return {
    dari: fromName + (dari ? '' : ' (lokasi pengguna sekarang)'),
    ke: dest.nama,
    moda: mode,
    jarak_km: km,
    waktu_tempuh: r ? r.waktu : 'tidak diketahui',
    catatan: (r ? 'Perkiraan tanpa macet. Peta sudah tampil; sebutkan jarak & waktunya singkat.' : 'Rute tidak tersedia, hanya jarak garis lurus.')
      + ' Cek nama asal & tujuan di atas; kalau ternyata bukan tempat yang dimaksud pengguna, bilang dan minta nama yang lebih spesifik. Jangan menyebut jalan tol kecuali yakin.',
  };
}

$('map-close').addEventListener('click', hideMapCard);

// ---------- Halaman Ingatan Gaby ----------

let memFilter = 'semua';

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function highlight(text, q) {
  const safe = escapeHtml(text);
  if (!q) return safe;
  const re = new RegExp(`(${escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  return safe.replace(re, '<mark>$1</mark>');
}

function memRow(text, { date, onSave, onDelete, cat, rasa, q }) {
  const row = document.createElement('div');
  row.className = 'mem-row';
  const view = () => {
    row.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'mem-text';
    span.innerHTML = (date ? `<span class="mem-date">${escapeHtml(date)}</span>` : '')
      + (RASA[rasa] ? `<span class="mem-rasa" title="${rasa === 'suka' ? 'Suka' : 'Tidak suka'}">${RASA[rasa]}</span>` : '')
      + highlight(text, q);
    const edit = document.createElement('button');
    edit.textContent = '✏️';
    edit.title = 'Ubah';
    edit.onclick = editMode;
    const del = document.createElement('button');
    del.textContent = '🗑️';
    del.title = 'Hapus';
    del.onclick = () => { if (confirm('Hapus ingatan ini?')) onDelete(); };
    row.append(span, edit, del);
  };
  const editMode = () => {
    row.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'mem-edit';
    const ta = document.createElement('textarea');
    ta.className = 'field';
    ta.value = text;
    box.appendChild(ta);
    let sel = null;
    let rasaSel = null;
    if (cat) {
      sel = document.createElement('select');
      sel.className = 'field small';
      for (const [k, label] of Object.entries(CATEGORIES)) {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = label;
        sel.appendChild(o);
      }
      sel.value = cat;
      box.appendChild(sel);
      rasaSel = document.createElement('select');
      rasaSel.className = 'field small';
      for (const [k, label] of [['', 'Biasa (tanpa tanda)'], ['suka', '👍 Suka'], ['tidak', '👎 Tidak suka']]) {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = label;
        rasaSel.appendChild(o);
      }
      rasaSel.value = rasa || '';
      box.appendChild(rasaSel);
    }
    const ok = document.createElement('button');
    ok.textContent = '✓';
    ok.title = 'Simpan';
    ok.onclick = () => onSave(ta.value, sel && sel.value, rasaSel ? rasaSel.value : undefined);
    const cancel = document.createElement('button');
    cancel.textContent = '✕';
    cancel.title = 'Batal';
    cancel.onclick = view;
    row.append(box, ok, cancel);
    ta.focus();
  };
  view();
  return row;
}

function memGroup(label, count, open) {
  const d = document.createElement('details');
  d.className = 'mem-group';
  d.open = open;
  d.innerHTML = `<summary><span>${escapeHtml(label)}<span class="count">(${count})</span></span></summary>`;
  return d;
}

function renderMemories() {
  const st = memory.get();
  const q = $('mem-search').value.trim().toLowerCase();
  const match = (t) => !q || t.toLowerCase().includes(q);

  // Tombol kategori
  const chips = $('mem-chips');
  chips.innerHTML = '';
  const chipList = [['semua', 'Semua'], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.split(' ')[0]]), ['jurnal', '📔']];
  for (const [k, label] of chipList) {
    if (k !== 'semua' && k !== 'jurnal' && !st.profile.some((m) => m.cat === k)) continue;
    const b = document.createElement('button');
    b.textContent = label;
    b.title = k === 'jurnal' ? 'Catatan harian' : (CATEGORIES[k] || 'Semua');
    b.classList.toggle('on', memFilter === k);
    b.onclick = () => { memFilter = k; renderMemories(); };
    chips.appendChild(b);
  }

  const body = $('mem-body');
  body.innerHTML = '';
  let shown = 0;

  if (memFilter !== 'jurnal') {
    for (const [cat, label] of Object.entries(CATEGORIES)) {
      if (memFilter !== 'semua' && memFilter !== cat) continue;
      const items = st.profile.filter((m) => m.cat === cat && match(m.text));
      if (!items.length) continue;
      const g = memGroup(label, items.length, !!q || memFilter === cat);
      for (const m of items) {
        g.appendChild(memRow(m.text, {
          cat: m.cat,
          rasa: m.rasa,
          q,
          onSave: (text, c, r) => { memory.updateFact(m.id, text, c, r); renderMemories(); fillSettings(); },
          onDelete: () => { memory.removeFact(m.id); renderMemories(); fillSettings(); },
        }));
      }
      body.appendChild(g);
      shown += items.length;
    }
  }

  if (memFilter === 'semua' || memFilter === 'jurnal') {
    const entries = st.journal.filter((j) => match(j.text)).slice().reverse();
    if (entries.length) {
      const g = memGroup('📔 Catatan harian', entries.length, !!q || memFilter === 'jurnal');
      // Kelompokkan per bulan; bulan terbaru terbuka.
      const months = new Map();
      for (const j of entries) {
        const key = new Date(`${j.date}T12:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        if (!months.has(key)) months.set(key, []);
        months.get(key).push(j);
      }
      let first = true;
      for (const [month, list] of months) {
        const sub = memGroup(month, list.length, first || !!q);
        sub.classList.add('mem-sub');
        first = false;
        for (const j of list) {
          const date = new Date(`${j.date}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
          sub.appendChild(memRow(j.text, {
            date,
            q,
            onSave: (text) => { memory.updateJournal(j.id, text); renderMemories(); },
            onDelete: () => { memory.removeJournal(j.id); renderMemories(); fillSettings(); },
          }));
        }
        g.appendChild(sub);
      }
      body.appendChild(g);
      shown += entries.length;
    }
  }

  if (!shown) {
    const p = document.createElement('p');
    p.className = 'mem-empty';
    p.textContent = q ? `Tidak ada ingatan berisi "${q}".` : 'Belum ada ingatan. Ngobrol dulu dengan Gaby, nanti otomatis terisi 😊';
    body.appendChild(p);
  }
}

$('set-open-mem').addEventListener('click', () => {
  $('settings').hidden = true;
  memFilter = 'semua';
  $('mem-search').value = '';
  renderMemories();
  $('memories').hidden = false;
});
$('mem-close').addEventListener('click', () => { $('memories').hidden = true; });
$('memories').addEventListener('click', (e) => { if (e.target === $('memories')) $('memories').hidden = true; });
$('mem-search').addEventListener('input', renderMemories);
$('mem-tidy').addEventListener('click', async () => {
  const b = $('mem-tidy');
  b.disabled = true;
  b.textContent = '🧹 Meri merapikan…';
  try {
    const n = await tidyProfile(true);
    toast(n ? `Meri sudah merapikan ingatan (${n} catatan) ✓` : 'Kata Meri: belum ada yang perlu dirapikan.');
  } catch (e) {
    toast(`Gagal merapikan: ${e.message}`, 'err');
  } finally {
    b.disabled = false;
    b.textContent = '🧹 Minta Meri rapikan';
    renderMemories();
    fillSettings();
  }
});

// ---------- Catatan / to-do ----------

const hhmm = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

function renderTodos(flashIds = []) {
  const day = new Date().toLocaleDateString('sv-SE');
  const { todos, reminders } = memory.get();
  // Belum selesai di atas, yang sudah dicentang hari ini di bawah (tercoret).
  const items = [...todos.filter((t) => !t.done), ...todos.filter((t) => t.done)];
  const ul = $('todo-list');
  ul.innerHTML = '';
  for (const t of items) {
    const li = document.createElement('li');
    li.classList.toggle('done', t.done);
    li.classList.toggle('flash', flashIds.includes(t.id));
    const check = document.createElement('button');
    check.className = 'todo-check';
    check.textContent = t.done ? '✓' : '';
    check.title = t.done ? 'Batalkan centang' : 'Tandai selesai';
    check.onclick = () => { memory.setTodoDone(t.id, !t.done); renderTodos([t.id]); fillSettings(); };
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = t.text;
    const r = t.reminderId && reminders.find((x) => x.id === t.reminderId && !x.done);
    if (r) text.insertAdjacentHTML('beforeend', `<span class="todo-tag">⏰ ${hhmm(r.due)}</span>`);
    if (!t.done && t.date < day) text.insertAdjacentHTML('beforeend', '<span class="todo-tag old">dari kemarin</span>');
    const del = document.createElement('button');
    del.className = 'todo-del';
    del.textContent = '🗑️';
    del.title = 'Hapus';
    del.onclick = () => { memory.removeTodo(t.id); renderTodos(); fillSettings(); };
    li.append(check, text, del);
    ul.appendChild(li);
  }
  $('todo-empty').hidden = items.length > 0;
  if (flashIds.length) setTimeout(() => ul.querySelectorAll('.flash').forEach((x) => x.classList.remove('flash')), 1200);
}

// Hanya satu kartu (peta / gambar / catatan / berita / rencana) yang tampil dalam satu waktu.
function hideCards(except) {
  if (except !== 'map') hideMapCard();
  if (except !== 'todo') { $('todocard').classList.remove('show'); $('todocard').hidden = true; }
  if (except !== 'image') { $('preview').hidden = true; $('preview').classList.remove('show'); }
  if (except !== 'src') { $('srccard').classList.remove('show'); $('srccard').hidden = true; }
  if (except !== 'plan') hidePlanCard();
}

function showTodoCard(flashIds = []) {
  memory.dailyCleanup();
  hideCards('todo');
  renderTodos(flashIds);
  const card = $('todocard');
  card.hidden = false;
  requestAnimationFrame(() => card.classList.add('show'));
  touch();
}

function todoAction(aksi, items) {
  const names = (list) => list.map((t) => t.text);
  if (aksi === 'tutup') {
    hideCards();
    return { ok: true };
  }
  if (aksi === 'tambah') {
    const added = items.map((x) => memory.addTodo(x)).filter(Boolean);
    showTodoCard(added.map((t) => t.id));
    fillSettings();
    return { ok: true, ditambah: names(added), total_belum_selesai: memory.openTodos().length };
  }
  if (aksi === 'selesai' || aksi === 'belum' || aksi === 'hapus') {
    const hit = [], miss = [], notes = [];
    for (const x of items) {
      const t = memory.findTodo(x, { includeDone: aksi !== 'selesai' });
      if (!t) { miss.push(x); continue; }
      const r = t.reminderId && memory.get().reminders.find((y) => y.id === t.reminderId && !y.done);
      if (aksi === 'hapus') memory.removeTodo(t.id);
      else memory.setTodoDone(t.id, aksi === 'selesai');
      if (r && aksi !== 'belum') notes.push(`Pengingat "${r.text}" jam ${hhmm(r.due)} ikut dibatalkan di Gaby; kalau sudah disimpan di kalender HP, hapus manual di sana.`);
      hit.push(t);
    }
    showTodoCard(hit.map((t) => t.id));
    fillSettings();
    const out = { ok: hit.length > 0, [aksi === 'hapus' ? 'dihapus' : 'ditandai']: names(hit), sisa_belum_selesai: names(memory.openTodos()) };
    if (miss.length) out.tidak_ketemu = miss;
    if (notes.length) out.catatan = notes.join(' ');
    return out;
  }
  // lihat
  showTodoCard();
  const day = new Date().toLocaleDateString('sv-SE');
  return {
    belum_selesai: memory.openTodos().map((t) => (t.date < day ? `${t.text} (dari hari sebelumnya)` : t.text)),
    selesai_hari_ini: names(memory.get().todos.filter((t) => t.done)),
    catatan: 'Kartu daftar sudah tampil. Bacakan singkat yang belum selesai.',
  };
}

$('todo-close').addEventListener('click', () => hideCards());
$('set-open-todo').addEventListener('click', () => { $('settings').hidden = true; showTodoCard(); });

// ---------- Kotak pratinjau kamera ----------
// Kotak mengikuti bentuk asli gambar kamera (mendatar/tegak) dan menampilkannya utuh tanpa dipotong,
// supaya yang terlihat sama dengan yang dilihat Gaby (dulu kotak tegak 3:4 memotong kiri-kanan → terlihat di-zoom).
function fitCamBox() {
  const v = $('cam-video');
  const box = $('cam-box');
  if (!v.videoWidth || !v.videoHeight) return;
  const ratio = v.videoWidth / v.videoHeight;
  box.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
  box.classList.toggle('wide', ratio > 1.05);
}
$('cam-video').addEventListener('loadedmetadata', fitCamBox);
$('cam-video').addEventListener('resize', fitCamBox); // berubah saat ganti kamera / HP diputar

// ---------- Pencarian internet (cari_info) ----------

let srcTimer = 0;

// Kartu kecil berisi sumber jawaban; hilang sendiri setelah 60 detik.
let lastSources = null;
function showSources(query, sources, queries = [], badge = '') {
  lastSources = [query, sources, queries, badge];
  // Peta (misal dari cari_tempat) lebih berguna: jangan ditutup oleh kartu sumber.
  if (!$('mapcard').hidden) return;
  hideCards('src');
  // Kartu baru menggantikan yang lama (termasuk tombol "Buka" situs sebelumnya), bukan menumpuk.
  document.querySelectorAll('.toast.big').forEach((t) => t.remove());
  $('src-query').textContent = `“${query}”`;
  $('src-vera').textContent = `dicari Rara${badge ? ` · ${badge}` : ''}`;
  $('src-vera').className = `src-vera ${badge.startsWith('✅') ? 'ok' : badge.startsWith('⚠️') ? 'warn' : ''}`;
  const ul = $('src-list');
  ul.innerHTML = '';
  const add = (label, url, cls = '') => {
    const li = document.createElement('li');
    if (cls) li.className = cls;
    const a = document.createElement('a');
    a.href = url;
    a.textContent = label;
    a.onclick = (e) => { e.preventDefault(); openExternal(url, label); };
    li.appendChild(a);
    ul.appendChild(li);
  };
  sources.forEach((s, i) => add(`${i + 1}. ${s.title}`, s.url));
  // Kata kunci yang dicari Google (bisa diketuk untuk melihat sendiri hasilnya).
  for (const q of queries) add(`🔍 ${q}`, `https://www.google.com/search?q=${encodeURIComponent(q)}`, 'q');
  const card = $('srccard');
  // Animasi ulang supaya jelas kartunya berganti.
  card.classList.remove('show');
  card.hidden = false;
  void card.offsetWidth;
  requestAnimationFrame(() => card.classList.add('show'));
  clearTimeout(srcTimer);
  srcTimer = setTimeout(hideSources, 60000);
  touch();
}

function hideSources() {
  clearTimeout(srcTimer);
  $('srccard').classList.remove('show');
  $('srccard').hidden = true;
}

// Alat suara tutup_kartu: setiap kartu punya nama ("tutup kartu berita", "tutup semua kartu").
const CARD_NAMES = {
  papan: 'Papan Kerja',
  berita: 'Kartu Berita',
  rencana: 'Kartu Rencana',
  perbandingan: 'Kartu Perbandingan',
  daftar_rencana: 'Kartu Daftar Rencana',
  catatan: 'Kartu Catatan',
  peta: 'Kartu Peta',
  gambar: 'Kartu Gambar',
  galeri: 'Galeri',
};

function cardOpen(jenis) {
  switch (jenis) {
    case 'papan': return boardVisible();
    case 'berita': return !$('srccard').hidden || document.querySelectorAll('.toast.big').length > 0;
    case 'catatan': return !$('todocard').hidden;
    case 'peta': return !$('mapcard').hidden;
    case 'gambar': return !$('preview').hidden;
    case 'galeri': return !$('viewer').hidden;
    default: return planCardOpen(jenis);
  }
}

function closeCard(jenis) {
  switch (jenis) {
    case 'papan': hideBoard(); break;
    case 'berita': hideSources(); document.querySelectorAll('.toast.big').forEach((t) => t.remove()); break;
    case 'catatan': $('todocard').classList.remove('show'); $('todocard').hidden = true; break;
    case 'peta': hideMapCard(); break;
    case 'gambar': hidePreview(); break;
    case 'galeri': $('viewer').hidden = true; break;
    default: hidePlanCard(jenis);
  }
}

function closeCards(jenis) {
  if (jenis === 'sumber') jenis = 'berita';
  const unsavedImage = !!pendingImage && !$('preview').hidden;
  if (jenis === 'semua') {
    const closed = [];
    for (const k of Object.keys(CARD_NAMES)) {
      if (k === 'gambar' && unsavedImage) continue; // gambar belum disimpan: tanya dulu
      if (cardOpen(k)) { closeCard(k); closed.push(CARD_NAMES[k]); }
    }
    const out = { ok: true, ditutup: closed.length ? closed : 'tidak ada kartu yang terbuka' };
    if (unsavedImage) out.catatan = 'Kartu Gambar belum disimpan, jadi belum ditutup. Tanya pengguna mau disimpan atau dibuang, lalu pakai gambar_aksi.';
    return out;
  }
  if (!CARD_NAMES[jenis]) return { error: 'Jenis kartu tidak dikenal' };
  if (!cardOpen(jenis)) return { ok: true, ditutup: false, catatan: `${CARD_NAMES[jenis]} sedang tidak terbuka.` };
  if (jenis === 'gambar' && unsavedImage) {
    return { perlu_tanya: true, catatan: 'Gambar ini belum disimpan. Tanya dulu: mau disimpan ke galeri atau dibuang? Lalu pakai gambar_aksi.' };
  }
  closeCard(jenis);
  return { ok: true, ditutup: CARD_NAMES[jenis] };
}

// Kartu rencana / perbandingan / daftar rencana (diisi di bagian Pandu).
function planCardOpen(jenis) {
  const c = $('plancard');
  return !!c && !c.hidden && c.dataset.kind === jenis;
}
function hidePlanCard(jenis) {
  const c = $('plancard');
  if (!c || (jenis && c.dataset.kind !== jenis)) return;
  c.classList.remove('show');
  c.hidden = true;
}

$('set-research-retry').addEventListener('click', () => {
  const wasQuick = quickSearchMode();
  resetResearch();
  fillSettings();
  toast('Rara siap dicoba lagi. Tanya Gaby sesuatu, misal harga emas hari ini.');
  if (wasQuick && phase === 'active') restartSession(); // sambung ulang supaya Gaby kembali memakai Rara
});

$('src-close').addEventListener('click', hideSources);

// Jatah agen riset habis: setelah Gaby selesai bicara, sambung ulang diam-diam dengan
// Google Search bawaan menyala, lalu jawab pertanyaan tadi. Hanya untuk Gemini.
let quickSwitch = null;
function switchToQuickSearch(query) {
  if (!brain.current || brain.current.kind !== 'gemini') return false;
  fillSettings();
  quickSwitch = query;
  const attempt = (tries = 0) => {
    if (!quickSwitch || phase !== 'active') { quickSwitch = null; return; }
    if ((audio.isSpeaking() || thinking > 0) && tries < 25) { setTimeout(() => attempt(tries + 1), 400); return; }
    const q = quickSwitch;
    quickSwitch = null;
    pendingCue = `[SISTEM] Kamu baru disambung ulang dengan pencarian cepat (Google Search bawaan). Pertanyaan pengguna tadi: "${q}". Cari dengan Google Search lalu jawab singkat, awali dengan "aku cek cepat ya, mungkin kurang akurat". Kalau tidak ketemu, bilang jujur; jangan mengarang.`;
    restartSession();
  };
  setTimeout(() => attempt(), 1500);
  return true;
}

// ---------- Rencana (Pandu) ----------
// Pandu bekerja di belakang layar; selesai → disimpan bernomor, Kartu Rencana tampil,
// dan Gaby mengabarkan sendiri (atau lewat notifikasi kalau Gaby sedang tidur).

const fmtRp = (n) => (n ? `Rp${Number(n).toLocaleString('id-ID')}` : '–');
const fmtDay = (t) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const esc = (v) => escapeHtml(String(v == null ? '' : v));
let planRunning = null;
const planNews = []; // kabar yang menunggu Gaby bangun

// Kabarkan sesuatu lewat Gaby: tunggu jeda (tidak memotong siapa pun), atau simpan kalau Gaby tidur.
function announce(cue, notify) {
  if (phase === 'active' && brain.connected) {
    const started = Date.now();
    const tryNow = () => {
      if (phase !== 'active' || !brain.connected) { planNews.push(cue); return; }
      const busy = audio.isSpeaking() || thinking > 0 || vad.active || Date.now() - lastAudioAt < 900;
      if (busy && Date.now() - started < 45000) { setTimeout(tryNow, 400); return; }
      brain.sendText(cue);
      touch();
    };
    tryNow();
    return;
  }
  planNews.push(cue);
  if (!notify) return;
  if (isNativeApp) nativeNotifyNow(notify.title, notify.body);
  else if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification(notify.title, { body: notify.body, icon: 'icons/icon-192.png' }); } catch {}
  }
}

function takePlanNews() {
  return planNews.length ? planNews.splice(0).join('\n') : '';
}

function planSummary(p) {
  const d = p.data || {};
  const hotel = (d.tempat || []).find((t) => t.dipilih) || (d.tempat || [])[0];
  return {
    nomor: p.no,
    judul: p.title,
    tanggal: d.tanggal || '',
    total_biaya: d.total_biaya ? fmtRp(d.total_biaya) : '',
    rincian: (d.rincian_biaya || []).map((r) => `${r.item}: ${fmtRp(r.biaya)}`),
    tempat: (d.tempat || []).map((t) => [t.dipilih ? 'DIPAKAI' : '', t.kelas, t.nama, t.area, t.harga].filter(Boolean).join(', ')),
    jadwal: (d.jadwal || []).map((j) => `${j.waktu}: ${j.kegiatan}`),
    jenis: d.jenis || 'lainnya',
    transportasi: (d.transportasi || []).map((t) => [t.dipilih ? 'DIPAKAI' : '', t.kelas, t.nama, t.moda, t.rute, t.waktu, t.harga].filter(Boolean).join(', ')),
    kuliner: (d.kuliner || []).map((k) => [k.waktu, k.nama, k.area, k.menu, k.harga].filter(Boolean).join(', ')),
    tujuan: d.tujuan || '',
    fitur: (d.fitur || []).map((f) => `${f.nama} (${f.prioritas})`),
    alat: (d.alat || []).map((a) => [a.nama, a.kegunaan, a.biaya].filter(Boolean).join(', ')),
    risiko: d.risiko || [],
    checklist: d.checklist || [],
    pengingat: (d.pengingat || []).map((r) => `${r.tanggal} ${r.jam}: ${r.pesan}`),
    catatan: d.catatan || [],
    ringkasan: d.ringkasan || '',
    turunan_dari: p.parent ? `#${p.parent}` : '',
    cek_vera: p.vera ? p.vera.badge : '',
    catatan_vera: p.vera && !p.vera.ok ? (p.vera.issues || []) : [],
    dibuat: fmtDay(p.created),
    _utama: hotel ? `${hotel.nama}${hotel.area ? ` (${hotel.area})` : ''}` : '',
  };
}

function startPlan({ permintaan, dari_nomor }) {
  const request = String(permintaan || '').trim().slice(0, 400);
  if (!request) return { error: 'Permintaannya kosong. Tanyakan mau direncanakan apa.' };
  if (!memory.get().keys.groq && !memory.get().keys.openrouter) {
    return {
      error: 'pandu_belum_bisa',
      catatan: 'Pandu belum bisa dipanggil: dia butuh kunci Groq atau OpenRouter (gratis). Bilang santai, misal "Wah, Pandu belum bisa diminta tolong nih, kuncinya belum dimasukin. Isi dulu kunci Groq atau OpenRouter di Pengaturan → Otak Gaby ya, gratis kok." Lalu tawarkan garis besar sederhana buatanmu sendiri sekarang (bilang bahwa itu tidak tersimpan sebagai rencana bernomor dan belum dicek Vera).',
    };
  }
  if (planRunning) {
    return { error: 'sibuk', catatan: `Pandu masih mengerjakan "${planRunning.request}". Bilang singkat dan minta pengguna menunggu sebentar.` };
  }
  const base = dari_nomor ? memory.getPlan(dari_nomor) : null;
  if (dari_nomor && !base) {
    return { error: `Rencana #${dari_nomor} tidak ada.`, rencana_tersimpan: memory.listPlans().map((p) => `#${p.no} ${p.title}`) };
  }
  const job = startJob('pandu', base ? `Mengubah rencana #${base.no}…` : 'Menyusun langkah…');
  planRunning = { request };
  runPlanJob(request, base, job).finally(() => { planRunning = null; });
  return {
    ok: true,
    mulai: true,
    catatan: 'Pandu mulai bekerja (biasanya 1–3 menit, rencana panjang bisa sampai 5–8 menit kalau harus menunggu jatah AI; prosesnya tampil di papan kerja di atas). Bilang SINGKAT bahwa Pandu sedang menyusun rencananya dan pengguna boleh ngobrol hal lain sambil menunggu. JANGAN mengarang isi rencana; sistem akan mengabarimu saat selesai.',
  };
}

// v1.25: lanjutkan pekerjaan Pandu yang tertunda (titik simpan di HP, berlaku 2 hari).
function resumePlan() {
  const pend = panduPending();
  if (!pend) return { error: 'tidak_ada', catatan: 'Tidak ada pekerjaan Pandu yang tertunda (atau sudah lewat 2 hari). Tawarkan membuat rencana baru dengan buat_rencana.' };
  if (planRunning) return { error: 'sibuk', catatan: `Pandu masih mengerjakan "${planRunning.request}". Minta pengguna menunggu sebentar.` };
  const base = pend.baseNo ? memory.getPlan(pend.baseNo) : null;
  const job = startJob('pandu', 'Melanjutkan rencana yang tertunda…');
  planRunning = { request: pend.request };
  runPlanJob(pend.request, base, job, pend).finally(() => { planRunning = null; });
  return {
    ok: true,
    lanjut: true,
    permintaan: pend.request,
    catatan: 'Pandu melanjutkan dari titik terakhir (riset yang sudah ada tidak diulang). Bilang SINGKAT bahwa Pandu melanjutkan rencananya; sistem akan mengabarimu saat selesai.',
  };
}

async function runPlanJob(request, base, job, resume = null) {
  let veraIdx = 0;
  let lastBrain = '';
  // Vera membaca rencana panjang bertahap & menunggu jatah Groq pulih kalau perlu.
  const veraHooks = {
    onWait: (sec) => job.pass('vera', `☕ Menunggu jatah Groq pulih (±${sec} dtk)…`),
    onPart: (i, n, label) => job.pass('vera', `Membaca bagian ${i + 1}/${n}: ${label}…`),
  };
  try {
    const res = await runPandu({
      request,
      base,
      resume,
      hooks: {
        onSteps: (list) => { veraIdx = list.length; job.setSteps([...list, 'Vera mengecek rencana']); },
        onStep: (i, text) => { job.pass('pandu'); job.step(i, text); },
        onRara: (who, text) => job.pass(who, text),
        onWait: (sec) => { job.pass('pandu'); job.update(`☕ Menunggu jatah AI pulih${sec ? ` (±${sec} dtk)` : ''}…`); },
        onBrain: (label) => { if (label !== lastBrain) { if (lastBrain) job.update(`Pindah ke ${label}…`); lastBrain = label; } },
        onFix: (fb, ke) => job.pass('pandu', `Memperbaiki${ke > 1 ? ` (ke-${ke})` : ''}: ${fb.slice(0, 70)}…`),
        verify: async (plan, fixes) => {
          job.pass('vera');
          job.step(veraIdx, 'Mengecek hitungan, tanggal, dan pantanganmu…');
          return checkPlan(plan, fixes, veraHooks);
        },
      },
    });
    let vera = res.vera;
    if (!vera) {
      job.pass('vera');
      job.step(veraIdx, 'Mengecek ulang rencana…');
      vera = await checkPlan(res.plan, res.fixes, veraHooks);
    }
    const serious = (vera.issues || []).filter((i) => i.serius).map((i) => i.text); // yang belum beres
    const plan = memory.addPlan({
      title: res.plan.judul,
      request,
      data: res.plan,
      vera: { badge: vera.badge, ok: vera.ok, notes: [...serious.map((t) => `⚠️ ${t}`), ...(vera.notes || [])], issues: serious },
      parent: base ? base.no : null,
    });
    job.pass('pandu');
    job.done(`Rencana #${plan.no} siap · ${vera.badge}`);
    showPlanCard(plan.no);
    fillSettings();
    const s = planSummary(plan);
    // Vera masih punya catatan → Gaby menawarkan "lengkapi" (rencana turunan); kalau tidak, tawarkan ke catatan.
    const extra = !vera.ok
      ? ` Lalu tawarkan SATU kali, misal "Vera masih mencatat <inti catatannya>. Mau aku minta Pandu lengkapi?". Kalau pengguna setuju → buat_rencana dengan dari_nomor ${plan.no} dan permintaan "Lengkapi rencana #${plan.no} sesuai catatan Vera".`
      : (plan.data.checklist.length || plan.data.pengingat.length)
        ? ' Lalu tanya apakah mau dimasukkan ke catatan & pengingat (alat rencana_ke_catatan).' : '';
    announce(`[SISTEM] Pandu sudah selesai: Rencana #${plan.no} "${plan.title}" sudah siap dan tampil di Kartu Rencana. Cek Vera: ${vera.badge}${vera.ok ? '' : ` (${serious.join('; ')})`}. Ringkasan: ${JSON.stringify({ jenis: s.jenis, tanggal: s.tanggal, total: s.total_biaya, utama: s._utama, transportasi: s.transportasi.slice(0, 2), kuliner: s.kuliner.slice(0, 2), tujuan: s.tujuan, fitur: s.fitur.slice(0, 3), rincian: s.rincian.slice(0, 5), jadwal: s.jadwal.slice(0, 3) })}. Sampaikan dengan antusias tapi SINGKAT (2–3 kalimat): sebut nomor rencana, total biaya, dan 1–2 hal utama (misal maskapai & hotel, atau fitur utama untuk proyek); boleh sebut bahwa kartunya bisa disimpan ke HP${vera.ok ? '' : ', lalu jujur sebut catatan Vera dengan bahasa sederhana'}.${extra}`,
    { title: `Rencana #${plan.no} siap`, body: `${plan.title}${s.total_biaya ? ` · total ${s.total_biaya}` : ''}` });
  } catch (e) {
    if (e && e.paused) {
      // Jatah semua otak habis di tengah jalan: hasil kerja tersimpan, bisa dilanjutkan nanti.
      console.warn('[Gaby] Pandu tertunda:', e.info);
      job.pause(`⏸️ Tertunda — bilang "lanjutkan rencananya" nanti`);
      fillSettings();
      announce(`[SISTEM] Pandu berhenti sementara saat menyusun "${request}" karena ${String(e.info?.why || 'jatah AI habis').slice(0, 160)}. Hasil kerjanya (riset & draf${e.info?.lastStep ? `, terakhir: ${String(e.info.lastStep).slice(0, 60)}` : ''}) SUDAH TERSIMPAN di HP selama 2 hari, jadi tidak mengulang dari awal. Sampaikan singkat & santai dengan bahasa sederhana (sebut penyebabnya, misal jatah AI gratis habis), lalu bilang nanti tinggal bilang "lanjutkan rencananya" (alat lanjutkan_rencana) kalau jatahnya sudah pulih, misal besok.`,
        { title: 'Pandu tertunda', body: 'Hasil kerjanya tersimpan. Bilang "lanjutkan rencananya" nanti.' });
      return;
    }
    console.warn('[Gaby] Pandu gagal:', e);
    job.fail(String(e.message || 'Gagal').slice(0, 80));
    announce(`[SISTEM] Pandu gagal menyusun rencana "${request}": ${String(e.message || '').replace(/\.+$/, '')}. Sampaikan singkat dan jujur dengan bahasa sederhana (sebut penyebabnya, misal jatah AI habis atau izin OpenRouter belum dinyalakan), lalu tawarkan untuk mencoba lagi.`,
      { title: 'Pandu belum berhasil', body: String(e.message || '').slice(0, 100) });
  }
}

function showPlanCardShell(kind, title, html) {
  hideCards('plan');
  document.querySelectorAll('.toast.big').forEach((t) => t.remove());
  const card = $('plancard');
  card.dataset.kind = kind;
  $('plan-title').textContent = title;
  $('plan-body').innerHTML = html;
  $('plan-body').scrollTop = 0;
  card.classList.remove('show');
  card.hidden = false;
  void card.offsetWidth;
  requestAnimationFrame(() => card.classList.add('show'));
  touch();
}

function showPlanCard(no) {
  const p = memory.getPlan(no);
  if (!p) return false;
  const d = p.data || {};
  const h = planHeader(p);
  const sections = planSections(p);
  const list = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const sec = (s, lines, more = false) => `<div class="plan-sec"><b>${esc(s.title)}</b>${s.total ? `<div class="plan-total">${esc(s.total)}</div>` : ''}${lines.length ? list(lines) : ''}${more ? '<i>…lihat detail</i>' : ''}</div>`;
  const lineHtml = (s) => s.lines.map((t, i) => (s.links && s.links[i] ? `<a href="${esc(s.links[i])}" data-ext="1">${esc(t)}</a>` : esc(t)));
  const badge = h.badge;
  const main = [
    `<h4>${esc(p.title)}</h4>`,
    `<p class="plan-meta">${[esc(JENIS[d.jenis] || JENIS.lainnya), esc(d.tanggal), p.parent ? `turunan dari #${p.parent}` : '', badge ? `<span class="${badge.startsWith('✅') ? 'ok' : badge.startsWith('⚠️') ? 'warn' : ''}">${esc(badge)}</span>` : ''].filter(Boolean).join(' · ')}</p>`,
    h.intro ? `<p>${esc(h.intro)}</p>` : '',
    ...sections.filter((s) => s.main).map((s) => {
      const lines = lineHtml(s);
      const lim = s.limit || lines.length;
      return sec(s, lines.slice(0, lim), lines.length > lim);
    }),
  ].join('');
  const detail = [
    ...sections.filter((s) => s.main && s.limit && s.lines.length > s.limit).map((s) => sec({ title: `${s.title} (lengkap)` }, lineHtml(s))),
    ...sections.filter((s) => !s.main).map((s) => sec(s, lineHtml(s))),
    `<p class="plan-meta">Permintaan: “${esc(p.request)}” · dibuat ${fmtDay(p.created)}</p>`,
  ].join('');
  const canTodo = (d.checklist && d.checklist.length) || (d.pengingat && d.pengingat.length);
  const html = `${main}<div class="plan-detail" hidden>${detail}</div>
    <div class="plan-actions">
      <button class="btn" data-act="detail">📋 Lihat detail</button>
      ${canTodo ? `<button class="btn primary" data-act="todo">📝 Masukkan ke catatan & pengingat</button>` : ''}
      <button class="btn" data-act="save">📄 Simpan PDF</button>
      <button class="btn" data-act="text">📤 Kirim teks</button>
    </div>`;
  showPlanCardShell('rencana', `🗺️ Kartu Rencana #${p.no}`, html);
  $('plan-body').dataset.no = String(p.no);
  $('plan-body').dataset.cmp = '';
  return true;
}

// ---------- Simpan kartu ke HP ----------
// v1.25.1: kartu → PDF (A4, tulisan asli, tajam & bisa dicari; dulu satu gambar panjang yang buram di
// galeri/WhatsApp). APK: menu Bagikan Android; iPhone/browser: menu Bagikan atau unduhan. Teks → Bagikan /
// salin. Menu Bagikan di browser butuh ketukan, jadi dari perintah suara Gaby menampilkan satu tombol.

function cardTarget() {
  const kind = $('plancard').dataset.kind;
  if (kind === 'rencana') {
    const p = memory.getPlan(Number($('plan-body').dataset.no));
    return p ? { kind, plans: [p], name: `rencana-${p.no}`, label: `Rencana #${p.no}: ${p.title}` } : null;
  }
  if (kind === 'perbandingan') {
    const plans = String($('plan-body').dataset.cmp || '').split(',').map(Number).map((n) => memory.getPlan(n)).filter(Boolean);
    return plans.length ? { kind, plans, name: `perbandingan-${plans.map((p) => p.no).join('-')}`, label: `Perbandingan ${plans.map((p) => `#${p.no}`).join(' vs ')}` } : null;
  }
  return null;
}

function cardPdf(t) {
  try {
    return t.kind === 'rencana' ? planPdf(t.plans[0]) : comparePdf(t.plans, t.label);
  } catch (e) {
    console.warn('[Gaby] PDF gagal:', e);
    return null;
  }
}

const blobToB64 = (blob) => new Promise((ok) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1]);
  r.onerror = () => ok(null);
  r.readAsDataURL(blob);
});

// fromTap = dipanggil dari ketukan pengguna (boleh membuka menu Bagikan browser).
async function saveCardToPhone(t, { fromTap = false } = {}) {
  if (!t) return { error: 'Tidak ada Kartu Rencana / Perbandingan yang terbuka.' };
  const pdf = cardPdf(t);
  if (!pdf) return { error: 'Gagal membuat PDF.' };
  const { blob, pages } = pdf;
  const filename = `gaby-${t.name}.pdf`;
  const info = { halaman: pages, berkas: filename };
  // APK: menu Bagikan Android (Simpan ke Files / Drive / WhatsApp sebagai dokumen).
  if (isNativeApp) {
    const res = await nativeShareFile(await blobToB64(blob), filename, { title: t.label });
    if (res === 'ok' || res === 'batal') return { ok: true, cara: 'menu Bagikan HP', ...info };
    if (res === 'tidak_ada') {
      maybeCheckApkUpdate({ force: true });
      return { error: 'Untuk menyimpan PDF, aplikasi Android perlu di-update dulu (kartu update akan muncul / Pengaturan → Fitur → Cek update aplikasi).' };
    }
  }
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (fromTap && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t.label }); return { ok: true, cara: 'menu Bagikan', ...info }; } catch (e) {
      if (e && e.name === 'AbortError') return { ok: true, cara: 'dibatalkan', ...info };
    }
  }
  if (fromTap) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { ok: true, cara: 'unduhan', ...info };
  }
  // Dari perintah suara di browser: menu Bagikan butuh ketukan → tampilkan tombol.
  document.querySelectorAll('.toast.big').forEach((x) => x.remove());
  const el = toast('', 'info big', 30000);
  const b = document.createElement('button');
  b.className = 'big-btn';
  b.textContent = '📄 Ketuk untuk simpan PDF';
  b.onclick = () => { el.remove(); saveCardToPhone(t, { fromTap: true }); };
  const x = document.createElement('button');
  x.className = 'icon-btn';
  x.textContent = '✕';
  x.onclick = () => el.remove();
  el.append(b, x);
  return { ok: true, perlu_ketuk: true, ...info, catatan: 'PDF siap. Minta pengguna mengetuk tombol "Simpan PDF" di layar sekali.' };
}

async function sendCardText(t, { fromTap = false } = {}) {
  if (!t) return { error: 'Tidak ada Kartu Rencana / Perbandingan yang terbuka.' };
  const text = t.kind === 'rencana' ? planText(t.plans[0]) : compareText(t.plans);
  if (isNativeApp) {
    const res = await nativeShareText(text, t.label);
    if (res === 'ok' || res === 'batal') return { ok: true, cara: 'menu Bagikan HP' };
  }
  if (fromTap && navigator.share) {
    try { await navigator.share({ title: t.label, text }); return { ok: true, cara: 'menu Bagikan' }; } catch (e) {
      if (e && e.name === 'AbortError') return { ok: true, cara: 'dibatalkan' };
    }
  }
  try { await navigator.clipboard.writeText(text); toast('📋 Teks rencana disalin. Tempel di WhatsApp / Catatan.'); return { ok: true, cara: 'disalin' }; } catch {}
  if (isNativeApp) {
    maybeCheckApkUpdate({ force: true });
    return { error: 'Untuk mengirim teks, aplikasi Android perlu di-update dulu (Pengaturan → Fitur → Cek update aplikasi).' };
  }
  return { error: 'Tidak bisa membagikan teks di perangkat ini.' };
}

// Alat suara: "simpan rencana 3 ke HP", "kirim rencananya sebagai teks".
async function savePlanTool({ nomor, bentuk }) {
  let t = cardTarget();
  if (nomor) {
    if (!showPlanCard(Number(nomor))) return { error: `Rencana #${nomor} tidak ada.`, rencana_tersimpan: memory.listPlans().map((p) => `#${p.no} ${p.title}`) };
    t = cardTarget();
  }
  if (!t) return { error: 'Sebutkan nomor rencananya, atau buka kartunya dulu.' };
  if (bentuk !== 'teks') return saveCardToPhone(t);
  const r = await sendCardText(t);
  // Teks panjang: WhatsApp kadang memotongnya → sarankan PDF (terkirim utuh sebagai dokumen).
  const len = (t.kind === 'rencana' ? planText(t.plans[0]) : compareText(t.plans)).length;
  if (r.ok && len > 3000) r.catatan = 'Teksnya panjang. Kalau dikirim ke WhatsApp dan terpotong, sarankan SATU kali kirim sebagai PDF saja (simpan_rencana_hp bentuk pdf), PDF masuk utuh sebagai dokumen.';
  return r;
}

function showPlanList() {
  const plans = memory.listPlans().slice().reverse();
  const html = plans.length
    ? plans.map((p) => `<div class="plan-row" data-open="${p.no}"><span><b>#${p.no}</b> ${esc(p.title)}</span><small>${fmtDay(p.created)}</small></div>`).join('')
    : '<p class="hint">Belum ada rencana tersimpan.</p>';
  showPlanCardShell('daftar_rencana', `📋 Kartu Daftar Rencana (${plans.length})`, html);
}

function showCompareCard(plans) {
  const sums = plans.map(planSummary);
  const cell = (v) => `<td>${v || '–'}</td>`;
  const row = (label, f) => `<tr><th>${label}</th>${sums.map((s, i) => cell(f(s, plans[i]))).join('')}</tr>`;
  const html = `<table class="cmp">
    <thead><tr><th></th>${sums.map((s) => `<th>#${s.nomor}</th>`).join('')}</tr></thead>
    <tbody>
      ${row('Judul', (s) => esc(s.judul))}
      ${row('💰 Total', (s) => esc(s.total_biaya))}
      ${row('📍 Utama', (s, p) => { const t = (p.data.tempat || []).find((x) => x.dipilih) || (p.data.tempat || [])[0]; return esc(t ? [t.kelas, t.nama, t.area].filter(Boolean).join(', ') : ''); })}
      ${row('💵 Harga', (s, p) => { const t = (p.data.tempat || []).find((x) => x.dipilih) || (p.data.tempat || [])[0]; return esc(t ? t.harga : ''); })}
      ${row('🚆 Transport', (s, p) => { const t = (p.data.transportasi || []).find((x) => x.dipilih) || (p.data.transportasi || [])[0]; return esc(t ? [t.kelas, t.nama, t.harga].filter(Boolean).join(', ') : ''); })}
      ${row('🍽️ Kuliner', (s, p) => esc((p.data.kuliner || [])[0] ? p.data.kuliner[0].nama : ''))}
      ${row('📅 Tanggal', (s) => esc(s.tanggal))}
      ${row('🗓️ Jadwal', (s) => (s.jadwal.length ? `${s.jadwal.length} kegiatan` : ''))}
      ${row('✅ Cek Vera', (s) => esc(s.cek_vera))}
    </tbody></table>`;
  showPlanCardShell('perbandingan', `📊 Kartu Perbandingan ${plans.map((p) => `#${p.no}`).join(' vs ')}`, `${html}
    <div class="plan-actions"><button class="btn" data-act="save">📄 Simpan PDF</button><button class="btn" data-act="text">📤 Kirim teks</button></div>`);
  $('plan-body').dataset.cmp = plans.map((p) => p.no).join(',');
}

$('plan-close').addEventListener('click', () => hidePlanCard());
$('plan-body').addEventListener('click', (e) => {
  const ext = e.target.closest('a[data-ext]');
  if (ext) { e.preventDefault(); openExternal(ext.href, ext.textContent); return; }
  const open = e.target.closest('[data-open]');
  if (open) { showPlanCard(Number(open.dataset.open)); return; }
  const act = e.target.closest('[data-act]');
  if (!act) return;
  if (act.dataset.act === 'detail') {
    const d = $('plan-body').querySelector('.plan-detail');
    d.hidden = !d.hidden;
    act.textContent = d.hidden ? '📋 Lihat detail' : '📋 Sembunyikan detail';
  } else if (act.dataset.act === 'todo') {
    const r = planToTodos(Number($('plan-body').dataset.no));
    toast(r.error || r.pesan, r.error ? 'warn' : 'info', 6000);
  } else if (act.dataset.act === 'save') {
    act.disabled = true;
    saveCardToPhone(cardTarget(), { fromTap: true }).then((r) => {
      act.disabled = false;
      if (r.error) toast(r.error, 'warn');
      else if (r.cara !== 'dibatalkan') toast(`📄 PDF ${r.halaman} halaman siap${r.cara ? ` · ${r.cara}` : ''}`, 'info', 6000);
    });
  } else if (act.dataset.act === 'text') {
    sendCardText(cardTarget(), { fromTap: true }).then((r) => { if (r.error) toast(r.error, 'warn'); });
  }
});

// Buka rencana: nomor, atau kata kunci / isi. Hasilnya dipakai Gaby untuk menjawab.
function openPlan({ nomor, kata_kunci }) {
  if (!memory.listPlans().length) return { kosong: true, catatan: 'Belum ada rencana tersimpan. Tawarkan untuk membuatkan.' };
  let found = nomor ? [memory.getPlan(nomor)].filter(Boolean) : memory.findPlans(kata_kunci || '');
  if (!found.length && nomor) return { error: `Rencana #${nomor} tidak ada.`, rencana_tersimpan: memory.listPlans().map((p) => `#${p.no} ${p.title}`) };
  if (!found.length) return { ketemu: false, rencana_tersimpan: memory.listPlans().map((p) => `#${p.no} ${p.title}`), catatan: 'Tidak ada yang cocok. Sebutkan daftar ini singkat lalu tanya yang mana.' };
  if (found.length > 1) {
    return { perlu_pilih: true, pilihan: found.slice(0, 5).map((p) => `#${p.no} ${p.title} (${fmtDay(p.created)})`), catatan: 'Ada beberapa yang cocok. Tanya pengguna yang mana (sebut nomornya).' };
  }
  showPlanCard(found[0].no);
  const s = planSummary(found[0]);
  delete s._utama;
  return { ...s, catatan: 'Kartu Rencana sudah tampil. Jawab pertanyaan pengguna HANYA dari data ini, singkat.' };
}

function listPlansTool() {
  const plans = memory.listPlans();
  if (!plans.length) return { jumlah: 0, catatan: 'Belum ada rencana tersimpan.' };
  const newest = plans.slice().reverse();
  const out = { jumlah: plans.length, rencana: newest.slice(0, plans.length > 5 ? 5 : plans.length).map((p) => `#${p.no} ${p.title}`) };
  if (plans.length > 5) {
    showPlanList();
    out.catatan = `Sebut jumlahnya, lalu 5 terbaru saja; sisanya ada di Kartu Daftar Rencana yang sudah tampil.`;
  } else {
    out.catatan = 'Sebut jumlahnya dan semua rencana singkat (nomor + judul).';
  }
  return out;
}

function comparePlans({ nomor }) {
  const nums = [...new Set((Array.isArray(nomor) ? nomor : [nomor]).map(Number).filter(Boolean))];
  if (nums.length < 2) return { error: 'Sebutkan minimal 2 nomor rencana untuk dibandingkan.' };
  if (nums.length > 3) return { error: 'Maksimal 3 rencana sekaligus. Tanya pengguna mau yang mana saja.' };
  const plans = nums.map((n) => memory.getPlan(n));
  const missing = nums.filter((n, i) => !plans[i]);
  if (missing.length) return { error: `Rencana ${missing.map((n) => `#${n}`).join(', ')} tidak ada.`, rencana_tersimpan: memory.listPlans().map((p) => `#${p.no} ${p.title}`) };
  showCompareCard(plans);
  const prefs = memory.get().profile.filter((m) => m.rasa || m.cat === 'keuangan').slice(-12).map((m) => `${m.rasa === 'suka' ? '👍' : m.rasa === 'tidak' ? '👎' : '💰'} ${m.text}`);
  return {
    rencana: plans.map((p) => { const s = planSummary(p); delete s._utama; return s; }),
    kesukaan_pengguna: prefs,
    catatan: 'Kartu Perbandingan sudah tampil. Simpulkan SINGKAT (2–3 kalimat): beda biaya, beda utama (misal lokasi hotel), lalu beri saran sesuai kesukaan/keuangan pengguna. Hanya dari data ini.',
  };
}

// Hapus rencana: langsung, dengan tombol "Batalkan" selama 1 menit (berjaga kalau salah dengar).
let lastDeletion = null;
function deletePlans({ nomor, semua }) {
  const all = memory.listPlans();
  if (!all.length) return { ok: true, dihapus: [], catatan: 'Belum ada rencana tersimpan.' };
  let snapshot;
  if (semua) {
    snapshot = memory.removeAllPlans();
  } else {
    const nums = (Array.isArray(nomor) ? nomor : [nomor]).map(Number).filter((n) => memory.getPlan(n));
    if (!nums.length) return { error: `Rencana ${[].concat(nomor).map((n) => `#${n}`).join(', ')} tidak ada.`, rencana_tersimpan: all.map((p) => `#${p.no} ${p.title}`) };
    snapshot = memory.removePlans(nums);
  }
  const card = $('plancard');
  if (!card.hidden) {
    const shown = Number($('plan-body').dataset.no || 0);
    if (card.dataset.kind !== 'rencana' || snapshot.removed.some((p) => p.no === shown)) hidePlanCard();
  }
  lastDeletion = { snapshot, at: Date.now() };
  document.querySelectorAll('.toast.undo').forEach((t) => t.remove());
  const label = semua ? 'Semua rencana dihapus' : `${snapshot.removed.map((p) => `Rencana #${p.no}`).join(', ')} dihapus`;
  const el = toast(`🗑️ ${label}`, 'info undo', 60000);
  const b = document.createElement('a');
  b.href = '#';
  b.textContent = '↩️ Batalkan';
  b.onclick = (e) => { e.preventDefault(); const r = undoDelete(); toast(r.error || `↩️ ${r.dikembalikan} rencana dikembalikan`, r.error ? 'warn' : 'info'); };
  el.appendChild(b);
  fillSettings();
  return {
    ok: true,
    dihapus: snapshot.removed.map((p) => `#${p.no} ${p.title}`),
    nomor_berikutnya: memory.get().nextPlanNo,
    catatan: 'Sudah dihapus (bisa dibatalkan 1 menit dengan "batal"). Jawab singkat. Kalau pengguna menyebut alasan tidak suka (misal "hotelnya jelek"), simpan dengan ingat (rasa tidak_suka).',
  };
}

function undoDelete() {
  if (!lastDeletion || Date.now() - lastDeletion.at > 60000) return { error: 'Tidak ada penghapusan yang bisa dibatalkan (batasnya 1 menit).' };
  const n = memory.restorePlans(lastDeletion.snapshot);
  lastDeletion = null;
  document.querySelectorAll('.toast.undo').forEach((t) => t.remove());
  fillSettings();
  return { ok: true, dikembalikan: n, rencana: memory.listPlans().map((p) => `#${p.no} ${p.title}`) };
}

// Checklist → catatan/to-do; pengingat usulan (tanggal masa depan) → pengingat sungguhan.
function planToTodos(no) {
  const p = memory.getPlan(no);
  if (!p) return { error: `Rencana #${no} tidak ada.` };
  if (p.addedToTodos) return { ok: true, sudah: true, pesan: `Rencana #${no} sudah pernah dimasukkan ke catatan.`, catatan: 'Bilang singkat bahwa ini sudah pernah dimasukkan.' };
  const d = p.data || {};
  let todos = 0;
  let reminders = 0;
  const skipped = [];
  for (const item of d.checklist || []) if (memory.addTodo(`${item} (rencana #${no})`)) todos++;
  for (const r of d.pengingat || []) {
    const due = new Date(`${r.tanggal}T${(r.jam || '09:00').padStart(5, '0')}:00`).getTime();
    if (!isFinite(due) || due <= Date.now()) { skipped.push(r.pesan); continue; }
    const text = `${r.pesan} (rencana #${no})`;
    const t = memory.addTodo(text);
    const rem = memory.addReminder(text, due, t ? t.id : null);
    if (t) memory.linkTodoReminder(t.id, rem.id);
    reminders++;
  }
  p.addedToTodos = true;
  memory.updatePlan(p);
  renderTodosIfOpen();
  fillSettings();
  syncNative();
  return {
    ok: true,
    catatan_ditambah: todos,
    pengingat_dipasang: reminders,
    dilewati: skipped,
    pesan: `📝 ${todos} catatan & ⏰ ${reminders} pengingat dari Rencana #${no} ditambahkan`,
    catatan: `Bilang singkat hasilnya.${reminders && !isNativeApp ? ' Ingatkan bahwa di browser pengingat hanya berbunyi saat Gaby terbuka.' : ''}${skipped.length ? ' Beberapa pengingat dilewati karena tanggalnya sudah lewat.' : ''}`,
  };
}

function renderTodosIfOpen() {
  if (!$('todocard').hidden) renderTodos();
}

// Pengaturan → 🗺️ Rencana tersimpan.
function fillPlans() {
  const box = $('set-plans');
  const plans = memory.listPlans().slice().reverse();
  box.innerHTML = plans.length
    ? plans.map((p) => `<div class="plan-row"><span><b>#${p.no}</b> ${esc(p.title)}</span><small>${fmtDay(p.created)}</small><button data-open="${p.no}" title="Buka">📂</button><button data-del="${p.no}" title="Hapus">🗑️</button></div>`).join('')
    : '<p class="hint">Belum ada rencana.</p>';
  $('set-plans-delall').hidden = !plans.length;
}
$('set-plans').addEventListener('click', (e) => {
  const o = e.target.closest('[data-open]');
  if (o) { $('settings').hidden = true; showPlanCard(Number(o.dataset.open)); return; }
  const d = e.target.closest('[data-del]');
  if (d) deletePlans({ nomor: Number(d.dataset.del) });
});
$('set-plans-delall').addEventListener('click', () => deletePlans({ semua: true }));

// ---------- Musik ----------

const MUSIC = {
  ytmusic: { ...APPS.youtube_music, watch: (id) => `https://music.youtube.com/watch?v=${id}` },
  youtube: { ...APPS.youtube, watch: (id) => `https://www.youtube.com/watch?v=${id}` },
  spotify: { ...APPS.spotify },
};

const isAndroid = () => /Android/i.test(navigator.userAgent);
const isPhone = () => isAndroid() || isApple();

// Android: tautan "intent" langsung membuka aplikasinya (akun Premium-mu);
// kalau aplikasinya tidak ada, jatuh ke versi web.
function androidIntent(url, pkg) {
  return `intent://${url.replace(/^https:\/\//, '')}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${encodeURIComponent(url)};end`;
}
const PIPED = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de'];

// Cari ID lagu lewat layanan pencarian YouTube publik (Piped) supaya lagu langsung diputar.
// Kalau layanan itu tidak bisa dihubungi, cukup buka halaman pencarian.
async function findSongId(q) {
  for (const base of PIPED) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=music_songs`, { signal: ctrl.signal });
      clearTimeout(timer);
      const data = await res.json();
      const hit = (data.items || []).find((x) => /\/watch\?v=/.test(x.url || ''));
      if (hit) return { id: hit.url.split('v=')[1].split('&')[0], title: hit.title, by: hit.uploaderName };
    } catch {}
  }
  return null;
}

// Di HP: satu tombol besar (aplikasinya terbuka kalau terpasang, versi web kalau tidak).
// Di komputer: langsung dibuka di tab baru.
function launchLink(phoneUrl, webUrl, label) {
  if (isNativeApp) return openExternal(webUrl, label);
  if (isPhone()) {
    bigButton(phoneUrl, label, { sameTab: true });
    return { ok: true, catatan: 'Tombol besar sudah tampil. Minta pengguna mengetuknya sekali; aplikasinya terbuka kalau terpasang, kalau tidak versi web.' };
  }
  return openExternal(webUrl, label);
}

// Cari nomor/email dari ingatan kategori Kontak ("Joni: 0812…").
function findContact(name) {
  const n = String(name).toLowerCase().trim();
  const fact = memory.get().profile.find((m) => m.cat === 'kontak' && m.text.toLowerCase().includes(n));
  if (!fact) return null;
  return {
    phone: (fact.text.match(/\+?\d[\d\s-]{6,}\d/) || [])[0],
    email: (fact.text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0],
  };
}

function openApp(args) {
  const app = APPS[args.aplikasi];
  if (!app) return { error: 'Aplikasi tidak dikenal' };
  let contact = null;
  if (args.kontak && !args.nomor && !args.email) {
    contact = findContact(args.kontak);
    if (!contact) return { error: `Belum ada nomor/email "${args.kontak}" di ingatan. Tanyakan ke pengguna, lalu simpan dengan alat ingat kategori kontak (misal "Joni: 0812…").` };
  }
  const link = buildAppLink(args.aplikasi, {
    cari: args.cari,
    nomor: args.nomor || (contact && contact.phone),
    email: args.email || (contact && contact.email),
    pesan: args.pesan,
    subjek: args.subjek,
  });
  if (!link || link.error) return { error: (link && link.error) || 'Tautan tidak bisa dibuat' };
  const res = launchLink(link.url, link.web, `↗ Buka ${app.name}`);
  if (args.pesan && ['whatsapp', 'email', 'sms'].includes(args.aplikasi)) {
    res.catatan = `${res.catatan || ''} Pesan sudah terisi; pengguna perlu menekan kirim sendiri.`.trim();
  }
  return { ...res, aplikasi: app.name };
}

async function playMusic(q) {
  const app = MUSIC[memory.get().settings.musicApp] || MUSIC.ytmusic;
  const song = app.watch ? await findSongId(q) : null;
  const url = song ? app.watch(song.id) : app.search(q);
  const res = launchLink(isAndroid() ? androidIntent(url, app.pkg) : url, url, `🎵 Putar di ${app.name}`);
  return {
    ...res,
    aplikasi: app.name,
    lagu: song ? `${song.title}${song.by ? ` — ${song.by}` : ''}` : null,
    info: song ? 'Lagu langsung diputar.' : 'Membuka hasil pencarian; pengguna memilih lagunya.',
  };
}

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
  fitCamBox();
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
  if (aksi === 'foto') {
    // Satu gambar tajam (resolusi tinggi) untuk membaca tulisan kecil.
    if (!camera.active) {
      const res = await openCamera('kamera');
      if (!res.ok) return res;
      await new Promise((r) => setTimeout(r, 900)); // beri waktu kamera fokus
    }
    const f = camera.frame(1600, 0.92);
    if (!f) return { error: 'Belum ada gambar dari kamera' };
    brain.sendImage(f);
    return { ok: true, catatan: 'Gambar tajam terkirim. Baca tulisannya dengan teliti; kalau ada angka, hitung dengan cermat dan sebutkan rinciannya singkat.' };
  }
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

let pendingImage = null;   // gambar yang sedang tampil, belum disimpan
let previewUrl = null;

const imgSrc = (it) => (it.blob ? URL.createObjectURL(it.blob) : it.url);

// Ingatan yang mungkin relevan untuk gambar ("kucingku", "aku", "istriku"), untuk Lukas.
function imageHints(request) {
  const { laci, cocok } = memory.recall(request);
  const lines = [...Object.values(laci).flat(), ...cocok];
  if (/\b(aku|saya|gue|gw|diriku|wajahku|fotoku)\b/i.test(request)) {
    for (const m of memory.get().profile.filter((x) => x.cat === 'diri')) lines.push(m.text);
  }
  return [...new Set(lines)].slice(0, 12);
}

// Perkecil gambar untuk dicek Vera (hemat kuota & lebih cepat): JPEG maks 768 px.
async function shrinkForCheck(blob, fallbackB64) {
  try {
    if (!blob) return fallbackB64 ? { base64: fallbackB64, mime: 'image/png' } : null;
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 768 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return { base64: c.toDataURL('image/jpeg', 0.82).split(',')[1], mime: 'image/jpeg' };
  } catch {
    return fallbackB64 ? { base64: fallbackB64, mime: blob?.type || 'image/png' } : null;
  }
}

// draft: perintah singkat dari Gaby. opts: { request (kata-kata pengguna), shape, change, previous, reuse }.
// Alur: Lukas menulis perintah → menggambar → Vera mengecek → (kurang? Lukas memperbaiki sekali → Vera cek ulang).
// Kalau Lukas gagal menulis, draf Gaby tetap dipakai. Semua tampil di papan kerja tim.
async function makeImage(draft, useCam, { request = '', shape = '', change = '', previous = '', reuse = false } = {}) {
  const st = memory.get();
  const photo = useCam ? camera.frame(1024, 0.85) : null;
  if (useCam && !photo) return { error: 'Kamera belum menyala. Minta pengguna menyalakan kamera dulu.' };
  painting++;
  visual.painting = true;
  const veraOn = st.settings.veraImage !== false;
  const job = startJob('lukas', 'Menulis perintah gambar…', {
    steps: [reuse ? 'Lukas memakai perintah yang sama' : 'Lukas menulis perintah', 'Lukas menggambar', ...(veraOn ? ['Vera mengecek gambar'] : [])],
  });
  let engine = st.settings.imageEngine === 'google' ? 'google' : 'gratis';
  let switched = '';
  let prompt = draft;
  let lukas = false;
  request = String(request || '').trim() || draft;
  const keys = { gemini: st.keys.gemini, groq: st.keys.groq };

  const write = async (opts) => {
    const w = await writeImagePrompt(keys, { request, draft, hints: imageHints(request), photo, engine, shape, ...opts });
    try { localStorage.setItem('gaby.lukasModel', w.model); } catch {}
    return w;
  };
  const draw = async (p) => {
    if (engine === 'google') {
      try {
        if (!st.keys.gemini) throw Object.assign(new Error('Belum ada key Gemini'), { kind: 'key' });
        return await generateImage(st.keys.gemini, p, photo, shape);
      } catch (e) {
        if (e.kind === 'ditolak') throw e;
        // Billing belum aktif / kuota habis: tetap buatkan gambar dengan mesin gratis.
        switched = e.pesan || e.message;
        toast(`🎨 Google: ${switched} Pakai mesin gratis…`, 'warn', 8000);
        engine = 'gratis';
      }
    }
    return generateFree(p, st.keys.pollinations, shape);
  };

  try {
    job.step(0, reuse ? 'Memakai perintah yang sama…' : 'Menulis perintah gambar…');
    if (!reuse && (keys.gemini || keys.groq)) {
      try {
        const w = await write({ previous, change });
        prompt = w.prompt;
        shape = w.bentuk;
        lukas = true;
      } catch (e) {
        console.warn('[Gaby] Lukas gagal menulis perintah, pakai draf Gaby:', e.message);
      }
    }
    if (!shape) shape = 'persegi';
    job.step(1, 'Menggambar…');
    let out = await draw(prompt);

    // Vera mengecek; kalau ada hal penting yang kurang, Lukas memperbaiki sekali.
    let check = null;
    if (veraOn) {
      job.pass('vera');
      job.step(2, 'Mengecek gambar…');
      check = await checkImage({ request, image: await shrinkForCheck(out.blob, out.base64) });
      if (check.checked && !check.pass) {
        const iFix = job.addStep('Lukas memperbaiki');
        job.addStep('Vera mengecek ulang');
        job.pass('lukas');
        job.step(iFix, `Memperbaiki: ${check.missing.join(', ')}…`);
        let fixed = `${prompt} Important: ${check.fix}`;
        if (keys.gemini || keys.groq) {
          try { fixed = (await write({ previous: prompt, change: check.fix })).prompt; } catch { /* pakai perintah + catatan Vera */ }
        }
        const out2 = await draw(fixed);
        job.pass('vera');
        job.step(iFix + 1, 'Mengecek ulang…');
        const check2 = await checkImage({ request, image: await shrinkForCheck(out2.blob, out2.base64) });
        // Pakai hasil perbaikan kecuali Vera menilainya lebih buruk.
        const score = (c) => (c && c.checked ? c.items.filter((x) => x.ada).length / c.items.length : 0);
        if (!check2.checked || score(check2) >= score(check)) { out = out2; prompt = fixed; check = check2; }
      }
    }

    pendingImage = { blob: out.blob, url: out.url || null, prompt, request, useCam, engine, shape, badge: check ? check.badge : '' };
    showPreview();
    job.done(check ? check.badge : 'Selesai');
    if (out.base64) brain.sendImage(out.base64, out.blob ? out.blob.type : 'image/png'); // supaya Gaby bisa melihat hasilnya
    const notes = ['Gambar sudah tampil di layar (Kartu Gambar). Komentari singkat, lalu tanya mau disimpan, diulang, atau dibuang. Kalau pengguna ingin ada yang diubah, pakai gambar_aksi ulang dengan isi perubahan.'];
    if (!lukas && !reuse) {
      notes.push(keys.groq || keys.gemini
        ? 'Lukas lagi kehabisan jatah, jadi perintah gambarnya memakai draf darimu (sebut singkat saja).'
        : 'Lukas belum bisa dimintai tolong karena kunci Groq belum diisi di Pengaturan; perintah gambarnya memakai draf darimu (sebut singkat sekali saja per obrolan).');
    }
    if (veraOn && check && !check.checked && !keys.groq) {
      notes.push('Vera belum bisa mengecek gambar karena kunci Groq belum diisi (sebut singkat sekali saja per obrolan).');
    }
    if (check && check.checked) {
      notes.push(check.pass
        ? 'Vera sudah mengecek: semua yang diminta ada. Boleh sebut singkat "sudah dicek Vera".'
        : `Vera mencatat masih kurang: ${check.missing.join(', ')}. Bilang jujur singkat dan tawarkan ulang dengan perubahan.`);
    }
    if (engine === 'gratis' && useCam) notes.push('Ini gambar ulang yang mirip dari deskripsi, bukan edit foto asli.');
    if (switched) notes.push(`Mesin Google gagal (${switched}), jadi memakai mesin gratis.`);
    if (!out.base64) notes.push('Kamu tidak bisa melihat hasil gambarnya, jadi jangan mendeskripsikannya secara detail.');
    return { ok: true, mesin: engine, ditulis_lukas: lukas, bentuk: shape, cek_vera: check ? check.badge : 'tidak dicek', catatan: notes.join(' ') };
  } catch (e) {
    job.fail(e.pesan || e.message || 'Gagal menggambar');
    toast(`🎨 ${e.pesan || e.message}`, 'err', 12000);
    return { error: e.pesan || e.message, jenis: e.kind || 'lain' };
  } finally {
    painting--;
    visual.painting = painting > 0;
    touch();
  }
}

function showPreview() {
  if (!pendingImage) return;
  hideCards('image');
  if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  previewUrl = imgSrc(pendingImage);
  $('preview-img').src = previewUrl;
  $('preview-tag').textContent = pendingImage.engine === 'google' ? 'GOOGLE' : 'GRATIS';
  $('preview-vera').textContent = pendingImage.badge || '';
  $('preview').hidden = false;
  $('preview').classList.remove('show');
  requestAnimationFrame(() => $('preview').classList.add('show'));
}

function hidePreview() {
  $('preview').hidden = true;
  $('preview').classList.remove('show');
}

async function imageAction(aksi, change = '') {
  if (!pendingImage) return { error: 'Tidak ada gambar yang sedang tampil' };
  if (aksi === 'simpan') {
    // Keterangan di galeri: kata-kata pengguna (bahasa Indonesia), bukan perintah bahasa Inggris Lukas.
    await gallery.add(pendingImage.blob, pendingImage.request || pendingImage.prompt, pendingImage.blob ? null : pendingImage.url);
    pendingImage = null;
    hidePreview();
    toast('💾 Tersimpan di galeri (kanan bawah)');
    return { ok: true };
  }
  if (aksi === 'buang') {
    pendingImage = null;
    hidePreview();
    return { ok: true };
  }
  if (aksi === 'ulang') {
    const { prompt, useCam, request, shape } = pendingImage;
    change = String(change || '').trim();
    hidePreview();
    // Tanpa perubahan: gambar lagi dengan perintah yang sama (versi lain).
    // Dengan perubahan: Lukas memperbaiki perintah sebelumnya.
    return change
      ? makeImage(prompt, useCam, { request: `${request} (perubahan: ${change})`, shape, change, previous: prompt })
      : makeImage(prompt, useCam, { request, shape, reuse: true });
  }
  return { error: 'Aksi tidak dikenal' };
}

$('preview-save').addEventListener('click', () => imageAction('simpan'));
$('preview-discard').addEventListener('click', () => imageAction('buang'));
$('preview-redo').addEventListener('click', () => imageAction('ulang'));

let viewerUrl = null;
let viewerItem = null;

async function showViewer(item) {
  const list = await gallery.list();
  if (!list.length) { toast('Belum ada gambar. Coba bilang "Gaby, gambarin kucing astronot".'); return; }
  viewerItem = list.find((x) => x.id === item?.id) || list[0];
  if (viewerUrl && viewerUrl.startsWith('blob:')) URL.revokeObjectURL(viewerUrl);
  viewerUrl = imgSrc(viewerItem);
  $('viewer-img').src = viewerUrl;
  $('viewer-cap').textContent = viewerItem.prompt || '';
  const ext = ((viewerItem.blob && viewerItem.blob.type.split('/')[1]) || 'jpg').replace('jpeg', 'jpg');
  $('viewer-save').href = viewerUrl;
  $('viewer-save').target = viewerItem.blob ? '' : '_blank'; // gambar dari alamat luar: buka di tab baru
  $('viewer-save').download = `gaby-${viewerItem.id}.${ext}`;
  const strip = $('viewer-strip');
  strip.querySelectorAll('img').forEach((im) => im.src.startsWith('blob:') && URL.revokeObjectURL(im.src));
  strip.innerHTML = '';
  for (const it of list) {
    const im = document.createElement('img');
    im.src = imgSrc(it);
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
// APK: tautan unduh biasa tidak jalan di WebView Android → pakai menu Bagikan (bisa "Simpan ke Galeri").
$('viewer-save').addEventListener('click', async (e) => {
  if (!isNativeApp || !viewerItem || !viewerItem.blob) return;
  e.preventDefault();
  if (!nativeShareAvailable()) { toast('Untuk menyimpan ke HP, update aplikasi Android dulu (Pengaturan → Fitur → Cek update aplikasi).', 'warn', 8000); return; }
  await nativeShareFile(await blobToB64(viewerItem.blob), $('viewer-save').download || 'gaby.png', { title: 'Gambar dari Gaby' });
});

$('viewer-share').addEventListener('click', async () => {
  if (!viewerItem) return;
  // APK: menu Bagikan Android asli (WebView tidak mendukung menu Bagikan dari halaman web).
  if (isNativeApp && viewerItem.blob && nativeShareAvailable()) {
    const res = await nativeShareFile(await blobToB64(viewerItem.blob), $('viewer-save').download || 'gaby.png', { title: 'Gambar dari Gaby' });
    if (res === 'ok' || res === 'batal') return;
  }
  if (!viewerItem.blob) {
    if (navigator.share) navigator.share({ url: viewerItem.url, title: 'Gambar dari Gaby' }).catch(() => {});
    else window.open(viewerItem.url, '_blank', 'noopener');
    return;
  }
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

// Laci ingatan baru (v1.15): pilah ulang ingatan lama dengan AI sekali, diam-diam di belakang.
if (memory.get().needResort) {
  setTimeout(() => tidyProfile().then(() => fillSettings()).catch(() => {}), 20000);
}

// Akses untuk debugging di konsol browser.
window.gaby = { audio, visual, brain, memory, setMood };
