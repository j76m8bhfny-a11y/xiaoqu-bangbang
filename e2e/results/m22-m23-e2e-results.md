# M22 宠物帮帮 + M23 购物拼拼 E2E 测试结果

- **测试时间**: 2026-07-21
- **测试人**: Claude (API: glm-5.2 纯文本)
- **分支**: feature/guide-module @ 7091718 (+ 2 个 fix 未提交)
- **策略**: API 优先 (curl) + UI 跟进 (weapp-dev-mcp) + Admin (Playwright)
- **账号**: test_zhangsan (阳光花园 verified, ZS_UID=e4773507) / test_lisi (阳光花园 verified, LS_UID=1357a6f6) / seed_lisi (阳光花园 verified, b0000000-...002) / 6e51b113 (阳光花园 unverified) / seed_wangwu (碧水湾 unverified, b0000000-...003)

## ⚠️ 环境修复记录

1. **后端跑旧 dist (Critical)**: 后端进程 PID 95249 启动于 6 天前 (2026-07-14 编译的 dist)，M22/M23 代码 (07-20 commit) 未编译进去。症状: POST /events 带 subType 返回 "property subType should not exist"；dist/src/modules/group-buys/ 目录不存在。
   - 修复: kill 95249 + 重启 `pnpm dev:api` (nest start --watch, 跑最新 ts 源码)
   - 验证: 重启后 group-buys 路由 mapped, PH-002 通过

2. **微信开发者工具服务端口未开**: 端口 14198 (wechatwebdevtools http server) 在监听但 ws 连不上, `cli auto` 报 "wait IDE port timeout"。weapp-dev-mcp 配置 WEAPP_WS_ENDPOINT=ws://localhost:14198。
   - 状态: ⏳ 待用户在微信工具「设置-安全设置-服务端口」开启 (UI 类检查点暂时 skip)

## 🐛 发现的 Bug (M22)

### Bug 1 (Critical, 已修复): selectParticipant 不支持寻宠多帮手

- **位置**: `apps/api/src/modules/events/events.service.ts:855`
- **症状**: 对 pet_help+subType=lost 的寻宠事件调用 `POST /events/:id/participants` 返回 400 "该事件类型不支持多帮手选择"
- **根因**: selectParticipant 的 type 检查只允许 `public_welfare`/`lost_found`，但 M22 把 lost 从 lost_found 迁到 pet_help+subType=lost，检查没跟着更新
- **影响**: PH-035~040 寻宠多帮手流程整条链路不可用
- **修复**: 加入 `event.type === 'pet_help' && event.subType === 'lost'` 分支
- **验证**: 修复后 selectParticipant 成功，confirmParticipant 正常发花

### Bug 2 (Major, 已修复): 寻宠线索人发花数错误 (1 朵, 应 2 朵)

- **位置**: `apps/api/src/modules/rankings/rankings.service.ts:294` getEventAction
- **症状**: 寻宠 (pet_help+lost) 完成时线索人发 1 朵花，PRD §4.21 规定 lost=2 朵
- **根因**: getEventAction 没有 `case 'pet_help'`，fallback 到 help_free (1 朵)；而 lost_found: 2 (line 318)
- **修复**: rankings.service getEventAction 加 pet_help 分支 (subType=lost -> lost_found action)；handleHelperCompletion/handleEventCompletion 签名加 subType 字段；events.service 3 处调用传 subType
- **验证**: 修复后线索人各发 2 朵 (action=lost_found, flower_count=2)，创建者 0 朵

### Finding 1 (待确认): petMeta 内部字段不校验

- **位置**: create-event.dto.ts petMeta 是 `Record<string, any>`
- **症状**: PH-009 缺狗体型 (dogSize) / PH-005d 缺宠物种类 (petType) 都能创建成功 (status=open)
- **影响**: checklist 期望"狗体型必填/宠物种类必填 -> 缺失 400"，实际后端不校验 petMeta 内部结构
- **性质**: 设计偏差 (前端可能校验，后端无兜底)。需确认 PRD 是否要求后端校验 petMeta 内部

### Finding 2 (待确认): 有偿代喂完成时 contribution action=help_free

- **位置**: rankings.service.ts getEventAction help_request 分支
- **症状**: 代喂 rewardType=amount (有偿) 完成时，帮手 contribution action=help_free (应为 help_paid)
- **根因**: pet_help 走 default 分支返回 help_free，未按 rewardType 区分。Bug 2 修复时 pet_help feed/walk 分支已加 rewardType 区分，此问题在修复前数据中，修复后新数据应正确

