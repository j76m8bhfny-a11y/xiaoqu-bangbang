import { View, Text } from '@tarojs/components';
import './index.scss';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
}

export default function SectionHeader({ title, subtitle, actionText, onAction }: SectionHeaderProps) {
  return (
    <View className='section-header'>
      <View className='section-header__left'>
        <Text className='section-header__title'>{title}</Text>
        {subtitle && <Text className='section-header__subtitle'>{subtitle}</Text>}
      </View>
      {actionText && (
        <View className='section-header__action' onClick={onAction}>
          <Text className='section-header__action-text'>{actionText}</Text>
          <Text className='section-header__action-arrow'>→</Text>
        </View>
      )}
    </View>
  );
}
