import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import api from '../api/client';
import Icon from '../components/Icon';

type SheetConfig = {
  _id?: string;
  spreadsheetUrl: string;
  sheetName: string;
  autoSync: boolean;
  syncInterval: number; // in minutes
  lastSyncedAt?: string;
  isActive: boolean;
};

const GoogleSheetsScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SheetConfig | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Attendance');
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30); // 30 minutes default
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/sheets/config');
      if (res?.data?.success && res.data.data) {
        const cfg = res.data.data;
        setConfig(cfg);
        setSpreadsheetUrl(cfg.spreadsheetUrl || '');
        setSheetName(cfg.sheetName || 'Attendance');
        setAutoSync(cfg.autoSync ?? true);
        setSyncInterval(cfg.syncInterval || 30);
      }
    } catch (err: any) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateSheetUrl = (url: string): boolean => {
    // Accept both regular Google Sheets URLs and Web App URLs
    const patterns = [
      /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /spreadsheets\.google\.com\/.*[?&]key=([a-zA-Z0-9-_]+)/,
      /script\.google\.com\/macros/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const extractSheetId = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSaveConfig = async () => {
    if (!spreadsheetUrl.trim()) {
      Alert.alert('Error', 'Please enter a Google Sheets URL');
      return;
    }

    if (!validateSheetUrl(spreadsheetUrl)) {
      Alert.alert(
        'Invalid URL',
        'Please enter a valid Google Sheets URL.\n\nExample:\nhttps://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit',
      );
      return;
    }

    if (!sheetName.trim()) {
      Alert.alert('Error', 'Please enter a sheet name');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        spreadsheetUrl: spreadsheetUrl.trim(),
        sheetName: sheetName.trim(),
        autoSync,
        syncInterval: Number(syncInterval),
      };

      const res = await api.post('/api/admin/sheets/config', payload);
      if (res?.data?.success) {
        Alert.alert(
          'Success',
          'Google Sheets configuration saved successfully',
        );
        await loadConfig();
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to save configuration',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!config) {
      Alert.alert('Error', 'Please save the configuration first');
      return;
    }

    setSyncing(true);
    try {
      const res = await api.post('/api/admin/sheets/sync');
      if (res?.data?.success) {
        const message = res.data.requiresWebApp
          ? `Found ${res.data.recordsCount} records.\n\nTo automatically sync to Google Sheets, you need to set up a Google Apps Script Web App.\n\nSee the Setup Instructions below for details.`
          : `Successfully synced ${res.data.recordsCount} attendance records to Google Sheets`;

        Alert.alert('Sync Status', message);
        await loadConfig();
      }
    } catch (err: any) {
      Alert.alert(
        'Sync Failed',
        err?.response?.data?.message || 'Failed to sync attendance data',
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Google Sheets',
      'Are you sure you want to disconnect the Google Sheet? This will stop automatic syncing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/admin/sheets/config');
              Alert.alert('Success', 'Google Sheets disconnected');
              setConfig(null);
              setSpreadsheetUrl('');
              setSheetName('Attendance');
            } catch (err: any) {
              Alert.alert('Error', 'Failed to disconnect');
            }
          },
        },
      ],
    );
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Google Sheets Integration</Text>
          <Text style={styles.headerSubtitle}>
            Sync attendance records automatically
          </Text>
        </View>
        <View style={styles.sheetIcon}>
          <Icon name="file-text" size={24} color="#10b981" />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Card */}
        {config && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusIconContainer}>
                <Icon name="check-circle" size={20} color="#10b981" />
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Connected</Text>
                <Text style={styles.statusSubtitle}>
                  Last synced: {formatLastSync(config.lastSyncedAt)}
                </Text>
              </View>
              {config.autoSync && (
                <View style={styles.autoSyncBadge}>
                  <Icon name="zap" size={12} color="#f59e0b" />
                  <Text style={styles.autoSyncText}>Auto</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Configuration Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sheet Configuration</Text>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Icon name="link" size={16} color="#64748b" />
              <Text style={styles.inputLabel}>Google Sheets URL</Text>
            </View>
            <TextInput
              style={styles.input}
              value={spreadsheetUrl}
              onChangeText={setSpreadsheetUrl}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Open your Google Sheet and copy the URL from your browser
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Icon name="layers" size={16} color="#64748b" />
              <Text style={styles.inputLabel}>Sheet Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={sheetName}
              onChangeText={setSheetName}
              placeholder="Sheet1 or Attendance"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.inputHint}>
              Name of the tab/sheet where data will be added
            </Text>
          </View>
        </View>

        {/* Auto Sync Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sync Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.labelRow}>
                <Icon name="refresh-cw" size={18} color="#6366f1" />
                <Text style={styles.settingLabel}>Auto Sync</Text>
              </View>
              <Text style={styles.settingDescription}>
                Automatically sync new attendance records
              </Text>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
              thumbColor={autoSync ? '#6366f1' : '#f1f5f9'}
            />
          </View>

          {autoSync && (
            <View style={styles.intervalContainer}>
              <View style={styles.labelRow}>
                <Icon name="clock" size={16} color="#64748b" />
                <Text style={styles.inputLabel}>Sync Interval (minutes)</Text>
              </View>
              <View style={styles.intervalButtons}>
                {[15, 30, 60, 120].map(mins => (
                  <Pressable
                    key={mins}
                    style={[
                      styles.intervalBtn,
                      syncInterval === mins && styles.intervalBtnActive,
                    ]}
                    onPress={() => setSyncInterval(mins)}
                  >
                    <Text
                      style={[
                        styles.intervalBtnText,
                        syncInterval === mins && styles.intervalBtnTextActive,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Icon name="info" size={18} color="#3b82f6" />
            <Text style={styles.infoTitle}>Setup Instructions</Text>
          </View>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>1.</Text>
              <Text style={styles.infoText}>
                Create a Google Sheet or use an existing one
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>2.</Text>
              <Text style={styles.infoText}>
                Share the sheet with "Anyone with the link can edit"
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>3.</Text>
              <Text style={styles.infoText}>
                Copy the sheet URL and paste it above
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>4.</Text>
              <Text style={styles.infoText}>
                Configure sync settings and save
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.saveBtn, loading && styles.btnDisabled]}
            onPress={handleSaveConfig}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="save" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {config ? 'Update Configuration' : 'Save Configuration'}
                </Text>
              </>
            )}
          </Pressable>

          {config && (
            <>
              <Pressable
                style={[styles.syncBtn, syncing && styles.btnDisabled]}
                onPress={handleManualSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <>
                    <Icon name="refresh-cw" size={18} color="#6366f1" />
                    <Text style={styles.syncBtnText}>Sync Now</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.disconnectBtn}
                onPress={handleDisconnect}
              >
                <Icon name="x-circle" size={18} color="#ef4444" />
                <Text style={styles.disconnectBtnText}>Disconnect</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  sheetIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#047857',
  },
  autoSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  autoSyncText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  inputHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  intervalContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  intervalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  intervalBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  intervalBtnActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  intervalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  intervalBtnTextActive: {
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBullet: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 8,
    width: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  syncBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  syncBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  disconnectBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  disconnectBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default GoogleSheetsScreen;
