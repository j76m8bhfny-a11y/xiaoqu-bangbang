import { View, Text, ScrollView, Image, Button } from '@tarojs/components';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { useAuthStore, useCommunityStore } from '@/store';
import { authService, rankingService } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import Onboarding, { shouldShowOnboarding } from '@/components/onboarding';
import './index.scss';

// home 即「我的」：用户卡片 + dashboard 概览 + 2 个发布入口 + 我的动态 + 设置菜单。
// 内容沿用 pages/mine 的视觉骨架，再叠加 /me/dashboard 的活跃数据；
// 视觉 className 复用 `mine`（home/index.scss 即 mine SCSS 的拷贝），避免重写样式。

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

const MY_ACTIVITIES = [
  // ponytail: events / market 都是 tabBar，跳转用 switchTab；?tab=xxx 参数在 switchTab 下不传递，
  //          故 events 页内默认 tab 由用户自己切换。需要参数透传待下迭代用全局 store 传值。
  { id: 'a1', title: '我发布的求助', icon: '🆘', page: '/pages/events/index', tab: true },
  { id: 'a2', title: '我参与的互助', icon: '🤝', page: '/pages/events/index', tab: true },
  { id: 'a3', title: '我的闲置', icon: '📦', page: '/pages/events/index', tab: true },
  { id: 'a4', title: '我的公益', icon: '☀️', page: '/pages/events/index', tab: true },
];

const MENU_ITEMS: MenuItem[][] = [
  [
    { id: 'verify', label: '业主认证', icon: '✅' },
    { id: 'my_badges', label: '我的勋章', icon: '🏅' },
    { id: 'my_rank', label: '我的排名', icon: '📊' },
  ],
  [
    { id: 'notifications', label: '消息通知', icon: '🔔' },
    { id: 'feedback_history', label: '反馈记录', icon: '📝' },
    { id: 'my_services', label: '我的服务', icon: '🔧' },
  ],
  [
    { id: 'community_apply', label: '申请开通小区', icon: '🏘️' },
    { id: 'my_applications', label: '我的小区申请', icon: '📑' },
    { id: 'invite', label: '邀请邻居', icon: '💌' },
    { id: 'settings', label: '设置', icon: '⚙️' },
    { id: 'about', label: '关于我们', icon: '💡' },
  ],
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
  my_applications: '/pages/my-applications/index',
};

