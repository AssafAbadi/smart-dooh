import { Inject, Injectable, Logger } from '@nestjs/common';
import { ExternalApiConfigService } from '../config/external-api-keys.config';

export interface ReverseGeocodeResult {
  area?: string;
  neighborhood?: string;
  locality?: string;
}

/**
 * Reverse geocode (lat, lng) to area/neighborhood using Google Geocoding API (Maps Platform).
 * Uses GOOGLE_MAPS_API_KEY when set, otherwise GOOGLE_PLACES_API_KEY.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  constructor(private readonly apiKeys: ExternalApiConfigService) {}

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    const apiKey = this.apiKeys.getGoogleMapsApiKey();
    if (!apiKey) return null;

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('result_type', 'neighborhood|locality|sublocality|administrative_area_level_2');

    try {
      const res = await fetch(url.toString());
      const data = (await res.json()) as {
        status: string;
        results?: Array<{
          address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
        }>;
      };
      if (data.status !== 'OK' || !data.results?.length) return null;

      const components = data.results[0].address_components ?? [];
      let neighborhood: string | undefined;
      let locality: string | undefined;
      let area: string | undefined;

      for (const c of components) {
        if (c.types.includes('neighborhood')) neighborhood = c.long_name;
        if (c.types.includes('sublocality') && !neighborhood) neighborhood = c.long_name;
        if (c.types.includes('locality')) locality = c.long_name;
        if (c.types.includes('administrative_area_level_2')) area = c.long_name;
      }

      const result: ReverseGeocodeResult = {
        area: area ?? locality,
        neighborhood: neighborhood ?? locality,
        locality,
      };
      this.logger.log({ lat, lng, area: result.area, neighborhood: result.neighborhood, msg: 'reverseGeocode' });
      return result;
    } catch (e) {
      this.logger.warn({ lat, lng, err: (e as Error).message, msg: 'reverseGeocode failed' });
      return null;
    }
  }
}
