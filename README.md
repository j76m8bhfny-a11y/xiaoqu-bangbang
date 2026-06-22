# 小区帮榜棒

> 让小区里的好事，被看见

小区帮榜棒是一个面向小区居民的公益型社区互助微信小程序。

## 技术栈

| 层 | 技术 |
|---|---|
| 小程序 | Taro + React + TypeScript + Zustand |
| 后端 API | NestJS + Prisma + PostgreSQL |
| 管理后台 | Next.js + Ant Design + TanStack Query |
| 共享包 | @xiaoqu-bangbang/shared (枚举、类型、DTO) |
| 包管理 | pnpm workspace (monorepo) |

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

| 命令 | 说明 |
|---|---|
| `pnpm dev:api` | 启动后端开发服务 |
| `pnpm dev:miniapp` | 启动小程序开发 |
| `pnpm dev:admin` | 启动管理后台开发 |
| `pnpm build:api` | 构建后端 |
| `pnpm build:miniapp` | 构建小程序 |
| `pnpm build:admin` | 构建管理后台 |
| `pnpm db:migrate` | 运行数据库迁移 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm lint` | 全局 lint |
| `pnpm test` | 全局测试 |

## 核心约束

- **不做站内即时聊天** — 只做评论、留言、系统通知
- **不做平台支付** — 互助和交易均线下协商
- **每个小区独立社群** — 所有业务数据按 `community_id` 隔离
- **不做微服务** — 单体 NestJS 即可支撑首版
- **AI/OCR 首版 mock** — 后续替换真实服务

## 开发阶段

按 `claude/08_CLAUDECODE_TASKS.md` 分阶段开发，每完成一个阶段等待确认后再继续。

## UI 风格

奶油底色 + 活力青绿/暖橙 CTA + 圆角卡片 + 小红花荣誉感，参考年轻活动社区的活动化、卡片化、强参与感气质。
