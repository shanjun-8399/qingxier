import { Inject, Injectable } from '@nestjs/common';
import { AppConfig } from '@/config/app-config';
import { AuthService } from '@/common/auth';
import { conflict, forbidden, invalid, limited, notFound } from '@/common/errors';
import type { Entity, Principal, User } from '@/domain/types';
import { DATA_STORE, type DataStore } from '@/infrastructure/data-store';
import { AI_PROVIDERS, EVENT_BUS, type AiProviders, type EventBus } from '@/infrastructure/integrations';
import { entity, id, now, sortDesc } from './helpers';
import { SpeechService } from './speech.service';

@Injectable()
export class PlatformService {
  constructor(
    @Inject(DATA_STORE) private readonly db: DataStore,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    @Inject(AI_PROVIDERS) private readonly ai: AiProviders,
    private readonly config: AppConfig,
    private readonly auth: AuthService,
    private readonly speech: SpeechService,
  ) {}

  health() { return { status: 'ok', service: 'qingxier-server', version: '2.0.0', environment: this.config.appEnv }; }
  async ready() {
    try { return { status: (await this.db.ping()) ? 'ready' : 'not_ready', storage: this.config.storageBackend, events: this.config.eventBackend, providers: this.config.providerMode }; }
    catch (e) { return { status: 'not_ready', storage: this.config.storageBackend, events: this.config.eventBackend, providers: this.config.providerMode, reason: e instanceof Error ? e.name : 'UNKNOWN' }; }
  }

  async login(body: any) {
    const existing = (await this.db.find<User>('users', { openId: `openid_${body.code}` }))[0];
    const user = existing ?? await this.db.get<User>('users', 'u_1');
    if (!user) throw notFound();
    return { accessToken: this.auth.sign(user.id, 'user', 7200), refreshToken: this.auth.sign(user.id, 'user', 2592000), expiresIn: 7200, user, needBindPhone: !user.phone };
  }
  async refresh(_body: any) { return { accessToken: this.auth.sign('u_1', 'user', 7200), expiresIn: 7200 }; }
  async bindPhone(p: Principal, body: any) { if (this.config.appEnv !== 'production' && body.smsCode !== '123456') throw invalid('验证码错误'); return this.db.patch('users', p.subject, { phone: body.phone }); }
  async me(p: Principal) { const u = await this.db.get<User>('users', p.subject); if (!u) throw notFound(); return u; }
  async updateMe(p: Principal, body: any) { return this.db.patch('users', p.subject, body); }
  async exportMe(p: Principal) { return { user: await this.me(p), devices: await this.devices(p), reminders: await this.reminders(p), messages: await this.messages(p), generatedAt: now() }; }
  async deleteMe(p: Principal) { await this.db.patch('users', p.subject, { status: 'disabled' }); return { deleted: true, retentionDays: 30 }; }

  async addresses(p: Principal) { return this.db.find('addresses', { userId: p.subject }); }
  async addAddress(p: Principal, body: any) { if (body.isDefault) await this.clearDefaults(p.subject); return this.db.insert('addresses', entity('addr', { ...body, userId: p.subject })); }
  async patchAddress(p: Principal, aid: string, body: any) { await this.own('addresses', aid, p.subject, 'userId'); if (body.isDefault) await this.clearDefaults(p.subject); return this.db.patch('addresses', aid, body); }
  async deleteAddress(p: Principal, aid: string) { await this.own('addresses', aid, p.subject, 'userId'); return { deleted: await this.db.remove('addresses', aid) }; }

