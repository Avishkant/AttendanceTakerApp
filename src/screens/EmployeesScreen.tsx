import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../api/client';
import EmployeeListItem from '../components/EmployeeListItem';
import { useNavigation } from '@react-navigation/native';

const EmployeesScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const navigation = useNavigation();

  const load = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/employees', { params: { q } });
      if (res?.data?.success) setEmployees(res.data.data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <TextInput placeholder="Search by name or email..." value={query} onChangeText={setQuery} onSubmitEditing={() => load(query)} style={styles.search} />
      {loading ? <ActivityIndicator /> : null}
      <FlatList data={employees} keyExtractor={i => i._id} renderItem={({ item }) => (
        <EmployeeListItem
          name={item.name}
          email={item.email}
          role={item.role}
          onManage={() => navigation.navigate('EmployeeManage' as any, { employeeId: item._id })}
        />
      )} ListEmptyComponent={() => <Text style={{ padding: 12 }}>No employees</Text>} />
    </View>
  );
};

const styles = StyleSheet.create({
  search: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 12 },
});

export default EmployeesScreen;
