import { http } from './http';
import type {
  UserProfileDto,
  UserSkillDto,
  CreateSkillRequest,
  UpdateSkillRequest,
} from '@xiaoqu-bangbang/shared';

export const userService = {
  getProfile: (userId: string) => http.get<UserProfileDto>(`/users/${userId}/profile`),

  getMySkills: () => http.get<{ items: UserSkillDto[] }>('/users/skills'),

  createSkill: (data: CreateSkillRequest) => http.post<UserSkillDto>('/users/skills', data),

  updateSkill: (skillId: string, data: UpdateSkillRequest) =>
    http.patch<UserSkillDto>(`/users/skills/${skillId}`, data),

  deleteSkill: (skillId: string) => http.del<void>(`/users/skills/${skillId}`),
};
