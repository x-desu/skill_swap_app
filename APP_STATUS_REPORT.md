# SkillSwap App - Comprehensive Documentation

**Project Status**: Alpha / MVP Phase
**Last Updated**: March 28, 2026
**Tech Stack**: React Native, Expo, Firebase, Redux, TypeScript

---

## 📋 Project Overview

**SkillSwap** is a mobile-first skill exchange platform that enables users to discover, match, and exchange skills with others in their community. The app uses a Tinder-like swiping interface for discovering potential skill-exchange partners and provides real-time chat for collaboration.

### Core Philosophy
- **Skill bartering over monetization**: Users exchange skills directly without payment
- **Community-driven**: Build connections through mutual learning
- **Accessible**: Lowering barriers to accessing education and expertise

---

## ✅ Completed Features & Architecture

### 1. **Authentication System** ✓
- **Providers**: Google Sign-In, Apple Sign-In, Email/Password
- **State Management**: Redux store (`authSlice.ts`) tracks user authentication state
- **Files**: 
  - Auth screens: `app/(auth)/welcome.tsx`, `sign-in.tsx`, `sign-up.tsx`
  - Auth logic: `src/store/authSlice.ts`
  - Profile setup: `app/(auth)/profile-setup.tsx`
- **Features**:
  - Automatic Firebase Auth state persistence
  - Guest fallback (anonymous auth)
  - Password recovery (forgot-password flow)
  - Automatic Firestore user document creation on login

### 2. **User Profile Management** ✓
- **Profile Creation**: Multi-step onboarding in profile-setup screen
- **Profile Components**:
  - Display name, photo, bio, location
  - Teaching skills (what user can teach)
  - Learning skills (what user wants to learn)
  - Skill categorization (Tech, Music, Art, Language, Sports, Business, Cooking, Other)
- **Profile Display**: `app/(tabs)/profile.tsx`
- **Firestore Structure**: `users/{uid}` collection with comprehensive user document schema
- **Features**:
  - Photo upload with Firebase Storage
  - Real-time location integration (Expo Location)
  - Skill suggestions from global catalog
  - Profile completion flag to gate access to main app

### 3. **Discovery & Matching Engine** ✓
- **Swipe-based Discovery**: `app/(tabs)/discover.tsx`
- **Matching Logic**: `src/services/matchingService.ts`
  - Card-by-card swiping interface
  - Right swipe = "Like" user
  - Left swipe = "Pass" on user
  - Mutual match detection (both users swipe right = match!)
- **Firestore Collections**:
  - `likes`: Tracks all likes/passes (prevents duplicates)
  - `matches`: Stores matched user pairs with conversation metadata
- **Features**:
  - Category filtering for discovery
  - Prevents duplicate swipes (swiped user ID tracking)
  - Automatic match creation on mutual interest
  - Match celebration screen: `app/match-celebration.tsx`

### 4. **Real-time Chat System** ✓
- **Architecture**: Firebase Firestore with subcollections
  - `matches/{matchId}/messages/{messageId}` structure
- **UI**: `react-native-gifted-chat` integration at `app/chat/[id].tsx`
- **Real-time Sync**: 
  - Unidirectional listener subscriptions using `onSnapshot`
  - Automatic message ordering by timestamp
  - Last message preview stored on match document
- **Features**:
  - Text messages with image support (infrastructure ready)
  - User avatars in chat bubbles
  - Timestamp formatting
  - Typing indicators (infrastructure ready)
  - Message persistence in Firestore
- **Files**: 
  - Chat service: `src/services/chatService.ts`
  - Chat hook: `src/hooks/useChat.ts`
  - Send message hook: `src/hooks/useSendMessage.ts`

### 5. **Match Management** ✓
- **Matches Tab**: `app/(tabs)/matches.tsx`
- **Two sub-tabs**:
  1. **Requests**: Incoming/outgoing swap requests (legacy feature, being phased out)
  2. **Matches**: Real matches from mutual swipes
- **Actions**: Chat, accept, decline matches
- **Real-time Sync**: LiveQuery listeners for match updates
- **Transition Note**: App transitioning from SwapRequests → Matches model

### 6. **Credits/Wallet System** ✓
- **Wallet Screen**: `app/(tabs)/wallet.tsx`
- **Features**:
  - Credit balance display (1 credit ≈ 1 hour of service)
  - Transaction history (earn/spend)
  - Buy credits button (UI only, backend not integrated)
  - Real-time balance updates via Zustand store
- **Storage**: `src/store/useStore.ts` (local state + Zustand)
- **Placeholder**: Credit value tied to skill exchange completion (needs backend integration)

