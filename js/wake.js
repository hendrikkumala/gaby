// Pendengar kata panggilan "Hai Gaby" memakai pengenal suara bawaan browser (gratis).

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

// Variasi ejaan yang sering muncul dari pengenal suara.
const NAME = /(^|[\s,.!?])(ga+b+[iy]e?|gabby|gaby|gebi|gebby|gavi|gapi|gabriel+a|kebi|gabe)(?=$|[\s,.!?])/i;

export class WakeListener {
  constructor({ onWake, onUnavailable }) {
    this.onWake = onWake;
    this.onUnavailable = onUnavailable;
    this.active = false;
    this.rec = null;
    this.pending = null;
    this.failures = 0;
  }

  static get supported() {
    return !!SR;
  }

  start() {
    if (!SR || this.active) return;
    this.active = true;
    this.failures = 0;
    this.spawn();
  }

  stop() {
    this.active = false;
    clearTimeout(this.pending);
    this.pending = null;
    if (this.rec) {
      this.rec.onend = null;
      try { this.rec.abort(); } catch {}
      this.rec = null;
    }
  }

  spawn() {
    if (!this.active) return;
    const rec = new SR();
    rec.lang = 'id-ID';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    this.rec = rec;

    rec.onresult = (ev) => {
      this.failures = 0;
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        for (let a = 0; a < res.length; a++) {
          const text = res[a].transcript;
          const m = text.match(NAME);
          if (!m) continue;
          const rest = text.slice(m.index + m[0].length).replace(/^[\s,.!?]+/, '').trim();
          if (res.isFinal) {
            this.fire(rest);
          } else if (!this.pending) {
            // Tunggu sebentar: mungkin kamu langsung lanjut bicara ("Hai Gaby, jam berapa?")
            this.pending = setTimeout(() => this.fire(rest), 900);
          }
          return;
        }
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'language-not-supported') {
        this.stop();
        this.onUnavailable && this.onUnavailable(ev.error);
      }
    };

    rec.onend = () => {
      if (!this.active) return;
      this.failures++;
      // Mulai lagi; makin sering gagal, makin lama jedanya.
      setTimeout(() => this.spawn(), Math.min(5000, 150 * this.failures));
    };

    try {
      rec.start();
    } catch {
      setTimeout(() => this.spawn(), 1000);
    }
  }

  fire(rest) {
    if (!this.active) return;
    this.stop();
    this.onWake(rest && rest.split(/\s+/).length >= 2 ? rest : '');
  }
}
