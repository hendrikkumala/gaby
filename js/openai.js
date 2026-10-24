// Cadangan berbayar: OpenAI Realtime API (hanya aktif jika key OpenAI diisi).

import { toBase64, fromBase64 } from './audio.js';
import { classify } from './gemini.js';

export const OPENAI_MODEL = 'gpt-realtime';

export class OpenAIRealtime {
  constructor({ key, voice }) {
    this.key = key;
    this.voice = voice || 'marin';
    this.name = 'openai';
    this.label = 'OpenAI Realtime';
    this.inputRate = 24000;
    this.outputRate = 24000;
    this.ws = null;
    this.ready = false;
    this.pendingTools = 0;
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

      const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${OPENAI_MODEL}`, [
        'realtime',
        `openai-insecure-api-key.${this.key}`,
      ]);
      this.ws = ws;
      const timer = setTimeout(() => { fail('network', 'Waktu habis saat menyambung'); try { ws.close(); } catch {} }, 15000);

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }

        if (msg.type === 'session.created') {
          this.send({
            type: 'session.update',
            session: {
              type: 'realtime',
              instructions: system,
              output_modalities: ['audio'],
              audio: {
                input: {
                  format: { type: 'audio/pcm', rate: 24000 },
                  transcription: { model: 'gpt-4o-mini-transcribe' },
                  turn_detection: { type: 'semantic_vad' },
                },
                output: { format: { type: 'audio/pcm', rate: 24000 }, voice: this.voice },
              },
              tools: tools.map((t) => ({ type: 'function', name: t.name, description: t.description, parameters: t.parameters })),
              tool_choice: 'auto',
            },
          });
          return;
        }
        if (msg.type === 'session.updated' && !this.ready) {
          clearTimeout(timer);
          this.ready = true;
          settled = true;
          resolve();
          return;
        }
        if (msg.type === 'error') {
          const text = `${msg.error?.code || ''} ${msg.error?.message || ''}`;
          if (!this.ready) { fail(classify(text), text); try { ws.close(); } catch {} }
          else if (/insufficient_quota|rate_limit/.test(text)) this.onClose({ kind: 'quota', reason: text });
          return;
        }
        this.handle(msg);
      };

      ws.onclose = (ev) => {
        clearTimeout(timer);
        const wasReady = this.ready;
        this.ready = false;
        const reason = ev.reason || `kode ${ev.code}`;
        if (!wasReady) fail(ev.code === 1006 ? 'auth' : classify(reason), reason);
        else this.onClose({ kind: ev.code === 1000 ? 'normal' : classify(reason), reason, code: ev.code });
      };
    });
  }

  handle(msg) {
    switch (msg.type) {
      case 'response.output_audio.delta':
      case 'response.audio.delta':
        this.onAudio(fromBase64(msg.delta));
        break;
      case 'input_audio_buffer.speech_started':
        this.onInterrupted();
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript) this.onUserText(msg.transcript);
        break;
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        this.onGabyText(msg.delta);
        break;
      case 'response.function_call_arguments.done':
        this.runTool(msg);
        break;
      case 'response.done':
        if (!this.pendingTools) this.onTurnComplete();
        break;
    }
  }

  async runTool(msg) {
    this.pendingTools++;
    let args = {};
    try { args = JSON.parse(msg.arguments || '{}'); } catch {}
    const result = await this.onToolCall(msg.name, args);
    this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: msg.call_id, output: JSON.stringify(result) } });
    this.pendingTools--;
    if (!this.pendingTools) this.send({ type: 'response.create' });
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  sendAudio(pcm) {
    if (!this.ready) return;
    this.send({ type: 'input_audio_buffer.append', audio: toBase64(pcm) });
  }

  sendText(text) {
    this.send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
    this.send({ type: 'response.create' });
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
