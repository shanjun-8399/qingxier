# 庆喜儿AI玩具_技术方案设计_V1.0(3).docx

庆喜儿 AI 情感陪伴玩具

技术方案设计

系统架构 · 技术栈 · 数据库设计

| 文档版本 | V1.0 |
| 编制日期 | 2026-06-14 |
| 适用范围 | 后端服务、微信小程序、设备固件联调、云端部署与验收准备 |
| 依据资料 | 产品功能清单、AI 玩具项目功能清单、硬件原理图设计说明、验收测试标准 |
| 状态 | 内部评审稿；待产品、硬件、云端和甲方运维确认 |

| 说明：本文档根据现有项目资料进行工程化拆解，重点固化可研发、可联调、可验收的技术口径。涉及第三方服务的账号、实名/资质、价格和政策要求，以甲方最终开通平台规则为准。 |

目录

1. 1. 项目理解与设计目标

2. 2. 系统总体架构

3. 3. 端到端核心流程

4. 4. 技术栈方案

5. 5. 数据库设计

6. 6. 安全、合规与内容风控

7. 7. 性能与验收映射

8. 8. 风险与待确认事项

1. 项目理解与设计目标

庆喜儿是一款面向家庭及个体的 AI 情感陪伴毛绒玩具。系统需同时支撑幼儿版与成人版：幼儿版强调安全早教、习惯引导与家长控制；成人版强调深度情感记忆、多角色人格、跨设备互动和主动关怀。

1.1 依据资料

| 资料 | 对本方案的输入 |
| 产品功能清单 | 产品定位、幼儿/成人双模式、语音交互、长期记忆、亲友留言、家长控制、小程序页面、硬件规格摘要 |
| AI 玩具项目功能清单 Excel | 后端/小程序/产品 UI 模块拆分：AI 对话、提醒、亲友消息、设备管理、OTA、表情、体感、任务、用户、MongoDB、EMQX、Redis、COS |
| 硬件原理图设计说明 V1.0 | ESP32-S3-WROOM-1、双麦、I2S 扬声器、TTP223 触摸、OLED、WS2812、IP5306、电源/PCB 约束和引脚分配 |
| 验收测试标准 | 硬件基础、语音 AI、内容库、自定义内容、跨设备、小程序、OTA、性能和验收结论要求 |

1.2 建设目标

建立“设备固件 + 微信小程序 + 云端服务 + AI 能力 + 运维部署”的端到端技术方案，便于研发排期和三方联调。

将 MQTT、WebSocket、REST API、COS 资源、MongoDB/Redis 数据模型统一到一套可验收架构中。

围绕验收标准提前固化关键非功能指标：语音响应延迟、跨设备留言时延、蓝牙配网成功时长、OTA 回滚、低功耗与长稳运行。

明确幼儿版与成人版的数据边界：幼儿版默认不做长期个人画像，成人版在用户授权后启用云端记忆。

1.3 功能边界与模块拆分

| 模块 | 方案覆盖内容 |
| AI 对话 | 双模式路由、人格切换、多轮上下文、大模型代理、内容安全、长期记忆 |
| 关心提醒 | 定时/周期提醒、二次确认、三级情绪递进、微信/MQTT 推送、完成闭环 |
| 跨设备消息 | 亲子/情侣/闺蜜关系、文字/语音留言、离线存储、上线推送、已读回执 |
| 设备管理 | 注册、绑定/解绑、状态心跳、电量、模式/人格同步、远程指令、OTA |
| 表情与体感 | OLED 表情、眼周 RGB、胸口暖灯、加热、心跳震动、呼吸舵机 |
| 内容与订阅 | 幼儿内容库、自定义问答/提醒/故事、声音克隆、套餐容量和权限控制 |
| 任务与奖励 | 每日任务、双人任务、小鱼干积分、虚拟皮肤/优惠券兑换 |
| 运营后台 | 内容库、表情规则、OTA 包、风控审核、用户/设备/订单查询 |

2. 系统总体架构

图 1 系统总体架构：小程序、设备、云端业务、AI 编排、MQTT、数据存储与第三方服务关系

2.1 分层架构说明

