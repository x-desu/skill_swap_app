import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserDocument, SwapRequest } from '../types/user';

interface UsersState {
  nearby: UserDocument[];
  selectedUser: UserDocument | null;
  isLoading: boolean;
  // Swap request state for the current user
  incomingSwaps: SwapRequest[];
  outgoingSwaps: SwapRequest[];
  swapsLoading: boolean;
}

const initialState: UsersState = {
  nearby: [],
  selectedUser: null,
  isLoading: true,
  incomingSwaps: [],
  outgoingSwaps: [],
  swapsLoading: true,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setNearbyUsers(state, action: PayloadAction<UserDocument[]>) {
      state.nearby = action.payload;
      state.isLoading = false;
    },
    setUsersLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setSelectedUser(state, action: PayloadAction<UserDocument | null>) {
      state.selectedUser = action.payload;
    },
    setSwapRequests(
      state,
      action: PayloadAction<{ incoming: SwapRequest[]; outgoing: SwapRequest[] }>,
    ) {
      state.incomingSwaps = action.payload.incoming;
      state.outgoingSwaps = action.payload.outgoing;
      state.swapsLoading = false;
    },
    setSwapsLoading(state, action: PayloadAction<boolean>) {
      state.swapsLoading = action.payload;
    },
  },
});

export const {
  setNearbyUsers,
  setUsersLoading,
  setSelectedUser,
  setSwapRequests,
  setSwapsLoading,
} = usersSlice.actions;

export default usersSlice.reducer;
