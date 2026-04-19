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
    *   **Display Name:** Mandatory. Must be non-empty.
    *   **Profile Photo:** Mandatory. Subject to AI-powered face detection and safety checks (Google Vision API).
    *   **Skills (Teach/Want):** Mandatory. Users must select at least one skill in each category to proceed.
    *   **Location:** Mandatory. Fetched via GPS or manually confirmed.
    *   **Bypassing:** All bypass mechanisms (e.g., "Skip for now") have been **removed**. Profile completion is strictly enforced and validated server-side.

*   **Rules & Edge Cases:**
    *   **Safe-guard Timeouts**: A strict 3-second timeout exists in `_layout.tsx` that will forcefully release the Splash Screen if Firestore listeners hang, allowing the user into the app with a "locally stale" state to prevent infinite freezing.
    *   **Idempotent Profile Sync**: On *every* successful `onAuthStateChanged`, the app runs `upsertUserProfile`. If this is their first login (or first time after an uncompleted Firebase setup), it creates their Firestore user document and bootstraps default state (e.g., giving the user `10` starting credits and `0` swaps).
    *   **Backend Integrity**: `isProfileComplete` is only set to `true` by a Cloud Function (`validateUserProfile`) after successful AI processing of the profile photo. Client-side updates to this field are blocked by Firestore Security Rules.
    *   **Pending State**: Users with an uploaded photo enter a `pending` state while AI validation runs. Discovery feeds are filtered to hide users until `isProfileComplete` is confirmed.
