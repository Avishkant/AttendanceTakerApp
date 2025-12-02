import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, TextInput, ScrollView } from 'react-native';
import api from '../api/client';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';

type RouteParams = { params: { employeeId: string } };

const EmployeeManageScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, { employeeId: string }>, string>>();
  const employeeId = (route.params as any)?.employeeId;
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState('');
  const navigation = useNavigation();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/employees/${employeeId}`);
      if (res?.data?.success) {
        setEmployee(res.data.data);
        setEditingName(res.data.data.name || '');
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (employeeId) load(); }, [employeeId]);

  const save = async () => {
    try {
      const res = await api.patch(`/api/admin/employees/${employeeId}`, { name: editingName });
      if (res?.data?.success) {
        Alert.alert('Saved');
        load();
      }
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  const deregister = async () => {
    try {
      const res = await api.post(`/api/admin/employees/${employeeId}/deregister-device`);
      if (res?.data?.success) {
        Alert.alert('Deregistered');
        load();
      }
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  const remove = async () => {
    Alert.alert('Confirm', 'Delete user?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await api.delete(`/api/admin/employees/${employeeId}`);
          if (res?.data?.success) {
            Alert.alert('Deleted');
            navigation.goBack();
          }
        } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      } }
    ]);
  };

  if (!employee) return <View style={{ flex: 1, justifyContent: 'center' }}><Text>Loading...</Text></View>;

  return (
    <ScrollView style={{ padding: 12 }}>
      <Text style={styles.title}>{employee.name}</Text>
      <Text style={{ color: '#666' }}>{employee.email}</Text>

      <View style={{ marginTop: 12 }}>
        <Text>Name</Text>
        <TextInput value={editingName} onChangeText={setEditingName} style={styles.input} />
        <Button title="Save" onPress={save} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title="Deregister Device" onPress={deregister} color="#f59e0b" />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title="Delete User" onPress={remove} color="#ef4444" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginTop: 6 }
});

export default EmployeeManageScreen;
