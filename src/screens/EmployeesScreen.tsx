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
  Alert,
} from 'react-native';
import api from '../api/client';
import EmployeeListItem from '../components/EmployeeListItem';
import { useNavigation } from '@react-navigation/native';
import AdminHeader from '../components/AdminHeader';
import PrimaryButton from '../components/PrimaryButton';
import Container from '../components/Container';
import AnimatedCard from '../components/AnimatedCard';
import theme from '../theme';

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
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return 'Email is invalid';
    if (!role.trim()) return 'Role is required';
    if (password && password.length > 0 && password.length < 6)
      return 'Password must be at least 6 characters';
    return null;
  };

  return (
    <Container>
      <View style={{ padding: theme.SPACING.md, flex: 1 }}>
        <AdminHeader title="Employees" subtitle="Manage your team" />

        <AnimatedCard style={{ marginBottom: theme.SPACING.sm }}>
          <View style={styles.headerRow}>
            <TextInput
              placeholder="Search by name or email..."
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => load(query)}
              style={styles.search}
              placeholderTextColor={theme.COLORS.neutralText}
            />
            <PrimaryButton
              title="+ Create"
              onPress={() => setCreating(true)}
              style={styles.createBtn}
              icon="plus"
            />
          </View>
        </AnimatedCard>

        {loading ? (
          <ActivityIndicator style={{ marginTop: theme.SPACING.sm }} />
        ) : null}
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
          <Container>
            <AnimatedCard style={{ margin: theme.SPACING.md }}>
              <Text style={styles.modalTitle}>Create Employee</Text>
              <TextInput
                placeholder="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor={theme.COLORS.neutralText}
              />
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.COLORS.neutralText}
              />
              <TextInput
                placeholder="Role (employee/admin)"
                value={role}
                onChangeText={setRole}
                style={styles.input}
                placeholderTextColor={theme.COLORS.neutralText}
              />
              <TextInput
                placeholder="Password (optional)"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                placeholderTextColor={theme.COLORS.neutralText}
              />
              {submitting ? (
                <ActivityIndicator />
              ) : (
                <View
                  style={{ flexDirection: 'row', marginTop: theme.SPACING.md }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <PrimaryButton
                      title="Cancel"
                      onPress={() => {
                        setCreating(false);
                        resetForm();
                      }}
                      secondary
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      title="Create"
                      onPress={submitCreate}
                      icon="check"
                    />
                  </View>
                </View>
              )}
            </AnimatedCard>
          </Container>
        </Modal>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    color: '#fff',
  },
  container: { flex: 1, padding: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  createBtn: {
    marginLeft: 8,
  },
  empty: { padding: 12 },
  modalContainer: { flex: 1, padding: 16, justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});

export default EmployeesScreen;
