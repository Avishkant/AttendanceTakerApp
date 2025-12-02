import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert } from 'react-native';
import api from '../api/client';

const RequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);

  const load = async () => {
    try {
      const res = await api.get('/api/devices/requests');
      if (res?.data?.success) setRequests(res.data.data || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    load();
  }, []);

  const action = async (id: string, act: 'approve' | 'reject' | 'delete') => {
    try {
      if (act === 'delete') {
        await api.delete(`/api/devices/requests/${id}`);
      } else {
        await api.post(`/api/devices/requests/${id}/${act}`);
      }
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    }
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 12 }}>
        Device Change Requests
      </Text>
      <FlatList
        data={requests}
        keyExtractor={i => i._id || i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={{ fontWeight: '700' }}>{item.newDeviceId}</Text>
              <Text style={{ color: '#666' }}>
                {item.user?.name} ·{' '}
                {new Date(item.requestedAt).toLocaleString()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ marginBottom: 6 }}>{item.status}</Text>
              {item.status === 'pending' ? (
                <View style={{ flexDirection: 'row' }}>
                  <Button
                    title="Approve"
                    onPress={() => action(item._id || item.id, 'approve')}
                  />
                  <View style={{ width: 8 }} />
                  <Button
                    title="Reject"
                    onPress={() => action(item._id || item.id, 'reject')}
                    color="#ef4444"
                  />
                </View>
              ) : (
                <Button
                  title="Delete"
                  onPress={() => action(item._id || item.id, 'delete')}
                />
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text style={{ padding: 12 }}>No requests</Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default RequestsScreen;
