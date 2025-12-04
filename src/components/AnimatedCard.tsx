import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleSheet } from 'react-native';
import Card from './Card';
import theme from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

const AnimatedCard: React.FC<Props> = ({ children, style }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [anim]);

  const containerStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  } as any;

  return (
    <Animated.View style={[containerStyle, style]}>
      <Card>{children}</Card>
    </Animated.View>
  );
};

export default AnimatedCard;