| 层级 | 组件 | 职责 |
| 终端层 | AI 玩具设备、微信小程序、运营后台 | 设备负责唤醒、音频采集、播放、触摸/体感/表情执行；小程序负责配网、控制、内容管理、亲友消息和订阅；后台负责运营配置。 |
| 接入层 | API Gateway/BFF、语音 WebSocket 网关、EMQX MQTT Broker | REST 承载小程序业务；WSS 承载音频流；MQTTS 承载设备状态、控制、提醒、留言、OTA。 |
| 业务层 | 用户、设备、提醒、亲友、内容、任务、支付、OTA、表情规则 | 统一处理权限、状态、指令、消息、套餐额度、任务奖励和运营内容。 |
| AI 能力层 | ASR、LLM、TTS、声音克隆、记忆、情绪识别、安全过滤 | 成人版通过 DeepSeek 等大模型完成多轮对话；幼儿版优先走安全库和有限意图。 |
| 数据与资源层 | MongoDB、Redis、COS/CDN、日志与监控 | MongoDB 保存业务主数据；Redis 保存在线状态、限流和队列；COS 保存 OTA、表情、音频和样本。 |

2.2 设备侧架构

设备硬件以 ESP32-S3-WROOM-1 为主控，支持 WiFi/BT，外接双硅麦、I2S 扬声器、四路 TTP223 触摸、震动马达、柔性加热片、微型直线舵机、双 OLED、WS2812 眼周灯和胸口暖黄 LED。固件建议按“驱动层、设备服务层、通信层、业务状态机、OTA/诊断层”组织。

| 设备层 | 关键内容 | 设计要求 |
| 驱动层 | I2S 麦克风/扬声器、I2C OLED、PWM 舵机/马达、GPIO 触摸、ADC 电池/NTC、WS2812 | 所有外设接口增加错误码、超时和降级策略；关键指标上报云端。 |
| 通信层 | WiFi、BLE 配网、MQTTS、WSS、HTTP(S) OTA | 支持断线重连、心跳、遗嘱消息、证书/Token 刷新。 |
| 业务状态机 | 待机、唤醒、录音、对话、播放、提醒、哄睡、升级、低电量 | 统一调度表情、灯效、震动、加热和舵机动作，避免资源冲突。 |
| 安全与升级 | 安全启动可选、固件签名、双分区 OTA、回滚、生产测试模式 | 满足 OTA 失败回滚和验收测试要求。 |

2.3 云端服务划分

| 服务 | 职责 |
| auth-service | 微信登录、手机号绑定、JWT/Refresh Token、RBAC、设备证书绑定 |
| device-service | 设备注册、绑定、状态、心跳、电量、模式/人格同步、控制指令 |
| ai-orchestrator | ASR、Prompt、LLM、记忆召回、内容安全、TTS、对话记录 |
| reminder-service | 提醒配置、周期计算、二次确认、情绪递进、微信/MQTT 通知 |
| relationship-message-service | 亲友关系、留言、离线存储、上线推送、已读回执 |
| content-service | 幼儿内容库、自定义问答/故事、审核、套餐容量限制 |
| voice-clone-service | 样本上传、训练任务、状态回调、人格音色绑定、删除 |
| task-reward-service | 每日/双人任务、奖励发放、小鱼干积分、兑换记录 |
| ota-service | 固件/表情/内容包版本、灰度策略、升级任务、进度与回滚 |
| admin-service | 运营后台、内容审核、规则配置、工单、审计日志 |

3. 端到端核心流程

3.1 语音对话流程

图 2 语音对话链路：本地唤醒、音频上传、ASR、模式路由、安全过滤、TTS 与设备动作

设备端完成本地唤醒与录音起止控制，避免持续上传背景音。

音频流通过 WSS 发送到语音网关；轻量状态、表情和动作指令通过 MQTT 下发。

幼儿版优先查询安全问答库、自定义问答与有限意图；未命中时使用审核后的兜底话术。

成人版按“上下文摘要 + 长期记忆召回 + 人格 Prompt + 安全过滤”调用 LLM，再走 TTS/克隆音色输出。

响应链路需记录 ASR 延迟、LLM 延迟、TTS 延迟、端到端延迟，支撑验收中的响应时延定位。

3.2 蓝牙配网与设备绑定流程

