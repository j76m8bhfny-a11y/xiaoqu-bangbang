export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/plaza/index',
    'pages/events/index',
    'pages/market/index',
    // ponytail: topics 列表入口（议事榜）在 S1-6 合并进 plaza，list 页保留
    //           以兼容老路径/历史链接，但不再出现在 tabBar。
    'pages/topics/index',
    'pages/topic-detail/index',
    'pages/topic-create/index',
    'pages/ranking/index',
    // ponytail: home 即「我的」（S1-5 重写），mine 页源码保留过渡期，
    //           不进 pages 列表以减小包体积。
    // 'pages/mine/index',
    'pages/login/index',
    'pages/community-select/index',
    'pages/event-detail/index',
    'pages/market-detail/index',
    'pages/event-create/index',
    'pages/market-create/index',
    'pages/notifications/index',
    'pages/profile-edit/index',
    'pages/badges/index',
    'pages/event-edit/index',
    'pages/market-edit/index',
    'pages/votes/index',
    'pages/vote-detail/index',
    'pages/committee/index',
    'pages/committee-member/index',
    'pages/committee-announcement/index',
    'pages/verify/index',
    'pages/settings/index',
    'pages/service-providers/index',
    'pages/service-provider-detail/index',
    // ponytail: social-groups 模块本期不做（已审计决议「不做」），保留源码用于后续迭代，
    //          仅从注册页面列表移除，避免增加包体积/被入口意外触达。
    // 'pages/social-groups/index',
    'pages/community-apply/index',
    'pages/community-application-detail/index',
    'pages/my-applications/index',
    'pages/user-profile/index',
  ],
  tabBar: {
    color: '#7A7A7A',
    selectedColor: '#35E89A',
    backgroundColor: '#FFF8EC',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '我的',
        iconPath: 'assets/tab-mine.png',
        selectedIconPath: 'assets/tab-mine-active.png',
      },
      {
        pagePath: 'pages/plaza/index',
        text: '公共反馈',
        iconPath: 'assets/tab-plaza.png',
        selectedIconPath: 'assets/tab-plaza-active.png',
      },
      {
        pagePath: 'pages/events/index',
        text: '邻里互助',
        iconPath: 'assets/tab-home.png',
        selectedIconPath: 'assets/tab-home-active.png',
      },
      {
        pagePath: 'pages/ranking/index',
        text: '棒帮榜',
        iconPath: 'assets/tab-ranking.png',
        selectedIconPath: 'assets/tab-ranking-active.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFF8EC',
    navigationBarTitleText: '小区帮榜棒',
    navigationBarTextStyle: 'black',
  },
});
