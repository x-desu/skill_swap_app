## 5.1 Authentication & Onboarding
Based on current routing and state analysis:

*   **Login Methods Enabled:**
    *   Google Sign-In
    *   Apple Sign-In (iOS only)
    *   Email / Password (with dedicated Sign-Up and Sign-In flows, plus Forgot Password routing)

*   **Screens in Order:**
    1.  `_layout.tsx` + `index.tsx` (Splash / Auth State Resolving Spinner)
    2.  `/(auth)/welcome` (Social Logins + Routing to Email forms)
    3.  `/(auth)/profile-setup` (Fired if `isProfileComplete` is false)
    4.  `/(tabs)` (Main Home/App interface)

*   **Required Fields in Profile Setup:**
    *   **Display Name:** Strictly required to submit the form manually (`canSubmit = displayName.trim().length > 0`).
    *   *Note on Optional Fields:* Photo (uses Native iOS full-screen crop UI), Location (via `expo-location` GPS fetch), "Skills you can teach", and "Skills you want to learn" are all optional. 
    *   *Note on Bypassing:* There is a "Skip for now" button that forcefully sets `isProfileComplete=true` in Redux, which acts as a valid way for the user to completely bypass all fields.

*   **Rules & Edge Cases:**
    *   **Safe-guard Timeouts**: A strict 3-second timeout exists in `_layout.tsx` that will forcefully release the Splash Screen if Firestore listeners hang, allowing the user into the app with a "locally stale" state to prevent infinite freezing.
    *   **Idempotent Profile Sync**: On *every* successful `onAuthStateChanged`, the app runs `upsertUserProfile`. If this is their first login (or first time after an uncompleted Firebase setup), it creates their Firestore user document and bootstraps default state (e.g., giving the user `10` starting credits and `0` swaps).
    *   **Missing Features**: Currently, there are no active implementations of email verification checks (`firebaseUser.emailVerified`), Phone/OTP login, or dedicated "Banned/Blocked User" routing (a user doc field `isBanned` does not exist in the immediate auth resolution cycle).
