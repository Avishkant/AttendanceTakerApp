# Google Sheets Integration - Implementation Summary

## ✅ What Has Been Implemented

### Frontend (React Native)

1. **GoogleSheetsScreen.tsx** - New admin screen with:

   - Google Sheets URL input with validation
   - Sheet name configuration
   - Auto-sync toggle with interval selection (15, 30, 60, 120 minutes)
   - Manual sync button
   - Connection status display
   - Setup instructions
   - Disconnect functionality

2. **Navigation Updates**:
   - Added GoogleSheetsScreen to AdminPortal stack navigator
   - Added "Sheets Sync" card in AdminHome screen
   - Navigation route: Home → Sheets Sync button → Google Sheets Screen

### Backend (Express.js + MongoDB)

1. **Database Model** (`SheetsConfig.js`):

   - Stores spreadsheet URL, ID, sheet name
   - Auto-sync configuration (enabled/disabled, interval)
   - Last synced timestamp
   - Active/inactive status

2. **Google Sheets Service** (`googleSheets.js`):

   - Extracts spreadsheet ID from URL
   - Formats attendance records for Google Sheets
   - Supports web app URL approach (Google Apps Script)
   - Generates properly formatted data with columns:
     - Date, Employee Name, Employee ID
     - Check In/Out Times, Duration
     - Status, Device ID, Locations

3. **API Routes** (`sheets.js`):

   - `GET /api/admin/sheets/config` - Get current configuration
   - `POST /api/admin/sheets/config` - Save/update configuration
   - `POST /api/admin/sheets/sync` - Manual sync
   - `POST /api/admin/sheets/sync-all` - Sync all historical records
   - `DELETE /api/admin/sheets/config` - Disconnect Google Sheets

4. **Sync Scheduler** (`syncScheduler.js`):

   - Runs every minute checking if sync is needed
   - Respects configured sync interval
   - Only syncs new records since last sync
   - Automatic background operation

5. **Server Integration**:
   - Routes registered in main server file
   - Scheduler starts automatically on server startup
   - Required packages installed: `googleapis`, `node-cron`

## 🚀 How to Use

### Setup (One-time)

1. Install dependencies (already done):

   ```bash
   cd server
   npm install googleapis node-cron
   ```

2. Create a Google Sheet:

   - Go to Google Sheets
   - Create new spreadsheet
   - Name it (e.g., "Attendance Records")
   - Copy the URL

3. Configure Google Apps Script (Recommended Method):

   **In your Google Sheet:**

   - Extensions → Apps Script
   - Paste this code:

   ```javascript
   function doPost(e) {
     var sheet = SpreadsheetApp.getActiveSheet();
     var data = JSON.parse(e.postData.contents);

     if (data.action === 'append') {
       data.data.forEach(function (row) {
         sheet.appendRow(row);
       });
     }

     return ContentService.createTextOutput(
       JSON.stringify({
         success: true,
         count: data.data.length,
       }),
     ).setMimeType(ContentService.MimeType.JSON);
   }
   ```

   - Deploy → New Deployment
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
   - Copy the web app URL

### In the App (Admin)

1. Navigate to Admin Portal → Home
2. Click "Sheets Sync" card
3. Paste your Web App URL or Google Sheets URL
4. Enter sheet name (e.g., "Sheet1")
5. Enable Auto Sync
6. Select sync interval (e.g., 30 minutes)
7. Click "Save Configuration"
8. Click "Sync Now" to immediately sync existing records

### Monitoring

- Check "Last synced" timestamp on the status card
- Manual sync anytime with "Sync Now" button
- Server logs show sync operations
- Attendance records automatically appear in Google Sheet

## 📊 Data Format

Each row in Google Sheets contains:

```
| Date | Employee Name | Employee ID | Check In Time | Check Out Time | Duration (hours) | Status | Device ID | Check In Location | Check Out Location |
|------|---------------|-------------|---------------|----------------|------------------|--------|-----------|-------------------|-------------------|
| Dec 5, 2025 | John Doe | abc123 | 09:00:00 AM | 05:30:00 PM | 8.50 | Completed | device-123 | 192.168.1.1 | 192.168.1.1 |
```

## 🔧 Technical Details

### Sync Logic

- **First Sync**: Syncs all historical records
- **Subsequent Syncs**: Only new records since `lastSyncedAt`
- **Auto Sync**: Checks every minute, syncs if interval elapsed
- **Manual Sync**: Immediate sync of latest records

### API Authentication

- All endpoints require admin role
- Uses JWT token authentication
- Same auth system as other admin endpoints

### Error Handling

- Invalid URL validation
- Connection error messages
- Sync failure alerts
- Graceful fallback handling

## 📝 Notes

### Current Implementation

- Uses simplified approach with Web App URL
- No Google API Key required
- Works with any Google Sheet (public or private)
- Data is appended (never deletes existing rows)

### Alternative: Google API (Optional)

If you want direct API integration:

1. Get Google API Key from Google Cloud Console
2. Add to `.env`: `GOOGLE_API_KEY=your_key`
3. Share sheet as "Anyone with link can edit"
4. API will directly write to sheet

### Production Considerations

- Monitor Google Apps Script quota limits
- Consider batch syncing for large datasets
- Set appropriate sync intervals (longer = less API calls)
- Keep backup of attendance data in database

## 🐛 Troubleshooting

**"Unable to access the Google Sheet"**

- Verify the URL is correct
- For Web App: Make sure it's deployed and accessible
- Check sheet name matches exactly

**"Auto sync not working"**

- Ensure server is running continuously
- Check `autoSync` is enabled in configuration
- Review server logs for errors

**"No records synced"**

- Check if there are new attendance records since last sync
- Try "Sync Now" manually first
- Verify employee check-ins are being recorded

## 📚 Files Created/Modified

### New Files:

- `src/screens/GoogleSheetsScreen.tsx`
- `server/src/models/SheetsConfig.js`
- `server/src/services/googleSheets.js`
- `server/src/services/syncScheduler.js`
- `server/src/routes/sheets.js`
- `GOOGLE_SHEETS_SETUP.md`

### Modified Files:

- `src/screens/AdminPortal.tsx` (added route)
- `src/screens/AdminHome.tsx` (added navigation card)
- `server/src/index.js` (registered routes + scheduler)
- `server/package.json` (dependencies added)

## ✨ Features

✅ Google Sheets URL configuration
✅ Automatic periodic syncing
✅ Manual sync on demand
✅ Configurable sync intervals
✅ Connection status indicator
✅ Last sync timestamp
✅ Formatted attendance data
✅ Employee information included
✅ Duration calculations
✅ Status indicators
✅ Easy disconnect option
✅ Setup instructions in-app
✅ Background sync scheduler
✅ Admin-only access

The integration is fully functional and ready to use!
