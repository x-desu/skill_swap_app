# SkillSwap Subscription Feature Gating SRS

**Status:** Draft  
**Date:** March 28, 2026  
**Author:** SkillSwap Engineering  

---

## 1. Purpose

This SRS defines the feature gating strategy for SkillSwap's freemium model. It specifies which features are available to free users vs. Pro subscribers, and when paywalls should be triggered to maximize conversion while maintaining user engagement.

---

## 2. Subscription Tiers

### 2.1 Free Tier (Default)
- **Target:** New users, trial experience
- **Goal:** Hook users with core value, convert to Pro

### 2.2 Pro Tier (skillswap_pro entitlement)
- **Target:** Active users who want full experience
- **Benefits:** Unlimited access, premium features

---

## 3. Feature Matrix

| Feature | Free | Pro | Paywall Trigger |
|---------|------|-----|-----------------|
| Profile creation | ✅ | ✅ | Never |
| View matches | ✅ | ✅ | Never |
| Chat (1:1) | ✅ | ✅ | Never |
| Swipe/Discover | 5/day | Unlimited | After 5th swipe |
| Active matches | 2 max | Unlimited | When trying to create 3rd |
| Credits | 10 (one-time) | Monthly grant | N/A |
| Credit purchase | ❌ | ✅ | Press "Buy Credits" |
| Advanced filters | ❌ | ✅ | Press filter icon |
| Read receipts | ❌ | ✅ | When viewing chat |
| Priority listing | ❌ | ✅ | Auto-applied |
| Unlimited messages | ❌ | ✅ | After 20 messages/day |
| See who liked you | ❌ | ✅ | Tap "See who liked you" |
| Undo last swipe | ❌ | ✅ | Shake gesture or tap undo |
| Pro badge | ❌ | ✅ | Profile display |

---

## 4. Paywall Trigger Points

### 4.1 Swipe Limiting (High Priority)

**Free User Limit:** 5 swipes per day (right or left)

**Implementation:**
```typescript
// In discover/swipe screen
const SWIPE_LIMIT_FREE = 5;
const swipeCount = await getDailySwipeCount(user.uid);

if (swipeCount >= SWIPE_LIMIT_FREE && !isProUser) {
  showPaywall({
    reason: 'swipe_limit',
    title: "You've reached your daily limit",
    message: "Upgrade to Pro for unlimited swipes and connect with more people today!",
    cta: "Upgrade to Pro"
  });
  return;
}
```

**UI Behavior:**
- Counter in top-right: "2/5 swipes left"
- Turns amber at 3, red at 1
- Tapping "Get More" opens paywall

### 4.2 Active Match Limiting

**Free User Limit:** 2 concurrent active matches

**Implementation:**
```typescript
// When mutual match detected
const activeMatches = await getActiveMatchCount(user.uid);

if (activeMatches >= 2 && !isProUser) {
  showPaywall({
    reason: 'match_limit',
    title: "Match limit reached",
    message: "You have 2 active connections. Upgrade to chat with more people simultaneously!",
    cta: "Unlock Unlimited"
  });
  // Match is still created, but user must upgrade to chat
  return;
}
```

**UI Behavior:**
- Lock icon on 3rd+ match cards
- "Upgrade to chat" button instead of message input
- Existing 2 matches work normally

### 4.3 Message Limiting (Soft Limit)

**Free User Limit:** 20 messages per day per match

**Implementation:**
```typescript
// In chat screen, before sending
const messageCount = await getDailyMessageCount(matchId, user.uid);

if (messageCount >= 20 && !isProUser) {
  showPaywall({
    reason: 'message_limit',
    title: "Daily message limit reached",
    message: "You're having great conversations! Upgrade to keep chatting without limits.",
    cta: "Keep Chatting"
  });
  return;
}
```

### 4.4 Credit Purchase Gate

**Free User:** Cannot purchase credits directly
**Pro User:** Can purchase credits via wallet

