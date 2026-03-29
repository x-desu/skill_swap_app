# SRS: Console Warning and Deprecation Remediation

Version: 1.0
Date: 2026-03-28
Project: SkillSwap (Expo + React Native + Firebase)
Status: Ready for implementation

## 1. Purpose
This SRS defines requirements to eliminate runtime console warnings/deprecations currently shown in development, specifically:
1. React Native `SafeAreaView` deprecation warning.
2. React Native Firebase namespaced API deprecation warnings (`auth()`, `firestore()`, `storage()`, `FieldValue`, legacy module access).

Goal:
1. Reduce warning noise to near-zero for app-owned code.
2. Prepare codebase for React Native Firebase v22 modular API migration.
3. Prevent future regressions by adding checks and migration guards.

## 2. Problem Statement
Current console logs indicate repeated warnings caused by deprecated API usage. Primary affected domains:
1. Authentication listeners and actions.
2. Firestore collection/doc operations.
3. Storage uploads.
4. Notification Firestore operations.
5. Discovery/matching and likes hooks/services.

Observed warning classes:
1. `SafeAreaView has been deprecated... use react-native-safe-area-context`.
2. `React Native Firebase namespaced API deprecated... use getApp() and modular methods`.
3. Deprecated method calls such as namespaced `collection`, `doc`, `FieldValue.serverTimestamp`, and `onAuthStateChanged` through legacy entrypoints.

## 3. Scope
In scope:
1. Replace app-owned deprecated RN Firebase namespaced usage with modular API usage.
2. Ensure all app-owned UI uses `react-native-safe-area-context` patterns.
3. Define verification, testing, and rollout approach.
4. Add static checks to block deprecated API reintroduction.

Out of scope:
1. Warnings caused only by third-party package internals (unless package upgrade available).
2. Major architecture redesign unrelated to warnings.
3. Production crash debugging unrelated to these deprecations.

## 4. Impacted Files (Current Known)
Auth:
1. app/_layout.tsx
2. src/store/authSlice.ts
3. app/(auth)/profile-setup.tsx

Firestore and chat domain:
1. src/services/firestoreService.ts
2. src/services/matchingService.ts
3. src/services/chatService.ts
4. src/services/skillsService.ts
5. src/hooks/useDiscoveryFeed.ts
6. src/hooks/useLikes.ts

Storage domain:
1. src/services/storageService.ts
2. src/services/chatService.ts

Notifications domain:
1. src/services/notificationService.ts

Testing and mocks:
1. src/__tests__/setup.ts

## 5. Functional Requirements

### FR-1: Eliminate app-owned deprecated RN Firebase usage
System shall:
1. Remove direct namespaced runtime entry calls (`auth()`, `firestore()`, `storage()`) from app-owned files.
2. Use modular methods consistently via RN Firebase v22 migration guidance.
3. Replace deprecated static access patterns (`firestore.FieldValue.serverTimestamp()`) with modular equivalents.

Acceptance criteria:
1. Running app startup and core routes produces zero namespaced deprecation warnings from app-owned modules.
2. No deprecated method warning references to app files listed in section 4.

### FR-2: Safe area deprecation compliance
System shall:
1. Avoid importing `SafeAreaView` from `react-native` in app-owned source.
2. Use `SafeAreaProvider` and `useSafeAreaInsets` or `SafeAreaView` from `react-native-safe-area-context` where needed.

Acceptance criteria:
1. No `SafeAreaView has been deprecated` warning attributable to app-owned files.
2. If warning remains, root cause is documented as third-party dependency and tracked in mitigation list.

### FR-3: Warning regression prevention
System shall:
1. Add lint/search guard rules preventing future introduction of deprecated patterns.
2. Add CI check for banned strings in app and src trees.

Acceptance criteria:
1. CI fails if banned deprecated patterns are reintroduced.
2. Engineering docs include migration conventions.

## 6. Non-Functional Requirements
1. Migration must preserve existing behavior (no auth flow regression, no chat regression).
2. Performance must not degrade (chat listeners and queries unchanged semantically).
3. Code style and type safety remain compatible with TypeScript strictness used in project.
4. Migration should be incremental and rollback-friendly by feature slice.

## 7. Technical Design Requirements

### 7.1 Auth migration requirements
For app/_layout.tsx and src/store/authSlice.ts:
1. Replace namespaced auth module access with modular auth API imports and calls.
2. Replace `auth().onAuthStateChanged(...)` with modular listener usage.
3. Replace sign-in/sign-out/password methods with modular equivalents.
4. Preserve existing Redux state transitions and routing behavior.

### 7.2 Firestore migration requirements
For firestore/matching/chat/skills/notifications/discovery/likes modules:
1. Replace namespaced constructor pattern `const db = firestore()` with modular database instance retrieval.
2. Replace chained collection/doc calls with modular `collection(...)`, `doc(...)`, etc. consistently.
3. Replace `firestore.FieldValue.*` usage with modular timestamp/array/increment operations.
4. Preserve query ordering, filters, limits, and listener behavior.

### 7.3 Storage migration requirements
For storage service and chat image send:
1. Replace namespaced `storage().ref(...)` with modular storage reference creation.
2. Preserve upload and download URL behavior.

