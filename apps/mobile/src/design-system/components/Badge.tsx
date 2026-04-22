import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '../tokens';

import { Text } from './Text';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
}

const TONE_STYLES: Record<BadgeTone, { bg: string; text: React.ComponentProps<typeof Text>['tone'] }> = {
  neutral: { bg: palette.hairline, text: 'secondary' },
  info: { bg: palette.info50, text: 'primary' },
  success: { bg: palette.success50, text: 'success' },
  warning: { bg: palette.warning50, text: 'primary' },
  danger: { bg: palette.danger50, text: 'danger' },
};

export function Badge({ label, tone = 'neutral', style }: BadgeProps): React.ReactElement {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View style={[styles.base, { backgroundColor: toneStyle.bg }, style]}>
      <Text variant="overline" tone={toneStyle.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
});
