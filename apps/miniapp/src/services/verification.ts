import { http } from './http';
import type {
  SubmitVerificationRequest,
  SubmitVerificationResponse,
  VerificationDto,
} from '@xiaoqu-bangbang/shared';

export const verificationService = {
  submit: (data: SubmitVerificationRequest) =>
    http.post<SubmitVerificationResponse>('/verifications', data),

  getMine: () => http.get<{ items: VerificationDto[] }>('/verifications/me'),
};
