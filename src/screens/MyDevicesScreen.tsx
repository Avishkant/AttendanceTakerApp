import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type RequestItem = {
  id: string;
  newDeviceId: string;
  status: string;
  requestedAt: string;
};

const MyDevicesScreen: React.FC = () => {
  const { user } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/devices/my');
      if (res?.data?.success) {
        setDeviceId(res.data.deviceId || res.data.data?.deviceId || null);
        setRequests(res.data.requests || res.data.data?.requests || []);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!newDeviceId)
      return Alert.alert('Validation', 'Please enter new device id');
    try {
      const res = await api.post('/api/devices/request-change', {
        newDeviceId,
      });
      if (res?.data?.success) {
        Alert.alert('Requested', 'Device change requested');
        setRequests(prev => [res.data.data, ...prev]);
        setNewDeviceId('');
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Network error');
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      const res = await api.post(`/api/devices/requests/${id}/cancel`);
      if (res?.data?.success) {
        setRequests(r => r.filter(x => x.id !== id));
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to cancel');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Network error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Devices</Text>
      <Text>Registered device: {deviceId ?? 'None'}</Text>

      <View style={styles.form}>
        <TextInput
          placeholder="New device id"
          value={newDeviceId}
          onChangeText={setNewDeviceId}
          style={styles.input}
        />
        <Button title="Request Change" onPress={submit} />
      </View>

      <Text style={{ marginTop: 12, fontWeight: '700' }}>My Requests</Text>
      <FlatList
        data={requests}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.reqRow}>
            <View>
              <Text>{item.newDeviceId}</Text>
              <Text style={{ color: '#666' }}>
                {item.status} · {new Date(item.requestedAt).toLocaleString()}
              </Text>
            </View>
            {item.status === 'pending' ? (
              <Button title="Cancel" onPress={() => cancelRequest(item.id)} />
            ) : null}
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
  container: { flex: 1, padding: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  form: { marginTop: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  reqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default MyDevicesScreen;
