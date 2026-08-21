# 左邻右帮 · 全页面功能说明

> 生成时间: 2026-07-27
> 分支: feature/guide-module @ b33dee1
> 共 40 个页面，按 tabBar + 功能模块分组

---

## 一、TabBar 页面 (4 个)

### 1. plaza (小区事) — 首页/公共反馈中心

- **入口**: tabBar 第 1 项「小区事」(pages[0] 启动页)
- **功能**:
  - 业委会卡片：展示公告 + 业委会入口，点击进 committee 页
  - 待投票区域：显示待投票列表，点击进 vote-detail
  - 议题列表：展示本小区议题(open/closed 两种)，点击进 topic-detail
  - 发起议题 CTA：跳转 topic-create（需认证）
  - 社群入口：跳转 social-groups（需认证）
- **数据**: 议题列表 + 投票列表 + 业委会概览
- **注释**: S1-6 从「事件+闲置」混合广场重构为「公共反馈」中心，闲置下沉到 events tab

### 2. events (邻里帮) — 互助/闲置/指南聚合页

- **入口**: tabBar 第 2 项「邻里帮」
- **结构**: 三层 outer tab
  - **互助**: filter = 全部/求助/公益/宠物帮帮/购物拼拼
    - `all` 走 /feed/all 聚合端点(含 group_buy)
    - `group_buy` 单独走 /group-buys
    - 其他走 /events?type=xxx
  - **闲置**: filter = 全部/在售/已售
  - **指南**: filter = 全部/使用指南/维修排障/保养维护/其他
- **FAB**: 右下角发布按钮，根据当前 tab 跳不同创建页(互助->event-create/pet-create, 闲置->market-create, 指南->guide-create)
- **卡片**: 点击进对应详情页(event-detail/market-detail/guide-detail)

### 3. ranking (光荣榜) — 排行榜+勋章

- **入口**: tabBar 第 3 项「光荣榜」
- **功能**:
  - 双 tab: 排行榜 / 勋章
  - 排行榜: 月榜/总榜切换，展示昵称+小红花数+互助数
  - 勋章: 展示全部勋章 + 我的勋章(已获高亮/未获灰显)
  - 蜜桃橙渐变 header

### 4. home (我的) — 个人中心

- **入口**: tabBar 第 4 项「我的」
- **结构**:
  - 用户卡片: 头像+昵称+认证标签+小区标签，点击进 profile-edit
  - 数据统计: 帮助次数/小红花/勋章数
  - 主功能宫格 2×2: 发布求助/发起议题/我的排名/业主认证
  - 待办提醒: 进行中互助/待投票/未读消息(dashboard 数据驱动)
  - 设置类列表:
    - 消息通知 / 我的勋章 / 我的服务
    - 切换小区 / 申请开通小区 / 我的小区申请 / 邀请邻居
    - 设置 / 关于我们
- **onboarding**: 未认证用户每次登录弹新手引导(已认证跳过)

---

## 二、认证与小区 (5 个)

### 5. login (登录)

- **功能**: 微信授权登录
- **临时**: dev-login code 输入框(输入 test_zhangsan 等直接签 JWT，发布前删除)
- **登录成功**: 写入 token + user，跳首页

### 6. verify (业主认证)

- **功能**: 提交业主认证材料
- **表单**:
  - 材料类型: 房产证/租房合同/门禁卡/其他
  - 楼栋号/单元号(选填)/房号
  - 材料图片上传
  - 授权同意 checkbox
- **校验**: 需上传图片 + 填楼栋号房号 + 同意授权
- **历史记录**: 展示认证审核记录列表
- **⚠️ 待新增**: phone + wechatId 必填(联系方式功能)

### 7. community-select (小区切换)

- **功能**: 切换当前小区 + 查看可选小区列表
- **操作**: 点击小区切换; 「申请新小区」跳 community-apply
- **待审申请**: 有 pending 申请时显示，点击进 community-application-detail

### 8. community-apply (申请开通小区)

- **功能**: 填写新小区申请
- **表单**: 小区名/城市/区县/详细地址/补充说明
- **校验**: 小区名+城市+区县必填
- **提交**: 成功后跳 my-applications

### 9. community-application-detail (小区申请详情)

