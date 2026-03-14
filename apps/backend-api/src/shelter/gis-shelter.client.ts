import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { gisQueryResponseSchema, type GisFeature, type GisQueryResponse } from './interfaces/shelter.interface';
import type { ShelterRecord } from './interfaces/shelter.interface';

const GIS_BASE_URL =
  'https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/592/query';
const PAGE_SIZE = 1000;

export interface IGisShelterClient {
  fetchAll(): Promise<Omit<ShelterRecord, 'id'>[]>;
}

@Injectable()
export class GisShelterClient implements IGisShelterClient {
  private readonly logger = new Logger(GisShelterClient.name);

  async fetchAll(): Promise<Omit<ShelterRecord, 'id'>[]> {
    const shelters: Omit<ShelterRecord, 'id'>[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await this.fetchPage(offset);
      for (const feature of page.features) {
        const record = this.parseFeature(feature);
        if (record) shelters.push(record);
      }
      hasMore = page.exceededTransferLimit === true;
      offset += PAGE_SIZE;
    }

    this.logger.log(`Fetched ${shelters.length} shelters from Tel Aviv GIS`);
    return shelters;
  }

  private async fetchPage(offset: number): Promise<GisQueryResponse> {
    const response = await axios.get<unknown>(GIS_BASE_URL, {
      params: {
        where: '1=1',
        outFields: '*',
        f: 'json',
        outSR: 4326,
        resultOffset: offset,
        resultRecordCount: PAGE_SIZE,
      },
      timeout: 30_000,
    });

    const parsed = gisQueryResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      this.logger.error({ msg: 'GIS response validation failed', errors: parsed.error.flatten() });
      return { features: [] };
    }
    return parsed.data;
  }

  private parseFeature(feature: GisFeature): Omit<ShelterRecord, 'id'> | null {
    const { attributes, geometry } = feature;
    const externalId = String(attributes['oid_mitkan']);

    const lat = (attributes['lat'] as number | undefined) ?? geometry?.y;
    const lng = (attributes['lon'] as number | undefined) ?? geometry?.x;
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;

    const fullAddress = attributes['Full_Address'] as string | undefined;
    const streetName = attributes['shem_recho'] as string | undefined;
    const buildingNumber = attributes['ms_bait'] as string | number | undefined;

    const address =
      fullAddress?.trim() ||
      [streetName, buildingNumber].filter(Boolean).join(' ') ||
      `Shelter ${externalId}`;

    return {
      externalId,
      address: String(address),
      lat,
      lng,
      lastUpdated: new Date(),
    };
  }
}
