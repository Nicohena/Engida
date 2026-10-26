import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { ListingModerationService } from '../properties/listing-moderation.service';
import { HostService } from '../host/host.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { HostProfile, HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { Reflector } from '@nestjs/core';

describe('AdminController - Host Verification', () => {
  let controller: AdminController;
  let hostService: jest.Mocked<Partial<HostService>>;
  let listingModerationService: jest.Mocked<Partial<ListingModerationService>>;

  const mockAdminUser: User = {
    id: 'admin-uuid-1',
    name: 'Admin Officer',
    email: 'admin@engida.com',
    role: UserRole.ADMIN,
    passwordHash: 'hash',
    phone: null,
    title: null,
    bio: null,
    avatar: null,
    officeLocation: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  const mockProfile: HostProfile = {
    id: 'profile-uuid-1',
    userId: 'host-uuid-1',
    displayName: 'Abebe Host',
    phone: '+251911223344',
    bio: 'Hospitality host in Bole',
    verificationStatus: HostVerificationStatus.PENDING,
    payoutProvider: null,
    payoutAccountName: null,
    payoutAccountNumber: null,
    payoutPhone: null,
    payoutBankBranch: null,
    payoutSwiftBic: null,
    payoutEmail: null,
    payoutCurrency: 'ETB',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockAdminUser,
  };

  beforeEach(async () => {
    hostService = {
      getHostVerifications: jest.fn(),
      approveHostVerification: jest.fn(),
      rejectHostVerification: jest.fn(),
    };

    listingModerationService = {
      getAdminReviewQueue: jest.fn(),
      getAdminReviewDetail: jest.fn(),
      approveReview: jest.fn(),
      rejectReview: jest.fn(),
      hideListing: jest.fn(),
      restoreListing: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: HostService, useValue: hostService },
        { provide: ListingModerationService, useValue: listingModerationService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Admin Authorization Metadata', () => {
    it('should have ADMIN role metadata attached to controller class', () => {
      const reflector = new Reflector();
      const roles = reflector.get<UserRole[]>(ROLES_KEY, AdminController);
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });

  describe('getHostVerifications', () => {
    it('should delegate to hostService.getHostVerifications with query', async () => {
      const mockResult = {
        data: [mockProfile],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      (hostService.getHostVerifications as jest.Mock).mockResolvedValue(mockResult);

      const query = { status: HostVerificationStatus.PENDING, page: 1, limit: 10 };
      const result = await controller.getHostVerifications(query);

      expect(hostService.getHostVerifications).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('approveHostVerification', () => {
    it('should delegate to hostService.approveHostVerification with admin and profile ID', async () => {
      const approvedProfile = {
        ...mockProfile,
        verificationStatus: HostVerificationStatus.VERIFIED,
      };
      (hostService.approveHostVerification as jest.Mock).mockResolvedValue(approvedProfile);

      const result = await controller.approveHostVerification('profile-uuid-1', mockAdminUser);

      expect(hostService.approveHostVerification).toHaveBeenCalledWith(
        'profile-uuid-1',
        mockAdminUser,
        { ipAddress: undefined, userAgent: undefined },
      );
      expect(result.verificationStatus).toBe(HostVerificationStatus.VERIFIED);
    });
  });

  describe('rejectHostVerification', () => {
    it('should delegate to hostService.rejectHostVerification with explanation and admin', async () => {
      const rejectedProfile = {
        ...mockProfile,
        verificationStatus: HostVerificationStatus.REJECTED,
      };
      (hostService.rejectHostVerification as jest.Mock).mockResolvedValue(rejectedProfile);

      const dto = { explanation: 'The phone number provided could not be confirmed.' };
      const result = await controller.rejectHostVerification('profile-uuid-1', dto, mockAdminUser);

      expect(hostService.rejectHostVerification).toHaveBeenCalledWith(
        'profile-uuid-1',
        'The phone number provided could not be confirmed.',
        mockAdminUser,
        { ipAddress: undefined, userAgent: undefined },
      );
      expect(result.verificationStatus).toBe(HostVerificationStatus.REJECTED);
    });

    it('should accept rejectionReason field fallback in DTO', async () => {
      const rejectedProfile = {
        ...mockProfile,
        verificationStatus: HostVerificationStatus.REJECTED,
      };
      (hostService.rejectHostVerification as jest.Mock).mockResolvedValue(rejectedProfile);

      const dto = { rejectionReason: 'Contact details are invalid.' };
      await controller.rejectHostVerification('profile-uuid-1', dto, mockAdminUser);

      expect(hostService.rejectHostVerification).toHaveBeenCalledWith(
        'profile-uuid-1',
        'Contact details are invalid.',
        mockAdminUser,
        { ipAddress: undefined, userAgent: undefined },
      );
    });
  });
});
