import { create } from 'zustand';
import type { CommunityDto } from '@xiaoqu-bangbang/shared';
import { getCachedCommunityId, setCachedCommunityId } from '@/utils/storage';

interface PendingEventsFilter {
  filter: string;
  status?: string;
}

interface CommunityState {
  currentCommunityId: string | null;
  currentCommunityName: string | null;
  pendingEventsFilter: PendingEventsFilter | null;
  selectCommunity: (community: CommunityDto) => void;
  clearCommunity: () => void;
  setPendingEventsFilter: (filter: PendingEventsFilter | null) => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  currentCommunityId: getCachedCommunityId(),
  currentCommunityName: null,
  pendingEventsFilter: null,

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

  setPendingEventsFilter: (filter) => {
    set({ pendingEventsFilter: filter });
  },
}));
