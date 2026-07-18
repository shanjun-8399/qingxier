# 庆喜儿 AI 情感陪伴玩具技术方案设计 V1.1

**版本日期：** 2026-07-17  
**变更范围：** 多方言自动识别与克隆音色合成；唤醒词由“庆喜儿”改为“阿西”  
**适用范围：** 设备固件、云端服务、微信小程序、运营后台、测试与验收  
**状态：** 可开发/可联调方案；真实验收仍需服务器源码、小程序源码、固件、测试环境、第三方账号及设备

## 1. 变更摘要与决策

README 新需求包含两项：

1. 支持闽南语、吴语、粤语、四川话、陕西话、河南话、上海话等多种方言的识别与合成；设备自动检测，不要求用户手动切换；合成时保持同一克隆音色。
2. 唤醒词改为“阿西”。

本方案形成以下核心决策：

| 决策项 | V1.1 方案 | 说明 |
|---|---|---|
| 实时 ASR | 阿里云 DashScope `fun-asr-realtime` | 官方能力覆盖普通话、粤语、吴语、闽南语及河南、陕西、四川等地区官话口音，适合作为主识别链路。 |
| 方言自动判定 | 新增 `dialect-router`，结合音频声学特征、ASR 文本特征和会话滞回 | ASR 的自动语种识别不等于稳定输出细粒度方言标签，因此不能只依赖供应商语言字段。 |
| 克隆音色方言 TTS | `cosyvoice-v3.5-flash` 主路由；`cosyvoice-v3-flash` 兼容备选 | 两者支持声音复刻及方言指令控制，能够满足“统一克隆音色 + 方言输出”。 |
| 系统音色降级 | `qwen3-tts-flash-realtime` | 仅用于克隆音色不可用时的系统音色降级；该模型不支持声音克隆，不能作为主方案。 |
| 泛吴语处理 | ASR 保留 `wu`；TTS 当前映射到 `shanghai` 并显式返回降级原因 | 供应商明确支持上海话克隆音色，但未承诺覆盖所有吴语次方言。正式验收应增加苏州/杭州等目标口音语料，并在供应商能力确认后取消降级。 |
| 唤醒词 | ESP32-S3 本地 WakeNet9 定制模型，固定“阿西” | “阿西”只有两音节，低于常见 3-6 音节建议，需强化负样本、阈值、AFE/AEC/NS 和二次声学确认。 |
| 升级与回滚 | 唤醒词模型作为 `wake_words` OTA 包独立发布 | 支持灰度、哈希校验、失败回滚及版本可观测。 |

## 2. 需求口径与边界

### 2.1 目标方言枚举

V1.1 的业务枚举固定为：

```text
mandarin   普通话
minnan     闽南语
wu         泛吴语（非上海细分类或未能细分的吴语）
cantonese  粤语
sichuan    四川话
shaanxi    陕西话
henan      河南话
shanghai   上海话
unknown    无法可靠判定（只用于内部中间态，不直接进入 TTS）
```

“吴语”和“上海话”同时存在是为了符合产品需求并保留可扩展性。上海话作为明确子类单独验收；其他吴语口音先归入 `wu`。不能把“供应商支持吴语识别”误写成“已支持所有吴语克隆合成”。

### 2.2 用户体验约束

- 默认和正常流程中不出现“请选择方言”步骤。
- 设备在每次语音会话开始后自动判断方言，并在会话内保持稳定，避免逐句跳变。
- 置信度低时自动使用本轮稳定方言或用户语音配置的兜底方言，不中断对话。
- 小程序可显示“当前识别为粤语/四川话”等状态，但该状态是可解释信息，不是强制手动选择器。
- 仅在诊断页或客服排障页提供受控的临时覆盖能力；生产普通用户页保持自动模式。
- 克隆音色不可用时必须明确记录降级到系统音色，不能静默伪装为克隆音色。

## 3. 总体架构调整

