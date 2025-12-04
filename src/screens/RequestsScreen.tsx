import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert } from 'react-native';
import api from '../api/client';
import AdminHeader from '../components/AdminHeader';
import PrimaryButton from '../components/PrimaryButton';
import Container from '../components/Container';
import AnimatedCard from '../components/AnimatedCard';
import theme from '../theme';

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
    <Container>
      <View style={{ padding: theme.SPACING.md, flex: 1 }}>
        <AdminHeader
          title="Device Requests"
          subtitle="Approve or reject device changes"
        />

        <FlatList
          data={requests}
          keyExtractor={i => i._id || i.id}
          renderItem={({ item }) => (
            <AnimatedCard style={{ marginBottom: theme.SPACING.sm }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqTitle}>{item.newDeviceId}</Text>
                  <Text style={styles.reqMeta}>
                    {item.user?.name} ·{' '}
                    {new Date(item.requestedAt).toLocaleString()}
                  </Text>
                  <Text style={styles.status}>{item.status}</Text>
                </View>
                <View
                  style={{ alignItems: 'flex-end', justifyContent: 'center' }}
                >
                  {item.status === 'pending' ? (
                    <View style={{ flexDirection: 'row' }}>
                      <PrimaryButton
                        title="Approve"
                        onPress={() => action(item._id || item.id, 'approve')}
                        icon="check"
                        style={{ marginRight: 8 }}
                      />
                      <PrimaryButton
                        title="Reject"
                        onPress={() => action(item._id || item.id, 'reject')}
                        icon="x"
                        secondary
                      />
                    </View>
                  ) : (
                    <PrimaryButton
                      title="Delete"
                      onPress={() => action(item._id || item.id, 'delete')}
                      secondary
                      icon="trash"
                    />
                  )}
                </View>
              </View>
            </AnimatedCard>
          )}
          ListEmptyComponent={() => (
            <Text style={{ padding: theme.SPACING.md }}>No requests</Text>
          )}
        />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    backgroundColor: theme.COLORS.cardElevated,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  reqTitle: { fontWeight: '800', color: theme.COLORS.black, marginBottom: 6 },
  reqMeta: { color: theme.COLORS.neutralText },
  status: { marginTop: 8, color: theme.COLORS.primary, fontWeight: '600' },
});

export default RequestsScreen;
