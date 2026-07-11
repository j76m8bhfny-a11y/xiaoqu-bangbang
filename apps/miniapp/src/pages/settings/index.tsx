import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/store';
import './index.scss';
import Icon from '@/components/icon';

export default function Settings() {
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
    }).then(({ confirm }) => {
      if (confirm) {
        logout();
        Taro.redirectTo({ url: '/pages/login/index' });
      }
    });
  };

  const handleClearCache = () => {
    Taro.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？',
    }).then(({ confirm }) => {
      if (confirm) {
        try {
          Taro.clearStorage();
          Taro.showToast({ title: '缓存已清除', icon: 'success' });
        } catch {
          Taro.showToast({ title: '清除失败', icon: 'none' });
        }
      }
    });
  };

  const handlePrivacyPolicy = () => {
    Taro.showToast({ title: '隐私政策页面开发中', icon: 'none' });
  };

  return (
    <View className="settings">
      <ScrollView scrollY className="settings__scroll">
        {/* 账号安全 */}
        <View className="settings__section">
          <Text className="settings__section-title">账号安全</Text>
          <View className="settings__menu-item" onClick={handleLogout}>
            <View className="settings__menu-left">
              <View className="settings__menu-icon">
                <Icon name="door" size={22} />
              </View>
              <Text className="settings__menu-label">退出登录</Text>
            </View>
            <Text className="settings__menu-arrow">›</Text>
          </View>
        </View>

        {/* 通用 */}
        <View className="settings__section">
          <Text className="settings__section-title">通用</Text>
          <View className="settings__menu-item" onClick={handleClearCache}>
            <View className="settings__menu-left">
              <View className="settings__menu-icon">
                <Icon name="trash" size={22} color="#D9534F" />
              </View>
              <Text className="settings__menu-label">清除缓存</Text>
            </View>
            <Text className="settings__menu-arrow">›</Text>
          </View>
        </View>

        {/* 关于 */}
        <View className="settings__section">
          <Text className="settings__section-title">关于</Text>
          <View className="settings__menu-item" onClick={handlePrivacyPolicy}>
            <View className="settings__menu-left">
              <View className="settings__menu-icon">
                <Icon name="lock" size={22} />
              </View>
              <Text className="settings__menu-label">隐私政策</Text>
            </View>
            <Text className="settings__menu-arrow">›</Text>
          </View>
          <View className="settings__menu-item">
            <View className="settings__menu-left">
              <View className="settings__menu-icon">
                <Icon name="bulb" size={22} color="#E89B6C" />
              </View>
              <Text className="settings__menu-label">关于我们</Text>
            </View>
            <Text className="settings__menu-value">小区帮榜棒 v1.0.0</Text>
          </View>
        </View>

        <View className="settings__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
