import Taro from '@tarojs/taro';

// 开发阶段直接写死本地地址，上线前改为生产地址
// 双地址策略：模拟器跑在开发机本机，永远走 127.0.0.1（换网络不受影响）；
//             真机预览走局域网 IP，换网络后跑 `pnpm sync:lan` 同步并重建。
const DEV_API_BASE_URL = 'http://127.0.0.1:3000/api/v1'; // 模拟器（devtools）
const LAN_API_BASE_URL = 'http://192.168.60.142:3000/api/v1'; // 真机（局域网）
// const PROD_API_BASE_URL = 'https://api.xiaoqubangbang.com/api/v1';

export const ENV = {
  API_BASE_URL: LAN_API_BASE_URL,
  DEV_API_BASE_URL,
  LAN_API_BASE_URL,
  isDev: true,
} as const;

/** 运行时解析请求基地址：模拟器用本机回环，真机用局域网地址 */
export function resolveApiBaseUrl(): string {
  try {
    const { platform } = Taro.getSystemInfoSync();
    if (platform === 'devtools') return DEV_API_BASE_URL;
  } catch {
    // fallback
  }
  return LAN_API_BASE_URL;
}
