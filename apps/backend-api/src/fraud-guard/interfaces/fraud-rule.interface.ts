export interface FraudContext {
  driverId: string;
  lat: number;
  lng: number;
  geohash: string;
  speedKmh?: number;
  campaignId?: string;
  deviceId: string;
  timestamp: number;
}

export interface FraudVerdict {
  isFraud: boolean;
  reason?: string;
  severity: 'block' | 'flag';
}

export interface IFraudRule {
  readonly name: string;
  readonly enabled: boolean;
  evaluate(ctx: FraudContext): Promise<FraudVerdict>;
}
