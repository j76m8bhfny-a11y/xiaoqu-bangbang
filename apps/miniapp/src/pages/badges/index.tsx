import { View, Text, ScrollView, Image } from '@tarojs/components';
import { rankingService } from '@/services';
import { useRequest } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import NavBar from '@/components/navbar';
import Icon, { emojiToIconName } from '@/components/icon';
import { getBadgeImage } from '@/utils/badge-images';
import './index.scss';

export default function Badges() {
  const {
    data: badgesData,
    loading: badgesLoading,
    error: badgesError,
    refresh: refreshBadges,
  } = useRequest(() => rankingService.getBadges(), []);

  const {
    data: myBadgesData,
    loading: myBadgesLoading,
    error: myBadgesError,
    refresh: refreshMyBadges,
  } = useRequest(() => rankingService.getMyBadges(), []);

  const loading = badgesLoading || myBadgesLoading;
  const error = badgesError ?? myBadgesError;

  const allBadges = badgesData?.items ?? [];
  const myBadgeIds = new Set((myBadgesData?.items ?? []).map((b) => b.id));
  const earnedCount = allBadges.filter((b) => myBadgeIds.has(b.id)).length;

  if (loading) {
    return (
      <View className="badges">
        <NavBar title="勋章墙" />
        <Loading text="加载勋章..." />
      </View>
    );
  }

  if (error) {
    return (
      <View className="badges">
        <NavBar title="勋章墙" />
        <ErrorState
          message={error.message}
          onRetry={() => {
            refreshBadges();
            refreshMyBadges();
          }}
        />
      </View>
    );
  }

  return (
    <View className="badges">
      <NavBar title="勋章墙" />

      <View className="badges__stats">
        <Icon name="medal" size={24} color="#C9702F" />
        <Text className="badges__stats-text">
          已获得 {earnedCount}/{allBadges.length} 枚荣誉勋章
        </Text>
      </View>

      <ScrollView scrollY className="badges__content">
        <View className="badges__grid">
          {allBadges.map((badge) => {
            const earned = myBadgeIds.has(badge.id);
            const iconName = emojiToIconName(badge.icon, 'medal');
            const img = getBadgeImage(badge.code);
            return (
              <View
                key={badge.id}
                className={`badges__card ${earned ? 'badges__card--earned' : 'badges__card--locked'}`}
              >
                <View className="badges__card-icon-box">
                  {img ? (
                    <Image className="badge-item__image" src={img} mode="aspectFit" />
                  ) : (
                    <Icon name={iconName} size={36} color={earned ? '#C9702F' : '#6B7A6E'} />
                  )}
                </View>
                <Text className="badges__card-name">{badge.name}</Text>
                <Text className="badges__card-desc">{badge.description}</Text>
                {earned ? (
                  <Text className="badges__card-badge badges__card-badge--earned">已点亮</Text>
                ) : (
                  <View className="badges__card-badge badges__card-badge--locked">
                    <Icon name="lock" size={16} color="#6B7A6E" />
                    <Text style={{ fontSize: '11px', color: '#6B7A6E', marginLeft: '2px' }}>
                      未获得
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View className="badges__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
