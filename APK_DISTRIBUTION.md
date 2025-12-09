# APK Distribution Guide

## ⚠️ Important: APKs Are Not Tracked in Git

APK files are **excluded from Git** because:

- They're binary files (82-53 MB each)
- They change with every build
- GitHub recommends max 50 MB per file
- Git is designed for source code, not build artifacts

Your APK files are **still on your computer** in the `apk-output/` folder, they're just not committed to Git anymore.

---

## 📦 How to Distribute APK Files

### Option 1: GitHub Releases (Recommended)

**Best for:** Public distribution, version tracking, download statistics

1. **Build your APK:**

   ```powershell
   .\build-apk.ps1
   ```

2. **Create a GitHub Release:**

   - Go to: `https://github.com/Avishkant/AttendanceTakerApp/releases`
   - Click **"Draft a new release"**
   - Tag: `v1.0.0` (or your version number)
   - Title: `AttendanceTaker v1.0.0`
   - Description: Add release notes
   - **Attach files:**
     - `AttendanceTaker_arm64_TIMESTAMP.apk` (Main - for modern phones)
     - `AttendanceTaker_arm32_TIMESTAMP.apk` (Legacy - for older phones)
   - Click **"Publish release"**

3. **Share the release URL:**
   ```
   https://github.com/Avishkant/AttendanceTakerApp/releases/latest
   ```

**Benefits:**

- ✅ Free hosting on GitHub
- ✅ Version history tracking
- ✅ Download counters
- ✅ Automatic notifications to watchers
- ✅ Professional presentation

---

### Option 2: Cloud Storage

**Best for:** Quick sharing, temporary distribution

#### Google Drive

1. Upload APK to Google Drive
2. Right-click → Share → Get link
3. Change to "Anyone with the link"
4. Share the link

#### Dropbox

1. Upload APK to Dropbox
2. Get shareable link
3. Share with users

#### OneDrive

1. Upload to OneDrive
2. Share → Anyone with link can view
3. Copy and share link

**Benefits:**

- ✅ Easy and quick
- ✅ No size limits
- ✅ Direct download links

---

### Option 3: File Transfer Services

**Best for:** One-time transfers, large teams

- **WeTransfer:** https://wetransfer.com/ (Free up to 2GB)
- **Send Anywhere:** https://send-anywhere.com/ (6-digit code sharing)
- **Firefox Send Alternative:** https://send.vis.ee/

**Benefits:**

- ✅ No account needed
- ✅ Temporary links (auto-expire)
- ✅ Large file support

---

### Option 4: Internal Distribution Platforms

**Best for:** Enterprise, testing teams

#### Firebase App Distribution

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Upload APK
firebase appdistribution:distribute \
  apk-output/AttendanceTaker_arm64_*.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups testers
```

#### Microsoft App Center

- Upload APKs via web interface
- Manage tester groups
- Get crash analytics

**Benefits:**

- ✅ Crash reporting
- ✅ Analytics
- ✅ Tester management
- ✅ Update notifications

---

### Option 5: Self-Hosted Server

**Best for:** Full control, custom domains

1. **Upload to your server:**

   ```bash
   scp apk-output/AttendanceTaker_arm64_*.apk user@server:/var/www/html/downloads/
   ```

2. **Create download page:**

   ```html
   <a href="/downloads/AttendanceTaker_arm64.apk">
     Download AttendanceTaker (ARM64 - 53 MB)
   </a>
   ```

3. **Set correct MIME type** (Apache `.htaccess`):
   ```apache
   <Files *.apk>
     Header set Content-Type "application/vnd.android.package-archive"
   </Files>
   ```

---

## 🎯 Recommended Distribution Strategy

### For Most Users: GitHub Releases

1. **Build optimized APKs:**

   ```powershell
   .\build-apk.ps1
   ```

2. **Test the APKs** on at least 2 different devices

3. **Create GitHub Release** with both ARM64 and ARM32 APKs

4. **Share release URL:**

   ```
   Download: https://github.com/Avishkant/AttendanceTakerApp/releases/latest
   ```

5. **Update release notes** with each new version

---

## 📝 What's in Your Repository Now

```
AttendanceTakerApp/
├── src/                          ✅ Tracked in Git
├── android/                      ✅ Tracked in Git (except builds)
├── ios/                          ✅ Tracked in Git (except builds)
├── APK_SIZE_OPTIMIZATION.md      ✅ Tracked in Git
├── build-apk.ps1                 ✅ Tracked in Git
├── apk-output/
│   ├── *.apk                     ❌ NOT tracked (local only)
│   ├── INSTALLATION_INSTRUCTIONS.md  ✅ Tracked
│   └── README.md                 ✅ Tracked
└── android/app/build/outputs/    ❌ NOT tracked (.gitignore)
```

---

## 🔄 Building and Distributing Workflow

### Step 1: Make Changes

```bash
# Edit source code
# Commit changes to Git
git add .
git commit -m "feat: add new feature"
git push
```

### Step 2: Build APKs

```powershell
# Generate optimized APKs locally
.\build-apk.ps1
```

### Step 3: Test

- Install on physical device
- Test all features
- Verify break functionality
- Test Google Sheets sync

### Step 4: Distribute

- **GitHub Release** (recommended)
- Or cloud storage link
- Update CHANGELOG.md

### Step 5: Notify Users

- Send download link
- Include installation instructions
- Mention what's new

---

## 📊 APK File Sizes

Current optimized sizes:

- **ARM64 APK:** 52.95 MB (covers 90%+ of users)
- **ARM32 APK:** 36.46 MB (legacy devices)

These files are **too large for Git** but perfect for:

- GitHub Releases (no size limit)
- Google Drive / Dropbox
- Direct server hosting

---

## 🛡️ Security Considerations

### For Public Distribution:

- ✅ Use GitHub Releases (verified source)
- ✅ Provide SHA256 checksums
- ✅ Sign APKs with release keystore (production)

### For Private Distribution:

- ✅ Use password-protected cloud links
- ✅ Firebase App Distribution (invite-only)
- ✅ Internal server with authentication

---

## 💡 Pro Tips

1. **Version Your Releases:**

   - Use semantic versioning: `v1.0.0`, `v1.1.0`, etc.
   - Tag releases in Git: `git tag v1.0.0`

2. **Automate Distribution:**

   ```yaml
   # .github/workflows/release.yml
   # Auto-upload APKs to GitHub Releases on tag push
   ```

3. **Keep Local APKs:**

   - Your `apk-output/` folder is safe
   - Rebuild anytime with `.\build-apk.ps1`
   - No need to commit to Git

4. **Document Changes:**
   - Maintain CHANGELOG.md
   - Include in release notes
   - Users appreciate knowing what's new

---

## 📞 Quick Reference

**Build APK:**

```powershell
.\build-apk.ps1
```

**Create GitHub Release:**

```
https://github.com/Avishkant/AttendanceTakerApp/releases/new
```

**Share Latest Release:**

```
https://github.com/Avishkant/AttendanceTakerApp/releases/latest
```

**Check APK Size:**

```powershell
Get-ChildItem apk-output\*.apk | Select-Object Name, @{N='MB';E={[math]::Round($_.Length/1MB,2)}}
```

---

**Updated:** December 8, 2025  
**Build System:** Gradle 9.0.0  
**Optimization:** 35-55% size reduction via ABI splitting
