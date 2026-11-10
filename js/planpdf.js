// Kartu Rencana / Perbandingan → PDF (v1.25.1). Dibuat sendiri tanpa pustaka luar, jadi tetap jalan
// tanpa internet dan ringan untuk iPhone. Tulisan ASLI (bukan foto): tajam saat di-zoom, bisa dicari &
// di-copy, berkas kecil. Kertas A4 putih, berhalaman, jadwal dikelompokkan per hari.
// Huruf memakai Helvetica bawaan PDF (WinAnsi): emoji & aksara non-Latin (misal Mandarin) tidak bisa
// tampil, jadi dibuang; judul bagian diberi warna sebagai gantinya.

import { planSections, planHeader, compareSections } from './planexport.js';

const PW = 595.28;
const PH = 841.89;
const M = 48; // tepi kertas
const CW = PW - M * 2;
const TOP = PH - M;
const BOTTOM = M + 26; // ruang untuk kaki halaman

const C = {
  text: [0.10, 0.14, 0.20],
  dim: [0.38, 0.44, 0.52],
  accent: [0.03, 0.43, 0.58],
  ok: [0.12, 0.58, 0.32],
  warn: [0.76, 0.47, 0.04],
  line: [0.84, 0.87, 0.90],
  soft: [0.94, 0.97, 0.99],
};

// Lebar huruf Helvetica & Helvetica-Bold (per 1.000), kode 32–126.
const WR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const WB = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
const EXT = { 0x80: 556, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000, 0x99: 1000, 0xa0: 278, 0xb0: 400, 0xb1: 584, 0xb7: 278, 0xd7: 584 };
function charW(code, bold) {
  if (code >= 32 && code <= 126) return (bold ? WB : WR)[code - 32];
  if (EXT[code]) return EXT[code];
  if (code >= 0xc0 && code <= 0xde) return 722; // huruf besar beraksen
  return 556;
}
const textW = (s, size, bold) => { let w = 0; for (let i = 0; i < s.length; i++) w += charW(s.charCodeAt(i), bold); return (w * size) / 1000; };

// Unicode → WinAnsi (satu byte per huruf). Yang tidak ada di WinAnsi diganti padanan atau dibuang.
const WIN = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };
const REPL = [[/[→⇒➜➔⟶]/g, '->'], [/[←⟵]/g, '<-'], [/[↔⇄]/g, '<->'], [/≈/g, '~'], [/≥/g, '>='], [/≤/g, '<='], [/[−‐‑]/g, '-'], [/[✓✔]/g, 'v'], [/[   ]/g, ' ']];
export function toWin(input) {
  let s = String(input == null ? '' : input).normalize('NFC');
  for (const [re, r] of REPL) s = s.replace(re, r);
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp === 9 || cp === 10 || cp === 13) { out += ' '; continue; }
    if (cp < 32 || cp === 127) continue;
    if (cp < 127 || (cp >= 0xa0 && cp <= 0xff)) { out += String.fromCharCode(cp); continue; }
    if (WIN[ch]) { out += String.fromCharCode(WIN[ch]); continue; }
    // Huruf Latin beraksen di luar Latin-1 (misal "ā") → huruf dasarnya; emoji & aksara lain dibuang.
    const base = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    if (/^[\x20-\x7e]+$/.test(base)) out += base;
  }
  return out.replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}

