import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
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
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: bgFor(variant) }]}>
          <View style={styles.headerRow}>
            <View
              style={[styles.iconWrap, { borderColor: accentFor(variant) }]}
            >
              <Text style={[styles.icon, { color: accentFor(variant) }]}>
                ✓
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
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
        </View>
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
    width: '100%',
    maxWidth: 520,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
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
