// 开发阶段直接写死本地地址，上线前改为生产地址
const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';
// const API_BASE_URL = 'https://api.xiaoqubangbang.com/api/v1';

export const ENV = {
  API_BASE_URL,
  isDev: API_BASE_URL.includes('127.0.0.1') || API_BASE_URL.includes('localhost'),
} as const;
