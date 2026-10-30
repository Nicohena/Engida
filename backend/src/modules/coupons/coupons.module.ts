import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import { AdminCouponsService } from './admin-coupons.service';
import { AdminCouponsController } from './admin-coupons.controller';
import { CouponsController } from './coupons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, CouponRedemption])],
  controllers: [CouponsController, AdminCouponsController],
  providers: [AdminCouponsService],
  exports: [AdminCouponsService, TypeOrmModule],
})
export class CouponsModule {}
