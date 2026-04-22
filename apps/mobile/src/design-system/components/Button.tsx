import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { palette, radius, spacing } from '../tokens';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  style,
  ...rest
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        SIZE[size],
        VARIANT_BG[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      hitSlop={6}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : palette.primary500} />
        ) : (
          <Text variant={size === 'lg' ? 'bodyStrong' : 'bodyStrong'} tone={VARIANT_TEXT[variant]}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const SIZE: Record<Size, ViewStyle> = {
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 44 },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, minHeight: 52 },
};

const VARIANT_BG: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: palette.primary500 },
  secondary: { backgroundColor: palette.primary50, borderWidth: 1, borderColor: palette.primary100 },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: palette.danger500 },
};

const VARIANT_TEXT: Record<Variant, React.ComponentProps<typeof Text>['tone']> = {
  primary: 'onPrimary',
  secondary: 'primary',
  ghost: 'primary',
  danger: 'onPrimary',
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  fullWidth: { alignSelf: 'stretch' },
});
