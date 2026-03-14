import { Injectable, Logger } from '@nestjs/common';
import { ShelterService } from '../shelter/shelter.service';
import { bearingDegrees, bearingToDirection } from '../core/utils/geo.util';
import type { ShelterWithDistance } from '../shelter/interfaces/shelter.interface';
import type { EmergencyData } from './interfaces/emergency.interface';

const SEARCH_RADIUS_M = 500;
const CROWDING_THRESHOLD_M = 100;

export interface SelectedShelter {
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  bearingDeg: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

@Injectable()
export class ShelterSelectorService {
  private readonly logger = new Logger(ShelterSelectorService.name);

  constructor(private readonly shelterService: ShelterService) {}

  async selectShelter(
    carLat: number,
    carLng: number,
    alertHeadline: string,
    alertTimestamp: string,
  ): Promise<EmergencyData | null> {
    const nearby = await this.shelterService.findNearby(carLat, carLng, SEARCH_RADIUS_M);
    if (nearby.length === 0) {
      this.logger.warn({ msg: 'No shelters within radius', carLat, carLng, radius: SEARCH_RADIUS_M });
      return null;
    }

    const selected = this.antiCrowdingSelect(nearby);
    const bearing = bearingDegrees(carLat, carLng, selected.lat, selected.lng);
    const direction = bearingToDirection(bearing);

    this.logger.log({
      msg: 'Shelter selected',
      address: selected.address,
      distanceMeters: Math.round(selected.distanceMeters),
      direction,
      candidateCount: nearby.length,
    });

    return {
      type: 'MISSILE_ALERT',
      shelterAddress: selected.address,
      shelterLat: selected.lat,
      shelterLng: selected.lng,
      distanceMeters: Math.round(selected.distanceMeters),
      bearingDegrees: Math.round(bearing),
      direction,
      alertHeadline,
      alertTimestamp,
    };
  }

  /**
   * Anti-crowding: if multiple shelters are within CROWDING_THRESHOLD_M distance
   * difference of the closest, use weighted random selection to distribute users.
   */
  antiCrowdingSelect(sorted: ShelterWithDistance[]): ShelterWithDistance {
    if (sorted.length === 1) return sorted[0];

    const closestDist = sorted[0].distanceMeters;
    const group = sorted.filter(
      (s) => s.distanceMeters - closestDist <= CROWDING_THRESHOLD_M,
    );

    if (group.length === 1) return group[0];

    return this.weightedRandomPick(group);
  }

  private weightedRandomPick(shelters: ShelterWithDistance[]): ShelterWithDistance {
    const weights = shelters.map((s) => 1 / (s.distanceMeters + 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < shelters.length; i++) {
      random -= weights[i];
      if (random <= 0) return shelters[i];
    }

    return shelters[shelters.length - 1];
  }
}
