# 小区帮榜棒 — 规格骨架 (Spec)

> 锁版基线文档。将产品拆解为相互独立的子模块任务树, 每个模块明确交付闭环。
> 上位索引: Map.md | 验收标准: Standard.md
> 最后扫描日期: 2026-07-03 | 版本: v0.2.0 (对齐 PRD v0.7.0)

---

## 阅读说明

- 每个模块按 **[模块名]** 分节, 内含: 职责 / 任务树 / 交付闭环
- **交付闭环** = 该模块完成必须同时具备的 5 个产物: ①后端 API ②前端页面 ③共享契约 ④测试 ⑤验收证据
- 模块间依赖用 `依赖: [模块A, 模块B]` 标注
- 任务编号格式 `M{模块号}.{序号}`, 供 Standard.md 引用

---

# 地基层 (依赖根, 必须最先完成)

## M1. 认证与身份 (auth)

**职责**: 微信登录、JWT 签发与校验、当前用户信息、用户公开主页

**依赖**: 无 (全局基础设施)

### 任务树

- **M1.1** 微信登录: `POST /auth/wechat-login` (code → openid → JWT), 返回 `{ token, user }`
- **M1.2** 当前用户: `GET /me` (组装 verifyStatus / currentCommunityName / roles)
- **M1.3** 更新资料: `PATCH /me` (nickname / avatarUrl / bio)
- **M1.4** 首页看板: `GET /me/dashboard` (未读通知/积分/勋章/活跃事件/闲置/待投票)
- **M1.5** 用户主页: `GET /users/:id/profile` (跨小区 verifyStatus 为 null, 徽章上限 6)
- **M1.6** 守卫机制: `JwtAuthGuard` + `@Public()` 装饰器 + `@CurrentUser()` 装饰器

### 交付闭环

| 产物      | 内容                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/auth/` (AuthController, MeController, UsersController)                                |
| ②前端页面 | `miniapp/pages/login/`, `miniapp/pages/home/`, `miniapp/pages/profile-edit/`, `miniapp/pages/user-profile/` |
| ③共享契约 | `WechatLoginRequest, LoginResponse, UserDto, UpdateMeRequest, MyDashboardDto, UserProfileDto`               |
| ④测试     | `apps/api/test/auth.spec.ts` (85 行)                                                                        |
| ⑤验收证据 | 登录成功跳转 / dashboard 数据正确 / 跨小区主页 verifyStatus=null                                            |

---

## M2. 小区与数据隔离 (communities)

**职责**: 小区列表、选择小区、社群入口、小区数据隔离守卫

**依赖**: [M1]

### 任务树

- **M2.1** 小区列表: `GET /communities` (city/keyword 筛选, 仅 active)
- **M2.2** 选择小区: `POST /communities/select` (首次自动创建 community_member, role=resident)
- **M2.3** 社群入口: `GET /communities/current/social-groups` (按认证状态过滤可见性) ⚠️ 小程序端本期不做, 仅后端 API + Admin 可用
- **M2.4** 隔离守卫: `CurrentCommunityGuard` + `@CurrentCommunityId()` + `@SkipCurrentCommunity()`

### 交付闭环

| 产物      | 内容                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/communities/` + `apps/api/src/common/guards/current-community.guard.ts` |
| ②前端页面 | `miniapp/pages/community-select/`                                                             |
| ③共享契约 | `CommunityDto, SelectCommunityRequest, SocialGroupDto`                                        |
| ④测试     | `apps/api/test/community.spec.ts` (127 行) + `community-isolation.spec.ts` (130 行)           |
| ⑤验收证据 | 未选小区请求业务接口返回 40301 / 切换小区后上下文刷新                                         |

---

## M3. 业主认证 (verifications + ocr + ai-review)

**职责**: 业主身份认证提交、OCR 识别、AI 小区匹配、审核结果、徽章颁发

**依赖**: [M1, M2]

### 任务树

- **M3.1** 提交认证: `POST /verifications` (材料类型/文件URL/授权同意)
- **M3.2** OCR 识别 (Mock): `OcrService.recognizeMaterial()` → `{ communityName, address, ownerName, confidence }`
- **M3.3** AI 小区匹配 (Mock): `OcrService.matchCommunity()` → 名字匹配 + 置信度 ≥ 0.8 自动通过
- **M3.4** 认证记录: `GET /verifications/me` (我的认证历史)
- **M3.5** 自动发徽章: 认证通过且为前 30 名 → 颁发 `first_owner_top30` (幂等)
- **M3.6** 原图删除: 认证通过后 `originalFileUrl` 标记待删除
- **M3.7** 认证守卫: `VerifiedMemberGuard` (要求 verifyStatus=verified 才能发布内容)

