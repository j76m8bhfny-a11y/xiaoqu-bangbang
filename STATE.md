# 小区帮 项目状态

## 当前阶段: verify（验证阶段）

## 日期: 2026-08-04

## 当前分支: feature/guide-module @ b33dee14

## 本轮完成的工作

### 修复 3 个 UI/交互问题

1. 待办事项缺"已完成"入口 - home 页加"已完成互助"入口
2. 数量不一致 - badge 数（仅活跃事件）与列表数（全部事件）不匹配 -> 传 status 参数
3. 已完成事件应置灰+沉底 - 邻里帮列表已完成事件无视觉区分

### 改动文件（11 个）

**后端（4 文件）:**

- `packages/shared/src/api.ts` - MyDashboardDto 加 myCompletedEventCount; EventListQuery.status 改为 string
- `apps/api/src/modules/auth/auth.service.ts` - getDashboard 加 myCompletedEventCount
- `apps/api/src/modules/events/events.service.ts` - status 支持逗号分隔; 内存排序已完成沉底; count 补 status 过滤
- `apps/api/src/modules/feed/feed.service.ts` - 内存排序已完成沉底

**前端（7 文件）:**

- `apps/miniapp/src/store/community.ts` - PendingEventsFilter 接口
- `apps/miniapp/src/pages/home/index.tsx` - 待办加"已完成互助"入口
- `apps/miniapp/src/pages/events/index.tsx` - statusFilter state; useDidShow 读取; 空状态文案
- `apps/miniapp/src/components/event-card/index.tsx` - EventCardData 加 isInactive
- `apps/miniapp/src/utils/mappers.ts` - 三个映射函数设置 isInactive
- `apps/miniapp/src/components/masonry-card/index.tsx` - 已完成卡片加 inactive class
- `apps/miniapp/src/components/masonry-card/index.scss` - 置灰样式

### typecheck 修复

- shared build: 通过
- 后端 typecheck: 通过（修复了 2 个本轮引入的错误）
  - 移除 `Prisma.raw()` orderBy（Prisma 不支持 raw SQL 在 orderBy），改为内存排序
  - 移除不再需要的 `import { Prisma } from '@prisma/client'`
- 前端 typecheck: 预存在错误（非本轮引入），包括 guideFilter 类型、Icon "book" 等

## 待办

### 需要用户操作

- weapp-dev-mcp 连接断开（进程被杀），需要重启 Claude Code 或 /mcp 重连
- weapp-dev-mcp 配置已更新: `WEAPP_WS_ENDPOINT=ws://localhost:9420`
- 微信开发者工具自动化端口 9420 已通过 `cli auto --auto-port 9420` 开启

### 重连后验证 3 个场景

1. home 页"待办提醒"同时显示"进行中互助"和"已完成互助"两个入口
2. 点击"进行中互助" -> events 页"我的"filter -> 列表数量与 badge 一致
3. "全部"filter 下已完成事件置灰且排在列表底部

### 遗留事项

- 临时登录框：发布前需删除
- 预存在 typecheck 错误: ~15 个（非本轮引入）
- E2E: M22+M23 90 检查点 pass 58/partial 3/skip 27/fail 2; UI 类 27 项待 weapp-dev-mcp
- 3 个待确认 finding: petMeta 内部校验 / reject 接口 / takedown 状态守卫
- 工作流要求: 每个开发批次完成后自动跑 /review

## 关键决策

- Prisma orderBy 不支持 raw SQL -> 改用内存排序（与 feed.service.ts 一致）
- weapp-dev-mcp 端口从 14198 改为 9420（用 `cli auto --auto-port 9420` 固定端口）

## 下步行动

等 weapp-dev-mcp 重连后验证 3 个场景，然后跑 /review
