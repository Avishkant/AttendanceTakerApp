# Copilot instructions for AttendanceTaker

This file gives focused, actionable guidance for AI coding agents working on the AttendanceTaker React Native app.

Quick summary
- Type: React Native (TypeScript) mobile app with an included `server/` backend folder (if present).
- Entry: `App.tsx` — role-based routing; Admin vs Employee UI lives in `src/screens/`.
- Network: `src/api/client.ts` (axios instance) and `src/config/server.ts` (BASE_URL default).

Architecture / Big picture
- UI: `src/screens/*` contains screen components (e.g. `Login.tsx`, `AdminPortal.tsx`, `EmployeePortal.tsx`, `EmployeesScreen.tsx`). Navigation is handled with React Navigation in `App.tsx`.
- Auth: `src/contexts/AuthContext.tsx` manages `token`, `user`, `deviceId` in `AsyncStorage`. The app uses a context provider (`AuthProvider`) and `useAuth()` hook.
- API layer: `src/api/client.ts` creates an axios instance that:
  - sets `Authorization: Bearer ${token}` from AsyncStorage on every request
  - sets an `x-device-id` header from AsyncStorage
  - registers a module-level `setUnauthorizedHandler(fn)` so the auth layer can react to 401s
- Config: `src/config/server.ts` exports `BASE_URL` (defaults to `https://attendancetakerbackend.onrender.com`). The file includes emulator mapping notes (use `http://10.0.2.2:<port>` for Android emulator).

Developer workflows & commands
- Install deps: `npm install` (Node >= 20 required; declared in `package.json`).
- Start Metro: `npm start`.
- Run Android: `npm run android` (calls `react-native run-android`). On Windows, `scripts/setup-and-run-android.ps1` contains helpful setup steps — check it if emulator/device build fails.
- Run iOS: `npm run ios` (macOS only). CocoaPods: `bundle exec pod install` when native deps change.
- Tests: `npm test` (Jest; config in `jest.config.js`).
- Lint: `npm run lint` (ESLint config present).

Project-specific conventions & patterns
- AsyncStorage keys: the codebase uses the keys `'token'`, `'user'`, and `'deviceId'`. Keep these exact keys when reading/writing storage.
- Device id generation: `AuthContext` generates a simple UUID v4 and stores it as `deviceId` if one is not present — keep this behaviour if replacing storage logic.
- Unauthorized handling: `src/api/client.ts` calls the registered `onUnauthorized` callback on 401. Do not remove `setUnauthorizedHandler(...)` when changing API code; update `AuthContext` accordingly so users are signed out on 401.
- API error handling: `AuthContext.signIn` unwraps axios error responses to produce clearer messages. Follow that pattern when adding new auth flows.
- Role-based UI: `App.tsx` determines main route (`AdminPortal` vs `EmployeePortal`) by `user.role` (lowercased). Preserve this pattern when adding/renaming roles.

Integration & environment notes
- Backend URL:
  - Default: `https://attendancetakerbackend.onrender.com` (see `src/config/server.ts`).
  - Local Android emulator: use `http://10.0.2.2:<port>`.
  - iOS Simulator: use `http://localhost:<port>`.
  - Physical device: use your PC LAN IP and ensure firewall allows connections.
  - `BASE_URL` can be overridden with `process.env.BASE_URL` or by setting an `.env` file (project reads `process.env.BASE_URL` in `server.ts`).
- If you change header names, update both `src/api/client.ts` and server endpoints.

Files to reference when making changes
- App structure & routing: `App.tsx`
- Auth & storage: `src/contexts/AuthContext.tsx`
- Network layer / headers / auth hooks: `src/api/client.ts`
- Base URL and emulator mapping: `src/config/server.ts`
- Screens: `src/screens/` (Admin & Employee portals, requests, records, devices)
- Android setup script: `scripts/setup-and-run-android.ps1`
- Tests & lint: `jest.config.js`, `package.json` scripts, `.eslintrc.js`

When editing the codebase — short checklist for PRs
- Keep AsyncStorage keys consistent (`token`, `user`, `deviceId`).
- If you modify network headers or auth flow, ensure `setUnauthorizedHandler` behavior and `AuthContext` sign-out flow remain coherent.
- Update `src/config/server.ts` notes if you change local dev host mapping.
- Run `npm run lint` and `npm test` before opening PR.

If anything here looks incomplete or you want added examples (e.g., sample local `.env`, common debugging steps for the Windows Android workflow, or a short list of important API endpoints), tell me which section to expand.
