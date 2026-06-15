/**
 * ZESTUP — ThemedView
 * Fond crème par défaut. Aucun dark mode.
 */

import { View, type ViewProps } from 'react-native';
import { Cream } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  variant?: 'default' | 'paper';
};

export function ThemedView({ style, variant = 'default', ...otherProps }: ThemedViewProps) {
  const backgroundColor = variant === 'paper' ? Cream.paper : Cream.default;
  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
