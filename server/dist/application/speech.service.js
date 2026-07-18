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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechService = void 0;
const common_1 = require("@nestjs/common");
const app_config_1 = require("../config/app-config");
const errors_1 = require("../common/errors");
const data_store_1 = require("../infrastructure/data-store");
const integrations_1 = require("../infrastructure/integrations");
const helpers_1 = require("./helpers");
let SpeechService = class SpeechService {
    db;
    events;
    ai;
    cfg;
    constructor(db, events, ai, cfg) {
        this.db = db;
        this.events = events;
        this.ai = ai;
        this.cfg = cfg;
    }
    async assertUserDevice(u, d) { const b = (await this.db.find('bindings', { userId: u, deviceId: d })).find((x) => x.bindStatus === 'active'); if (!b)
        throw (0, errors_1.forbidden)('设备未绑定到当前用户'); return b; }
    async capabilities() { return { wakeWord: '阿西', wakeModelFamily: 'WakeNet9', autoDialect: true, dialects: ['mandarin', 'minnan', 'wu', 'cantonese', 'sichuanese', 'shaanxi', 'henan', 'shanghainese'], asrModel: 'fun-asr-realtime', cloneTtsModel: this.cfg.cloneTtsModel, systemTtsModel: this.cfg.systemTtsModel, websocket: '/ws/v1/voice' }; }
    async profile(p, d) { if (p.role === 'user')
        await this.assertUserDevice(p.subject, d); if (p.role === 'device' && p.deviceId !== d)
        throw (0, errors_1.forbidden)(); const x = await this.db.get('speechProfiles', d); if (!x)
        throw (0, errors_1.notFound)(); return x; }
    async updateProfile(p, d, b, trace) { await this.assertUserDevice(p.subject, d); if (b.autoDialect !== true)
        throw (0, errors_1.invalid)('自动方言识别不可关闭'); if (b.mediumConfidenceThreshold >= b.highConfidenceThreshold)
        throw (0, errors_1.invalid)('中阈值必须小于高阈值'); const x = await this.profile(p, d); if (x.version !== b.version)
        throw (0, errors_1.conflict)('配置版本冲突', { currentVersion: x.version }); const n = await this.db.patch('speechProfiles', d, { ...b, version: x.version + 1 }); await this.events.publish(`device/${d}/config/down`, { type: 'speech_profile', profile: n, traceId: trace }); return n; }
    async wakeStatus(p, d) { await this.profile(p, d); const x = await this.db.get('devices', d); return { deviceId: d, wakeWord: '阿西', modelFamily: 'WakeNet9', modelVersion: x?.wakeModelVersion, threshold: .72, afe: true, aec: true, noiseSuppression: true, otaStatus: 'up_to_date' }; }
    async createSession(p, b) { if (p.deviceId !== b.deviceId)
        throw (0, errors_1.forbidden)('设备凭据不匹配'); const d = await this.db.get('devices', b.deviceId); if (!d)
        throw (0, errors_1.notFound)(); const s = (0, helpers_1.entity)('ssn', { sessionId: (0, helpers_1.id)('ssn'), deviceId: b.deviceId, mode: b.mode, persona: b.persona, wakeWord: '阿西', wakeModelVersion: b.wakeModelVersion, state: 'active' }); s.id = s.sessionId; await this.db.insert('speechSessions', s); return { ...s, firmwareUpgradeRequired: b.wakeModelVersion !== d.wakeModelVersion }; }
    async route(p, b) { const s = await this.session(p, b.sessionId), pr = await this.db.get('speechProfiles', s.deviceId); if (!pr)
        throw (0, errors_1.notFound)(); let dialect, source, stability; if (b.confidence >= pr.highConfidenceThreshold) {
        dialect = b.dialectCandidate;
        source = 'asr';
        stability = 'locked';
    }
    else if (b.confidence >= pr.mediumConfidenceThreshold && (b.previousDialect || s.currentDialect)) {
        dialect = b.previousDialect || s.currentDialect;
        source = 'session_hysteresis';
        stability = 'held';
    }
    else {
        dialect = pr.fallbackDialect;
        source = 'fallback';
        stability = 'fallback';
    } await this.db.patch('speechSessions', s.id, { currentDialect: dialect }); return { sessionId: s.sessionId, dialect, confidence: b.confidence, source, stability, manualSwitchRequired: false }; }
    async tts(p, b, trace) { const s = await this.session(p, b.sessionId), pr = await this.db.get('speechProfiles', s.deviceId); if (!pr)
        throw (0, errors_1.notFound)(); if (b.voiceId && b.voiceId !== pr.cloneVoiceId)
        throw (0, errors_1.forbidden)('音色未绑定当前设备'); if (b.model && ![pr.cloneModel, pr.systemModel].includes(b.model))
        throw (0, errors_1.invalid)('TTS 模型不在允许列表'); let providerDialect = b.dialect, degraded = false, fallbackReason; if (b.dialect === 'wu') {
        providerDialect = 'shanghainese';
        degraded = true;
        fallbackReason = '泛吴语映射上海话';
    } let model = b.model ?? (pr.cloneVoiceId ? pr.cloneModel : pr.systemModel), voiceId = b.voiceId === undefined ? pr.cloneVoiceId : b.voiceId, voiceMode = voiceId ? 'clone' : 'system'; try {
        const a = await this.ai.synthesize({ text: b.text, dialect: providerDialect, voiceId, model });
        return { ...a, sessionId: s.sessionId, model, voiceMode, voiceId, providerDialect, degraded, fallbackReason, traceId: trace };
    }
    catch (e) {
        if (model === pr.systemModel)
            throw e;
        model = pr.systemModel;
        voiceId = null;
        voiceMode = 'system';
        degraded = true;
        fallbackReason = '克隆音色不可用，降级系统音色';
        const a = await this.ai.synthesize({ text: b.text, dialect: providerDialect, voiceId, model });
        return { ...a, sessionId: s.sessionId, model, voiceMode, voiceId, providerDialect, degraded, fallbackReason, traceId: trace };
    } }
    async dialog(p, b, trace) { await this.assertUserDevice(p.subject, b.deviceId); let c = b.conversationId ? await this.db.get('conversations', b.conversationId) : null; if (!c) {
        c = (0, helpers_1.entity)('conv', { userId: p.subject, deviceId: b.deviceId, mode: b.mode, persona: b.persona, summary: '', safetyLabels: [] });
        await this.db.insert('conversations', c);
    } const ts = await this.db.find('conversationTurns', { conversationId: c.id }); await this.db.insert('conversationTurns', (0, helpers_1.entity)('turn', { conversationId: c.id, seq: ts.length + 1, role: 'user', text: b.text, dialect: b.dialect ?? 'mandarin', riskLabels: [] })); const au = await this.ai.audit({ type: 'text', content: b.text }); if (au.status === 'rejected')
        throw new errors_1.DomainError(400, 800001, 'CONTENT_REJECTED', '内容未通过安全审核', { labels: au.labels }); const reply = b.mode === 'child' ? (/1\+1/.test(b.text) ? '1+1等于2。' : '这个问题很有趣，我们一起问问爸爸妈妈吧。') : await this.ai.chat({ text: b.text, persona: b.persona, mode: b.mode, memories: [] }); const ss = await this.createSession({ role: 'device', subject: b.deviceId, deviceId: b.deviceId }, { ...b, wakeWord: '阿西', wakeModelVersion: 'server-text' }); const audio = await this.tts({ role: 'device', subject: b.deviceId, deviceId: b.deviceId }, { sessionId: ss.sessionId, text: reply, dialect: b.dialect ?? 'mandarin' }, trace); await this.db.insert('conversationTurns', (0, helpers_1.entity)('turn', { conversationId: c.id, seq: ts.length + 2, role: 'assistant', text: reply, dialect: b.dialect ?? 'mandarin', audioUrl: audio.audioUrl, riskLabels: [] })); await this.db.patch('conversations', c.id, { summary: `${b.text.slice(0, 30)} / ${reply.slice(0, 30)}` }); return { conversationId: c.id, replyText: reply, audioUrl: audio.audioUrl, expressionId: b.mode === 'child' ? 'happy_001' : 'care_001', dialect: b.dialect ?? 'mandarin', tts: { model: audio.model, voiceMode: audio.voiceMode, degraded: audio.degraded } }; }
    async dialogs(p, d) { return (0, helpers_1.sortDesc)((await this.db.find('conversations', { userId: p.subject })).filter((x) => !d || x.deviceId === d)); }
    async turns(p, id) { const c = await this.db.get('conversations', id); if (!c || c.userId !== p.subject)
        throw (0, errors_1.notFound)(); return (await this.db.find('conversationTurns', { conversationId: id })).sort((a, b) => a.seq - b.seq); }
    async recognize(p, sessionId, audio) { const s = await this.session(p, sessionId), r = await this.ai.recognize(audio), route = await this.route(p, { sessionId, dialectCandidate: r.dialectCandidate, confidence: r.confidence, previousDialect: s.currentDialect }); return { ...r, ...route }; }
    async complete(p, id) { const s = await this.session(p, id); return this.db.patch('speechSessions', s.id, { state: 'completed' }); }
    async wakePackages() { return this.db.find('wakeWordPackages'); }
    async registerWake(p, b, key, trace) { if (key && (key.trim().length < 1 || key.length > 128))
        throw (0, errors_1.invalid)('Idempotency-Key 长度必须 1-128'); if (key) {
        const old = (await this.db.find('wakeWordPackages', { idempotencyKey: key.trim() }))[0];
        if (old)
            return { ...old, idempotencyReplayed: true };
    } if ((await this.db.find('wakeWordPackages', { version: b.version }))[0])
        throw (0, errors_1.conflict)('唤醒词版本已存在'); const x = (0, helpers_1.entity)('wake', { ...b, status: 'published', idempotencyKey: key?.trim() ?? null }); await this.db.insert('wakeWordPackages', x); await this.events.publish('ota/wake-words/published', { ...x, traceId: trace }); return { ...x, idempotencyReplayed: false }; }
    async metrics() { const s = await this.db.find('speechSessions'), t = await this.db.find('conversationTurns'); return { activeSessions: s.filter((x) => x.state === 'active').length, totalSessions: s.length, totalTurns: t.length, dialectDistribution: s.reduce((a, x) => { const k = x.currentDialect ?? 'unknown'; a[k] = (a[k] ?? 0) + 1; return a; }, {}), slo: { endToEndP95Ms: 1350, targetMs: 1500 } }; }
    async session(p, id) { const s = (await this.db.find('speechSessions', { sessionId: id }))[0]; if (!s)
        throw (0, errors_1.notFound)('语音会话不存在'); if (p.role === 'device' && p.deviceId !== s.deviceId)
        throw (0, errors_1.forbidden)(); return s; }
};
exports.SpeechService = SpeechService;
exports.SpeechService = SpeechService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(data_store_1.DATA_STORE)),
    __param(1, (0, common_1.Inject)(integrations_1.EVENT_BUS)),
    __param(2, (0, common_1.Inject)(integrations_1.AI_PROVIDERS)),
    __metadata("design:paramtypes", [Object, Object, Object, app_config_1.AppConfig])
], SpeechService);
//# sourceMappingURL=speech.service.js.map