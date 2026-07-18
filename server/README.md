# 庆喜儿 NestJS 服务器

最终服务器采用 **Node.js 20 + NestJS 11 + TypeScript**，不再以 Python 服务作为主实现。

## 结构

- `src/api`：107 个 REST 路由、DTO、WebSocket 网关；
- `src/application`：业务与语音编排；
- `src/infrastructure`：内存/MongoDB、内存/MQTT、Mock/DashScope AI 适配；
- `src/common`：鉴权、MFA、Trace、统一响应和异常；
- `test`：Jest、Supertest 和 WebSocket 测试。

## 启动

```bash
cp server/.env.example server/.env
npm run build --workspace @qingxier/contracts
npm run build --workspace @qingxier/server
node server/dist/main.js
```

开发：

```bash
npm run start:dev --workspace @qingxier/server
```

Swagger：`/docs`；健康检查：`/health`；就绪检查：`/ready`。

## 生产部署

```bash
docker compose -f server/docker-compose.yml up --build -d
```

必须替换 JWT、DashScope、LLM、MongoDB、MQTT 和对象存储配置，并在网关层启用 HTTPS/WSS、可信 MFA、限流和审计。

## 测试

```bash
npm run typecheck --workspace @qingxier/server
npm run test:ci --workspace @qingxier/server
npm run build --workspace @qingxier/server
```

当前：76/76 PASS，行覆盖率 98.23%，独立进程冒烟 7/7 PASS。
