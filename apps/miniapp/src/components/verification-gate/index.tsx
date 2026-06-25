import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/store';
import type { ReactNode } from 'react';
import './index.scss';

interface VerificationGateProps {
  // 渲染包裹的子元素；未认证时点击会拦截并提示去认证。
  children: ReactNode;
  // 自定义未认证提示文案，默认「需要业主认证后才能操作」。
  tip?: string;
  // 自定义认证页路径，默认 /pages/verify/index。
  verifyUrl?: string;
  // 透传外层 className。
  className?: string;
}

// 包裹需要 verified 权限的交互（点赞/评论/评分/投票/助力等）。
// 已认证：透明转发点击。
// 未认证：拦截并弹框引导去认证。
export default function VerificationGate({
  children,
  tip = '需要业主认证后才能进行此操作',
  verifyUrl = '/pages/verify/index',
  className,
}: VerificationGateProps) {
  const verifyStatus = useAuthStore((s) => s.user?.verifyStatus);
  const verified = verifyStatus === 'verified';

  const handleClick = (e: any) => {
    if (verified) return; // 让事件冒泡到子元素自己的 handler
    e?.stopPropagation?.();
    Taro.showModal({
      title: '需要认证',
      content: tip,
      confirmText: '去认证',
      success: (res) => {
        if (res.confirm) Taro.navigateTo({ url: verifyUrl });
      },
    });
  };

  return (
    <View
      className={`vg ${!verified ? 'vg--locked' : ''} ${className ?? ''}`}
      onClick={verified ? undefined : handleClick}
      catchMove={!verified}
    >
      {children}
    </View>
  );
}
