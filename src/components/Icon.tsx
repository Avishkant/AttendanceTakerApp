import React from 'react';
import { Text } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import theme from '../theme';

type Props = {
  name: string;
  size?: number;
  color?: string;
};

const Icon: React.FC<Props> = ({
  name,
  size = 18,
  color = theme.COLORS.primary,
}) => {
  try {
    return <Feather name={name as any} size={size} color={color} />;
  } catch (e) {
    return <Text style={{ color, fontSize: size }}>🔹</Text>;
  }
};

export default Icon;
