import { useState, useCallback } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { View, Text, ScrollView, Swiper, SwiperItem, Image } from '@tarojs/components';
import { useRequest, usePaginatedList } from '@/hooks';
import { useAuthStore } from '@/store';
import { eventService, shareService, reportService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import BottomSheet from '@/components/bottom-sheet';
import type { EventDto, EventApplicationDto } from '@xiaoqu-bangbang/shared';
import {
  EventType,
  ActionType,
  RewardType,
  EventStatus,
  ApplicationStatus,
} from '@xiaoqu-bangbang/shared';
import { EVENT_TYPE_CONFIG, EVENT_STATUS_LABELS } from '@/utils/mappers';
import './index.scss';

interface CommentDto {
  id: string;
  content: string;
  userId: string;
  userNickname: string;
  userAvatarUrl: string;
  createdAt: string;
}

interface FeedbackLogDto {
  id: string;
  status: string;
  content: string;
  images: string[];
  visibleToPublic: boolean;
  createdAt: string;
}

const EVENT_TYPE_TO_ACTION: Record<string, ActionType> = {
  [EventType.HELP_REQUEST]: ActionType.HELP,
  [EventType.HELP_OFFER]: ActionType.NEED_HELP,
  [EventType.PUBLIC_WELFARE]: ActionType.JOIN,
  [EventType.LOST_FOUND]: ActionType.PROVIDE_CLUE,
  [EventType.PUBLIC_FEEDBACK]: ActionType.FOLLOW,
  [EventType.DISCUSSION]: ActionType.PARTICIPATE_DISCUSSION,
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  [ActionType.HELP]: '提供帮助',
  [ActionType.NEED_HELP]: '需要帮助',
  [ActionType.JOIN]: '报名参加',
  [ActionType.PROVIDE_CLUE]: '提供线索',
  [ActionType.FOLLOW]: '关注进展',
  [ActionType.PARTICIPATE_DISCUSSION]: '参与讨论',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  [RewardType.FREE]: '免费',
  [RewardType.PAID]: '有偿',
  [RewardType.NEGOTIABLE]: '面议',
  [RewardType.NONE]: '无',
};

const FEEDBACK_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  submitted: { label: '已提交', color: '#3586FF', bgColor: '#EBF2FF' },
  received: { label: '已接收', color: '#e0a458', bgColor: '#fbf0dd' },
  processing: { label: '处理中', color: '#5b9e6f', bgColor: '#eaf4ec' },
  resolved: { label: '已解决', color: '#5b9e6f', bgColor: '#eaf4ec' },
  closed: { label: '已关闭', color: '#999', bgColor: '#F5F5F5' },
};

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

