import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentSessionDto, InitializePaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { PaymentsCaptureService } from '../finance/services/payments-capture.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly captureService: PaymentsCaptureService,
  ) {}

  /**
   * Public list of supported Ethiopian & International payment methods
   */
  @Get('methods')
  getMethods() {
    return this.paymentsService.getPaymentMethods();
  }

  /**
   * Phase 3 authoritative session creation bound to server-side booking quote
   */
  @Post('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createSession(
    @Body() dto: CreatePaymentSessionDto,
    @GetUser() user: User,
  ) {
    return this.captureService.createPaymentSession(dto, user);
  }

  /**
   * Phase 3 public/guest session status check (no sensitive secrets or PAN)
   */
  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  getSession(
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    return this.captureService.getPaymentSession(id, user);
  }

  /**
   * Verified provider webhook ingestion with raw body and signature verification
   */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(body || {});
    return this.captureService.handleWebhook(provider, rawBody, headers);
  }

  /**
   * Legacy checkout compatibility: initialized via client
   */
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @Body() dto: InitializePaymentDto,
    @GetUser() user: User,
  ) {
    // If bookingId is provided, delegate to server quote session if possible
    if (dto.bookingId) {
      return this.captureService.createPaymentSession(
        {
          bookingId: dto.bookingId,
          paymentMethod: dto.paymentMethod,
          currency: dto.currency,
          customerPhone: dto.customerPhone,
          returnUrl: dto.returnUrl,
        },
        user,
      );
    }
    return this.paymentsService.initializePayment(dto, user.id);
  }

  /**
   * Status check endpoint (does not mark bookings paid)
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
   * Legacy Chapa Webhook route redirected to verified handler
   */
  @Post('webhook/chapa')
  @HttpCode(HttpStatus.OK)
  async chapaWebhook(
    @Req() req: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(body || {});
    return this.captureService.handleWebhook('CHAPA', rawBody, headers);
  }
}
