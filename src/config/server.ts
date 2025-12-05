import { Platform } from 'react-native';

// Development-friendly BASE_URL selection:
// 1) Honor `process.env.BASE_URL` when explicitly provided (e.g. CI/build env).
// 2) When in `__DEV__` prefer local host mapping for the current platform
//    (Android emulator uses `10.0.2.2`, iOS simulator uses `localhost`).
// 3) Otherwise fall back to the hosted backend.
const HOSTED = 'https://attendancetakerbackend.onrender.com';
const LOCAL_PORT = 3000; // change if your local backend uses a different port
const LOCAL_ANDROID = `http://10.0.2.2:${LOCAL_PORT}`;
const LOCAL_IOS = `http://localhost:${LOCAL_PORT}`;

// Configuration flags:
// - FORCE_HOSTED=1 will force the hosted backend even in __DEV__.
// - USE_LOCAL=1 will force using local emulator mapping in __DEV__ (opt-in).
const FORCE_HOSTED = !!(
  process.env &&
  (process.env.FORCE_HOSTED === '1' || process.env.FORCE_HOSTED === 'true')
);
const USE_LOCAL = !!(
  process.env &&
  (process.env.USE_LOCAL === '1' || process.env.USE_LOCAL === 'true')
);

// Resolution order:
// 1) explicit `process.env.BASE_URL`
// 2) `FORCE_HOSTED` -> HOSTED
// 3) if in dev and `USE_LOCAL` -> local emulator mapping
// 4) otherwise HOSTED
export const BASE_URL: string =
  (process.env && process.env.BASE_URL) ||
  (FORCE_HOSTED ? HOSTED : null) ||
  (__DEV__ && USE_LOCAL
    ? Platform.OS === 'android'
      ? LOCAL_ANDROID
      : LOCAL_IOS
    : HOSTED);

// Notes:
// - To target a custom server during development set `process.env.BASE_URL` when
//   building (or edit `LOCAL_PORT` above), or override by editing this file.
// - Android emulator (AVD) local host mapping is `http://10.0.2.2:<port>`.
// - iOS simulator local host mapping is `http://localhost:<port>`.
// - Physical device: use `http://<YOUR-PC-LAN-IP>:<port>` and open your firewall.
