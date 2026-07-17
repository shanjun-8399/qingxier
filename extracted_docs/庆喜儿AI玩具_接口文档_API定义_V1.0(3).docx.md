# 庆喜儿AI玩具_接口文档_API定义_V1.0(3).docx

庆喜儿 AI 情感陪伴玩具

接口文档——API 定义

REST API · WebSocket 语音流 · MQTT Topic · Webhook

| 文档版本 | V1.0 |
| 编制日期 | 2026-06-14 |
| 适用范围 | 后端服务、微信小程序、设备固件联调、云端部署与验收准备 |
| 依据资料 | 产品功能清单、AI 玩具项目功能清单、硬件原理图设计说明、验收测试标准 |
| 状态 | 内部评审稿；待产品、硬件、云端和甲方运维确认 |

| 说明：本文档根据现有项目资料进行工程化拆解，重点固化可研发、可联调、可验收的技术口径。涉及第三方服务的账号、实名/资质、价格和政策要求，以甲方最终开通平台规则为准。 |

目录

1. 1. 接口总则

2. 2. 公共数据结构

3. 3. REST API 总览

4. 4. 核心接口定义

5. 5. WebSocket 语音流协议

6. 6. MQTT Topic 与 Payload

7. 7. Webhook 与回调

8. 8. 版本管理与验收口径

1. 接口总则

| 项目 | 定义 |
| 基础域名 | https://api.{主域名}/api/v1；生产域名由甲方最终提供。 |
| 认证方式 | 小程序用户使用 Bearer JWT；设备使用 deviceToken/HMAC；管理后台使用 RBAC + MFA。 |
| 内容类型 | application/json；音频文件上传使用 COS 预签名 URL；语音实时链路使用 WebSocket。 |
| 幂等 | 创建订单、发送留言、OTA 上报等接口支持 Idempotency-Key。 |
| 追踪 | 所有请求携带 X-Request-Id；云端返回 traceId，日志、MQTT、AI 链路统一关联。 |
| 时间 | 统一 ISO-8601 UTC 字符串；小程序展示时转换为用户时区。 |

1.1 标准响应格式

| { / "code": 0, / "message": "OK", / "data": {}, / "traceId": "trc_20260614_xxxxxx" / } |

1.2 分页格式

| GET /api/v1/messages?cursor=xxx&limit=20 / { / "items": [], / "nextCursor": "eyJjcmVhdGVkQXQiOi...", / "hasMore": true / } |

1.3 错误码

| code | name | 说明 |
| 0 | OK | 请求成功 |
| 400001 | INVALID_ARGUMENT | 参数错误或字段校验失败 |
| 401001 | UNAUTHORIZED | 未登录、Token 过期或签名错误 |
| 403001 | FORBIDDEN | 无权限访问资源或设备未绑定 |
| 404001 | NOT_FOUND | 资源不存在 |
| 409001 | CONFLICT | 重复绑定、重复订单或状态冲突 |
| 429001 | RATE_LIMITED | 请求过于频繁 |
| 500001 | INTERNAL_ERROR | 服务器内部错误 |
| 503001 | AI_PROVIDER_UNAVAILABLE | AI/ASR/TTS 第三方服务不可用 |
| 600001 | DEVICE_OFFLINE | 设备离线，指令已入队或发送失败 |
| 700001 | SUBSCRIPTION_LIMIT | 套餐容量不足或订阅已过期 |
| 800001 | CONTENT_REJECTED | 内容审核不通过 |

2. 公共数据结构

| 字段 | 取值 | 说明 |
| mode | child, adult | 幼儿版/成人版。幼儿版严格走内容安全和家长控制。 |
| persona | mom, dad, lover, teacher, bestie | 妈妈、爸爸、恋人、老师、闺蜜。 |
| relationType | couple, parent_child, bestie | 情侣、亲子、闺蜜。 |
| messageType | text, audio | 文字或语音留言。 |
| reminderType | water, medicine, period, sleep, custom | 喝水、吃药、生理期、作息、自定义。 |
| commandType | heat, vibrate, heartbeat, servo_breath, expression, led, volume, sleep_mode | 设备远程控制指令类型。 |
| otaPackageType | firmware, expression_pack, kids_content, wake_words | 固件、表情、幼儿内容库、语音词库。 |
| subscriptionLevel | free, basic, premium | 免费、基础订阅、高级订阅。 |

