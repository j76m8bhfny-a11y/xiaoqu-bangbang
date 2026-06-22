import { View, Text } from '@tarojs/components';
import './index.scss';

interface AppHeaderProps {
  communityName?: string;
  unreadCount?: number;
  onSwitchCommunity?: () => void;
  onNotificationClick?: () => void;
}

export default function AppHeader({
  communityName = '阳光花园',
  unreadCount = 3,
  onSwitchCommunity,
  onNotificationClick,
}: AppHeaderProps) {
  return (
    <View className='app-header'>
      <View className='app-header__left' onClick={onSwitchCommunity}>
        <Text className='app-header__community'>{communityName}</Text>
        <View className='app-header__arrow' />
      </View>
      <View className='app-header__right'>
        <View className='app-header__bell' onClick={onNotificationClick}>
          <View className='app-header__bell-icon'>
            <View className='app-header__bell-body' />
            <View className='app-header__bell-clapper' />
          </View>
          {unreadCount > 0 && (
            <View className='app-header__badge'>
              <Text className='app-header__badge-text'>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