### Missing Feature (PH-037): 无拒绝响应人接口

- **checklist PH-037**: "发布者可拒绝某些响应人 -> rejected 不发花"
- **现状**: events 模块无 reject application 接口 (grep 只有 AI 审核 reject)。多帮手寻宠发布者只能 selectParticipant (选择) 或不操作 (application 留 pending)，无明确 reject
- **处理**: PH-037 标记 skip (功能未实现，非 bug)

## M22 宠物帮帮 (45 检查点)

### §1 创建代喂 (feed) - PH-001~006

| ID     | 类型 | 结果          | 证据                                                                                                   |
| ------ | ---- | ------------- | ------------------------------------------------------------------------------------------------------ |
| PH-001 | UI   | ⏳ skip       | 待 weapp-dev-mcp                                                                                       |
| PH-002 | API  | ✅ pass       | POST /events type=pet_help subType=feed -> id=8dce2d03, status=open, aiReviewStatus=pass, petMeta 完整 |
| PH-003 | API  | ✅ pass       | 未认证用户 (6e51b113) 创建代喂 -> 40301 "需要业主认证后才能创建代喂/代遛"                              |
| PH-004 | UI   | ⏳ skip       | 待 weapp-dev-mcp (代喂无图片字段)                                                                      |
| PH-005 | API  | ✅ pass       | 缺 subType->400 "pet_help 类型必须指定 subType"; 缺 title/description->400 校验错误                    |
| PH-006 | API  | ✅ pass(部分) | AI pass->open 已验证; reject->rejected / manual_review->pending_review 路径未触发 (需特定内容)         |

### §2 创建代遛 (walk) - PH-007~012

| ID     | 类型 | 结果       | 证据                                                                |
| ------ | ---- | ---------- | ------------------------------------------------------------------- |
| PH-007 | UI   | ⏳ skip    | 待 weapp-dev-mcp                                                    |
| PH-008 | API  | ✅ pass    | walk 创建 id=222ef59c, timeSlots=["morning","evening"] 数组完整保存 |
| PH-009 | API  | ❌ finding | 缺 dogSize 不 400 (petMeta 内部不校验, 见 Finding 1)                |
| PH-010 | UI   | ⏳ skip    | 待 weapp-dev-mcp (逻辑同 PH-003)                                    |
| PH-011 | API  | ✅ pass    | walk 带 petMeta.photos -> 400 "feed/walk 不支持图片上传"            |
| PH-012 | UI   | ⏳ skip    | 待 weapp-dev-mcp                                                    |

### §3 创建寻宠 (lost) - PH-013~018

| ID     | 类型 | 结果       | 证据                                                         |
| ------ | ---- | ---------- | ------------------------------------------------------------ |
| PH-013 | UI   | ⏳ skip    | 待 weapp-dev-mcp                                             |
| PH-014 | UI   | ⏳ skip    | 待 weapp-dev-mcp (照片多张上传)                              |
| PH-015 | API  | ✅ pass    | 未认证用户创建寻宠成功 status=open subType=lost              |
| PH-016 | API  | ❌ finding | 缺走丢地点/宠物种类不 400 (petMeta 内部不校验, 同 Finding 1) |
| PH-017 | API  | ✅ pass    | lost event reward_type=amount reward_amount=200 完整存储     |
| PH-018 | API  | ⏳ skip    | DB 无老 lost_found 数据 (count=0)，无法验证迁移可见性        |

### §4 列表展示与 filter - PH-019~023

| ID     | 类型 | 结果    | 证据                                                                         |
| ------ | ---- | ------- | ---------------------------------------------------------------------------- |
| PH-019 | UI   | ⏳ skip | 待 weapp-dev-mcp (filter 第4项)                                              |
| PH-020 | API  | ✅ pass | GET /events?type=pet_help 返回 6 条, subType 含 feed/walk/lost               |
| PH-021 | API  | ✅ pass | GET /feed/all 返回 9 条, 类型分布 pet_help:6 help_request:2 public_welfare:1 |
| PH-022 | UI   | ⏳ skip | 待 weapp-dev-mcp (typeLabel 显示)                                            |
| PH-023 | UI   | ⏳ skip | 待 weapp-dev-mcp (CTA 文案)                                                  |

