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

function formatCNDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const AD_POPUP_KEY = () => {
  const d = new Date();
  return `ad_popup_ranking_${d.getFullYear()}-${d.getMonth() + 1}`;
};

export default function Plaza() {
  useAuthGuard();
  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const communityName = useCommunityStore((s) => s.currentCommunityName) || '我的小区';

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
  const [openCount, setOpenCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);

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
            .list({ status: 'published', page: 1, pageSize: 5 })
            .catch(() => ({ items: [] as VoteDto[] })),
        ]);
        if (cancelled) return;
        setLatestAnnouncement(annRes.items[0] || null);
        setActiveVotes(voteRes.items || []);
      } catch {
        // fail silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communityId, refreshTick]);

  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;
    setLoadingTopics(true);
    const fetchTopics = topicService.list({ status: topicStatus, page: 1, pageSize: 30 });
    const fetchOpenCount = topicService.list({ status: 'open', page: 1, pageSize: 1 });
    const fetchClosedCount = topicService.list({ status: 'closed', page: 1, pageSize: 1 });

    Promise.all([fetchTopics, fetchOpenCount, fetchClosedCount])
      .then(([res, openRes, closedRes]) => {
        if (cancelled) return;
        setTopics(res.items || []);
        setOpenCount(openRes.total ?? 0);
        setClosedCount(closedRes.total ?? 0);
      })
      .catch((err: any) => {
        if (cancelled) return;
        Taro.showToast({ title: err.message || '加载议题失败', icon: 'none' });
      })
      .finally(() => {
        if (!cancelled) setLoadingTopics(false);
      });

    return () => {
      cancelled = true;
    };
  }, [communityId, topicStatus, refreshTick]);

  let statusBarHeight = 20;
  try {
    const sys = Taro.getSystemInfoSync();
    if (sys.statusBarHeight) statusBarHeight = sys.statusBarHeight;
  } catch {
    // fallback
  }

  return (
    <View className="plaza">
      <ScrollView className="plaza__scroll" scrollY>
        {/* 顶部暖橙渐变 Header */}
        <View className="plaza__header" style={{ paddingTop: `${statusBarHeight}px` }}>
          <View className="plaza__header-top">
            <View className="plaza__header-title-box">
              <Icon name="megaphone" size={24} color="#FFFFFF" />
              <Text className="plaza__header-title">小区事</Text>
            </View>
            <View
              className="plaza__community-pill"
              onClick={() => Taro.navigateTo({ url: '/pages/community-select/index' })}
            >
              <Icon name="community" size={14} color="#FFFFFF" />
              <Text className="plaza__community-name">{communityName}</Text>
              <Icon name="comm-arrow" size={12} color="#FFFFFF" />
            </View>
          </View>

          {/* Tab 胶囊切换 */}
          <View className="plaza__header-tabs">
            {(['open', 'closed'] as const).map((s) => {
              const isActive = topicStatus === s;
              const count = s === 'open' ? openCount : closedCount;
              return (
                <View
                  key={s}
                  className={`plaza__header-tab ${isActive ? 'plaza__header-tab--active' : ''}`}
                  onClick={() => setTopicStatus(s)}
                >
                  <Text className="plaza__header-tab-text">
                    {s === 'open' ? '进行中议题' : '已完结议题'}
                    {count > 0 ? ` (${count})` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 待投票区 */}
        {activeVotes.length > 0 && (
          <View className="plaza__section">
            <View
              className="plaza__card plaza__vote-card"
              onClick={() =>
                Taro.navigateTo({ url: `/pages/vote-detail/index?id=${activeVotes[0].id}` })
              }
            >
              <View className="plaza__card-header">
                <View className="plaza__card-title">
                  <Icon name="vote" size={18} color="#E89B6C" />
                  <Text>待参与投票</Text>
                </View>
                <Text className="plaza__card-more">去投票 &gt;</Text>
              </View>
              <Text className="plaza__vote-title">{activeVotes[0].title}</Text>
            </View>
          </View>
        )}

        {/* 业委会通知 & 社群入口 */}
        <View className="plaza__dual-card">
          <View
            className="plaza__card plaza__committee plaza__dual-item"
            onClick={() => Taro.navigateTo({ url: '/pages/committee/index' })}
          >
            <View className="plaza__card-header">
              <View className="plaza__card-title">
                <Icon name="building" size={18} color="#5B9E6F" />
                <Text>业委会</Text>
              </View>
              <Text className="plaza__card-more">&gt;</Text>
            </View>
            {latestAnnouncement ? (
              <View className="plaza__committee-item">
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
                <Icon name="people" size={18} color="#5B9E6F" />
                <Text>邻里社群</Text>
              </View>
              <Text className="plaza__card-more">&gt;</Text>
            </View>
            <View className="plaza__committee-item">
              <Text className="plaza__committee-title">兴趣社群</Text>
              <Text className="plaza__committee-date">加入业主微信群</Text>
            </View>
          </View>
        </View>

        {/* 议题列表区 */}
        <View className="plaza__topics-section">
          <View className="plaza__topics-action-row">
            <Text className="plaza__topics-label">
              {topicStatus === 'open' ? '居民反馈与讨论' : '历史完结与总结'}
            </Text>
            <View
              className="plaza__topic-create-btn"
              onClick={() => Taro.navigateTo({ url: '/pages/topic-create/index' })}
            >
              <Icon name="plus" size={14} color="#FFFFFF" />
              <Text className="plaza__topic-create-text">发起议题</Text>
            </View>
          </View>

          {loadingTopics && <Loading />}
          {!loadingTopics && topics.length === 0 && (
            <EmptyState
              icon="chat"
              text={
                topicStatus === 'open' ? '暂无进行中议题\n快来发起第一个吧！' : '暂无已完结议题'
              }
            />
          )}

          {!loadingTopics &&
            topics.map((t) => {
              const isOpen = t.status === 'open';
              return (
                <View
                  key={t.id}
                  className="plaza__topic-card"
                  onClick={() => Taro.navigateTo({ url: `/pages/topic-detail/index?id=${t.id}` })}
                >
                  <View className="plaza__topic-top">
                    <Text className="plaza__topic-title">{t.title}</Text>
                    <Text className="plaza__topic-date">{formatCNDate(t.createdAt)}</Text>
                  </View>

                  <View className="plaza__topic-pills">
                    {isOpen ? (
                      <>
                        <View className="plaza__pill plaza__pill--like">
                          <Icon name="thumbs-up" size={13} color="#5B9E6F" />
                          <Text>{t.likeCount}</Text>
                        </View>
                        <View className="plaza__pill">
                          <Icon name="thumbs-down" size={13} color="#6B7A6E" />
                          <Text>{t.dislikeCount}</Text>
                        </View>
                      </>
                    ) : (
                      <View className="plaza__pill plaza__pill--rating">
                        <Icon name="star" size={13} color="#E89B6C" />
                        <Text>{t.avgRating?.toFixed(1) ?? '5.0'}分</Text>
                      </View>
                    )}

                    <View className="plaza__pill">
                      <Icon name="chat" size={13} color="#6B7A6E" />
                      <Text>{t.commentCount}</Text>
                    </View>

                    {t.eventCount > 0 ? (
                      <View className="plaza__pill plaza__pill--event">
                        <Icon name="clipboard" size={13} color="#4A8C5E" />
                        <Text>{t.eventCount}个互助</Text>
                      </View>
                    ) : (
                      <View className="plaza__pill">
                        <Text>{isOpen ? '讨论中' : '已完结'}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
        </View>

        <View className="plaza__bottom-spacer" />
      </ScrollView>
      <AdPopup visible={adVisible} onClose={() => setAdVisible(false)} />
    </View>
  );
}
