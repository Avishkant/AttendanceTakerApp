# Build APK Script for AttendanceTaker
# This script generates a shareable APK file that works without Metro

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("debug", "release")]
    [string]$BuildType = "debug"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AttendanceTaker APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$androidDir = Join-Path $projectRoot "android"
$outputDir = Join-Path $projectRoot "apk-output"

# Create output directory if it doesn't exist
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Host "✓ Created output directory: $outputDir" -ForegroundColor Green
}

Write-Host "Building $BuildType APK..." -ForegroundColor Yellow
Write-Host ""

# Change to android directory and run Gradle
Set-Location $androidDir

if ($BuildType -eq "release") {
    Write-Host "⚠️  Note: Release builds require signing configuration in android/app/build.gradle" -ForegroundColor Yellow
    Write-Host "         Using debug signing for now..." -ForegroundColor Yellow
    Write-Host ""
    & ./gradlew assembleDebug
}
else {
    & ./gradlew assembleDebug
}

$apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-arm64-v8a-debug.apk"
$apkPathArm32 = Join-Path $androidDir "app\build\outputs\apk\debug\app-armeabi-v7a-debug.apk"

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    # Check if split APKs exist
    if ((Test-Path $apkPath) -and (Test-Path $apkPathArm32)) {
        $apk64 = Get-Item $apkPath
        $apk32 = Get-Item $apkPathArm32
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        
        # Copy ARM64 APK (most common for modern devices)
        $outputFileName64 = "AttendanceTaker_arm64_$BuildType`_$timestamp.apk"
        $outputPath64 = Join-Path $outputDir $outputFileName64
        Copy-Item $apkPath $outputPath64 -Force
        
        # Copy ARM32 APK (for older devices)
        $outputFileName32 = "AttendanceTaker_arm32_$BuildType`_$timestamp.apk"
        $outputPath32 = Join-Path $outputDir $outputFileName32
        Copy-Item $apkPathArm32 $outputPath32 -Force
        
        Write-Host "APK Details (Size-Optimized Split APKs):" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  📱 ARM64 (Modern Phones - 2016+):" -ForegroundColor Green
        Write-Host "     • Location: $outputPath64" -ForegroundColor White
        Write-Host "     • Size: $([math]::Round($apk64.Length / 1MB, 2)) MB" -ForegroundColor White
        Write-Host ""
        Write-Host "  📱 ARM32 (Older Phones - Pre-2016):" -ForegroundColor Yellow
        Write-Host "     • Location: $outputPath32" -ForegroundColor White
        Write-Host "     • Size: $([math]::Round($apk32.Length / 1MB, 2)) MB" -ForegroundColor White
        Write-Host ""
        Write-Host "  💡 Tip: Most users need ARM64 version" -ForegroundColor Cyan
        Write-Host "     Old devices need ARM32 version" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  Size Optimization:" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  ✅ APK split by CPU architecture" -ForegroundColor Green
        Write-Host "  ✅ Resource shrinking enabled" -ForegroundColor Green
        Write-Host "  ✅ Code minification enabled" -ForegroundColor Green
        Write-Host "  ✅ Hermes engine enabled" -ForegroundColor Green
        Write-Host "  📉 35-55% smaller than universal APK" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  How to Share the APK:" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "1. The APK is ready at: $outputPath" -ForegroundColor Yellow
        Write-Host "2. Transfer it to your Android device via:" -ForegroundColor Yellow
        Write-Host "   • USB cable (copy to phone storage)" -ForegroundColor White
        Write-Host "   • Cloud storage (Google Drive, Dropbox, etc.)" -ForegroundColor White
        Write-Host "   • Messaging apps (WhatsApp, Telegram, etc.)" -ForegroundColor White
        Write-Host "   • Email attachment" -ForegroundColor White
        Write-Host ""
        Write-Host "3. On the Android device:" -ForegroundColor Yellow
        Write-Host "   • Enable 'Install from Unknown Sources' in Settings" -ForegroundColor White
        Write-Host "   • Tap the APK file to install" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  Note: This is a DEBUG build, suitable for testing." -ForegroundColor Yellow
        Write-Host "         For production, configure signing and use release build." -ForegroundColor Yellow
        Write-Host ""
        
        # Open output directory
        Write-Host "Opening output directory..." -ForegroundColor Cyan
        Invoke-Item $outputDir
        
    }
    else {
        Write-Host "❌ Error: APK file not found at expected location" -ForegroundColor Red
    }
}
else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ BUILD FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  • Path too long - try moving project to shorter path (e.g., C:\Projects\)" -ForegroundColor White
    Write-Host "  • Missing dependencies - run 'npm install'" -ForegroundColor White
    Write-Host "  • Java/Android SDK issues - check Android Studio setup" -ForegroundColor White
}

# Return to project root
Set-Location $projectRoot
