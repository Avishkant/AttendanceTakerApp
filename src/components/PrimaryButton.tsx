import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme';
import Icon from './Icon';

type Props = {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
  secondary?: boolean;
  loading?: boolean;
  icon?: string; // emoji fallback or icon name
};

const PrimaryButton: React.FC<Props> = ({
  title,
  onPress,
  style,
  secondary,
  loading,
  icon,
}) => {
  const anim = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(anim, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const containerStyle = [{ transform: [{ scale: anim }] }, style];

  if (secondary) {
    return (
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={[styles.secondaryWrapper, style]}
      >
        <Animated.View style={containerStyle}>
          <View style={styles.secondaryRow}>
            {icon ? (
              <Icon name={icon} size={16} color={theme.COLORS.white} />
            ) : null}
            <Text style={styles.secondaryText}>{title}</Text>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      style={style}
    >
      <Animated.View style={containerStyle}>
        <LinearGradient
          colors={[theme.COLORS.primary, theme.COLORS.primaryDark]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.row}>
            {icon ? (
              <Icon name={icon} size={18} color={theme.COLORS.white} />
            ) : null}
            <Text style={styles.text}>{title}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: theme.SPACING.sm,
    paddingHorizontal: theme.SPACING.md,
    borderRadius: theme.RADIUS.sm,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { color: theme.COLORS.white, fontWeight: '700', marginLeft: 6 },
  secondaryWrapper: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryText: {
    color: theme.COLORS.white,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default PrimaryButton;
