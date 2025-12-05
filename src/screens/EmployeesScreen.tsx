import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import api from '../api/client';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';

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
    } catch {
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
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Employees</Text>
        <Pressable style={styles.searchBtn} onPress={() => {}}>
          <Icon name="search" size={20} color="#64748b" />
        </Pressable>
      </View>

      {/* Employee List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {loading && <ActivityIndicator style={styles.loader} />}

        {employees.map(item => (
          <View key={item._id} style={styles.employeeCard}>
            <View style={styles.employeeRow}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {item.name?.charAt(0)?.toUpperCase() || 'E'}
                  </Text>
                </View>
              )}
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{item.name}</Text>
                <Text style={styles.employeeRole}>
                  {item.role || 'Employee'}
                </Text>
              </View>
              <Pressable
                style={styles.manageBtn}
                onPress={() =>
                  navigation.navigate('EmployeeManage' as any, {
                    employeeId: item._id,
                  })
                }
              >
                <Text style={styles.manageBtnText}>Manage</Text>
                <Icon name="chevron-right" size={16} color="#64748b" />
              </Pressable>
            </View>
          </View>
        ))}

        {!loading && employees.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="users" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={creating}
        animationType="slide"
        onRequestClose={() => setCreating(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Employee</Text>
            <Pressable
              onPress={() => setCreating(false)}
              style={styles.modalClose}
            >
              <Icon name="x" size={24} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                placeholder="Enter full name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                placeholder="email@example.com"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Role</Text>
              <TextInput
                placeholder="employee or admin"
                value={role}
                onChangeText={setRole}
                style={styles.input}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password (optional)</Text>
              <TextInput
                placeholder="Minimum 6 characters"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                placeholderTextColor="#94a3b8"
              />
            </View>

            {submitting ? (
              <ActivityIndicator style={styles.submitLoader} />
            ) : (
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={() => {
                    setCreating(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={submitCreate}
                >
                  <Icon name="check" size={16} color="#fff" />
                  <Text style={styles.modalBtnPrimaryText}>Create</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loader: {
    marginVertical: 20,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 13,
    color: '#64748b',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 12,
  },
  bottomSpacer: {
    height: 100,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  submitLoader: {
    marginTop: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  modalBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalBtnPrimary: {
    backgroundColor: '#6366f1',
  },
  modalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default EmployeesScreen;
