import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponDiscountType } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/admin-coupons.dto';

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  couponId?: string;
  discountType: CouponDiscountType;
  discountValue?: number;
  discountAmountMinor: number;
  payableAmountMinor: number;
  reason?: string;
}

@Injectable()
export class AdminCouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly redemptionRepository: Repository<CouponRedemption>,
  ) {}

  async listCoupons() {
    return this.couponRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['redemptions'],
    });
  }

  async getCoupon(id: string) {
    const coupon = await this.couponRepository.findOne({
      where: { id },
      relations: ['redemptions', 'redemptions.user'],
    });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }
    return coupon;
  }

  async createCoupon(dto: CreateCouponDto) {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.couponRepository.findOne({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${normalizedCode}" already exists`);
    }

    if (dto.discountType === CouponDiscountType.PERCENTAGE) {
      if (dto.discountValue < 1 || dto.discountValue > 100) {
        throw new BadRequestException('Percentage discount must be between 1 and 100');
      }
    }

    const coupon = this.couponRepository.create({
      ...dto,
      code: normalizedCode,
      startsAt: dto.startsAt || new Date(),
    });

    return this.couponRepository.save(coupon);
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    if (
      dto.discountType === CouponDiscountType.PERCENTAGE ||
      (!dto.discountType && coupon.discountType === CouponDiscountType.PERCENTAGE)
    ) {
      const val = dto.discountValue ?? coupon.discountValue;
      if (val < 1 || val > 100) {
        throw new BadRequestException('Percentage discount must be between 1 and 100');
      }
    }

    Object.assign(coupon, dto);
    return this.couponRepository.save(coupon);
  }

  async toggleCouponActive(id: string) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }
    coupon.isActive = !coupon.isActive;
    return this.couponRepository.save(coupon);
  }

  async deleteCoupon(id: string) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }
    await this.couponRepository.remove(coupon);
    return { success: true, deletedId: id };
  }

  // ==================== COUPON VALIDATION ENGINE ====================

  async validateCoupon(
    dto: ValidateCouponDto,
    userId?: string,
  ): Promise<CouponValidationResult> {
    const normalizedCode = dto.code ? dto.code.trim().toUpperCase() : '';
    if (!normalizedCode) {
      return {
        valid: false,
        code: '',
        discountType: CouponDiscountType.PERCENTAGE,
        discountAmountMinor: 0,
        payableAmountMinor: dto.bookingAmountMinor,
        reason: 'Promotional code is required',
      };
    }

    const coupon = await this.couponRepository.findOne({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      return {
        valid: false,
        code: normalizedCode,
        discountType: CouponDiscountType.PERCENTAGE,
        discountAmountMinor: 0,
        payableAmountMinor: dto.bookingAmountMinor,
        reason: 'Invalid promotional code',
      };
    }

    if (!coupon.isActive) {
      return {
        valid: false,
        code: normalizedCode,
        couponId: coupon.id,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmountMinor: 0,
        payableAmountMinor: dto.bookingAmountMinor,
        reason: 'This promotion is currently inactive',
      };
    }

    const now = new Date();
    if (coupon.startsAt && now < new Date(coupon.startsAt)) {
      return {
        valid: false,
        code: normalizedCode,
        couponId: coupon.id,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmountMinor: 0,
        payableAmountMinor: dto.bookingAmountMinor,
        reason: 'This promotion has not started yet',
      };
    }

    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
      return {
        valid: false,
        code: normalizedCode,
        couponId: coupon.id,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmountMinor: 0,
        payableAmountMinor: dto.bookingAmountMinor,
        reason: 'This promotional code has expired',
      };
    }

    if (
      coupon.maxRedemptions !== null &&
      coupon.redemptionsCount >= coupon.maxRedemptions
    ) {
      return {
        valid: false,
        code: normalizedCode,
        couponId: coupon.id,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmountMinor: 0,
        payableAmountMinor: dto.bookingAmountMinor,
        reason: 'This promotion has reached its maximum redemptions limit',
      };
    }

    if (dto.bookingAmountMinor < Number(coupon.minBookingAmountMinor)) {
      const minFormatted = (Number(coupon.minBookingAmountMinor) / 100).toLocaleString();
      return {
        valid: false,
        code: normalizedCode,
        couponId: coupon.id,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmountMinor: 0,
        payableAmountMinor: dto.bookingAmountMinor,
        reason: `Minimum booking amount of ${coupon.currency || 'ETB'} ${minFormatted} required for this code`,
      };
    }

    if (userId) {
      const userRedemptions = await this.redemptionRepository.count({
        where: { couponId: coupon.id, userId },
      });
      if (userRedemptions >= coupon.perUserLimit) {
        return {
          valid: false,
          code: normalizedCode,
          couponId: coupon.id,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          discountAmountMinor: 0,
          payableAmountMinor: dto.bookingAmountMinor,
          reason: 'You have already reached the redemption limit for this promotion',
        };
      }
    }

    // Calculate discount amount
    let discountAmountMinor = 0;
    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      discountAmountMinor = Math.round(
        (dto.bookingAmountMinor * Number(coupon.discountValue)) / 100,
      );
      if (
        coupon.maxDiscountAmountMinor !== null &&
        discountAmountMinor > Number(coupon.maxDiscountAmountMinor)
      ) {
        discountAmountMinor = Number(coupon.maxDiscountAmountMinor);
      }
    } else {
      discountAmountMinor = Math.min(
        Number(coupon.discountValue),
        dto.bookingAmountMinor,
      );
    }

    discountAmountMinor = Math.max(0, discountAmountMinor);
    const payableAmountMinor = Math.max(0, dto.bookingAmountMinor - discountAmountMinor);

    return {
      valid: true,
      code: normalizedCode,
      couponId: coupon.id,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmountMinor,
      payableAmountMinor,
    };
  }

  async recordRedemption(
    couponId: string,
    userId: string,
    discountAmountMinor: number,
    bookingId?: string,
  ) {
    const coupon = await this.couponRepository.findOne({ where: { id: couponId } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${couponId} not found`);
    }

    const redemption = this.redemptionRepository.create({
      couponId,
      userId,
      bookingId: bookingId || null,
      discountAmountMinor,
    });

    coupon.redemptionsCount += 1;
    await Promise.all([
      this.redemptionRepository.save(redemption),
      this.couponRepository.save(coupon),
    ]);

    return redemption;
  }
}
