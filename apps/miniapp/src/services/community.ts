import { http } from './http';
import type { CommunityDto, SelectCommunityRequest, SocialGroupDto } from '@xiaoqu-bangbang/shared';
export type { SocialGroupDto };

export const communityService = {
  list: (params?: { city?: string; keyword?: string }) =>
    http.get<{ items: CommunityDto[] }>('/communities', params),

  select: (data: SelectCommunityRequest) =>
    http.post<{ currentCommunityId: string; communityName: string }>('/communities/select', data),

  getSocialGroups: () =>
    http.get<{ items: SocialGroupDto[] }>('/communities/current/social-groups'),
};
