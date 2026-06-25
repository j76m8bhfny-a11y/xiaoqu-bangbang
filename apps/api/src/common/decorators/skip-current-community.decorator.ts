import { SetMetadata } from '@nestjs/common';

/**
 * 让 CurrentCommunityGuard 跳过 user.currentCommunityId 校验。
 * 用于 platform_admin 在尚未选定/小区还不存在的场景（如小区申请审批）。
 */
export const SKIP_CURRENT_COMMUNITY_KEY = 'skipCurrentCommunity';
export const SkipCurrentCommunity = () => SetMetadata(SKIP_CURRENT_COMMUNITY_KEY, true);
