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
  MatchedSkillDto,
} from '@xiaoqu-bangbang/shared';

interface CommentDto {
  id: string;
  content: string;
  userId: string;
  userNickname: string;
  userAvatarUrl: string;
  eventId: string;
  parentId: string | null;
  status: string;
  aiReviewStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackLogDto {
  id: string;
  status: string;
  content: string;
  images: string[];
  visibleToPublic: boolean;
  createdAt: string;
}

// P-101: requestCompletion 返回 EventCompletionConfirmation 记录，非 EventDto
interface CompletionConfirmationDto {
  id: string;
  eventId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
    // P-102: 后端返回完整 EventDto（含 include），非 EventApplicationDto
    http.post<EventDto>(`/events/${eventId}/applications/${applicationId}/select`),

  requestCompletion: (eventId: string) =>
    // P-101: 返回 EventCompletionConfirmation 记录
    http.post<CompletionConfirmationDto>(`/events/${eventId}/complete/request`),

  confirmCompletion: (eventId: string) =>
    http.post<EventDto | { confirmed: string; waitingFor: string }>(
      `/events/${eventId}/complete/confirm`,
    ),

  toggleLike: (eventId: string) => http.post<{ liked: boolean }>(`/events/${eventId}/like`),

  sendThanks: (eventId: string, toUserId?: string) =>
    http.post<void>(`/events/${eventId}/thanks`, toUserId ? { toUserId } : undefined),

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
    // P-104: 后端返回 { items: FeedbackLogDto[] }
    http.get<{ items: FeedbackLogDto[] }>(`/events/${eventId}/feedback-logs`),

  rateEvent: (eventId: string, data: EventRateRequest) =>
    http.post<EventRateDto>(`/events/${eventId}/rate`, data),

  selectParticipant: (eventId: string, data: SelectParticipantRequest) =>
    http.post<EventParticipantDto>(`/events/${eventId}/participants`, data),

  confirmParticipant: (eventId: string, participantId: string) =>
    http.post<EventParticipantDto>(`/events/${eventId}/participants/${participantId}/confirm`),

  getMatchedSkills: (eventId: string) =>
    http.get<{ items: MatchedSkillDto[] }>(`/events/${eventId}/matched-skills`),

  getEventRatings: (eventId: string) =>
    http.get<{ items: EventRateDto[] }>(`/events/${eventId}/ratings`),
};