**Implementation:**
```typescript
// In wallet screen
if (!isProUser) {
  // Show "Upgrade to Pro" instead of "Buy Credits"
  // Credits button opens paywall, not credit store
}
```

### 4.5 Advanced Filters Gate

**Free User:** Basic filters only (distance, age)
**Pro User:** All filters (skills, availability, rating)

**Implementation:**
```typescript
// In filter modal
if (filterType === 'advanced' && !isProUser) {
  showPaywall({
    reason: 'advanced_filters',
    title: "Advanced filters are Pro only",
    message: "Find the perfect match by skills, rating, and availability.",
    cta: "Get Pro Filters"
  });
  return;
}
```

### 4.6 "See Who Liked You" Gate

**Free User:** Cannot view incoming likes list
**Pro User:** Full likes preview

**Implementation:**
```typescript
// In matches/likes tab
if (!isProUser) {
  // Show blurred avatars with count
  // "5 people liked you - Upgrade to see them"
}
```

---

## 5. Client Implementation

### 5.1 useSubscriptionStatus Hook

```typescript
// src/hooks/useSubscriptionStatus.ts
export function useSubscriptionStatus() {
  const { customerInfo, isLoading } = usePurchases();
  
  const isPro = useMemo(() => {
    if (!customerInfo) return false;
    return customerInfo.entitlements.active['skillswap_pro'] !== undefined;
  }, [customerInfo]);
  
  return { 
    isPro, 
    isLoading,
    customerInfo 
  };
}
```

### 5.2 Feature Gate Component

```typescript
// src/components/FeatureGate.tsx
interface FeatureGateProps {
  feature: 'swipes' | 'matches' | 'messages' | 'filters' | 'credits';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { isPro } = useSubscriptionStatus();
  const { canAccess } = useFeatureLimit(feature);
  
  if (isPro || canAccess) {
    return <>{children}</>;
  }
  
  return fallback || <PaywallTrigger feature={feature} />;
}
```

### 5.3 PaywallTrigger Component

```typescript
// src/components/PaywallTrigger.tsx
interface PaywallTriggerProps {
  feature: string;
  reason: string;
}

export function PaywallTrigger({ feature, reason }: PaywallTriggerProps) {
  const router = useRouter();
  
  const config = {
    swipe_limit: {
      title: "Daily swipe limit reached",
      message: "Upgrade for unlimited swipes",
      icon: "ArrowLeftRight"
    },
    match_limit: {
      title: "Active match limit",
      message: "Upgrade to chat with more people",
      icon: "MessageCircle"
    },
    // ... more configs
  }[reason];
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push({
        pathname: '/paywall',
        params: { reason, feature }
      })}
    >
      <LinearGradient colors={['#ff1a5c', '#ff4d88']} style={styles.gradient}>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.message}>{config.message}</Text>
        <Text style={styles.cta}>Upgrade Now →</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
```

---

## 6. Backend Support

### 6.1 Firestore Schema Updates

```typescript
// Add to users/{uid} document
interface UserDocument {
  // ... existing fields
  
  // Feature usage tracking (reset daily via Cloud Function)
  dailyStats?: {
    date: string; // YYYY-MM-DD
    swipeCount: number;
    messageCount: number;
  };
}
```

### 6.2 Cloud Function: Daily Reset

```typescript
// functions/src/dailyReset.ts
export const resetDailyStats = onSchedule("0 0 * * *", async (event) => {
  const today = new Date().toISOString().split('T')[0];
  
  const usersSnapshot = await db.collection('users').get();
  const batch = db.batch();
  
  usersSnapshot.docs.forEach((doc) => {
    const userRef = doc.ref;
    batch.update(userRef, {
      'dailyStats.date': today,
      'dailyStats.swipeCount': 0,
      'dailyStats.messageCount': 0,
    });
  });
  
  await batch.commit();
});
```

