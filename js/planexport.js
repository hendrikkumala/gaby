// Isi rencana Pandu dalam bentuk bagian-bagian (satu sumber untuk kartu di layar, PDF yang
// disimpan ke HP (planpdf.js), teks untuk dikirim lewat WhatsApp/Catatan, dan bacaan Vera).

export const JENIS = {
  perjalanan: '✈️ Perjalanan',
  proyek: '📱 Proyek',
  acara: '🎉 Acara',
  belajar: '📚 Belajar',
  kesehatan: '🏃 Kesehatan',
  belanja: '🛒 Belanja',
  lainnya: '🗺️ Rencana',
};

export const fmtRp = (n) => (n ? `Rp${Number(n).toLocaleString('id-ID')}` : '–');
const TIER = { hemat: '💸 Hemat', seimbang: '⚖️ Seimbang', nyaman: '🛋️ Nyaman' };
// "💸 Hemat — AirAsia …" dan tanda ✅ untuk pilihan yang dipakai di total biaya.
const tierText = (x, body) => `${x.dipilih ? '✅ ' : ''}${x.kelas ? `${TIER[x.kelas]} — ` : ''}${body}`;
const chosen = (list) => (list || []).find((x) => x.dipilih);
const join = (parts) => parts.filter((x) => x != null && String(x).trim()).join(' · ');

