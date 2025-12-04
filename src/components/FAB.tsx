import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Icon from './Icon';
import theme from '../theme';

type Props = {
  onPress?: () => void;
};

const FAB: React.FC<Props> = ({ onPress }) => {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.fab}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Icon name="plus" size={22} color={theme.COLORS.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', right: 30, bottom: 80, zIndex: 60 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.SHADOW,
  },
});

export default FAB;
