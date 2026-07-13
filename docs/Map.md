# 左邻右帮 — 全局地图 (Map)

> 锁版基线文档。本文件描述产品当前真实形态，作为 Spec.md 与 Standard.md 的上位索引。
> 最后扫描日期: 2026-07-13 | 版本: v0.2.1 (对齐 PRD v0.7.0, 新增图文教程模块)

---

## 一、核心目标 (一句话)

**一个让同小区邻居互相帮忙、议事、流转闲置，并通过小红花/排行榜/勋章激励持续互助的公益型社区微信小程序。**

---

## 二、关联资源索引

### 2.1 仓库结构

```
xiaoqu-bangbang-main/
├── apps/
│   ├── api/          NestJS 后端 (19 模块, 3000 端口)
│   ├── miniapp/      Taro 微信小程序 (33 注册页面)
│   └── admin/        Next.js 管理后台 (20 个 page.tsx, 含根重定向, 19 功能页)
├── packages/
│   └── shared/       前后端共享契约 (api.ts 930行 + enums.ts)
├── docs/
│   ├── Map.md        ← 本文件
│   ├── Spec.md       规格骨架
│   ├── Standard.md   验收标尺
│   └── superpowers/  历史设计/计划文档
├── docker-compose.yml  PostgreSQL 16 (宿主机 5433 → 容器 5432)
└── package.json        pnpm workspace monorepo
```

### 2.2 技术栈

| 层       | 技术                                                                  | 关键依赖                            |
| -------- | --------------------------------------------------------------------- | ----------------------------------- |
| 小程序   | Taro 4 + React 18 + TypeScript                                        | Zustand (状态), Taro.request (HTTP) |
| 后端     | NestJS 10 + Prisma 5 + PostgreSQL 16                                  | Passport-JWT, Multer, Vitest        |
| 管理后台 | Next.js 14 (App Router) + Ant Design 5                                | TanStack Query, Zustand, Axios      |
| 共享     | TypeScript 包 `@xiaoqu-bangbang/shared`                               | 纯类型导出, 0 运行时依赖            |
| 工具链   | pnpm 10, Husky, lint-staged, commitlint, ESLint flat config, Prettier | Node ≥ 20                           |

### 2.3 关键代码位置

| 资源                       | 路径                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| 共享契约 (DTO/枚举/错误码) | `packages/shared/src/{api.ts, enums.ts, index.ts}`                         |
| 数据库 Schema              | `apps/api/prisma/schema.prisma` (54 张表)                                  |
| 后端模块                   | `apps/api/src/modules/*` (20 个模块)                                       |
| 后端测试                   | `apps/api/test/*.spec.ts` (10 个) + `apps/api/test/extra/*.spec.ts` (8 个) |
| 小程序页面                 | `apps/miniapp/src/pages/*` (35 个注册页, 另有 1 个已注释保留: mine)        |
| 小程序状态                 | `apps/miniapp/src/store/{auth,community,notification}.ts`                  |
| 小程序服务层               | `apps/miniapp/src/services/*` (16 个 Service 文件)                         |
| 小程序契约适配             | `apps/miniapp/src/utils/mappers.ts` (DTO → 展示模型)                       |
| Admin 页面                 | `apps/admin/src/app/*` (21 个 page.tsx, 含根重定向, 20 功能页)             |
| 迁移文件                   | `apps/api/prisma/migrations/` (8 次迁移)                                   |
| 种子数据                   | `apps/api/prisma/seed*.ts` (3 份)                                          |

### 2.4 启动命令速查

| 操作               | 命令                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| 启动数据库         | `docker compose up -d`                                                                 |
| 应用迁移           | `pnpm db:migrate` (开发) / `pnpm --filter @xiaoqu-bangbang/api db:migrate:prod` (生产) |
| 生成 Prisma Client | `pnpm db:generate`                                                                     |
| 种子数据           | `pnpm --filter @xiaoqu-bangbang/api db:seed`                                           |
| 启动后端           | `pnpm dev:api` (3000 端口)                                                             |
| 启动小程序         | `pnpm dev:miniapp` (编译到 weapp)                                                      |
| 启动 Admin         | `pnpm dev:admin`                                                                       |
| 运行测试           | `pnpm test` (全局) / `pnpm test:e2e` (API)                                             |
| Lint               | `pnpm lint` / `pnpm lint:fix`                                                          |
| 构建               | `pnpm build:api` / `pnpm build:miniapp` / `pnpm build:admin`                           |

---

## 三、术语表

### 3.1 角色与身份

