import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Public list of supported Ethiopian & International payment methods
   */
  @Get('methods')
  getMethods() {
    return this.paymentsService.getPaymentMethods();
  }

  /**
   * Initialize a payment session (Chapa, Card, Telebirr, PayPal, etc.)
   */
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @Body() dto: InitializePaymentDto,
    @GetUser() user: User,
  ) {
    return this.paymentsService.initializePayment(dto, user.id);
  }

  /**
   * Verify transaction reference
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
    @GetUser() user: User,
  ) {
    return this.paymentsService.verifyPayment(dto, user.id);
  }

  /**
   * Chapa Webhook endpoint for direct server-to-server notifications
   */
  @Post('webhook/chapa')
  @HttpCode(HttpStatus.OK)
  async chapaWebhook(@Body() payload: any) {
    return this.paymentsService.handleChapaWebhook(payload);
  }
}
