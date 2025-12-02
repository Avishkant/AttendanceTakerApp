<#
PowerShell helper to install deps, clean build, and install APK on a connected Android device.
Run this from project root (PowerShell):
  .\scripts\setup-and-run-android.ps1

Notes:
- This script runs commands that can take many minutes (native builds with NDK/CMake).
- Start Metro in a separate terminal before running the app if you want live reload:
    npx react-native start --reset-cache
- If you prefer, run steps manually to watch progress and enter credentials if prompted.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "==> 1/6: Installing npm dependencies (may take a while)" -ForegroundColor Cyan
npm install

Write-Host "==> 2/6: Ensuring react-native-worklets is installed (required by react-native-reanimated)" -ForegroundColor Cyan
npm install --no-audit --no-fund react-native-worklets

Write-Host "==> 3/6: Clean Android build outputs" -ForegroundColor Cyan
Push-Location android
if (Test-Path -Path .\gradlew) {
  .\gradlew clean
} else {
  Write-Host "gradlew wrapper not found in android/ — skipping clean" -ForegroundColor Yellow
}
Pop-Location

Write-Host "==> 4/6: Assemble Debug APK (this runs CMake/NDK for native deps)" -ForegroundColor Cyan
Push-Location android
# Use assembleDebug to generate APK without installing; faster to inspect errors
.\gradlew assembleDebug -x lint
$assembleExit = $LASTEXITCODE
Pop-Location
if ($assembleExit -ne 0) {
  Write-Error "assembleDebug failed (exit code $assembleExit). Check Gradle output above.";
  exit $assembleExit
}

Write-Host "==> 5/6: Uninstall previous APK (if installed)" -ForegroundColor Cyan
& adb uninstall com.attendancetaker 2>$null | Out-Null

Write-Host "==> 6/6: Install APK to first connected device" -ForegroundColor Cyan
$apkPath = Join-Path -Path $PWD -ChildPath "android\app\build\outputs\apk\debug\app-debug.apk"
if (-Not (Test-Path $apkPath)) {
  Write-Error "APK not found at $apkPath — build may have failed.";
  exit 1
}

# Try to install; adb may fail if device is unresponsive
try {
  & adb install -r $apkPath
  Write-Host "APK installed. Start Metro in separate terminal if not running:" -ForegroundColor Green
  Write-Host "  npx react-native start --reset-cache" -ForegroundColor Green
} catch {
  Write-Error "Failed to install APK via adb: $_"
  Write-Host "Try to inspect device and logcat: adb devices; adb logcat -d" -ForegroundColor Yellow
  exit 1
}

Write-Host "Done. If app did not start, open it on the device or run 'npm run android' to attempt automatic launch." -ForegroundColor Green

# Helpful checks
Write-Host "\nHelpful checks:" -ForegroundColor Cyan
Write-Host "- Connected devices: adb devices" -ForegroundColor Gray
Write-Host "- Free device storage: adb shell df -h /data" -ForegroundColor Gray
Write-Host "- If install hangs, reboot device: adb reboot" -ForegroundColor Gray

exit 0
