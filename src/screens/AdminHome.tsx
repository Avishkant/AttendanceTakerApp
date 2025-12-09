import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../api/client';
import Icon from '../components/Icon';

const AdminHome: React.FC = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    setError(null);
    try {
      // Fetch employees, device requests, and recent attendance
      const [empRes, reqRes] = await Promise.allSettled([
        api.get('/api/admin/employees'),
        api.get('/api/devices/requests'),
      ]);

      const s: any = { checkedIn: 0, total: 0, percent: 0 };
      let employees: any[] = [];

      if (empRes.status === 'fulfilled') {
        const d = empRes.value?.data;
        const arr = d?.success ? d.data : d;
        employees = Array.isArray(arr) ? arr : [];
        s.totalEmployees = employees.length;
        s.total = employees.length;
      } else {
        s.totalEmployees = 0;
        s.total = 0;
      }

      if (reqRes.status === 'fulfilled') {
        const d = reqRes.value?.data;
        const arr = d?.success ? d.data : d;
        if (Array.isArray(arr)) {
          const pending = arr.filter((r: any) => r.status === 'pending');
          s.pendingRequests = pending.length;
          setRequests(pending);
        } else {
          s.pendingRequests = 0;
          setRequests([]);
        }
      } else {
        s.pendingRequests = 0;
        setRequests([]);
      }

      // Fetch today's attendance to calculate checked-in status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const checkedInUsers = new Set();
      const recentAttendance: any[] = [];

      // Fetch attendance for all employees
      const attendancePromises = employees.map((emp: any) =>
        api
          .get(`/api/admin/employees/${emp._id}/attendance`, {
            params: {
              from: today.toISOString(),
              to: tomorrow.toISOString(),
              limit: 50,
            },
          })
          .then((res: any) => ({
            user: emp,
            data: res?.data?.data || [],
          }))
          .catch(() => ({ user: emp, data: [] })),
      );

      const attendanceResults = await Promise.all(attendancePromises);

      attendanceResults.forEach((result: any) => {
        const records = result.data || [];
        // Add to recent attendance for live feed
        records.forEach((record: any) => {
          recentAttendance.push({
            ...record,
            user: result.user,
          });
        });

        // Check if user has checked in today (last record is 'in')
        if (records.length > 0) {
          const sortedRecords = records.sort(
            (a: any, b: any) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
          const lastRecord = sortedRecords[0];
          if (lastRecord.type === 'in') {
            checkedInUsers.add(result.user._id);
          }
        }
      });

      s.checkedIn = checkedInUsers.size;
      s.percent = s.total > 0 ? Math.round((s.checkedIn / s.total) * 100) : 0;

      setStats(s);

      // Sort recent attendance by timestamp and take the latest 5
      const sortedFeed = recentAttendance.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setLiveFeed(sortedFeed.slice(0, 5));
    } catch (e: any) {
      setError(e?.message || 'Failed to load admin stats');
    } finally {
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>{formatDate()}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {/* Attendance Card */}
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <Text style={styles.attendanceTitle}>ATTENDANCE</Text>
              <View style={styles.activeIndicator}>
                <View style={styles.activeDot} />
              </View>
            </View>
            <Text style={styles.attendancePercent}>
              {stats?.percent ?? 84}%
            </Text>
            <Text style={styles.attendanceSubtext}>
              {stats?.checkedIn ?? 42}/{stats?.total ?? 50} Checked in
            </Text>
          </View>

          {/* Requests Card */}
          <View style={styles.requestsCard}>
            <Text style={styles.requestsTitle}>REQUESTS</Text>
            <Text style={styles.requestsCount}>
              {(stats?.pendingRequests ?? 3).toString().padStart(2, '0')}
            </Text>
            <Text style={styles.requestsSubtext}>Requires Approval</Text>
          </View>
        </View>

        {/* Administration Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ADMINISTRATION</Text>
        </View>
        <View style={styles.adminRow}>
          <Pressable
            style={styles.adminCard}
            onPress={() => navigation.navigate('IPRestrictions')}
          >
            <View
              style={[
                styles.adminIconContainer,
                { backgroundColor: '#ede9fe' },
              ]}
            >
              <Icon name="shield" size={24} color="#6366f1" />
            </View>
            <Text style={styles.adminTitle}>IP Config</Text>
            <Text style={styles.adminSubtitle}>Manage allowed networks</Text>
          </Pressable>

          <Pressable
            style={styles.adminCard}
            onPress={() => navigation.navigate('Records')}
          >
            <View
              style={[
                styles.adminIconContainer,
                { backgroundColor: '#d1fae5' },
              ]}
            >
              <Icon name="file-text" size={24} color="#10b981" />
            </View>
            <Text style={styles.adminTitle}>Records</Text>
            <Text style={styles.adminSubtitle}>View full history logs</Text>
          </Pressable>
        </View>

        <View style={styles.adminRow}>
          <Pressable
            style={styles.adminCard}
            onPress={() => navigation.navigate('GoogleSheets')}
          >
            <View
              style={[
                styles.adminIconContainer,
                { backgroundColor: '#d1fae5' },
              ]}
            >
              <Icon name="database" size={24} color="#10b981" />
            </View>
            <Text style={styles.adminTitle}>Sheets Sync</Text>
            <Text style={styles.adminSubtitle}>Google Sheets export</Text>
          </Pressable>

          <Pressable
            style={styles.adminCard}
            onPress={() => navigation.navigate('Analytics')}
          >
            <View
              style={[
                styles.adminIconContainer,
                { backgroundColor: '#dbeafe' },
              ]}
            >
              <Icon name="bar-chart-2" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.adminTitle}>Analytics</Text>
            <Text style={styles.adminSubtitle}>View detailed reports</Text>
          </Pressable>
        </View>

        {/* <View style={styles.adminRow}>
          <Pressable
            style={styles.adminCard}
            onPress={() =>
              Alert.alert('Settings', 'Settings feature coming soon!')
            }
          >
            <View
              style={[
                styles.adminIconContainer,
                { backgroundColor: '#fef3c7' },
              ]}
            >
              <Icon name="settings" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.adminTitle}>Settings</Text>
            <Text style={styles.adminSubtitle}>App configuration</Text>
          </Pressable>
        </View> */}

        {/* Live Feed Section */}
        <View style={styles.liveFeedHeader}>
          <Text style={styles.sectionTitle}>LIVE FEED</Text>
          <Pressable>
            <Text style={styles.viewAllBtn}>View All</Text>
          </Pressable>
        </View>

        {liveFeed.length > 0 ? (
          liveFeed.map((item, idx) => (
            <View key={idx} style={styles.feedItem}>
              <View style={styles.feedIndicator}>
                <View style={styles.feedDot} />
              </View>
              <View style={styles.feedContent}>
                <Text style={styles.feedText}>
                  <Text style={styles.feedName}>
                    {item.user?.name || 'Unknown User'}
                  </Text>{' '}
                  <Text style={styles.feedAction}>
                    {item.type === 'in' ? 'checked in.' : 'checked out.'}
                  </Text>
                </Text>
                <Text style={styles.feedTime}>
                  {getTimeAgo(item.timestamp)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.feedEmpty}>
            <Text style={styles.feedEmptyText}>No recent activity</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  attendanceCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendanceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  attendancePercent: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  attendanceSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  requestsCard: {
    flex: 0.8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  requestsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 16,
  },
  requestsCount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#6366f1',
    marginBottom: 4,
  },
  requestsSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  adminRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  adminCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adminIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  adminSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  liveFeedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllBtn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  feedIndicator: {
    width: 20,
    alignItems: 'flex-start',
    paddingTop: 6,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  feedContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  feedText: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 4,
    lineHeight: 20,
  },
  feedName: {
    fontWeight: '700',
  },
  feedAction: {
    fontWeight: '400',
  },
  feedTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  feedEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  feedEmptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default AdminHome;
