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
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      contentContainerStyle={{ padding: 12 }}
    >
      <Text style={styles.title}>Admin Dashboard</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total employees</Text>
        <Text style={styles.cardValue}>{stats?.totalEmployees ?? '—'}</Text>
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={load} />
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending requests</Text>
        <Text style={styles.cardValue}>{stats?.pendingRequests ?? '—'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last 24h marks</Text>
        <Text style={styles.cardValue}>{stats?.last24hMarks ?? '—'}</Text>
      </View>
      <View style={{ marginTop: 12 }}>
        <Button title="Create Employee" onPress={() => {}} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  cardTitle: { color: '#666' },
  cardValue: { fontSize: 20, fontWeight: '700' },
  errorRow: {
    backgroundColor: '#fee',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { color: '#900', flex: 1, marginRight: 8 },
});

export default AdminHome;