| 术语         | 代码标识                                         | 含义                                          |
| ------------ | ------------------------------------------------ | --------------------------------------------- |
| 普通居民     | `MemberRole.RESIDENT` (`resident`)               | 默认角色, 选择小区后自动创建 community_member |
| 业委会管理员 | `MemberRole.COMMITTEE_ADMIN` (`committee_admin`) | 业委会成员, 管理本小区公告等                  |
| 平台管理员   | `MemberRole.PLATFORM_ADMIN` (`platform_admin`)   | 平台运营, 管理所有小区                        |
| 志愿者       | `MemberRole.VOLUNTEER` (`volunteer`)             | 预留角色                                      |
| 业主认证     | `VerifyStatus.VERIFIED` (`verified`)             | 通过材料认证的业主, 可发布内容                |
| 待认证       | `VerifyStatus.PENDING` (`pending`)               | 已提交材料待审核                              |
| 未认证       | `VerifyStatus.UNVERIFIED` (`unverified`)         | 默认状态, 不可发布内容                        |
| 已驳回       | `VerifyStatus.REJECTED` (`rejected`)             | 认证被拒                                      |

### 3.2 核心业务实体

| 术语     | 代码标识                | 含义                                                                                                                                                         |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 小区     | `Community`             | 互助的最小地理单元, 所有业务数据按小区隔离                                                                                                                   |
| 社群     | `SocialGroup`           | 小区内的兴趣/楼栋群入口 (可见性分 public/verified_only); 小程序端已上线, 见 plaza 社群入口卡片                                                               |
| 事件     | `Event`                 | 邻里互助的基本单元 (求助/公益/寻物/反馈/讨论 5 类, 分互助类和议事类两大类)                                                                                   |
| 闲置     | `MarketItem`            | 二手物品 (出售/免费/交换, 含成色等级)                                                                                                                        |
| 教程     | `Guide`                 | 图文教程 (使用指南/维修排障/保养维护/其他 4 类, Admin 人工审核)                                                                                              |
| 议题     | `Topic`                 | 社区公共议题, 关联多个事件, 支持赞踩/评分/讨论                                                                                                               |
| 投票     | `Vote`                  | 社区投票 (单选/多选, 结果可见性可控)                                                                                                                         |
| 业委会   | `CommitteeMember`       | 业委会成员, 支持身份认领                                                                                                                                     |
| 公告     | `CommitteeAnnouncement` | 业委会发布的官方信息                                                                                                                                         |
| 小红花   | `flowerCount`           | 贡献度积分单位, 五套激励体系各自发放 (互助/议事/议题/小区创建/教程)                                                                                          |
| 贡献分   | `score`                 | 排行榜积分, 由小红花等汇总                                                                                                                                   |
| 勋章     | `Badge`                 | 贡献成就 (互助: helper_1/5/20, flower_10/50; 议事: feedback_5/20; 议题: topic_1/5; 教程: guide_1/5/20; 特殊: first_owner_top30, founder, seed)               |
| 排行榜   | `RankingSnapshot`       | 按月/总榜的排名快照                                                                                                                                          |
| 小区申请 | `CommunityApplication`  | 用户申请新开小区, 支持邻居助力                                                                                                                               |
| 举报     | `Report`                | 对事件/评论/闲置/议题/投票/教程/教程评论的举报 (10 种目标: event/event_comment/market_item/market_comment/topic/topic_comment/vote/guide/guide_comment/user) |
| Banner   | `Banner`                | 运营位轮播图 (首页/事件列表/闲置列表)                                                                                                                        |
| 服务商   | `ServiceProvider`       | 小区推荐的便民服务                                                                                                                                           |
| 通知     | `Notification`          | 站内消息 (9 种类型: review_result/event_response/completion/badge/feedback/vote/announcement/topic_closed/system)                                            |
| 分享卡片 | `ShareCardConfig`       | 分享到微信会话的卡片配置                                                                                                                                     |
| AI审核   | `AiReviewLog`           | 内容自动审核记录 (Mock 实现)                                                                                                                                 |

### 3.3 事件类型 (EventType)

> `help_offer`（我能帮忙）已从事件类型移除，改为个人技能档案（详见 PRD §4.19）。当前 5 种事件类型，分互助类和议事类两大类，各自走不同生命周期（详见 §3.4）。

| 标签     | 代码              | 分类 | 含义                   | 默认 CTA |
| -------- | ----------------- | ---- | ---------------------- | -------- |
| 求助     | `help_request`    | 互助 | 请求邻居帮助           | 我来帮   |
| 公益     | `public_welfare`  | 互助 | 公益活动               | 我要报名 |
| 寻宠寻物 | `lost_found`      | 互助 | 失物招领               | 提供线索 |
| 公共反馈 | `public_feedback` | 议事 | 议事类反馈, 必须挂议题 | 关注进展 |
| 讨论     | `discussion`      | 议事 | 议事讨论, 必须挂议题   | 参与讨论 |

### 3.4 状态机术语

