import { useEffect, useRef } from 'react';
import Taro from '@tarojs/taro';

/**
 * 表单草稿 hook：把当前表单 state 防抖写入本地存储，
 * 退出后下次进入页面可询问是否恢复。
 *
 * 用法：
 *   const { restore, clear, has } = useDraft('community_apply', { name, city, ... });
 *   // 表单挂载时调 has() + restore() + setXxx() 恢复；
 *   // 表单提交成功后调 clear()。
 */
const PREFIX = 'xbb_draft_';
const DEFAULT_DEBOUNCE = 800;

export function useDraft<T>(
  key: string,
  state: T,
  options: { debounce?: number; enabled?: boolean } = {},
) {
  const { debounce = DEFAULT_DEBOUNCE, enabled = true } = options;
  const timerRef = useRef<any>(null);
  const storageKey = PREFIX + key;

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        Taro.setStorageSync(storageKey, JSON.stringify(state));
      } catch {
        /* noop */
      }
    }, debounce);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, state, debounce, enabled]);

  const restore = (): T | null => {
    try {
      const raw = Taro.getStorageSync(storageKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  };

  const clear = () => {
    // 取消尚未触发的写入定时器，避免 clear 后还被 800ms 前那一脚 setTimeout 再写一次。
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      Taro.removeStorageSync(storageKey);
    } catch {
      /* noop */
    }
  };

  const has = (): boolean => {
    try {
      return !!Taro.getStorageSync(storageKey);
    } catch {
      return false;
    }
  };

  return { restore, clear, has };
}
