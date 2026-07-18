import jwt from 'jsonwebtoken';
import { VoiceGateway } from '@/api/voice.gateway';
import { AuthService } from '@/common/auth';
import { AppConfig } from '@/config/app-config';
import { DashScopeProviders, aiProvider, eventBusProvider, MemoryEventBus } from '@/infrastructure/integrations';

class FakeSocket {
  sent: any[] = [];
  closed?: [number, string];
  handler?: (raw: Buffer) => Promise<void>;
  send(value: string) { this.sent.push(JSON.parse(value)); }
  close(code: number, reason: string) { this.closed = [code, reason]; }
  on(event: string, handler: (raw: Buffer) => Promise<void>) { if (event === 'message') this.handler = handler; }
  async message(value: unknown) { await this.handler?.(Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))); }
}

function config(overrides: Record<string, string> = {}) {
  const before = { ...process.env };
  Object.assign(process.env, overrides);
  const c = new AppConfig();
  process.env = before;
  return c;
}

describe('voice gateway', () => {
  const speech = {
    createSession: jest.fn(async (_p, b) => ({ sessionId: 'ssn_ws', ...b })),
    recognize: jest.fn(async () => ({ text: '侬好', dialect: 'shanghainese', confidence: .92 })),
    route: jest.fn(async () => ({ dialect: 'cantonese', source: 'asr' })),
    tts: jest.fn(async () => ({ audioUrl: 'https://cdn/tts.mp3', model: 'cosyvoice-v3.5-flash' })),
    complete: jest.fn(async () => ({ state: 'completed' })),
  } as any;
  const auth = new AuthService(config({ AUTH_MODE: 'static' }));

  beforeEach(() => jest.clearAllMocks());

  it('closes unauthorized and non-device connections', () => {
    const gateway = new VoiceGateway(auth, speech);
    const missing = new FakeSocket();
    gateway.handleConnection(missing as any, { url: '/ws/v1/voice', headers: {} } as any);
    expect(missing.closed).toEqual([4401, 'UNAUTHORIZED']);
    const user = new FakeSocket();
    gateway.handleConnection(user as any, { url: '/ws/v1/voice?token=user-token', headers: {} } as any);
    expect(user.closed?.[0]).toBe(4401);
  });

  it('handles ping and missing-session protocol errors', async () => {
    const gateway = new VoiceGateway(auth, speech);
    const socket = new FakeSocket();
    gateway.handleConnection(socket as any, { url: '/ws/v1/voice', headers: { 'x-device-token': 'device-token' } } as any);
    expect(socket.sent[0]).toEqual({ type: 'connected', sessionId: null, wakeWord: '阿西' });
    await socket.message({ type: 'ping' });
    expect(socket.sent.at(-1).type).toBe('pong');
    await socket.message({ type: 'audio', seq: 1 });
    expect(socket.sent.at(-1)).toMatchObject({ type: 'error', message: 'SESSION_REQUIRED' });
  });

  it('handles complete start/audio/asr/route/tts/end flow', async () => {
    const gateway = new VoiceGateway(auth, speech);
    const socket = new FakeSocket();
    gateway.handleConnection(socket as any, { url: '/ws/v1/voice', headers: { 'x-device-token': 'device-token' } } as any);
    await socket.message({ type: 'start', mode: 'adult', persona: 'mom', wakeModelVersion: 'v1' });
    expect(socket.sent.at(-1)).toMatchObject({ type: 'started', sessionId: 'ssn_ws' });
    await socket.message({ type: 'audio', seq: 2 });
    expect(socket.sent.at(-1)).toEqual({ type: 'audio_ack', seq: 2 });
    await socket.message({ type: 'asr', audioBase64: 'AA==' });
    expect(socket.sent.at(-1)).toMatchObject({ type: 'asr_result', text: '侬好' });
    await socket.message({ type: 'route', dialectCandidate: 'cantonese', confidence: .9 });
    expect(socket.sent.at(-1)).toMatchObject({ type: 'dialect_result', dialect: 'cantonese' });
    await socket.message({ type: 'tts_request', text: '你好', dialect: 'cantonese' });
    expect(socket.sent.at(-1)).toMatchObject({ type: 'tts_start', audioUrl: 'https://cdn/tts.mp3' });
    await socket.message({ type: 'end' });
    expect(socket.sent.at(-1)).toEqual({ type: 'completed', sessionId: 'ssn_ws' });
  });

  it('uses query session and reports malformed/unsupported frames', async () => {
    const gateway = new VoiceGateway(auth, speech);
    const socket = new FakeSocket();
    gateway.handleConnection(socket as any, { url: '/ws/v1/voice?sessionId=existing&token=device-token', headers: {} } as any);
    expect(socket.sent[0].sessionId).toBe('existing');
    await socket.message('{');
    expect(socket.sent.at(-1).error).toBe('WS_PROTOCOL_ERROR');
    await socket.message({ type: 'unknown' });
    expect(socket.sent.at(-1).message).toBe('UNSUPPORTED_FRAME');
  });
});

