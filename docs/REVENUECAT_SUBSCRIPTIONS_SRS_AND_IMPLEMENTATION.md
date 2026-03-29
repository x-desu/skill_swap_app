# SkillSwap RevenueCat, subscriptions, and credits

**Status:** Implementation guide  
**Last updated:** March 28, 2026  
**Related:** [SKILLSWAP_SYSTEM_DESIGN_AND_SRS.md](./SKILLSWAP_SYSTEM_DESIGN_AND_SRS.md) (if present)

## 1. Purpose

Define production monetization for SkillSwap using:

- **RevenueCat** for purchases, offerings, entitlements, and storefront abstraction
- **Firestore** for wallet balance projections and subscription mirrors (operational UX)
- **Cloud Functions** for RevenueCat webhooks, idempotent credit grants, secured spend, and new-user credit seeding

**Principles**

1. RevenueCat is the purchase layer; Firestore **credits** and subscription mirror fields are **server-owned**.
2. The client never treats purchase success as proof of credits; the **webhook** (and secured callables) are authoritative.
3. `app_user_id` in RevenueCat **must** equal Firebase Auth `uid`.
4. **Prices and currency** in UI come from the store via RevenueCat (`priceString`) or `Intl.NumberFormat`; never hardcode `$`.

## 2. RevenueCat dashboard configuration

### 2.1 Entitlement

- **Entitlement id:** `skillswap_plus` (configure in RevenueCat; override via `extra.revenueCatEntitlementId` in app config if needed).

### 2.2 Three-tier commercial model (price anchors)

Target **US storefront anchors** roughly **$2.49 / $4.99 / $9.99** (tune in App Store Connect / Play Console). Example internal product ids (replace with your real ids):

| Tier        | Example store product id   | Example package id (offering) | Credit grant (example) |
| ----------- | ---------------------------- | ----------------------------- | ----------------------- |
| Starter     | `skillswap_credits_starter`  | `starter`                     | 50                      |
| Plus        | `skillswap_credits_plus`     | `plus`                        | 120                     |
| Pro         | `skillswap_credits_pro`      | `pro`                         | 300                     |

**v1 product type (choose one in dashboard):**

- **Option A:** Three **auto-renewable** subscriptions, each with a recurring credit allowance per period.
- **Option B:** Three **non-consumable / consumable (credit pack)** one-time products.

Grants are **not** hardcoded in the app. Map `product_id` → credits in Cloud Functions env **`PRODUCT_CREDIT_GRANTS`** (JSON object). Subscriptions can use the same map on **INITIAL_PURCHASE** and **RENEWAL** (and tune policy per `event.type`).

### 2.3 Offering

- Create one **current** offering containing **three packages** aligned with the table above.
- The paywall renders up to **three** packages from `offerings.current.availablePackages` (dashboard order or app-configured sort).

### 2.4 Webhook

- Point RevenueCat to: `https://<region>-<project>.cloudfunctions.net/revenueCatWebhook`
- Set **Authorization** header to: `Bearer <REVENUECAT_WEBHOOK_SECRET>` (must match Functions env).

## 3. Firestore schema

### 3.1 `users/{uid}`

**Client-writable:** profile fields only (see security rules). **Server-writable:** wallet and subscription projections.

| Field                     | Owner   | Description                                      |
| ------------------------- | ------- | ------------------------------------------------ |
| `credits`                 | Server  | Cached balance (number)                          |
| `subscriptionTier`       | Server  | Optional label from product / policy             |
| `subscriptionStatus`     | Server  | e.g. `active`, `expired`, `cancelled`           |
| `subscriptionProductId`  | Server  | Active product id                                |
| `subscriptionExpiresAt`  | Server  | Firestore `Timestamp`                            |
| `hasPremiumAccess`       | Server  | From entitlement                                 |
| `revenueCatAppUserId`    | Server  | Echo / audit; should match `uid`                  |

Initial **`credits`** for new accounts is set by **`seedNewUserCredits`** (default `10`) when the first document is created **without** `credits`.

### 3.2 `creditLedger/{id}`

Immutable ledger (append-only by Functions).