  async bindTicket(_p: Principal, body: any) {
    const d = (await this.db.find('devices', { sn: body.deviceSn }))[0]; if (!d) throw notFound('设备序列号不存在');
    return { ticket: id('ticket'), deviceId: d.deviceId, expiresAt: new Date(Date.now() + 300000).toISOString(), cloudMqttHost: 'mqtt.qingxier.com', cloudWsHost: 'voice.qingxier.com' };
  }
  async bindDevice(p: Principal, body: any) {
    const d = await this.db.get('devices', body.deviceId); if (!d) throw notFound();
    const old = (await this.db.find('bindings', { deviceId: body.deviceId })).find((x: any) => x.bindStatus === 'active');
    if (old && old.userId !== p.subject) throw conflict('设备已绑定其他用户');
    if (!old) await this.db.insert('bindings', entity('bind', { userId: p.subject, deviceId: body.deviceId, role: 'owner', bindStatus: 'active', mode: 'adult', persona: 'mom' }));
    return { device: d, binding: { userId: p.subject, deviceId: body.deviceId }, mqttUsername: `device_${body.deviceId}` };
  }
  async devices(p: Principal) {
    const bindings = (await this.db.find('bindings', { userId: p.subject })).filter((x: any) => x.bindStatus === 'active');
    const out = [];
    for (const b of bindings) { const d = await this.db.get('devices', b.deviceId); const s = await this.db.get('deviceStatuses', b.deviceId); if (d && s) out.push({ ...d, ...s }); }
    return out;
  }
  async deviceStatus(p: Principal, did: string) { await this.speech.assertUserDevice(p.subject, did); const d = await this.db.get('devices', did); const s = await this.db.get('deviceStatuses', did); if (!d || !s) throw notFound(); return { ...d, ...s }; }
  async updateDevice(p: Principal, did: string, body: any) {
    await this.speech.assertUserDevice(p.subject, did);
    if (body.name) await this.db.patch('devices', did, { name: body.name });
    if (body.defaultMode || body.defaultPersona) {
      const b = (await this.db.find('bindings', { userId: p.subject, deviceId: did }))[0];
      await this.db.patch('bindings', b.id, { mode: body.defaultMode ?? b.mode, persona: body.defaultPersona ?? b.persona });
      await this.db.patch('deviceStatuses', did, { currentMode: body.defaultMode ?? b.mode, currentPersona: body.defaultPersona ?? b.persona });
    }
    return this.deviceStatus(p, did);
  }
  async unbind(p: Principal, did: string) { const b = await this.speech.assertUserDevice(p.subject, did); await this.db.patch('bindings', b.id, { bindStatus: 'revoked' }); await this.events.publish(`device/${did}/auth/revoke`, { userId: p.subject }); return { success: true }; }
  async command(p: Principal, did: string, body: any, traceId: string) { await this.speech.assertUserDevice(p.subject, did); const commandId = id('cmd'); await this.events.publish(`device/${did}/command/down`, { commandId, ...body, expireAt: new Date(Date.now() + (body.expireInSeconds ?? 30) * 1000).toISOString(), traceId }); return { commandId, status: 'queued' }; }

  async reminders(p: Principal) { return sortDesc(await this.db.find('reminders', { userId: p.subject }) as any); }
  async addReminder(p: Principal, body: any) { await this.speech.assertUserDevice(p.subject, body.deviceId); await this.ensureLimit(p.subject, 'reminders', (await this.reminders(p)).length); return this.db.insert('reminders', entity('rem', { ...body, userId: p.subject, enabled: body.enabled ?? true, nextTriggerAt: this.nextTrigger(body.timeOfDay) })); }
  async patchReminder(p: Principal, rid: string, body: any) { const r = await this.own('reminders', rid, p.subject, 'userId'); return this.db.patch('reminders', rid, { ...body, nextTriggerAt: body.timeOfDay ? this.nextTrigger(body.timeOfDay) : r.nextTriggerAt }); }
  async deleteReminder(p: Principal, rid: string) { await this.own('reminders', rid, p.subject, 'userId'); return { deleted: await this.db.remove('reminders', rid) }; }
  async confirmReminder(p: Principal, rid: string, body: any) { const r = await this.own('reminders', rid, p.subject, 'userId'); const e = entity('remevt', { reminderId: rid, userId: p.subject, status: 'confirmed', source: body.source, confirmedAt: body.confirmedAt ?? now(), angerDelta: -100 }); await this.db.insert('reminderEvents', e); await this.events.publish(`device/${r.deviceId}/reminder/confirmed`, e); return e; }
  async reminderEvents(p: Principal, rid: string) { await this.own('reminders', rid, p.subject, 'userId'); return this.db.find('reminderEvents', { reminderId: rid }); }

