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

    authService.getMe().then((user) => {
      updateUser(user);
      if (user.currentCommunityId && user.currentCommunityName) {
        selectCommunity({
          id: user.currentCommunityId,
          name: user.currentCommunityName,
        } as any);
      } else if (!getCachedCommunityId()) {
        Taro.redirectTo({ url: '/pages/community-select/index' });
      }
      notificationService.list({ isRead: false, pageSize: 1 }).then((res) => {
        setUnreadCount(res.items.length);
      }).catch(() => {});
    }).catch(() => {
      useAuthStore.getState().logout();
      Taro.reLaunch({ url: '/pages/login/index' });
    });
  }, []);

  return children;
}

export default App;
