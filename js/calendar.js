// Simpan pengingat ke kalender HP supaya tetap berbunyi walau Gaby ditutup.

const pad = (n) => String(n).padStart(2, '0');

// Format waktu UTC untuk kalender: 20261024T064700Z
function utc(t) {
  const d = new Date(t);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');

export const isApple = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Tautan Google Calendar (Android & komputer).
export function googleCalendarUrl(text, due) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `⏰ ${text}`,
    dates: `${utc(due)}/${utc(due + 15 * 60000)}`,
    details: 'Pengingat dari Gaby',
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// File .ics dengan alarm tepat waktu (iPhone membukanya langsung di Kalender).
export function icsUrl(id, text, due) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gabriella//Gaby//ID',
    'BEGIN:VEVENT',
    `UID:${id}-${due}@gaby`,
    `DTSTAMP:${utc(Date.now())}`,
    `DTSTART:${utc(due)}`,
    `DTEND:${utc(due + 15 * 60000)}`,
    `SUMMARY:${esc('⏰ ' + text)}`,
    'DESCRIPTION:Pengingat dari Gaby',
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(text)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