### 交付闭环

| 产物      | 内容                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ①后端 API | `apps/api/src/modules/verifications/` + `modules/ocr/` + `modules/ai-review/`                                                                          |
| ②前端页面 | `miniapp/pages/verify/`                                                                                                                                |
| ③共享契约 | `SubmitVerificationRequest, VerificationDto, MaterialType, VerificationStatus`                                                                         |
| ④测试     | `apps/api/test/verification.spec.ts` (115 行) + `ocr-mock.spec.ts` (63 行) + `ai-review-mock.spec.ts` (42 行) + `extra/verifications.spec.ts` (207 行) |
| ⑤验收证据 | 未同意授权返回 400 / OCR 匹配自动通过 / 前 30 名拿到徽章 / 原图标记删除                                                                                |

---

# 业务层 (C 端主路径)

## M4. 邻里互助事件 (events)

**职责**: 互助事件全生命周期: 发布/响应/选帮手/完成确认/评价/评论/点赞/感谢/收藏/举报/反馈日志

> **事件分互助类和议事类两大类**, 各自走不同生命周期。互助类 (help_request/public_welfare/lost_found) 走"响应→选帮手→双方确认→completed"; 议事类 (public_feedback/discussion) 走"审核通过→open→closed", 禁用 in_progress/processing/completed。详见 PRD §5.6。

**依赖**: [M1, M2, M3]

### 任务树

- **M4.1** 事件列表: `GET /events` (type/status/keyword/excludeTypes 筛选, 分页)
- **M4.2** 发布事件: `POST /events` (5 种类型, 分互助类/议事类, 议事类必须挂 topicId, AI 审核)
- **M4.3** 事件详情: `GET /events/:id` (匿名脱敏, viewCount+1)
- **M4.4** 编辑事件: `PATCH /events/:id` (内容变更重新 AI 审核, closed/completed 不可编辑)
- **M4.5** 关闭事件: `POST /events/:id/close`
- **M4.6** 响应事件: `POST /events/:id/applications` (事件 → in_progress, 通知创建者)
- **M4.7** 选择帮手: `POST /events/:id/applications/:appId/select` (事件 → processing, 通知帮手) ⚠️ 多帮手流程 (public_welfare/lost_found) 代码未实现, 当前走单帮手 (P-80)
- **M4.8** 完成请求: `POST /events/:id/complete/request` (创建/更新确认请求)
- **M4.9** 完成确认: `POST /events/:id/complete/confirm` (双方确认 → completed → 触发积分/勋章/排行/通知)
- **M4.10** 评价: `POST /events/:id/rate` (仅参与者, 仅已完成事件) ⚠️ PRD 本期简化为"送花感谢" (M4.13), 后端 rate 接口保留但小程序不调用, 结构化评价后续迭代 (P-41)
- **M4.11** 评论: `GET/POST /events/:id/comments` (AI 审核, 仅返回 visible, 嵌套最多 2 层)
- **M4.12** 点赞: `POST /events/:id/like` (toggle)
- **M4.13** 感谢: `POST /events/:id/thanks` (不可重复, 不可感谢自己)
- **M4.14** 收藏: `POST /events/:id/favorite` (toggle)
- **M4.15** 反馈日志: `GET /events/:id/feedback-logs` (公开处理记录, public_feedback 类型)
- **M4.16** 议题推荐: `GET /events/topic-suggestions` (Jaccard 相似度)
- **M4.17** 举报: `POST /reports` (8 种目标详见 M16.2, 6 种理由)
- **M4.18** 详情页状态→按钮映射: 按事件状态显示/隐藏 CTA/编辑/关闭/确认/送花/举报按钮 (⚠️ 代码未实现 CTA 状态判断, P-74)

### 交付闭环

