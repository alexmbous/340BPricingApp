import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  InlineBanner,
  Screen,
  Text,
  TextInput,
  spacing,
} from '../../../src/design-system';
import { useCreatePatient } from '../../../src/features/patients/hooks';
import { describeError } from '../../../src/lib/errors';
import { useAuthStore } from '../../../src/state/auth';

interface FormState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

const EMPTY: FormState = { email: '', password: '', firstName: '', lastName: '', dateOfBirth: '' };

export default function NewPatientScreen(): React.ReactElement {
  const router = useRouter();
  const orgId = useAuthStore((s) => s.user?.organizationId) ?? '';
  const create = useCreatePatient(orgId);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const onChange = <K extends keyof FormState>(k: K, v: FormState[K]): void =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = 'Enter a valid email';
    if (form.password.length < 10) next.password = 'At least 10 characters';
    if (form.firstName.trim().length === 0) next.firstName = 'Required';
    if (form.lastName.trim().length === 0) next.lastName = 'Required';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth)) next.dateOfBirth = 'Use YYYY-MM-DD';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (): Promise<void> => {
    if (!orgId) return;
    if (!validate()) return;
    try {
      const patient = await create.mutateAsync({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
      });
      router.replace({
        pathname: '/(admin)/patients/[id]',
        params: { id: patient.id },
      });
    } catch {
      // error surface is rendered below
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">Add a new patient</Text>
        <Text variant="body" tone="secondary">
          They’ll sign in with this email and password. Share it securely.
        </Text>
      </View>

      {create.isError ? (
        <InlineBanner tone="danger" title="Could not create patient" description={describeError(create.error)} />
      ) : null}

      <View style={styles.form}>
        <View style={styles.row}>
          <View style={styles.half}>
            <TextInput
              label="First name"
              value={form.firstName}
              onChangeText={(v) => onChange('firstName', v)}
              error={errors.firstName}
            />
          </View>
          <View style={styles.half}>
            <TextInput
              label="Last name"
              value={form.lastName}
              onChangeText={(v) => onChange('lastName', v)}
              error={errors.lastName}
            />
          </View>
        </View>
        <TextInput
          label="Email"
          value={form.email}
          onChangeText={(v) => onChange('email', v)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="patient@example.com"
          error={errors.email}
        />
        <TextInput
          label="Date of birth"
          value={form.dateOfBirth}
          onChangeText={(v) => onChange('dateOfBirth', v)}
          placeholder="YYYY-MM-DD"
          helper="Format: YYYY-MM-DD"
          error={errors.dateOfBirth}
        />
        <TextInput
          label="Temporary password"
          value={form.password}
          onChangeText={(v) => onChange('password', v)}
          secureTextEntry
          placeholder="At least 10 characters"
          helper="The patient can change this after signing in."
          error={errors.password}
        />
        <Button
          label={create.isPending ? 'Creating…' : 'Create patient'}
          onPress={onSubmit}
          loading={create.isPending}
          fullWidth
          size="lg"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm },
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
