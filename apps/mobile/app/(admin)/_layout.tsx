import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { palette } from '../../src/design-system/tokens';

type FeatherName = keyof typeof Feather.glyphMap;

export default function AdminLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary500,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarStyle: {
          borderTopColor: palette.hairline,
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: makeIcon('grid') }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients', tabBarIcon: makeIcon('users') }} />
      <Tabs.Screen name="audit" options={{ title: 'Audit', tabBarIcon: makeIcon('activity') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: makeIcon('user') }} />
    </Tabs>
  );
}

function makeIcon(name: FeatherName) {
  const Icon = ({ color, size }: { color: string; size: number }): React.ReactElement => (
    <Feather name={name} size={size} color={color} />
  );
  Icon.displayName = `TabIcon(${name})`;
  return Icon;
}
