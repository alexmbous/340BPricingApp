import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '../tokens';

import { Text } from './Text';

type Tone = 'info' | 'success' | 'warning' | 'danger';

export interface InlineBannerProps {
  tone?: Tone;
  title: string;
  description?: string;
}

const STYLES: Record<
  Tone,
  {
    bg: string;
    border: string;
    icon: 'info' | 'check-circle' | 'alert-triangle' | 'alert-circle';
    color: string;
  }
> = {
  info: { bg: palette.info50, border: palette.info500, icon: 'info', color: palette.info500 },
  success: { bg: palette.success50, border: palette.success500, icon: 'check-circle', color: palette.success500 },
  warning: { bg: palette.warning50, border: palette.warning500, icon: 'alert-triangle', color: palette.warning500 },
  danger: { bg: palette.danger50, border: palette.danger500, icon: 'alert-circle', color: palette.danger500 },
};

export function InlineBanner({
  tone = 'info',
  title,
  description,
}: InlineBannerProps): React.ReactElement {
  const s = STYLES[tone];
  return (
    <View style={[styles.container, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Feather name={s.icon} size={18} color={s.color} style={styles.icon} />
      <View style={styles.body}>
        <Text variant="bodyStrong">{title}</Text>
        {description ? (
          <Text variant="caption" tone="secondary" style={styles.desc}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  icon: { marginTop: 2 },
  body: { flex: 1, gap: 2 },
  desc: { marginTop: 2 },
});
