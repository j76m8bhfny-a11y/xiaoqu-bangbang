import { http } from './http';
import type { BannerDto, ServiceProviderDto, PaginatedData } from '@xiaoqu-bangbang/shared';

export const bannerService = {
  list: () => http.get<PaginatedData<BannerDto>>('/banners'),
};

export const serviceProviderService = {
  list: (params?: { communityId?: string; category?: string }) =>
    http.get<PaginatedData<ServiceProviderDto>>('/service-providers', params),

  getById: (id: string) => http.get<ServiceProviderDto>(`/service-providers/${id}`),
};
