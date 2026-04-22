import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette } from '../src/design-system/tokens';
import { useAuthStore, isAdmin } from '../src/state/auth';
import { queryClient } from '../src/state/query-client';

export default function RootLayout(): React.ReactElement {
  const { status, user, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === 'unknown') return;
    const first = segments[0];
    const inAuthGroup = first === '(auth)';
    const inPatient = first === '(patient)';
    const inAdmin = first === '(admin)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }
    if (status === 'authenticated') {
      const wantsAdmin = isAdmin(user);
      if (inAuthGroup) {
        router.replace(wantsAdmin ? '/(admin)/dashboard' : '/(patient)');
        return;
      }
      if (wantsAdmin && inPatient) router.replace('/(admin)/dashboard');
      if (!wantsAdmin && inAdmin) router.replace('/(patient)');
    }
  }, [status, user, segments, router]);

  if (status === 'unknown') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ActivityIndicator color={palette.primary500} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
