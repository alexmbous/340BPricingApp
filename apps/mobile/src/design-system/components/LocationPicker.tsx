import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@apexcare/api-client';

import { useResolveZip } from '../../features/locations/hooks';
import { describeError } from '../../lib/errors';
import {
  FALLBACK_LOCATION,
  requestCurrentPosition,
  type LocationStatus,
} from '../../lib/location';
import { palette, radius, spacing } from '../tokens';

import { Button } from './Button';
import { Card } from './Card';
import { InlineBanner } from './InlineBanner';
import { Spinner } from './Spinner';
import { Text } from './Text';
import { TextInput } from './TextInput';

export type LocationSource = 'gps' | 'zip' | 'demo';

export interface LocationChoice {
  coords: { lat: number; lng: number };
  source: LocationSource;
  /** Human label like "Using your location" or "60610 · Chicago, IL". */
  label: string;
}

export interface LocationPickerProps {
  value: LocationChoice | null;
  onChange: (choice: LocationChoice | null) => void;
  /** Optional — if set, the picker opens expanded on first render. */
  initiallyExpanded?: boolean;
}

/**
 * Lets the user decide where "nearby" is: GPS, ZIP code, or the seeded
 * demo point. Keeps its own transient state (expansion, ZIP input) and
 * hands the resolved { coords, label, source } back via onChange.
 */
export function LocationPicker({
  value,
  onChange,
  initiallyExpanded,
}: LocationPickerProps): React.ReactElement {
  const [expanded, setExpanded] = useState(!!initiallyExpanded || !value);
  const [gpsStatus, setGpsStatus] = useState<LocationStatus>({ kind: 'idle' });
  const [zipInput, setZipInput] = useState('');
  const [submittedZip, setSubmittedZip] = useState('');
  const zipQuery = useResolveZip(submittedZip);

  // If the GPS request succeeds, hoist it to the parent once.
  useEffect(() => {
    if (gpsStatus.kind === 'granted') {
      onChange({
        coords: { lat: gpsStatus.lat, lng: gpsStatus.lng },
        source: 'gps',
        label: 'Using your location',
      });
      setExpanded(false);
    }
  }, [gpsStatus, onChange]);

  // When the ZIP query resolves, hoist the coords to the parent.
  useEffect(() => {
    if (zipQuery.data) {
      const r = zipQuery.data;
      onChange({
        coords: { lat: r.lat, lng: r.lng },
        source: 'zip',
        label: `${r.postalCode} · ${r.city}, ${r.state}`,
      });
      setExpanded(false);
    }
  }, [zipQuery.data, onChange]);

  const onUseGps = async (): Promise<void> => {
    setGpsStatus({ kind: 'requesting' });
    const res = await requestCurrentPosition();
    setGpsStatus(res);
  };

  const onUseDemo = (): void => {
    onChange({
      coords: FALLBACK_LOCATION,
      source: 'demo',
      label: 'Demo location · Chicago, IL',
    });
    setExpanded(false);
  };

  const onSubmitZip = (): void => {
    const normalized = zipInput.trim();
    if (!/^\d{5}(-\d{4})?$/.test(normalized)) return;
    setSubmittedZip(normalized);
  };

  const zipBadInput =
    zipInput.length > 0 && !/^\d{5}(-\d{4})?$/.test(zipInput.trim());

  return (
    <Card style={styles.card}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryTextWrap}>
          <Text variant="overline" tone="secondary">Location</Text>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.summary}>
            {value?.label ?? 'Choose a location'}
          </Text>
        </View>
        <Pressable onPress={() => setExpanded((s) => !s)} hitSlop={10} style={styles.toggle}>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={palette.primary500}
          />
          <Text variant="bodyStrong" tone="primary">
            {expanded ? 'Hide' : 'Change'}
          </Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.body}>
          <View style={styles.primaryActions}>
            <Button
              label={gpsStatus.kind === 'requesting' ? 'Finding you…' : 'Use my location'}
              onPress={() => void onUseGps()}
              loading={gpsStatus.kind === 'requesting'}
              variant="secondary"
              style={styles.actionBtn}
            />
            <Button
              label="Demo location"
              onPress={onUseDemo}
              variant="ghost"
              style={styles.actionBtn}
            />
          </View>

          {gpsStatus.kind === 'denied' ? (
            <InlineBanner
              tone="warning"
              title="Location denied"
              description={
                gpsStatus.reason === 'services_disabled'
                  ? 'Turn on location services in your device settings, or use a ZIP code below.'
                  : 'Grant location permission in Settings, or use a ZIP code below.'
              }
            />
          ) : null}

          <View style={styles.zipRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Search by ZIP"
                value={zipInput}
                onChangeText={setZipInput}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="e.g. 60610"
                error={zipBadInput ? 'Enter a 5-digit ZIP' : undefined}
                onSubmitEditing={onSubmitZip}
                returnKeyType="search"
              />
            </View>
            <View style={styles.zipButtonWrap}>
              <Button
                label={zipQuery.isLoading ? 'Looking up…' : 'Apply'}
                onPress={onSubmitZip}
                loading={zipQuery.isLoading}
                disabled={!/^\d{5}(-\d{4})?$/.test(zipInput.trim())}
              />
            </View>
          </View>

          {zipQuery.isError ? (
            <InlineBanner
              tone="danger"
              title="ZIP not found"
              description={
                zipQuery.error instanceof ApiError && zipQuery.error.status === 404
                  ? "We don't have coverage for that ZIP yet. Try a nearby one."
                  : describeError(zipQuery.error)
              }
            />
          ) : null}

          {zipQuery.isLoading && !zipQuery.data ? <Spinner /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryTextWrap: { flex: 1, minWidth: 0 },
  summary: { marginTop: 2 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  body: { marginTop: spacing.md, gap: spacing.md },
  primaryActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
  zipRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  zipButtonWrap: { paddingBottom: 2 },
});