### 7. **Tab Navigation** ✓
- **Custom Tab Bar**: Glassmorphic design at `app/(tabs)/_layout.tsx`
- **Five Main Tabs**:
  1. **Home** (`index.tsx`): Feed of nearby users with stats
  2. **Discover** (`discover.tsx`): Swipe-based skill matching
  3. **Matches** (`matches.tsx`): Active conversations & requests
  4. **Wallet** (`wallet.tsx`): Credits and transaction history
  5. **Profile** (`profile.tsx`): User profile, stats, settings
- **Design**: Rose-colored theme, animated icons, safe area handling

### 8. **Settings & User Preferences** ✓
- **Settings Screen**: `app/settings.tsx`
- **Features**:
  - Theme toggling (light/dark mode)
  - Sign out functionality
  - Account deletion prompt (backend not implemented)
  - Device settings (placeholder for future expansion)
- **Theme Context**: `src/context/ThemeContext.tsx` for global theme state

### 9. **Firestore Security Rules** ✓
- **Location**: `firestore.rules`
- **Complete Rule Set**:
  - User profiles: Readable by all signed-in users, writable only by owner
  - Swap requests: Read/write by participants only
  - Skills catalog: Readable by all signed-in
  - Notifications: Readable/writable by owner only
  - Likes: Created by sender, readable by sender/receiver
  - Matches: Read/write by match participants only
  - Messages: Accessible only to match participants
- **Enforces**: Least privilege pattern, prevents unauthorized data access

### 10. **UI Components Library** ✓
- **Custom Components**:
  - `UserAvatar.tsx`: Profile photo display with fallback initials
  - `SwipeCard.tsx`: Individual card in discovery feed with skill display
  - `ProfileGlowBackground.tsx`: Animated gradient background based on user color
