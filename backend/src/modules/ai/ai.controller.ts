import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PredictPriceDto,
  RecommendationsDto,
  GenerateListingContentDto,
  RecordRecommendationFeedbackDto,
} from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Protected: Get AI-predicted price for a property configuration
   */
  @Post('predict-price')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async predictPrice(@Body() request: PredictPriceDto, @Req() req?: any) {
    const hostId = req?.user?.id || req?.user?.userId;
    return this.aiService.predictPrice(request, hostId);
  }

  /**
   * Protected: Record host pricing decision & feedback on a recommendation
   */
  @Post('recommendations/feedback')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async recordFeedback(
    @Body() request: RecordRecommendationFeedbackDto,
    @Req() req?: any,
  ) {
    const hostId = req?.user?.id || req?.user?.userId;
    return this.aiService.recordFeedback(request, hostId);
  }

  /**
   * Protected: Generate guest-optimized multilingual listing title & description
   */
  @Post('generate-listing-content')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generateListingContent(@Body() request: GenerateListingContentDto) {
    return this.aiService.generateListingContent(request);
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
