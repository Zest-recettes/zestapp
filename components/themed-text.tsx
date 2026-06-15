/**
 * ZESTUP — ThemedText
 * Couleurs et typographie alignées sur le design system ZESTUP.
 * Aucune couleur bleue (#0a7ea4 supprimée).
 */

import { StyleSheet, Text, type TextProps } from 'react-native';
import { Bordeaux, Ink } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[
        { color: Ink.default },
        type === 'default'         ? styles.default         : undefined,
        type === 'title'           ? styles.title           : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle'        ? styles.subtitle        : undefined,
        type === 'link'            ? styles.link            : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize:   16,
    lineHeight: 23,
    color:      Ink.default,
  },
  defaultSemiBold: {
    fontSize:   16,
    lineHeight: 23,
    fontWeight: '600',
    color:      Ink.default,
  },
  title: {
    fontFamily:    'InstrumentSerif_400Regular_Italic',
    fontSize:      28,
    lineHeight:    32,
    color:         Ink.default,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize:   18,
    fontWeight: '500',
    color:      Ink.soft,
  },
  link: {
    fontSize:   16,
    lineHeight: 23,
    color:      Bordeaux.default,   // bordeaux remplace le bleu #0a7ea4
  },
});
