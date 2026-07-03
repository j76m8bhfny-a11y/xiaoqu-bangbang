# PRD 需求审查 — 问题清单

> 生成时间: 2026-07-03
> 审查方法: grill-me 逐项确认，对照 PRD + 代码 + 数据库 Schema
> 当前阶段: 只做文档和方案，不改代码

---

## 严重度分级

- 🔴 **阻塞发布** — 红线违反、安全漏洞、数据丢失风险、逻辑 bug
- 🟡 **建议修** — 契约漂移、流程断线、设计不一致
- 🟢 **可延后** — 文档过时、声明未用、代码风格

---

## 一、激励体系重构（设计变更）

### P-01 🔴 积分映射 bug — public_feedback/discussion 给了 3 朵，应为 1 朵

**位置**: `apps/api/src/modules/rankings/rankings.service.ts:78-91`

**问题**: `getEventAction()` 的 switch 没有 `public_feedback` 和 `discussion` 的 case，走 default 分支返回 `help_free`（3 朵）。但用户意图是返回 `feedback`（1 朵）。

**现状**:

```
public_feedback → default → help_free → 3 朵  ❌
discussion → default → help_free → 3 朵  ❌
```

**应为**:

```
public_feedback → feedback → 1 朵  ✅
discussion → feedback → 1 朵  ✅
```

**修复**: 在 `getEventAction()` 补 `case 'public_feedback': return 'feedback'` 和 `case 'discussion': return 'feedback'`。

---

### P-02 🟡 三套独立激励体系重构

**问题**: 现状所有事件类型走同一个生命周期（选帮手→双方确认→完成→发积分），但议事类事件和议题应该有独立的激励体系。

**用户确认的方案**:

| 体系 | 事件/行为                                         | 触发时机       | 小红花                                                   | 奖章                        |
| ---- | ------------------------------------------------- | -------------- | -------------------------------------------------------- | --------------------------- |
| 互助 | help_request/help_offer/public_welfare/lost_found | 双方确认完成   | help_free=3, help_paid=1, public_welfare=5, lost_found=2 | helper_1/5/20, flower_10/50 |
| 议事 | public_feedback/discussion                        | 发布通过审核   | feedback=1                                               | feedback_5/20 (新增)        |
| 议题 | 发起议题                                          | 创建通过AI审核 | topic=1 (新增)                                           | topic_1/5 (新增)            |

---

### P-03 🟡 议事类事件禁用互助流程

**问题**: 议事类事件（public_feedback/discussion）不应走"选帮手→双方确认"流程。

**方案**:

- 议事类事件状态只有 `pending_review → open → closed`
- 禁用 `in_progress`/`processing`/`completed` 状态
- `respond()`/`selectHelper()`/`confirmCompletion()` 对议事类事件返回 400
- 前端议事类事件详情页不显示"选帮手"/"确认完成"按钮
- "关注进展"/"参与讨论" CTA 改为跳转评论区，不改事件状态

---

### P-04 🟡 议题创建加 AI 审核

**位置**: `apps/api/src/modules/topics/topics.service.ts:96-106`

**问题**: 议题创建时 `aiReviewStatus` 直接设为 `'pass'`，没有审核流程。创建即通过、即发小红花，可被刷积分。

**方案**:

- 议题创建时走 AI 文本审核（和事件一样）
- 审核通过才发 1 朵小红花
- 议题状态加 `pending_review → open` 流转

---

### P-05 🟡 新增奖章

**新增 4 个奖章**:

| 代码          | 名称       | 条件                                    |
| ------------- | ---------- | --------------------------------------- |
| `feedback_5`  | 反馈之星   | 上传 5 次有效反馈（议事类事件通过审核） |
| `feedback_20` | 反馈达人   | 上传 20 次有效反馈                      |
| `topic_1`     | 议事发起人 | 发起 1 个议题（通过审核）               |
| `topic_5`     | 议事倡导者 | 发起 5 个议题                           |

---

## 二、投票权限

### P-06 🔴 投票应始终要求认证

**位置**: `apps/api/src/modules/votes/votes.service.ts:90-95`

**问题**: 代码在 `onlyVerified=false` 时不校验认证状态，普通居民可投。但用户意图是只有认证业主可以投。

**现状**:

```typescript
if (vote.onlyVerified) {
  // onlyVerified=false 时跳过校验
  if (!member || member.verifyStatus !== 'verified') {
    throw new ForbiddenException('仅认证用户可参与投票');
  }
}
```

**应为**: 始终校验认证状态，移除 `onlyVerified` 条件判断（或保留字段但始终校验）。

**PRD**: §2.3 权限矩阵修正为"认证业主 ✓，普通居民 ✗"（去掉"部分"）。

---

## 三、闲置交易

### P-07 🟡 闲置评价无触发条件限制

**位置**: `apps/api/src/modules/market/market.service.ts:397-449`

**问题**:

- 任何商品状态都能评价（不限于 sold）
- 任何人都能评价（不限于买家/卖家）
- revieweeId 由前端传入，可伪造

**方案**: 限制为 sold 后买卖双方互评。

---

### P-08 🟡 新增"想要"意向记录

**问题**: 代码里没有"买家"概念，无法实现买卖双方互评。

**方案**:

- 新增 `MarketInterest` 表（或类似），记录谁点了"我想要"
- 卖家标记已售时选择一个意向者为买家
- 评价限制为该次交易的买卖双方
- 评价触发条件：商品 status=sold 且评价者是买家或卖家

---

## 四、通知

### P-09 🟡 实现 vote 通知（投票发布通知）

**问题**: PRD §4.10 声明了 `vote` 通知类型，但代码未实现。投票发布后居民不收到通知，影响参与率。

**方案**: 投票发布时给小区全体成员发 `vote` 类型通知。

---

### P-10 🟡 实现 feedback 通知（举报处理结果通知）

**问题**: PRD §4.10 声明了 `feedback` 通知类型，但代码未实现。举报提交后用户不知道处理结果。

**方案**: 管理员处理举报后，给举报者发 `feedback` 类型通知。

---

### P-11 🟢 PRD 补充 topic_closed 通知类型

**位置**: `apps/api/src/modules/admin/admin.service.ts:1362`

**问题**: 代码用了 `topic_closed` 通知类型（议题被管理员关闭时），但 PRD §4.10 的 8 种类型里没有。

**方案**: PRD §4.10 补充 `topic_closed` 类型。

---

## 五、文档与代码不一致

### P-12 🟢 PRD 遗漏创始人徽章和种子贡献者徽章

**位置**: `apps/api/src/modules/admin/admin.service.ts:1792, 1763`

**问题**: 小区申请通过时，申请人发"创始人"徽章（founderBadge），助力人发"种子贡献者"徽章（seedBadge）。但 PRD §4.9 勋章规则只列了 `first_owner_top30`，未提及这两个。

**方案**: PRD §4.9 补充这两个徽章的描述。

---

### P-13 🟢 PRD 遗漏 community_founding 贡献记录

**位置**: `apps/api/src/modules/admin/admin.service.ts:1774-1788`

**问题**: 助力人有 `action='community_founding'`、`score=5`、`flowerCount=0` 的贡献记录，但 `ContributionAction` 枚举里没有这个值，PRD §4.9 也没提。

**方案**:

- `ContributionAction` 枚举补充 `COMMUNITY_FOUNDING = 'community_founding'`
- PRD §4.9 补充描述

---

### P-14 🟢 ContributionAction 枚举有 3 个未使用的值

**位置**: `packages/shared/src/enums.ts:204-213`

**问题**: `ContributionAction` 枚举里的 `MARKET`、`GOOD_REVIEW`、`MANUAL` 声明了但代码未使用。

**方案**:

- 若后续会用到，加 `ponytail:` 注释标注预留
- 若不会用到，删除

---

### P-15 🟢 社群入口文档不一致

**位置**: `apps/miniapp/src/app.config.ts:37-39`

**问题**: 小程序端 `social-groups` 页面已注释（标注"本期不做"），但 PRD §4.2 仍描述"社群入口按认证状态过滤"，Admin 后台仍有 CRUD。

**方案**: PRD §8.1 已知缺口补充"社群入口小程序端本期不做"，或 §4.2 标注"仅后端 API 可用，小程序端页面已注释"。

---

## 六、互助事件流程细化

### P-16 🟡 创建者激励按类型区分

**位置**: `apps/api/src/modules/rankings/rankings.service.ts:30-47`

**问题**: 代码只给帮手（selectedHelperId）创建贡献记录，不给创建者。但第47行又给创建者检查奖章——创建者没有贡献记录，永远拿不到奖章。

**用户确认的方案**（按事件类型区分）:

| 事件类型               | 创建者是否发花                  | 说明                 |
| ---------------------- | ------------------------------- | -------------------- |
| help_request（求助）   | ❌ 不发花，只记贡献（flower=0） | 单纯求助，没付出劳动 |
| help_offer（我能帮忙） | ✅ 发花（创建者就是帮手）       | 主动提供帮助         |
| public_welfare（公益） | ✅ 发花（和帮手相同）           | 组织活动是贡献       |
| lost_found（寻宠寻物） | ❌ 不发花，只记贡献（flower=0） | 只发布了寻物信息     |

**修复**: 在 `handleEventCompletion` 中，按事件类型给创建者创建贡献记录（flower=0 或 flower=对应朵数）。

---

### P-17 🟡 help_offer 类型跳过选帮手环节

**问题**: help_offer（我能帮忙）类型的创建者就是帮手，不需要"选帮手"环节。

**方案**:

- help_offer 类型：open → in_progress（有人响应）→ completed（需求方确认）
- 跳过 processing（选帮手）状态
- 需求方（响应者）确认完成即可

---

### P-18 🟡 public_welfare/lost_found 支持选多个帮手

**位置**: `apps/api/prisma/schema.prisma:229` — `selectedHelperId String? @db.Uuid`

**问题**: 当前 `selectedHelperId` 是单个字段，只支持选 1 个帮手。但公益和寻宠需要选多个参与者/线索提供者。

**用户确认的方案**:

- 公益（public_welfare）：创建者选多个报名者为参与者，都得花
- 寻宠寻物（lost_found）：创建者选多个有效线索提供者，都得花

**修复**:

- 新增 `EventHelper` 关联表（eventId + userId + role）
- `selectHelper()` 改为支持批量选择
- 积分发放改为给所有选中的帮手发花

