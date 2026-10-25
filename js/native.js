// Kemampuan Android asli saat Gaby berjalan di dalam APK (Capacitor).
// Di browser biasa semua fungsi di sini diam saja, jadi Gaby tetap bekerja seperti biasa.

const cap = window.Capacitor;
export const isNativeApp = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

function call(plugin, method, options = {}) {
  return cap.nativePromise(plugin, method, options);
}

// Buka aplikasi lain / tautan langsung (tanpa ketukan). Android memilih aplikasinya
// sendiri: kalau aplikasi yang cocok terpasang, aplikasi itu yang terbuka.
export async function nativeOpen(url) {
  if (!isNativeApp) return false;
  try {
    const res = await call('AppLauncher', 'openUrl', { url });
    return res ? res.completed !== false : true;
  } catch {
    return false;
  }
}

// ---------- Notifikasi pengingat asli ----------

const KEY = 'gaby.nativeReminders'; // { reminderId: { n: notificationId, due } }
const CHANNEL = 'gaby-pengingat';

function loadMap() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function saveMap(m) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}
// Data lama menyimpan angkanya saja.
const nidOf = (v) => (typeof v === 'object' && v ? v.n : v);

// ID notifikasi harus angka; dibuat dari ID pengingat.
function numericId(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2000000000 || 1;
}

let permissionAsked = false;
let channelReady = false;

// Saluran "Pengingat Gaby": prioritas tinggi (muncul & berbunyi di layar kunci, bergetar)
// dengan nada notifikasi bawaan HP. Nadanya bisa diganti di Pengaturan Android.
async function ensureChannel() {
  if (channelReady) return;
  channelReady = true;
  try {
    await call('LocalNotifications', 'createChannel', {
      id: CHANNEL,
      name: 'Pengingat Gaby',
      description: 'Bunyi pengingat yang kamu minta ke Gaby',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#8A7CFF',
    });
  } catch {}
}

// Apakah pengingat ini sudah dijadwalkan sebagai notifikasi HP (yang akan berbunyi sendiri)?
export function nativeReminderScheduled(id) {
  return isNativeApp && !!loadMap()[id];
}

// Samakan notifikasi terjadwal di HP dengan daftar pengingat Gaby:
// pengingat baru dijadwalkan; yang dihapus atau diselesaikan SEBELUM waktunya dibatalkan.
// Pengingat yang sudah tiba waktunya dibiarkan, supaya notifikasinya tetap berbunyi.
// Dijalankan antre supaya dua panggilan bersamaan tidak menjadwalkan dua kali.
let queue = Promise.resolve();
export function syncNativeReminders(reminders, nickname) {
  if (!isNativeApp) return Promise.resolve();
  queue = queue.then(() => doSync(reminders, nickname)).catch(() => {});
  return queue;
}

async function doSync(reminders, nickname) {
  const map = loadMap();
  const now = Date.now();
  const byId = new Map(reminders.map((r) => [r.id, r]));

  const cancel = [];
  for (const [rid, v] of Object.entries(map)) {
    const r = byId.get(rid);
    const due = r ? r.due : (v && v.due) || 0;
    if (due && due <= now) {
      // Sudah waktunya: jangan dibatalkan. Hapus dari daftar setelah sehari.
      if (now - due > 86400000) delete map[rid];
      continue;
    }
    if (!r || r.done) cancel.push(rid);
  }
  if (cancel.length) {
    try { await call('LocalNotifications', 'cancel', { notifications: cancel.map((rid) => ({ id: nidOf(map[rid]) })) }); } catch {}
    for (const rid of cancel) delete map[rid];
  }

  const fresh = reminders.filter((r) => !r.done && r.due > now && !map[r.id]);
  if (fresh.length) {
    try {
      if (!permissionAsked) {
        permissionAsked = true;
        await call('LocalNotifications', 'requestPermissions');
      }
      await ensureChannel();
      await call('LocalNotifications', 'schedule', {
        notifications: fresh.map((r) => ({
          id: numericId(r.id),
          title: 'Gaby mengingatkan',
          body: nickname ? `${nickname}, waktunya: ${r.text}` : r.text,
          schedule: { at: new Date(r.due).toISOString(), allowWhileIdle: true },
          channelId: CHANNEL,
          smallIcon: 'ic_stat_gaby',
        })),
      });
      for (const r of fresh) map[r.id] = { n: numericId(r.id), due: r.due };
    } catch (e) {
      console.warn('[Gaby] notifikasi gagal dijadwalkan:', e && e.message);
    }
  }
  saveMap(map);
}

// ---------- Alarm di aplikasi Jam & pengaturan HP ----------
// Butuh APK versi baru (plugin GabyAlarm). Di APK lama fungsi ini mengembalikan false.

export const nativeAlarmAvailable = () =>
  isNativeApp && typeof cap.isPluginAvailable === 'function' && cap.isPluginAvailable('GabyAlarm');

// days: 1=Minggu, 2=Senin, ... 7=Sabtu (format Android).
export async function setNativeAlarm({ hour, minute, message, days = [] }) {
  if (!nativeAlarmAvailable()) return { ok: false, reason: 'old_apk' };
  try {
    await call('GabyAlarm', 'setAlarm', { hour, minute, message, days, skipUi: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'no_clock', message: e && e.message };
  }
}

export async function reminderHealth() {
  if (!nativeAlarmAvailable()) return null;
  try { return await call('GabyAlarm', 'status'); } catch { return null; }
}

export function openPhoneSetting(which) {
  if (!nativeAlarmAvailable()) return Promise.resolve(false);
  const method = {
    notif: 'openNotificationSettings',
    battery: 'requestBatteryExemption',
    exact: 'openExactAlarmSettings',
    app: 'openAppSettings',
  }[which] || 'openAppSettings';
  return call('GabyAlarm', method).then(() => true, () => false);
}

// ---------- Pemberitahuan update APK ----------

const RELEASE_API = 'https://api.github.com/repos/hendrikkumala/gaby/releases/tags/apk-terbaru';
export const APK_URL = 'https://github.com/hendrikkumala/gaby/releases/download/apk-terbaru/Gaby.apk';

// Versi APK yang terpasang (nomor perakitan), misal { version: '1.0.5', build: 5 }.
export async function installedApk() {
  if (!isNativeApp) return null;
  try {
    const info = await call('App', 'getInfo');
    return { version: info.version, build: parseInt(info.build, 10) || 0 };
  } catch {
    return null;
  }
}

// Bandingkan dengan APK terbaru di GitHub Releases ("Gaby APK (perakitan #N)").
// Mengembalikan { installed, latest } kalau ada yang lebih baru, selain itu null.
export async function checkApkUpdate() {
  const installed = await installedApk();
  if (!installed) return null;
  const res = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) return null;
  const rel = await res.json();
  const latest = parseInt(((rel.name || '').match(/#(\d+)/) || [])[1], 10);
  if (!latest || latest <= installed.build) return null;
  return { installed, latest: { build: latest, version: `1.0.${latest}` } };
}
