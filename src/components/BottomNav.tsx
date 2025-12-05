import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import Icon from './Icon';
import { useAuth } from '../contexts/AuthContext';

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
  const [showMenu, setShowMenu] = useState(false);
  const { signOut, user } = useAuth();

  const handlePress = (key: string) => {
    if (key === 'menu') {
      setShowMenu(true);
      return;
    }
    setActive(key);
    if (onNavigate) onNavigate(key);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          setShowMenu(false);
          signOut();
        },
      },
    ]);
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

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
                  <Text style={styles.userEmail}>{user?.email || ''}</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert('Profile', 'Profile feature coming soon!');
              }}
            >
              <Icon name="user" size={20} color="#64748b" />
              <Text style={styles.menuItemText}>Profile</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert('Settings', 'Settings feature coming soon!');
              }}
            >
              <Icon name="settings" size={20} color="#64748b" />
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert('Help', 'Help & Support coming soon!');
              }}
            >
              <Icon name="help-circle" size={20} color="#64748b" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleLogout}
            >
              <Icon name="log-out" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Logout
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 80,
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  menuItemDanger: {
    backgroundColor: '#fef2f2',
  },
  menuItemTextDanger: {
    color: '#ef4444',
    fontWeight: '600',
  },
});

export default BottomNav;
