# qingxier

## V1.1 新需求

1. 支持闽南语、吴语、粤语、四川话、陕西话、河南话、上海话等多种方言识别与合成。用户无需手动切换，设备自动检测语种，实现“用家乡话跟庆喜儿聊天”的体验。合成音色使用克隆声音，确保方言输出音色统一、自然。
2. 唤醒词由“庆喜儿”改为“阿西”。

## 服务器实现

`server/` 已提供本次新需求对应的可运行 FastAPI 服务，不再只是参考契约：

- REST、WebSocket、Trace ID 和统一错误响应；
- 用户、设备、管理员鉴权及生产 HS256 JWT；
- 设备语音配置和乐观锁；
- “阿西”语音会话及 WakeNet9 模型状态；
- 八类方言路由、置信度阈值、会话滞回与自动兜底；
- CosyVoice 克隆音色主路由、泛吴语显式降级和 Qwen 系统音色兜底；
- DashScope Fun-ASR-Realtime、TTS、OpenAI 兼容 LLM、MongoDB 与 MQTT 适配器；
- 唤醒词模型包校验、幂等发布、重复版本保护和审计；
- Docker、Compose、Swagger/OpenAPI、CI 和完整测试证据。

范围说明：本次实现聚焦 V1.1 多方言、克隆音色和“阿西”唤醒词涉及的服务器能力。微信支付、商城、订单及运营后台页面等既有业务域不在本轮新增需求代码范围内。

## 自动化结果

| 测试集 | 结果 |
|---|---:|
| 原 V1.1 契约与小程序状态流测试 | 56/56 PASS |
| 服务器实现单元、接口、WebSocket 与适配器测试 | 68/68 PASS |
| 服务器代码行覆盖率 | 83.18% |
| Uvicorn 真实进程 HTTP 冒烟 | 3/3 PASS |
| 合计自动化用例 | 124/124 PASS |

服务器测试命令：

```bash
cd server
pip install -r requirements-dev.txt
pytest -q \
  --junitxml=../reports/server-junit.xml \
  --cov=qingxier_server \
  --cov-report=term-missing \
  --cov-report=xml:../reports/server-coverage.xml \
  --cov-fail-under=80
```

本地启动：

```bash
cd server
APP_ENV=test uvicorn qingxier_server.main:app --host 0.0.0.0 --port 8000
```

详见：

- `server/README.md`
- `reports/服务器代码实施测试报告_V1.2.md`
- `reports/server-test-summary.json`
- `reports/server-junit.xml`
- CI Artifact 中每次重新生成的 `server-coverage.xml`
- `reports/server-test-console.txt`
- `reports/server-smoke-console.txt`

## 方案与接口文档

- `docs/庆喜儿AI玩具_技术方案设计_V1.1.md`
- `docs/庆喜儿AI玩具_接口变更说明_V1.1.md`

## 既有专项报告

- `reports/服务器功能测试报告_V1.1.md`
- `reports/服务器接口测试报告_V1.1.md`
- `reports/小程序功能测试报告_V1.1.md`
- `reports/小程序接口测试报告_V1.1.md`
- `reports/庆喜儿项目综合测试报告_V1.1.md`

> 当前代码测试结论为 PASS。真实 DashScope 音频质量、克隆相似度、MongoDB 副本集、EMQX TLS/ACL、生产 WSS 并发、72 小时稳定性、设备真机和安全渗透仍需正式账号、语料、设备及部署环境，不能用 Mock/协议测试替代生产验收。
