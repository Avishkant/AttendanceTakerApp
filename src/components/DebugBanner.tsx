import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DebugBanner: React.FC<{ text?: string }> = ({
  text = 'DEV BUILD — UI Updated',
}) => {
  return (
    <View style={styles.banner} pointerEvents="none">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#ff3b30',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default DebugBanner;
