import { View, Text, Input, Image } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { topicService, eventService } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import EmptyState from '@/components/empty-state';
import type { TopicTimelineItem, TopicCommentDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

// emoji 常量：避免 TS 解析器对 JSX 内 emoji 的编码问题
const ICON_THUMB_UP = '\u{1f44d}';
const ICON_THUMB_DOWN = '\u{1f44e}';
const ICON_HEART = '\u{1f90d}';
const ICON_HEART_FILLED = '\u{2764}\u{fe0f}';
const ICON_PLUS = '\uff0b';

export default function TopicDetail() {
  useAuthGuard();
  const router = Taro.getCurrentInstance().router;
  const id = router?.params?.id ?? '';

  const {
    data: topic,
    error: topicError,
    refresh: refreshTopic,
  } = useRequest(() => topicService.getById(id), [id], { enabled: !!id });

  const {
    data: timeline,
    loading: timelineLoading,
    error: timelineError,
    refresh: refreshTimeline,
  } = useRequest(() => topicService.timeline(id, 1, 20), [id], { enabled: !!id });

  const {
    data: commentsData,
    loading: commentsLoading,
    error: commentsError,
    refresh: refreshComments,
  } = useRequest(() => topicService.comments(id, { sort: 'new', page: 1, pageSize: 50 }), [id], {
    enabled: !!id,
  });

  const [tab, setTab] = useState<'events' | 'discuss'>('events');
  const [commentInput, setCommentInput] = useState('');
  // 本地跟踪用户投票态（赞/反对），用于图标高亮 + 乐观更新
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  // 事件点赞本地态：eventId -> liked
  const [eventLiked, setEventLiked] = useState<Record<string, boolean>>({});

  const scope: 'open' | 'closed' = topic?.status === 'closed' ? 'closed' : 'open';
  const isClosed = scope === 'closed';

  const handleVote = async (type: 'like' | 'dislike') => {
    if (!topic || isClosed) return;
    // 重复点同一项 → 取消
    const togglingOff = userVote === type;
    setUserVote(togglingOff ? null : type);
    try {
      if (togglingOff) {
        await topicService.unlike(topic.id, scope);
      } else if (type === 'like') {
        await topicService.like(topic.id, scope);
      } else {
        await topicService.dislike(topic.id, scope);
      }
      refreshTopic();
    } catch (e: any) {
      // 失败回滚
      setUserVote(userVote);
      Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
  };

  const handleRate = async (rating: number) => {
    if (!topic) return;
    try {
      await topicService.rate(topic.id, rating);
      refreshTopic();
      Taro.showToast({ title: '评分成功', icon: 'success' });
    } catch (e: any) {
      Taro.showToast({ title: e.message || '评分失败', icon: 'none' });
    }
  };

  // FAB 弹窗引导：说明后再跳转新建事件页
  const handleFabAddEvent = async () => {
    if (!topic || isClosed) return;
    const res = await Taro.showModal({
      title: '新建相关事件',
      content: '把这个议题里的具体问题或进展建成一个事件，方便大家一起跟进、点赞和评论。',
      confirmText: '去新建',
      cancelText: '取消',
    } as any);
    if (!res.confirm) return;
    Taro.navigateTo({ url: `/pages/event-create/index?type=public_feedback&topicId=${id}` });
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || !topic) return;
    try {
      await topicService.createComment(topic.id, { content: commentInput.trim() });
      setCommentInput('');
      refreshComments();
      refreshTopic();
    } catch (e: any) {
      Taro.showToast({ title: e.message || '发送失败', icon: 'none' });
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await topicService.likeComment(commentId);
      refreshComments();
    } catch (e: any) {
      Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
  };

  // 事件点赞：乐观更新本地态，调事件 like 接口
  const handleLikeEvent = async (eventId: string) => {
    const liked = !!eventLiked[eventId];
    setEventLiked((m) => ({ ...m, [eventId]: !liked }));
    try {
      // 议题下的事件仍走事件 like 接口
      await eventService.toggleLike(eventId);
      refreshTimeline();
    } catch (e: any) {
      setEventLiked((m) => ({ ...m, [eventId]: liked }));
      Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
  };

  // ── 加载/错误态 ──────────────────────────────────
  if (topicError && !topic) {
    return (
      <View className="topic-detail">
        <View className="topic-detail__error">
          <Text className="topic-detail__error-text">加载失败</Text>
          <Text className="topic-detail__error-hint">{topicError.message}</Text>
          <View className="topic-detail__error-retry" onClick={() => refreshTopic()}>
            <Text className="topic-detail__error-retry-text">重试</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!topic) {
    return (
      <View className="topic-detail">
        <View className="topic-detail__content">
          <View className="topic-detail__header">
            <View className="topic-detail__skeleton-line topic-detail__skeleton-line--sm" />
            <View className="topic-detail__skeleton-line topic-detail__skeleton-line--lg" />
            <View className="topic-detail__skeleton-line topic-detail__skeleton-line--md" />
          </View>
        </View>
      </View>
    );
  }

  const avg = topic.avgRating ?? 0;
  const items: TopicTimelineItem[] = timeline?.items ?? [];
  const topicComments: TopicCommentDto[] = commentsData?.items ?? [];

  // 预计算 className，避免 JSX 模板字面量内嵌套三元
  const likeBtnCls = `topic-detail__vote-btn${userVote === 'like' ? ' topic-detail__vote-btn--active' : ''}`;
  const dislikeBtnCls = `topic-detail__vote-btn${userVote === 'dislike' ? ' topic-detail__vote-btn--dislike-active' : ''}`;
  const eventsTabCls = `topic-detail__tab${tab === 'events' ? ' topic-detail__tab--active' : ''}`;
  const discussTabCls = `topic-detail__tab${tab === 'discuss' ? ' topic-detail__tab--active' : ''}`;
  const statusCls = `topic-detail__status${isClosed ? ' topic-detail__status--closed' : ''}`;

  return (
    <View className="topic-detail">
      {/* 页面级滚动：sticky Tab 在原生 scroll-view 内不可靠，改用页面滚动 */}
      <View className="topic-detail__content">
        {/* 议题头部：标题左 + 投票图标右，舒展留白 */}
        <View className="topic-detail__header">
          <View className="topic-detail__header-top">
            <View className="topic-detail__header-left">
              <Text className={statusCls}>{isClosed ? '已完结' : '进行中'}</Text>
              <View className="topic-detail__title">{topic.title}</View>
            </View>

            {/* 右侧投票图标组：点击高亮 */}
            {!isClosed ? (
              <View className="topic-detail__vote-group">
                <View className={likeBtnCls} onClick={() => handleVote('like')}>
                  <Text className="topic-detail__vote-icon">{ICON_THUMB_UP}</Text>
                  <Text className="topic-detail__vote-count">{topic.likeCount}</Text>
                </View>
                <View className={dislikeBtnCls} onClick={() => handleVote('dislike')}>
                  <Text className="topic-detail__vote-icon">{ICON_THUMB_DOWN}</Text>
                  <Text className="topic-detail__vote-count">{topic.dislikeCount}</Text>
                </View>
              </View>
            ) : (
              <View className="topic-detail__rating-block">
                <View className="topic-detail__stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Text
                      key={n}
                      className={
                        n <= Math.round(avg)
                          ? 'topic-detail__star topic-detail__star--active'
                          : 'topic-detail__star'
                      }
                      onClick={() => handleRate(n)}
                    >
                      {'\u2605'}
                    </Text>
                  ))}
                </View>
                <Text className="topic-detail__rating-info">
                  {avg.toFixed(1)}（{topic.ratingCount}人）
                </Text>
              </View>
            )}
          </View>

          {topic.description && <View className="topic-detail__desc">{topic.description}</View>}

          {isClosed && topic.closedSummary && (
            <View className="topic-detail__summary">
              <Text className="topic-detail__summary-label">{'\u{1f4dc}'} 完结总结</Text>
              <View className="topic-detail__summary-text">{topic.closedSummary}</View>
            </View>
          )}
        </View>

        {/* Tab 切换：下划线式 + 粘性吸顶 */}
        <View className="topic-detail__tabs">
          <View className={eventsTabCls} onClick={() => setTab('events')}>
            <Text className="topic-detail__tab-text">相关事件 {topic.eventCount}</Text>
          </View>
          <View className={discussTabCls} onClick={() => setTab('discuss')}>
            <Text className="topic-detail__tab-text">议题讨论 {topicComments.length}</Text>
          </View>
        </View>

        <View className="topic-detail__pane">
          {tab === 'events' ? (
            <>
              {/* 骨架屏 */}
              {timelineLoading && items.length === 0 && (
                <>
                  {[0, 1].map((i) => (
                    <View key={i} className="topic-detail__event topic-detail__skeleton-card">
                      <View className="topic-detail__skeleton-line topic-detail__skeleton-line--lg" />
                      <View className="topic-detail__skeleton-line topic-detail__skeleton-line--md" />
                      <View className="topic-detail__skeleton-line topic-detail__skeleton-line--full" />
                    </View>
                  ))}
                </>
              )}
              {/* 错误重试 */}
              {timelineError && items.length === 0 && (
                <View className="topic-detail__error topic-detail__error--inline">
                  <Text className="topic-detail__error-text">事件加载失败</Text>
                  <View className="topic-detail__error-retry" onClick={() => refreshTimeline()}>
                    <Text className="topic-detail__error-retry-text">重试</Text>
                  </View>
                </View>
              )}
              {!timelineLoading && !timelineError && items.length === 0 && (
                <EmptyState icon="📋" text="还没有相关事件\n点右下角 ＋ 新建一个" />
              )}
              {items.map((it) => {
                const ev = it.data;
                const liked = !!eventLiked[ev.id];
                return (
                  <View key={ev.id} className="topic-detail__event">
                    {/* 事件标题左 + 交互右 */}
                    <View className="topic-detail__event-top">
                      <View className="topic-detail__event-title-wrap">
                        <Text className="topic-detail__event-title">{ev.title}</Text>
                        <Text className="topic-detail__event-meta-text">
                          {ev.isAnonymous ? '匿名' : ev.creator?.nickname || '邻居'}
                          {'\u00b7'} {ev.commentCount}评论
                        </Text>
                      </View>
                      <View
                        className={
                          liked
                            ? 'topic-detail__event-like topic-detail__event-like--active'
                            : 'topic-detail__event-like'
                        }
                        onClick={() => handleLikeEvent(ev.id)}
                      >
                        <Text className="topic-detail__event-like-icon">
                          {liked ? ICON_HEART_FILLED : ICON_HEART}
                        </Text>
                        <Text className="topic-detail__event-like-count">{ev.likeCount}</Text>
                      </View>
                    </View>

                    {ev.description && (
                      <View className="topic-detail__event-desc">{ev.description}</View>
                    )}
                    {ev.images && ev.images.length > 0 && (
                      <View className="topic-detail__event-images">
                        {ev.images.slice(0, 3).map((src, i) => (
                          <Image
                            key={i}
                            className="topic-detail__event-image"
                            src={src}
                            mode="aspectFill"
                          />
                        ))}
                      </View>
                    )}

                    {ev.aiComment && (
                      <View className="topic-detail__ai">
                        <View className="topic-detail__ai-label">{'\u{1f916}'} AI 点评</View>
                        <View className="topic-detail__ai-text">{ev.aiComment}</View>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          ) : (
            <>
              {/* 骨架屏 */}
              {commentsLoading && topicComments.length === 0 && (
                <>
                  {[0, 1].map((i) => (
                    <View
                      key={i}
                      className="topic-detail__discuss-item topic-detail__skeleton-card"
                    >
                      <View className="topic-detail__skeleton-avatar" />
                      <View className="topic-detail__skeleton-lines">
                        <View className="topic-detail__skeleton-line topic-detail__skeleton-line--sm" />
                        <View className="topic-detail__skeleton-line topic-detail__skeleton-line--full" />
                      </View>
                    </View>
                  ))}
                </>
              )}
              {/* 错误重试 */}
              {commentsError && topicComments.length === 0 && (
                <View className="topic-detail__error topic-detail__error--inline">
                  <Text className="topic-detail__error-text">评论加载失败</Text>
                  <View className="topic-detail__error-retry" onClick={() => refreshComments()}>
                    <Text className="topic-detail__error-retry-text">重试</Text>
                  </View>
                </View>
              )}
              {!commentsLoading && !commentsError && topicComments.length === 0 && (
                <EmptyState icon="💬" text="还没有讨论\n来说说你的看法吧" />
              )}
              {topicComments.map((c) => (
                <View key={c.id} className="topic-detail__discuss-item">
                  <View className="topic-detail__discuss-avatar">
                    {c.userAvatarUrl ? (
                      <Image
                        className="topic-detail__discuss-avatar-img"
                        src={c.userAvatarUrl}
                        mode="aspectFill"
                      />
                    ) : (
                      <Text className="topic-detail__discuss-avatar-text">
                        {c.userNickname?.slice(0, 1) || '邻'}
                      </Text>
                    )}
                  </View>
                  <View className="topic-detail__discuss-body">
                    <View className="topic-detail__discuss-author">{c.userNickname}</View>
                    <View className="topic-detail__discuss-content">{c.content}</View>
                    <View
                      className="topic-detail__discuss-like"
                      onClick={() => handleLikeComment(c.id)}
                    >
                      <Text className="topic-detail__discuss-like-text">
                        {'\u{1f44d}'} {c.likeCount}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </View>

      {/* FAB：右下角圆形加号，仅相关事件 Tab + 未关闭时显示 */}
      {tab === 'events' && !isClosed && (
        <View className="topic-detail__fab" onClick={handleFabAddEvent}>
          <Text className="topic-detail__fab-icon">{ICON_PLUS}</Text>
        </View>
      )}

      {/* 底部输入栏：仅议题讨论 Tab */}
      {tab === 'discuss' && !isClosed && (
        <View className="topic-detail__input-bar">
          <Input
            className="topic-detail__input"
            placeholder="发表你对本议题的看法…"
            value={commentInput}
            onInput={(e) => setCommentInput(e.detail.value)}
          />
          <View className="topic-detail__send" onClick={handleSendComment}>
            <Text className="topic-detail__send-text">发送</Text>
          </View>
        </View>
      )}
    </View>
  );
}
