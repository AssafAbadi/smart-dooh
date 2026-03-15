import { Injectable, Logger } from '@nestjs/common';
import { DriverRepository } from './repositories/driver.repository';

@Injectable()
export class DriverPushTokenService {
  private readonly logger = new Logger(DriverPushTokenService.name);

  constructor(private readonly driverRepository: DriverRepository) {}

  async upsert(driverId: string, pushToken: string): Promise<void> {
    await this.driverRepository.upsertPushToken(driverId, pushToken);
    this.logger.log({ driverId, msg: 'Push token registered' });
  }
}
