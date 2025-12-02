import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const mark = async (type: 'in' | 'out') => {
    setLoading(true);
    try {
      const res = await api.post('/api/attendance/mark', { type });
      if (res && res.data && res.data.success) {
        Alert.alert('Success', `Marked ${type.toUpperCase()} successfully`);
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to mark attendance');
      }
    } catch (err: any) {
      Alert.alert('Network Error', err?.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome{user?.name ? `, ${user.name}` : ''}
      </Text>
      <Text style={styles.subtitle}>Mark your attendance</Text>
      <View style={styles.row}>
        <View style={styles.btn}>
          <Button
            title="Mark IN"
            onPress={() => mark('in')}
            disabled={loading}
          />
        </View>
        <View style={styles.btn}>
          <Button
            title="Mark OUT"
            onPress={() => mark('out')}
            disabled={loading}
          />
        </View>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#444', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, marginHorizontal: 6 },
});

export default Attendance;
