import { View, Text, ScrollView } from '@tarojs/components';
import { useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { notificationService } from '@/services';
import { usePaginatedList } from '@/hooks';
import { useNotificationStore } from '@/store';
import type { NotificationDto } from '@xiaoqu-bangbang/shared';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import NavBar from '@/components/navbar';
import Icon, { type IconName } from '@/components/icon';
import './index.scss';

const TYPE_ICON_MAP: Record<string, IconName> = {
  review_result: 'clipboard',
  event_response: 'handshake',
  completion: 'check-circle',
  badge: 'medal',
  feedback: 'megaphone',
  vote: 'vote',
  announcement: 'megaphone',
  system: 'bell',
};

const TYPE_COLOR_MAP: Record<string, string> = {
  review_result: '#5B9E6F',
  event_response: '#5B9E6F',
  completion: '#5B9E6F',
  badge: '#E89B6C',
  feedback: '#E89B6C',
  vote: '#5B9E6F',
  announcement: '#E89B6C',
  system: '#5B9E6F',
};

function formatTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function Notifications() {
  const { unreadCount, setUnreadCount, decrementUnread } = useNotificationStore();

  const fetcher = useCallback(
    (page: number, pageSize: number) => notificationService.list({ page, pageSize }),
    [],
  );

  const { items, loading, loadingMore, hasMore, error, refresh, loadMore } =
    usePaginatedList<NotificationDto>(fetcher, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      refresh();
      Taro.showToast({ title: '已全部标记为已读', icon: 'success' });
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleNotificationClick = async (item: NotificationDto) => {
    if (!item.isRead) {
      try {
        await notificationService.markRead(item.id);
        decrementUnread();
      } catch {
        // silent fail
      }
    }

    const targetType = item.targetType;
    const targetId = item.targetId;
    if (!targetType || !targetId) return;

    const routeMap: Record<string, string> = {
      event: `/pages/event-detail/index?id=${targetId}`,
      market_item: `/pages/market-detail/index?id=${targetId}`,
      event_comment: `/pages/event-detail/index?id=${targetId}`,
      market_comment: `/pages/market-detail/index?id=${targetId}`,
      topic: `/pages/topic-detail/index?id=${targetId}`,
      vote: `/pages/vote-detail/index?id=${targetId}`,
      announcement: `/pages/committee-announcement/index?id=${targetId}`,
    };

    const url = routeMap[targetType];
    if (url) {
      Taro.navigateTo({ url });
    }
  };

  const handleScrollToLower = () => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  };

  const rightAction =
    unreadCount > 0 ? (
      <Text style={{ fontSize: '13px', color: '#5B9E6F', fontWeight: 600 }}>全部已读</Text>
    ) : null;

  return (
    <View className="notifications">
      <NavBar title="消息通知" rightAction={rightAction} onRightClick={handleMarkAllRead} />

      <ScrollView scrollY className="notifications__list" onScrollToLower={handleScrollToLower}>
        {loading && <Loading />}
        {error && <ErrorState message={error.message} onRetry={refresh} />}
        {!loading && !error && items.length === 0 && <EmptyState icon="bell" text="暂无消息通知" />}
        {!loading &&
          !error &&
          items.map((item) => {
            const iconName = TYPE_ICON_MAP[item.type] || 'bell';
            const color = TYPE_COLOR_MAP[item.type] || '#5B9E6F';
            return (
              <View
                key={item.id}
                className="notifications__item"
                onClick={() => handleNotificationClick(item)}
              >
                <View className="notifications__item-icon" style={{ background: color + '18' }}>
                  <Icon name={iconName} size={20} color={color} />
                </View>
                <View className="notifications__item-content">
                  <Text className="notifications__item-title">{item.title}</Text>
                  <Text className="notifications__item-desc">{item.content}</Text>
                  <Text className="notifications__item-time">{formatTime(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View className="notifications__item-dot" />}
              </View>
            );
          })}
        {loadingMore && <Loading text="加载更多..." />}
        <View className="notifications__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
