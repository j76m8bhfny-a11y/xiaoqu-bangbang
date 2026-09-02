import { useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { View, Text, ScrollView, Swiper, SwiperItem, Image } from '@tarojs/components';
import { useRequest, usePaginatedList } from '@/hooks';
import { useAuthStore } from '@/store';
import { eventService, shareService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import NavBar from '@/components/navbar';
import type {
  EventDto,
  EventApplicationDto,
  MatchedSkillDto,
  EventRateDto,
} from '@xiaoqu-bangbang/shared';
import { EventType, RewardType, EventStatus, PetSubType } from '@xiaoqu-bangbang/shared';
import { EVENT_TYPE_CONFIG, EVENT_STATUS_LABELS } from '@/utils/mappers';
import './index.scss';
import Icon from '@/components/icon';
import {
  type CommentDto,
  type FeedbackLogDto,
  type ContactInfo,
  PET_SUBTYPE_LABELS,
  REWARD_TYPE_LABELS,
  formatRelativeTime,
} from './constants';
import { useEventDetailHandlers } from './use-event-detail-handlers';
import { HelperSelectionSheet, ContactInfoSheet } from './sheets';
import { ActionBar } from './action-bar';
import { PetMeta } from './pet-meta';
import { Participants } from './participants';
import { FeedbackTimeline } from './feedback-timeline';
import { Lifecycle } from './lifecycle';

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
  const [descExpanded, setDescExpanded] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [hasContacted, setHasContacted] = useState(false);

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
  const applications = applicationsData?.items ?? [];

  // Feedback logs for public_feedback type
  // P-104: 后端返回 { items: FeedbackLogDto[] }
  const { data: feedbackLogsData } = useRequest<{ items: FeedbackLogDto[] }>(
    () => eventService.getFeedbackLogs(id!),
    [id],
    { enabled: !!id && event?.type === EventType.PUBLIC_FEEDBACK },
  );
  const feedbackLogs = feedbackLogsData?.items ?? [];

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
    handleLike,
    handleFavorite,
    handleCta,
    handleComment,
    handleClose,
    handleSelectHelper,
    handleSelectParticipant,
    handleConfirmParticipant,
    handleRequestCompletion,
    handleConfirmCompletion,
    handleThanks,
    handleContact,
    handleCallPhone,
    handleCopyWechat,
    handleReport,
    handleRateHelper,
  } = useEventDetailHandlers({
    id,
    event,
    submitting,
    setSubmitting,
    setLiked,
    setFavorited,
    contactLoading,
    setContactLoading,
    setContactSheetVisible,
    setHasContacted,
    setContactInfo,
    refresh,
    refreshComments,
    setHelperSheetVisible,
    ratingSubmitting,
    setRatingSubmitting,
    ratingStars,
    selectedTags,
    ratingContent,
    ratingTargetUserId,
    setRatingTargetUserId,
    setHasRated,
    user,
  });

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
  // FE-3/4: pet_help 单帮手(feed/walk) 走 selectHelper，多帮手(lost) 走 selectParticipant
  const isHelperType =
    event.type === EventType.HELP_REQUEST ||
    (event.type === EventType.PET_HELP &&
      (event.subType === PetSubType.FEED || event.subType === PetSubType.WALK));
  const isMultiHelperType =
    event.type === EventType.PUBLIC_WELFARE ||
    event.type === EventType.LOST_FOUND ||
    (event.type === EventType.PET_HELP && event.subType === PetSubType.LOST);
  const isPublicFeedback = event.type === EventType.PUBLIC_FEEDBACK;

  return (
    <View className="event-detail">
      <NavBar title="互助详情" />
      <ScrollView scrollY className="event-detail__scroll">
        {/* M1: Hero card - tags + title + creator + key info */}
        <View className="event-detail__hero">
          {event.type === EventType.PET_HELP && event.subType && (
            <View className={`event-detail__hero-bg event-detail__hero-bg--pet-${event.subType}`} />
          )}
          {event.type === EventType.PET_HELP && event.subType === 'walk' && (
            <View className="event-detail__hero-emoji">
              <Icon name="paw" size={48} />
            </View>
          )}
          {event.type === EventType.PET_HELP && event.subType === 'feed' && (
            <View className="event-detail__hero-emoji">
              <Icon name="cat" size={48} />
            </View>
          )}
          {event.type === EventType.PET_HELP && event.subType === 'lost' && (
            <View className="event-detail__hero-emoji">
              <Icon name="paw" size={48} />
            </View>
          )}
          <View className="event-detail__hero-content">
            <View className="event-detail__hero-badge">
              <Text className="event-detail__hero-badge-text">{statusLabel}</Text>
            </View>
            <View className="event-detail__tags">
              <View
                className="event-detail__type-tag"
                style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
              >
                <Text className="event-detail__type-tag-text">
                  {event.type === EventType.PET_HELP && event.subType
                    ? (PET_SUBTYPE_LABELS[event.subType] ?? typeConfig.label)
                    : typeConfig.label}
                </Text>
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
            </View>

            {/* L1: Key info with semantic colors */}
            <View className="event-detail__key-info">
              {event.expectedTime && (
                <View className="event-detail__key-info-item event-detail__key-info-item--time">
                  <Icon name="clock" size={14} color="#3586FF" />
                  <Text className="event-detail__key-info-text">{event.expectedTime}</Text>
                </View>
              )}
              {event.locationText && (
                <View className="event-detail__key-info-item event-detail__key-info-item--location">
                  <Icon name="location" size={14} color="#5B9E6F" />
                  <Text className="event-detail__key-info-text">{event.locationText}</Text>
                </View>
              )}
              {event.rewardType && event.rewardType !== RewardType.NONE && (
                <View className="event-detail__key-info-item event-detail__key-info-item--reward">
                  <Icon name="gift" size={14} color="#C9702F" />
                  <Text className="event-detail__key-info-text">
                    {REWARD_TYPE_LABELS[event.rewardType] ?? event.rewardType}
                    {event.rewardType === RewardType.PAID && event.rewardAmount != null
                      ? ` ¥${event.rewardAmount}`
                      : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* L2: Description with expand/collapse */}
        <View className="event-detail__desc-wrap">
          <Text
            className={`event-detail__description ${!descExpanded ? 'event-detail__description--collapsed' : ''}`}
          >
            {event.description}
          </Text>
          {event.description.length > 100 && (
            <View
              className="event-detail__desc-toggle"
              onClick={() => setDescExpanded(!descExpanded)}
            >
              <Text className="event-detail__desc-toggle-text">
                {descExpanded ? '收起' : '展开全文'}
              </Text>
            </View>
          )}
        </View>

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

        <PetMeta event={event} />

        {/* L3: Stats - simplified */}
        <View className="event-detail__stats">
          <Text className="event-detail__stat">{event.viewCount} 浏览</Text>
          <Text className="event-detail__stat">{event.likeCount} 赞</Text>
          <Text className="event-detail__stat">{event.commentCount} 评论</Text>
          {event.thanksCount > 0 && (
            <Text className="event-detail__stat">{event.thanksCount} 感谢</Text>
          )}
        </View>

        <Participants
          applications={applications}
          event={event}
          isCreator={isCreator}
          isHelperType={isHelperType}
          isMultiHelperType={isMultiHelperType}
          submitting={submitting}
          onSelectHelper={handleSelectHelper}
          onSelectParticipant={handleSelectParticipant}
          onConfirmParticipant={handleConfirmParticipant}
          onThanks={handleThanks}
          onOpenHelperSheet={() => setHelperSheetVisible(true)}
          onStartRating={(userId) => {
            setRatingTargetUserId(userId);
            setRatingStars(0);
            setSelectedTags([]);
            setRatingContent('');
            setHasRated(false);
          }}
        />

        {/* M5: Matched skills for help_request */}
        {isHelperType && matchedSkills.length > 0 && (
          <View className="event-detail__section event-detail__matched-skills">
            <Text className="event-detail__section-title">
              <Icon name="search" size={16} /> 匹配的帮手
            </Text>
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

        <FeedbackTimeline isPublicFeedback={isPublicFeedback} feedbackLogs={feedbackLogs} />

        {/* M2: Comments - collapsed by default */}
        <View className="event-detail__section event-detail__comments">
          <Text className="event-detail__section-title">
            <Icon name="chat" size={16} /> 评论 ({event.commentCount})
          </Text>

          {comments.length === 0 && !commentsLoading && (
            <Text className="event-detail__comments-empty">还没有邻居留言，来说第一句吧</Text>
          )}

          {(commentsExpanded ? comments : comments.slice(0, 2)).map((c) => (
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
            <View
              className="event-detail__comments-more"
              onClick={() => {
                if (!commentsExpanded && comments.length > 2) {
                  setCommentsExpanded(true);
                } else {
                  loadMoreComments();
                }
              }}
            >
              <Text className="event-detail__comments-more-text">
                {!commentsExpanded && comments.length > 2
                  ? `展开全部 ${comments.length} 条评论`
                  : '加载更多'}
              </Text>
            </View>
          )}
        </View>

        <Lifecycle
          isCreator={isCreator}
          isHelper={isHelper}
          isMultiHelperType={isMultiHelperType}
          event={event}
          user={user}
          submitting={submitting}
          hasContacted={hasContacted}
          hasRated={hasRated}
          rateTargetUserId={rateTargetUserId}
          ratingStars={ratingStars}
          selectedTags={selectedTags}
          ratingContent={ratingContent}
          ratingSubmitting={ratingSubmitting}
          ratings={ratings}
          onContact={handleContact}
          onConfirmCompletion={handleConfirmCompletion}
          onRequestCompletion={handleRequestCompletion}
          onThanks={handleThanks}
          onRateHelper={handleRateHelper}
          onClose={handleClose}
          onReport={handleReport}
          onSetRatingStars={setRatingStars}
          onToggleTag={(tag) =>
            setSelectedTags((prev) =>
              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
            )
          }
          onSetRatingContent={setRatingContent}
        />

        <View className="event-detail__bottom-spacer" />
      </ScrollView>

      <HelperSelectionSheet
        visible={helperSheetVisible}
        onClose={() => setHelperSheetVisible(false)}
        applications={applications}
        onSelectHelper={handleSelectHelper}
      />

      <ContactInfoSheet
        visible={contactSheetVisible}
        onClose={() => setContactSheetVisible(false)}
        isCreator={isCreator}
        contactLoading={contactLoading}
        contactInfo={contactInfo}
        onCallPhone={handleCallPhone}
        onCopyWechat={handleCopyWechat}
      />

      <ActionBar
        liked={liked}
        favorited={favorited}
        interactionDisabled={interactionDisabled}
        isCreator={isCreator}
        event={event}
        submitting={submitting}
        typeConfig={typeConfig}
        onLike={handleLike}
        onComment={handleComment}
        onCta={handleCta}
        onFavorite={handleFavorite}
      />
    </View>
  );
}
