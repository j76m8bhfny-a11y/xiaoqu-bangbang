import { useAuthStore, useCommunityStore } from '@/store';

export function useAuthGuard(options?: { requireCommunity?: boolean }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const requireCommunity = options?.requireCommunity ?? true;

  return {
    isReady: isLoggedIn && (!requireCommunity || !!communityId),
    isLoggedIn,
    hasCommunity: !!communityId,
  };
}
