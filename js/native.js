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

const KEY = 'gaby.nativeReminders'; // { reminderId: notificationId }

function loadMap() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function saveMap(m) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}

// ID notifikasi harus angka; dibuat dari ID pengingat.
function numericId(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2000000000 || 1;
}

let permissionAsked = false;

// Samakan notifikasi terjadwal di HP dengan daftar pengingat Gaby:
// pengingat baru dijadwalkan, yang selesai/dihapus dibatalkan.
// Dijalankan antre supaya dua panggilan bersamaan tidak menjadwalkan dua kali.
let queue = Promise.resolve();
export function syncNativeReminders(reminders, nickname) {
  if (!isNativeApp) return Promise.resolve();
  queue = queue.then(() => doSync(reminders, nickname)).catch(() => {});
  return queue;
}

async function doSync(reminders, nickname) {
  const map = loadMap();
  const pending = reminders.filter((r) => !r.done && r.due > Date.now());
  const keep = new Set(pending.map((r) => r.id));

  const cancel = Object.entries(map).filter(([rid]) => !keep.has(rid));
  if (cancel.length) {
    try { await call('LocalNotifications', 'cancel', { notifications: cancel.map(([, nid]) => ({ id: nid })) }); } catch {}
    for (const [rid] of cancel) delete map[rid];
  }

  const fresh = pending.filter((r) => !map[r.id]);
  if (fresh.length) {
    try {
      if (!permissionAsked) {
        permissionAsked = true;
        await call('LocalNotifications', 'requestPermissions');
      }
      await call('LocalNotifications', 'schedule', {
        notifications: fresh.map((r) => ({
          id: numericId(r.id),
          title: 'Gaby mengingatkan',
          body: nickname ? `${nickname}, waktunya: ${r.text}` : r.text,
          schedule: { at: new Date(r.due).toISOString(), allowWhileIdle: true },
          smallIcon: 'ic_stat_gaby',
        })),
      });
      for (const r of fresh) map[r.id] = numericId(r.id);
    } catch (e) {
      console.warn('[Gaby] notifikasi gagal dijadwalkan:', e && e.message);
    }
  }
  saveMap(map);
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
