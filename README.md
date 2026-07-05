# 小区帮榜棒

> 让小区里的好事，被看见

小区帮榜棒是一个面向小区居民的公益型社区互助微信小程序。

## 技术栈

| 层       | 技术                                      |
| -------- | ----------------------------------------- |
| 小程序   | Taro + React + TypeScript + Zustand       |
| 后端 API | NestJS + Prisma + PostgreSQL              |
| 管理后台 | Next.js + Ant Design + TanStack Query     |
| 共享包   | @xiaoqu-bangbang/shared (枚举、类型、DTO) |
| 包管理   | pnpm workspace (monorepo)                 |

## 项目结构

```
xiaoqu-bangbang/
├── apps/
│   ├── miniapp/          # Taro 微信小程序
│   ├── admin/            # Next.js 管理后台
│   └── api/              # NestJS 后端 API
├── packages/
│   └── shared/           # 共享枚举、类型、API DTO
├── docker-compose.yml    # 本地 PostgreSQL
├── .env.example          # 环境变量模板
└── package.json          # monorepo 根配置
```

## 快速开始

### 前置要求

- Node.js >= 20
- pnpm >= 9
- Docker (用于本地 PostgreSQL)

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动 PostgreSQL

```bash
docker compose up -d
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 修改数据库连接、微信配置等
```

### 4. 初始化数据库

```bash
pnpm db:migrate
```

### 5. 启动开发服务

```bash
# 后端 API (http://localhost:3000)
pnpm dev:api

# 小程序 (需微信开发者工具)
pnpm dev:miniapp

# 管理后台 (http://localhost:3001)
pnpm dev:admin
```

## 常用命令

| 命令                 | 说明               |
| -------------------- | ------------------ |
| `pnpm dev:api`       | 启动后端开发服务   |
| `pnpm dev:miniapp`   | 启动小程序开发     |
| `pnpm dev:admin`     | 启动管理后台开发   |
| `pnpm build:api`     | 构建后端           |
| `pnpm build:miniapp` | 构建小程序         |
| `pnpm build:admin`   | 构建管理后台       |
| `pnpm db:migrate`    | 运行数据库迁移     |
| `pnpm db:generate`   | 生成 Prisma Client |
| `pnpm db:studio`     | 打开 Prisma Studio |
| `pnpm lint`          | 全局 lint          |
| `pnpm test`          | 全局测试           |

## 核心约束

- **不做站内即时聊天** — 只做评论、留言、系统通知
- **不做平台支付** — 互助和交易均线下协商
- **每个小区独立社群** — 所有业务数据按 `community_id` 隔离
- **不做微服务** — 单体 NestJS 即可支撑首版
- **AI/OCR 首版 mock** — 后续替换真实服务

## 开发阶段

PRD 锁版开发 7 批次（22 任务）+ Ponytail 缺口处理已全部完成，进入验收期。

### 当前状态

| 项               | 值                          |
| ---------------- | --------------------------- |
| HEAD             | `4a8934c`                   |
| 领先 origin/main | 103 commits                 |
| 测试             | 233 passed / 4 skipped      |
| Prisma 迁移      | 8 次                        |
| 数据库表         | 49 张                       |
| 小程序注册页     | 33 个（1 个注释保留: mine） |
| 后端模块         | 19 个                       |
| Admin 功能页     | 19 个                       |

### 已实现功能

- **v0.1.0 MVP**：认证/小区/事件/闲置/议题/投票/业委会/排行榜/通知/分享/Banner/服务商/上传/举报/AI审核(Mock)
- **议事榜 + 小区申请闭环 + 业主认证强化 + Sprint 2 杂项**
- **PRD 7 批次开发**（详见 `ACCEPTANCE.md` Part C11-C16）：
  - Batch 1: G5门禁/onlyVerified清理/help_offer废弃/通知路由/闲置下架/仪表盘/头像上传
  - Batch 2: CTA状态映射/议题评论嵌套/社群入口
  - Batch 3: 事件结构化评价/闲置评价列表
  - Batch 4: 事件自动过期(@nestjs/schedule)/月榜重算cron
  - Batch 5: 闲置意向系统(MarketInterest+markSold选买家+评价校验)
  - Batch 6: 多帮手流程(EventParticipant表+逐个确认发花)
  - Batch 7: 个人技能档案(UserSkill+Jaccard匹配+技能管理UI)

## UI 风格

奶油底色 + 活力青绿/暖橙 CTA + 圆角卡片 + 小红花荣誉感，参考年轻活动社区的活动化、卡片化、强参与感气质。全站色彩迁移已完成。
