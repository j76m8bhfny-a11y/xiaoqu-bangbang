import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/store';
import type { ReactNode } from 'react';
import './index.scss';

interface BlurredListProps<T> {
  items: T[];
  // 未认证用户最多可清晰看到的条数；后续项加磨砂遮挡。
  previewCount?: number;
  // 单项渲染函数（已包含 key 时 caller 自行处理）。
  renderItem: (item: T, index: number) => ReactNode;
  // 自定义遮挡层文案。
  blurTip?: string;
  // 自定义遮挡层 CTA。
  blurCtaText?: string;
  // 认证页路径。
  verifyUrl?: string;
}

// 已认证：完整渲染。
// 未认证：前 previewCount 条正常显示，后续项加磨砂遮罩，整体顶部叠一个「认证后可见全部」CTA。
export default function BlurredList<T>({
  items,
  previewCount = 5,
  renderItem,
  blurTip = '完成认证后查看更多',
  blurCtaText = '去认证',
  verifyUrl = '/pages/verify/index',
}: BlurredListProps<T>) {
  const verifyStatus = useAuthStore((s) => s.user?.verifyStatus);
  const locked = verifyStatus !== 'verified';

  if (!locked || items.length <= previewCount) {
    return <>{items.map((item, i) => renderItem(item, i))}</>;
  }

  const visible = items.slice(0, previewCount);
  const blurred = items.slice(previewCount);

  return (
    <View className="bl">
      {visible.map((item, i) => renderItem(item, i))}
      <View className="bl__veil-wrap">
        <View className="bl__veil-items">
          {blurred.map((item, i) => renderItem(item, i + previewCount))}
        </View>
        <View className="bl__veil">
          <Text className="bl__veil-tip">{blurTip}</Text>
          <View className="bl__veil-cta" onClick={() => Taro.navigateTo({ url: verifyUrl })}>
            <Text className="bl__veil-cta-text">{blurCtaText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
