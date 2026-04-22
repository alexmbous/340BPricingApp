import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { palette } from '../../src/design-system/tokens';

type FeatherName = keyof typeof Feather.glyphMap;

export default function PatientLayout(): React.ReactElement {
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
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: makeIcon('home') }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarIcon: makeIcon('search') }}
      />
      <Tabs.Screen
        name="pharmacies"
        options={{ title: 'Pharmacies', tabBarIcon: makeIcon('map-pin') }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: makeIcon('user') }}
      />
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
