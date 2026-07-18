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
exports.PlatformService = void 0;
const common_1 = require("@nestjs/common");
const app_config_1 = require("../config/app-config");
const auth_1 = require("../common/auth");
const errors_1 = require("../common/errors");
const data_store_1 = require("../infrastructure/data-store");
const integrations_1 = require("../infrastructure/integrations");
const helpers_1 = require("./helpers");
const speech_service_1 = require("./speech.service");
let PlatformService = class PlatformService {
    db;
    events;
    ai;
    config;
    auth;
    speech;
    constructor(db, events, ai, config, auth, speech) {
        this.db = db;
        this.events = events;
        this.ai = ai;
        this.config = config;
        this.auth = auth;
        this.speech = speech;
    }
    health() { return { status: 'ok', service: 'qingxier-server', version: '2.0.0', environment: this.config.appEnv }; }
    async ready() {
        try {
            return { status: (await this.db.ping()) ? 'ready' : 'not_ready', storage: this.config.storageBackend, events: this.config.eventBackend, providers: this.config.providerMode };
        }
        catch (e) {
            return { status: 'not_ready', storage: this.config.storageBackend, events: this.config.eventBackend, providers: this.config.providerMode, reason: e instanceof Error ? e.name : 'UNKNOWN' };
        }
    }
    async login(body) {
        const existing = (await this.db.find('users', { openId: `openid_${body.code}` }))[0];
        const user = existing ?? await this.db.get('users', 'u_1');
        if (!user)
            throw (0, errors_1.notFound)();
        return { accessToken: this.auth.sign(user.id, 'user', 7200), refreshToken: this.auth.sign(user.id, 'user', 2592000), expiresIn: 7200, user, needBindPhone: !user.phone };
    }
    async refresh(_body) { return { accessToken: this.auth.sign('u_1', 'user', 7200), expiresIn: 7200 }; }
    async bindPhone(p, body) { if (this.config.appEnv !== 'production' && body.smsCode !== '123456')
        throw (0, errors_1.invalid)('验证码错误'); return this.db.patch('users', p.subject, { phone: body.phone }); }
    async me(p) { const u = await this.db.get('users', p.subject); if (!u)
        throw (0, errors_1.notFound)(); return u; }
    async updateMe(p, body) { return this.db.patch('users', p.subject, body); }
    async exportMe(p) { return { user: await this.me(p), devices: await this.devices(p), reminders: await this.reminders(p), messages: await this.messages(p), generatedAt: (0, helpers_1.now)() }; }
    async deleteMe(p) { await this.db.patch('users', p.subject, { status: 'disabled' }); return { deleted: true, retentionDays: 30 }; }
    async addresses(p) { return this.db.find('addresses', { userId: p.subject }); }
    async addAddress(p, body) { if (body.isDefault)
        await this.clearDefaults(p.subject); return this.db.insert('addresses', (0, helpers_1.entity)('addr', { ...body, userId: p.subject })); }
    async patchAddress(p, aid, body) { await this.own('addresses', aid, p.subject, 'userId'); if (body.isDefault)
        await this.clearDefaults(p.subject); return this.db.patch('addresses', aid, body); }
    async deleteAddress(p, aid) { await this.own('addresses', aid, p.subject, 'userId'); return { deleted: await this.db.remove('addresses', aid) }; }
    async bindTicket(_p, body) {
        const d = (await this.db.find('devices', { sn: body.deviceSn }))[0];
        if (!d)
            throw (0, errors_1.notFound)('设备序列号不存在');
        return { ticket: (0, helpers_1.id)('ticket'), deviceId: d.deviceId, expiresAt: new Date(Date.now() + 300000).toISOString(), cloudMqttHost: 'mqtt.qingxier.com', cloudWsHost: 'voice.qingxier.com' };
    }
    async bindDevice(p, body) {
        const d = await this.db.get('devices', body.deviceId);
        if (!d)
            throw (0, errors_1.notFound)();
        const old = (await this.db.find('bindings', { deviceId: body.deviceId })).find((x) => x.bindStatus === 'active');
        if (old && old.userId !== p.subject)
            throw (0, errors_1.conflict)('设备已绑定其他用户');
        if (!old)
            await this.db.insert('bindings', (0, helpers_1.entity)('bind', { userId: p.subject, deviceId: body.deviceId, role: 'owner', bindStatus: 'active', mode: 'adult', persona: 'mom' }));
        return { device: d, binding: { userId: p.subject, deviceId: body.deviceId }, mqttUsername: `device_${body.deviceId}` };
    }
    async devices(p) {
        const bindings = (await this.db.find('bindings', { userId: p.subject })).filter((x) => x.bindStatus === 'active');
        const out = [];
        for (const b of bindings) {
            const d = await this.db.get('devices', b.deviceId);
            const s = await this.db.get('deviceStatuses', b.deviceId);
            if (d && s)
                out.push({ ...d, ...s });
        }
        return out;
    }
    async deviceStatus(p, did) { await this.speech.assertUserDevice(p.subject, did); const d = await this.db.get('devices', did); const s = await this.db.get('deviceStatuses', did); if (!d || !s)
        throw (0, errors_1.notFound)(); return { ...d, ...s }; }
    async updateDevice(p, did, body) {
        await this.speech.assertUserDevice(p.subject, did);
        if (body.name)
            await this.db.patch('devices', did, { name: body.name });
        if (body.defaultMode || body.defaultPersona) {
            const b = (await this.db.find('bindings', { userId: p.subject, deviceId: did }))[0];
            await this.db.patch('bindings', b.id, { mode: body.defaultMode ?? b.mode, persona: body.defaultPersona ?? b.persona });
            await this.db.patch('deviceStatuses', did, { currentMode: body.defaultMode ?? b.mode, currentPersona: body.defaultPersona ?? b.persona });
        }
        return this.deviceStatus(p, did);
    }
    async unbind(p, did) { const b = await this.speech.assertUserDevice(p.subject, did); await this.db.patch('bindings', b.id, { bindStatus: 'revoked' }); await this.events.publish(`device/${did}/auth/revoke`, { userId: p.subject }); return { success: true }; }
    async command(p, did, body, traceId) { await this.speech.assertUserDevice(p.subject, did); const commandId = (0, helpers_1.id)('cmd'); await this.events.publish(`device/${did}/command/down`, { commandId, ...body, expireAt: new Date(Date.now() + (body.expireInSeconds ?? 30) * 1000).toISOString(), traceId }); return { commandId, status: 'queued' }; }
    async reminders(p) { return (0, helpers_1.sortDesc)(await this.db.find('reminders', { userId: p.subject })); }
    async addReminder(p, body) { await this.speech.assertUserDevice(p.subject, body.deviceId); await this.ensureLimit(p.subject, 'reminders', (await this.reminders(p)).length); return this.db.insert('reminders', (0, helpers_1.entity)('rem', { ...body, userId: p.subject, enabled: body.enabled ?? true, nextTriggerAt: this.nextTrigger(body.timeOfDay) })); }
    async patchReminder(p, rid, body) { const r = await this.own('reminders', rid, p.subject, 'userId'); return this.db.patch('reminders', rid, { ...body, nextTriggerAt: body.timeOfDay ? this.nextTrigger(body.timeOfDay) : r.nextTriggerAt }); }
    async deleteReminder(p, rid) { await this.own('reminders', rid, p.subject, 'userId'); return { deleted: await this.db.remove('reminders', rid) }; }
    async confirmReminder(p, rid, body) { const r = await this.own('reminders', rid, p.subject, 'userId'); const e = (0, helpers_1.entity)('remevt', { reminderId: rid, userId: p.subject, status: 'confirmed', source: body.source, confirmedAt: body.confirmedAt ?? (0, helpers_1.now)(), angerDelta: -100 }); await this.db.insert('reminderEvents', e); await this.events.publish(`device/${r.deviceId}/reminder/confirmed`, e); return e; }
    async reminderEvents(p, rid) { await this.own('reminders', rid, p.subject, 'userId'); return this.db.find('reminderEvents', { reminderId: rid }); }
    async invitations(p) { return this.db.find('relationships', { targetUserId: p.subject, status: 'pending' }); }
    async invite(p, body) {
        if (body.targetUserId === p.subject)
            throw (0, errors_1.invalid)('不能邀请自己');
        if (!await this.db.get('users', body.targetUserId))
            throw (0, errors_1.notFound)('目标用户不存在');
        if ((await this.db.find('relationships', { ownerUserId: p.subject, targetUserId: body.targetUserId })).some((x) => x.status !== 'rejected'))
            throw (0, errors_1.conflict)('关系或邀请已存在');
        return this.db.insert('relationships', (0, helpers_1.entity)('rel', { ownerUserId: p.subject, targetUserId: body.targetUserId, relationType: body.relationType, status: 'pending', nickname: body.nickname, inviteCode: (0, helpers_1.id)('invite'), expiresAt: new Date(Date.now() + 604800000).toISOString() }));
    }
    async decideInvitation(p, rid, accept, body) { const r = await this.db.get('relationships', rid); if (!r || r.targetUserId !== p.subject || r.status !== 'pending')
        throw (0, errors_1.notFound)(); return this.db.patch('relationships', rid, { status: accept ? 'active' : 'rejected', nickname: body.nickname ?? r.nickname }); }
    async relations(p) { return (await this.db.find('relationships')).filter((x) => x.status === 'active' && [x.ownerUserId, x.targetUserId].includes(p.subject)); }
    async deleteRelation(p, rid) { const r = await this.db.get('relationships', rid); if (!r || ![r.ownerUserId, r.targetUserId].includes(p.subject))
        throw (0, errors_1.notFound)(); return { deleted: await this.db.remove('relationships', rid) }; }
    async messages(p) { return (0, helpers_1.sortDesc)((await this.db.find('messages')).filter((x) => x.senderId === p.subject || x.receiverId === p.subject)); }
    async sendMessage(p, body) {
        const r = await this.db.get('relationships', body.relationId);
        if (!r || r.status !== 'active' || ![r.ownerUserId, r.targetUserId].includes(p.subject))
            throw (0, errors_1.forbidden)('亲友关系无效');
        if (body.messageType === 'text' && !body.text)
            throw (0, errors_1.invalid)('文字留言缺少 text');
        if (body.messageType === 'audio' && !body.audioUrl)
            throw (0, errors_1.invalid)('语音留言缺少 audioUrl');
        const audit = await this.ai.audit({ type: body.messageType, content: body.text ?? body.audioUrl });
        if (audit.status === 'rejected')
            throw (0, errors_1.invalid)('留言未通过审核');
        const receiverId = r.ownerUserId === p.subject ? r.targetUserId : r.ownerUserId;
        const m = (0, helpers_1.entity)('msg', { senderId: p.subject, receiverId, relationId: r.id, receiverDeviceId: body.receiverDeviceId, messageType: body.messageType, text: body.text, audioUrl: body.audioUrl, deliveryStatus: 'delivered' });
        await this.db.insert('messages', m);
        if (body.receiverDeviceId)
            await this.events.publish(`device/${body.receiverDeviceId}/message/down`, { messageId: m.id, senderId: p.subject, text: body.text, audioUrl: body.audioUrl });
        return m;
    }
    async readMessage(p, mid) { const m = await this.db.get('messages', mid); if (!m || m.receiverId !== p.subject)
        throw (0, errors_1.notFound)(); return this.db.patch('messages', mid, { deliveryStatus: 'read', readAt: (0, helpers_1.now)() }); }
    async categories() { const all = await this.db.find('contentItems', { enabled: true, auditStatus: 'approved' }); return [...new Set(all.map((x) => x.category))].map(name => ({ name, count: all.filter((x) => x.category === name).length })); }
    async kidsContent(category) { return (await this.db.find('contentItems', { enabled: true, auditStatus: 'approved' })).filter((x) => !category || x.category === category); }
    async qas(p) { return this.db.find('customQas', { parentUserId: p.subject }); }
    async addQa(p, body) { await this.speech.assertUserDevice(p.subject, body.deviceId); if (!body.answerText && !body.answerAudioUrl)
        throw (0, errors_1.invalid)('答案不能为空'); await this.ensureLimit(p.subject, 'customQas', (await this.qas(p)).length); return this.db.insert('customQas', (0, helpers_1.entity)('qa', { ...body, parentUserId: p.subject, enabled: true })); }
    async patchQa(p, qid, body) { await this.own('customQas', qid, p.subject, 'parentUserId'); return this.db.patch('customQas', qid, body); }
    async deleteQa(p, qid) { await this.own('customQas', qid, p.subject, 'parentUserId'); return { deleted: await this.db.remove('customQas', qid) }; }
    uploadToken(p, kind) { return { uploadUrl: `https://upload.example.com/${kind}/${p.subject}/${(0, helpers_1.id)('upload')}`, objectKey: `${kind}/${p.subject}/${(0, helpers_1.id)('obj')}`, expiresIn: 900, headers: { 'x-qingxier-upload': 'signed' } }; }
    async customContents(p) { return this.db.find('customContents', { ownerUserId: p.subject }); }
    async addCustomContent(p, body) { await this.speech.assertUserDevice(p.subject, body.deviceId); await this.ensureLimit(p.subject, 'customContents', (await this.customContents(p)).length); const audit = await this.ai.audit({ type: 'audio', content: body.title }); return this.db.insert('customContents', (0, helpers_1.entity)('custom', { ...body, ownerUserId: p.subject, auditStatus: audit.status })); }
    async deleteCustomContent(p, cid) { await this.own('customContents', cid, p.subject, 'ownerUserId'); return { deleted: await this.db.remove('customContents', cid) }; }
    async parentControl(p, did) { await this.speech.assertUserDevice(p.subject, did); const x = await this.db.get('parentControls', did); if (!x)
        throw (0, errors_1.notFound)(); return x; }
    async updateParentControl(p, did, body, traceId) { await this.parentControl(p, did); const x = await this.db.patch('parentControls', did, body); await this.events.publish(`device/${did}/config/down`, { type: 'parent_control', config: x, traceId }); return x; }
    async parentRecords(p, did) { const c = await this.parentControl(p, did); if (!c.dialogRecordEnabled)
        throw (0, errors_1.forbidden)('未授权查看对话记录'); const conv = await this.db.find('conversations', { userId: p.subject, deviceId: did }); const turns = []; for (const d of conv)
        turns.push(...await this.db.find('conversationTurns', { conversationId: d.id })); return (0, helpers_1.sortDesc)(turns).slice(0, 20).map(({ audioUrl, ...x }) => x); }
    async sleepMode(p, did, traceId) { await this.parentControl(p, did); await this.events.publish(`device/${did}/command/down`, { commandType: 'sleep_mode', payload: { led: 'dim', story: true, breath: 'slow' }, traceId }); return { queued: true }; }
    personas() { return this.db.find('personas', { enabled: true }); }
    async setPersonaVoice(p, persona, body) { if (body.voiceId) {
        const v = (await this.db.find('voiceClones', { userId: p.subject, voiceId: body.voiceId }))[0];
        if (!v || v.status !== 'succeeded')
            throw (0, errors_1.forbidden)('克隆音色不可用');
    } const x = await this.db.get('personas', persona); if (!x)
        throw (0, errors_1.notFound)(); return { ...x, voiceId: body.voiceId ?? x.defaultVoiceId, userId: p.subject }; }
    async voiceClones(p) { return this.db.find('voiceClones', { userId: p.subject }); }
    async addVoiceClone(p, body) { await this.ensureLimit(p.subject, 'voiceClones', (await this.voiceClones(p)).filter((x) => x.status !== 'failed').length); return this.db.insert('voiceClones', (0, helpers_1.entity)('voice', { ...body, userId: p.subject, providerJobId: (0, helpers_1.id)('job'), status: 'training' })); }
    async voiceClone(p, vid) { return this.own('voiceClones', vid, p.subject, 'userId'); }
    async deleteVoiceClone(p, vid) { await this.voiceClone(p, vid); return { deleted: await this.db.remove('voiceClones', vid) }; }
    async voiceWebhook(provider, body) { const v = (await this.db.find('voiceClones', { providerJobId: body.jobId }))[0]; if (!v)
        throw (0, errors_1.notFound)(); return this.db.patch('voiceClones', v.id, { status: body.status, voiceId: body.voiceId, provider }); }
    async tasks(p) { const tasks = await this.db.find('tasks', { enabled: true }); const date = new Date().toISOString().slice(0, 10); const progress = await this.db.find('taskProgress', { userId: p.subject, period: date }); return tasks.map((t) => ({ ...t, completed: progress.some((x) => x.taskId === t.id && x.completed), claimed: progress.some((x) => x.taskId === t.id && x.claimed) })); }
    async claimTask(p, tid) { const t = await this.db.get('tasks', tid); if (!t)
        throw (0, errors_1.notFound)(); const date = new Date().toISOString().slice(0, 10); let prog = (await this.db.find('taskProgress', { userId: p.subject, taskId: tid, period: date }))[0]; if (prog?.claimed)
        throw (0, errors_1.conflict)('奖励已领取'); if (!prog) {
        prog = (0, helpers_1.entity)('progress', { userId: p.subject, taskId: tid, period: date, completed: true, claimed: false });
        await this.db.insert('taskProgress', prog);
    } prog = await this.db.patch('taskProgress', prog.id, { claimed: true }); await this.db.insert('rewardLedger', (0, helpers_1.entity)('reward', { userId: p.subject, delta: t.reward, type: 'task', referenceId: tid })); return { progress: prog, reward: t.reward, balance: (await this.rewardBalance(p)).balance }; }
    async rewardBalance(p) { const ledger = await this.db.find('rewardLedger', { userId: p.subject }); return { balance: ledger.reduce((s, x) => s + Number(x.delta), 0), ledger: (0, helpers_1.sortDesc)(ledger) }; }
    rewardCatalog() { return this.db.find('products', { type: 'reward', enabled: true }); }
    async redeem(p, body) { const product = await this.db.get('products', body.productId); if (!product || product.type !== 'reward')
        throw (0, errors_1.notFound)(); const balance = (await this.rewardBalance(p)).balance; if (balance < product.price)
        throw (0, errors_1.conflict)('小鱼干余额不足'); await this.db.insert('rewardLedger', (0, helpers_1.entity)('reward', { userId: p.subject, delta: -product.price, type: 'redeem', referenceId: product.id })); return { success: true, balance: balance - product.price, product }; }
    plans() { return this.db.find('subscriptions'); }
    async currentSubscription(p) { const u = await this.me(p); return { level: u.subscriptionLevel, plan: await this.db.get('subscriptions', u.subscriptionLevel), autoRenew: false, expiresAt: null }; }
    async orders(p) { return (0, helpers_1.sortDesc)(await this.db.find('orders', { userId: p.subject })); }
    async createOrder(p, body) { const plan = await this.db.get('subscriptions', body.planId); if (!plan)
        throw (0, errors_1.notFound)(); const amount = body.billingCycle === 'month' ? plan.monthlyPrice : plan.yearlyPrice; const o = (0, helpers_1.entity)('order', { userId: p.subject, orderNo: (0, helpers_1.id)('QXR'), type: 'subscription', planId: body.planId, billingCycle: body.billingCycle, amount, status: 'pending' }); await this.db.insert('orders', o); return { ...o, wechatPay: { timeStamp: String(Date.now()), nonceStr: (0, helpers_1.id)('nonce'), package: `prepay_id=${(0, helpers_1.id)('prepay')}`, signType: 'RSA', paySign: 'test-sign' } }; }
    async payment(body) { const o = (await this.db.find('orders', { orderNo: body.orderNo }))[0]; if (!o)
        throw (0, errors_1.notFound)(); if (body.signature.length < 6)
        throw (0, errors_1.forbidden)('支付签名无效'); const status = body.tradeState === 'SUCCESS' ? 'paid' : 'refunded'; const x = await this.db.patch('orders', o.id, { status, transactionId: body.transactionId }); if (status === 'paid' && o.planId)
        await this.db.patch('users', o.userId, { subscriptionLevel: o.planId }); return x; }
    cancelRenewal(p) { return { userId: p.subject, autoRenew: false, effectiveAt: 'period_end' }; }
    products() { return this.db.find('products', { enabled: true }); }
    async shopOrder(p, body) { const product = await this.db.get('products', body.productId); if (!product || product.type === 'reward')
        throw (0, errors_1.notFound)(); await this.own('addresses', body.addressId, p.subject, 'userId'); if (product.stock < body.quantity)
        throw (0, errors_1.conflict)('库存不足'); return this.db.insert('orders', (0, helpers_1.entity)('order', { userId: p.subject, orderNo: (0, helpers_1.id)('SHOP'), type: 'shop', productId: product.id, quantity: body.quantity, addressId: body.addressId, amount: product.price * body.quantity, status: 'pending' })); }
    async shopOrders(p) { return (await this.orders(p)).filter((x) => x.type === 'shop'); }
    async mood(p) { return { weekStart: new Date(Date.now() - 518400000).toISOString().slice(0, 10), distribution: { happy: 48, calm: 32, tired: 12, anxious: 8 }, keywords: ['家人', '工作', '睡眠'], conversationCount: (await this.db.find('conversations', { userId: p.subject })).length, suggestion: '本周睡眠话题较多，建议保持规律作息。' }; }
    async otaCheck(p, did, current) { if (p.role === 'user')
        await this.speech.assertUserDevice(p.subject, did); if (p.role === 'device' && p.deviceId !== did)
        throw (0, errors_1.forbidden)(); const d = await this.db.get('devices', did); if (!d)
        throw (0, errors_1.notFound)(); const xs = (await this.db.find('otaPackages', { status: 'published' })).filter((x) => x.compatibleModels.includes(d.model) && x.version !== (current ?? d.firmwareVersion)); const x = xs.at(-1); return x ? { hasUpdate: true, jobId: (0, helpers_1.id)('ota'), ...x } : { hasUpdate: false }; }
    async otaReport(p, body) { if (p.role !== 'device')
        throw (0, errors_1.forbidden)(); const x = (0, helpers_1.entity)('otareport', { deviceId: p.deviceId, ...body }); await this.db.insert('taskProgress', x); return x; }
    async dashboard() { const [users, devices, orders, messages, content] = await Promise.all(['users', 'devices', 'orders', 'messages', 'contentItems'].map((x) => this.db.find(x))); return { users: users.length, devices: devices.length, onlineDevices: (await this.db.find('deviceStatuses', { online: true })).length, orders: orders.length, revenue: orders.filter((x) => x.status === 'paid').reduce((s, x) => s + x.amount, 0), messages: messages.length, content: content.length }; }
    adminUsers() { return this.db.find('users'); }
    async userStatus(p, uid, body, trace) { const x = await this.db.patch('users', uid, body); await this.audit(p, 'user.status.update', 'user', uid, trace); return x; }
    async adminDevices() { const xs = await this.db.find('devices'); return Promise.all(xs.map(async (x) => ({ ...x, statusSnapshot: await this.db.get('deviceStatuses', x.deviceId) }))); }
    adminOrders() { return this.db.find('orders'); }
    adminContent() { return this.db.find('contentItems'); }
    async addAdminContent(p, body, trace) { const x = (0, helpers_1.entity)('content', { ...body, enabled: body.enabled ?? true, auditStatus: 'approved' }); await this.db.insert('contentItems', x); await this.audit(p, 'content.create', 'content', x.id, trace); return x; }
    async patchAdminContent(p, cid, body, trace) { const x = await this.db.patch('contentItems', cid, body); await this.audit(p, 'content.update', 'content', cid, trace); return x; }
    async deleteAdminContent(p, cid, trace) { const deleted = await this.db.remove('contentItems', cid); await this.audit(p, 'content.delete', 'content', cid, trace); return { deleted }; }
    async contentAudits() { const xs = [...await this.db.find('customContents'), ...await this.db.find('voiceClones')]; return xs.map((x) => ({ id: x.id, type: 'audio', ownerUserId: x.ownerUserId ?? x.userId, status: x.auditStatus ?? x.status, title: x.title ?? '声音克隆样本', createdAt: x.createdAt })); }
    async decideAudit(p, itemId, body, trace) { let collection = 'customContents', x = await this.db.get(collection, itemId); if (!x) {
        collection = 'voiceClones';
        x = await this.db.get(collection, itemId);
    } if (!x)
        throw (0, errors_1.notFound)(); const patch = collection === 'customContents' ? { auditStatus: body.status, auditReason: body.reason } : { status: body.status === 'approved' ? 'succeeded' : 'failed', auditReason: body.reason, voiceId: body.status === 'approved' ? x.voiceId ?? (0, helpers_1.id)('voice') : undefined }; const out = await this.db.patch(collection, itemId, patch); await this.audit(p, 'content.audit', collection, itemId, trace); return out; }
    otaPackages() { return this.db.find('otaPackages'); }
    async addOta(p, body, trace) { if ((await this.db.find('otaPackages', { type: body.type, version: body.version }))[0])
        throw (0, errors_1.conflict)('同类型版本已存在'); const x = (0, helpers_1.entity)('ota', { ...body, status: 'published' }); await this.db.insert('otaPackages', x); await this.audit(p, 'ota.publish', 'otaPackage', x.id, trace); return x; }
    expressionPacks() { return this.db.find('expressionPacks'); }
    async addExpression(p, body, trace) { const x = (0, helpers_1.entity)('expression', { ...body, status: 'published' }); await this.db.insert('expressionPacks', x); await this.audit(p, 'expression.publish', 'expressionPack', x.id, trace); return x; }
    auditLogs() { return this.db.find('auditLogs'); }
    adminVoiceClones() { return this.db.find('voiceClones'); }
    adminEvents() { return this.events.events(); }
    async own(collection, itemId, userId, field) { const x = await this.db.get(collection, itemId); if (!x || x[field] !== userId)
        throw (0, errors_1.notFound)(); return x; }
    async clearDefaults(userId) { for (const x of await this.db.find('addresses', { userId }))
        await this.db.patch('addresses', x.id, { isDefault: false }); }
    async ensureLimit(userId, field, count) { const u = await this.db.get('users', userId), plan = u ? await this.db.get('subscriptions', u.subscriptionLevel) : null, limit = plan?.limits?.[field] ?? 0; if (count >= limit)
        throw (0, errors_1.limited)(`${field} 已达到套餐上限 ${limit}`); }
    nextTrigger(time) { const [h, m] = time.split(':').map(Number), d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() <= Date.now())
        d.setDate(d.getDate() + 1); return d.toISOString(); }
    async audit(p, action, resource, resourceId, traceId) { await this.db.insert('auditLogs', (0, helpers_1.entity)('audit', { actorId: p.subject, actorRole: p.role, action, resource, resourceId, result: 'success', traceId })); }
};
exports.PlatformService = PlatformService;
exports.PlatformService = PlatformService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(data_store_1.DATA_STORE)),
    __param(1, (0, common_1.Inject)(integrations_1.EVENT_BUS)),
    __param(2, (0, common_1.Inject)(integrations_1.AI_PROVIDERS)),
    __metadata("design:paramtypes", [Object, Object, Object, app_config_1.AppConfig,
        auth_1.AuthService,
        speech_service_1.SpeechService])
], PlatformService);
//# sourceMappingURL=platform.service.js.map