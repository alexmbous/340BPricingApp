import type { PharmacyDto } from '@apexcare/shared-types';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';


import {
  Card,
  EmptyState,
  InlineBanner,
  ListItem,
  LocationPicker,
  Screen,
  SectionHeader,
  Spinner,
  Text,
  spacing,
  type LocationChoice,
} from '../../src/design-system';
import { useMyPatientProfile } from '../../src/features/auth/hooks';
import { api } from '../../src/lib/api-client';
import { describeError } from '../../src/lib/errors';
import { formatMiles } from '../../src/lib/format';

export default function PharmaciesScreen(): React.ReactElement {
  const profile = useMyPatientProfile();
  const [choice, setChoice] = useState<LocationChoice | null>(null);

  const nearby = useQuery<PharmacyDto[]>({
    queryKey: ['pharmacies', 'nearby', choice?.coords.lat, choice?.coords.lng],
    queryFn: () =>
      api.findNearbyPharmacies({
        lat: choice!.coords.lat,
        lng: choice!.coords.lng,
        radiusMiles: 10,
        limit: 20,
      }),
    enabled: !!choice,
    staleTime: 60_000,
  });

  const preferred = profile.data?.preferredPharmacy ?? null;
  const preferredId = preferred?.id ?? null;
  const otherNearby = nearby.data?.filter((p) => p.id !== preferredId) ?? [];

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="overline" tone="secondary">Pharmacies</Text>
        <Text variant="heading">Where you can fill prescriptions</Text>
      </View>

      <SectionHeader label="Preferred by your clinic" />
      {preferred ? (
        <Card raised>
          <Text variant="title">{preferred.name}</Text>
          <Text variant="caption" tone="secondary" style={styles.body}>
            {preferred.address1} · {preferred.city}, {preferred.state} {preferred.postalCode}
          </Text>
          {preferred.phone ? (
            <Text variant="caption" tone="tertiary" style={styles.phone}>
              {preferred.phone}
            </Text>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text variant="body" tone="secondary">
            Your clinic hasn’t chosen a preferred pharmacy for you yet.
          </Text>
        </Card>
      )}

      <SectionHeader label="Find nearby" />
      <LocationPicker value={choice} onChange={setChoice} initiallyExpanded={!choice} />

      {!choice ? (
        <EmptyState
          title="Pick a location to search"
          description="Use your location, a ZIP code, or the demo location to find nearby pharmacies."
        />
      ) : nearby.isLoading ? (
        <Spinner />
      ) : nearby.isError ? (
        <InlineBanner
          tone="warning"
          title="Couldn’t load nearby pharmacies"
          description={describeError(nearby.error)}
        />
      ) : otherNearby.length === 0 ? (
        <EmptyState title="No other pharmacies nearby" description="Try a different ZIP." />
      ) : (
        <View style={styles.list}>
          {otherNearby.map((p) => (
            <ListItem
              key={p.id}
              title={p.name}
              subtitle={`${p.address1} · ${p.city}, ${p.state}`}
              right={<Text variant="caption" tone="tertiary">{formatMiles(p.distanceMiles)}</Text>}
              showChevron={false}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm },
  body: { marginTop: spacing.xs },
  phone: { marginTop: spacing.xs },
  list: { gap: spacing.sm },
});