```json
{
  "userId": "uid",
  "delta": 50,
  "balanceAfter": 60,
  "reason": "credit_pack_purchase",
  "referenceType": "revenuecat_event",
  "referenceId": "<event.id>",
  "productId": "skillswap_credits_starter",
  "createdAt": "timestamp",
  "createdBy": "backend"
}
```

### 3.3 `subscriptions/{uid}`

Optional detailed mirror for support and UI; server-writable only.

### 3.4 `purchaseEvents/{eventId}`

Idempotency store; `eventId` = RevenueCat `event.id`. **No client access.**

## 4. Schema verification checklist

- [ ] Types in [src/types/user.ts](../src/types/user.ts) include optional subscription fields consistent with projections.
- [ ] Ledger type in [src/types/credits.ts](../src/types/credits.ts) matches what Functions write.
- [ ] Firestore Console: collections `creditLedger`, `purchaseEvents`, and optionally `subscriptions` exist after first traffic.
- [ ] Deploy composite index: `creditLedger` — `userId` ASC, `createdAt` DESC ([firestore.indexes.json](../firestore.indexes.json)).

## 5. Security rules (summary)

Implemented in [firestore.rules](../firestore.rules):

- **`users/{uid}`:** owner may **create** without server-only fields; owner **update** must not touch server-only keys (diff guard).
- **`creditLedger`:** owner may **read** documents where `userId == uid`; **no client writes**.
- **`subscriptions/{uid}`:** owner **read**; **no client writes**.
- **`purchaseEvents`:** **deny all** client access.

## 6. Cloud Functions

| Function              | Type        | Role                                                    |
| --------------------- | ----------- | ------------------------------------------------------- |
| `revenueCatWebhook`   | HTTP `POST` | Verify `Authorization`, parse event, dedupe, grant      |
| `seedNewUserCredits`  | Firestore   | `onCreate(users/{uid})` — set initial credits if missing |
| `spendCredits`        | Callable    | Auth-only; transactional spend + ledger                 |

**Environment (Firebase Functions config / secrets):**

- `REVENUECAT_WEBHOOK_SECRET` — Bearer token secret from RevenueCat.
- `PRODUCT_CREDIT_GRANTS` — JSON, e.g. `{"skillswap_credits_starter":50}`.
- `INITIAL_USER_CREDITS` — optional number (default `10`).

## 7. Client architecture

| Piece                     | Path |
| ------------------------- | ---- |
| RevenueCat bootstrap      | [src/services/revenueCatService.ts](../src/services/revenueCatService.ts) |
| Auth linkage              | [app/_layout.tsx](../app/_layout.tsx) — `logIn` / `logOut` with Firebase `uid` |
| Purchase hook             | [src/hooks/usePurchases.ts](../src/hooks/usePurchases.ts) |
| Paywall UI                | [app/paywall.tsx](../app/paywall.tsx) |
| Customer Center           | [src/components/CustomerCenter.tsx](../src/components/CustomerCenter.tsx) |
| Wallet integration        | [app/(tabs)/wallet.tsx](../app/(tabs)/wallet.tsx) |
| Strings                   | [src/i18n/locales/](../src/i18n/locales/) |
| API keys / entitlement id | `app.json` → `expo.extra` (see below) |

### 7.1 RevenueCat Configuration

**API Keys (configured in `src/services/revenueCatService.ts`):**

```typescript
// Test keys - Replace with production keys from RevenueCat Dashboard
const IOS_API_KEY = 'test_TCYobYBTvsJfvNFHFKJcmIpgzOh';
const ANDROID_API_KEY = 'test_TCYobYBTvsJfvNFHFKJcmIpgzOh';
```

**Expo `extra` (optional override in app.json):**

```json
"extra": {
  "revenueCatIosApiKey": "test_TCYobYBTvsJfvNFHFKJcmIpgzOh",
  "revenueCatAndroidApiKey": "test_TCYobYBTvsJfvNFHFKJcmIpgzOh",
  "revenueCatEntitlementId": "skillswap_pro",
  "paywallPrivacyUrl": "https://example.com/privacy",
  "paywallTermsUrl": "https://example.com/terms"
}
```

### 7.2 Three-Tier Subscription Model

The paywall presents **three subscription tiers** from RevenueCat offerings:

