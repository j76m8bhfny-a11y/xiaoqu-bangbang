import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import { useState, useEffect, useRef } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCommunityStore, useAuthStore } from '@/store';
import type { MarketItemDto, GuideDto } from '@xiaoqu-bangbang/shared';
import {
  eventService,
  marketService,
  guideService,
  feedService,
  groupBuyService,
} from '@/services';
import { usePaginatedList, useAuthGuard } from '@/hooks';
import {
  mapEventDtoToCardData,
  mapFeedItemDtoToCardData,
  mapGroupBuyDtoToCardData,
  GUIDE_CATEGORY_CONFIG,
} from '@/utils/mappers';
import type { EventCardData } from '@/components/event-card';
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

// E1: 相对时间（复用 mappers 同款逻辑）
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return '刚刚';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '昨天';
  if (day < 30) return `${day}天前`;
  return `${Math.floor(day / 30)}个月前`;
}

type OuterTab = 'help' | 'market' | 'guide';

const HELP_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'mine', label: '我的' },
  { key: 'help_request', label: '求助' },
  { key: 'public_welfare', label: '公益' },
  { key: 'pet_help', label: '宠帮' },
  { key: 'group_buy', label: '拼购' },
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
  const pendingEventsFilter = useCommunityStore((s) => s.pendingEventsFilter);
  const setPendingEventsFilter = useCommunityStore((s) => s.setPendingEventsFilter);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const verifyStatus = useAuthStore((s) => s.user?.verifyStatus);
  const isLocked = verifyStatus !== 'verified';
  const routerParams = Taro.getCurrentInstance().router?.params;
  const initialTabParam = routerParams?.tab;

  // 老入口 tab 参数兼容：market_* 自动落到「闲置」，其它在「互助」。
  const initialOuter: OuterTab = initialTabParam === 'my' ? 'market' : 'help';
  const [outer, setOuter] = useState<OuterTab>(initialOuter);
  const [helpFilter, setHelpFilter] = useState<string>(
    initialTabParam && initialTabParam !== 'my' ? initialTabParam : 'all',
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [guideFilter, setGuideFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // ===== 互助 (events) 列表 =====
  // M23: all 走 /feed/all 聚合端点（含 group_buy）；group_buy 单独走 /group-buys；
  // 其余按 event 类型走 /events。统一映射成 EventCardData 供瀑布流渲染。
  const helpList = usePaginatedList<EventCardData>(
    async (page, pageSize) => {
      if (helpFilter === 'all') {
        const result = await feedService.all({ page, pageSize });
        return { ...result, items: result.items.map(mapFeedItemDtoToCardData) };
      }
      if (helpFilter === 'group_buy') {
        const result = await groupBuyService.list({ page, pageSize });
        return { ...result, items: result.items.map(mapGroupBuyDtoToCardData) };
      }
      const result = await eventService.list({
        type: helpFilter === 'mine' ? undefined : helpFilter,
        creatorId: helpFilter === 'mine' ? currentUserId : undefined,
        status: helpFilter === 'mine' ? statusFilter : undefined,
        keyword: searchText || undefined,
        page,
        pageSize,
      });
      return { ...result, items: result.items.map(mapEventDtoToCardData) };
    },
    [communityId, helpFilter, statusFilter, searchText, outer, currentUserId],
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
    if (pendingEventsFilter) {
      setOuter('help');
      setHelpFilter(pendingEventsFilter.filter);
      setStatusFilter(pendingEventsFilter.status);
      setPendingEventsFilter(null);
      return;
    }
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
  }, [
    communityId,
    outer,
    helpFilter,
    statusFilter,
    marketFilter,
    guideFilter,
    searchText,
    refreshTick,
  ]);

  const isHelp = outer === 'help';
  const isGuide = outer === 'guide';
  const list = isHelp ? helpList : isGuide ? guideList : marketList;
  const filters = isHelp ? HELP_FILTERS : isGuide ? GUIDE_FILTERS : MARKET_FILTERS;
  const currentFilter = isHelp ? helpFilter : isGuide ? guideFilter : marketFilter;
  const setCurrentFilter = (key: string) => {
    if (isHelp) {
      setHelpFilter(key);
      setStatusFilter(undefined);
    } else if (isGuide) setGuideFilter(key);
    else setMarketFilter(key);
  };

  // M23: helpList 已在 fetcher 里映射成 EventCardData，直接用即可
  const marketItems = marketList.items as MarketItemDto[];
  const guideItems = guideList.items as GuideDto[];

  const searchPlaceholder = isHelp
    ? helpFilter === 'group_buy'
      ? '搜索拼单...'
      : '搜索互助事件...'
    : isGuide
      ? '搜索教程...'
      : '搜索闲置物品...';
  const emptyIcon = isHelp
    ? helpFilter === 'group_buy'
      ? 'cart'
      : 'handshake'
    : isGuide
      ? 'book'
      : 'box';
  const emptyText = isHelp
    ? helpFilter === 'group_buy'
      ? '暂无拼单\n发起一个邻里拼单吧'
      : helpFilter === 'mine'
        ? statusFilter === 'completed,closed'
          ? '暂无已完成的互助'
          : '暂无进行中的互助\n去帮帮邻居吧'
        : helpFilter === 'pet_help'
          ? '暂无宠物帮帮\n邻居的宠物需要你帮忙吗？'
          : '暂无互助事件\n邻居们可能需要你的帮助'
    : isGuide
      ? '暂无教程\n分享你的生活经验吧'
      : '暂无闲置物品\n整理一下发布出来吧';
  const fabLabel = isHelp
    ? helpFilter === 'group_buy'
      ? '发拼单'
      : '发互助'
    : isGuide
      ? '发教程'
      : '发闲置';
  const fabUrl = isHelp
    ? helpFilter === 'pet_help'
      ? '/pages/pet-create/index'
      : helpFilter === 'group_buy'
        ? '/pages/group-buy-create/index'
        : '/pages/event-create/index'
    : isGuide
      ? '/pages/guide-create/index'
      : '/pages/market-create/index';

  return (
    <View className={`events events--${outer}`}>
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
          <View className={`events__masonry ${isLocked ? 'events__masonry--locked' : ''}`}>
            <BlurredList
              items={helpList.items}
              previewCount={3}
              renderItem={(event) => (
                <MasonryEventCard
                  key={event.id}
                  data={event}
                  onClick={(id) => {
                    // M23: group_buy 卡片跳转拼单详情，其余跳事件详情
                    const url =
                      event.sourceType === 'group_buy'
                        ? `/pages/group-buy-detail/index?id=${id}`
                        : `/pages/event-detail/index?id=${id}`;
                    Taro.navigateTo({ url });
                  }}
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
                <View className="events__market-meta">
                  <Text className="events__market-seller">{it.sellerNickname}</Text>
                  <Text className="events__market-time">{relTime(it.updatedAt)}</Text>
                </View>
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
                <View className="events__market-meta">
                  <Text className="events__market-seller">{it.authorNickname}</Text>
                  <Text className="events__market-time">{relTime(it.createdAt)}</Text>
                </View>
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