1. 小程序扫描 BLE 广播，读取设备 SN、临时配网公钥和设备型号。

2. 用户选择 WiFi 后，小程序通过 BLE 加密传输 SSID/密码和一次性绑定票据。

3. 设备联网后调用设备激活接口，获取 MQTT/WSS 接入地址和短期 deviceToken。

4. 云端完成设备与用户绑定，推送“联网成功”语音和小程序状态刷新。

5. 绑定后设备开始上报心跳、电量、固件版本和外设自检结果。

3.3 智能提醒与情绪递进流程

提醒服务按 nextTriggerAt 扫描到期任务，通过 MQTT 下发设备播报，同时向微信小程序推送通知。用户可在设备端或小程序端确认；未确认时进入二次提醒和情绪值累积，触发表情、语气与“撒娇→闹别扭→冷战”的状态变化。完成后生成和解动作并写入 reminder_events。

3.4 跨设备留言流程

1. 发送方在小程序或设备端发起文字/语音留言，云端校验亲友关系和权限。

2. 文本直接入 messages；语音先上传 COS，审核通过后写入音频元数据。

3. 若接收方设备在线，通过 MQTT 下发消息提醒；离线则保留待投递状态，设备上线后补发。

4. 设备播放后上报 read 事件，云端更新 readAt 并推送发送方小程序显示已读。

3.5 OTA 流程

运营后台上传固件/表情包/内容包到 COS，并录入版本、hash、适配硬件版本、强制/可选策略。

设备定期检查或云端 MQTT 触发检查，下载包前校验电量、网络、版本兼容和 hash。

固件 OTA 使用双分区写入；升级失败自动回滚并上报失败码。

表情包和幼儿内容库 OTA 采用资源包版本管理，可支持增量包。

4. 技术栈方案

| 领域 | 推荐技术栈 | 理由 |
| 设备固件 | ESP-IDF + FreeRTOS；C/C++；NVS；MQTTS；WSS；OTA 分区；I2S/I2C/PWM/ADC 驱动 | 兼容 ESP32-S3 资源约束，支持低功耗、断线重连和安全升级 |
| 微信小程序 | TypeScript + uniapp 小程序框架；蓝牙配网能力；云端 REST/WSS | 覆盖配网、设备控制、亲友圈、提醒、任务、订阅和家长控制 |
| API/BFF 服务 | Node.js 20 + NestJS + TypeScript；OpenAPI 3.0；JWT/RBAC；Swagger；Docker | 适合小程序业务聚合、设备管理和消息编排；便于生成接口文档 |
| AI 编排服务 | Python FastAPI 或 NestJS Worker；ASR/LLM/TTS 适配器；Prompt 模板；安全过滤；记忆召回 | 可独立扩缩容；成人模式接入 DeepSeek 大模型，幼儿模式优先安全库 |
| 消息通道 | EMQX MQTT Broker；MQTTS 8883；WSS MQTT 8084；QoS 1；遗嘱消息 LWT | 承载设备状态、远程控制、提醒、留言、OTA 指令 |
| 数据存储 | MongoDB 副本集；Redis；COS/CDN；对象元数据入库 | MongoDB 承载用户、设备、消息、记忆、内容、任务；Redis 缓存在线状态和队列 |
| 异步任务 | BullMQ/Redis Queue 或同等级任务调度；Cron；失败重试；死信记录 | 提醒触发、周报生成、OTA 批次、AI 异步训练任务 |
| 运维观测 | Nginx/负载均衡、Prometheus/Grafana 或云监控、集中日志、Sentry/异常追踪 | 支撑验收中的 72 小时稳定性和上线后告警 |

| 实施建议：MVP 阶段建议采用“模块化单体 + 独立 AI Worker + 独立 EMQX”的部署形态，先降低联调复杂度；当设备量和音频并发增长后，再将 AI、提醒、消息、OTA 拆分为独立服务。 |

5. 数据库设计

5.1 设计原则

以 MongoDB 为主库，贴合用户画像、设备状态、对话、消息和内容等半结构化数据；需要严格财务对账时可增加关系型订单台账。

用户、设备、亲友关系、订阅、订单、OTA 包为强一致主数据；设备状态、在线状态和限流使用 Redis 缓存。

