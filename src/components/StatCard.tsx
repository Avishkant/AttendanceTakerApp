import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../theme';

const parseColor = (input: string) => {
  if (!input) return null;
  const hex = input.trim();
  const hexMatch = /^#([A-Fa-f0-9]{3}){1,2}$/.test(hex);
  if (hexMatch) {
    let c = hex.substring(1);
    if (c.length === 3)
      c = c
        .split('')
        .map(ch => ch + ch)
        .join('');
    return {
      r: parseInt(c.slice(0, 2), 16),
      g: parseInt(c.slice(2, 4), 16),
      b: parseInt(c.slice(4, 6), 16),
    };
  }
  const rgbMatch = /rgba?\(([^)]+)\)/.exec(input);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(p => p.trim());
    const r = parseInt(parts[0], 10) || 0;
    const g = parseInt(parts[1], 10) || 0;
    const b = parseInt(parts[2], 10) || 0;
    return { r, g, b };
  }
  return null;
};

const getContrastColor = (bg: string) => {
  const rgb = parseColor(bg) || { r: 255, g: 255, b: 255 };
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.6 ? theme.COLORS.black : theme.COLORS.white;
};

type Props = {
  title: string;
  value: string | number;
  color?: string;
  icon?: string; // emoji fallback
};

const StatCard: React.FC<Props> = ({
  title,
  value,
  color = theme.COLORS.primary,
  icon,
}) => {
  const bg = theme.COLORS.card;
  const valueColor = getContrastColor(bg);
  return (
    <View style={[styles.card, { borderColor: color + '22' }]}>
      <View style={[styles.pill, { backgroundColor: color + '22' }]} />
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.title}>
        {icon ? `${icon} ` : ''}
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.COLORS.card,
    borderRadius: theme.RADIUS.md,
    padding: theme.SPACING.md,
    marginHorizontal: 6,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 100,
    ...theme.SHADOW,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginBottom: 8,
  },
  value: {
    color: theme.COLORS.white,
    ...theme.TYPO.h2,
  },
  title: {
    color: theme.COLORS.neutralText,
    ...theme.TYPO.label,
    marginTop: 6,
    opacity: 0.95,
  },
});

export default StatCard;