---

### P-19 🟡 事件编辑：有人响应后禁止编辑核心内容

**位置**: `apps/api/src/modules/events/events.service.ts:278-279`

**问题**: 代码只禁止 closed/completed 状态编辑，不禁止 in_progress/processing 状态编辑核心内容。编辑审核通过后状态退回 open，响应者被"遗忘"。

**方案**:

- 事件有人响应（in_progress/processing）后，禁止编辑核心内容（标题/描述）
- 只允许编辑不触发审核的字段（如图片——但图片也要审核，见 P-20）
- 或：有人响应后完全禁止编辑

---

### P-20 🟡 事件编辑：图片变化也要审核

**位置**: `apps/api/src/modules/events/events.service.ts:294-314`

**问题**: 代码只在 title/description 变化时触发 AI 审核，图片变化不审核。但闲置物品的图片都要审核，事件图片也应审核。

**方案**: 编辑时检测 images 字段变化，触发图片 AI 审核。

---

### P-21 🟡 事件响应：禁止重复响应

**位置**: `apps/api/src/modules/events/events.service.ts:350-399`

**问题**: 同一用户可多次调用 `respond()`，创建多条 EventApplication 记录。

**方案**: 在创建响应记录前，检查该用户是否已响应过该事件，已响应则返回 400。

---

## 七、排行榜与积分

### P-22 🔴 月榜没有按月过滤 — 月榜和总榜数据完全一样

**位置**: `apps/api/src/modules/rankings/rankings.service.ts:176-222`

**问题**: `recalculateRankings()` 计算月榜时，`groupBy` 的 `where` 条件只有 `communityId` 和 `status: 'valid'`，**没有按 `occurredAt` 过滤当月**。导致月榜的分数是所有时间的总和，和总榜完全一样。

**现状**:

```typescript
// 月榜查询 — 缺少 occurredAt 过滤
const userScores = await this.prisma.contributionRecord.groupBy({
  by: ['userId'],
  where: { communityId, status: 'valid' }, // ← 没有月份过滤！
  _sum: { flowerCount: true, score: true },
});
```

**修复**: 月榜查询条件加 `occurredAt: { gte: 月初, lt: 下月初 }`。

---

### P-23 🟡 排行榜重算非事务 — 中间出错数据丢失

**位置**: `apps/api/src/modules/rankings/rankings.service.ts:216-222, 239-245`

**问题**: `recalculateRankings()` 用 `deleteMany` 删除旧快照 + `createMany` 创建新快照，两步不在事务里。如果中间出错，排行榜数据会丢失。

**修复**: 用 `prisma.$transaction()` 包裹 deleteMany + createMany。

---

## 八、安全漏洞

### P-24 🔴 投票跨小区漏洞 — 可给其他小区投票

**位置**: `apps/api/src/modules/votes/votes.service.ts:60-125`

**问题**: `submitVote()` 查找投票时只按 `id`，没有校验 `communityId`。用户只要知道其他小区投票的 voteId，就能跨小区投票。

**对比**: `getResults()` 方法有 communityId 校验，`submitVote()` 没有。

**修复**: `submitVote()` 加 communityId 参数，查询时加 `where: { id: voteId, communityId }`。

---

## 九、议题与议事

### P-25 🟡 议题时间线只显示 open/pending_review 事件

**位置**: `apps/api/src/modules/topics/topics.service.ts:352`

**问题**: 议题时间线查询条件 `status: { in: ['open', 'pending_review'] }`，in_progress/processing/completed 的事件不显示。事件有人响应后从时间线消失。

**方案**: 确认时间线应该展示哪些状态的事件。如果展示全部（含完成），修改查询条件。

---

### P-26 🟢 议题赞踩不限制作用域

**位置**: `apps/api/src/modules/topics/topics.service.ts:114-148`

**问题**: 代码允许在任何时候对 open/closed 两个作用域赞踩，不校验议题状态。用户确认这是设计如此（提前表态"完结后我会赞"）。

**方案**: PRD §4.6 说明"赞踩分 open/closed 两个作用域，不限制议题状态，随时可对任一作用域赞踩"。

---

### P-27 🟢 议题合并建议是手动触发，非自动

**位置**: `apps/api/src/modules/admin/admin.controller.ts:829`

**问题**: PRD §4.6 说"ai_topic_merge：相似度 ≥ 0.8 自动生成合并建议"，但实际是管理员在后台手动点"扫描"按钮触发 `scanMergeSuggestions()`，不是自动的。

**方案**: PRD §4.6 修正为"管理员手动触发扫描，系统自动生成相似度 ≥ 0.8 的合并建议"。

---

### P-28 🟢 匿名投票脱敏逻辑 PRD 未说明

**问题**: PRD §4.7 有 `isAnonymous` 字段，但没有说明匿名投票的脱敏逻辑。代码中 `getResults()` 不返回投票者信息（隐式脱敏），但 `VoteRecord` 表存储了 userId。

**方案**: PRD §4.7 补充"匿名投票时，结果不显示投票者信息，仅显示各选项票数"。

---

## 十、其他文档问题

### P-29 🟢 PRD 遗漏创始人徽章和种子贡献者徽章

**位置**: `apps/api/src/modules/admin/admin.service.ts:1792, 1763`

**问题**: 小区申请通过时，申请人发"创始人"徽章（founderBadge），助力人发"种子贡献者"徽章（seedBadge）。但 PRD §4.9 勋章规则只列了 `first_owner_top30`，未提及这两个。

**方案**: PRD §4.9 补充这两个徽章的描述。

---

### P-30 🟢 PRD 遗漏 community_founding 贡献记录

**位置**: `apps/api/src/modules/admin/admin.service.ts:1774-1888`

**问题**: 助力人有 `action='community_founding'`、`score=5`、`flowerCount=0` 的贡献记录，但 `ContributionAction` 枚举里没有这个值，PRD §4.9 也没提。

**方案**:

- `ContributionAction` 枚举补充 `COMMUNITY_FOUNDING = 'community_founding'`
- PRD §4.9 补充描述

---

### P-31 🟢 ContributionAction 枚举有 3 个未使用的值

**位置**: `packages/shared/src/enums.ts:204-213`

**问题**: `ContributionAction` 枚举里的 `MARKET`、`GOOD_REVIEW`、`MANUAL` 声明了但代码未使用。

**方案**: 加 `ponytail:` 注释标注预留，或删除。

---

### P-32 🟢 社群入口文档不一致

**位置**: `apps/miniapp/src/app.config.ts:37-39`

**问题**: 小程序端 `social-groups` 页面已注释（标注"本期不做"），但 PRD §4.2 仍描述"社群入口按认证状态过滤"，Admin 后台仍有 CRUD。小程序端 `mine` 页面也已注释（home 页替代）。

**方案**: PRD §8.1 已知缺口补充"社群入口小程序端本期不做"。

---

### P-33 🟢 业委会认领与 committee_admin 角色是两套独立体系

**问题**: PRD §2.2 说"认证业主 → (平台分配) → 业委会管理员"，§4.8 说"业委会成员认领"。两者关系未说明。

**实际情况**（设计如此，非 bug）:

- `AdminUser`（管理后台）：`role: committee_admin`，平台创建账号，用户名密码登录
- `CommitteeMember` 认领（小程序端）：用户点"我是此人"→审核通过→`claimedUserId` 关联，**不赋任何权限**

**方案**: PRD 补充说明两者独立。

---

### P-34 🟢 奖励方式 rewardType 适用范围未说明

**问题**: `rewardType`（free/paid/negotiable/none）对所有事件类型可选，但只对 help_request 有意义（区分 help_free/help_paid 积分）。

**方案**: PRD §4.4 说明"奖励方式仅适用于 help_request 类型"。

---

### P-35 🟢 eventCount 更新逻辑未说明

**问题**: 事件创建审核通过时 topic.eventCount +1，但事件 close 时不 -1。

**方案**: PRD §5.7 说明"eventCount 只在创建/删除/移动时更新，close 不影响"。

---

## 十一、权限与安全

### P-36 🟡 取消游客权限，必须登录

**位置**: `apps/miniapp/src/app.ts:15-18`

**问题**: PRD §2.1/§2.3 说游客可"部分"浏览（小区列表、Banner、勋章列表、小区申请列表），但小程序未登录就 `reLaunch` 到登录页，游客根本进不了应用。后端有 `@Public()` 端点（Banner、勋章），但小程序不用它们。

**方案**: PRD §2.1 删除"游客"角色或改为"未登录不可使用"。§2.3 权限矩阵"游客"列全部改为 ✗。小程序登录拦截保持不变。

---

### P-37 🟡 Banner 缺少过期过滤

**位置**: `apps/api/src/modules/banners/banners.service.ts`

**问题**: PRD §4.12 说"仅 published 且未过期展示"，代码只过滤了 `status: 'published'` 和 `startAt`，**没有过滤 `endAt`**。已过期的 Banner 仍展示。

**修复**: 查询条件加 `OR: [{ endAt: null }, { endAt: { gte: now } }]`。

---

### P-38 🟡 举报处理不通知举报者和被举报者

**位置**: `apps/api/src/modules/admin/admin.service.ts` — `dismissReport`/`takedownReport`/`warnReport`/`banReport`

**问题**:

- 举报者提交后**从不收到处理结果通知**（与 P-10 相关）
- 驳回和下架时，被举报者也不知情
- 下架操作直接隐藏内容（`status: 'hidden'`），但内容创建者不知道为什么

**方案**:

- 处理举报后，给举报者发 `feedback` 类型通知（P-10 的具体落地）
- 下架时，给内容创建者发 `system` 通知

---

## 十二、Schema 注释

### P-39 🟢 Report 状态注释与代码不一致

**位置**: `apps/api/prisma/schema.prisma` Report 模型

**问题**: Schema 注释写 `status // pending/processed/rejected`，但代码实际用的状态值是 `pending`/`dismissed`/`takedown`/`warned`/`banned`。

**方案**: 修正 Schema 注释。

---

### P-40 🟢 公告无独立 publish 端点

**位置**: `apps/api/src/modules/admin/admin.controller.ts`

**问题**: 投票有 `publishVote`、Banner 有 `publishBanner`，但公告没有独立的 `publishAnnouncement` 端点。通过 `updateAnnouncement` 改 `status: 'published'` 实现。API 设计不一致但功能正常。

