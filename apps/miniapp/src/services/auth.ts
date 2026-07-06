import { http } from './http';
import type {
  WechatLoginRequest,
  LoginResponse,
  UserDto,
  UpdateMeRequest,
  UpdateMeResponse,
  MyDashboardDto,
} from '@xiaoqu-bangbang/shared';

export const authService = {
  wechatLogin: (data: WechatLoginRequest) =>
    http.post<LoginResponse>('/auth/wechat-login', data, { skipAuth: true }),

  // ponytail: 临时调试登录，发布前删除
  devLogin: (userId: string) =>
    http.post<LoginResponse>('/auth/dev-login', { userId }, { skipAuth: true }),

  getMe: () => http.get<UserDto>('/me'),

  // P-91: updateMe 返回 5 字段子集，非完整 UserDto
  updateMe: (data: UpdateMeRequest) => http.patch<UpdateMeResponse>('/me', data),

  getDashboard: () => http.get<MyDashboardDto>('/me/dashboard'),
};
