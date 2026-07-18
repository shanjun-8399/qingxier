import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { app, USER, USER2, DEVICE, ADMIN, data, session } from './helpers';

describe('extended endpoint and error coverage', () => {
  let a: INestApplication;
  beforeAll(async () => { a = await app(); });
  afterAll(async () => a.close());

  it('refreshes token and exports account data', async () => {
    expect(data(await request(a.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken: 'refresh-123456' }).expect(200)).accessToken).toBe('user-token');
    const exported = data(await request(a.getHttpServer()).get('/api/v1/users/me/export').set(USER).expect(200));
    expect(exported.user.id).toBe('u_1');
    expect(exported.generatedAt).toBeTruthy();
  });

  it('address delete and missing ownership', async () => {
    const x = data(await request(a.getHttpServer()).post('/api/v1/users/me/addresses').set(USER).send({ recipient: '庆喜', phone: '13800138000', address: '地址A' }).expect(201));
    expect(data(await request(a.getHttpServer()).delete(`/api/v1/users/me/addresses/${x.id}`).set(USER).expect(200)).deleted).toBe(true);
    await request(a.getHttpServer()).delete(`/api/v1/users/me/addresses/${x.id}`).set(USER).expect(404);
  });

  it('bind errors and conflicting owner are rejected', async () => {
    await request(a.getHttpServer()).post('/api/v1/devices/bind-ticket').set(USER).send({ deviceSn: 'NOPE', model: 'QXR-S3', blePublicKey: '12345678' }).expect(404);
    await request(a.getHttpServer()).post('/api/v1/devices/bind').set(USER2).send({ ticket: 'ticket-x', deviceId: 'd_001', bindProof: '12345678' }).expect(409);
  });

  it('device status ownership and no-update OTA branches', async () => {
    await request(a.getHttpServer()).get('/api/v1/devices/d_002/status').set(USER).expect(403);
    expect(data(await request(a.getHttpServer()).get('/api/v1/devices/d_001/ota/check').set(USER).query({ currentFirmware: '99.0.0' }).expect(200)).hasUpdate).toBe(false);
    expect(data(await request(a.getHttpServer()).post('/api/v1/device/ota/report').set(DEVICE).send({ jobId: 'ota_1', status: 'succeeded', progress: 100 }).expect(200)).deviceId).toBe('d_001');
  });

  it('rejects invalid speech thresholds and unknown session', async () => {
    const profile = data(await request(a.getHttpServer()).get('/api/v1/devices/d_001/speech-profile').set(USER).expect(200));
    await request(a.getHttpServer()).patch('/api/v1/devices/d_001/speech-profile').set(USER).send({ autoDialect: true, fallbackDialect: 'mandarin', highConfidenceThreshold: .6, mediumConfidenceThreshold: .7, cloneVoiceId: 'voice_clone_1', version: profile.version }).expect(400);
    await request(a.getHttpServer()).post('/api/v1/speech/route').set(DEVICE).send({ sessionId: 'ssn_missing', dialectCandidate: 'mandarin', confidence: .8 }).expect(404);
  });

  it('dialog list and child safe response', async () => {
    const d = data(await request(a.getHttpServer()).post('/api/v1/dialogs/text').set(USER).send({ deviceId: 'd_001', mode: 'child', persona: 'teacher', text: '1+1等于几', dialect: 'mandarin' }).expect(200));
    expect(d.replyText).toContain('等于2');
    expect(data(await request(a.getHttpServer()).get('/api/v1/dialogs').set(USER).query({ deviceId: 'd_001' }).expect(200)).length).toBeGreaterThan(0);
  });

  it('reminder delete and invalid ownership branches', async () => {
    const x = data(await request(a.getHttpServer()).post('/api/v1/reminders').set(USER).send({ deviceId: 'd_001', type: 'water', title: '喝水', content: '喝水啦', timeOfDay: '23:59', repeatRule: 'FREQ=DAILY', needConfirm: false }).expect(201));
    await request(a.getHttpServer()).patch(`/api/v1/reminders/${x.id}`).set(USER2).send({ title: '越权' }).expect(404);
    expect(data(await request(a.getHttpServer()).delete(`/api/v1/reminders/${x.id}`).set(USER).expect(200)).deleted).toBe(true);
  });

  it('invitation self/unknown/reject/delete branches', async () => {
    await request(a.getHttpServer()).post('/api/v1/relations/invitations').set(USER).send({ targetUserId: 'u_1', relationType: 'bestie' }).expect(400);
    await request(a.getHttpServer()).post('/api/v1/relations/invitations').set(USER).send({ targetUserId: 'u_404', relationType: 'bestie' }).expect(404);
    const rejected = data(await request(a.getHttpServer()).post('/api/v1/relations/invitations').set(USER2).send({ targetUserId: 'u_1', relationType: 'parent_child' }).expect(201));
    expect(data(await request(a.getHttpServer()).post(`/api/v1/relations/invitations/${rejected.id}/reject`).set(USER).send({}).expect(200)).status).toBe('rejected');
    const activeInvite = data(await request(a.getHttpServer()).post('/api/v1/relations/invitations').set(USER2).send({ targetUserId: 'u_1', relationType: 'couple' }).expect(201));
    await request(a.getHttpServer()).post(`/api/v1/relations/invitations/${activeInvite.id}/accept`).set(USER).send({}).expect(200);
    expect(data(await request(a.getHttpServer()).delete(`/api/v1/relations/${activeInvite.id}`).set(USER2).expect(200)).deleted).toBe(true);
  });

  it('message validation and listing branches', async () => {
    const invite = data(await request(a.getHttpServer()).post('/api/v1/relations/invitations').set(USER).send({ targetUserId: 'u_2', relationType: 'bestie' }).expect(201));
    await request(a.getHttpServer()).post(`/api/v1/relations/invitations/${invite.id}/accept`).set(USER2).send({}).expect(200);
    await request(a.getHttpServer()).post('/api/v1/messages').set(USER).send({ relationId: invite.id, messageType: 'text' }).expect(400);
    const audio = data(await request(a.getHttpServer()).post('/api/v1/messages').set(USER).send({ relationId: invite.id, messageType: 'audio', audioUrl: 'https://cdn.example.com/voice.mp3' }).expect(201));
    expect(audio.messageType).toBe('audio');
    expect(data(await request(a.getHttpServer()).get('/api/v1/messages').set(USER2).expect(200)).some((x: any) => x.id === audio.id)).toBe(true);
  });

  it('custom content delete and parent dialogue records', async () => {
    const x = data(await request(a.getHttpServer()).post('/api/v1/custom-contents').set(USER).send({ deviceId: 'd_001', type: 'song', title: '爸爸唱歌', audioUrl: 'https://cdn.example.com/song.mp3', duration: 120 }).expect(201));
    expect(data(await request(a.getHttpServer()).delete(`/api/v1/custom-contents/${x.id}`).set(USER).expect(200)).deleted).toBe(true);
    expect(Array.isArray(data(await request(a.getHttpServer()).get('/api/v1/parent-controls/d_001/dialog-records').set(USER).expect(200)))).toBe(true);
  });

  it('voice clone webhook, persona bind and deletion', async () => {
    await request(a.getHttpServer()).patch('/api/v1/personas/mom/voice').set(USER).send({ voiceId: 'missing' }).expect(403);
    const clone = data(await request(a.getHttpServer()).post('/api/v1/voice-clones').set(USER).send({ sampleUrl: 'https://cdn.example.com/new.wav', consentRecord: 'consent-abcdef', persona: 'mom' }).expect(201));
    const completed = data(await request(a.getHttpServer()).post('/api/v1/webhooks/voice-clone/dashscope').send({ jobId: clone.providerJobId, status: 'succeeded', voiceId: 'voice_new' }).expect(200));
    expect(completed.status).toBe('succeeded');
    expect(data(await request(a.getHttpServer()).patch('/api/v1/personas/mom/voice').set(USER).send({ voiceId: 'voice_new' }).expect(200)).voiceId).toBe('voice_new');
    expect(data(await request(a.getHttpServer()).delete(`/api/v1/voice-clones/${clone.id}`).set(USER).expect(200)).deleted).toBe(true);
  });

  it('reward catalogue, balance and insufficient redeem', async () => {
    expect(data(await request(a.getHttpServer()).get('/api/v1/rewards/catalog').set(USER).expect(200)).length).toBeGreaterThan(0);
    expect(data(await request(a.getHttpServer()).get('/api/v1/rewards/balance').set(USER).expect(200)).balance).toBe(0);
    await request(a.getHttpServer()).post('/api/v1/rewards/redeem').set(USER).send({ productId: 'prod_skin' }).expect(409);
  });

  it('subscription current/cancel/orders/shop list', async () => {
    expect(data(await request(a.getHttpServer()).get('/api/v1/subscription/current').set(USER).expect(200)).level).toBe('premium');
    expect(data(await request(a.getHttpServer()).post('/api/v1/subscription/cancel-renewal').set(USER).expect(200)).autoRenew).toBe(false);
    expect(Array.isArray(data(await request(a.getHttpServer()).get('/api/v1/orders').set(USER).expect(200)))).toBe(true);
    expect(Array.isArray(data(await request(a.getHttpServer()).get('/api/v1/shop/orders').set(USER).expect(200)))).toBe(true);
  });

  it('payment signature failure/refund branch', async () => {
    const order = data(await request(a.getHttpServer()).post('/api/v1/orders').set(USER).send({ planId: 'basic', billingCycle: 'year' }).expect(201));
    await request(a.getHttpServer()).post('/api/v1/payments/wechat/notify').send({ orderNo: order.orderNo, transactionId: 'wx-x', tradeState: 'SUCCESS', signature: 'x' }).expect(403);
    expect(data(await request(a.getHttpServer()).post('/api/v1/payments/wechat/notify').send({ orderNo: order.orderNo, transactionId: 'wx-r', tradeState: 'REFUND', signature: 'signed-refund' }).expect(200)).status).toBe('refunded');
  });

  it('admin status, lists, audits, expression and webhooks', async () => {
    expect(data(await request(a.getHttpServer()).patch('/api/v1/admin/users/u_2/status').set(ADMIN).send({ status: 'disabled' }).expect(200)).status).toBe('disabled');
    expect(Array.isArray(data(await request(a.getHttpServer()).get('/api/v1/admin/orders').set(ADMIN).expect(200)))).toBe(true);
    expect(Array.isArray(data(await request(a.getHttpServer()).get('/api/v1/admin/content-library').set(ADMIN).expect(200)))).toBe(true);
    const clone = data(await request(a.getHttpServer()).post('/api/v1/voice-clones').set(USER).send({ sampleUrl: 'https://cdn.example.com/audit.wav', consentRecord: 'consent-audit1' }).expect(201));
    const audits = data(await request(a.getHttpServer()).get('/api/v1/admin/content-audits').set(ADMIN).expect(200));
    expect(audits.some((x: any) => x.id === clone.id)).toBe(true);
    expect(data(await request(a.getHttpServer()).patch(`/api/v1/admin/content-audits/${clone.id}`).set(ADMIN).send({ status: 'approved', reason: '清晰合规' }).expect(200)).status).toBe('succeeded');
    expect(data(await request(a.getHttpServer()).post('/api/v1/admin/expression-packs').set(ADMIN).send({ version: '2.0.0', url: 'https://cdn.example.com/expression.zip' }).expect(201)).status).toBe('published');
    expect(data(await request(a.getHttpServer()).get('/api/v1/admin/expression-packs').set(ADMIN).expect(200)).length).toBe(1);
    expect(data(await request(a.getHttpServer()).get('/api/v1/admin/voice-clones').set(ADMIN).expect(200)).length).toBeGreaterThan(0);
    expect(data(await request(a.getHttpServer()).post('/api/v1/webhooks/content-audit/mock').send({ id: 'x' }).expect(200)).received).toBe(true);
    expect(data(await request(a.getHttpServer()).post('/api/v1/webhooks/cos/events').send({ event: 'ObjectCreated' }).expect(200)).event).toBe('ObjectCreated');
  });

  it('admin duplicate OTA and missing audit are rejected', async () => {
    const body = { type: 'kids_content', version: '2.0.1', url: 'https://cdn.example.com/kids.zip', sha256: 'c'.repeat(64), mandatory: false, compatibleModels: ['QXR-S3'], rolloutPercent: 50 };
    await request(a.getHttpServer()).post('/api/v1/admin/ota-packages').set(ADMIN).send(body).expect(201);
    await request(a.getHttpServer()).post('/api/v1/admin/ota-packages').set(ADMIN).send(body).expect(409);
    await request(a.getHttpServer()).patch('/api/v1/admin/content-audits/missing').set(ADMIN).send({ status: 'approved' }).expect(404);
  });

  it('wake package idempotency key boundaries and duplicate version', async () => {
    const body = { type: 'wake_words', wakeWord: '阿西', modelFamily: 'WakeNet9', version: '2.1.0', url: 'https://cdn.example.com/wake-210.bin', sha256: 'd'.repeat(64), compatibleModels: ['QXR-S3'], rolloutPercent: 10, mandatory: false };
    await request(a.getHttpServer()).post('/api/v1/admin/wake-word-packages').set(ADMIN).set('Idempotency-Key', 'x'.repeat(129)).send(body).expect(400);
    await request(a.getHttpServer()).post('/api/v1/admin/wake-word-packages').set(ADMIN).send(body).expect(201);
    await request(a.getHttpServer()).post('/api/v1/admin/wake-word-packages').set(ADMIN).send(body).expect(409);
  });

  it('supports custom request trace and standard method error', async () => {
    const r = await request(a.getHttpServer()).get('/health').set('X-Request-Id', 'client-trace-1').expect(200);
    expect(r.body.traceId).toBe('client-trace-1');
    const method = await request(a.getHttpServer()).post('/health').expect(404);
    expect(method.body.error).toBe('NOT_FOUND');
  });
});
