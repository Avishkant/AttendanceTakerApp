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
import Icon from '../components/Icon';
import theme from '../theme';
import api from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

type RecordItem = { _id: string; type: 'in' | 'out'; timestamp: string };

const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
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
  }, [loadRecent]);

  useFocusEffect(
    useCallback(() => {
      loadRecent();
      checkPendingRequest();
      return undefined;
    }, [loadRecent]),
  );

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    Toast.show({
      type: type === 'info' ? 'success' : type,
      text1: message,
      visibilityTime: 2500,
    });
  };

  const checkPendingRequest = useCallback(async () => {
    try {
      const localDeviceId = await AsyncStorage.getItem('deviceId');
      const devRes = await api.get('/api/devices/my-requests');
      const requests = devRes?.data?.data || devRes?.data || [];
      if (localDeviceId && Array.isArray(requests)) {
        const exists = requests.some(
          (r: any) => r.status === 'pending' && r.newDeviceId === localDeviceId,
        );
        setHasPendingRequest(Boolean(exists));
      } else setHasPendingRequest(false);
    } catch {
      // ignore
    }
  }, []);

  const lastOfType = (t: 'in' | 'out') => {
    if (!recent || recent.length === 0) return '—';
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
          'This device is not the one registered to your account.',
        );
        setMarking(null);
        return;
      }

      if (!registeredDeviceId) {
        Alert.alert(
          'Device not registered',
          'This device is not registered for your account.',
        );
        setMarking(null);
        return;
      }

      // attempt mark
      const res = await api.post('/api/attendance/mark', { type });
      if (res?.data?.success) {
        showToast('success', `Marked ${type.toUpperCase()} successfully`);
        await loadRecent();
      } else if (res?.status === 422 || res?.data?.status === 422) {
        showToast('info', res?.data?.message || 'Business rule error');
      } else
        showToast('error', res?.data?.message || 'Failed to mark attendance');
    } catch (err: any) {
      const status = err?.response?.status;
      const srvMsg = err?.response?.data?.message || err?.message;
      if (status === 403)
        Alert.alert(
          'Forbidden',
          srvMsg || 'You are not allowed to mark attendance from this device.',
        );
      else if (status === 422)
        showToast('info', srvMsg || 'Business rule error');
      else if (status === 401)
        Alert.alert('Session expired', 'Please login again.');
      else
        Alert.alert(
          'Network',
          err?.message || 'Network error — action may be queued',
        );
    } finally {
      setMarking(null);
    }
  };

  // helpers to compute work & break durations from today's records
  const getAsc = (records: RecordItem[]) =>
    [...(records || [])].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

  const firstIn = (records: RecordItem[] | null) => {
    const asc = getAsc(records || []);
    const first = asc.find(r => r.type === 'in');
    return first ? new Date(first.timestamp).getTime() : null;
  };

  const lastOut = (records: RecordItem[] | null) => {
    const asc = getAsc(records || []);
    for (let i = asc.length - 1; i >= 0; i--) {
      if (asc[i].type === 'out') return new Date(asc[i].timestamp).getTime();
    }
    return null;
  };

  const isCheckedIn = (records: RecordItem[] | null) => {
    const asc = getAsc(records || []);
    if (asc.length === 0) return false;
    return asc[asc.length - 1].type === 'in';
  };

  const totalWorkedMs = (records: RecordItem[] | null) => {
    const asc = getAsc(records || []);
    let worked = 0;
    let currentIn: number | null = null;
    for (const r of asc) {
      const ts = new Date(r.timestamp).getTime();
      if (r.type === 'in') {
        currentIn = ts;
      } else if (r.type === 'out') {
        if (currentIn !== null) {
          worked += Math.max(0, ts - currentIn);
          currentIn = null;
        }
      }
    }
    // currently checked in -> add running time
    if (currentIn !== null) {
      worked += Date.now() - currentIn;
    }
    return worked;
  };

  const totalBreakMs = (records: RecordItem[] | null) => {
    const asc = getAsc(records || []);
    let breakMs = 0;
    for (let i = 0; i < asc.length - 1; i++) {
      const cur = asc[i];
      const nxt = asc[i + 1];
      if (cur.type === 'out' && nxt.type === 'in') {
        breakMs += Math.max(
          0,
          new Date(nxt.timestamp).getTime() - new Date(cur.timestamp).getTime(),
        );
      }
    }
    return breakMs;
  };

  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return '00:00:00';
    const total = Math.floor(ms / 1000);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString();
  };

  // keep a ticking state to re-render running timer while checked in
  const [, setTick] = useState(0);
  useEffect(() => {
    let id: any = null;
    if (isCheckedIn(recent)) {
      id = setInterval(() => setTick(t => t + 1), 1000);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [recent]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.welcome}>
            Welcome{user?.name ? `, ${user.name}` : ''}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Logout"
            onPress={() => signOut()}
            style={styles.headerIcon}
          >
            <Icon name="log-out" size={18} color={theme.COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.segmentRow}>
          <View style={[styles.segmentPill, styles.segmentActive]}>
            <Text style={styles.segmentTextActive}>Office</Text>
          </View>
        </View>
      </View>
      <View style={styles.contentWrap}>
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.currentTime}>
              {new Date().toLocaleTimeString()}
            </Text>
            {/* Render Check In or Check Out + Break depending on status */}
            {isCheckedIn(recent) ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.outlineBtn]}
                  onPress={() => mark('out')}
                  disabled={marking !== null}
                >
                  <Text style={styles.outlineBtnText}>
                    {marking === 'out' ? '...' : 'Break'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkOutBtn]}
                  onPress={() => mark('out')}
                  disabled={marking !== null}
                >
                  {marking === 'out' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.checkBtnText}>Check Out</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={() => mark('in')}
                disabled={marking !== null}
              >
                {marking === 'in' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.checkBtnText}>Check In</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.smallStatsRow}>
            <View style={styles.smallStat}>
              <Text style={styles.smallStatLabel}>First IN</Text>
              <Text style={styles.smallStatSub}>
                {formatTime(firstIn(recent))}
              </Text>
            </View>
            <View style={styles.smallStat}>
              <Text style={styles.smallStatLabel}>Last OUT</Text>
              <Text style={styles.smallStatSub}>
                {formatTime(lastOut(recent))}
              </Text>
            </View>
            <View style={styles.smallStat}>
              <Text style={styles.smallStatLabel}>Working</Text>
              <Text style={styles.smallStatSub}>
                {formatDuration(totalWorkedMs(recent) - totalBreakMs(recent))}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.requestBtn}
          onPress={() => navigation.navigate('Requests')}
        >
          <Text style={styles.requestBtnText}>+ Request</Text>
        </TouchableOpacity>

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
      </View>
      {/* toast handled by react-native-toast-message mounted at app root */}
    </View>
  );
};

