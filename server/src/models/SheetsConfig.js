const mongoose = require('mongoose');

const sheetsConfigSchema = new mongoose.Schema({
  spreadsheetUrl: {
    type: String,
    required: true,
  },
  spreadsheetId: {
    type: String,
    required: true,
  },
  sheetName: {
    type: String,
    default: 'Attendance',
  },
  autoSync: {
    type: Boolean,
    default: true,
  },
  syncInterval: {
    type: Number,
    default: 30, // minutes
  },
  lastSyncedAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

sheetsConfigSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SheetsConfig', sheetsConfigSchema);
