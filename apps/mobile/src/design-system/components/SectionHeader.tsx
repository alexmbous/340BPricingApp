import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../tokens';

import { Text } from './Text';

export interface SectionHeaderProps {
  label: string;
  action?: React.ReactNode;
}

export function SectionHeader({ label, action }: SectionHeaderProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text variant="overline" tone="secondary">
        {label}
      </Text>
      {action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