3. REST API 总览

| 模块 | 方法 | 路径 | 说明 |
| 认证与用户 | POST | /api/v1/auth/wechat-login | 小程序微信登录，返回 accessToken/refreshToken |
| 认证与用户 | POST | /api/v1/auth/phone-bind | 绑定手机号 |
| 认证与用户 | GET | /api/v1/users/me | 获取当前用户资料、订阅、默认模式/人格 |
| 认证与用户 | PATCH | /api/v1/users/me | 更新昵称、头像、生日、默认模式/人格 |
| 设备管理 | POST | /api/v1/devices/bind-ticket | 生成设备绑定票据，供 BLE 配网写入设备 |
| 设备管理 | POST | /api/v1/devices/bind | 设备与用户绑定确认 |
| 设备管理 | GET | /api/v1/devices | 获取用户绑定设备列表 |
| 设备管理 | GET | /api/v1/devices/{deviceId}/status | 查询在线、电量、固件、模式、人格 |
| 设备管理 | PATCH | /api/v1/devices/{deviceId} | 修改设备名称、默认模式、默认人格 |
| 设备管理 | POST | /api/v1/devices/{deviceId}/commands | 下发加热、震动、心跳、灯光、表情等控制命令 |
| AI 对话 | POST | /api/v1/dialogs/text | 小程序文字对话或调试入口 |
| AI 对话 | GET | /api/v1/dialogs | 查询会话列表 |
| AI 对话 | GET | /api/v1/dialogs/{conversationId}/turns | 查询对话明细 |
| 提醒 | POST | /api/v1/reminders | 创建自定义提醒 |
| 提醒 | GET | /api/v1/reminders | 提醒列表 |
| 提醒 | PATCH | /api/v1/reminders/{reminderId} | 编辑提醒 |
| 提醒 | DELETE | /api/v1/reminders/{reminderId} | 删除提醒 |
| 提醒 | POST | /api/v1/reminders/{reminderId}/confirm | 设备或小程序确认提醒完成 |
| 亲友与消息 | POST | /api/v1/relations/invitations | 发起亲友邀请 |
| 亲友与消息 | POST | /api/v1/relations/invitations/{id}/accept | 接受邀请 |
| 亲友与消息 | DELETE | /api/v1/relations/{relationId} | 解除关系 |
| 亲友与消息 | POST | /api/v1/messages | 发送文字/语音留言 |
| 亲友与消息 | GET | /api/v1/messages | 查询留言历史 |
| 亲友与消息 | POST | /api/v1/messages/{messageId}/read | 标记已读 |
| 幼儿内容 | GET | /api/v1/kids/content/categories | 内容分类与内置库列表 |
| 幼儿内容 | POST | /api/v1/custom-qas | 创建自定义问答 |
| 幼儿内容 | GET | /api/v1/custom-qas | 自定义问答列表 |
| 幼儿内容 | DELETE | /api/v1/custom-qas/{qaId} | 删除自定义问答 |
| 幼儿内容 | POST | /api/v1/custom-contents/upload-token | 获取自定义故事/儿歌上传凭证 |
| 家长控制 | GET | /api/v1/parent-controls/{deviceId} | 查询时段锁、内容开关、音量限制 |
| 家长控制 | PATCH | /api/v1/parent-controls/{deviceId} | 更新家长控制配置 |
| 家长控制 | GET | /api/v1/parent-controls/{deviceId}/dialog-records | 查看最近 20 条对话文本 |
| 家长控制 | POST | /api/v1/parent-controls/{deviceId}/sleep-mode | 远程哄睡 |
| 声音与人格 | GET | /api/v1/personas | 人格列表和默认音色 |
| 声音与人格 | POST | /api/v1/voice-clones/upload-token | 获取声音样本上传凭证 |
| 声音与人格 | POST | /api/v1/voice-clones | 创建声音克隆训练任务 |
| 声音与人格 | PATCH | /api/v1/personas/{persona}/voice | 绑定/解绑人格音色 |
| 任务奖励 | GET | /api/v1/tasks/today | 每日/双人任务列表 |
| 任务奖励 | POST | /api/v1/tasks/{taskId}/claim | 领取奖励 |
| 订阅支付 | GET | /api/v1/subscription/plans | 套餐列表和容量 |
| 订阅支付 | POST | /api/v1/orders | 创建订阅订单 |
| 订阅支付 | POST | /api/v1/payments/wechat/notify | 微信支付回调 |
| OTA 与资源 | GET | /api/v1/devices/{deviceId}/ota/check | 设备或小程序检查可用升级 |
| OTA 与资源 | POST | /api/v1/device/ota/report | 设备上报升级进度 |
| 运营后台 | POST | /api/v1/admin/ota-packages | 上传/登记 OTA 包 |
| 运营后台 | POST | /api/v1/admin/expression-packs | 上传表情包 |
| 运营后台 | POST | /api/v1/admin/content-library | 维护幼儿内容库 |

