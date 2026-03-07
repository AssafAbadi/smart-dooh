import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

/**
 * Prometheus metrics for Observability (Prompt 6):
 * - ad_selection_latency_seconds
 * - cache_hit_ratio (via cache_hits_total / cache_misses_total)
 * - impressions_per_campaign
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  adSelectionLatency: Histogram<string> | null = null;
  cacheHitsTotal: Counter<string> | null = null;
  cacheMissesTotal: Counter<string> | null = null;
  impressionsPerCampaign: Counter<string> | null = null;

  onModuleInit(): void {
    this.adSelectionLatency = new Histogram({
      name: 'ad_selection_latency_seconds',
      help: 'Ad selection request duration in seconds',
      labelNames: [],
      registers: [register],
    });
    this.cacheHitsTotal = new Counter({
      name: 'cache_hits_total',
      help: 'Total cache hits (context POI/weather)',
      labelNames: ['cache_type'],
      registers: [register],
    });
    this.cacheMissesTotal = new Counter({
      name: 'cache_misses_total',
      help: 'Total cache misses (context POI/weather)',
      labelNames: ['cache_type'],
      registers: [register],
    });
    this.impressionsPerCampaign = new Counter({
      name: 'impressions_per_campaign_total',
      help: 'Total impressions per campaign',
      labelNames: ['campaign_id'],
      registers: [register],
    });
  }

  recordAdSelectionLatency(seconds: number): void {
    this.adSelectionLatency?.observe(seconds);
  }

  recordCacheHit(cacheType: 'poi' | 'weather'): void {
    this.cacheHitsTotal?.inc({ cache_type: cacheType });
  }

  recordCacheMiss(cacheType: 'poi' | 'weather'): void {
    this.cacheMissesTotal?.inc({ cache_type: cacheType });
  }

  recordImpression(campaignId: string): void {
    this.impressionsPerCampaign?.inc({ campaign_id: campaignId });
  }
}
