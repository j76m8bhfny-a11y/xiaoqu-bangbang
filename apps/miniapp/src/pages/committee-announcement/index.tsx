import { View, Text, ScrollView, Swiper, SwiperItem, Image } from '@tarojs/components';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { useRequest } from '@/hooks';
import { committeeService, shareService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import type { CommitteeAnnouncementDto } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon from '@/components/icon';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CommitteeAnnouncement() {
  const { id } = Taro.getCurrentInstance().router?.params ?? {};

  const {
    data: announcement,
    loading,
    error,
    refresh,
  } = useRequest<CommitteeAnnouncementDto & { isLiked?: boolean; likeCount?: number }>(
    () => committeeService.getAnnouncementDetail(id!),
    [id],
    { enabled: !!id },
  );

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (announcement) {
      setLiked(!!announcement.isLiked);
      setLikeCount(announcement.likeCount ?? 0);
    }
  }, [announcement]);

  const handleToggleLike = async () => {
    if (liking) return;
    setLiking(true);
    // 乐观更新
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await committeeService.toggleAnnouncementLike(id!);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (e: any) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
    } finally {
      setLiking(false);
    }
  };

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
    return <Loading text="加载公告详情..." />;
  }

  if (error || !announcement) {
    return <ErrorState message={error?.message ?? '公告不存在'} onRetry={refresh} />;
  }

  return (
    <View className="committee-announcement">
      <ScrollView scrollY className="committee-announcement__scroll">
        <View className="committee-announcement__card">
          {/* 官方标识 */}
          <View className="committee-announcement__badge">
            <View className="committee-announcement__badge-icon">
              <Icon name="building" size={20} />
            </View>
            <Text className="committee-announcement__badge-text">业委会公告</Text>
          </View>

          {/* Title Section */}
          <View className="committee-announcement__title-section">
            <Text className="committee-announcement__title">{announcement.title}</Text>
            {announcement.isPinned && (
              <View className="committee-announcement__pin-tag">
                <View className="committee-announcement__pin-tag-text">
                  <Icon name="flag" size={14} /> <Text>置顶</Text>
                </View>
              </View>
            )}
          </View>

          {/* Meta Row */}
          <View className="committee-announcement__meta">
            <Text className="committee-announcement__publisher">
              {announcement.publisherNickname}
            </Text>
            <Text className="committee-announcement__dot">·</Text>
            <Text className="committee-announcement__date">
              {formatDate(announcement.publishedAt)}
            </Text>
          </View>

          <View className="committee-announcement__divider" />

          {/* Content */}
          <Text className="committee-announcement__content">{announcement.content}</Text>

          {/* Images */}
          {announcement.images && announcement.images.length > 0 && (
            <View className="committee-announcement__images">
              <Swiper
                className="committee-announcement__swiper"
                indicatorDots
                indicatorColor="rgba(0,0,0,0.2)"
                indicatorActiveColor="#5b9e6f"
                circular
                autoplay={false}
              >
                {announcement.images.map((img, idx) => (
                  <SwiperItem key={idx}>
                    <Image className="committee-announcement__image" src={img} mode="aspectFill" />
                  </SwiperItem>
                ))}
              </Swiper>
            </View>
          )}
        </View>

        {/* 点赞区 */}
        <View className="committee-announcement__like-section">
          <View
            className={`committee-announcement__like-btn ${liked ? 'committee-announcement__like-btn--active' : ''}`}
            onClick={handleToggleLike}
          >
            <View className="committee-announcement__like-icon">
              <Icon name="heart" size={20} color={liked ? '#E89B6C' : '#6B7A6E'} />
            </View>
            <Text className="committee-announcement__like-text">
              {likeCount > 0 ? `${likeCount} 人觉得有用` : '有用'}
            </Text>
          </View>
        </View>

        <View className="committee-announcement__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
