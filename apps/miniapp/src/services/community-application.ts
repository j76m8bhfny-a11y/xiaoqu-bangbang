import { http } from './http';
import { getToken } from '@/utils/storage';
import type {
  CreateCommunityApplicationRequest,
  CommunityApplicationDto,
} from '@xiaoqu-bangbang/shared';

export const communityApplicationService = {
  create: (data: CreateCommunityApplicationRequest) =>
    http.post<CommunityApplicationDto>('/community-applications', data),

  list: (params?: {
    status?: string;
    city?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) =>
    http.get<{ items: CommunityApplicationDto[]; total: number }>(
      '/community-applications',
      params,
    ),

  listMine: () => http.get<{ items: CommunityApplicationDto[] }>('/community-applications/me'),

  listSupported: () =>
    http.get<{ items: CommunityApplicationDto[] }>('/community-applications/supported'),

  // 登录态走 /:id/me 拿 hasSupported；未登录走 /:id 公开端点（支持邻居打开分享链接）
  detail: (id: string) =>
    getToken()
      ? http.get<CommunityApplicationDto>(`/community-applications/${id}/me`)
      : http.get<CommunityApplicationDto>(`/community-applications/${id}`),

  support: (id: string) => http.post<{ ok: boolean }>(`/community-applications/${id}/support`),
};
