# Traya

Traya is a React Native mobile application for Android and iOS. The current implemented flows include phone-number sign-in with Supabase OTP, a Supabase-backed Log & Earn experience, routine dose tracking, calendar history, and scratch-card rewards. Other main tabs are currently placeholders.

## Technology

- React Native `0.87.1` with React `19.2.3`
- TypeScript
- React Navigation 7 (bottom tabs and native stack)
- Redux Toolkit and React Redux for application state
- Supabase JavaScript client for phone OTP authentication and backend RPC calls
- AsyncStorage for persisted Supabase authentication sessions
- Native Android and iOS projects managed with React Native Community CLI
- Jest, ESLint, and TypeScript for testing and static checks

## Requirements

- Node.js `>=22.11.0` (see `package.json`)
- npm (the repository includes `package-lock.json`)
- Android Studio and an Android SDK/emulator for Android development
- Xcode and CocoaPods for iOS development on macOS

Install JavaScript dependencies from the repository root:

```sh
npm install
```

### iOS setup

Install CocoaPods dependencies after cloning or whenever native dependencies change:

```sh
cd ios
bundle install
bundle exec pod install
cd ..
```

## Run the app

Start Metro in one terminal:

```sh
npm start
```

In another terminal, launch a platform:

```sh
npm run android
```

```sh
npm run ios
```

You can also open the native projects in Android Studio or Xcode and run them there.

## Supabase integration

The Supabase client is configured in [`src/shared/components/config/supabase.ts`](./src/shared/components/config/supabase.ts). It uses the project URL and a **publishable key**; only public client credentials belong in the mobile app. Never add a Supabase service-role/secret key to the app or commit one to source control.

### Authentication

- Users enter a mobile number and request a one-time password (OTP) through Supabase Auth.
- The current phone formatter supports 10-digit Indian numbers and 12-digit numbers beginning with `91`.
- OTP verification creates a Supabase Auth session.
- The Supabase client persists and refreshes the session using AsyncStorage. The app restores the session on startup and updates navigation on auth changes.
- Supabase Auth's phone/SMS provider must be configured for the target project. OTP delivery and any test-number behavior are controlled by that project's Supabase Auth settings.

Authentication calls are in [`src/shared/components/config/authService.ts`](./src/shared/components/config/authService.ts); startup and authenticated navigation are handled by [`src/app/navigator/AppNavigator.tsx`](./src/app/navigator/AppNavigator.tsx).

### Log & Earn data and security

Log & Earn reads and changes are made through Supabase Postgres functions (RPCs), called by [`src/app/service/logAndEarnService.ts`](./src/app/service/logAndEarnService.ts). The app does not fetch the old mock JSON. Authenticated RPCs use `auth.uid()` to scope operations to the signed-in user. Row Level Security protects user-owned tables; privileged data changes are performed by database functions rather than direct client writes.

The backend currently supports:

- Creating a new user's Log & Earn profile on the first data request.
- Starting with one configured kit goal, zero coins, three lifelines, and six default routine entries (four daily and two weekly), with unchecked doses.
- Reading progress, routine, coin totals, calendar history, and reward cards.
- Updating today's dose check-ins, removing routine entries, logging a day, and claiming an available scratch card.
- Preventing more than one daily log per user and local date. The app disables the Log button during submission and after a successful log; the database enforces the rule as well.

The current profile time zone default is `Asia/Kolkata`. Only the initial goal and routine catalog entries are configured by the current migrations; later goals and catalog changes require backend configuration.

### Apply database migrations

Database migrations are in [`supabase/migrations`](./supabase/migrations). Apply them in order to the Supabase project configured in the app:

1. [`20261031000000_log_and_earn.sql`](./supabase/migrations/20261031000000_log_and_earn.sql) — creates the Log & Earn schema, access policies, and RPCs.
2. [`20261031200000_log_and_earn_first_login_bootstrap.sql`](./supabase/migrations/20261031200000_log_and_earn_first_login_bootstrap.sql) — seeds the goal/routine catalogs and enables first-login setup.
3. [`20261031210000_log_and_earn_reward_pause_defaults.sql`](./supabase/migrations/20261031210000_log_and_earn_reward_pause_defaults.sql) — fills missing reward-pause notice/button values for existing profiles; safe to run after bootstrap.
4. [`20261101190000_enforce_daily_log_once.sql`](./supabase/migrations/20261101190000_enforce_daily_log_once.sql) — enforces the one-log-per-local-day rule at the database layer.

For a beginner-friendly walkthrough, including Supabase SQL Editor steps and troubleshooting, see [`supabase/README.md`](./supabase/README.md). A migration is not applied to your hosted Supabase project just because it exists in this repository; confirm it completes successfully in the intended project's SQL Editor before testing the related feature.

## Project structure

```text
src/
  app/
    navigator/   Navigation and route definitions
    service/     Supabase RPC service layer
    store/       Redux store, hooks, and slices
  features/
    auth/        Phone login and OTP verification
    logAndEarn/  Routine logging, goal progress, and calendar history
    rewards/     Scratch cards and reward display
  shared/
    assets/      App images and icons
    components/  Reusable UI and Supabase client configuration
supabase/
  migrations/    Database schema, policies, and RPC migrations
```

## Checks

Run the configured lint and test commands:

```sh
npm run lint
npm test
```

Run the TypeScript compiler without emitting files:

```sh
npx tsc --noEmit
```

## Troubleshooting

- **Supabase RPC not found:** Confirm the app's Supabase URL points to the same project where migrations were applied. Apply missing migrations and allow the PostgREST schema cache to refresh.
- **Log & Earn is not configured:** Confirm the bootstrap migration was applied and the user is authenticated. The first successful data request should create the profile and routine.
- **OTP not received:** Check Supabase Auth phone provider and SMS configuration, phone formatting, and the project's OTP delivery limits.
- **iOS build issues after dependency changes:** Run `bundle exec pod install` from `ios/`, then rebuild.
- **Native or Metro issues:** See the [React Native troubleshooting guide](https://reactnative.dev/docs/troubleshooting).
