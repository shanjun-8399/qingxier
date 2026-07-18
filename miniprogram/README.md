# 庆喜儿 uni-app 微信小程序

17 个页面覆盖登录、BLE 配网、设备控制、自动方言与“阿西”状态、提醒、亲友、留言、幼儿内容、自定义内容、家长控制、声音克隆、任务奖励、订阅、商城、订单和心情周报。

```bash
npm run typecheck --workspace @qingxier/miniprogram
npm run test:ci --workspace @qingxier/miniprogram
npm run build:mp-weixin --workspace @qingxier/miniprogram
```

将 `miniprogram/dist/build/mp-weixin` 导入微信开发者工具。发布前配置 AppID、合法域名、隐私协议、支付、订阅消息和真机 BLE 权限。
