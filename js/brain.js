// "Otak" Gaby: memilih penyedia AI dan pindah otomatis ke cadangan kalau kuota habis.

import { memory } from './memory.js';
import { buildPersona } from './persona.js';
import { TOOL_DEFS } from './tools.js';
import { GeminiLive, listLiveModels, FALLBACK_MODELS } from './gemini.js';
import { OpenAIRealtime } from './openai.js';

const EXHAUST_PAUSE = 60 * 60 * 1000; // coba lagi penyedia yang habis kuota setelah 1 jam

export class Brain {
  constructor(handlers) {
    this.h = handlers;    // { onAudio, onInterrupted, onUserText, onGabyText, onTurnComplete, onToolCall, onLost, notice }
    this.provider = null;
    this.models = null;
    this.levels = {};     // tingkat pengaturan Gemini yang berhasil, per model
  }

  async discover(force = false) {
    const key = memory.get().keys.gemini;
    if (!key) { this.models = []; return this.models; }
    if (this.models && !force) return this.models;
    try {
      const list = await listLiveModels(key);
      this.models = list.length ? list : FALLBACK_MODELS;
    } catch (e) {
      if (e.kind === 'auth') throw e;
      this.models = FALLBACK_MODELS;
    }
    return this.models;
  }

  async chain() {
    const { keys } = memory.get();
    const list = [];
    this.authFailed = false;
    if (keys.gemini) {
      try {
        for (const m of await this.discover()) list.push({ id: `gemini:${m}`, kind: 'gemini', model: m });
      } catch {
        this.authFailed = true; // key Gemini ditolak; tetap coba OpenAI kalau ada
      }
    }
    if (keys.openai) list.push({ id: 'openai', kind: 'openai' });
    return list;
  }

  describeChain(list) {
    return list.map((p) => (p.kind === 'openai' ? 'OpenAI' : p.model)).join(' → ') || '(belum ada key)';
  }

  makeProvider(p, level) {
    const { keys, settings } = memory.get();
    return p.kind === 'gemini'
      ? new GeminiLive({ key: keys.gemini, model: p.model, voice: settings.voice, level })
      : new OpenAIRealtime({ key: keys.openai });
  }

  async connect() {
    this.close();
    const list = await this.chain();
    if (!list.length) {
      throw Object.assign(new Error('Belum ada API key'), { kind: this.authFailed ? 'auth' : 'nokey' });
    }

    const { exhausted } = memory.get();
    const fresh = list.filter((p) => !exhausted[p.id] || Date.now() - exhausted[p.id] > EXHAUST_PAUSE);
    const order = fresh.length ? fresh : list; // kalau semua habis, coba saja lagi semuanya

    let lastErr = null;
    let geminiAuthFailed = false;
    for (const p of order) {
      if (p.kind === 'gemini' && geminiAuthFailed) continue;
      // Mulai dari tingkat pengaturan yang terakhir berhasil, supaya bangun lebih cepat.
      const start = this.levels[p.id] || 0;
      for (const level of p.kind === 'gemini' ? [0, 1, 2].filter((l) => l >= start) : [0]) {
        const prov = this.makeProvider(p, level);
        this.wire(prov, p);
        try {
          await prov.connect({ system: buildPersona(prov.name), tools: TOOL_DEFS });
          this.provider = prov;
          this.current = p;
          this.levels[p.id] = level;
          memory.clearExhausted(p.id);
          return prov;
        } catch (e) {
          prov.close();
          lastErr = e;
          console.warn('[Gaby] gagal', p.id, `(tingkat ${level})`, e.kind, e.message);
          if (e.kind === 'quota') {
            memory.markExhausted(p.id);
            this.h.notice(`Kuota ${p.kind === 'openai' ? 'OpenAI' : p.model} habis, pindah ke cadangan…`, 'warn');
            break;
          }
          if (e.kind === 'auth') {
            if (p.kind === 'gemini') geminiAuthFailed = true;
            break;
          }
          if (e.kind === 'network') throw e; // internet bermasalah: cadangan juga tidak akan bisa
          if (e.kind !== 'setup') break;    // model tidak tersedia: lanjut ke model berikutnya
        }
      }
    }
    throw lastErr || new Error('Semua penyedia gagal');
  }

  wire(prov, p) {
    prov.onAudio = (buf) => this.h.onAudio(buf, prov.outputRate);
    prov.onInterrupted = () => this.h.onInterrupted();
    prov.onUserText = (t) => this.h.onUserText(t);
    prov.onGabyText = (t) => this.h.onGabyText(t);
    prov.onTurnComplete = () => this.h.onTurnComplete();
    prov.onToolCall = (name, args) => this.h.onToolCall(name, args);
    prov.onGoAway = () => this.h.onLost({ kind: 'goaway' });
    prov.onClose = (info) => {
      if (this.provider !== prov) return;
      this.provider = null;
      if (info.kind === 'quota') {
        memory.markExhausted(p.id);
        this.h.notice('Kuota habis di tengah obrolan, pindah ke cadangan…', 'warn');
      }
      this.h.onLost(info);
    };
  }

  get inputRate() {
    return this.provider ? this.provider.inputRate : 16000;
  }

  get connected() {
    return !!(this.provider && this.provider.ready);
  }

  sendAudio(pcm) {
    if (this.provider) this.provider.sendAudio(pcm);
  }

  sendText(text) {
    if (this.provider) this.provider.sendText(text);
  }

  close() {
    if (this.provider) this.provider.close();
    this.provider = null;
  }
}
