import { http } from './http';
import type { BannerDto, ServiceProviderDto, PaginatedData } from '@xiaoqu-bangbang/shared';

export const bannerService = {
  list: (communityId?: string) =>
    http.get<PaginatedData<BannerDto>>('/banners', communityId ? { communityId } : undefined),
};

export const serviceProviderService = {
  list: (params?: { communityId?: string; category?: string }) =>
    http.get<PaginatedData<ServiceProviderDto>>('/service-providers', params),

  getById: (id: string) =>
    http.get<ServiceProviderDto>(`/service-providers/${id}`),
};
