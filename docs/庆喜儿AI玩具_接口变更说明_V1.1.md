# 庆喜儿 AI 玩具接口变更说明 V1.1

**日期：** 2026-07-17  
**兼容策略：** 原 `/api/v1` 继续保留；新增字段均为向后兼容可选字段，但新设备固件和小程序 V1.1 必须使用本说明中的语音能力接口。  
**目的：** 支持自动方言识别、克隆音色方言合成和“阿西”唤醒词模型的查询、发布、监控与回滚。

## 1. 公共枚举

### 1.1 DialectCode

```text
mandarin | minnan | wu | cantonese | sichuan | shaanxi | henan | shanghai
```

`unknown` 只允许出现在内部识别中间结果，不能作为最终 TTS 请求值。

### 1.2 DialectSource

```text
classifier | session_hysteresis | user_history | profile_fallback | provider_fallback
```

### 1.3 VoiceMode

```text
cloned_voice | system_voice
```

### 1.4 WakeWordPackageStatus

```text
registered | staged | downloading | installing | active | failed | rolled_back
```

## 2. 新增错误码

| code | name | HTTP | 说明 |
|---|---|---:|---|
| 400101 | AUTO_DIALECT_REQUIRED | 400 | V1.1 普通用户链路禁止关闭自动方言识别。 |
| 400102 | UNSUPPORTED_DIALECT | 400 | 方言值不在能力清单中。 |
| 400103 | WAKE_WORD_MISMATCH | 400 | 唤醒词不是“阿西”或模型包元数据不一致。 |
| 400104 | INVALID_CONFIDENCE | 400 | 方言置信度不在 0-1。 |
| 409101 | VOICE_CLONE_UNSUPPORTED_BY_MODEL | 409 | 所选 TTS 模型不支持声音克隆。 |
| 409102 | SPEECH_PROFILE_CONFLICT | 409 | 语音配置版本冲突。 |
| 503101 | ASR_PROVIDER_UNAVAILABLE | 503 | ASR 供应商不可用。 |
| 503102 | TTS_PROVIDER_UNAVAILABLE | 503 | TTS 供应商不可用，且降级失败。 |
| 503103 | DIALECT_ROUTER_UNAVAILABLE | 503 | 方言分类服务不可用。 |
| 600101 | WAKE_MODEL_LOAD_FAILED | 500/设备事件 | 唤醒词模型加载失败。 |
| 600102 | WAKE_MODEL_ROLLED_BACK | 200/设备事件 | 新模型失败，已回滚。 |

标准错误响应：

```json
{
  "code": 409101,
  "message": "Qwen3-TTS-Flash 不支持声音克隆",
  "error": "VOICE_CLONE_UNSUPPORTED_BY_MODEL",
  "data": null,
  "traceId": "trc_xxx"
}
```

## 3. `GET /api/v1/speech/capabilities`

**认证：** Bearer JWT  
**用途：** 小程序启动时读取服务端实际模型能力，避免把供应商支持矩阵硬编码到前端。

