import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import api from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type DeviceRequest = {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
  newDeviceId: string;
  reason?: string;
  createdAt: string;
  deviceName?: string;
};

const ProfileScreen: React.FC = () => {
  const { user, signOut, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<{
    id: string;
    name: string;
    registered: boolean;
  } | null>(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Load device requests
      const reqRes = await api.get('/api/devices/my-requests');
      const reqs = reqRes?.data?.data || reqRes?.data || [];
      setRequests(Array.isArray(reqs) ? reqs : []);

      // Get current device info
      const deviceId = await AsyncStorage.getItem('deviceId');
      const deviceName = `${Platform.OS} Device (v${Platform.Version})`;
      const isRegistered = user?.registeredDevice?.id === deviceId;

      setDeviceInfo({
        id: deviceId || 'Unknown',
        name: deviceName,
        registered: isRegistered,
      });

      // Refresh user data
      await refreshUser();
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ],
      { cancelable: true },
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#d1fae5';
      case 'rejected':
        return '#fee2e2';
      default:
        return '#fef3c7';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
    return `${
      months[date.getMonth()]
    } ${date.getDate()}, ${date.getFullYear()}`;
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
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
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable style={styles.refreshBtn} onPress={loadProfileData}>
          <Icon name="refresh-cw" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Icon name="user" size={32} color="#6366f1" />
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Employee'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
          <View style={styles.roleBadge}>
            <Icon name="briefcase" size={14} color="#6366f1" />
            <Text style={styles.roleText}>{user?.role || 'employee'}</Text>
          </View>
        </View>

        {/* Device Info Card */}
        <View style={styles.sectionHeader}>
          <Icon name="smartphone" size={18} color="#64748b" />
          <Text style={styles.sectionTitle}>Device Information</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.deviceRow}>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Current Device</Text>
              <Text style={styles.deviceValue}>
                {deviceInfo?.name || 'Unknown'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: deviceInfo?.registered
                    ? '#d1fae5'
                    : '#fee2e2',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: deviceInfo?.registered ? '#065f46' : '#991b1b' },
                ]}
              >
                {deviceInfo?.registered ? 'Registered' : 'Not Registered'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon name="hash" size={16} color="#94a3b8" />
            <Text style={styles.infoLabel}>Device ID</Text>
          </View>
          <Text style={styles.infoValue}>{deviceInfo?.id || 'N/A'}</Text>

          {user?.registeredDevice?.id && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Icon name="check-circle" size={16} color="#94a3b8" />
                <Text style={styles.infoLabel}>Registered Device ID</Text>
              </View>
              <Text style={styles.infoValue}>{user.registeredDevice.id}</Text>
            </>
          )}
        </View>

        {/* Device Requests */}
        {requests.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Icon name="clock" size={18} color="#64748b" />
              <Text style={styles.sectionTitle}>Device Change Requests</Text>
            </View>

            {requests.slice(0, 3).map(request => (
              <View key={request._id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestDate}>
                      {formatDate(request.createdAt)}
                    </Text>
                    <Text style={styles.requestDevice}>
                      {request.deviceName || 'Device Change'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: getStatusBgColor(request.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: getStatusColor(request.status) },
                      ]}
                    >
                      {request.status}
                    </Text>
                  </View>
                </View>
                {request.reason && (
                  <Text style={styles.requestReason} numberOfLines={2}>
                    {request.reason}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Account Stats */}
        <View style={styles.sectionHeader}>
          <Icon name="activity" size={18} color="#64748b" />
          <Text style={styles.sectionTitle}>Account</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.statInfo}>
              <Icon name="shield" size={20} color="#6366f1" />
              <Text style={styles.statLabel}>Account ID</Text>
            </View>
            <Text style={styles.statValue}>
              {user?.id?.slice(0, 8) || 'N/A'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <View style={styles.statInfo}>
              <Icon name="mail" size={20} color="#6366f1" />
              <Text style={styles.statLabel}>Email Verified</Text>
            </View>
            <Icon name="check-circle" size={20} color="#10b981" />
          </View>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <View style={{ height: 40 }} />
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
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  refreshBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'capitalize',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  deviceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  requestDevice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  requestReason: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});

export default ProfileScreen;
