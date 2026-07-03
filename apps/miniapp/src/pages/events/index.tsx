import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import { useState, useEffect, useRef } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCommunityStore } from '@/store';
import { EventType } from '@xiaoqu-bangbang/shared';
import type { MarketItemDto } from '@xiaoqu-bangbang/shared';
import { eventService, marketService } from '@/services';
import { usePaginatedList, useAuthGuard } from '@/hooks';
import { mapEventDtoToCardData } from '@/utils/mappers';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import EventCard from '../../components/event-card';
import BlurredList from '@/components/blurred-list';
import './index.scss';

// S1-7 events 二层 tab 重构：
// 第一层 outer = 互助 / 闲置；
// 第二层 = 互助下分类（求助/帮忙/公益/寻宠寻物/搭子），闲置下为 status（在售/已售）。
// 议题类（public_feedback/discussion）下沉到 plaza，不在此处显示。

type OuterTab = 'help' | 'market';

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
  const [searchText, setSearchText] = useState('');
  // 搜索对老人是次要功能：默认收起为图标，点击才展开输入框，让首屏聚焦列表与发布。
  const [searchOpen, setSearchOpen] = useState(false);

  // ===== 互助 (events) 列表 =====
  // communityId 由后端 currentCommunityId guard 注入，前端不再透传。
  const helpList = usePaginatedList(
    (page, pageSize) =>
      eventService.list({
        type: helpFilter === 'all' ? undefined : (helpFilter as EventType),
        // 议题类事件(public_feedback/discussion)属于「小区事」议题，不在邻里帮互助列表展示；
        // 选具体分类时 type 已限定，无需再排除。
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

  // refreshTick：由 useDidShow 触发自增，驱动下方 useEffect 重新拉取列表。
  // 用函数式 setState 触发，避免在 useDidShow 里直接调 refresh 的闭包陷阱。
  const [refreshTick, setRefreshTick] = useState(0);
  const firstShowRef = useRef(true);

  // 发布/编辑后 navigateBack 回到本页，useEffect 的依赖未变不会刷新。
  // 用页面 didShow 生命周期兜底刷新；跳过首次显示，避免与首次 mount 的拉取重复。
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
    else marketList.refresh();
  }, [communityId, outer, helpFilter, marketFilter, searchText, refreshTick]);

  const isHelp = outer === 'help';
  const list = isHelp ? helpList : marketList;
  const filters = isHelp ? HELP_FILTERS : MARKET_FILTERS;
  const currentFilter = isHelp ? helpFilter : marketFilter;
  const setCurrentFilter = isHelp ? setHelpFilter : setMarketFilter;

  const helpCards = helpList.items.map(mapEventDtoToCardData);
  const marketItems = marketList.items as MarketItemDto[];

  return (
    <View className="events">
      <View className="events__header">
        <Text className="events__header-title">🤝 邻里互助</Text>
        <Text className="events__header-sub">求助、帮忙、闲置流转</Text>
      </View>

      {/* 第一层：互助 / 闲置 */}
      <View className="events__outer-tabs">
        {(
          [
            { k: 'help', label: '互助' },
            { k: 'market', label: '闲置' },
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

      {/* 第二层 filter + 搜索图标（搜索默认收起） */}
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
          <Text className="events__search-toggle-icon">{searchOpen ? '✕' : '🔍'}</Text>
        </View>
      </View>

      {searchOpen && (
        <View className="events__search-wrap">
          <View className="events__search">
            <Text className="events__search-icon">🔍</Text>
            <Input
              className="events__search-input"
              placeholder={isHelp ? '搜索互助事件...' : '搜索闲置物品...'}
              placeholderClass="events__search-placeholder"
              value={searchText}
              focus
              onInput={(e) => setSearchText(e.detail.value)}
            />
            {searchText ? (
              <Text className="events__search-clear" onClick={() => setSearchText('')}>
                ✕
              </Text>
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
          <EmptyState icon={isHelp ? '🤝' : '📦'} text={isHelp ? '暂无互助事件' : '暂无闲置物品'} />
        )}

        {!list.loading && !list.error && isHelp && (
          <BlurredList
            items={helpCards}
            previewCount={3}
            renderItem={(event) => (
              <EventCard
                key={event.id}
                data={event}
                onClick={(id) => Taro.navigateTo({ url: `/pages/event-detail/index?id=${id}` })}
              />
            )}
          />
        )}

        {!list.loading &&
          !list.error &&
          !isHelp &&
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
                  <Text className="events__market-img-emoji">📦</Text>
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

        {list.loadingMore && (
          <View className="events__loading-more">
            <Loading text="加载更多..." />
          </View>
        )}
        <View className="events__bottom-spacer" />
      </ScrollView>

      {/* FAB：互助 → event-create；闲置 → market-create */}
      <View
        className="events__fab"
        onClick={() =>
          Taro.navigateTo({
            url: isHelp ? '/pages/event-create/index' : '/pages/market-create/index',
          })
        }
      >
        <View className="events__fab-inner">
          <Text className="events__fab-plus">+</Text>
        </View>
        <Text className="events__fab-label">{isHelp ? '发互助' : '发闲置'}</Text>
      </View>
    </View>
  );
}
