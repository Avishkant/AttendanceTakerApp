import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import api from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

type RecordItem = { _id: string; type: 'in' | 'out'; timestamp: string };

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [marking, setMarking] = useState<'in' | 'out' | null>(null);
  const [recent, setRecent] = useState<RecordItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [requestingDevice, setRequestingDevice] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const loadingRef = useRef(false);

  const loadRecent = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    setRecentError(null);
    try {
      // Fetch today's attendance history (server provides /api/attendance/history)
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const res = await api.get('/api/attendance/history', {
        params: { from: start.toISOString(), to: end.toISOString(), limit: 50 },
      });
      if (res?.data?.success) setRecent(res.data.data || []);
      else if (Array.isArray(res?.data)) setRecent(res.data || []);
    } catch (err: any) {
      console.warn('loadRecent failed', err?.message || err);
      setRecentError(err?.message || 'Failed to load recent activity');
    } finally {
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadRecent();
    checkPendingRequest();
  }, [loadRecent, checkPendingRequest]);

  // refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadRecent();
      checkPendingRequest();
      return undefined;
    }, [loadRecent, checkPendingRequest]),
  );

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    // react-native-toast-message supports 'success' and 'error' types by default
    // map 'info' to 'success' style with different text if desired
    Toast.show({
      type: type === 'info' ? 'success' : type,
      text1: message,
      visibilityTime: 2500,
    });
  };

  const checkPendingRequest = useCallback(async () => {
    try {
      const localDeviceId = await AsyncStorage.getItem('deviceId');
      // server route exposes user's requests at /api/devices/my-requests
      const devRes = await api.get('/api/devices/my-requests');
      const requests = devRes?.data?.data || devRes?.data || [];
      if (localDeviceId && Array.isArray(requests)) {
        const exists = requests.some(
          (r: any) => r.status === 'pending' && r.newDeviceId === localDeviceId,
        );
        setHasPendingRequest(Boolean(exists));
      } else {
        setHasPendingRequest(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const lastOfType = (t: 'in' | 'out') => {
    if (!recent || recent.length === 0) return '—';
    // For 'in' we want the earliest IN of the day; for 'out' the latest OUT
    const items = recent
      .filter(r => r.type === t)
      .map(r => new Date(r.timestamp).getTime());
    if (!items || items.length === 0) return '—';
    const time = t === 'in' ? Math.min(...items) : Math.max(...items);
    return new Date(time).toLocaleTimeString();
  };

  const mark = async (type: 'in' | 'out') => {
    setMarking(type);
    try {
      try {
        // Prefer client-side user info when available; fall back to server if needed
        const registeredDeviceId = user?.registeredDevice?.id ?? null;
        const allowedIps = user?.allowedIPs ?? null;

        const localDeviceId = await AsyncStorage.getItem('deviceId');
        if (
          localDeviceId &&
          registeredDeviceId &&
          localDeviceId !== registeredDeviceId
        ) {
          Alert.alert(
            'Wrong device',
            'This device is not the one registered to your account. Use the approved device to mark attendance.',
          );
          setMarking(null);
          return;
        }

        if (!registeredDeviceId) {
          Alert.alert(
            'Device not registered',
            'This device is not registered for your account. Request device registration or use an approved device.',
          );
          setMarking(null);
          return;
        }

        if (allowedIps && Array.isArray(allowedIps) && allowedIps.length > 0) {
          try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipJson = await ipRes.json();
            const currentIp = ipJson?.ip;
            const allowed = allowedIps.includes(currentIp);
            if (!allowed) {
              Alert.alert(
                'Not allowed',
                'Your current network is not permitted to mark attendance from this device.',
              );
              setMarking(null);
              return;
            }
          } catch {
            // IP check failed; fall back to server-side enforcement
          }
        }
      } catch {
        // device check failed — proceed and let server enforce rules
      }

      const res = await api.post('/api/attendance/mark', { type });
      if (res?.data?.success) {
        showToast('success', `Marked ${type.toUpperCase()} successfully`);
        await loadRecent();
      } else if (res?.status === 422 || res?.data?.status === 422) {
        const msg = res?.data?.message || 'Business rule error';
        showToast('info', msg);
      } else {
        showToast('error', res?.data?.message || 'Failed to mark attendance');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const srvMsg = err?.response?.data?.message || err?.message;
      if (status === 403) {
        Alert.alert(
          'Forbidden',
          srvMsg ||
            'You are not allowed to mark attendance from this device or network.',
        );
      } else if (status === 422) {
        showToast('info', srvMsg || 'Business rule error');
      } else if (status === 401) {
        Alert.alert('Session expired', 'Please login again.');
      } else {
        Alert.alert(
          'Network',
          err?.message || 'Network error — action may be queued',
        );
      }
    } finally {
      setMarking(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome{user?.name ? `, ${user.name}` : ''}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mark Attendance</Text>
        <View style={styles.row}>
          <View style={styles.btnWrap}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Mark IN"
              style={[styles.primaryBtn, marking === 'in' && styles.disabled]}
              onPress={() => mark('in')}
              disabled={marking !== null}
            >
              {marking === 'in' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Mark IN</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.btnWrap}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Mark OUT"
              style={[styles.primaryBtn, marking === 'out' && styles.disabled]}
              onPress={() => mark('out')}
              disabled={marking !== null}
            >
              {marking === 'out' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Mark OUT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.lastRow}>
          <Text>Today's first IN: {lastOfType('in')}</Text>
          <Text>Last OUT: {lastOfType('out')}</Text>
        </View>

        <View style={styles.requestWrap}>
          <Button
            title={
              hasPendingRequest
                ? 'Request Pending'
                : requestingDevice
                ? 'Requesting...'
                : 'Request Device Change'
            }
            onPress={() => {
              if (hasPendingRequest) {
                Alert.alert(
                  'Pending request',
                  'A device change request for this device is already pending. Check My Devices.',
                );
                return;
              }

              Alert.alert(
                'Request device change',
                'Do you want to request this device to be registered as your active device?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm',
                    onPress: async () => {
                      setRequestingDevice(true);
                      try {
                        const deviceId = await AsyncStorage.getItem('deviceId');
                        if (!deviceId) {
                          Alert.alert(
                            'Error',
                            'Could not determine this device id',
                          );
                          setRequestingDevice(false);
                          return;
                        }
                        try {
                          const res = await api.post(
                            '/api/devices/request-change',
                            { newDeviceId: deviceId },
                          );
                          if (res?.data?.success) {
                            showToast('success', 'Device change requested');
                            setHasPendingRequest(true);
                            // navigate to Devices tab to show request status
                            try {
                              navigation.navigate('Devices');
                            } catch {}
                          } else {
                            Alert.alert(
                              'Error',
                              res?.data?.message ||
                                'Failed to request device change',
                            );
                          }
                        } catch (e: any) {
                          const status = e?.response?.status;
                          const srvMsg =
                            e?.response?.data?.message || e?.message;
                          if (status === 409) {
                            // conflict — show friendly message
                            showToast(
                              'info',
                              srvMsg ||
                                'A device change request already exists.',
                            );
                            setHasPendingRequest(true);
                          } else if (status === 422) {
                            showToast('info', srvMsg || 'Validation error');
                          } else {
                            showToast('error', srvMsg || 'Network error');
                          }
                        }
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Network error');
                      } finally {
                        setRequestingDevice(false);
                      }
                    },
                  },
                ],
              );
            }}
            color="#444"
            accessibilityLabel="Request Device Change"
            disabled={requestingDevice || hasPendingRequest}
          />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentError ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{recentError}</Text>
            <Button title="Retry" onPress={loadRecent} />
          </View>
        ) : null}
        <FlatList
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadRecent} />
          }
          data={recent}
          keyExtractor={i => i._id}
          renderItem={({ item }) => (
            <View style={styles.rowItem}>
              <Text style={styles.recentType}>{item.type.toUpperCase()}</Text>
              <Text>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
          )}
          ListEmptyComponent={RecentEmpty}
        />
      </View>
      {/* toast handled by react-native-toast-message mounted at app root */}
    </View>
  );
};

const RecentEmpty = () => (
  <Text style={styles.emptyText}>No recent activity</Text>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  cardTitle: { fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btnWrap: { flex: 1, marginHorizontal: 6 },
  primaryBtn: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  lastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emptyText: { padding: 12 },
  recentType: { fontWeight: '700' },
  requestWrap: { marginTop: 12 },
  content: { flex: 1 },
  errorRow: {
    backgroundColor: '#fee',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { color: '#900', flex: 1, marginRight: 8 },
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 999,
  },
  toastText: { color: '#fff' },
  toastSuccess: { backgroundColor: '#28a745' },
  toastInfo: { backgroundColor: '#17a2b8' },
  toastError: { backgroundColor: '#dc3545' },
});

export default HomeScreen;
