# SkillSwap

SkillSwap is a mobile-first skill exchange app built with Expo Router, React Native, Firebase, and TypeScript. Users create a profile, list skills they can teach and skills they want to learn, discover other people, propose swaps, chat in real time, start video calls, receive notifications, and buy credits or manage premium access.

This repository already contains several feature-specific SRS documents. The new main app documentation lives here:

- [App Documentation](docs/APP_DOCUMENTATION.md)

## What The App Does

- Supports Google, Apple, and email authentication.
- Onboards users with profile photo, location, bio, and skill setup.
- Shows two discovery experiences:
  `Home` for a curated card-based browse flow.
  `Discover` for swipe-style exploration with filters and credit gating.
- Converts likes into swap requests and mutual matches.
- Combines pending requests and active conversations into a single `Matches` area.
- Supports real-time chat, image messages, in-app notifications, and push notifications.
- Supports one-to-one video calling using Stream Video.
- Uses Razorpay for credit packs and RevenueCat for subscription management.

## Tech Stack

- Client: Expo 54, React Native 0.81, React 19, Expo Router, TypeScript
- State: Redux Toolkit
- UI: NativeWind, Gluestack UI, custom React Native styling
- Backend: Firebase Auth, Firestore, Storage, Cloud Functions
- Notifications: Expo Notifications
- Payments: Razorpay
- Subscriptions: RevenueCat
- Video: Stream Video SDK

## Project Structure

- `app/`: Expo Router screens and navigation
- `src/components/`: reusable UI and screen-level building blocks
- `src/hooks/`: client-side data hooks and feature hooks
- `src/services/`: Firebase, payment, storage, notification, and call services
- `src/store/`: Redux slices and store wiring
- `functions/src/`: Firebase Cloud Functions
- `docs/`: app docs, SRS documents, implementation plans, and architecture notes

## Run Locally

1. Install dependencies with `npm install`.
2. Add Firebase client config files:
   `GoogleService-Info.plist`
   `google-services.json`
3. Confirm `app.json` has the required Expo config, app identifiers, and `expo.extra` values.
4. Start the app with one of:
   `npm run start`
   `npm run ios`
   `npm run android`

## Important Configuration

- Firebase client setup is required for Auth, Firestore, Storage, and Functions.
- `app.json` includes `expo.extra.razorpayKeyId` for Razorpay checkout.
- RevenueCat is initialized from `src/services/revenueCatService.ts` and can also read platform keys from `expo.extra`.
- Firebase Functions depend on secrets for Razorpay and Stream Video.
- Firestore rules must allow the current app flows for users, matches, messages, notifications, calls, and credit actions.

## Related Docs

- [App Documentation](docs/APP_DOCUMENTATION.md)
- [System Design and SRS](docs/SKILLSWAP_SYSTEM_DESIGN_AND_SRS.md)
- [Discover Tab SRS](docs/DISCOVER_TAB_SRS.md)
- [Chat System SRS](docs/CHAT_SYSTEM_SRS.md)
- [Video Call SRS](docs/VIDEO_CALL_SRS.md)
- [RevenueCat and Subscriptions](docs/REVENUECAT_SUBSCRIPTIONS_SRS_AND_IMPLEMENTATION.md)
- [Razorpay Payment System SRS](docs/RAZORPAY_PAYMENT_SYSTEM_SRS.md)

## Current Notes

- The local workspace is in the middle of active app changes, especially around Expo Router screens, discovery limits, chat, paywall, and backend integration.
- The route-based `app/` directory is now the main UI surface, while several legacy `src/screens/*` files have been removed locally.
- Notion publishing is not available in this session because the Notion plugin tools are not connected, so the documentation has been created locally in Markdown first.
