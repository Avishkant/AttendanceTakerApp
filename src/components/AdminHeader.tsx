import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme';

type Props = {
  title?: string;
  subtitle?: string;
};

const AdminHeader: React.FC<Props> = ({
  title = 'Admin Dashboard',
  subtitle = 'Overview',
}) => {
  return (
    <LinearGradient
      colors={[theme.COLORS.primary, theme.COLORS.primaryDark]}
      style={styles.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.SPACING.lg,
    paddingHorizontal: theme.SPACING.md,
    borderRadius: theme.RADIUS.md,
    marginBottom: theme.SPACING.md,
    ...theme.SHADOW,
  },
  title: {
    color: theme.COLORS.white,
    ...theme.TYPO.h2,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: theme.COLORS.cardElevated,
    marginTop: 6,
    ...theme.TYPO.body,
    opacity: 0.95,
  },
});

export default AdminHeader;
