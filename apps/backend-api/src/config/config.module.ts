import { Global, Module } from '@nestjs/common';
import { validateEnv } from './config.schema';
import { ConfigService } from './config.service';
import { ExternalApiConfigService } from './external-api-keys.config';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: () => {
        const env = validateEnv(process.env as Record<string, unknown>);
        return new ConfigService(env);
      },
    },
    ExternalApiConfigService,
  ],
  exports: [ConfigService, ExternalApiConfigService],
})
export class ConfigModule {}
