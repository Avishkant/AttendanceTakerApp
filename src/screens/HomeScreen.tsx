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
  ScrollView,
} from 'react-native';
import Icon from '../components/Icon';
import theme from '../theme';
import api from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

type RecordItem = {
  _id: string;
  type: 'in' | 'out';
  timestamp: string;
  onBreak?: boolean;
  breaks?: Array<{ start: string; end?: string }>;
};

const HomeScreen: React.FC = () => {
  const { user, signOut, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const [marking, setMarking] = useState<'in' | 'out' | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
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
        params: { from: start.toISOString(), to: end.toISOString(), limit: 20 },
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

  const handleBreak = async (action: 'start' | 'end') => {
    setBreakLoading(true);

    // Optimistically update UI
    const newOnBreak = action === 'start';
    setOnBreak(newOnBreak);

    // Update the recent records optimistically
    if (recent.length > 0) {
      const asc = getAsc(recent);
      const lastRecord = asc[asc.length - 1];
      if (lastRecord.type === 'in') {
        const updatedRecent = recent.map(r => {
          if (r._id === lastRecord._id) {
            const breaks = r.breaks || [];
            if (action === 'start') {
              return {
                ...r,
                onBreak: true,
                breaks: [...breaks, { start: new Date().toISOString() }],
              };
            } else {
              const updatedBreaks = [...breaks];
              if (updatedBreaks.length > 0) {
                updatedBreaks[updatedBreaks.length - 1].end =
                  new Date().toISOString();
              }
              return { ...r, onBreak: false, breaks: updatedBreaks };
            }
          }
          return r;
        });
        setRecent(updatedRecent);
      }
    }

    try {
      const res = await api.post(`/api/attendance/break/${action}`);
      if (res?.data?.success) {
        showToast(
          'success',
          action === 'start' ? 'Break started' : 'Break ended',
        );
        // Reload in background without blocking UI
        loadRecent();
      } else {
        showToast('error', res?.data?.message || `Failed to ${action} break`);
        // Revert optimistic update on error
        setOnBreak(!newOnBreak);
        loadRecent();
      }
    } catch (err: any) {
      const srvMsg = err?.response?.data?.message || err?.message;
      showToast('error', srvMsg || `Failed to ${action} break`);
      // Revert optimistic update on error
      setOnBreak(!newOnBreak);
      loadRecent();
    } finally {
      setBreakLoading(false);
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
        // Subtract any completed breaks within this check-in session
        if (r.breaks) {
          for (const brk of r.breaks) {
            if (brk.end) {
              const breakDuration =
                new Date(brk.end).getTime() - new Date(brk.start).getTime();
              worked -= breakDuration;
            }
          }
        }
      } else if (r.type === 'out') {
        if (currentIn !== null) {
          worked += Math.max(0, ts - currentIn);
          currentIn = null;
        }
      }
    }

    // currently checked in -> add running time
    if (currentIn !== null) {
      const now = Date.now();
      worked += now - currentIn;

      // Subtract completed breaks from current session
      const lastRecord = asc[asc.length - 1];
      if (lastRecord?.breaks) {
        for (const brk of lastRecord.breaks) {
          if (brk.end) {
            const breakDuration =
              new Date(brk.end).getTime() - new Date(brk.start).getTime();
            worked -= breakDuration;
          } else {
            // Currently on break - subtract time since break started
            const breakStart = new Date(brk.start).getTime();
            worked -= now - breakStart;
          }
        }
      }
    }
    return Math.max(0, worked);
  };

  const totalBreakMs = (records: RecordItem[] | null) => {
    const asc = getAsc(records || []);
    let breakMs = 0;
    // Add breaks within check-ins
    for (const r of asc) {
      if (r.type === 'in' && r.breaks) {
        for (const brk of r.breaks) {
          if (brk.end) {
            breakMs += Math.max(
              0,
              new Date(brk.end).getTime() - new Date(brk.start).getTime(),
            );
          } else {
            // Current active break
            breakMs += Math.max(0, Date.now() - new Date(brk.start).getTime());
          }
        }
      }
    }
    // Add time between check-outs and check-ins (lunch breaks, etc.)
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

  // Update break state when records change
  useEffect(() => {
    const asc = getAsc(recent || []);
    if (asc.length > 0) {
      const last = asc[asc.length - 1];
      if (last.type === 'in') {
        setOnBreak(last.onBreak || false);
      } else {
        setOnBreak(false);
      }
    } else {
      setOnBreak(false);
    }
  }, [recent]);

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
      {/* Modern Gradient Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good {getGreeting()}</Text>
            <Text style={styles.welcome}>{user?.name || 'Employee'}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Logout"
            onPress={() => signOut()}
            style={styles.headerIcon}
          >
            <Icon name="log-out" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <Icon name="calendar" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.dateText}>{formatDate()}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentWrap}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  isCheckedIn(recent) && styles.statusDotActive,
                ]}
              />
              <Text style={styles.statusText}>
                {isCheckedIn(recent) ? 'Checked In' : 'Checked Out'}
              </Text>
            </View>
            <Text style={styles.currentTime}>
              {new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {isCheckedIn(recent) ? (
              <>
                <TouchableOpacity
                  style={[styles.breakBtn, onBreak && styles.breakBtnActive]}
                  onPress={() => handleBreak(onBreak ? 'end' : 'start')}
                  disabled={breakLoading || marking !== null}
                >
                  {breakLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Icon
                        name={onBreak ? 'play' : 'pause'}
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.actionBtnText}>
                        {onBreak ? 'End Break' : 'Start Break'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkOutBtn}
                  onPress={() => mark('out')}
                  disabled={marking !== null || onBreak}
                >
                  {marking === 'out' ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Icon name="log-out" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Check Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.checkInBtn}
                onPress={() => mark('in')}
                disabled={marking !== null}
              >
                {marking === 'in' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="log-in" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Check In</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="clock" size={18} color="#6366f1" />
              </View>
              <Text style={styles.statLabel}>First In</Text>
              <Text style={styles.statValue}>
                {formatTime(firstIn(recent))}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="clock" size={18} color="#10b981" />
              </View>
              <Text style={styles.statLabel}>Last Out</Text>
              <Text style={styles.statValue}>
                {formatTime(lastOut(recent))}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="activity" size={18} color="#f59e0b" />
              </View>
              <Text style={styles.statLabel}>Working</Text>
              <Text style={styles.statValue}>
                {formatDuration(totalWorkedMs(recent))}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('Requests')}
          >
            <Icon name="file-text" size={20} color="#6366f1" />
            <Text style={styles.quickActionText}>Request Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('Devices')}
          >
            <Icon name="smartphone" size={20} color="#6366f1" />
            <Text style={styles.quickActionText}>My Devices</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentError ? (
            <View style={styles.errorCard}>
              <Icon name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{recentError}</Text>
              <TouchableOpacity onPress={loadRecent} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {refreshing && recent.length === 0 ? (
            <ActivityIndicator style={styles.loader} color="#6366f1" />
          ) : recent.length === 0 ? (
            <RecentEmpty />
          ) : (
            recent.slice(0, 10).map(item => (
              <View key={item._id} style={styles.activityItem}>
                <View
                  style={[
                    styles.activityIcon,
                    item.type === 'in'
                      ? styles.activityIconIn
                      : styles.activityIconOut,
                  ]}
                >
                  <Icon
                    name={item.type === 'in' ? 'log-in' : 'log-out'}
                    size={16}
                    color="#fff"
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityType}>
                    {item.type === 'in' ? 'Checked In' : 'Checked Out'}
                  </Text>
                  <Text style={styles.activityTime}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const RecentEmpty = () => (
  <View style={styles.emptyState}>
    <Icon name="inbox" size={48} color="#cbd5e1" />
    <Text style={styles.emptyText}>No recent activity</Text>
  </View>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

const formatDate = () => {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  welcome: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dateText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },

  contentWrap: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
    marginTop: -20,
  },

  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  currentTime: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },

  actionContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    gap: 12,
  },
  checkInBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  checkOutBtn: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  breakBtn: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  breakBtnActive: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },

  activitySection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
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
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },

  loader: {
    marginVertical: 20,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconIn: {
    backgroundColor: '#d1fae5',
  },
  activityIconOut: {
    backgroundColor: '#fed7d7',
  },
  activityContent: {
    flex: 1,
  },
  activityType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 13,
    color: '#64748b',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
    fontWeight: '500',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  retryText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default HomeScreen;
