import React from 'react';
import { Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import DashboardScreen from './DashboardScreen';
import MyDevicesScreen from './MyDevicesScreen';
import Records from './Records';
import ProfileScreen from './ProfileScreen';
import Icon from '../components/Icon';

const Tab = createBottomTabNavigator();

const EmployeePortal: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Dashboard') {
            iconName = 'bar-chart-2';
          } else if (route.name === 'Devices') {
            iconName = 'smartphone';
          } else if (route.name === 'Records') {
            iconName = 'file-text';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }

          return (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 4,
              }}
            >
              <View
                style={{
                  width: focused ? 48 : 40,
                  height: focused ? 48 : 40,
                  borderRadius: focused ? 16 : 12,
                  backgroundColor: focused ? '#eef2ff' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: focused ? 4 : 0,
                }}
              >
                <Icon name={iconName} size={focused ? 22 : 20} color={color} />
              </View>
            </View>
          );
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 88 : 70,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Stats' }}
      />
      <Tab.Screen
        name="Records"
        component={Records}
        options={{ tabBarLabel: 'Records' }}
      />
      <Tab.Screen
        name="Devices"
        component={MyDevicesScreen}
        options={{ tabBarLabel: 'Devices' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default EmployeePortal;