| 产物      | 内容                                                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/events/` (EventsController, ReportsController)                                                                          |
| ②前端页面 | `miniapp/pages/events/`, `event-detail/`, `event-create/`, `event-edit/`                                                                      |
| ③共享契约 | `CreateEventRequest, EventDto, EventListQuery, CreateApplicationRequest, EventApplicationDto, RateRequest, ReportDto, EventType, EventStatus` |
| ④测试     | `apps/api/test/events.spec.ts` (226 行, 含匿名脱敏)                                                                                           |
| ⑤验收证据 | 匿名事件非本人看不到 creator / 双方确认才 completed / 不可重复感谢 / 议事类必须挂议题                                                         |

---

## M5. 闲置市集 (market)

**职责**: 二手闲置物品发布、列表、详情、评论、点赞、评价、标记已售

**依赖**: [M1, M2, M3]

### 任务树

- **M5.1** 闲置列表: `GET /market/items` (category/status/keyword 筛选, 分页)
- **M5.2** 发布闲置: `POST /market/items` (AI 审核文本+图片, 任一图片 reject 则整商品 reject)
- **M5.3** 闲置详情: `GET /market/items/:id` (含 isLiked)
- **M5.4** 编辑闲置: `PATCH /market/items/:id` (仅卖家)
- **M5.5** 标记已售: `POST /market/items/:id/sold` (仅卖家) ⚠️ 意向记录本期不实现, "我想要"仅显示联系方式, markSold 不选买家 (P-42)
- **M5.5b** 卖家下架: `POST /market/items/:id/close` ⚠️ 代码未实现, 卖家无法自行关闭未售出商品, 仅管理员可隐藏 (P-58)
- **M5.6** 评论: `GET/POST /market/items/:id/comments` (AI 审核, 嵌套最多 2 层)
- **M5.7** 点赞: `POST /market/items/:id/like` (toggle, 返回 likeCount)
- **M5.8** 评价: `GET/POST /market/items/:id/reviews` (AI 审核, UNIQUE 防重复)

### 交付闭环

| 产物      | 内容                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/market/`                                                                                         |
| ②前端页面 | `miniapp/pages/market/`, `market-detail/`, `market-create/`, `market-edit/`                                            |
| ③共享契约 | `CreateMarketItemRequest, MarketItemDto, MarketCategory, TradeType, ConditionLevel, MarketItemStatus, MarketReviewDto` |
| ④测试     | `apps/api/test/market.spec.ts` (120 行)                                                                                |
| ⑤验收证据 | 图片 reject 整商品 reject / 仅卖家可编辑/标记已售 / 分类筛选正确                                                       |

---

## M6. 议事榜 (topics)

**职责**: 社区议题 CRUD、赞踩/评分、评论、时间线、AI 议题推荐/合并

**依赖**: [M1, M2, M3]

### 任务树

- **M6.1** 议题列表: `GET /topics` (status/keyword 筛选, 开放议题按净赞数+时间权重排序, 完结按评分+时间权重)
- **M6.2** 创建议题: `POST /topics` (title 必填 30 字, description 选填 500 字, AI 审核, 审核通过发 1 朵花)
- **M6.3** 议题详情: `GET /topics/:id`
- **M6.4** 赞/踩: `POST/DELETE /topics/:id/like` + `POST /topics/:id/dislike` (分 open/closed 作用域, UNIQUE 防重复)
- **M6.5** 评分: `POST /topics/:id/rating` (1-5 整数, 仅完结议题, 每人一次)
- **M6.6** 时间线: `GET /topics/:id/timeline` (关联事件按时间排列)
- **M6.7** 评论: `GET/POST /topics/:id/comments` (嵌套最多 2 层, 通知被回复者)
- **M6.8** 评论赞踩: `POST/DELETE /topics/comments/:commentId/like|dislike`
- **M6.9** AI 议题推荐: 创建事件时 Jaccard 相似度推荐 (可由 `ai_topic_suggest` 开关控制)
- **M6.10** AI 议题合并: 相似度 ≥ 0.8 自动生成合并建议 (可由 `ai_topic_merge` 开关控制)

### 交付闭环

| 产物      | 内容                                                                                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/topics/`                                                                                                                                                           |
| ②前端页面 | `miniapp/pages/topics/`, `topic-detail/`, `topic-create/`, `plaza/` (首页聚合)                                                                                                           |
| ③共享契约 | `TopicDto, TopicDetailDto, TopicEventItem, TopicSuggestionDto, TopicCommentDto, TopicLikeRequest, TopicRatingRequest, TopicStatus, TopicLikeScope, TopicLikeType, MergeSuggestionStatus` |
| ④测试     | `apps/api/test/extra/topics.spec.ts` (352 行, 含赞踩/评分/评论嵌套/AI 点评/推荐)                                                                                                         |
| ⑤验收证据 | 空标题 400 / 评论第 3 层 400 / 重复评分 409 / 完结议题才能评分 / 高赞排序正确                                                                                                            |

---

## M7. 投票 (votes)

**职责**: 社区投票列表、详情、提交、结果查看 (生命周期: draft→published→closed, 投票不可 reopen, 由管理员创建/发布/关闭)

**依赖**: [M1, M2]

### 任务树

- **M7.1** 投票列表: `GET /votes` (分页)
- **M7.2** 投票详情: `GET /votes/:id` (含选项)
- **M7.3** 提交投票: `POST /votes/:id/records` (一人一票, 始终校验认证状态, maxChoices 限制多选, 跨小区防护)
- **M7.4** 查看结果: `GET /votes/:id/results` (按 resultVisibility 控制可见性: always/after_vote/after_end/admin_only)

### 交付闭环

| 产物      | 内容                                                                                |
| --------- | ----------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/votes/`                                                       |
| ②前端页面 | `miniapp/pages/votes/`, `vote-detail/`                                              |
| ③共享契约 | `VoteDto, VoteOptionDto, SubmitVoteRequest, VoteType, VoteStatus, ResultVisibility` |
| ④测试     | `apps/api/test/extra/votes.spec.ts` (251 行)                                        |
| ⑤验收证据 | 重复投票被 UNIQUE 拦截 / 未认证返回 403 / 跨小区防护 / 结果可见性正确               |

