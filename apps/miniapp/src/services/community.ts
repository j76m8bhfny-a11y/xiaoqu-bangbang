import { http } from './http';
import type { CommunityDto, SelectCommunityRequest } from '@xiaoqu-bangbang/shared';

export interface SocialGroupDto {
  id: string;
  title: string;
  description: string;
  qrImageUrl: string;
  contactText: string;
  visibleTo: string;
}

export const communityService = {
  list: (params?: { city?: string; keyword?: string }) =>
    http.get<{ items: CommunityDto[] }>('/communities', params),

  select: (data: SelectCommunityRequest) =>
    http.post<{ success: boolean }>('/communities/select', data),

  getSocialGroups: () =>
    http.get<{ items: SocialGroupDto[] }>('/communities/current/social-groups'),
};