**方案**: 非关键，可延后统一。

---

## 十三、契约对齐（shared/api.ts ↔ 后端 ↔ 小程序）

### P-41 🔴 事件评价功能断线 — 后端有接口，小程序没调用也没 UI

**位置**: 后端 `apps/api/src/modules/events/events.controller.ts` — `POST /events/:id/rate`

**问题**: 后端有完整的事件评价接口（`rateHelper()` 方法，支持 rating + tags + content），但小程序端 `event.ts` 没有调用这个接口，`event-detail` 页面也没有评价 UI。

**影响**: 用户无法在小程序上对事件进行评价，PRD §4.4 场景2 第7步"双方互相评价"无法走通。

---

### P-42 🔴 闲置评价功能断线 — 后端有接口，小程序没调用也没 UI

**位置**: 后端 `apps/api/src/modules/market/market.controller.ts` — `GET/POST /market/items/:id/reviews`

**问题**: 后端有完整的闲置评价接口（`addReview()`/`getReviews()` 方法），但小程序端 `market.ts` 没有调用这两个接口，`market-detail` 页面也没有评价 UI。

**影响**: 用户无法在小程序上对闲置交易进行评价。

---

### P-43 🔴 shared 契约与后端返回严重不一致（6 个 Critical）

**问题**: `packages/shared/src/api.ts` 声明的 DTO 与后端实际返回的数据结构大量不匹配。`mappers.ts` 只处理了 4 个 DTO，其余差异直接暴露给前端。

**Critical 级别（会导致前端运行时错误）**:

| DTO                 | 问题                                                                                                                   | 影响                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| EventApplicationDto | 声明 `userNickname: string`，后端返回 `user: { nickname }`                                                             | 前端取 `userNickname` 得到 undefined                                  |
| MarketItemDto       | 声明 `sellerNickname: string`，后端返回 `seller: { nickname }`                                                         | 前端取 `sellerNickname` 得到 undefined                                |
| RankingItemDto      | 声明扁平 `nickname`/`avatarUrl`，后端返回嵌套 `user` 对象；且 `isVerified`/`thanksCount`/`latestAction` 后端完全不存在 | mappers.ts 的 `mapRankingItemToUser` 用 `dto.nickname` 得到 undefined |
| AdminDashboardDto   | 声明 10 个字段，后端只返回 4 个且字段名不同（`eventCount` vs `totalEvents`）                                           | Admin 仪表盘数据不完整                                                |
| EventRateDto        | `content` vs 后端 `ratingContent`，`tags` vs `ratingTags`，`targetUserId` 不存在                                       | 评价数据字段取不到                                                    |
| ShareCardConfig     | `title` vs 后端 `shareTitle`，`path` vs `sharePath`                                                                    | 分享卡片配置取不到                                                    |

**Major 级别（后端多返回或少返回字段）**:

- EventDto: 后端多返回 `eventTime`/`capacity`/`topicId`/`aiComment`/`aiReviewResult`（DTO 未声明）
- CommitteeAnnouncementDto: 列表接口缺 `content`/`images`/`publisherNickname`
- VoteDto: 列表接口缺 `description`/`maxChoices`/`resultVisibility`/`options`
- NotificationDto: 后端多返回 `userId`/`communityId`/`readAt`/`deletedAt`
- BannerDto: 后端多返回 `communityId`/`position`/`sortOrder`/`startAt`/`endAt`

**方案**: 需要统一选择一个方向：

- A. 后端返回改为匹配 shared 契约（后端改 select/flatten）
- B. shared 契约改为匹配后端返回（嵌套结构）
- C. mappers.ts 补全所有 DTO 的适配

---

### P-44 🟡 mappers.ts 覆盖不全 — 只处理 4 个 DTO

**位置**: `apps/miniapp/src/utils/mappers.ts`

**问题**: mappers.ts 只映射了 EventDto、RankingItemDto、BannerDto、ServiceProviderDto 四个 DTO。其他 DTO（EventApplicationDto、MarketItemDto、NotificationDto 等）的差异直接暴露给前端组件。

**方案**: 要么补全 mappers 覆盖所有 DTO，要么统一契约让 mappers 不必要。

---

### P-45 🟡 后端有 4 个接口小程序未调用

**问题**: 后端有但小程序端没调用的接口：

1. `POST /events/:id/rate` — 事件评价（见 P-41）
2. `GET /market/items/:id/reviews` — 获取闲置评价（见 P-42）
3. `POST /market/items/:id/reviews` — 提交闲置评价（见 P-42）
4. `GET /health` — 健康检查（无影响，运维用）

**方案**: P-41/P-42 已覆盖前三个。`/health` 不影响功能。

---

## 十四、PRD 流程审查（第二轮）

### P-46 🔴 help_offer 事件类型重构为个人技能档案

**问题**: help_offer（我能帮忙）作为事件类型存在设计缺陷——它是非实时需求，会被事件流淹没；且创建者=帮手导致完成确认流程"左右手互搏"。

**方案**（用户确认）:

- help_offer 从事件类型移除（6→5 种）
- 改为个人技能档案 + 匹配机制（§4.19）
- 用户在个人资料维护"我能帮忙"清单
- 有人发求助时系统匹配，展示联系方式
- 创建者单方确认即发花（打破 R11，基于社区信任简化）
- 本期写入 PRD 作为设计方向，代码待后续迭代

### P-47 🟡 多帮手完成确认流程不明确

**问题**: public_welfare/lost_found 支持选多个帮手，但完成确认流程未定义。

**方案**（用户确认）: 创建者逐个确认每个帮手，确认一个发一个的花；未确认的帮手不得花。

### P-48 🟡 闲置无买家时无法标记已售

**问题**: PRD 要求"卖家从意向列表选买家"标记已售，但无意向记录时流程卡住。

**方案**（用户确认）: 允许无买家直接标记已售（不选买家），此时不产生评价。

### P-49 🟡 举报范围缺少议题和投票

**问题**: 举报目标只有事件/闲置/用户，议题/议题评论/投票无举报入口。

**方案**（用户确认）: 补充议题、议题评论、投票的举报入口；入口设计小而隐蔽避免滥用。

### P-50 🟢 §4.17 审核触发点与 §5.5 不一致

**问题**: §4.17 缺少"议题创建"，§5.5 有。

**方案**: §4.17 补充"议题创建"，两处对齐。

### P-51 🟢 §4.11 分享目标与页面列表矛盾

**问题**: "可分享目标"只有 event/market/service_provider，但页面列表包含 committee-announcement/vote-detail。

**方案**: 结构化分享仅 event/market/service_provider；公告/投票走微信原生分享（onShareAppMessage）。

### P-52 🟢 投票创建权限未明确

**问题**: PRD 未明确说明谁可以创建投票。

**方案**: §4.7 明确"投票由管理员创建，普通用户仅参与投票"。

### P-53 🟢 议题总结填写人不明确

**问题**: §4.6 说议题 closed"含总结"，但未说谁写。

**方案**: §4.6 明确"仅管理员可关闭议题并填写总结（closedSummary）"。

### P-54 🟢 月榜无定时重算

**问题**: 无定时任务，月榜在月初可能短暂为空，需等事件完成触发重算。

**方案**: 锁版不加定时任务，列为已知限制。

---

## 十五、PRD 流程审查（第三轮 — 前后端闭环）

### P-55 🔴 闲置交易意向系统完全未实现

**位置**: `apps/miniapp/src/pages/market-detail/index.tsx:136-140`, `apps/api/prisma/schema.prisma`

**问题**: PRD §4.5 设计了完整的闲置交易意向流程：点"我想要"→记录意向(MarketInterest)→联系卖家→卖家从意向列表选买家→标记已售→买卖双方互评。

代码实际情况：

- "我想要"按钮（`handleWant`）只 `Taro.showToast` 显示 `contactText`，无 API 调用
- 数据库无 MarketInterest 表（只有 MarketItem/MarketLike/MarketComment/MarketReview）
- 后端无意向相关接口
- `markSold(id)` 只接收商品 ID，不接收买家 ID
- 无买家选择 UI

影响：即使修复 P-42（接上评价 UI），也因为没有买家记录而无法满足评价条件（PRD §4.5："评价限制为该次交易的买卖双方，需有买家记录"）。

**方案**（用户确认）: PRD 保留完整设计，本期走"无意向记录"兜底路径（直接标记已售、不产生评价），§8.1 标注"后续迭代实现"。

### P-56 🟡 举报入口不完整 — 议题/投票/评论无举报入口

**位置**: `apps/miniapp/src/pages/topic-detail/`, `apps/miniapp/src/pages/vote-detail/`

**问题**: PRD §4.15（第二轮更新）规定举报范围包括事件、闲置、议题、议题评论、投票。但小程序只有 `event-detail` 和 `market-detail` 有举报按钮，`topic-detail`、`vote-detail` 及议题评论均无举报入口。

**方案**（用户确认）: PRD 保持完整举报范围，代码定稿后在 topic-detail、vote-detail 及议题评论处补举报按钮（弱化小入口，避免滥用）。

### P-57 🟢 事件"评价"与"送花感谢"概念需厘清

**位置**: `apps/miniapp/src/pages/event-detail/index.tsx`, `apps/api/src/modules/events/events.controller.ts:173`

**问题**: PRD §4.4 step 5 描述"评价：双方互评（rating + tags + content）"，step 7 描述"双方互相评价 → 积分/勋章/排行更新"。代码实际只有"送花感谢"（`POST /events/:id/thanks`），后端 `POST /events/:id/rate` 从未被小程序调用。

**方案**（用户确认）: PRD §4.4 简化——本期事件反馈机制为"送花感谢"（给小红花），不做结构化评价（rating+tags+content）。后端 rate 接口保留但标注"本期不调用"。§4.4 step 5 改为"送花感谢"，step 7 改为"帮手获得小红花 → 积分/勋章/排行更新"。§5.6 同步更新。P-41 降级为"已知缺口，后续迭代"。

### P-58 🟡 闲置商品卖家无法自行下架/删除

**位置**: `apps/api/src/modules/market/market.controller.ts`, `apps/miniapp/src/services/market.ts`

**问题**: PRD §4.5 生命周期包含"closed（隐藏）"状态，但：

