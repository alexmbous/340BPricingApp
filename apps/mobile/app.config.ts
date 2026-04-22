import type { ExpoConfig } from 'expo/config';

// Per-environment mobile config. APP_ENV controls bundle identifier,
// display name, and API base URL so TestFlight/Play Internal builds do
// not collide with App Store / Play Store production builds.
const APP_ENV = (process.env.APP_ENV ?? 'development') as 'development' | 'staging' | 'production';

const NAMES: Record<typeof APP_ENV, { name: string; slug: string; scheme: string; bundleSuffix: string }> = {
  development: { name: 'ApexCare (Dev)', slug: 'apexcare-dev', scheme: 'apexcare.dev', bundleSuffix: '.dev' },
  staging: { name: 'ApexCare (Stg)', slug: 'apexcare-staging', scheme: 'apexcare.staging', bundleSuffix: '.staging' },
  production: { name: 'ApexCare', slug: 'apexcare', scheme: 'apexcare', bundleSuffix: '' },
};

const API_BASE: Record<typeof APP_ENV, string> = {
  development: process.env.API_BASE_URL ?? 'http://localhost:4000',
  staging: process.env.API_BASE_URL ?? 'https://api.staging.apexcare.health',
  production: process.env.API_BASE_URL ?? 'https://api.apexcare.health',
};

const meta = NAMES[APP_ENV];

const config: ExpoConfig = {
  name: meta.name,
  slug: meta.slug,
  scheme: meta.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#0B1220',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: `health.apexcare.app${meta.bundleSuffix}`,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'ApexCare uses your location to find nearby pharmacies and compare medication prices.',
    },
  },
  android: {
    package: `health.apexcare.app${meta.bundleSuffix.replace(/\./g, '_')}`,
    adaptiveIcon: {
      backgroundColor: '#0B1220',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-location', {
      locationAlwaysAndWhenInUsePermission:
        'ApexCare uses your location to find nearby pharmacies.',
    }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv: APP_ENV,
    apiBaseUrl: API_BASE[APP_ENV],
    // EAS projectId is only attached when the env var is set (e.g. after
    // `eas init`). Leaving it out in dev avoids EAS login prompts.
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
      : {}),
  },
};

export default config;
