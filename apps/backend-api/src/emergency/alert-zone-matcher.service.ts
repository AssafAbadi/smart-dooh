import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { ALERT_AREAS_TEL_AVIV, TEL_AVIV_BOUNDS } from './interfaces/emergency.interface';

export interface IAlertZoneMatcher {
  alertMatchesRegion(areas: string[]): boolean;
  isDriverInAlertZone(lat: number, lng: number): boolean;
}

@Injectable()
export class AlertZoneMatcher implements IAlertZoneMatcher {
  private readonly logger = new Logger(AlertZoneMatcher.name);
  private readonly alertAreas: readonly string[];
  private readonly bounds: typeof TEL_AVIV_BOUNDS;

  constructor(private readonly config: ConfigService) {
    // Could be loaded from config/env in future; defaulting to Tel Aviv
    const areasEnv = this.config.get('ALERT_AREAS' as never);
    this.alertAreas = areasEnv
      ? (JSON.parse(areasEnv as string) as string[])
      : ALERT_AREAS_TEL_AVIV;

    const boundsEnv = this.config.get('ALERT_BOUNDS' as never);
    this.bounds = boundsEnv
      ? (JSON.parse(boundsEnv as string) as typeof TEL_AVIV_BOUNDS)
      : TEL_AVIV_BOUNDS;

    this.logger.log({ msg: 'AlertZoneMatcher initialised', areas: this.alertAreas, bounds: this.bounds });
  }

  /**
   * Returns true when at least one area in the alert list matches a configured region.
   */
  alertMatchesRegion(areas: string[]): boolean {
    return areas.some((area) =>
      this.alertAreas.some((ta) => area.includes(ta) || ta.includes(area)),
    );
  }

  /**
   * Returns true when a driver's GPS coordinate is inside the configured bounding box.
   */
  isDriverInAlertZone(lat: number, lng: number): boolean {
    return (
      lat >= this.bounds.minLat &&
      lat <= this.bounds.maxLat &&
      lng >= this.bounds.minLng &&
      lng <= this.bounds.maxLng
    );
  }
}