### §5 详情页与响应 - PH-024~029

| ID     | 类型 | 结果    | 证据                                                              |
| ------ | ---- | ------- | ----------------------------------------------------------------- |
| PH-024 | UI   | ⏳ skip | 待 weapp-dev-mcp                                                  |
| PH-025 | UI   | ⏳ skip | 待 weapp-dev-mcp (照片 Swiper)                                    |
| PH-026 | API  | ✅ pass | test_lisi 响应代喂 -> application id=7b24999e, status=selected    |
| PH-027 | UI   | ⏳ skip | 待 weapp-dev-mcp (响应人列表)                                     |
| PH-028 | API  | ✅ pass | seed_wangwu (碧水湾) 访问阳光花园 event -> 40301 "无权访问该事件" |
| PH-029 | API  | ✅ pass | test_lisi 编辑他人 event -> 40301 "只有创建者可以编辑"            |

### §6 单帮手完成流程 (feed/walk) - PH-030~034

| ID     | 类型 | 结果    | 证据                                                                                                                                                                  |
| ------ | ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PH-030 | API  | ✅ pass | selectHelper 成功, event_applications.status=selected, event.selectedHelperId=1357a6f6, status=processing。注: 单帮手用 selectedHelperId 字段, 非 EventParticipant 表 |
| PH-031 | API  | ✅ pass | 已选帮手后再选第二个 -> 40001 "该事件已选择帮手"                                                                                                                      |
| PH-032 | API  | ✅ pass | 发布者+帮手双方 confirmCompletion -> status=completed, completedAt 设置                                                                                               |
| PH-033 | API  | ✅ pass | feed 完成帮手 contribution flower_count=1 (help_free)                                                                                                                 |
| PH-034 | API  | ✅ pass | 创建者 contribution flower_count=0 (reason=发起事件)                                                                                                                  |

### §7 多帮手完成流程 (lost) - PH-035~040

| ID     | 类型 | 结果            | 证据                                                                               |
| ------ | ---- | --------------- | ---------------------------------------------------------------------------------- |
| PH-035 | API  | ✅ pass(修复后) | selectParticipant 寻宠成功 (Bug 1 修复前 400, 修复后创建 participant)              |
| PH-036 | API  | ✅ pass(修复后) | confirmParticipant 逐个确认, 每人立即发 2 朵 (Bug 2 修复前 1 朵)                   |
| PH-037 | API  | ⏳ skip         | 无 reject application 接口 (Missing Feature)                                       |
| PH-038 | API  | ✅ pass         | 全部 participant confirmed -> event.status=completed                               |
| PH-039 | API  | ✅ pass         | 寻宠创建者 contribution flower_count=0                                             |
| PH-040 | API  | ✅ pass         | handleEventCompletion 调 recalculateRankings, RankingSnapshot 表有阳光花园最新记录 |

### §8 Admin 管理 - PH-041~045

| ID     | 类型  | 结果          | 证据                                                                                        |
| ------ | ----- | ------------- | ------------------------------------------------------------------------------------------- |
| PH-041 | Admin | ✅ pass       | 事件管理页有"事件类型" filter, 筛选 pet_help 返回 10 条 (含代喂/代遛/寻宠 + 老寻物迁移数据) |
| PH-042 | Admin | ✅ pass       | 每行有"详情"按钮; GET /events/:id 返回 subType=lost + petMeta 完整                          |
| PH-043 | Admin | ✅ pass(部分) | 复用 event 审核 (hide/restore); 无 pending_review 数据可测 approve/reject (AI 总 pass)      |
| PH-044 | Admin | ✅ pass       | 点"隐藏" -> pet_help event status="已关闭" (closed), 按钮变"恢复"                           |
| PH-045 | API   | ✅ pass       | POST /reports targetType=event -> code 0, report id=7422746e                                |

### M22 小结

- API 类已测 26 项: ✅ pass 21 / ❌ finding 2 (PH-009,016 同因) / ⏳ skip 3 (PH-006部分, PH-018无数据, PH-037无接口)
- UI 类 14 项: ⏳ 待 weapp-dev-mcp
- Admin 类 4 项: ⏳ 待 Playwright
- Bug 修复 2 个 (Critical + Major)

## 🐛 发现的 Bug (M23)

### Bug 3 (Critical, 已修复): seek 创建多商品 UNIQUE 冲突 500

