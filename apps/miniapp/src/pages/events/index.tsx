import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useCommunityStore } from '@/store';
import { EventType } from '@xiaoqu-bangbang/shared';
import { eventService } from '@/services';
import { usePaginatedList, useAuthGuard } from '@/hooks';
import { mapEventDtoToCardData } from '@/utils/mappers';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import EventCard from '../../components/event-card';
import './index.scss';

const FILTER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'help_request', label: '求助' },
  { key: 'help_offer', label: '我能帮忙' },
  { key: 'public_welfare', label: '公益' },
  { key: 'lost_found', label: '寻宠寻物' },
  { key: 'public_feedback', label: '公共反馈' },
  { key: 'discussion', label: '讨论' },
];

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '进行中' },
  { key: 'completed', label: '已完成' },
];

export default function Events() {
  useAuthGuard();

  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const routerParams = Taro.getCurrentInstance().router?.params;
  const tabParam = routerParams?.tab;
  const [activeFilter, setActiveFilter] = useState(tabParam || 'all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  const { items, loading, loadingMore, hasMore, error, refresh, loadMore } = usePaginatedList(
    (page, pageSize) => eventService.list({
      communityId: communityId!,
      type: activeFilter === 'all' ? undefined : activeFilter as EventType,
      status: activeStatus === 'all' ? undefined : (activeStatus as any),
      keyword: searchText || undefined,
      page,
      pageSize,
    }),
    [communityId, activeFilter, activeStatus, searchText],
  );

  useEffect(() => {
    if (communityId) {
      refresh();
    }
  }, [communityId, activeFilter, activeStatus, searchText, refresh]);

  const eventCards = items.map(mapEventDtoToCardData);

  const handleEventClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/event-detail/index?id=${id}` });
  };

  const handleScrollToLower = () => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  };

  return (
    <View className='events'>
      <View className='events__header'>
        <Text className='events__header-title'>📋 事件广场</Text>
        <Text className='events__header-sub'>邻里互助，温暖同行</Text>
      </View>

      <View className='events__search-wrap'>
        <View className='events__search'>
          <Text className='events__search-icon'>🔍</Text>
          <Input
            className='events__search-input'
            placeholder='搜索事件...'
            placeholderClass='events__search-placeholder'
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>
      </View>

      <ScrollView scrollX className='events__filter-scroll'>
        <View className='events__filter-list'>
          {FILTER_TABS.map((tab) => (
            <View
              key={tab.key}
              className={`events__filter-tab ${activeFilter === tab.key ? 'events__filter-tab--active' : ''}`}
              onClick={() => setActiveFilter(tab.key)}
            >
              <Text className={`events__filter-text ${activeFilter === tab.key ? 'events__filter-text--active' : ''}`}>
                {tab.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className='events__status-bar'>
        {STATUS_TABS.map((tab) => (
          <View
            key={tab.key}
            className={`events__status-tab ${activeStatus === tab.key ? 'events__status-tab--active' : ''}`}
            onClick={() => setActiveStatus(tab.key)}
          >
            <Text className={`events__status-text ${activeStatus === tab.key ? 'events__status-text--active' : ''}`}>
              {tab.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className='events__list' onScrollToLower={handleScrollToLower}>
        {loading && <Loading />}
        {error && <ErrorState message={error.message} onRetry={refresh} />}
        {!loading && !error && eventCards.length === 0 && (
          <EmptyState icon='📋' text='暂无相关事件' />
        )}
        {!loading && !error && eventCards.map((event) => (
          <EventCard
            key={event.id}
            data={event}
            onClick={handleEventClick}
          />
        ))}
        {loadingMore && (
          <View className='events__loading-more'>
            <Loading text='加载更多...' />
          </View>
        )}
        <View className='events__bottom-spacer' />
      </ScrollView>

      <View className='events__fab' onClick={() => Taro.navigateTo({ url: '/pages/event-create/index' })}>
        <View className='events__fab-inner'>
          <Text className='events__fab-plus'>+</Text>
        </View>
        <Text className='events__fab-label'>发布事件</Text>
      </View>
    </View>
  );
}
