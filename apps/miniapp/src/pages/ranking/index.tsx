import { View, Text, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import { useCommunityStore } from '@/store';
import { rankingService } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import type { RankingItemDto, MyRankingDto } from '@xiaoqu-bangbang/shared';
import { PeriodType } from '@xiaoqu-bangbang/shared';
import './index.scss';

const PERIOD_TABS = [
  { key: PeriodType.MONTH, label: '本月' },
  { key: PeriodType.TOTAL, label: '总榜' },
];

interface BadgeItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
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
    () => rankingService.list({ communityId: communityId!, periodType: activePeriod, pageSize: 20 }),
    [communityId, activePeriod],
    { enabled: activeTab === 'ranking' && !!communityId }
  );

  const {
    data: myRanking,
  } = useRequest(
    () => rankingService.getMyRanking({ periodType: activePeriod }),
    [communityId, activePeriod],
    { enabled: activeTab === 'ranking' && !!communityId }
  );

  const {
    data: badgesData,
    loading: badgesLoading,
    error: badgesError,
    refresh: refreshBadges,
  } = useRequest(
    () => rankingService.getBadges(),
    [],
    { enabled: activeTab === 'badges' }
  );

  const {
    data: myBadgesData,
  } = useRequest(
    () => rankingService.getMyBadges(),
    [],
    { enabled: activeTab === 'badges' }
  );

  const rankingItems: RankingItemDto[] = rankingData?.items ?? [];
  const top3 = rankingItems.slice(0, 3);
  const restList = rankingItems.slice(3);
  const myRank: MyRankingDto | null = myRanking ?? null;

  const myBadgeIds = new Set((myBadgesData?.items ?? []).map((b) => b.id));
  const mergedBadges: BadgeItem[] = (badgesData?.items ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    description: b.description,
    earned: myBadgeIds.has(b.id),
  }));

  return (
    <View className='ranking'>
      <View className='ranking__header'>
        <Text className='ranking__header-title'>🏆 好人榜</Text>
        <Text className='ranking__header-sub'>每一朵小花，都是一份温暖</Text>
      </View>

      {/* Tab切换 */}
      <View className='ranking__tabs'>
        <View
          className={`ranking__tab ${activeTab === 'ranking' ? 'ranking__tab--active' : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          <Text className={`ranking__tab-text ${activeTab === 'ranking' ? 'ranking__tab-text--active' : ''}`}>
            排行榜
          </Text>
        </View>
        <View
          className={`ranking__tab ${activeTab === 'badges' ? 'ranking__tab--active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          <Text className={`ranking__tab-text ${activeTab === 'badges' ? 'ranking__tab-text--active' : ''}`}>
            勋章墙
          </Text>
        </View>
      </View>

      {activeTab === 'ranking' ? (
        <ScrollView scrollY className='ranking__content'>
          {/* 周期切换 */}
          <View className='ranking__period'>
            {PERIOD_TABS.map((tab) => (
              <View
                key={tab.key}
                className={`ranking__period-item ${activePeriod === tab.key ? 'ranking__period-item--active' : ''}`}
                onClick={() => setActivePeriod(tab.key)}
              >
                <Text className={`ranking__period-text ${activePeriod === tab.key ? 'ranking__period-text--active' : ''}`}>
                  {tab.label}
                </Text>
              </View>
            ))}
          </View>

          {rankingLoading ? (
            <Loading text='加载排行榜...' />
          ) : rankingError ? (
            <ErrorState message={rankingError.message} onRetry={refreshRanking} />
          ) : (
            <>
              {/* Top3 领奖台 */}
              {top3.length >= 3 && (
                <View className='ranking__podium'>
                  {/* 第2名 */}
                  <View className='ranking__podium-item ranking__podium-item--second'>
                    <View className='ranking__podium-avatar-wrap'>
                      <Text className='ranking__podium-crown'>🥈</Text>
                      <View className='ranking__podium-avatar ranking__podium-avatar--second'>
                        <Text className='ranking__podium-avatar-text'>{top3[1].nickname.slice(0, 1)}</Text>
                      </View>
                    </View>
                    <Text className='ranking__podium-name'>{top3[1].nickname}</Text>
                    <Text className='ranking__podium-flowers'>🌸 {top3[1].flowerCount}</Text>
                    <View className='ranking__podium-bar ranking__podium-bar--second' />
                  </View>

                  {/* 第1名 */}
                  <View className='ranking__podium-item ranking__podium-item--first'>
                    <View className='ranking__podium-avatar-wrap'>
                      <Text className='ranking__podium-crown ranking__podium-crown--first'>👑</Text>
                      <View className='ranking__podium-avatar ranking__podium-avatar--first'>
                        <Text className='ranking__podium-avatar-text'>{top3[0].nickname.slice(0, 1)}</Text>
                      </View>
                    </View>
                    <Text className='ranking__podium-name'>{top3[0].nickname}</Text>
                    <Text className='ranking__podium-flowers'>🌸 {top3[0].flowerCount}</Text>
                    <View className='ranking__podium-bar ranking__podium-bar--first' />
                  </View>

                  {/* 第3名 */}
                  <View className='ranking__podium-item ranking__podium-item--third'>
                    <View className='ranking__podium-avatar-wrap'>
                      <Text className='ranking__podium-crown'>🥉</Text>
                      <View className='ranking__podium-avatar ranking__podium-avatar--third'>
                        <Text className='ranking__podium-avatar-text'>{top3[2].nickname.slice(0, 1)}</Text>
                      </View>
                    </View>
                    <Text className='ranking__podium-name'>{top3[2].nickname}</Text>
                    <Text className='ranking__podium-flowers'>🌸 {top3[2].flowerCount}</Text>
                    <View className='ranking__podium-bar ranking__podium-bar--third' />
                  </View>
                </View>
              )}

              {/* 排名列表 */}
              <View className='ranking__list'>
                {restList.map((user) => (
                  <View key={user.userId} className='ranking__list-item'>
                    <Text className='ranking__list-rank'>{user.rankNo}</Text>
                    <View className='ranking__list-avatar'>
                      <Text className='ranking__list-avatar-text'>{user.nickname.slice(0, 1)}</Text>
                    </View>
                    <View className='ranking__list-info'>
                      <Text className='ranking__list-name'>{user.nickname}</Text>
                      <Text className='ranking__list-help'>帮助了{user.helpCount}位邻居</Text>
                    </View>
                    <View className='ranking__list-flowers'>
                      <Text className='ranking__list-flower-count'>🌸 {user.flowerCount}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* 我的排名 */}
              {myRank && (
                <View className='ranking__my-rank'>
                  <View className='ranking__list-avatar'>
                    <Text className='ranking__list-avatar-text'>我</Text>
                  </View>
                  <View className='ranking__list-info'>
                    <Text className='ranking__list-name'>我</Text>
                    <Text className='ranking__list-help'>帮助了{myRank.helpCount}位邻居</Text>
                  </View>
                  <Text className='ranking__my-rank-pos'>第{myRank.rankNo ?? '--'}名</Text>
                  <Text className='ranking__list-flower-count'>🌸 {myRank.flowerCount}</Text>
                </View>
              )}
            </>
          )}

          <View className='ranking__bottom-spacer' />
        </ScrollView>
      ) : (
        <ScrollView scrollY className='ranking__content'>
          {badgesLoading ? (
            <Loading text='加载勋章...' />
          ) : badgesError ? (
            <ErrorState message={badgesError.message} onRetry={refreshBadges} />
          ) : (
            <View className='ranking__badges-grid'>
              {mergedBadges.map((badge) => (
                <View key={badge.id} className={`ranking__badge-card ${badge.earned ? 'ranking__badge-card--earned' : ''}`}>
                  <View className={`ranking__badge-icon-wrap ${badge.earned ? '' : 'ranking__badge-icon-wrap--locked'}`}>
                    <Text className='ranking__badge-icon'>{badge.icon}</Text>
                  </View>
                  <Text className='ranking__badge-name'>{badge.name}</Text>
                  <Text className='ranking__badge-desc'>{badge.description}</Text>
                  {badge.earned ? (
                    <View className='ranking__badge-status ranking__badge-status--earned'>
                      <Text className='ranking__badge-status-text'>已获得</Text>
                    </View>
                  ) : (
                    <View className='ranking__badge-status ranking__badge-status--locked'>
                      <Text className='ranking__badge-status-text ranking__badge-status-text--locked'>未解锁</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
          <View className='ranking__bottom-spacer' />
        </ScrollView>
      )}
    </View>
  );
}