- 市场 controller 无 close/delete 端点（只有 markSold）
- 市场 service 的 update 方法只允许修改 CreateMarketItemDto 字段，不允许改 status
- 管理端有 `POST /admin/market/:id/hide` 和 `POST /admin/market/:id/restore`，但卖家端无对应能力
- 对比：事件有 `POST /events/:id/close` 让创建者关闭，闲置缺少对称设计

影响：卖家改变主意或商品不再可用时，无法自行下架，只能标记已售或联系管理员。

**方案**（用户确认）: 代码定稿后补 `POST /market/items/:id/close` 端点，让卖家能自行下架未售出商品。PRD §4.5 已更新生命周期说明，区分"卖家下架"和"管理员隐藏"。

### P-59 🟢 topic_closed 通知类型未在共享枚举中声明

**位置**: `apps/api/src/modules/admin/admin.service.ts:1362`, `packages/shared/src/enums.ts:336-345`

**问题**: 后端 admin 服务在关闭议题时发送 `type: 'topic_closed'` 通知，但 `NotificationType` 枚举只有 8 个值（review_result/event_response/completion/badge/feedback/vote/announcement/system），缺少 `TOPIC_CLOSED`。

通知能正常创建和存储，但小程序端 TypeScript 类型检查无法识别此类型，可能落入 default 分支。

**方案**: `NotificationType` 枚举补充 `TOPIC_CLOSED = 'topic_closed'`。代码定稿后修复。

---

## 十六、PRD 反直觉/冗余/歧义审查（第四轮）

### P-60 🟢 单帮手与多帮手完成流程不一致 + "双方确认"歧义

**问题**: §4.4 单帮手完成是"帮手申请完成→创建者确认"三步（R11 双方确认），多帮手只有"创建者逐个确认"两步（参与确认）。场景1 step6 用"双方确认"描述但含义不清。

**方案**（用户确认）: PRD §4.4 补充解释——单帮手是一对一劳动需帮手主动表态"做完了"（R11），多帮手是确认"谁来了"（参与确认，非 R11）。场景1 step6 改为"帮手申请完成→创建者确认"。业务规则同步更新。

### P-61 🟡 help_free/help_paid 小红花统一为 1 朵

**问题**: §4.9 激励表 help_free 给 3 朵、help_paid 给 1 朵，不解释反直觉（付费反而花少？）。且 rewardType 字段影响积分计算增加复杂度。

**方案**（用户确认）: 统一为 1 朵，不区分免费/有偿。rewardType 保留用于展示和筛选，不影响小红花数量。代码定稿后需修改 `rankings.service.ts` 的 `getEventAction()` 逻辑。P-01 影响降低（help_free 从 3 朵降为 1 朵）。

### P-62 🟢 议题赞踩"两个作用域"概念不清

**问题**: §4.6 赞踩分 open/closed 两个作用域，概念复杂，大多数用户不理解。

**方案**（用户确认）: PRD §4.6 补充通俗解释——"开放态度"（值不值得讨论）和"结果评价"（处理得好不好），加示例。

### P-63 🟡 onlyVerified 字段需清理

**问题**: §4.7 onlyVerified 字段是条件判断（admin 可关），但 PRD 说始终要求认证。还有 onlyVerifiedLocked 字段 PRD 未提及。P-07 已记录代码 bug。

**方案**（用户确认）: 始终校验认证状态，代码定稿后移除 onlyVerified 条件判断和 onlyVerifiedLocked 字段，Admin 开关移除，小程序标签始终显示。P-07 随之解决。

### P-64 🟢 "三套激励体系"计数错误

**问题**: §4.9 说"三套"但列了四节（互助/议事/议题/小区创建）。

**方案**: 改为"四套独立激励体系"。

### P-65 🟢 "只记贡献"含义不清

**问题**: §4.9 激励表"0 朵（只记贡献）"含义模糊，用户觉得"发了求助什么都没得到"。

**方案**: 改为"0 朵"，说明列写明"发起求助是寻求帮助而非贡献劳动"。

### P-66 🟢 场景3和§4.1引用未实现功能如已上线

**问题**: 场景3描述意向记录/买家选择/互评如已可用（P-55 已决定本期不实现）。§4.1"手机号/微信号/楼栋房号"引用技能匹配如已可用（§4.19 本期不实现）。

**方案**: 场景3 step4-6 改为当前实际行为（显示联系方式、标记已售），注明后续迭代。§4.1 注明技能匹配本期不实现。

---

## 十七、PRD 18 维度审查（第五轮）

### P-67 🟡 所有文本输入无长度限制

**位置**: `apps/api/src/modules/events/dto/create-event.dto.ts`, `apps/api/src/modules/market/dto/create-market-item.dto.ts`, `apps/api/src/modules/topics/topics.controller.ts`

**问题**: 所有 DTO 只有 `@IsString()` 校验，无 `@MaxLength`。用户可提交超长标题/描述，导致 UI 溢出、数据库存储浪费。

**方案**（用户确认）: PRD §6.2 已补充输入长度限制表（事件标题≤50、描述≤500、图片≤9张、议题标题≤30、评论≤200 等）。代码定稿后在 DTO 中补 `@MaxLength` 装饰器。

### P-68 🟡 创建者可响应自己的事件

**位置**: `apps/api/src/modules/events/events.service.ts` respond 方法

**问题**: 后端 respond 方法无"创建者不可响应自己事件"的检查，用户可自己帮自己。

**方案**（用户确认）: PRD §4.4 业务规则已补充"创建者不可响应自己的事件（代码定稿后补检查）"。

### P-69 🔴 Admin 仪表盘三层契约断裂

**位置**: `packages/shared/src/api.ts:736-747`, `apps/admin/src/app/dashboard/page.tsx:30-40`, `apps/api/src/modules/admin/admin.service.ts:56-64`

**问题**: 三层契约不一致：

- 共享契约 `AdminDashboardDto` 声明 9 个统计字段 + todoItems 数组
- Admin 前端消费全部 9 个字段，渲染 9 张统计卡 + 待办列表
- 后端 `getDashboard()` 只返回 4 个字段（eventCount/marketCount/userCount/pendingReviews），且字段名与契约不一致（eventCount≠totalEvents, userCount≠totalUsers）

**后果**: Admin 仪表盘 9 张统计卡中有 5 张永远显示 0（前端用 `?? 0` 兜底），待办列表永远为空。

**方案**（用户确认）: PRD §4.18 保持"9 项统计 + 待办列表"（与契约+前端一致，是设计真相）。后端 `getDashboard()` 需补齐缺失的 5 个统计字段（pendingVerifications/pendingClaims/highRiskFeedback/pendingReports/totalCommunities/todayMutualHelp）+ todoItems 数组，并修正字段名。代码定稿后修复，🔴 阻塞发布。

### P-70 🟢 议题可重新开放但 PRD 未提及

**位置**: `apps/api/src/modules/admin/admin.controller.ts:903`, `apps/api/src/modules/admin/admin.service.ts:1372`

**问题**: 代码有 `POST /admin/topics/:id/reopen` 端点，管理员可把已关闭议题重新开放（清空 closedAt/closedBy/closedSummary，状态改回 open）。但 PRD §4.6 议题生命周期只有 `open→closed` 单向，无回流路径。

**方案**（用户确认）: PRD §4.6 生命周期图补充 `closed→open` 回流路径，注明"管理员可重新开放已关闭议题，清空关闭信息"。

### P-71 🟡 关闭事件不触发激励但 PRD 未明确

**位置**: `apps/api/src/modules/events/events.service.ts:324` (close), `:513` (confirmCompletion), `:564` (handleEventCompletion)

**问题**: 代码中 `close()` 只改状态不调用激励逻辑，`confirmCompletion()` 改状态为 completed 并调用 `handleEventCompletion()` 发小红花。PRD §5.4 写了 `completed（已完成，触发互助激励）`和 `closed（创建者主动关闭）`，但没明确 closed 不触发激励，可能让帮手困惑（帮了一半被关闭得 0 朵）。

**方案**（用户确认）: PRD §5.4 在 closed 旁注明"不触发激励——创建者放弃/取消的场景"。

### P-72 🔴 月榜过滤未实现（月榜实际等于总榜）

**位置**: `apps/api/src/modules/rankings/rankings.service.ts:176-222`, `apps/api/prisma/schema.prisma:549`

**问题**: `recalculateRankings()` 计算月榜时，`where: { communityId, status: 'valid' }` 没有按 `occurredAt` 过滤当月。它聚合全部历史贡献后，只是打上当前月份的 `periodKey` 标签。结果：**月榜 = 总榜**（数据完全一样，periodKey 不同）。

`occurredAt` 字段在 schema 中存在（contributionRecord.occurredAt），写入时设为 `new Date()`（事件完成时刻），但月榜查询从未用它过滤。

**方案**（用户确认）: PRD §4.9 已定义 occurredAt = 贡献记录时间（事件完成/审核通过时刻）。代码定稿后在 `recalculateRankings()` 的月榜查询中补 `where: { ..., occurredAt: { gte: monthStart, lt: nextMonthStart } }`。🔴 阻塞发布。

### P-73 🟡 通知点击跳转路由不完整 + market_item 拼写不匹配

**位置**: `apps/miniapp/src/pages/notifications/index.tsx:83-88`, 后端多处 targetType

**问题**: 小程序通知点击只处理 `targetType === 'event'` 和 `targetType === 'market'` 两种跳转，但：

1. 后端发的是 `targetType: 'market_item'`，前端检查 `'market'` — **拼写不匹配**，闲置通知点击无反应
2. 其余 6 种 targetType（topic/badge/verification/community/announcement/vote）点击后什么都不做

**方案**（用户确认）: PRD §4.10 已补充完整通知跳转路由表。代码定稿后：

- 修正 `market` → `market_item`
- 补充 topic→议题详情、badge→勋章墙、vote→投票详情等跳转逻辑

### P-74 🟡 事件/闲置详情页状态→按钮映射未定义

**位置**: `apps/miniapp/src/pages/event-detail/index.tsx:686-720` (CTA 始终显示), `handleCta:173`

**问题**: 事件详情页底部 CTA 按钮（"我来帮"等）始终显示，不检查事件状态。`completed`/`closed`/`rejected` 状态下仍可点击"我来帮"，`handleCta` 也不检查状态直接调 respond。闲置详情页同理。

