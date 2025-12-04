import { TextStyle, ViewStyle } from 'react-native';

const COLORS = {
  primary: '#4C6FFF',
  primaryDark: '#5A4BFF',
  accent: '#20C997',
  success: '#0ACF83',
  warning: '#FFC107',
  error: '#FF3B30',
  bgLight: '#F9FAFB',
  bgDark: '#0B0F1A',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  neutralText: '#9CA3AF',
  white: '#FFFFFF',
  black: '#0B1220',
};

const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
};

const RADIUS = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
};

const ELEVATION = {
  low: 2,
  medium: 6,
  high: 12,
};

const SHADOW: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
};

const TYPO = {
  h1: { fontSize: 24, fontWeight: '800' } as TextStyle,
  h2: { fontSize: 20, fontWeight: '700' } as TextStyle,
  h3: { fontSize: 16, fontWeight: '600' } as TextStyle,
  body: { fontSize: 14, fontWeight: '400' } as TextStyle,
  label: { fontSize: 12, fontWeight: '600' } as TextStyle,
};

export default {
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  TYPO,
  ELEVATION,
};
