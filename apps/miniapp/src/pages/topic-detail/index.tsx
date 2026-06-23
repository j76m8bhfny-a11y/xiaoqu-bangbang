import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { topicService } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import Loading from '@/components/loading';
import EmptyState from '@/components/empty-state';
import type { TopicTimelineItem } from '@xiaoqu-bangbang/shared';
import './index.scss';

export default function TopicDetail() {
  useAuthGuard();
  const router = Taro.getCurrentInstance().router;
  const id = router?.params?.id ?? '';

  const { data: topic, refresh: refreshTopic } = useRequest(() => topicService.getById(id), [id], {
    enabled: !!id,
  });

  const {
    data: timeline,
    loading: timelineLoading,
    refresh: refreshTimeline,
  } = useRequest(() => topicService.timeline(id, 1, 20), [id], { enabled: !!id });

  const [commentInput, setCommentInput] = useState('');
  const [replyEventId, setReplyEventId] = useState<string | undefined>(undefined);

  const scope: 'open' | 'closed' = topic?.status === 'closed' ? 'closed' : 'open';
  const isClosed = scope === 'closed';

  const handleLike = async () => {
    if (!topic) return;
    try {
      await topicService.like(topic.id, scope);
      refreshTopic();
    } catch (e: any) {
      Taro.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
  };

  const handleDislike = async () => {
    if (!topic) return;
    try {
      await topicService.dislike(topic.id, scope);
      refreshTopic();
    } catch (e: any) {
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

  const handleAddEvent = () => {
    Taro.navigateTo({ url: `/pages/event-create/index?type=public_feedback&topicId=${id}` });
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || !topic) return;
    try {
      await topicService.createComment(topic.id, {
        eventId: replyEventId,
        content: commentInput.trim(),
      });
      setCommentInput('');
      setReplyEventId(undefined);
      refreshTimeline();
      refreshTopic();
    } catch (e: any) {
      Taro.showToast({ title: e.message || '发送失败', icon: 'none' });
    }
  };

  if (!topic) {
    return (
      <View className="topic-detail">
        <Loading />
      </View>
    );
  }

  const avg = topic.avgRating ?? 0;
  const items: TopicTimelineItem[] = timeline?.items ?? [];

  return (
    <View className="topic-detail">
      <View className="topic-detail__header">
        <Text className={`topic-detail__status ${isClosed ? 'topic-detail__status--closed' : ''}`}>
          {isClosed ? '已完结' : '进行中'}
        </Text>
        <View className="topic-detail__title">{topic.title}</View>
        {topic.description && <View className="topic-detail__desc">{topic.description}</View>}

        {isClosed && topic.closedSummary && (
          <View className="topic-detail__summary">
            <Text className="topic-detail__summary-label">📜 完结总结</Text>
            <View className="topic-detail__summary-text">{topic.closedSummary}</View>
          </View>
        )}

        {!isClosed ? (
          <View className="topic-detail__actions">
            <View className="topic-detail__action" onClick={handleLike}>
              👍 赞成 {topic.likeCount}
            </View>
            <View className="topic-detail__action" onClick={handleDislike}>
              👎 反对 {topic.dislikeCount}
            </View>
          </View>
        ) : (
          <View>
            <View className="topic-detail__stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <Text
                  key={n}
                  className={`topic-detail__star ${n <= Math.round(avg) ? 'topic-detail__star--active' : ''}`}
                  onClick={() => handleRate(n)}
                >
                  ★
                </Text>
              ))}
            </View>
            <View className="topic-detail__rating-info">
              {avg.toFixed(1)} / 5.0（{topic.ratingCount} 人评分）
            </View>
          </View>
        )}
      </View>

      <View className="topic-detail__section-title">📋 事件时间线（{topic.eventCount}）</View>

      <ScrollView scrollY style={{ paddingBottom: '80px' }}>
        {timelineLoading && <Loading />}
        {!timelineLoading && items.length === 0 && <EmptyState icon="📋" text="暂无相关事件" />}
        {items.map((it) => {
          const ev = it.data;
          return (
            <View key={ev.id} className="topic-detail__event">
              <View className="topic-detail__event-title">{ev.title}</View>
              {ev.description && <View className="topic-detail__event-desc">{ev.description}</View>}
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
              <View className="topic-detail__event-meta">
                {ev.isAnonymous ? '匿名' : ev.creator?.nickname} · 👍 {ev.likeCount} · 💬{' '}
                {ev.commentCount}
              </View>
              {ev.aiComment && (
                <View className="topic-detail__ai">
                  <View className="topic-detail__ai-label">🤖 AI 点评</View>
                  <View className="topic-detail__ai-text">{ev.aiComment}</View>
                </View>
              )}
              {ev.comments && ev.comments.length > 0 && (
                <View className="topic-detail__comments">
                  {ev.comments.slice(0, 3).map((c) => (
                    <View key={c.id} className="topic-detail__comment">
                      <View className="topic-detail__comment-author">{c.userNickname}</View>
                      <View className="topic-detail__comment-content">{c.content}</View>
                    </View>
                  ))}
                </View>
              )}
              <View
                className="topic-detail__action"
                style={{ marginTop: '8px' }}
                onClick={() => setReplyEventId(ev.id)}
              >
                💬 评论此事件
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View className="topic-detail__input-bar">
        {!isClosed && (
          <View
            className="topic-detail__send"
            style={{ background: '#f3f4f6', color: '#4b5563' }}
            onClick={handleAddEvent}
          >
            +事件
          </View>
        )}
        <Input
          className="topic-detail__input"
          placeholder={replyEventId ? '评论该事件...' : '议题评论...'}
          value={commentInput}
          onInput={(e) => setCommentInput(e.detail.value)}
        />
        <View className="topic-detail__send" onClick={handleSendComment}>
          发送
        </View>
      </View>
    </View>
  );
}
