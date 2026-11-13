// Pendeteksi bicara di perangkat: tahu kapan kamu mulai dan selesai bicara,
// lalu langsung memberi tahu Gemini tanpa menunggu server menebak.

const CHUNK_MS = 50;

// ---------- Penjaga gema: kapan suara di mic saat Gaby bicara = KAMU memotong, bukan gema Gaby ----------
// Dulu (sampai v1.25): gema dipelajari cepat dari SEMUA suara di bawah 0,05 → suaramu yang agak pelan ikut
// dianggap gema, batas naik 4×, dan kamu tidak bisa memotong (keluhan pemilik 13 Nov 2026, APK Android).
// Sekarang: lonjakan (kemungkinan kamu) hampir tidak dipelajari, gema diingat per HP ('gaby.echo'),
// dan kerasnya suaramu saat Gaby diam dipelajari supaya HP bermic pelan tetap bisa memotong.
// Sebelum ada yang dipelajari (obrolan pertama di HP itu) perilakunya sama dengan cara lama.
const ECHO_KEY = 'gaby.echo';
export class EchoGate {
  constructor(store = globalThis.localStorage, learn = true) {
    this.store = store;
    this.learn = learn; // false = cara lama persis (iPhone/laptop sudah bisa dipotong dengan baik)
    let saved = {};
    try { saved = JSON.parse(store.getItem(ECHO_KEY) || '{}') || {}; } catch {}
    this.mem = Number(saved.echo) > 0 ? Number(saved.echo) : null;   // gema biasa di HP ini
    this.voice = Number(saved.voice) > 0 ? Number(saved.voice) : null; // kerasnya suaramu biasanya
    this.echo = this.mem || 0.01;
    this.speaking = false;
    this.startedAt = 0;
    this.barged = false;
    this.voiceN = 0;
  }

  save() {
    try { this.store.setItem(ECHO_KEY, JSON.stringify({ echo: this.mem ? +this.mem.toFixed(4) : 0, voice: this.voice ? +this.voice.toFixed(4) : 0 })); } catch {}
  }

  // Batas: suara di atas ini selama ±300 ms saat Gaby bicara = kamu memotong.
  threshold() {
    if (!this.mem || !this.learn) return Math.max(0.05, this.echo * 4); // belum belajar: cara lama
    const floor = this.voice ? Math.min(0.05, Math.max(0.015, this.voice * 0.35)) : 0.05;
    return Math.max(floor, this.echo * 3);
  }

  // Setiap potongan 50 ms. speaking = Gaby sedang bicara.
  observe(level, speaking, now = Date.now()) {
    if (speaking && !this.speaking) { this.speaking = true; this.startedAt = now; this.barged = false; this.echo = this.mem || 0.01; }
    if (!speaking && this.speaking) { this.speaking = false; this.finish(now - this.startedAt); }
    if (!speaking) return;
    const e = this.echo;
    if (!this.mem || !this.learn) {
      // Cara lama (belum ada ingatan gema): pelajari semua yang di bawah batas.
      if (level <= this.threshold()) this.echo = e * 0.9 + level * 0.1;
      return;
    }
    if (level <= e) this.echo = e + (level - e) * 0.15;            // turun cepat
    else if (level < e * 2.5) this.echo = e + (level - e) * 0.08;  // naik: masih mirip gema
    else if (level <= this.threshold()) this.echo = e + (level - e) * 0.01; // lonjakan: hampir diabaikan
    // di atas batas = mungkin kamu memotong: tidak dipelajari sama sekali (seperti cara lama)
  }

  // Gaby selesai bicara tanpa dipotong & cukup lama → simpan gema rata-rata HP ini.
  finish(ms) {
    if (!this.learn || this.barged || ms < 1500) return;
    this.mem = this.mem ? this.mem * 0.7 + this.echo * 0.3 : this.echo;
    this.save();
  }

  markBarge() { this.barged = true; }

  // Suaramu saat Gaby diam (dipakai untuk batas memotong di HP bermic pelan).
  voiceChunk(level) {
    if (!this.learn || !(level > 0.006)) return;
    this.voice = this.voice ? this.voice * 0.97 + level * 0.03 : level;
    if (++this.voiceN % 40 === 0) this.save();
  }
}

export class LocalVad {
  constructor({ silenceMs = 650, maxMs = 30000 } = {}) {
    this.silenceMs = silenceMs;
    this.maxMs = maxMs;
    this.floor = 0.004;   // tingkat sunyi ruangan, menyesuaikan sendiri
    this.active = false;
    this.loudMs = 0;
    this.quietMs = 0;
    this.activeMs = 0;
  }

  // level = kekerasan suara mic (RMS) per potongan 50 ms.
  // bargeAt = batas memotong dari EchoGate (dipakai saat Gaby bicara); gabySpeaking = Gaby sedang bicara.
  // Mengembalikan 'start', 'end', atau null.
  update(level, gabySpeaking, bargeAt) {
    if (!this.active) {
      if (!gabySpeaking && level < this.floor * 2.5) this.floor = this.floor * 0.97 + level * 0.03;
      // Saat Gaby bicara, butuh suara jauh lebih keras & lebih lama supaya gema tidak dikira kamu.
      const threshold = gabySpeaking ? bargeAt : Math.max(0.012, this.floor * 3.5);
      const needMs = gabySpeaking ? 300 : 100;
      if (level > threshold) {
        this.loudMs += CHUNK_MS;
        if (this.loudMs >= needMs) {
          this.active = true;
          this.loudMs = this.quietMs = this.activeMs = 0;
          return 'start';
        }
      } else {
        this.loudMs = 0;
      }
      return null;
    }

    this.activeMs += CHUNK_MS;
    const quiet = level < Math.max(0.008, this.floor * 2.2);
    this.quietMs = quiet ? this.quietMs + CHUNK_MS : 0;
    if (this.quietMs >= this.silenceMs || this.activeMs >= this.maxMs) {
      this.active = false;
      this.quietMs = this.activeMs = 0;
      return 'end';
    }
    return null;
  }

  reset() {
    this.active = false;
    this.loudMs = this.quietMs = this.activeMs = 0;
  }
}