对话原文、音频、声音样本、未成年人相关数据必须设置保存周期、删除入口和访问审计。

所有集合统一字段：_id、createdAt、updatedAt、deletedAt、version、tenant/project 可选字段。

5.2 集合总览

| 集合 | 用途 | 核心字段 | 关键索引 |
| users | 用户主档 | 微信 openid/unionid、手机号、昵称、生日、偏好、订阅状态 | openid 唯一；phone；createdAt |
| devices | 设备主档 | deviceId、sn、model、firmware、hardwareRev、激活状态、证书指纹 | deviceId 唯一；sn 唯一 |
| device_bindings | 设备-用户绑定 | userId、deviceId、role、bindStatus、mode、persona、绑定时间 | userId+deviceId 唯一；deviceId |
| device_status | 设备状态快照 | 在线状态、电量、WiFi、温度、最后心跳、当前模式/人格 | deviceId 唯一；lastSeenAt |
| conversations | 会话主表 | userId、deviceId、mode、persona、开始/结束、摘要、风险标记 | userId+createdAt；deviceId+createdAt |
| conversation_turns | 会话明细 | conversationId、role、文本、音频 URL、ASR 置信度、token、延迟 | conversationId+seq；createdAt TTL 可选 |
| user_memories | 成人长期记忆 | userId、memoryType、key、value、confidence、source、lastConfirmedAt | userId+key；confidence |
| reminders | 提醒配置 | userId、deviceId、类型、时间、周期、内容、声音来源、情绪策略 | userId+enabled；nextTriggerAt |
| reminder_events | 提醒执行记录 | reminderId、计划时间、实际推送、确认状态、生气值变化 | reminderId+scheduledAt；status |
| relationships | 亲友关系 | ownerUserId、targetUserId、relationType、状态、昵称、权限 | owner+target 唯一；relationType |
| messages | 跨设备留言 | senderId、receiverId、relationId、text/audio、readAt、deliveryStatus | receiverId+createdAt；relationId+createdAt |
| custom_qas | 自定义问答 | parentUserId、deviceId、question、answerText/audio、priority、enabled | deviceId+questionHash；parentUserId |
| custom_contents | 自定义故事/儿歌 | owner、deviceId、title、audioUrl、duration、审核状态、优先级 | deviceId+title；auditStatus |
| voice_clones | 克隆音色 | userId、providerJobId、sampleUrl、status、voiceId、consentRecord | userId+status；providerJobId |
| tasks / task_progress | 任务与进度 | 任务配置、周期、奖励、用户完成记录、领取状态 | userId+taskId+period |
| subscriptions / orders | 订阅与订单 | 套餐、额度、有效期、微信支付交易号、续费状态 | userId+status；orderNo 唯一 |
| ota_packages / ota_jobs | OTA 包与任务 | 固件/表情/内容包版本、COS URL、hash、目标设备、进度 | version；deviceId+status |
| audit_logs | 审计与风控日志 | 操作者、操作、对象、IP、结果、风险级别 | actorId+createdAt；resourceId |

5.3 核心集合字段建议

| users { / _id, unionId, openId, phone, nickname, avatarUrl, / birthDate, gender, defaultMode: 'child'\|'adult', defaultPersona, / subscriptionLevel, consentFlags, createdAt, updatedAt / } / devices { / _id, deviceId, sn, model, hardwareRev, firmwareVersion, / certificateFingerprint, activatedAt, status, productionBatch, / createdAt, updatedAt / } / device_status { / deviceId, online, lastSeenAt, batteryPercent, charging, / wifiRssi, temperature, currentMode, currentPersona, / firmwareVersion, ip, mqttClientId / } / conversations { / _id, userId, deviceId, mode, persona, startedAt, endedAt, / summary, safetyLabels, tokenUsage, latencyStats / } / user_memories { / userId, memoryType, key, value, confidence, / sourceConversationId, privacyLevel, lastConfirmedAt, expiresAt / } |

5.4 索引与容量控制

