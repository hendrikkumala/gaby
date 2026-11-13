// Pendeteksi bicara di perangkat: tahu kapan kamu mulai dan selesai bicara,
// lalu langsung memberi tahu Gemini tanpa menunggu server menebak.

const CHUNK_MS = 50;

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
  // echoBase = sisa gema suara Gaby; gabySpeaking = Gaby sedang bicara.
  // Mengembalikan 'start', 'end', atau null.
  update(level, gabySpeaking, echoBase) {
    if (!this.active) {
      if (!gabySpeaking && level < this.floor * 2.5) this.floor = this.floor * 0.97 + level * 0.03;
      // Saat Gaby bicara, butuh suara jauh lebih keras & lebih lama supaya gema tidak dikira kamu.
      const threshold = gabySpeaking ? Math.max(0.05, echoBase * 4) : Math.max(0.012, this.floor * 3.5);
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
