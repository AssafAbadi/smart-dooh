import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  adSelectionLatency: Histogram<string> | null = null;
  cacheHitsTotal: Counter<string> | null = null;
  cacheMissesTotal: Counter<string> | null = null;
  impressionsPerCampaign: Counter<string> | null = null;
  emergencyAlertsDetected: Counter<string> | null = null;
  emergencyPushLatency: Histogram<string> | null = null;
  shelterSelectionDuration: Histogram<string> | null = null;
  socketConnectionsActive: Gauge<string> | null = null;

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
    this.emergencyAlertsDetected = new Counter({
      name: 'emergency_alerts_detected_total',
      help: 'Total Pikud HaOref alerts detected',
      labelNames: [],
      registers: [register],
    });
    this.emergencyPushLatency = new Histogram({
      name: 'emergency_push_latency_seconds',
      help: 'Time from alert detection to socket push',
      labelNames: [],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [register],
    });
    this.shelterSelectionDuration = new Histogram({
      name: 'shelter_selection_duration_seconds',
      help: 'Time to select shelter with anti-crowding',
      labelNames: [],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
      registers: [register],
    });
    this.socketConnectionsActive = new Gauge({
      name: 'socket_connections_active',
      help: 'Number of active emergency socket connections',
      labelNames: [],
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

  recordEmergencyAlertDetected(): void {
    this.emergencyAlertsDetected?.inc();
  }

  recordEmergencyPushLatency(seconds: number): void {
    this.emergencyPushLatency?.observe(seconds);
  }

  recordShelterSelectionDuration(seconds: number): void {
    this.shelterSelectionDuration?.observe(seconds);
  }

  setSocketConnectionsActive(count: number): void {
    this.socketConnectionsActive?.set(count);
  }
}
