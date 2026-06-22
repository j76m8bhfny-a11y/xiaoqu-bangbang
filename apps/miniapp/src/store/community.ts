import { create } from 'zustand';
import type { CommunityDto } from '@xiaoqu-bangbang/shared';
import { getCachedCommunityId, setCachedCommunityId } from '@/utils/storage';

interface CommunityState {
  currentCommunityId: string | null;
  currentCommunityName: string | null;
  selectCommunity: (community: CommunityDto) => void;
  clearCommunity: () => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  currentCommunityId: getCachedCommunityId(),
  currentCommunityName: null,

  selectCommunity: (community) => {
    setCachedCommunityId(community.id);
    set({
      currentCommunityId: community.id,
      currentCommunityName: community.name,
    });
  },

  clearCommunity: () => {
    set({ currentCommunityId: null, currentCommunityName: null });
  },
}));
