import { View, Text, ScrollView } from '@tarojs/components';
import { useEffect, useState, useRef } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { topicService, voteService, committeeService } from '@/services';
import { useAuthGuard } from '@/hooks';
import { useCommunityStore } from '@/store';
import Loading from '@/components/loading';
import EmptyState from '@/components/empty-state';
import BannerCarousel from '@/components/banner-carousel';
import type { TopicDto, VoteDto, CommitteeAnnouncementDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

// S1-6 plaza 改造：从「事件+闲置」混合广场重构为「公共反馈」中心。
// 入口分层：业委会卡片（公告/入口）→ 待投票 → 议题列表 → 发起议题 CTA。
// 闲置（market）下沉到 events tab；议题（topic）取代旧 event-type=public_feedback/discussion。

export default function Plaza() {
  useAuthGuard();
  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const communityName = useCommunityStore((s) => s.currentCommunityName);

  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [topicStatus, setTopicStatus] = useState<'open' | 'closed'>('open');
  const [loadingTopics, setLoadingTopics] = useState(false);

  // 发起议题 navigateBack 回本页后，用 didShow 兜底刷新议题列表。
  // 函数式 setState 触发下方议题 useEffect 重拉，跳过首次显示避免与 mount 重复。
  const [refreshTick, setRefreshTick] = useState(0);
  const firstShowRef = useRef(true);
  useDidShow(() => {
    if (firstShowRef.current) {
      firstShowRef.current = false;
      return;
    }
    setRefreshTick((t) => t + 1);
  });

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
        // ponytail: 取前 2 条进行中投票（status='published' 且未过期）；更多走 /pages/votes
        const now = Date.now();
        setActiveVotes(
          (voteRes.items ?? [])
            .filter((v: any) => v.status === 'published' && new Date(v.endAt).getTime() > now)
            .slice(0, 2),
        );
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
  }, [communityId, topicStatus, refreshTick]);

  return (
    <View className="plaza">
      <ScrollView scrollY className="plaza__scroll">
        {/* 小区标识条：一眼确认「这是我家小区」，点击可切换 */}
        <View
          className="plaza__community-bar"
          onClick={() => Taro.navigateTo({ url: '/pages/community-select/index' })}
        >
          <Text className="plaza__community-name">🏠 {communityName ?? '我的小区'}</Text>
          <Text className="plaza__community-switch">切换 ›</Text>
        </View>

        {/* ponytail: Banner 轮播先用默认数据，后续需接公开 banner API 获取 Admin 管理的 banner */}
        <BannerCarousel />

        {/* 业委会公告 */}
        <View className="plaza__card plaza__committee">
          <View className="plaza__card-header">
            <Text className="plaza__card-title">📢 业委会通知</Text>
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
                <View className="plaza__vote-detail">
                  <Text className="plaza__vote-title">{v.title}</Text>
                  <Text className="plaza__vote-meta">
                    截止 {new Date(v.endAt).toLocaleDateString()}
                  </Text>
                </View>
                <View className="plaza__vote-btn">
                  <Text className="plaza__vote-btn-text">去投票</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 社群入口 */}
        <View
          className="plaza__card plaza__social-entry"
          onClick={() => Taro.navigateTo({ url: '/pages/social-groups/index' })}
        >
          <View className="plaza__card-header">
            <Text className="plaza__card-title">👥 社群</Text>
            <Text className="plaza__card-more">进入 ›</Text>
          </View>
        </View>

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
            onClick={() => Taro.navigateTo({ url: '/pages/topic-create/index' })}
          >
            <Text className="plaza__topic-create-text">+ 发议题</Text>
          </View>
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
                      <Text className="plaza__topic-metric">👍 赞 {t.likeCount}</Text>
                      <Text className="plaza__topic-metric">👎 踩 {t.dislikeCount}</Text>
                    </>
                  ) : (
                    <Text className="plaza__topic-metric">
                      ⭐ 评分 {t.avgRating?.toFixed(1) ?? '—'}（{t.ratingCount}人）
                    </Text>
                  )}
                  <Text className="plaza__topic-metric">💬 评论 {t.commentCount}</Text>
                  <Text className="plaza__topic-metric">📋 事件 {t.eventCount}</Text>
                </View>
              </View>
            );
          })}

        <View className="plaza__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
