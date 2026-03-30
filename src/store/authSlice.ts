import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getAuth,
  GoogleAuthProvider,
  AppleAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isLoading: boolean;
  error: string | null;
  lastSignInMethod: 'google' | 'apple' | 'email' | 'anonymous' | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isProfileComplete: false,
  isLoading: true,   // true until onAuthStateChanged fires for the first time
  error: null,
  lastSignInMethod: null,
};

// ── Async Thunks ─────────────────────────────────────────────────────────────

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const auth = getAuth();
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      const credential = GoogleAuthProvider.credential(data!.idToken);
      await signInWithCredential(auth, credential);
      return 'google' as const;
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Google sign-in failed');
    }
  },
);

export const signInWithApple = createAsyncThunk(
  'auth/signInWithApple',
  async (_, { rejectWithValue }) => {
    try {
      const auth = getAuth();
      const res = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      const credential = AppleAuthProvider.credential(
        res.identityToken,
        res.nonce,
      );
      await signInWithCredential(auth, credential);
      return 'apple' as const;
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Apple sign-in failed');
    }
  },
);

export const signUpWithEmail = createAsyncThunk(
  'auth/signUpWithEmail',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      await createUserWithEmailAndPassword(getAuth(), email, password);
      return 'email' as const;
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Sign up failed');
    }
  },
);

export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      await signInWithEmailAndPassword(getAuth(), email, password);
      return 'email' as const;
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Sign in failed');
    }
  },
);

export const sendPasswordReset = createAsyncThunk(
  'auth/sendPasswordReset',
  async (email: string, { rejectWithValue }) => {
    try {
      await sendPasswordResetEmail(getAuth(), email);
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Password reset failed');
    }
  },
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await firebaseSignOut(getAuth());
      try {
        await GoogleSignin.signOut();
      } catch (_) {
        // not signed in with Google — fine to ignore
      }
    } catch (e: any) {
      return rejectWithValue(e.message ?? 'Sign out failed');
    }
  },
);

// ── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Called by onAuthStateChanged in _layout.tsx — single source of truth
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
      if (action.payload === null) {
        state.isProfileComplete = false;
      }
    },
    setProfileComplete(state, action: PayloadAction<boolean>) {
      state.isProfileComplete = action.payload;
    },
    setAppLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const authThunks = [
      signInWithGoogle,
      signInWithApple,
      signUpWithEmail,
      signInWithEmail,
      signOut,
    ];

    authThunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.isLoading = true;
          state.error = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          // Do NOT set isLoading = false here for logins!
          // We must wait for onAuthStateChanged and Firestore hydration to finish.
          if (action.payload) {
            state.lastSignInMethod = action.payload as AuthState['lastSignInMethod'];
          }
        });
    });

    // Password reset doesn't trigger onAuthStateChanged, so we MUST clear loading state here
    builder
      .addCase(sendPasswordReset.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendPasswordReset.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(sendPasswordReset.fulfilled, (state) => {
        state.isLoading = false;
      });
  },
});

export const { setUser, setProfileComplete, setAppLoading, clearError } = authSlice.actions;
export default authSlice.reducer;
