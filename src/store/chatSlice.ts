import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MessageDocument } from '../types/user';

interface ChatState {
  rooms: Record<string, MessageDocument[]>;
}

const initialState: ChatState = {
  rooms: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setRoomMessages: (
      state,
      action: PayloadAction<{ roomId: string; messages: MessageDocument[] }>
    ) => {
      state.rooms[action.payload.roomId] = action.payload.messages;
    },
    clearChat: (state) => {
      state.rooms = {};
    },
    removeRoomMessages: (state, action: PayloadAction<string>) => {
      delete state.rooms[action.payload];
    },
  },
});

export const { setRoomMessages, clearChat, removeRoomMessages } = chatSlice.actions;
export default chatSlice.reducer;
