import React from 'react';
import { StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '../tokens';

import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.iconSlot} />
      <Text variant="title">{title}</Text>
      {description ? (
        <Text variant="body" tone="secondary" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  iconSlot: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: palette.primary50,
  },
  description: { textAlign: 'center' },
  action: { marginTop: spacing.sm },
});
