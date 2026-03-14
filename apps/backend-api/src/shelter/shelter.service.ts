import { Injectable } from '@nestjs/common';
import { ShelterRepository } from './shelter.repository';
import type { ShelterWithDistance } from './interfaces/shelter.interface';

@Injectable()
export class ShelterService {
  constructor(private readonly repo: ShelterRepository) {}

  async findNearby(lat: number, lng: number, radiusMeters = 500): Promise<ShelterWithDistance[]> {
    return this.repo.findNearby(lat, lng, radiusMeters);
  }

  async findNearestN(lat: number, lng: number, count = 5): Promise<ShelterWithDistance[]> {
    return this.repo.findNearestN(lat, lng, count);
  }

  async getShelterCount(): Promise<number> {
    return this.repo.count();
  }
}
