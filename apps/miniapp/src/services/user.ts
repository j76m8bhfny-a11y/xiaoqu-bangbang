import { http } from './http';
import type { UserProfileDto } from '@xiaoqu-bangbang/shared';

export const userService = {
  getProfile: (userId: string) => http.get<UserProfileDto>(`/users/${userId}/profile`),
};
