import { View, Text, ScrollView, Image, Button } from '@tarojs/components';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { useAuthStore, useCommunityStore } from '@/store';
import { authService, rankingService } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import Onboarding, { shouldShowOnboarding } from '@/components/onboarding';
import Icon, { type IconName } from '@/components/icon';
import './index.scss';

interface GridItem {
  id: string;
  label: string;
  icon: IconName;
  desc: string;
  route: string;
  isTab?: boolean;
}

const GRID_ITEMS: GridItem[] = [
  {
    id: 'event',
    label: '发布求助',
    icon: 'help',
    desc: '找邻居搭把手',
    route: '/pages/event-create/index',
  },
  {
    id: 'topic',
    label: '发起议题',
    icon: 'chat',
    desc: '大家一起议',
    route: '/pages/topic-create/index',
  },
  {
    id: 'rank',
    label: '我的排名',
    icon: 'trophy',
    desc: '看看贡献值',
    route: '/pages/ranking/index',
    isTab: true,
  },
  {
    id: 'verify',
    label: '业主认证',
    icon: 'check-circle',
    desc: '认证享更多',
    route: '/pages/verify/index',
  },
];

interface MenuItem {
  id: string;
  label: string;
  icon: IconName;
}

interface MenuGroup {
  title: string;
  collapsable?: boolean;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: '通知与服务',
    items: [
      { id: 'notifications', label: '消息通知', icon: 'bell' },
      { id: 'my_badges', label: '我的勋章', icon: 'medal' },
      { id: 'my_services', label: '我的服务', icon: 'wrench' },
    ],
  },
  {
    title: '小区管理',
    items: [
      { id: 'community_switch', label: '切换小区', icon: 'house' },
      { id: 'community_apply', label: '申请开通小区', icon: 'community' },
      { id: 'my_applications', label: '我的小区申请', icon: 'documents' },
      { id: 'invite', label: '邀请邻居', icon: 'envelope' },
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
  my_badges: '/pages/badges/index',
  my_services: '/pages/service-providers/index',
  notifications: '/pages/notifications/index',
  settings: '/pages/settings/index',
  community_apply: '/pages/community-apply/index',
  my_applications: '/pages/my-applications/index',
  community_switch: '/pages/community-select/index',
};

export default function Home() {
  useAuthGuard();

  const user = useAuthStore((s) => s.user);
  const communityName = useCommunityStore((s) => s.currentCommunityName);
  const setPendingEventsFilter = useCommunityStore((s) => s.setPendingEventsFilter);
  const [moreExpanded, setMoreExpanded] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (user && shouldShowOnboarding(user.verifyStatus === 'verified')) {
      setShowOnboarding(true);
    }
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
    title: communityName ? `${communityName}的邻居都在用「左邻右帮」` : '邻里互助，从左邻右帮开始',
    path: '/pages/home/index',
  }));

  const nickname = user?.nickname ?? '邻居';
  const isVerified = user?.verifyStatus === 'verified';
  const verifyIcon: IconName = isVerified ? 'check-circle' : 'lock';
  const verifyLabel = isVerified ? '业主' : '去认证';
  const verifyClass = isVerified ? 'home__tag--verified' : 'home__tag--unverified';

  const helpCount = myRanking?.helpCount ?? 0;

  const stats: { label: string; value: number; icon: IconName }[] = [
    { label: '帮助次数', value: helpCount, icon: 'hands-up' },
    { label: '小红花', value: myRanking?.flowerCount ?? 0, icon: 'flower' },
    { label: '勋章', value: myRanking?.badgeCount ?? 0, icon: 'medal' },
  ];

  const todos: {
    key: string;
    icon: IconName;
    label: string;
    value: number;
    onClick: () => void;
  }[] = [];
  if (dashboard) {
    if (dashboard.myActiveEventCount > 0) {
      todos.push({
        key: 'active_event',
        icon: 'clipboard',
        label: '进行中互助',
        value: dashboard.myActiveEventCount,
        onClick: () => {
          setPendingEventsFilter({ filter: 'mine', status: 'open,in_progress,processing' });
          Taro.switchTab({ url: '/pages/events/index' });
        },
      });
    }
    if (dashboard.myCompletedEventCount > 0) {
      todos.push({
        key: 'completed_event',
        icon: 'check-circle',
        label: '已完成互助',
        value: dashboard.myCompletedEventCount,
        onClick: () => {
          setPendingEventsFilter({ filter: 'mine', status: 'completed,closed' });
          Taro.switchTab({ url: '/pages/events/index' });
        },
      });
    }
    if (dashboard.pendingVotes && dashboard.pendingVotes.length > 0) {
      todos.push({
        key: 'pending_votes',
        icon: 'vote',
        label: '待投票',
        value: dashboard.pendingVotes.length,
        onClick: () => Taro.navigateTo({ url: '/pages/votes/index' }),
      });
    }
    if (dashboard.unreadNotificationCount > 0) {
      todos.push({
        key: 'unread',
        icon: 'bell',
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
        title: '左邻右帮',
        content: '邻里互助，共建美好社区\n版本：1.0.0',
        showCancel: false,
      });
      return;
    }
    const route = MENU_ROUTES[item.id];
    if (route) Taro.navigateTo({ url: route });
  };

  let statusBarHeight = 20;
  try {
    const sys = Taro.getWindowInfo();
    if (sys.statusBarHeight) statusBarHeight = sys.statusBarHeight;
  } catch {
    // fallback
  }

  return (
    <View className="home">
      <ScrollView scrollY className="home__scroll">
        {/* User Card + Stats */}
        <View className="home__header" style={{ paddingTop: `${statusBarHeight}px` }}>
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
                <View
                  className={`home__tag ${verifyClass}`}
                  onClick={(e) => {
                    if (!isVerified) {
                      e.stopPropagation();
                      Taro.navigateTo({ url: '/pages/verify/index' });
                    }
                  }}
                >
                  <Icon name={verifyIcon} size={14} />
                  <Text className="home__tag-text">{verifyLabel}</Text>
                </View>
                {communityName && (
                  <View className="home__tag home__tag--community">
                    <Icon name="house" size={14} />
                    <Text className="home__tag-text">{communityName}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text className="home__user-arrow">›</Text>
          </View>

          <View className="home__stats">
            {stats.map((stat) => (
              <View key={stat.label} className="home__stat">
                <Text className="home__stat-value">{stat.value}</Text>
                <View className="home__stat-label">
                  <Icon name={stat.icon} size={16} />
                  <Text> {stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text className="home__greeting">
            {helpCount > 0 ? `本月你帮助了${helpCount}位邻居` : '还没有帮助过邻居，去邻里帮看看？'}
          </Text>
        </View>

        {/* Grid */}
        <View className="home__grid">
          {GRID_ITEMS.map((item, idx) => {
            const isCream = idx === 0 || idx === 3;
            return (
              <View
                key={item.id}
                className={`home__grid-item ${isCream ? 'home__grid-item--cream' : 'home__grid-item--bgGreen'}`}
                onClick={() => handleGridClick(item)}
              >
                <View className="home__grid-content">
                  <Text className="home__grid-label">{item.label}</Text>
                  <Text className="home__grid-desc">{item.desc}</Text>
                </View>
                <View className="home__grid-icon-box">
                  <Icon name={item.icon} size={24} color={isCream ? '#C9702F' : '#5B9E6F'} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Todos */}
        {todos.length > 0 && (
          <View className="home__todos">
            <Text className="home__section-title">待办提醒</Text>
            <View className="home__todo-row">
              {todos.map((t) => (
                <View key={t.key} className="home__todo" onClick={t.onClick}>
                  <View className="home__todo-icon">
                    <Icon name={t.icon} size={22} />
                  </View>
                  <View className="home__todo-detail">
                    <Text className="home__todo-value">{t.value}</Text>
                    <Text className="home__todo-label">{t.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Menu Groups */}
        {MENU_GROUPS.map((group, gi) => {
          const isCollapsed = group.collapsable && !moreExpanded;
          return (
            <View key={gi} className="home__menu-group">
              <View
                className="home__group-header"
                onClick={() => group.collapsable && setMoreExpanded(!moreExpanded)}
              >
                <Text className="home__group-title">{group.title}</Text>
                {group.collapsable && (
                  <Text
                    className={`home__group-arrow ${moreExpanded ? 'home__group-arrow--expanded' : ''}`}
                  >
                    ›
                  </Text>
                )}
              </View>
              {!isCollapsed &&
                group.items.map((item) =>
                  item.id === 'invite' ? (
                    <Button
                      key={item.id}
                      className="home__menu-item home__menu-item--share"
                      openType="share"
                    >
                      <View className="home__menu-left">
                        <View className="home__menu-icon">
                          <Icon name={item.icon} size={22} />
                        </View>
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
                        <View className="home__menu-icon">
                          <Icon name={item.icon} size={22} />
                        </View>
                        <Text className="home__menu-label">{item.label}</Text>
                      </View>
                      <Text className="home__menu-arrow">›</Text>
                    </View>
                  ),
                )}
            </View>
          );
        })}

        <View className="home__bottom-spacer" />
      </ScrollView>

      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
    </View>
  );
}
