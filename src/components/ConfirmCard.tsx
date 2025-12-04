import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  iconName?: string; // optional vector icon name (MaterialIcons)
};

const bgFor = (v: Props['variant']) => {
  switch (v) {
    case 'success':
      return '#ecfdf5';
    case 'warning':
      return '#fffbeb';
    case 'danger':
      return '#fff1f2';
    default:
      return '#f0f9ff';
  }
};

const accentFor = (v: Props['variant']) => {
  switch (v) {
    case 'success':
      return '#059669';
    case 'warning':
      return '#b45309';
    case 'danger':
      return '#dc2626';
    default:
      return '#0ea5e9';
  }
};

export default function ConfirmCard({
  visible,
  title,
  subtitle,
  variant = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  iconName,
}: Props) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    let mountedFlag = true;
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.98,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (mountedFlag) setMounted(false);
      });
    }
    return () => {
      mountedFlag = false;
    };
  }, [visible, opacity, scale, translateY]);

  // Try to load MaterialIcons if available; fall back to checkmark text
  let Icon: any = null;
  try {
    // require inside try so bundler won't fail if library missing — runtime fallback handled
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('react-native-vector-icons/MaterialIcons');
    Icon = pkg && (pkg.default || pkg);
  } catch {
    Icon = null;
  }

  // Auto-dismiss success cards after a short delay if an onConfirm handler is present
  // NOTE: removed automatic auto-dismiss behavior so the card remains visible
  // until the caller explicitly handles confirm/cancel. This ensures users
  // actually see success and confirmation dialogs instead of them closing
  // immediately on some devices.

  if (!mounted) return null;

  // Use `mounted` to keep the native Modal mounted during the show/hide
  // animation cycle. Using `visible` directly could hide the native Modal
  // immediately when `visible` flips to false, preventing the exit
  // animation from displaying.
  return (
    <Modal visible={mounted} transparent animationType="none">
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: bgFor(variant),
              opacity,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View
              style={[styles.iconWrap, { borderColor: accentFor(variant) }]}
            >
              {Icon ? (
                <Icon
                  name={
                    iconName ||
                    (variant === 'success'
                      ? 'check-circle'
                      : variant === 'danger'
                      ? 'warning'
                      : 'help')
                  }
                  size={22}
                  color={accentFor(variant)}
                />
              ) : (
                <Text style={[styles.icon, { color: accentFor(variant) }]}>
                  {variant === 'success'
                    ? '✓'
                    : variant === 'danger'
                    ? '!'
                    : '?'}
                </Text>
              )}
            </View>

            <View style={styles.contentWrap}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={4}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.actionsRow}>
            {onCancel ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            {onConfirm ? (
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: accentFor(variant) },
                ]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmText}>{confirmText}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    maxWidth: 520,
    minWidth: 320,
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  contentWrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  icon: {
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#0f172a',
  },
  subtitle: {
    color: '#334155',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  cancelText: {
    color: '#374151',
    fontWeight: '600',
  },
});
