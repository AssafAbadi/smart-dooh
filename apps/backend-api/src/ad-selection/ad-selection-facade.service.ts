import { Injectable, Logger } from '@nestjs/common';
import type { RankedQueryDto } from '@smart-dooh/shared-dto';
import type { SelectBodyDto } from '@smart-dooh/shared-dto';
import type { AdInstructionResult, CandidateAd, SelectionContext, SelectionInput } from './interfaces/ad-selection.interface';
import type { BusinessRecord } from '../core/interfaces/business-repository.interface';
import type { DriverPreferencesRecord } from '../core/interfaces/driver-preferences-repository.interface';
import { TimeService } from '../core/time/time.service';
import { WeatherApiService } from '../external-api/weather-api.service';
import { AdSelectionEngineService } from './ad-selection-engine.service';
import { ContextEngineService } from '../context-engine/context-engine.service';
import { CampaignCreativeRepository } from './repositories/campaign-creative.repository';
import { MetricsService } from '../observability/metrics.service';

function hasNoAlcohol(preference_tags: string[] | undefined): boolean {
  return Array.isArray(preference_tags) && preference_tags.includes('NO_ALCOHOL');
}

function isAlcoholRestaurant(b: { tags: string[] }): boolean {
  return b.tags.includes('RESTAURANT') && b.tags.includes('SERVES_ALCOHOL');
}

@Injectable()
export class AdSelectionFacade {
  private readonly logger = new Logger(AdSelectionFacade.name);

  constructor(
    private readonly engine: AdSelectionEngineService,
    private readonly contextEngine: ContextEngineService,
    private readonly campaignCreative: CampaignCreativeRepository,
    private readonly metrics: MetricsService,
    private readonly time: TimeService,
    private readonly weatherApi: WeatherApiService,
  ) {}

  /** Billboard/display mode: ranked ads for driverId. Default = first seeded route point (inside Tel Aviv Café geofence). */
  async getRankedForDisplay(driverId: string): Promise<{ instructions: AdInstructionResult[] }> {
    const now = this.time.getIsraelNow();
    const query: RankedQueryDto = {
      driverId,
      lat: 32.0642,
      lng: 34.7718,
      geohash: 'sv8eqh2',
      timeHour: now.hour,
      poiDensity: undefined,
      tempCelsius: undefined,
    };
    return this.getRanked(query);
  }

  async getRanked(query: RankedQueryDto): Promise<{ instructions: AdInstructionResult[] }> {
    const { driverId, lat, lng, geohash, bleBusinessId, timeHour, poiDensity, tempCelsius, weatherCondition } = query;
    const [businessesInitial, prefs] = await Promise.all([
      this.contextEngine.getFilteredBusinessesForDriver(driverId),
      this.contextEngine.getDriverPreferences(driverId),
    ]);
    const businesses = this.applyAlcoholFilter(businessesInitial, prefs);
    this.logRankedPrefs(driverId, prefs, businesses);
    const allowedBusinessIds = new Set(businesses.map((b) => b.id));
    const businessNameById = new Map(businesses.map((b) => [b.id, b.name]));
    const [candidates, distances] = await Promise.all([
      this.buildCandidates(allowedBusinessIds, lat, lng, prefs),
      this.campaignCreative.getCampaignDistances([...allowedBusinessIds], lat, lng),
    ]);
    this.logger.log({
      lat,
      lng,
      msg: 'Distance to each business (radius check)',
      businesses: distances.map((d) => ({
        name: businessNameById.get(d.businessId) ?? d.businessId,
        distanceMeters: d.distanceMeters,
        radiusMeters: d.radiusMeters,
        inRange: d.inRange,
      })),
    });
    this.logger.log({
      lat,
      lng,
      msg: 'Candidates in radius (geofence passed)',
      count: candidates.length,
      businesses: candidates.map((c) => ({
        name: businessNameById.get(c.businessId) ?? c.businessId,
        businessId: c.businessId,
        campaignId: c.campaignId,
        cpm: c.cpm,
      })),
    });
    const input = await this.prepareInputForGetRanked(query, candidates);
    const instructions = await this.runEngineAndRecordLatency(input);
    this.logger.log({
      driverId,
      candidatesCount: candidates.length,
      instructionsCount: instructions.length,
      msg: 'GET ranked result',
    });
    const distanceByBusinessId = new Map(distances.map((d) => [d.businessId, d]));
    this.logger.log({
      msg: 'Ranked order (bidding result)',
      lat,
      lng,
      order: instructions.map((i, idx) => {
        const dist = i.businessId ? distanceByBusinessId.get(i.businessId) : undefined;
        return {
          rank: idx + 1,
          name: i.businessId ? businessNameById.get(i.businessId) ?? i.businessId : '(emergency)',
          businessId: i.businessId,
          priority: i.priority,
          distanceMeters: dist?.distanceMeters,
          radiusMeters: dist?.radiusMeters,
          inRange: dist?.inRange,
        };
      }),
    });
    return { instructions };
  }

  private async prepareInputForGetRanked(
    query: RankedQueryDto,
    candidates: CandidateAd[],
  ): Promise<SelectionInput> {
    const { driverId, lat, lng, geohash, bleBusinessId, timeHour, poiDensity, tempCelsius, weatherCondition } = query;
    const serverWeather = await this.resolveServerWeather(lat, lng, geohash);
    if (serverWeather) {
      this.logger.log({
        msg: '[AdSelection] weather fetched',
        tempCelsius: serverWeather.tempCelsius,
        condition: serverWeather.condition,
      });
    }
    const context = this.buildContextFromRankedQuery(
      timeHour,
      poiDensity,
      serverWeather ?? (tempCelsius != null ? { tempCelsius, condition: weatherCondition ?? 'Unknown' } : null),
    );
    return {
      driverId,
      lat,
      lng,
      geohash,
      bleHint: bleBusinessId ? { type: 'IMMEDIATE', businessId: bleBusinessId } : undefined,
      candidates,
      context,
    };
  }

