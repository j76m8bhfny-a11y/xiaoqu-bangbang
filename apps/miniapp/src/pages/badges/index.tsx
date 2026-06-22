import { View, Text, ScrollView } from '@tarojs/components';
import { rankingService } from '@/services';
import { useRequest } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import './index.scss';

export default function Badges() {
  const {
    data: badgesData,
    loading: badgesLoading,
    error: badgesError,
    refresh: refreshBadges,
  } = useRequest(
    () => rankingService.getBadges(),
    []
  );

  const {
    data: myBadgesData,
    loading: myBadgesLoading,
    error: myBadgesError,
    refresh: refreshMyBadges,
  } = useRequest(
    () => rankingService.getMyBadges(),
    []
  );

  const loading = badgesLoading || myBadgesLoading;
  const error = badgesError ?? myBadgesError;

  const allBadges = badgesData?.items ?? [];
  const myBadgeIds = new Set((myBadgesData?.items ?? []).map((b) => b.id));
  const earnedCount = allBadges.filter((b) => myBadgeIds.has(b.id)).length;

  if (loading) {
    return <Loading text='加载勋章...' />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={() => { refreshBadges(); refreshMyBadges(); }} />;
  }

  return (
    <View className='badges'>
      <View className='badges__stats'>
        <Text className='badges__stats-text'>
          已获得 {earnedCount}/{allBadges.length} 枚勋章
        </Text>
      </View>

      <ScrollView scrollY className='badges__content'>
        <View className='badges__grid'>
          {allBadges.map((badge) => {
            const earned = myBadgeIds.has(badge.id);
            return (
              <View
                key={badge.id}
                className={`badges__card ${earned ? 'badges__card--earned' : 'badges__card--locked'}`}
              >
                <Text className='badges__card-icon'>{badge.icon}</Text>
                <Text className='badges__card-name'>{badge.name}</Text>
                <Text className='badges__card-desc'>{badge.description}</Text>
                {earned ? (
                  <Text className='badges__card-badge badges__card-badge--earned'>已获得</Text>
                ) : (
                  <Text className='badges__card-badge badges__card-badge--locked'>🔒</Text>
                )}
              </View>
            );
          })}
        </View>
        <View className='badges__bottom-spacer' />
      </ScrollView>
    </View>
  );
}
