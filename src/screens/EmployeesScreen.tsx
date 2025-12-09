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
  RefreshControl,
} from 'react-native';
import api from '../api/client';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';

const EmployeesScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(query);
    setRefreshing(false);
  };

  const handleSearch = () => {
    load(query);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchVisible(false);
    load('');
  };

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
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.searchBtn, searchVisible && styles.searchBtnActive]}
            onPress={() => setSearchVisible(!searchVisible)}
          >
            <Icon
              name={searchVisible ? 'x' : 'search'}
              size={20}
              color={searchVisible ? '#6366f1' : '#64748b'}
            />
          </Pressable>
          <Pressable style={styles.addBtn} onPress={() => setCreating(true)}>
            <Icon name="plus" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Icon name="search" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees by name or email..."
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={clearSearch} style={styles.clearBtn}>
                <Icon name="x" size={16} color="#94a3b8" />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Go</Text>
          </Pressable>
        </View>
      )}

      {/* Employee List */}
      <FlatList
        data={employees}
        keyExtractor={item => item._id || item.id}
        renderItem={({ item }) => (
          <View style={styles.employeeCard}>
            <View style={styles.employeeRow}>
              <View style={styles.avatarContainer}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {item.name?.charAt(0)?.toUpperCase() || 'E'}
                    </Text>
                  </View>
                )}
                <View style={styles.onlineIndicator} />
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{item.name}</Text>
                <Text style={styles.employeeRole}>
                  {item.role?.charAt(0).toUpperCase() + item.role?.slice(1) ||
                    'Employee'}
                </Text>
                {item.email && (
                  <Text style={styles.employeeEmail} numberOfLines={1}>
                    {item.email}
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.manageBtn}
                onPress={() =>
                  navigation.navigate('EmployeeManage' as any, {
                    employeeId: item._id || item.id,
                  })
                }
              >
                <Icon name="chevron-right" size={20} color="#6366f1" />
              </Pressable>
            </View>
          </View>
        )}
        ListHeaderComponent={
          loading && employees.length === 0 ? (
            <ActivityIndicator
              style={styles.loader}
              size="large"
              color="#6366f1"
            />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Icon name="users" size={56} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>
                {query ? 'No results found' : 'No employees yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query
                  ? 'Try adjusting your search'
                  : 'Add your first employee to get started'}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.listContainer,
          employees.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      />

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
              <Text style={styles.inputLabel}>Password </Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#6366f1',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 10,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  listContainer: {
    paddingVertical: 12,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  loader: {
    marginVertical: 20,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 12,
    color: '#94a3b8',
  },
  manageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
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
