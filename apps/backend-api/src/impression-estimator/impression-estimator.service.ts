import { Injectable, Logger } from '@nestjs/common';
import { TrafficDensityRepository } from '../traffic-density/repositories/traffic-density.repository';
import { toGeohash7 } from '../core/utils/geohash.util';
import { getTimeMultiplier, getSpeedFactor } from './estimation-factors.util';
import { LiveEventRepository } from './repositories/live-event.repository';

const DEFAULT_BASE_DENSITY = 10;

export interface EstimateInput {
  geohash: string;
  dayOfWeek: number; // 0=Sunday .. 6=Saturday (Israeli)
  hour: number; // 0-23
  minute?: number; // 0-59, for 07:30–09:30 band
  lat?: number;
  lng?: number;
  speedKmh?: number;
  dwellSeconds?: number;
}

export interface EstimateResult {
  estimatedReach: number;
  baseDensity: number;
  timeMultiplier: number;
  speedFactor: number;
  eventTriggerFactor: number;
}

@Injectable()
export class ImpressionEstimatorService {
  private readonly logger = new Logger(ImpressionEstimatorService.name);

  constructor(
    private readonly trafficDensityRepo: TrafficDensityRepository,
    private readonly liveEventRepo: LiveEventRepository,
  ) {}

  async estimate(input: EstimateInput): Promise<EstimateResult> {
    const geohash7 = toGeohash7(input.geohash);
    const densityRow = await this.trafficDensityRepo.findByGeohashAndTime(
      geohash7,
      input.dayOfWeek,
      input.hour
    );
    const baseDensity = densityRow?.baseDensity ?? DEFAULT_BASE_DENSITY;

    const minute = input.minute ?? 0;
    const timeMultiplier = getTimeMultiplier(input.dayOfWeek, input.hour, minute);
    const speedFactor = getSpeedFactor(input.speedKmh, input.dwellSeconds);

    let eventTriggerFactor = 1.0;
    if (input.lat !== undefined && input.lng !== undefined) {
      eventTriggerFactor = await this.liveEventRepo.getBoostForLocation(input.lat, input.lng);
    }

    const estimatedReach =
      baseDensity * timeMultiplier * speedFactor * eventTriggerFactor;

    const result: EstimateResult = {
      estimatedReach,
      baseDensity,
      timeMultiplier,
      speedFactor,
      eventTriggerFactor,
    };
    this.logger.log({
      msg: '[ImpressionEstimator] factors',
      geohash7,
      lat: input.lat,
      lng: input.lng,
      baseDensity,
      timeMultiplier,
      speedFactor,
      eventTriggerFactor,
      estimatedReach,
    });
    return result;
  }
}