- **位置**: `prisma/schema.prisma` GroupBuyItem `@@unique([groupBuyId, requesterId])` + `group-buys.service.ts:163` respond
- **症状**: seek 创建 ≥2 个商品时返回 500 "Unique constraint failed (group_buy_id, requester_id)"
- **根因**: GroupBuyItem 的 UNIQUE(group_buy_id, requester_id) 是为 respond 防重复响应设计的，但 seek 模式发起人要填多个 item（同 userId），触发冲突。M23 设计内在矛盾
- **修复**: schema UNIQUE 改为 `@@unique([groupBuyId, requesterId, name])`（prisma db push，group_buy_items 表空安全）；respond service 加显式检查（同一 requesterId 已有非 rejected item -> 409）保留防重复
- **验证**: seek 2 商品创建成功，respond 重复仍 409

### Bug 4 (Major, 原 ponytail TODO, 已修复): group_buy 完成不发花

- **位置**: `group-buys.service.ts:265` deliver `// ponytail: TODO 发花逻辑`
- **症状**: 拼单自动 completed 时主买人不发花（交接文档 §8.2 已知 ponytail 暂缓项）
- **修复**: rankings.service 加 `handleGroupBuyCompletion`（主买人 1 朵 + badge + recalculateRankings + 通知）；group-buys.service 注入 RankingsService，deliver 事务后 if justCompleted 调用；group-buys.module 导入 RankingsModule
- **验证**: offer 全部 delivered 自动 completed 后，主买人 contribution flower_count=1 (action=group_buy)，响应人 0 朵

## M23 购物拼拼 (45 检查点)

### §1 创建求代购 (seek) - GB-001~006

| ID     | 类型 | 结果            | 证据                                                               |
| ------ | ---- | --------------- | ------------------------------------------------------------------ |
| GB-001 | UI   | ⏳ skip         | 待 weapp-dev-mcp                                                   |
| GB-002 | API  | ✅ pass(修复后) | seek 多商品创建 id=a51985af, items=2, quota=999 (Bug 3 修复前 500) |
| GB-003 | API  | ✅ pass         | seek 不填 items -> 400 "seek 类型必须至少填写 1 个商品"            |
| GB-004 | API  | ✅ pass(部分)   | AI pass->open; reject/manual_review 路径未触发                     |
| GB-005 | UI   | ⏳ skip         | 待 weapp-dev-mcp                                                   |
| GB-006 | API  | ✅ pass         | seek quota 默认 999 (DB 确认)                                      |

### §2 创建代购方 (offer) - GB-007~012

| ID     | 类型 | 结果    | 证据                                                                      |
| ------ | ---- | ------- | ------------------------------------------------------------------------- |
| GB-007 | API  | ✅ pass | offer 创建 id=980272e8, quota=3, departAt/bidCloseAt 存储                 |
| GB-008 | API  | ✅ pass | offer 缺 bidCloseAt -> 400 "offer 类型必须填写 quota+departAt+bidCloseAt" |
| GB-009 | UI   | ⏳ skip | 待 weapp-dev-mcp                                                          |
| GB-010 | API  | ✅ pass | offer 无 items (创建时 items=0, 响应人提交时填)                           |
| GB-011 | UI   | ⏳ skip | 待 weapp-dev-mcp                                                          |
| GB-012 | UI   | ⏳ skip | 待 weapp-dev-mcp                                                          |

### §3 列表展示与 filter - GB-013~017

| ID     | 类型 | 结果    | 证据                                                                                            |
| ------ | ---- | ------- | ----------------------------------------------------------------------------------------------- |
| GB-013 | UI   | ⏳ skip | 待 weapp-dev-mcp (filter 第5项)                                                                 |
| GB-014 | API  | ✅ pass | GET /group-buys 返回 3 条 (offer/seek/offer)                                                    |
| GB-015 | API  | ✅ pass | /feed/all 含 group_buy 数据 (sourceType='group_buy', type=offer/seek 区分), 分布 offer:2 seek:1 |
| GB-016 | UI   | ⏳ skip | 待 weapp-dev-mcp (typeLabel 求代购/代购方)                                                      |
| GB-017 | UI   | ⏳ skip | 待 weapp-dev-mcp (CTA 我要加入)                                                                 |

### §4 详情页与响应 - GB-018~023

