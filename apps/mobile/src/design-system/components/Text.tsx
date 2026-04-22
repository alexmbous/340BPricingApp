import React from 'react';
import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { palette, typography } from '../tokens';

type Variant = keyof typeof typography;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'onPrimary' | 'danger' | 'success';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
}

const TONE_COLOR: Record<Tone, string> = {
  primary: palette.textPrimary,
  secondary: palette.textSecondary,
  tertiary: palette.textTertiary,
  onPrimary: palette.textOnPrimary,
  danger: palette.danger500,
  success: palette.success500,
};

export function Text({ variant = 'body', tone = 'primary', style, ...rest }: TextProps): React.ReactElement {
  return <RNText {...rest} style={[styles[variant], { color: TONE_COLOR[tone] }, style]} />;
}

const styles = StyleSheet.create({
  display: typography.display,
  heading: typography.heading,
  title: typography.title,
  body: typography.body,
  bodyStrong: typography.bodyStrong,
  caption: typography.caption,
  overline: typography.overline,
  mono: typography.mono,
});
