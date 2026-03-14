import type { ActiveAlert } from './pikud-haoref.interface';

/**
 * Contract for all alert providers (Pikud HaOref, earthquake, tsunami, …).
 * Adding a new provider = implement this interface + register in EmergencyModule.
 */
export interface IAlertProvider {
  /** Unique identifier for this provider (e.g. 'pikud-haoref', 'earthquake'). */
  readonly name: string;

  /** Start monitoring. Called once when the module initialises. */
  start(): void;

  /** Stop monitoring and release resources. Called during module destroy. */
  stop(): void;

  /** Returns the currently active alert from this source, or null if none. */
  getCurrentAlert(): ActiveAlert | null;
}

export const ALERT_PROVIDERS_TOKEN = 'ALERT_PROVIDERS';
