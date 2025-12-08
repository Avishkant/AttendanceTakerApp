# Google Sheets Integration Setup

## Overview

The Google Sheets integration allows automatic syncing of attendance records (check-in/check-out data) to a Google Sheet. The admin can configure the integration and set up periodic automatic syncing.

## Backend Setup

### 1. Install Required Dependencies

```bash
cd server
npm install googleapis node-cron
```

### 2. Google Sheets API Setup

#### Option 1: Using API Key (Simpler, Read-Only + Public Sheets)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create API Key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. Add to `.env` file:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

#### Option 2: Using Service Account (Production - Can Write to Private Sheets)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Sheets API (same as above)
3. Create Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in details and create
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key" > JSON
   - Download the JSON file
4. Place the JSON file in `server/src/config/google-credentials.json`
5. Share your Google Sheet with the service account email (found in the JSON file)

For this implementation, we're using the API Key method with publicly shared sheets for simplicity.

## Frontend Setup

The Google Sheets screen has already been added to the admin portal. No additional setup needed.

## How to Use

### Admin Portal Steps:

1. **Navigate to Google Sheets Integration**

   - Open Admin Portal
   - Go to Home
   - Click on "Sheets Sync" card

2. **Create/Open a Google Sheet**

   - Create a new Google Sheet or use existing one
   - The sheet will automatically have these columns:
     - Date
     - Employee Name
     - Employee ID
     - Check In Time
     - Check Out Time
     - Duration (hours)
     - Status
     - Device ID
     - Check In Location
     - Check Out Location

3. **Share the Sheet**

   - Click "Share" button in Google Sheets
   - Set to "Anyone with the link can edit"
   - Copy the URL

4. **Configure in App**

   - Paste the Google Sheets URL
   - Enter the Sheet Name (e.g., "Sheet1" or "Attendance")
   - Toggle Auto Sync ON/OFF
   - Select Sync Interval (15, 30, 60, or 120 minutes)
   - Click "Save Configuration"

5. **Manual Sync**

   - Click "Sync Now" button to immediately sync latest records
   - This will add all new attendance records since last sync

6. **Automatic Sync**
   - When Auto Sync is enabled, the server will automatically sync new records
   - Based on the configured interval
   - Runs in the background without user interaction

## API Endpoints

### Get Configuration

```
GET /api/admin/sheets/config
```

### Save/Update Configuration

```
POST /api/admin/sheets/config
Body: {
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/...",
  "sheetName": "Attendance",
  "autoSync": true,
  "syncInterval": 30
}
```

### Manual Sync

```
POST /api/admin/sheets/sync
```

### Sync All Historical Records

```
POST /api/admin/sheets/sync-all
```

### Disconnect

```
DELETE /api/admin/sheets/config
```

## Database Model

**SheetsConfig Collection:**

- `spreadsheetUrl`: Full Google Sheets URL
- `spreadsheetId`: Extracted sheet ID
- `sheetName`: Name of the tab/sheet
- `autoSync`: Boolean for automatic syncing
- `syncInterval`: Minutes between syncs
- `lastSyncedAt`: Timestamp of last successful sync
- `isActive`: Boolean to enable/disable config

## Sync Scheduler

The `syncScheduler` service runs every minute and checks:

1. If there's an active configuration with autoSync enabled
2. If enough time has passed since last sync (based on syncInterval)
3. If conditions are met, it syncs new attendance records

## Data Format in Google Sheet

Each row contains:

- **Date**: Check-in date (e.g., "Dec 5, 2025")
- **Employee Name**: Full name
- **Employee ID**: Last 6 chars of user ID
- **Check In Time**: Formatted time (e.g., "09:30:45 AM")
- **Check Out Time**: Formatted time or empty
- **Duration**: Hours between check-in and check-out (e.g., "8.50")
- **Status**: "Completed", "Checked In", or "Absent"
- **Device ID**: Device identifier
- **Check In Location**: IP or location data
- **Check Out Location**: IP or location data

## Troubleshooting

### "Unable to access the Google Sheet"

- Make sure the sheet is shared with "Anyone with the link can edit"
- Verify the URL is correct
- Check that the sheet name exists

### "Failed to sync records"

- Check Google API quota limits
- Verify GOOGLE_API_KEY is set in .env
- Check server logs for detailed error messages

### Auto Sync Not Working

- Verify autoSync is enabled in configuration
- Check that server is running continuously
- Review lastSyncedAt timestamp in database

## Security Notes

- API Key method requires sheets to be publicly accessible (anyone with link)
- For production with private sheets, use Service Account method
- Never commit API keys or credentials to version control
- Add `google-credentials.json` to `.gitignore`

## Future Enhancements

- OAuth2 authentication for private sheets
- Support for multiple sheet configurations
- Export as Excel/CSV in addition to Google Sheets
- Custom column mapping
- Filter records by date range, employee, or department
- Real-time sync using webhooks
