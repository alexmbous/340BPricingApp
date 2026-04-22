import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '../tokens';

import { Text } from './Text';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function ListItem({
  title,
  subtitle,
  right,
  left,
  showChevron = true,
  onPress,
  style,
  accessibilityLabel,
}: ListItemProps): React.ReactElement {
  const isPressable = !!onPress;
  const inner = (
    <View style={styles.row}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {showChevron && isPressable ? (
        <Feather name="chevron-right" size={18} color={palette.textTertiary} />
      ) : null}
    </View>
  );
  if (!isPressable) {
    return <View style={[styles.base, style]}>{inner}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  left: { marginRight: spacing.xs },
  body: { flex: 1, minWidth: 0 },
  subtitle: { marginTop: 2 },
  right: { marginLeft: spacing.xs, alignItems: 'flex-end', gap: 4 },
});
