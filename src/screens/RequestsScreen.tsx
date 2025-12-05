import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import api from '../api/client';
import Icon from '../components/Icon';

const RequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'all'>(
    'pending',
  );

  const load = async () => {
    try {
      const res = await api.get('/api/devices/requests');
      if (res?.data?.success) setRequests(res.data.data || []);
    } catch {
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

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'pending') return req.status === 'pending';
    if (activeTab === 'history') return req.status !== 'pending';
    return true; // all
  });

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Requests</Text>
        <Text style={styles.headerSubtitle}>Manage asset approvals</Text>
        <Pressable style={styles.searchIcon}>
          <Icon name="search" size={20} color="#64748b" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'pending' && styles.tabTextActive,
            ]}
          >
            Pending
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.tabTextActive,
            ]}
          >
            History
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'all' && styles.tabTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
      </View>

      {/* Requests List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredRequests.length > 0 ? (
          filteredRequests.map(item => (
            <View key={item._id || item.id} style={styles.requestCard}>
              {/* User Info */}
              <View style={styles.userRow}>
                <View style={styles.userInfo}>
                  {item.user?.avatar ? (
                    <Image
                      source={{ uri: item.user.avatar }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {item.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {item.user?.name || 'Unknown User'}
                    </Text>
                    <Text style={styles.userRole}>
                      {item.user?.role || 'Employee'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.timeAgo}>
                  {getTimeAgo(item.requestedAt)}
                </Text>
              </View>

              {/* Device Info */}
              <View style={styles.deviceCard}>
                <View style={styles.deviceIconContainer}>
                  <Icon name="smartphone" size={20} color="#6366f1" />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>
                    {item.newDeviceId || 'New Device'}
                  </Text>
                  <Text style={styles.deviceDetails}>
                    {item.deviceModel || 'Device Model'} ·{' '}
                    {item.deviceType || 'Mobile'}
                  </Text>
                </View>
              </View>

              {/* Request ID and Actions */}
              <View style={styles.actionsRow}>
                <Text style={styles.requestId}>
                  Request ID: #{item._id?.slice(-3) || '101'}
                </Text>
                {item.status === 'pending' ? (
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={styles.rejectBtn}
                      onPress={() => action(item._id || item.id, 'reject')}
                    >
                      <Icon name="x" size={16} color="#dc2626" />
                      <Text style={styles.rejectText}>Reject</Text>
                    </Pressable>
                    <Pressable
                      style={styles.approveBtn}
                      onPress={() => action(item._id || item.id, 'approve')}
                    >
                      <Icon name="check" size={16} color="#fff" />
                      <Text style={styles.approveText}>Approve</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.statusBadge}>
                    <Text
                      style={[
                        styles.statusText,
                        item.status === 'approved' && styles.statusApproved,
                      ]}
                    >
                      {item.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No {activeTab} requests</Text>
          </View>
        )}
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  searchIcon: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  userDetails: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: '#64748b',
  },
  timeAgo: {
    fontSize: 12,
    color: '#94a3b8',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  deviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  deviceDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestId: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    gap: 4,
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#6366f1',
    gap: 4,
  },
  approveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  statusApproved: {
    color: '#10b981',
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
});

export default RequestsScreen;