**方案**（用户确认）: PRD §4.4 和 §4.5 各补充"状态→按钮可见性"映射表，明确每个状态下哪些按钮显示/隐藏。代码定稿后按映射表实现条件渲染。

### P-75 🟢 匿名事件管理员可见性未注明

**位置**: `apps/api/src/modules/events/events.service.ts:77-88` (maskAnonymous)

**问题**: maskAnonymous 只检查 viewerUserId === creatorId，无管理员例外。但 Admin 服务直接通过 Prisma 访问数据不经脱敏，管理员实际可见匿名事件创建者。PRD 未说明这一点。

**方案**（用户确认）: PRD §4.4 匿名规则补充"管理员可见匿名事件创建者（用于审核管理）"。

### P-76 🟢 议题评分不可修改未注明

**位置**: `apps/api/src/modules/topics/topics.service.ts:167-191` (rate 方法)

**问题**: 代码在用户已评分时抛 ConflictException，无更新逻辑，评分提交后不可修改。PRD 说"每人一次"但未明说"不可修改"。

**方案**（用户确认）: PRD §4.6 评分规则补充"提交后不可修改"。

### P-77 🟢 投票 resultVisibility "after_vote" 含义模糊

**位置**: `apps/api/src/modules/votes/votes.service.ts:141-148`, PRD §4.7

**问题**: PRD 写"after_vote（投票后可见）"容易误解为"投票结束后"。代码实际是"用户自己投票后才能看结果"（检查 VoteRecord 是否存在）。

**方案**（用户确认）: PRD §4.7 改为"after_vote（用户自己投票后可见——必须先投票才能看结果）"。

### P-78 🟡 事件无自动过期逻辑

**位置**: `apps/api/src/modules/events/events.service.ts`（全文件无过期/超时/cron 逻辑）

**问题**: 所有 5 种事件类型在 open/in_progress/processing 状态下无自动过期机制。无人响应的求助、活动时间已过的公益、已沉寂的讨论都会永久堆积在列表中。代码无定时任务、无超时检查。

**方案**（用户确认）: PRD §4.4 已补充规则"open/in_progress/processing 状态超过 30 天无活动（无新响应、无状态变更），自动转 closed（不触发激励）"。§8.1 已记入缺口。代码定稿后加定时任务每日扫描。

### P-79 🟡 respond() 等方法未捕获唯一约束异常

**位置**: `apps/api/src/modules/events/events.service.ts` (respond), `events.service.ts` (toggleLike), `apps/api/src/modules/market/market.service.ts` (toggleLike)

**问题**: 三个方法都依赖数据库 UNIQUE 约束防重复，但未捕获 Prisma 唯一约束异常：

- `respond()`: 无代码级检查，并发时第二次 create 抛 Prisma 异常 → 返回 500
- `toggleLike()` (events/market): 有 findUnique 检查但存在 TOCTOU 竞态，并发时 UNIQUE 兜底但抛 500

**方案**（用户确认）: 代码定稿后在三个方法中补 try-catch，将 Prisma 唯一约束异常转为 409 Conflict + 友好提示（如"您已响应过此事件"）。

---

## 十八、PRD 18 维度复查（第六轮）

### P-80 🟡 多帮手流程完全未实现 + 激励时机矛盾

**位置**: `apps/api/src/modules/events/events.service.ts:420-475` (selectHelper), `:513-571` (confirmCompletion), `apps/api/src/modules/rankings/rankings.service.ts:15-76` (handleEventCompletion)

**问题**: PRD §4.4 描述 public_welfare/lost_found 支持多帮手逐个确认发花，但代码：

- `selectHelper`: `selectedHelperId` 是单字段，每次调用覆盖前一个，无法选多个
- `confirmCompletion`: 只检查单个 helper + creator 双方确认
- `handleEventCompletion`: 只给 `selectedHelperId`（单个人）发花

同时 §4.4 "确认一个发一个的花"（processing 状态逐个发花）与 §4.9/§5.4 "完成时触发"（completed 状态统一发花）矛盾。

**方案**（用户确认）: PRD 保留多帮手设计但标注"⚠️ 代码未实现"，当前走单帮手兜底。§4.9 补充激励时机说明：单帮手 completed 时触发，多帮手设计为逐个触发。§8.1 补充缺口行。

### P-81 🟡 议题 reopen 后旧评分未清除

**位置**: `apps/api/src/modules/admin/admin.service.ts:1372-1380` (reopenTopic)

**问题**: D4 补充了议题 reopen 功能，但代码 reopenTopic 只清空 closedAt/closedBy/closedSummary，不清空 ratingSum/ratingCount 和 TopicRating 记录。重新关闭后 avgRating 混合两轮评分，且已评分用户不能重新评分（ConflictException）。

**方案**（用户确认）: PRD §4.6 已补充"reopen 时清空已有评分（ratingSum/ratingCount 归零，删除 TopicRating 记录）"。代码定稿后修改 reopenTopic 方法。

### P-82 🟡 announcement 通知标记"已实现"但业委会公告不发通知

**位置**: `apps/api/src/modules/admin/admin.service.ts:1824` (announcement 仅用于小区开通), 业委会创建公告无通知

**问题**: §4.10 原写 `announcement | 业委会公告 | ✅ 已实现`，但代码中 `type: 'announcement'` 只在小区申请通过时使用。业委会发布公告时不发通知。

**方案**（用户确认）: PRD §4.10 已拆分：announcement 改为"小区开通通知"✅，另加"业委会公告通知 ⚠️ 待实现"。

### P-83 🟡 评论嵌套限制不统一

**位置**: `apps/api/src/modules/topics/topics.service.ts:252` (有2层限制), `events.service.ts:597-604` (无限制), `market.service.ts:329-335` (无限制)

**问题**: 议题评论明确"嵌套最多 2 层"（代码有 `if (parent.parentId) throw 400`），但事件评论和闲置评论只验证父评论存在，无嵌套深度检查，可无限嵌套。

**方案**（用户确认）: PRD §4.4 和 §4.5 已补充"评论嵌套最多 2 层"。代码定稿后在 events.service.ts 和 market.service.ts 的 addComment 方法中补 `if (parent.parentId) throw 400` 检查。

### P-84 🟡 投票生命周期未在 PRD 中定义

**位置**: `apps/api/prisma/schema.prisma:685` (status default 'draft'), `apps/api/src/modules/admin/admin.service.ts:553-573` (publishVote/closeVote)

**问题**: §4.7 没有投票生命周期图（对比事件/闲置/议题都有）。代码中投票有 draft→published→closed 三状态，draft 用户不可见，published 可投票，closed 不可投票但结果按 resultVisibility 展示。

**方案**（用户确认）: PRD §4.7 已补充投票生命周期图和各状态行为说明。

### P-85 🟢 "30天无活动"中"活动"定义不够精确

**位置**: PRD §4.4 自动过期规则

**问题**: §4.4 原写"超过 30 天无活动（无新响应、无状态变更）"，但未明确评论/点赞是否算"活动"并重置计时器。

**方案**（用户确认）: PRD §4.4 已明确"活动仅指新响应（EventApplication 创建）和状态变更，评论/点赞不重置计时器"。

### P-86 🟢 §4.5 意向记录缺"本期不实现"内联标注

**位置**: PRD §4.5 意向记录段落

**问题**: §4.5 描述 MarketInterest 意向记录如已实现，但 §8.1 明确写了"闲置交易意向系统未实现"。场景 3 有内联标注，§4.5 没有。

**方案**（用户确认）: PRD §4.5 已补充"⚠️ 本期不实现"内联标注。

### P-87 🟢 管理端内容输入长度未定义

**位置**: PRD §6.2 输入长度限制表

**问题**: §6.2 只覆盖用户生成内容（事件/闲置/议题/评论/举报等），管理端内容（公告标题/内容、投票标题/选项、Banner、服务商、小区名称/地址）未限制。管理端是可信用户但仍应补全。

**方案**（用户确认）: PRD §6.2 已补充管理端内容长度限制（公告标题 50/内容 2000、投票标题 50/选项 30/描述 500、Banner 30、服务商名称 30/描述 500、小区名称 50/地址 200）。

---

## 十九、契约对齐扫描（第二轮 — 精细化）

> 生成时间: 2026-07-03
> 扫描方法: 4 个并行 agent 按 19 个 C 侧模块三端比对 (shared/api.ts ↔ api controllers ↔ miniapp services)
> 与 P-43 关系: P-43 是第一轮概括性扫描（6 个 Critical 汇总），本节是第二轮精细化，每条带精确行号。P-43 已覆盖的标注"P-43 子项"，新发现独立列出。
> 范围: C 侧（小程序端）。Admin 侧（admin controller ↔ admin 前端）未扫，列入后续工作。

### P-88 🔴 [communities] select 响应结构完全不匹配

- **位置**: `apps/api/src/modules/communities/communities.service.ts:56` vs `apps/miniapp/src/services/community.ts:17-18`
- **问题**: 后端 `POST /communities/select` 返回 `{ currentCommunityId, communityName }`，小程序 `communityService.select()` 类型标注为 `{ success: boolean }`，两结构无任何重叠字段。小程序端 `result.success` 为 `undefined`。
- **建议**: 小程序返回类型改为 `{ currentCommunityId: string; communityName: string }`，或新增 `SelectCommunityResponse` DTO。

### P-89 🔴 [verifications] GET /me 响应包装不一致（对象 vs 数组）

- **位置**: `apps/api/src/modules/verifications/verifications.controller.ts:22-25` vs `apps/miniapp/src/services/verification.ts:15-16`
- **问题**: 后端返回 `{ code, message, data: { items } }`（data 是对象），小程序标注为 `VerificationDto[]`（期望直接数组）。经 `http.ts` 解包 `body.data` 后拿到 `{ items: [...] }` 而非 `[...]`，对结果调用 `.map()` 会运行时崩溃（对象不可迭代）。
- **建议**: 小程序改为 `http.get<{ items: VerificationDto[] }>('/verifications/me')`。

### P-90 🟡 [auth] GET /me 返回缺 openid 字段

