import { http } from './http';
import type {
  TopicDto,
  TopicDetailDto,
  TopicSuggestionDto,
  TopicCommentDto,
  TopicTimelineItem,
  CreateTopicRequest,
  CreateTopicCommentRequest,
  PaginatedData,
} from '@xiaoqu-bangbang/shared';

export const topicService = {
  list: (params: { status?: string; keyword?: string; page?: number; pageSize?: number }) =>
    http.get<PaginatedData<TopicDto>>('/topics', params),

  getById: (id: string) => http.get<TopicDetailDto>(`/topics/${id}`),

  create: (data: CreateTopicRequest) => http.post<TopicDto>('/topics', data),

  // P-117/P-118/P-121: like/dislike/rate/comment 返回完整 TopicDto，
  // 前端用窄类型 Pick<TopicDto, ...> 结构兼容，只取需要的字段
  like: (id: string, scope: 'open' | 'closed') =>
    http.post<{ likeCount: number; dislikeCount: number }>(`/topics/${id}/like`, { scope }),

  dislike: (id: string, scope: 'open' | 'closed') =>
    http.post<{ likeCount: number; dislikeCount: number }>(`/topics/${id}/dislike`, { scope }),

  unlike: (id: string, scope: 'open' | 'closed') =>
    http.del<{ likeCount: number; dislikeCount: number }>(`/topics/${id}/like?scope=${scope}`),

  rate: (id: string, rating: number) =>
    http.post<{ avgRating: number; ratingCount: number }>(`/topics/${id}/rating`, { rating }),

  timeline: (id: string, page = 1, pageSize = 10) =>
    http.get<PaginatedData<TopicTimelineItem>>(`/topics/${id}/timeline`, { page, pageSize }),

  comments: (
    id: string,
    params: { eventId?: string; sort?: 'hot' | 'new'; page?: number; pageSize?: number },
  ) => http.get<PaginatedData<TopicCommentDto>>(`/topics/${id}/comments`, params),

  createComment: (id: string, data: CreateTopicCommentRequest) =>
    http.post<TopicCommentDto>(`/topics/${id}/comments`, data),

  likeComment: (commentId: string) =>
    http.post<{ likeCount: number; dislikeCount: number }>(`/topics/comments/${commentId}/like`),

  dislikeComment: (commentId: string) =>
    http.post<{ likeCount: number; dislikeCount: number }>(`/topics/comments/${commentId}/dislike`),

  unlikeComment: (commentId: string) =>
    http.del<{ likeCount: number; dislikeCount: number }>(`/topics/comments/${commentId}/like`),

  suggestTopics: (title: string, description?: string) =>
    http.get<{ items: TopicSuggestionDto[] }>('/events/topic-suggestions', {
      title,
      description,
    }),
};
