import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { GeocodingService } from './geocoding.service';
import { PlacesApiService } from './places-api.service';
import { WeatherApiService } from './weather-api.service';

@Module({
  imports: [RedisModule, RateLimitModule],
  providers: [PlacesApiService, WeatherApiService, GeocodingService],
  exports: [PlacesApiService, WeatherApiService, GeocodingService],
})
export class ExternalApiModule {}