- **位置**: `apps/api/src/modules/auth/auth.service.ts:67-77` vs `packages/shared/src/api.ts:91-102`
- **问题**: `UserDto` 定义了 10 个字段（含 `openid: string`），但 `authService.getMe()` 只返回 9 个字段（无 `openid`）。小程序端 `user.openid` 为 `undefined`。
- **建议**: `getMe()` 返回值补 `openid`，或将 `UserDto.openid` 改为可选。

### P-91 🟡 [auth] PATCH /me 响应类型漂移

- **位置**: `apps/api/src/modules/auth/auth.service.ts:80-85` vs `apps/miniapp/src/services/auth.ts:16`
- **问题**: `updateMe()` 只返回 `{ id, nickname, avatarUrl, bio }` 4 个字段，小程序标注为 `UserDto`（10 字段）。访问 `result.status`/`result.roles` 得到 `undefined`。
- **建议**: 小程序返回类型改为 `Pick<UserDto, 'id'|'nickname'|'avatarUrl'|'bio'>`，或新增 `UpdateMeResponse` DTO。

### P-92 🟡 [communities] SocialGroupDto 类型漂移（null vs non-null）

- **位置**: `apps/miniapp/src/services/community.ts:4-11` vs `packages/shared/src/api.ts:137-144`
- **问题**: 小程序本地定义 `SocialGroupDto` 的 `description`/`qrImageUrl`/`contactText` 为非空 `string`，shared 版本为 `string | null`。后端返回 `null` 时类型不匹配。
- **建议**: 删除本地定义，从 `@xiaoqu-bangbang/shared` 导入。

### P-93 🟡 [verifications] 缺 SubmitVerificationResponse DTO

- **位置**: `apps/api/src/modules/verifications/verifications.service.ts:136-149` vs `packages/shared/src/api.ts:148-163`
- **问题**: `POST /verifications` 返回 `{ id, status, ocrSummary, matchResult }`，小程序定义本地 `VerificationResultDto` 匹配，但 shared 层只有 Request DTO 无 Response DTO。
- **建议**: shared 新增 `SubmitVerificationResponse` DTO，小程序复用。

### P-94 🟡 [verifications] 后端多返回 maskedFileUrl/createdAt

- **位置**: `apps/api/src/modules/verifications/verifications.service.ts:152-168` vs `packages/shared/src/api.ts:156-163`
- **问题**: Prisma select 额外返回 `maskedFileUrl`/`createdAt`，`VerificationDto` 未声明。
- **建议**: DTO 补字段或 select 删多余字段。

### P-95 🟢 [auth] updateMe 注释类型不精确

- **位置**: `apps/miniapp/src/services/auth.ts:16`
- **问题**: 注释为 `UserDto` 但实际只返回 4 字段（见 P-91）。
- **建议**: 与 P-91 同修。

### P-96 🟢 [auth] openid 字段在 LoginResponse 和 UserDto 间隐式耦合

- **位置**: `packages/shared/src/api.ts:86-89` vs `apps/api/src/modules/auth/auth.controller.ts:22-26`
- **问题**: `LoginResponse.user` 含 `openid`（wechatLogin 补上），但 `GET /me` 不含。两个接口在 `openid` 字段上不一致。
- **建议**: `UserDto.openid` 改可选，或统一两端都返回。

### P-97 🟢 [communities] 重复定义 SocialGroupDto

- **位置**: `apps/miniapp/src/services/community.ts:4-11`
- **问题**: 本地定义 `SocialGroupDto` 与 shared 重复。
- **建议**: 与 P-92 同修。

### P-98 🟢 [verifications] 本地 VerificationResultDto 应移到 shared

- **位置**: `apps/miniapp/src/services/verification.ts:4-9`
- **问题**: 与 P-93 同类问题，类型定义分散在 service 文件。
- **建议**: 与 P-93 同修。

### P-99 🔴 [events] sendThanks 缺 toUserId 参数

- **位置**: 小程序 `apps/miniapp/src/services/event.ts:53-54` | 后端 `apps/api/src/modules/events/events.controller.ts:228-243`
- **问题**: 小程序 `sendThanks` 未传 `toUserId`，但 controller 通过 `@Body() body: { toUserId: string }` 强依赖。运行时 `body.toUserId` 为 `undefined`，Prisma 写入行为不可预测。
- **建议**: 小程序调用时传 `{ toUserId: string }`。

### P-100 🔴 [events] confirmCompletion 返回联合类型 miniapp 未覆盖

- **位置**: 小程序 `apps/miniapp/src/services/event.ts:47-48` | 后端 `apps/api/src/modules/events/events.service.ts:513-577`
- **问题**: miniapp 期望 `EventDto`，但后端在双方未全部确认时返回 `{ confirmed, waitingFor }`，仅双方都确认后才返回 `EventDto`。类型联合体与单一 `EventDto` 不匹配。
- **建议**: miniapp 返回类型改为 `EventDto | { confirmed: string; waitingFor: string }`，或 shared 定义联合响应 DTO。

### P-101 🟡 [events] requestCompletion 返回类型不匹配

- **位置**: 小程序 `apps/miniapp/src/services/event.ts:44-45` | 后端 `apps/api/src/modules/events/events.service.ts:477-511`
- **问题**: miniapp 期望 `EventDto`，后端返回 `EventCompletionConfirmation`（Prisma 模型，含 `eventId`/`userId`/`role`/`status`）。
- **建议**: miniapp 返回类型改为对应 DTO，或 shared 定义。

### P-102 🟡 [events] selectHelper 返回 EventDto 非 EventApplicationDto

- **位置**: 小程序 `apps/miniapp/src/services/event.ts:41-42` | 后端 `apps/api/src/modules/events/events.controller.ts:134-149`
- **问题**: miniapp 期望 `EventApplicationDto`，controller 返回的是更新后的 `event`（`EventDto` 结构）。
- **建议**: miniapp 返回类型改为 `EventDto`。

### P-103 🟡 [events] getComments 响应包装不匹配

- **位置**: 小程序 `apps/miniapp/src/services/event.ts:62-63` | 后端 `apps/api/src/modules/events/events.controller.ts:210-215`
- **问题**: miniapp 期望 `PaginatedData<CommentDto>`（含 page/pageSize/total），controller 返回 `{ items: comments }`（无分页信息）。
- **建议**: miniapp 改为 `{ items: CommentDto[] }`，或 controller 补分页字段。

### P-104 🟡 [events] getFeedbackLogs 响应包装不匹配

- **位置**: 小程序 `apps/miniapp/src/services/event.ts:71-72` | 后端 `apps/api/src/modules/events/events.controller.ts:185-190`
- **问题**: miniapp 期望 `FeedbackLogDto[]`（直接数组），controller 返回 `{ items: ... }`（对象包装）。miniapp 收到 `{ items: [...] }` 而非 `[...]`。
- **建议**: miniapp 改为 `{ items: FeedbackLogDto[] }`，或 controller 去掉 items 包装。

### P-105 🟡 [events] 本地 CommentDto 缺字段

- **位置**: 小程序 `apps/miniapp/src/services/event.ts:7-14`
- **问题**: 本地 `CommentDto` 只有 6 字段，后端返回含 `eventId`/`parentId`/`status`/`aiReviewStatus`/`updatedAt` 等更多字段。
- **建议**: 事件评论 DTO 补到 shared/api.ts，与后端一致。

### P-106 🟡 [events] 后端 CreateEventDto 缺 shared 的 3 个字段

- **位置**: shared `packages/shared/src/api.ts:167-182` | 后端 `apps/api/src/modules/events/dto/create-event.dto.ts`
- **问题**: shared `CreateEventRequest` 有 `videos?`/`eventTime?`/`visibility?`，后端 `CreateEventDto` 完全缺失，service create 也未处理。
- **建议**: 后端 DTO 和 service 补字段，或 shared 移除（YAGNI）。

### P-107 🟡 [events] list 的 \_count 缺 thanks/favorites

- **位置**: shared `packages/shared/src/api.ts:209-215` | 后端 `apps/api/src/modules/events/events.service.ts:57-63`
- **问题**: `EventDto._count` 定义 5 字段，后端 list 只返回 3 个（缺 `thanks`/`favorites`）。findOne 的 \_count 含 5 个，list 和 detail 不一致。
- **建议**: 后端 list 也加上 `thanks`/`favorites` 计数。

### P-108 🟢 [events] DTO 风格不一致（class-validator vs interface）

- **位置**: 后端 DTOs | shared api.ts
- **问题**: 后端用 class-validator 装饰器，shared 用 TS interface。后端枚举值硬编码字符串数组而非引用 shared enums。
- **建议**: 后端 `@IsEnum()` 引用 shared enums。

### P-109 🟡 [market] CreateMarketItemRequest 有 contactText 后端 DTO 没有

- **位置**: shared `packages/shared/src/api.ts:265` | 后端 `apps/api/src/modules/market/dto/create-market-item.dto.ts`
- **问题**: shared 有 `contactText?`，后端 DTO 完全没有，service create 也未设置。
- **建议**: 后端补字段，或 shared 移除。

### P-110 🟡 [market] MarketItemDto sellerNickname vs seller 嵌套（P-43 子项，补行号）

- **位置**: shared `packages/shared/src/api.ts:272-273` | 后端 `apps/api/src/modules/market/market.service.ts:57-59, 112-114`
- **问题**: shared 定义扁平 `sellerNickname`/`sellerAvatarUrl`，后端返回嵌套 `seller: { id, nickname, avatarUrl }`。前端取 `sellerNickname` 得 `undefined`。
- **建议**: shared 改为 `seller: { id, nickname, avatarUrl }` 匹配后端，或后端 flatten。

### P-111 🟡 [market] MarketItemDto 缺 aiReviewStatus

- **位置**: shared `packages/shared/src/api.ts:268-286` | 后端 `apps/api/src/modules/market/market.service.ts:53, 106`
- **问题**: 后端 list/findOne 都返回 `aiReviewStatus`，shared DTO 未声明。
- **建议**: shared 补 `aiReviewStatus: string`。

### P-112 🟡 [market] images 必填 vs 可选不一致

- **位置**: shared `packages/shared/src/api.ts:261` | 后端 `apps/api/src/modules/market/dto/create-market-item.dto.ts:14-17`
- **问题**: shared `images: string[]` 必填，后端 `images?: string[]` 可选（service 有 `?? []` 兜底）。
- **建议**: 统一为可选。

