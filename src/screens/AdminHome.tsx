import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  RefreshControl,
} from 'react-native';
import api from '../api/client';
import AdminHeader from '../components/AdminHeader';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import theme from '../theme';
import Container from '../components/Container';
import AnimatedCard from '../components/AnimatedCard';

const AdminHome: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    setError(null);
    try {
      // Attempt legacy single endpoint first (may not exist on this server)
      try {
        const res = await api.get('/api/admin/stats');
        if (res?.status === 200 && res?.data) {
          if (res.data.success && res.data.data) {
            setStats(res.data.data);
            return;
          }
          if (typeof res.data === 'object') {
            setStats(res.data);
            return;
          }
        }
      } catch (err) {
        // ignore; fallback to assembling stats from available endpoints
      }

      // Fallback: fetch employees and device requests to assemble basic stats
      const [empRes, reqRes] = await Promise.allSettled([
        api.get('/api/admin/employees'),
        api.get('/api/devices/requests'),
      ]);

      const s: any = {};
      if (empRes.status === 'fulfilled') {
        const d = empRes.value?.data;
        const arr = d?.success ? d.data : d;
        s.totalEmployees = Array.isArray(arr) ? arr.length : '—';
      } else {
        s.totalEmployees = '—';
      }

      if (reqRes.status === 'fulfilled') {
        const d = reqRes.value?.data;
        const arr = d?.success ? d.data : d;
        if (Array.isArray(arr)) {
          s.pendingRequests = arr.filter(
            (r: any) => r.status === 'pending',
          ).length;
        } else s.pendingRequests = '—';
      } else {
        s.pendingRequests = '—';
      }

      // last24hMarks isn't available via current APIs, leave placeholder
      s.last24hMarks = '—';
      setStats(s);
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

  return (
    <Container scroll contentContainerStyle={{ padding: theme.SPACING.md }}>
      <RefreshControl refreshing={refreshing} onRefresh={load} />
      <AdminHeader
        title="Welcome, Admin"
        subtitle="Overview of your organization"
      />

      {error ? (
        <AnimatedCard style={{ marginBottom: theme.SPACING.md }}>
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={load} />
          </View>
        </AnimatedCard>
      ) : null}

      <AnimatedCard>
        <View style={styles.statsRowTop}>
          <StatCard
            title="Total Employees"
            value={stats?.totalEmployees ?? '—'}
            color={theme.COLORS.primary}
          />
          <StatCard
            title="Pending Requests"
            value={stats?.pendingRequests ?? '—'}
            color={theme.COLORS.warning}
          />
          <StatCard
            title="Last 24h"
            value={stats?.last24hMarks ?? '—'}
            color={theme.COLORS.success}
          />
        </View>
        <View style={styles.actionsRow}>
          <PrimaryButton
            title="+ Add Employee"
            onPress={() => {}}
            icon="plus"
          />
          <PrimaryButton
            title="View Requests"
            onPress={() => {}}
            secondary
            icon="list"
            style={{ marginLeft: theme.SPACING.sm }}
          />
        </View>
      </AnimatedCard>

      <View style={{ height: 32 }} />
    </Container>
  );
};

const styles = StyleSheet.create({
  statsRowTop: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4C1FFB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4C1FFB',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  secondaryText: {
    color: '#EDE9FF',
  },
  errorRow: {
    backgroundColor: 'rgba(255,230,230,0.06)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { color: '#FFBABA', flex: 1, marginRight: 8 },
});

export default AdminHome;
