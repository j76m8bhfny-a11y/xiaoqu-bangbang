import { View, Text, ScrollView, Image } from '@tarojs/components';
import { useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useAuthStore, useCommunityStore, useNotificationStore } from '@/store';
import { rankingService } from '@/services';
import { useRequest } from '@/hooks';
import Icon, { type IconName } from '@/components/icon';
import './index.scss';

interface MenuItem {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
}

interface MenuGroup {
  title: string;
  collapsable?: boolean;
  items: MenuItem[];
}

interface ActivityItem {
  id: string;
  title: string;
  icon: IconName;
  page: string;
}

const MY_ACTIVITIES: ActivityItem[] = [
  { id: 'a1', title: '我发布的求助', icon: 'help', page: '/pages/events/index?tab=my_help' },
  { id: 'a2', title: '我参与的互助', icon: 'handshake', page: '/pages/events/index?tab=my_join' },
  { id: 'a3', title: '我的闲置', icon: 'box', page: '/pages/market/index?tab=my' },
  { id: 'a4', title: '我的公益', icon: 'sun', page: '/pages/events/index?tab=my_welfare' },
];

const MENU_GROUPS: MenuGroup[] = [
  {
    title: '我的荣誉',
    items: [
      { id: 'verify', label: '业主认证', icon: 'check-circle' },
      { id: 'my_badges', label: '我的勋章', icon: 'medal' },
      { id: 'my_rank', label: '我的排名', icon: 'chart' },
    ],
  },
  {
    title: '小区管理',
    items: [
      { id: 'community_apply', label: '申请开通小区', icon: 'community' },
      { id: 'invite', label: '邀请邻居', icon: 'envelope' },
    ],
  },
  {
    title: '通知与服务',
    items: [
      { id: 'notifications', label: '消息通知', icon: 'bell' },
      { id: 'feedback_history', label: '反馈记录', icon: 'memo' },
      { id: 'my_services', label: '我的服务', icon: 'wrench' },
    ],
  },
  {
    title: '更多',
    collapsable: true,
    items: [
      { id: 'settings', label: '设置', icon: 'gear' },
      { id: 'about', label: '关于我们', icon: 'bulb' },
    ],
  },
];

const MENU_ROUTES: Record<string, string> = {
  verify: '/pages/verify/index',
  my_badges: '/pages/badges/index',
  my_rank: '/pages/ranking/index',
  my_services: '/pages/service-providers/index',
  notifications: '/pages/notifications/index',
  feedback_history: '/pages/events/index?tab=my_feedback',
  settings: '/pages/settings/index',
  community_apply: '/pages/community-apply/index',
};

