import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Pressable,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type AttendanceRecord = {
  _id: string;
  type: 'in' | 'out';
  timestamp: string;
  ip?: string;
  user: {
    _id: string;
    name?: string;
    email?: string;
  };
};

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

const Records: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>(
    [],
  );
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  const loadRecords = async () => {
    try {
      if (user?.role === 'admin') {
        // Load all employees
        const empRes = await api.get('/api/admin/employees');
        const empList = empRes?.data?.success ? empRes.data.data : [];
        setEmployees(empList || []);

        // Load attendance for all employees
        const requests = empList.map((emp: any) =>
          api
            .get(`/api/admin/employees/${emp._id}/attendance`, {
              params: { limit: 100 },
            })
            .then((res: any) => ({
              user: emp,
              data: res?.data?.data || [],
            }))
            .catch(() => ({ user: emp, data: [] })),
        );

        const results = await Promise.all(requests);
        const allRecords: AttendanceRecord[] = [];

        results.forEach((result: any) => {
          (result.data || []).forEach((record: any) => {
            allRecords.push({
              ...record,
              user: {
                _id: result.user._id,
                name: result.user.name,
                email: result.user.email,
              },
            });
          });
        });

        // Sort by timestamp descending (newest first)
        allRecords.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        setRecords(allRecords);
        setFilteredRecords(allRecords);
      } else {
        // Employee view - show their own records
        const res = await api.get('/api/attendance/history', {
          params: { limit: 100 },
        });
        if (res?.data?.success) {
          const data = res.data.data || [];
          setRecords(data);
          setFilteredRecords(data);
        }
      }
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  // Filter records based on search and date
  useEffect(() => {
    let filtered = [...records];

    // Apply date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= today;
        });
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= yesterday && recordDate < today;
        });
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= weekAgo;
        });
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= monthAgo;
        });
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          filtered = filtered.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= customStartDate && recordDate <= customEndDate;
          });
        }
        break;
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(record => {
        const userName = record.user?.name?.toLowerCase() || '';
        const userEmail = record.user?.email?.toLowerCase() || '';
        const type = record.type.toLowerCase();
        const ip = record.ip?.toLowerCase() || '';

        return (
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          type.includes(searchLower) ||
          ip.includes(searchLower)
        );
      });
    }

    setFilteredRecords(filtered);
  }, [search, records, dateFilter, customStartDate, customEndDate]);

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return {
      date: `${month} ${day}, ${year}`,
      time: `${hours}:${minutes}`,
    };
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      case 'custom':
        return 'Custom Range';
      default:
        return 'All Time';
    }
  };

  const renderRecord = ({ item }: { item: AttendanceRecord }) => {
    const { date, time } = formatDateTime(item.timestamp);
    const isCheckIn = item.type === 'in';
    const isEmployee = user?.role !== 'admin';

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <View style={styles.userInfo}>
            <View
              style={[
                styles.typeIndicator,
                isCheckIn ? styles.checkInIndicator : styles.checkOutIndicator,
              ]}
            >
              <Icon
                name={isCheckIn ? 'log-in' : 'log-out'}
                size={16}
                color="#fff"
              />
            </View>
            <View style={styles.userDetails}>
              {!isEmployee && (
                <>
                  <Text style={styles.userName}>
                    {item.user?.name || 'Unknown User'}
                  </Text>
                  {item.user?.email && (
                    <Text style={styles.userEmail}>{item.user.email}</Text>
                  )}
                </>
              )}
              {isEmployee && (
                <Text style={styles.userName}>
                  {isCheckIn ? 'Checked In' : 'Checked Out'}
                </Text>
              )}
            </View>
          </View>
          <View
            style={[
              styles.typeBadge,
              isCheckIn ? styles.checkInBadge : styles.checkOutBadge,
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                isCheckIn ? styles.checkInBadgeText : styles.checkOutBadgeText,
              ]}
            >
              {isCheckIn ? 'Check In' : 'Check Out'}
            </Text>
          </View>
        </View>
        <View style={styles.recordMeta}>
          <View style={styles.metaItem}>
            <Icon name="calendar" size={14} color="#64748b" />
            <Text style={styles.metaText}>{date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="clock" size={14} color="#64748b" />
            <Text style={styles.metaText}>{time}</Text>
          </View>
          {item.ip && (
            <View style={styles.metaItem}>
              <Icon name="globe" size={14} color="#64748b" />
              <Text style={styles.metaText}>{item.ip}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Attendance Records</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Attendance Records</Text>
        <Pressable style={styles.backBtn}>
          <Icon name="download" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Search Bar & Filter */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              user?.role === 'admin'
                ? 'Search by name, email, or IP...'
                : 'Search...'
            }
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="filter" size={18} color="#6366f1" />
          <Text style={styles.filterButtonText}>{getFilterLabel()}</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{filteredRecords.length}</Text>
          <Text style={styles.statLabel}>Total Records</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {filteredRecords.filter(r => r.type === 'in').length}
          </Text>
          <Text style={styles.statLabel}>Check Ins</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {filteredRecords.filter(r => r.type === 'out').length}
          </Text>
          <Text style={styles.statLabel}>Check Outs</Text>
        </View>
      </View>

      {/* Records List */}
      <FlatList
        data={filteredRecords}
        renderItem={renderRecord}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No records found</Text>
            <Text style={styles.emptySubtext}>
              {search
                ? 'Try adjusting your search'
                : 'Attendance records will appear here'}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Date</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <Icon name="x" size={24} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView style={styles.filterOptions}>
              {(
                ['all', 'today', 'yesterday', 'week', 'month'] as DateFilter[]
              ).map(filter => (
                <Pressable
                  key={filter}
                  style={[
                    styles.filterOption,
                    dateFilter === filter && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setDateFilter(filter);
                    setShowFilterModal(false);
                  }}
                >
                  <View style={styles.filterOptionContent}>
                    <Icon
                      name={filter === 'all' ? 'calendar' : 'clock'}
                      size={20}
                      color={dateFilter === filter ? '#6366f1' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        dateFilter === filter && styles.filterOptionTextActive,
                      ]}
                    >
                      {filter === 'all'
                        ? 'All Time'
                        : filter === 'today'
                        ? 'Today'
                        : filter === 'yesterday'
                        ? 'Yesterday'
                        : filter === 'week'
                        ? 'Last 7 Days'
                        : 'Last 30 Days'}
                    </Text>
                  </View>
                  {dateFilter === filter && (
                    <Icon name="check" size={20} color="#6366f1" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
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
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkInIndicator: {
    backgroundColor: '#10b981',
  },
  checkOutIndicator: {
    backgroundColor: '#f59e0b',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  checkInBadge: {
    backgroundColor: '#d1fae5',
  },
  checkOutBadge: {
    backgroundColor: '#fed7aa',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkInBadgeText: {
    color: '#065f46',
  },
  checkOutBadgeText: {
    color: '#92400e',
  },
  recordMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterOptions: {
    padding: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterOptionActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  filterOptionTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
});

export default Records;
