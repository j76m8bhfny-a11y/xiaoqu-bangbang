import { http } from './http';
import type {
  GroupBuyDto,
  CreateGroupBuyRequest,
  RespondGroupBuyRequest,
  PaginatedData,
} from '@xiaoqu-bangbang/shared';

export interface GroupBuyListQuery {
  type?: string;
  page?: number;
  pageSize?: number;
}

export const groupBuyService = {
  list: (params?: GroupBuyListQuery) => http.get<PaginatedData<GroupBuyDto>>('/group-buys', params),

  create: (data: CreateGroupBuyRequest) => http.post<GroupBuyDto>('/group-buys', data),

  getById: (id: string) => http.get<GroupBuyDto>(`/group-buys/${id}`),

  update: (id: string, data: Partial<CreateGroupBuyRequest>) =>
    http.patch<GroupBuyDto>(`/group-buys/${id}`, data),

  respond: (id: string, data: RespondGroupBuyRequest) =>
    http.post(`/group-buys/${id}/respond`, data),

  confirmItem: (gbId: string, itemId: string) =>
    http.post(`/group-buys/${gbId}/items/${itemId}/confirm`),

  rejectItem: (gbId: string, itemId: string) =>
    http.post(`/group-buys/${gbId}/items/${itemId}/reject`),

  closeBid: (id: string) => http.post(`/group-buys/${id}/close-bid`),

  purchased: (id: string) => http.post(`/group-buys/${id}/purchased`),

  deliver: (gbId: string, itemId: string) =>
    http.post(`/group-buys/${gbId}/items/${itemId}/deliver`),

  cancelResponse: (id: string) => http.post(`/group-buys/${id}/cancel-response`),

  close: (id: string) => http.post(`/group-buys/${id}/close`),
};
