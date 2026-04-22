import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createLogger } from './common/logger';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const logger = createLogger('info'); // reconfigured below after config loads

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);

  // pino-http: one request/response log line with a generated request id
  app.use(
    pinoHttp({
      logger: createLogger(config.logLevel),
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = typeof existing === 'string' && existing ? existing : uuidv4();
        res.setHeader('x-request-id', id);
        return id;
      },
      // Never log request bodies; they often contain PHI/credentials.
      serializers: {
        req(req): Record<string, unknown> {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
            remoteAddress: req.remoteAddress,
          };
        },
        res(res): Record<string, unknown> {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );

  app.use(helmet());
  app.set('trust proxy', 1); // behind ALB/CloudFront

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  logger.info({ port: config.port, env: config.nodeEnv }, 'ApexCare API listening');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap API:', err);
  process.exit(1);
});
