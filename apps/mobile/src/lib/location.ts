import * as Location from 'expo-location';

export type LocationStatus =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'granted'; lat: number; lng: number }
  | { kind: 'denied'; reason: 'permission' | 'services_disabled' | 'unknown' };

/**
 * Fallback point used when location permission is denied or unavailable.
 * Sits near the seeded Chicago cluster so demos always return results.
 */
export const FALLBACK_LOCATION = { lat: 41.9036, lng: -87.6319 };

export async function requestCurrentPosition(): Promise<LocationStatus> {
  try {
    const services = await Location.hasServicesEnabledAsync();
    if (!services) return { kind: 'denied', reason: 'services_disabled' };
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { kind: 'denied', reason: 'permission' };
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { kind: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return { kind: 'denied', reason: 'unknown' };
  }
}
