import { View, Text, Input } from '@tarojs/components';
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
  const [devLoading, setDevLoading] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const selectCommunity = useCommunityStore((s) => s.selectCommunity);

  const handleDevLogin = async () => {
    if (devLoading) return;
    setDevLoading(true);
    try {
      const devCode = `dev_${Date.now()}`;
      const result = await authService.wechatLogin({ code: devCode });
      handleLoginSuccess(result, setAuth, selectCommunity);
    } catch (err: any) {
      console.error('[Login] dev login error:', err);
      Taro.showToast({ title: '开发登录失败', icon: 'none' });
    } finally {
      setDevLoading(false);
    }
  };

  // 临时：用指定 code 登录已存在用户（验收测试用，测完删除）
  const handleCustomLogin = async () => {
    if (customLoading || !customCode.trim()) return;
    setCustomLoading(true);
    try {
      const result = await authService.wechatLogin({ code: customCode.trim() });
      handleLoginSuccess(result, setAuth, selectCommunity);
    } catch (err: any) {
      console.error('[Login] custom login error:', err);
      Taro.showToast({ title: err?.message || '登录失败', icon: 'none' });
    } finally {
      setCustomLoading(false);
    }
  };

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
        <View className="login__btn" onTap={handleDevLogin}>
          <Text className="login__btn-text">{devLoading ? '登录中...' : '开发模式登录'}</Text>
        </View>
        <View className="login__btn login__btn--wechat" onTap={handleWechatLogin}>
          <Text className="login__btn-text">{loading ? '登录中...' : '微信一键登录'}</Text>
        </View>
        {/* 临时：指定 code 登录（验收测试用，测完删除） */}
        <View className="login__dev-code-wrap" style={{ marginTop: '24rpx', padding: '0 40rpx' }}>
          <Input
            className="login__dev-code-input"
            style={{
              border: '1rpx solid #ccc',
              borderRadius: '12rpx',
              padding: '16rpx 20rpx',
              fontSize: '28rpx',
              background: '#fff',
            }}
            placeholder="输入指定 code（如 dev_1782454853982）"
            value={customCode}
            onInput={(e) => setCustomCode(e.detail.value)}
          />
          <View
            className="login__dev-code-btn"
            style={{
              marginTop: '16rpx',
              height: '80rpx',
              lineHeight: '80rpx',
              textAlign: 'center',
              background: '#5b9e6f',
              color: '#fff',
              borderRadius: '12rpx',
              fontSize: '28rpx',
            }}
            onTap={handleCustomLogin}
          >
            <Text>{customLoading ? '登录中...' : '用指定 code 登录'}</Text>
          </View>
        </View>
        <Text className="login__hint">登录即代表同意《用户协议》和《隐私政策》</Text>
      </View>
    </View>
  );
}