### 7.4 Notification migration requirements
For notificationService:
1. Replace namespaced Firestore usage in notifications subcollection operations.
2. Preserve push token lookup and in-app notification write/listener behavior.

### 7.5 Test/mocks alignment
For src/__tests__/setup.ts:
1. Update mocks to match new modular signatures.
2. Ensure no false positives from stale namespaced mocks.

## 8. Data and API Compatibility Requirements
1. Firestore schema must remain unchanged.
2. Existing document paths must remain unchanged.
3. Existing auth providers (Google, Apple, email/password) must remain unchanged.
4. Existing storage path conventions must remain unchanged.

## 9. Migration Phases

### Phase 1: Foundation
1. Introduce modular API wrappers/utilities (if needed) for auth/firestore/storage.
2. Add temporary adapter helpers to minimize repeated migration mistakes.

Exit criteria:
1. Utility layer compiles and is used in one pilot module.

### Phase 2: Auth slice and root layout
1. Migrate app/_layout.tsx and src/store/authSlice.ts.
2. Validate sign-in/sign-out/onAuthStateChanged flows.

Exit criteria:
1. No auth-related deprecation warnings.
2. Auth UX unchanged.

### Phase 3: Firestore services and hooks
1. Migrate firestoreService, matchingService, skillsService.
2. Migrate hooks useDiscoveryFeed and useLikes.
3. Migrate chatService and notificationService Firestore accesses.

Exit criteria:
1. No Firestore deprecation warnings from app-owned files.
2. Discovery/matching/chat flows functional.

### Phase 4: Storage migration
1. Migrate storageService and chat image storage calls.

Exit criteria:
1. No storage deprecation warnings from app-owned files.
2. Avatar and chat image upload continue to work.

### Phase 5: Safe area compliance and cleanup
1. Confirm no app-owned `react-native` SafeAreaView usage.
2. If warning persists, identify dependency origin and define package upgrade/patch plan.

Exit criteria:
1. No safe-area warnings attributable to app-owned code.

### Phase 6: Regression guardrails
1. Add lint/grep checks for banned deprecated patterns.
2. Update developer docs.

Exit criteria:
1. CI guard active and validated.

## 10. Validation and Test Plan

### 10.1 Runtime verification
Run and validate:
1. Cold app start
2. Auth sign-in/out
3. Home/discovery/matches/chat routes
4. Notification listener initialization
5. Profile setup and avatar upload

Expected:
1. No app-owned deprecation warnings in console.

### 10.2 Functional smoke tests
1. Google sign in works.
2. Email sign in and password reset work.
3. Discovery query results load.
4. Likes and matches work.
5. Chat send/receive works.
6. Notification list listener works.
7. Storage uploads return valid URLs.

### 10.3 Static checks
Add scripted checks for banned patterns in `app/**` and `src/**`:
1. `auth()`
2. `firestore()`
3. `storage()`
4. `firestore.FieldValue`
5. `SafeAreaView` import from `react-native`

## 11. Risks and Mitigations
1. Risk: Subtle API behavior differences during migration.
Mitigation: Migrate by feature slice and run smoke tests after each phase.

2. Risk: Third-party package still emits SafeAreaView warning.
Mitigation: Trace stack to package, upgrade package, patch package, or suppress known external warning with ticket reference.

3. Risk: Type errors due to API signature changes.
Mitigation: Add typed wrapper layer and incremental compile checks.

4. Risk: Regressions in auth listener lifecycle.
Mitigation: Dedicated auth regression checklist and manual QA scripts.

## 12. Deliverables
1. Migrated source files listed in section 4.
2. Updated tests/mocks for new API style.
3. CI/static checks for banned deprecated patterns.
4. Migration notes including any unresolved third-party warning with owner and follow-up task.

## 13. Definition of Done
All of the following must be true:
1. App-owned console deprecation warnings are eliminated in normal dev startup and key user flows.
2. Auth, discovery, chat, notifications, and storage flows pass smoke tests.
3. No banned deprecated usage remains in `app/**` and `src/**`.
4. Any external dependency-origin warning is documented with remediation ticket.

## 14. File-by-File Requirement Mapping
1. app/_layout.tsx: migrate auth listener and remove deprecated auth entrypoint usage.
2. src/store/authSlice.ts: migrate all auth methods to modular equivalent calls.
3. src/services/firestoreService.ts: migrate collection/doc/serverTimestamp/array ops/increment to modular equivalents.
4. src/services/matchingService.ts: remove namespaced db init and keep query semantics.
5. src/hooks/useLikes.ts: remove namespaced db init.
6. src/services/chatService.ts: migrate Firestore + Storage APIs and preserve receipt logic.
7. src/services/notificationService.ts: migrate Firestore collection/doc/batch/serverTimestamp usage.
8. src/services/skillsService.ts: migrate namespaced Firestore accessors.
9. src/hooks/useDiscoveryFeed.ts: remove inline `firestore()` usage and unify modular query creation.
10. src/services/storageService.ts: migrate namespaced storage ref calls.
11. app/(auth)/profile-setup.tsx: migrate auth/firestore runtime calls.
12. src/__tests__/setup.ts: align mocks with migrated API signatures.
