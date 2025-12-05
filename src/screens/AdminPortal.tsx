import React from 'react';
import { Button } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AdminHome from './AdminHome';
import EmployeesScreen from './EmployeesScreen';
import RequestsScreen from './RequestsScreen';
import EmployeeManageScreen from './EmployeeManageScreen';
import IPRestrictionsScreen from './IPRestrictionsScreen';
import Records from './Records';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import FAB from '../components/FAB';

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
      headerShown: false,
      // hide the built-in tab bar since we render a custom BottomNav
      tabBarStyle: { display: 'none' },
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

const AdminShell: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleNavigate = (key: string) => {
    switch (key) {
      case 'home':
        navigation.navigate('AdminHome');
        break;
      case 'employees':
        navigation.navigate('Employees');
        break;
      case 'requests':
        navigation.navigate('Requests');
        break;
      default:
        // fallback to home
        navigation.navigate('AdminHome');
    }
  };

  return (
    <>
      <AdminTabs />
      <BottomNav onNavigate={handleNavigate} />
      <FAB onPress={() => navigation.navigate('EmployeeManage')} />
    </>
  );
};

const AdminPortal: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminShell" component={AdminShell} />
      <Stack.Screen
        name="EmployeeManage"
        component={EmployeeManageScreen}
        options={{ headerShown: true, title: 'Manage Employee' }}
      />
      <Stack.Screen name="IPRestrictions" component={IPRestrictionsScreen} />
      <Stack.Screen name="Records" component={Records} />
    </Stack.Navigator>
  );
};

export default AdminPortal;
