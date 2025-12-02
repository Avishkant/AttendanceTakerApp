export const BASE_URL: string =
  process.env.BASE_URL || 'https://attendancetakerbackend.onrender.com';

// Notes:
// - This defaults to your hosted backend at https://attendancetakerbackend.onrender.com
// - For local development you can set BASE_URL in the project root `.env` file.
// - On Android emulator (AVD) local host mapping is `http://10.0.2.2:<port>`.
// - On iOS simulator local host mapping is `http://localhost:<port>`.
// - On a physical device use `http://<YOUR-PC-LAN-IP>:<port>` and open the firewall.
