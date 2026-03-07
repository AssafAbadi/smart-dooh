/**
 * Data Access Layer: car screen heartbeat and lookup.
 */
export interface ICarScreenRepository {
  updateHeartbeat(deviceId: string, driverId?: string): Promise<void>;
}
