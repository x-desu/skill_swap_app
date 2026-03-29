# Discover Tab SRS - SkillSwap v1.0

An enhanced Discover tab featuring swipe-based discovery with advanced filtering, location-based search, and extensible architecture for future AI-powered matchmaking.

---

## 1. Overview

### 1.1 Purpose
Redesign the Discover tab to provide a Tinder-style swipe interface with powerful filtering capabilities, location-based discovery, and a foundation for AI-powered recommendations.

### 1.2 Current State
- Discover tab exists at `app/(tabs)/discover.tsx` with basic swipe functionality
- Uses deprecated `useStore` (Zustand) with mock data
- Home tab (`app/(tabs)/home.tsx`) has superior UI/UX with category filters
- User location data exists in Firestore (`lat`, `lng` fields)

### 1.3 Target State
- Unified swipe interface combining Discover's swipe UX with Home's visual polish
- Real-time location-based filtering
- Advanced filters (skills, distance, rating, availability)
- Search functionality
- Extensible architecture for AI recommendations (Phase 2)

---

## 2. Functional Requirements

### 2.1 Core Swipe Interface
**ID**: DISC-001  
**Description**: Maintain Tinder-style card swiping with enhanced visuals

**Specifications**:
- Reuse existing `DraggableCard` component from current Discover
- Integrate `SwipeCard` component for profile display
- Support left swipe (pass), right swipe (like), and super-like (up swipe - future)
- Card stack with preview of next card (z-index layering)
- Smooth animations with rotation and opacity transitions
- "LIKE"/"NOPE" overlay badges during swipe

**Data Source**: Migrate from `useStore` to `useDiscoveryFeed` hook

---

### 2.2 Location-Based Discovery
**ID**: DISC-002  
**Description**: Filter users by geographical proximity

**Specifications**:
- Calculate distance between current user and potential matches using Haversine formula
- Filter options: 5km, 10km, 25km, 50km, 100km, Any distance
- Default: 25km radius
- Display distance on cards (e.g., "2.3 km away")
- Location permission handling with graceful degradation
- Use stored `lat`/`lng` from user profile

