# 庆喜儿 Node.js 服务器

本目录是按技术方案重新实现的 **Node.js 20 + NestJS + TypeScript** 服务器，替代上一版 FastAPI/Python 参考实现。

## 已实现

- REST API、原生 WebSocket、Trace ID、统一响应及异常处理；
- 用户、设备、管理员鉴权，生产 HS256 JWT 和管理员 MFA；
- 设备语音配置、乐观锁、MQTT 配置同步；
- “阿西” WakeNet9 会话与模型包管理；
- 普通话、闽南语、吴语、粤语、四川话、陕西话、河南话、上海话自动路由；
- 高置信度锁定、中置信度滞回、低置信度自动兜底；
- CosyVoice 克隆音色、Qwen 系统音色降级与泛吴语显式降级；
- Fun-ASR、DashScope TTS、OpenAI 兼容 LLM 适配边界；
- MongoDB、MQTT、Docker Compose、Jest、Supertest 和覆盖率门槛。

## 启动

```bash
npm install
cp .env.example .env
npm run start:dev
```

默认静态测试凭据：

- 用户：`Authorization: Bearer user-token`
- 设备：`X-Device-Token: device-token`
- 管理员：`Authorization: Bearer admin-token` 与 `X-MFA-Verified: true`

生产环境应设置 `AUTH_MODE=jwt` 并使用至少 32 字符的 `JWT_SECRET`。

## 测试

```bash
npm run typecheck
npm run test:ci
npm run build
```

## 真实环境边界

自动化测试验证接口、路由、鉴权、WebSocket、供应商请求结构和主备降级。真实方言音频准确率、克隆音色质量、MongoDB 副本集、EMQX TLS/ACL、容量与 72 小时稳定性仍需正式环境执行。
