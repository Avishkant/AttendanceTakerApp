const cron = require('node-cron');
const SheetsConfig = require('../models/SheetsConfig');
const googleSheetsService = require('./googleSheets');

class SyncScheduler {
  constructor() {
    this.jobs = {};
  }

  /**
   * Start the sync scheduler
   */
  async start() {
    console.log('Starting Google Sheets sync scheduler...');

    // Check every minute if we need to sync
    this.mainJob = cron.schedule('* * * * *', async () => {
      await this.checkAndSync();
    });

    // Initial check
    await this.checkAndSync();
  }

  /**
   * Check if sync is needed and perform it
   */
  async checkAndSync() {
    try {
      const config = await SheetsConfig.findOne({
        isActive: true,
        autoSync: true,
      });

      if (!config) {
        return;
      }

      const now = new Date();
      const lastSync = config.lastSyncedAt
        ? new Date(config.lastSyncedAt)
        : null;

      if (!lastSync) {
        // First sync
        console.log('Performing initial Google Sheets sync...');
        await this.performSync(config);
        return;
      }

      // Check if enough time has passed
      const minutesSinceLastSync = (now - lastSync) / (1000 * 60);

      if (minutesSinceLastSync >= config.syncInterval) {
        console.log(
          `Syncing to Google Sheets (${config.syncInterval} minutes elapsed)...`,
        );
        await this.performSync(config);
      }
    } catch (error) {
      console.error('Error in sync scheduler:', error);
    }
  }

  /**
   * Perform the actual sync
   */
  async performSync(config) {
    try {
      const result = await googleSheetsService.syncAttendanceRecords(config);
      console.log(
        `✓ Synced ${result.recordsCount} attendance records to Google Sheets`,
      );
      return result;
    } catch (error) {
      console.error('✗ Failed to sync to Google Sheets:', error.message);
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.mainJob) {
      this.mainJob.stop();
      console.log('Google Sheets sync scheduler stopped');
    }
  }
}

module.exports = new SyncScheduler();
