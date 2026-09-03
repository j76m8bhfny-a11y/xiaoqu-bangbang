import { http } from './http';
import type { FeedItemDto, PaginatedData } from '@xiaoqu-bangbang/shared';

export interface FeedListQuery {
  page?: number;
  pageSize?: number;
}

export const feedService = {
  // M23: /feed/all 聚合 events + group_buys，统一返回 FeedItemDto
  all: (params?: FeedListQuery) => http.get<PaginatedData<FeedItemDto>>('/feed/all', params),
};
