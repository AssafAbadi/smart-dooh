/**
 * Sentry (Prompt 6). DSN from .env: EXPO_PUBLIC_SENTRY_DSN or SENTRY_DSN.
 * Source maps: upload via EAS Build or sentry-expo script.
 */
import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
  });
}

export { Sentry };
