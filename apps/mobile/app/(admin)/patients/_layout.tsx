import { Stack } from 'expo-router';

import { palette } from '../../../src/design-system/tokens';

export default function AdminPatientsLayout(): React.ReactElement {
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
      <Stack.Screen name="new" options={{ title: 'New patient' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Patient' }} />
      <Stack.Screen name="[id]/assign" options={{ title: 'Assign medication' }} />
    </Stack>
  );
}
