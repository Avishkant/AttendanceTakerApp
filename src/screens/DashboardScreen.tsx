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
      const res = await api.get('/api/attendance/stats');
      if (res?.data?.success) setStats(res.data.data);
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
