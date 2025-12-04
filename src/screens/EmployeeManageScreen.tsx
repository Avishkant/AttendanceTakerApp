import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Alert,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import api from '../api/client';
import ConfirmCard from '../components/ConfirmCard';
import AttendanceBadge from '../components/AttendanceBadge';
import PrimaryButton from '../components/PrimaryButton';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';
import Container from '../components/Container';
import AnimatedCard from '../components/AnimatedCard';
import theme from '../theme';

type RouteParams = { params: { employeeId: string } };

const EmployeeManageScreen: React.FC = () => {
  const route =
    useRoute<RouteProp<Record<string, { employeeId: string }>, string>>();
  const employeeId = (route.params as any)?.employeeId;
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const navigation = useNavigation();
  // Admin features: view attendance and add marks
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  );
  const [toDate, setToDate] = useState<string>(
    new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
  );
  const [markType, setMarkType] = useState<'in' | 'out'>('in');
  const [markTimestamp, setMarkTimestamp] = useState<string>(
    new Date().toISOString(),
  );
  const [markNote, setMarkNote] = useState<string>('Marked by admin');
  const [resetPassword, setResetPassword] = useState<string>('');
  const [resetting, setResetting] = useState(false);
  const [showSavedCard, setShowSavedCard] = useState(false);
  const [showDeregisterConfirm, setShowDeregisterConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Date/time picker state (using react-native-date-picker)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    'mark' | 'from' | 'to' | null
  >(null);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch single employee resource (may not exist on older servers)
      try {
        const res = await api.get(`/api/admin/employees/${employeeId}`);
        if (res?.data?.success) {
          setEmployee(res.data.data);
          setEditingName(res.data.data.name || '');
          return;
        }
      } catch (e: any) {
        // If 404, fallback to listing endpoint
        if (e?.response?.status && e.response.status !== 404) throw e;
      }

      // Fallback: fetch list and find the employee
      const listRes = await api.get('/api/admin/employees');
      const list = listRes?.data?.success ? listRes.data.data : listRes?.data;
      const found = Array.isArray(list)
        ? list.find((u: any) => String(u._id) === String(employeeId))
        : null;
      if (found) {
        setEmployee(found);
        setEditingName(found.name || '');
      } else {
        setError('Employee not found');
      }
    } catch (e) {
      console.error('Failed loading employee', e);
      setError(e?.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) load();
  }, [employeeId]);

  useEffect(() => {
    if (employee) loadAttendance();
  }, [employee]);

  const save = async () => {
    try {
      const res = await api.patch(`/api/admin/employees/${employeeId}`, {
        name: editingName,
      });
      if (res?.data?.success) {
        // show modern saved card
        setShowSavedCard(true);
        load();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    }
  };

  const deregister = async () => {
    // open confirm card instead of immediate action
    setShowDeregisterConfirm(true);
  };

  const performDeregister = async () => {
    setShowDeregisterConfirm(false);
    try {
      const res = await api.post(
        `/api/admin/employees/${employeeId}/deregister-device`,
      );
      if (res?.data?.success) {
        setShowSavedCard(true);
        load();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    }
  };

  const loadAttendance = async (from = fromDate, to = toDate) => {
    if (!employeeId) return;
    setAttLoading(true);
    try {
      const res = await api.get(
        `/api/admin/employees/${employeeId}/attendance`,
        {
          params: { from, to, limit: 200 },
        },
      );
      if (res?.data?.success) setAttendance(res.data.data || []);
      else if (Array.isArray(res?.data)) setAttendance(res.data || []);
      else setAttendance([]);
    } catch (e) {
      console.error('attendance fetch failed', e);
      setAttendance([]);
    } finally {
      setAttLoading(false);
    }
  };

  const submitMark = async () => {
    try {
      const res = await api.post(
        `/api/admin/employees/${employeeId}/attendance`,
        {
          type: markType,
          timestamp: markTimestamp,
          note: markNote,
        },
      );
      if (res?.data?.success) {
        Alert.alert('Success', 'Attendance recorded');
        loadAttendance();
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to record');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Network error');
    }
  };

  const openPicker = (target: 'mark' | 'from' | 'to') => {
    setPickerTarget(target);
    const src =
      target === 'mark'
        ? new Date(markTimestamp)
        : target === 'from'
        ? new Date(fromDate)
        : new Date(toDate);
    setPickerDate(src);
    setShowPicker(true);
  };

  const submitResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters');
      return;
    }
    setResetting(true);
    try {
      const res = await api.post(
        `/api/admin/employees/${employeeId}/reset-password`,
        {
          password: resetPassword,
        },
      );
      if (res?.data?.success) {
        Alert.alert('Success', 'Password reset');
        setResetPassword('');
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to reset');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Network error');
    } finally {
      setResetting(false);
    }
  };

  const remove = async () => {
    // show modal confirm card instead of system alert
    setShowDeleteConfirm(true);
  };

  const performDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      const res = await api.delete(`/api/admin/employees/${employeeId}`);
      if (res?.data?.success) {
        // show success then navigate back
        setShowSavedCard(true);
        setTimeout(() => navigation.goBack(), 700);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    }
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );

  if (error)
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 12 }}>
        <Text style={{ color: '#900', marginBottom: 12 }}>{error}</Text>
        <Button title="Retry" onPress={load} />
      </View>
    );

  if (!employee)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text>No employee data</Text>
      </View>
    );

  return (
    <Container scroll contentContainerStyle={{ padding: theme.SPACING.md }}>
      {/* Profile header */}
      <AnimatedCard style={{ marginBottom: theme.SPACING.sm }}>
        <View
          style={[styles.profileCard, { backgroundColor: theme.COLORS.card }]}
        >
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              {employee?.avatar ? (
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                <Image
                  source={{ uri: employee.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarInitials}>
                  {String(employee.name || '?')
                    .split(' ')
                    .map((s: string) => s[0])
                    .slice(0, 2)
                    .join('')}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>{employee.name}</Text>
              <Text style={styles.role}>
                {employee.role || employee?.position || 'Employee'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.smallLabel}>Working Hours</Text>
              <Text style={styles.hoursValue}>7h 21m</Text>
            </View>
          </View>

          {/* Simple weekly bar chart computed from attendance timestamps */}
          <View style={styles.chartRow}>
            {(() => {
              const week = [0, 0, 0, 0, 0, 0, 0];
              attendance.forEach(a => {
                try {
                  const d = new Date(a.timestamp);
                  const day = d.getDay();
                  week[day] = (week[day] || 0) + 1;
                } catch (e) {}
              });
              const max = Math.max(...week, 1);
              return week.map((v, i) => (
                <View key={i} style={styles.barWrap}>
                  <View style={[styles.bar, { height: 36 * (v / max) + 6 }]} />
                  <Text style={styles.barLabel}>{'SMTWTFS'[i] || '·'}</Text>
                </View>
              ));
            })()}
          </View>

          {/* Attendance badges */}
          <View style={styles.badgesRow}>
            <AttendanceBadge
              label="Working Day"
              value={attendance.filter(a => a.type === 'in').length || '—'}
              color="#E6F0FF"
            />
            <AttendanceBadge label="Absent" value={'—'} color="#FFE8D6" />
            <AttendanceBadge label="Late Log" value={'—'} color="#FFE6F0" />
          </View>

          <View style={styles.badgesRow}>
            <AttendanceBadge label="Half Day" value={'—'} color="#E6FFF2" />
            <AttendanceBadge
              label="One Day Leaves"
              value={'—'}
              color="#F0E6FF"
            />
            <AttendanceBadge label="Sick Leaves" value={'—'} color="#E6F0FF" />
          </View>
        </View>
      </AnimatedCard>

      <View style={{ marginTop: theme.SPACING.md }}>
        <Text style={styles.sectionLabel}>Profile</Text>
        <Text style={{ marginBottom: 6 }}>Name</Text>
        <TextInput
          value={editingName}
          onChangeText={setEditingName}
          style={[
            styles.input,
            {
              backgroundColor: theme.COLORS.cardElevated,
              color: theme.COLORS.black,
            },
          ]}
        />
        <View style={{ marginTop: 8 }}>
          <PrimaryButton title="Save" onPress={save} icon="💾" />
        </View>
      </View>

      <View style={{ marginTop: theme.SPACING.md }}>
        <Button
          title="Deregister Device"
          onPress={deregister}
          color="#f59e0b"
        />
      </View>

      <View style={{ marginTop: theme.SPACING.md }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>
          Registered Device
        </Text>
        <Text>{employee?.registeredDevice?.id || 'No device registered'}</Text>
      </View>

      <View style={{ marginTop: theme.SPACING.md }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>
          Reset Password
        </Text>
        <TextInput
          placeholder="New password"
          value={resetPassword}
          onChangeText={setResetPassword}
          secureTextEntry
          style={[
            styles.input,
            {
              backgroundColor: theme.COLORS.cardElevated,
              color: theme.COLORS.black,
            },
          ]}
        />
        {resetting ? (
          <ActivityIndicator />
        ) : (
          <Button title="Reset Password" onPress={submitResetPassword} />
        )}
      </View>

      <View style={{ marginTop: theme.SPACING.md }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>
          Add Attendance Mark
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              markType === 'in' ? styles.typeButtonActive : null,
            ]}
            onPress={() => setMarkType('in')}
          >
            <Text
              style={[
                styles.typeButtonText,
                markType === 'in' ? styles.typeButtonTextActive : null,
              ]}
            >
              IN
            </Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity
            style={[
              styles.typeButton,
              markType === 'out' ? styles.typeButtonActive : null,
            ]}
            onPress={() => setMarkType('out')}
          >
            <Text
              style={[
                styles.typeButtonText,
                markType === 'out' ? styles.typeButtonTextActive : null,
              ]}
            >
              OUT
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              flex: 1,
              padding: 8,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.06)',
              borderRadius: 6,
              backgroundColor: theme.COLORS.cardElevated,
              color: theme.COLORS.black,
            }}
          >
            {new Date(markTimestamp).toLocaleString()}
          </Text>
          <View style={{ width: 8 }} />
          <Button title="Pick" onPress={() => openPicker('mark')} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Button
              title="Set to now"
              onPress={() => setMarkTimestamp(new Date().toISOString())}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Add Mark" onPress={submitMark} />
          </View>
        </View>
        <TextInput
          placeholder="Note (optional)"
          value={markNote}
          onChangeText={setMarkNote}
          style={[styles.input, { marginTop: 8 }]}
        />
      </View>

      <View style={{ marginTop: theme.SPACING.md }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>
          Attendance Records
        </Text>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <Text
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            onPress={() => openPicker('from')}
          >
            {new Date(fromDate).toLocaleString()}
          </Text>
          <Text
            style={[styles.input, { flex: 1 }]}
            onPress={() => openPicker('to')}
          >
            {new Date(toDate).toLocaleString()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Button
              title="Load"
              onPress={() => loadAttendance(fromDate, toDate)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Set Today"
              onPress={() => {
                setFromDate(
                  new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
                );
                setToDate(
                  new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
                );
              }}
            />
          </View>
        </View>
        {attLoading ? (
          <ActivityIndicator />
        ) : (
          <View>
            {attendance && attendance.length > 0 ? (
              attendance.map((item: any) => (
                <View
                  key={item._id}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#eee',
                  }}
                >
                  <Text style={{ fontWeight: '700' }}>
                    {item.type?.toUpperCase()} -{' '}
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                  <Text>{item.note || ''}</Text>
                </View>
              ))
            ) : (
              <Text style={{ padding: 8 }}>No records</Text>
            )}
          </View>
        )}
      </View>

      {showPicker ? (
        <Modal visible transparent animationType="slide">
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <AnimatedCard style={{ padding: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>
                Pick Date & Time
              </Text>
              <DatePicker
                date={pickerDate}
                onDateChange={setPickerDate}
                mode="datetime"
                androidVariant="iosClone"
                textColor={
                  Platform.OS === 'android' ? theme.COLORS.black : undefined
                }
                style={{ backgroundColor: theme.COLORS.card }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  marginTop: 12,
                }}
              >
                <View style={{ marginRight: 8 }}>
                  <Button title="Cancel" onPress={() => setShowPicker(false)} />
                </View>
                <Button
                  title="Save"
                  onPress={() => {
                    const iso = pickerDate.toISOString();
                    if (pickerTarget === 'mark') setMarkTimestamp(iso);
                    else if (pickerTarget === 'from') setFromDate(iso);
                    else if (pickerTarget === 'to') setToDate(iso);
                    setShowPicker(false);
                  }}
                />
              </View>
            </AnimatedCard>
          </View>
        </Modal>
      ) : null}

      <View style={{ marginTop: theme.SPACING.md }}>
        <Button title="Delete User" onPress={remove} color="#ef4444" />
      </View>

      {/* Confirmation / Success cards */}
      <ConfirmCard
        visible={showSavedCard}
        title="Saved"
        subtitle="Employee updated successfully"
        variant="success"
        confirmText="OK"
        onConfirm={() => setShowSavedCard(false)}
      />

      <ConfirmCard
        visible={showDeregisterConfirm}
        title="Deregister Device"
        subtitle="Are you sure you want to deregister the registered device for this employee?"
        variant="warning"
        confirmText="Deregister"
        cancelText="Cancel"
        onCancel={() => setShowDeregisterConfirm(false)}
        onConfirm={performDeregister}
      />

      <ConfirmCard
        visible={showDeleteConfirm}
        title="Delete Employee"
        subtitle="This will permanently delete the employee. This action cannot be undone."
        variant="danger"
        iconName="delete"
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={performDelete}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: theme.COLORS.black },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: theme.COLORS.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: theme.COLORS.cardElevated,
    color: theme.COLORS.black,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    color: '#333',
    fontWeight: '700',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  profileCard: {
    backgroundColor: theme.COLORS.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.COLORS.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.COLORS.black,
  },
  avatarImage: { width: 72, height: 72, resizeMode: 'cover' },
  role: { color: theme.COLORS.muted, marginTop: 4 },
  smallLabel: { fontSize: 12, color: theme.COLORS.muted },
  hoursValue: { fontWeight: '700', fontSize: 14, color: theme.COLORS.black },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 6,
    justifyContent: 'space-between',
  },
  barWrap: { alignItems: 'center', flex: 1 },
  bar: { width: 10, backgroundColor: '#3B82F6', borderRadius: 6 },
  barLabel: { marginTop: 6, fontSize: 10, color: theme.COLORS.muted },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});

export default EmployeeManageScreen;