- **功能**: 查看小区申请详情 + 助力
- **操作**: 未登录跳 login; 已登录可「助力」加速审批
- **展示**: 申请信息+审核状态+助力数

---

## 三、事件互助 (6 个)

### 10. event-create (发布求助/公益/反馈)

- **功能**: 创建通用事件(求助/公益/公共反馈/讨论)
- **表单**: 标题/描述/地点/期望时间/报酬(免费/面议/金额)/图片
- **关联议题**: 可选关联已有议题(topicId)
- **认证拦截**: 未认证跳 verify
- **AI 审核**: 提交后 AI 审核通过自动 open

### 11. event-detail (事件详情)

- **功能**: 事件详情展示 + 交互
- **展示**:
  - 标题/描述/图片 Swiper/状态/地点/时间/报酬
  - petMeta 宠物详细信息(feed/walk/lost 三种子类型差异化展示)
  - 响应者列表(单帮手) / 参与者列表(多帮手寻宠)
  - 匹配帮手列表(help_request 类型)
  - 处理进度(feedback 类型)
  - 评论列表 + 底部输入栏
  - 评价列表(completed 状态)
- **操作**:
  - CTA 响应(我来帮/需要帮助/参与/提供线索/关注/参与讨论)
  - 发布者: 选帮手(selectHelper) / 选择参与(selectParticipant) / 确认完成
  - 双方确认完成 -> 发花
  - 点赞/评论/分享/举报
  - 编辑(跳 event-edit 或 pet-edit)
- **⚠️ 待新增**: 选中帮手后展示双方联系方式

### 12. event-edit (编辑事件)

- **功能**: 编辑通用事件
- **回填**: 标题/描述/地点/时间/报酬/图片
- **校验**: 标题+描述必填
- **权限**: 非创建者无权编辑

### 13. pet-create (创建宠物帮帮)

- **功能**: 创建 pet_help 类型事件(代喂/代遛/寻宠)
- **子类型切换**: feed(代喂) / walk(代遛) / lost(寻宠)
- **feed 表单**: 宠物种类/品种/名字/代喂天数/报酬/备注(无图片)
- **walk 表单**: 狗体型/狗名/每天次数/每次时长/时间段/牵引绳/报酬/备注(无图片)
- **lost 表单**: 种类/品种/名字/走丢地点/走丢时间/外观/照片(≤9张)/酬谢/备注
- **认证拦截**: feed/walk 需认证; lost 不需要
- **图片**: 寻宠照片走 image-picker 上传远端

### 14. pet-edit (编辑宠物帮帮)

- **功能**: 编辑 pet_help 事件
- **回填**: 按 subType 回填对应字段(radio/switch/number/text/checkbox/image)
- **图片**: 寻宠图片走 image-picker 预览/删除

### 15. notifications (消息通知)

- **功能**: 通知列表 + 点击跳转
- **跳转规则**:
  - event/event_comment -> event-detail
  - market -> market-detail
  - topic -> topic-detail
  - vote -> vote-detail
- **操作**: 标记已读(点击自动标记)

---

## 四、闲置流转 (5 个)

### 16. market (闲置列表)

- **入口**: events 页 outer tab「闲置」
- **功能**: 闲置物品列表 + filter(全部/在售/已售) + 分页
- **FAB**: 发布闲置 -> market-create(需认证)

### 17. market-create (发布闲置)

- **表单**:
  - 交易类型: 出售/免费/交换
  - 标题/描述/价格
  - 分类: 电子/家居/服饰/书籍/运动/其他
  - 成色: 全新/几乎全新/良好/有磨损
  - 图片(≤9张)
- **认证拦截**: 未认证跳 verify
- **草稿**: useDraft 自动保存

### 18. market-detail (闲置详情)

- **展示**: 标题/描述/价格/图片 Swiper/成色/交易类型/发布者信息
- **操作**:
  - 「我想要」提交购买意向
  - 发布者: 选买家/标记已售
  - 评论
  - 编辑(跳 market-edit)
  - 举报

### 19. market-edit (编辑闲置)

- **回填**: 标题/描述/价格/分类/成色/交易类型/图片
- **校验**: 标题+描述必填