export default function Mine() {
  const user = useAuthStore((s) => s.user);
  const communityName = useCommunityStore((s) => s.currentCommunityName);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [moreExpanded, setMoreExpanded] = useState(false);

  const { data: myRanking } = useRequest(() => rankingService.getMyRanking(), [], {
    enabled: !!user,
  });

  useShareAppMessage(() => ({
    title: communityName ? `${communityName}的邻居都在用「左邻右帮」` : '邻里互助，从左邻右帮开始',
    path: '/pages/home/index',
  }));

  const nickname = user?.nickname ?? '邻居';
  const isVerified = user?.verifyStatus === 'verified';
  const verifyIcon: IconName = isVerified ? 'check-circle' : 'lock';
  const verifyLabel = isVerified ? '业主' : '去认证';
  const verifyClass = isVerified ? 'mine__user-tag--verified' : 'mine__user-tag--unverified';

  const helpCount = myRanking?.helpCount ?? 0;

  const stats: { label: string; value: number; icon: IconName }[] = [
    { label: '帮助次数', value: helpCount, icon: 'hands-up' },
    { label: '小红花', value: myRanking?.flowerCount ?? 0, icon: 'flower' },
    { label: '勋章', value: myRanking?.badgeCount ?? 0, icon: 'medal' },
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.id === 'invite') {
      Taro.showModal({
        title: '邀请邻居',
        content: '点击右上角"···"，选择"转发"，把左邻右帮分享给邻居吧～',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    if (item.id === 'about') {
      Taro.showModal({
        title: '左邻右帮',
        content: '邻里互助，共建美好社区\n版本：1.0.0',
        showCancel: false,
      });
      return;
    }
    if (item.id === 'settings') {
      Taro.navigateTo({ url: '/pages/settings/index' });
      return;
    }
    const route = MENU_ROUTES[item.id];
    if (route) {
      Taro.navigateTo({ url: route });
    }
  };

  const handleActivityClick = (act: (typeof MY_ACTIVITIES)[number]) => {
    Taro.navigateTo({ url: act.page });
  };

  const handleVerifyTagClick = () => {
    if (!isVerified) {
      Taro.navigateTo({ url: '/pages/verify/index' });
    }
  };

  return (
    <View className="mine">
      {/* User Card */}
      <View
        className="mine__user-card"
        onClick={() => Taro.navigateTo({ url: '/pages/profile-edit/index' })}
      >
        <View className="mine__user-bg" />
        <View className="mine__user-info">
          <View className="mine__avatar">
            {user?.avatarUrl ? (
              <Image className="mine__avatar-img" src={user.avatarUrl} mode="aspectFill" />
            ) : (
              <Text className="mine__avatar-text">{nickname.slice(0, 1)}</Text>
            )}
          </View>
          <View className="mine__user-detail">
            <Text className="mine__user-name">{nickname}</Text>
            <View className="mine__user-tags">
              <View
                className={`mine__user-tag ${verifyClass}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVerifyTagClick();
                }}
              >
                <Icon name={verifyIcon} size={14} />
                <Text className="mine__user-tag-text">{verifyLabel}</Text>
              </View>
              {communityName && (
                <View className="mine__user-tag mine__user-tag--community">
                  <Icon name="house" size={14} />
                  <Text className="mine__user-tag-text">{communityName}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View className="mine__stats">
        {stats.map((stat) => (
          <View key={stat.label} className="mine__stat">
            <View className="mine__stat-icon">
              <Icon name={stat.icon} size={20} />
            </View>
            <Text className="mine__stat-value">{stat.value}</Text>
            <Text className="mine__stat-label">{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Greeting */}
      <View className="mine__greeting">
        <Text className="mine__greeting-text">
          {helpCount > 0 ? `本月你帮助了${helpCount}位邻居` : '还没有帮助过邻居，去邻里帮看看？'}
        </Text>
      </View>

      <ScrollView scrollY className="mine__content">
        {/* Activities */}
        <View className="mine__activities">
          <View className="mine__section-title">
            <Text className="mine__section-title-text">我的动态</Text>
          </View>
          <View className="mine__activity-grid">
            {MY_ACTIVITIES.map((act) => (
              <View
                key={act.id}
                className="mine__activity-item"
                onClick={() => handleActivityClick(act)}
              >
                <View className="mine__activity-icon-wrap">
                  <View className="mine__activity-icon">
                    <Icon name={act.icon} size={24} />
                  </View>
                </View>
                <Text className="mine__activity-label">{act.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu Groups */}
        {MENU_GROUPS.map((group, gi) => {
          const isCollapsed = group.collapsable && !moreExpanded;
          return (
            <View key={gi} className="mine__menu-group">
              <View
                className="mine__group-header"
                onClick={() => group.collapsable && setMoreExpanded(!moreExpanded)}
              >
                <Text className="mine__group-title">{group.title}</Text>
                {group.collapsable && (
                  <Text
                    className={`mine__group-arrow ${moreExpanded ? 'mine__group-arrow--expanded' : ''}`}
                  >
                    ›
                  </Text>
                )}
              </View>
              {!isCollapsed &&
                group.items.map((item) => {
                  const count = item.id === 'notifications' ? unreadCount : item.count;
                  return (
                    <View
                      key={item.id}
                      className="mine__menu-item"
                      onClick={() => handleMenuClick(item)}
                    >
                      <View className="mine__menu-left">
                        <View className="mine__menu-icon">
                          <Icon name={item.icon} size={22} />
                        </View>
                        <Text className="mine__menu-label">{item.label}</Text>
                      </View>
                      <View className="mine__menu-right">
                        {count !== undefined && count > 0 && (
                          <View className="mine__menu-badge">
                            <Text className="mine__menu-badge-text">{count}</Text>
                          </View>
                        )}
                        <Text className="mine__menu-arrow">›</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          );
        })}

        <View className="mine__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
