import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useMemo } from 'react';
import Taro, { switchTab } from '@tarojs/taro';
import { useCommunityStore } from '@/store';
import { rankingService } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import type { RankingItemDto, MyRankingDto } from '@xiaoqu-bangbang/shared';
import { PeriodType } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon, { emojiToIconName, type IconName } from '@/components/icon';

const PERIOD_TABS = [
  { key: PeriodType.MONTH, label: '本月' },
  { key: PeriodType.TOTAL, label: '总榜' },
];

const BADGE_ICON_MAP: Record<string, IconName> = {
  helper_1: 'handshake',
  helper_5: 'handshake',
  helper_20: 'trophy',
  feedback_5: 'megaphone',
  feedback_20: 'megaphone',
  topic_1: 'chat',
  topic_5: 'chat',
  guide_1: 'books',
  guide_5: 'books',
  guide_20: 'books',
  flower_10: 'flower',
  flower_50: 'flower',
  first_owner_top30: 'house',
  founder: 'community',
  seed: 'leaf',
  helpful_neighbor: 'handshake',
  mutual_aid_star: 'star',
  community_guardian: 'ribbon',
};

const BADGE_SEED_NAME: Record<string, string> = {
  helper_1: '初来乍到',
  helper_5: '热心邻居',
  helper_20: '互助达人',
  feedback_5: '议事参与者',
  feedback_20: '议事达人',
  topic_1: '议题提出者',
  topic_5: '议题达人',
  guide_1: '教程分享者',
  guide_5: '教程达人',
  guide_20: '教程专家',
  flower_10: '花开满园',
  flower_50: '花团锦簇',
  first_owner_top30: '先锋业主',
  founder: '小区创始人',
  seed: '种子贡献者',
  helpful_neighbor: '热心邻居',
  mutual_aid_star: '互助之星',
  community_guardian: '社区守护者',
};

const BADGE_DISPLAY_NAME: Record<string, string> = {
  helper_1: '破冰邻里',
  helper_5: '热心邻居',
  helper_20: '互助达人',
  feedback_5: '议事参与者',
  feedback_20: '议事达人',
  topic_1: '议题提出者',
  topic_5: '议题达人',
  guide_1: '知识播种者',
  guide_5: '教程达人',
  guide_20: '教程专家',
  flower_10: '花开满园',
  flower_50: '花团锦簇',
  first_owner_top30: '先锋业主',
  founder: '小区创始人',
  seed: '种子贡献者',
  helpful_neighbor: '热心邻居',
  mutual_aid_star: '互助之星',
  community_guardian: '社区守护者',
};

interface BadgeProgress {
  type: 'help' | 'flower' | 'topic' | 'feedback' | 'guide' | 'other';
  threshold: number;
}
function parseBadgeProgress(code: string): BadgeProgress | null {
  const m = code.match(/^(helper|flower|topic|feedback|guide)_(\d+)$/);
  if (!m) return null;
  const [, type, num] = m;
  return { type: type as BadgeProgress['type'], threshold: parseInt(num, 10) };
}

function getBadgeProgressText(code: string, myRank: MyRankingDto | null): string | null {
  const p = parseBadgeProgress(code);
  if (!p || !myRank) return null;
  let current: number;
  let unit: string;
  switch (p.type) {
    case 'help':
      current = myRank.helpCount;
      unit = '次互助';
      break;
    case 'flower':
      current = myRank.flowerCount;
      unit = '朵小花';
      break;
    default:
      return null;
  }
  if (current >= p.threshold) return null;
  return `已${current}${unit}｜目标${p.threshold}${unit}`;
}

function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

interface BadgeItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  iconMapped: IconName;
  displayName: string;
  description: string;
  earned: boolean;
  progressText: string | null;
}