const RecentEmpty = () => (
  <Text style={styles.emptyText}>No recent activity</Text>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.COLORS.bgLight },
  header: {
    backgroundColor: theme.COLORS.primary,
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: theme.COLORS.white, marginLeft: 8, fontSize: 12 },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: {
    color: theme.COLORS.white,
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
  },
  segmentRow: { flexDirection: 'row', marginTop: 12 },
  segmentPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  segmentActive: { backgroundColor: theme.COLORS.white },
  segmentText: { color: 'rgba(255,255,255,0.9)' },
  segmentTextActive: { color: theme.COLORS.primary, fontWeight: '700' },

  contentWrap: { flex: 1, padding: 16, marginTop: -28 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.COLORS.card,
    ...theme.SHADOW,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentTime: { fontSize: 22, fontWeight: '800' },
  checkBtn: {
    backgroundColor: theme.COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  checkBtnText: { color: theme.COLORS.white, fontWeight: '700' },

  smallStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  smallStat: { alignItems: 'center', flex: 1 },
  smallStatLabel: { fontWeight: '700', marginTop: 6 },
  smallStatSub: { color: theme.COLORS.neutralText, fontSize: 12 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statLabel: { color: theme.COLORS.neutralText, fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 6 },

  requestBtn: {
    marginTop: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  requestBtnText: { color: theme.COLORS.primary, fontWeight: '700' },

  // preserved styles below
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
  actionRow: { flexDirection: 'row', gap: 8 },
  outlineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
    marginRight: 8,
  },
  outlineBtnText: { color: theme.COLORS.primary, fontWeight: '700' },
  checkOutBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
});

export default HomeScreen;
