import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import DashboardScreen from './DashboardScreen';
import MyDevicesScreen from './MyDevicesScreen';
import Records from './Records';
import ProfileScreen from './ProfileScreen';
import EmployeeBottomNav from '../components/EmployeeBottomNav';

const Tab = createBottomTabNavigator();

const EmployeePortal: React.FC = () => {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Records" component={Records} />
        <Tab.Screen name="Devices" component={MyDevicesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
      <EmployeeBottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});

export default EmployeePortal;