  async invitations(p: Principal) { return this.db.find('relationships', { targetUserId: p.subject, status: 'pending' }); }
  async invite(p: Principal, body: any) {
    if (body.targetUserId === p.subject) throw invalid('不能邀请自己'); if (!await this.db.get('users', body.targetUserId)) throw notFound('目标用户不存在');
    if ((await this.db.find('relationships', { ownerUserId: p.subject, targetUserId: body.targetUserId })).some((x: any) => x.status !== 'rejected')) throw conflict('关系或邀请已存在');
    return this.db.insert('relationships', entity('rel', { ownerUserId: p.subject, targetUserId: body.targetUserId, relationType: body.relationType, status: 'pending', nickname: body.nickname, inviteCode: id('invite'), expiresAt: new Date(Date.now() + 604800000).toISOString() }));
  }
  async decideInvitation(p: Principal, rid: string, accept: boolean, body: any) { const r = await this.db.get('relationships', rid); if (!r || r.targetUserId !== p.subject || r.status !== 'pending') throw notFound(); return this.db.patch('relationships', rid, { status: accept ? 'active' : 'rejected', nickname: body.nickname ?? r.nickname }); }
  async relations(p: Principal) { return (await this.db.find('relationships')).filter((x: any) => x.status === 'active' && [x.ownerUserId, x.targetUserId].includes(p.subject)); }
  async deleteRelation(p: Principal, rid: string) { const r = await this.db.get('relationships', rid); if (!r || ![r.ownerUserId, r.targetUserId].includes(p.subject)) throw notFound(); return { deleted: await this.db.remove('relationships', rid) }; }
  async messages(p: Principal) { return sortDesc((await this.db.find('messages')).filter((x: any) => x.senderId === p.subject || x.receiverId === p.subject) as any); }
  async sendMessage(p: Principal, body: any) {
    const r = await this.db.get('relationships', body.relationId); if (!r || r.status !== 'active' || ![r.ownerUserId, r.targetUserId].includes(p.subject)) throw forbidden('亲友关系无效');
    if (body.messageType === 'text' && !body.text) throw invalid('文字留言缺少 text'); if (body.messageType === 'audio' && !body.audioUrl) throw invalid('语音留言缺少 audioUrl');
    const audit = await this.ai.audit({ type: body.messageType, content: body.text ?? body.audioUrl }); if (audit.status === 'rejected') throw invalid('留言未通过审核');
    const receiverId = r.ownerUserId === p.subject ? r.targetUserId : r.ownerUserId;
    const m = entity('msg', { senderId: p.subject, receiverId, relationId: r.id, receiverDeviceId: body.receiverDeviceId, messageType: body.messageType, text: body.text, audioUrl: body.audioUrl, deliveryStatus: 'delivered' });
    await this.db.insert('messages', m); if (body.receiverDeviceId) await this.events.publish(`device/${body.receiverDeviceId}/message/down`, { messageId: m.id, senderId: p.subject, text: body.text, audioUrl: body.audioUrl }); return m;
  }
  async readMessage(p: Principal, mid: string) { const m = await this.db.get('messages', mid); if (!m || m.receiverId !== p.subject) throw notFound(); return this.db.patch('messages', mid, { deliveryStatus: 'read', readAt: now() }); }

  async categories() { const all = await this.db.find('contentItems', { enabled: true, auditStatus: 'approved' }); return [...new Set(all.map((x: any) => x.category))].map(name => ({ name, count: all.filter((x: any) => x.category === name).length })); }
  async kidsContent(category?: string) { return (await this.db.find('contentItems', { enabled: true, auditStatus: 'approved' })).filter((x: any) => !category || x.category === category); }
  async qas(p: Principal) { return this.db.find('customQas', { parentUserId: p.subject }); }
  async addQa(p: Principal, body: any) { await this.speech.assertUserDevice(p.subject, body.deviceId); if (!body.answerText && !body.answerAudioUrl) throw invalid('答案不能为空'); await this.ensureLimit(p.subject, 'customQas', (await this.qas(p)).length); return this.db.insert('customQas', entity('qa', { ...body, parentUserId: p.subject, enabled: true })); }
  async patchQa(p: Principal, qid: string, body: any) { await this.own('customQas', qid, p.subject, 'parentUserId'); return this.db.patch('customQas', qid, body); }
  async deleteQa(p: Principal, qid: string) { await this.own('customQas', qid, p.subject, 'parentUserId'); return { deleted: await this.db.remove('customQas', qid) }; }
  uploadToken(p: Principal, kind: string) { return { uploadUrl: `https://upload.example.com/${kind}/${p.subject}/${id('upload')}`, objectKey: `${kind}/${p.subject}/${id('obj')}`, expiresIn: 900, headers: { 'x-qingxier-upload': 'signed' } }; }
  async customContents(p: Principal) { return this.db.find('customContents', { ownerUserId: p.subject }); }
  async addCustomContent(p: Principal, body: any) { await this.speech.assertUserDevice(p.subject, body.deviceId); await this.ensureLimit(p.subject, 'customContents', (await this.customContents(p)).length); const audit = await this.ai.audit({ type: 'audio', content: body.title }); return this.db.insert('customContents', entity('custom', { ...body, ownerUserId: p.subject, auditStatus: audit.status })); }
  async deleteCustomContent(p: Principal, cid: string) { await this.own('customContents', cid, p.subject, 'ownerUserId'); return { deleted: await this.db.remove('customContents', cid) }; }

