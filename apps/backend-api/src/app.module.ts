import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { CoreModule } from './core/core.module';
import { TimeModule } from './core/time/time.module';
import { ObservabilityModule } from './observability/observability.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { HealthModule } from './health/health.module';
import { ContextModule } from './context/context.module';
import { ContextEngineModule } from './context-engine/context-engine.module';
import { CarScreenModule } from './car-screen/car-screen.module';
import { AdSelectionModule } from './ad-selection/ad-selection.module';
import { AdCreativeModule } from './ad-creative/ad-creative.module';
import { ImpressionsModule } from './impressions/impressions.module';
import { TrafficDensityModule } from './traffic-density/traffic-density.module';
import { ImpressionEstimatorModule } from './impression-estimator/impression-estimator.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';
import { SimulatorModule } from './simulator/simulator.module';
import { DisplayModule } from './display/display.module';
import { DriverModule } from './driver/driver.module';
import { ShelterModule } from './shelter/shelter.module';
import { EmergencyModule } from './emergency/emergency.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    MailModule,
    AuthModule,
    TimeModule,
    LoggerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            config.get('NODE_ENV') !== 'production'
              ? (() => {
                  try {
                    require.resolve('pino-pretty');
                    return { target: 'pino-pretty' as const, options: { colorize: true } };
                  } catch {
                    return undefined;
                  }
                })()
              : undefined,
          redact: ['req.headers.authorization', 'req.body.password', 'req.body.apiKey'],
          serializers: {
            req: (req: { method: string; url: string; query: unknown }) => ({
              method: req.method,
              url: req.url,
              query: req.query,
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
        },
      }),
      inject: [ConfigService],
    }),
    ObservabilityModule,
    CoreModule,
    PrismaModule,
    RedisModule,
    RateLimitModule,
    HealthModule,
    ContextModule,
    ContextEngineModule,
    CarScreenModule,
    AdSelectionModule,
    AdCreativeModule,
    ImpressionsModule,
    TrafficDensityModule,
    ImpressionEstimatorModule,
    AdminModule,
    PaymentsModule,
    SimulatorModule,
    DisplayModule,
    DriverModule,
    ShelterModule,
    EmergencyModule,
    PushNotificationsModule,
  ],
})
export class AppModule {}
