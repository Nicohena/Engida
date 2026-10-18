import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const isDebug = process.env.DEBUG === 'true' || process.env.VERBOSE_LOGS === 'true';

  const app = await NestFactory.create(AppModule, {
    logger: isDebug ? ['log', 'error', 'warn', 'debug', 'verbose'] : ['error', 'warn'],
  });

  const configService = app.get(ConfigService);

  // Security Headers
  app.use(helmet());

  // Cookie Parser
  app.use(cookieParser());

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS Configuration
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // Allow localhost on any port
      if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Allow local private network IP addresses (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
      if (/^http:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (origin === frontendUrl) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Range'],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
  });

  const port = Number(configService.get('PORT')) || 3000;
  await app.listen(port);

  const env = configService.get<string>('NODE_ENV', 'development');

  console.log(`
\x1b[32m✔ Engida Backend is running\x1b[0m
  \x1b[36m➜\x1b[0m \x1b[1mLocal:\x1b[0m       http://localhost:${port}
  \x1b[36m➜\x1b[0m \x1b[1mHealth:\x1b[0m      http://localhost:${port}/health
  \x1b[36m➜\x1b[0m \x1b[1mEnvironment:\x1b[0m ${env}
`);
}
bootstrap();