export default function EventDetail() {
  const { id } = Taro.getCurrentInstance().router?.params ?? {};
  const user = useAuthStore((s) => s.user);

  const {
    data: event,
    loading,
    error,
    refresh,
  } = useRequest<EventDto>(() => eventService.getById(id!), [id], { enabled: !!id });

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [helperSheetVisible, setHelperSheetVisible] = useState(false);

  // Applications / participants
  const { data: applicationsData } = useRequest<{ items: EventApplicationDto[] }>(
    () => eventService.getApplications(id!),
    [id],
    { enabled: !!id && !!event },
  );
  const applications = applicationsData?.items;

  // Feedback logs for public_feedback type
  const { data: feedbackLogs } = useRequest<FeedbackLogDto[]>(
    () => eventService.getFeedbackLogs(id!),
    [id],
    { enabled: !!id && event?.type === EventType.PUBLIC_FEEDBACK },
  );

  // Share config
  const { data: shareConfig } = useRequest(
    () => shareService.getCardConfig({ targetType: 'event', targetId: id! }),
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
      title: event ? `${event.title} - 小区帮榜棒` : '小区帮榜棒',
      path: `/pages/event-detail/index?id=${id}`,
    };
  });

  const {
    items: comments,
    loading: commentsLoading,
    hasMore: commentsHasMore,
    refresh: refreshComments,
    loadMore: loadMoreComments,
  } = usePaginatedList<CommentDto>(
    (page, pageSize) => eventService.getComments(id!, { page, pageSize }),
    [id],
  );

  const handleLike = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const result = await eventService.toggleLike(id);
      setLiked(result.liked);
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  }, [id, submitting]);

  const handleFavorite = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const result = await eventService.toggleFavorite(id);
      setFavorited(result.favorited);
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  }, [id, submitting]);

  const handleCta = useCallback(async () => {
    if (!event || submitting) return;
    const actionType = EVENT_TYPE_TO_ACTION[event.type];
    if (!actionType) return;
    setSubmitting(true);
    try {
      await eventService.respond(event.id, { actionType });
      Taro.showToast({ title: '已响应', icon: 'success' });
      refresh();
    } catch {
      Taro.showToast({ title: '响应失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [event, submitting]);

  const handleComment = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const res = (await Taro.showModal({
        title: '发表评论',
        editable: true,
        placeholderText: '说点什么...',
      } as any)) as any;
      if (res.confirm && res.content?.trim()) {
        await eventService.addComment(id, { content: res.content.trim() });
        Taro.showToast({ title: '评论成功', icon: 'success' });
        refreshComments();
        refresh();
      }
    } catch {
      Taro.showToast({ title: '评论失败', icon: 'none' });
    }
  }, [id, submitting, refreshComments, refresh]);

  const handleClose = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const res = await Taro.showModal({ title: '确认', content: '确定要关闭此事件吗？' });
      if (res.confirm) {
        await eventService.close(id);
        Taro.showToast({ title: '已关闭', icon: 'success' });
        refresh();
      }
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  }, [id, submitting, refresh]);

  const handleSelectHelper = useCallback(
    async (applicationId: string) => {
      if (!id || submitting) return;
      setSubmitting(true);
      try {
        await eventService.selectHelper(id, applicationId);
        Taro.showToast({ title: '已选择帮手', icon: 'success' });
        setHelperSheetVisible(false);
        refresh();
      } catch {
        Taro.showToast({ title: '操作失败', icon: 'none' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, submitting, refresh],
  );

  const handleRequestCompletion = useCallback(async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      await eventService.requestCompletion(id);
      Taro.showToast({ title: '已申请完成', icon: 'success' });
      refresh();
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, refresh]);

  const handleConfirmCompletion = useCallback(async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      await eventService.confirmCompletion(id);
      Taro.showToast({ title: '已确认完成', icon: 'success' });
      refresh();
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, refresh]);

  const handleThanks = useCallback(async () => {
    if (!id || submitting) return;
    try {
      await eventService.sendThanks(id);
      Taro.showToast({ title: '已送花感谢', icon: 'success' });
      refresh();
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  }, [id, submitting, refresh]);

  const handleReport = useCallback(async () => {
    if (!id) return;
    try {
      const res = await Taro.showActionSheet({
        itemList: ['隐私泄露', '虚假信息', '骚扰辱骂', '违法违规', '其他'],
      });
      const reasons = ['privacy', 'false_info', 'harassment', 'illegal', 'other'];
      await reportService.submit({
        targetType: 'event',
        targetId: id,
        reason: reasons[res.tapIndex],
      });
      Taro.showToast({ title: '举报成功', icon: 'success' });
    } catch {
      // cancelled or failed
    }
  }, [id]);

  if (loading) {
    return <Loading text="加载事件详情..." />;
  }

  if (error || !event) {
    return <ErrorState message={error?.message ?? '事件不存在'} onRetry={refresh} />;
  }

  const typeConfig = EVENT_TYPE_CONFIG[event.type] ?? EVENT_TYPE_CONFIG.discussion;
  const statusLabel = EVENT_STATUS_LABELS[event.status] ?? event.status;
  const isCreator = !!user?.id && user.id === event.creatorId;
  const interactionDisabled =
    event.status === EventStatus.CLOSED || event.status === EventStatus.REJECTED;
  const isHelperType = event.type === EventType.HELP_REQUEST;
  const isPublicFeedback = event.type === EventType.PUBLIC_FEEDBACK;

  return (
    <View className="event-detail">
      <ScrollView scrollY className="event-detail__scroll">
        <View className="event-detail__tags">
          <View
            className="event-detail__type-tag"
            style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
          >
            <Text className="event-detail__type-tag-text">{typeConfig.label}</Text>
          </View>
          <View className="event-detail__status-tag">
            <Text className="event-detail__status-tag-text">{statusLabel}</Text>
          </View>
        </View>

        <Text className="event-detail__title">{event.title}</Text>

        <View className="event-detail__creator">
          {event.isAnonymous ? (
            <View className="event-detail__avatar event-detail__avatar--anonymous">
              <Text className="event-detail__avatar-emoji">😺</Text>
            </View>
          ) : (
            <View
              className="event-detail__avatar"
              onClick={() =>
                event.creator?.id &&
                Taro.navigateTo({ url: `/pages/user-profile/index?id=${event.creator.id}` })
              }
            >
              {event.creator?.avatarUrl ? (
                <Image
                  className="event-detail__avatar-img"
                  src={event.creator.avatarUrl}
                  mode="aspectFill"
                />
              ) : (
                <Text className="event-detail__avatar-emoji">👤</Text>
              )}
            </View>
          )}
          <Text
            className="event-detail__nickname"
            onClick={() =>
              !event.isAnonymous &&
              event.creator?.id &&
              Taro.navigateTo({ url: `/pages/user-profile/index?id=${event.creator.id}` })
            }
          >
            {event.isAnonymous ? '匿名邻居' : (event.creator?.nickname ?? '邻居')}
          </Text>
          <Text className="event-detail__dot">·</Text>
          <Text className="event-detail__time">{formatRelativeTime(event.createdAt)}</Text>
          {event.locationText && (
            <>
              <Text className="event-detail__dot">·</Text>
              <Text className="event-detail__location">{event.locationText}</Text>
            </>
          )}
        </View>

        <Text className="event-detail__description">{event.description}</Text>

        {event.images.length > 0 && (
          <View className="event-detail__images">
            <Swiper
              className="event-detail__swiper"
              indicatorDots
              indicatorColor="rgba(0,0,0,0.2)"
              indicatorActiveColor="#5b9e6f"
              circular
              autoplay={false}
            >
              {event.images.map((img, idx) => (
                <SwiperItem key={idx}>
                  <Image className="event-detail__image" src={img} mode="aspectFill" />
                </SwiperItem>
              ))}
            </Swiper>
          </View>
        )}

        <View className="event-detail__info-cards">
          {event.rewardType && event.rewardType !== RewardType.NONE && (
            <View className="event-detail__info-card">
              <Text className="event-detail__info-label">回报</Text>
              <Text className="event-detail__info-value">
                {REWARD_TYPE_LABELS[event.rewardType] ?? event.rewardType}
                {event.rewardType === RewardType.PAID && event.rewardAmount != null
                  ? ` ¥${event.rewardAmount}`
                  : ''}
              </Text>
            </View>
          )}
          {event.expectedTime && (
            <View className="event-detail__info-card">
              <Text className="event-detail__info-label">期望时间</Text>
              <Text className="event-detail__info-value">{event.expectedTime}</Text>
            </View>
          )}
          {/* ponytail: eventTime/capacity 字段未在 EventDto 暴露，下迭代再恢复活动时间 / 容量字段。 */}
        </View>

        <View className="event-detail__stats">
          <Text className="event-detail__stat">👁 {event.viewCount}浏览</Text>
          <Text className="event-detail__stat">❤️ {event.likeCount}赞</Text>
          <Text className="event-detail__stat">💬 {event.commentCount}评论</Text>
          <Text className="event-detail__stat">🌸 {event.thanksCount}感谢</Text>
        </View>

        {/* Participants / Responses Section */}
        {applications && applications.length > 0 && (
          <View className="event-detail__participants">
            <Text className="event-detail__participants-header">
              响应者 ({applications.length})
            </Text>
            {applications.map((app) => (
              <View key={app.id} className="event-detail__participant">
                <View className="event-detail__participant-avatar">
                  {app.userAvatarUrl ? (
                    <Image
                      className="event-detail__participant-avatar-img"
                      src={app.userAvatarUrl}
                      mode="aspectFill"
                    />
                  ) : (
                    <Text className="event-detail__participant-avatar-emoji">
                      {app.userNickname.slice(0, 1)}
                    </Text>
                  )}
                </View>
                <View className="event-detail__participant-body">
                  <View className="event-detail__participant-top">
                    <Text className="event-detail__participant-nickname">{app.userNickname}</Text>
                    <View className="event-detail__participant-action-tag">
                      <Text className="event-detail__participant-action-text">
                        {ACTION_TYPE_LABELS[app.actionType] ?? app.actionType}
                      </Text>
                    </View>
                  </View>
                  {app.message && (
                    <Text className="event-detail__participant-message">{app.message}</Text>
                  )}
                </View>
                {isHelperType && isCreator && app.status === ApplicationStatus.PENDING && (
                  <View
                    className="event-detail__participant-select-btn"
                    onClick={() => handleSelectHelper(app.id)}
                  >
                    <Text className="event-detail__participant-select-text">选择</Text>
                  </View>
                )}
                {isHelperType && app.status === ApplicationStatus.SELECTED && (
                  <View className="event-detail__participant-selected-tag">
                    <Text className="event-detail__participant-selected-text">已选择</Text>
                  </View>
                )}
              </View>
            ))}
            {isHelperType &&
              isCreator &&
              (event.status === EventStatus.OPEN || event.status === EventStatus.IN_PROGRESS) && (
                <View
                  className="event-detail__select-helper-btn"
                  onClick={() => setHelperSheetVisible(true)}
                >
                  <Text className="event-detail__select-helper-text">选择帮助者</Text>
                </View>
              )}
          </View>
        )}

        {/* Feedback Timeline for public_feedback */}
        {isPublicFeedback &&
          feedbackLogs &&
          feedbackLogs.filter((l) => l.visibleToPublic).length > 0 && (
            <View className="event-detail__feedback">
              <Text className="event-detail__feedback-header">处理进度</Text>
              {feedbackLogs
                .filter((l) => l.visibleToPublic)
                .map((log) => {
                  const statusCfg = FEEDBACK_STATUS_CONFIG[log.status] ?? {
                    label: log.status,
                    color: '#999',
                    bgColor: '#F5F5F5',
                  };
                  return (
                    <View key={log.id} className="event-detail__feedback-item">
                      <View className="event-detail__feedback-dot-wrap">
                        <View
                          className="event-detail__feedback-dot"
                          style={{ background: statusCfg.color }}
                        />
                      </View>
                      <View className="event-detail__feedback-body">
                        <View className="event-detail__feedback-top">
                          <View
                            className="event-detail__feedback-status"
                            style={{ backgroundColor: statusCfg.bgColor }}
                          >
                            <Text
                              className="event-detail__feedback-status-text"
                              style={{ color: statusCfg.color }}
                            >
                              {statusCfg.label}
                            </Text>
                          </View>
                          <Text className="event-detail__feedback-time">
                            {formatRelativeTime(log.createdAt)}
                          </Text>
                        </View>
                        {log.content && (
                          <Text className="event-detail__feedback-content">{log.content}</Text>
                        )}
                        {log.images.length > 0 && (
                          <View className="event-detail__feedback-images">
                            {log.images.map((img, idx) => (
                              <Image
                                key={idx}
                                className="event-detail__feedback-img"
                                src={img}
                                mode="aspectFill"
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
            </View>
          )}

        <View className="event-detail__comments">
          <Text className="event-detail__comments-header">💬 评论 ({event.commentCount})</Text>

          {comments.length === 0 && !commentsLoading && (
            <Text className="event-detail__comments-empty">暂无评论</Text>
          )}

          {comments.map((c) => (
            <View className="event-detail__comment" key={c.id}>
              <View className="event-detail__comment-avatar">
                {c.userAvatarUrl ? (
                  <Image
                    className="event-detail__comment-avatar-img"
                    src={c.userAvatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <Text className="event-detail__comment-avatar-emoji">👤</Text>
                )}
              </View>
              <View className="event-detail__comment-body">
                <View className="event-detail__comment-meta">
                  <Text className="event-detail__comment-nickname">{c.userNickname}</Text>
                  <Text className="event-detail__comment-time">
                    {formatRelativeTime(c.createdAt)}
                  </Text>
                </View>
                <Text className="event-detail__comment-content">{c.content}</Text>
              </View>
            </View>
          ))}

          {commentsHasMore && comments.length > 0 && (
            <View className="event-detail__comments-more" onClick={loadMoreComments}>
              <Text className="event-detail__comments-more-text">加载更多</Text>
            </View>
          )}
        </View>

        <View className="event-detail__lifecycle">
          {/* 状态推进主按钮：确认完成 / 申请完成 / 送花感谢 */}
          {isCreator &&
            (event.status === EventStatus.IN_PROGRESS ||
              event.status === EventStatus.PROCESSING) && (
              <View
                className="event-detail__lifecycle-btn event-detail__lifecycle-btn--confirm"
                onClick={handleConfirmCompletion}
              >
                <Text className="event-detail__lifecycle-btn-text">
                  {submitting ? '提交中...' : '确认完成'}
                </Text>
              </View>
            )}
          {user &&
            event.selectedHelperId === user.id &&
            (event.status === EventStatus.IN_PROGRESS ||
              event.status === EventStatus.PROCESSING) && (
              <View
                className="event-detail__lifecycle-btn event-detail__lifecycle-btn--request"
                onClick={handleRequestCompletion}
              >
                <Text className="event-detail__lifecycle-btn-text">
                  {submitting ? '提交中...' : '申请完成'}
                </Text>
              </View>
            )}
          {isCreator && event.status === EventStatus.COMPLETED && (
            <View
              className="event-detail__lifecycle-btn event-detail__lifecycle-btn--thanks"
              onClick={handleThanks}
            >
              <Text className="event-detail__lifecycle-btn-text" style={{ color: '#FF6B6B' }}>
                🌸 送花感谢
              </Text>
            </View>
          )}

          {/* 创建者管理区：编辑（仅 open）/ 关闭（open~processing） */}
          {isCreator &&
            (event.status === EventStatus.OPEN ||
              event.status === EventStatus.IN_PROGRESS ||
              event.status === EventStatus.PROCESSING) && (
              <View className="event-detail__manage-row">
                {event.status === EventStatus.OPEN && (
                  <View
                    className="event-detail__manage-btn"
                    onClick={() =>
                      Taro.navigateTo({ url: `/pages/event-edit/index?id=${event.id}` })
                    }
                  >
                    <Text className="event-detail__manage-btn-text">✏️ 编辑</Text>
                  </View>
                )}
                <View className="event-detail__manage-btn" onClick={handleClose}>
                  <Text className="event-detail__manage-btn-text">🔒 关闭事件</Text>
                </View>
              </View>
            )}

          {/* 举报：非创建者可见，pending_review/rejected 除外 */}
          {!isCreator &&
            event.status !== EventStatus.PENDING_REVIEW &&
            event.status !== EventStatus.REJECTED && (
              <View className="event-detail__report-link" onClick={handleReport}>
                <Text className="event-detail__report-link-text">🚫 举报该事件</Text>
              </View>
            )}
        </View>

        <View className="event-detail__bottom-spacer" />
      </ScrollView>

      {/* Helper Selection BottomSheet */}
      <BottomSheet
        visible={helperSheetVisible}
        onClose={() => setHelperSheetVisible(false)}
        title="选择帮助者"
      >
        {applications
          ?.filter((a) => a.status === ApplicationStatus.PENDING)
          .map((app) => (
            <View key={app.id} className="event-detail__helper-item">
              <View className="event-detail__helper-avatar">
                {app.userAvatarUrl ? (
                  <Image
                    className="event-detail__helper-avatar-img"
                    src={app.userAvatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <Text className="event-detail__helper-avatar-fallback">
                    {app.userNickname.slice(0, 1)}
                  </Text>
                )}
              </View>
              <View className="event-detail__helper-info">
                <Text className="event-detail__helper-nickname">{app.userNickname}</Text>
                {app.message && <Text className="event-detail__helper-message">{app.message}</Text>}
              </View>
              <View
                className="event-detail__helper-select-btn"
                onClick={() => handleSelectHelper(app.id)}
              >
                <Text className="event-detail__helper-select-text">选择</Text>
              </View>
            </View>
          ))}
        {(!applications ||
          applications.filter((a) => a.status === ApplicationStatus.PENDING).length === 0) && (
          <Text className="event-detail__helper-empty">暂无待选帮手</Text>
        )}
      </BottomSheet>

      <View className="event-detail__action-bar">
        <View
          className={`event-detail__action-btn event-detail__action-btn--like ${liked ? 'event-detail__action-btn--active' : ''} ${interactionDisabled ? 'event-detail__action-btn--disabled' : ''}`}
          onClick={interactionDisabled ? undefined : handleLike}
        >
          <Text className="event-detail__action-btn-icon">{liked ? '❤️' : '🤍'}</Text>
          <Text className="event-detail__action-btn-label">赞</Text>
        </View>

        <View
          className={`event-detail__action-btn event-detail__action-btn--comment ${interactionDisabled ? 'event-detail__action-btn--disabled' : ''}`}
          onClick={interactionDisabled ? undefined : handleComment}
        >
          <Text className="event-detail__action-btn-icon">💬</Text>
          <Text className="event-detail__action-btn-label">评论</Text>
        </View>

        {!isCreator &&
          (event.status === EventStatus.OPEN || event.status === EventStatus.IN_PROGRESS) && (
            <View
              className="event-detail__action-btn event-detail__action-btn--cta"
              style={{ backgroundColor: typeConfig.ctaColor }}
              onClick={handleCta}
            >
              <Text className="event-detail__action-btn-cta-text">
                {submitting ? '提交中...' : typeConfig.ctaText}
              </Text>
            </View>
          )}

        <View
          className={`event-detail__action-btn event-detail__action-btn--fav ${favorited ? 'event-detail__action-btn--active' : ''} ${interactionDisabled ? 'event-detail__action-btn--disabled' : ''}`}
          onClick={interactionDisabled ? undefined : handleFavorite}
        >
          <Text className="event-detail__action-btn-icon">{favorited ? '⭐' : '☆'}</Text>
          <Text className="event-detail__action-btn-label">收藏</Text>
        </View>
      </View>
    </View>
  );
}
