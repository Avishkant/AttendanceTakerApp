import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from './Icon';

type NavItem = {
  key: string;
  label: string;
  icon: string;
};

const items: NavItem[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'employees', label: 'Employees', icon: 'users' },
  { key: 'requests', label: 'Requests', icon: 'clipboard' },
  { key: 'menu', label: 'Menu', icon: 'menu' },
];

type Props = {
  onNavigate?: (key: string) => void;
};

const BottomNav: React.FC<Props> = ({ onNavigate }) => {
  const [active, setActive] = useState('home');

  const handlePress = (key: string) => {
    setActive(key);
    if (onNavigate) onNavigate(key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        {items.map(it => {
          const isActive = active === it.key;
          return (
            <Pressable
              key={it.key}
              style={styles.item}
              onPress={() => handlePress(it.key)}
            >
              <Icon
                name={it.icon}
                size={22}
                color={isActive ? '#6366f1' : '#64748b'}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 8,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
  },
  item: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  labelActive: {
    color: '#6366f1',
    fontWeight: '700',
  },
});

export default BottomNav;
