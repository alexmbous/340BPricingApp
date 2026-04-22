import React, { forwardRef } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { palette, radius, spacing } from '../tokens';

import { Text } from './Text';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  helper?: string;
  error?: string;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { label, helper, error, style, ...rest },
  ref,
) {
  const hasError = !!error;
  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="overline" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <RNTextInput
        ref={ref}
        placeholderTextColor={palette.textTertiary}
        {...rest}
        style={[styles.input, hasError && styles.inputError, style]}
      />
      {helper && !hasError ? (
        <Text variant="caption" tone="tertiary" style={styles.helper}>
          {helper}
        </Text>
      ) : null}
      {hasError ? (
        <Text variant="caption" tone="danger" style={styles.helper}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginBottom: spacing.xxs },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: palette.textPrimary,
    minHeight: 48,
  },
  inputError: { borderColor: palette.danger500 },
  helper: { marginTop: spacing.xxs },
});