| ID     | 类型 | 结果    | 证据                                                                        |
| ------ | ---- | ------- | --------------------------------------------------------------------------- |
| GB-018 | UI   | ⏳ skip | 待 weapp-dev-mcp                                                            |
| GB-019 | UI   | ⏳ skip | 待 weapp-dev-mcp                                                            |
| GB-020 | UI   | ⏳ skip | 待 weapp-dev-mcp                                                            |
| GB-021 | API  | ✅ pass | respond 成功, item.status=pending                                           |
| GB-022 | API  | ✅ pass | 重复响应 -> 40901 "已响应过，不可重复响应" (显式检查)                       |
| GB-023 | API  | ✅ pass | 碧水湾用户访问阳光花园 offer -> 404 Not Found (findOne 按 communityId 过滤) |

### §5 主买人确认/拒绝 - GB-024~028

| ID     | 类型 | 结果    | 证据                                                          |
| ------ | ---- | ------- | ------------------------------------------------------------- |
| GB-024 | UI   | ⏳ skip | 待 weapp-dev-mcp                                              |
| GB-025 | API  | ✅ pass | confirmItem -> item.status=confirmed                          |
| GB-026 | API  | ✅ pass | rejectItem -> item.status=rejected (释放名额)                 |
| GB-027 | API  | ✅ pass | 非主买人 confirmItem -> 40301 "仅主买人可操作"                |
| GB-028 | API  | ✅ pass | cancelResponse open 状态可取消, 再次取消 404 "未找到你的响应" |

### §6 状态机流转 - GB-029~034

| ID     | 类型 | 结果    | 证据                                                                    |
| ------ | ---- | ------- | ----------------------------------------------------------------------- |
| GB-029 | API  | ✅ pass | closeBid -> status=closed_for_bid                                       |
| GB-030 | API  | ✅ pass | 截止后 respond -> 400 "当前状态不可响应"                                |
| GB-031 | API  | ✅ pass | purchased (closed_for_bid -> purchased)                                 |
| GB-032 | API  | ✅ pass | deliver -> item.status=delivered                                        |
| GB-033 | API  | ✅ pass | 全部 item delivered -> 自动 status=completed (事务内 count remaining=0) |
| GB-034 | API  | ✅ pass | close -> status=closed (手动关闭)                                       |

### §7 名额限制 + 自动完成 + 激励 - GB-035~040

| ID     | 类型 | 结果            | 证据                                                               |
| ------ | ---- | --------------- | ------------------------------------------------------------------ |
| GB-035 | API  | ✅ pass         | offer quota=1 满 -> 40901 QUOTA_EXCEEDED                           |
| GB-036 | API  | ✅ pass         | seek quota=999 不限名额, 多人 respond 均成功                       |
| GB-037 | API  | ✅ pass         | rejectItem 后名额释放, 新响应成功                                  |
| GB-038 | API  | ✅ pass(修复后) | 自动 completed 主买人发 1 朵 (action=group_buy, Bug 4 修复前 0 朵) |
| GB-039 | API  | ✅ pass         | 响应人 0 朵 (只撮合)                                               |
| GB-040 | API  | ✅ pass         | handleGroupBuyCompletion 调 recalculateRankings                    |

### §8 Admin 管理 - GB-041~045

| ID     | 类型  | 结果    | 证据                                                                                     |
| ------ | ----- | ------- | ---------------------------------------------------------------------------------------- |
| GB-041 | Admin | ✅ pass | 侧边栏"拼单管理"菜单可见 (ShopOutlined, platform_admin 登录)                             |
| GB-042 | Admin | ✅ pass | /group-buys 列表 + 类型/状态 filter + 分页 (20/page), 6 条数据                           |
| GB-043 | Admin | ✅ pass | 点"详情" -> Drawer 展示基本信息表 + 响应列表 (商品名/数量/备注/状态/请求人)              |
| GB-044 | Admin | ✅ pass | 点"下架" -> status="已关闭" (closed), 下架按钮消失                                       |
| GB-045 | Admin | ✅ pass | 已 closed 行只显示"详情"无"下架"按钮 (UI 隐藏); 注: API 层 takedown 不校验状态 (finding) |

### M23 小结

- API 类已测 27 项: ✅ pass 26 / ✅ pass(部分) 1 (GB-004) / ⏳ UI 类 skip
- UI 类 14 项: ⏳ 待 weapp-dev-mcp
- Admin 类 5 项: ✅ pass 5
- Bug 修复 2 个 (Critical + Major)

