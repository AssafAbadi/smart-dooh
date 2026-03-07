import 'dotenv/config';
import * as Sentry from '@sentry/node';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino'; // used by app.useLogger
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { validateEnv } from './config/config.schema';

const bootstrapLogger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    validateEnv(process.env as Record<string, unknown>);
  } catch (err) {
    bootstrapLogger.error('Environment validation failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: true }); // Allow any origin so display page on other devices (same Wi-Fi) can fetch

  const config = app.get(ConfigService);
  const sentryDsn = config.get('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: (config.get('NODE_ENV') ?? 'development') as string,
      tracesSampleRate: 0.2,
    });
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Smart DOOH API')
    .setDescription('Digital out-of-home ad platform API')
    .setVersion('1.0')
    .addTag('Ad Selection')
    .addTag('Context Engine')
    .addTag('Impressions')
    .addTag('Payments')
    .addTag('Admin')
    .addTag('Simulator')
    .addTag('Ad Creative')
    .addTag('Car Screen')
    .addTag('Context')
    .addTag('Health')
    .addTag('Webhooks')
    .addTag('Display')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = (config.get('PORT') ?? 3000) as number;
  await app.listen(port, '0.0.0.0');

  bootstrapLogger.log(`Backend API listening on http://0.0.0.0:${port}`);
  bootstrapLogger.log(`Swagger UI at http://0.0.0.0:${port}/api-docs`);
}

bootstrap().catch((err) => {
  bootstrapLogger.error('Failed to start backend:', err instanceof Error ? err.message : err);
  process.exit(1);
});