| Tier        | RevenueCat Product ID      | Package ID | Credit Grant | Type         |
| ----------- | -------------------------- | ---------- | ------------ | ------------ |
| **Monthly** | `skillswap_monthly`        | `monthly`  | 100/month    | Subscription |
| **Yearly**  | `skillswap_yearly`         | `yearly`   | 1200/year    | Subscription |
| **Lifetime**| `skillswap_lifetime`       | `lifetime` | 5000 once    | Non-consumable|

**Entitlement:** All tiers grant the `skillswap_pro` entitlement.

### 7.3 Key Features

1. **Live Map Paywall:** Hero section shows real-time `MapView` with user's location and premium reach visualization
2. **Localized Pricing:** Uses `StoreProduct.priceString` from RevenueCat for automatic currency localization
3. **Customer Center:** Full subscription management screen at `/customer-center`
4. **Wallet Integration:** Shows Pro status and subscription management in wallet screen
5. **Credit System:** Backend-managed credits via Cloud Functions webhook

### 7.4 Usage Examples

**Check Pro Status:**
```typescript
const { isPro, proEntitlement } = usePurchases(user?.uid);
```

**Present Paywall:**
```typescript
router.push('/paywall');
```

**Open Customer Center:**
```typescript
router.push('/customer-center');
```

**Native builds:** `react-native-purchases` and `react-native-maps` require a **development build** (not Expo Go). Configure **Google Maps API key** for Android (and iOS if using Google provider) per [Expo MapView docs](https://docs.expo.dev/versions/latest/sdk/map-view/).

## 8. Paywall UX and design spec

Reference mockups (repo): [docs/assets/paywall/](assets/paywall/) (PNG exports of layout references).

### 8.1 Layout

1. **Hero (top):** Live **`MapView`** — not a static image. Initial region from **`expo-location`** when permitted; else fallback from user profile `location` or a default world city.
2. **Map overlays**
   - **Circle:** Large semi-transparent fill (~teal `#00BFA5`–`#00C2A0`, low alpha) centered on map focus (“premium reach” metaphor; copy is SkillSwap-specific).
   - **Marker (optional):** Single pin at center (e.g. “You”).
   - **Chrome:** Close (leading), **Restore** (trailing), safe area padding.
   - **`showsUserLocation`:** Only when location permission granted and product policy allows.
3. **Bottom sheet:** Rounded top, light background; headline; subtitle; **three** selectable tier cards in a row; trust line; **Continue**; footer links (Privacy, Terms, optional “Other plans”).

### 8.2 Selection and purchase

- One selected card: teal border + light tint; default **middle** card as “popular” if three packages exist.
- **Continue** → `Purchases.purchasePackage(package)`.
- **Restore** → `Purchases.restorePurchases()`.

## 9. Localization: language and currency

### 9.1 UI language

- Use `expo-localization` + JSON locale files under `src/i18n/locales/<lang>/paywall.json`.
- Fallback: `en`.

### 9.2 Currency

- Display list prices with **`StoreProduct.priceString`** from RevenueCat (store-localized).
- For **derived** amounts (e.g. per day), use numeric `price` + `currencyCode` when exposed by the SDK and format with **`Intl.NumberFormat`** and the device locale — never prepend `$` manually.

### 9.3 Currency checklist

- [ ] Sandbox with non-US Apple ID / Play profile.
- [ ] Grep project for literal `$` in purchase UI (should be none except unrelated UI).
- [ ] Restore + error strings present in locale files.

## 10. Migration and rollout

1. Deploy **Functions** (`revenueCatWebhook`, `seedNewUserCredits`, `spendCredits`).
2. Set **secrets** / env for webhook + `PRODUCT_CREDIT_GRANTS`.
3. Remove client writes to **`credits`** and subscription fields (already guarded by rules).
4. Deploy **Firestore rules** and **indexes**.
5. Ship app with **dev build** + RevenueCat keys in `extra`.
6. Configure RevenueCat webhook and run a **sandbox** purchase end-to-end.

## 11. Testing

- Sandbox purchase → webhook → ledger row + `users.credits` updated.
- Replay same webhook `event.id` → no double grant.
- Rules: client `update` with `credits` rejected.
- Callable `spendCredits` with insufficient balance rejected.
