import { PropsWithChildren, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useAuthStore, useCommunityStore, useNotificationStore } from '@/store';
import { authService, notificationService } from '@/services';
import { getCachedCommunityId } from '@/utils/storage';
import './styles/tokens.scss';
import './app.scss';

function App({ children }: PropsWithChildren) {
  const token = useAuthStore((s) => s.token);
  const updateUser = useAuthStore((s) => s.updateUser);
  const selectCommunity = useCommunityStore((s) => s.selectCommunity);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    if (!token) {
      Taro.reLaunch({ url: '/pages/login/index' });
      return;
    }

    authService
      .getMe()
      .then(async (user) => {
        updateUser(user);
        if (user.currentCommunityId && user.currentCommunityName) {
          selectCommunity({
            id: user.currentCommunityId,
            name: user.currentCommunityName,
          } as any);
        } else if (!getCachedCommunityId()) {
          Taro.redirectTo({ url: '/pages/community-select/index' });
        }

        // 拉取未读通知
        try {
          const res = await notificationService.list({ isRead: false, pageSize: 10 });
          setUnreadCount(res.items.length);

          // 有未读通知时，弹窗展示最新的一条
          if (res.items.length > 0) {
            const latest = res.items[0];
            const remaining = res.items.length - 1;
            Taro.showModal({
              title: latest.title,
              content:
                remaining > 0
                  ? `${latest.content}\n\n还有 ${remaining} 条未读通知`
                  : latest.content,
              showCancel: true,
              confirmText: '知道了',
              cancelText: '查看全部',
              success: async (modalRes) => {
                if (modalRes.cancel) {
                  // 点"查看全部"去通知列表页
                  Taro.navigateTo({ url: '/pages/notifications/index' });
                } else {
                  // 点"知道了"标记这条已读
                  try {
                    await notificationService.markRead(latest.id);
                    setUnreadCount(Math.max(0, res.items.length - 1));
                  } catch (_) {
                    // 标记已读失败不影响用户体验
                  }
                }
              },
            });
          }
        } catch (_) {
          // 通知拉取失败不阻塞主流程
        }
      })
      .catch(() => {
        useAuthStore.getState().logout();
        Taro.reLaunch({ url: '/pages/login/index' });
      });
  }, []);

  return children;
}

export default App;