| 领域 | 索引建议 | 说明 |
| 用户/设备 | users.openId unique；devices.deviceId unique；device_bindings(userId, deviceId) unique | 保证登录、设备绑定和解绑安全。 |
| 消息/会话 | messages(receiverId, createdAt desc)；conversation_turns(conversationId, seq) | 支持消息列表、已读回执和对话回溯。 |
| 提醒 | reminders(nextTriggerAt, enabled)；reminder_events(reminderId, scheduledAt) | 支持定时扫描、补偿和重复执行幂等。 |
| 内容 | custom_qas(deviceId, questionHash)；custom_contents(deviceId, title)；voice_clones(providerJobId) | 支持优先匹配、容量限制和训练回调。 |
| OTA | ota_packages(type, version)；ota_jobs(deviceId, status) | 支持版本检查和升级进度追踪。 |
| TTL/归档 | 临时验证码、短期设备 Token、调试日志可设置 TTL；长期会话按用户授权保留。 | 降低存储成本和隐私风险。 |

6. 安全、合规与内容风控

| 类别 | 方案 |
| 用户鉴权 | 微信登录换取 openid/session，后端签发短期 JWT + Refresh Token；敏感操作二次校验。 |
| 设备鉴权 | 设备出厂 SN + deviceSecret/证书；激活后颁发短期 deviceToken；MQTT 使用 TLS，按 deviceId 设 ACL。 |
| 传输安全 | 小程序与云端全量 HTTPS/WSS；设备 MQTTS/WSS；严禁明文传输 WiFi 密码、语音样本和支付信息。 |
| 内容安全 | 幼儿内容库人工审核；成人 LLM 输出增加安全过滤；跨设备语音留言上传后先审核再投递。 |
| 隐私保护 | 幼儿版默认不建立长期画像；成人版记忆需授权；提供导出/删除机制；音频样本和克隆音色可撤销。 |
| 审计追踪 | 后台、支付、订阅、声音克隆、内容审核、OTA 发布等操作记录 audit_logs。 |

7. 性能与验收映射

| 验收方向 | 目标 | 技术措施 |
| 语音响应 | 端到端响应 ≤1.5 秒为目标；唤醒成功率幼儿 ≥90%、成人 ≥95% | 流式 ASR/TTS、常见问答缓存、LLM 超时兜底、链路 Trace。 |
| 跨设备留言 | 接收设备 3 秒内语音提醒 | 在线状态 Redis 缓存、MQTT QoS 1、离线补偿队列。 |
| 配网 | 小程序蓝牙配网 60 秒内成功 | BLE 状态机、失败重试、配网日志、WiFi 错误码细分。 |
| OTA | 固件/表情/内容库远程升级；失败回滚 | 包 hash、版本兼容、分批灰度、回滚标志和进度上报。 |
| 硬件基础 | 触摸延迟 ≤50ms；胸口 37±1℃；待机功耗 ≤100mW；连续音频 ≥6 小时 | 固件驱动调优、温控 PID/阈值、低功耗模式和硬件自检。 |
| 稳定性 | 连续运行 72 小时无死机、无内存泄漏；自定义问答 1000 条响应 ≤2 秒 | 压测脚本、堆内存监控、索引优化、缓存命中率监控。 |

8. 风险与待确认事项

| 事项 | 现状/风险 | 建议处理 |
| 电池容量口径不一致 | 功能清单摘要为 1000mAh，硬件原理图为 2000mAh。 | 需求冻结前由硬件负责人确认 BOM 版本；续航验收按最终 BOM 重算。 |
| GPIO 复用风险 | OLED I2C 建议独立配置，避免与触摸 GPIO17/18 中断冲突。 | 硬件/固件联审引脚表；如 PCB 已定版，则固件做互斥扫描和抗干扰测试。 |
| 语音链路延迟 | ASR+LLM+TTS 串行可能难以稳定满足 1.5 秒响应。 | 采用流式 ASR、首句快速回复、TTS 流式播报、缓存常见问答。 |
| 未成年人隐私 | 幼儿版要求不记录个人数据，但家长控制又涉及最近 20 条对话。 | 默认仅保存脱敏文本且可关闭；明确家长授权、保存周期和删除入口。 |
| 声音克隆合规 | 需采集样本、生成克隆音色并绑定人格。 | 增加授权确认、样本水印/用途声明、删除机制和供应商合规审查。 |
