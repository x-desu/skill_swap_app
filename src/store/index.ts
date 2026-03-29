import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import usersReducer from './usersSlice';
import profileReducer from './profileSlice';
import matchesReducer from './matchesSlice';
import chatReducer from './chatSlice';
import discoveryReducer from './discoverySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    profile: profileReducer,
    matches: matchesReducer,
    chat: chatReducer,
    discovery: discoveryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