---

## M8. 业委会 (committee)

**职责**: 业委会信息展示、成员认领、公告查看与点赞

**依赖**: [M1, M2]

### 任务树

- **M8.1** 业委会概览: `GET /committee` (成员数/公告数/最新公告)
- **M8.2** 成员列表: `GET /committee/members` (分页)
- **M8.3** 成员详情: `GET /committee/members/:id` (含认领记录)
- **M8.4** 身份认领: `POST /committee/members/:id/claim` (声明+材料, 不可重复, 已认领不可再认领)
- **M8.5** 我的认领: `GET /me/committee-claims`
- **M8.6** 公告列表: `GET /committee/announcements` (isPinned 置顶 + publishedAt 倒序)
- **M8.7** 公告详情: `GET /committee/announcements/:id` (含 isLiked)
- **M8.8** 公告点赞: `POST /committee/announcements/:id/like` (toggle)

### 交付闭环

| 产物      | 内容                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| ①后端 API | `apps/api/src/modules/committee/`                                                                            |
| ②前端页面 | `miniapp/pages/committee/`, `committee-member/`, `committee-announcement/`                                   |
| ③共享契约 | `CommitteeMemberDto, ClaimCommitteeMemberRequest, CommitteeAnnouncementDto, ClaimStatus, AnnouncementStatus` |
| ④测试     | `apps/api/test/extra/committee.spec.ts` (327 行)                                                             |
| ⑤验收证据 | 不可重复认领 / 已认领成员不可再认领 / 置顶公告排前                                                           |

---

## M9. 小区申请 (community-applications)

**职责**: 用户申请新开小区、邻居助力、查看进度

**依赖**: [M1]

### 任务树

- **M9.1** 创建申请: `POST /community-applications` (一人仅一个待审核)
- **M9.2** 申请列表: `GET /community-applications` (status/city/keyword 筛选, 默认 pending 按助力数倒序)
- **M9.3** 我的申请: `GET /community-applications/me`
- **M9.4** 我助力的: `GET /community-applications/supported`
- **M9.5** 申请详情: `GET /community-applications/:id` (含 recentSupporters) / `:id/me` (含 hasSupported)
- **M9.6** 助力: `POST /community-applications/:id/support` (不可给自己, 事务内创建+递增计数)

### 交付闭环

