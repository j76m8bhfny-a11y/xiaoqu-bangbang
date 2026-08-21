import { View, Text, ScrollView } from '@tarojs/components';
import { useEffect, useState, useRef } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { topicService, voteService, committeeService } from '@/services';
import { useAuthGuard } from '@/hooks';
import { useCommunityStore } from '@/store';
import Loading from '@/components/loading';
import EmptyState from '@/components/empty-state';
import AdPopup from '@/components/ad-popup';
import Icon from '@/components/icon';
import type { TopicDto, VoteDto, CommitteeAnnouncementDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

// 日期格式化：2026/1/15 -> 2026年1月15日
function formatCNDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// S1-6 plaza 改造：从「事件+闲置」混合广场重构为「公共反馈」中心。
// 入口分层：业委会卡片（公告/入口）→ 待投票 → 议题列表 → 发起议题 CTA。
// 闲置（market）下沉到 events tab；议题（topic）取代旧 event-type=public_feedback/discussion。

// 启动广告弹窗：按月持久化，每月最多弹一次
const AD_POPUP_KEY = () => {
  const d = new Date();
  return `ad_popup_ranking_${d.getFullYear()}-${d.getMonth() + 1}`;
};

export default function Plaza() {
  useAuthGuard();
  const communityId = useCommunityStore((s) => s.currentCommunityId);

  // 启动广告弹窗：当月未看过才弹
  const [adVisible, setAdVisible] = useState(false);
  useEffect(() => {
    const key = AD_POPUP_KEY();
    if (!Taro.getStorageSync(key)) {
      const timer = setTimeout(() => {
        setAdVisible(true);
        Taro.setStorageSync(key, true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [topicStatus, setTopicStatus] = useState<'open' | 'closed'>('open');
  const [loadingTopics, setLoadingTopics] = useState(false);
  // B2-b: tab 数量（分别缓存 open/closed 的总数）
  const [openCount, setOpenCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);

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
    // 并行拉当前 tab 议题 + 两个 tab 的数量
    const fetchTopics = topicService.list({ status: topicStatus, page: 1, pageSize: 30 });
    const fetchOpenCount = topicService.list({ status: 'open', page: 1, pageSize: 1 });
    const fetchClosedCount = topicService.list({ status: 'closed', page: 1, pageSize: 1 });
    Promise.all([fetchTopics, fetchOpenCount, fetchClosedCount])
      .then(([res, openRes, closedRes]) => {
        if (cancelled) return;
        setTopics(res.items ?? []);
        setOpenCount(openRes.total ?? openRes.items?.length ?? 0);
        setClosedCount(closedRes.total ?? closedRes.items?.length ?? 0);
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
        {/* 业委会通知 + 社群入口 左右排列 */}
        <View className="plaza__dual-card">
          <View className="plaza__card plaza__committee plaza__dual-item">
            <View className="plaza__card-header">
              <View className="plaza__card-title">
                <Icon name="megaphone" size={18} /> <Text>业委会</Text>
              </View>
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
                  {formatCNDate(latestAnnouncement.publishedAt)}
                </Text>
              </View>
            ) : (
              <Text className="plaza__empty-line">暂无公告</Text>
            )}
          </View>

          <View
            className="plaza__card plaza__committee plaza__dual-item"
            onClick={() => Taro.navigateTo({ url: '/pages/social-groups/index' })}
          >
            <View className="plaza__card-header">
              <View className="plaza__card-title">
                <Icon name="people" size={18} /> <Text>社群</Text>
              </View>
            </View>
            <View className="plaza__committee-item">
              <Text className="plaza__committee-title">邻里社群</Text>
              <Text className="plaza__committee-date">加入兴趣群组</Text>
            </View>
          </View>
        </View>

        {/* 议题区 */}
        <View className="plaza__topics-header">
          <View className="plaza__topic-tabs">
            {(['open', 'closed'] as const).map((s) => {
              const count = s === 'open' ? openCount : closedCount;
              return (
                <View
                  key={s}
                  className={`plaza__topic-tab ${topicStatus === s ? 'plaza__topic-tab--active' : ''}`}
                  onClick={() => setTopicStatus(s)}
                >
                  {s === 'open' ? '进行中' : '已完结'}
                  {count > 0 ? ` ${count}` : ''}
                </View>
              );
            })}
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
            icon="chat"
            text={topicStatus === 'open' ? '暂无进行中议题\n快去发起一个吧！' : '暂无已完结议题'}
          />
        )}
        {!loadingTopics &&
          topics.map((t) => {
            const isOpen = t.status === 'open';
            return (
              <View
                key={t.id}
                className={`plaza__topic-item ${isOpen ? 'plaza__topic-item--open' : 'plaza__topic-item--closed'}`}
                onClick={() => Taro.navigateTo({ url: `/pages/topic-detail/index?id=${t.id}` })}
              >
                {/* B1: 左侧状态色条 */}
                <View
                  className={`plaza__topic-bar ${isOpen ? 'plaza__topic-bar--open' : 'plaza__topic-bar--closed'}`}
                />

                {/* C1: F 型布局 - 左上标题 / 左下日期 / 右侧数据 */}
                <View className="plaza__topic-main">
                  <View className="plaza__topic-left">
                    <Text className="plaza__topic-title">{t.title}</Text>
                    <Text className="plaza__topic-date">{formatCNDate(t.createdAt)}</Text>
                  </View>

                  <View className="plaza__topic-right">
                    {isOpen ? (
                      <>
                        <View className="plaza__topic-metric">
                          <Icon name="thumbs-up" size={14} />
                          <Text>{t.likeCount}</Text>
                        </View>
                        <View className="plaza__topic-metric">
                          <Icon name="thumbs-down" size={14} />
                          <Text>{t.dislikeCount}</Text>
                        </View>
                      </>
                    ) : (
                      <View className="plaza__topic-metric plaza__topic-metric--rating">
                        <Text>{t.avgRating?.toFixed(1) ?? '-'}</Text>
                        <Text className="plaza__topic-metric-label">评分</Text>
                      </View>
                    )}
                    <View className="plaza__topic-metric">
                      <Icon name="chat" size={14} />
                      <Text>{t.commentCount}</Text>
                    </View>
                    {/* A1: eventCount>0 显示事件数，否则显示状态文案 */}
                    {t.eventCount > 0 ? (
                      <View className="plaza__topic-metric">
                        <Icon name="clipboard" size={14} />
                        <Text>{t.eventCount}</Text>
                      </View>
                    ) : (
                      <View className="plaza__topic-metric plaza__topic-metric--status">
                        <Text>{isOpen ? '待响应' : '已完成'}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

        <View className="plaza__bottom-spacer" />
      </ScrollView>
      <AdPopup visible={adVisible} onClose={() => setAdVisible(false)} />
    </View>
  );
}
