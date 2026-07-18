import { Injectable } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import { Server, WebSocket } from 'ws';
import { AuthService } from '@/common/auth';
import { SpeechService } from '@/application/speech.service';
import type { Principal } from '@/domain/types';

@WebSocketGateway({ path: '/ws/v1/voice' })
@Injectable()
export class VoiceGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(private readonly auth: AuthService, private readonly speech: SpeechService) {}
  handleConnection(client: WebSocket, req: IncomingMessage) {
    const url = new URL(req.url ?? '/ws/v1/voice', 'http://localhost');
    const token = (req.headers['x-device-token'] as string | undefined) ?? url.searchParams.get('token') ?? undefined;
    const principal = this.auth.authenticate(token);
    if (!principal || principal.role !== 'device') { client.close(4401, 'UNAUTHORIZED'); return; }
    let sessionId = url.searchParams.get('sessionId') ?? undefined;
    client.send(JSON.stringify({ type: 'connected', sessionId: sessionId ?? null, wakeWord: '阿西' }));
    client.on('message', async raw => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') { client.send(JSON.stringify({ type: 'pong', ts: Date.now() })); return; }
        if (msg.type === 'start') { const s = await this.speech.createSession(principal, { deviceId: msg.deviceId ?? principal.deviceId, mode: msg.mode ?? 'adult', persona: msg.persona ?? 'mom', wakeWord: '阿西', wakeModelVersion: msg.wakeModelVersion ?? 'unknown' }); sessionId = s.sessionId; client.send(JSON.stringify({ type: 'started', ...s })); return; }
        if (!sessionId) throw new Error('SESSION_REQUIRED');
        if (msg.type === 'audio') { client.send(JSON.stringify({ type: 'audio_ack', seq: msg.seq ?? 0 })); return; }
        if (msg.type === 'asr') { client.send(JSON.stringify({ type: 'asr_result', ...await this.speech.recognize(principal, sessionId, msg.audioBase64 ?? '') })); return; }
        if (msg.type === 'route') { client.send(JSON.stringify({ type: 'dialect_result', ...await this.speech.route(principal, { sessionId, ...msg }) })); return; }
        if (msg.type === 'tts_request') { client.send(JSON.stringify({ type: 'tts_start', ...await this.speech.tts(principal, { sessionId, text: msg.text, dialect: msg.dialect ?? 'mandarin', voiceId: msg.voiceId, model: msg.model }, msg.traceId ?? 'ws') })); return; }
        if (msg.type === 'end') { await this.speech.complete(principal, sessionId); client.send(JSON.stringify({ type: 'completed', sessionId })); return; }
        throw new Error('UNSUPPORTED_FRAME');
      } catch (e: any) { client.send(JSON.stringify({ type: 'error', code: e?.code ?? 400101, error: e?.error ?? 'WS_PROTOCOL_ERROR', message: e?.message ?? '语音协议错误' })); }
    });
  }
}
