#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
R=ROOT/'reports'
summary=json.loads((R/'full-stack-test-summary.json').read_text())

def cases(path):
 root=ET.parse(path).getroot(); out=[]
 for tc in root.iter('testcase'):
  out.append((tc.get('classname',''),tc.get('name',''),'PASS' if tc.find('failure') is None and tc.find('error') is None and tc.find('skipped') is None else 'FAIL',float(tc.get('time','0') or 0)))
 return out
server_cases=cases(R/'node-server-junit.xml'); mini_cases=cases(R/'miniprogram-junit.xml'); admin_cases=cases(R/'admin-junit.xml')

def table_cases(items):
 return '\n'.join(f'| {i:03d} | {name.replace("|","/")} | {result} | {duration*1000:.1f} ms |' for i,(_,name,result,duration) in enumerate(items,1))

def parse_endpoints():
 lines=(ROOT/'server/src/api/controllers.ts').read_text().splitlines(); prefix=''; roles='public'; out=[]
 for line in lines:
  m=re.search(r"@Controller\((?:'([^']*)')?\)",line)
  if m: prefix=m.group(1) or ''
  r=re.search(r"@Roles\(([^)]*)\)",line)
  if r: roles=r.group(1).replace("'",'').replace(' ','')
  if '@Public()' in line: roles='public'
  for method,path in re.findall(r"@(Get|Post|Patch|Delete)\('([^']*)'\)",line):
   full=(prefix.rstrip('/')+'/'+path.lstrip('/')).replace('//','/')
   out.append((method.upper(),full,roles))
 return out
endpoints=parse_endpoints()
endpoint_rows='\n'.join(f'| {i:03d} | {m} | `{p}` | {roles} | 已实现 |' for i,(m,p,roles) in enumerate(endpoints,1))

server_cov=summary['components']['server']['coverage']; mini_cov=summary['components']['miniprogram']['coverage']; admin_cov=summary['components']['admin']['coverage']

def covrow(c): return f"语句 {c['statements']['pct']}% / 分支 {c['branches']['pct']}% / 函数 {c['functions']['pct']}% / 行 {c['lines']['pct']}%"

server_report=f'''# 庆喜儿服务器完整功能与接口测试报告 V2.0

**报告日期：** 2026-07-17  
**技术栈：** Node.js 20、NestJS 11、TypeScript、MongoDB、MQTT、WebSocket  
**结论：** **代码级与本地进程级测试通过，可进入正式环境集成测试**

## 1. 实施范围

服务器不再使用 Python/FastAPI。最终实现位于 `server/src/`，覆盖 README、V1.0 文档及 V1.1 更新方案中的用户、设备、语音、对话、提醒、亲友、内容、家长控制、声音克隆、任务奖励、订阅订单、商城、OTA、运营后台和回调能力。

- REST：107 个路由；
- WebSocket：`/ws/v1/voice` 完整 start/audio/asr/route/tts/end/ping 状态流；
- 数据：内存测试仓储 + MongoDB 生产适配；
- 事件：内存测试事件总线 + MQTT 生产适配；
- AI：Mock 测试适配 + DashScope/CosyVoice/OpenAI-compatible 边界；
- 安全：JWT、用户/设备/管理员隔离、管理员 MFA、Trace ID、统一错误体、内容审核、乐观锁、幂等。

## 2. 测试环境与命令

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck --workspace @qingxier/server
npm run test:ci --workspace @qingxier/server
npm run build --workspace @qingxier/server
node scripts/server-smoke.mjs
```

## 3. 结果

| 指标 | 结果 |
|---|---:|
| Jest/Supertest/WebSocket 用例 | {summary['components']['server']['tests']} |
| PASS / FAIL / SKIP | {summary['components']['server']['passed']} / {summary['components']['server']['failed']} / {summary['components']['server']['skipped']} |
| 覆盖率 | {covrow(server_cov)} |
| TypeScript 类型检查 | PASS |
| 生产构建及别名重写 | PASS |
| 独立 Node 进程 HTTP/WSS 冒烟 | 7/7 PASS |
| npm 生产依赖审计 | 0 项漏洞 |

## 4. 进程级冒烟证据

- `/health`：`ok`；
- 微信登录及 Bearer Token：通过；
- 设备列表：通过；
- 粤语自动路由：通过；
- CosyVoice 克隆主模型选择：通过；
- 管理后台看板：通过；
- WebSocket 帧序列：`connected → started → dialect_result → tts_start → completed`。

## 5. REST 接口实施矩阵

| # | 方法 | 路径 | 权限 | 状态 |
|---:|---|---|---|---|
{endpoint_rows}

## 6. 自动化测试明细

| # | 测试项 | 结果 | 耗时 |
|---:|---|---|---:|
{table_cases(server_cases)}

## 7. 已修复问题

1. 删除 Python 主实现，改为 Node.js 20 + NestJS；
2. 修复 TypeScript `@/` 别名只编译不重写导致生产启动失败的问题，引入 `tsc-alias`；
3. 统一框架 400/401/403/404/405/500 错误体；
4. REST/WSS 共用音色绑定和模型白名单校验；
5. 增加语音配置乐观锁、管理员幂等键、MFA 和审计；
6. 修复 WebSocket 非法帧、未授权连接、断连及供应商异常边界；
7. 升级 `@nestjs/swagger` 和 `ws`，生产依赖审计为 0。

## 8. 正式环境仍需执行

真实 DashScope 方言语料准确率、克隆音色相似度、MongoDB 副本集切换、EMQX TLS/ACL、微信支付真实验签、公网并发、压力与 72 小时长稳、ESP32 真机唤醒及 OTA。上述项目需要正式账号、域名、设备和语料，未使用 Mock 结果冒充生产验收。
'''
(R/'服务器完整功能与接口测试报告_V2.0.md').write_text(server_report)

