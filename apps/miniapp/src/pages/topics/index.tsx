import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { topicService } from '@/services';
import { usePaginatedList, useAuthGuard } from '@/hooks';
import { useCommunityStore } from '@/store';
import Waterfall from '@/components/waterfall';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import NavBar from '@/components/navbar';
import type { TopicDto } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon from '@/components/icon';

function TopicCard({ topic, onClick }: { topic: TopicDto; onClick: (id: string) => void }) {
  const isOpen = topic.status === 'open';
  return (
    <View className="topic-card" onClick={() => onClick(topic.id)}>
      <Text className={`topic-card__status topic-card__status--${isOpen ? 'open' : 'closed'}`}>
        {isOpen ? '进行中' : '已完结'}
      </Text>
      <View className="topic-card__title">{topic.title}</View>
      <View className="topic-card__meta">
        {isOpen ? (
          <>
            <View>
              <Icon name="thumbs-up" size={14} /> <Text>{topic.likeCount}</Text>
            </View>
            <View>
              <Icon name="thumbs-down" size={14} /> <Text>{topic.dislikeCount}</Text>
            </View>
          </>
        ) : (
          <Text>
            ⭐ {topic.avgRating?.toFixed(1) ?? '—'}（{topic.ratingCount}）
          </Text>
        )}
        <View>
          <Icon name="clipboard" size={14} /> <Text>{topic.eventCount}</Text>
        </View>
        <View>
          <Icon name="chat" size={14} /> <Text>{topic.commentCount}</Text>
        </View>
      </View>
      {!isOpen && topic.closedSummary && (
        <View className="topic-card__summary">{topic.closedSummary}</View>
      )}
      {isOpen && topic.latestEventPreview?.title && (
        <View className="topic-card__preview">
          <Icon name="flag" size={14} /> {topic.latestEventPreview.title}
        </View>
      )}
    </View>
  );
}

export default function TopicsPage() {
  useAuthGuard();
  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const [status, setStatus] = useState<'open' | 'closed'>('open');

  const { items, loading, loadingMore, hasMore, error, refresh, loadMore } =
    usePaginatedList<TopicDto>(
      (page, pageSize) => topicService.list({ status, page, pageSize }),
      [communityId, status],
    );

  useEffect(() => {
    if (communityId) refresh();
  }, [communityId, status, refresh]);

  const handleClick = (id: string) =>
    Taro.navigateTo({ url: `/pages/topic-detail/index?id=${id}` });

  const handleCreate = () =>
    Taro.navigateTo({ url: '/pages/event-create/index?type=public_feedback' });

  const handleScrollLower = () => {
    if (hasMore && !loadingMore) loadMore();
  };

  return (
    <View className="topics">
      <NavBar title="议题榜" />
      <View className="topics__tabs">
        <Text
          className={`topics__tab ${status === 'open' ? 'topics__tab--active' : ''}`}
          onClick={() => setStatus('open')}
        >
          未完结榜
        </Text>
        <Text
          className={`topics__tab ${status === 'closed' ? 'topics__tab--active' : ''}`}
          onClick={() => setStatus('closed')}
        >
          完结榜
        </Text>
      </View>

      <ScrollView scrollY className="topics__list" onScrollToLower={handleScrollLower}>
        {loading && <Loading />}
        {error && <ErrorState message={error.message} onRetry={refresh} />}
        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon="chat"
            text={status === 'open' ? '还没有议题，快来发起吧' : '暂无已完结议题'}
          />
        )}
        {!loading && !error && items.length > 0 && (
          <Waterfall<TopicDto>
            items={items}
            itemKey="id"
            renderItem={(item) => <TopicCard topic={item} onClick={handleClick} />}
          />
        )}
        {loadingMore && <Loading text="加载更多..." />}
      </ScrollView>

      <View className="topics__fab" onClick={handleCreate}>
        +
      </View>
    </View>
  );
}
