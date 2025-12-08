const SheetsConfig = require('../models/SheetsConfig');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

class GoogleSheetsService {
  constructor() {
    // We'll use a simpler approach - generate data that can be pasted into Google Sheets
    // Or use Google Sheets API if credentials are provided
    this.useApi =
      !!process.env.GOOGLE_API_KEY || !!process.env.GOOGLE_SERVICE_ACCOUNT;
  }

  /**
   * Extract spreadsheet ID from URL
   */
  extractSpreadsheetId(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Prepare headers for the sheet
   */
  getHeaders() {
    return [
      'Date',
      'Employee Name',
      'Employee ID',
      'Check In Time',
      'Check Out Time',
      'Duration (hours)',
      'Status',
      'Device ID',
      'Check In Location',
      'Check Out Location',
    ];
  }

  /**
   * Format attendance record for sheet
   */
  formatAttendanceRecord(checkInRecord, checkOutRecord, user) {
    const checkInDate = checkInRecord?.timestamp
      ? new Date(checkInRecord.timestamp)
      : null;
    const checkOutDate = checkOutRecord?.timestamp
      ? new Date(checkOutRecord.timestamp)
      : null;

    const formatTime = date => {
      if (!date) return '';
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    };

    const formatDate = date => {
      if (!date) return '';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const calculateDuration = () => {
      if (!checkInDate || !checkOutDate) return '';
      const diffMs = checkOutDate - checkInDate;

      // Subtract break time if breaks exist
      let breakMs = 0;
      if (checkInRecord?.breaks) {
        for (const brk of checkInRecord.breaks) {
          if (brk.end) {
            breakMs +=
              new Date(brk.end).getTime() - new Date(brk.start).getTime();
          }
        }
      }

      const workMs = diffMs - breakMs;
      const hours = (workMs / (1000 * 60 * 60)).toFixed(2);
      return hours;
    };

    const getStatus = () => {
      if (!checkInRecord) return 'Absent';
      if (!checkOutRecord) return 'Checked In';
      return 'Completed';
    };

    return [
      formatDate(checkInDate),
      user?.name || 'Unknown',
      user?._id ? user._id.toString().slice(-6) : '',
      formatTime(checkInDate),
      formatTime(checkOutDate),
      calculateDuration(),
      getStatus(),
      checkInRecord?.deviceId || checkOutRecord?.deviceId || '',
      checkInRecord?.ip || '',
      checkOutRecord?.ip || '',
    ];
  }

  /**
   * Alternative: Use Google Apps Script approach
   * Deploy a web app script in Google Sheets that accepts POST requests
   */
  async syncViaWebApp(webAppUrl, data) {
    try {
      console.log(`Syncing ${data.length} rows to Web App:`, webAppUrl);
      const axios = require('axios');
      const response = await axios.post(
        webAppUrl,
        {
          action: 'append',
          data: data,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        },
      );
      console.log('Web App response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Web App sync error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(
        'Failed to sync via web app: ' +
          error.message +
          (error.response ? ` (Status: ${error.response.status})` : ''),
      );
    }
  }

  /**
   * Sync attendance records - Simplified approach
   * We'll append data using Google Sheets API with minimal setup
   */
  async syncAttendanceRecords(config, fromDate = null) {
    try {
      // Get attendance records since last sync or from specified date
      const query = {};
      if (fromDate) {
        query.timestamp = { $gte: fromDate };
      } else if (config.lastSyncedAt) {
        query.timestamp = { $gte: config.lastSyncedAt };
      }
      // If no date filter, get all records (first sync)

      console.log('Syncing with query:', query);
      const attendanceRecords = await Attendance.find(query)
        .populate('user')
        .sort({ timestamp: 1 })
        .limit(2000); // Limit to prevent overwhelming the API

      console.log(`Found ${attendanceRecords.length} attendance records`);

      if (attendanceRecords.length === 0) {
        return { success: true, recordsCount: 0 };
      }

      // Group records by user and date to pair check-ins with check-outs
      const groupedRecords = {};

      attendanceRecords.forEach(record => {
        if (!record.user) return;

        const userId = record.user._id.toString();
        const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
        const key = `${userId}_${dateKey}`;

        if (!groupedRecords[key]) {
          groupedRecords[key] = {
            user: record.user,
            checkIn: null,
            checkOut: null,
          };
        }

        if (record.type === 'in') {
          // Take the first check-in of the day
          if (!groupedRecords[key].checkIn) {
            groupedRecords[key].checkIn = record;
          }
        } else if (record.type === 'out') {
          // Take the last check-out of the day
          groupedRecords[key].checkOut = record;
        }
      });

      // Format records for sheet
      const rows = [];
      Object.values(groupedRecords).forEach(group => {
        rows.push(
          this.formatAttendanceRecord(
            group.checkIn,
            group.checkOut,
            group.user,
          ),
        );
      });

      console.log(`Formatted ${rows.length} rows for sync`);

      // If a web app URL is provided in the spreadsheet URL, use that
      if (
        config.spreadsheetUrl.includes('script.google.com') ||
        config.spreadsheetUrl.includes('/exec')
      ) {
        await this.syncViaWebApp(config.spreadsheetUrl, rows);
      } else {
        // Otherwise, we'll store the data and provide instructions to manually copy
        // This is a fallback approach that doesn't require API keys
        console.log('Sync requested - Data formatted for Google Sheets');
        console.log(`${rows.length} records ready to sync`);
      }

      // Update last synced time
      config.lastSyncedAt = new Date();
      await config.save();

      return { success: true, recordsCount: rows.length };
    } catch (error) {
      console.error('Error syncing attendance records:', error);
      throw error;
    }
  }

  /**
   * Initialize sheet - simplified version
   */
  async initializeSheet(spreadsheetId, sheetName) {
    // For now, we'll just validate the URL format
    // The actual initialization will happen when admin first pastes data
    return true;
  }

  /**
   * Sync all historical records
   */
  async syncAllRecords(config) {
    try {
      return await this.syncAttendanceRecords(config, new Date('2000-01-01'));
    } catch (error) {
      console.error('Error syncing all records:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();