  async parentControl(p: Principal, did: string) { await this.speech.assertUserDevice(p.subject, did); const x = await this.db.get('parentControls', did); if (!x) throw notFound(); return x; }
  async updateParentControl(p: Principal, did: string, body: any, traceId: string) { await this.parentControl(p, did); const x = await this.db.patch('parentControls', did, body); await this.events.publish(`device/${did}/config/down`, { type: 'parent_control', config: x, traceId }); return x; }
  async parentRecords(p: Principal, did: string) { const c = await this.parentControl(p, did); if (!c.dialogRecordEnabled) throw forbidden('未授权查看对话记录'); const conv = await this.db.find('conversations', { userId: p.subject, deviceId: did }); const turns: Entity[] = []; for (const d of conv) turns.push(...await this.db.find('conversationTurns', { conversationId: d.id })); return sortDesc(turns as any).slice(0, 20).map(({ audioUrl, ...x }: any) => x); }
  async sleepMode(p: Principal, did: string, traceId: string) { await this.parentControl(p, did); await this.events.publish(`device/${did}/command/down`, { commandType: 'sleep_mode', payload: { led: 'dim', story: true, breath: 'slow' }, traceId }); return { queued: true }; }

  personas() { return this.db.find('personas', { enabled: true }); }
  async setPersonaVoice(p: Principal, persona: string, body: any) { if (body.voiceId) { const v = (await this.db.find('voiceClones', { userId: p.subject, voiceId: body.voiceId }))[0]; if (!v || v.status !== 'succeeded') throw forbidden('克隆音色不可用'); } const x = await this.db.get('personas', persona); if (!x) throw notFound(); return { ...x, voiceId: body.voiceId ?? x.defaultVoiceId, userId: p.subject }; }
  async voiceClones(p: Principal) { return this.db.find('voiceClones', { userId: p.subject }); }
  async addVoiceClone(p: Principal, body: any) { await this.ensureLimit(p.subject, 'voiceClones', (await this.voiceClones(p)).filter((x: any) => x.status !== 'failed').length); return this.db.insert('voiceClones', entity('voice', { ...body, userId: p.subject, providerJobId: id('job'), status: 'training' })); }
  async voiceClone(p: Principal, vid: string) { return this.own('voiceClones', vid, p.subject, 'userId'); }
  async deleteVoiceClone(p: Principal, vid: string) { await this.voiceClone(p, vid); return { deleted: await this.db.remove('voiceClones', vid) }; }
  async voiceWebhook(provider: string, body: any) { const v = (await this.db.find('voiceClones', { providerJobId: body.jobId }))[0]; if (!v) throw notFound(); return this.db.patch('voiceClones', v.id, { status: body.status, voiceId: body.voiceId, provider }); }

  async tasks(p: Principal) { const tasks = await this.db.find('tasks', { enabled: true }); const date = new Date().toISOString().slice(0, 10); const progress = await this.db.find('taskProgress', { userId: p.subject, period: date }); return tasks.map((t: any) => ({ ...t, completed: progress.some((x: any) => x.taskId === t.id && x.completed), claimed: progress.some((x: any) => x.taskId === t.id && x.claimed) })); }
  async claimTask(p: Principal, tid: string) { const t = await this.db.get('tasks', tid); if (!t) throw notFound(); const date = new Date().toISOString().slice(0, 10); let prog = (await this.db.find('taskProgress', { userId: p.subject, taskId: tid, period: date }))[0]; if (prog?.claimed) throw conflict('奖励已领取'); if (!prog) { prog = entity('progress', { userId: p.subject, taskId: tid, period: date, completed: true, claimed: false }); await this.db.insert('taskProgress', prog); } prog = await this.db.patch('taskProgress', prog.id, { claimed: true }); await this.db.insert('rewardLedger', entity('reward', { userId: p.subject, delta: t.reward, type: 'task', referenceId: tid })); return { progress: prog, reward: t.reward, balance: (await this.rewardBalance(p)).balance }; }
  async rewardBalance(p: Principal) { const ledger = await this.db.find('rewardLedger', { userId: p.subject }); return { balance: ledger.reduce((s: number, x: any) => s + Number(x.delta), 0), ledger: sortDesc(ledger as any) }; }
  rewardCatalog() { return this.db.find('products', { type: 'reward', enabled: true }); }
  async redeem(p: Principal, body: any) { const product = await this.db.get('products', body.productId); if (!product || product.type !== 'reward') throw notFound(); const balance = (await this.rewardBalance(p)).balance; if (balance < product.price) throw conflict('小鱼干余额不足'); await this.db.insert('rewardLedger', entity('reward', { userId: p.subject, delta: -product.price, type: 'redeem', referenceId: product.id })); return { success: true, balance: balance - product.price, product }; }

