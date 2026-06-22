import { View, Text } from '@tarojs/components';
import './index.scss';

interface LoadingProps {
  text?: string;
}

export default function Loading({ text = '加载中...' }: LoadingProps) {
  return (
    <View className='loading'>
      <View className='loading__spinner' />
      <Text className='loading__text'>{text}</Text>
    </View>
  );
}
