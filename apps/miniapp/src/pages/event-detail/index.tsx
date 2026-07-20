import { useState, useCallback } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { View, Text, ScrollView, Swiper, SwiperItem, Image, Input } from '@tarojs/components';
import { useRequest, usePaginatedList } from '@/hooks';
import { useAuthStore } from '@/store';
import { eventService, shareService, reportService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import BottomSheet from '@/components/bottom-sheet';
import type {
  EventDto,
  EventApplicationDto,
  MatchedSkillDto,
  EventRateDto,
  PetFeedMeta,
  PetWalkMeta,
  PetLostMeta,
} from '@xiaoqu-bangbang/shared';
import {
  EventType,
  ActionType,
  RewardType,
  EventStatus,
  ApplicationStatus,
  PetSubType,
} from '@xiaoqu-bangbang/shared';
import { EVENT_TYPE_CONFIG, EVENT_STATUS_LABELS } from '@/utils/mappers';
import './index.scss';
import Icon, { type IconName } from '@/components/icon';

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

// ponytail: petMeta 展示用的 label 映射，上限 M22 三种 subType，新增字段时同步加
const PET_TYPE_LABELS: Record<string, string> = { cat: '猫', dog: '狗', fish: '鱼', other: '其他' };
const DOG_SIZE_LABELS: Record<string, string> = { small: '小型', medium: '中型', large: '大型' };
const TIME_SLOT_LABELS: Record<string, string> = {
  morning: '早上',
  noon: '中午',
  evening: '傍晚',
  night: '夜间',
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
  received: { label: '已接收', color: '#e89b6c', bgColor: '#fbf0dd' },
  processing: { label: '处理中', color: '#5b9e6f', bgColor: '#eaf4ec' },
  resolved: { label: '已解决', color: '#5b9e6f', bgColor: '#eaf4ec' },
  closed: { label: '已关闭', color: '#999', bgColor: '#F5F5F5' },
};

const RATING_TAGS = ['响应及时', '沟通顺畅', '靠谱', '有耐心', '态度友好'];

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

  // 评价表单状态
  const [ratingStars, setRatingStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ratingContent, setRatingContent] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  // 多帮手事件: 创建者选择要评价的参与者
  const [ratingTargetUserId, setRatingTargetUserId] = useState<string | null>(null);

  // Applications / participants
  const { data: applicationsData } = useRequest<{ items: EventApplicationDto[] }>(
    () => eventService.getApplications(id!),
    [id],
    { enabled: !!id && !!event },
  );
  const applications = applicationsData?.items;

  // Feedback logs for public_feedback type
  // P-104: 后端返回 { items: FeedbackLogDto[] }
  const { data: feedbackLogsData } = useRequest<{ items: FeedbackLogDto[] }>(
    () => eventService.getFeedbackLogs(id!),
    [id],
    { enabled: !!id && event?.type === EventType.PUBLIC_FEEDBACK },
  );
  const feedbackLogs = feedbackLogsData?.items;

  // Matched skills for help_request type
  const { data: matchedSkillsData } = useRequest<{ items: MatchedSkillDto[] }>(
    () => eventService.getMatchedSkills(id!),
    [id],
    { enabled: !!id && event?.type === EventType.HELP_REQUEST },
  );
  const matchedSkills = matchedSkillsData?.items ?? [];

  // 评价列表
  const { data: ratingsData } = useRequest<{ items: EventRateDto[] }>(
    () => eventService.getEventRatings(id!),
    [id, event?.status],
    { enabled: !!id && event?.status === EventStatus.COMPLETED },
  );
  const ratings = ratingsData?.items ?? [];

  // Share config
  const { data: shareConfig } = useRequest(
    () => shareService.getCardConfig({ targetType: 'event', targetId: id! }),
    [id],
    { enabled: !!id },
  );

  useShareAppMessage(() => {
    if (shareConfig && !shareConfig.canShare) {
      Taro.showToast({ title: shareConfig.disabledReason ?? '无法分享', icon: 'none' });
      return { title: '左邻右帮', path: '/pages/home/index' };
    }
    if (shareConfig) {
      return {
        title: shareConfig.title,
        path: shareConfig.path,
        imageUrl: shareConfig.imageUrl,
      };
    }
    return {
      title: event ? `${event.title} - 左邻右帮` : '左邻右帮',
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

  const handleSelectParticipant = useCallback(
    async (data: { applicationId: string }) => {
      if (!id || submitting) return;
      setSubmitting(true);
      try {
        await eventService.selectParticipant(id, data);
        Taro.showToast({ title: '已选择参与者', icon: 'success' });
        refresh();
      } catch (e: any) {
        const msg = e?.message ?? '操作失败';
        Taro.showToast({ title: msg, icon: 'none' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, submitting, refresh],
  );

  const handleConfirmParticipant = useCallback(
    async (participantId: string) => {
      if (!id || submitting) return;
      setSubmitting(true);
      try {
        await eventService.confirmParticipant(id, participantId);
        Taro.showToast({ title: '已确认完成', icon: 'success' });
        refresh();
      } catch (e: any) {
        const msg = e?.message ?? '操作失败';
        Taro.showToast({ title: msg, icon: 'none' });
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

  const handleThanks = useCallback(
    async (toUserId?: string) => {
      if (!id || submitting) return;
      try {
        await eventService.sendThanks(id, toUserId);
        Taro.showToast({ title: '已送花感谢', icon: 'success' });
        refresh();
      } catch (e: any) {
        const msg = e?.message ?? '操作失败';
        Taro.showToast({ title: msg, icon: 'none' });
      }
    },
    [id, submitting, refresh],
  );

  const handleRateHelper = useCallback(async () => {
    if (!id || !event || ratingSubmitting) return;
    const isCreator = !!user?.id && user.id === event.creatorId;
    // 单帮手: creator → selectedHelperId; 多帮手: creator → ratingTargetUserId
    const targetUserId = isCreator
      ? (event.selectedHelperId ?? ratingTargetUserId)
      : event.creatorId;
    if (!targetUserId || ratingStars < 1) {
      Taro.showToast({ title: '请选择星级', icon: 'none' });
      return;
    }
    setRatingSubmitting(true);
    try {
      await eventService.rateEvent(id, {
        targetUserId,
        rating: ratingStars,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        content: ratingContent.trim() || undefined,
      });
      Taro.showToast({ title: '评价成功', icon: 'success' });
      setHasRated(true);
      setRatingTargetUserId(null);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('已评价过')) {
        setHasRated(true);
        setRatingTargetUserId(null);
        Taro.showToast({ title: '已评价过', icon: 'none' });
      } else {
        Taro.showToast({ title: msg || '评价失败', icon: 'none' });
      }
    } finally {
      setRatingSubmitting(false);
    }
  }, [
    id,
    event,
    user,
    ratingStars,
    selectedTags,
    ratingContent,
    ratingSubmitting,
    ratingTargetUserId,
  ]);

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
  const participants = event.participants ?? [];
  const isHelper =
    (!!user?.id && !!event.selectedHelperId && user.id === event.selectedHelperId) ||
    (!!user?.id && participants.some((p) => p.userId === user.id));
  // 单帮手: creator→selectedHelperId, helper→creatorId
  // 多帮手: creator→null(需选参与者), participant→creatorId
  const rateTargetUserId = isCreator
    ? (event.selectedHelperId ?? ratingTargetUserId)
    : isHelper
      ? event.creatorId
      : null;
  const interactionDisabled =
    event.status === EventStatus.CLOSED ||
    event.status === EventStatus.REJECTED ||
    event.status === EventStatus.PENDING_REVIEW;
  const isHelperType = event.type === EventType.HELP_REQUEST;
  const isMultiHelperType =
    event.type === EventType.PUBLIC_WELFARE || event.type === EventType.LOST_FOUND;
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
              <View className="event-detail__avatar-emoji">
                <Icon name="cat" size={32} />
              </View>
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
                <View className="event-detail__avatar-emoji">
                  <Icon name="person" size={32} />
                </View>
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

        {event.type === EventType.PET_HELP && event.petMeta && event.subType && (
          <View className="pet-meta">
            <Text className="section-title">详细信息</Text>
            {event.subType === PetSubType.FEED &&
              (() => {
                const m = event.petMeta as PetFeedMeta;
                return (
                  <>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">宠物种类</Text>
                      <Text className="pet-meta__value">
                        {PET_TYPE_LABELS[m.petType] ?? m.petType}
                      </Text>
                    </View>
                    {m.petName && (
                      <View className="pet-meta__row">
                        <Text className="pet-meta__label">名字</Text>
                        <Text className="pet-meta__value">{m.petName}</Text>
                      </View>
                    )}
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">喂食次数/天</Text>
                      <Text className="pet-meta__value">{m.feedsPerDay}</Text>
                    </View>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">总天数</Text>
                      <Text className="pet-meta__value">{m.totalDays}</Text>
                    </View>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">起止日期</Text>
                      <Text className="pet-meta__value">
                        {m.dateRange.start} ~ {m.dateRange.end}
                      </Text>
                    </View>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">需要清理</Text>
                      <Text className="pet-meta__value">{m.needClean ? '是' : '否'}</Text>
                    </View>
                  </>
                );
              })()}
            {event.subType === PetSubType.WALK &&
              (() => {
                const m = event.petMeta as PetWalkMeta;
                return (
                  <>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">狗的体型</Text>
                      <Text className="pet-meta__value">
                        {DOG_SIZE_LABELS[m.dogSize] ?? m.dogSize}
                      </Text>
                    </View>
                    {m.dogName && (
                      <View className="pet-meta__row">
                        <Text className="pet-meta__label">名字</Text>
                        <Text className="pet-meta__value">{m.dogName}</Text>
                      </View>
                    )}
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">每天次数</Text>
                      <Text className="pet-meta__value">{m.timesPerDay}</Text>
                    </View>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">每次时长</Text>
                      <Text className="pet-meta__value">{m.durationPerTime} 分钟</Text>
                    </View>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">时间段</Text>
                      <Text className="pet-meta__value">
                        {m.timeSlots.map((s) => TIME_SLOT_LABELS[s] ?? s).join('、')}
                      </Text>
                    </View>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">需要牵引绳</Text>
                      <Text className="pet-meta__value">{m.needGear ? '是' : '否'}</Text>
                    </View>
                  </>
                );
              })()}
            {event.subType === PetSubType.LOST &&
              (() => {
                const m = event.petMeta as PetLostMeta;
                return (
                  <>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">种类</Text>
                      <Text className="pet-meta__value">{m.petType}</Text>
                    </View>
                    {m.breed && (
                      <View className="pet-meta__row">
                        <Text className="pet-meta__label">品种</Text>
                        <Text className="pet-meta__value">{m.breed}</Text>
                      </View>
                    )}
                    {m.name && (
                      <View className="pet-meta__row">
                        <Text className="pet-meta__label">名字</Text>
                        <Text className="pet-meta__value">{m.name}</Text>
                      </View>
                    )}
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">走丢地点</Text>
                      <Text className="pet-meta__value">{m.lostLocation}</Text>
                    </View>
                    <View className="pet-meta__row">
                      <Text className="pet-meta__label">走丢时间</Text>
                      <Text className="pet-meta__value">{m.lostTime}</Text>
                    </View>
                    {m.appearance && (
                      <View className="pet-meta__row">
                        <Text className="pet-meta__label">外观</Text>
                        <Text className="pet-meta__value">{m.appearance}</Text>
                      </View>
                    )}
                    {m.photos && m.photos.length > 0 && (
                      <View className="pet-meta__photos">
                        {m.photos.map((p, i) => (
                          <Image
                            key={i}
                            className="pet-meta__photo"
                            src={p}
                            mode="aspectFill"
                            onClick={() =>
                              Taro.previewMedia({
                                sources: m.photos!.map((src) => ({
                                  url: src,
                                  type: 'image' as const,
                                })),
                                current: i,
                              })
                            }
                          />
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}
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
          <View className="event-detail__stat">
            <Icon name="eye" size={14} /> <Text>{event.viewCount}浏览</Text>
          </View>
          <View className="event-detail__stat">
            <Icon name="heart" size={14} color="#E89B6C" /> <Text>{event.likeCount}赞</Text>
          </View>
          <View className="event-detail__stat">
            <Icon name="chat" size={14} /> <Text>{event.commentCount}评论</Text>
          </View>
          <View className="event-detail__stat">
            <Icon name="flower" size={14} color="#E89B6C" /> <Text>{event.thanksCount}感谢</Text>
          </View>
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
                {isMultiHelperType && isCreator && app.status === ApplicationStatus.PENDING && (
                  <View
                    className="event-detail__participant-select-btn"
                    onClick={() => handleSelectParticipant({ applicationId: app.id })}
                  >
                    <Text className="event-detail__participant-select-text">选择参与</Text>
                  </View>
                )}
                {(isHelperType || isMultiHelperType) &&
                  app.status === ApplicationStatus.SELECTED && (
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

        {/* Multi-helper participants section */}
        {isMultiHelperType && participants.length > 0 && (
          <View className="event-detail__participants">
            <Text className="event-detail__participants-header">
              参与者 ({participants.length}
              {event.capacity ? `/${event.capacity}` : ''})
            </Text>
            {participants.map((p) => (
              <View key={p.id} className="event-detail__participant">
                <View className="event-detail__participant-avatar">
                  {p.user?.avatarUrl ? (
                    <Image
                      className="event-detail__participant-avatar-img"
                      src={p.user.avatarUrl}
                      mode="aspectFill"
                    />
                  ) : (
                    <Text className="event-detail__participant-avatar-emoji">
                      {(p.user?.nickname ?? '?').slice(0, 1)}
                    </Text>
                  )}
                </View>
                <View className="event-detail__participant-body">
                  <View className="event-detail__participant-top">
                    <Text className="event-detail__participant-nickname">
                      {p.user?.nickname ?? '邻居'}
                    </Text>
                    <View
                      className={`event-detail__participant-action-tag ${p.status === 'confirmed' ? 'event-detail__participant-action-tag--done' : ''}`}
                    >
                      <Text className="event-detail__participant-action-text">
                        {p.status === 'confirmed' ? '已完成' : '待确认'}
                      </Text>
                    </View>
                  </View>
                </View>
                {isCreator &&
                  p.status !== 'confirmed' &&
                  (event.status === EventStatus.PROCESSING ||
                    event.status === EventStatus.IN_PROGRESS) && (
                    <View
                      className="event-detail__participant-select-btn"
                      onClick={() => handleConfirmParticipant(p.id)}
                    >
                      <Text className="event-detail__participant-select-text">
                        {submitting ? '...' : '确认完成'}
                      </Text>
                    </View>
                  )}
                {isCreator &&
                  p.status === 'confirmed' &&
                  event.status === EventStatus.COMPLETED &&
                  p.userId && (
                    <View className="event-detail__participant-actions">
                      <View
                        className="event-detail__participant-action-btn event-detail__participant-action-btn--thanks"
                        onClick={() => handleThanks(p.userId)}
                      >
                        <View className="event-detail__participant-action-text">
                          <Icon name="flower" size={16} color="#E89B6C" /> <Text>送花</Text>
                        </View>
                      </View>
                      <View
                        className="event-detail__participant-action-btn event-detail__participant-action-btn--rate"
                        onClick={() => {
                          setRatingTargetUserId(p.userId);
                          setRatingStars(0);
                          setSelectedTags([]);
                          setRatingContent('');
                          setHasRated(false);
                        }}
                      >
                        <View className="event-detail__participant-action-text">
                          <Icon name="star" size={16} color="#E89B6C" /> <Text>评价</Text>
                        </View>
                      </View>
                    </View>
                  )}
              </View>
            ))}
          </View>
        )}

        {/* Matched skills for help_request */}
        {isHelperType && matchedSkills.length > 0 && (
          <View className="event-detail__matched-skills">
            <View className="event-detail__matched-skills-header">
              <Icon name="search" size={18} /> <Text>匹配的帮手</Text>
            </View>
            {matchedSkills.map((s) => (
              <View
                key={s.skillId}
                className="event-detail__matched-skill"
                onClick={() =>
                  s.userId && Taro.navigateTo({ url: `/pages/user-profile/index?id=${s.userId}` })
                }
              >
                <View className="event-detail__matched-skill-avatar">
                  {s.userAvatarUrl ? (
                    <Image
                      className="event-detail__matched-skill-avatar-img"
                      src={s.userAvatarUrl}
                      mode="aspectFill"
                    />
                  ) : (
                    <Text className="event-detail__matched-skill-avatar-emoji">
                      {s.userNickname.slice(0, 1)}
                    </Text>
                  )}
                </View>
                <View className="event-detail__matched-skill-body">
                  <View className="event-detail__matched-skill-top">
                    <Text className="event-detail__matched-skill-nickname">{s.userNickname}</Text>
                    <View className="event-detail__matched-skill-score">
                      <Text className="event-detail__matched-skill-score-text">
                        {Math.round(s.similarity * 100)}%
                      </Text>
                    </View>
                  </View>
                  <Text className="event-detail__matched-skill-title">{s.title}</Text>
                  {s.description && (
                    <Text className="event-detail__matched-skill-desc">{s.description}</Text>
                  )}
                  {s.wechatId && (
                    <Text className="event-detail__matched-skill-wechat">微信: {s.wechatId}</Text>
                  )}
                </View>
              </View>
            ))}
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
          <View className="event-detail__comments-header">
            <Icon name="chat" size={18} /> <Text>评论 ({event.commentCount})</Text>
          </View>

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
                  <View className="event-detail__comment-avatar-emoji">
                    <Icon name="person" size={24} />
                  </View>
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
          {/* ponytail: 多帮手类型(public_welfare/lost_found) 走逐个确认流程，不显示全局确认/申请按钮 */}
          {isCreator &&
            !isMultiHelperType &&
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
            !isMultiHelperType &&
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
          {isCreator && !isMultiHelperType && event.status === EventStatus.COMPLETED && (
            <View
              className="event-detail__lifecycle-btn event-detail__lifecycle-btn--thanks"
              onClick={() => handleThanks()}
            >
              <Text className="event-detail__lifecycle-btn-text" style={{ color: '#FF6B6B' }}>
                <Icon name="flower" size={16} color="#E89B6C" /> 送花感谢
              </Text>
            </View>
          )}

          {/* 评价对方：COMPLETED + 参与者 + 有评价目标 + 未评价 */}
          {event.status === EventStatus.COMPLETED &&
            (isCreator || isHelper) &&
            rateTargetUserId &&
            (hasRated ? (
              <View className="event-detail__rated-hint">
                <View className="event-detail__rated-hint-text">
                  <Icon name="check" size={14} /> <Text>已完成评价</Text>
                </View>
              </View>
            ) : (
              <View className="event-detail__rating">
                <Text className="event-detail__rating-title">
                  <Icon name="star" size={16} color="#E89B6C" /> 评价{isCreator ? '帮手' : '发起者'}
                </Text>
                <View className="event-detail__rating-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Text
                      key={n}
                      className={
                        n <= ratingStars
                          ? 'event-detail__rating-star event-detail__rating-star--active'
                          : 'event-detail__rating-star'
                      }
                      onClick={() => setRatingStars(n)}
                    >
                      {'\u2605'}
                    </Text>
                  ))}
                </View>
                <View className="event-detail__rating-tags">
                  {RATING_TAGS.map((tag) => (
                    <Text
                      key={tag}
                      className={
                        selectedTags.includes(tag)
                          ? 'event-detail__rating-tag event-detail__rating-tag--active'
                          : 'event-detail__rating-tag'
                      }
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                        )
                      }
                    >
                      {tag}
                    </Text>
                  ))}
                </View>
                <Input
                  className="event-detail__rating-input"
                  placeholder="说点什么（可选）"
                  value={ratingContent}
                  onInput={(e) => setRatingContent(e.detail.value)}
                  maxlength={200}
                />
                <View
                  className="event-detail__lifecycle-btn event-detail__lifecycle-btn--rate"
                  onClick={handleRateHelper}
                >
                  <Text className="event-detail__lifecycle-btn-text">
                    {ratingSubmitting ? '提交中...' : '提交评价'}
                  </Text>
                </View>
              </View>
            ))}

          {/* 已有评价列表 */}
          {event.status === EventStatus.COMPLETED && ratings.length > 0 && (
            <View className="event-detail__ratings-list">
              <View className="event-detail__ratings-list-header">
                <Icon name="star" size={18} color="#E89B6C" /> <Text>评价 ({ratings.length})</Text>
              </View>
              {ratings.map((r) => (
                <View key={r.id} className="event-detail__rating-item">
                  <View className="event-detail__rating-item-header">
                    <View className="event-detail__rating-item-avatar">
                      {r.user?.avatarUrl ? (
                        <Image
                          className="event-detail__rating-item-avatar-img"
                          src={r.user.avatarUrl}
                          mode="aspectFill"
                        />
                      ) : (
                        <Text className="event-detail__rating-item-avatar-emoji">
                          {(r.user?.nickname ?? '?').slice(0, 1)}
                        </Text>
                      )}
                    </View>
                    <View className="event-detail__rating-item-meta">
                      <Text className="event-detail__rating-item-nickname">
                        {r.user?.nickname ?? '邻居'}
                      </Text>
                      <Text className="event-detail__rating-item-role">
                        {r.role === 'creator' ? '发起者评价' : '帮手评价'}
                      </Text>
                    </View>
                    <View className="event-detail__rating-item-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Text
                          key={n}
                          className={
                            n <= r.rating
                              ? 'event-detail__rating-item-star event-detail__rating-item-star--active'
                              : 'event-detail__rating-item-star'
                          }
                        >
                          {'\u2605'}
                        </Text>
                      ))}
                    </View>
                  </View>
                  {r.tags && r.tags.length > 0 && (
                    <View className="event-detail__rating-item-tags">
                      {r.tags.map((tag) => (
                        <Text key={tag} className="event-detail__rating-item-tag">
                          {tag}
                        </Text>
                      ))}
                    </View>
                  )}
                  {r.content && (
                    <Text className="event-detail__rating-item-content">{r.content}</Text>
                  )}
                  <Text className="event-detail__rating-item-time">
                    {formatRelativeTime(r.createdAt)}
                  </Text>
                </View>
              ))}
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
                    <View className="event-detail__manage-btn-text">
                      <Icon name="edit" size={16} /> <Text>编辑</Text>
                    </View>
                  </View>
                )}
                <View className="event-detail__manage-btn" onClick={handleClose}>
                  <View className="event-detail__manage-btn-text">
                    <Icon name="lock" size={16} /> <Text>关闭事件</Text>
                  </View>
                </View>
              </View>
            )}

          {/* 举报：非创建者可见，pending_review/rejected 除外 */}
          {!isCreator &&
            event.status !== EventStatus.PENDING_REVIEW &&
            event.status !== EventStatus.REJECTED && (
              <View className="event-detail__report-link" onClick={handleReport}>
                <View className="event-detail__report-link-text">
                  <Icon name="block" size={16} color="#D9534F" /> <Text>举报该事件</Text>
                </View>
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
          <View className="event-detail__action-btn-icon">
            <Icon name="heart" size={24} color={liked ? '#E89B6C' : '#6B7A6E'} />
          </View>
          <Text className="event-detail__action-btn-label">赞</Text>
        </View>

        <View
          className={`event-detail__action-btn event-detail__action-btn--comment ${interactionDisabled ? 'event-detail__action-btn--disabled' : ''}`}
          onClick={interactionDisabled ? undefined : handleComment}
        >
          <View className="event-detail__action-btn-icon">
            <Icon name="chat" size={24} />
          </View>
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
          <View className="event-detail__action-btn-icon">
            <Icon name={favorited ? 'star' : 'star-outline'} size={24} color="#E89B6C" />
          </View>
          <Text className="event-detail__action-btn-label">收藏</Text>
        </View>
      </View>
    </View>
  );
}
