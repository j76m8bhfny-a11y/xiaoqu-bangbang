# 变更日志

本文件记录「小区帮榜棒」的重要变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [未发布]

### 安全

- 匿名事件后端脱敏：`events` 列表与详情接口对「非本人」隐藏真实发布人（`creator=null`、`creatorId` 抹除），本人保留 `creatorId` 以支持编辑按钮。修复抓包可破解匿名身份的 P0 隐私问题。（commit `7689df5`）

### 修复

- 登录接口返回完整 user（含 `verifyStatus`/`currentCommunityName`/`roles`），修复前端登录后永远显示未认证。（commit `32bf4a6`）
- 发布事件 DTO 补 `capacity` 字段，避免 `forbidNonWhitelisted` 校验报 400。（commit `32bf4a6`）
- 上传接口跳过小区校验、统一响应包装，`getFileUrl` 补 `PUBLIC_BASE_URL` 前缀。（commit `32bf4a6`）
- 邻里互助列表页发布后返回不刷新：新增 `useDidShow` 在页面重新显示时刷新当前 tab 列表（跳过首次显示避免重复请求）。

### 新增

- `/health` 探活端点，用于验收阶段快速确认服务状态。（commit `32bf4a6`）