export default function Home() {
  useAuthGuard();

  const user = useAuthStore((s) => s.user);
  const communityName = useCommunityStore((s) => s.currentCommunityName);

  // 首次登录新手引导
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (user && shouldShowOnboarding()) setShowOnboarding(true);
  }, [user]);

  const { data: myRanking } = useRequest(
    () => rankingService.getMyRanking(),
    [user?.id, communityName],
    {
      enabled: !!user,
    },
  );

  const { data: dashboard } = useRequest(
    () => authService.getDashboard(),
    [user?.id, communityName],
    {
      enabled: !!user,
    },
  );

  useShareAppMessage(() => ({
    title: communityName
      ? `${communityName}的邻居都在用「小区帮榜棒」`
      : '邻里互助，从小区帮榜棒开始',
    path: '/pages/home/index',
  }));

  const nickname = user?.nickname ?? '邻居';
  const isVerified = user?.verifyStatus === 'verified';
  const verifyLabel = isVerified ? '✅ 已认证' : '⏳ 未认证';
  const verifyClass = isVerified ? 'mine__user-tag--verified' : 'mine__user-tag--unverified';

  const stats = [
    { label: '帮助次数', value: myRanking?.helpCount ?? 0, icon: '🤲' },
    { label: '小红花', value: myRanking?.flowerCount ?? 0, icon: '🌸' },
    { label: '勋章', value: myRanking?.badgeCount ?? 0, icon: '🏅' },
  ];

  // dashboard 上的活跃数据 —— 没数据时不渲染整行
  const activeBlocks: {
    key: string;
    icon: string;
    label: string;
    value: number;
    onClick: () => void;
  }[] = [];
  if (dashboard) {
    if (dashboard.myActiveEventCount > 0) {
      activeBlocks.push({
        key: 'active_event',
        icon: '📋',
        label: '进行中互助',
        value: dashboard.myActiveEventCount,
        // events 是 tabBar 页，必须 switchTab；tab 参数无法透传，先跳到默认。
        onClick: () => Taro.switchTab({ url: '/pages/events/index' }),
      });
    }
    if (dashboard.myActiveMarketCount > 0) {
      activeBlocks.push({
        key: 'active_market',
        icon: '📦',
        label: '在售闲置',
        value: dashboard.myActiveMarketCount,
        onClick: () => Taro.navigateTo({ url: '/pages/market/index?tab=my' }),
      });
    }
    if (dashboard.pendingVotes && dashboard.pendingVotes.length > 0) {
      activeBlocks.push({
        key: 'pending_votes',
        icon: '🗳️',
        label: '待投票',
        value: dashboard.pendingVotes.length,
        onClick: () => Taro.navigateTo({ url: '/pages/votes/index' }),
      });
    }
    if (dashboard.unreadNotificationCount > 0) {
      activeBlocks.push({
        key: 'unread',
        icon: '🔔',
        label: '未读消息',
        value: dashboard.unreadNotificationCount,
        onClick: () => Taro.navigateTo({ url: '/pages/notifications/index' }),
      });
    }
  }

  const handleMenuClick = (item: MenuItem) => {
    if (item.id === 'about') {
      Taro.showModal({
        title: '小区帮榜棒',
        content: '邻里互助，共建美好社区\n版本：1.0.0',
        showCancel: false,
      });
      return;
    }
    const route = MENU_ROUTES[item.id];
    if (route) {
      Taro.navigateTo({ url: route });
    }
  };

  const handleActivityClick = (act: (typeof MY_ACTIVITIES)[number]) => {
    if (act.tab) {
      Taro.switchTab({ url: act.page });
    } else {
      Taro.navigateTo({ url: act.page });
    }
  };

  return (
    <View className="mine">
      {/* 用户信息卡片 */}
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
              <View className={`mine__user-tag ${verifyClass}`}>
                <Text className="mine__user-tag-text">{verifyLabel}</Text>
              </View>
              {communityName && (
                <View className="mine__user-tag mine__user-tag--community">
                  <Text className="mine__user-tag-text">🏠 {communityName}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* 数据统计 */}
      <View className="mine__stats">
        {stats.map((stat) => (
          <View key={stat.label} className="mine__stat">
            <Text className="mine__stat-icon">{stat.icon}</Text>
            <Text className="mine__stat-value">{stat.value}</Text>
            <Text className="mine__stat-label">{stat.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className="mine__content">
        {/* 双发布入口 */}
        <View className="mine__publish-row">
          <View
            className="mine__publish-btn mine__publish-btn--plaza"
            onClick={() => Taro.switchTab({ url: '/pages/plaza/index' })}
          >
            <Text className="mine__publish-icon">📣</Text>
            <Text className="mine__publish-text">发公共反馈</Text>
          </View>
          <View
            className="mine__publish-btn mine__publish-btn--events"
            onClick={() => Taro.navigateTo({ url: '/pages/event-create/index' })}
          >
            <Text className="mine__publish-icon">🤝</Text>
            <Text className="mine__publish-text">发邻里互助</Text>
          </View>
        </View>

        {/* 活跃数据（dashboard） */}
        {activeBlocks.length > 0 && (
          <View className="mine__active-row">
            {activeBlocks.map((b) => (
              <View key={b.key} className="mine__active-item" onClick={b.onClick}>
                <Text className="mine__active-icon">{b.icon}</Text>
                <Text className="mine__active-value">{b.value}</Text>
                <Text className="mine__active-label">{b.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 我的动态入口 */}
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
                  <Text className="mine__activity-icon">{act.icon}</Text>
                </View>
                <Text className="mine__activity-label">{act.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 菜单列表 */}
        {MENU_ITEMS.map((group, gi) => (
          <View key={gi} className="mine__menu-group">
            {group.map((item) =>
              item.id === 'invite' ? (
                // 邀请邻居：用 Button openType=share 直接触发微信分享面板
                <Button
                  key={item.id}
                  className="mine__menu-item mine__menu-item--share"
                  openType="share"
                >
                  <View className="mine__menu-left">
                    <Text className="mine__menu-icon">{item.icon}</Text>
                    <Text className="mine__menu-label">{item.label}</Text>
                  </View>
                  <View className="mine__menu-right">
                    <Text className="mine__menu-arrow">›</Text>
                  </View>
                </Button>
              ) : (
                <View
                  key={item.id}
                  className="mine__menu-item"
                  onClick={() => handleMenuClick(item)}
                >
                  <View className="mine__menu-left">
                    <Text className="mine__menu-icon">{item.icon}</Text>
                    <Text className="mine__menu-label">{item.label}</Text>
                  </View>
                  <View className="mine__menu-right">
                    {item.count !== undefined && item.count > 0 && (
                      <View className="mine__menu-badge">
                        <Text className="mine__menu-badge-text">{item.count}</Text>
                      </View>
                    )}
                    <Text className="mine__menu-arrow">›</Text>
                  </View>
                </View>
              ),
            )}
          </View>
        ))}

        <View className="mine__bottom-spacer" />
      </ScrollView>

      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
    </View>
  );
}