```text
设备 ESP32-S3
  ├─ AFE/AEC/NS/VAD
  ├─ WakeNet9 “阿西”
  ├─ 音频采集与 WSS 上行
  └─ MQTT 状态/事件/OTA
          │
          ▼
语音接入网关
  ├─ 鉴权、限流、会话、音频分片
  ├─ Fun-ASR-Realtime 适配器
  ├─ Dialect Router
  ├─ 会话滞回与用户语音配置
  ├─ LLM/安全/记忆
  └─ TTS Router
       ├─ CosyVoice v3.5 Flash（克隆主路由）
       └─ Qwen3-TTS Flash Realtime（系统音色降级）
          │
          ▼
设备播放 / 小程序状态 / 观测平台
```

新增或调整的服务：

| 服务 | V1.1 职责 |
|---|---|
| `speech-gateway` | WSS 会话、音频流、VAD 事件、ASR/TTS 分片、超时和 Trace。 |
| `dialect-router` | 方言候选、置信度、会话滞回、用户兜底、路由决策及可解释原因。 |
| `tts-router` | 根据 `voiceId`、方言、供应商健康度和成本选择 CosyVoice/Qwen；产生降级信息。 |
| `voice-clone-service` | 授权、样本上传、训练回调、统一 `voiceId`、删除、审计和套餐额度。 |
| `speech-model-admin` | ASR/TTS/唤醒模型版本、灰度比例、阈值、回滚、供应商开关。 |
| `device-service` | 增加语音配置、唤醒词状态、模型版本、阈值和 OTA 状态。 |

## 4. 多方言自动识别设计

### 4.1 处理流程

1. 设备本地识别“阿西”，启动录音并发送 `start` 帧。
2. 网关创建 `speechSessionId`，加载设备语音配置、用户上一轮稳定方言和当前模型配置。
3. ASR 调用 `fun-asr-realtime`。不设置 `language_hints`，由模型自动识别语种；中文会话继续进入细粒度方言判断。
4. `dialect-router` 对前 2-4 秒有效语音计算声学 embedding，并结合 ASR 文本中的词汇、语气词、音系特征和用户历史生成方言候选。
5. 使用置信度阈值与会话滞回确定稳定方言：
   - `confidence >= 0.75`：锁定候选方言；
   - `0.55 <= confidence < 0.75`：优先沿用本轮已锁定方言；无已锁定值时采用用户历史稳定方言；
   - `confidence < 0.55`：采用设备 `fallbackDialect`，默认普通话；
   - 连续两轮高置信度与当前锁定值不一致时才允许切换。
6. 方言决策随 `asr_result` 帧返回，LLM 和 TTS 共享同一决策，避免“识别为一种方言、合成为另一种方言”。
7. 会话结束后只保存必要的统计、方言结果和脱敏文本；原始音频按用户授权及保存周期处理。

### 4.2 方言分类器实现建议

MVP 采用“供应商 ASR + 自有轻量分类器”而非重新训练完整 ASR：

- 输入：16kHz/16bit/mono 音频片段、ASR 文本、ASR 置信度、设备区域（可选且需授权）、历史稳定方言。
- 模型：ECAPA-TDNN/Whisper embedding 等声学特征 + 轻量文本分类器，最终用加权融合或小型分类头输出。
- 训练集：每类至少覆盖男女、儿童/成人、不同语速、1m/3m、安静/电视/音乐背景；禁止只使用单一城市单一说话人。
- 上海话与泛吴语必须分层标注，避免训练标签互相污染。
- 线上只保留 `dialect`, `confidence`, `modelVersion`, `decisionSource`；调试音频必须经过授权并设置 TTL。

### 4.3 自动识别失败策略

| 场景 | 处理 |
|---|---|
| ASR 供应商超时 | 500ms 内切备用 ASR 或返回离线/网络兜底话术；不阻塞设备状态机。 |
| 方言分类置信度低 | 沿用会话方言；无会话方言时采用配置兜底。 |
| 混合普通话与方言 | 会话级保持主方言；仅在连续两轮出现高置信度变化时切换。 |
| 供应商不支持目标方言 TTS | 返回 `degraded=true`、`fallbackReason` 和实际 `providerDialect`。 |
| 克隆音色训练失败或已删除 | 使用同人格系统音色；小程序显示“已临时使用默认音色”。 |

