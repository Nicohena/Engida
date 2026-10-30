import { Test, TestingModule } from '@nestjs/testing';
import { CouponsController } from './coupons.controller';
import { AdminCouponsService } from './admin-coupons.service';
import { CouponDiscountType } from './entities/coupon.entity';
import { User, UserRole } from '../../users/entities/user.entity';

describe('CouponsController', () => {
  let controller: CouponsController;
  let service: any;

  const mockUser: User = {
    id: 'usr-1',
    name: 'Henok T',
    email: 'henok@example.com',
    role: UserRole.USER,
    isActive: true,
    authProvider: 'LOCAL',
    providerId: null,
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    service = {
      validateCoupon: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [
        {
          provide: AdminCouponsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<CouponsController>(CouponsController);
  });

  it('delegates validation to AdminCouponsService with user ID', async () => {
    const expectedResult = {
      valid: true,
      code: 'WELCOME10',
      couponId: 'cpn-1',
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 10,
      discountAmountMinor: 50000,
      payableAmountMinor: 450000,
    };
    service.validateCoupon.mockResolvedValue(expectedResult);

    const result = await controller.validateCoupon(
      { code: 'welcome10', bookingAmountMinor: 500000 },
      mockUser,
    );

    expect(service.validateCoupon).toHaveBeenCalledWith(
      { code: 'welcome10', bookingAmountMinor: 500000 },
      'usr-1',
    );
    expect(result).toEqual(expectedResult);
  });
});

