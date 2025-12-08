const express = require('express');
const router = express.Router();
const SheetsConfig = require('../models/SheetsConfig');
const googleSheetsService = require('../services/googleSheets');
const auth = require('../middleware/auth');

// Middleware: admin only
router.use(auth, (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
});

/**
 * Get Google Sheets configuration
 * GET /api/admin/sheets/config
 */
router.get('/config', async (req, res) => {
  try {
    const config = await SheetsConfig.findOne({ isActive: true });

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching sheets config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration',
    });
  }
});

/**
 * Save/Update Google Sheets configuration
 * POST /api/admin/sheets/config
 */
router.post('/config', async (req, res) => {
  try {
    const { spreadsheetUrl, sheetName, autoSync, syncInterval } = req.body;

    if (!spreadsheetUrl || !sheetName) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet URL and sheet name are required',
      });
    }

    // Extract spreadsheet ID from URL
    const spreadsheetId =
      googleSheetsService.extractSpreadsheetId(spreadsheetUrl);

    // If spreadsheet ID extraction fails, still allow saving for Web App URLs
    // Web App URLs look like: https://script.google.com/macros/s/.../exec
    const isWebAppUrl =
      spreadsheetUrl.includes('script.google.com') ||
      spreadsheetUrl.includes('/exec');

    if (!spreadsheetId && !isWebAppUrl) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid Google Sheets URL. Please provide either:\n1. A Google Sheets URL (https://docs.google.com/spreadsheets/d/...)\n2. A Google Apps Script Web App URL (https://script.google.com/...)',
      });
    }

    // Deactivate existing configs
    await SheetsConfig.updateMany({}, { isActive: false });

    // Create or update config
    const config = await SheetsConfig.create({
      spreadsheetUrl,
      spreadsheetId: spreadsheetId || 'webapp',
      sheetName,
      autoSync: autoSync !== undefined ? autoSync : true,
      syncInterval: syncInterval || 30,
      isActive: true,
    });

    res.json({
      success: true,
      message: 'Google Sheets configuration saved successfully',
      data: config,
    });
  } catch (error) {
    console.error('Error saving sheets config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save configuration',
    });
  }
});

/**
 * Manually sync attendance records to Google Sheets
 * POST /api/admin/sheets/sync
 */
router.post('/sync', async (req, res) => {
  try {
    const config = await SheetsConfig.findOne({ isActive: true });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active Google Sheets configuration found',
      });
    }

    // For regular Google Sheets URLs (not Web App), sync all records
    const isWebApp =
      config.spreadsheetUrl.includes('script.google.com') ||
      config.spreadsheetUrl.includes('/exec');

    let result;
    if (!isWebApp && !config.lastSyncedAt) {
      // First sync with regular sheet - sync all historical records
      result = await googleSheetsService.syncAllRecords(config);
    } else {
      result = await googleSheetsService.syncAttendanceRecords(config);
    }

    // For non-WebApp URLs, provide manual instructions
    if (!isWebApp) {
      return res.json({
        success: true,
        message: `Found ${result.recordsCount} records. Since you're using a regular Google Sheets URL, please set up a Google Apps Script Web App to enable automatic syncing. See documentation for setup instructions.`,
        recordsCount: result.recordsCount,
        requiresWebApp: true,
      });
    }

    res.json({
      success: true,
      message: `Successfully synced ${result.recordsCount} records`,
      recordsCount: result.recordsCount,
    });
  } catch (error) {
    console.error('Error syncing to sheets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync attendance data',
      error: error.toString(),
    });
  }
});

/**
 * Sync all historical records
 * POST /api/admin/sheets/sync-all
 */
router.post('/sync-all', async (req, res) => {
  try {
    const config = await SheetsConfig.findOne({ isActive: true });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active Google Sheets configuration found',
      });
    }

    const result = await googleSheetsService.syncAllRecords(config);

    res.json({
      success: true,
      message: `Successfully synced ${result.recordsCount} records`,
      recordsCount: result.recordsCount,
    });
  } catch (error) {
    console.error('Error syncing all records:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync records',
    });
  }
});

/**
 * Delete/Disconnect Google Sheets configuration
 * DELETE /api/admin/sheets/config
 */
router.delete('/config', async (req, res) => {
  try {
    await SheetsConfig.updateMany({}, { isActive: false });

    res.json({
      success: true,
      message: 'Google Sheets disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Sheets',
    });
  }
});

module.exports = router;