### 6.3 Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      // Only user can read their own daily stats
      allow read: if request.auth.uid == uid;
      
      // Backend only writes to dailyStats
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## 7. Analytics & Tracking

### 7.1 Paywall Events

```typescript
// Track all paywall interactions
enum PaywallEvent {
  TRIGGERED = 'paywall_triggered',
  DISMISSED = 'paywall_dismissed',
  PURCHASE_STARTED = 'purchase_started',
  PURCHASE_COMPLETED = 'purchase_completed',
  PURCHASE_CANCELLED = 'purchase_cancelled',
}

// Properties to track
interface PaywallAnalytics {
  feature: string;        // 'swipe_limit', 'match_limit', etc.
  reason: string;         // Why paywall was shown
  userTier: 'free' | 'pro';
  dailySwipeCount?: number;
  dailyMessageCount?: number;
  activeMatchCount?: number;
}
```

### 7.2 Conversion Funnel

1. **Free User Onboarding**
   - Profile setup → Paywall shown (skip available) → App access
   
2. **Feature Gating Flow**
   - Use feature → Hit limit → Paywall shown → Purchase/Skip
   
3. **Retention Strategy**
   - Day 3: Show "Your 5 swipes reset!" notification
   - Day 7: "You've matched 3 times! Upgrade to chat with all of them"

---

## 8. Edge Cases & Error Handling

### 8.1 RevenueCat Sync Issues

**Scenario:** User purchased Pro but entitlement not showing
**Solution:** 
- Add "Restore Purchases" button in Settings
- Auto-restore on app launch
- Show "Checking subscription..." during restore

### 8.2 Offline Mode

**Scenario:** User hits limit while offline
**Solution:**
- Cache subscription status locally
- Allow limited actions offline
- Sync and enforce limits when online

### 8.3 Time Zone Issues

**Scenario:** User travels, daily reset is wrong time
**Solution:**
- Use user's local timezone from device
- Store timezone in user profile
- Reset at midnight local time

---

## 9. Testing Scenarios

### 9.1 Free User Journey

1. Create new account
2. Verify: 10 credits granted
3. Verify: 5 swipe limit enforced
4. Verify: 2 match limit enforced
5. Verify: paywall appears at limits
6. Verify: can skip paywall

### 9.2 Pro User Journey

1. Purchase subscription
2. Verify: unlimited swipes
3. Verify: unlimited matches
4. Verify: credits granted monthly
5. Verify: no paywalls for features

### 9.3 Upgrade/Downgrade

1. Subscribe to monthly
2. Verify credits granted
3. Upgrade to yearly
4. Verify prorated credits
5. Cancel subscription
6. Verify: retains credits, loses Pro at period end

---

## 10. Success Metrics

### 10.1 North Star
- **Paywall → Purchase conversion rate:** Target 5-8%
- **Free → Pro conversion:** Target 10% within 30 days

### 10.2 Secondary Metrics
- Average swipes before hitting limit: 4.2 (target: all 5)
- Paywall dismiss rate by feature
- Revenue per user (ARPU) by cohort
- Churn rate for Pro users

---

## 11. Implementation Phases

### Phase 1: Core Gating (MVP)
- [ ] Swipe limiting (5/day)
- [ ] Match limiting (2 active)
- [ ] Paywall UI with skip
- [ ] Subscription status hook

### Phase 2: Soft Limits
- [ ] Message limiting (20/day)
- [ ] Advanced filters gate
- [ ] "See who liked you" gate

### Phase 3: Polish
- [ ] Daily reset Cloud Function
- [ ] Timezone-aware resets
- [ ] Offline mode handling
- [ ] Analytics integration

---

**Document Status:** Ready for implementation  
**Next Steps:**
1. Create `useSubscriptionStatus` hook
2. Add swipe counter to discover screen
3. Implement `FeatureGate` component
4. Add paywall triggers at limit points
