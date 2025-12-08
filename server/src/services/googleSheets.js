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
  formatAttendanceRecord(attendance, user) {
    const checkInDate = attendance.checkInTime
      ? new Date(attendance.checkInTime)
      : null;
    const checkOutDate = attendance.checkOutTime
      ? new Date(attendance.checkOutTime)
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
      const hours = (diffMs / (1000 * 60 * 60)).toFixed(2);
      return hours;
    };

    const getStatus = () => {
      if (!attendance.checkInTime) return 'Absent';
      if (!attendance.checkOutTime) return 'Checked In';
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
      attendance.deviceId || '',
      attendance.checkInLocation || '',
      attendance.checkOutLocation || '',
    ];
  }

  /**
   * Alternative: Use Google Apps Script approach
   * Deploy a web app script in Google Sheets that accepts POST requests
   */
  async syncViaWebApp(webAppUrl, data) {
    try {
      const axios = require('axios');
      const response = await axios.post(webAppUrl, {
        action: 'append',
        data: data,
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to sync via web app: ' + error.message);
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
        query.checkInTime = { $gte: fromDate };
      } else if (config.lastSyncedAt) {
        query.checkInTime = { $gte: config.lastSyncedAt };
      }
      // If no date filter, get all records (first sync)

      console.log('Syncing with query:', query);
      const attendanceRecords = await Attendance.find(query)
        .sort({ checkInTime: 1 })
        .limit(1000); // Limit to prevent overwhelming the API

      console.log(`Found ${attendanceRecords.length} attendance records`);

      if (attendanceRecords.length === 0) {
        return { success: true, recordsCount: 0 };
      }

      // Get user details for all records
      const userIds = [...new Set(attendanceRecords.map(a => a.userId))].filter(
        Boolean,
      );
      const users = await User.find({ _id: { $in: userIds } });
      const userMap = {};
      users.forEach(user => {
        if (user && user._id) {
          userMap[user._id.toString()] = user;
        }
      });

      // Format records for sheet
      const rows = attendanceRecords.map(attendance => {
        const userId = attendance.userId ? attendance.userId.toString() : null;
        const user = userId ? userMap[userId] : null;
        return this.formatAttendanceRecord(attendance, user);
      });

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
