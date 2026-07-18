# PR 标题

完成 Node.js 全栈实现：NestJS 服务器、uni-app 小程序与运营后台

# PR 正文

## 技术栈纠偏

- 删除 Python/FastAPI 主实现及旧参考测试；
- 服务端统一为 Node.js 20 + NestJS + TypeScript；
- 新增 uni-app 微信小程序和 Vue 运营管理后台；
- 三端共享 `packages/contracts`。

## 完整实现

- 服务器：107 个 REST 路由、`/ws/v1/voice`、Mongo/MQTT/AI 适配、JWT/MFA、Docker；
- 小程序：17 个页面，覆盖配网、设备、语音、提醒、亲友、内容、家长控制、声音、任务、订阅、商城和周报；
- 后台：13 个页面，覆盖看板、用户、设备、订单、内容、审核、OTA、唤醒词、声音和审计；
- CI：服务器、小程序和后台三个独立 Job。

## 测试结果

```text
服务器：76/76 PASS，行覆盖率 98.23%，构建 PASS
小程序：16/16 PASS，行覆盖率 100%，mp-weixin 构建 PASS
管理后台：10/10 PASS，行覆盖率 100%，构建 PASS
合计：102/102 PASS
Node 实际进程 HTTP/WSS 冒烟：7/7 PASS
npm 生产依赖审计：0 漏洞
```

## 验收边界

正式 DashScope 方言语料与克隆音色、微信小程序真机/BLE/支付、MongoDB/EMQX 高可用、公网容量、ESP32 唤醒/OTA、安全渗透和 72 小时长稳仍需目标环境执行。
