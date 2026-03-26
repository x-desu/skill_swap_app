/**
 * appInit.ts
 *
 * Real startup pipeline. Each step reports progress (0–100) via the
 * `onProgress` callback so the splash-screen loading bar stays in sync.
 *
 * STRUCTURE
 * ─────────
 *  0  %  start
 * 10  %  AsyncStorage: read saved auth token / user prefs
 * 30  %  Auth: validate token with backend (or fall back to guest)
 * 55  %  Data: fetch nearby users for home screen
 * 75  %  Data: fetch matches + messages
 * 90  %  Hydrate Zustand store
 * 100 %  done → navigate
 *
 * When you wire a real backend, replace the `simulateFetch` calls with
 * actual `fetch()` / axios calls — the progress milestones stay the same.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InitResult {
    authToken: string | null;
    isAuthenticated: boolean;
    nearbyUsers: any[];
    matches: any[];
}

type ProgressCallback = (progress: number, label: string) => void;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simulates a network round-trip. Replace with real fetch() when ready. */
async function simulateFetch<T>(data: T, ms: number): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

const STORAGE_KEYS = {
    AUTH_TOKEN:  '@skillswap/auth_token',
    USER_PREFS:  '@skillswap/user_prefs',
} as const;

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function runAppInit(onProgress: ProgressCallback): Promise<InitResult> {

    // ── Step 1 · Read local storage (auth token + prefs) ──────────────────
    onProgress(10, 'Loading preferences…');
    const [storedToken, _prefs] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN).catch(() => null),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PREFS).catch(() => null),
    ]);

    // ── Step 2 · Validate token / authenticate ─────────────────────────────
    onProgress(30, 'Checking authentication…');
    let isAuthenticated = false;
    let authToken: string | null = storedToken;

    if (storedToken) {
        // TODO: replace with real token validation endpoint
        // e.g. const res = await fetch(`${API_BASE}/auth/validate`, { headers: { Authorization: `Bearer ${storedToken}` } });
        const valid = await simulateFetch<boolean>(true, 400);
        isAuthenticated = valid;
    } else {
        // Guest / not logged in — still continue loading
        await simulateFetch(null, 200);
    }

    // ── Step 3 · Fetch nearby users for home screen ────────────────────────
    onProgress(55, 'Finding people near you…');
    // TODO: replace with real API call
    // e.g. const users = await fetch(`${API_BASE}/users/nearby?lat=...&lng=...`).then(r => r.json());
    const nearbyUsers = await simulateFetch<any[]>([], 500);

    // ── Step 4 · Fetch matches + messages ─────────────────────────────────
    onProgress(75, 'Loading your swaps…');
    // TODO: replace with real API call
    const matches = await simulateFetch<any[]>([], 350);

    // ── Step 5 · Hydrate store ────────────────────────────────────────────
    onProgress(90, 'Almost ready…');
    await simulateFetch(null, 150); // yield to let store updates render

    // ── Done ──────────────────────────────────────────────────────────────
    onProgress(100, 'Ready!');

    return { authToken, isAuthenticated, nearbyUsers, matches };
}

/** Call this after a successful login to persist the token. */
export async function saveAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
}

/** Call this on logout. */
export async function clearAuthToken(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
}
