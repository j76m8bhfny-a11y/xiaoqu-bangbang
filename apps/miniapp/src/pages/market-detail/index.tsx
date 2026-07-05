import { View, Text, Swiper, SwiperItem, Image } from '@tarojs/components';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { useRequest } from '@/hooks';
import { marketService, shareService, reportService } from '@/services';
import type { MarketCommentDto } from '@/services/market';
import { useAuthStore } from '@/store';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import { MARKET_CATEGORY_CONFIG, CONDITION_LABELS } from '@/utils/mappers';
import type { MarketItemDto } from '@xiaoqu-bangbang/shared';
import { MarketItemStatus, TradeType } from '@xiaoqu-bangbang/shared';
import './index.scss';

const TRADE_TYPE_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  [TradeType.SELL]: { label: '出售', color: '#ff6b6b', bgColor: '#fff0f0' },
  [TradeType.FREE]: { label: '免费', color: '#5b9e6f', bgColor: '#eaf4ec' },
  [TradeType.EXCHANGE]: { label: '交换', color: '#e0a458', bgColor: '#fbf0dd' },
};

export default function MarketDetail() {
  const params = Taro.getCurrentInstance().router?.params;
  const id = params?.id ?? '';
  const user = useAuthStore((s) => s.user);

  const {
    data: item,
    loading,
    error,
    refresh,
  } = useRequest<MarketItemDto & { isLiked?: boolean; likeCount?: number }>(
    () => marketService.getById(id),
    [id],
    { enabled: !!id },
  );

  const { data: commentsData, refresh: refreshComments } = useRequest<{
    items: MarketCommentDto[];
  }>(() => marketService.getComments(id), [id], { enabled: !!id });
  const comments = commentsData?.items ?? [];

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (item) {
      setLiked(!!item.isLiked);
      setLikeCount(item.likeCount ?? 0);
    }
  }, [item]);

  const handleToggleLike = async () => {
    if (liking) return;
    setLiking(true);
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await marketService.toggleLike(id);
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

  const handleComment = async () => {
    try {
      const res = (await Taro.showModal({
        title: '发表评论',
        editable: true,
        placeholderText: '说点什么...',
      } as any)) as any;
      if (res.confirm && res.content?.trim()) {
        await marketService.addComment(id, { content: res.content.trim() });
        Taro.showToast({ title: '评论成功', icon: 'success' });
        refreshComments();
      }
    } catch {
      Taro.showToast({ title: '评论失败', icon: 'none' });
    }
  };

  const { data: shareConfig } = useRequest(
    () => shareService.getCardConfig({ targetType: 'market', targetId: id }),
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
      title: item ? `${item.title} - 小区帮榜棒` : '小区帮榜棒',
      path: `/pages/market-detail/index?id=${id}`,
    };
  });

  if (loading) {
    return <Loading text="加载闲置详情..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refresh} />;
  }

  if (!item) {
    return <ErrorState message="未找到该闲置物品" onRetry={refresh} />;
  }

  const isSold = item.status === MarketItemStatus.SOLD;
  const isSeller = user?.id === item.sellerId;
  const condConfig = CONDITION_LABELS[item.conditionLevel] || { label: '未知', color: '#999' };
  const tradeConfig = TRADE_TYPE_LABELS[item.tradeType] || {
    label: '出售',
    color: '#ff6b6b',
    bgColor: '#fff0f0',
  };
  const catConfig = MARKET_CATEGORY_CONFIG[item.category];

  const handleWant = () => {
    if (isSold) return;
    const text = item.contactText || '请联系卖家';
    Taro.showToast({ title: text, icon: 'none', duration: 3000 });
  };

  const handleMarkSold = () => {
    Taro.showModal({
      title: '确认',
      content: '确定要标记为已售出吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await marketService.markSold(id);
            Taro.showToast({ title: '已标记为售出', icon: 'success' });
            refresh();
          } catch (e: any) {
            Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
          }
        }
      },
    });
  };

  const handleClose = () => {
    Taro.showModal({
      title: '确认',
      content: '确定要下架此闲置吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await marketService.closeItem(id);
            Taro.showToast({ title: '已下架', icon: 'success' });
            refresh();
          } catch (e: any) {
            Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
          }
        }
      },
    });
  };

  const handleReport = async () => {
    try {
      const res = await Taro.showActionSheet({
        itemList: ['隐私泄露', '虚假信息', '骚扰辱骂', '违法违规', '其他'],
      });
      const reasons = ['privacy', 'false_info', 'harassment', 'illegal', 'other'];
      await reportService.submit({
        targetType: 'market',
        targetId: id,
        reason: reasons[res.tapIndex],
      });
      Taro.showToast({ title: '举报成功', icon: 'success' });
    } catch {
      // cancelled or failed
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <View className="market-detail">
      {item.images.length > 0 ? (
        <Swiper
          className="market-detail__swiper"
          indicatorDots
          indicatorColor="rgba(255,255,255,0.4)"
          indicatorActiveColor="#fff"
          circular
        >
          {item.images.map((src, idx) => (
            <SwiperItem key={idx}>
              <View className="market-detail__slide">
                <Image className="market-detail__slide-img" src={src} mode="aspectFill" />
              </View>
            </SwiperItem>
          ))}
        </Swiper>
      ) : (
        <View className="market-detail__swiper market-detail__swiper--empty">
          <Text className="market-detail__swiper-emoji">{catConfig?.icon ?? '📦'}</Text>
        </View>
      )}

      <View className="market-detail__card market-detail__price-card">
        <View className="market-detail__price-row">
          {item.tradeType === TradeType.FREE ? (
            <Text className="market-detail__price market-detail__price--free">免费</Text>
          ) : (
            <Text className="market-detail__price">¥{item.price}</Text>
          )}
          <View className="market-detail__tag" style={{ background: condConfig.color }}>
            <Text className="market-detail__tag-text">{condConfig.label}</Text>
          </View>
          <View className="market-detail__tag" style={{ background: tradeConfig.bgColor }}>
            <Text className="market-detail__tag-text" style={{ color: tradeConfig.color }}>
              {tradeConfig.label}
            </Text>
          </View>
        </View>
      </View>

      <View className="market-detail__card">
        <Text className="market-detail__title">{item.title}</Text>
        {item.description ? <Text className="market-detail__desc">{item.description}</Text> : null}
        <View className="market-detail__meta-row">
          {catConfig ? (
            <View className="market-detail__category-tag">
              <Text className="market-detail__category-icon">{catConfig.icon}</Text>
              <Text className="market-detail__category-label">{catConfig.label}</Text>
            </View>
          ) : null}
          <Text className="market-detail__time">{formatTime(item.createdAt)}</Text>
        </View>
      </View>

      <View className="market-detail__card market-detail__seller-card">
        <View className="market-detail__seller-row">
          <View className="market-detail__avatar">
            {item.sellerAvatarUrl ? (
              <Image
                className="market-detail__avatar-img"
                src={item.sellerAvatarUrl}
                mode="aspectFill"
              />
            ) : (
              <Text className="market-detail__avatar-emoji">👤</Text>
            )}
          </View>
          <Text className="market-detail__nickname">{item.sellerNickname}</Text>
        </View>
        {item.contactText ? (
          <View className="market-detail__contact">
            <Text className="market-detail__contact-label">联系方式</Text>
            <Text className="market-detail__contact-value">{item.contactText}</Text>
          </View>
        ) : null}
      </View>

      {/* 评论区 */}
      <View className="market-detail__card market-detail__comments">
        <View className="market-detail__comments-header">
          <Text className="market-detail__comments-title">💬 留言 ({comments.length})</Text>
          <View className="market-detail__comment-add" onClick={handleComment}>
            <Text className="market-detail__comment-add-text">写留言</Text>
          </View>
        </View>
        {comments.length === 0 ? (
          <Text className="market-detail__comments-empty">还没有留言，来问问卖家吧~</Text>
        ) : (
          comments.map((c) => (
            <View className="market-detail__comment" key={c.id}>
              <View className="market-detail__comment-avatar">
                {c.user.avatarUrl ? (
                  <Image
                    className="market-detail__comment-avatar-img"
                    src={c.user.avatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <Text className="market-detail__comment-avatar-emoji">👤</Text>
                )}
              </View>
              <View className="market-detail__comment-body">
                <Text className="market-detail__comment-nickname">{c.user.nickname}</Text>
                <Text className="market-detail__comment-content">{c.content}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View className="market-detail__bottom-spacer" />

      <View className="market-detail__bottom-bar">
        {/* 点赞（图标） */}
        <View
          className={`market-detail__icon-btn ${liked ? 'market-detail__icon-btn--liked' : ''}`}
          onClick={handleToggleLike}
        >
          <Text className="market-detail__icon-btn-emoji">{liked ? '❤️' : '🤍'}</Text>
          <Text className="market-detail__icon-btn-label">
            {likeCount > 0 ? likeCount : '点赞'}
          </Text>
        </View>

        {isSold ? (
          <View className="market-detail__btn market-detail__btn--sold">
            <Text className="market-detail__btn-text">已售出</Text>
          </View>
        ) : isSeller ? (
          <>
            <View
              className="market-detail__btn market-detail__btn--edit"
              onClick={() => Taro.navigateTo({ url: `/pages/market-edit/index?id=${id}` })}
            >
              <Text className="market-detail__btn-text">编辑</Text>
            </View>
            <View
              className="market-detail__btn market-detail__btn--mark-sold"
              onClick={handleMarkSold}
            >
              <Text className="market-detail__btn-text">标记已售</Text>
            </View>
            <View className="market-detail__btn market-detail__btn--close" onClick={handleClose}>
              <Text className="market-detail__btn-text">下架</Text>
            </View>
          </>
        ) : (
          <View className="market-detail__btn" onClick={handleWant}>
            <Text className="market-detail__btn-text">我想要</Text>
          </View>
        )}

        {/* 举报（小图标，非卖家可见） */}
        {!isSeller && (
          <View
            className="market-detail__icon-btn market-detail__icon-btn--report"
            onClick={handleReport}
          >
            <Text className="market-detail__icon-btn-emoji">⚑</Text>
          </View>
        )}
      </View>
    </View>
  );
}
