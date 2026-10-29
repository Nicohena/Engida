import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../properties/entities/property.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { PriceRecommendationLog } from './entities/price-recommendation-log.entity';
import { SeasonalPricingService } from './seasonal/seasonal-pricing.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

/**
 * AI Module - Application gateway for AI service & Market Comparables
 *
 * Responsibilities:
 * - HTTP client integration with AI service (FastAPI)
 * - Location normalization & hierarchy similarity scoring
 * - Multi-factor comparable property quality scoring (<0.50 discarded)
 * - Calibrated confidence estimation with human-readable explanations
 * - Evidence-based seasonal pricing evaluation (requires 30+ completed bookings)
 * - Price recommendation logging & host feedback tracking
 * - Request/response transformation and local heuristic fallback logic
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Property, Booking, PriceRecommendationLog]),
  ],
  controllers: [AiController],
  providers: [AiService, SeasonalPricingService],
  exports: [AiService, SeasonalPricingService],
})
export class AiModule {}
