import { http } from './http';

export const reportService = {
  submit: (data: { targetType: string; targetId: string; reason: string }) =>
    http.post<void>('/reports', data),
};
