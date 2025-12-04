import React from 'react';
import { SafeAreaView, View, StyleSheet, ScrollView } from 'react-native';
import theme from '../theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: any;
};

const Container: React.FC<Props> = ({
  children,
  scroll,
  contentContainerStyle,
}) => {
  if (scroll) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    );
  }

  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.bgLight,
  },
  content: {
    padding: theme.SPACING.md,
  },
});

export default Container;
