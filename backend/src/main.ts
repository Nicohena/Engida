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
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = Number(configService.get('PORT')) || 5000;
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

