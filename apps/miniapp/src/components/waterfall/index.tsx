import { View } from '@tarojs/components';
import { ReactNode } from 'react';
import './index.scss';

interface WaterfallProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemKey: keyof T;
}

// ponytail: 简化版瀑布流——按索引奇偶分配到左右两列，不做高度测量
// 升级路径：用 Taro.createSelectorQuery 测量真实高度，按累计高度分配
export default function Waterfall<T extends Record<string, any>>({
  items,
  renderItem,
  itemKey,
}: WaterfallProps<T>) {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, i) => {
    if (i % 2 === 0) left.push(item);
    else right.push(item);
  });

  return (
    <View className="waterfall">
      <View className="waterfall__col">
        {left.map((item, i) => (
          <View key={String(item[itemKey])} className="waterfall__item">
            {renderItem(item, i * 2)}
          </View>
        ))}
      </View>
      <View className="waterfall__col">
        {right.map((item, i) => (
          <View key={String(item[itemKey])} className="waterfall__item">
            {renderItem(item, i * 2 + 1)}
          </View>
        ))}
      </View>
    </View>
  );
}
