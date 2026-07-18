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
exports.dataStoreProvider = exports.MongoDataStore = exports.MemoryDataStore = exports.DATA_STORE = void 0;
const common_1 = require("@nestjs/common");
const mongodb_1 = require("mongodb");
const app_config_1 = require("../config/app-config");
const errors_1 = require("../common/errors");
exports.DATA_STORE = Symbol('DATA_STORE');
const match = (v, f) => Object.entries(f).every(([k, e]) => Array.isArray(e) ? e.includes(v[k]) : v[k] === e);
let MemoryDataStore = class MemoryDataStore {
    m = new Map();
    constructor() { this.seed(); }
    async ping() { return true; }
    async get(c, id) { return this.b(c).get(id) ?? null; }
    async find(c, f = {}) { return [...this.b(c).values()].filter(x => match(x, f)); }
    async insert(c, v) { if (this.b(c).has(v.id))
        throw (0, errors_1.conflict)('资源已存在'); this.b(c).set(v.id, structuredClone(v)); return structuredClone(v); }
    async patch(c, id, p) { const o = this.b(c).get(id); if (!o)
        throw (0, errors_1.notFound)(); const n = { ...o, ...structuredClone(p), id, updatedAt: new Date().toISOString() }; this.b(c).set(id, n); return structuredClone(n); }
    async remove(c, id) { return this.b(c).delete(id); }
    b(c) { let x = this.m.get(c); if (!x) {
        x = new Map();
        this.m.set(c, x);
    } return x; }
    put(c, x) { this.b(c).set(x.id, x); }
    seed() { const t = new Date().toISOString(), b = { createdAt: t, updatedAt: t }; this.put('users', { ...b, id: 'u_1', openId: 'openid_1', nickname: '小庆', defaultMode: 'adult', defaultPersona: 'mom', subscriptionLevel: 'premium', status: 'active', consentFlags: { memory: true, voiceClone: true } }); this.put('users', { ...b, id: 'u_2', openId: 'openid_2', nickname: '小喜', defaultMode: 'adult', defaultPersona: 'bestie', subscriptionLevel: 'basic', status: 'active', consentFlags: { memory: true } }); for (const [d, sn, u, n, p] of [['d_001', 'SN001', 'u_1', '庆喜儿一号', 'mom'], ['d_002', 'SN002', 'u_2', '庆喜儿二号', 'bestie']]) {
        this.put('devices', { ...b, id: d, deviceId: d, sn, name: n, model: 'QXR-S3', hardwareRev: '1.0', firmwareVersion: '1.1.0', wakeModelVersion: 'wakenet9-axi-1.0.0', status: 'active' });
        this.put('bindings', { ...b, id: `bind_${d}`, userId: u, deviceId: d, role: 'owner', bindStatus: 'active', mode: 'adult', persona: p });
        this.put('deviceStatuses', { ...b, id: d, deviceId: d, online: true, batteryPercent: d === 'd_001' ? 86 : 73, charging: false, wifiRssi: -55, temperature: 36.8, currentMode: 'adult', currentPersona: p, firmwareVersion: '1.1.0', lastSeenAt: t });
        this.put('speechProfiles', { ...b, id: d, deviceId: d, autoDialect: true, fallbackDialect: 'mandarin', highConfidenceThreshold: .75, mediumConfidenceThreshold: .55, cloneVoiceId: d === 'd_001' ? 'voice_clone_1' : null, cloneModel: 'cosyvoice-v3.5-flash', systemModel: 'qwen3-tts-flash-realtime', version: 1 });
        this.put('parentControls', { ...b, id: d, deviceId: d, allowedTimeRanges: [{ start: '07:00', end: '21:00' }], contentSwitches: { english_songs: true, bedtime_stories: true }, maxVolume: 70, dialogRecordEnabled: true, heatingEnabled: true });
    } for (const [id, type, cat, title, text] of [['content_song_1', 'song', '中文经典', '小星星', null], ['content_story_1', 'story', '睡前故事', '三只小猪', null], ['content_qa_1', 'qa', '数学启蒙', '1+1等于几', '1+1等于2。']])
        this.put('contentItems', { ...b, id, type, category: cat, title, text, audioUrl: `https://cdn.example.com/${id}.mp3`, duration: 120, enabled: true, auditStatus: 'approved' }); for (const p of [{ id: 'mom', name: '妈妈', defaultVoiceId: 'voice_mom' }, { id: 'dad', name: '爸爸', defaultVoiceId: 'voice_dad' }, { id: 'lover', name: '恋人', defaultVoiceId: 'voice_lover' }, { id: 'teacher', name: '老师', defaultVoiceId: 'voice_teacher' }, { id: 'bestie', name: '闺蜜', defaultVoiceId: 'voice_bestie' }])
        this.put('personas', { ...b, ...p, enabled: true }); for (const p of [{ id: 'free', name: '免费版', monthlyPrice: 0, yearlyPrice: 0, limits: { customQas: 0, reminders: 5, customContents: 0, voiceClones: 1 } }, { id: 'basic', name: '基础订阅', monthlyPrice: 9.9, yearlyPrice: 99, limits: { customQas: 50, reminders: 20, customContents: 10, voiceClones: 1 } }, { id: 'premium', name: '高级订阅', monthlyPrice: 19.9, yearlyPrice: 199, limits: { customQas: 200, reminders: 100, customContents: 50, voiceClones: 2 } }])
        this.put('subscriptions', { ...b, ...p }); for (const x of [{ id: 'task_talk', title: '与阿西对话5分钟', reward: 10, type: 'daily' }, { id: 'task_message', title: '给亲友发送留言', reward: 15, type: 'pair' }])
        this.put('tasks', { ...b, ...x, enabled: true }); for (const x of [{ id: 'prod_doll', name: '庆喜儿AI玩具', price: 699, stock: 100, type: 'device' }, { id: 'prod_skin', name: '限定虚拟皮肤', price: 50, stock: 999, type: 'reward' }])
        this.put('products', { ...b, ...x, enabled: true }); }
};
exports.MemoryDataStore = MemoryDataStore;
exports.MemoryDataStore = MemoryDataStore = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MemoryDataStore);
let MongoDataStore = class MongoDataStore {
    cfg;
    c;
    db;
    constructor(cfg) {
        this.cfg = cfg;
    }
    async onModuleInit() { this.c = new mongodb_1.MongoClient(this.cfg.mongoUri); await this.c.connect(); this.db = this.c.db(); }
    async onApplicationShutdown() { await this.c?.close(); }
    col(n) { if (!this.db)
        throw new Error('MONGO_NOT_READY'); return this.db.collection(n); }
    async ping() { return Boolean((await this.db.command({ ping: 1 })).ok); }
    async get(n, id) { return await this.col(n).findOne({ id }); }
    async find(n, f = {}) { return await this.col(n).find(f).toArray(); }
    async insert(n, v) { await this.col(n).insertOne(v); return v; }
    async patch(n, id, p) { const x = await this.col(n).findOneAndUpdate({ id }, { $set: { ...p, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' }); if (!x)
        throw (0, errors_1.notFound)(); return x; }
    async remove(n, id) { return (await this.col(n).deleteOne({ id })).deletedCount === 1; }
};
exports.MongoDataStore = MongoDataStore;
exports.MongoDataStore = MongoDataStore = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig])
], MongoDataStore);
exports.dataStoreProvider = { provide: exports.DATA_STORE, inject: [app_config_1.AppConfig], useFactory: (c) => c.storageBackend === 'mongo' ? new MongoDataStore(c) : new MemoryDataStore() };
//# sourceMappingURL=data-store.js.map