# 变更日志

本文件记录「小区帮榜棒」的重要变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [未发布]

### 安全

- 匿名事件后端脱敏：`events` 列表与详情接口对「非本人」隐藏真实发布人（`creator=null`、`creatorId` 抹除），本人保留 `creatorId` 以支持编辑按钮。修复抓包可破解匿名身份的 P0 隐私问题。（commit `7689df5`）
- 跨小区数据防护：修复认证审核、内容审核、dashboard、反馈日志、举报、社群、Banner、ServiceProvider 等模块的跨小区越权漏洞（P-251/P-301/P-302/P-307/P-308/P-310/P-334/P-338-340）。（commits `8d09a4b`, `0ab40e0`, `844538d`, `4ffb0b0`, `b12a977`）
- 投票跨小区漏洞修复 + 始终要求认证（P-24/P-06）。（commits `514e455`, `32f253e`）
- sendThanks 防欺诈：不传 toUserId 时自动从事件推导（P-99）。（commit `fea8fa2`）
- rejectCommunityApplication 的 reason 改为必填（P-333）。（commit `76acbd8`）

### 新增

- **Batch 1**：G5 门禁清理 / onlyVerified 移除 / help_offer 废弃 / 通知跳转路由补全 / 闲置卖家下架 / 仪表盘补全 / 头像上传。（commit `7c9d190`）
- **Batch 2**：事件 CTA 状态映射 / 议题评论嵌套 / 社群入口小程序端上线。（commit `0fba0d4`）
- **Batch 3**：事件结构化评价表单 + 闲置评价列表 + 评价 UI。（commit `3c322b5`）
- **Batch 4**：@nestjs/schedule 定时任务 — 事件自动过期（EventsCron 每天凌晨 3 点关闭 30 天无响应事件）+ 月榜重算 cron。（commit `51423f4`）
- **Batch 5**：闲置意向系统 — MarketInterest 表 + "我想要" + markSold 选买家 + 评价校验。（commit `62f3ec4`）
- **Batch 6**：多帮手流程 — EventParticipant 表 + 多选参与者 + 逐个确认发花。（commit `04688e3`）
- **Batch 7**：个人技能档案 — UserSkill 表 + Jaccard 匹配 + 技能管理 UI + 事件详情匹配列表。（commit `3c4f5b5`）
- **Ponytail 缺口处理**：cron updatedAt 精确捕获状态变更 / 技能图片上传 / 事件评价列表 GET 端点 / 多帮手 sendThanks+rateHelper 适配。（commits `f62a5e3`, `7c4cd46`, `6e178b7`, `9615a10`）
- 全局 UI 重设计：草木绿主题 + 老年人友好 + 议题详情页重构。（commits `3fd56d7`, `4ff661e`, `e3d71bc`, `7602c03`）
- 发起议题页面 `pages/topic-create`。（commit `2ff6177`）
- `/health` 探活端点。（commit `32bf4a6`）

### 修复

- **45 个 🔴 阻塞 bug 清零**：月榜未按月过滤（P-72）、积分映射 bug（P-01）、投票重复返回 400→409（P-252）、评论嵌套限制（P-224/P-237）、重复响应/评价捕获 P2002（P-222/P-238）、事件创建者积分补全（P-273~P-275）、勋章规则补全（P-277~P-279）、helper 徽章计数排除创建者、originalFileDeletedAt 标记时机（P-216）等。详见 `docs/findings.md` 各 P- 问题末尾标注。
- **契约对齐修复**：DTO 字段补全、snake_case→camelCase 统一、RankingItemDto/BadgeDto/ShareCardConfig 等结构对齐 shared 契约（P-43/P-88/P-89/P-143~P-149/P-164/P-191）。（commits `d2cd569`, `b987c7d`, `ae883a1`, `5d2fe07`, `76eaadf`, `19c95b3` 等）
- **Review 修复**（5 轮）：R7 契约违反（MarketReviewDto 补 shared、SelectParticipantRequest）、capacity 默认值、申请状态校验、通知措辞、事件类型过滤、wechatId 端到端、pending_review 互动禁用、新建事件误关 bug。（commits `6e46ff4`, `f2cf3bb`, `bed6217`, `55d174a`, `5af5c4e`, `ca25e53`, `4a8934c`）
- 登录接口返回完整 user（含 `verifyStatus`/`currentCommunityName`/`roles`），修复前端登录后永远显示未认证。（commit `32bf4a6`）
- 发布事件 DTO 补 `capacity` 字段，避免 `forbidNonWhitelisted` 校验报 400。（commit `32bf4a6`）
- 上传接口跳过小区校验、统一响应包装，`getFileUrl` 补 `PUBLIC_BASE_URL` 前缀。（commit `32bf4a6`）
- 邻里互助列表页发布后返回不刷新：新增 `useDidShow` 在页面重新显示时刷新当前 tab 列表。（commit `561c0bc`）
- plaza 投票区块不显示（status 过滤值 active→published）。（commit `0e27a47`）
- 邻里互助闲置卡片右侧溢出屏幕。（commit `3ad4766`）

### 变更

- `onlyVerified` 字段移除：投票始终要求认证，不再可被 admin 关闭（P-63）。（commit `7c9d190`）
- `help_offer` 事件类型废弃：改为个人技能档案（§4.19）。（commit `7c9d190`）
- help_free/help_paid 小红花统一为 1 朵（P-61）。（commit `8029f4b`）
