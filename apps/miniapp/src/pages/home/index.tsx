import { View, Text, ScrollView, Image, Button } from '@tarojs/components';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { useAuthStore, useCommunityStore } from '@/store';
import { authService, rankingService } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import Onboarding, { shouldShowOnboarding } from '@/components/onboarding';
import './index.scss';

// 「我的」页（UI 重设计 v2 · 功能宫格样板）：
// 结构 = 用户卡片 → 数据统计 → 主功能大宫格 → 待办提醒 → 设置类列表。
// 老年友好：大按钮、图标配文字、草木绿、字号放大、留白充足。
// ponytail: 功能图标暂用 emoji（彩色直观、老人易认、零成本，且均配文字标签）。
//           升级路径：后续统一替换为矢量图标集（Lucide/自绘 SVG 组件）。

// 主功能宫格：4 个高频/重要入口，2×2 大方块
interface GridItem {
  id: string;
  label: string;
  icon: string;
  desc: string;
  route: string;
  isTab?: boolean;
}

const GRID_ITEMS: GridItem[] = [
  {
    id: 'event',
    label: '发布求助',
    icon: '🆘',
    desc: '找邻居搭把手',
    route: '/pages/event-create/index',
  },
  {
    id: 'topic',
    label: '发起议题',
    icon: '💬',
    desc: '大家一起议',
    route: '/pages/topic-create/index',
  },
  {
    id: 'rank',
    label: '我的排名',
    icon: '🏆',
    desc: '看看贡献值',
    route: '/pages/ranking/index',
    isTab: true,
  },
  { id: 'verify', label: '业主认证', icon: '✅', desc: '认证享更多', route: '/pages/verify/index' },
];

// 设置类列表（次要功能，列表呈现即可）
interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

const MENU_ITEMS: MenuItem[][] = [
  [
    { id: 'notifications', label: '消息通知', icon: '🔔' },
    { id: 'my_badges', label: '我的勋章', icon: '🏅' },
    { id: 'my_services', label: '我的服务', icon: '🔧' },
  ],
  [
    { id: 'community_apply', label: '申请开通小区', icon: '🏘️' },
    { id: 'my_applications', label: '我的小区申请', icon: '📑' },
    { id: 'invite', label: '邀请邻居', icon: '💌' },
  ],
  [
    { id: 'settings', label: '设置', icon: '⚙️' },
    { id: 'about', label: '关于我们', icon: '💡' },
  ],
];

const MENU_ROUTES: Record<string, string> = {
  my_badges: '/pages/badges/index',
  my_services: '/pages/service-providers/index',
  notifications: '/pages/notifications/index',
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
  const verifyClass = isVerified ? 'home__tag--verified' : 'home__tag--unverified';

  const stats = [
    { label: '帮助次数', value: myRanking?.helpCount ?? 0, icon: '🤲' },
    { label: '小红花', value: myRanking?.flowerCount ?? 0, icon: '🌸' },
    { label: '勋章', value: myRanking?.badgeCount ?? 0, icon: '🏅' },
  ];

  // 待办提醒（dashboard）—— 没数据不渲染
  const todos: { key: string; icon: string; label: string; value: number; onClick: () => void }[] =
    [];
  if (dashboard) {
    if (dashboard.myActiveEventCount > 0) {
      todos.push({
        key: 'active_event',
        icon: '📋',
        label: '进行中互助',
        value: dashboard.myActiveEventCount,
        onClick: () => Taro.switchTab({ url: '/pages/events/index' }),
      });
    }
    if (dashboard.pendingVotes && dashboard.pendingVotes.length > 0) {
      todos.push({
        key: 'pending_votes',
        icon: '🗳️',
        label: '待投票',
        value: dashboard.pendingVotes.length,
        onClick: () => Taro.navigateTo({ url: '/pages/votes/index' }),
      });
    }
    if (dashboard.unreadNotificationCount > 0) {
      todos.push({
        key: 'unread',
        icon: '🔔',
        label: '未读消息',
        value: dashboard.unreadNotificationCount,
        onClick: () => Taro.navigateTo({ url: '/pages/notifications/index' }),
      });
    }
  }

  const handleGridClick = (item: GridItem) => {
    if (item.isTab) {
      Taro.switchTab({ url: item.route });
    } else {
      Taro.navigateTo({ url: item.route });
    }
  };

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
    if (route) Taro.navigateTo({ url: route });
  };

  return (
    <View className="home">
      <ScrollView scrollY className="home__scroll">
        {/* 用户卡片 */}
        <View className="home__header">
          <View
            className="home__user"
            onClick={() => Taro.navigateTo({ url: '/pages/profile-edit/index' })}
          >
            <View className="home__avatar">
              {user?.avatarUrl ? (
                <Image className="home__avatar-img" src={user.avatarUrl} mode="aspectFill" />
              ) : (
                <Text className="home__avatar-text">{nickname.slice(0, 1)}</Text>
              )}
            </View>
            <View className="home__user-detail">
              <Text className="home__user-name">{nickname}</Text>
              <View className="home__tags">
                <View className={`home__tag ${verifyClass}`}>
                  <Text className="home__tag-text">{verifyLabel}</Text>
                </View>
                {communityName && (
                  <View className="home__tag home__tag--community">
                    <Text className="home__tag-text">🏠 {communityName}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text className="home__user-arrow">›</Text>
          </View>

          {/* 数据统计 */}
          <View className="home__stats">
            {stats.map((stat) => (
              <View key={stat.label} className="home__stat">
                <Text className="home__stat-value">{stat.value}</Text>
                <Text className="home__stat-label">
                  {stat.icon} {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 主功能大宫格 */}
        <View className="home__grid">
          {GRID_ITEMS.map((item) => (
            <View key={item.id} className="home__grid-item" onClick={() => handleGridClick(item)}>
              <Text className="home__grid-icon">{item.icon}</Text>
              <Text className="home__grid-label">{item.label}</Text>
              <Text className="home__grid-desc">{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* 待办提醒 */}
        {todos.length > 0 && (
          <View className="home__todos">
            <Text className="home__section-title">待办提醒</Text>
            <View className="home__todo-row">
              {todos.map((t) => (
                <View key={t.key} className="home__todo" onClick={t.onClick}>
                  <Text className="home__todo-icon">{t.icon}</Text>
                  <View className="home__todo-detail">
                    <Text className="home__todo-value">{t.value}</Text>
                    <Text className="home__todo-label">{t.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 设置类列表 */}
        {MENU_ITEMS.map((group, gi) => (
          <View key={gi} className="home__menu-group">
            {group.map((item) =>
              item.id === 'invite' ? (
                <Button
                  key={item.id}
                  className="home__menu-item home__menu-item--share"
                  openType="share"
                >
                  <View className="home__menu-left">
                    <Text className="home__menu-icon">{item.icon}</Text>
                    <Text className="home__menu-label">{item.label}</Text>
                  </View>
                  <Text className="home__menu-arrow">›</Text>
                </Button>
              ) : (
                <View
                  key={item.id}
                  className="home__menu-item"
                  onClick={() => handleMenuClick(item)}
                >
                  <View className="home__menu-left">
                    <Text className="home__menu-icon">{item.icon}</Text>
                    <Text className="home__menu-label">{item.label}</Text>
                  </View>
                  <Text className="home__menu-arrow">›</Text>
                </View>
              ),
            )}
          </View>
        ))}

        <View className="home__bottom-spacer" />
      </ScrollView>

      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
    </View>
  );
}
