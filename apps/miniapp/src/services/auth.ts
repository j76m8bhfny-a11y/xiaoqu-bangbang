import { http } from './http';
import type { WechatLoginRequest, LoginResponse, UserDto, UpdateMeRequest } from '@xiaoqu-bangbang/shared';

export const authService = {
  wechatLogin: (data: WechatLoginRequest) =>
    http.post<LoginResponse>('/auth/wechat-login', data, { skipAuth: true }),

  getMe: () =>
    http.get<UserDto>('/me'),

  updateMe: (data: UpdateMeRequest) =>
    http.patch<UserDto>('/me', data),
};
