import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../theme';

type Props = {
  label: string;
  value: string | number;
  color?: string;
};

const parseColor = (input: string) => {
  // returns { r,g,b } or null
  if (!input) return null;
  const hex = input.trim();
  // hex formats
  const hexMatch = /^#([A-Fa-f0-9]{3}){1,2}$/.test(hex);
  if (hexMatch) {
    let c = hex.substring(1);
    if (c.length === 3)
      c = c
        .split('')
        .map(ch => ch + ch)
        .join('');
    const num = parseInt(c, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  // rgba(...) or rgb(...)
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
  // luminance approximation
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.6 ? theme.COLORS.black : theme.COLORS.white;
};

const AttendanceBadge: React.FC<Props> = ({
  label,
  value,
  color = '#E6F0FF',
}) => {
  const textColor = getContrastColor(color);
  return (
    <View style={styles.container}>
      <View style={[styles.circle, { backgroundColor: color }]}>
        <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 88, margin: 8 },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  value: { fontSize: 20, fontWeight: '800', color: '#0B1220' },
  label: { marginTop: 8, fontSize: 12, color: '#39404A', textAlign: 'center' },
});

export default AttendanceBadge;
