import { View } from 'react-native';

import { Button, Card, Screen, Text, spacing } from '../../src/design-system';
import { useAuthStore } from '../../src/state/auth';

export default function AdminAccountScreen(): React.ReactElement {
  const { user, signOut } = useAuthStore();
  return (
    <Screen>
      <Text variant="heading">Account</Text>
      <Card>
        <Text variant="overline" tone="secondary">Signed in as</Text>
        <Text variant="bodyStrong" style={{ marginTop: spacing.xs }}>{user?.displayName}</Text>
        <Text variant="caption" tone="secondary">{user?.email}</Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: spacing.sm }}>
          Role: {user?.role}
        </Text>
      </Card>
      <View style={{ marginTop: spacing.md }}>
        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} fullWidth />
      </View>
    </Screen>
  );
}