响应示例：

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "autoDialect": true,
    "supportedDialects": [
      {"code": "minnan", "label": "闽南语"},
      {"code": "wu", "label": "吴语"},
      {"code": "cantonese", "label": "粤语"},
      {"code": "sichuan", "label": "四川话"},
      {"code": "shaanxi", "label": "陕西话"},
      {"code": "henan", "label": "河南话"},
      {"code": "shanghai", "label": "上海话"}
    ],
    "asr": {
      "provider": "aliyun-dashscope",
      "primaryModel": "fun-asr-realtime",
      "languageHintsRequired": false,
      "dialectClassifier": "qingxier-dialect-router-v1"
    },
    "tts": {
      "clonePrimaryModel": "cosyvoice-v3.5-flash",
      "systemVoiceFallbackModel": "qwen3-tts-flash-realtime",
      "clonePrimarySupportsDialectInstruction": true,
      "systemVoiceFallbackSupportsVoiceClone": false
    },
    "wakeWord": {
      "text": "阿西",
      "modelFamily": "WakeNet9",
      "currentVersion": "wakenet9-axi-1.0.0"
    }
  },
  "traceId": "trc_xxx"
}
```

## 4. `GET /api/v1/devices/{deviceId}/speech-profile`

**认证：** Bearer JWT；用户必须绑定设备。

响应字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| deviceId | string | 设备 ID。 |
| autoDialect | boolean | V1.1 正常用户固定为 true。 |
| fallbackDialect | DialectCode | 低置信度兜底方言。 |
| sessionLockEnabled | boolean | 是否使用会话滞回。 |
| highConfidenceThreshold | number | 高置信度阈值，默认 0.75。 |
| mediumConfidenceThreshold | number | 中置信度阈值，默认 0.55。 |
| cloneVoiceId | string/null | 当前人格/默认人格克隆音色。 |
| version | integer | 乐观锁版本。 |

## 5. `PATCH /api/v1/devices/{deviceId}/speech-profile`

请求：

```json
{
  "autoDialect": true,
  "fallbackDialect": "mandarin",
  "cloneVoiceId": "voice_clone_mom_001",
  "version": 3
}
```

规则：

- 普通用户传 `autoDialect=false` 返回 `400101`。
- `fallbackDialect` 必须来自能力接口。
- 更新成功后通过 MQTT 向设备发送配置版本；设备 ACK 后写入 `appliedAt`。
- 管理员诊断接口可临时覆盖方言，但必须带 TTL 和审计记录，不属于普通用户 API。

## 6. `POST /api/v1/speech/sessions`

**认证：** `X-Device-Token` 或设备 HMAC  
**用途：** 设备唤醒后建立语音会话。

请求：

```json
{
  "deviceId": "d_001",
  "wakeWord": "阿西",
  "wakeWordScore": 0.88,
  "wakeWordModelVersion": "wakenet9-axi-1.0.0",
  "autoDialect": true,
  "audio": {"codec": "pcm", "sampleRate": 16000, "channels": 1}
}
```

响应：

```json
{
  "code": 0,
  "data": {
    "sessionId": "ssn_xxx",
    "deviceId": "d_001",
    "wakeWord": "阿西",
    "wakeWordModelVersion": "wakenet9-axi-1.0.0",
    "autoDialect": true,
    "lockedDialect": null,
    "wsUrl": "wss://voice.{domain}/ws/v1/voice?sessionId=ssn_xxx"
  },
  "traceId": "trc_xxx"
}
```

## 7. `POST /api/v1/speech/route`

该接口用于契约测试、后台诊断或将方言服务独立部署时的内部调用。生产主链路也可内聚于 WSS 网关，但响应结构应保持一致。

请求：

```json
{
  "sessionId": "ssn_xxx",
  "dialectCandidate": "cantonese",
  "confidence": 0.91,
  "previousDialect": "cantonese",
  "featuresVersion": "dialect-features-v1"
}
```

响应：

```json
{
  "code": 0,
  "data": {
    "sessionId": "ssn_xxx",
    "language": "zh",
    "dialect": "cantonese",
    "dialectLabel": "粤语",
    "candidateDialect": "cantonese",
    "dialectConfidence": 0.91,
    "dialectSource": "classifier",
    "stability": "locked",
    "manualSwitchRequired": false,
    "modelVersion": "qingxier-dialect-router-v1"
  },
  "traceId": "trc_xxx"
}
```

## 8. `POST /api/v1/speech/tts`

**认证：** 设备 Token；后台调试可使用 RBAC Token。  
**用途：** 统一 TTS 路由，不允许业务服务直接绕过该接口调用供应商。

请求：

```json
{
  "sessionId": "ssn_xxx",
  "text": "食饱未",
  "dialect": "minnan",
  "voiceId": "voice_clone_mom_001",
  "persona": "mom",
  "stream": true
}
```

克隆音色响应：

```json
{
  "code": 0,
  "data": {
    "provider": "aliyun-dashscope",
    "model": "cosyvoice-v3.5-flash",
    "voiceMode": "cloned_voice",
    "voiceId": "voice_clone_mom_001",
    "requestedDialect": "minnan",
    "providerDialect": "闽南话",
    "degraded": false,
    "fallbackReason": null,
    "audio": {"codec": "mp3", "sampleRate": 24000},
    "audioUrl": "https://cdn.../tts/xxx.mp3",
    "firstAudioLatencyMs": 430
  },
  "traceId": "trc_xxx"
}
```

泛吴语降级响应必须明确：

```json
{
  "requestedDialect": "wu",
  "providerDialect": "上海话",
  "degraded": true,
  "fallbackReason": "WU_GENERIC_MAPPED_TO_SHANGHAI"
}
```

系统音色降级：

```json
{
  "model": "qwen3-tts-flash-realtime",
  "voiceMode": "system_voice",
  "voiceId": null,
  "fallbackReason": "CLONE_VOICE_UNAVAILABLE"
}
```

## 9. `GET /api/v1/devices/{deviceId}/wake-word/status`

响应：

```json
{
  "code": 0,
  "data": {
    "deviceId": "d_001",
    "wakeWord": "阿西",
    "syllableCount": 2,
    "modelFamily": "WakeNet9",
    "modelVersion": "wakenet9-axi-1.0.0",
    "threshold": 0.72,
    "afeEnabled": true,
    "aecEnabled": true,
    "noiseSuppressionEnabled": true,
    "ota": {
      "packageType": "wake_words",
      "targetVersion": null,
      "status": "active",
      "rollbackSupported": true
    }
  },
  "traceId": "trc_xxx"
}
```

## 10. `POST /api/v1/admin/wake-word-packages`

**认证：** 管理后台 RBAC + MFA；建议使用 `Idempotency-Key`。

请求：

```json
{
  "packageType": "wake_words",
  "wakeWord": "阿西",
  "modelFamily": "WakeNet9",
  "version": "1.0.1",
  "url": "https://cos.../wake/wakenet9-axi-1.0.1.bin",
  "sha256": "64位小写十六进制",
  "threshold": 0.72,
  "hardwareRevisions": ["A1", "A2"],
  "rollbackVersion": "1.0.0",
  "rollout": {"percent": 10, "batchTags": ["pilot"]}
}
```

校验：

- `wakeWord` 必须等于“阿西”；
- `modelFamily` 必须是 WakeNet9（当前 ESP32-S3 方案）；
- 哈希、硬件版本、回滚版本和对象存储签名均必须有效；
- 同一版本不可重复发布；重复幂等键返回同一结果。

## 11. WebSocket `/ws/v1/voice` 变更

### 11.1 start

```json
{
  "type": "start",
  "sessionId": "ssn_xxx",
  "traceId": "trc_xxx",
  "autoDialect": true,
  "fallbackDialect": "mandarin",
  "wakeWord": "阿西",
  "wakeWordModelVersion": "wakenet9-axi-1.0.0",
  "audio": {"codec": "pcm", "sampleRate": 16000, "channels": 1}
}
```

### 11.2 asr_result

```json
{
  "type": "asr_result",
  "seq": 4,
  "text": "侬好呀",
  "isFinal": true,
  "language": "zh",
  "dialect": "shanghai",
  "dialectConfidence": 0.93,
  "dialectSource": "classifier",
  "stability": "locked",
  "asrModel": "fun-asr-realtime",
  "dialectModel": "qingxier-dialect-router-v1"
}
```

### 11.3 tts_start

```json
{
  "type": "tts_start",
  "model": "cosyvoice-v3.5-flash",
  "voiceMode": "cloned_voice",
  "voiceId": "voice_clone_mom_001",
  "requestedDialect": "shanghai",
  "providerDialect": "上海话",
  "degraded": false,
  "fallbackReason": null
}
```

### 11.4 error

```json
{
  "type": "error",
  "code": 503102,
  "error": "TTS_PROVIDER_UNAVAILABLE",
  "message": "语音合成暂不可用",
  "recoverable": true,
  "fallbackAttempted": true,
  "traceId": "trc_xxx"
}
```

## 12. MQTT 变更

### 12.1 唤醒事件

Topic：`device/{deviceId}/event/up`

```json
{
  "eventType": "wake",
  "wakeWord": "阿西",
  "score": 0.88,
  "modelFamily": "WakeNet9",
  "modelVersion": "wakenet9-axi-1.0.0",
  "threshold": 0.72,
  "noiseLevelDb": 48,
  "playbackActive": false,
  "ts": "2026-07-17T00:00:00Z"
}
```

### 12.2 语音观测事件

Topic：`device/{deviceId}/telemetry/up`

```json
{
  "metricType": "speech_turn",
  "sessionId": "ssn_xxx",
  "dialect": "sichuan",
  "dialectConfidence": 0.86,
  "asrLatencyMs": 330,
  "dialectRouteLatencyMs": 45,
  "ttsFirstAudioLatencyMs": 420,
  "endToEndFirstAudioMs": 1190,
  "asrModel": "fun-asr-realtime",
  "ttsModel": "cosyvoice-v3.5-flash",
  "degraded": false
}
```

### 12.3 唤醒词 OTA

原 `device/{deviceId}/ota/down` 的 `packageType` 增加 `wake_words`：

```json
{
  "jobId": "ota_wake_001",
  "packageType": "wake_words",
  "version": "1.0.1",
  "url": "https://cos.../wake.bin",
  "sha256": "...",
  "threshold": 0.72,
  "rollbackVersion": "1.0.0",
  "mandatory": false
}
```

设备进度上报增加：`model_load_check`, `threshold_applied`, `rolled_back`。

## 13. 兼容与发布

- V1.0 小程序不调用新接口时仍可使用旧对话接口，但无法显示方言/唤醒模型状态。
- V1.1 设备必须在 `start` 中上报唤醒词模型版本；缺失时服务端标记 `legacyFirmware=true`。
- 首次发布按 5% -> 20% -> 50% -> 100% 灰度；每阶段观察至少 24 小时误唤醒、崩溃和语音降级率。
- 发生误唤醒显著上升、模型加载失败或端到端延迟超阈值时，停止灰度并回滚模型/路由配置。

## 14. 契约测试基线

仓库新增的参考测试覆盖：

- 语音能力、方言枚举、自动模式、阈值和会话滞回；
- 克隆音色 CosyVoice 路由、Qwen3-TTS 系统音色降级及能力冲突；
- “阿西”会话、唤醒词包、哈希、权限和幂等；
- 小程序初始化、状态、错误、Trace ID、密钥不泄露和 URL 编码；
- 标准响应、错误码和认证头。

该基线是实现前的可执行契约，不代表真实第三方语音质量、服务器性能、微信真机或硬件验收已完成。