  async postSelect(body: SelectBodyDto): Promise<{ instructions: AdInstructionResult[] }> {
    const { driverId, lat, lng, geohash, bleHint, context: ctxBody, candidates: bodyCandidates } = body;
    const [businessesInitial, prefs] = await Promise.all([
      this.contextEngine.getFilteredBusinessesForDriver(driverId),
      this.contextEngine.getDriverPreferences(driverId),
    ]);
    const businesses = this.applyAlcoholFilter(businessesInitial, prefs);
    const allowedBusinessIds = new Set(businesses.map((b) => b.id));
    const candidates = await this.resolveCandidates(
      bodyCandidates,
      allowedBusinessIds,
      lat,
      lng,
      prefs,
    );
    const context = await this.buildContextFromBody(ctxBody, lat, lng, geohash);
    const input: SelectionInput = {
      driverId,
      lat,
      lng,
      geohash,
      bleHint,
      candidates,
      context,
    };
    let instructions = await this.runEngineAndRecordLatency(input);
    instructions = instructions.filter(
      (i) => i.businessId === undefined || allowedBusinessIds.has(i.businessId),
    );
    this.logger.log({
      driverId,
      candidatesCount: candidates.length,
      instructionsCount: instructions.length,
      msg: 'POST select result',
    });
    return { instructions };
  }

  private applyAlcoholFilter(
    businesses: BusinessRecord[],
    prefs: DriverPreferencesRecord | null,
  ): BusinessRecord[] {
    if (!hasNoAlcohol(prefs?.preference_tags)) return businesses;
    return businesses.filter((b) => !isAlcoholRestaurant(b));
  }

  private async buildCandidates(
    allowedBusinessIds: Set<string>,
    lat: number,
    lng: number,
    prefs: DriverPreferencesRecord | null,
  ): Promise<CandidateAd[]> {
    let candidates = await this.campaignCreative.findCandidatesByBusinessIds(
      [...allowedBusinessIds],
      lat,
      lng,
    );
    if (hasNoAlcohol(prefs?.preference_tags)) {
      candidates = candidates.filter((c) => allowedBusinessIds.has(c.businessId));
    }
    return candidates;
  }

  private async resolveCandidates(
    bodyCandidates: SelectBodyDto['candidates'],
    allowedBusinessIds: Set<string>,
    lat: number,
    lng: number,
    prefs: DriverPreferencesRecord | null,
  ): Promise<CandidateAd[]> {
    if (bodyCandidates && bodyCandidates.length > 0) {
      const asCandidates = bodyCandidates as unknown as CandidateAd[];
      return hasNoAlcohol(prefs?.preference_tags)
        ? asCandidates.filter((c) => allowedBusinessIds.has(c.businessId))
        : asCandidates;
    }
    return this.buildCandidates(allowedBusinessIds, lat, lng, prefs);
  }

  private async resolveServerWeather(
    lat: number,
    lng: number,
    geohash: string,
  ): Promise<{ tempCelsius: number; condition: string } | null> {
    const geo = geohash?.trim();
    if (!geo || lat == null || lng == null) return null;
    return this.weatherApi.getWeather(lat, lng, geo);
  }

  private buildContextFromRankedQuery(
    timeHour: number | undefined,
    poiDensity: number | undefined,
    weather: { tempCelsius: number; condition: string } | null,
  ): SelectionContext {
    const israel = this.time.getIsraelNow();
    const hour = timeHour !== undefined ? timeHour : israel.hour;
    const poi = poiDensity !== undefined ? poiDensity : 0;
    return {
      weather,
      timeHour: Number.isNaN(hour) ? israel.hour : hour % 24,
      poiDensity: Number.isNaN(poi) ? 0 : poi,
    };
  }

  private async buildContextFromBody(
    ctxBody: SelectBodyDto['context'],
    lat: number,
    lng: number,
    geohash: string,
  ): Promise<SelectionContext> {
    if (ctxBody) return ctxBody;
    const israel = this.time.getIsraelNow();
    const serverWeather = await this.resolveServerWeather(lat, lng, geohash);
    return {
      weather: serverWeather,
      timeHour: israel.hour,
      poiDensity: 0,
    };
  }

  private async runEngineAndRecordLatency(input: SelectionInput): Promise<AdInstructionResult[]> {
    const start = performance.now();
    const instructions = await this.engine.select(input);
    this.metrics.recordAdSelectionLatency((performance.now() - start) / 1000);
    return instructions;
  }

  private logRankedPrefs(
    driverId: string,
    prefs: DriverPreferencesRecord | null,
    businesses: BusinessRecord[],
  ): void {
    this.logger.log({
      driverId,
      prefsFound: !!prefs,
      preference_tags: prefs?.preference_tags ?? [],
      hasNoAlcohol: hasNoAlcohol(prefs?.preference_tags),
      msg: 'GET ranked prefs',
    });
    this.logger.log({
      driverId,
      businessesCount: businesses.length,
      businessNames: businesses.map((b) => `${b.name}(${b.tags.join(',')})`),
      msg: 'GET ranked businesses AFTER alcohol filter',
    });
  }
}
