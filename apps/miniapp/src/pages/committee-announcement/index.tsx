import { View, Text, ScrollView, Swiper, SwiperItem, Image } from '@tarojs/components';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useRequest } from '@/hooks';
import { committeeService, shareService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import type { CommitteeAnnouncementDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CommitteeAnnouncement() {
  const { id } = Taro.getCurrentInstance().router?.params ?? {};

  const { data: announcement, loading, error, refresh } = useRequest<CommitteeAnnouncementDto>(
    () => committeeService.getAnnouncementDetail(id!),
    [id],
    { enabled: !!id },
  );

  const { data: shareConfig } = useRequest(
    () => shareService.getCardConfig({ targetType: 'announcement', targetId: id! }),
    [id],
    { enabled: !!id },
  );

  useShareAppMessage(() => {
    if (shareConfig && !shareConfig.canShare) {
      Taro.showToast({ title: shareConfig.disabledReason ?? '无法分享', icon: 'none' });
      return { title: '小区帮榜棒', path: '/pages/home/index' };
    }
    if (shareConfig) {
      return {
        title: shareConfig.title,
        path: shareConfig.path,
        imageUrl: shareConfig.imageUrl,
      };
    }
    return {
      title: announcement ? `${announcement.title} - 小区帮榜棒` : '小区帮榜棒',
      path: `/pages/committee-announcement/index?id=${id}`,
    };
  });

  if (loading) {
    return <Loading text='加载公告详情...' />;
  }

  if (error || !announcement) {
    return <ErrorState message={error?.message ?? '公告不存在'} onRetry={refresh} />;
  }

  return (
    <View className='committee-announcement'>
      <ScrollView scrollY className='committee-announcement__scroll'>
        {/* Title Section */}
        <View className='committee-announcement__title-section'>
          <Text className='committee-announcement__title'>{announcement.title}</Text>
          {announcement.isPinned && (
            <View className='committee-announcement__pin-tag'>
              <Text className='committee-announcement__pin-tag-text'>📌 置顶</Text>
            </View>
          )}
        </View>

        {/* Meta Row */}
        <View className='committee-announcement__meta'>
          <Text className='committee-announcement__publisher'>{announcement.publisherNickname}</Text>
          <Text className='committee-announcement__dot'>·</Text>
          <Text className='committee-announcement__date'>{formatDate(announcement.publishedAt)}</Text>
        </View>

        {/* Content */}
        <Text className='committee-announcement__content'>{announcement.content}</Text>

        {/* Images */}
        {announcement.images && announcement.images.length > 0 && (
          <View className='committee-announcement__images'>
            <Swiper
              className='committee-announcement__swiper'
              indicatorDots
              indicatorColor='rgba(0,0,0,0.2)'
              indicatorActiveColor='#35e89a'
              circular
              autoplay={false}
            >
              {announcement.images.map((img, idx) => (
                <SwiperItem key={idx}>
                  <Image className='committee-announcement__image' src={img} mode='aspectFill' />
                </SwiperItem>
              ))}
            </Swiper>
          </View>
        )}

        <View className='committee-announcement__bottom-spacer' />
      </ScrollView>
    </View>
  );
}
