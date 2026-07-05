import { http } from './http';
import type {
  EventDto,
  CreateEventRequest,
  EventListQuery,
  EventApplicationDto,
  CreateApplicationRequest,
  PaginatedData,
  EventRateDto,
  EventRateRequest,
  EventParticipantDto,
  SelectParticipantRequest,
} from '@xiaoqu-bangbang/shared';

interface CommentDto {
  id: string;
  content: string;
  userId: string;
  userNickname: string;
  userAvatarUrl: string;
  createdAt: string;
}

interface FeedbackLogDto {
  id: string;
  status: string;
  content: string;
  images: string[];
  visibleToPublic: boolean;
  createdAt: string;
}

export const eventService = {
  list: (params?: EventListQuery) => http.get<PaginatedData<EventDto>>('/events', params),

  create: (data: CreateEventRequest) => http.post<EventDto>('/events', data),

  getById: (id: string) => http.get<EventDto>(`/events/${id}`),

  update: (id: string, data: Partial<CreateEventRequest>) =>
    http.patch<EventDto>(`/events/${id}`, data),

  respond: (eventId: string, data: CreateApplicationRequest) =>
    http.post<EventApplicationDto>(`/events/${eventId}/applications`, data),

  selectHelper: (eventId: string, applicationId: string) =>
    http.post<EventApplicationDto>(`/events/${eventId}/applications/${applicationId}/select`),

  requestCompletion: (eventId: string) =>
    http.post<EventDto>(`/events/${eventId}/complete/request`),

  confirmCompletion: (eventId: string) =>
    http.post<EventDto | { confirmed: string; waitingFor: string }>(
      `/events/${eventId}/complete/confirm`,
    ),

  toggleLike: (eventId: string) => http.post<{ liked: boolean }>(`/events/${eventId}/like`),

  sendThanks: (eventId: string) => http.post<void>(`/events/${eventId}/thanks`),

  toggleFavorite: (eventId: string) =>
    http.post<{ favorited: boolean }>(`/events/${eventId}/favorite`),

  close: (eventId: string) => http.post<EventDto>(`/events/${eventId}/close`),

  getComments: (eventId: string, params?: { page?: number; pageSize?: number }) =>
    http.get<PaginatedData<CommentDto>>(`/events/${eventId}/comments`, params),

  addComment: (eventId: string, data: { content: string }) =>
    http.post<CommentDto>(`/events/${eventId}/comments`, data),

  getApplications: (eventId: string) =>
    http.get<{ items: EventApplicationDto[] }>(`/events/${eventId}/applications`),

  getFeedbackLogs: (eventId: string) =>
    http.get<FeedbackLogDto[]>(`/events/${eventId}/feedback-logs`),

  rateEvent: (eventId: string, data: EventRateRequest) =>
    http.post<EventRateDto>(`/events/${eventId}/rate`, data),

  selectParticipant: (eventId: string, data: SelectParticipantRequest) =>
    http.post<EventParticipantDto>(`/events/${eventId}/participants`, data),

  confirmParticipant: (eventId: string, participantId: string) =>
    http.post<EventParticipantDto>(`/events/${eventId}/participants/${participantId}/confirm`),

  // ponytail: 没有 GET /events/:id/ratings 端点，评价列表 UI 暂缺。
  //           升级路径：后端补 GET 端点后，在此加 getEventRatings 方法。
};