### P-113 🟡 [market] addComment 返回缺 user 关系

- **位置**: 小程序 `apps/miniapp/src/services/market.ts:45-46` | 后端 `apps/api/src/modules/market/market.service.ts:353-365`
- **问题**: miniapp 期望返回含 `user: { id, nickname, avatarUrl }`，后端 `addComment` 直接返回 `prisma.marketComment.create(...)` 原始结果，未 include `user`。前端 `comment.user` 为 `undefined`。
- **建议**: 后端 Prisma 查询加 `include: { user: { select: { id, nickname, avatarUrl } } }`。

### P-114 🟡 [market] getById 多传 communityId 被忽略

- **位置**: 小程序 `apps/miniapp/src/services/market.ts:31-32` | 后端 `apps/api/src/modules/market/market.controller.ts:54-63`
- **问题**: miniapp 传 `communityId` 作为 query 参数，后端用 `@CurrentCommunityId()` 注入，不接受 query。miniapp 传的值被忽略。
- **建议**: miniapp 移除 `communityId` 参数，或统一获取方式。

### P-115 🟢 [market] tradeType/conditionLevel 必填 vs 可选

- **位置**: shared `packages/shared/src/api.ts:263-264` | 后端 `apps/api/src/modules/market/dto/create-market-item.dto.ts:24-31`
- **问题**: shared 必填，后端可选（有默认值 `'free'`/`'good'`）。
- **建议**: 统一为可选带默认值，或必填。

### P-116 🟡 [topics] findById 返回 TopicDto 非 TopicDetailDto

- **位置**: 小程序 `apps/miniapp/src/services/topic.ts:17` | 后端 `apps/api/src/modules/topics/topics.service.ts:86-94`
- **问题**: miniapp 期望 `TopicDetailDto`（含 `events: TopicEventItem[]`），后端 `findById` 只调用 `toDto(topic)` 返回 `TopicDto`（无 events 数组）。议题详情页拿不到关联事件列表。
- **建议**: 后端 `findById` 加 `include: { events: ... }` 返回 `TopicDetailDto`。

### P-117 🟡 [topics] like/dislike/unlike 返回类型不匹配

- **位置**: 小程序 `apps/miniapp/src/services/topic.ts:21-28` | 后端 `apps/api/src/modules/topics/topics.controller.ts:86-122`
- **问题**: miniapp 期望 `{ likeCount, dislikeCount }`，controller 返回完整 `TopicDto`。
- **建议**: 统一为 `TopicDto` 或精简对象。

### P-118 🟡 [topics] rate 返回类型不匹配

- **位置**: 小程序 `apps/miniapp/src/services/topic.ts:30-31` | 后端 `apps/api/src/modules/topics/topics.controller.ts:124-134`
- **问题**: miniapp 期望 `{ avgRating, ratingCount }`，controller 返回完整 `TopicDto`。
- **建议**: miniapp 改为 `TopicDto`，或后端返回精简对象。

### P-119 🟡 [topics] unlike scope 参数传递方式不一致

- **位置**: 小程序 `apps/miniapp/src/services/topic.ts:27-28` | 后端 `apps/api/src/modules/topics/topics.controller.ts:112-122`
- **问题**: miniapp 通过 `http.del(url, { scope })` 发送，后端用 `@Query('scope')` 读取。依赖 Taro 将 DELETE body 序列化为 query，存在平台差异风险。
- **建议**: miniapp 显式拼 query：`http.del(\`/topics/${id}/like?scope=${scope}\`)`，或后端改 `@Body()`。

### P-120 🟡 [topics] timeline 缺 total 字段

- **位置**: 小程序 `apps/miniapp/src/services/topic.ts:33-34` | 后端 `apps/api/src/modules/topics/topics.controller.ts:136-146`
- **问题**: miniapp 期望 `PaginatedData<TopicTimelineItem>`（含 total），controller 返回 `{ items, page, pageSize }`（缺 total）。分页组件无法计算总页数。
- **建议**: controller 补 `total`，或 miniapp 改为非分页类型。

### P-121 🟡 [topics] likeComment/dislikeComment/unlikeComment 返回类型不匹配

- **位置**: 小程序 `apps/miniapp/src/services/topic.ts:44-51` | 后端 `apps/api/src/modules/topics/topics.controller.ts:42-67`
- **问题**: miniapp 期望 `{ likeCount, dislikeCount }`，controller 返回完整 comment DTO。
- **建议**: 统一响应类型。

### P-122 🟡 [topics] create Body 内联类型非 shared DTO

- **位置**: 后端 `apps/api/src/modules/topics/topics.controller.ts:74` | shared `packages/shared/src/api.ts:797-800`
- **问题**: controller 用内联 `{ title: string; description?: string }`，未引用 shared `CreateTopicRequest`。
- **建议**: 引用 shared DTO。

### P-123 🟡 [topics] comments sort 参数类型不一致

- **位置**: 小程序 `apps/miniapp/src/services/topic.ts:36-39` | 后端 `apps/api/src/modules/topics/topics.controller.ts:148-165`
- **问题**: miniapp `sort: string`，后端 `sort?: 'hot' | 'new'`。miniapp 类型过宽。
- **建议**: miniapp 改为 `'hot' | 'new'`。

### P-124 🟢 [topics] controller 守卫层级叠加

- **位置**: `apps/api/src/modules/topics/topics.controller.ts:21`
- **问题**: 类级 `@UseGuards(JwtAuthGuard, CurrentCommunityGuard)`，方法级又加 `@UseGuards(VerifiedMemberGuard)`，NestJS 合并不覆盖，实际 3 守卫叠加。
- **建议**: 明确守卫层级，避免不必要叠加。

### P-125 🟢 [topics] topic-suggestions 逻辑在 events/topics service 重复

- **位置**: `apps/api/src/modules/events/events.service.ts:246-262` 和 `apps/api/src/modules/topics/topics.service.ts:399-415`
- **问题**: tokenize + jaccard 逻辑完全重复，topicsService.suggestTopics 未被 controller 引用。
- **建议**: 删除 topics service 中的重复实现。

### P-126 🟡 [votes] list 返回字段远少于 VoteDto（P-43 子项，补行号）

- **位置**: `apps/api/src/modules/votes/votes.service.ts:15-24` vs `packages/shared/src/api.ts:351-364`
- **问题**: `list()` select 仅 9 字段，`VoteDto` 要求 `description`/`maxChoices`/`resultVisibility`/`options`（options 必选）。miniapp 标注 `PaginatedData<VoteDto>`，实际缺 4 字段。
- **建议**: 拆分 `VoteListItemDto`（轻量）和 `VoteDetailDto`（完整），或扩展 select。

### P-127 🟡 [votes] VoteDto 缺 createdAt 字段

- **位置**: `packages/shared/src/api.ts:351-364`
- **问题**: 后端 list/findOne 返回 `createdAt`，`VoteDto` 未声明。
- **建议**: shared 补 `createdAt: string`。

### P-128 🟢 [votes] VoteResultDto 未在 shared 定义

- **位置**: 小程序 `apps/miniapp/src/services/vote.ts:4-9`
- **问题**: 小程序本地定义 `VoteResultDto`，后端返回相同结构，shared 无对应 DTO。
- **建议**: 提升到 shared/api.ts。

### P-129 🟡 [committee] overview 无 shared DTO

- **位置**: 小程序 `apps/miniapp/src/services/committee.ts:9-13`
- **问题**: 本地 `CommitteeOverviewDto`，shared 无对应。
- **建议**: shared 补 DTO。

### P-130 🟡 [committee] members 列表缺 claimedUserId

- **位置**: `apps/api/src/modules/committee/committee.service.ts:34-43` vs `packages/shared/src/api.ts:322-332`
- **问题**: `getMembers` select 缺 `claimedUserId`，`CommitteeMemberDto` 要求该字段。
- **建议**: select 补 `claimedUserId`。

### P-131 🟡 [committee] member 详情无 shared DTO

- **位置**: 小程序 `apps/miniapp/src/services/committee.ts:15-17`
- **问题**: 本地 `CommitteeMemberDetailDto extends CommitteeMemberDto`（含 claims），shared 无对应。
- **建议**: shared 补 DTO。

### P-132 🟡 [committee] ClaimDto materialUrls 可选性不一致

- **位置**: 后端 `apps/api/src/modules/committee/dto/claim.dto.ts:7-10` vs `packages/shared/src/api.ts:334-337`
- **问题**: 后端 `@IsOptional()` 可选，shared `materialUrls: string[]` 必选。
- **建议**: 统一为可选 `materialUrls?: string[]`。

### P-133 🟡 [committee] myClaims 无 shared DTO

- **位置**: 小程序 `apps/miniapp/src/services/committee.ts:19-26`
- **问题**: 本地 `CommitteeMemberClaimDto`，shared 无对应。
- **建议**: shared 补 DTO。

### P-134 🟡 [committee] announcements 列表字段少于 DTO（P-43 子项，补行号）

- **位置**: `apps/api/src/modules/committee/committee.service.ts:140-148` vs `packages/shared/src/api.ts:339-347`
- **问题**: `getAnnouncements` select 仅 5 字段，`CommitteeAnnouncementDto` 要求 `content`/`images`/`publisherNickname` 3 个必选字段。
- **建议**: 拆分 `AnnouncementListItemDto` 和 `CommitteeAnnouncementDto`，或扩展 select。

### P-135 🟡 [committee] AnnouncementDto 缺 likeCount

- **位置**: `packages/shared/src/api.ts:339-347` vs 小程序 `apps/miniapp/src/services/committee.ts:47-49`
- **问题**: 后端详情返回 `likeCount`，shared DTO 未声明。miniapp 期望 `CommitteeAnnouncementDto & { isLiked; likeCount }`。
- **建议**: shared 补 `likeCount: number`。

### P-136 🟡 [committee] publisherNickname 可能是虚拟字段

- **位置**: `packages/shared/src/api.ts:344` vs `apps/api/src/modules/committee/committee.service.ts:161-180`
- **问题**: `CommitteeAnnouncementDto` 有 `publisherNickname: string`，但 service `getAnnouncementDetail` 用 `findFirst` 无 `include`，若 DB 用 `publisherId` 外键则返回无 `publisherNickname`。
- **建议**: 确认 DB 字段名，若为 `publisherId` 则 service 加 `include: { publisher: { select: { nickname: true } } }` 并映射。

