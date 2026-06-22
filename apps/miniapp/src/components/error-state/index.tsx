import { View, Text } from '@tarojs/components';
import './index.scss';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = '加载失败', onRetry }: ErrorStateProps) {
  return (
    <View className='error-state'>
      <Text className='error-state__icon'>😟</Text>
      <Text className='error-state__text'>{message}</Text>
      {onRetry && (
        <View className='error-state__retry' onClick={onRetry}>
          <Text className='error-state__retry-text'>重试</Text>
        </View>
      )}
    </View>
  );
}
