import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import api from '../api/client';

const { width } = Dimensions.get('window');

type Employee = {
  _id: string;
  name: string;
  email: string;
  role?: string;
};

type DayRecord = {
  date: string;
  status: 'present' | 'absent' | 'sunday';
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number;
};

type MonthStats = {
  totalPresent: number;
  totalAbsent: number;
  totalHoursWorked: number;
  totalWorkingDays: number;
  attendanceRate: number;
  avgHoursPerDay: number;
  records: DayRecord[];
};

const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);

  const loadEmployees = React.useCallback(async () => {
    try {
      const res = await api.get('/api/admin/employees');
      if (res?.data?.success) {
        const empList = res.data.data || [];
        setEmployees(empList);
        if (empList.length > 0 && !selectedEmployee) {
          setSelectedEmployee(empList[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  }, [selectedEmployee]);

  const loadMonthAnalytics = React.useCallback(async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();

      // Get first and last day of the month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Fetch attendance records for the month
      const res = await api.get(
        `/api/admin/employees/${selectedEmployee._id}/attendance`,
        {
          params: {
            from: firstDay.toISOString(),
            to: lastDay.toISOString(),
          },
        },
      );

      if (res?.data?.success) {
        const records = res.data.data || [];
        const stats = calculateMonthStats(records, firstDay, lastDay);
        setMonthStats(stats);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee, selectedMonth]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (selectedEmployee) {
      loadMonthAnalytics();
    }
  }, [selectedEmployee, selectedMonth, loadMonthAnalytics]);

  const calculateMonthStats = (
    records: any[],
    firstDay: Date,
    lastDay: Date,
  ): MonthStats => {
    const dayRecords: { [key: string]: DayRecord } = {};

    // Group records by date
    records.forEach((record: any) => {
      const date = new Date(record.timestamp);
      const dateKey = date.toISOString().split('T')[0];

      if (!dayRecords[dateKey]) {
        dayRecords[dateKey] = {
          date: dateKey,
          status: 'present',
          checkIn: null,
          checkOut: null,
          hoursWorked: 0,
        };
      }

      if (record.type === 'in') {
        if (!dayRecords[dateKey].checkIn) {
          dayRecords[dateKey].checkIn = record.timestamp;
        }
      } else if (record.type === 'out') {
        dayRecords[dateKey].checkOut = record.timestamp;
      }
    });

    // Calculate hours worked for each day
    Object.keys(dayRecords).forEach(dateKey => {
      const day = dayRecords[dateKey];
      if (day.checkIn && day.checkOut) {
        const checkInTime = new Date(day.checkIn).getTime();
        const checkOutTime = new Date(day.checkOut).getTime();
        day.hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      }
    });

    // Create records for all days in the month
    const allDayRecords: DayRecord[] = [];
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHoursWorked = 0;
    let totalWorkingDays = 0;

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      if (dayOfWeek === 0) {
        // Sunday - not counted
        allDayRecords.push({
          date: dateKey,
          status: 'sunday',
          checkIn: null,
          checkOut: null,
          hoursWorked: 0,
        });
      } else {
        totalWorkingDays++;
        if (dayRecords[dateKey]) {
          allDayRecords.push(dayRecords[dateKey]);
          totalPresent++;
          totalHoursWorked += dayRecords[dateKey].hoursWorked;
        } else {
          allDayRecords.push({
            date: dateKey,
            status: 'absent',
            checkIn: null,
            checkOut: null,
            hoursWorked: 0,
          });
          totalAbsent++;
        }
      }
    }

    const attendanceRate =
      totalWorkingDays > 0 ? (totalPresent / totalWorkingDays) * 100 : 0;
    const avgHoursPerDay =
      totalPresent > 0 ? totalHoursWorked / totalPresent : 0;

    return {
      totalPresent,
      totalAbsent,
      totalHoursWorked,
      totalWorkingDays,
      attendanceRate,
      avgHoursPerDay,
      records: allDayRecords.reverse(), // Most recent first
    };
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMonthAnalytics().finally(() => setRefreshing(false));
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedMonth(newDate);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#22c55e';
      case 'absent':
        return '#ef4444';
      case 'sunday':
        return '#94a3b8';
      default:
        return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return 'check-circle';
      case 'absent':
        return 'x-circle';
      case 'sunday':
        return 'calendar';
      default:
        return 'circle';
    }
  };

  const renderDayRecord = ({ item }: { item: DayRecord }) => (
    <View
      style={[styles.dayCard, item.status === 'sunday' && styles.dayCardSunday]}
    >
      <View style={styles.dayCardLeft}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Icon name={getStatusIcon(item.status)} size={16} color="#fff" />
        </View>
        <View style={styles.dayInfo}>
          <Text style={styles.dayDate}>{formatDate(item.date)}</Text>
          <Text
            style={[styles.dayStatus, { color: getStatusColor(item.status) }]}
          >
            {item.status === 'present'
              ? 'Present'
              : item.status === 'absent'
              ? 'Absent'
              : 'Sunday'}
          </Text>
        </View>
      </View>

      <View style={styles.dayCardRight}>
        {item.status === 'present' && (
          <>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>In</Text>
              <Text style={styles.timeValue}>{formatTime(item.checkIn)}</Text>
            </View>
            <Icon name="arrow-right" size={14} color="#94a3b8" />
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Out</Text>
              <Text style={styles.timeValue}>{formatTime(item.checkOut)}</Text>
            </View>
            <View style={styles.hoursBlock}>
              <Text style={styles.hoursValue}>
                {item.hoursWorked.toFixed(1)}h
              </Text>
            </View>
          </>
        )}
        {item.status === 'absent' && (
          <View style={styles.absentBlock}>
            <Icon name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.absentText}>No attendance</Text>
          </View>
        )}
        {item.status === 'sunday' && (
          <View style={styles.sundayBlock}>
            <Icon name="sun" size={16} color="#94a3b8" />
            <Text style={styles.sundayText}>Weekend</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Performance Insights</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      >
        {/* Employee Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Employee</Text>
          <Pressable
            style={styles.employeeSelector}
            onPress={() => setShowEmployeeModal(true)}
          >
            <View style={styles.employeeSelectorLeft}>
              <View style={styles.employeeAvatar}>
                <Text style={styles.employeeAvatarText}>
                  {selectedEmployee?.name?.charAt(0)?.toUpperCase() || 'E'}
                </Text>
              </View>
              <View>
                <Text style={styles.employeeName}>
                  {selectedEmployee?.name || 'Select Employee'}
                </Text>
                <Text style={styles.employeeEmail}>
                  {selectedEmployee?.email || ''}
                </Text>
              </View>
            </View>
            <Icon name="chevron-down" size={20} color="#64748b" />
          </Pressable>
        </View>

        {/* Month Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Month</Text>
          <View style={styles.monthSelector}>
            <Pressable
              style={styles.monthArrow}
              onPress={() => changeMonth(-1)}
            >
              <Icon name="chevron-left" size={20} color="#6366f1" />
            </Pressable>
            <View style={styles.monthDisplay}>
              <Text style={styles.monthText}>
                {selectedMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <Pressable style={styles.monthArrow} onPress={() => changeMonth(1)}>
              <Icon name="chevron-right" size={20} color="#6366f1" />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#6366f1"
            style={styles.loader}
          />
        ) : monthStats ? (
          <>
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardPresent]}>
                <View style={styles.statIconContainer}>
                  <Icon name="check-circle" size={24} color="#22c55e" />
                </View>
                <Text style={styles.statValue}>{monthStats.totalPresent}</Text>
                <Text style={styles.statLabel}>Days Present</Text>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>
                    {monthStats.attendanceRate.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardAbsent]}>
                <View style={styles.statIconContainer}>
                  <Icon name="x-circle" size={24} color="#ef4444" />
                </View>
                <Text style={styles.statValue}>{monthStats.totalAbsent}</Text>
                <Text style={styles.statLabel}>Days Absent</Text>
                <View style={[styles.statBadge, styles.statBadgeAbsent]}>
                  <Text style={styles.statBadgeText}>
                    of {monthStats.totalWorkingDays}
                  </Text>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardHours]}>
                <View style={styles.statIconContainer}>
                  <Icon name="clock" size={24} color="#6366f1" />
                </View>
                <Text style={styles.statValue}>
                  {monthStats.totalHoursWorked.toFixed(1)}h
                </Text>
                <Text style={styles.statLabel}>Total Hours</Text>
                <View style={[styles.statBadge, styles.statBadgeHours]}>
                  <Text style={styles.statBadgeText}>
                    {monthStats.avgHoursPerDay.toFixed(1)}h/day
                  </Text>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardRate]}>
                <View style={styles.statIconContainer}>
                  <Icon name="trending-up" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.statValue}>
                  {monthStats.attendanceRate.toFixed(0)}%
                </Text>
                <Text style={styles.statLabel}>Attendance Rate</Text>
                <View style={[styles.statBadge, styles.statBadgeRate]}>
                  <Text style={styles.statBadgeText}>
                    {monthStats.attendanceRate >= 90
                      ? 'Excellent'
                      : monthStats.attendanceRate >= 75
                      ? 'Good'
                      : 'Needs Improvement'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Attendance Progress Bar */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Attendance Overview</Text>
              <View style={styles.progressCard}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${monthStats.attendanceRate}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressLegend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: '#22c55e' }]}
                    />
                    <Text style={styles.legendText}>
                      Present: {monthStats.totalPresent}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: '#ef4444' }]}
                    />
                    <Text style={styles.legendText}>
                      Absent: {monthStats.totalAbsent}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: '#94a3b8' }]}
                    />
                    <Text style={styles.legendText}>
                      Sundays:{' '}
                      {
                        monthStats.records.filter(r => r.status === 'sunday')
                          .length
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Daily Records */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Daily Attendance</Text>
              <FlatList
                data={monthStats.records}
                renderItem={renderDayRecord}
                keyExtractor={item => item.date}
                scrollEnabled={false}
                contentContainerStyle={styles.daysList}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="bar-chart-2" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No data available</Text>
            <Text style={styles.emptySubtext}>
              Select an employee and month to view analytics
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Employee Selection Modal */}
      <Modal
        visible={showEmployeeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmployeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <Pressable onPress={() => setShowEmployeeModal(false)}>
                <Icon name="x" size={24} color="#64748b" />
              </Pressable>
            </View>
            <FlatList
              data={employees}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.employeeItem,
                    selectedEmployee?._id === item._id &&
                      styles.employeeItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedEmployee(item);
                    setShowEmployeeModal(false);
                  }}
                >
                  <View style={styles.employeeItemAvatar}>
                    <Text style={styles.employeeItemAvatarText}>
                      {item.name?.charAt(0)?.toUpperCase() || 'E'}
                    </Text>
                  </View>
                  <View style={styles.employeeItemInfo}>
                    <Text style={styles.employeeItemName}>{item.name}</Text>
                    <Text style={styles.employeeItemEmail}>{item.email}</Text>
                  </View>
                  {selectedEmployee?._id === item._id && (
                    <Icon name="check" size={20} color="#6366f1" />
                  )}
                </Pressable>
              )}
            />
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
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  employeeSelector: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  employeeSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  employeeEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  monthSelector: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  loader: {
    marginTop: 40,
  },
  statsGrid: {
    paddingHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardPresent: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  statCardAbsent: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statCardHours: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  statCardRate: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  statBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statBadgeAbsent: {
    backgroundColor: '#fee2e2',
  },
  statBadgeHours: {
    backgroundColor: '#e0e7ff',
  },
  statBadgeRate: {
    backgroundColor: '#fef3c7',
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 6,
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: '#64748b',
  },
  daysList: {
    gap: 8,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dayCardSunday: {
    backgroundColor: '#fafafa',
  },
  dayCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayInfo: {
    flex: 1,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  dayStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  hoursBlock: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 4,
  },
  hoursValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
  },
  absentBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  absentText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  sundayBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sundayText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  employeeItemSelected: {
    backgroundColor: '#f8fafc',
  },
  employeeItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeItemAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  employeeItemInfo: {
    flex: 1,
  },
  employeeItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  employeeItemEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
});

export default AnalyticsScreen;