### P-137 🟢 [committee] toggleAnnouncementLike 无 shared DTO

- **位置**: 小程序 `apps/miniapp/src/services/committee.ts:51-52`
- **问题**: miniapp 期望 `{ liked, likeCount }`，shared 无响应 DTO。
- **建议**: 可选，shared 补类型。

### P-138 🟡 [community-applications] create 返回原始 DB 记录非 DTO

- **位置**: `apps/api/src/modules/community-applications/community-applications.service.ts:22-24`
- **问题**: `create` 直接返回 `prisma.communityApplication.create(...)` 原始记录，缺 `CommunityApplicationDto` 的 `applicantNickname`/`applicantAvatarUrl`/`hasSupported`/`recentSupporters` 等字段。
- **建议**: 创建后调用 `toPublicDto` 转换。

### P-139 🟡 [community-applications] list 分页类型不一致

- **位置**: 小程序 `apps/miniapp/src/services/community-application.ts:19-22` vs 后端 `apps/api/src/modules/community-applications/community-applications.controller.ts:39`
- **问题**: miniapp 声明 `{ items, total }`，后端返回 `{ items, page, pageSize, total }`。
- **建议**: miniapp 改为 `PaginatedData<CommunityApplicationDto>`。

### P-140 🟡 [community-applications] me/supported 返回非 PaginatedData

- **位置**: `apps/api/src/modules/community-applications/community-applications.controller.ts:44-46, 51-53`
- **问题**: `listMine`/`listSupported` 返回 `{ items }`（无 page/pageSize/total），与 `list` 端点格式不同。
- **建议**: 保持现状（无分页合理），但 shared 补 `ListResponse<T>` 类型统一。

### P-141 🟢 [community-applications] support 返回类型无 shared DTO

- **位置**: 小程序 `apps/miniapp/src/services/community-application.ts:35`
- **问题**: miniapp 期望 `{ ok: boolean }`，shared 无 DTO。
- **建议**: 可选，shared 补类型。

### P-142 🟢 [community-applications] materialType 字符串字面量非枚举

- **位置**: 后端 `apps/api/src/modules/community-applications/dto/create-application.dto.ts:30-31` vs `packages/shared/src/api.ts:861`
- **问题**: 两端都用字符串字面量而非引用 `MaterialType` 枚举。
- **建议**: 统一引用 shared enums。

### P-143 🔴 [rankings] nickname/avatarUrl 嵌套 vs 扁平（P-43 子项，补行号）

- **位置**: shared `packages/shared/src/api.ts:298-310` vs 后端 `apps/api/src/modules/rankings/rankings.service.ts:248-264` vs 小程序 `apps/miniapp/src/pages/ranking/index.tsx:70`
- **问题**: `RankingItemDto` 定义扁平 `nickname`/`avatarUrl`，后端返回嵌套 `{ user: { id, nickname, avatarUrl } }`。小程序 `top3[1].nickname` 得 `undefined`，`nickname.slice(0, 1)` 崩溃。
- **建议**: controller 层做 DTO 映射 flatten，或 shared 改嵌套结构。

### P-144 🔴 [rankings] isVerified/thanksCount/latestAction 缺失（P-43 子项，补行号）

- **位置**: shared `packages/shared/src/api.ts:312-318` vs 后端 `apps/api/src/modules/rankings/rankings.service.ts:273-284`
- **问题**: `RankingItemDto` 定义 `isVerified`/`thanksCount`/`latestAction`，后端从 `rankingSnapshot` 表查询，该表不含这 3 字段，运行时缺失。
- **建议**: controller 层补充计算，或 DTO 移除。

### P-145 🔴 [rankings] getMyBadges 返回结构不匹配

- **位置**: 小程序 `apps/miniapp/src/services/ranking.ts:22-23` | 后端 `apps/api/src/modules/rankings/rankings.controller.ts:55-61`
- **问题**: miniapp 期望 `{ items: BadgeDto[] }`，后端返回 `{ badges, contributions }`。`body.data.items` 为 `undefined`，徽章页 `myBadgesData?.items ?? []` 永远空数组，所有徽章显示"未解锁"。
- **建议**: 后端改返回 `{ items: badges }`，或 miniapp 解构 `{ badges, contributions }`。

### P-146 🟡 [rankings] BadgeDto icon vs iconUrl

- **位置**: 小程序 `apps/miniapp/src/services/ranking.ts:5-10` vs 后端 `apps/api/src/modules/rankings/rankings.service.ts:286-298`
- **问题**: miniapp `BadgeDto` 有 `icon: string`，后端返回 `iconUrl: string | null`。徽章图标不显示。
- **建议**: 统一字段名。

### P-147 🟡 [rankings] list communityId 参数被忽略

- **位置**: 小程序 `apps/miniapp/src/services/ranking.ts:13` vs 后端 `apps/api/src/modules/rankings/rankings.controller.ts:14-27`
- **问题**: miniapp 传 `communityId` 作为查询参数，controller 用 `@CurrentCommunityId()` 注入，不接受查询参数。
- **建议**: controller 增加 `@Query('communityId')`，或 miniapp 去掉参数。

### P-148 🔴 [share] ShareCardConfig title vs shareTitle（P-43 子项，补行号）

- **位置**: shared `packages/shared/src/api.ts:415-422` vs 后端 `apps/api/src/modules/share/share.service.ts:80-89` vs 小程序 `apps/miniapp/src/pages/event-detail/index.tsx:131-132`
- **问题**: `ShareCardConfig` 定义 `title`/`path`，后端返回 `shareTitle`/`sharePath`。所有消费方（event-detail/market-detail/committee-announcement/vote-detail）用 `shareConfig.title`/`shareConfig.path` 得 `undefined`，分享功能完全失效。
- **建议**: 后端改返回 `title`/`path`，或 shared 和所有消费方改 `shareTitle`/`sharePath`。

### P-149 🟡 [share] disabledReason undefined vs null

- **位置**: shared `packages/shared/src/api.ts:420` vs 后端 `apps/api/src/modules/share/share.service.ts:80-89`
- **问题**: `ShareCardConfig.disabledReason` 为 `string | null`，后端未赋值时为 `undefined`，JSON 中缺字段而非 `null`。
- **建议**: 后端显式 `disabledReason: disabledReason ?? null`。

### P-150 🟢 [share] logShare 返回类型 unknown

- **位置**: 小程序 `apps/miniapp/src/services/share.ts:8-9`
- **问题**: `http.post('/share/logs', data)` 无泛型参数，类型为 `unknown`，后端实际返回 `{ id, createdAt }`。
- **建议**: 补 `http.post<{ id: string; createdAt: string }>`。

### P-151 🟡 [banners] 分页字段缺失

- **位置**: 小程序 `apps/miniapp/src/services/banner.ts:5-6` vs 后端 `apps/api/src/modules/banners/banners.controller.ts:9-13`
- **问题**: miniapp 声明 `PaginatedData<BannerDto>`（含 page/pageSize/total），controller 返回 `{ items }`（无分页字段）。
- **建议**: miniapp 改为 `{ items: BannerDto[] }`，或 controller 补分页字段。

### P-152 🟡 [banners] communityId 查询参数被忽略

- **位置**: 小程序 `apps/miniapp/src/services/banner.ts:5-6` vs 后端 `apps/api/src/modules/banners/banners.controller.ts:10`
- **问题**: miniapp 传 `communityId` 作为查询参数，controller 用 `@CurrentCommunityId() @Optional()` 且无 `CurrentCommunityGuard`。无 guard 时 `CurrentCommunityId()` 可能返回 `undefined`，service 始终只返回全局 banner。
- **建议**: controller 增加 `@Query('communityId')`，或添加 `CurrentCommunityGuard`。

### P-153 🟡 [serviceProviders] 分页字段缺失

- **位置**: 小程序 `apps/miniapp/src/services/banner.ts:10-11` vs 后端 `apps/api/src/modules/serviceProviders/service-providers.controller.ts:14-18`
- **问题**: 同 P-151，miniapp 声明 `PaginatedData`，controller 返回 `{ items }`。
- **建议**: 同 P-151。

### P-154 🟢 [serviceProviders] DTO 缺 coverUrl/sortOrder/createdAt

- **位置**: `apps/api/src/modules/serviceProviders/service-providers.service.ts:22-35` vs `packages/shared/src/api.ts:388-398`
- **问题**: 后端返回 `coverUrl`/`sortOrder`/`createdAt`，`ServiceProviderDto` 未声明。小程序未使用这些字段，不影响功能。
- **建议**: 如需使用，shared 补字段。

### 横向检查结论

- **响应包装（R8 红线）**: 所有 controller 均用 `{ code, message, data }` 包装 ✅
- **错误码（R9 红线）**: 后端用 NestJS 内置 exception，由 `AllExceptionsFilter` 映射为 `ErrorCodes` 枚举值 ✅
- **notifications 模块**: ✅ 三端完全一致，无差异
- **upload 模块**: ✅ 三端完全一致，无差异

---

## 汇总

| 严重度      | 数量    | 编号                                                                                                                                                                                                                                                                                 |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔴 阻塞发布 | 19      | P-01, P-06, P-22, P-24, P-41, P-42, P-43, P-46, P-55, P-69, P-72, P-88, P-89, P-99, P-100, P-143, P-144, P-145, P-148                                                                                                                                                                |
| 🟡 建议修   | 85      | P-02~P-05, P-07~P-10, P-16~P-21, P-23, P-25, P-36~P-38, P-44, P-45, P-47~P-49, P-56, P-58, P-61, P-63, P-67, P-68, P-71, P-73, P-74, P-78, P-79, P-80~P-84, P-90~P-94, P-101~P-107, P-109~P-114, P-116~P-123, P-126~P-127, P-129~P-136, P-138~P-140, P-146~P-147, P-149, P-151~P-153 |
| 🟢 可延后   | 50      | P-11~P-15, P-26~P-35, P-39, P-40, P-50~P-54, P-57, P-59, P-60, P-62, P-64~P-66, P-70, P-75~P-77, P-85~P-87, P-95~P-98, P-108, P-115, P-124~P-125, P-128, P-137, P-141~P-142, P-150, P-154                                                                                            |
| **合计**    | **154** |                                                                                                                                                                                                                                                                                      |