### 20. user-profile (用户主页)

- **功能**: 查看用户公开主页
- **展示**: 个人信息+统计(帮助次数/小红花/勋章)+徽章
- **发布历史**: 3 tab 切换(互助/闲置/议题)，点击跳对应详情
- **编辑入口**: 自己的主页可跳 profile-edit

---

## 五、议事讨论 (4 个)

### 21. topics (议题列表)

- **功能**: 议题列表 + open/closed 状态切换 + 分页
- **入口**: plaza 议题区域「查看全部」
- **操作**: 点击进 topic-detail; 发起议题跳 topic-create

### 22. topic-create (发起议题)

- **功能**: 创建议题
- **表单**: 标题(必填)/描述(选填)
- **认证拦截**: 未认证跳 verify
- **注释**: 议题独立于 event 表，POST /topics 仅接收 { title, description? }

### 23. topic-detail (议题详情)

- **展示**: 标题/状态(进行中/已完结)/描述/投票图标组(赞/反对)
- **双 tab**:
  - 相关事件: 事件时间线 + FAB 新建关联事件
  - 议题讨论: 评论列表 + 底部输入栏(支持回复嵌套)
- **已完结**: 显示评分(1-5星) + 完结总结 + 可评分
- **操作**: 赞/反对(toggle) / 评分 / 评论 / 回复 / 举报(右下角小字)

### 24. votes (投票列表)

- **功能**: 投票列表
- **展示**: 进行中/已结束投票
- **操作**: 点击进 vote-detail

---

## 六、业委会 (3 个)

### 25. committee (业委会主页)

- **功能**: 业委会概览
- **展示**: 业委会介绍 + 成员列表(主任/副主任/委员) + 公告列表
- **操作**: 点击成员进 committee-member; 点击公告进 committee-announcement

### 26. committee-member (业委会成员详情)

- **功能**: 成员详情 + 身份认领
- **展示**: 成员信息(姓名/职务/联系方式/任期)
- **操作**: 未认领成员可「认领」(需认证); 已认领显示认领者信息

### 27. committee-announcement (业委会公告详情)

- **功能**: 公告详情
- **展示**: 标题/内容/图片轮播/发布时间
- **图片**: 支持 Swiper 多张 + 点击预览

---

## 七、购物拼拼 (3 个)

### 28. group-buy-create (创建拼单)

- **功能**: 创建求代购/代购方
- **类型切换**: seek(求代购) / offer(代购方)
- **seek 表单**: 商品清单(名称+数量+备注，多条) + 地点 + 交付方式
- **offer 表单**: 采购地点(含「其他」自定义输入) + 出发时间 + 截止接单时间 + 名额 + 代买费/服务费
- **校验**: seek 至少 1 个商品; offer 需时间+名额; 时间格式正则校验
- **认证拦截**: 未认证跳 verify

### 29. group-buy-detail (拼单详情)

- **展示**: 类型/地点/出发/截止/名额/状态/备注/响应列表(商品名/数量/状态)
- **状态机按钮**:
  - open: 截止接单 -> closed_for_bid
  - closed_for_bid + 有确认 item: 已采购 -> purchased
  - purchased: 已交付(逐个 item) -> 全部交付自动 completed
  - 手动关闭 -> closed
- **操作**:
  - 非发起人: 「我要加入」响应表单(填商品)
  - 发起人: 确认/拒绝他人 item(排除自己初始需求)
  - 编辑(仅 open/pending_review 状态显示)
  - 取消响应
- **状态守卫**: 已交付按钮仅 purchased 显示; 编辑按钮 closed_for_bid/purchased/completed 隐藏

### 30. group-buy-edit (编辑拼单)

- **功能**: 编辑拼单信息
- **可编辑字段**: 采购地点/交付方式/备注/时间(不含商品清单)
- **校验**: 地点+时间+名额必填; 时间格式正则

---

## 八、图文教程 (2 个)

### 31. guide-create (发布教程)

- **功能**: 创建图文教程
- **表单**: 分类(使用指南/维修排障/保养维护/其他) + 标题(≤50字) + 描述(≤2000字) + 图片(≤9张)
- **校验**: 标题+描述必填; 字数上限
- **认证拦截**: 未认证跳 verify
- **编辑模式**: URL 带 id 时加载已有教程编辑

