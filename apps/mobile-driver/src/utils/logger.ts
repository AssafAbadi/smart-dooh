/**
 * App-wide logger for tracking failures and key actions.
 * Use for API errors, save failures, and important state changes so you can debug from device logs.
 */
const PREFIX = '[Adrive]';

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        if (data != null) console.log(`${PREFIX} ${message}`, data);
        else console.log(`${PREFIX} ${message}`);
      }
    } catch {
      // no-op so callers never get undefined or thrown errors
    }
  },
  info(message: string, data?: Record<string, unknown>) {
    if (data) console.log(`${PREFIX} ${message}`, data);
    else console.log(`${PREFIX} ${message}`);
  },
  warn(message: string, data?: Record<string, unknown>) {
    if (data) console.warn(`${PREFIX} ${message}`, data);
    else console.warn(`${PREFIX} ${message}`);
  },
  error(message: string, error?: unknown) {
    if (error instanceof Error) console.error(`${PREFIX} ${message}`, error.message, error.stack);
    else if (error != null) console.error(`${PREFIX} ${message}`, error);
    else console.error(`${PREFIX} ${message}`);
  },
};
