import { View, Text } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import Icon, { type IconName } from '@/components/icon';
import './index.scss';

interface TabItem {
  pagePath: string;
  text: string;
  icon: IconName;
}

const TABS: TabItem[] = [
  { pagePath: '/pages/plaza/index', text: '小区事', icon: 'community' },
  { pagePath: '/pages/events/index', text: '邻里帮', icon: 'handshake' },
  { pagePath: '/pages/ranking/index', text: '光荣榜', icon: 'trophy' },
  { pagePath: '/pages/home/index', text: '我的', icon: 'person' },
];

export default function CustomTabBar() {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const sync = () => {
      const pages = Taro.getCurrentPages();
      if (pages.length > 0) {
        const current = pages[pages.length - 1];
        const route = current.route ? `/${current.route}` : '';
        const index = TABS.findIndex((t) => t.pagePath === route);
        if (index !== -1) setSelected(index);
      }
    };
    sync();
    Taro.eventCenter.on('tabbar:sync', sync);
    return () => {
      Taro.eventCenter.off('tabbar:sync', sync);
    };
  }, []);

  const handleSwitch = (index: number) => {
    const url = TABS[index].pagePath;
    setSelected(index);
    Taro.switchTab({ url });
  };

  return (
    <View className="custom-tab-bar">
      <View className="custom-tab-bar__pill">
        {TABS.map((tab, i) => {
          const isActive = i === selected;
          return (
            <View
              key={tab.pagePath}
              className={`custom-tab-bar__item ${isActive ? 'custom-tab-bar__item--active' : ''}`}
              onClick={() => handleSwitch(i)}
            >
              <Icon name={tab.icon} size={20} color={isActive ? '#FFFFFF' : '#6B7A6E'} />
              <Text
                className={`custom-tab-bar__text ${isActive ? 'custom-tab-bar__text--active' : ''}`}
              >
                {tab.text}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
