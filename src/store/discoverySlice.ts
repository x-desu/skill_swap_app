import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserDocument } from '../types/user';

interface DiscoveryState {
  feed: UserDocument[];
  swipedIds: Record<string, 'like' | 'pass'>;
  isPaginating: boolean;
  hasReachedEnd: boolean;
}

const initialState: DiscoveryState = {
  feed: [],
  swipedIds: {},
  isPaginating: false,
  hasReachedEnd: false,
};

const discoverySlice = createSlice({
  name: 'discovery',
  initialState,
  reducers: {
    appendFeed: (state, action: PayloadAction<UserDocument[]>) => {
      // Filter out any users we already have in the feed just in case
      const existingIds = new Set(state.feed.map(u => u.uid));
      const newUsers = action.payload.filter(u => !existingIds.has(u.uid));
      state.feed = [...state.feed, ...newUsers];
    },
    removeFeedItem: (state, action: PayloadAction<string>) => {
      state.feed = state.feed.filter(u => u.uid !== action.payload);
    },
    setFeed: (state, action: PayloadAction<UserDocument[]>) => {
      state.feed = action.payload;
    },
    recordSwipeData: (state, action: PayloadAction<{ targetUid: string; type: 'like' | 'pass' }>) => {
      state.swipedIds[action.payload.targetUid] = action.payload.type;
    },
    setSwipedIds: (state, action: PayloadAction<string[]>) => {
      // Hydrate from backend initially
      action.payload.forEach(id => {
        if (!state.swipedIds[id]) {
          state.swipedIds[id] = 'pass'; // default value for quick lookups
        }
      });
    },
    setIsPaginating: (state, action: PayloadAction<boolean>) => {
      state.isPaginating = action.payload;
    },
    setHasReachedEnd: (state, action: PayloadAction<boolean>) => {
      state.hasReachedEnd = action.payload;
    },
    clearDiscovery: (state) => {
      state.feed = [];
      state.swipedIds = {};
      state.isPaginating = false;
      state.hasReachedEnd = false;
    },
  },
});

export const {
  appendFeed,
  removeFeedItem,
  recordSwipeData,
  setSwipedIds,
  setIsPaginating,
  setHasReachedEnd,
  clearDiscovery,
  setFeed,
} = discoverySlice.actions;

export default discoverySlice.reducer;
