import { View, Text } from '@tarojs/components';
import './index.scss';

interface AdPopupProps {
  visible: boolean;
  onClose: () => void;
}

// ponytail: 广告内容先用硬编码默认数据，后续需接公开 banner API 获取 Admin 管理的 published banner
const AD_CONTENT = {
  title: '本月热心邻居出炉啦',
  subtitle: '看看谁拿到了小红花',
  ctaText: '去看看',
};

export default function AdPopup({ visible, onClose }: AdPopupProps) {
  if (!visible) return null;
  return (
    <View className="ad-popup" onClick={onClose}>
      <View className="ad-popup__card" catchMove>
        <View className="ad-popup__close" onClick={onClose}>
          <Text className="ad-popup__close-icon">✕</Text>
        </View>
        <View className="ad-popup__content">
          <Text className="ad-popup__emoji">🌸</Text>
          <Text className="ad-popup__title">{AD_CONTENT.title}</Text>
          <Text className="ad-popup__subtitle">{AD_CONTENT.subtitle}</Text>
          <View className="ad-popup__cta" onClick={onClose}>
            <Text className="ad-popup__cta-text">{AD_CONTENT.ctaText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
