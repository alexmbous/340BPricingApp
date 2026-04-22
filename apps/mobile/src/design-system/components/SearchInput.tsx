import { Feather } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { palette, radius, spacing } from '../tokens';

export interface SearchInputProps extends TextInputProps {
  onClear?: () => void;
}

export const SearchInput = forwardRef<RNTextInput, SearchInputProps>(function SearchInput(
  { value, onClear, style, ...rest },
  ref,
) {
  const canClear = !!value && value.length > 0;
  return (
    <View style={styles.container}>
      <Feather name="search" size={18} color={palette.textTertiary} style={styles.leading} />
      <RNTextInput
        ref={ref}
        value={value}
        style={[styles.input, style]}
        placeholderTextColor={palette.textTertiary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        {...rest}
      />
      {canClear && onClear ? (
        <Pressable onPress={onClear} hitSlop={10} style={styles.clear}>
          <Feather name="x-circle" size={18} color={palette.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  leading: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: 16,
    color: palette.textPrimary,
    paddingVertical: spacing.sm,
  },
  clear: { paddingLeft: spacing.sm },
});
