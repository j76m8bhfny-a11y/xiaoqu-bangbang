import { http } from './http';
import type {
  RankingItemDto,
  MyRankingDto,
  RankingQuery,
  PaginatedData,
} from '@xiaoqu-bangbang/shared';

interface BadgeDto {
  id: string;
  name: string;
  code?: string;
  icon: string;
  description: string;
  earned?: boolean;
}

export const rankingService = {
  list: (params: RankingQuery) => http.get<PaginatedData<RankingItemDto>>('/rankings', params),

  getMyRanking: (params?: { periodType?: string; periodKey?: string }) =>
    http.get<MyRankingDto>('/rankings/me', params),

  getBadges: () => http.get<{ items: BadgeDto[] }>('/badges'),

  getMyBadges: () => http.get<{ items: BadgeDto[] }>('/me/badges'),
};
