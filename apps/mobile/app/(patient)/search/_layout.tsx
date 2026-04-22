import { Stack } from 'expo-router';

import { palette } from '../../../src/design-system/tokens';

export default function SearchStackLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="compare" options={{ title: 'Compare' }} />
    </Stack>
  );
}
