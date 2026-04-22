import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing } from '../tokens';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  padded?: boolean;
}

export function Screen({ children, scroll = true, contentStyle, padded = true }: ScreenProps): React.ReactElement {
  const content = (
    <View style={[padded && styles.padded, contentStyle]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.static}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  static: { flex: 1 },
  padded: { padding: spacing.lg, gap: spacing.lg },
});
