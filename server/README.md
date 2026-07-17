# 庆喜儿语音服务器 1.2.0

本工程将 V1.1 技术方案中的服务器侧新增能力实现为可运行的 FastAPI 服务，覆盖自动方言路由、统一克隆音色 TTS、“阿西”唤醒词状态与模型包发布，以及兼容的文字对话入口。

> 范围说明：本目录完整实现本次多方言与“阿西”唤醒词需求涉及的服务器能力。微信支付、商城、订单和运营后台页面等既有业务域不在本次新增需求代码范围内。

## 已实现范围

- 标准 REST 响应、Trace ID、参数白名单和统一错误码；
- 开发静态 Token 与生产 HS256 JWT，设备/用户/管理员权限隔离，管理员 MFA 门槛；
- 语音能力查询、设备语音配置查询/修改、乐观锁版本冲突；
- 本地“阿西”唤醒后的语音会话创建及固件版本观测；
- 八类方言枚举、高/中/低置信度路由、会话滞回及低置信度兜底；
- CosyVoice 克隆音色主路由、泛吴语映射上海话、Qwen 系统音色降级；
- `/ws/v1/voice` 会话、ASR 音频/文本结果、TTS、ping/pong、断连清理和协议错误；
- Fun-ASR-Realtime DashScope SDK 适配器及文本特征方言分类兜底；
- 唤醒词包校验、幂等键、重复版本保护、审计记录；
- MongoDB 和内存仓储适配、MQTT 和内存事件发布适配；
- OpenAI 兼容 LLM 适配，可连接 DeepSeek 等 Chat Completions 服务；
- Docker、Compose、健康检查、OpenAPI 与 GitHub Actions。

## 主要接口

| 方法 | 路径 | 鉴权 |
|---|---|---|
| GET | `/health`、`/ready` | 无 |
| GET | `/api/v1/speech/capabilities` | Bearer 用户 Token |
| GET/PATCH | `/api/v1/devices/{deviceId}/speech-profile` | Bearer 用户 Token |
| GET | `/api/v1/devices/{deviceId}/wake-word/status` | Bearer 用户 Token |
| POST | `/api/v1/speech/sessions` | `X-Device-Token` |
| POST | `/api/v1/speech/route` | `X-Device-Token` |
| POST | `/api/v1/speech/tts` | `X-Device-Token` |
| WS | `/ws/v1/voice?sessionId=...` | `X-Device-Token` 或 `token` 查询参数 |
| POST | `/api/v1/dialogs/text` | Bearer 用户 Token |
| POST | `/api/v1/admin/wake-word-packages` | 管理员 Token + MFA |

Swagger：启动后访问 `/docs`；OpenAPI JSON：`/openapi.json`。

## 本地运行

```bash
cd server
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
APP_ENV=test uvicorn qingxier_server.main:app --reload
```

开发/测试环境内置以下 Token：

```text
Bearer test-user-token
Bearer test-admin-token
X-Device-Token: test-device-token
```

这些 Token 在 `APP_ENV=prod` 时不生效；生产必须配置 `JWT_SECRET` 并签发 HS256 JWT。管理员请求头中的 `X-MFA-Verified` 必须由可信认证网关写入，不能直接信任公网客户端自报。

## 测试

```bash
cd server
pytest -q \
  --junitxml=../reports/server-junit.xml \
  --cov=qingxier_server \
  --cov-report=term-missing \
  --cov-report=xml:../reports/server-coverage.xml \
  --cov-fail-under=80
python scripts/generate_test_summary.py \
  --junit ../reports/server-junit.xml \
  --coverage ../reports/server-coverage.xml \
  --output ../reports/server-test-summary.json
```

当前基线：**68 项测试全部通过，行覆盖率 83.18%**。此外，真实 Uvicorn 进程级冒烟测试覆盖健康检查、能力查询和语音会话创建，3/3 通过。

测试包含 REST、WebSocket、生产 JWT、并发版本冲突、方言滞回、TTS 主备路由、管理员幂等、配置启动保护、DashScope HTTP 请求结构、Fun-ASR SDK 回调适配和 OpenAI 兼容 LLM 请求结构。

## 生产配置

复制 `.env.example` 为 `.env`，替换所有密钥、Workspace 专属端点和域名后执行：

```bash
docker compose up --build -d
```

北京地域默认使用 `cosyvoice-v3.5-flash`；新加坡地域默认切换为 `cosyvoice-v3-flash`。模型和服务 URL 均可由环境变量覆盖。克隆音色不可用时，服务尝试 `qwen3-tts-flash` 系统音色，并在响应中显式标记 `degraded` 和 `fallbackReason`。

生产部署建议使用阿里云百炼 Workspace 专属域名；旧公共域名仅作为兼容默认值。MongoDB 中的用户、设备绑定、语音配置和唤醒状态应由账号/设备服务或部署初始化流程写入，本语音服务不自动创建生产业务数据。

## 尚需真实环境完成的测试

代码级、HTTP 进程级、协议级和供应商请求结构测试已完成；真实 DashScope 方言音频识别质量、克隆相似度、EMQX TLS/ACL、MongoDB 副本集故障切换、WSS 并发、压力容量、72 小时稳定性及生产安全渗透测试仍需使用正式账号、语料、设备和部署环境执行。