4. 核心接口定义

4.1 微信登录

| 项目 | 内容 |
| URL | POST /api/v1/auth/wechat-login |
| 认证 | 无需 Bearer Token；需校验小程序 code。 |
| 请求字段 | code: 微信登录 code；encryptedData/iv 可选用于手机号授权；deviceBindTicket 可选。 |
| 响应字段 | accessToken、refreshToken、expiresIn、user、needBindPhone。 |

| POST /api/v1/auth/wechat-login / { / "code": "wx_code", / "deviceBindTicket": "bind_ticket_optional" / } / 200 OK / { / "code": 0, / "data": { / "accessToken": "jwt_xxx", / "refreshToken": "rft_xxx", / "expiresIn": 7200, / "user": {"userId": "u_1", "nickname": "小庆"} / } / } |

4.2 设备绑定票据与绑定确认

| 接口 | 请求字段 | 响应字段 | 备注 |
| POST /api/v1/devices/bind-ticket | deviceSn、model、blePublicKey | ticket、expiresAt、cloudMqttHost、cloudWsHost | 小程序通过 BLE 写入设备；ticket 短期有效。 |
| POST /api/v1/devices/bind | ticket、deviceId、bindProof | device、binding、mqttUsername | 设备联网后云端完成绑定确认。 |
| DELETE /api/v1/devices/{deviceId}/binding | reason | success | 解绑后撤销 MQTT ACL 和用户控制权限。 |

4.3 设备状态与远程控制

| 接口 | 说明 | 关键字段 |
| GET /api/v1/devices/{deviceId}/status | 小程序首页展示电量、在线、固件、模式、人格 | online、batteryPercent、charging、firmwareVersion、currentMode、currentPersona、lastSeenAt |
| POST /api/v1/devices/{deviceId}/commands | 下发体感/表情/灯光/音量/哄睡等命令 | commandType、payload、expireInSeconds、needAck |
| PATCH /api/v1/devices/{deviceId} | 修改设备名称、默认模式、默认人格 | name、defaultMode、defaultPersona |

| POST /api/v1/devices/d_001/commands / { / "commandType": "heat", / "payload": {"enabled": true, "targetTemp": 37}, / "expireInSeconds": 30, / "needAck": true / } / 200 OK / {"code": 0, "data": {"commandId": "cmd_001", "status": "queued"}} |

4.4 AI 对话接口

| 接口 | 使用方 | 说明 |
| POST /api/v1/dialogs/text | 小程序/后台调试 | 提交文本，返回回复文本、音频 URL、表情建议和记忆写入建议。 |
| GET /api/v1/dialogs | 小程序/后台 | 按用户、设备、模式查询会话列表。幼儿版按家长授权展示最近 20 条。 |
| GET /api/v1/dialogs/{conversationId}/turns | 小程序/后台 | 查看会话明细；支持脱敏和风险标签。 |
| WSS /ws/v1/voice | 设备 | 实时语音主链路，详见第 5 节。 |

| POST /api/v1/dialogs/text / { / "deviceId": "d_001", / "mode": "adult", / "persona": "mom", / "text": "我今天有点累", / "context": {"conversationId": "c_001"} / } / 200 OK / { / "code": 0, / "data": { / "conversationId": "c_001", / "replyText": "辛苦啦，先喝点水，休息一下好吗？", / "audioUrl": "https://cdn.example.com/tts/xxx.mp3", / "expressionId": "care_001", / "memoryActions": [{"type": "upsert", "key": "recent_fatigue"}] / } / } |

4.5 提醒接口

