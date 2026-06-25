import { View, Text, ScrollView } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { topicService, voteService, committeeService } from '@/services';
import { useAuthGuard } from '@/hooks';
import { useCommunityStore } from '@/store';
import Loading from '@/components/loading';
import EmptyState from '@/components/empty-state';
import type { TopicDto, VoteDto, CommitteeAnnouncementDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

// S1-6 plaza 改造：从「事件+闲置」混合广场重构为「公共反馈」中心。
// 入口分层：业委会卡片（公告/入口）→ 待投票 → 议题列表 → 发起议题 CTA。
// 闲置（market）下沉到 events tab；议题（topic）取代旧 event-type=public_feedback/discussion。

export default function Plaza() {
  useAuthGuard();
  const communityId = useCommunityStore((s) => s.currentCommunityId);

  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [topicStatus, setTopicStatus] = useState<'open' | 'closed'>('open');
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [latestAnnouncement, setLatestAnnouncement] = useState<CommitteeAnnouncementDto | null>(
    null,
  );
  const [activeVotes, setActiveVotes] = useState<VoteDto[]>([]);

  // 顶部业委会公告 + 活跃投票（一次加载，不分页）
  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;
    (async () => {
      try {
        const [annRes, voteRes] = await Promise.all([
          committeeService
            .getAnnouncements()
            .catch(() => ({ items: [] as CommitteeAnnouncementDto[] })),
          voteService
            .list()
            .catch(() => ({ items: [] as VoteDto[], total: 0, page: 1, pageSize: 0 })),
        ]);
        if (cancelled) return;
        setLatestAnnouncement(annRes.items?.[0] ?? null);
        // ponytail: 取前 2 条活跃投票即可（status='active'）；更多走 /pages/votes
        setActiveVotes((voteRes.items ?? []).filter((v: any) => v.status === 'active').slice(0, 2));
      } catch (_) {
        // swallow，子卡片各自降级
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  // 议题列表
  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;
    setLoadingTopics(true);
    topicService
      .list({ status: topicStatus, page: 1, pageSize: 30 })
      .then((res) => {
        if (!cancelled) setTopics(res.items ?? []);
      })
      .catch((e: any) => {
        Taro.showToast({ title: e.message || '议题加载失败', icon: 'none' });
      })
      .finally(() => {
        if (!cancelled) setLoadingTopics(false);
      });
    return () => {
      cancelled = true;
    };
  }, [communityId, topicStatus]);

  return (
    <View className="plaza">
      <ScrollView scrollY className="plaza__scroll">
        {/* 业委会公告 */}
        <View className="plaza__card plaza__committee">
          <View className="plaza__card-header">
            <Text className="plaza__card-title">📢 业委会</Text>
            <Text
              className="plaza__card-more"
              onClick={() => Taro.navigateTo({ url: '/pages/committee/index' })}
            >
              进入 ›
            </Text>
          </View>
          {latestAnnouncement ? (
            <View
              className="plaza__committee-item"
              onClick={() =>
                Taro.navigateTo({
                  url: `/pages/committee-announcement/index?id=${latestAnnouncement.id}`,
                })
              }
            >
              <Text className="plaza__committee-title">{latestAnnouncement.title}</Text>
              <Text className="plaza__committee-date">
                {new Date(latestAnnouncement.publishedAt).toLocaleDateString()}
              </Text>
            </View>
          ) : (
            <Text className="plaza__empty-line">暂无公告</Text>
          )}
        </View>

        {/* 待投票 */}
        {activeVotes.length > 0 && (
          <View className="plaza__card">
            <View className="plaza__card-header">
              <Text className="plaza__card-title">🗳️ 进行中投票</Text>
              <Text
                className="plaza__card-more"
                onClick={() => Taro.navigateTo({ url: '/pages/votes/index' })}
              >
                查看全部 ›
              </Text>
            </View>
            {activeVotes.map((v) => (
              <View
                key={v.id}
                className="plaza__vote-item"
                onClick={() => Taro.navigateTo({ url: `/pages/vote-detail/index?id=${v.id}` })}
              >
                <Text className="plaza__vote-title">{v.title}</Text>
                <Text className="plaza__vote-meta">
                  截止 {new Date(v.endAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 议题区 */}
        <View className="plaza__topics-header">
          <View className="plaza__topic-tabs">
            {(['open', 'closed'] as const).map((s) => (
              <View
                key={s}
                className={`plaza__topic-tab ${topicStatus === s ? 'plaza__topic-tab--active' : ''}`}
                onClick={() => setTopicStatus(s)}
              >
                {s === 'open' ? '进行中' : '已完结'}
              </View>
            ))}
          </View>
          <View
            className="plaza__topic-create"
            onClick={() =>
              Taro.showToast({
                title: '发议题功能开发中',
                icon: 'none',
              })
            }
          >
            <Text className="plaza__topic-create-text">+ 发议题</Text>
          </View>
          {/* ponytail: 议题独立于 event 表，需要专门的 topic-create 页（CreateTopicRequest）；
                      Sprint 1 仅做浏览/互动，发起议题留待 Sprint 2 配套 topic-create 页一并实现。 */}
        </View>

        {loadingTopics && <Loading />}
        {!loadingTopics && topics.length === 0 && (
          <EmptyState
            icon="💬"
            text={topicStatus === 'open' ? '暂无进行中议题' : '暂无已完结议题'}
          />
        )}
        {!loadingTopics &&
          topics.map((t) => {
            const isOpen = t.status === 'open';
            return (
              <View
                key={t.id}
                className="plaza__topic-item"
                onClick={() => Taro.navigateTo({ url: `/pages/topic-detail/index?id=${t.id}` })}
              >
                <View className="plaza__topic-top">
                  <Text
                    className={`plaza__topic-status plaza__topic-status--${isOpen ? 'open' : 'closed'}`}
                  >
                    {isOpen ? '进行中' : '已完结'}
                  </Text>
                  <Text className="plaza__topic-title">{t.title}</Text>
                </View>
                <View className="plaza__topic-meta">
                  {isOpen ? (
                    <>
                      <Text>👍 {t.likeCount}</Text>
                      <Text>👎 {t.dislikeCount}</Text>
                    </>
                  ) : (
                    <Text>
                      ⭐ {t.avgRating?.toFixed(1) ?? '—'}（{t.ratingCount}）
                    </Text>
                  )}
                  <Text>💬 {t.commentCount}</Text>
                  <Text>📋 {t.eventCount}</Text>
                </View>
              </View>
            );
          })}

        <View className="plaza__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
