import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Button,
  TouchableOpacity,
  Alert,
} from 'react-native';
import api from '../api/client';
import EmployeeListItem from '../components/EmployeeListItem';
import { useNavigation } from '@react-navigation/native';

const EmployeesScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const navigation = useNavigation();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/employees', { params: { q } });
      if (res?.data?.success) setEmployees(res.data.data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('employee');
    setPassword('');
  };

  const validate = () => {
    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';
    // simple email regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return 'Email is invalid';
    if (!role.trim()) return 'Role is required';
    if (password && password.length < 6)
      return 'Password must be at least 6 characters';
    return null;
  };

  const submitCreate = async () => {
    const err = validate();
    if (err) return Alert.alert('Validation', err);
    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/employees', {
        name,
        email,
        role,
        password,
      });
      if (res?.data?.success) {
        const created = res.data.data;
        setEmployees(prev => [created, ...prev]);
        resetForm();
        setCreating(false);
        Alert.alert('Success', 'Employee created');
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to create');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          placeholder="Search by name or email..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => load(query)}
          style={styles.search}
        />
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setCreating(true)}
          accessibilityRole="button"
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator /> : null}
      <FlatList
        data={employees}
        keyExtractor={i => i._id}
        renderItem={({ item }) => (
          <EmployeeListItem
            name={item.name}
            email={item.email}
            role={item.role}
            onManage={() =>
              navigation.navigate('EmployeeManage' as any, {
                employeeId: item._id,
              })
            }
          />
        )}
        ListEmptyComponent={() => (
          <Text style={styles.empty}>No employees</Text>
        )}
      />

      <Modal
        visible={creating}
        animationType="slide"
        onRequestClose={() => setCreating(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create Employee</Text>
          <TextInput
            placeholder="Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Role (employee/admin)"
            value={role}
            onChangeText={setRole}
            style={styles.input}
          />
          <TextInput
            placeholder="Password (optional)"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setCreating(false);
                    resetForm();
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Create" onPress={submitCreate} />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  container: { flex: 1, padding: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  createBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  empty: { padding: 12 },
  modalContainer: { flex: 1, padding: 16, justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
});

export default EmployeesScreen;
