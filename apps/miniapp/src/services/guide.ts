import { http } from './http';
import type {
  GuideDto,
  GuideDetailDto,
  CreateGuideRequest,
  UpdateGuideRequest,
  GuideListQuery,
  GuideCommentDto,
  CreateGuideCommentRequest,
  PaginatedData,
} from '@xiaoqu-bangbang/shared';

export const guideService = {
  list: (params?: GuideListQuery) =>
    http.get<PaginatedData<GuideDto>>('/guides', params as Record<string, unknown>),

  getById: (id: string) => http.get<GuideDetailDto>(`/guides/${id}`),

  create: (data: CreateGuideRequest) => http.post<GuideDto>('/guides', data),

  update: (id: string, data: UpdateGuideRequest) => http.patch<GuideDto>(`/guides/${id}`, data),

  remove: (id: string) => http.del<{ success: boolean }>(`/guides/${id}`),

  toggleLike: (id: string) =>
    http.post<{ liked: boolean; likeCount: number }>(`/guides/${id}/like`),

  toggleFavorite: (id: string) =>
    http.post<{ favorited: boolean; favoriteCount: number }>(`/guides/${id}/favorite`),

  getComments: (id: string) => http.get<{ items: GuideCommentDto[] }>(`/guides/${id}/comments`),

  addComment: (id: string, data: CreateGuideCommentRequest) =>
    http.post<GuideCommentDto>(`/guides/${id}/comments`, data),

  toggleCommentLike: (commentId: string) =>
    http.post<{ liked: boolean; likeCount: number }>(`/guides/comments/${commentId}/like`),
};
