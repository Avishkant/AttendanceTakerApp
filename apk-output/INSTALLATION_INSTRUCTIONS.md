# AttendanceTaker APK Installation Guide

## 📦 What You Have

You have standalone Android APK files optimized for size. Each APK is built for a specific device architecture, making them 35-55% smaller than a universal APK.

**APK Variants:**

- **ARM64 (app-arm64-v8a):** ~53 MB - For modern phones (2016+) - **USE THIS ONE**
- **ARM32 (app-armeabi-v7a):** ~36 MB - For older phones (pre-2016)

**Details:**

- **App Name:** AttendanceTaker
- **Build Type:** Debug (optimized)
- **Min Android Version:** Android 6.0 (API 23) or higher

> 💡 **Most users should use the ARM64 version.** Only use ARM32 if you have an older device (pre-2016) or if ARM64 version doesn't work.

---

## 📱 Installation Steps

### Method 1: Direct Installation (Recommended)

1. **Transfer the APK to your Android device:**

   - Via USB cable: Copy the APK to your phone's Downloads folder
   - Via cloud storage: Upload to Google Drive/Dropbox and download on your phone
   - Via messaging app: Send the APK file to yourself on WhatsApp/Telegram
   - Via email: Attach the APK to an email and open on your phone

2. **Enable "Install Unknown Apps":**

   - Go to **Settings** → **Security** (or **Apps & Notifications**)
   - Find **Install unknown apps** (or **Unknown sources**)
   - Enable it for the app you're using to install (e.g., Chrome, File Manager, Gmail)

   Note: The exact path varies by Android version:

   - **Android 8+:** Settings → Apps → Special access → Install unknown apps
   - **Android 7 and below:** Settings → Security → Unknown sources

3. **Install the APK:**
   - Tap on the APK file from your file manager or downloads
   - Tap **Install**
   - Wait for installation to complete
   - Tap **Open** to launch the app

---

### Method 2: Using ADB (For Developers)

If you have ADB installed:

```bash
adb install AttendanceTaker_debug_[timestamp].apk
```

Or to reinstall:

```bash
adb install -r AttendanceTaker_debug_[timestamp].apk
```

---

## ⚙️ First Launch

1. **Grant Permissions:**

   - The app will request necessary permissions (location, storage, etc.)
   - Grant all permissions for full functionality

2. **Login:**
   - Enter your credentials provided by your administrator
   - The app connects to: `https://attendancetakerbackend.onrender.com`

---

## 🔒 Security Notes

- This is a **DEBUG BUILD** - suitable for testing and internal use
- For production deployment, a signed release build is recommended
- The app connects to the production backend by default
- All data is encrypted in transit (HTTPS)

---

## ❓ Troubleshooting

### "App not installed" Error

- **Cause:** You might have an older version installed
- **Solution:** Uninstall the old version first, then reinstall

### "Installation blocked" Error

- **Cause:** "Install unknown apps" is not enabled
- **Solution:** Follow step 2 above to enable unknown sources

### "Parse error: There is a problem parsing the package"

- **Cause:** APK file is corrupted or incomplete
- **Solution:** Re-download the APK and try again

### App crashes on launch

- **Cause:** Incompatible Android version or missing dependencies
- **Solution:** Ensure your device runs Android 6.0 or higher

---

## 📋 What This APK Includes

✅ **Bundled JavaScript Code** - No Metro bundler needed  
✅ **All Assets** - Images, icons, fonts included  
✅ **Native Dependencies** - All libraries compiled  
✅ **Network Configuration** - Pre-configured backend URL  
✅ **Offline Capability** - Works without constant connection

---

## 🔄 Updating the App

When a new version is available:

1. Download the new APK
2. Install it over the existing version
3. Your data will be preserved (stored in AsyncStorage)

---

## 📞 Support

If you encounter any issues:

- Contact your system administrator
- Check that the backend server is running
- Verify your internet connection
- Ensure you're using the latest APK version

---

## 🛠️ For Administrators

### Backend Configuration

The app connects to: `https://attendancetakerbackend.onrender.com`

To change the backend URL:

- Edit `src/config/server.ts`
- Rebuild the APK using `build-apk.ps1`

### Building New APKs

```powershell
# From project root
.\build-apk.ps1

# Or manually
cd android
./gradlew assembleDebug
```

The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

**Last Updated:** December 8, 2025  
**Build Script:** `build-apk.ps1`  
**Project:** AttendanceTaker React Native App