| 接口 | 请求/响应字段 | 规则 |
| POST /api/v1/reminders | deviceId、type、title、content、timeOfDay、repeatRule、audioAssetId、needConfirm | 基础订阅自定义提醒上限 20 条；到期生成 reminder_event。 |
| PATCH /api/v1/reminders/{id} | 同创建字段；enabled 控制开关 | 修改后重算 nextTriggerAt。 |
| POST /api/v1/reminders/{id}/confirm | source=device\|app、eventId、confirmedAt | 完成后清理情绪递进状态并写入和解事件。 |

| POST /api/v1/reminders / { / "deviceId": "d_001", / "type": "custom", / "title": "吃水果", / "content": "宝宝，吃水果啦", / "timeOfDay": "15:30", / "repeatRule": "FREQ=WEEKLY;BYDAY=MO,WE,FR", / "needConfirm": true / } |

4.6 亲友关系与跨设备消息

| 接口 | 说明 | 关键校验 |
| POST /api/v1/relations/invitations | 发起亲友邀请，生成二维码/邀请码 | 邀请人和被邀请人不能为同一账号；relationType 必填。 |
| POST /api/v1/relations/invitations/{id}/accept | 接受亲友邀请 | 过期、已接受、已拒绝不可重复处理。 |
| POST /api/v1/messages | 发送文字/语音留言 | 关系有效；语音需审核；接收设备在线则 3 秒目标投递。 |
| POST /api/v1/messages/{messageId}/read | 设备或小程序上报已读 | 仅接收方设备或用户可标记。 |

| POST /api/v1/messages / { / "relationId": "rel_001", / "receiverDeviceId": "d_002", / "messageType": "text", / "text": "晚安，早点睡" / } / 200 OK / {"code": 0, "data": {"messageId": "msg_001", "deliveryStatus": "delivered"}} |

4.7 幼儿内容、自定义问答与故事

| 接口 | 说明 | 容量/约束 |
| POST /api/v1/custom-qas | 创建自定义问答，可为文字答案或家长录音答案 | 基础订阅 50 组；问题建立 questionHash 用于优先匹配。 |
| POST /api/v1/custom-contents/upload-token | 获取故事/儿歌音频上传凭证 | 单条音频 ≤5 分钟；上传后进入审核/转码。 |
| GET /api/v1/kids/content/categories | 获取内置儿歌、故事、问答分类 | 支持内容分类开关过滤。 |

4.8 家长控制

| PATCH /api/v1/parent-controls/d_001 / { / "allowedTimeRanges": [{"start": "19:00", "end": "20:00"}], / "contentSwitches": {"english_songs": false, "bedtime_stories": true}, / "maxVolume": 60, / "dialogRecordEnabled": true, / "heatingEnabled": false / } |

| 接口 | 说明 |
| GET /api/v1/parent-controls/{deviceId} | 查询时段锁、内容开关、最大音量、对话记录开关、恒温开关。 |
| PATCH /api/v1/parent-controls/{deviceId} | 更新控制项并通过 MQTT 同步到设备。 |
| GET /api/v1/parent-controls/{deviceId}/dialog-records | 返回最近 20 条文本记录；需家长授权且幼儿模式。 |
| POST /api/v1/parent-controls/{deviceId}/sleep-mode | 设备进入哄睡模式：灯光调暗、播放故事、呼吸减缓。 |

4.9 声音克隆与人格音色

| 接口 | 说明 | 关键约束 |
| POST /api/v1/voice-clones/upload-token | 获取 20-30 秒样本上传凭证 | 需用户授权和用途确认。 |
| POST /api/v1/voice-clones | 创建训练任务，返回 jobId | 免费版 1 次；高级订阅按套餐限制。 |
| GET /api/v1/voice-clones/{id} | 查询训练状态 | pending/training/succeeded/failed。 |
| PATCH /api/v1/personas/{persona}/voice | 绑定克隆音色到妈妈/爸爸等人格 | 删除音色后恢复默认。 |

4.10 OTA 与资源接口

| 接口 | 使用方 | 说明 |
| GET /api/v1/devices/{deviceId}/ota/check | 设备/小程序 | 返回适配当前设备的固件、表情包、内容库升级信息。 |
| POST /api/v1/device/ota/report | 设备 | 上报 downloading/installing/succeeded/failed/rolled_back。 |
| POST /api/v1/admin/ota-packages | 运营后台 | 登记包类型、版本、COS URL、sha256、灰度策略。 |

