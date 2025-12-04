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
import theme from '../theme';

type RecordItem = {
  _id: string;
  type: 'in' | 'out';
  timestamp: string;
  ip?: string;
  user?: { id: string; name?: string } | null;
};

const Records: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [meta, setMeta] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (user?.role === 'admin') {
        // For admin: fetch employees and then fetch each employee's attendance
        const empRes = await api.get('/api/admin/employees');
        const employees = empRes?.data?.success ? empRes.data.data : [];
        // fetch attendance per employee (parallel, with safe failures)
        const requests = employees.map((e: any) =>
          api
            .get(`/api/admin/employees/${e._id}/attendance`, {
              params: { limit: 100 },
            })
            .then((r: any) => ({ user: e, data: r?.data?.data || [] }))
            .catch(() => ({ user: e, data: [] })),
        );
        const results = await Promise.all(requests);
        // flatten and tag with user info
        const all: RecordItem[] = [];
        results.forEach((r: any) => {
          (r.data || []).forEach((rec: any) => {
            all.push({ ...rec, user: { id: r.user._id, name: r.user.name } });
          });
        });
        // sort by timestamp desc
        all.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
        setRecords(all);
        setMeta({ employees: employees.length });
      } else {
        const res = await api.get('/api/attendance/history', {
          params: { limit: 200 },
        });
        if (res && res.data && res.data.success) {
          setRecords(res.data.data || []);
        }
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
              <View style={styles.left}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        item.type === 'in' ? '#E6F0FF' : '#FFE8E8',
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {item.type.toUpperCase()}
                  </Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.time}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                  {item.user?.name ? (
                    <Text style={styles.user}>{item.user.name}</Text>
                  ) : null}
                </View>
              </View>
              {item.ip ? <Text style={styles.meta}>{item.ip}</Text> : null}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  badge: {
    width: 56,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontWeight: '700', color: theme.COLORS.black },
  time: { color: theme.COLORS.muted },
  user: { color: theme.COLORS.muted, marginTop: 4 },
  meta: { color: theme.COLORS.muted, marginLeft: 8 },
});

export default Records;
