import React from 'react';
import { Button } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminHome from './AdminHome';
import EmployeesScreen from './EmployeesScreen';
import RequestsScreen from './RequestsScreen';
import EmployeeManageScreen from './EmployeeManageScreen';
import { useAuth } from '../contexts/AuthContext';

const LogoutButton: React.FC = () => {
  const { signOut } = useAuth();
  return <Button title="Logout" onPress={() => signOut()} />;
};

const renderLogout = () => <LogoutButton />;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AdminTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: true,
      headerRight: renderLogout,
    }}
  >
    <Tab.Screen
      name="AdminHome"
      component={AdminHome}
      options={{ title: 'Home' }}
    />
    <Tab.Screen name="Employees" component={EmployeesScreen} />
    <Tab.Screen name="Requests" component={RequestsScreen} />
  </Tab.Navigator>
);

const AdminPortal: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen
        name="EmployeeManage"
        component={EmployeeManageScreen}
        options={{ headerShown: true, title: 'Manage Employee' }}
      />
    </Stack.Navigator>
  );
};

export default AdminPortal;
