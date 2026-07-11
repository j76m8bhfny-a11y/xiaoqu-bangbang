import { View, Text } from '@tarojs/components';
import './index.scss';
import Icon from '@/components/icon';

interface EmptyStateProps {
  icon?: string;
  text?: string;
}

export default function EmptyState({ icon = 'inbox', text = '暂无内容' }: EmptyStateProps) {
  return (
    <View className="empty-state">
      <Text className="empty-state__icon">{icon}</Text>
      <Text className="empty-state__text">{text}</Text>
    </View>
  );
}
