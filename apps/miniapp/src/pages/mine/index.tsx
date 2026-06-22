import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { useAuthStore, useCommunityStore } from '@/store';
import { rankingService } from '@/services';
import { useRequest } from '@/hooks';
import './index.scss';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

const MY_ACTIVITIES = [
  { id: 'a1', title: '我发布的求助', icon: '🆘', page: '/pages/events/index?tab=my_help' },
  { id: 'a2', title: '我参与的互助', icon: '🤝', page: '/pages/events/index?tab=my_join' },
  { id: 'a3', title: '我的闲置', icon: '📦', page: '/pages/market/index?tab=my' },
  { id: 'a4', title: '我的公益', icon: '☀️', page: '/pages/events/index?tab=my_welfare' },
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
};

export default function Mine() {
  const user = useAuthStore((s) => s.user);
  const communityName = useCommunityStore((s) => s.currentCommunityName);

  const { data: myRanking } = useRequest(() => rankingService.getMyRanking(), [], {
    enabled: !!user,
  });

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

  const handleMenuClick = (item: MenuItem) => {
    if (item.id === 'invite') {
      Taro.showModal({
        title: '邀请邻居',
        content: '点击右上角"···"，选择"转发"，把小区帮榜棒分享给邻居吧～',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    if (item.id === 'about') {
      Taro.showModal({
        title: '小区帮榜棒',
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
            {group.map((item) => (
              <View key={item.id} className="mine__menu-item" onClick={() => handleMenuClick(item)}>
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
            ))}
          </View>
        ))}

        <View className="mine__bottom-spacer" />
      </ScrollView>
    </View>
  );
}
