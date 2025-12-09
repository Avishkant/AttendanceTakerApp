import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import Icon from './Icon';

const { width } = Dimensions.get('window');

type NavItem = {
  key: string;
  label: string;
  icon: string;
  screen: string;
  color: string;
  gradient: string[];
};

const navItems: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    screen: 'Home',
    color: '#6366f1',
    gradient: ['#6366f1', '#8b5cf6'],
  },
  {
    key: 'stats',
    label: 'Stats',
    icon: 'activity',
    screen: 'Dashboard',
    color: '#10b981',
    gradient: ['#10b981', '#059669'],
  },
  {
    key: 'records',
    label: 'Records',
    icon: 'clock',
    screen: 'Records',
    color: '#f59e0b',
    gradient: ['#f59e0b', '#d97706'],
  },
  {
    key: 'devices',
    label: 'Devices',
    icon: 'smartphone',
    screen: 'Devices',
    color: '#ec4899',
    gradient: ['#ec4899', '#db2777'],
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'user',
    screen: 'Profile',
    color: '#8b5cf6',
    gradient: ['#8b5cf6', '#7c3aed'],
  },
];

const EmployeeBottomNav: React.FC = () => {
  const navigation = useNavigation<any>();
  const currentRoute = useNavigationState(state => {
    const route = state.routes[state.index];
    return route.name;
  });

  const [scaleAnims] = React.useState(
    navItems.map(() => new Animated.Value(1)),
  );

  const [translateAnims] = React.useState(
    navItems.map(() => new Animated.Value(0)),
  );

  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const index = navItems.findIndex(item => item.screen === currentRoute);
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
      // Animate active indicator
      Animated.spring(translateAnims[index], {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    }
  }, [currentRoute, activeIndex, translateAnims]);

  const handlePress = (item: NavItem, index: number) => {
    // Haptic feedback simulation with animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnims[index], {
          toValue: 0.85,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.timing(translateAnims[index], {
          toValue: -8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnims[index], {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.spring(translateAnims[index], {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
      ]),
    ]).start();

    navigation.navigate(item.screen);
  };

  const isActive = (item: NavItem) => {
    return currentRoute === item.screen;
  };

  return (
    <View style={styles.container}>
      {/* Floating Background with Glow */}
      <View style={styles.floatingBg}>
        <View style={styles.glowEffect} />
      </View>

      {/* Active Indicator Slider */}
      <Animated.View
        style={[
          styles.activeSlider,
          {
            transform: [
              {
                translateX: activeIndex * ((width - 48) / navItems.length),
              },
            ],
          },
        ]}
      />

      {/* Navigation Items */}
      <View style={styles.navRow}>
        {navItems.map((item, index) => {
          const active = isActive(item);
          return (
            <Animated.View
              key={item.key}
              style={[
                styles.navItemWrapper,
                {
                  transform: [
                    { scale: scaleAnims[index] },
                    { translateY: translateAnims[index] },
                  ],
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.navItem,
                  pressed && styles.navItemPressed,
                ]}
                onPress={() => handlePress(item, index)}
                android_ripple={{
                  color: `${item.color}20`,
                  borderless: true,
                  radius: 36,
                }}
              >
                {/* Active Background Glow */}
                {active && (
                  <Animated.View
                    style={[
                      styles.activeGlow,
                      { backgroundColor: `${item.color}15` },
                    ]}
                  />
                )}

                {/* Icon Container */}
                <View
                  style={[
                    styles.iconContainer,
                    active && {
                      backgroundColor: item.color,
                      shadowColor: item.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 6,
                    },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={active ? 24 : 20}
                    color={active ? '#fff' : '#64748b'}
                  />

                  {/* Active Pulse Effect */}
                  {active && (
                    <View
                      style={[styles.pulseRing, { borderColor: item.color }]}
                    />
                  )}
                </View>

                {/* Label */}
                <Text
                  style={[
                    styles.label,
                    active && {
                      color: item.color,
                      fontWeight: '700',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>

                {/* Active Indicator Dot */}
                {active && (
                  <View
                    style={[styles.activeDot, { backgroundColor: item.color }]}
                  />
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Bottom Safe Area for iOS */}
      {Platform.OS === 'ios' && <View style={styles.iosSafeArea} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  floatingBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    bottom: -30,
    left: '5%',
    right: '5%',
    height: 100,
    backgroundColor: '#6366f1',
    opacity: 0.06,
    borderRadius: 50,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  activeSlider: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 20,
    left: 24,
    width: (width - 48) / 5,
    height: 4,
    backgroundColor: '#6366f1',
    borderRadius: 2,
    opacity: 0.3,
  },
  navRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 8 : 12,
    borderRadius: 32,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  navItemWrapper: {
    flex: 1,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 24,
    position: 'relative',
  },
  navItemPressed: {
    opacity: 0.7,
  },
  activeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    marginBottom: 2,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 23,
    borderWidth: 2,
    opacity: 0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  iosSafeArea: {
    height: 20,
    backgroundColor: 'transparent',
  },
});

export default EmployeeBottomNav;