| 实体           | 状态流转                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 事件（互助类） | `pending_review` → `open` → `in_progress` (有人响应) → `processing` (选中帮手) → `completed` (双方确认) / `closed` / `rejected`           |
| 事件（议事类） | `pending_review` → `open` (审核通过即发激励) → `closed` (创建者关闭) / `rejected`                                                         |
| 闲置           | `pending_review` → `on_sale` → `sold` / `closed` / `rejected`                                                                             |
| 议题           | `pending_review` → `open` → `closed` (完结, 含总结和评分) / `rejected` ← `closed` 可被管理员 reopen (清空关闭信息和已有评分, 回到 `open`) |
| 投票           | `draft` → `published` → `closed`                                                                                                          |
| 教程           | `pending_review` -> `published` (Admin 审核通过, 触发激励) / `rejected` (含驳回原因)                                                      |
| 业主认证       | `unverified` → `pending` → `verified` / `rejected` / `manual_review`                                                                      |
| 小区申请       | `pending` → `approved` / `rejected`                                                                                                       |
| AI 审核        | `pending` → `pass` / `reject` / `manual_review`                                                                                           |

### 3.5 技术术语

| 术语           | 含义                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| 小区数据隔离   | 所有业务数据按 `communityId` 过滤, `CurrentCommunityGuard` 强制要求已选小区                                         |
| 匿名脱敏       | `maskAnonymous()` 对非本人隐藏事件 `creator`, 本人保留 `creatorId`                                                  |
| 契约单一真相源 | `packages/shared/src/api.ts` 是前后端共享的 DTO 唯一定义点                                                          |
| 双方确认完成   | 事件需 creator + helper 都确认才算 `completed`, 触发积分/勋章                                                       |
| 幂等发徽章     | 前 30 名认证业主颁发 `first_owner_top30`, 重复发放会被唯一约束拦截                                                  |
| occurredAt     | 贡献记录时间 (事件完成/审核通过那一刻写入), 区别于事件创建时间 `createdAt`; 月榜按此字段过滤当月贡献                |
| 评论嵌套限制   | 事件/闲置/议题评论嵌套最多 2 层, 第 3 层返回 400 (R15)                                                              |
| 五套激励体系   | 互助 (事件完成)、议事 (事件审核通过)、议题 (议题审核通过)、小区创建 (申请通过)、教程 (Admin 审核通过), 各自独立计算 |
| 事件自动过期   | open/in_progress/processing 超 30 天无新响应自动转 closed; EventsCron 每天凌晨 3 点执行 (P-78 已实现)               |

---

## 四、红线规则 (不可触碰的限制条件)

> 以下规则在锁版审查与后续修改中**绝对不可违反**。任何改动若触碰红线, 必须显式回滚或阻断发布。

### 4.1 安全红线

| #   | 红线                                                                                                                                                  | 违反后果                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| R1  | **匿名事件发布者身份不可泄露** — 后端 `maskAnonymous()` 必须在返回给非本人前剥离 `creator` 字段                                                       | 抓包即可去匿名化, 破坏信任基础     |
| R2  | **小区数据隔离不可绕过** — 所有业务 Service 方法必须接收 `communityId` 并在 Prisma `where` 中过滤; `@SkipCurrentCommunity()` 仅限 platform_admin 场景 | 跨小区数据串扰, 邻居看到别小区隐私 |
| R3  | **未认证用户不可发布内容** — 事件/闲置/评论/议题发布必须经过 `VerifiedMemberGuard`                                                                    | 垃圾内容泛滥, 无法追溯             |
| R4  | **JWT 不可伪造** — `JWT_SECRET` 必须从环境变量读取, 开发默认值不得带入生产                                                                            | 任意账号可被冒充                   |
| R5  | **认证材料原图必须删除** — `verifications` 通过后 `originalFileUrl` 标记待删除, 不可长期留存                                                          | 敏感身份证件泄露风险               |
| R6  | **管理操作必须留审计日志** — admin 所有写操作写入 `audit_logs`, 不可静默                                                                              | 操作不可追溯, 事故无法定责         |

### 4.2 契约红线

| #   | 红线                                                                                            | 违反后果                   |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------- |
| R7  | **`packages/shared/src/api.ts` 是契约唯一真相源** — 修改 DTO/枚举必须前后端同步, 不可只改一端   | 前后端类型不一致, 运行时崩 |
| R8  | **后端响应必须用 `ApiResponse<T>` 包装** — `{ code, message, data }`, 分页用 `PaginatedData<T>` | 前端解析失败               |
| R9  | **错误码必须来自 `ErrorCodes` 枚举** — 不可硬编码魔法数字                                       | 错误处理逻辑散乱, 无法维护 |

### 4.3 流程红线

