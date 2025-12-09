import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import api from '../api/client';
import PrimaryButton from '../components/PrimaryButton';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import theme from '../theme';
import DatePicker from 'react-native-date-picker';

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
  const [attLoadingMore, setAttLoadingMore] = useState(false);
  const [attHasMore, setAttHasMore] = useState(true);
  const [attPage, setAttPage] = useState(1);
  const ATT_PAGE_SIZE = 50;
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  // Date/time picker state (using react-native-date-picker)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    'mark' | 'from' | 'to' | null
  >(null);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes());

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

  const loadAttendance = async (
    from = fromDate,
    to = toDate,
    pageNum: number = 1,
    append: boolean = false,
  ) => {
    if (!employeeId) return;

    if (pageNum === 1) {
      setAttLoading(true);
    } else {
      setAttLoadingMore(true);
    }

    try {
      const res = await api.get(
        `/api/admin/employees/${employeeId}/attendance`,
        {
          params: { from, to, limit: ATT_PAGE_SIZE, page: pageNum },
        },
      );

      let data: any[] = [];
      if (res?.data?.success) data = res.data.data || [];
      else if (Array.isArray(res?.data)) data = res.data || [];

      const newAttendance = append ? [...attendance, ...data] : data;
      setAttendance(newAttendance);
      setAttHasMore(data.length >= ATT_PAGE_SIZE);
      setAttPage(pageNum);
    } catch (e) {
      console.error('attendance fetch failed', e);
      if (!append) setAttendance([]);
    } finally {
      setAttLoading(false);
      setAttLoadingMore(false);
    }
  };

  const loadMoreAttendance = () => {
    if (!attLoadingMore && attHasMore && !attLoading) {
      loadAttendance(fromDate, toDate, attPage + 1, true);
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

  // Compute last 7 days activity for chart
  const chartData = useMemo(() => {
    const week = [0, 0, 0, 0, 0, 0, 0];
    attendance.forEach(a => {
      try {
        const d = new Date(a.timestamp);
        const day = d.getDay();
        week[day] = (week[day] || 0) + 1;
      } catch (e) {}
    });
    return week;
  }, [attendance]);

  if (loading)
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.COLORS.primary} />
      </View>
    );

  if (error)
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <PrimaryButton title="Retry" onPress={load} style={styles.retryBtn} />
      </View>
    );

  if (!employee)
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No employee data</Text>
      </View>
    );

  const maxHours = 12;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Badge */}
        <View style={styles.topStatusContainer}>
          <View
            style={[
              styles.statusBadge,
              employee.status === 'Active'
                ? styles.statusActive
                : styles.statusInactive,
            ]}
          >
            <Text style={styles.statusText}>{employee.status || 'Active'}</Text>
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {employee?.avatar ? (
              <Image source={{ uri: employee.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {String(employee.name || '?')
                    .split(' ')
                    .map((s: string) => s[0])
                    .slice(0, 2)
                    .join('')}
                </Text>
              </View>
            )}
            <Pressable style={styles.avatarEditBtn}>
              <Icon name="user" size={14} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeRole}>
            {employee.role || employee?.position || 'Senior Developer'}
          </Text>
          <View style={styles.emailBadge}>
            <Icon name="mail" size={14} color="#64748b" />
            <Text style={styles.emailText}>{employee.email}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => setShowPasswordModal(true)}
          >
            <Icon name="lock" size={16} color="#1e293b" />
            <Text style={styles.actionBtnSecondaryText}>Password</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Icon name="trash-2" size={16} color="#dc2626" />
            <Text style={styles.actionBtnDangerText}>Delete User</Text>
          </Pressable>
        </View>

        {/* Work Activity Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Icon name="clock" size={18} color="#6366f1" />
              <Text style={styles.cardTitle}>Work Activity</Text>
            </View>
            <Text style={styles.cardSubtitle}>Last 7 Days</Text>
          </View>
          <View style={styles.chartContainer}>
            {chartData.map((val, i) => {
              const height = Math.min((val / maxHours) * 100, 100);
              const isLow = val < 5;
              const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                i
              ];
              return (
                <View key={i} style={styles.chartBar}>
                  <View style={styles.chartBarInner}>
                    <View
                      style={[
                        styles.bar,
                        { height: `${height}%` },
                        isLow ? styles.barLow : styles.barNormal,
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{dayName}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Registered Device Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registered Device</Text>
          {employee?.registeredDevice?.id ? (
            <View style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>
                  {employee?.registeredDevice?.name || "Employee's Device"}
                </Text>
                <Text style={styles.deviceId}>
                  {employee?.registeredDevice?.id}
                </Text>
              </View>
              <Pressable onPress={deregister} style={styles.deregisterBtn}>
                <Text style={styles.deregisterText}>Deregister</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.noDevice}>
              <Icon name="alert-triangle" size={24} color="#cbd5e1" />
              <Text style={styles.noDeviceText}>No device registered</Text>
            </View>
          )}
        </View>

        {/* Update Attendance Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update Attendance</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.inputLabel}>Select Date</Text>
              <Pressable
                style={styles.dateInputContainer}
                onPress={() => {
                  setPickerTarget('mark');
                  setPickerDate(new Date(markTimestamp));
                  setShowPicker(true);
                }}
              >
                <Text style={styles.dateInputText}>
                  {new Date(markTimestamp).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </Text>
                <Icon name="calendar" size={18} color="#64748b" />
              </Pressable>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.inputLabel}>Select Time</Text>
              <Pressable
                style={styles.timeInputContainer}
                onPress={() => {
                  const date = new Date(markTimestamp);
                  setSelectedHour(date.getHours());
                  setSelectedMinute(date.getMinutes());
                  setShowTimePicker(true);
                }}
              >
                <Icon name="clock" size={18} color="#6366f1" />
                <Text style={styles.timeInputText}>
                  {new Date(markTimestamp).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.grid2}>
            <Pressable
              style={[styles.markBtn, styles.markBtnIn]}
              onPress={() => {
                setMarkType('in');
                submitMark();
              }}
            >
              <Icon name="log-in" size={16} color="#059669" />
              <Text style={styles.markBtnInText}>Mark In</Text>
            </Pressable>
            <Pressable
              style={[styles.markBtn, styles.markBtnOut]}
              onPress={() => {
                setMarkType('out');
                submitMark();
              }}
            >
              <Icon name="log-out" size={16} color="#d97706" />
              <Text style={styles.markBtnOutText}>Mark Out</Text>
            </Pressable>
          </View>
        </View>

        {/* Attendance Log Card */}
        <View style={styles.card}>
          <View style={styles.logHeaderSection}>
            <View>
              <Text style={styles.cardTitle}>Attendance History</Text>
              <Text style={styles.cardSubtitle}>
                View and filter attendance records
              </Text>
            </View>
          </View>

          {/* Filter Range */}
          <View style={styles.filterRange}>
            <View style={styles.filterHeader}>
              <Icon name="filter" size={16} color="#6366f1" />
              <Text style={styles.filterTitle}>Filter by Date Range</Text>
            </View>
            <View style={styles.filterInputs}>
              <View style={styles.dateRangeWrapper}>
                <Pressable
                  style={styles.rangeInputContainer}
                  onPress={() => {
                    setPickerTarget('from');
                    setPickerDate(new Date(fromDate));
                    setShowPicker(true);
                  }}
                >
                  <View style={styles.rangeInputContent}>
                    <Text style={styles.rangeInputLabel}>From</Text>
                    <Text style={styles.rangeInputText}>
                      {new Date(fromDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Icon name="calendar" size={16} color="#6366f1" />
                </Pressable>
                <View style={styles.rangeSeparatorWrapper}>
                  <View style={styles.rangeSeparatorLine} />
                  <Icon name="arrow-right" size={14} color="#cbd5e1" />
                  <View style={styles.rangeSeparatorLine} />
                </View>
                <Pressable
                  style={styles.rangeInputContainer}
                  onPress={() => {
                    setPickerTarget('to');
                    setPickerDate(new Date(toDate));
                    setShowPicker(true);
                  }}
                >
                  <View style={styles.rangeInputContent}>
                    <Text style={styles.rangeInputLabel}>To</Text>
                    <Text style={styles.rangeInputText}>
                      {new Date(toDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Icon name="calendar" size={16} color="#6366f1" />
                </Pressable>
              </View>
              <Pressable
                style={styles.rangeBtn}
                onPress={() => {
                  setAttPage(1);
                  setAttHasMore(true);
                  loadAttendance(fromDate, toDate, 1, false);
                }}
              >
                <Text style={styles.rangeBtnText}>Apply</Text>
                <Icon name="check" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Attendance List */}
          {attLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View style={styles.logList}>
              {attendance && attendance.length > 0 ? (
                <>
                  <FlatList
                    data={attendance}
                    scrollEnabled={false}
                    keyExtractor={item => item._id}
                    renderItem={({ item }) => {
                      const date = new Date(item.timestamp);
                      const day = date.getDate();
                      const month = date.toLocaleDateString('en-US', {
                        month: 'short',
                      });
                      const time = date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isCheckIn = item.type === 'in';

                      return (
                        <View style={styles.logItem}>
                          <View style={styles.logLeft}>
                            <View style={styles.logDate}>
                              <Text style={styles.logDay}>{day}</Text>
                              <Text style={styles.logMonth}>
                                {month.toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.logDetails}>
                              <View style={styles.logHeader}>
                                <View
                                  style={[
                                    styles.logTypeBadge,
                                    isCheckIn
                                      ? styles.logTypeBadgeIn
                                      : styles.logTypeBadgeOut,
                                  ]}
                                >
                                  <Icon
                                    name={isCheckIn ? 'log-in' : 'log-out'}
                                    size={12}
                                    color={isCheckIn ? '#059669' : '#d97706'}
                                  />
                                  <Text
                                    style={[
                                      styles.logTypeBadgeText,
                                      isCheckIn
                                        ? styles.logTypeBadgeTextIn
                                        : styles.logTypeBadgeTextOut,
                                    ]}
                                  >
                                    {isCheckIn ? 'Check In' : 'Check Out'}
                                  </Text>
                                </View>
                                <Text style={styles.logTimeMain}>{time}</Text>
                              </View>
                              <Text style={styles.logFullDate}>
                                {date.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </Text>
                              {item.note && (
                                <View style={styles.logNoteContainer}>
                                  <Icon name="info" size={11} color="#94a3b8" />
                                  <Text style={styles.logNote}>
                                    {item.note}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View
                            style={[
                              styles.statusIndicator,
                              isCheckIn
                                ? styles.statusIndicatorIn
                                : styles.statusIndicatorOut,
                            ]}
                          >
                            <Icon
                              name={isCheckIn ? 'arrow-down' : 'arrow-up'}
                              size={14}
                              color="#fff"
                            />
                          </View>
                        </View>
                      );
                    }}
                    ListFooterComponent={
                      attLoadingMore ? (
                        <View style={styles.footerLoader}>
                          <ActivityIndicator size="small" color="#6366f1" />
                          <Text style={styles.footerText}>Loading more...</Text>
                        </View>
                      ) : attHasMore && attendance.length >= ATT_PAGE_SIZE ? (
                        <Pressable
                          style={styles.loadMoreBtn}
                          onPress={loadMoreAttendance}
                        >
                          <Text style={styles.loadMoreText}>Load More</Text>
                          <Icon name="chevron-down" size={16} color="#6366f1" />
                        </Pressable>
                      ) : attendance.length > 0 ? (
                        <View style={styles.footerLoader}>
                          <Text style={styles.footerText}>No more records</Text>
                        </View>
                      ) : null
                    }
                  />
                </>
              ) : (
                <Text style={styles.noLogs}>
                  No logs found for this period.
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.timePickerBackdrop}
            onPress={() => setShowTimePicker(false)}
          />
          <View style={styles.timePickerModal}>
            <View style={styles.timePickerHeader}>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text style={styles.timePickerCancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.timePickerTitle}>Select Time</Text>
              <Pressable
                onPress={() => {
                  const date = new Date(markTimestamp);
                  date.setHours(selectedHour, selectedMinute, 0, 0);
                  setMarkTimestamp(date.toISOString());
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.timePickerDone}>Done</Text>
              </Pressable>
            </View>

            <View style={styles.timePickerContainer}>
              <View style={styles.timeDisplay}>
                <View style={styles.timeDisplayBox}>
                  <Text style={styles.timeDisplayText}>
                    {String(selectedHour).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.timeDisplaySeparator}>:</Text>
                <View style={styles.timeDisplayBox}>
                  <Text style={styles.timeDisplayText}>
                    {String(selectedMinute).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              <View style={styles.timePickerControls}>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Hour</Text>
                  <ScrollView
                    style={styles.timePickerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                      <Pressable
                        key={hour}
                        style={[
                          styles.timePickerItem,
                          selectedHour === hour &&
                            styles.timePickerItemSelected,
                        ]}
                        onPress={() => setSelectedHour(hour)}
                      >
                        <Text
                          style={[
                            styles.timePickerItemText,
                            selectedHour === hour &&
                              styles.timePickerItemTextSelected,
                          ]}
                        >
                          {String(hour).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timePickerDivider} />

                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Minute</Text>
                  <ScrollView
                    style={styles.timePickerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map(minute => (
                      <Pressable
                        key={minute}
                        style={[
                          styles.timePickerItem,
                          selectedMinute === minute &&
                            styles.timePickerItemSelected,
                        ]}
                        onPress={() => setSelectedMinute(minute)}
                      >
                        <Text
                          style={[
                            styles.timePickerItemText,
                            selectedMinute === minute &&
                              styles.timePickerItemTextSelected,
                          ]}
                        >
                          {String(minute).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Date Picker Modal */}
      {showPicker && (
        <View style={styles.datePickerOverlay}>
          <Pressable
            style={styles.datePickerBackdrop}
            onPress={() => setShowPicker(false)}
          />
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Pressable onPress={() => setShowPicker(false)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <Pressable
                onPress={() => {
                  const iso = pickerDate.toISOString();
                  if (pickerTarget === 'mark') setMarkTimestamp(iso);
                  else if (pickerTarget === 'from') setFromDate(iso);
                  else if (pickerTarget === 'to') setToDate(iso);
                  setShowPicker(false);
                }}
              >
                <Text style={styles.datePickerDone}>Done</Text>
              </Pressable>
            </View>
            <DatePicker
              date={pickerDate}
              onDateChange={setPickerDate}
              mode="date"
              androidVariant="iosClone"
              textColor="#1e293b"
              style={styles.datePicker}
            />
          </View>
        </View>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalClose}
              >
                <Icon name="x" size={20} color="#64748b" />
              </Pressable>
            </View>
            <Text style={styles.modalText}>
              Enter a new password for {employee.name}.
            </Text>
            <TextInput
              placeholder="New password"
              secureTextEntry
              value={resetPassword}
              onChangeText={setResetPassword}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setResetPassword('');
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={submitResetPassword}
              >
                <Text style={styles.modalBtnPrimaryText}>Update Password</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.deleteModalCard]}>
            <View style={styles.deleteModalIcon}>
              <View style={styles.deleteIconCircle}>
                <Icon name="alert-triangle" size={32} color="#dc2626" />
              </View>
            </View>
            <Text style={styles.deleteModalTitle}>Delete Employee?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete {employee.name}? This action
              cannot be undone and will permanently remove all employee data
              including attendance records.
            </Text>
            <View style={styles.deleteModalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.deleteModalBtnDanger]}
                onPress={performDelete}
              >
                <Icon name="trash-2" size={16} color="#fff" />
                <Text style={styles.deleteModalBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Deregister Device Confirmation Modal */}
      {showDeregisterConfirm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.deleteModalCard]}>
            <View style={styles.deleteModalIcon}>
              <View
                style={[
                  styles.deleteIconCircle,
                  { backgroundColor: '#fef3c7' },
                ]}
              >
                <Icon name="smartphone" size={32} color="#f59e0b" />
              </View>
            </View>
            <Text style={styles.deleteModalTitle}>Deregister Device?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to deregister the device for {employee.name}
              ? They will need to register a new device before they can check in
              or out.
            </Text>
            <View style={styles.deleteModalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setShowDeregisterConfirm(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.deleteModalBtnDanger]}
                onPress={performDeregister}
              >
                <Icon name="x-circle" size={16} color="#fff" />
                <Text style={styles.deleteModalBtnText}>Deregister</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topStatusContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  retryBtn: {
    marginTop: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#64748b',
  },
  avatarEditBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: '#6366f1',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 12,
  },
  employeeRole: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 8,
  },
  emailText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 6,
  },
  actionBtnDanger: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionBtnDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingTop: 16,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartBarInner: {
    width: 16,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barNormal: {
    backgroundColor: '#6366f1',
  },
  barLow: {
    backgroundColor: '#f59e0b',
  },
  chartLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  deviceId: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  deregisterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deregisterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  noDevice: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  noDeviceText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  gridItem: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 13,
    color: '#1e293b',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dateInputText: {
    fontSize: 13,
    color: '#1e293b',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  timeInputText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  markBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  markBtnIn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  markBtnInText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 6,
  },
  markBtnOut: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  markBtnOutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d97706',
    marginLeft: 6,
  },
  logHeaderSection: {
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  filterRange: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  filterInputs: {
    gap: 12,
  },
  dateRangeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 11,
    color: '#1e293b',
  },
  rangeInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rangeInputContent: {
    flex: 1,
  },
  rangeInputLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
    fontWeight: '600',
  },
  rangeInputText: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
  },
  rangeSeparatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rangeSeparatorLine: {
    width: 8,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  rangeBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  loader: {
    marginVertical: 16,
  },
  logList: {
    marginTop: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
  },
  logDate: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  logDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6366f1',
  },
  logMonth: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366f1',
    letterSpacing: 0.5,
  },
  logDetails: {
    flex: 1,
    gap: 6,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logTypeBadgeIn: {
    backgroundColor: '#ecfdf5',
  },
  logTypeBadgeOut: {
    backgroundColor: '#fef3c7',
  },
  logTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logTypeBadgeTextIn: {
    color: '#059669',
  },
  logTypeBadgeTextOut: {
    color: '#d97706',
  },
  logTimeMain: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  logFullDate: {
    fontSize: 11,
    color: '#64748b',
  },
  logNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  logNote: {
    fontSize: 10,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicatorIn: {
    backgroundColor: '#10b981',
  },
  statusIndicatorOut: {
    backgroundColor: '#f59e0b',
  },
  noLogs: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 24,
    fontSize: 13,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    padding: 4,
  },
  modalText: {
    fontSize: 13,
    color: '#64748b',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  datePickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  datePickerCancel: {
    fontSize: 14,
    color: '#64748b',
  },
  datePickerDone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  datePicker: {
    backgroundColor: '#fff',
    height: 200,
  },
  deleteModalCard: {
    paddingTop: 0,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
  },
  deleteIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  deleteModalBtnDanger: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  timePickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 20,
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  timePickerCancel: {
    fontSize: 14,
    color: '#64748b',
  },
  timePickerDone: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  timePickerContainer: {
    padding: 20,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    paddingVertical: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
  },
  timeDisplayBox: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  timeDisplayText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  timeDisplaySeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366f1',
  },
  timePickerControls: {
    flexDirection: 'row',
    gap: 16,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  timePickerScroll: {
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timePickerItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  timePickerItemSelected: {
    backgroundColor: '#eef2ff',
  },
  timePickerItemText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  timePickerItemTextSelected: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6366f1',
  },
  timePickerDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
});

export default EmployeeManageScreen;