**Technical Approach**:
- Client-side distance calculation (Firebase doesn't support geo queries natively)
- Batch fetch users and filter by distance
- Future: Consider Firebase GeoFirestore or Algolia for scale

---

### 2.3 Skill-Based Filtering
**ID**: DISC-003  
**Description**: Filter by skills users teach or want to learn

**Specifications**:
- Filter by "I want to learn" (matches against user's `teachSkills`)
- Filter by "I can teach" (matches against user's `wantSkills`)
- Multi-select skill categories (Tech, Music, Art, Language, Sports, Business, Cooking)
- Searchable skill input with autocomplete
- "Match my skills" toggle (automatically match my teach with their want, and vice versa)

**UI Components**:
- Category pills (horizontal scroll) - reuse from Home tab
- Skill search input with suggestions
- Active filter chips with remove button

---

### 2.4 Advanced Filters Panel
**ID**: DISC-004  
**Description**: Bottom sheet with detailed filter options

**Specifications**:
- **Distance slider**: 5km to 100km with visual map preview
- **Rating filter**: Minimum rating (0-5 stars)
- **Availability**: Online now, Active today, Active this week
- **Credits**: Has credits to spend (for premium experience)
- **Verification**: Verified profiles only toggle
- **Clear all** button
- **Apply filters** button with count preview ("Show 24 people")

**UI Library**: Use `@gorhom/bottom-sheet` (already compatible with React Native 0.81.5)

---

### 2.5 Search Functionality
**ID**: DISC-005  
**Description**: Text-based search across user profiles

**Specifications**:
- Search by name, skill name, or bio keywords
- Real-time search as you type (debounced 300ms)
- Search results in card format (same as discovery)
- Empty state with "No matches found" message
- Recent searches (local storage)

---

### 2.6 Filter Persistence
**ID**: DISC-006  
**Description**: Remember user's filter preferences

**Specifications**:
- Save active filters to AsyncStorage
- Restore filters on app restart
- Reset to defaults option

---

## 3. UI/UX Specifications

### 3.1 Layout Structure

```
┌─────────────────────────────┐
│  🔍 Search Bar         ⚙️    │  ← Search + Filter Button
├─────────────────────────────┤
│  [All][Tech][Music][Art]... │  ← Category Pills (horizontal)
├─────────────────────────────┤
│                             │
│     ┌───────────┐          │
│     │  ┌─────┐  │          │  ← Card Stack (main content)
│     │  │  2  │  │          │     Preview card behind
│     │  └─────┘  │          │
│     │   Card 1  │          │
│     └───────────┘          │
│                             │
├─────────────────────────────┤
│    ❌              ❤️       │  ← Action Buttons (Pass/Like)
│   Pass             Like     │
└─────────────────────────────┘
```

### 3.2 Visual Design
- **Color scheme**: Match Home tab (Rose primary `#ff1a5c`, dark backgrounds)
- **Card design**: Use Home tab card style with gradient overlay
- **Typography**: Bold headers, muted secondary text
- **Animations**: Smooth 300ms transitions, spring physics for cards
- **Glassmorphism**: Use `expo-blur` for filter panel and search bar

### 3.3 Empty States
- **No filters match**: "No one matches your filters. Try adjusting your criteria."
- **Location permission denied**: "Enable location to discover people nearby"
- **Out of cards**: "You've seen everyone! Check back later."

---

## 4. Technical Architecture

### 4.1 Component Structure

```
app/(tabs)/discover.tsx (refactored)
├── DiscoverScreen (main container)
├── FilterBottomSheet (advanced filters)
├── SearchHeader (search + category pills)
├── CardStack (swipeable cards)
│   ├── DraggableCard (gesture handling)
│   └── SwipeCard (profile display)
└── ActionButtons (pass/like)
```

### 4.2 New Dependencies (Compatible Versions)

| Package | Version | Purpose | Compatibility |
|---------|---------|---------|---------------|
| `@gorhom/bottom-sheet` | `^4.6.4` | Filter panel | ✅ RN 0.81.5 |
| `@react-native-community/slider` | `^4.5.5` | Distance slider | ✅ RN 0.81.5 |
| `react-native-reanimated` | `~3.17.3` | Already installed | ✅ |
| `expo-location` | `^55.1.4` | Already installed | ✅ |

**No additional dependencies required** - can use existing:
- `expo-blur` for glass effects
- `lucide-react-native` for icons
- `react-native-reanimated` for animations
- `expo-location` for location services

### 4.3 Data Flow

```
User opens Discover tab
    ↓
useDiscoveryFeed hook fetches users from Firestore
    ↓
Active filters applied client-side (distance, skills, rating)
    ↓
Filtered users rendered as swipeable card stack
    ↓
User swipes → triggers likeUser() API call
    ↓
Mutual match? → Navigate to match-celebration screen
```

### 4.4 Hook: useDiscoverFilters

**Purpose**: Manage filter state and filtering logic

**Interface**:
```typescript
interface FilterState {
  maxDistance: number;        // km (5-100)
  categories: SkillCategory[]; // ['Tech', 'Music']
  searchQuery: string;        // text search
  minRating: number;          // 0-5
  onlineOnly: boolean;        // online now
  hasCredits: boolean;        // has credits to spend
  matchMySkills: boolean;     // skill matching
}

interface UseDiscoverFiltersReturn {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  filteredUsers: UserDocument[];
  applyFilters: (users: UserDocument[]) => UserDocument[];
}
```

---

## 5. Firebase Integration

### 5.1 Required Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isProfileComplete", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isProfileComplete", "order": "ASCENDING" },
        { "fieldPath": "lastActive", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 5.2 Location Calculation

**Haversine Formula** (client-side):
```typescript
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

---

## 6. AI Integration (Phase 2 - Future)

### 6.1 Recommendation Engine
**ID**: DISC-AI-001  
**Description**: AI-powered match suggestions

**Specifications**:
- Analyze user's swipe patterns (likes vs passes)
- Match based on skill complementarity (not just overlap)
- Consider conversation history quality
- Time-based recommendations (active users first)

**Implementation**:
- Store swipe history in Firestore `userBehavior` collection
- Cloud Function for batch recommendation scoring
- Integrate with OpenAI/Claude for skill matching analysis
- Cache recommendations in `aiRecommendations` subcollection

### 6.2 Smart Filtering
**ID**: DISC-AI-002  
**Description**: AI-suggested filters

**Specifications**:
- "People like you liked" automatic filter
- Trending skills in your area
- Recommended distance based on density

---

## 7. Performance Requirements

### 7.1 Pagination
- Fetch 20 users per batch
- Maintain 5-card buffer for smooth swiping
- Infinite scroll with cursor-based pagination

### 7.2 Caching
- Cache filtered results for 5 minutes
- Cache user location (update every 10 minutes)
- Image caching via `expo-image-picker` / `react-native-fast-image`

### 7.3 Optimization
- Debounce search input (300ms)
- Throttle distance calculations
- Lazy load filter panel (bottom sheet)

---

## 8. Accessibility

### 8.1 Requirements
- Screen reader support for cards
- VoiceOver/TalkBack labels for action buttons
- Reduce motion support (disable card animations)
- Sufficient color contrast (WCAG 2.1 AA)

### 8.2 Gestures
- Alternative to swipe: Tap pass/like buttons
- Double-tap to open profile detail view

---

## 9. Error Handling

### 9.1 Scenarios
| Scenario | Handling |
|----------|----------|
| Location permission denied | Show location button + fallback to city-only |
| Firestore fetch fails | Retry 3x, then show "Check connection" |
| No users in area | Show expand distance suggestion |
| Invalid filter combination | Show "Try fewer filters" message |

---

## 10. Testing Checklist

### 10.1 Functional Tests
- [ ] Swipe left passes user, removes from stack
- [ ] Swipe right creates like, triggers match check
- [ ] Distance filter updates card stack in real-time
- [ ] Category filter shows only matching skills
- [ ] Search returns name/skill matches
- [ ] Filters persist after app restart
- [ ] Bottom sheet opens/closes smoothly
- [ ] Empty states display correctly

### 10.2 Performance Tests
- [ ] Smooth 60fps card animations
- [ ] Filter application < 100ms
- [ ] Initial load < 2 seconds
- [ ] Handles 100+ cards without lag

### 10.3 Edge Cases
- [ ] User has no location set
- [ ] All users filtered out
- [ ] Rapid swiping (spam protection)
- [ ] Network offline during swipe

---

## 11. Implementation Phases

### Phase 1: Core Refactor (Week 1)
1. Replace `useStore` with `useDiscoveryFeed` in Discover tab
2. Reuse Home tab card design
3. Maintain existing swipe functionality

### Phase 2: Basic Filters (Week 2)
1. Add category filter pills
2. Implement skill search
3. Add filter state management

### Phase 3: Location & Advanced Filters (Week 3)
1. Add distance calculation
2. Implement filter bottom sheet
3. Add rating/availability filters

### Phase 4: Search & Polish (Week 4)
1. Add text search
2. Filter persistence
3. Empty states & error handling
4. Accessibility pass

### Phase 5: AI Foundation (Future)
1. Swipe analytics collection
2. Recommendation engine setup
3. Smart filters

---

## 12. Dependencies Summary

### No New Packages Required
All functionality can be built with existing dependencies:
- `react-native-reanimated` (animations)
- `expo-blur` (glass effects)
- `expo-location` (location services)
- `lucide-react-native` (icons)
- `@react-native-firebase/firestore` (data)

### Optional Enhancements (Future)
- `@gorhom/bottom-sheet` - For better filter panel UX
- `@react-native-community/slider` - For distance slider

---

## 13. File Structure

```
skill_swap_app/
├── app/
│   └── (tabs)/
│       └── discover.tsx          # Main discover tab (refactored)
├── src/
│   ├── hooks/
│   │   ├── useDiscoveryFeed.ts   # Existing - fetch users
│   │   ├── useDiscoverFilters.ts # NEW - filter state & logic
│   │   └── useUserLocation.ts    # NEW - location services
│   ├── components/
│   │   ├── FilterBottomSheet.tsx # NEW - advanced filters UI
│   │   ├── SearchHeader.tsx      # NEW - search + categories
│   │   ├── CardStack.tsx         # NEW - swipeable card container
│   │   ├── DraggableCard.tsx     # EXTRACT - from discover.tsx
│   │   └── SwipeCard.tsx         # Existing - profile display
│   ├── utils/
│   │   └── location.ts             # NEW - distance calculations
│   └── types/
│       └── discover.ts           # NEW - filter types
└── docs/
    └── DISCOVER_TAB_SRS.md       # This document
```

---

**Document Version**: 1.0  
**Created**: March 29, 2026  
**Status**: Ready for Implementation  
**Project**: skill_swap_app
