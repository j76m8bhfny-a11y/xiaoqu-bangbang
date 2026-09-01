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
      <Icon name={icon as any} size={48} color="#6B7A6E" />
      <Text className="empty-state__text">{text}</Text>
    </View>
  );
}