| 产物      | 内容                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/community-applications/`                                                                             |
| ②前端页面 | `miniapp/pages/community-apply/`, `community-application-detail/`, `my-applications/`                                      |
| ③共享契约 | `CreateCommunityApplicationRequest, CommunityApplicationDto, CommunityApplicationSupporterDto, CommunityApplicationStatus` |
| ④测试     | 无独立 spec (通过 admin 端测试间接覆盖) ⚠️ 测试缺口                                                                        |
| ⑤验收证据 | 不可给自己助力 / 一人一个待审核 / 助力计数事务一致 / 通过后自动建小区+申请人获 founder 徽章+助力人获 seed 徽章             |

---

# 激励层

## M10. 排行榜与勋章 (rankings + badges)

**职责**: 贡献排行榜、勋章规则、四套激励体系 (互助/议事/议题/小区创建) 自动发积分发勋章

**依赖**: [M4, M6, M9] (互助事件完成/议事事件审核通过/议题审核通过/小区申请通过时触发)

### 任务树

- **M10.1** 排行榜: `GET /rankings` (periodType=month/total, 分页, 月榜按 occurredAt 过滤当月 ⚠️ 代码未实现 P-72)
- **M10.2** 我的排名: `GET /rankings/me`
- **M10.3** 勋章列表: `GET /badges` (公开, 无需登录)
- **M10.4** 我的勋章: `GET /me/badges` (含贡献记录)
- **M10.5** 积分规则 (四套激励体系, 各自独立计算):
  - **互助激励** (互助类事件完成时): help_request 帮手 1 朵/创建者 0 朵; public_welfare 帮手 5 朵/创建者 5 朵; lost_found 帮手 2 朵/创建者 0 朵
  - **议事激励** (议事类事件通过审核时): 创建者 1 朵 (feedback)
  - **议题激励** (议题通过 AI 审核时): 创建者 1 朵 (topic)
  - **小区创建激励** (小区申请通过时): 申请人 community_founding (score=10) + founder 徽章; 助力人 community_founding (score=5) + seed 徽章
  - ⚠️ 代码 help_free/help_paid 未统一为 1 朵 (P-61)
- **M10.6** 勋章规则 (自动颁发, 四类):
  - 互助类: `helper_1` (1次) / `helper_5` (5次) / `helper_20` (20次) / `flower_10` (10朵) / `flower_50` (50朵)
  - 议事类: `feedback_5` (5次有效反馈) / `feedback_20` (20次)
  - 议题类: `topic_1` (1个议题) / `topic_5` (5个)
  - 特殊类: `first_owner_top30` (前30名认证业主) / `founder` (小区申请人) / `seed` (小区助力人)
- **M10.7** 排行重算: 事件完成时触发 (无定时任务)

### 交付闭环

| 产物      | 内容                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/rankings/`                                                                                                          |
| ②前端页面 | `miniapp/pages/ranking/`, `badges/`                                                                                                       |
| ③共享契约 | `RankingQuery, RankingItemDto, MyRankingDto, ContributionAction, ContributionSourceType, ContributionStatus, PeriodType, BadgeSourceType` |
| ④测试     | `apps/api/test/extra/user-interactions.spec.ts` (含排行榜部分)                                                                            |
| ⑤验收证据 | 事件完成积分正确 / 勋章自动颁发 / 月榜与总榜区分                                                                                          |

---

## M11. 通知 (notifications)

**职责**: 站内通知查看与已读标记

**依赖**: [M4, M6, M8] (事件/议题/业委会触发通知)

### 任务树

- **M11.1** 通知列表: `GET /notifications` (isRead 筛选, 分页)
- **M11.2** 标记已读: `POST /notifications/:id/read`
- **M11.3** 全部已读: `POST /notifications/read-all`
- **M11.4** 通知类型 (9 种): `review_result / event_response / completion / badge / feedback / vote / announcement / topic_closed / system`

### 交付闭环

| 产物      | 内容                                           |
| --------- | ---------------------------------------------- |
| ①后端 API | `apps/api/src/modules/notifications/`          |
| ②前端页面 | `miniapp/pages/notifications/`                 |
| ③共享契约 | `NotificationDto, NotificationType`            |
| ④测试     | `apps/api/test/notifications.spec.ts` (119 行) |
| ⑤验收证据 | 仅本人可见 / 未读筛选正确 / 全部已读返回 count |

---

## M12. 分享 (share)

**职责**: 分享卡片配置、分享日志记录

**依赖**: [M4, M5, M8, M7] (事件/闲置/公告/投票可分享)

### 任务树

- **M12.1** 卡片配置: `GET /share/card-config` (按 targetType 返回标题/图/路径/token/可否分享)
- **M12.2** 日志记录: `POST /share/logs` (targetType/targetId/channel/shareToken/scene)
- **M12.3** 分享限制: 审核中/未通过/仅管理员可见的内容不可分享; 匿名事件标题脱敏

### 交付闭环

| 产物      | 内容                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/share/`                                                                                    |
| ②前端页面 | 各详情页调用 (event-detail/market-detail/committee-announcement/vote-detail)                                     |
| ③共享契约 | `ShareCardConfig, ShareCardQuery, ShareLogRequest, ShareLogDto, ShareTemplateDto, ShareTargetType, ShareChannel` |
| ④测试     | `apps/api/test/extra/user-interactions.spec.ts` (含分享部分)                                                     |
| ⑤验收证据 | 审核中内容 canShare=false / 匿名事件标题脱敏 / 日志记录成功                                                      |

---

# 支撑层

## M13. Banner (banners)

**职责**: 运营位轮播图展示

**依赖**: [M2]

### 任务树

- **M13.1** Banner 列表: `GET /banners` (published 状态, 未过期, 有小区时展示小区专属+全局)
- **M13.2** 排序: 按 sortOrder 升序
- **M13.3** 位置: home_top / event_list / market_list

### 交付闭环

| 产物      | 内容                                                      |
| --------- | --------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/banners/`                           |
| ②前端页面 | `miniapp/components/banner-carousel/` (首页/列表页使用)   |
| ③共享契约 | `BannerDto, BannerPosition, BannerStatus, BannerLinkType` |
| ④测试     | `apps/api/test/extra/admin.spec.ts` (含 Banner CRUD)      |
| ⑤验收证据 | 过期 banner 不展示 / 小区专属+全局都显示 / sortOrder 正确 |

