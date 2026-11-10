// Jalur kabar ke Ruang Kerja (js/office.js). Selalu dimuat tapi sangat ringan:
// aplikasi mengabarkan kejadian di sini, Ruang Kerja (kalau sedang dibuka) menganimasikannya.
// Kejadian:
//   'gaby'     → status Gaby: 'sleep' | 'connecting' | 'listening' | 'thinking' | 'speaking'
//   'say'      → { who: 'gaby' | 'user', text } (potongan ucapan) atau { who, end: true }
//   'tool'     → { name, args } saat Gaby memakai alat; 'toolDone' → { name, args, result }
//   'job'      → { id, kind: 'start' | 'pass' | 'progress' | 'steps' | 'step' | 'wait' | 'end', who, text, frac, ok, paused } dari papan kerja

const listeners = new Set();

// Keadaan terakhir, supaya Ruang Kerja yang baru dibuka langsung tahu siapa sedang bekerja.
export const officeState = { gaby: 'sleep', jobs: new Map() };

export function officeEmit(type, data) {
  if (type === 'gaby') officeState.gaby = data;
  if (type === 'job') {
    if (data.kind === 'start') officeState.jobs.set(data.id, { who: data.who, owner: data.who, text: data.text });
    else if (data.kind === 'pass' && officeState.jobs.has(data.id)) officeState.jobs.get(data.id).who = data.who;
    else if (data.kind === 'end') officeState.jobs.delete(data.id);
  }
  for (const f of listeners) {
    try { f(type, data); } catch (e) { console.warn('[Gaby] Ruang Kerja:', e); }
  }
}

export function officeListen(f) {
  listeners.add(f);
  return () => listeners.delete(f);
}
