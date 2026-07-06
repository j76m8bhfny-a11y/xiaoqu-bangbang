import Taro from '@tarojs/taro';
import { ENV } from '@/config/env';
import { getToken, removeToken } from '@/utils/storage';
import type { ApiResponse } from '@xiaoqu-bangbang/shared';
import { ErrorCodes } from '@xiaoqu-bangbang/shared';

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  data?: unknown;
  header?: Record<string, string>;
  skipAuth?: boolean;
}

let isRelaunching = false;

async function request<T>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, header = {}, skipAuth = false } = options;

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }
  }

  // 微信 wx.request 对 GET 请求中 undefined 字段会序列化成字符串 "undefined"，
  // 导致后端按字面值 "undefined" 过滤。先剔除掉。
  const cleanedData =
    method === 'GET' && data && typeof data === 'object' && !Array.isArray(data)
      ? Object.fromEntries(
          Object.entries(data as Record<string, unknown>).filter(([, v]) => v !== undefined),
        )
      : data;

  const res = await Taro.request({
    url: `${ENV.API_BASE_URL}${url}`,
    method,
    data: cleanedData,
    timeout: 10000,
    header: {
      'Content-Type': 'application/json',
      ...header,
    },
  });

  if (res.statusCode >= 500) {
    throw new ApiError(ErrorCodes.SERVER_ERROR, '服务器错误，请稍后重试');
  }

  const body = res.data as ApiResponse<T>;

  if (body.code !== 0) {
    if (body.code === ErrorCodes.UNAUTHORIZED) {
      removeToken();
      if (!isRelaunching) {
        isRelaunching = true;
        Taro.reLaunch({ url: '/pages/login/index' }).finally(() => {
          isRelaunching = false;
        });
      }
    }

    if (body.code === 40301) {
      Taro.navigateTo({ url: '/pages/community-select/index' });
    }

    throw new ApiError(body.code, body.message || '请求失败');
  }

  return body.data;
}

export const http = {
  get<T>(url: string, data?: unknown, opts?: Partial<RequestOptions>): Promise<T> {
    return request<T>({ url, method: 'GET', data, ...opts });
  },
  post<T>(url: string, data?: unknown, opts?: Partial<RequestOptions>): Promise<T> {
    return request<T>({ url, method: 'POST', data, ...opts });
  },
  patch<T>(url: string, data?: unknown, opts?: Partial<RequestOptions>): Promise<T> {
    return request<T>({ url, method: 'PATCH', data, ...opts });
  },
  del<T>(url: string, data?: unknown, opts?: Partial<RequestOptions>): Promise<T> {
    return request<T>({ url, method: 'DELETE', data, ...opts });
  },
  upload(filePath: string): Promise<{ url: string }> {
    const token = getToken();
    return new Promise<{ url: string }>((resolve, reject) => {
      Taro.uploadFile({
        url: `${ENV.API_BASE_URL}/upload`,
        filePath,
        name: 'file',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          if (res.statusCode >= 400) {
            reject(new ApiError(res.statusCode, '上传失败'));
            return;
          }
          const body = JSON.parse(res.data) as ApiResponse<{ url: string }>;
          if (body.code !== 0) {
            reject(new ApiError(body.code, body.message || '上传失败'));
            return;
          }
          resolve(body.data);
        },
        fail: (err) => reject(new Error(err.errMsg || '上传失败')),
      });
    });
  },
};