---

## M14. 便民服务 (serviceProviders)

**职责**: 小区推荐服务商展示

**依赖**: [M2]

### 任务树

- **M14.1** 服务商列表: `GET /service-providers` (category 筛选, 仅 published)
- **M14.2** 服务商详情: `GET /service-providers/:id`
- **M14.3** 分类: repair/cleaning/lock/home_appliance/moving/pet/other

### 交付闭环

| 产物      | 内容                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/serviceProviders/`                                                                                |
| ②前端页面 | `miniapp/pages/service-providers/`, `service-provider-detail/`                                                          |
| ③共享契约 | `ServiceProviderDto, ServiceProviderCategory, ServiceProviderStatus, ServiceProviderVerifyStatus, RecommendationSource` |
| ④测试     | `apps/api/test/extra/service-providers.spec.ts` (128 行)                                                                |
| ⑤验收证据 | 分类筛选正确 / 不存在返回 404 / 仅 published 展示                                                                       |

---

## M15. 文件上传 (upload)

**职责**: 图片上传 (认证材料/事件图片/闲置图片/头像)

**依赖**: [M1]

### 任务树

- **M15.1** 上传: `POST /upload` (multipart/form-data, file 字段)
- **M15.2** 限制: 最大 5MB, 仅 image/jpeg, image/png, image/webp
- **M15.3** 存储: 磁盘 `{cwd}/uploads/`, 文件名 `{timestamp}-{12位hex}.{ext}`
- **M15.4** 静态服务: `ServeStaticModule` 映射 `/uploads`
- **M15.5** 跳过小区检查: `@SkipCurrentCommunity()` (上传不依赖小区)

### 交付闭环

| 产物      | 内容                                                     |
| --------- | -------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/upload/`                           |
| ②前端页面 | `miniapp/components/image-picker/`, `material-uploader/` |
| ③共享契约 | 无独立 DTO (返回 `{ url }`)                              |
| ④测试     | 无独立 spec ⚠️ 测试缺口                                  |
| ⑤验收证据 | 超过 5MB 拒绝 / 非图片类型拒绝 / 返回可访问 URL          |

---

## M16. 举报 (reports)

**职责**: 用户举报内容

**依赖**: [M1]

### 任务树

- **M16.1** 提交举报: `POST /reports` (targetType/targetId/reason/description)
- **M16.2** 举报目标 (8 种): event / event_comment / market_item / market_comment / topic / topic_comment / vote / user
- **M16.3** 举报理由: privacy / false_info / harassment / illegal / ad_spam / other

### 交付闭环

| 产物      | 内容                                                                     |
| --------- | ------------------------------------------------------------------------ |
| ①后端 API | `apps/api/src/modules/events/reports.controller.ts` (挂在 Events 模块下) |
| ②前端页面 | event-detail, market-detail (举报按钮)                                   |
| ③共享契约 | `ReportDto, ReportReason, ReportStatus, ReportTargetType`                |
| ④测试     | 无独立 spec ⚠️ 测试缺口                                                  |
| ⑤验收证据 | 举报记录写入 / targetId 正确关联                                         |

---

## M17. AI 审核与 OCR (ai-review + ocr)

**职责**: 内容自动审核 (Mock)、认证材料 OCR (Mock)

**依赖**: 被 M3, M4, M5 调用

### 任务树

- **M17.1** 文本审核 (Mock): `reviewText()` → 关键词匹配 (违规→reject, 敏感→manual_review, 其余→pass)
- **M17.2** 图片审核 (Mock): `reviewImage()` → 默认 pass
- **M17.3** OCR 识别 (Mock): `recognizeMaterial()` → 模拟返回社区名/地址/业主名/置信度
- **M17.4** 社区匹配 (Mock): `matchCommunity()` → 名字匹配 + 置信度 ≥ 0.8 自动通过
- **M17.5** 审核日志: 所有审核结果写入 `ai_review_logs` 表
- **M17.6** AI 开关: `ai_topic_suggest / ai_topic_merge / ai_event_comment / ai_content_review` (admin 可配)

### 交付闭环

