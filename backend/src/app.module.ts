import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [HealthModule, DatabaseModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
