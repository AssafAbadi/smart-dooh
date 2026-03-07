import { Inject, Injectable } from '@nestjs/common';
import type { ICarScreenRepository } from '../core/interfaces/car-screen-repository.interface';
import { TOKENS } from '../core/constants/tokens';

/**
 * BL: heartbeat updates for car screens (every 2 min from client).
 */
@Injectable()
export class CarScreenService {
  constructor(
    @Inject(TOKENS.ICarScreenRepository)
    private readonly repository: ICarScreenRepository
  ) {}

  async updateHeartbeat(deviceId: string, driverId?: string): Promise<void> {
    await this.repository.updateHeartbeat(deviceId, driverId);
  }
}