| 产物      | 内容                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| ①后端 API | `apps/api/src/modules/ai-review/` + `modules/ocr/` (无 Controller, 纯 Service) |
| ②前端页面 | 无直接页面 (后台 settings 页配置开关)                                          |
| ③共享契约 | `AiReviewStatus, AiReviewTargetType, AiFeatureKey, AiSettingsDto`              |
| ④测试     | `apps/api/test/ai-review-mock.spec.ts` (42 行) + `ocr-mock.spec.ts` (63 行)    |
| ⑤验收证据 | 违规关键词 reject / 敏感关键词 manual_review / OCR 置信度匹配 / 开关关闭跳过   |

---

# 后台层

## M18. 管理后台 API (admin)

**职责**: 平台运营与业委会管理的全部后台接口

**依赖**: [所有模块]

### 任务树 (按功能分组)

- **M18.1** 管理员认证: `POST /admin/auth/login` (username+password, bcrypt, JWT) + `AdminGuard` (committee_admin 只管自己小区)
- **M18.2** 仪表盘: `GET /admin/dashboard` (9 项统计 + 待办列表)
- **M18.3** 内容审核: `GET /admin/reviews` + approve/reject/manual-visible-admin-only
- **M18.4** 认证审核: `GET /admin/verifications` + approve/reject (通过则发徽章)
- **M18.5** 事件管理: `GET /admin/events` + hide/restore/feedback-logs
- **M18.6** 议题管理: `GET /admin/topics` + close/reopen/reject/merge + merge-suggestions scan/approve/reject + events move
- **M18.7** 闲置管理: `GET /admin/market` + hide/restore/reject
- **M18.8** 业委会管理: members CRUD + claims approve/reject + announcements CRUD
- **M18.9** 投票管理: CRUD + publish/close + results
- **M18.10** Banner 管理: CRUD + publish/offline
- **M18.11** 服务商管理: CRUD + publish/offline/reject
- **M18.12** 积分勋章: contributions 查询 + badges CRUD + 手动颁发 + rankings/recalculate
- **M18.13** 小区申请审批: `@SkipCurrentCommunity()` + approve(自动建小区发徽章)/reject
- **M18.14** 举报处理: dismiss/takedown/warn/ban
- **M18.15** 系统设置: `GET/PATCH /admin/settings` + AI 开关 `GET/PATCH /admin/settings/ai`
- **M18.16** 分享配置: share-templates CRUD + share-logs 查询
- **M18.17** 社群管理: community-social-groups CRUD
- **M18.18** 审计日志: `GET /admin/audit-logs`
- **M18.19** 内容长度限制 (管理端): 公告标题 50 字 / 公告内容 2000 字 / 投票标题 50 字 / 投票选项 30 字/项 / 投票描述 500 字 / Banner 标题副标题 30 字 / 服务商名称 30 字 / 服务商描述 500 字 / 小区名称 50 字 / 小区地址 200 字

### 交付闭环

