import React, { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

type RecordItem = { _id: string; type: 'in' | 'out'; timestamp: string };

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [loadingMark, setLoadingMark] = useState(false);
  const [recent, setRecent] = useState<RecordItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecent = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/attendance', { params: { limit: 5 } });
      if (res?.data?.success) setRecent(res.data.data || []);
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const lastOfType = (t: 'in' | 'out') => {
    const found = recent.find(r => r.type === t);
    return found ? new Date(found.timestamp).toLocaleTimeString() : '—';
  };

  const mark = async (type: 'in' | 'out') => {
    setLoadingMark(true);
    try {
      const res = await api.post('/api/attendance/mark', { type });
      if (res?.data?.success) {
        Alert.alert('Success', `Marked ${type.toUpperCase()} successfully`);
        await loadRecent();
      } else if (res?.status === 422 || res?.data?.status === 422) {
        const msg = res?.data?.message || 'Business rule error';
        Alert.alert('Notice', msg);
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to mark attendance');
      }
    } catch (err: any) {
      // If offline or network error, notify user (queueing not implemented here)
      Alert.alert(
        'Network',
        err?.message || 'Network error — action may be queued',
      );
    } finally {
      setLoadingMark(false);
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
              style={[styles.primaryBtn, loadingMark && styles.disabled]}
              onPress={() => mark('in')}
              disabled={loadingMark}
            >
              {loadingMark ? (
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
              style={[styles.primaryBtn, loadingMark && styles.disabled]}
              onPress={() => mark('out')}
              disabled={loadingMark}
            >
              {loadingMark ? (
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

        <View style={{ marginTop: 12 }}>
          <Button
            title="Request Device Change"
            onPress={() => navigation.navigate('Devices')}
            color="#444"
            accessibilityLabel="Request Device Change"
          />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <FlatList
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadRecent} />
          }
          data={recent}
          keyExtractor={i => i._id}
          renderItem={({ item }) => (
            <View style={styles.rowItem}>
              <Text style={{ fontWeight: '700' }}>
                {item.type.toUpperCase()}
              </Text>
              <Text>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={{ padding: 12 }}>No recent activity</Text>
          )}
        />
      </View>
    </View>
  );
};

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
});

export default HomeScreen;
