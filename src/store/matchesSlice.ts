import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MatchDocument } from '../types/user';

interface MatchesState {
  list: MatchDocument[];
  hasLoadedOnce: boolean;
}

const initialState: MatchesState = {
  list: [],
  hasLoadedOnce: false,
};

const matchesSlice = createSlice({
  name: 'matches',
  initialState,
  reducers: {
    setMatches: (state, action: PayloadAction<MatchDocument[]>) => {
      // Keep existing ordering (most recent first)
      state.list = action.payload;
      state.hasLoadedOnce = true;
    },
    clearMatches: (state) => {
      state.list = [];
      state.hasLoadedOnce = false;
    },
  },
});

export const { setMatches, clearMatches } = matchesSlice.actions;
export default matchesSlice.reducer;
