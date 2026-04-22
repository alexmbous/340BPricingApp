import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette, spacing } from '../tokens';

import { Text } from './Text';

export function Spinner({ label }: { label?: string }): React.ReactElement {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={palette.primary500} />
      {label ? (
        <Text variant="caption" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  label: { marginTop: 2 },
});