export default function Ranking() {
  useAuthGuard();

  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const [activePeriod, setActivePeriod] = useState<PeriodType>(PeriodType.MONTH);
  const [activeTab, setActiveTab] = useState<'ranking' | 'badges'>('ranking');

  const {
    data: rankingData,
    loading: rankingLoading,
    error: rankingError,
    refresh: refreshRanking,
  } = useRequest(
    () => rankingService.list({ periodType: activePeriod, pageSize: 20 }),
    [communityId, activePeriod],
    { enabled: activeTab === 'ranking' && !!communityId },
  );

  const { data: myRanking } = useRequest(
    () => rankingService.getMyRanking({ periodType: activePeriod }),
    [communityId, activePeriod],
    { enabled: activeTab === 'ranking' && !!communityId },
  );

  const {
    data: badgesData,
    loading: badgesLoading,
    error: badgesError,
    refresh: refreshBadges,
  } = useRequest(() => rankingService.getBadges(), [], { enabled: activeTab === 'badges' });

  const { data: myBadgesData } = useRequest(() => rankingService.getMyBadges(), [], {
    enabled: activeTab === 'badges',
  });

  const { data: myRankForBadges } = useRequest(
    () => rankingService.getMyRanking({ periodType: PeriodType.TOTAL }),
    [communityId],
    { enabled: activeTab === 'badges' && !!communityId },
  );

  const rankingItems: RankingItemDto[] = rankingData?.items ?? [];
  const top3 = rankingItems.slice(0, 3);
  const restList = rankingItems.slice(3);
  const myRank: MyRankingDto | null = myRanking ?? null;

  const gapToPrev = useMemo(() => {
    if (!myRank || !myRank.rankNo || myRank.rankNo <= 1) return null;
    const prevRank = rankingItems.find((r) => r.rankNo === myRank.rankNo! - 1);
    if (!prevRank) return null;
    return prevRank.flowerCount - myRank.flowerCount;
  }, [myRank, rankingItems]);

  const progressPercent = useMemo(() => {
    if (!myRank || top3.length === 0) return 0;
    const topFlowers = top3[0].flowerCount || 1;
    return Math.min(100, Math.round((myRank.flowerCount / topFlowers) * 100));
  }, [myRank, top3]);

  const myBadgeIds = new Set((myBadgesData?.items ?? []).map((b) => b.id));
  const myRankForProgress: MyRankingDto | null = myRankForBadges ?? null;
  const mergedBadges: BadgeItem[] = (badgesData?.items ?? []).map((b) => {
    const code = Object.entries(BADGE_SEED_NAME).find(([, v]) => v === b.name)?.[0] ?? '';
    const earned = myBadgeIds.has(b.id);
    return {
      id: b.id,
      name: b.name,
      code,
      icon: b.icon,
      iconMapped: BADGE_ICON_MAP[code] ?? emojiToIconName(b.icon),
      displayName: BADGE_DISPLAY_NAME[code] ?? b.name,
      description: b.description,
      earned,
      progressText: earned ? null : getBadgeProgressText(code, myRankForProgress),
    };
  });

  const earnedBadges = mergedBadges.filter((b) => b.earned);
  const nextBadge = mergedBadges.find((b) => !b.earned && b.progressText);
  const earnedCount = earnedBadges.length;
  const totalCount = mergedBadges.length;

  let statusBarHeight = 20;
  try {
    const sys = Taro.getWindowInfo();
    if (sys.statusBarHeight) statusBarHeight = sys.statusBarHeight;
  } catch {
    // fallback
  }

  return (
    <View className="ranking">
      <View className="ranking__header" style={{ paddingTop: `${statusBarHeight}px` }}>
        <View className="ranking__header-row">
          <View className="ranking__header-title">
            <Icon name="trophy" size={22} /> <Text>好人榜</Text>
          </View>
          <Text className="ranking__header-sub">1朵小花 = 1次有效互助</Text>
        </View>
        <View className="ranking__outer-tabs">
          <View
            className={`ranking__outer-tab ${activeTab === 'ranking' ? 'ranking__outer-tab--active' : ''}`}
            onClick={() => setActiveTab('ranking')}
          >
            <Text className="ranking__outer-tab-text">排行榜</Text>
          </View>
          <View
            className={`ranking__outer-tab ${activeTab === 'badges' ? 'ranking__outer-tab--active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            <Text className="ranking__outer-tab-text">勋章墙</Text>
          </View>
        </View>
      </View>

      {activeTab === 'ranking' ? (
        <ScrollView scrollY className="ranking__content">
          <View className="ranking__period">
            {PERIOD_TABS.map((tab) => (
              <View
                key={tab.key}
                className={`ranking__period-item ${activePeriod === tab.key ? 'ranking__period-item--active' : ''}`}
                onClick={() => setActivePeriod(tab.key)}
              >
                <Text
                  className={`ranking__period-text ${activePeriod === tab.key ? 'ranking__period-text--active' : ''}`}
                >
                  {tab.label}
                </Text>
              </View>
            ))}
          </View>

          {rankingLoading ? (
            <Loading text="加载排行榜..." />
          ) : rankingError ? (
            <ErrorState message={rankingError.message} onRetry={refreshRanking} />
          ) : (
            <>
              {top3.length >= 3 && (
                <View className="ranking__podium">
                  <View className="ranking__podium-item ranking__podium-item--second">
                    <View className="ranking__podium-avatar-wrap">
                      <View className="ranking__podium-crown">
                        <Icon name="silver" size={24} />
                      </View>
                      <View className="ranking__podium-avatar ranking__podium-avatar--second">
                        <Text className="ranking__podium-avatar-text">
                          {top3[1].nickname.slice(0, 1)}
                        </Text>
                      </View>
                    </View>
                    <Text className="ranking__podium-name">{top3[1].nickname}</Text>
                    <View className="ranking__podium-flowers">
                      <Icon name="flower" size={16} color="#C9702F" />{' '}
                      <Text>{top3[1].flowerCount}</Text>
                    </View>
                    <View className="ranking__podium-bar ranking__podium-bar--second">
                      <Text>2</Text>
                    </View>
                  </View>

                  <View className="ranking__podium-item ranking__podium-item--first">
                    <View className="ranking__podium-avatar-wrap">
                      <View className="ranking__podium-crown ranking__podium-crown--first">
                        <Icon name="crown" size={28} color="#C9702F" />
                      </View>
                      <View className="ranking__podium-avatar ranking__podium-avatar--first">
                        <Text className="ranking__podium-avatar-text">
                          {top3[0].nickname.slice(0, 1)}
                        </Text>
                      </View>
                    </View>
                    <Text className="ranking__podium-name">{top3[0].nickname}</Text>
                    <View className="ranking__podium-flowers">
                      <Icon name="flower" size={16} color="#C9702F" />{' '}
                      <Text>{top3[0].flowerCount}</Text>
                    </View>
                    <View className="ranking__podium-bar ranking__podium-bar--first">
                      <Text>1</Text>
                    </View>
                  </View>

                  <View className="ranking__podium-item ranking__podium-item--third">
                    <View className="ranking__podium-avatar-wrap">
                      <View className="ranking__podium-crown">
                        <Icon name="bronze" size={24} />
                      </View>
                      <View className="ranking__podium-avatar ranking__podium-avatar--third">
                        <Text className="ranking__podium-avatar-text">
                          {top3[2].nickname.slice(0, 1)}
                        </Text>
                      </View>
                    </View>
                    <Text className="ranking__podium-name">{top3[2].nickname}</Text>
                    <View className="ranking__podium-flowers">
                      <Icon name="flower" size={16} color="#C9702F" />{' '}
                      <Text>{top3[2].flowerCount}</Text>
                    </View>
                    <View className="ranking__podium-bar ranking__podium-bar--third">
                      <Text>3</Text>
                    </View>
                  </View>
                </View>
              )}

              <View className="ranking__list">
                {restList.map((user) => (
                  <View key={user.userId} className="ranking__list-item">
                    <Text className="ranking__list-rank">{user.rankNo}</Text>
                    <View className="ranking__list-avatar">
                      <Text className="ranking__list-avatar-text">{user.nickname.slice(0, 1)}</Text>
                    </View>
                    <View className="ranking__list-info">
                      <Text className="ranking__list-name">{user.nickname}</Text>
                      <Text className="ranking__list-help">帮助了{user.helpCount}位邻居</Text>
                    </View>
                    <View className="ranking__list-flowers">
                      <View className="ranking__list-flower-count">
                        <Icon name="flower" size={14} color="#C9702F" />{' '}
                        <Text>{user.flowerCount}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {myRank && (
                <View className="ranking__my-rank">
                  <View className="ranking__my-rank-top">
                    <View className="ranking__my-rank-avatar">
                      <Text className="ranking__list-avatar-text">我</Text>
                    </View>
                    <View className="ranking__list-info">
                      <Text className="ranking__list-name">我</Text>
                      <Text className="ranking__list-help">帮助了{myRank.helpCount}位邻居</Text>
                    </View>
                    <Text className="ranking__my-rank-pos">第{myRank.rankNo ?? '--'}名</Text>
                    <View className="ranking__list-flower-count">
                      <Icon name="flower" size={14} color="#C9702F" />{' '}
                      <Text>{myRank.flowerCount}</Text>
                    </View>
                  </View>
                  {gapToPrev !== null && gapToPrev > 0 && (
                    <View className="ranking__my-rank-gap">
                      <Icon name="flower" size={12} color="#C9702F" />
                      <Text className="ranking__my-rank-gap-text">距上一名还差 {gapToPrev} 朵</Text>
                    </View>
                  )}
                  {top3.length > 0 && myRank.flowerCount > 0 && (
                    <View className="ranking__my-rank-progress">
                      <View
                        className="ranking__my-rank-progress-bar"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </View>
                  )}
                  {activePeriod === PeriodType.MONTH && (
                    <Text className="ranking__my-rank-countdown">
                      本月还剩 {daysLeftInMonth()} 天
                    </Text>
                  )}
                </View>
              )}

              <View className="ranking__cta">
                <View
                  className="ranking__cta-btn"
                  onClick={() => switchTab({ url: '/pages/events/index' })}
                >
                  <Icon name="bulb" size={16} color="#fff" />
                  <Text className="ranking__cta-btn-text">今天还能帮谁？</Text>
                </View>
              </View>
            </>
          )}

          <View className="ranking__bottom-spacer" />
        </ScrollView>
      ) : (
        <ScrollView scrollY className="ranking__content">
          {badgesLoading ? (
            <Loading text="加载勋章..." />
          ) : badgesError ? (
            <ErrorState message={badgesError.message} onRetry={refreshBadges} />
          ) : (
            <>
              <View className="ranking__badge-overview">
                <View className="ranking__badge-overview-row">
                  <Icon name="trophy" size={20} color="#C9702F" />
                  <Text className="ranking__badge-overview-text">
                    已获得 {earnedCount} 枚勋章{totalCount > 0 ? `／共 ${totalCount} 枚` : ''}
                  </Text>
                </View>
                {nextBadge && (
                  <View className="ranking__badge-overview-next">
                    <Icon name="flag" size={16} color="#C9702F" />
                    <Text className="ranking__badge-overview-next-text">
                      下一枚目标：「{nextBadge.displayName}」
                      {nextBadge.progressText ? `｜${nextBadge.progressText}` : ''}
                    </Text>
                  </View>
                )}
              </View>

              <View className="ranking__badges-grid">
                {mergedBadges.map((badge) => (
                  <View
                    key={badge.id}
                    className={`ranking__badge-card ${badge.earned ? 'ranking__badge-card--earned' : ''}`}
                  >
                    <View
                      className={`ranking__badge-icon-wrap ${badge.earned ? '' : 'ranking__badge-icon-wrap--locked'}`}
                    >
                      <View className="ranking__badge-icon">
                        <Icon name={badge.iconMapped} size={28} />
                      </View>
                    </View>
                    <Text className="ranking__badge-name">{badge.displayName}</Text>
                    <Text className="ranking__badge-desc">{badge.description}</Text>
                    {!badge.earned && badge.progressText && (
                      <Text className="ranking__badge-progress">{badge.progressText}</Text>
                    )}
                    {badge.earned ? (
                      <View className="ranking__badge-status ranking__badge-status--earned">
                        <Icon name="check-circle" size={16} color="#3E7A54" />
                        <Text className="ranking__badge-status-text">已获得</Text>
                      </View>
                    ) : (
                      <View className="ranking__badge-status ranking__badge-status--locked">
                        <Text className="ranking__badge-status-text ranking__badge-status-text--locked">
                          {badge.progressText ? '继续努力' : '未解锁'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
          <View className="ranking__bottom-spacer" />
        </ScrollView>
      )}
    </View>
  );
}
