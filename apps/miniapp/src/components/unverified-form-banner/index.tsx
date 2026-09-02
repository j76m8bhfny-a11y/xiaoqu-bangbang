import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/store';
import Icon from '@/components/icon';
import './index.scss';

interface UnverifiedFormBannerProps {
  // 未认证状态下的提示文案。
  tip?: string;
  // 「去认证」按钮文案。
  ctaText?: string;
  // 认证页路径。
  verifyUrl?: string;
}

// 发布表单顶部的「未认证用户」提示横幅。仅当用户非 verified 时显示。
// 默认文案告知：发布后会带「未认证」标签，并提示去认证可去除。
export default function UnverifiedFormBanner({
  tip = '你尚未完成业主认证，发布内容将标注「未认证」',
  ctaText = '去认证',
  verifyUrl = '/pages/verify/index',
}: UnverifiedFormBannerProps) {
  const verifyStatus = useAuthStore((s) => s.user?.verifyStatus);
  if (verifyStatus === 'verified') return null;

  return (
    <View className="ufb">
      <View className="ufb__icon">
        <Icon name="help" size={20} color="#C9702F" />
      </View>
      <Text className="ufb__tip">{tip}</Text>
      <View className="ufb__cta" onClick={() => Taro.navigateTo({ url: verifyUrl })}>
        <Text className="ufb__cta-text">{ctaText}</Text>
      </View>
    </View>
  );
}
