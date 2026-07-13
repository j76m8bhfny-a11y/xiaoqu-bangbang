import { View, Text, Swiper, SwiperItem, Image, Input, ScrollView } from '@tarojs/components';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { useRequest } from '@/hooks';
import { guideService } from '@/services';
import type { GuideCommentDto, GuideDetailDto } from '@xiaoqu-bangbang/shared';
import { GuideCategory, GuideStatus } from '@xiaoqu-bangbang/shared';
import { useAuthStore } from '@/store';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import Icon from '@/components/icon';
import { GUIDE_CATEGORY_CONFIG, GUIDE_STATUS_LABELS } from '@/utils/mappers';
import './index.scss';

export default function GuideDetail() {
  const params = Taro.getCurrentInstance().router?.params;
  const id = params?.id ?? '';
  const user = useAuthStore((s) => s.user);

  const {
    data: item,
    loading,
    error,
    refresh,
  } = useRequest<GuideDetailDto>(() => guideService.getById(id), [id], {
    enabled: !!id,
  });

  const { data: commentsData, refresh: refreshComments } = useRequest<{
    items: GuideCommentDto[];
  }>(() => guideService.getComments(id), [id], { enabled: !!id });

  const [comments, setComments] = useState<GuideCommentDto[]>([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [favoriting, setFavoriting] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setLiked(!!item.isLiked);
      setLikeCount(item.likeCount ?? 0);
      setFavorited(!!item.isFavorited);
      setFavoriteCount(item.favoriteCount ?? 0);
    }
  }, [item]);

  useEffect(() => {
    if (commentsData?.items) {
      setComments(commentsData.items);
    }
  }, [commentsData]);

  useShareAppMessage(() => ({
    title: item ? `${item.title} - 左邻右帮` : '左邻右帮',
    path: `/pages/guide-detail/index?id=${id}`,
  }));

  if (loading) {
    return <Loading text="加载教程详情..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refresh} />;
  }

  if (!item) {
    return <ErrorState message="未找到该教程" onRetry={refresh} />;
  }

  const isAuthor = user?.id === item.authorId;
  const isPending = item.status === GuideStatus.PENDING_REVIEW;
  const catConfig = GUIDE_CATEGORY_CONFIG[item.category as GuideCategory];
  const statusConfig = GUIDE_STATUS_LABELS[item.status];

  const handleToggleLike = async () => {
    if (liking) return;
    setLiking(true);
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await guideService.toggleLike(id);
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

  const handleToggleFavorite = async () => {
    if (favoriting) return;
    setFavoriting(true);
    const prevFav = favorited;
    const prevCount = favoriteCount;
    setFavorited(!prevFav);
    setFavoriteCount(prevFav ? prevCount - 1 : prevCount + 1);
    try {
      const res = await guideService.toggleFavorite(id);
      setFavorited(res.favorited);
      setFavoriteCount(res.favoriteCount);
    } catch (e: any) {
      setFavorited(prevFav);
      setFavoriteCount(prevCount);
      Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
    } finally {
      setFavoriting(false);
    }
  };

  const updateCommentInTree = (
    list: GuideCommentDto[],
    commentId: string,
    updater: (c: GuideCommentDto) => GuideCommentDto,
  ): GuideCommentDto[] =>
    list.map((c) => {
      if (c.id === commentId) return updater(c);
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: updateCommentInTree(c.replies, commentId, updater) };
      }
      return c;
    });

  const handleToggleCommentLike = async (commentId: string) => {
    const findComment = (list: GuideCommentDto[]): GuideCommentDto | null => {
      for (const c of list) {
        if (c.id === commentId) return c;
        if (c.replies) {
          const r = findComment(c.replies);
          if (r) return r;
        }
      }
      return null;
    };

    const comment = findComment(comments);
    if (!comment) return;

    const prevLiked = !!comment.isLiked;
    const prevCount = comment.likeCount;

    setComments((prev) =>
      updateCommentInTree(prev, commentId, (c) => ({
        ...c,
        isLiked: !prevLiked,
        likeCount: prevLiked ? prevCount - 1 : prevCount + 1,
      })),
    );

    try {
      const res = await guideService.toggleCommentLike(commentId);
      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({
          ...c,
          isLiked: res.liked,
          likeCount: res.likeCount,
        })),
      );
    } catch (e: any) {
      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({
          ...c,
          isLiked: prevLiked,
          likeCount: prevCount,
        })),
      );
      Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
  };

  const handleSubmitComment = async () => {
    const content = commentInput.trim();
    if (!content) return;
    if (commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      await guideService.addComment(id, {
        content,
        parentId: replyTo?.id,
      });
      setCommentInput('');
      setReplyTo(null);
      Taro.showToast({ title: '评论成功', icon: 'success' });
      refreshComments();
    } catch (e: any) {
      Taro.showToast({ title: e.message || '评论失败', icon: 'none' });
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReply = (comment: GuideCommentDto) => {
    setReplyTo({ id: comment.id, nickname: comment.userNickname });
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleEdit = () => {
    Taro.navigateTo({ url: `/pages/guide-create/index?id=${id}` });
  };

  const handleDelete = () => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这篇教程吗？删除后无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            await guideService.remove(id);
            Taro.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => Taro.navigateBack(), 500);
          } catch (e: any) {
            Taro.showToast({ title: e.message || '删除失败', icon: 'none' });
          }
        }
      },
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const renderComment = (c: GuideCommentDto, isReply = false) => (
    <View
      key={c.id}
      className={`guide-detail__comment ${isReply ? 'guide-detail__comment--reply' : ''}`}
    >
      <View className="guide-detail__comment-avatar">
        {c.userAvatarUrl ? (
          <Image
            className="guide-detail__comment-avatar-img"
            src={c.userAvatarUrl}
            mode="aspectFill"
          />
        ) : (
          <View className="guide-detail__comment-avatar-emoji">
            <Icon name="person" size={isReply ? 20 : 24} />
          </View>
        )}
      </View>
      <View className="guide-detail__comment-body">
        <Text className="guide-detail__comment-nickname">{c.userNickname}</Text>
        <Text className="guide-detail__comment-content">{c.content}</Text>
        <View className="guide-detail__comment-meta">
          <Text className="guide-detail__comment-time">{formatTime(c.createdAt)}</Text>
          <View className="guide-detail__comment-actions">
            <View
              className="guide-detail__comment-action"
              onClick={() => handleToggleCommentLike(c.id)}
            >
              <Icon name="heart" size={16} color={c.isLiked ? '#E89B6C' : '#6B7A6E'} />
              <Text className="guide-detail__comment-action-text">
                {c.likeCount > 0 ? c.likeCount : '赞'}
              </Text>
            </View>
            {!isReply && (
              <View className="guide-detail__comment-action" onClick={() => handleReply(c)}>
                <Icon name="chat" size={16} color="#6B7A6E" />
                <Text className="guide-detail__comment-action-text">回复</Text>
              </View>
            )}
          </View>
        </View>
        {c.replies && c.replies.length > 0 && (
          <View className="guide-detail__replies">
            {c.replies.map((reply) => renderComment(reply, true))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View className="guide-detail">
      {(item.images ?? []).length > 0 ? (
        <Swiper
          className="guide-detail__swiper"
          indicatorDots
          indicatorColor="rgba(255,255,255,0.4)"
          indicatorActiveColor="#fff"
          circular
        >
          {(item.images ?? []).map((src, idx) => (
            <SwiperItem key={idx}>
              <View className="guide-detail__slide">
                <Image className="guide-detail__slide-img" src={src} mode="aspectFill" />
              </View>
            </SwiperItem>
          ))}
        </Swiper>
      ) : (
        <View className="guide-detail__swiper guide-detail__swiper--empty">
          <View className="guide-detail__swiper-emoji">
            <Icon name={(catConfig?.icon ?? 'book') as any} size={48} />
          </View>
        </View>
      )}

      {/* 标题 + 标签 + 描述 */}
      <View className="guide-detail__card">
        <View className="guide-detail__tag-row">
          {catConfig ? (
            <View className="guide-detail__category-tag">
              <View className="guide-detail__category-icon">
                <Icon name={catConfig.icon as any} size={16} />
              </View>
              <Text className="guide-detail__category-label">{catConfig.label}</Text>
            </View>
          ) : null}
          {statusConfig ? (
            <View className="guide-detail__status-tag" style={{ background: statusConfig.color }}>
              <Text className="guide-detail__status-tag-text">{statusConfig.label}</Text>
            </View>
          ) : null}
        </View>
        <Text className="guide-detail__title">{item.title}</Text>
        {item.description ? <Text className="guide-detail__desc">{item.description}</Text> : null}
        {item.status === GuideStatus.REJECTED && item.rejectedReason ? (
          <View className="guide-detail__reject-reason">
            <Icon name="warning" size={16} color="#d9534f" />
            <Text className="guide-detail__reject-text">审核未通过：{item.rejectedReason}</Text>
          </View>
        ) : null}
        <View className="guide-detail__meta-row">
          <Text className="guide-detail__time">{formatTime(item.createdAt)}</Text>
          <Text className="guide-detail__view-count">{item.viewCount} 次浏览</Text>
        </View>
      </View>

      {/* 作者信息 */}
      <View className="guide-detail__card guide-detail__author-card">
        <View className="guide-detail__author-row">
          <View className="guide-detail__avatar">
            {item.authorAvatarUrl ? (
              <Image
                className="guide-detail__avatar-img"
                src={item.authorAvatarUrl}
                mode="aspectFill"
              />
            ) : (
              <View className="guide-detail__avatar-emoji">
                <Icon name="person" size={32} />
              </View>
            )}
          </View>
          <Text className="guide-detail__nickname">{item.authorNickname}</Text>
        </View>
      </View>

      {/* 评论区 */}
      <View className="guide-detail__card guide-detail__comments">
        <View className="guide-detail__comments-header">
          <Text className="guide-detail__comments-title">留言 ({comments.length})</Text>
        </View>
        {comments.length === 0 ? (
          <Text className="guide-detail__comments-empty">还没有留言，来抢沙发吧~</Text>
        ) : (
          <ScrollView scrollY className="guide-detail__comments-list">
            {comments.map((c) => renderComment(c))}
          </ScrollView>
        )}
      </View>

      {/* 作者操作栏 */}
      {isAuthor && isPending && (
        <View className="guide-detail__author-actions">
          <View
            className="guide-detail__author-btn guide-detail__author-btn--edit"
            onClick={handleEdit}
          >
            <Icon name="edit" size={20} color="#4a8c5e" />
            <Text className="guide-detail__author-btn-text">编辑</Text>
          </View>
          <View
            className="guide-detail__author-btn guide-detail__author-btn--delete"
            onClick={handleDelete}
          >
            <Icon name="trash" size={20} color="#d9534f" />
            <Text className="guide-detail__author-btn-text guide-detail__author-btn-text--danger">
              删除
            </Text>
          </View>
        </View>
      )}

      <View className="guide-detail__bottom-spacer" />

      {/* 底栏：点赞 + 收藏 + 评论输入 */}
      <View className="guide-detail__bottom-bar">
        <View
          className={`guide-detail__icon-btn ${liked ? 'guide-detail__icon-btn--liked' : ''}`}
          onClick={handleToggleLike}
        >
          <Icon name="heart" size={24} color={liked ? '#E89B6C' : '#6B7A6E'} />
          <Text className="guide-detail__icon-btn-label">{likeCount > 0 ? likeCount : '点赞'}</Text>
        </View>

        <View
          className={`guide-detail__icon-btn ${favorited ? 'guide-detail__icon-btn--favorited' : ''}`}
          onClick={handleToggleFavorite}
        >
          <Icon
            name={favorited ? 'star' : 'star-outline'}
            size={24}
            color={favorited ? '#E89B6C' : '#6B7A6E'}
          />
          <Text className="guide-detail__icon-btn-label">
            {favoriteCount > 0 ? favoriteCount : '收藏'}
          </Text>
        </View>

        <View className="guide-detail__comment-input-wrap">
          {replyTo && (
            <View className="guide-detail__reply-indicator">
              <Text className="guide-detail__reply-text">回复 @{replyTo.nickname}</Text>
              <View className="guide-detail__reply-cancel" onClick={handleCancelReply}>
                <Icon name="close" size={16} color="#6B7A6E" />
              </View>
            </View>
          )}
          <Input
            className="guide-detail__comment-input"
            placeholder={replyTo ? `回复 @${replyTo.nickname}` : '写留言...'}
            value={commentInput}
            onInput={(e) => setCommentInput(e.detail.value)}
            maxlength={200}
            confirmType="send"
            onConfirm={handleSubmitComment}
          />
        </View>

        <View
          className={`guide-detail__send-btn ${
            !commentInput.trim() || commentSubmitting ? 'guide-detail__send-btn--disabled' : ''
          }`}
          onClick={handleSubmitComment}
        >
          <Icon name="send" size={24} color={commentInput.trim() ? '#fff' : '#bbb'} />
        </View>
      </View>
    </View>
  );
}
