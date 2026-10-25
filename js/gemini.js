// Sambungan suara real-time ke Google Gemini Live API.

import { toBase64, fromBase64 } from './audio.js';

const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
// Fitur eksperimental (merasakan nada suara) hanya ada di versi v1alpha.
const WS_URL_ALPHA = WS_URL.replace('.v1beta.', '.v1alpha.');
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
  // Model "thinking" berpikir dulu sebelum bicara (lambat), jadi ditaruh paling belakang.
  const score = (n) => (/native-audio/.test(n) ? 0 : /live/.test(n) ? 1 : 2)
    + (/exp/.test(n) ? 0.5 : 0)
    + (/thinking|dialog/.test(n) ? 5 : 0);
  return names.sort((a, b) => score(a) - score(b));
}

export const isSlowModel = (n) => /thinking|dialog/.test(n);

// Tingkat pengaturan, dari tercepat ke paling sederhana. Dicoba berurutan
// kalau model menolak pengaturan tertentu.
//   thinkingOff = langsung bicara tanpa berpikir dulu
//   background  = simpan ingatan tanpa membuat Gaby berhenti bicara
//   manual      = Gaby (perangkat) yang menentukan kapan kamu selesai bicara
//   extras      = Google Search + sesi panjang
//   affective   = Gemini merasakan nada suara pengguna (eksperimental, v1alpha)
const LEVELS = [
  { affective: true, thinkingOff: true, background: true, manual: true, extras: true },
  { thinkingOff: true, background: true, manual: true, extras: true },
  { background: true, manual: true, extras: true },
  { manual: true, extras: true },
  { extras: true },
  {},
];
export const LEVEL_COUNT = LEVELS.length;

function toGeminiSchema(s) {
  const out = { type: String(s.type).toUpperCase() };
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(s.properties)) out.properties[k] = toGeminiSchema(v);
  }
  if (s.items) out.items = toGeminiSchema(s.items);
  if (s.required) out.required = s.required;
  return out;
}

export class GeminiLive {
  constructor({ key, model, voice, level = 0, localVad = true }) {
    this.key = key;
    this.model = model;
    this.voice = voice;
    this.level = level;
    this.features = LEVELS[level] || {};
    // Kalau true, perangkat yang memberi tahu Gemini kapan kamu mulai & selesai bicara.
    this.manual = !!(this.features.manual && localVad);
    this.toolScheduling = new Map(); // alat latar → kapan hasilnya disampaikan
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

      const ws = new WebSocket(`${this.features.affective ? WS_URL_ALPHA : WS_URL}?key=${encodeURIComponent(this.key)}`);
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      const timer = setTimeout(() => { fail('network', 'Waktu habis saat menyambung'); try { ws.close(); } catch {} }, 15000);

      ws.onopen = () => {
        const declarations = tools.map((t) => {
          const d = { name: t.name, description: t.description };
          if (t.parameters && Object.keys(t.parameters.properties || {}).length) d.parameters = toGeminiSchema(t.parameters);
          // Alat "latar belakang" (misal simpan ingatan) tidak membuat Gaby berhenti bicara.
          if (t.background && this.features.background) {
            d.behavior = 'NON_BLOCKING';
            this.toolScheduling.set(t.name, t.background === 'idle' ? 'WHEN_IDLE' : 'SILENT');
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
        if (this.features.affective) setup.enableAffectiveDialog = true;
        if (this.features.thinkingOff) {
          setup.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }
        if (this.manual) {
          setup.realtimeInputConfig = { automaticActivityDetection: { disabled: true } };
        } else if (this.features.extras) {
          setup.realtimeInputConfig = {
            automaticActivityDetection: { endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH', silenceDurationMs: 500 },
          };
        }
        if (this.features.extras) {
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
      if (this.toolScheduling.has(call.name)) response.scheduling = this.toolScheduling.get(call.name);
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

  // Satu gambar dari kamera/layar (Gemini menerima sekitar 1 gambar per detik).
  sendImage(b64, mimeType = 'image/jpeg') {
    if (this.ready) this.send({ realtimeInput: { video: { data: b64, mimeType } } });
  }

  // Dipakai saat perangkat yang mendeteksi bicara (mode manual).
  activityStart() {
    if (this.ready) this.send({ realtimeInput: { activityStart: {} } });
  }

  activityEnd() {
    if (this.ready) this.send({ realtimeInput: { activityEnd: {} } });
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
