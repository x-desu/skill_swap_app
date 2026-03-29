import '@testing-library/jest-native/extend-expect';
import { vi } from 'vitest';

// Mocking react-native-reanimated
vi.mock('react-native-reanimated', () => {
  const reanimated = require('react-native-reanimated/mock');
  reanimated.default.call = () => {};
  return reanimated;
});

// Mocking react-native-safe-area-context
vi.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => inset,
  };
});

// Mocking Firebase modules
vi.mock('@react-native-firebase/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    deleteDoc: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => new Date()),
    increment: vi.fn((n) => n),
    arrayUnion: vi.fn((n) => [n]),
    arrayRemove: vi.fn((n) => [n]),
    writeBatch: vi.fn(() => ({
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn()
    }))
  };
});

vi.mock('@react-native-firebase/auth', () => {
  return {
    getAuth: vi.fn(() => ({
      currentUser: { uid: 'test-user-id' }
    })),
    onAuthStateChanged: vi.fn(),
    signInWithCredential: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    signOut: vi.fn(),
    GoogleAuthProvider: { credential: vi.fn() },
    AppleAuthProvider: { credential: vi.fn() }
  };
});

vi.mock('@react-native-firebase/storage', () => {
  return {
    getStorage: vi.fn(() => ({})),
    ref: vi.fn(() => ({})),
    putFile: vi.fn(),
    getDownloadURL: vi.fn(),
  };
});