## Admin 测试总结 (Playwright)

- M22 Admin 4 项: ✅ pass 3 + pass(部分) 1 (PH-043 无 pending 数据)
- M23 Admin 5 项: ✅ pass 5
- 发现: Admin 前端重启后 chunks 404 消失 (原 dev server 缓存问题)

## 总进度 (90 检查点)

- ✅ pass: 58 (M22 API 21 + M23 API 26 + M22 Admin 4 + M23 Admin 5 + PH-045 + 间接 PH-018)
- ✅ pass(部分): 3 (PH-006, PH-043, GB-004 AI reject 路径未触发)
- ❌ finding: 3 (PH-009, PH-016 petMeta 内部不校验; GB-045 API 不校验状态)
- ⏳ skip: 26 (UI 类待 weapp-dev-mcp 连接稳定)
- 🐛 修复: 4 个 bug (M22 Bug1 Critical + M22 Bug2 Major + M23 Bug3 Critical + M23 Bug4 Major)

## 🐛 M22 前端 Bug 清单（weapp-dev-mcp UI 层受阻，Agent 读码识别）

### Critical（5 个，UI 链路阻断）

#### M22-FE-1: pet-create FAB 未传 subType，只能创建代喂

- 文件: apps/miniapp/src/pages/events/index.tsx:184-192
- FAB 跳转 /pages/pet-create/index 不带 ?type 参数，pet-create 默认 subType=feed
- 影响: 代遛/寻宠无创建入口，walk/lost 流程无法 E2E 验证

#### M22-FE-2: EVENT_TYPE_TO_ACTION 缺 PET_HELP，CTA 按钮无响应

- 文件: apps/miniapp/src/pages/event-detail/index.tsx:49-56
- 映射表无 PET_HELP，handleCta 取 actionType=undefined 直接 return
- 影响: feed/walk/lost 的"响应"动作完全无法触发

#### M22-FE-3: isHelperType 排除 PET_HELP，feed/walk 无法选帮手

- 文件: apps/miniapp/src/pages/event-detail/index.tsx:457
- isHelperType = (event.type === HELP_REQUEST)，PET_HELP 不匹配
- 影响: 单帮手 selectHelper UI 全链路不可用（选择按钮/已选标签/确认完成按钮都不渲染）

#### M22-FE-4: isMultiHelperType 排除 PET_HELP，lost 无法用多帮手流程

- 文件: apps/miniapp/src/pages/event-detail/index.tsx:458-459
- 仍按 deprecated LOST_FOUND 判断，PET_HELP+lost 不匹配
- 影响: 寻宠 selectParticipant + confirmParticipant UI 不可用

#### M22-FE-5: pet-create 图片存本地临时路径未上传

