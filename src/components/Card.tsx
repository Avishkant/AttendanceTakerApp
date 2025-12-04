import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import theme from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

const Card: React.FC<Props> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.COLORS.card,
    borderRadius: theme.RADIUS.md,
    padding: theme.SPACING.md,
    ...theme.SHADOW,
  },
});

export default Card;
