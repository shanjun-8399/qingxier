# 庆喜儿运营管理后台

Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus，覆盖经营看板、用户、设备、订单、内容库、内容审核、OTA、唤醒词、表情包、声音克隆、语音观测和审计日志。

```bash
npm run typecheck --workspace @qingxier/admin
npm run test:ci --workspace @qingxier/admin
npm run build --workspace @qingxier/admin
```

构建输出为 `admin/dist`。生产环境需由反向代理提供 `/api`，并接入正式管理员身份源、MFA、WAF/IP 白名单及审计。
