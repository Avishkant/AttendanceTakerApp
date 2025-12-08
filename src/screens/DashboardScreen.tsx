import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import api from '../api/client';
import Icon from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setRefreshing(true);
    try {
      // Load MY attendance stats for current month
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const to = now.toISOString();

      const hist = await api.get('/api/attendance/history', {
        params: { from, to, limit: 200 }, // Reduced from 500
      });
      const records = hist?.data?.data || [];

      // Calculate days worked this month (optimized)
      const daysSet = new Set<string>();
      let totalCheckins = 0;
      let totalCheckouts = 0;

      records.forEach((r: any) => {
        const d = new Date(r.timestamp);
        daysSet.add(d.toISOString().slice(0, 10));
        if (r.type === 'in') totalCheckins++;
        else if (r.type === 'out') totalCheckouts++;
      });

      const daysWorked = daysSet.size;

      // Calculate current month working days (excluding weekends)
      const year = now.getFullYear();
      const month = now.getMonth();
      let workingDays = 0;
      for (let day = 1; day <= now.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
      }

      const attendancePercent =
        workingDays > 0 ? Math.round((daysWorked / workingDays) * 100) : 0;

      setStats({
        daysWorked,
        totalCheckIns: totalCheckins,
        totalCheckOuts: totalCheckouts,
        attendancePercent,
        workingDays,
      });

      // Load MY device requests (in parallel)
      const reqPromise = api
        .get('/api/devices/my-requests')
        .catch(() => ({ data: [] }));

      // Use recent records as activity
      setRecentActivity(records.slice(0, 5));

      // Wait for requests to complete
      const reqRes = await reqPromise;
      const myReqs = reqRes?.data?.success
        ? reqRes.data.data
        : reqRes?.data || [];
      setMyRequests(Array.isArray(myReqs) ? myReqs : []);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Dashboard</Text>
            <Text style={styles.headerSubtitle}>{formatDate()}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Dashboard</Text>
          <Text style={styles.headerSubtitle}>{formatDate()}</Text>
        </View>
        <View style={styles.userBadge}>
          <Icon name="user" size={16} color="#6366f1" />
          <Text style={styles.userName}>
            {user?.name?.split(' ')[0] || 'Me'}
          </Text>
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
            {stats?.attendancePercent ?? 0}%
          </Text>
          <Text style={styles.attendanceSubtext}>
            {stats?.daysWorked ?? 0}/{stats?.workingDays ?? 0} Days worked
          </Text>
        </View>

        {/* Check-ins Card */}
        <View style={styles.requestsCard}>
          <Text style={styles.requestsTitle}>MY CHECK-INS</Text>
          <Text style={styles.requestsCount}>{stats?.totalCheckIns ?? 0}</Text>
          <Text style={styles.requestsSubtext}>This month</Text>
        </View>
      </View>

      {/* My Requests Section */}
      {myRequests.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Device Requests</Text>
            <Text style={styles.sectionCount}>{myRequests.length}</Text>
          </View>

          <View style={styles.requestsList}>
            {myRequests.slice(0, 3).map((req: any, idx: number) => (
              <View key={idx} style={styles.requestItem}>
                <View style={styles.requestLeft}>
                  <View
                    style={[
                      styles.requestIconContainer,
                      req.status === 'pending' && styles.pendingBg,
                      req.status === 'approved' && styles.approvedBg,
                      req.status === 'rejected' && styles.rejectedBg,
                    ]}
                  >
                    <Icon
                      name={
                        req.status === 'pending'
                          ? 'clock'
                          : req.status === 'approved'
                          ? 'check-circle'
                          : 'x-circle'
                      }
                      size={18}
                      color={
                        req.status === 'pending'
                          ? '#f59e0b'
                          : req.status === 'approved'
                          ? '#10b981'
                          : '#ef4444'
                      }
                    />
                  </View>
                  <View>
                    <Text style={styles.requestUser}>
                      {req.deviceName || 'Device Change'}
                    </Text>
                    <Text style={styles.requestTime}>
                      {getTimeAgo(req.createdAt)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    req.status === 'pending' && styles.pendingBadge,
                    req.status === 'approved' && styles.approvedBadge,
                    req.status === 'rejected' && styles.rejectedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      req.status === 'pending' && styles.pendingText,
                      req.status === 'approved' && styles.approvedText,
                      req.status === 'rejected' && styles.rejectedText,
                    ]}
                  >
                    {req.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Recent Activity</Text>
        <Icon name="activity" size={16} color="#94a3b8" />
      </View>

      <View style={styles.liveFeedCard}>
        {recentActivity.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="inbox" size={32} color="#cbd5e1" />
            <Text style={styles.emptyText}>No activity yet</Text>
          </View>
        ) : (
          recentActivity.map((item: any, idx: number) => (
            <View
              key={idx}
              style={[
                styles.feedItem,
                idx < recentActivity.length - 1 && styles.feedItemBorder,
              ]}
            >
              <View
                style={[
                  styles.feedDot,
                  item.type === 'in' ? styles.checkInDot : styles.checkOutDot,
                ]}
              />
              <View style={styles.feedContent}>
                <Text style={styles.feedAction}>
                  {item.type === 'in' ? 'Checked In' : 'Checked Out'}
                </Text>
                <Text style={styles.feedTime}>
                  {getTimeAgo(item.timestamp)}
                </Text>
              </View>
              <Icon
                name={item.type === 'in' ? 'log-in' : 'log-out'}
                size={16}
                color={item.type === 'in' ? '#10b981' : '#f59e0b'}
              />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  requestsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  requestIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBg: {
    backgroundColor: '#fef3c7',
  },
  approvedBg: {
    backgroundColor: '#d1fae5',
  },
  rejectedBg: {
    backgroundColor: '#fee2e2',
  },
  requestUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  approvedBadge: {
    backgroundColor: '#d1fae5',
  },
  rejectedBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pendingText: {
    color: '#92400e',
  },
  approvedText: {
    color: '#065f46',
  },
  rejectedText: {
    color: '#991b1b',
  },
  liveFeedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  feedItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkInDot: {
    backgroundColor: '#10b981',
  },
  checkOutDot: {
    backgroundColor: '#f59e0b',
  },
  feedContent: {
    flex: 1,
  },
  feedAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  feedTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
});

export default DashboardScreen;
