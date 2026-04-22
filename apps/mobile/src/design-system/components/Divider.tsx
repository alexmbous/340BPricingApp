import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { palette } from '../tokens';

export function Divider({ style }: { style?: ViewStyle }): React.ReactElement {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: palette.hairline },
});
