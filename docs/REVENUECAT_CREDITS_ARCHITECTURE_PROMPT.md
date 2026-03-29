# SkillSwap RevenueCat and Credits Architecture Prompt

**Purpose:** Reusable prompt for Kimi/Codex to design a production-ready monetization architecture for SkillSwap.  
**Audience:** Engineers and AI agents working on subscriptions, purchases, wallet, credits, and backend trust boundaries.  
**Source of truth:** [docs/SKILLSWAP_SYSTEM_DESIGN_AND_SRS.md](/Users/amitesh/ai_completion/skill_swap_app/docs/SKILLSWAP_SYSTEM_DESIGN_AND_SRS.md)

## Current Repo Context

Use this prompt when you want an AI model to propose the production design for:

- RevenueCat subscriptions
- one-time credit packs
- backend-managed credits
- Firestore schema
- Cloud Functions and webhook flows
- wallet UI and migration off legacy local credit state

Relevant current-state facts:

- SkillSwap uses Expo Router + React Native + TypeScript
- Backend stack is Firebase Auth + Firestore + Cloud Functions
- The canonical SRS requires Firestore as the operational source of truth
- Credits must be backend-managed through immutable ledger entries plus `users/{uid}.credits`
- Current wallet and credits behavior still has legacy local-state usage in `src/store/useStore.ts`
- RevenueCat is not yet integrated in the app

## Prompt To Paste Into Kimi

```text
You are reviewing the SkillSwap mobile app architecture and must propose a production-ready implementation for RevenueCat subscriptions and a credits system.

Repository context:
- App: Expo Router + React Native + TypeScript
- Backend: Firebase Auth, Firestore, Firebase Storage, Cloud Functions
- Canonical architecture doc: /Users/amitesh/ai_completion/skill_swap_app/docs/SKILLSWAP_SYSTEM_DESIGN_AND_SRS.md

You must align your answer with this architecture:
1. Firestore is the single source of truth for domain data.
2. Client handles UX, subscriptions, optimistic rendering, and safe writes only.
3. Cloud Functions own trusted writes, side effects, counters, notifications, ledger, and projections.
4. Client must never directly mint, spend, or adjust credits as source of truth.
5. Credits must be represented with:
   - immutable ledger entries
   - backend-managed `users/{uid}.credits` projection
6. No new parallel production state store.

Current app reality to account for:
- Wallet/credits still have legacy local-state behavior
- RevenueCat is not yet integrated
- Existing SRS already mentions `creditLedger/{autoId}` and backend-owned projections
- Need a real subscription + entitlement + credit grant model
- Need schema, flow, backend ownership, client UX, and migration guidance

Your task:
Design a complete production architecture and implementation plan for:
1. RevenueCat subscription integration
2. Purchase/entitlement syncing
3. Credit packs vs recurring subscriptions
4. Credit wallet system
5. Firestore schema
6. Cloud Functions / webhooks / backend events
7. Security rules boundaries
8. Client screens and state flow
9. Idempotency and fraud prevention
10. Migration from current local wallet logic

Answer structure:
1. Executive recommendation
2. Whether SkillSwap should use:
   - subscriptions only
   - credit packs only
   - or subscriptions + one-time credit packs
   Recommend one and justify it.
3. RevenueCat integration design
   Include SDK placement, customer identity mapping, entitlements, offerings, products, restore purchases, and app startup flow.
4. Firestore schema design
   Give exact recommended collections/documents/fields for:
   - users/{uid}
   - creditLedger/{autoId}
   - subscriptions/{uid} or equivalent if needed
   - purchases/{autoId} if needed
   - webhook event dedup store if needed
5. Backend event flow
   Describe exact write ownership and sequence for:
   - initial subscription purchase
   - subscription renewal
   - cancellation / expiration
   - one-time credit purchase
   - credit spend
   - refund / revocation
   - restore purchases
6. Cloud Functions design
   Recommend specific callable functions, Firestore triggers, scheduled jobs, and RevenueCat webhook handlers.
   Include idempotency strategy for every money-related flow.
7. Security model
   Explain what the client can read/write and what must be backend-only.
8. Client implementation plan
   Explain screens, hooks, services, caching, and how wallet/subscription UI should work in Expo/React Native.
9. Migration plan
   Explain how to move from current local wallet logic to Firestore + backend-owned credits safely.
10. Testing plan
   Include sandbox testing, RevenueCat test users, edge cases, refunds, duplicate webhooks, offline behavior, and restore flows.
11. Final recommendation
   Provide a clear “build this” architecture with no ambiguity.

Important constraints:
- Prefer Firestore + Cloud Functions, not a separate server
- Keep exact field names compatible with the SkillSwap SRS where possible
- Do not suggest client-owned credits as source of truth
- Do not suggest Zustand for production wallet state
- Make the plan specific enough that an engineer can implement it directly

Where helpful, include:
- exact Firestore document examples
- webhook payload handling strategy
- dedup key strategy
- entitlement-to-credit mapping examples
- subscription tier examples
- one-time pack examples

Be explicit about:
- what RevenueCat stores
- what Firestore stores
- what Cloud Functions compute
- what the app reads
- how credits are granted and consumed safely
```

## Expected Output

Ask the model for a decision-complete answer that covers:

- the recommended monetization model
- exact Firestore schema
- RevenueCat integration architecture
- backend and webhook flows
- app-side integration plan
- migration off local credits
- fraud and idempotency handling

## Default Assumptions

- Preferred recommendation: `subscriptions + optional one-time credit packs`
- Subscription tiers may grant entitlements plus periodic credit grants
- Credits remain backend-managed through immutable ledger entries and a user balance projection
- RevenueCat is the purchase and entitlement layer, while Firestore remains the product’s operational source of truth
