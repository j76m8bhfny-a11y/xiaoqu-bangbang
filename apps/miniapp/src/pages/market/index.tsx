import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useState, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useCommunityStore } from '@/store';
import { marketService } from '@/services';
import { usePaginatedList, useAuthGuard } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import { MARKET_CATEGORY_CONFIG, CONDITION_LABELS } from '@/utils/mappers';
import type { MarketItemDto } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon from '@/components/icon';

const CATEGORIES = [
  { key: 'all', label: '全部', icon: 'house' },
  { key: 'free', label: '免费', icon: 'gift' },
  { key: 'furniture', label: '家具', icon: 'chair' },
  { key: 'baby', label: '母婴', icon: 'teddy' },
  { key: 'books', label: '书籍', icon: 'books' },
  { key: 'pet', label: '宠物', icon: 'paw' },
  { key: 'digital', label: '数码', icon: 'phone' },
  { key: 'other', label: '其他', icon: 'box' },
];

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'on_sale', label: '在售' },
  { key: 'sold', label: '已出' },
];

export default function Market() {
  useAuthGuard();

  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  const fetcher = useCallback(
    (page: number, pageSize: number) =>
      marketService.list({
        communityId: communityId!,
        category: activeCategory === 'all' ? undefined : activeCategory,
        status: activeStatus === 'all' ? undefined : activeStatus,
        keyword: searchText || undefined,
        page,
        pageSize,
      }),
    [communityId, activeCategory, activeStatus, searchText],
  );

  const { items, loading, loadingMore, hasMore, error, refresh, loadMore } =
    usePaginatedList<MarketItemDto>(fetcher, [
      communityId,
      activeCategory,
      activeStatus,
      searchText,
    ]);

  const handleScrollToLower = () => {
    if (hasMore && !loadingMore) {
      loadMore();
    }
  };

  const handleFabClick = () => {
    Taro.navigateTo({ url: '/pages/market-create/index' });
  };

  const handleItemClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/market-detail/index?id=${id}` });
  };

  let statusBarHeight = 20;
  try {
    const sys = Taro.getWindowInfo();
    if (sys.statusBarHeight) statusBarHeight = sys.statusBarHeight;
  } catch {
    // fallback
  }

  return (
    <View className="market">
      <View className="market__header" style={{ paddingTop: `${statusBarHeight}px` }}>
        <View className="market__header-title">
          <Icon name="cart" size={22} /> <Text>闲置市集</Text>
        </View>
        <Text className="market__header-sub">邻里好物，物尽其用</Text>
      </View>

      <View className="market__search-wrap">
        <View className="market__search">
          <View className="market__search-icon">
            <Icon name="search" size={20} />
          </View>
          <Input
            className="market__search-input"
            placeholder="搜索闲置好物..."
            placeholderClass="market__search-placeholder"
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>
      </View>

      <View className="market__status-bar">
        {STATUS_TABS.map((tab) => (
          <View
            key={tab.key}
            className={`market__status-tab ${activeStatus === tab.key ? 'market__status-tab--active' : ''}`}
            onClick={() => setActiveStatus(tab.key)}
          >
            <Text
              className={`market__status-text ${activeStatus === tab.key ? 'market__status-text--active' : ''}`}
            >
              {tab.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView scrollX className="market__category-scroll">
        <View className="market__category-list">
          {CATEGORIES.map((cat) => (
            <View
              key={cat.key}
              className={`market__category-item ${activeCategory === cat.key ? 'market__category-item--active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <Text className="market__category-icon">{cat.icon}</Text>
              <Text
                className={`market__category-label ${activeCategory === cat.key ? 'market__category-label--active' : ''}`}
              >
                {cat.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <ScrollView scrollY className="market__list" onScrollToLower={handleScrollToLower}>
        {loading ? (
          <Loading text="加载闲置好物..." />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : items.length === 0 ? (
          <EmptyState icon="box" text="暂无相关闲置" />
        ) : (
          <View className="market__grid">
            {items.map((dto) => {
              const condConfig = CONDITION_LABELS[dto.conditionLevel] || {
                label: '未知',
                color: '#999',
              };
              const catConfig = MARKET_CATEGORY_CONFIG[dto.category];
              return (
                <View key={dto.id} className="market-card" onClick={() => handleItemClick(dto.id)}>
                  <View className="market-card__image">
                    <View className="market-card__image-emoji">
                      <Icon name={(catConfig?.icon ?? 'box') as any} size={32} />
                    </View>
                    <View
                      className="market-card__condition"
                      style={{ background: condConfig.color }}
                    >
                      <Text className="market-card__condition-text">{condConfig.label}</Text>
                    </View>
                  </View>
                  <View className="market-card__body">
                    <Text className="market-card__title">{dto.title}</Text>
                    <View className="market-card__price-row">
                      <Text className="market-card__price">
                        {dto.price != null ? `¥${dto.price}` : '免费'}
                      </Text>
                    </View>
                    <View className="market-card__meta">
                      <Text className="market-card__seller">{dto.sellerNickname}</Text>
                      <Text className="market-card__category-label">
                        {catConfig?.label ?? dto.category}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {loadingMore && <Loading text="加载更多..." />}
        <View className="market__bottom-spacer" />
      </ScrollView>

      <View className="market__fab" onClick={handleFabClick}>
        <View className="market__fab-inner">
          <Text className="market__fab-plus">+</Text>
        </View>
        <Text className="market__fab-label">发布闲置</Text>
      </View>
    </View>
  );
}
