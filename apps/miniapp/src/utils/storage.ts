import Taro from '@tarojs/taro';

const KEYS = {
  TOKEN: 'xbb_token',
  USER: 'xbb_user',
  COMMUNITY_ID: 'xbb_community_id',
} as const;

export function getToken(): string | null {
  return Taro.getStorageSync(KEYS.TOKEN) || null;
}

export function setToken(token: string): void {
  Taro.setStorageSync(KEYS.TOKEN, token);
}

export function removeToken(): void {
  Taro.removeStorageSync(KEYS.TOKEN);
}

export function getCachedUser<T>(): T | null {
  const raw = Taro.getStorageSync(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export function setCachedUser(user: unknown): void {
  Taro.setStorageSync(KEYS.USER, JSON.stringify(user));
}

export function removeCachedUser(): void {
  Taro.removeStorageSync(KEYS.USER);
}

export function getCachedCommunityId(): string | null {
  return Taro.getStorageSync(KEYS.COMMUNITY_ID) || null;
}

export function setCachedCommunityId(id: string): void {
  Taro.setStorageSync(KEYS.COMMUNITY_ID, id);
}
