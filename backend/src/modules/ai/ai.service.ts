import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PricePredictionRequest {
  city: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
}

export interface PricePredictionResponse {
  predictedPrice: number;
  confidence: number;
  priceRange: { min: number; max: number };
}

export interface RecommendationRequest {
  userId?: string;
  city?: string;
  propertyType?: string;
  maxPrice?: number;
  minBedrooms?: number;
}

export interface RecommendationResponse {
  propertyIds: string[];
  reasoning: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  async predictPrice(
    request: PricePredictionRequest,
  ): Promise<PricePredictionResponse> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/predict-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(`AI price prediction failed: ${response.status}`);
        return this.fallbackPricePrediction(request);
      }

      return response.json();
    } catch (error) {
      this.logger.warn(`AI service unreachable for price prediction: ${error}`);
      return this.fallbackPricePrediction(request);
    }
  }

  async getRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResponse> {
    try {
      const response = await fetch(
        `${this.aiServiceUrl}/api/recommendations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!response.ok) {
        this.logger.warn(`AI recommendations failed: ${response.status}`);
        return this.fallbackRecommendations();
      }

      return response.json();
    } catch (error) {
      this.logger.warn(`AI service unreachable for recommendations: ${error}`);
      return this.fallbackRecommendations();
    }
  }

  async healthCheck(): Promise<{ status: string; url: string }> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        url: this.aiServiceUrl,
      };
    } catch {
      return { status: 'unreachable', url: this.aiServiceUrl };
    }
  }

  /**
   * Fallback price prediction when AI service is unavailable.
   * Uses simple heuristic based on location and property attributes.
   */
  private fallbackPricePrediction(
    request: PricePredictionRequest,
  ): PricePredictionResponse {
    let basePrice = 50;
    basePrice += request.bedrooms * 20;
    basePrice += request.bathrooms * 10;
    basePrice += request.amenities.length * 5;

    if (
      request.city.toLowerCase().includes('addis') ||
      request.city.toLowerCase().includes('ababa')
    ) {
      basePrice *= 1.3;
    }

    if (request.propertyType === 'VILLA') basePrice *= 1.5;
    if (request.propertyType === 'APARTMENT') basePrice *= 1.1;

    const predictedPrice = Math.round(basePrice * 100) / 100;

    return {
      predictedPrice,
      confidence: 0.4,
      priceRange: {
        min: Math.round(predictedPrice * 0.75 * 100) / 100,
        max: Math.round(predictedPrice * 1.25 * 100) / 100,
      },
    };
  }

  private fallbackRecommendations(): RecommendationResponse {
    return {
      propertyIds: [],
      reasoning: 'AI service is currently unavailable. Showing default results.',
    };
  }
}