## 5. 方言克隆音色合成设计

### 5.1 模型路由

```text
voiceId 存在且状态 succeeded
  └─ CosyVoice v3.5 Flash
       ├─ 目标方言在供应商指令支持表中 -> 克隆音色 + 方言指令
       └─ 泛吴语 wu -> providerDialect=上海话，degraded=true

voiceId 不存在 / 已删除 / 供应商克隆服务不可用
  └─ Qwen3-TTS Flash Realtime 系统音色降级
       └─ response.voiceMode=system_voice，必须写入 fallbackReason
```

严禁出现以下错误组合：

```text
model = qwen3-tts-flash* AND voiceId != null
```

服务端应返回 `409101 VOICE_CLONE_UNSUPPORTED_BY_MODEL`，避免调用后才发现能力不匹配。

### 5.2 音色统一与数据模型

一个用户/人格只绑定一个平台无关的业务 `voiceId`；供应商任务 ID、模型版本和样本 URL 是内部实现字段。建议数据结构：

```json
{
  "voiceId": "voice_clone_mom_001",
  "userId": "u_001",
  "persona": "mom",
  "provider": "aliyun-dashscope",
  "providerVoiceId": "provider_voice_xxx",
  "modelFamily": "cosyvoice-v3.5",
  "status": "succeeded",
  "supportedDialects": ["minnan", "cantonese", "sichuan", "shaanxi", "henan", "shanghai"],
  "consentRecordId": "consent_001",
  "sampleDeletedAt": null,
  "createdAt": "2026-07-17T00:00:00Z"
}
```

不同方言合成仍使用同一个 `providerVoiceId`，通过方言指令控制发音风格。需要对同一批文本在不同方言下做说话人相似度与自然度双重验收。

### 5.3 合成缓存与延迟

- 常见问候、联网成功、低电量、提醒等固定文本按 `voiceId + dialect + textHash + modelVersion` 缓存。
- 对话链路采用 WebSocket 流式合成，首句先播，长回复分句生成。
- 缓存文件设置生命周期；克隆音色删除后必须清理相关缓存。
- 建议链路预算：
  - 终止点/VAD：200ms；
  - ASR 最终结果：350ms；
  - 方言路由：<=100ms；
  - LLM 首句：<=400ms；
  - TTS 首音频：<=450ms；
  - 端到端首音频 P95：<=1.5s（保留原验收目标）。

## 6. “阿西”唤醒词设计

### 6.1 固件方案

- 芯片：ESP32-S3-WROOM-1。
- 引擎：ESP-SR WakeNet9 定制模型。
- 输入：16kHz、16-bit signed、mono PCM。
- 前端：AFE + AEC + NS + VAD；播放 TTS 时使用回声参考信号，避免自唤醒。
- 固定唤醒词：`阿西`；旧词“庆喜儿”从生产模型和产品文案中移除。
- 唤醒后设备上报 `wakeWord`, `score`, `modelVersion`, `noiseLevel`, `playbackActive`。

### 6.2 两音节风险控制

“阿西”仅两音节，短词更容易与自然对话、电视音频和近音词混淆。采取以下措施：

1. 采集不少于 2 万条合格正样本作为正式定制训练目标，覆盖 500 名以上说话人更佳，并包含儿童样本。
2. 构建至少 5 倍于正样本的 hard-negative 集：阿姨、阿喜、阿七、阿星、可惜、东西、电视对白、音乐歌词及设备自身 TTS。
3. 按 0.5m/1.5m/3m、快/中/慢语速、30/50/65dBA 噪声分桶调阈值。
4. 第一阶段 WakeNet 命中后，增加 150-250ms 轻量声学/音素复核；复核失败不进入云端录音。
5. 播放态提高阈值并启用 AEC，防止设备说出近音内容后自唤醒。
6. 阈值和模型版本支持远程灰度，不把阈值硬编码在固件业务逻辑中。

