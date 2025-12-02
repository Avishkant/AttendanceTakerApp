import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type RecordItem = {
  _id: string;
  type: 'in' | 'out';
  timestamp: string;
  ip?: string;
};

const Records: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordItem[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/attendance/history', {
        params: { limit: 50 },
      });
      if (res && res.data && res.data.success) {
        setRecords(res.data.data || []);
      }
    } catch (err) {
      // ignore for now; user will see empty list
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={records}
          keyExtractor={i => i._id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.type}>{item.type.toUpperCase()}</Text>
              <Text style={styles.time}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={{ padding: 12 }}>No records found</Text>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  type: { fontWeight: '700' },
  time: { color: '#666' },
});

export default Records;
