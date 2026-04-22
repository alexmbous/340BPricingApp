import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { palette, radius, shadow, spacing } from '../tokens';

export interface CardProps extends ViewProps {
  padded?: boolean;
  raised?: boolean;
}

export function Card({ padded = true, raised = false, style, ...rest }: CardProps): React.ReactElement {
  return <View {...rest} style={[styles.base, padded && styles.padded, raised && shadow.card, style]} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  padded: { padding: spacing.lg },
});
