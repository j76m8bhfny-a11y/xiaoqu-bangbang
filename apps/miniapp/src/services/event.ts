import { http } from './http';
import type {
  EventDto, CreateEventRequest, EventListQuery,
  EventApplicationDto, CreateApplicationRequest, PaginatedData,
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
  list: (params?: EventListQuery) =>
    http.get<PaginatedData<EventDto>>('/events', params),

  create: (data: CreateEventRequest) =>
    http.post<EventDto>('/events', data),

  getById: (id: string) =>
    http.get<EventDto>(`/events/${id}`),

  update: (id: string, data: Partial<CreateEventRequest>) =>
    http.patch<EventDto>(`/events/${id}`, data),

  respond: (eventId: string, data: CreateApplicationRequest) =>
    http.post<EventApplicationDto>(`/events/${eventId}/applications`, data),

  selectHelper: (eventId: string, applicationId: string) =>
    http.post<EventApplicationDto>(`/events/${eventId}/applications/${applicationId}/select`),

  requestCompletion: (eventId: string) =>
    http.post<EventDto>(`/events/${eventId}/complete/request`),

  confirmCompletion: (eventId: string) =>
    http.post<EventDto>(`/events/${eventId}/complete/confirm`),

  toggleLike: (eventId: string) =>
    http.post<{ liked: boolean }>(`/events/${eventId}/like`),

  sendThanks: (eventId: string) =>
    http.post<void>(`/events/${eventId}/thanks`),

  toggleFavorite: (eventId: string) =>
    http.post<{ favorited: boolean }>(`/events/${eventId}/favorite`),

  close: (eventId: string) =>
    http.post<EventDto>(`/events/${eventId}/close`),

  getComments: (eventId: string, params?: { page?: number; pageSize?: number }) =>
    http.get<PaginatedData<CommentDto>>(`/events/${eventId}/comments`, params),

  addComment: (eventId: string, data: { content: string }) =>
    http.post<CommentDto>(`/events/${eventId}/comments`, data),

  getApplications: (eventId: string) =>
    http.get<{ items: EventApplicationDto[] }>(`/events/${eventId}/applications`),

  getFeedbackLogs: (eventId: string) =>
    http.get<FeedbackLogDto[]>(`/events/${eventId}/feedback-logs`),
};
