import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, RefreshControl } from 'react-native';
import api from '../api/client';

const AdminHome: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/admin/stats');
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
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />} contentContainerStyle={{ padding: 12 }}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total employees</Text>
        <Text style={styles.cardValue}>{stats?.totalEmployees ?? '—'}</Text>
      </View>
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
  card: { padding: 12, borderRadius: 8, backgroundColor: '#fff', marginBottom: 12 },
  cardTitle: { color: '#666' },
  cardValue: { fontSize: 20, fontWeight: '700' },
});

export default AdminHome;
