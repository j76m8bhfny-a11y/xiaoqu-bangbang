import { http } from './http';
import type { NotificationDto, PaginatedData } from '@xiaoqu-bangbang/shared';

export const notificationService = {
  list: (params?: { isRead?: boolean; page?: number; pageSize?: number }) =>
    http.get<PaginatedData<NotificationDto>>('/notifications', params),

  markRead: (id: string) =>
    http.post<NotificationDto>(`/notifications/${id}/read`),

  markAllRead: () =>
    http.post<void>('/notifications/read-all'),
};
