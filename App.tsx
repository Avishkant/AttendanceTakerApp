/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

// Removed NewAppScreen (default RN template) to show real app UI immediately
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import Login from './src/screens/Login';
import EmployeePortal from './src/screens/EmployeePortal';
import AdminPortal from './src/screens/AdminPortal';
import Toast from 'react-native-toast-message';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Root />
        <Toast />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

// (AppContent removed — main UI is rendered by MainApp based on auth role)

const Stack = createNativeStackNavigator();

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Attendance Taker</Text>
        <Text style={styles.loadingSubtext}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainApp} />
        ) : (
          <Stack.Screen name="Login" component={Login} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainApp() {
  // safeAreaInsets removed (was only used by removed NewAppScreen)
  const { user } = useAuth();
  // optional server health check removed - not needed at runtime

  const role = (user?.role || 'employee').toLowerCase();
  return (
    <View style={styles.container}>
      {role === 'admin' ? <AdminPortal /> : <EmployeePortal />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
});

export default App;
