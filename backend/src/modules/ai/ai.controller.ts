import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PredictPriceDto, RecommendationsDto } from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Protected: Get AI-predicted price for a property configuration
   */
  @Post('predict-price')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async predictPrice(@Body() request: PredictPriceDto) {
    return this.aiService.predictPrice(request);
  }

  /**
   * Protected: Get AI-powered property recommendations
   */
  @Post('recommendations')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRecommendations(@Body() request: RecommendationsDto) {
    return this.aiService.getRecommendations(request);
  }

  /**
   * Public: Check AI service health
   */
  @Get('health')
  async healthCheck() {
    return this.aiService.healthCheck();
  }
}
