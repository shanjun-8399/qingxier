"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const ws_1 = require("ws");
const auth_1 = require("../common/auth");
const speech_service_1 = require("../application/speech.service");
let VoiceGateway = class VoiceGateway {
    auth;
    speech;
    server;
    constructor(auth, speech) {
        this.auth = auth;
        this.speech = speech;
    }
    handleConnection(client, req) {
        const url = new URL(req.url ?? '/ws/v1/voice', 'http://localhost');
        const token = req.headers['x-device-token'] ?? url.searchParams.get('token') ?? undefined;
        const principal = this.auth.authenticate(token);
        if (!principal || principal.role !== 'device') {
            client.close(4401, 'UNAUTHORIZED');
            return;
        }
        let sessionId = url.searchParams.get('sessionId') ?? undefined;
        client.send(JSON.stringify({ type: 'connected', sessionId: sessionId ?? null, wakeWord: '阿西' }));
        client.on('message', async (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === 'ping') {
                    client.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
                    return;
                }
                if (msg.type === 'start') {
                    const s = await this.speech.createSession(principal, { deviceId: msg.deviceId ?? principal.deviceId, mode: msg.mode ?? 'adult', persona: msg.persona ?? 'mom', wakeWord: '阿西', wakeModelVersion: msg.wakeModelVersion ?? 'unknown' });
                    sessionId = s.sessionId;
                    client.send(JSON.stringify({ type: 'started', ...s }));
                    return;
                }
                if (!sessionId)
                    throw new Error('SESSION_REQUIRED');
                if (msg.type === 'audio') {
                    client.send(JSON.stringify({ type: 'audio_ack', seq: msg.seq ?? 0 }));
                    return;
                }
                if (msg.type === 'asr') {
                    client.send(JSON.stringify({ type: 'asr_result', ...await this.speech.recognize(principal, sessionId, msg.audioBase64 ?? '') }));
                    return;
                }
                if (msg.type === 'route') {
                    client.send(JSON.stringify({ type: 'dialect_result', ...await this.speech.route(principal, { sessionId, ...msg }) }));
                    return;
                }
                if (msg.type === 'tts_request') {
                    client.send(JSON.stringify({ type: 'tts_start', ...await this.speech.tts(principal, { sessionId, text: msg.text, dialect: msg.dialect ?? 'mandarin', voiceId: msg.voiceId, model: msg.model }, msg.traceId ?? 'ws') }));
                    return;
                }
                if (msg.type === 'end') {
                    await this.speech.complete(principal, sessionId);
                    client.send(JSON.stringify({ type: 'completed', sessionId }));
                    return;
                }
                throw new Error('UNSUPPORTED_FRAME');
            }
            catch (e) {
                client.send(JSON.stringify({ type: 'error', code: e?.code ?? 400101, error: e?.error ?? 'WS_PROTOCOL_ERROR', message: e?.message ?? '语音协议错误' }));
            }
        });
    }
};
exports.VoiceGateway = VoiceGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], VoiceGateway.prototype, "server", void 0);
exports.VoiceGateway = VoiceGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ path: '/ws/v1/voice' }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_1.AuthService, speech_service_1.SpeechService])
], VoiceGateway);
//# sourceMappingURL=voice.gateway.js.map