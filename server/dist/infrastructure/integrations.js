"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProvider = exports.DashScopeProviders = exports.MockAiProviders = exports.AI_PROVIDERS = exports.eventBusProvider = exports.MqttEventBus = exports.MemoryEventBus = exports.EVENT_BUS = void 0;
const mqtt_1 = __importDefault(require("mqtt"));
const app_config_1 = require("../config/app-config");
exports.EVENT_BUS = Symbol('EVENT_BUS');
class MemoryEventBus {
    l = [];
    async publish(topic, payload) { this.l.push({ topic, payload: structuredClone(payload) }); }
    events() { return structuredClone(this.l); }
    async close() { }
}
exports.MemoryEventBus = MemoryEventBus;
class MqttEventBus {
    c;
    constructor(u) { this.c = mqtt_1.default.connect(u); }
    async publish(t, p) { await new Promise((r, j) => this.c.publish(t, JSON.stringify(p), { qos: 1 }, e => e ? j(e) : r())); }
    events() { return []; }
    async close() { await this.c.endAsync(); }
}
exports.MqttEventBus = MqttEventBus;
exports.eventBusProvider = { provide: exports.EVENT_BUS, inject: [app_config_1.AppConfig], useFactory: (c) => c.eventBackend === 'mqtt' ? new MqttEventBus(c.mqttUrl) : new MemoryEventBus() };
exports.AI_PROVIDERS = Symbol('AI_PROVIDERS');
class MockAiProviders {
    async recognize(_a) { return { text: '你好阿西', dialectCandidate: 'mandarin', confidence: .93 }; }
    async synthesize(i) { return { audioUrl: `https://cdn.example.com/tts/${encodeURIComponent(i.model)}-${encodeURIComponent(i.dialect)}.mp3`, durationMs: Math.max(500, i.text.length * 180) }; }
    async chat(i) { return `${i.persona}：我听见了，“${i.text}”。我会陪着你。`; }
    async audit(i) { const x = /暴力|色情|自杀/.test(i.content); return { status: x ? 'rejected' : 'approved', labels: x ? ['unsafe'] : [] }; }
}
exports.MockAiProviders = MockAiProviders;
class DashScopeProviders {
    c;
    constructor(c) {
        this.c = c;
    }
    async recognize(_a) { throw new Error('DASHSCOPE_STREAMING_ASR_REQUIRES_WS'); }
    async synthesize(i) { const r = await fetch(`${this.c.dashscopeBaseUrl}/api/v1/services/audio/tts/SpeechSynthesizer`, { method: 'POST', headers: { Authorization: `Bearer ${this.c.dashscopeApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: i.model, input: { text: i.text, voice: i.voiceId, instruction: `请使用${i.dialect}自然表达` } }) }); if (!r.ok)
        throw new Error(`DASHSCOPE_TTS_${r.status}`); const b = await r.json(); return { audioUrl: b.output?.audio?.url ?? b.output?.audio_url, durationMs: b.usage?.duration ?? 0 }; }
    async chat(i) { const r = await fetch(`${this.c.llmBaseUrl.replace(/\/$/, '')}/v1/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${this.c.llmApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: this.c.llmModel, messages: [{ role: 'system', content: `你是庆喜儿${i.persona}人格，模式${i.mode}` }, { role: 'user', content: i.text }] }) }); if (!r.ok)
        throw new Error(`LLM_${r.status}`); const b = await r.json(); return b.choices?.[0]?.message?.content ?? '我在听。'; }
    async audit(_i) { return { status: 'approved', labels: [] }; }
}
exports.DashScopeProviders = DashScopeProviders;
exports.aiProvider = { provide: exports.AI_PROVIDERS, inject: [app_config_1.AppConfig], useFactory: (c) => c.providerMode === 'dashscope' ? new DashScopeProviders(c) : new MockAiProviders() };
//# sourceMappingURL=integrations.js.map