// Mikrofon (rekam suara kamu) dan pemutar suara Gaby.

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.target = 16000;
    this.pos = 0;
    this.out = [];
    this.levelAcc = 0;
    this.levelN = 0;
    this.port.onmessage = (e) => { if (e.data.rate) { this.target = e.data.rate; this.out = []; this.pos = 0; } };
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    const step = sampleRate / this.target;
    for (let i = 0; i < ch.length; i++) { this.levelAcc += ch[i] * ch[i]; }
    this.levelN += ch.length;
    // Ubah ke sample rate tujuan (interpolasi linear).
    while (this.pos < ch.length - 1) {
      const i = Math.floor(this.pos), f = this.pos - i;
      this.out.push(ch[i] * (1 - f) + ch[i + 1] * f);
      this.pos += step;
    }
    this.pos -= ch.length;
    const chunk = Math.round(this.target / 20); // potongan 50 ms (lebih cepat sampai ke Gemini)
    if (this.out.length >= chunk) {
      const pcm = new Int16Array(this.out.length);
      for (let i = 0; i < this.out.length; i++) {
        const s = Math.max(-1, Math.min(1, this.out[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.out = [];
      const level = Math.sqrt(this.levelAcc / Math.max(1, this.levelN));
      this.levelAcc = 0; this.levelN = 0;
      this.port.postMessage({ pcm: pcm.buffer, level }, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor('gaby-capture', Capture);
`;

export function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.node = null;
    this.onChunk = null;      // (ArrayBuffer pcm16) => void
    this.micLevel = 0;
    this.sending = false;
    this.muted = false;
    this.antiEcho = false;
    this.sources = new Set();
    this.nextTime = 0;
    this.onBargeIn = null;    // dipanggil saat kamu memotong Gaby
    this.echoBase = 0.01;
    this.loudMs = 0;
  }

  // Deteksi kamu memotong: suara mic jauh lebih keras dari sisa gema suara Gaby.
  checkBargeIn(level) {
    if (!this.isSpeaking() || this.antiEcho || this.muted || !this.sending) {
      this.loudMs = 0;
      this.echoBase = 0.01;
      return;
    }
    const threshold = Math.max(0.05, this.echoBase * 4);
    if (level > threshold) {
      this.loudMs += 50;
      if (this.loudMs >= 300) {
        this.loudMs = 0;
        this.onBargeIn && this.onBargeIn();
      }
    } else {
      this.loudMs = 0;
      this.echoBase = this.echoBase * 0.9 + level * 0.1;
    }
  }

  // Harus dipanggil dari ketukan pengguna (aturan browser, terutama iPhone).
  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.outGain = this.ctx.createGain();
      this.outAnalyser = this.ctx.createAnalyser();
      this.outAnalyser.fftSize = 256;
      this.outAnalyser.smoothingTimeConstant = 0.6;
      this.outGain.connect(this.outAnalyser);
      this.outAnalyser.connect(this.ctx.destination);
      this.outData = new Uint8Array(this.outAnalyser.frequencyBinCount);
      this.outWave = new Uint8Array(this.outAnalyser.fftSize);
      // iPhone: resume & bunyi hening harus terjadi langsung di dalam ketukan, sebelum await.
      const resumed = this.ctx.resume();
      const silence = this.ctx.createBufferSource();
      silence.buffer = this.ctx.createBuffer(1, 1, 22050);
      silence.connect(this.ctx.destination);
      silence.start();
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await this.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      await resumed;
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  async startMic(rate) {
    await this.unlock();
    // Pakai ulang mikrofon yang masih hidup (tanpa minta izin lagi); minta baru hanya kalau
    // sudah diputus, misalnya diambil alih aplikasi lain.
    const live = this.stream && this.stream.active && this.stream.getAudioTracks().some((t) => t.readyState === 'live');
    if (!live) {
      if (this.stream) this.releaseMic();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, 'gaby-capture');
      this.node.port.onmessage = (e) => {
        this.micLevel = this.muted ? 0 : e.data.level;
        this.checkBargeIn(this.micLevel);
        if (!this.sending || this.muted || !this.onChunk) return;
        if (this.antiEcho && this.isSpeaking()) return;
        this.onChunk(e.data.pcm, this.micLevel);
      };
      this.source.connect(this.node);
      // Node harus tersambung ke tujuan agar tetap diproses; volumenya nol.
      const silent = this.ctx.createGain();
      silent.gain.value = 0;
      this.node.connect(silent).connect(this.ctx.destination);
    }
    this.node.port.postMessage({ rate });
    this.sending = true;
  }

  pauseMic() {
    this.sending = false;
  }

  // Lepas mikrofon sepenuhnya (dipakai saat Gaby tidur agar pengenal "Hai Gaby" bisa memakai mic).
  releaseMic() {
    this.sending = false;
    this.micLevel = 0;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    try { this.source && this.source.disconnect(); } catch {}
    try { this.node && this.node.disconnect(); } catch {}
    this.stream = null;
    this.source = null;
    this.node = null;
  }

  // Putar potongan suara PCM16 dari Gaby.
  play(pcmBuffer, rate) {
    if (!this.ctx) return;
    const pcm = new Int16Array(pcmBuffer);
    if (!pcm.length) return;
    const buf = this.ctx.createBuffer(1, pcm.length, rate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.outGain);
    const now = this.ctx.currentTime;
    if (this.nextTime < now + 0.03) this.nextTime = now + 0.06;
    src.start(this.nextTime);
    this.nextTime += buf.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  // Kecilkan suara Gaby sementara (saat mungkin kamu sedang memotong).
  duck(on) {
    if (!this.outGain) return;
    const g = this.outGain.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setTargetAtTime(on ? 0.15 : 1, this.ctx.currentTime, 0.04);
  }

  // Hentikan Gaby bicara (misal saat kamu memotong).
  interrupt() {
    for (const s of this.sources) {
      try { s.stop(); } catch {}
    }
    this.sources.clear();
    this.nextTime = 0;
  }

  isSpeaking() {
    return !!this.ctx && this.nextTime > this.ctx.currentTime;
  }

  outLevel() {
    if (!this.outAnalyser) return 0;
    this.outAnalyser.getByteFrequencyData(this.outData);
    let sum = 0;
    for (let i = 0; i < this.outData.length; i++) sum += this.outData[i];
    return sum / this.outData.length / 255;
  }

  waveform() {
    if (!this.outAnalyser) return null;
    this.outAnalyser.getByteTimeDomainData(this.outWave);
    return this.outWave;
  }

  spectrum() {
    if (!this.outAnalyser) return null;
    this.outAnalyser.getByteFrequencyData(this.outData);
    return this.outData;
  }

  // Bunyi "ting" kecil (dibuat langsung, tanpa file suara).
  chime(kind = 'wake') {
    if (!this.ctx) return;
    const notes = kind === 'wake' ? [880, 1320] : kind === 'sleep' ? [990, 660] : [1046, 1318, 1568, 1318, 1568];
    const t0 = this.ctx.currentTime + 0.02;
    notes.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = t0 + i * 0.11;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
  }
}
