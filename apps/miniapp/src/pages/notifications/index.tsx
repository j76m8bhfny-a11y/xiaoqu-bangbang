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
import './index.scss';

const TYPE_ICON_MAP: Record<string, string> = {
  review_result: '\u{1F4CB}',
  event_response: '\u{1F91D}',
  completion: '\u2705',
  badge: '\u{1F3C5}',
  feedback: '\u{1F4E2}',
  vote: '\u{1F5F3}',
  announcement: '\u{1F4E2}',
  system: '\u{1F514}',
};

const TYPE_COLOR_MAP: Record<string, string> = {
  review_result: '#5b9e6f',
  event_response: '#5b9e6f',
  completion: '#5b9e6f',
  badge: '#e0a458',
  feedback: '#e0a458',
  vote: '#5b9e6f',
  announcement: '#e0a458',
  system: '#5b9e6f',
};

function _formatTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '\u521A\u521A';
  if (minutes < 60) return `${minutes}\u5206\u949F\u524D`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}\u5C0F\u65F6\u524D`;
  const days = Math.floor(hours / 24);
  return `${days}\u5929\u524D`;
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
        // silent fail for marking read
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
      // badge 无跳转目标，点击仅标记已读
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

  return (
    <View className="notifications">
      <View className="notifications__header">
        <Text className="notifications__title">消息通知</Text>
        {unreadCount > 0 && (
          <View className="notifications__mark-all" onClick={handleMarkAllRead}>
            <Text className="notifications__mark-all-text">全部已读</Text>
          </View>
        )}
      </View>

      <ScrollView scrollY className="notifications__list" onScrollToLower={handleScrollToLower}>
        {loading && <Loading />}
        {error && <ErrorState message={error.message} onRetry={refresh} />}
        {!loading && !error && items.length === 0 && (
          <EmptyState icon="\u{1F4EC}" text="\u6682\u65E0\u6D88\u606F" />
        )}
        {!loading &&
          !error &&
          items.map((item) => {
            const icon = TYPE_ICON_MAP[item.type] ?? '\u{1F514}';
            const color = TYPE_COLOR_MAP[item.type] ?? '#5b9e6f';
            return (
              <View
                key={item.id}
                className="notifications__item"
                onClick={() => handleNotificationClick(item)}
              >
                <View className="notifications__item-icon" style={{ background: color + '1a' }}>
                  <Text className="notifications__item-emoji">{icon}</Text>
                </View>
                <View className="notifications__item-content">
                  <Text className="notifications__item-title">{item.title}</Text>
                  <Text className="notifications__item-desc">{item.content}</Text>
                  <Text className="notifications__item-time">{_formatTime(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View className="notifications__item-dot" />}
              </View>
            );
          })}
        {loadingMore && <Loading text="\u52A0\u8F7D\u66F4\u591A..." />}
        <View className="notifications__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
