// Sambungan suara real-time ke Google Gemini Live API.

import { toBase64, fromBase64 } from './audio.js';

const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const REST = 'https://generativelanguage.googleapis.com/v1beta';

// Dipakai jika daftar model tidak bisa diambil.
export const FALLBACK_MODELS = [
  'gemini-2.5-flash-native-audio-preview-09-2025',
  'gemini-live-2.5-flash-preview',
  'gemini-2.0-flash-live-001',
];

export const GEMINI_VOICES = [
  'Aoede', 'Kore', 'Leda', 'Zephyr', 'Callirrhoe', 'Autonoe', 'Despina', 'Erinome',
  'Laomedeia', 'Achernar', 'Gacrux', 'Pulcherrima', 'Vindemiatrix', 'Sulafat',
  'Puck', 'Charon', 'Fenrir', 'Orus',
];

// Kelompokkan penyebab error supaya bisa memilih cadangan yang tepat.
export function classify(text) {
  const s = String(text || '').toLowerCase();
  if (/quota|exhaust|rate limit|too many|429|billing/.test(s)) return 'quota';
  if (/api key|api_key|permission|unauthori|denied|unauthenticated|forbidden|403/.test(s)) return 'auth';
  if (/not found|not supported|unsupported|is not available|404|invalid model|deprecated/.test(s)) return 'model';
  if (/invalid|argument|unknown name|cannot find field/.test(s)) return 'setup';
  return 'network';
}

// Cari model Gemini yang mendukung percakapan suara langsung.
export async function listLiveModels(key) {
  const res = await fetch(`${REST}/models?pageSize=1000&key=${encodeURIComponent(key)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `HTTP ${res.status}`);
    err.kind = res.status === 400 || res.status === 403 ? 'auth' : classify(err.message);
    throw err;
  }
  const names = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('bidiGenerateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => !/tts|image|embedding/.test(n));
  const score = (n) => (/native-audio/.test(n) ? 0 : /live/.test(n) ? 1 : 2) + (/exp/.test(n) ? 0.5 : 0);
  return names.sort((a, b) => score(a) - score(b));
}

function toGeminiSchema(s) {
  const out = { type: String(s.type).toUpperCase() };
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(s.properties)) out.properties[k] = toGeminiSchema(v);
  }
  if (s.required) out.required = s.required;
  return out;
}

export class GeminiLive {
  constructor({ key, model, voice, level = 0 }) {
    this.key = key;
    this.model = model;
    this.voice = voice;
    // Tingkat pengaturan: 0 = lengkap & tercepat, makin tinggi makin sederhana.
    // Dipakai bergantian kalau model menolak pengaturan tertentu.
    this.level = level;
    this.silentTools = new Set();
    this.name = 'gemini';
    this.label = `Gemini (${model})`;
    this.inputRate = 16000;
    this.outputRate = 24000;
    this.ws = null;
    this.ready = false;
    // Callback diisi oleh brain.js
    this.onAudio = () => {};
    this.onInterrupted = () => {};
    this.onUserText = () => {};
    this.onGabyText = () => {};
    this.onTurnComplete = () => {};
    this.onToolCall = async () => ({});
    this.onClose = () => {};
    this.onGoAway = () => {};
  }

  connect({ system, tools }) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (kind, reason) => {
        if (settled) return;
        settled = true;
        const err = new Error(reason || 'Gagal tersambung');
        err.kind = kind;
        reject(err);
      };

      const ws = new WebSocket(`${WS_URL}?key=${encodeURIComponent(this.key)}`);
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      const timer = setTimeout(() => { fail('network', 'Waktu habis saat menyambung'); try { ws.close(); } catch {} }, 15000);

      ws.onopen = () => {
        const declarations = tools.map((t) => {
          const d = { name: t.name, description: t.description };
          if (t.parameters && Object.keys(t.parameters.properties || {}).length) d.parameters = toGeminiSchema(t.parameters);
          // Alat "latar belakang" (misal simpan ingatan) tidak membuat Gaby berhenti bicara.
          if (t.background && this.level <= 1) {
            d.behavior = 'NON_BLOCKING';
            this.silentTools.add(t.name);
          }
          return d;
        });
        const setup = {
          model: `models/${this.model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voice } } },
          },
          systemInstruction: { parts: [{ text: system }] },
          tools: [{ functionDeclarations: declarations }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        };
        if (this.level === 0) {
          // Langsung bicara tanpa "berpikir" dulu: jauh lebih cepat.
          setup.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }
        if (this.level < 3) {
          // Cepat menjawab saat kamu selesai bicara, tapi tidak mudah tertipu gema suara Gaby sendiri.
          setup.realtimeInputConfig = {
            automaticActivityDetection: {
              startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
              endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
              prefixPaddingMs: 200,
              silenceDurationMs: 600,
            },
          };
          setup.tools.push({ googleSearch: {} });
          setup.contextWindowCompression = { slidingWindow: {} };
        }
        ws.send(JSON.stringify({ setup }));
      };

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data));
        } catch {
          return;
        }
        if (msg.setupComplete) {
          clearTimeout(timer);
          this.ready = true;
          settled = true;
          resolve();
          return;
        }
        this.handle(msg);
      };

      ws.onerror = () => {};

      ws.onclose = (ev) => {
        clearTimeout(timer);
        const wasReady = this.ready;
        this.ready = false;
        const reason = ev.reason || `kode ${ev.code}`;
        if (!wasReady) {
          fail(ev.code === 1006 ? 'network' : classify(reason), reason);
        } else {
          this.onClose({ kind: ev.code === 1000 ? 'normal' : classify(reason), reason, code: ev.code });
        }
      };
    });
  }

  handle(msg) {
    const sc = msg.serverContent;
    if (sc) {
      if (sc.interrupted) this.onInterrupted();
      const parts = sc.modelTurn?.parts || [];
      for (const p of parts) {
        if (p.inlineData?.data && /audio/.test(p.inlineData.mimeType || 'audio')) {
          this.onAudio(fromBase64(p.inlineData.data));
        }
      }
      if (sc.inputTranscription?.text) this.onUserText(sc.inputTranscription.text);
      if (sc.outputTranscription?.text) this.onGabyText(sc.outputTranscription.text);
      if (sc.turnComplete) this.onTurnComplete();
    }
    if (msg.toolCall?.functionCalls) {
      this.runTools(msg.toolCall.functionCalls);
    }
    if (msg.goAway) this.onGoAway();
  }

  async runTools(calls) {
    const responses = [];
    for (const call of calls) {
      const result = await this.onToolCall(call.name, call.args || {});
      const response = { result };
      if (this.silentTools.has(call.name)) response.scheduling = 'SILENT';
      responses.push({ id: call.id, name: call.name, response });
    }
    this.send({ toolResponse: { functionResponses: responses } });
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  sendAudio(pcm) {
    if (!this.ready) return;
    this.send({ realtimeInput: { audio: { data: toBase64(pcm), mimeType: 'audio/pcm;rate=16000' } } });
  }

  sendText(text) {
    this.send({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } });
  }

  close() {
    this.ready = false;
    if (this.ws) {
      this.ws.onclose = null;
      try { this.ws.close(1000); } catch {}
      this.ws = null;
    }
  }
}
