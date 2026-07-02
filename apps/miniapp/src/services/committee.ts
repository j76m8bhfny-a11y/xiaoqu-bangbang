import { http } from './http';
import type {
  CommitteeMemberDto,
  ClaimCommitteeMemberRequest,
  CommitteeAnnouncementDto,
  PaginatedData,
} from '@xiaoqu-bangbang/shared';

interface CommitteeOverviewDto {
  memberCount: number;
  announcementCount: number;
  latestAnnouncement: { id: string; title: string; publishedAt: string } | null;
}

interface CommitteeMemberDetailDto extends CommitteeMemberDto {
  claims: { id: string; userId: string; statement: string; status: string; createdAt: string }[];
}

interface CommitteeMemberClaimDto {
  id: string;
  committeeMemberId: string;
  statement: string;
  status: string;
  createdAt: string;
  committeeMember: { name: string; position: string; avatarUrl: string | null };
}

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
    http.get<CommitteeAnnouncementDto & { isLiked: boolean; likeCount: number }>(
      `/committee/announcements/${id}`,
    ),

  toggleAnnouncementLike: (id: string) =>
    http.post<{ liked: boolean; likeCount: number }>(`/committee/announcements/${id}/like`),
};
