import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import { userService } from '@/services';
import { useAuthStore } from '@/store';
import Loading from '@/components/loading';
import EmptyState from '@/components/empty-state';
import type { UserProfileDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

export default function UserProfile() {
  const userId = Taro.getCurrentInstance().router?.params?.id;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    userService
      .getProfile(userId)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <View className="up">
        <Loading />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View className="up">
        <EmptyState icon="👤" text="用户不存在或已注销" />
      </View>
    );
  }

  const initial = profile.nickname?.slice(0, 1) || '邻';
  const isMe = currentUserId === profile.id;

  return (
    <ScrollView scrollY className="up">
      <View className="up__hero">
        <View className="up__avatar">
          {profile.avatarUrl ? (
            <Image className="up__avatar-img" src={profile.avatarUrl} mode="aspectFill" />
          ) : (
            <Text className="up__avatar-text">{initial}</Text>
          )}
        </View>
        <Text className="up__nickname">{profile.nickname}</Text>
        <View className="up__tags">
          {profile.verifyStatus && (
            <View
              className={`up__tag ${profile.verifyStatus === 'verified' ? 'up__tag--verified' : 'up__tag--unverified'}`}
            >
              <Text className="up__tag-text">
                {profile.verifyStatus === 'verified' ? '✅ 已认证业主' : '⏳ 未认证'}
              </Text>
            </View>
          )}
          {profile.communityName && (
            <View className="up__tag up__tag--community">
              <Text className="up__tag-text">🏠 {profile.communityName}</Text>
            </View>
          )}
        </View>
        {profile.bio && <Text className="up__bio">{profile.bio}</Text>}
        {isMe && (
          <View
            className="up__edit"
            onClick={() => Taro.navigateTo({ url: '/pages/profile-edit/index' })}
          >
            <Text className="up__edit-text">编辑资料</Text>
          </View>
        )}
      </View>

      <View className="up__stats">
        <View className="up__stat">
          <Text className="up__stat-icon">🤲</Text>
          <Text className="up__stat-value">{profile.helpCount}</Text>
          <Text className="up__stat-label">帮助次数</Text>
        </View>
        <View className="up__stat">
          <Text className="up__stat-icon">🌸</Text>
          <Text className="up__stat-value">{profile.flowerCount}</Text>
          <Text className="up__stat-label">小红花</Text>
        </View>
        <View className="up__stat">
          <Text className="up__stat-icon">🏅</Text>
          <Text className="up__stat-value">{profile.badgeCount}</Text>
          <Text className="up__stat-label">勋章</Text>
        </View>
        <View className="up__stat">
          <Text className="up__stat-icon">📊</Text>
          <Text className="up__stat-value">{profile.contributionScore}</Text>
          <Text className="up__stat-label">贡献分</Text>
        </View>
      </View>

      <View className="up__section">
        <Text className="up__section-title">🏅 最近徽章</Text>
        {profile.badges.length === 0 ? (
          <View className="up__empty">
            <Text className="up__empty-text">暂无徽章</Text>
          </View>
        ) : (
          <View className="up__badges">
            {profile.badges.map((b) => (
              <View key={b.id} className="up__badge">
                {b.iconUrl ? (
                  <Image className="up__badge-icon" src={b.iconUrl} mode="aspectFit" />
                ) : (
                  <Text className="up__badge-emoji">🏅</Text>
                )}
                <Text className="up__badge-name">{b.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="up__footer-tip">
        <Text className="up__footer-tip-text">
          数据按你当前所在小区展示 · 加入于 {profile.joinedAt.slice(0, 10)}
        </Text>
      </View>
    </ScrollView>
  );
}