| GET /api/v1/devices/d_001/ota/check?currentFirmware=1.0.0 / 200 OK / { / "code": 0, / "data": { / "hasUpdate": true, / "jobId": "ota_001", / "packageType": "firmware", / "version": "1.0.1", / "url": "https://cos.example.com/fw/1.0.1.bin", / "sha256": "...", / "mandatory": false / } / } |

5. WebSocket 语音流协议

| 项目 | 定义 |
| 连接地址 | wss://voice.{主域名}/ws/v1/voice?deviceId={deviceId}&token={deviceToken} |
| 音频格式 | MVP：16kHz/16bit/mono PCM；量产可改 Opus 降低带宽。 |
| 帧类型 | start、audio、end、asr_result、tts_chunk、action、error、ping/pong。 |
| 超时 | 建立连接 5s；首包 3s；静音 2s 自动 end；AI 总超时可配置。 |
| 安全 | deviceToken 短期有效；服务端校验 MQTT 在线设备和绑定关系。 |

| // start / {"type":"start","traceId":"trc_1","mode":"adult","persona":"mom","audio":{"codec":"pcm","sampleRate":16000}} / // audio: 二进制帧或 base64 分片 / {"type":"audio","seq":1,"payload":"<base64>"} / // end / {"type":"end","reason":"vad_silence"} / // server action / {"type":"action","expressionId":"care_001","commands":[{"type":"vibrate","durationMs":300}]} / // server tts_chunk / {"type":"tts_chunk","seq":1,"audioUrl":"https://cdn.example.com/tts/part1.mp3","isFinal":false} |

6. MQTT Topic 与 Payload

| Topic | 方向 | Payload 关键字段 | 说明 |
| device/{deviceId}/status/up | 设备→云 | online、battery、firmware、wifiRssi、temperature | QoS 1；心跳与状态快照 |
| device/{deviceId}/event/up | 设备→云 | touch、wake、play_done、reminder_confirm、read_message | QoS 1；业务事件 |
| device/{deviceId}/telemetry/up | 设备→云 | heap、rssi、latency、temperature、errorCode | QoS 0/1；诊断数据 |
| device/{deviceId}/command/down | 云→设备 | heat_on/off、vibrate、heartbeat、servo_breath、expression、led | QoS 1；远程控制 |
| device/{deviceId}/message/down | 云→设备 | messageId、senderNick、text/audioUrl、expireAt | QoS 1；亲友留言 |
| device/{deviceId}/reminder/down | 云→设备 | reminderId、content、audioUrl、level、needConfirm | QoS 1；提醒播报 |
| device/{deviceId}/ota/down | 云→设备 | jobId、packageType、version、url、sha256、mandatory | QoS 1；升级指令 |
| device/{deviceId}/ota/progress/up | 设备→云 | jobId、status、progress、errorCode | QoS 1；升级进度 |
| $SYS/brokers/+/clients/{clientId}/connected | EMQX→云 | clientId、username、ip、connectedAt | 订阅系统事件维护在线状态 |

6.1 设备状态上报示例

| Topic: device/d_001/status/up / { / "traceId": "trc_status_001", / "ts": "2026-06-14T10:00:00Z", / "online": true, / "batteryPercent": 86, / "charging": false, / "firmwareVersion": "1.0.0", / "currentMode": "child", / "currentPersona": "mom", / "wifiRssi": -55 / } |

6.2 云端控制下发示例

| Topic: device/d_001/command/down / { / "commandId": "cmd_001", / "traceId": "trc_cmd_001", / "commandType": "expression", / "payload": {"expressionId": "happy_001", "durationMs": 3000}, / "expireAt": "2026-06-14T10:01:00Z", / "needAck": true / } |

7. Webhook 与回调

| 回调 | URL | 说明 | 安全要求 |
| 微信支付通知 | POST /api/v1/payments/wechat/notify | 订单支付成功、退款、续费状态变更 | 验签、幂等、原始报文保存。 |
| 声音克隆训练回调 | POST /api/v1/webhooks/voice-clone/{provider} | 训练成功/失败、voiceId、错误原因 | 供应商签名、IP 白名单可选。 |
| 内容审核回调 | POST /api/v1/webhooks/content-audit/{provider} | 语音/图片/文本审核结果 | 签名校验；不通过内容禁止投递。 |
| COS 事件回调 | POST /api/v1/webhooks/cos/events | 资源上传完成、转码完成可选 | 仅内网或签名访问。 |
