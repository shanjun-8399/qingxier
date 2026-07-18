# 庆喜儿 AI 玩具全栈项目

本仓库按照 `docs/` 原始产品、接口、部署及验收资料，以及 V1.1 多方言/“阿西”唤醒词方案，完成了可构建、可测试的三端实现。

## 最终技术栈

- **服务器：** Node.js 20、NestJS 11、TypeScript、MongoDB、Redis/队列边界、EMQX MQTT、WebSocket；
- **微信小程序：** uni-app、Vue 3、TypeScript、Pinia，目标平台 `mp-weixin`；
- **运营管理后台：** Vue 3、Vite、TypeScript、Pinia、Vue Router、Element Plus；
- **共享契约：** `packages/contracts`；
- **测试：** Jest/Supertest/ws、Vitest、覆盖率、JUnit、Node 独立进程冒烟和 GitHub Actions。

> 以前的 Python/FastAPI 参考服务不符合既定方案，已由 Node.js/NestJS 主实现替代。提交时应按 `submission/DELETE_PATHS.txt` 删除旧 Python 文件。

## 目录

```text
packages/contracts/   REST 路径、方言/模式/人格枚举和公共响应类型
server/               NestJS 服务器、Mongo/MQTT/AI 适配、Docker
miniprogram/          17 页 uni-app 微信小程序
admin/                13 页运营管理后台
reports/              JUnit、覆盖率、控制台证据和 V2.0 测试报告
docs/                 V1.1 技术方案、接口变更和 V2.0 实施说明
scripts/              服务器进程冒烟、报告生成及验证辅助脚本
```

## 功能范围

服务器实现 107 个 REST 路由和 `/ws/v1/voice`，覆盖：

- 微信登录、用户资料、隐私导出/删除和地址；
- 设备配网绑定、状态、模式/人格、远程控制；
- 自动方言路由、CosyVoice 克隆音色、Qwen 降级、WakeNet9 “阿西”；
- 对话、情绪周报、提醒、亲友关系和留言；
- 幼儿内容、自定义问答/故事、家长控制、声音克隆；
- 任务奖励、订阅订单、微信支付回调、商城；
- OTA、表情包、唤醒词包、内容审核、运营查询和审计。

小程序与后台分别覆盖对应的完整页面流和 API 包装器。

## 安装

```bash
node --version   # >= 20
npm ci --ignore-scripts --no-audit --no-fund
```

## 分部分验证

```bash
# 公共契约
npm run typecheck --workspace @qingxier/contracts
npm run build --workspace @qingxier/contracts

# NestJS 服务器
npm run typecheck --workspace @qingxier/server
npm run test:ci --workspace @qingxier/server
npm run build --workspace @qingxier/server

# uni-app 微信小程序
npm run typecheck --workspace @qingxier/miniprogram
npm run test:ci --workspace @qingxier/miniprogram
npm run build:mp-weixin --workspace @qingxier/miniprogram

# 管理后台
npm run typecheck --workspace @qingxier/admin
npm run test:ci --workspace @qingxier/admin
npm run build --workspace @qingxier/admin
```

服务器进程级冒烟：

```bash
PORT=8765 AUTH_MODE=static STORAGE_BACKEND=memory EVENT_BACKEND=memory PROVIDER_MODE=mock \
  node server/dist/main.js
BASE_URL=http://127.0.0.1:8765 node scripts/server-smoke.mjs
```

## 当前自动化基线

| 部分 | 用例 | 结果 | 覆盖率摘要 | 构建 |
|---|---:|---|---|---|
| 服务器 | 76 | 76 PASS | 行 98.23%，分支 71.96% | PASS |
| 小程序 | 16 | 16 PASS | 行 100%，分支 91.12% | `mp-weixin` PASS |
| 管理后台 | 10 | 10 PASS | 行 100%，分支 85.29% | PASS |
| **总计** | **102** | **102 PASS** | — | **三端 PASS** |

另有独立 Node 进程 HTTP/WSS 冒烟 7/7 PASS；npm 生产依赖审计 0 项。

## 开发凭据

仅限 `AUTH_MODE=static` 的开发/测试环境：

- 用户：`Authorization: Bearer user-token`
- 第二用户：`Authorization: Bearer user-token-2`
- 设备：`X-Device-Token: device-token`
- 管理员：`Authorization: Bearer admin-token`，敏感写操作另带 `X-MFA-Verified: true`

生产环境必须使用 JWT、可信 MFA 网关、TLS、密钥管理和最小权限。

## 构建输出

- 服务器：`server/dist`
- 微信小程序：`miniprogram/dist/build/mp-weixin`
- 管理后台：`admin/dist`

## 报告

- `reports/服务器完整功能与接口测试报告_V2.0.md`
- `reports/小程序完整功能与接口测试报告_V2.0.md`
- `reports/管理后台完整功能与接口测试报告_V2.0.md`
- `reports/庆喜儿项目全栈实施综合测试报告_V2.0.md`
- `reports/full-stack-test-summary.json`

## 验收边界

自动化结果证明代码、接口契约、本地进程和构建产物自洽。真实 DashScope 方言语料和克隆音色、微信 AppID/支付、BLE 实体设备、MongoDB/EMQX 高可用、公网并发、ESP32 唤醒/OTA、安全渗透和 72 小时长稳仍需正式环境执行，不能以 Mock 结果代替。
