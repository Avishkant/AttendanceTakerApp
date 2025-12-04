import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import Icon from '../components/Icon';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import theme from '../theme';

type RecordItem = {
  _id: string;
  type: 'in' | 'out';
  timestamp: string;
  ip?: string;
  user?: { id: string; name?: string } | null;
};

type DayRecord = {
  dateKey: string; // yyyy-mm-dd
  dateLabel: string; // Tue, Apr 1, 2025
  firstIn?: RecordItem | null;
  lastOut?: RecordItem | null;
  all?: RecordItem[];
  employeeId?: string | null;
  employeeName?: string | null;
};

const Records: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'all' | 'employee'>('all');
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);

  // Filters: month or explicit date range
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [startDate, setStartDate] = useState<string>(''); // yyyy-mm-dd
  const [endDate, setEndDate] = useState<string>('');
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // handlers for pickers
  const onConfirmStart = (d: Date) => {
    const s = d.toISOString().slice(0, 10);
    setStartDate(s);
    setStartDateObj(d);
    setShowStartPicker(false);
  };
  const onConfirmEnd = (d: Date) => {
    const s = d.toISOString().slice(0, 10);
    setEndDate(s);
    setEndDateObj(d);
    setShowEndPicker(false);
  };

  const load = async () => {
    setLoading(true);
    try {
      if (user?.role === 'admin') {
        // For admin: fetch list of employees only (lazy load their attendance)
        setLoadingEmployees(true);
        const empRes = await api.get('/api/admin/employees');
        const empList = empRes?.data?.success ? empRes.data.data : [];
        setEmployees(empList || []);
        setMeta({ employees: empList.length });
        setLoadingEmployees(false);
        // do not fetch all attendances by default to avoid heavy requests
        // Admin can either pick an employee or press 'Load All' to explicitly load everything
      } else {
        const res = await api.get('/api/attendance/history', {
          params: { limit: 200 },
        });
        if (res && res.data && res.data.success) {
          setRecords(res.data.data || []);
        }
      }
    } catch (err) {
      // ignore for now; user will see empty list
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance for a single employee (lazy)
  const fetchEmployeeAttendance = async (employeeId: string) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/api/admin/employees/${employeeId}/attendance`,
        { params: { limit: 500 } },
      );
      const emp = employees.find(e => e._id === employeeId) || null;
      const data = res?.data?.data || [];
      // Tag records with user info so grouping/search works
      const tagged: RecordItem[] = data.map((r: any) => ({
        ...r,
        user: { id: employeeId, name: emp?.name || null },
      }));
      setRecords(tagged);
    } catch (e) {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Explicitly load all employees' attendances (user-triggered)
  const fetchAllAttendance = async () => {
    setLoading(true);
    try {
      const requests = employees.map((e: any) =>
        api
          .get(`/api/admin/employees/${e._id}/attendance`, {
            params: { limit: 200 },
          })
          .then((r: any) => ({ user: e, data: r?.data?.data || [] }))
          .catch(() => ({ user: e, data: [] })),
      );
      const results = await Promise.all(requests);
      const all: RecordItem[] = [];
      results.forEach((r: any) => {
        (r.data || []).forEach((rec: any) => {
          all.push({ ...rec, user: { id: r.user._id, name: r.user.name } });
        });
      });
      all.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
      setRecords(all);
      setLoadedAll(true);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // If admin, default to per-employee view so we avoid loading everything automatically
  useEffect(() => {
    if (user?.role === 'admin') setViewMode('employee');
  }, [user]);

  // When employees list is available and in employee mode, auto-select first employee
  useEffect(() => {
    if (
      viewMode === 'employee' &&
      employees.length > 0 &&
      !selectedEmployeeId
    ) {
      const first = employees[0];
      setSelectedEmployeeId(first._id);
      fetchEmployeeAttendance(first._id);
    }
  }, [viewMode, employees]);
  // Grouping logic: supports 'all' (combined) and 'employee' (per-employee) modes.
  const grouped = useMemo(() => {
    const inRange = (dateKey: string) => {
      // If both start and end provided, filter by range
      if (startDate && endDate) {
        return dateKey >= startDate && dateKey <= endDate;
      }
      // If only start provided
      if (startDate && !endDate) {
        return dateKey >= startDate;
      }
      // If only end provided
      if (!startDate && endDate) {
        return dateKey <= endDate;
      }
      // No explicit range: show all dates by default
      return true;
    };

    if (viewMode === 'employee') {
      // group by employeeId + date
      const map: Record<string, DayRecord> = {};
      records.forEach(r => {
        const d = new Date(r.timestamp);
        const dateKey = d.toISOString().slice(0, 10);
        const empId = r.user?.id || 'unknown';
        const key = `${empId}__${dateKey}`;
        if (!map[key]) {
          map[key] = {
            dateKey: key,
            dateLabel: new Date(dateKey).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            firstIn: null,
            lastOut: null,
            all: [],
            employeeId: empId,
            employeeName: r.user?.name || null,
          };
        }
        map[key].all = map[key].all || [];
        map[key].all.push(r);
      });
      const days = Object.values(map).map(dr => {
        const items = (dr.all || []).sort((a, b) =>
          a.timestamp > b.timestamp ? 1 : -1,
        );
        const firstIn = items.find(i => i.type === 'in') || null;
        const lastOut =
          [...items].reverse().find(i => i.type === 'out') || null;
        return { ...dr, firstIn, lastOut } as DayRecord;
      });
      // apply filters: search on employee name and date range/month
      const filtered = days.filter(d => {
        const datePart = d.dateKey.split('__').pop() || '';
        const matchesDate = inRange(datePart);
        const matchesSearch = search
          ? (d.employeeName || '').toLowerCase().includes(search.toLowerCase())
          : true;
        return matchesDate && matchesSearch;
      });
      // sort by date desc
      filtered.sort((a, b) => (a.dateKey > b.dateKey ? -1 : 1));
      return filtered;
    }

    // Default: group all records by date (combined employees)
    const map: Record<string, RecordItem[]> = {};
    records.forEach(r => {
      const d = new Date(r.timestamp);
      const key = d.toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    const days: DayRecord[] = Object.keys(map)
      .sort((a, b) => (a > b ? -1 : 1))
      .map(k => {
        const items = (map[k] || []).sort((a, b) =>
          a.timestamp > b.timestamp ? 1 : -1,
        );
        const firstIn = items.find(i => i.type === 'in') || null;
        const lastOut =
          [...items].reverse().find(i => i.type === 'out') || null;
        const dateLabel = new Date(k).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return { dateKey: k, dateLabel, firstIn, lastOut, all: items };
      });
    // apply date filtering and search (search matches any user name in the day's records)
    const filtered = days.filter(d => {
      if (!inRange(d.dateKey)) return false;
      if (!search) return true;
      return (d.all || []).some(r =>
        (r.user?.name || '').toLowerCase().includes(search.toLowerCase()),
      );
    });
    return filtered;
  }, [records, viewMode, search, startDate, endDate]);

  const renderDay = ({ item }: { item: DayRecord }) => {
    const inTime = item.firstIn ? new Date(item.firstIn.timestamp) : null;
    const outTime = item.lastOut ? new Date(item.lastOut.timestamp) : null;
    const workingMs =
      inTime && outTime ? outTime.getTime() - inTime.getTime() : null;

    const formatTime = (d?: Date | null) =>
      d
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.accent} />
          <View style={styles.cardContent}>
            <View style={styles.rowTop}>
              <View>
                <Text style={styles.dateLabel}>{item.dateLabel}</Text>
                {item.employeeName ? (
                  <Text style={styles.employeeName}>{item.employeeName}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.timesRow}>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Check In</Text>
                <Text
                  style={[
                    styles.timeValue,
                    inTime ? styles.timeOk : styles.timeMissing,
                  ]}
                >
                  {formatTime(inTime)}
                </Text>
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Check Out</Text>
                <Text
                  style={[
                    styles.timeValue,
                    outTime ? styles.timeOk : styles.timeMissing,
                  ]}
                >
                  {formatTime(outTime)}
                </Text>
              </View>
              <View style={styles.durationCol}>
                <Text style={styles.timeLabel}>Working Hrs</Text>
                <Text
                  style={[
                    styles.durationValue,
                    workingMs ? styles.timeOk : styles.timeMissing,
                  ]}
                >
                  {workingMs
                    ? `${Math.floor(workingMs / 3600000)
                        .toString()
                        .padStart(2, '0')}:${Math.floor(
                        (workingMs % 3600000) / 60000,
                      )
                        .toString()
                        .padStart(2, '0')}`
                    : '--:--'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Details</Text>

      <View style={styles.filterRow}>
        {/* Show mode toggles only for admins */}
        {user?.role === 'admin' ? (
          <View style={styles.filterButtonsRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                viewMode === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setViewMode('all')}
            >
              <Text style={styles.filterText}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                viewMode === 'employee' && styles.filterButtonActive,
              ]}
              onPress={() => setViewMode('employee')}
            >
              <Text style={styles.filterText}>Per Employee</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            user?.role === 'admin' && viewMode === 'employee'
              ? 'Search employee...'
              : 'Search name/date...'
          }
          style={styles.searchInput}
        />
      </View>
      {/* Month controls and date-range inputs */}
      <View style={styles.monthRow}>
        <TouchableOpacity
          style={styles.monthBtn}
          onPress={() =>
            setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
        >
          <Text style={styles.filterText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {monthDate.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <TouchableOpacity
          style={styles.monthBtn}
          onPress={() =>
            setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
          }
        >
          <Text style={styles.filterText}>{'›'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <View style={styles.dateInner}>
            <Icon name="calendar" size={14} color={theme.COLORS.primary} />
            <Text style={[styles.dateText, styles.dateTextLeft]}>
              {startDate || 'Start (YYYY-MM-DD)'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndPicker(true)}
        >
          <View style={styles.dateInner}>
            <Icon name="calendar" size={14} color={theme.COLORS.primary} />
            <Text style={[styles.dateText, styles.dateTextLeft]}>
              {endDate || 'End (YYYY-MM-DD)'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {viewMode === 'employee' ? (
        <View style={styles.employeeSelector}>
          {loadingEmployees ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={employees}
              horizontal
              keyExtractor={e => e._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.employeeItem,
                    selectedEmployeeId === item._id &&
                      styles.employeeItemActive,
                  ]}
                  onPress={() => {
                    setSelectedEmployeeId(item._id);
                    fetchEmployeeAttendance(item._id);
                  }}
                >
                  <Text style={styles.filterText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.loadAllButton}
            onPress={fetchAllAttendance}
          >
            <Text style={styles.filterText}>Load All</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={i =>
            i.employeeId ? `${i.employeeId}-${i.dateKey}` : i.dateKey
          }
          renderItem={renderDay}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No records found</Text>
          }
        />
      )}

      {/* Date pickers (modal) */}
      <DatePicker
        modal
        mode="date"
        open={showStartPicker}
        date={startDateObj || new Date()}
        onConfirm={date => onConfirmStart(date)}
        onCancel={() => setShowStartPicker(false)}
      />
      <DatePicker
        modal
        mode="date"
        open={showEndPicker}
        date={endDateObj || new Date()}
        onConfirm={date => onConfirmEnd(date)}
        onCancel={() => setShowEndPicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.SPACING.sm },
  title: { fontSize: 18, fontWeight: '600', marginBottom: theme.SPACING.xs },

  card: {
    backgroundColor: theme.COLORS.card,
    borderRadius: theme.RADIUS.sm,
    marginBottom: theme.SPACING.sm,
    ...theme.SHADOW,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'stretch' },
  accent: { width: 6, backgroundColor: theme.COLORS.primary },
  cardContent: { flex: 1, padding: theme.SPACING.sm },

  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: { fontSize: 15, fontWeight: '700', color: theme.COLORS.black },
  typeBadge: {
    backgroundColor: 'rgba(76,111,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    color: theme.COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },

  timesRow: {
    flexDirection: 'row',
    marginTop: theme.SPACING.xs,
    alignItems: 'center',
  },
  timeCol: { flex: 1 },
  durationCol: { width: 100, alignItems: 'flex-end' },
  timeLabel: { fontSize: 12, color: theme.COLORS.neutralText },
  timeValue: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  durationValue: { fontSize: 14, fontWeight: '700', marginTop: 6 },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  filterButtonActive: { backgroundColor: 'rgba(76,111,255,0.08)' },
  filterText: { color: theme.COLORS.primary, fontWeight: '700' },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.COLORS.bgLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  employeeName: { color: theme.COLORS.neutralText, marginTop: 4, fontSize: 13 },
  dateButton: {
    backgroundColor: theme.COLORS.bgLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  dateText: { color: theme.COLORS.black },
  dateInner: { flexDirection: 'row', alignItems: 'center' },
  dateTextLeft: { marginLeft: 8 },
  filterButtonsRow: { flexDirection: 'row' },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.SPACING.sm,
  },
  monthBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  monthLabel: { fontWeight: '700', marginHorizontal: 8 },
  dateInput: {
    width: 140,
    marginLeft: 8,
    backgroundColor: theme.COLORS.bgLight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  employeeSelector: {
    marginBottom: theme.SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  employeeItemActive: { backgroundColor: 'rgba(76,111,255,0.12)' },
  loadAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  listContent: { paddingBottom: 24 },
  emptyText: { padding: 12 },

  timeOk: { color: theme.COLORS.success },
  timeMissing: { color: theme.COLORS.error },
});

export default Records;
