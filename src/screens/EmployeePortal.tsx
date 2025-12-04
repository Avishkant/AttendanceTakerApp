import React from 'react';
import { Button } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import DashboardScreen from './DashboardScreen';
import MyDevicesScreen from './MyDevicesScreen';
import Records from './Records';
import { useAuth } from '../contexts/AuthContext';

const LogoutButton: React.FC = () => {
  const { signOut } = useAuth();
  return <Button title="Logout" onPress={() => signOut()} />;
};

const renderLogout = () => <LogoutButton />;

const Tab = createBottomTabNavigator();

const EmployeePortal: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Devices" component={MyDevicesScreen} />
      <Tab.Screen name="Records" component={Records} />
    </Tab.Navigator>
  );
};

export default EmployeePortal;
