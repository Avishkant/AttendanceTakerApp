import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  name: string;
  email?: string;
  role?: string;
  onManage?: () => void;
};

const EmployeeListItem: React.FC<Props> = ({ name, email, role, onManage }) => {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.name}>{name}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.role}>{role}</Text>
        <TouchableOpacity onPress={onManage} style={styles.manageBtn} accessibilityRole="button">
          <Text style={{ color: '#fff' }}>Manage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '700' },
  email: { color: '#666' },
  right: { alignItems: 'flex-end' },
  role: { backgroundColor: '#eee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  manageBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
});

export default EmployeeListItem;
