import React from 'react';
import { Button } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminHome from './AdminHome';
import EmployeesScreen from './EmployeesScreen';
import RequestsScreen from './RequestsScreen';
import { useAuth } from '../contexts/AuthContext';

const LogoutButton: React.FC = () => {
  const { signOut } = useAuth();
  return <Button title="Logout" onPress={() => signOut()} />;
};

const renderLogout = () => <LogoutButton />;

const Tab = createBottomTabNavigator();

const AdminPortal: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerRight: renderLogout,
      }}
    >
      <Tab.Screen name="AdminHome" component={AdminHome} options={{ title: 'Home' }} />
      <Tab.Screen name="Employees" component={EmployeesScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
    </Tab.Navigator>
  );
};

export default AdminPortal;
