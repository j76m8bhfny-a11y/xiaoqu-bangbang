import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '@/components/icon';
import './index.scss';

export interface NavBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  onRightClick?: () => void;
  bg?: string;
  color?: string;
}

export default function NavBar({
  title,
  showBack = true,
  onBack,
  rightAction,
  onRightClick,
  bg = 'transparent',
  color = '#2C3A2E',
}: NavBarProps) {
  let statusBarHeight = 20;
  try {
    const sysInfo = Taro.getSystemInfoSync();
    if (sysInfo.statusBarHeight) {
      statusBarHeight = sysInfo.statusBarHeight;
    }
  } catch {
    // fallback
  }

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      Taro.navigateBack();
    }
  };

  return (
    <View className="navbar" style={{ background: bg, paddingTop: `${statusBarHeight}px` }}>
      <View className="navbar__content">
        <View className="navbar__left">
          {showBack ? (
            <View className="navbar__back-btn" onClick={handleBack}>
              <Icon name="back" size={20} color={color} />
            </View>
          ) : (
            <View className="navbar__placeholder" />
          )}
        </View>

        <Text className="navbar__title" style={{ color }}>
          {title}
        </Text>

        <View className="navbar__right" onClick={onRightClick}>
          {rightAction || <View className="navbar__placeholder" />}
        </View>
      </View>
    </View>
  );
}