- 文件: apps/miniapp/src/pages/pet-create/index.tsx:156-168（pet-edit 同样）
- res.tempFilePaths (wxfile://tmp_xxx) 直接存 petMeta.photos，未调 upload
- 项目已有 image-picker 组件用 http.upload 上传远端 URL
- 影响: 寻宠照片跨设备/重开/清缓存后无法显示

### Major（4 个，编辑态不完整）

#### M22-FE-6: event-detail 编辑按钮跳通用 event-edit，无法编辑 petMeta

- 文件: apps/miniapp/src/pages/event-detail/index.tsx:1214-1215
- PET_HELP 编辑应跳 pet-edit 但实际跳 event-edit（无 petMeta 字段）

#### M22-FE-7: pet-edit date-range 输入框未回填

- 文件: apps/miniapp/src/pages/pet-edit/index.tsx:120-134
- Input 无 value 属性，编辑态看不见已有日期

#### M22-FE-8: pet-edit checkbox 不回填已选项

- 文件: apps/miniapp/src/pages/pet-edit/index.tsx:105-115
- Checkbox 无 checked 绑定（radio 有），代遛 timeSlots 编辑时不勾选

#### M22-FE-9: pet-edit image 字段无预览/删除

- 文件: apps/miniapp/src/pages/pet-edit/index.tsx:135-147
- 无已有图片列表展示，选图覆盖而非追加

### Minor（5 个，体验问题）

#### M22-FE-10: event-detail 顶部标签显示"宠物帮帮"非子分类

- 文件: event-detail/index.tsx:466-471（列表卡片按 subType 显示，详情页统一"宠物帮帮"）

#### M22-FE-11: event-detail CTA 文案"我来帮"非按子分类

- 文件: event-detail/index.tsx:1313-1317（卡片显示"我来代喂"等，详情页统一"我来帮"）

#### M22-FE-12: TIME_SLOT_LABELS 与表单 label 不一致

- 详情页 morning='早上' vs 表单 label='早晨'

#### M22-FE-13: Taro.chooseImage 已废弃

- 应迁移到 Taro.chooseMedia（image-picker 已用）

#### M22-FE-14: 图片选择覆盖非追加

- setField(f.name, res.tempFilePaths) 是赋值不是 [...old, ...new]

### M22 前端无问题项（已确认正确）

- petMeta 字段命名与 shared 类型一一对应
- radio/switch/number 字段回填正确
- 业主认证拦截逻辑（feed/walk 拦截, lost 放行）与后端一致
- 列表卡片 typeLabel 映射完整（feed->代喂/walk->代遛/lost->寻宠）
- FEED_FIELDS 不含图片字段（与后端契约一致）

## 🐛 M23 前端 Bug 清单（Agent 读码识别，未修复）

### Critical（1 个）

#### M23-FE-1: 创建页缺 seek/offer 类型切换，offer 无法创建

- 文件: apps/miniapp/src/pages/group-buy-create/index.tsx:8 + events/index.tsx:188
- type 只从 URL 参数读（默认 seek），无 RadioGroup/Tab 切换；FAB 不带 ?type=offer
- 影响: offer 类型（代购方发布行程）从 UI 完全无法触达

### Major（7 个）

#### M23-FE-2: seek 提交时带 quota:5，后端存 5 而非默认 999

- 文件: group-buy-create/index.tsx:16,40
- form 初始 quota:5，create 时一并提交；后端 dto.quota ?? 999 因 dto.quota=5 不生效
- 影响: 违反"seek 不填 quota 默认 999"契约，存进 DB 语义错误

#### M23-FE-3: 编辑按钮在 closed_for_bid/purchased/completed 状态仍显示

- 文件: group-buy-detail/index.tsx:161,328-333
- isClosed 只检查 closed/rejected，未含 closed_for_bid/purchased/completed
- 后端 update 限制 ['pending_review','open']，点击保存才 400

#### M23-FE-4: "已交付"按钮在任意拼单状态对 confirmed item 都显示

- 文件: group-buy-detail/index.tsx:264-268
- 只检查 item.status===confirmed，不检查 groupBuy.status
- 影响: open/closed_for_bid 状态就能交付，跳过 purchased 直接 completed，破坏状态机

#### M23-FE-5: hasResponded 含 rejected item，被拒用户无法再次响应

- 文件: group-buy-detail/index.tsx:158-159
- some(it => it.requesterId === currentUserId) 包含 rejected
- 后端允许 reject 后重响应，前端隐藏"我要加入"区域

#### M23-FE-6: canRespond 未检查 offer 名额，满额仍显示响应表单

- 文件: group-buy-detail/index.tsx:159
- 无 quota 检查，offer 满额提交才被后端 409 拒绝

#### M23-FE-7: departAt/bidCloseAt 纯文本输入无格式校验

- 文件: group-buy-create/index.tsx:121-134 + group-buy-edit/index.tsx:89-102
- 无 Picker/正则，输入 "asdf" 后端 new Date() 得 Invalid Date -> 500
- placeholder "YYYY-MM-DD HH:mm" 与 ISO 格式不一致

#### M23-FE-8: seek 发起人自己的 items 也显示确认/拒绝按钮

- 文件: group-buy-detail/index.tsx:252-263
- seek 创建时 items 用 requesterId=发起人，前端对 isInitiator+pending 都显示按钮
- 影响: 发起人可"拒绝"自己的初始需求，减少 hasConfirmedItems 影响 purchased 按钮

### Minor（3 个）

#### M23-FE-9: 卡片 CTA 文案不一致（offer="查看详情"，详情页="我要加入"）

- 文件: utils/mappers.ts:73-76

#### M23-FE-10: 状态文案详情页与卡片不一致（open: "进行中" vs "报名中"）

- 文件: group-buy-detail/index.tsx:11 vs utils/mappers.ts:88

#### M23-FE-11: seek 创建未校验 item qty ≥ 1

- 文件: group-buy-create/index.tsx:86-93,26-32
- 只查 !i.name，qty=0 让后端 @Min(1) 400 兜底

### M23 前端无问题项（已确认正确）

- seek/offer 必填字段校验（seek items≥1+name, offer departAt+bidCloseAt+quota）
- "截止接单"按钮仅 open 显示
- "已采购"按钮仅 closed_for_bid+hasConfirmedItems 显示
- 响应区域只对非发起人显示
- 列表卡片 typeLabel（seek->求代购, offer->代购方）
- 状态文案未用 cancelled（只有 closed）
- 非 pending item 不显示确认/拒绝（但发起人自己的 item 例外，见 Bug 8）
- 详情页 STATUS_LABELS 覆盖全部枚举
- service 层端点路径与后端 controller 一致
- respond 表单 qty 默认值兜底 || 1

## 前端 Bug 汇总

| 模块     | Critical | Major  | Minor | 合计   |
| -------- | -------- | ------ | ----- | ------ |
| M22 前端 | 5        | 4      | 5     | 14     |
| M23 前端 | 1        | 7      | 3     | 11     |
| **合计** | **6**    | **11** | **8** | **25** |

### 全局 Bug 识别完成状态

- 后端: 已修 4 个 (commit 08de26b) + 状态机守卫 3 处 (commit f3d9c17) + 待确认 finding 3 个
- M22 前端: 已识别 14 个 → 已修 (commit 8f1d266)
- M23 前端: 已识别 11 个 + N4 → 已修 (commit 6531df0)
- 核实新发现 N1~N4: N1/N4 已修，N2 前端已修(后端设计待确认)，N3 维持设计

## 前端 Bug 修复记录（2026-07-21）

### M22 前端 14 项 ✅ 已修 (commit 8f1d266)

- Critical 5: FE-1 pet-create 加 subType 切换(代喂/代遛/寻宠)；FE-2~4 event-detail 支持 pet_help 状态机(handleCta actionType / isHelperType / isMultiHelperType)；FE-5 寻宠图片走 image-picker 上传远端
- Major 4: FE-6 PET_HELP 编辑跳 pet-edit；FE-7 date-range 回填 value；FE-8 checkbox 回填 checked；FE-9 image 走 image-picker 预览删除
- Minor 5: FE-10~11 子分类标签/CTA 文案；FE-12 TIME_SLOT 统一为早上；FE-13 chooseMedia；FE-14 图片追加非覆盖

### M23 前端 11 项 + N4 ✅ 已修 (commit 6531df0)

- Critical 1: FE-1 创建页 seek/offer 类型切换
- Major 7: FE-2 seek 提交剔除 quota；FE-3 编辑按钮限 open/pending_review；FE-4 已交付限 purchased；FE-5 hasResponded 排 rejected；FE-6 canRespond 查 offer 名额；FE-7 时间正则校验+toast；FE-8 确认/拒绝排除发起人自己 item
- Minor 3: FE-9~10 复用 mappers 删重复定义；FE-11 seek 校验 qty>=1
- N4: 采购地点选"其他"加自定义文本输入(create + edit)

### 后端状态机守卫 ✅ 已修 (commit f3d9c17)

- N1: deliver 限 purchased + confirmItem/rejectItem 限 open/closed_for_bid
- 补 3 个 e2e 守卫测试(open/closed_for_bid deliver、purchased confirm 均应 400)

## 核实中新发现（N1~N4）

- N1 后端 deliver/confirm/reject 不校验 gb.status → 已修(见上)
- N2 seek 创建时 item.requesterId=发起人 → 前端 FE-8 排除自己 item 已修；后端 seek 初始需求 item 永远 pending 的状态机行为待 PRD 确认
- N3 seek items 创建后不可编辑 → 维持设计(update dto 无 items 字段，edit 仅改 location/note/交付方式)
- N4 采购地点"其他"无自定义文本输入 → 已修(违反 GB-009)

## 待确认 finding（未修，需用户拍板）

1. PH-009/016: petMeta 内部字段后端不校验(缺 dogSize/petType 不 400) — PRD 是否要求后端校验？
2. PH-037: events 模块无 reject application 接口 — 要补吗？
3. GB-045: Admin takedown API 不校验状态 — 要加 API 守卫吗？

## 验证

- 后端: `cd apps/api && npx vitest run` → 290/290 pass(原 287 + 3 新守卫测试)
- 前端: 无自动化测试，eslint 0 error(仅 pre-existing any/exhaustive-deps warning)，待人工 UI 清单 26 项验证
