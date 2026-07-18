import WebSocket from 'ws';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:8765';
const json = async (path, options = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok || body.code !== 0) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body.data;
};

const health = await json('/health');
const login = await json('/api/v1/auth/wechat-login', {
  method: 'POST', body: JSON.stringify({ code: '1' }),
});
const devices = await json('/api/v1/devices', {
  headers: { Authorization: `Bearer ${login.accessToken}` },
});
const session = await json('/api/v1/speech/sessions', {
  method: 'POST',
  headers: { 'X-Device-Token': 'device-token' },
  body: JSON.stringify({
    deviceId: 'd_001', mode: 'adult', persona: 'mom', wakeModelVersion: 'wakenet9-axi-1.0.0', wakeWord: '阿西',
  }),
});
const route = await json('/api/v1/speech/route', {
  method: 'POST', headers: { 'X-Device-Token': 'device-token' },
  body: JSON.stringify({ sessionId: session.sessionId, dialectCandidate: 'cantonese', confidence: 0.91 }),
});
const tts = await json('/api/v1/speech/tts', {
  method: 'POST', headers: { 'X-Device-Token': 'device-token' },
  body: JSON.stringify({ sessionId: session.sessionId, text: '你好阿西', dialect: route.dialect }),
});
const dashboard = await json('/api/v1/admin/dashboard', {
  headers: { Authorization: 'Bearer admin-token', 'X-MFA-Verified': 'true' },
});

const wsSummary = await new Promise((resolve, reject) => {
  const url = base.replace(/^http/, 'ws') + '/ws/v1/voice?token=device-token';
  const ws = new WebSocket(url);
  const seen = [];
  const timer = setTimeout(() => { ws.terminate(); reject(new Error('websocket timeout')); }, 8000);
  ws.on('message', raw => {
    const message = JSON.parse(raw.toString());
    seen.push(message.type);
    if (message.type === 'connected') {
      ws.send(JSON.stringify({ type: 'start', deviceId: 'd_001', mode: 'adult', persona: 'mom', wakeModelVersion: 'wakenet9-axi-1.0.0' }));
    } else if (message.type === 'started') {
      ws.send(JSON.stringify({ type: 'route', dialectCandidate: 'sichuanese', confidence: 0.88 }));
    } else if (message.type === 'dialect_result') {
      ws.send(JSON.stringify({ type: 'tts_request', text: '巴适得很', dialect: 'sichuanese' }));
    } else if (message.type === 'tts_start') {
      ws.send(JSON.stringify({ type: 'end' }));
    } else if (message.type === 'completed') {
      clearTimeout(timer); ws.close(); resolve(seen);
    } else if (message.type === 'error') {
      clearTimeout(timer); ws.close(); reject(new Error(JSON.stringify(message)));
    }
  });
  ws.on('error', reject);
});

console.log(JSON.stringify({
  result: 'PASS',
  checks: 7,
  health: health.status,
  accessToken: login.accessToken,
  devices: devices.length,
  routedDialect: route.dialect,
  ttsModel: tts.model,
  adminUsers: dashboard.users,
  websocketFrames: wsSummary,
}, null, 2));