### 6.3 OTA 与回滚

唤醒词包结构：

```json
{
  "packageType": "wake_words",
  "wakeWord": "阿西",
  "modelFamily": "WakeNet9",
  "version": "1.0.1",
  "hardwareRevisions": ["A1", "A2"],
  "sha256": "...",
  "threshold": 0.72,
  "rollout": {"percent": 10, "batches": ["pilot"]},
  "rollbackVersion": "1.0.0"
}
```

设备下载后先校验哈希与硬件版本，在备用资源分区加载自检；连续启动失败或唤醒模型加载失败时自动回滚，并上报 `rolled_back`。

## 7. 服务器设计调整

### 7.1 新增配置

```text
ASR_PROVIDER=aliyun-dashscope
ASR_MODEL=fun-asr-realtime
DIALECT_ROUTER_MODEL=qingxier-dialect-router-v1
DIALECT_HIGH_THRESHOLD=0.75
DIALECT_MEDIUM_THRESHOLD=0.55
TTS_CLONE_MODEL=cosyvoice-v3.5-flash
TTS_SYSTEM_FALLBACK_MODEL=qwen3-tts-flash-realtime
WAKE_WORD=阿西
WAKE_WORD_MODEL_FAMILY=WakeNet9
WAKE_WORD_MIN_VERSION=wakenet9-axi-1.0.0
SPEECH_PROVIDER_TIMEOUT_MS=1500
SPEECH_PROVIDER_CIRCUIT_BREAKER=true
```

生产密钥仍应进入 KMS/CI Secret，不得写入仓库或小程序。

### 7.2 数据库调整

| 集合 | 关键字段 | 用途 |
|---|---|---|
| `speech_profiles` | userId/deviceId, autoDialect, fallbackDialect, cloneVoiceId, thresholds | 用户/设备语音偏好与兜底。 |
| `speech_sessions` | sessionId, dialect, confidence, source, modelVersion, latency | 会话级方言锁定与观测。 |
| `speech_model_configs` | provider, model, capability, status, rollout, cost | ASR/TTS 模型路由及灰度。 |
| `wake_word_packages` | version, wakeWord, modelFamily, sha256, threshold, hardwareMatrix | 唤醒词模型 OTA。 |
| `wake_word_events` | deviceId, score, noise, modelVersion, accepted, falseWakeFeedback | 唤醒效果分析。 |
| `conversation_turns` 增量字段 | language, dialect, dialectConfidence, asrModel, ttsModel, voiceId, fallbackReason | 全链路可解释性。 |

索引建议：

- `speech_profiles(deviceId)` 唯一；
- `speech_sessions(deviceId, createdAt desc)`；
- `wake_word_events(modelVersion, createdAt)`；
- `wake_word_packages(version, hardwareRevision)` 唯一；
- 调试事件按 7-30 天 TTL，业务统计按脱敏策略保留。

### 7.3 安全与合规

- 声音克隆必须记录本人或监护人授权、用途、有效期和删除入口。
- 未成年人声音样本默认不用于模型再训练；供应商数据使用条款需法务确认。
- 方言识别不得隐式推断籍贯并用于营销画像；区域信息只作为可选技术特征且需授权。
- 声音样本、TTS 音频和原始对话音频使用独立桶、短期签名 URL、服务端加密和审计日志。
- 删除克隆音色时同步删除供应商音色、样本、缓存和人格绑定。

## 8. 小程序设计调整

### 8.1 页面变化