// Pecah teks menjadi baris selebar maxW.
function wrap(s, size, bold, maxW) {
  const words = s.split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (let w of words) {
    // Kata yang lebih panjang dari baris (misal alamat web): dipotong per huruf.
    while (textW(w, size, bold) > maxW) {
      let k = 1;
      while (k < w.length && textW(w.slice(0, k + 1), size, bold) <= maxW) k++;
      if (line) { lines.push(line); line = ''; }
      lines.push(w.slice(0, k));
      w = w.slice(k);
    }
    const test = line ? `${line} ${w}` : w;
    if (line && textW(test, size, bold) > maxW) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

const esc = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[\x80-\xff]/g, (c) => `\\${c.charCodeAt(0).toString(8).padStart(3, '0')}`);
const n = (v) => (Math.round(v * 100) / 100).toString();
const rgb = (c) => `${n(c[0])} ${n(c[1])} ${n(c[2])}`;

// ---------- Penyusun halaman ----------
class Doc {
  constructor(runTitle) {
    this.pages = [];
    this.runTitle = runTitle;
    this.newPage();
  }
  newPage() {
    this.page = { ops: [], links: [] };
    this.pages.push(this.page);
    this.y = TOP;
    if (this.pages.length > 1) {
      // Judul kecil di atas halaman lanjutan
      this.text(M, this.y - 8, toWin(this.runTitle).slice(0, 110), 8.5, false, C.dim);
      this.rule(this.y - 14);
      this.y -= 28;
    }
  }
  ensure(h) { if (this.y - h < BOTTOM) this.newPage(); }
  text(x, y, s, size, bold, color, spacing = 0) {
    this.page.ops.push(`BT /${bold ? 'F2' : 'F1'} ${n(size)} Tf ${rgb(color)} rg${spacing ? ` ${n(spacing)} Tc` : ''} ${n(x)} ${n(y)} Td (${esc(s)}) Tj${spacing ? ' 0 Tc' : ''} ET`);
  }
  rect(x, y, w, h, color) { this.page.ops.push(`${rgb(color)} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`); }
  rule(y, color = C.line, x = M, w = CW) { this.rect(x, y, w, 0.7, color); }
  dot(cx, cy, r, color) {
    const k = r * 0.5523;
    this.page.ops.push(`${rgb(color)} rg ${n(cx + r)} ${n(cy)} m ${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c ${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)} c ${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c ${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)} c f`);
  }
  check(x, y, color) { // tanda centang (pilihan yang dipakai di total biaya)
    this.page.ops.push(`${rgb(color)} RG 1.6 w 1 J 1 j ${n(x)} ${n(y + 3.6)} m ${n(x + 2.6)} ${n(y + 1)} l ${n(x + 7.4)} ${n(y + 7.4)} l S`);
  }
  link(x, y, w, h, url) { this.page.links.push({ x, y, w, h, url }); }

  // Paragraf (beberapa baris). opts: size, bold, color, indent, lh (jarak baris), gap (spasi bawah)
  para(s, { size = 10, bold = false, color = C.text, indent = 0, lh = 1.36, gap = 4, keep = 0 } = {}) {
    const t = toWin(s);
    if (!t) return;
    const lines = wrap(t, size, bold, CW - indent);
    const step = size * lh;
    this.ensure(step * Math.min(lines.length, 2) + keep);
    for (const l of lines) {
      this.ensure(step);
      this.text(M + indent, this.y - size, l, size, bold, color);
      this.y -= step;
    }
    this.y -= gap;
  }
  heading(title, { total = '' } = {}) {
    const t = toWin(title);
    this.ensure(52); // judul tidak ditinggal sendirian di bawah halaman
    this.y -= 8;
    this.rect(M, this.y - 14, 3.2, 15, C.accent);
    this.text(M + 10, this.y - 12, t, 13, true, C.accent);
    this.y -= 22;
    if (total) this.para(total, { size: 11.5, bold: true, gap: 3 });
  }
  // Butir berpoin. chosen = pilihan yang dipakai di total biaya (centang hijau, huruf tebal).
  bullet(s, { chosen = false, size = 10, indent = 14 } = {}) {
    const t = toWin(s);
    if (!t) return;
    const lines = wrap(t, size, chosen, CW - indent);
    const step = size * 1.36;
    this.ensure(step * Math.min(lines.length, 2));
    if (chosen) this.check(M + 1, this.y - size + 0.5, C.ok);
    else this.dot(M + 4, this.y - size + 3.4, 1.7, C.accent);
    lines.forEach((l) => {
      this.ensure(step);
      this.text(M + indent, this.y - size, l, size, chosen, chosen ? C.text : C.text);
      this.y -= step;
    });
    this.y -= 2.5;
  }
}

// Jadwal per hari: "Hari 1 — Rabu, 23 Des 2026" lalu jam | kegiatan.
const DAY_RE = /\bhari\s*(?:ke[-\s]?)?(\d{1,2})\b/i;
function scheduleBlock(doc, jadwal, start) {
  const groups = [];
  for (const j of jadwal || []) {
    const m = String(j.waktu || '').match(DAY_RE);
    const day = m ? +m[1] : null;
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) { g = { day, items: [] }; groups.push(g); }
    const time = day != null ? String(j.waktu || '').replace(DAY_RE, '').replace(/^[\s,.:–-]+/, '').trim() : String(j.waktu || '').trim();
    g.items.push({ time, what: j.kegiatan });
  }
  const t0 = /^\d{4}-\d{2}-\d{2}$/.test(start || '') ? new Date(`${start}T12:00:00`) : null;
  const timeCol = 54;
  for (const g of groups) {
    if (g.day != null) {
      let label = `Hari ${g.day}`;
      if (t0) {
        const d = new Date(t0.getTime() + (g.day - 1) * 864e5);
        label += ` — ${d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
      doc.ensure(40); // judul hari + minimal satu kegiatan
      doc.y -= 4;
      doc.rect(M, doc.y - 15, CW, 17, C.soft);
      doc.text(M + 8, doc.y - 11.5, toWin(label), 10.5, true, C.text);
      doc.y -= 21;
    }
    for (const it of g.items) {
      const what = toWin(it.what);
      const time = toWin(it.time);
      const useCol = g.day != null && time && textW(time, 9.5, true) < timeCol - 6;
      const indent = useCol ? timeCol : 0;
      const lines = wrap(useCol ? what : [time, what].filter(Boolean).join(' — '), 10, false, CW - indent - 8);
      const step = 13.6;
      doc.ensure(step * Math.min(lines.length, 2));
      if (useCol) doc.text(M + 8, doc.y - 10, time, 9.5, true, C.accent);
      lines.forEach((l) => {
        doc.ensure(step);
        doc.text(M + 8 + indent, doc.y - 10, l, 10, false, C.text);
        doc.y -= step;
      });
      doc.y -= 2;
    }
    doc.y -= 4;
  }
}

function header(doc, h) {
  doc.text(M, doc.y - 9, 'GABRIELLA  ·  RENCANA DARI PANDU', 8.5, true, C.accent, 0.8);
  doc.y -= 22;
  doc.para(h.title, { size: 20, bold: true, lh: 1.2, gap: 4 });
  if (h.subtitle) doc.para(h.subtitle, { size: 10.5, color: C.dim, gap: 4 });
  if (h.badge) {
    const ok = /^✅/.test(h.badge);
    const warn = /^⚠️/.test(h.badge);
    const color = ok ? C.ok : warn ? C.warn : C.dim;
    const t = toWin(h.badge);
    doc.ensure(16);
    doc.dot(M + 4, doc.y - 6.6, 3.4, color);
    const lines = wrap(t, 10, true, CW - 14);
    lines.forEach((l) => { doc.text(M + 13, doc.y - 10, l, 10, true, color); doc.y -= 13.6; });
    doc.y -= 4;
  }
  if (h.intro) doc.para(h.intro, { size: 10.5, gap: 6 });
  doc.y -= 2;
  doc.rule(doc.y, C.accent);
  doc.y -= 6;
}

function sectionsBlock(doc, sections, data) {
  for (const s of sections) {
    if (s.key === 'jadwal' && data) {
      doc.heading(s.title);
      scheduleBlock(doc, data.jadwal, data.tanggal_mulai);
      continue;
    }
    doc.heading(s.title, { total: s.total || '' });
    s.lines.forEach((line, i) => {
      const chosen = /^✅/.test(line);
      if (s.links && s.links[i]) {
        doc.bullet(line);
        const url = s.links[i];
        const u = toWin(url).slice(0, 95);
        doc.ensure(12);
        doc.text(M + 14, doc.y - 8.5, u, 8, false, C.accent);
        doc.link(M + 14, doc.y - 11, textW(u, 8, false), 11, url);
        doc.y -= 14;
      } else doc.bullet(line, { chosen });
    });
  }
}

// ---------- Rakit berkas PDF ----------
function utf16Hex(s) {
  let h = 'FEFF';
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0);
    if (cp > 0xffff) { const v = cp - 0x10000; h += ((v >> 10) + 0xd800).toString(16).padStart(4, '0') + ((v & 0x3ff) + 0xdc00).toString(16).padStart(4, '0'); } else h += cp.toString(16).padStart(4, '0');
  }
  return `<${h.toUpperCase()}>`;
}

function build(doc, title) {
  const total = doc.pages.length;
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  // Kaki halaman (butuh jumlah halaman, jadi ditambahkan terakhir)
  doc.pages.forEach((p, i) => {
    doc.page = p;
    doc.rule(M + 12);
    doc.text(M, M, toWin(`Dibuat Gaby · ${today} · harga & jadwal perkiraan, cek ulang sebelum memesan`), 7.5, false, C.dim);
    const pg = `Halaman ${i + 1} dari ${total}`;
    doc.text(PW - M - textW(pg, 7.5, false), M, pg, 7.5, false, C.dim);
  });
  const objs = [];
  const add = (body) => { objs.push(body); return objs.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('PAGES');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  add(`<< /Title ${utf16Hex(title)} /Producer (Gaby) /Creator (Gaby - Pandu) >>`);
  const kids = [];
  for (const p of doc.pages) {
    const stream = p.ops.join('\n');
    const cid = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const annots = p.links.map((l) => add(`<< /Type /Annot /Subtype /Link /Rect [${n(l.x)} ${n(l.y)} ${n(l.x + l.w)} ${n(l.y + l.h)}] /Border [0 0 0] /A << /S /URI /URI (${esc(toWin(l.url))}) >> >>`));
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(PW)} ${n(PH)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R${annots.length ? ` /Annots [${annots.map((a) => `${a} 0 R`).join(' ')}]` : ''} >>`));
  }
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return { bytes, pages: total };
}

// Kartu Rencana → PDF. Hasil: { blob, bytes, pages }
export function planPdf(plan) {
  const h = planHeader(plan);
  const doc = new Doc(h.title);
  header(doc, h);
  sectionsBlock(doc, planSections(plan).filter((s) => s.key !== 'vera'), plan.data || {});
  const { bytes, pages } = build(doc, h.title);
  return { blob: new Blob([bytes], { type: 'application/pdf' }), bytes, pages };
}

// Kartu Perbandingan → PDF.
export function comparePdf(plans, label) {
  const doc = new Doc(label);
  header(doc, { title: label, subtitle: 'Perbandingan rencana · Gaby & Pandu', badge: '', intro: '' });
  sectionsBlock(doc, compareSections(plans), null);
  const { bytes, pages } = build(doc, label);
  return { blob: new Blob([bytes], { type: 'application/pdf' }), bytes, pages };
}
