import { http } from './http';
import type { MarketItemDto, CreateMarketItemRequest, PaginatedData } from '@xiaoqu-bangbang/shared';

export const marketService = {
  list: (params?: { communityId?: string; category?: string; status?: string; keyword?: string; page?: number; pageSize?: number }) =>
    http.get<PaginatedData<MarketItemDto>>('/market/items', params),

  create: (data: CreateMarketItemRequest) =>
    http.post<MarketItemDto>('/market/items', data),

  getById: (id: string, communityId?: string) =>
    http.get<MarketItemDto>(`/market/items/${id}`, communityId ? { communityId } : undefined),

  update: (id: string, data: Partial<CreateMarketItemRequest>) =>
    http.patch<MarketItemDto>(`/market/items/${id}`, data),

  markSold: (id: string) =>
    http.post<MarketItemDto>(`/market/items/${id}/sold`),
};
