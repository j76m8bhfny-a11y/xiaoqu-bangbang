import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useCommunityStore } from '@/store';
import { serviceProviderService } from '@/services';
import { usePaginatedList, useAuthGuard } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import './index.scss';

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'repair', label: '维修' },
  { key: 'cleaning', label: '保洁' },
  { key: 'lock', label: '开锁' },
  { key: 'home_appliance', label: '家电' },
  { key: 'moving', label: '搬家' },
  { key: 'pet', label: '宠物' },
  { key: 'other', label: '其他' },
];

const CATEGORY_ICONS: Record<string, string> = {
  repair: '🔧',
  cleaning: '🧹',
  lock: '🔑',
  home_appliance: '🔌',
  moving: '📦',
  pet: '🐾',
  other: '🏠',
};

const SOURCE_LABELS: Record<string, string> = {
  platform: '平台',
  committee: '业委会',
  community: '邻居',
};

export default function ServiceProviders() {
  useAuthGuard();

  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetcher = useCallback(
    (_page: number, _pageSize: number) =>
      serviceProviderService.list({
        communityId: communityId ?? undefined,
        category: activeCategory === 'all' ? undefined : activeCategory,
      }),
    [communityId, activeCategory],
  );

  const { items, loading, loadingMore, hasMore, error, refresh, loadMore } =
    usePaginatedList(fetcher, [communityId, activeCategory]);

  const handleScrollToLower = () => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  };

  const handleProviderClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/service-provider-detail/index?id=${id}` });
  };

  return (
    <View className='service-providers'>
      <View className='service-providers__header'>
        <Text className='service-providers__header-title'>🏠 便民服务</Text>
        <Text className='service-providers__header-sub'>小区邻居推荐的靠谱服务</Text>
      </View>

      <ScrollView scrollX className='service-providers__category-scroll'>
        <View className='service-providers__category-list'>
          {CATEGORIES.map((cat) => (
            <View
              key={cat.key}
              className={`service-providers__category-item ${activeCategory === cat.key ? 'service-providers__category-item--active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <Text className={`service-providers__category-label ${activeCategory === cat.key ? 'service-providers__category-label--active' : ''}`}>
                {cat.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <ScrollView scrollY className='service-providers__list' onScrollToLower={handleScrollToLower}>
        {loading ? (
          <Loading text='加载服务...' />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : items.length === 0 ? (
          <EmptyState icon='🏠' text='暂无相关服务' />
        ) : (
          items.map((provider) => (
            <View key={provider.id} className='service-providers__card' onClick={() => handleProviderClick(provider.id)}>
              <View className='service-providers__card-icon'>
                <Text className='service-providers__card-icon-text'>
                  {CATEGORY_ICONS[provider.category] || '🏠'}
                </Text>
              </View>
              <View className='service-providers__card-info'>
                <View className='service-providers__card-top'>
                  <Text className='service-providers__card-name'>{provider.name}</Text>
                  <View className='service-providers__card-tag'>
                    <Text className='service-providers__card-tag-text'>
                      {CATEGORIES.find((c) => c.key === provider.category)?.label ?? provider.category}
                    </Text>
                  </View>
                </View>
                <Text className='service-providers__card-desc'>{provider.description}</Text>
                <View className='service-providers__card-source'>
                  <Text className='service-providers__card-source-text'>
                    {SOURCE_LABELS[provider.recommendationSource] ?? provider.recommendationSource}推荐
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
        {loadingMore && <Loading text='加载更多...' />}
        <View className='service-providers__bottom-spacer' />
      </ScrollView>
    </View>
  );
}
