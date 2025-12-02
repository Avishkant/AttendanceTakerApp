import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import api from '../api/client';

const DashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      // Try server-side stats endpoint first
      let res = null as any;
      try {
        res = await api.get('/api/attendance/stats');
      } catch {
        res = null;
      }
      if (res && res?.data?.success) {
        setStats(res.data.data);
      } else {
        // Fallback: compute basic stats from attendance history for this month
        const now = new Date();
        const from = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).toISOString();
        const to = now.toISOString();
        const hist = await api.get('/api/attendance/history', {
          params: { from, to, limit: 500 },
        });
        const records = hist?.data?.data || [];
        const daysSet = new Set<string>();
        records.forEach((r: any) => {
          const d = new Date(r.timestamp);
          daysSet.add(d.toISOString().slice(0, 10));
        });
        const last = records.length
          ? new Date(records[0].timestamp).toLocaleString()
          : null;
        setStats({
          daysThisMonth: daysSet.size,
          lastAttendance: last,
          onTimePercent: null,
        });
      }
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      contentContainerStyle={{ padding: 12 }}
    >
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Days this month</Text>
        <Text style={styles.cardValue}>{stats?.daysThisMonth ?? '—'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last attendance</Text>
        <Text style={styles.cardValue}>{stats?.lastAttendance ?? '—'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>On-time %</Text>
        <Text style={styles.cardValue}>{stats?.onTimePercent ?? '—'}</Text>
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
  cardTitle: { color: '#666', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700' },
});

export default DashboardScreen;
