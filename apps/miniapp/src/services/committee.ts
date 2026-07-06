import { http } from './http';
import type {
  CommitteeMemberDto,
  ClaimCommitteeMemberRequest,
  CommitteeAnnouncementDto,
  CommitteeOverviewDto,
  CommitteeMemberDetailDto,
  CommitteeMemberClaimDto,
  PaginatedData,
} from '@xiaoqu-bangbang/shared';

export const committeeService = {
  getOverview: () => http.get<CommitteeOverviewDto>('/committee'),

  getMembers: () => http.get<PaginatedData<CommitteeMemberDto>>('/committee/members'),

  getMemberDetail: (id: string) => http.get<CommitteeMemberDetailDto>(`/committee/members/${id}`),

  claimMembership: (memberId: string, data: ClaimCommitteeMemberRequest) =>
    http.post<{ id: string; status: string; createdAt: string }>(
      `/committee/members/${memberId}/claim`,
      data,
    ),

  getMyClaims: () => http.get<{ items: CommitteeMemberClaimDto[] }>('/me/committee-claims'),

  getAnnouncements: () =>
    http.get<PaginatedData<CommitteeAnnouncementDto>>('/committee/announcements'),

  getAnnouncementDetail: (id: string) =>
    http.get<CommitteeAnnouncementDto>(`/committee/announcements/${id}`),

  toggleAnnouncementLike: (id: string) =>
    http.post<{ liked: boolean; likeCount: number }>(`/committee/announcements/${id}/like`),
};