  plans() { return this.db.find('subscriptions'); }
  async currentSubscription(p: Principal) { const u = await this.me(p); return { level: u.subscriptionLevel, plan: await this.db.get('subscriptions', u.subscriptionLevel), autoRenew: false, expiresAt: null }; }
  async orders(p: Principal) { return sortDesc(await this.db.find('orders', { userId: p.subject }) as any); }
  async createOrder(p: Principal, body: any) { const plan = await this.db.get('subscriptions', body.planId); if (!plan) throw notFound(); const amount = body.billingCycle === 'month' ? plan.monthlyPrice : plan.yearlyPrice; const o = entity('order', { userId: p.subject, orderNo: id('QXR'), type: 'subscription', planId: body.planId, billingCycle: body.billingCycle, amount, status: 'pending' }); await this.db.insert('orders', o); return { ...o, wechatPay: { timeStamp: String(Date.now()), nonceStr: id('nonce'), package: `prepay_id=${id('prepay')}`, signType: 'RSA', paySign: 'test-sign' } }; }
  async payment(body: any) { const o = (await this.db.find('orders', { orderNo: body.orderNo }))[0]; if (!o) throw notFound(); if (body.signature.length < 6) throw forbidden('支付签名无效'); const status = body.tradeState === 'SUCCESS' ? 'paid' : 'refunded'; const x = await this.db.patch('orders', o.id, { status, transactionId: body.transactionId }); if (status === 'paid' && o.planId) await this.db.patch('users', o.userId, { subscriptionLevel: o.planId }); return x; }
  cancelRenewal(p: Principal) { return { userId: p.subject, autoRenew: false, effectiveAt: 'period_end' }; }
  products() { return this.db.find('products', { enabled: true }); }
  async shopOrder(p: Principal, body: any) { const product = await this.db.get('products', body.productId); if (!product || product.type === 'reward') throw notFound(); await this.own('addresses', body.addressId, p.subject, 'userId'); if (product.stock < body.quantity) throw conflict('库存不足'); return this.db.insert('orders', entity('order', { userId: p.subject, orderNo: id('SHOP'), type: 'shop', productId: product.id, quantity: body.quantity, addressId: body.addressId, amount: product.price * body.quantity, status: 'pending' })); }
  async shopOrders(p: Principal) { return (await this.orders(p)).filter((x: any) => x.type === 'shop'); }
  async mood(p: Principal) { return { weekStart: new Date(Date.now() - 518400000).toISOString().slice(0, 10), distribution: { happy: 48, calm: 32, tired: 12, anxious: 8 }, keywords: ['家人', '工作', '睡眠'], conversationCount: (await this.db.find('conversations', { userId: p.subject })).length, suggestion: '本周睡眠话题较多，建议保持规律作息。' }; }

  async otaCheck(p: Principal, did: string, current?: string) { if (p.role === 'user') await this.speech.assertUserDevice(p.subject, did); if (p.role === 'device' && p.deviceId !== did) throw forbidden(); const d = await this.db.get('devices', did); if (!d) throw notFound(); const xs = (await this.db.find('otaPackages', { status: 'published' })).filter((x: any) => x.compatibleModels.includes(d.model) && x.version !== (current ?? d.firmwareVersion)); const x = xs.at(-1); return x ? { hasUpdate: true, jobId: id('ota'), ...x } : { hasUpdate: false }; }
  async otaReport(p: Principal, body: any) { if (p.role !== 'device') throw forbidden(); const x = entity('otareport', { deviceId: p.deviceId, ...body }); await this.db.insert('taskProgress', x); return x; }