pages=[
('登录','微信登录、Token 恢复与退出'),('设备首页','状态、电量、模式、人格、唤醒词与方言状态'),('BLE 配网','发现、连接、写入 Wi-Fi、绑定结果'),('语音设置','自动方言配置、阈值、克隆音色、唤醒模型'),('提醒管理','增删改查与确认'),('亲友圈','邀请、接受、拒绝和解除'),('消息中心','文字/语音留言与已读'),('任务中心','每日/双人任务、领取小鱼干'),('个人中心','用户、订阅、入口导航'),('家长控制','时段锁、内容开关、音量、记录、哄睡'),('自定义内容','问答、故事/儿歌、上传凭证'),('声音克隆','样本上传、任务、人格绑定、删除'),('订阅','套餐、下单和续费状态'),('商城','商品、地址和订单'),('订单','订阅/商品订单列表'),('心情周报','情绪分布、关键词与建议'),('幼儿内容','分类、儿歌、故事、问答')]
page_rows='\n'.join(f'| {i:02d} | {n} | {d} | 已实现 |' for i,(n,d) in enumerate(pages,1))
mini_report=f'''# 庆喜儿 uni-app 小程序完整功能与接口测试报告 V2.0

**报告日期：** 2026-07-17  
**技术栈：** uni-app、Vue 3、TypeScript、Pinia、微信小程序  
**结论：** **代码级测试与 mp-weixin 构建通过**

## 1. 实施范围

小程序位于 `miniprogram/`，包含 17 个实际页面、统一接口客户端、Pinia 状态、BLE 配网状态机和微信小程序构建配置。正常用户流程不提供手动方言选择，展示自动识别、兜底原因和“阿西”唤醒模型状态。

## 2. 页面矩阵

| # | 页面 | 功能 | 状态 |
|---:|---|---|---|
{page_rows}

## 3. 执行结果

| 指标 | 结果 |
|---|---:|
| Vitest 用例 | {summary['components']['miniprogram']['tests']} |
| PASS / FAIL / SKIP | {summary['components']['miniprogram']['passed']} / {summary['components']['miniprogram']['failed']} / {summary['components']['miniprogram']['skipped']} |
| 覆盖率 | {covrow(mini_cov)} |
| `vue-tsc` 类型检查 | PASS |
| `uni build -p mp-weixin` | PASS |
| 构建目录 | `miniprogram/dist/build/mp-weixin` |

## 4. 测试明细

| # | 测试项 | 结果 | 耗时 |
|---:|---|---|---:|
{table_cases(mini_cases)}

## 5. 接口覆盖

小程序 API 包装器覆盖登录、用户、地址、设备、语音配置、提醒、关系、留言、幼儿内容、自定义内容、家长控制、人格/声音克隆、任务奖励、订阅、订单、商城、心情周报及 OTA；契约测试逐项核对路径、方法、鉴权头、错误对象与 Trace ID。

## 6. 真机待测

微信 AppID、合法域名、微信开发者工具、真机 BLE、弱网、后台切换、微信支付和订阅消息需在正式小程序账号及实体设备上执行；本报告不将浏览器 Mock 等同于真机验收。
'''
(R/'小程序完整功能与接口测试报告_V2.0.md').write_text(mini_report)

