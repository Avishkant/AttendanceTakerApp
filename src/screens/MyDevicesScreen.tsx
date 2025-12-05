import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import Icon from '../components/Icon';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  currentDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    marginTop: -20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    gap: 12,
  },
  deviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  formDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  deviceInfoDisplay: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 22,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 10,
    minHeight: 90,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  requestButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestButtonDisabled: {
    opacity: 0.5,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  requestsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  requestCard: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusApproved: {
    backgroundColor: '#d1fae5',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#d97706',
  },
  statusTextApproved: {
    color: '#059669',
  },
  statusTextRejected: {
    color: '#dc2626',
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestDetails: {
    flex: 1,
  },
  requestDeviceId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#64748b',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
});

const EmptyRequests = () => <Text style={styles.emptyText}>No requests</Text>;

type RequestItem = {
  id: string;
  newDeviceId: string;
  status: string;
  requestedAt: string;
};

const MyDevicesScreen: React.FC = () => {
  const { user } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [currentDeviceName, setCurrentDeviceName] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);

  // Get current device info
  useEffect(() => {
    const getDeviceInfo = async () => {
      try {
        const storedDeviceId = await AsyncStorage.getItem('deviceId');

        // Get device information using Platform API
        const platformName = Platform.OS === 'android' ? 'Android' : 'iOS';
        const version = Platform.Version;
        const deviceName = `${platformName} Device (v${version})`;

        setCurrentDeviceId(storedDeviceId || 'Not available');
        setCurrentDeviceName(deviceName);
      } catch (error) {
        console.error('Error getting device info:', error);
        setCurrentDeviceId('Unknown');
        setCurrentDeviceName('Unknown Device');
      }
    };
    getDeviceInfo();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer the dedicated endpoint that returns the authenticated user's requests
      let res = null as any;
      try {
        res = await api.get('/api/devices/my-requests');
      } catch {
        // fallback to older /api/devices/my if present
        try {
          res = await api.get('/api/devices/my');
        } catch (e2) {
          res = e2?.response ?? null;
        }
      }
      const payload = res?.data?.data ?? res?.data ?? null;
      // keep a raw copy for debugging when nothing shows
      setRawResponse(res?.data ?? res ?? null);
      if (!payload) {
        // fallback: server returned something unexpected
        console.warn('MyDevices: unexpected response', res?.data ?? res);
      }

      // deviceId may live in several places
      const resolvedDeviceId =
        payload?.deviceId ||
        res?.data?.deviceId ||
        payload?.registeredDeviceId ||
        null;

      // requests may be under payload.requests, res.data.requests, or payload itself
      let resolvedRequests: any[] = [];
      if (Array.isArray(payload?.requests)) resolvedRequests = payload.requests;
      else if (Array.isArray(res?.data?.requests))
        resolvedRequests = res.data.requests;
      else if (Array.isArray(payload)) resolvedRequests = payload;

      // normalize items to have id, newDeviceId, status, requestedAt
      const normalized = resolvedRequests.map((r: any) => ({
        id:
          r.id ??
          r._id ??
          r.requestId ??
          String(r.newDeviceId ?? Math.random()),
        newDeviceId:
          r.newDeviceId ?? r.deviceId ?? r.new_device_id ?? r.new_device ?? '',
        status: (r.status || r.state || '').toLowerCase(),
        requestedAt:
          r.requestedAt ||
          r.createdAt ||
          r.requested_at ||
          r.created_at ||
          new Date().toISOString(),
      }));

      setDeviceId(resolvedDeviceId ?? user?.registeredDevice?.id ?? null);
      setRequests(normalized);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // reload when screen focuses so UI shows new/updated requests
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const submit = async () => {
    if (!reason.trim()) {
      return Alert.alert(
        'Validation',
        'Please enter a reason for device change',
      );
    }

    setLoading(true);
    try {
      const res = await api.post('/api/devices/request-change', {
        newDeviceId: currentDeviceId,
        reason: reason.trim(),
        deviceName: currentDeviceName,
      });
      if (res?.data?.success) {
        Toast.show({
          type: 'success',
          text1: 'Device change requested',
          visibilityTime: 2500,
        });
        setRequests(prev => [res.data.data, ...prev]);
        setReason('');
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Failed',
          visibilityTime: 2500,
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.message || 'Network error',
        visibilityTime: 2500,
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      const res = await api.post(`/api/devices/requests/${id}/cancel`);
      if (res?.data?.success) {
        setRequests(r => r.filter(x => x.id !== id));
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Failed to cancel',
          visibilityTime: 2500,
        });
      }
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: e?.message || 'Network error',
        visibilityTime: 2500,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Devices</Text>
        <Text style={styles.headerSubtitle}>
          Manage your registered devices
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Device Card */}
        <View style={styles.currentDeviceCard}>
          <View style={styles.deviceIconContainer}>
            <Icon name="smartphone" size={32} color="#6366f1" />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceLabel}>Registered Device</Text>
            <Text style={styles.deviceId}>{deviceId || 'Not registered'}</Text>
          </View>
          {deviceId && (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>

        {/* Request New Device Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Icon name="plus-circle" size={20} color="#6366f1" />
            <Text style={styles.formTitle}>Request Device Change</Text>
          </View>
          <Text style={styles.formDescription}>
            Your current device will be automatically submitted with your
            request
          </Text>

          {/* Current Device Info Display */}
          <View style={styles.deviceInfoDisplay}>
            <View style={styles.infoRow}>
              <Icon name="smartphone" size={16} color="#6366f1" />
              <Text style={styles.infoLabel}>Device Name:</Text>
            </View>
            <Text style={styles.infoValue}>
              {currentDeviceName || 'Loading...'}
            </Text>
          </View>

          <View style={styles.deviceInfoDisplay}>
            <View style={styles.infoRow}>
              <Icon name="hash" size={16} color="#6366f1" />
              <Text style={styles.infoLabel}>Device ID:</Text>
            </View>
            <Text style={styles.infoValue}>
              {currentDeviceId || 'Loading...'}
            </Text>
          </View>

          {/* Reason Input */}
          <View style={styles.inputWrapper}>
            <Icon name="file-text" size={18} color="#94a3b8" />
            <TextInput
              placeholder="Enter reason for device change"
              value={reason}
              onChangeText={setReason}
              style={styles.input}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.requestButton,
              (!reason.trim() || loading) && styles.requestButtonDisabled,
            ]}
            onPress={submit}
            disabled={!reason.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="send" size={18} color="#fff" />
                <Text style={styles.requestButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Requests List */}
        <View style={styles.requestsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Requests</Text>
            {requests.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{requests.length}</Text>
              </View>
            )}
          </View>

          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No device requests</Text>
              <Text style={styles.emptySubtext}>
                Submit a request to change your registered device
              </Text>
            </View>
          ) : (
            requests.map(item => (
              <View key={item.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'pending' && styles.statusPending,
                      item.status === 'approved' && styles.statusApproved,
                      item.status === 'rejected' && styles.statusRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.status === 'pending' && styles.statusTextPending,
                        item.status === 'approved' && styles.statusTextApproved,
                        item.status === 'rejected' && styles.statusTextRejected,
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                  {item.status === 'pending' && (
                    <TouchableOpacity
                      onPress={() => cancelRequest(item.id)}
                      style={styles.cancelBtn}
                    >
                      <Icon name="x" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.requestContent}>
                  <Icon name="smartphone" size={18} color="#64748b" />
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestDeviceId}>
                      {item.newDeviceId}
                    </Text>
                    <Text style={styles.requestDate}>
                      {new Date(item.requestedAt).toLocaleDateString()} at{' '}
                      {new Date(item.requestedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default MyDevicesScreen;
