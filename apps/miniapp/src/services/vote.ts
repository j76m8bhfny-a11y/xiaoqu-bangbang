import { http } from './http';
import type { VoteDto, SubmitVoteRequest, PaginatedData } from '@xiaoqu-bangbang/shared';

interface VoteResultDto {
  id: string;
  title: string;
  totalVoters: number;
  options: { id: string; content: string; sortOrder: number; count: number; percentage: number }[];
}

export const voteService = {
  list: () =>
    http.get<PaginatedData<VoteDto>>('/votes'),

  getById: (id: string) =>
    http.get<VoteDto>(`/votes/${id}`),

  submitVote: (voteId: string, data: SubmitVoteRequest) =>
    http.post<{ id: string; votedAt: string }>(`/votes/${voteId}/records`, data),

  getResults: (voteId: string) =>
    http.get<VoteResultDto>(`/votes/${voteId}/results`),
};