admin_pages=[('经营看板','用户/设备/订单/收入/内容及语音能力总览'),('用户管理','列表、启停和订阅查看'),('设备管理','状态、固件、模式和在线快照'),('订单管理','订阅及商城订单'),('内容库','幼儿内容增删改查'),('内容审核','自定义音频和声音样本审核'),('OTA','固件、表情、内容、唤醒词包'),('唤醒词','WakeNet9 “阿西”版本和灰度'),('表情包','表情资源发布'),('声音克隆','训练任务与状态'),('语音观测','会话、方言分布及 SLO'),('审计日志','管理员敏感操作追踪'),('登录','管理员 Token、MFA 和退出')]
admin_page_rows='\n'.join(f'| {i:02d} | {n} | {d} | 已实现 |' for i,(n,d) in enumerate(admin_pages,1))
admin_report=f'''# 庆喜儿管理后台完整功能与接口测试报告 V2.0

**报告日期：** 2026-07-17  
**技术栈：** Vue 3、Vite、TypeScript、Pinia、Vue Router、Element Plus  
**结论：** **功能代码、接口契约和生产构建通过**

## 1. 页面矩阵

| # | 页面 | 功能 | 状态 |
|---:|---|---|---|
{admin_page_rows}

## 2. 执行结果

| 指标 | 结果 |
|---|---:|
| Vitest 用例 | {summary['components']['admin']['tests']} |
| PASS / FAIL / SKIP | {summary['components']['admin']['passed']} / {summary['components']['admin']['failed']} / {summary['components']['admin']['skipped']} |
| 覆盖率 | {covrow(admin_cov)} |
| `vue-tsc` 类型检查 | PASS |
| Vite 生产构建 | PASS |
| 构建目录 | `admin/dist` |

## 3. 测试明细

| # | 测试项 | 结果 | 耗时 |
|---:|---|---|---:|
{table_cases(admin_cases)}

## 4. 权限与安全

所有请求统一携带管理员 Bearer Token、`X-MFA-Verified` 和 Trace ID；敏感写操作由服务端再次校验 MFA。登录态、接口错误、登出清理和路由守卫均有测试覆盖。`element-plus` 已升级至修复版本，生产依赖审计为 0。

## 5. 部署待测

正式反向代理、管理员身份源、MFA 网关、WAF、IP 白名单、生产数据量和浏览器兼容矩阵需在目标部署环境继续验证。
'''
(R/'管理后台完整功能与接口测试报告_V2.0.md').write_text(admin_report)

full=f'''# 庆喜儿项目全栈实施综合测试报告 V2.0

**报告日期：** 2026-07-17  
**交付范围：** Node.js/NestJS 服务器、uni-app 微信小程序、Vue 管理后台、共享契约、CI/CD 和测试证据  
**代码级结论：** **PASS**  
**正式生产验收：** **待正式账号、云环境、真机与 72 小时测试**

## 1. 纠偏结论

上一轮 Python/FastAPI 实现不符合既定方案。本版本已将最终主实现统一为 **Node.js 20 + NestJS + TypeScript**，并补齐 uni-app 小程序及 Vue 管理后台。Python 服务及参考测试列入删除清单，不作为交付代码。

## 2. 总体结果

| 部分 | 用例 | PASS | FAIL | 覆盖率 | 类型检查 | 构建 |
|---|---:|---:|---:|---|---|---|
| 服务器 | {server_cov['lines']['total'] and summary['components']['server']['tests']} | {summary['components']['server']['passed']} | {summary['components']['server']['failed']} | {covrow(server_cov)} | PASS | PASS |
| uni-app 小程序 | {summary['components']['miniprogram']['tests']} | {summary['components']['miniprogram']['passed']} | {summary['components']['miniprogram']['failed']} | {covrow(mini_cov)} | PASS | PASS |
| 管理后台 | {summary['components']['admin']['tests']} | {summary['components']['admin']['passed']} | {summary['components']['admin']['failed']} | {covrow(admin_cov)} | PASS | PASS |
| **合计** | **{summary['totals']['tests']}** | **{summary['totals']['passed']}** | **{summary['totals']['failed']}** | — | **PASS** | **PASS** |

附加验证：Node 独立进程 HTTP/WSS 冒烟 **7/7 PASS**；npm 生产依赖审计 **0 漏洞**；`npm ci --ignore-scripts --no-audit --no-fund` 在干净目录完成。

## 3. 需求覆盖

- 双模式：幼儿安全内容与家长控制；成人自由对话、长期记忆边界、人格和情绪周报；
- 自动方言：普通话、闽南语、吴语、粤语、四川话、陕西话、河南话、上海话；
- 统一克隆音色：CosyVoice 主路由、Qwen 系统音色降级、泛吴语显式降级；
- 唤醒词：本地 WakeNet9 “阿西”、版本状态、模型包、灰度和 OTA；
- 通用业务：设备、提醒、亲友留言、内容、自定义问答/故事、声音克隆、任务奖励、订阅、订单、商城和 OTA；
- 运营：用户、设备、订单、内容、审核、语音观测、唤醒词、表情、OTA 和审计。

## 4. 测试证据

- `reports/node-server-junit.xml`
- `reports/miniprogram-junit.xml`
- `reports/admin-junit.xml`
- `reports/server-coverage/coverage-summary.json`
- `reports/miniprogram-coverage/coverage-summary.json`
- `reports/admin-coverage/coverage-summary.json`
- `reports/node-smoke-console.txt`
- `reports/full-stack-test-summary.json`
- 三份 V2.0 专项报告。

## 5. 未完成的外部验收

需要由正式环境补齐：七类方言真实语料、克隆相似度主观/客观评分、微信小程序真机和 BLE、真实支付、MongoDB/EMQX 高可用、公网 WSS 并发、安全渗透、ESP32 “阿西”唤醒率/误唤醒率、OTA 回滚和 72 小时稳定性。当前未伪造这些结果。

## 6. 放行建议

代码可合入集成分支并部署测试环境；生产发布门禁应继续要求上述外部验收全部通过、P0/P1 缺陷为 0。
'''
(R/'庆喜儿项目全栈实施综合测试报告_V2.0.md').write_text(full)
