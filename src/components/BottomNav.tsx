import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import theme from '../theme';

type NavItem = {
  key: string;
  label: string;
  icon: string;
  onPress?: () => void;
};

const items: NavItem[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'employees', label: 'Employees', icon: 'users' },
  { key: 'requests', label: 'Requests', icon: 'inbox' },
  { key: 'records', label: 'Records', icon: 'calendar' },
];

type Props = {
  onNavigate?: (key: string) => void;
};

const BottomNav: React.FC<Props> = ({ onNavigate }) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.nav}>
        {items.map(it => (
          <TouchableOpacity
            key={it.key}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={it.label}
            onPress={() => onNavigate && onNavigate(it.key)}
          >
            <Icon name={it.icon} size={20} color={theme.COLORS.white} />
            <Text style={styles.label}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    alignItems: 'center',
    zIndex: 50,
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: theme.COLORS.primaryDark,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    ...theme.SHADOW,
  },
  item: { flex: 1, alignItems: 'center' },
  label: { color: theme.COLORS.white, fontSize: 11, marginTop: 4 },
});

export default BottomNav;
