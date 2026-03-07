import { Injectable } from '@nestjs/common';
import { LiveEventRepository } from '../../impression-estimator/repositories/live-event.repository';

/**
 * Returns event boost multiplier for (lat, lng). Wraps LiveEventRepository.
 * Used by EventBoostStrategy. Kept under 25 lines.
 */
@Injectable()
export class EventCalculator {
  constructor(private readonly liveEventRepo: LiveEventRepository) {}

  async getBoostForLocation(lat: number, lng: number): Promise<number> {
    return this.liveEventRepo.getBoostForLocation(lat, lng);
  }
}
