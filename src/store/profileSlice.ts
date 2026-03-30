/**
 * profileSlice.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Holds the current authenticated user's full Firestore document.
 * Kept separate from authSlice (which only holds Firebase Auth fields).
 * This slice is populated by the useProfile hook's real-time listener.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserDocument } from '../types/user';

interface ProfileState {
  profile: UserDocument | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profile: null,
  isLoading: true,
  error: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<UserDocument | null>) {
      state.profile = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    clearProfile(state) {
      state.profile = null;
      state.isLoading = false;
      state.error = null;
    },
    setProfileLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setProfileError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    /** Optimistic update for skill lists — UI updates instantly */
    updateSkillsOptimistic(
      state,
      action: PayloadAction<{ teachSkills: string[]; wantSkills: string[] }>,
    ) {
      if (state.profile) {
        state.profile.teachSkills = action.payload.teachSkills;
        state.profile.wantSkills = action.payload.wantSkills;
      }
    },
  },
});

export const {
  setProfile,
  clearProfile,
  setProfileLoading,
  setProfileError,
  updateSkillsOptimistic,
} = profileSlice.actions;

export default profileSlice.reducer;
