import { http } from './http';
import type { SubmitVerificationRequest, VerificationDto } from '@xiaoqu-bangbang/shared';

interface VerificationResultDto {
  id: string;
  status: string;
  ocrSummary: {
    communityName: string;
    address: string;
    ownerName: string;
    confidence: number;
  } | null;
  matchResult: { matched: boolean; confidence: number } | null;
}

export const verificationService = {
  submit: (data: SubmitVerificationRequest) =>
    http.post<VerificationResultDto>('/verifications', data),

  getMine: () => http.get<{ items: VerificationDto[] }>('/verifications/me'),
};