| 产物      | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ①后端 API | `apps/api/src/modules/admin/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ②前端页面 | `apps/admin/src/app/*` (20 个 page.tsx, 含根重定向, 19 功能页)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ③共享契约 | `AdminLoginRequest, AdminLoginResponse, AdminUserDto, AdminDashboardDto, AdminReviewActionRequest, AdminVerificationReviewRequest, AdminClaimReviewRequest, CreateCommitteeMemberRequest, UpdateCommitteeMemberRequest, CreateAnnouncementRequest, UpdateAnnouncementRequest, CreateVoteRequest, UpdateVoteRequest, CreateBannerRequest, UpdateBannerRequest, CreateServiceProviderRequest, UpdateServiceProviderRequest, AdminAwardBadgeRequest, CreateSocialGroupRequest, UpdateSocialGroupRequest, AdminFeedbackLogRequest, UpdateSystemSettingsRequest, RejectCommunityApplicationRequest, AdminRole, AdminStatus, AuditLogDto` |
| ④测试     | `apps/api/test/extra/admin.spec.ts` (802 行, 全量覆盖)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ⑤验收证据 | committee_admin 不能跨小区 / 审计日志记录 / 小区申请通过自动建小区+发徽章                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

---

## M19. 管理后台前端 (admin-app)

**职责**: Next.js 管理后台界面

**依赖**: [M18]

### 任务树

- **M19.1** 认证: `/login` (localStorage admin_token) + `<AuthGuard>` 路由守卫 + 401 自动跳登录
- **M19.2** 仪表盘: `/dashboard` (9 统计卡 + 待办列表)
- **M19.3** 内容审核: `/reviews`
- **M19.4** 事件管理: `/events`
- **M19.5** 议事管理: `/topics` (含合并建议)
- **M19.6** 闲置管理: `/market`
- **M19.7** 认证审核: `/verifications`
- **M19.8** 小区申请: `/community-applications`
- **M19.9** 业委会: `/committee` + `/committee/announcements`
- **M19.10** 投票: `/votes`
- **M19.11** Banner: `/banners`
- **M19.12** 服务商: `/service-providers`
- **M19.13** 排行勋章: `/rankings`
- **M19.14** 举报: `/reports`
- **M19.15** 审计日志: `/audit-logs`
- **M19.16** 分享配置: `/share`
- **M19.17** 系统设置: `/settings` (含 AI 开关)
- **M19.18** 社群入口: `/social-groups`
- **M19.19** 角色菜单过滤: Layout 按 adminUser.role 过滤菜单项

### 交付闭环

| 产物      | 内容                                                           |
| --------- | -------------------------------------------------------------- |
| ①后端 API | 复用 M18                                                       |
| ②前端页面 | `apps/admin/src/app/*` (20 个 page.tsx, 含根重定向, 19 功能页) |
| ③共享契约 | 复用 M18 契约                                                  |
| ④测试     | 无自动化测试 ⚠️ 全靠手工验收                                   |
| ⑤验收证据 | 角色菜单过滤正确 / 401 跳登录 / CRUD 操作成功 / 表单校验       |

---

# 跨模块任务

## M20. 共享契约维护 (shared)

**职责**: 前后端共享的 DTO、枚举、错误码、通用包装

### 任务树

- **M20.1** 通用包装: `ApiResponse<T>`, `PaginatedData<T>`, `PaginatedResponse<T>`
- **M20.2** 错误码: `ErrorCodes` 枚举 (SUCCESS/BAD_REQUEST/UNAUTHORIZED/FORBIDDEN/NEED_VERIFICATION/NOT_FOUND/CONFLICT/DUPLICATE/AI_REVIEW_REJECTED/SERVER_ERROR)
- **M20.3** 业务枚举: 54 个枚举 (UserStatus, MemberRole, EventType, EventStatus, etc.)
- **M20.4** DTO 定义: 84 个 interface (请求/响应 DTO, 含 ApiResponse/PaginatedData 通用包装)
- **M20.5** 构建产物: `packages/shared/dist/` (tsc 编译, .d.ts 声明)

### 交付闭环

| 产物      | 内容                                                        |
| --------- | ----------------------------------------------------------- |
| ①后端 API | 后端 import 自 `@xiaoqu-bangbang/shared`                    |
| ②前端页面 | 小程序/admin import 自 `@xiaoqu-bangbang/shared`            |
| ③共享契约 | `packages/shared/src/{api.ts, enums.ts, index.ts}` (930 行) |
| ④测试     | 无独立测试 (类型检查即测试)                                 |
| ⑤验收证据 | `pnpm db:generate` 后三端类型一致 / 无编译错误              |

---

## M21. 基础设施 (infra)

**职责**: 数据库、Docker、工具链、代码质量门禁

### 任务树

- **M21.1** PostgreSQL: Docker 容器 (postgres:16-alpine, 宿主 5433 → 容器 5432)
- **M21.2** Prisma 迁移: 4 次迁移 (init / indexes / topics / community_application)
- **M21.3** 种子数据: `seed.ts` (主) + `seed-jinmao.ts` (金茂府) + `seed-topics.ts` (议题)
- **M21.4** Husky: pre-commit (lint-staged) + commit-msg (commitlint)
- **M21.5** ESLint: flat config (v9), base + 各包配置
- **M21.6** Prettier: 统一格式 (singleQuote, trailingComma all, printWidth 100)
- **M21.7** 环境变量: `.env.example` (DATABASE*URL/JWT_SECRET/JWT_EXPIRES_IN/WECHAT*_/STORAGE\__/AI_REVIEW_PROVIDER/OCR_PROVIDER 等)

### 交付闭环

| 产物      | 内容                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| ①后端 API | `docker-compose.yml` + `apps/api/prisma/`                                              |
| ②前端页面 | 无                                                                                     |
| ③共享契约 | 无                                                                                     |
| ④测试     | `pnpm test` 全局通过                                                                   |
| ⑤验收证据 | `docker compose up -d` 后 `pnpm db:migrate` + `pnpm db:seed` 成功 / `pnpm lint` 无错误 |

---

## 测试缺口汇总

| 模块           | 缺口         |
| -------------- | ------------ |
| M9 小区申请    | 无独立 spec  |
| M15 文件上传   | 无独立 spec  |
| M16 举报       | 无独立 spec  |
| M19 Admin 前端 | 零自动化测试 |
| 小程序全部     | 零自动化测试 |

> 这些缺口不阻塞锁版, 但在 Standard.md 中需通过手工验收证据补齐。
