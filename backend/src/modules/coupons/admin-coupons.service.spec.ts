import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminCouponsService } from './admin-coupons.service';
import { Coupon, CouponDiscountType } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';

describe('AdminCouponsService', () => {
  let service: AdminCouponsService;
  let couponRepo: any;
  let redemptionRepo: any;

  beforeEach(async () => {
    couponRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, redemptionsCount: 0 })),
      save: jest.fn((entity) => Promise.resolve({ id: 'cpn-1', ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };

    redemptionRepo = {
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn((dto) => ({ id: 'rdm-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCouponsService,
        {
          provide: getRepositoryToken(Coupon),
          useValue: couponRepo,
        },
        {
          provide: getRepositoryToken(CouponRedemption),
          useValue: redemptionRepo,
        },
      ],
    }).compile();

    service = module.get<AdminCouponsService>(AdminCouponsService);
  });

  describe('createCoupon', () => {
    it('creates a percentage coupon with uppercase code', async () => {
      couponRepo.findOne.mockResolvedValue(null);

      const result = await service.createCoupon({
        code: 'welcome10',
        description: '10% welcome discount',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
      });

      expect(couponRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'WELCOME10',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
        }),
      );
      expect(result.code).toBe('WELCOME10');
    });

    it('rejects duplicate coupon code with ConflictException', async () => {
      couponRepo.findOne.mockResolvedValue({ id: 'existing', code: 'PROMO10' });

      await expect(
        service.createCoupon({
          code: 'promo10',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects invalid percentage above 100', async () => {
      couponRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCoupon({
          code: 'OVER100',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 120,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateCoupon', () => {
    it('calculates correct percentage discount with cap', async () => {
      const mockCoupon = {
        id: 'cpn-pct',
        code: 'SAVE20',
        isActive: true,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 20,
        currency: 'ETB',
        minBookingAmountMinor: 100000, // 1,000 ETB
        maxDiscountAmountMinor: 30000, // Max 300 ETB
        maxRedemptions: 100,
        redemptionsCount: 5,
        perUserLimit: 1,
        startsAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 86400000),
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);
      redemptionRepo.count.mockResolvedValue(0);

      // 20% of 200,000 minor is 40,000 minor, but capped at 30,000 minor
      const result = await service.validateCoupon(
        { code: 'save20', bookingAmountMinor: 200000 },
        'usr-1',
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmountMinor).toBe(30000);
    });

    it('rejects coupon when minimum booking amount is not met', async () => {
      const mockCoupon = {
        id: 'cpn-min',
        code: 'MINREQ',
        isActive: true,
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValue: 50000,
        currency: 'ETB',
        minBookingAmountMinor: 500000, // 5,000 ETB min
        startsAt: new Date(Date.now() - 86400000),
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);

      const result = await service.validateCoupon({
        code: 'MINREQ',
        bookingAmountMinor: 200000, // Only 2,000 ETB
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('minimum requirement');
    });

    it('rejects coupon when expired', async () => {
      const mockCoupon = {
        id: 'cpn-exp',
        code: 'OLDCODE',
        isActive: true,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        currency: 'ETB',
        minBookingAmountMinor: 0,
        startsAt: new Date(Date.now() - 172800000),
        expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);

      const result = await service.validateCoupon({
        code: 'OLDCODE',
        bookingAmountMinor: 200000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('rejects coupon when user exceeds redemption limit', async () => {
      const mockCoupon = {
        id: 'cpn-limit',
        code: 'ONCEONLY',
        isActive: true,
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValue: 10000,
        currency: 'ETB',
        minBookingAmountMinor: 0,
        perUserLimit: 1,
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);
      redemptionRepo.count.mockResolvedValue(1); // Already used once

      const result = await service.validateCoupon(
        { code: 'ONCEONLY', bookingAmountMinor: 200000 },
        'usr-returning',
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('already reached the redemption limit');
    });

    it('calculates correct fixed amount discount and payable amount', async () => {
      const mockCoupon = {
        id: 'cpn-fixed',
        code: 'ENGIDA500',
        isActive: true,
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValue: 50000,
        currency: 'ETB',
        minBookingAmountMinor: 100000,
        startsAt: new Date(Date.now() - 86400000),
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);

      const result = await service.validateCoupon({
        code: 'ENGIDA500',
        bookingAmountMinor: 300000,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmountMinor).toBe(50000);
      expect(result.payableAmountMinor).toBe(250000);
    });
  });

  describe('recordRedemption', () => {
    it('increments redemption count and records redemption row', async () => {
      const mockCoupon = {
        id: 'cpn-1',
        code: 'ENQUTATASH',
        redemptionsCount: 2,
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);

      const redemption = await service.recordRedemption('cpn-1', 'usr-1', 50000, 'bkg-1');

      expect(mockCoupon.redemptionsCount).toBe(3);
      expect(redemptionRepo.save).toHaveBeenCalled();
      expect(couponRepo.save).toHaveBeenCalledWith(mockCoupon);
      expect(redemption.discountAmountMinor).toBe(50000);
    });
  });
});
