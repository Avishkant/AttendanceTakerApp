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
import { useEffect, useState } from 'react';
import api from './src/api/client';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import Login from './src/screens/Login';
import EmployeePortal from './src/screens/EmployeePortal';
import AdminPortal from './src/screens/AdminPortal';

const DebugPanel: React.FC<{ user: any; portalName: string }> = ({ user, portalName }) => {
  return (
    <View style={{ padding: 8, backgroundColor: '#fff3', borderBottomWidth: 1, borderColor: '#eee' }}>
      <Text style={{ fontSize: 12, fontWeight: '700' }}>Debug</Text>
      <Text style={{ fontSize: 12 }}>Portal: {portalName}</Text>
      <Text style={{ fontSize: 12 }}>User: {user ? JSON.stringify(user) : 'null'}</Text>
    </View>
  );
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Root />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

// (AppContent removed — main UI is rendered by MainApp based on auth role)

const Stack = createNativeStackNavigator();

function Root() {
  const { user, loading } = useAuth();
  if (loading) return null;

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
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get('/')
      .then(res => {
        if (!mounted) return;
        setServerMsg(res?.data?.message ?? 'OK');
      })
      .catch(err => {
        if (!mounted) return;
        setServerMsg(`Error: ${err.message}`);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const role = (user?.role || 'employee').toLowerCase();
  const portalName = role === 'admin' ? 'AdminPortal' : 'EmployeePortal';
  return (
    <View style={styles.container}>
      <DebugPanel user={user} portalName={portalName} />
      <View style={{ padding: 8 }}>
        <Text style={{ fontSize: 14, color: '#333' }}>
          Server: {serverMsg ?? 'Checking...'}
        </Text>
      </View>
      {role === 'admin' ? <AdminPortal /> : <EmployeePortal />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
