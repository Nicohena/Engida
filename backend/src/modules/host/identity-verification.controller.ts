import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { IdentityVerificationService } from './identity-verification.service';
import { HostService } from './host.service';
import { VerificationProviderType } from './dto/request-verification.dto';
import { LookupFaydaDto } from './dto/lookup-fayda.dto';

@Controller('host/verification')
export class IdentityVerificationController {
  constructor(
    private readonly identityVerificationService: IdentityVerificationService,
    private readonly hostService: HostService,
  ) {}

  /**
   * GET /host/verification/config
   * Public discovery endpoint for supported identity document types, issuing countries, and providers.
   */
  @Get('config')
  getVerificationConfig() {
    return this.identityVerificationService.getVerificationConfig();
  }

  /**
   * POST /host/verification/fayda/lookup
   * Instant digital identity verification & demographic extraction via Ethiopian National ID Program (FIN / FAN).
   */
  @Post('fayda/lookup')
  @HttpCode(HttpStatus.OK)
  async lookupFayda(@Body() dto: LookupFaydaDto) {
    return this.identityVerificationService.lookupFaydaRecord(dto);
  }

  /**
   * POST /host/verification/webhook/:provider
   * Authoritative identity verification provider webhook.
   * Cryptographically validates HMAC-SHA256 signature and timestamp before treating result as authoritative.
   */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleProviderWebhook(
    @Param('provider') providerParam: string,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestampStr: string,
    @Body() body: any,
  ) {
    const timestamp = parseInt(timestampStr, 10);
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);

    // Cryptographic validation of provider response
    this.identityVerificationService.validateProviderWebhookSignature(
      rawBody,
      signature,
      timestamp,
    );

    if (!body?.transactionId) {
      throw new BadRequestException('Webhook payload missing transactionId.');
    }

    return this.hostService.processProviderVerificationResult({
      transactionId: body.transactionId,
      documentAuthentic: Boolean(body.documentAuthentic),
      faceMatchScore: body.faceMatchScore,
      faceMatchPassed: body.faceMatchPassed,
      livenessVerified: body.livenessVerified,
      failureReason: body.failureReason,
      confidenceScore: body.confidenceScore,
    });
  }
}