| 页面 | V1.1 变化 |
|---|---|
| 设备控制台 | 显示“自动识别方言：已开启”、最近识别方言、唤醒词“阿西”和模型状态；不显示手动切换器。 |
| 人格与音色 | 展示克隆音色状态、支持方言、试听入口、当前降级状态和删除入口。 |
| 语音诊断 | 仅开发/客服角色可见：方言置信度、路由来源、ASR/TTS 模型、Trace ID。 |
| OTA | 增加“唤醒词模型”资源类型、版本、下载/安装/回滚状态。 |
| 隐私授权 | 增加声音克隆授权、样本删除和方言识别用途说明。 |

### 8.2 前端状态约束

- `manualDialectSelectorVisible` 必须为 `false`（普通用户态）。
- 用户可配置的是“低置信度兜底方言”，不是每次对话的手动方言。
- 服务端返回 `degraded=true` 时展示轻量提示，并允许上报问题，不阻断播放。
- `401001` 跳转登录；`409101` 提示当前模型不支持克隆；`503001` 提示语音服务繁忙并使用默认音色。
- 前端只保存业务 Token，严禁保存设备密钥、第三方 API Key 或供应商 `providerVoiceId`。

## 9. 接口、WSS 与 MQTT 变更概览

详细定义见《庆喜儿AI玩具_接口变更说明_V1.1》；主要新增：

- `GET /api/v1/speech/capabilities`
- `GET/PATCH /api/v1/devices/{deviceId}/speech-profile`
- `POST /api/v1/speech/sessions`
- `POST /api/v1/speech/route`（内部/测试接口，生产可由 WSS 网关内聚）
- `POST /api/v1/speech/tts`（内部/调试）
- `GET /api/v1/devices/{deviceId}/wake-word/status`
- `POST /api/v1/admin/wake-word-packages`
- WSS `start/asr_result/tts_start/tts_chunk/error` 增加方言和模型字段。
- MQTT `wake` 事件增加模型版本、分数和噪声；OTA 包支持 `wake_words`。

## 10. 监控、告警与 SLO

| 指标 | 建议验收/告警口径 |
|---|---|
| 唤醒成功率 | 保留原标准：1.5m，幼儿版 >=90%，成人版 >=95%；按模型版本、噪声、距离分桶。 |
| 误唤醒 | 电视/音乐背景 1 小时 <=2 次；近音词专项误触发率建议 <=3%。 |
| 方言分类 | 验收集 macro-F1 >=0.85；各目标方言 recall >=0.80；上海话/泛吴语单列混淆矩阵。 |
| ASR 质量 | 安静场景字符错误率 CER <=15%；65dBA 背景噪声 CER <=25%（各方言分别统计）。 |
| TTS 方言自然度 | 5 分制 MOS >=4.0；方言正确性专家评分 >=4.0。 |
| 克隆相似度 | 统一量表/模型相似度 >=0.85，且各方言间差异不超过 0.08。 |
| 端到端延迟 | 从用户停说到首音频 P95 <=1.5s；超时率 <1%。 |
| 降级率 | 克隆到系统音色降级 <2%；泛吴语到上海话映射单独统计，不混入故障率。 |
| 稳定性 | 72 小时无崩溃、无持续内存增长；WSS 重连成功率 >=99%。 |

所有指标必须带 `traceId/deviceIdHash/modelVersion/dialect/provider` 标签，便于定位供应商、模型或特定方言问题。

## 11. 新增验收用例

