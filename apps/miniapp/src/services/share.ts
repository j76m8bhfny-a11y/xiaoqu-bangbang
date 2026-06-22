import { http } from './http';
import type { ShareCardConfig, ShareLogRequest } from '@xiaoqu-bangbang/shared';

export const shareService = {
  getCardConfig: (params: { targetType: string; targetId: string }) =>
    http.get<ShareCardConfig>('/share/card-config', params),

  logShare: (data: ShareLogRequest) =>
    http.post('/share/logs', data),
};
