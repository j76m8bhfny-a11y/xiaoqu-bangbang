import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import { useState, useEffect, useRef } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCommunityStore } from '@/store';
import { EventType } from '@xiaoqu-bangbang/shared';
import type { MarketItemDto, GuideDto } from '@xiaoqu-bangbang/shared';
import { eventService, marketService, guideService } from '@/services';
import { usePaginatedList, useAuthGuard } from '@/hooks';
import { mapEventDtoToCardData, GUIDE_CATEGORY_CONFIG } from '@/utils/mappers';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import MasonryEventCard from '@/components/masonry-card';
import BlurredList from '@/components/blurred-list';
import Icon from '@/components/icon';
import './index.scss';

// S1-7 events 二层 tab 重构：
// 第一层 outer = 互助 / 闲置 / 指南；
// 第二层 = 互助下分类，闲置下为 status，指南下为教程分类。

type OuterTab = 'help' | 'market' | 'guide';

const HELP_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'help_request', label: '求助' },
  { key: 'help_offer', label: '我能帮忙' },
  { key: 'public_welfare', label: '公益' },
  { key: 'lost_found', label: '寻宠寻物' },
];

const MARKET_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'on_sale', label: '在售' },
  { key: 'sold', label: '已售' },
];

const GUIDE_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'usage_guide', label: '使用指南' },
  { key: 'repair', label: '维修排障' },
  { key: 'maintenance', label: '保养维护' },
  { key: 'other', label: '其他' },
];