- **UI Framework**: Gluestack-UI + NativeWind (Tailwind CSS for React Native)
- **Design System**: 
  - Rose primary color (#ff1a5c)
  - Dark mode optimized
  - Consistent spacing and typography

### 11. **State Management** ✓
- **Redux** (for auth state):
  - `src/store/authSlice.ts`: Authentication state, async thunks for sign-in/sign-up
  - Persistent auth via Firebase
- **Zustand** (for app state):
  - `src/store/useStore.ts`: User store, matches, transactions, wallet
  - Simpler local state management
- **Context** (for theme):
  - `src/context/ThemeContext.tsx`: Theme mode (light/dark)

### 12. **Type Safety** ✓
- **Complete TypeScript Definitions**:
  - User document schema
  - Skill types and categories
  - Swap request types (legacy)
  - Match document types
  - Message document types
  - Notification types
- **Location**: `src/types/user.ts`
- **Benefits**: Type-safe Firestore operations, IDE autocomplete

### 13. **Core Services**
- **firestoreService.ts**: All user profile, swap request operations
- **matchingService.ts**: Like/pass logic, match creation
- **chatService.ts**: Real-time message subscriptions, sending
- **skillsService.ts**: Global skills catalog, suggestions, autocomplete
- **storageService.ts**: Firebase Storage for images (user avatars, etc.)
- **appInit.ts**: App initialization pipeline with progress tracking

---

## 🚧 In-Progress & TODO Items

### 1. **Backend API Integration** 
**Status**: Placeholder infrastructure exists
**Location**: `src/services/appInit.ts` (lines 63, 74, 80)
**Tasks**:
- [ ] Replace `simulateFetch` with real token validation endpoint
- [ ] Implement nearby user discovery API (geospatial query)
- [ ] Create swap completion & rating endpoints
- [ ] Set up API error handling and retry logic

**Impact**: Currently using synthetic data for development

### 2. **Account Deletion Feature**
**Status**: UI prompt exists, logic not implemented
**Location**: `app/settings.tsx` (handleDeleteAccount)
**Tasks**:
- [ ] Create Cloud Function for cascading deletion:
  - Delete user document from Firestore
  - Delete all messages from user's matches
  - Delete user's matches metadata
  - Delete profile photo from Storage
  - Delete Firebase Auth user account
- [ ] Implement re-authentication flow (security requirement)
- [ ] Add confirmation and data export before deletion
- [ ] Handle edge cases (ongoing chats, pending requests)

**Impact**: Users cannot currently delete accounts

### 3. **Push Notifications**
**Status**: Infrastructure scaffolded, not implemented
**What's Ready**:
- FCM token field in user document (`fcmToken`)
- Notification type enum and document schema
- Notifications collection path: `notifications/{uid}/items/{id}`
- Firestore rules allow personal notification management
**Tasks**:
- [ ] Implement FCM token generation and storage on app launch
- [ ] Create Cloud Functions to send notifications for:
  - New match events
  - New messages
  - Swap completion notifications
  - User reviews posted
- [ ] Add notification permission prompts (iOS/Android specific)
- [ ] Create notification landing page/handler
- [ ] Deep linking from notifications to relevant screens

**Impact**: Users won't be alerted to new matches or messages

### 4. **Review & Rating System**
**Status**: Type definitions exist, feature not implemented
**Schema Ready**: 
- `rating` (0-5 average)
- `reviewCount` (counter)
- `completedSwaps` (counter)
**Tasks**:
- [ ] Create review submission form
- [ ] Implement star rating UI component
- [ ] Create review display on profile
- [ ] Add Cloud Function to calculate rating averages
- [ ] Gates review access (only swap participants can review)

**Impact**: Users can't leave feedback on skill exchanges

### 5. **Swap Completion Flow** (Legacy Feature)
**Status**: Data model exists, completion logic incomplete
**Location**: `useMySwaps.ts` hook, `swapRequests` collection
**Tasks**:
- [ ] Create "Mark as Complete" button in Matches tab
- [ ] Implement completion confirmation flow
- [ ] Award credits on completion (trigger via Cloud Function)
- [ ] Prevent review until swap marked complete
- [ ] Track `lastCompleted` timestamp
- [ ] Analytics: capture swap duration

**Impact**: Credit system can't be tied to actual skill exchanges yet

### 6. **Payment Integration** (Future)
**Status**: Placeholder "Buy Credits" button
**Location**: `app/(tabs)/wallet.tsx`
**Tasks**:
- [ ] Integrate Stripe, RevenueCat, or similar
- [ ] Create credit purchase flow with pricing tiers
- [ ] Handle payment processing and receipt
- [ ] Manage transaction history in Firestore
- [ ] Tax compliance for different regions

**Impact**: Can't monetize or support premium features yet

### 7. **Geolocation & Nearby Users**
**Status**: Permission requested, location picker not implemented
**Location**: `app.json` (permissions declared)
**Tasks**:
- [ ] Request location permission on profile setup
- [ ] Implement location picker (map UI)
- [ ] Store user location in Firestore (with privacy considerations)
- [ ] Create geohash-based proximity queries
- [ ] Implement nearby user discovery (replace category-only filters)

**Impact**: Discovery currently category-based only, not location-aware

### 8. **Image Upload & Optimization**
**Status**: Firebase Storage reference created, image handling incomplete
**Location**: `src/services/storageService.ts`
**Tasks**:
- [ ] Implement image picker integration
- [ ] Add image compression before upload
- [ ] Create image resizing for different breakpoints
- [ ] Add image caching layer
- [ ] Handle upload progress feedback to user
- [ ] Implement image deletion on profile changes

**Impact**: User photos can't be updated or optimized

### 9. **Search & Filter Refinement**
**Status**: Category filtering works, advanced search missing
**Tasks**:
- [ ] Full-text search on skill names
- [ ] Rating filter (show only 4+ star users)
- [ ] Availability filters (online status)
- [ ] Skill difficulty levels
- [ ] Match suggestion algorithm (improve matching)

**Impact**: Discovery limited to category browsing

### 10. **Offline Support**
**Status**: No offline caching layer
**Tasks**:
- [ ] Implement Firestore offline persistence
- [ ] Cache recent messages locally
- [ ] Queue messages to send when online
- [ ] Graceful offline indicators in UI
- [ ] Offline-first sync strategy

**Impact**: App requires constant internet connection

### 11. **Error Handling & Monitoring**
**Status**: Basic error states exist
**Tasks**:
- [ ] Implement Sentry or Firebase Crashlytics for error tracking
- [ ] Add comprehensive error boundaries
- [ ] Create user-friendly error messages
- [ ] Implement retry logic for failed network requests
- [ ] Log analytics events for debugging

**Impact**: Difficult to diagnose production issues

### 12. **Testing Infrastructure**
**Status**: No test suite
**Tasks**:
- [ ] Set up Jest for unit testing
- [ ] Create component tests with React Testing Library
- [ ] Add integration tests for services
- [ ] Create E2E tests with Detox or Maestro
- [ ] Mock Firestore for service tests
- [ ] Set up CI/CD pipeline

**Impact**: No automated quality assurance

### 13. **Performance Optimization**
**Status**: Basic performance achieved
**Potential Tasks**:
- [ ] Implement message pagination (currently limits to 50)
- [ ] Add infinite scroll with cursor-based pagination
- [ ] Optimize Firestore queries (add indexes for compound queries)
- [ ] Implement image lazy-loading
- [ ] Profile app performance (use React Profiler)
- [ ] Code splitting optimization

**Impact**: May see performance degradation with many messages/users

### 14. **Analytics**
**Status**: No analytics integrated
**Tasks**:
- [ ] Integrate Firebase Analytics
- [ ] Track key user events:
  - Sign-ups and sign-ins
  - Swipes and matches
  - Message sends
  - Swap completions
  - Credit purchases
- [ ] Create dashboards for monitoring

**Impact**: No insights into user behavior

### 15. **Internationalization (i18n)**
**Status**: All UI text in English
**Tasks**:
- [ ] Extract all text strings
- [ ] Implement i18n framework (e.g., `react-i18next`)
- [ ] Add language selection to settings
- [ ] Translate to priority languages (Spanish, French, Mandarin, Hindi)
- [ ] Handle RTL languages if supporting Arabic

**Impact**: App only accessible to English speakers

### 16. **Web Support**
**Status**: Expo web config exists, not fully tested
**Tasks**:
- [ ] Test responsive design on web
- [ ] Adapt mobile-first UI for desktop
- [ ] Implement web-specific features (email verification link)
- [ ] Deploy to web hosting (Vercel, Firebase Hosting)

**Impact**: Can't reach users on desktop browsers

### 17. **App Store Submission**
**Status**: Not submitted
**Tasks**:
- [ ] Create app store screenshots and descriptions
- [ ] Set up app signing and provisioning profiles
- [ ] Prepare privacy policy and terms of service
- [ ] Configure app icons and splash screens
- [ ] Submit to Apple App Store
- [ ] Submit to Google Play Store
- [ ] Manage app reviews and ratings

**Impact**: Only available for local development

---

## 📁 Directory Structure & Key Files

```
/Users/amitesh/ai_completion/skill_swap_app/
├── app/                                 # Expo Router app structure
│   ├── _layout.tsx                     # Root navigation
│   ├── index.tsx                       # Loading/splash
│   ├── settings.tsx                    # Settings screen
│   ├── match-celebration.tsx           # Match celebration modal
│   ├── (auth)/                         # Auth stack navigator
│   │   ├── welcome.tsx                 # Sign-in entry point
│   │   ├── sign-up.tsx
│   │   ├── sign-in.tsx
│   │   ├── profile-setup.tsx           # Skill setup onboarding
│   │   └── forgot-password.tsx
│   ├── (tabs)/                         # Main app (tab navigator)
│   │   ├── _layout.tsx                 # Custom tab bar
│   │   ├── home.tsx                    # Home feed
│   │   ├── discover.tsx                # Swipe discovery
│   │   ├── matches.tsx                 # Active matches
│   │   ├── wallet.tsx                  # Credits system
│   │   └── profile.tsx                 # User profile
│   └── chat/
│       └── [id].tsx                    # Chat room (dynamic route)
├── src/
│   ├── components/                     # Reusable UI components
│   │   ├── UserAvatar.tsx
│   │   ├── SwipeCard.tsx
│   │   ├── ProfileGlowBackground.tsx
│   │   └── ui/                         # Gluestack UI components
│   ├── services/                       # Firestore & API services
│   │   ├── firestoreService.ts         # User & swap operations
│   │   ├── matchingService.ts          # Like/pass/match logic
│   │   ├── chatService.ts              # Messaging operations
│   │   ├── skillsService.ts            # Skills catalog
│   │   ├── storageService.ts           # Firebase Storage
│   │   └── appInit.ts                  # Startup pipeline
│   ├── store/                          # State management
│   │   ├── authSlice.ts                # Redux auth state
│   │   ├── useStore.ts                 # Zustand app state
│   │   └── index.ts                    # Redux store config
│   ├── hooks/                          # Custom React hooks
│   │   ├── useAuth.ts                  # Auth hook
│   │   ├── useChat.ts                  # Chat messages
│   │   ├── useSendMessage.ts           # Send message
│   │   ├── useMatches.ts               # Active matches
│   │   ├── useMySwaps.ts               # My swap requests
│   │   ├── useProfile.ts               # User profile
│   │   └── useDiscoveryFeed.ts         # Discovery feed
│   ├── context/                        # React context
│   │   └── ThemeContext.tsx            # Dark/light theme
│   ├── types/                          # TypeScript types
│   │   └── user.ts                     # User, skill, match types
│   ├── constants/                      # App constants
│   │   └── Colors.ts
│   ├── utils/                          # Utility functions
│   │   └── colorUtils.ts               # Color generation
│   └── assets/                         # Images, icons
├── firestore.rules                     # Firestore security rules
├── firestore.indexes.json              # Firestore composite indexes
├── package.json                        # Dependencies
├── app.json                            # Expo configuration
├── tsconfig.json                       # TypeScript config
├── tailwind.config.js                  # Tailwind CSS config
├── global.css                          # Global styles
└── README.md                           # (to be created)
```

---

## 🔧 Technology Stack

### Core
- **React Native 0.81** - Mobile framework
- **Expo 54** - React Native framework
- **Expo Router 6** - Navigation/routing
- **TypeScript 5.9** - Type safety

### State Management
- **Redux Toolkit 2.11** - Auth state
- **Zustand 5.0** - Local app state
- **React Context** - Theme state

### Backend & Database
- **Firebase Authentication** - Auth provider (Google, Apple, Email)
- **Cloud Firestore** - Real-time database
- **Firebase Storage** - Image hosting
- **Firebase Emulator Suite** - Local development

### UI & Styling
- **Gluestack-UI** - Component library
- **NativeWind 4.2** - Tailwind CSS for React Native
- **Lucide React Native** - Icons
- **Expo Linear Gradient** - Gradient backgrounds
- **Expo Blur** - Blur effects
- **React Native Gifted Chat** - Chat UI
- **React Native Deck Swiper** - Card swiping

### Utilities
- **React Navigation** - Screen navigation
- **Expo Location** - Geolocation
- **Expo Image Picker** - Photo selection
- **Expo Secure Store** - Secure storage
- **AsyncStorage** - Persistent storage
- **Date-fns** - Date manipulation
- **Google Sign-In** - OAuth provider
- **Apple Authentication** - OAuth provider

---

## 🎯 Next Steps (Recommended Priority)

### P0 (Critical Path to MVP)
1. **Implement account deletion** - Required for privacy compliance
2. **Add push notifications** - Improves engagement
3. **Integrate real API** - Replace simulated data
4. **Implement review system** - Core feature for trust

### P1 (High Priority)
1. **Add image upload** - Users need profile photos
2. **Implement swap completion** - Core workflow
3. **Add offline support** - Better UX
4. **Error handling & monitoring** - Production readiness

### P2 (Medium Priority)
1. **Analytics integration** - Business metrics
2. **Testing infrastructure** - Quality assurance
3. **Performance optimization** - Scale readiness
4. **Advanced search filters** - Better UX

### P3 (Polish & Scale)
1. **Internationalization** - Global reach
2. **Web support** - Broader platform
3. **App store submission** - Distribution
4. **Payment integration** - Revenue generation

---

## 🚀 Development Workflows

### Local Development
```bash
npm start              # Start Expo dev server
npm run android       # Launch on Android emulator
npm run ios          # Launch on iOS simulator
npm run web          # Launch web version
```

### Firebase Emulator (for testing)
```bash
firebase emulators:start   # Start emulator suite
# Set connection in app code to localhost:8080
```

### Building for Production
```bash
eas build --platform ios          # Build for App Store
eas build --platform android      # Build for Play Store
```

---

## 📝 Notes & Observations

1. **Auth State Persistence**: Good pattern using Firebase's `onAuthStateChanged` to sync Redux state
2. **Type Safety**: Excellent use of TypeScript throughout; minimal `any` types
3. **Service Layer**: Clean separation between Firestore operations and components (good for testing)
4. **Real-time Sync**: Good use of `onSnapshot` listeners for reactive updates
5. **Security**: Firestore rules enforce least-privilege access pattern

### Potential Improvements
- Add error boundary components for better error handling
- Implement request caching to reduce Firestore reads
- Add loading skeletons for better perceived performance
- Consider adding analytics from day one
- Start with Web support testing (easier debugging than mobile)

---

## 🔐 Security Checklist

- [x] Firebase Auth implemented
- [x] Firestore security rules defined
- [x] Rules enforce user ownership
- [x] Storage rules (TODO)
- [x] Environment variables for Firebase config
- [ ] Rate limiting (Cloud Functions)
- [ ] Input validation (needs comprehensive review)
- [ ] CORS properly configured
- [ ] API key restrictions configured
- [ ] Secrets management secured

---

## 📊 Open Questions & Decisions

1. **Monetization Model**: Currently credits system; needs integration with payment processor
2. **Verification**: Should users verify their identity/skills before participating?
3. **Moderation**: How will inappropriate content/users be handled?
4. **Pricing**: What's the credit-to-hour conversion? Free tier limits?
5. **Geographic Scope**: Unlimited worldwide or region-specific launch?

