import { ApiError } from '@apexcare/api-client';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';


import { Button, Screen, Text, TextInput, palette, spacing } from '../../src/design-system';
import { useAuthStore } from '../../src/state/auth';

// Phase 2: minimal but real sign-in that exercises the full
// auth → refresh → me → route-gate flow end-to-end. Visual polish
// arrives in Phase 3.
export default function SignInScreen(): React.ReactElement {
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.length > 3 && password.length >= 8 && !submitting;

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn({ email: email.trim(), password, deviceLabel: `Expo ${Platform.OS}` });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('That email and password combination is not recognized.');
      } else {
        setError('Something went wrong signing in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.bg }}
    >
      <Screen>
        <View style={styles.header}>
          <Text variant="overline" tone="secondary">ApexCare</Text>
          <Text variant="display">Sign in</Text>
          <Text variant="body" tone="secondary">
            Access pricing and medications from your clinic.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            placeholder="At least 8 characters"
          />
          {error ? <Text tone="danger" variant="caption">{error}</Text> : null}
          <Button
            label={submitting ? 'Signing in…' : 'Sign in'}
            onPress={onSubmit}
            loading={submitting}
            disabled={!canSubmit}
            fullWidth
            size="lg"
          />
        </View>

        <Text variant="caption" tone="tertiary" style={styles.footer}>
          Having trouble? Contact your clinic administrator.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.xxxl, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  footer: { marginTop: spacing.xl, textAlign: 'center' },
});