export default function Events() {
  useAuthGuard();

  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const routerParams = Taro.getCurrentInstance().router?.params;
  const initialTabParam = routerParams?.tab;

  // 老入口 tab 参数兼容：market_* 自动落到「闲置」，其它在「互助」。
  const initialOuter: OuterTab = initialTabParam === 'my' ? 'market' : 'help';
  const [outer, setOuter] = useState<OuterTab>(initialOuter);
  const [helpFilter, setHelpFilter] = useState<string>(
    initialTabParam && initialTabParam !== 'my' ? initialTabParam : 'all',
  );
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [guideFilter, setGuideFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // ===== 互助 (events) 列表 =====
  const helpList = usePaginatedList(
    (page, pageSize) =>
      eventService.list({
        type: helpFilter === 'all' ? undefined : (helpFilter as EventType),
        excludeTypes: helpFilter === 'all' ? 'public_feedback,discussion' : undefined,
        keyword: searchText || undefined,
        page,
        pageSize,
      }),
    [communityId, helpFilter, searchText, outer],
  );

  // ===== 闲置 (market) 列表 =====
  const marketList = usePaginatedList(
    (page, pageSize) =>
      marketService.list({
        communityId: communityId!,
        status: marketFilter === 'all' ? undefined : marketFilter,
        keyword: searchText || undefined,
        page,
        pageSize,
      }),
    [communityId, marketFilter, searchText, outer],
  );

  // ===== 指南 (guide) 列表 =====
  const guideList = usePaginatedList(
    (page, pageSize) =>
      guideService.list({
        category: guideFilter === 'all' ? undefined : guideFilter,
        keyword: searchText || undefined,
        page,
        pageSize,
      }),
    [communityId, guideFilter, searchText, outer],
  );

  // refreshTick：由 useDidShow 触发自增，驱动下方 useEffect 重新拉取列表。
  const [refreshTick, setRefreshTick] = useState(0);
  const firstShowRef = useRef(true);

  useDidShow(() => {
    if (firstShowRef.current) {
      firstShowRef.current = false;
      return;
    }
    setRefreshTick((t) => t + 1);
  });

  useEffect(() => {
    if (!communityId) return;
    if (outer === 'help') helpList.refresh();
    else if (outer === 'market') marketList.refresh();
    else guideList.refresh();
  }, [communityId, outer, helpFilter, marketFilter, guideFilter, searchText, refreshTick]);

  const isHelp = outer === 'help';
  const isGuide = outer === 'guide';
  const list = isHelp ? helpList : isGuide ? guideList : marketList;
  const filters = isHelp ? HELP_FILTERS : isGuide ? GUIDE_FILTERS : MARKET_FILTERS;
  const currentFilter = isHelp ? helpFilter : isGuide ? guideFilter : marketFilter;
  const setCurrentFilter = isHelp ? setHelpFilter : isGuide ? setGuideFilter : setMarketFilter;

  const helpCards = helpList.items.map(mapEventDtoToCardData);
  const marketItems = marketList.items as MarketItemDto[];
  const guideItems = guideList.items as GuideDto[];

  const searchPlaceholder = isHelp
    ? '搜索互助事件...'
    : isGuide
      ? '搜索教程...'
      : '搜索闲置物品...';
  const emptyIcon = isHelp ? 'handshake' : isGuide ? 'book' : 'box';
  const emptyText = isHelp ? '暂无互助事件' : isGuide ? '暂无教程' : '暂无闲置物品';
  const fabLabel = isHelp ? '发互助' : isGuide ? '发教程' : '发闲置';
  const fabUrl = isHelp
    ? '/pages/event-create/index'
    : isGuide
      ? '/pages/guide-create/index'
      : '/pages/market-create/index';

  return (
    <View className="events">
      <View className="events__header">
        <View className="events__header-row">
          <View className="events__header-title">
            <Icon name="handshake" size={22} /> <Text>邻里互助</Text>
          </View>
          <Text className="events__header-sub">求助、帮忙、闲置流转、教程</Text>
        </View>
        <View className="events__outer-tabs">
          {(
            [
              { k: 'help', label: '互助' },
              { k: 'market', label: '闲置' },
              { k: 'guide', label: '指南' },
            ] as const
          ).map((o) => (
            <View
              key={o.k}
              className={`events__outer-tab ${outer === o.k ? 'events__outer-tab--active' : ''}`}
              onClick={() => setOuter(o.k as OuterTab)}
            >
              <Text className="events__outer-tab-text">{o.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 第二层 filter + 搜索图标 */}
      <View className="events__filter-row">
        <ScrollView scrollX className="events__filter-scroll">
          <View className="events__filter-list">
            {filters.map((tab) => (
              <View
                key={tab.key}
                className={`events__filter-tab ${currentFilter === tab.key ? 'events__filter-tab--active' : ''}`}
                onClick={() => setCurrentFilter(tab.key)}
              >
                <Text
                  className={`events__filter-text ${currentFilter === tab.key ? 'events__filter-text--active' : ''}`}
                >
                  {tab.label}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View
          className={`events__search-toggle ${searchText ? 'events__search-toggle--active' : ''}`}
          onClick={() => setSearchOpen((o) => !o)}
        >
          <View className="events__search-toggle-icon">
            <Icon name={searchOpen ? 'close' : 'search'} size={20} />
          </View>
        </View>
      </View>

      {searchOpen && (
        <View className="events__search-wrap">
          <View className="events__search">
            <View className="events__search-icon">
              <Icon name="search" size={18} />
            </View>
            <Input
              className="events__search-input"
              placeholder={searchPlaceholder}
              placeholderClass="events__search-placeholder"
              value={searchText}
              focus
              onInput={(e) => setSearchText(e.detail.value)}
            />
            {searchText ? (
              <View className="events__search-clear" onClick={() => setSearchText('')}>
                <Icon name="close" size={18} />
              </View>
            ) : null}
          </View>
        </View>
      )}

      <ScrollView
        scrollY
        className="events__list"
        onScrollToLower={() => {
          if (list.hasMore && !list.loadingMore) list.loadMore();
        }}
      >
        {list.loading && <Loading />}
        {list.error && <ErrorState message={list.error.message} onRetry={list.refresh} />}
        {!list.loading && !list.error && list.items.length === 0 && (
          <EmptyState icon={emptyIcon} text={emptyText} />
        )}

        {/* 互助列表 - 瀑布流 */}
        {!list.loading && !list.error && isHelp && (
          <View className="events__masonry">
            <BlurredList
              items={helpCards}
              previewCount={3}
              renderItem={(event) => (
                <MasonryEventCard
                  key={event.id}
                  data={event}
                  onClick={(id) => Taro.navigateTo({ url: `/pages/event-detail/index?id=${id}` })}
                />
              )}
            />
          </View>
        )}

        {/* 闲置列表 */}
        {!list.loading &&
          !list.error &&
          !isHelp &&
          !isGuide &&
          marketItems.map((it) => (
            <View
              key={it.id}
              className="events__market-item"
              onClick={() => Taro.navigateTo({ url: `/pages/market-detail/index?id=${it.id}` })}
            >
              {it.images?.[0] ? (
                <Image className="events__market-img" src={it.images[0]} mode="aspectFill" />
              ) : (
                <View className="events__market-img events__market-img--empty">
                  <View className="events__market-img-emoji">
                    <Icon name="box" size={32} />
                  </View>
                </View>
              )}
              <View className="events__market-body">
                <Text className="events__market-title">{it.title}</Text>
                <Text className="events__market-desc">{it.description}</Text>
                <Text className="events__market-seller">{it.sellerNickname}</Text>
              </View>
              <View className="events__market-side">
                <Text
                  className={`events__market-price ${it.tradeType === 'free' ? 'events__market-price--free' : ''}`}
                >
                  {it.tradeType === 'free' ? '免费' : `¥${it.price}`}
                </Text>
                {it.status === 'sold' && <Text className="events__market-sold">已售</Text>}
              </View>
            </View>
          ))}

        {/* 教程列表 */}
        {!list.loading &&
          !list.error &&
          isGuide &&
          guideItems.map((it) => (
            <View
              key={it.id}
              className="events__market-item"
              onClick={() => Taro.navigateTo({ url: `/pages/guide-detail/index?id=${it.id}` })}
            >
              {it.images?.[0] ? (
                <Image className="events__market-img" src={it.images[0]} mode="aspectFill" />
              ) : (
                <View className="events__market-img events__market-img--empty">
                  <View className="events__market-img-emoji">
                    <Icon name="book" size={32} />
                  </View>
                </View>
              )}
              <View className="events__market-body">
                <Text className="events__market-title">{it.title}</Text>
                <Text className="events__market-desc">
                  {GUIDE_CATEGORY_CONFIG[it.category]?.label ?? it.category}
                </Text>
                <Text className="events__market-seller">{it.authorNickname}</Text>
              </View>
              <View className="events__market-side">
                <Text className="events__market-price events__market-price--free">
                  {it.likeCount} 赞
                </Text>
              </View>
            </View>
          ))}

        {list.loadingMore && (
          <View className="events__loading-more">
            <Loading text="加载更多..." />
          </View>
        )}
        <View className="events__bottom-spacer" />
      </ScrollView>

      {/* FAB */}
      <View className="events__fab" onClick={() => Taro.navigateTo({ url: fabUrl })}>
        <View className="events__fab-inner">
          <Text className="events__fab-plus">+</Text>
        </View>
        <Text className="events__fab-label">{fabLabel}</Text>
      </View>
    </View>
  );
}