### 32. guide-detail (教程详情)

- **展示**: 标题/分类标签/作者/浏览数/图片 Swiper/描述
- **操作**:
  - 点赞(toggle) / 收藏(toggle)
  - 评论(发送/回复嵌套/点赞)
  - 访问 viewCount +1
- **编辑/删除**:
  - pending_review: 显示编辑/删除按钮
  - published: 锁定不可编辑
  - rejected: 显示驳回原因 + 可编辑修改
- **权限**: 非作者访问 pending/rejected 返回 404

---

## 九、激励体系 (2 个)

### 33. ranking (光荣榜)

- 见上方 tabBar 第 3 项

### 34. badges (勋章页)

- **功能**: 勋章列表(同 ranking 页勋章 tab 的独立页)
- **展示**: 全部勋章 + 我的勋章

---

## 十、个人设置 (4 个)

### 35. profile-edit (编辑资料)

- **表单**: 头像/昵称/简介/微信号
- **技能管理**: 技能列表 + 添加/删除技能
- **提交**: 更新 profile，返回 user 信息
- **⚠️ 待新增**: phone 输入框

### 36. settings (设置)

- **功能**:
  - 清除缓存
  - 隐私政策(开发中)
  - 关于我们
  - 退出登录

### 37. my-applications (我的小区申请)

- **功能**: 查看自己发起的 + 助力过的小区申请
- **双 tab**: 我发起的 / 我助力的
- **操作**: 点击查看详情; 继续申请跳 community-apply

### 38. social-groups (社群)

- **功能**: 本小区社群列表
- **认证拦截**: 未认证跳 verify
- **展示**: 群组列表(微信群等)

---

## 十一、服务提供者 (2 个)

### 39. service-providers (服务商列表)

- **功能**: 本小区服务提供商列表(物业/维修/家政等)
- **操作**: 点击进 service-provider-detail

### 40. service-provider-detail (服务商详情)

- **展示**: 服务商详情(名称/类型/联系方式/服务范围/评价)

---

## 十二、投票 (2 个，已计入上方)

### 24. votes (投票列表) — 见第六节

### 25. vote-detail (投票详情) — 补充

#### vote-detail (投票详情)

- **展示**: 投票标题/描述/选项/已投票数/投票结果
- **操作**: 选择选项投票(可多选) / 查看实时结果
- **状态**: 进行中可投票; 已结束仅看结果

---

## 十三、废弃页面 (1 个)

### mine (旧「我的」页)

- **状态**: 已被 home 页替代，不在 pages 列表中
- **源码保留**: 过渡期兼容，不进 app.config.ts

---

## 页面关系图

```
TabBar
├── plaza (小区事)
│   ├── -> committee -> committee-member / committee-announcement
│   ├── -> vote-detail
│   ├── -> topic-detail -> event-create (关联事件)
│   └── -> topic-create
├── events (邻里帮)
│   ├── 互助: event-detail -> event-edit / pet-edit
│   │   ├── pet-create (pet_help)
│   │   ├── event-create (其他类型)
│   │   └── group-buy-create -> group-buy-detail -> group-buy-edit
│   ├── 闲置: market-detail -> market-edit
│   │   └── market-create
│   └── 指南: guide-detail
│       └── guide-create
├── ranking (光荣榜) -> badges
└── home (我的)
    ├── -> profile-edit
    ├── -> verify
    ├── -> notifications
    ├── -> community-select -> community-apply -> my-applications
    ├── -> settings
    ├── -> badges
    ├── -> service-providers -> service-provider-detail
    ├── -> social-groups
    ├── -> votes -> vote-detail
    └── -> user-profile
```

---

## 待新增功能 (需求池)

| 功能                     | 涉及页面                             | 优先级 | 状态               |
| ------------------------ | ------------------------------------ | ------ | ------------------ |
| 联系方式(phone+wechatId) | verify / profile-edit / event-detail | 中     | 需求确认中         |
| 临时登录框删除           | login                                | 高     | 发布前必删         |
| 真机调试分包瘦身         | app.config.ts                        | 中     | 主包 2748KB 超 2MB |
