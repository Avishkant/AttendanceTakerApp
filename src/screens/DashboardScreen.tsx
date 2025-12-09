import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import api from '../api/client';
import Icon from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface MonthlyStats {
  totalPresent: number;
  totalAbsent: number;
  totalLeaves: number;
  totalHoursWorked: number;
  workingDays: number;
  attendanceRate: number;
  avgHoursPerDay: number;
  monthName: string;
}

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeCreatedDate, setEmployeeCreatedDate] = useState<Date | null>(
    null,
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }

    const now = new Date();
    // Don't allow future months (compare year and month only)
    if (
      newMonth.getFullYear() < now.getFullYear() ||
      (newMonth.getFullYear() === now.getFullYear() &&
        newMonth.getMonth() <= now.getMonth())
    ) {
      setSelectedMonth(newMonth);
    }
  };

  const load = async () => {
    setRefreshing(true);
    try {
      const now = new Date();

      // Get employee creation date (use user creation date or registration date)
      const createdAt = user?.createdAt ? new Date(user.createdAt) : new Date();
      setEmployeeCreatedDate(createdAt);

      // Calculate date range for selected month (1st to last day)
      const monthStart = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth(),
        1,
        0,
        0,
        0,
      );
      const monthEnd = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      // For current month, don't go beyond today
      const toDate = monthEnd > now ? now : monthEnd;
      const from = monthStart.toISOString();
      const to = toDate.toISOString();

      // Fetch attendance history
      const hist = await api.get('/api/attendance/history', {
        params: { from, to, limit: 500 },
      });
      const records = hist?.data?.data || [];

      // Calculate statistics
      const daysPresent = new Set<string>();
      const hoursWorkedMap = new Map<string, number>();

      // Group by date and calculate hours worked
      records.forEach((r: any) => {
        const timestamp = new Date(r.timestamp);
        const dateKey = timestamp.toISOString().slice(0, 10);
        daysPresent.add(dateKey);
      });

      // Calculate hours worked per day
      const dayRecordsMap = new Map<string, any[]>();
      records.forEach((r: any) => {
        const dateKey = new Date(r.timestamp).toISOString().slice(0, 10);
        if (!dayRecordsMap.has(dateKey)) {
          dayRecordsMap.set(dateKey, []);
        }
        dayRecordsMap.get(dateKey)!.push(r);
      });

      let totalHoursWorked = 0;
      dayRecordsMap.forEach((dayRecords, dateKey) => {
        const checkIns = dayRecords
          .filter(r => r.type === 'in')
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
        const checkOuts = dayRecords
          .filter(r => r.type === 'out')
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );

        // Calculate hours for each check-in/check-out pair
        for (let i = 0; i < Math.min(checkIns.length, checkOuts.length); i++) {
          const inTime = new Date(checkIns[i].timestamp).getTime();
          const outTime = new Date(checkOuts[i].timestamp).getTime();

          // Calculate total time from check-in to check-out
          let sessionHours = (outTime - inTime) / (1000 * 60 * 60);

          // Subtract break time from this session
          if (checkIns[i].breaks && Array.isArray(checkIns[i].breaks)) {
            for (const brk of checkIns[i].breaks) {
              if (brk.start && brk.end) {
                const breakStart = new Date(brk.start).getTime();
                const breakEnd = new Date(brk.end).getTime();
                const breakHours = (breakEnd - breakStart) / (1000 * 60 * 60);
                sessionHours -= breakHours;
              }
            }
          }

          // Add session hours (after subtracting breaks) to total
          totalHoursWorked += Math.max(0, sessionHours);
          hoursWorkedMap.set(
            dateKey,
            (hoursWorkedMap.get(dateKey) || 0) + Math.max(0, sessionHours),
          );
        }
      });

      // Calculate working days (excluding Sundays) for the entire month
      let workingDays = 0;
      const currentDate = new Date(monthStart);
      while (currentDate <= toDate) {
        if (currentDate.getDay() !== 0) {
          // Exclude Sundays
          workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalPresent = daysPresent.size;
      const totalAbsent = workingDays - totalPresent;
      const attendanceRate =
        workingDays > 0 ? (totalPresent / workingDays) * 100 : 0;
      const avgHoursPerDay =
        totalPresent > 0 ? totalHoursWorked / totalPresent : 0;

      const monthName = selectedMonth.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      setMonthlyStats({
        totalPresent,
        totalAbsent,
        totalLeaves: totalAbsent, // In this context, absents are leaves
        totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
        workingDays,
        attendanceRate: Math.round(attendanceRate),
        avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
        monthName,
      });

      // Calculate weekly data for chart (last 7 days of selected month)
      const weeklyHours: number[] = [];
      const endDate = toDate;
      for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().slice(0, 10);
        weeklyHours.push(hoursWorkedMap.get(dateKey) || 0);
      }
      setWeeklyData(weeklyHours);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [selectedMonth]);

  const renderBarChart = () => {
    const maxHours = Math.max(...weeklyData, 1);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weekly Hours Worked</Text>
        <View style={styles.chartWrapper}>
          {weeklyData.map((hours, index) => {
            const heightPercent = maxHours > 0 ? (hours / maxHours) * 100 : 0;
            const minHeight = hours > 0 ? 20 : 0; // Minimum 20% height for visibility
            const displayHeight = Math.max(heightPercent, minHeight);

            return (
              <View key={index} style={styles.barColumn}>
                <Text style={styles.barValueTop}>
                  {hours > 0 ? hours.toFixed(1) + 'h' : '-'}
                </Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      { height: displayHeight + '%' },
                      hours === 0 && styles.barEmpty,
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{days[index]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.dashboardTitle}>
              <View style={styles.titleIconWrapper}>
                <Icon name="bar-chart" size={24} color="#0891b2" />
              </View>
              <Text style={styles.titleText}>Dashboard</Text>
            </View>

            {/* Month Selector */}
            <View style={styles.monthSelector}>
              <TouchableOpacity style={styles.monthButton} disabled={true}>
                <Icon name="chevron-left" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <View style={styles.monthDisplay}>
                <Icon name="calendar" size={16} color="#0891b2" />
                <Text style={styles.monthText}>
                  {selectedMonth.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <TouchableOpacity style={styles.monthButton} disabled={true}>
                <Icon name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0891b2" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      contentContainerStyle={styles.scrollContent}
    >
      {/* Simple Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.dashboardTitle}>
            <View style={styles.titleIconWrapper}>
              <Icon name="bar-chart" size={24} color="#0891b2" />
            </View>
            <Text style={styles.titleText}>Dashboard</Text>
          </View>

          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => changeMonth('prev')}
              style={styles.monthButton}
            >
              <Icon name="chevron-left" size={20} color="#0891b2" />
            </TouchableOpacity>

            <View style={styles.monthDisplay}>
              <Icon name="calendar" size={16} color="#0891b2" />
              <Text style={styles.monthText}>
                {selectedMonth.toLocaleString('default', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => changeMonth('next')}
              style={styles.monthButton}
              disabled={
                selectedMonth.getMonth() === new Date().getMonth() &&
                selectedMonth.getFullYear() === new Date().getFullYear()
              }
            >
              <Icon
                name="chevron-right"
                size={20}
                color={
                  selectedMonth.getMonth() === new Date().getMonth() &&
                  selectedMonth.getFullYear() === new Date().getFullYear()
                    ? '#cbd5e1'
                    : '#0891b2'
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Monthly Report Cards */}
      <View style={styles.reportContainer}>
        <Text style={styles.reportTitle}>
          Monthly Report - {monthlyStats?.monthName}
        </Text>

        <View style={styles.statsGrid}>
          {/* Present Days Card */}
          <View style={[styles.statCard, styles.presentCard]}>
            <View style={styles.statIconContainer}>
              <Icon name="check-circle" size={24} color="#10b981" />
            </View>
            <Text style={styles.statValue}>
              {monthlyStats?.totalPresent ?? 0}
            </Text>
            <Text style={styles.statLabel}>Present Days</Text>
          </View>

          {/* Absent/Leaves Card */}
          <View style={[styles.statCard, styles.absentCard]}>
            <View style={styles.statIconContainer}>
              <Icon name="x-circle" size={24} color="#ef4444" />
            </View>
            <Text style={styles.statValue}>
              {monthlyStats?.totalLeaves ?? 0}
            </Text>
            <Text style={styles.statLabel}>Leaves</Text>
          </View>

          {/* Total Hours Card */}
          <View style={[styles.statCard, styles.hoursCard]}>
            <View style={styles.statIconContainer}>
              <Icon name="clock" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>
              {monthlyStats?.totalHoursWorked ?? 0}h
            </Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>

          {/* Attendance Rate Card */}
          <View style={[styles.statCard, styles.rateCard]}>
            <View style={styles.statIconContainer}>
              <Icon name="trending-up" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.statValue}>
              {monthlyStats?.attendanceRate ?? 0}%
            </Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
        </View>
      </View>

      {/* Performance Overview */}
      {/* <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Performance Overview</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressInfo}>
            <Icon name="calendar-check" size={20} color="#0891b2" />
            <View style={styles.progressText}>
              <Text style={styles.progressLabel}>Working Days</Text>
              <Text style={styles.progressValue}>
                {monthlyStats?.workingDays ?? 0} days
              </Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                styles.progressBarCyan,
                { width: (monthlyStats?.attendanceRate ?? 0) + '%' },
              ]}
            />
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressInfo}>
            <Icon name="clock" size={20} color="#f59e0b" />
            <View style={styles.progressText}>
              <Text style={styles.progressLabel}>Avg Hours/Day</Text>
              <Text style={styles.progressValue}>
                {monthlyStats?.avgHoursPerDay ?? 0}h
              </Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                styles.progressBarOrange,
                {
                  width:
                    Math.min(
                      ((monthlyStats?.avgHoursPerDay ?? 0) / 9) * 100,
                      100,
                    ) + '%',
                },
              ]}
            />
          </View>
        </View>
      </View> */}

      {/* Weekly Chart */}
      {renderBarChart()}

      {/* Period Info */}
      {/* {employeeCreatedDate && (
        <View style={styles.infoCard}>
          <Icon name="info" size={20} color="#64748b" />
          <Text style={styles.infoText}>
            Showing data from{' '}
            {new Date(employeeCreatedDate).toLocaleDateString()} to{' '}
            {new Date().toLocaleDateString()}
          </Text>
        </View>
      )} */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    gap: 16,
  },
  dashboardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  reportContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 64) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
  },
  presentCard: {
    borderColor: '#d1fae5',
  },
  absentCard: {
    borderColor: '#fee2e2',
  },
  hoursCard: {
    borderColor: '#fef3c7',
  },
  rateCard: {
    borderColor: '#ede9fe',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
  },
  progressRow: {
    marginBottom: 20,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  progressText: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressBarCyan: {
    backgroundColor: '#0891b2',
  },
  progressBarOrange: {
    backgroundColor: '#f59e0b',
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 200,
    paddingTop: 30,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValueTop: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0891b2',
    marginBottom: 8,
    minHeight: 16,
  },
  barContainer: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: '#0891b2',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 8,
  },
  barEmpty: {
    backgroundColor: '#e2e8f0',
    minHeight: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    lineHeight: 18,
  },
});

export default DashboardScreen;