| ID | 测试项 | 方法 | 通过标准 |
|---|---|---|---|
| DIA-01 | 七类目标方言自动识别 | 每类至少 100 条多人语料，设备不做手动选择 | macro-F1 >=0.85，各类 recall >=0.80。 |
| DIA-02 | 无手动切换流程 | 从唤醒到连续 10 轮对话 | 不出现选择方言提示，路由可稳定完成。 |
| DIA-03 | 会话滞回 | 方言中夹杂一轮普通话/低置信度音频 | 不发生单轮抖动；沿用会话主方言。 |
| DIA-04 | 低置信度兜底 | 噪声/短语音使置信度 <0.55 | 使用配置兜底并返回原因。 |
| DIA-05 | 上海话与泛吴语 | 上海、苏州/杭州目标语料分别测试 | 上海话单独识别；泛吴语不错误标记为高置信度上海话。 |
| TTS-DIA-01 | 七类方言合成 | 同一克隆音色朗读统一文本集 | 方言正确性与自然度达标。 |
| TTS-DIA-02 | 音色一致性 | 同一 `voiceId` 跨方言对比 | 相似度 >=0.85，方言间差异 <=0.08。 |
| TTS-DIA-03 | 模型能力冲突 | Qwen3-TTS-Flash + voiceId | 服务端拒绝并返回 409101。 |
| TTS-DIA-04 | 泛吴语降级 | 请求 `wu` 克隆音色 | 返回实际 providerDialect 和 fallbackReason，不静默降级。 |
| WAK-01 | “阿西”唤醒成功率 | 1.5m 各喊 20 次 | 幼儿 >=18，成人 >=19。 |
| WAK-02 | 近音/电视误唤醒 | 近音词集 + 电视/音乐 1 小时 | 误唤醒 <=2 次/小时，近音误触发率 <=3%。 |
| WAK-03 | 播放态防自唤醒 | 设备播放含近音词 TTS | 不自唤醒。 |
| WAK-04 | 唤醒词 OTA 回滚 | 下发损坏或不兼容模型包 | 自动回滚且设备仍可使用上一模型。 |
| WAK-05 | 模型版本观测 | 唤醒并检查云端事件 | 事件包含 score/modelVersion/noiseLevel。 |

以上阈值是项目验收建议值，不是第三方供应商 SLA；上线前应由产品、算法、硬件和甲方共同冻结。

## 12. 实施顺序

1. 冻结方言枚举、验收语料范围与上海话/泛吴语边界。
2. 开通 DashScope ASR、CosyVoice、Qwen3-TTS 账号与测试额度；完成数据合规审查。
3. 固件集成 AFE/AEC/NS、WakeNet9“阿西”模型、事件上报和唤醒词 OTA。
4. 云端实现 `speech-gateway`、`dialect-router`、`tts-router`、配置与数据模型。
5. 小程序实现能力发现、自动识别状态、克隆音色、诊断和唤醒词 OTA 展示。
6. 建立多人多环境音频集，先离线基准，再设备真机测试。
7. 执行接口、WSS、MQTT、真实语音、BLE、OTA、72 小时长稳和灰度回滚测试。
8. 达到验收指标后逐步扩大设备比例；异常时按模型版本快速回滚。

## 13. 当前实施阻塞

截至 2026-07-17，仓库仅包含 README 和设计/验收 Word 文档，没有服务器源码、小程序源码、设备固件、Docker/部署脚本、测试域名、第三方密钥、微信小程序账号、测试设备和音频语料。因此本次能够真实完成的是：

- 文档评审与 V1.1 技术方案；
- 新接口契约参考实现；
- 服务器与小程序的契约/状态流自动化测试；
- 完整报告模板和逐项阻塞记录。

真实服务器、小程序真机及设备验收不得在上述条件补齐前标记为通过。

## 14. 参考资料

1. 仓库 README 与 `docs/` 下 V1.0 技术方案、API、部署清单、产品功能清单、硬件说明、验收标准。
2. 阿里云 Model Studio 语音识别模型说明（2026-07-17 核验）：Fun-ASR-Realtime 支持多语种及中文方言/地区口音。
3. 阿里云 Model Studio Fun-ASR-Realtime SDK 说明（2026-07-17 核验）：未设置 `language_hints` 时自动识别语种。
4. 阿里云 Model Studio 语音合成模型说明（2026-07-17 核验）：CosyVoice v3.5/v3 Flash 支持声音复刻与方言指令；Qwen3-TTS-Flash 不支持声音复刻。
5. Espressif ESP-SR 唤醒词定制说明（2026-07-17 核验）：WakeNet 定制语料、3-6 音节常规建议、16kHz/16bit/mono 输入和硬件声学测试要求。