describe('authentication, config and provider branches', () => {
  afterEach(() => jest.restoreAllMocks());

  it('signs and verifies JWT principals', () => {
    const c = config({ AUTH_MODE: 'jwt', JWT_SECRET: 'x'.repeat(40), JWT_ISSUER: 'qingxier' });
    const auth = new AuthService(c);
    const token = auth.sign('d_001', 'device', 60, { deviceId: 'd_001', mfa: true });
    expect(auth.authenticate(token)).toMatchObject({ role: 'device', subject: 'd_001', deviceId: 'd_001', mfa: true });
    expect(auth.authenticate('bad')).toBeUndefined();
    const wrongRole = jwt.sign({ role: 'other' }, c.jwtSecret, { issuer: c.jwtIssuer, subject: 'x' });
    expect(auth.authenticate(wrongRole)).toBeUndefined();
    expect(auth.authenticate()).toBeUndefined();
  });

  it.each([
    [{ PORT: '0' }, 'PORT_INVALID'],
    [{ AUTH_MODE: 'nope' }, 'AUTH_MODE_INVALID'],
    [{ AUTH_MODE: 'jwt', JWT_SECRET: 'short' }, 'JWT_SECRET_TOO_SHORT'],
    [{ STORAGE_BACKEND: 'x' }, 'STORAGE_BACKEND_INVALID'],
    [{ EVENT_BACKEND: 'x' }, 'EVENT_BACKEND_INVALID'],
    [{ PROVIDER_MODE: 'x' }, 'PROVIDER_MODE_INVALID'],
    [{ PROVIDER_MODE: 'dashscope', DASHSCOPE_API_KEY: '' }, 'DASHSCOPE_API_KEY_REQUIRED'],
  ])('rejects invalid configuration %j', (env, error) => {
    expect(() => config(env).validate()).toThrow(error);
  });

  it('selects memory and mock providers', () => {
    const c = config({ EVENT_BACKEND: 'memory', PROVIDER_MODE: 'mock' });
    expect(eventBusProvider.useFactory(c)).toBeInstanceOf(MemoryEventBus);
    expect(aiProvider.useFactory(c).constructor.name).toBe('MockAiProviders');
  });

  it('calls DashScope TTS and OpenAI-compatible chat', async () => {
    const c = config({ PROVIDER_MODE: 'dashscope', DASHSCOPE_API_KEY: 'key', LLM_API_KEY: 'llm-key' });
    const provider = new DashScopeProviders(c);
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ output: { audio: { url: 'https://cdn/audio.mp3' } }, usage: { duration: 1234 } }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '回复' } }] }) } as any);
    expect((await provider.synthesize({ text: '你好', dialect: 'cantonese', voiceId: 'v1', model: 'cosyvoice-v3.5-flash' })).durationMs).toBe(1234);
    expect(await provider.chat({ text: '你好', persona: 'mom', mode: 'adult', memories: [] })).toBe('回复');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await provider.audit({ type: 'text', content: 'x' })).status).toBe('approved');
    await expect(provider.recognize('')).rejects.toThrow('DASHSCOPE_STREAMING_ASR_REQUIRES_WS');
  });

  it('surfaces provider HTTP errors and default chat reply', async () => {
    const provider = new DashScopeProviders(config({ PROVIDER_MODE: 'dashscope', DASHSCOPE_API_KEY: 'key' }));
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 503 } as any)
      .mockResolvedValueOnce({ ok: false, status: 429 } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [] }) } as any);
    await expect(provider.synthesize({ text: 'x', dialect: 'mandarin', model: 'm' })).rejects.toThrow('DASHSCOPE_TTS_503');
    await expect(provider.chat({ text: 'x', persona: 'mom', mode: 'adult', memories: [] })).rejects.toThrow('LLM_429');
    await expect(provider.chat({ text: 'x', persona: 'mom', mode: 'adult', memories: [] })).resolves.toBe('我在听。');
  });
});
