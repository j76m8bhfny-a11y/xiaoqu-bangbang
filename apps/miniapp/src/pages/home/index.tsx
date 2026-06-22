import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCommunityStore, useNotificationStore } from '@/store';
import { eventService, bannerService, serviceProviderService, rankingService, committeeService } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import { mapEventDtoToCardData, mapRankingItemToUser, mapBannerDtoToItem, mapServiceProviderDto } from '@/utils/mappers';
import { PeriodType } from '@xiaoqu-bangbang/shared';
import AppHeader from '../../components/app-header';
import BannerCarousel from '../../components/banner-carousel';
import QuickEntryGrid from '../../components/quick-entry';
import EventCard from '../../components/event-card';
import RankingTop3 from '../../components/ranking-top3';
import ServiceProviderCard from '../../components/service-card';
import SectionHeader from '../../components/section-header';
import Loading from '../../components/loading';
import ErrorState from '../../components/error-state';
import EmptyState from '../../components/empty-state';
import './index.scss';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Home() {
  useAuthGuard();

  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const communityName = useCommunityStore((s) => s.currentCommunityName);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const {
    data: banners,
    loading: bannersLoading,
    error: bannersError,
    refresh: refreshBanners,
  } = useRequest(
    () => bannerService.list(communityId ?? undefined).then((r) => r.items.map(mapBannerDtoToItem)),
    [communityId],
    { enabled: !!communityId },
  );

  const {
    data: events,
    loading: eventsLoading,
    error: eventsError,
    refresh: refreshEvents,
  } = useRequest(
    () => eventService.list({ communityId: communityId!, pageSize: 3 }).then((r) => r.items.map(mapEventDtoToCardData)),
    [communityId],
    { enabled: !!communityId },
  );

  const {
    data: helpEvents,
    loading: helpEventsLoading,
    error: helpEventsError,
    refresh: refreshHelpEvents,
  } = useRequest(
    () => eventService.list({ communityId: communityId!, pageSize: 10 }).then((r) =>
      r.items
        .filter((e) => e.type === 'help_request' || e.type === 'help_offer')
        .slice(0, 3)
        .map(mapEventDtoToCardData)
    ),
    [communityId],
    { enabled: !!communityId },
  );

  const {
    data: announcements,
    loading: announcementsLoading,
    error: announcementsError,
    refresh: refreshAnnouncements,
  } = useRequest(
    () => committeeService.getAnnouncements().then((r) => r.items?.slice(0, 3) ?? []),
    [communityId],
    { enabled: !!communityId },
  );

  const {
    data: top3,
    loading: top3Loading,
    error: top3Error,
    refresh: refreshTop3,
  } = useRequest(
    () => rankingService.list({ communityId: communityId!, periodType: PeriodType.TOTAL, pageSize: 3 }).then((r) => r.items.map(mapRankingItemToUser)),
    [communityId],
    { enabled: !!communityId },
  );

  const {
    data: services,
    loading: servicesLoading,
    error: servicesError,
    refresh: refreshServices,
  } = useRequest(
    () => serviceProviderService.list().then((r) => r.items.map(mapServiceProviderDto)),
    [],
    { enabled: !!communityId },
  );

  const handleBannerClick = (bannerId: string) => {
    const banner = banners?.find((b) => b.id === bannerId);
    if (!banner) return;
    const { linkType, linkId, linkUrl } = banner;
    switch (linkType) {
      case 'event':
        if (linkId) Taro.navigateTo({ url: `/pages/event-detail/index?id=${linkId}` });
        break;
      case 'market':
        if (linkId) Taro.navigateTo({ url: `/pages/market-detail/index?id=${linkId}` });
        break;
      case 'announcement':
        if (linkId) Taro.navigateTo({ url: `/pages/committee-announcement/index?id=${linkId}` });
        break;
      case 'service_provider':
        if (linkId) Taro.navigateTo({ url: `/pages/service-provider-detail/index?id=${linkId}` });
        break;
      case 'url':
        if (linkUrl) {
          Taro.setClipboardData({ data: linkUrl });
        }
        break;
    }
  };

  const anyLoading = bannersLoading || eventsLoading || top3Loading || servicesLoading || helpEventsLoading || announcementsLoading;

  if (anyLoading && !communityId) {
    return <Loading text='加载中...' />;
  }

  return (
    <View className='home'>
      <AppHeader
        communityName={communityName ?? '选择小区'}
        unreadCount={unreadCount}
        onSwitchCommunity={() => Taro.navigateTo({ url: '/pages/community-select/index' })}
        onNotificationClick={() => Taro.navigateTo({ url: '/pages/notifications/index' })}
      />

      <ScrollView scrollY className='home__scroll'>
        {/* Banner轮播 */}
        <View className='home__section'>
          {bannersError ? (
            <ErrorState message='轮播图加载失败' onRetry={refreshBanners} />
          ) : (
            <BannerCarousel banners={banners ?? undefined} onBannerClick={handleBannerClick} />
          )}
        </View>

        {/* 快捷发布宫格 */}
        <View className='home__section'>
          <QuickEntryGrid onEntryClick={(key) => {
            if (key === 'vote') {
              Taro.navigateTo({ url: '/pages/votes/index' });
            } else if (key === 'committee') {
              Taro.navigateTo({ url: '/pages/committee/index' });
            } else {
              Taro.navigateTo({ url: `/pages/event-create/index?type=${key}` });
            }
          }} />
        </View>

        {/* 今日互助 */}
        <View className='home__section'>
          <SectionHeader title='🌸 今日互助' subtitle='让小区里的好事被看见' actionText='查看全部' onAction={() => Taro.navigateTo({ url: '/pages/events/index?tab=help_request' })} />
          <View className='home__events'>
            {helpEventsError ? (
              <ErrorState message='互助动态加载失败' onRetry={refreshHelpEvents} />
            ) : helpEventsLoading ? (
              <Loading text='加载中...' />
            ) : helpEvents && helpEvents.length > 0 ? (
              helpEvents.map((event) => (
                <EventCard
                  key={event.id}
                  data={event}
                  onCtaClick={(id) => Taro.navigateTo({ url: `/pages/event-detail/index?id=${id}` })}
                />
              ))
            ) : (
              <EmptyState icon='🌸' text='暂无互助动态' />
            )}
          </View>
        </View>

        {/* 业委会公告 */}
        <View className='home__section'>
          <SectionHeader title='📢 业委会公告' actionText='查看全部' onAction={() => Taro.navigateTo({ url: '/pages/committee/index' })} />
          <View className='home__announcements'>
            {announcementsError ? (
              <ErrorState message='公告加载失败' onRetry={refreshAnnouncements} />
            ) : announcementsLoading ? (
              <Loading text='加载中...' />
            ) : announcements && announcements.length > 0 ? (
              announcements.map((ann) => (
                <View
                  key={ann.id}
                  className='home__announcement-card'
                  onClick={() => Taro.navigateTo({ url: `/pages/committee-announcement/index?id=${ann.id}` })}
                >
                  <View className='home__announcement-top'>
                    <Text className='home__announcement-title'>{ann.title}</Text>
                    {ann.isPinned && (
                      <View className='home__announcement-pin'>
                        <Text className='home__announcement-pin-text'>📌 置顶</Text>
                      </View>
                    )}
                  </View>
                  <Text className='home__announcement-date'>{formatDate(ann.publishedAt)}</Text>
                </View>
              ))
            ) : (
              <EmptyState icon='📢' text='暂无公告' />
            )}
          </View>
        </View>

        {/* 好人榜 Top3 */}
        <View className='home__section'>
          <SectionHeader title='🏆 好人榜' actionText='查看全部' onAction={() => Taro.navigateTo({ url: '/pages/ranking/index' })} />
          <View className='home__ranking-wrap'>
            {top3Error ? (
              <ErrorState message='排行榜加载失败' onRetry={refreshTop3} />
            ) : top3Loading ? (
              <Loading text='加载中...' />
            ) : (
              <RankingTop3 users={top3 ?? undefined} />
            )}
          </View>
        </View>

        {/* 便民服务 */}
        <View className='home__section'>
          <SectionHeader title='🏠 便民服务' subtitle='小区邻居推荐的靠谱服务' actionText='更多' onAction={() => Taro.navigateTo({ url: '/pages/service-providers/index' })} />
          {servicesError ? (
            <ErrorState message='服务加载失败' onRetry={refreshServices} />
          ) : servicesLoading ? (
            <Loading text='加载中...' />
          ) : services && services.length > 0 ? (
            <ScrollView scrollX className='home__service-scroll'>
              <View className='home__service-list'>
                {services.map((s) => (
                  <ServiceProviderCard key={s.id} data={s} />
                ))}
              </View>
            </ScrollView>
          ) : (
            <EmptyState icon='🏠' text='暂无便民服务' />
          )}
        </View>

        {/* 最新事件流 */}
        <View className='home__section'>
          <SectionHeader title='📋 最新动态' actionText='查看全部' onAction={() => Taro.navigateTo({ url: '/pages/events/index' })} />
          <View className='home__events'>
            {eventsError ? (
              <ErrorState message='动态加载失败' onRetry={refreshEvents} />
            ) : eventsLoading ? (
              <Loading text='加载中...' />
            ) : events && events.length > 0 ? (
              events.map((event) => (
                <EventCard
                  key={event.id}
                  data={event}
                  onCtaClick={(id) => Taro.navigateTo({ url: `/pages/event-detail/index?id=${id}` })}
                />
              ))
            ) : (
              <EmptyState icon='📋' text='暂无动态' />
            )}
          </View>
        </View>

        {/* 底部留白 */}
        <View className='home__bottom-spacer' />
      </ScrollView>

      {/* 悬浮发布按钮 */}
      <View className='home__fab' onClick={() => Taro.navigateTo({ url: '/pages/event-create/index' })}>
        <View className='home__fab-inner'>
          <Text className='home__fab-plus'>+</Text>
        </View>
        <Text className='home__fab-label'>发布</Text>
      </View>
    </View>
  );
}
