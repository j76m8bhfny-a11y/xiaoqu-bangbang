export default defineAppConfig({
  pages: [
    // 首屏 = 小区事（plaza）。小程序启动页取 pages[0]，故 plaza 置顶。
    'pages/plaza/index',
    'pages/home/index',
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
    'pages/pet-create/index',
    'pages/pet-edit/index',
    'pages/market-create/index',
    'pages/guide-detail/index',
    'pages/guide-create/index',
    'pages/notifications/index',
    'pages/profile-edit/index',
    'pages/badges/index',
    'pages/event-edit/index',
    'pages/market-edit/index',
    'pages/group-buy-create/index',
    'pages/votes/index',
    'pages/vote-detail/index',
    'pages/committee/index',
    'pages/committee-member/index',
    'pages/committee-announcement/index',
    'pages/verify/index',
    'pages/settings/index',
    'pages/service-providers/index',
    'pages/service-provider-detail/index',
    'pages/social-groups/index',
    'pages/community-apply/index',
    'pages/community-application-detail/index',
    'pages/my-applications/index',
    'pages/user-profile/index',
  ],
  // tab 顺序：小区事（首屏）/ 邻里帮 / 光荣榜 / 我的（挪到最右）
  // 文案通俗化：公共反馈->小区事、邻里互助->邻里帮、棒帮榜->光荣榜
  // ponytail: 图标沿用现有彩色 png（selectedColor 只作用于文字）；
  //           统一矢量图标重绘作为后续单独任务。
  tabBar: {
    color: '#6B7A6E',
    selectedColor: '#5B9E6F',
    backgroundColor: '#FFF8EE',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/plaza/index',
        text: '小区事',
        iconPath: 'assets/tab-plaza.png',
        selectedIconPath: 'assets/tab-plaza-active.png',
      },
      {
        pagePath: 'pages/events/index',
        text: '邻里帮',
        iconPath: 'assets/tab-home.png',
        selectedIconPath: 'assets/tab-home-active.png',
      },
      {
        pagePath: 'pages/ranking/index',
        text: '光荣榜',
        iconPath: 'assets/tab-ranking.png',
        selectedIconPath: 'assets/tab-ranking-active.png',
      },
      {
        pagePath: 'pages/home/index',
        text: '我的',
        iconPath: 'assets/tab-mine.png',
        selectedIconPath: 'assets/tab-mine-active.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F5F8F2',
    navigationBarTitleText: '左邻右帮',
    navigationBarTextStyle: 'black',
  },
});
