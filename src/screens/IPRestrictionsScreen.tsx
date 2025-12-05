import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import api from '../api/client';

const IPRestrictionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [restrictCheckIn, setRestrictCheckIn] = useState(true);
  const [allowedIPs, setAllowedIPs] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadAllowedIPs();
  }, []);

  const loadAllowedIPs = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/admin/settings/company-ips');
      if (res?.data?.success) {
        const ips = res.data.data || [];
        setAllowedIPs(Array.isArray(ips) ? ips : []);
        setRestrictCheckIn(ips.length > 0);
      }
    } catch (e: any) {
      console.error('Failed to load allowed IPs:', e);
      Alert.alert('Error', 'Failed to load allowed IPs');
    } finally {
      setRefreshing(false);
    }
  };

  const saveAllowedIPs = async (newIPs: string[]) => {
    try {
      const res = await api.put('/api/admin/settings/company-ips', {
        ips: newIPs,
      });
      if (res?.data?.success) {
        setAllowedIPs(res.data.data || newIPs);
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Failed to save IPs:', e);
      throw e;
    }
  };

  const addNetwork = async () => {
    if (!newIP.trim()) {
      Alert.alert('Validation', 'Please enter an IP address or CIDR');
      return;
    }

    // Basic validation for IP or CIDR
    const ipCidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipCidrRegex.test(newIP.trim())) {
      Alert.alert(
        'Validation',
        'Please enter a valid IP address (e.g., 192.168.1.1 or 192.168.1.0/24)',
      );
      return;
    }

    setLoading(true);
    try {
      const ipToAdd = newIP.trim();
      let updatedIPs: string[];

      if (editMode && editingIndex !== null) {
        // Edit existing IP
        updatedIPs = [...allowedIPs];
        updatedIPs[editingIndex] = ipToAdd;
      } else {
        // Add new IP
        updatedIPs = [...allowedIPs, ipToAdd];
      }

      const success = await saveAllowedIPs(updatedIPs);

      if (success) {
        setShowAddModal(false);
        setNewIP('');
        setEditMode(false);
        setEditingIndex(null);
        Alert.alert(
          'Success',
          editMode
            ? 'IP address updated successfully'
            : 'IP address added successfully',
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to ${editMode ? 'update' : 'add'} IP address`,
        );
      }
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.message || `Failed to ${editMode ? 'update' : 'add'} IP address`,
      );
    } finally {
      setLoading(false);
    }
  };

  const editNetwork = (ip: string, index: number) => {
    setNewIP(ip);
    setEditMode(true);
    setEditingIndex(index);
    setShowAddModal(true);
  };

  const deleteNetwork = async (ip: string) => {
    Alert.alert('Confirm Delete', `Remove ${ip} from allowed list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedIPs = allowedIPs.filter(item => item !== ip);
            await saveAllowedIPs(updatedIPs);
            Alert.alert('Success', 'IP address removed');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const toggleRestriction = async (value: boolean) => {
    if (!value && allowedIPs.length > 0) {
      Alert.alert(
        'Disable Restrictions',
        'To disable IP restrictions, you need to remove all allowed IP addresses.',
        [{ text: 'OK' }],
      );
      return;
    }
    setRestrictCheckIn(value);
  };

  const getIPType = (ip: string) => {
    return ip.includes('/') ? 'CIDR' : 'IPv4';
  };

  const getNetworkName = (ip: string, index: number) => {
    if (ip.includes('192.168'))
      return `Head Office ${index > 0 ? `(${index + 1})` : '(WiFi)'}`;
    if (ip.includes('203.0')) return 'Branch Office - NY';
    if (ip.includes('172.16')) return 'Design Studio LAN';
    return `Network ${index + 1}`;
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>IP Restrictions</Text>
        <Pressable style={styles.menuBtn}>
          <Icon name="more-vertical" size={24} color="#fff" />
        </Pressable>
      </View>

      {refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Security Level Card */}
          {/* <View style={styles.securityCard}>
            <View style={styles.securityIconContainer}>
              <Icon name="shield" size={24} color="#6366f1" />
            </View>
            <View style={styles.securityContent}>
              <Text style={styles.securityLabel}>SECURITY LEVEL</Text>
              <View style={styles.securityLevel}>
                <Text style={styles.securityLevelText}>High</Text>
                <Icon name="check-circle" size={16} color="#10b981" />
              </View>
            </View>
          </View> */}

          {/* Restrict Check-In Toggle */}
          {/* <View style={styles.restrictCard}>
            <View style={styles.restrictContent}>
              <Text style={styles.restrictTitle}>Restrict Check-In</Text>
              <Text style={styles.restrictSubtitle}>
                Only allow attendance from listed IP addresses.
              </Text>
            </View>
            <Switch
              value={restrictCheckIn}
              onValueChange={toggleRestriction}
              trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
              thumbColor={restrictCheckIn ? '#6366f1' : '#f1f5f9'}
            />
          </View> */}

          {/* Allowed Networks Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Allowed Networks</Text>
            <View style={styles.activeCount}>
              <Text style={styles.activeCountText}>
                {allowedIPs.length} Active
              </Text>
            </View>
          </View>

          {/* Network List */}
          {allowedIPs.map((ip, index) => (
            <View key={index} style={styles.networkCard}>
              <View style={styles.networkHeader}>
                <View style={styles.networkIconContainer}>
                  <Icon name="map-pin" size={16} color="#6366f1" />
                </View>
                <Text style={styles.networkName}>
                  {getNetworkName(ip, index)}
                </Text>
                <View style={styles.actionButtons}>
                  <Pressable
                    style={styles.editBtn}
                    onPress={() => editNetwork(ip, index)}
                  >
                    <Icon name="edit-2" size={16} color="#6366f1" />
                  </Pressable>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => deleteNetwork(ip)}
                  >
                    <Icon name="trash-2" size={16} color="#94a3b8" />
                  </Pressable>
                </View>
              </View>
              <View style={styles.networkBody}>
                <View style={styles.ipRow}>
                  <Text style={styles.ipAddress}>{ip}</Text>
                  <View style={styles.ipBadge}>
                    <Icon name="globe" size={10} color="#6366f1" />
                    <Text style={styles.ipBadgeText}>{getIPType(ip)}</Text>
                  </View>
                </View>
                <Text style={styles.networkDate}>
                  Added: {new Date().toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}

          {allowedIPs.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="shield-off" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                No IP restrictions configured
              </Text>
              <Text style={styles.emptySubtext}>
                Add IP addresses to restrict attendance marking
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB Add Button */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          setNewIP('');
          setEditMode(false);
          setEditingIndex(null);
          setShowAddModal(true);
        }}
      >
        <Icon name="plus" size={24} color="#fff" />
      </Pressable>

      {/* Add Network Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? 'Edit IP Address' : 'Add IP Address'}
              </Text>
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  setNewIP('');
                  setEditMode(false);
                  setEditingIndex(null);
                }}
              >
                <Icon name="x" size={24} color="#64748b" />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>IP Address or CIDR</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 192.168.1.1 or 192.168.1.0/24"
                  value={newIP}
                  onChangeText={setNewIP}
                  keyboardType="default"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
                <Text style={styles.inputHint}>
                  Enter a single IP address or CIDR range
                </Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={() => {
                    setShowAddModal(false);
                    setNewIP('');
                    setEditMode(false);
                    setEditingIndex(null);
                  }}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={addNetwork}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon
                        name={editMode ? 'check' : 'plus'}
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.modalBtnPrimaryText}>
                        {editMode ? 'Update IP' : 'Add IP'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  menuBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  securityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  securityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  securityContent: {
    flex: 1,
  },
  securityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 6,
  },
  securityLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityLevelText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  restrictCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  restrictContent: {
    flex: 1,
    marginRight: 12,
  },
  restrictTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  restrictSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  activeCount: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  networkCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  networkName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtn: {
    padding: 8,
  },
  deleteBtn: {
    padding: 8,
  },
  networkBody: {
    paddingLeft: 42,
  },
  ipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ipAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  ipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ipBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
  },
  networkDate: {
    fontSize: 11,
    color: '#94a3b8',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  modalBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  modalBtnPrimary: {
    backgroundColor: '#6366f1',
  },
  modalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default IPRestrictionsScreen;
