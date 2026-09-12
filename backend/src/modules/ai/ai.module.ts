import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

/**
 * AI Module - Application gateway for AI service
 *
 * This module serves as a thin client boundary for communicating
 * with the external Python/FastAPI AI service.
 *
 * Responsibilities:
 * - HTTP client integration with AI service
 * - Request/response transformation
 * - Error handling and fallback logic
 * - Caching AI responses when appropriate
 *
 * Does NOT contain:
 * - ML models or training logic
 * - LLM provider integrations
 * - Embedding generation
 * - AI algorithms
 */
@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
