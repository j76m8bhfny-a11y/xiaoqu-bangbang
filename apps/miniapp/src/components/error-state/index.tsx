import { View, Text } from '@tarojs/components';
import './index.scss';
import Icon from '@/components/icon';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = '加载失败', onRetry }: ErrorStateProps) {
  return (
    <View className="error-state">
      <View className="error-state__icon">
        <Icon name="sad" size={48} />
      </View>
      <Text className="error-state__text">{message}</Text>
      {onRetry && (
        <View className="error-state__retry" onClick={onRetry}>
          <Text className="error-state__retry-text">重试</Text>
        </View>
      )}
    </View>
  );
}
