import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { AdminCouponsService, CouponValidationResult } from './admin-coupons.service';
import { ValidateCouponDto } from './dto/admin-coupons.dto';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: AdminCouponsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
    @GetUser() user: User,
  ): Promise<CouponValidationResult> {
    return this.couponsService.validateCoupon(dto, user?.id);
  }
}

