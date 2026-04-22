import { Redirect } from 'expo-router';

// The root layout handles all routing based on auth status.
// This file keeps expo-router happy when cold-starting at `/`.
export default function Index(): React.ReactElement {
  return <Redirect href="/(auth)/sign-in" />;
}
