import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { authService } from '@/services';
import { useAuthStore, useCommunityStore } from '@/store';
import './index.scss';

const handleLoginSuccess = (
  result: { token: string; user: any },
  setAuth: (t: string, u: any) => void,
  selectCommunity: (c: any) => void,
) => {
  setAuth(result.token, result.user);

  if (result.user.currentCommunityId && result.user.currentCommunityName) {
    selectCommunity({
      id: result.user.currentCommunityId,
      name: result.user.currentCommunityName,
    } as any);
    Taro.switchTab({ url: '/pages/home/index' });
  } else {
    Taro.redirectTo({ url: '/pages/community-select/index' });
  }
};

export default function Login() {
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const selectCommunity = useCommunityStore((s) => s.selectCommunity);

  const handleWechatLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const loginRes = await Taro.login();
      if (!loginRes.code) {
        Taro.showToast({ title: '微信登录失败', icon: 'none' });
        return;
      }
      const result = await authService.wechatLogin({ code: loginRes.code });
      handleLoginSuccess(result, setAuth, selectCommunity);
    } catch (err: any) {
      const msg = err?.message || '登录失败，请重试';
      console.error('[Login] error:', err);
      Taro.showToast({ title: msg, icon: 'none', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="login">
      <View className="login__content">
        <Text className="login__logo">🏠</Text>
        <Text className="login__title">小区帮榜棒</Text>
        <Text className="login__subtitle">让小区里的好事，被看见</Text>
        <View className="login__btn login__btn--wechat" onTap={handleWechatLogin}>
          <Text className="login__btn-text">{loading ? '登录中...' : '微信一键登录'}</Text>
        </View>
        <Text className="login__hint">登录即代表同意《用户协议》和《隐私政策》</Text>
      </View>
    </View>
  );
}