  async dashboard() { const [users, devices, orders, messages, content] = await Promise.all(['users', 'devices', 'orders', 'messages', 'contentItems'].map((x: any) => this.db.find(x))); return { users: users.length, devices: devices.length, onlineDevices: (await this.db.find('deviceStatuses', { online: true })).length, orders: orders.length, revenue: orders.filter((x: any) => x.status === 'paid').reduce((s: number, x: any) => s + x.amount, 0), messages: messages.length, content: content.length }; }
  adminUsers() { return this.db.find('users'); }
  async userStatus(p: Principal, uid: string, body: any, trace: string) { const x = await this.db.patch('users', uid, body); await this.audit(p, 'user.status.update', 'user', uid, trace); return x; }
  async adminDevices() { const xs = await this.db.find('devices'); return Promise.all(xs.map(async x => ({ ...x, statusSnapshot: await this.db.get('deviceStatuses', x.deviceId) }))); }
  adminOrders() { return this.db.find('orders'); }
  adminContent() { return this.db.find('contentItems'); }
  async addAdminContent(p: Principal, body: any, trace: string) { const x = entity('content', { ...body, enabled: body.enabled ?? true, auditStatus: 'approved' }); await this.db.insert('contentItems', x); await this.audit(p, 'content.create', 'content', x.id, trace); return x; }
  async patchAdminContent(p: Principal, cid: string, body: any, trace: string) { const x = await this.db.patch('contentItems', cid, body); await this.audit(p, 'content.update', 'content', cid, trace); return x; }
  async deleteAdminContent(p: Principal, cid: string, trace: string) { const deleted = await this.db.remove('contentItems', cid); await this.audit(p, 'content.delete', 'content', cid, trace); return { deleted }; }
  async contentAudits() { const xs = [...await this.db.find('customContents'), ...await this.db.find('voiceClones')]; return xs.map((x: any) => ({ id: x.id, type: 'audio', ownerUserId: x.ownerUserId ?? x.userId, status: x.auditStatus ?? x.status, title: x.title ?? '声音克隆样本', createdAt: x.createdAt })); }
  async decideAudit(p: Principal, itemId: string, body: any, trace: string) { let collection: any = 'customContents', x = await this.db.get(collection, itemId); if (!x) { collection = 'voiceClones'; x = await this.db.get(collection, itemId); } if (!x) throw notFound(); const patch = collection === 'customContents' ? { auditStatus: body.status, auditReason: body.reason } : { status: body.status === 'approved' ? 'succeeded' : 'failed', auditReason: body.reason, voiceId: body.status === 'approved' ? x.voiceId ?? id('voice') : undefined }; const out = await this.db.patch(collection, itemId, patch); await this.audit(p, 'content.audit', collection, itemId, trace); return out; }
  otaPackages() { return this.db.find('otaPackages'); }
  async addOta(p: Principal, body: any, trace: string) { if ((await this.db.find('otaPackages', { type: body.type, version: body.version }))[0]) throw conflict('同类型版本已存在'); const x = entity('ota', { ...body, status: 'published' }); await this.db.insert('otaPackages', x); await this.audit(p, 'ota.publish', 'otaPackage', x.id, trace); return x; }
  expressionPacks() { return this.db.find('expressionPacks'); }
  async addExpression(p: Principal, body: any, trace: string) { const x = entity('expression', { ...body, status: 'published' }); await this.db.insert('expressionPacks', x); await this.audit(p, 'expression.publish', 'expressionPack', x.id, trace); return x; }
  auditLogs() { return this.db.find('auditLogs'); }
  adminVoiceClones() { return this.db.find('voiceClones'); }
  adminEvents() { return this.events.events(); }

  private async own(collection: any, itemId: string, userId: string, field: string): Promise<Entity> { const x = await this.db.get(collection, itemId); if (!x || x[field] !== userId) throw notFound(); return x; }
  private async clearDefaults(userId: string) { for (const x of await this.db.find('addresses', { userId })) await this.db.patch('addresses', x.id, { isDefault: false }); }
  private async ensureLimit(userId: string, field: string, count: number) { const u = await this.db.get<User>('users', userId), plan = u ? await this.db.get('subscriptions', u.subscriptionLevel) : null, limit = plan?.limits?.[field] ?? 0; if (count >= limit) throw limited(`${field} 已达到套餐上限 ${limit}`); }
  private nextTrigger(time: string) { const [h, m] = time.split(':').map(Number), d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); return d.toISOString(); }
  private async audit(p: Principal, action: string, resource: string, resourceId: string, traceId: string) { await this.db.insert('auditLogs', entity('audit', { actorId: p.subject, actorRole: p.role, action, resource, resourceId, result: 'success', traceId })); }
}
