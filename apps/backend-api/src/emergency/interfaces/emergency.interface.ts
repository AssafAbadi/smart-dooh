/** Mirrors libs/shared/dto emergency.dto.ts so backend does not depend on shared-dto export at build. */
export interface EmergencyData {
  type: 'MISSILE_ALERT';
  shelterAddress: string;
  shelterLat: number;
  shelterLng: number;
  distanceMeters: number;
  bearingDegrees: number;
  direction: 'up' | 'down' | 'left' | 'right';
  alertHeadline: string;
  alertTimestamp: string;
}

export type EmergencyCheckResult =
  | { active: false }
  | {
      active: true;
      shelter: { address: string; lat: number; lng: number; distanceMeters: number; bearingDegrees: number; direction: 'up' | 'down' | 'left' | 'right' };
      alert: { headline: string; timestamp: string };
    };

export interface DriverPosition {
  driverId: string;
  lat: number;
  lng: number;
  updatedAt: number;
}

export const ALERT_AREAS_TEL_AVIV = [
  'תל אביב - מרכז העיר',
  'תל אביב - דרום העיר ויפו',
  'תל אביב - עבר הירקון',
  'תל אביב - יפו',
  'תל אביב',
];

export const TEL_AVIV_BOUNDS = {
  minLat: 32.03,
  maxLat: 32.15,
  minLng: 34.74,
  maxLng: 34.82,
};
