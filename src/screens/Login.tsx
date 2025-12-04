import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView, // Added for better keyboard handling
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
// If not using Expo, use react-native-linear-gradient
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current; // New: Slide up from bottom
  const buttonAnim = useRef(new Animated.Value(1)).current;

  // --- Component Mount Animation ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900, // Longer duration for smoother effect
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.back(1)), // Use a nice spring-like easing
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // --- Button Press Animation ---
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onSubmit = async () => {
    animateButton();
    setLoading(true);
    setError(null);
    try {
      // Simulating a network delay for better visual of the loading indicator
      await new Promise(resolve => setTimeout(resolve, 500)); 
      await signIn(email, password);
    } catch (e: any) {
      setError(e?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      // Vibrant Sunset/Sunrise Gradient
      colors={['#FFC371', '#FF5F6D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.gradient}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.cardContainer, // New style for the login card
            { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] },
          ]}
        >
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Let's get you signed in.</Text>

          {/* EMAIL INPUT */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              placeholderTextColor="#A99A8E"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* PASSWORD INPUT */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#A99A8E"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* SUBMIT BUTTON */}
          <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
            <TouchableOpacity
              style={styles.button}
              onPress={onSubmit}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Log In Securely</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity>
            <Text style={styles.footer}>Forgot your password?</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

// --- Updated Styles ---
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: 'center',
  },
  cardContainer: {
    // A clean, white card that stands out against the gradient
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 25,
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800', // Made bolder
    color: '#333333', // Dark text for contrast
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    color: '#333333',
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    // Subtle, rounded input field
    backgroundColor: '#F8F8F8', 
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  error: {
    color: '#E74C3C', // A standard warning red
    marginTop: 5,
    marginBottom: 15,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    // New button: A deep, rich secondary color from the gradient palette
    backgroundColor: '#FF5F6D', 
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    // Add a shadow matching the button color
    shadowColor: '#FF5F6D',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    color: '#FF5F6D', // Match the button color for the link
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Login;