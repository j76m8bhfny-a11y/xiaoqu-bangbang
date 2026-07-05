import { http } from './http';
import type {
  MarketItemDto,
  CreateMarketItemRequest,
  PaginatedData,
  MarketReviewDto,
} from '@xiaoqu-bangbang/shared';

export interface MarketCommentDto {
  id: string;
  itemId: string;
  userId: string;
  parentId: string | null;
  content: string;
  status: string;
  createdAt: string;
  user: { id: string; nickname: string; avatarUrl: string };
}

export const marketService = {
  list: (params?: {
    communityId?: string;
    category?: string;
    status?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) => http.get<PaginatedData<MarketItemDto>>('/market/items', params),

  create: (data: CreateMarketItemRequest) => http.post<MarketItemDto>('/market/items', data),

  getById: (id: string, communityId?: string) =>
    http.get<MarketItemDto>(`/market/items/${id}`, communityId ? { communityId } : undefined),

  update: (id: string, data: Partial<CreateMarketItemRequest>) =>
    http.patch<MarketItemDto>(`/market/items/${id}`, data),

  markSold: (id: string) => http.post<MarketItemDto>(`/market/items/${id}/sold`),

  closeItem: (id: string) => http.post<MarketItemDto>(`/market/items/${id}/close`),

  toggleLike: (id: string) =>
    http.post<{ liked: boolean; likeCount: number }>(`/market/items/${id}/like`),

  getComments: (id: string) =>
    http.get<{ items: MarketCommentDto[] }>(`/market/items/${id}/comments`),

  addComment: (id: string, data: { content: string; parentId?: string }) =>
    http.post<MarketCommentDto>(`/market/items/${id}/comments`, data),

  addReview: (
    id: string,
    data: { revieweeId: string; rating: number; tags?: string[]; content?: string },
  ) => http.post<MarketReviewDto>(`/market/items/${id}/reviews`, data),

  getReviews: (id: string) => http.get<{ items: MarketReviewDto[] }>(`/market/items/${id}/reviews`),
};