| #   | 红线                                                                                                                                  | 违反后果                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| R10 | **发布前必须删除临时登录框** — `apps/miniapp/src/pages/login/index.tsx` 中的 "用指定 code 登录" 输入框标注 "测完删除", 发布版必须移除 | 任意用户可伪造身份登录   |
| R11 | **事件完成必须双方确认** — 不可单方标记 `completed`, 不可跳过积分/勋章发放                                                            | 贡献度统计失真, 激励失效 |
| R12 | **助力不可给自己** — `community-applications/:id/support` 必须校验 `applicantId !== userId`                                           | 刷数据漏洞               |
| R13 | **投票一人一票** — `vote_records` 的 `UNIQUE(voteId, userId)` 不可移除                                                                | 投票可刷, 结果失真       |
| R14 | **感谢不可重复** — 同一事件对同一人只能感谢一次 (`UNIQUE(eventId, fromUserId, toUserId)`)                                             | 感谢刷分                 |
| R15 | **评论嵌套不超过 2 层** — 事件/闲置/议题评论第 3 层必须拒绝 (返回 400)                                                                | 无限嵌套导致 UI 崩溃     |

### 4.4 本期范围红线 (锁版约束)

| #   | 红线                                                                                            | 说明           |
| --- | ----------------------------------------------------------------------------------------------- | -------------- |
| R16 | **不对接真实 AI/OCR** — 本期 `AiReviewService` 和 `OcrService` 保持 Mock 实现, 不接入真实服务商 | 锁版不加新依赖 |
| R17 | **不引入支付** — 闲置交易仅线上联系, 不接入微信支付                                             | 锁版不加新功能 |
| R18 | **不修改数据库迁移历史** — 8 次迁移已应用, 不可回改, 新改动只能加新迁移                         | 生产数据安全   |
| R19 | **CI/CD 暂不引入** — 本期无 `.github/workflows`, 测试靠本地 `pnpm test`                         | 锁版不加基建   |

### 4.5 基建注意事项

| #   | 事项                                                                                                                                                                    | 说明                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| N1  | **数据库端口不一致** — `docker-compose.yml` 映射 `5433:5432`, 但 `.env.example` 的 `DATABASE_URL` 写的是 `localhost:5432`。首次启动必须把 `.env` 改成 `5433` 否则连不上 | 已知配置漂移, 列入问题清单 |
| N2  | **小程序/admin 零测试** — 仅 API 有自动化测试, 小程序和 admin 完全靠手工验收                                                                                            | 测试缺口, 验收时重点关照   |
| N3  | **`TESTING.md` 已过时** — 只覆盖早期功能, 以 `ACCEPTANCE.md` 为准                                                                                                       | 文档冲突, 待整合           |
| N4  | ~~**事件无自动过期**~~ — 已实现 (EventsCron 每天凌晨 3 点关闭 30 天无新响应的互助事件, Batch 4)                                                                         | ✅ 已修复                  |

---

## 五、模块全景图

```
┌─────────────────────────────────────────────────────────────┐
│                     packages/shared (契约)                    │
│          api.ts (DTO) + enums.ts (枚举) + ErrorCodes          │
└────────────────────────┬────────────────────────────────────┘
                         │ 共享类型
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   apps/api          apps/miniapp      apps/admin
   (20 模块)          (35 页面)         (20 功能页)
        │                │                │
        ├─ auth          ├─ login         ├─ dashboard
        ├─ communities   ├─ community-*   ├─ reviews
        ├─ verifications ├─ verify        ├─ events
        ├─ events        ├─ events/*      ├─ topics
        ├─ market        ├─ market/*      ├─ market
        ├─ guides        ├─ guide*        ├─ guides
        ├─ topics        ├─ topic*        ├─ verifications
        ├─ votes         ├─ vote*         ├─ community-applications
        ├─ committee     ├─ committee*    ├─ committee*
        ├─ rankings      ├─ ranking       ├─ votes
        ├─ notifications ├─ notifications ├─ banners
        ├─ banners       ├─ (plaza 用)    ├─ service-providers
        ├─ serviceProviders ├─ service-*  ├─ rankings
        ├─ share         ├─ (各详情分享)   ├─ reports
        ├─ upload        ├─ (通用上传)     ├─ audit-logs
        ├─ ocr (Mock)    │                ├─ share
        ├─ ai-review (Mock)│              ├─ settings
        ├─ community-applications ├─ community-apply* ├─ social-groups
        └─ admin (后台API) │                └─ ...
                          ├─ home (我的)
                          ├─ plaza (小区事)
                          └─ profile-edit / user-profile / badges / settings
```

**依赖分层** (自底向上):

1. **地基层**: auth → communities → verifications (+ ocr + ai-review)
2. **业务层**: events, market, topics, votes, committee, community-applications, guides
3. **激励层**: rankings, notifications, share
4. **支撑层**: banners, serviceProviders, upload, reports
5. **后台层**: admin (聚合所有模块的管理端)
