import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import api from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import Toast from 'react-native-toast-message';

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
  headerTitle: { marginTop: 12, fontWeight: '700' },
  muted: { color: '#666' },
  emptyText: { padding: 12 },
  debugContainer: { marginTop: 12 },
  debugTitle: { fontWeight: '700', marginBottom: 6 },
  debugText: { fontSize: 12 },
  loader: { marginTop: 8 },
});

const EmptyRequests = () => <Text style={styles.emptyText}>No requests</Text>;

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
  const [rawResponse, setRawResponse] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer the dedicated endpoint that returns the authenticated user's requests
      let res = null as any;
      try {
        res = await api.get('/api/devices/my-requests');
      } catch {
        // fallback to older /api/devices/my if present
        try {
          res = await api.get('/api/devices/my');
        } catch (e2) {
          res = e2?.response ?? null;
        }
      }
      const payload = res?.data?.data ?? res?.data ?? null;
      // keep a raw copy for debugging when nothing shows
      setRawResponse(res?.data ?? res ?? null);
      if (!payload) {
        // fallback: server returned something unexpected
        console.warn('MyDevices: unexpected response', res?.data ?? res);
      }

      // deviceId may live in several places
      const resolvedDeviceId =
        payload?.deviceId ||
        res?.data?.deviceId ||
        payload?.registeredDeviceId ||
        null;

      // requests may be under payload.requests, res.data.requests, or payload itself
      let resolvedRequests: any[] = [];
      if (Array.isArray(payload?.requests)) resolvedRequests = payload.requests;
      else if (Array.isArray(res?.data?.requests))
        resolvedRequests = res.data.requests;
      else if (Array.isArray(payload)) resolvedRequests = payload;

      // normalize items to have id, newDeviceId, status, requestedAt
      const normalized = resolvedRequests.map((r: any) => ({
        id:
          r.id ??
          r._id ??
          r.requestId ??
          String(r.newDeviceId ?? Math.random()),
        newDeviceId:
          r.newDeviceId ?? r.deviceId ?? r.new_device_id ?? r.new_device ?? '',
        status: (r.status || r.state || '').toLowerCase(),
        requestedAt:
          r.requestedAt ||
          r.createdAt ||
          r.requested_at ||
          r.created_at ||
          new Date().toISOString(),
      }));

      setDeviceId(resolvedDeviceId ?? user?.registeredDevice?.id ?? null);
      setRequests(normalized);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // reload when screen focuses so UI shows new/updated requests
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const submit = async () => {
    if (!newDeviceId)
      return Alert.alert('Validation', 'Please enter new device id');
    try {
      const res = await api.post('/api/devices/request-change', {
        newDeviceId,
      });
      if (res?.data?.success) {
        Toast.show({
          type: 'success',
          text1: 'Device change requested',
          visibilityTime: 2500,
        });
        setRequests(prev => [res.data.data, ...prev]);
        setNewDeviceId('');
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Failed',
          visibilityTime: 2500,
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.message || 'Network error',
        visibilityTime: 2500,
      });
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      const res = await api.post(`/api/devices/requests/${id}/cancel`);
      if (res?.data?.success) {
        setRequests(r => r.filter(x => x.id !== id));
      } else {
        Toast.show({
          type: 'error',
          text1: res?.data?.message || 'Failed to cancel',
          visibilityTime: 2500,
        });
      }
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: e?.message || 'Network error',
        visibilityTime: 2500,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Devices</Text>
      <Text>Registered device: {deviceId ?? 'None'}</Text>
      {loading ? <ActivityIndicator style={styles.loader} /> : null}

      <View style={styles.form}>
        <TextInput
          placeholder="New device id"
          value={newDeviceId}
          onChangeText={setNewDeviceId}
          style={styles.input}
        />
        <Button title="Request Change" onPress={submit} />
      </View>

      <Text style={styles.headerTitle}>My Requests</Text>
      <FlatList
        data={requests}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.reqRow}>
            <View>
              <Text>{item.newDeviceId}</Text>
              <Text style={styles.muted}>
                {item.status} · {new Date(item.requestedAt).toLocaleString()}
              </Text>
            </View>
            {item.status === 'pending' ? (
              <Button title="Cancel" onPress={() => cancelRequest(item.id)} />
            ) : null}
          </View>
        )}
        ListEmptyComponent={EmptyRequests}
      />

      {/* Debug panel: show raw server response when requests are empty */}
      {(!requests || requests.length === 0) && rawResponse ? (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Raw response (debug)</Text>
          <Text style={styles.debugText}>
            {JSON.stringify(rawResponse, null, 2)}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export default MyDevicesScreen;