// Bagian-bagian rencana: { key, title, lines[], main, limit, total, links }.
//   main  = tampil di kartu ringkas (sisanya di "Lihat detail")
//   limit = berapa baris yang tampil di kartu ringkas
export function planSections(p) {
  const d = p.data || {};
  const jenis = d.jenis || 'lainnya';
  const out = [];
  const add = (key, title, lines, opts = {}) => {
    const clean = (lines || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (clean.length || opts.total) out.push({ key, title, lines: clean, ...opts });
  };
  if (d.tujuan) add('tujuan', '🎯 Tujuan', [d.tujuan], { main: true });
  if (d.total_biaya) {
    add('biaya', '💰 Biaya', (d.rincian_biaya || []).map((r) => `${r.item}: ${fmtRp(r.biaya)}`), { main: true, total: `Total ± ${fmtRp(d.total_biaya)}`, limit: 6 });
  }
  add('transportasi', '🚆 Transportasi', (d.transportasi || []).map((t) => tierText(t, join([`${t.nama}${t.moda ? ` (${t.moda})` : ''}`, t.rute, t.waktu, t.harga, t.catatan]))), { main: true, limit: 3 });
  const tempat = d.tempat || [];
  const tempatTitle = jenis === 'belanja' ? '🛒 Pilihan produk' : /hotel|penginapan|villa/i.test((tempat[0] || {}).jenis || '') ? '🏨 Hotel / tempat' : '📍 Tempat';
  add('tempat', tempatTitle, tempat.map((t) => tierText(t, join([t.nama, t.area, t.harga, t.catatan]))), { main: true, limit: 3 });
  const picks = [chosen(d.transportasi), chosen(tempat)].filter(Boolean);
  if (picks.length && (d.transportasi || []).some((t) => t.kelas) ) {
    add('pilihan', '✅ Dipakai untuk total biaya', picks.map((x) => join([x.kelas ? TIER[x.kelas] : '', x.nama, x.harga])), { main: true });
  }
  add('kuliner', jenis === 'acara' ? '🍽️ Menu / katering' : '🍽️ Kuliner', (d.kuliner || []).map((k) => join([k.waktu ? `${k.waktu}: ${k.nama}` : k.nama, k.area, k.menu, k.harga])), { main: true, limit: 4 });
  add('fitur', '🧩 Fitur utama', (d.fitur || []).map((f) => `${f.prioritas === 'nanti' ? '⏳ nanti' : '⭐ wajib'} — ${f.nama}`), { main: true, limit: 6 });
  add('alat', jenis === 'proyek' ? '🛠️ Alat & teknologi' : '🧰 Alat & sumber', (d.alat || []).map((a) => join([a.nama, a.kegunaan, a.biaya])), { main: jenis !== 'perjalanan', limit: 4 });
  add('jadwal', jenis === 'proyek' ? '🗓️ Tahapan' : '📅 Jadwal', (d.jadwal || []).map((j) => `${j.waktu} — ${j.kegiatan}`), { main: true, limit: 4 });
  add('risiko', '⚠️ Risiko', d.risiko || []);
  add('checklist', jenis === 'proyek' ? '👣 Langkah pertama' : '✅ Persiapan', d.checklist || []);
  add('pengingat', '⏰ Pengingat usulan', (d.pengingat || []).map((r) => `${r.tanggal} ${r.jam} — ${r.pesan}`));
  add('catatan', '📌 Catatan', d.catatan || []);
  // Vera masih punya catatan serius → tampil di depan (tidak terlipat di detail).
  add('vera', '🔍 Catatan Vera', (p.vera && p.vera.notes) || [], { main: !!(p.vera && p.vera.ok === false) });
  add('sumber', '🔗 Sumber', (d.sumber || []).map((x) => x.title), { links: (d.sumber || []).map((x) => x.url) });
  return out;
}

export function planHeader(p) {
  const d = p.data || {};
  return {
    title: `Rencana #${p.no} — ${p.title}`,
    subtitle: join([JENIS[d.jenis] || JENIS.lainnya, d.tanggal, p.parent ? `turunan dari #${p.parent}` : '']),
    badge: p.vera ? p.vera.badge : '',
    intro: d.ringkasan || '',
  };
}

// Teks lengkap (untuk WhatsApp / Catatan).
export function planText(p) {
  const h = planHeader(p);
  const parts = [`🗺️ ${h.title}`, join([h.subtitle, h.badge]), h.intro ? `\n${h.intro}` : ''];
  for (const s of planSections(p)) {
    if (s.key === 'sumber') {
      parts.push(`\n${s.title}\n${s.lines.map((t, i) => `• ${t}${s.links[i] ? ` — ${s.links[i]}` : ''}`).join('\n')}`);
      continue;
    }
    parts.push(`\n${s.title}${s.total ? `\n${s.total}` : ''}\n${s.lines.map((t) => `• ${t}`).join('\n')}`);
  }
  parts.push('\n— dibuat oleh Gaby (Pandu, dicek Vera). Harga & jadwal perkiraan, cek ulang sebelum memesan.');
  return parts.filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Perbandingan 2–3 rencana sebagai bagian-bagian (untuk gambar & teks).
export function compareSections(plans) {
  const row = (title, f) => ({ key: title, title, lines: plans.map((p) => `#${p.no}: ${f(p) || '–'}`) });
  const first = (arr, f) => (arr && arr[0] ? f(arr[0]) : '');
  return [
    row('📝 Judul', (p) => p.title),
    row('💰 Total', (p) => (p.data.total_biaya ? fmtRp(p.data.total_biaya) : '')),
    row('🚆 Transportasi', (p) => { const t = chosen(p.data.transportasi) || (p.data.transportasi || [])[0]; return t ? join([t.kelas ? TIER[t.kelas] : '', t.nama, t.harga]) : ''; }),
    row('📍 Utama', (p) => { const t = chosen(p.data.tempat) || (p.data.tempat || [])[0]; return t ? join([t.kelas ? TIER[t.kelas] : '', t.nama, t.area, t.harga]) : ''; }),
    row('🍽️ Kuliner', (p) => first(p.data.kuliner, (k) => join([k.nama, k.area]))),
    row('📅 Tanggal', (p) => p.data.tanggal),
    row('✅ Cek Vera', (p) => (p.vera ? p.vera.badge : '')),
  ].filter((s) => s.lines.some((l) => !/: –$/.test(l)));
}

export function compareText(plans) {
  return [`📊 Perbandingan ${plans.map((p) => `#${p.no}`).join(' vs ')}`,
    ...compareSections(plans).map((s) => `\n${s.title}\n${s.lines.map((t) => `• ${t}`).join('\n')}`),
    '\n— dibuat oleh Gaby'].join('\n');
}
