import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ListingModerationService } from './listing-moderation.service';
import {
  Property,
  PropertyType,
  ListingType,
  ListingStatus,
} from './entities/property.entity';
import {
  ListingReview,
  ReviewSubmissionType,
  ReviewStatus,
} from './entities/listing-review.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { HostProfile, HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  validatePublishReadiness,
  classifyListingChanges,
} from './constants/moderation.constants';

describe('ListingModerationService & Moderation Policies', () => {
  let service: ListingModerationService;

  const HOST_ID = 'host-uuid-1';
  const OTHER_HOST_ID = 'other-host-uuid';
  const ADMIN_ID = 'admin-uuid-1';
  const PROPERTY_ID = 'prop-uuid-1';
  const REVIEW_ID = 'review-uuid-1';

  const mockAdminUser: User = {
    id: ADMIN_ID,
    name: 'Admin User',
    email: 'admin@engda.com',
    passwordHash: 'hash',
    role: UserRole.ADMIN,
    phone: null,
    title: null,
    bio: null,
    avatar: null,
    officeLocation: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
    hostProfile: undefined,
    properties: [],
  };

  const mockHostUser: User = {
    ...mockAdminUser,
    id: HOST_ID,
    role: UserRole.USER,
    email: 'host@engda.com',
  };

  const mockDraftProperty: Property = {
    id: PROPERTY_ID,
    hostId: HOST_ID,
    title: 'Modern Bole Penthouse',
    description: 'Stunning luxury penthouse located in Bole near Edna Mall.',
    propertyType: PropertyType.APARTMENT,
    listingType: ListingType.RENTAL,
    status: ListingStatus.DRAFT,
    address: 'Cameroon St',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    zone: 'Bole',
    subCity: 'Bole',
    woreda: '03',
    neighborhood: 'Bole Medhanialem',
    latitude: 9.0012,
    longitude: 38.7845,
    pricePerNight: 2500,
    salePrice: null,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 120,
    parkingSpaces: 1,
    isAvailable: true,
    adminHidden: false,
    adminHiddenReason: null,
    adminHiddenAt: null,
    adminHiddenById: null,
    coverImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'],
    createdAt: new Date(),
    updatedAt: new Date(),
    host: mockHostUser,
    rooms: [],
    amenities: [],
    bookings: [],
    reviews: [],
    availabilityBlocks: [],
    moderationReviews: [],
  };

  const mockPublishedProperty: Property = {
    ...mockDraftProperty,
    status: ListingStatus.PUBLISHED,
  };

  const mockPendingReview: ListingReview = {
    id: REVIEW_ID,
    propertyId: PROPERTY_ID,
    submissionType: ReviewSubmissionType.INITIAL_PUBLISH,
    status: ReviewStatus.PENDING,
    submittedByHostId: HOST_ID,
    submittedAt: new Date(),
    reviewedByAdminId: null,
    reviewedAt: null,
    rejectionReason: null,
    proposedChanges: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockDraftProperty,
    submittedByHost: mockHostUser,
    reviewedByAdmin: null,
  };

  // Repositories & EntityManager Mocks
  let mockReviewRepo: any;
  let mockPropertyRepo: any;
  let mockAmenityRepo: any;
  let mockHostProfileRepo: any;
  let mockTxReviewRepo: any;
  let mockTxPropertyRepo: any;
  let mockTxAmenityRepo: any;
  let mockTxHostProfileRepo: any;
  let mockEntityManager: any;
  let mockDataSource: any;
  let mockCloudinaryService: any;

  beforeEach(async () => {
    mockTxReviewRepo = {
      findOne: jest.fn(),
      save: jest.fn((r) => Promise.resolve(r)),
    };
    mockTxPropertyRepo = {
      findOne: jest.fn(),
      save: jest.fn((p) => Promise.resolve(p)),
    };
    mockTxAmenityRepo = {
      findByIds: jest.fn().mockResolvedValue([]),
    };
    mockTxHostProfileRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'hp-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.VERIFIED,
      }),
    };

    mockEntityManager = {
      getRepository: jest.fn((entityClass) => {
        if (entityClass === ListingReview) return mockTxReviewRepo;
        if (entityClass === Property) return mockTxPropertyRepo;
        if (entityClass === Amenity) return mockTxAmenityRepo;
        if (entityClass === HostProfile) return mockTxHostProfileRepo;
        return mockTxReviewRepo;
      }),
      findOne: jest.fn(),
      save: jest.fn((entityClass, entity) => Promise.resolve(entity)),
    };

    mockDataSource = {
      transaction: jest.fn((cb) => cb(mockEntityManager)),
    };

    mockReviewRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({
        id: REVIEW_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...dto,
      })),
      save: jest.fn((r) => Promise.resolve(r)),
      createQueryBuilder: jest.fn(),
    };

    mockPropertyRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((p) => Promise.resolve(p)),
      createQueryBuilder: jest.fn(),
    };

    mockAmenityRepo = {
      findByIds: jest.fn().mockResolvedValue([
        { id: 'amenity-wifi', name: 'Fast WiFi', icon: 'wifi' },
      ]),
    };

    mockHostProfileRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'hp-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.VERIFIED,
      }),
    };

    mockCloudinaryService = {
      deletePropertyImages: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingModerationService,
        { provide: getRepositoryToken(ListingReview), useValue: mockReviewRepo },
        { provide: getRepositoryToken(Property), useValue: mockPropertyRepo },
        { provide: getRepositoryToken(Amenity), useValue: mockAmenityRepo },
        { provide: getRepositoryToken(HostProfile), useValue: mockHostProfileRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<ListingModerationService>(ListingModerationService);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Completeness Validation (validatePublishReadiness)
  // ─────────────────────────────────────────────────────────────
  describe('Completeness Validation (validatePublishReadiness)', () => {
    it('should validate a complete rental property successfully', () => {
      const missing = validatePublishReadiness(mockDraftProperty);
      expect(missing).toHaveLength(0);
    });

    it('should validate a complete sale property successfully', () => {
      const saleProp: Property = {
        ...mockDraftProperty,
        listingType: ListingType.SALE,
        pricePerNight: null,
        salePrice: 15000000,
      };
      const missing = validatePublishReadiness(saleProp);
      expect(missing).toHaveLength(0);
    });

    it('should fail validation when title is missing or empty', () => {
      const prop: Property = { ...mockDraftProperty, title: '   ' };
      const missing = validatePublishReadiness(prop);
      expect(missing).toContain('title');
    });

    it('should fail validation when rental price is 0 or missing', () => {
      const prop: Property = { ...mockDraftProperty, pricePerNight: 0 };
      const missing = validatePublishReadiness(prop);
      expect(missing).toContain('pricePerNight (must be > 0 for rental listings)');
    });

    it('should fail validation when address or city is missing', () => {
      const prop: Property = { ...mockDraftProperty, address: '', city: '' };
      const missing = validatePublishReadiness(prop);
      expect(missing).toContain('address');
      expect(missing).toContain('city');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Field Change Classification (classifyListingChanges)
  // ─────────────────────────────────────────────────────────────
  describe('Field Change Classification (classifyListingChanges)', () => {
    it('should classify identical fields as no changes', () => {
      const classification = classifyListingChanges(mockPublishedProperty, {
        title: mockPublishedProperty.title,
        pricePerNight: mockPublishedProperty.pricePerNight,
      });
      expect(classification.hasImportantChanges).toBe(false);
      expect(classification.hasMinorChanges).toBe(false);
    });

    it('should classify parkingSpaces and isAvailable as minor changes only', () => {
      const classification = classifyListingChanges(mockPublishedProperty, {
        parkingSpaces: 3,
        isAvailable: false,
      });
      expect(classification.hasImportantChanges).toBe(false);
      expect(classification.hasMinorChanges).toBe(true);
      expect(Object.keys(classification.minorChanges)).toContain('parkingSpaces');
      expect(Object.keys(classification.minorChanges)).toContain('isAvailable');
    });

    it('should classify pricePerNight, address, and coverImage as important changes', () => {
      const classification = classifyListingChanges(mockPublishedProperty, {
        pricePerNight: 3500,
        address: 'New Bole Avenue 45',
        coverImage: 'https://example.com/new-cover.jpg',
      });
      expect(classification.hasImportantChanges).toBe(true);
      expect(Object.keys(classification.importantChanges)).toContain('pricePerNight');
      expect(Object.keys(classification.importantChanges)).toContain('address');
      expect(Object.keys(classification.importantChanges)).toContain('coverImage');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Initial Submission Flow & Gating
  // ─────────────────────────────────────────────────────────────
  describe('Initial Submission Flow & Gating', () => {
    it('should throw BadRequestException if listing is incomplete on submission', async () => {
      const incompleteProp: Property = { ...mockDraftProperty, title: '' };
      mockPropertyRepo.findOne.mockResolvedValue(incompleteProp);

      await expect(
        service.submitForReview(PROPERTY_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if host does not own the listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(mockDraftProperty);

      await expect(
        service.submitForReview(PROPERTY_ID, OTHER_HOST_ID, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should submit a complete DRAFT listing into the review queue with PENDING status', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(mockDraftProperty);
      mockReviewRepo.findOne.mockResolvedValue(null); // No existing pending review

      const result = await service.submitForReview(PROPERTY_ID, HOST_ID, UserRole.USER);

      expect(result.review).toBeDefined();
      expect(result.review.status).toBe(ReviewStatus.PENDING);
      expect(result.review.submissionType).toBe(ReviewSubmissionType.INITIAL_PUBLISH);
      expect(mockReviewRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if a PENDING review already exists for this property', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(mockDraftProperty);
      mockReviewRepo.findOne.mockResolvedValue(mockPendingReview); // Already pending

      await expect(
        service.submitForReview(PROPERTY_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Important vs Minor Edits on Published Listings
  // ─────────────────────────────────────────────────────────────
  describe('Important vs Minor Edits on Published Listings', () => {
    it('should apply minor edits directly to live listing without review queue', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedProperty });

      const result = await service.processListingUpdate(
        PROPERTY_ID,
        { parkingSpaces: 2, amenityIds: ['amenity-wifi'] },
        HOST_ID,
        UserRole.USER,
      );

      expect(result.isPendingReview).toBe(false);
      expect(result.review).toBeNull();
      expect(mockPropertyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ parkingSpaces: 2 }),
      );
    });

    it('should preserve live property unchanged and create an IMPORTANT_EDIT review when price changes', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedProperty });
      mockReviewRepo.findOne.mockResolvedValue(null); // No existing pending review

      const result = await service.processListingUpdate(
        PROPERTY_ID,
        { pricePerNight: 4000 },
        HOST_ID,
        UserRole.USER,
      );

      expect(result.isPendingReview).toBe(true);
      expect(result.review).toBeDefined();
      expect(result.review?.submissionType).toBe(ReviewSubmissionType.IMPORTANT_EDIT);
      expect(result.review?.proposedChanges).toHaveProperty('pricePerNight', 4000);
      // Property itself must not have been modified in the database
      expect(result.property.pricePerNight).toBe(2500);
    });

    it('should merge additional important changes into existing pending review if already pending', async () => {
      const activePendingEdit: ListingReview = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.IMPORTANT_EDIT,
        proposedChanges: { pricePerNight: 3500 },
      };
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedProperty });
      mockReviewRepo.findOne.mockResolvedValue(activePendingEdit);

      const result = await service.processListingUpdate(
        PROPERTY_ID,
        { title: 'Brand New Title' },
        HOST_ID,
        UserRole.USER,
      );

      expect(result.isPendingReview).toBe(true);
      expect(mockReviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          proposedChanges: {
            pricePerNight: 3500,
            title: 'Brand New Title',
          },
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Admin Approval Flow
  // ─────────────────────────────────────────────────────────────
  describe('Admin Approval Flow', () => {
    it('should throw BadRequestException if host profile is not VERIFIED when approving INITIAL_PUBLISH', async () => {
      const reviewToApprove = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.INITIAL_PUBLISH,
        property: { ...mockDraftProperty },
      };
      mockTxReviewRepo.findOne.mockResolvedValue(reviewToApprove);
      mockTxPropertyRepo.findOne.mockResolvedValue({ ...mockDraftProperty });
      mockTxHostProfileRepo.findOne.mockResolvedValue({
        id: 'hp-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.UNVERIFIED,
      });

      await expect(
        service.approveReview(REVIEW_ID, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if host profile does not exist when approving INITIAL_PUBLISH', async () => {
      const reviewToApprove = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.INITIAL_PUBLISH,
        property: { ...mockDraftProperty },
      };
      mockTxReviewRepo.findOne.mockResolvedValue(reviewToApprove);
      mockTxPropertyRepo.findOne.mockResolvedValue({ ...mockDraftProperty });
      mockTxHostProfileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveReview(REVIEW_ID, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve an INITIAL_PUBLISH review and transition property status to PUBLISHED when host is VERIFIED', async () => {
      const reviewToApprove = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.INITIAL_PUBLISH,
        property: { ...mockDraftProperty },
      };
      mockTxReviewRepo.findOne.mockResolvedValue(reviewToApprove);
      mockTxPropertyRepo.findOne.mockResolvedValue({ ...mockDraftProperty });
      mockTxHostProfileRepo.findOne.mockResolvedValue({
        id: 'hp-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.VERIFIED,
      });

      const result = await service.approveReview(REVIEW_ID, mockAdminUser);

      expect(result.review.status).toBe(ReviewStatus.APPROVED);
      expect(result.review.reviewedByAdminId).toBe(ADMIN_ID);
      expect(result.property.status).toBe(ListingStatus.PUBLISHED);
      expect(mockTxPropertyRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: ListingStatus.PUBLISHED,
      }));
    });

    it('should approve an IMPORTANT_EDIT review and apply proposed changes to live Property', async () => {
      const editReviewToApprove = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.IMPORTANT_EDIT,
        proposedChanges: {
          pricePerNight: 5000,
          title: 'Newly Renovated Penthouse',
        },
        property: { ...mockPublishedProperty },
      };
      mockTxReviewRepo.findOne.mockResolvedValue(editReviewToApprove);
      mockTxPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedProperty });

      const result = await service.approveReview(REVIEW_ID, mockAdminUser);

      expect(result.review.status).toBe(ReviewStatus.APPROVED);
      expect(result.property.pricePerNight).toBe(5000);
      expect(result.property.title).toBe('Newly Renovated Penthouse');
      expect(mockTxPropertyRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        pricePerNight: 5000,
        title: 'Newly Renovated Penthouse',
      }));
    });

    it('should throw ConflictException if review is already approved or not pending', async () => {
      const alreadyApprovedReview = {
        ...mockPendingReview,
        status: ReviewStatus.APPROVED,
      };
      mockTxReviewRepo.findOne.mockResolvedValue(alreadyApprovedReview);

      await expect(
        service.approveReview(REVIEW_ID, mockAdminUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Admin Rejection Flow
  // ─────────────────────────────────────────────────────────────
  describe('Admin Rejection Flow', () => {
    it('should throw BadRequestException if rejection reason is missing or less than 5 chars', async () => {
      await expect(
        service.rejectReview(REVIEW_ID, '   ', mockAdminUser),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.rejectReview(REVIEW_ID, 'bad', mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an INITIAL_PUBLISH review and record reason', async () => {
      const reviewToReject = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.INITIAL_PUBLISH,
        property: { ...mockDraftProperty },
      };
      mockTxReviewRepo.findOne.mockResolvedValue(reviewToReject);

      const reason = 'Photos are blurry; please provide clearer pictures of the kitchen.';
      const result = await service.rejectReview(REVIEW_ID, reason, mockAdminUser);

      expect(result.review.status).toBe(ReviewStatus.REJECTED);
      expect(result.review.rejectionReason).toBe(reason);
    });

    it('should reject an IMPORTANT_EDIT review and preserve original live values unchanged', async () => {
      const editReviewToReject = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.IMPORTANT_EDIT,
        proposedChanges: { pricePerNight: 99999 },
        property: { ...mockPublishedProperty },
      };
      mockTxReviewRepo.findOne.mockResolvedValue(editReviewToReject);

      const reason = 'Requested rate increase is excessive without additional amenities.';
      const result = await service.rejectReview(REVIEW_ID, reason, mockAdminUser);

      expect(result.review.status).toBe(ReviewStatus.REJECTED);
      expect(result.review.rejectionReason).toBe(reason);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Host Withdrawal Flow
  // ─────────────────────────────────────────────────────────────
  describe('Host Withdrawal Flow', () => {
    it('should allow host to withdraw an active PENDING review', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(mockDraftProperty);
      mockReviewRepo.findOne.mockResolvedValue({ ...mockPendingReview });

      const result = await service.withdrawReview(PROPERTY_ID, HOST_ID, UserRole.USER);

      expect(result.review.status).toBe(ReviewStatus.WITHDRAWN);
      expect(mockReviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReviewStatus.WITHDRAWN }),
      );
    });

    it('should throw ForbiddenException if a non-owner tries to withdraw a review', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(mockDraftProperty);

      await expect(
        service.withdrawReview(PROPERTY_ID, OTHER_HOST_ID, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if no active pending review exists to withdraw', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(mockDraftProperty);
      mockReviewRepo.findOne.mockResolvedValue(null);

      await expect(
        service.withdrawReview(PROPERTY_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Administrative Immediate Takedown & Restoration
  // ─────────────────────────────────────────────────────────────
  describe('Administrative Immediate Takedown & Restoration', () => {
    it('should throw BadRequestException if hide reason is empty', async () => {
      await expect(
        service.hideListing(PROPERTY_ID, '   ', mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should immediately set adminHidden = true with reason and admin ID on takedown', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedProperty });

      const reason = 'Guest safety investigation: reported damaged wiring.';
      const result = await service.hideListing(PROPERTY_ID, reason, mockAdminUser);

      expect(result.property.adminHidden).toBe(true);
      expect(result.property.adminHiddenReason).toBe(reason);
      expect(result.property.adminHiddenById).toBe(ADMIN_ID);
      expect(result.property.adminHiddenAt).toBeInstanceOf(Date);
      expect(mockPropertyRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if restoring a PUBLISHED listing when host is not verified', async () => {
      const hiddenProp: Property = {
        ...mockPublishedProperty,
        adminHidden: true,
        adminHiddenReason: 'Past dispute resolved',
      };
      mockPropertyRepo.findOne.mockResolvedValue(hiddenProp);
      mockHostProfileRepo.findOne.mockResolvedValue({
        id: 'hp-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.PENDING,
      });

      await expect(
        service.restoreListing(PROPERTY_ID, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should restore an administratively hidden listing back to public view when host is verified', async () => {
      const hiddenProp: Property = {
        ...mockPublishedProperty,
        adminHidden: true,
        adminHiddenReason: 'Past dispute resolved',
        adminHiddenAt: new Date(),
        adminHiddenById: ADMIN_ID,
      };
      mockPropertyRepo.findOne.mockResolvedValue(hiddenProp);
      mockHostProfileRepo.findOne.mockResolvedValue({
        id: 'hp-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.VERIFIED,
      });

      const result = await service.restoreListing(PROPERTY_ID, mockAdminUser);

      expect(result.property.adminHidden).toBe(false);
      expect(result.property.adminHiddenReason).toBeNull();
      expect(result.property.adminHiddenAt).toBeNull();
      expect(result.property.adminHiddenById).toBeNull();
      expect(mockPropertyRepo.save).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Concurrency Protection
  // ─────────────────────────────────────────────────────────────
  describe('Concurrency Protection', () => {
    it('should acquire pessimistic_write lock inside a transaction on approval', async () => {
      mockTxReviewRepo.findOne.mockResolvedValue({
        ...mockPendingReview,
        property: { ...mockDraftProperty },
      });
      mockTxPropertyRepo.findOne.mockResolvedValue({ ...mockDraftProperty });

      await service.approveReview(REVIEW_ID, mockAdminUser);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTxReviewRepo.findOne).toHaveBeenCalledWith({
        where: { id: REVIEW_ID },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('should acquire pessimistic_write lock inside a transaction on rejection', async () => {
      mockTxReviewRepo.findOne.mockResolvedValue({
        ...mockPendingReview,
        property: { ...mockDraftProperty },
      });

      await service.rejectReview(
        REVIEW_ID,
        'Valid explanation of at least 5 characters.',
        mockAdminUser,
      );

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTxReviewRepo.findOne).toHaveBeenCalledWith({
        where: { id: REVIEW_ID },
        lock: { mode: 'pessimistic_write' },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Image Moderation, Staging, and Orphan Cleanup
  // ─────────────────────────────────────────────────────────────
  describe('Image Moderation, Staging, and Orphan Cleanup', () => {
    const liveCover = 'https://cloudinary.com/live-cover.jpg';
    const liveGallery1 = 'https://cloudinary.com/live-gallery-1.jpg';
    const liveGallery2 = 'https://cloudinary.com/live-gallery-2.jpg';
    const otherReviewCover = 'https://cloudinary.com/other-review-cover.jpg';
    const orphanImage = 'https://cloudinary.com/orphan-image.jpg';

    it('should never delete images referenced by the live listing or another pending review', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({
        ...mockPublishedProperty,
        coverImage: liveCover,
        images: [liveGallery1, liveGallery2],
      });

      mockReviewRepo.find.mockResolvedValue([
        {
          id: 'other-review-id',
          status: ReviewStatus.PENDING,
          proposedChanges: { coverImage: otherReviewCover },
        },
      ]);

      await service.cleanOrphanImages(
        PROPERTY_ID,
        [liveCover, liveGallery1, otherReviewCover, orphanImage],
      );

      // Only orphanImage should be deleted
      expect(mockCloudinaryService.deletePropertyImages).toHaveBeenCalledWith(
        PROPERTY_ID,
        [orphanImage],
      );
    });

    it('should apply proposed image changes on approval and clean up replaced live images', async () => {
      const oldLiveCover = 'https://cloudinary.com/old-live-cover.jpg';
      const oldLiveGallery = 'https://cloudinary.com/old-live-gallery.jpg';
      const proposedCover = 'https://cloudinary.com/new-proposed-cover.jpg';
      const proposedGallery = ['https://cloudinary.com/new-proposed-gallery.jpg'];

      const liveProp = {
        ...mockPublishedProperty,
        coverImage: oldLiveCover,
        images: [oldLiveGallery],
      };

      const importantEditReview = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.IMPORTANT_EDIT,
        proposedChanges: {
          coverImage: proposedCover,
          images: proposedGallery,
        },
      };

      mockTxReviewRepo.findOne.mockResolvedValue(importantEditReview);
      mockTxPropertyRepo.findOne.mockResolvedValue({ ...liveProp });
      // When cleanOrphanImages runs after transaction:
      mockPropertyRepo.findOne.mockResolvedValue({
        ...liveProp,
        coverImage: proposedCover,
        images: proposedGallery,
      });
      mockReviewRepo.find.mockResolvedValue([]);

      const result = await service.approveReview(REVIEW_ID, mockAdminUser);

      expect(result.property.coverImage).toBe(proposedCover);
      expect(result.property.images).toEqual(proposedGallery);
      expect(mockCloudinaryService.deletePropertyImages).toHaveBeenCalledWith(
        PROPERTY_ID,
        expect.arrayContaining([oldLiveCover, oldLiveGallery]),
      );
    });

    it('should preserve approved live images and clean up staged images on rejection', async () => {
      const stagedCover = 'https://cloudinary.com/rejected-staged-cover.jpg';
      const stagedGallery = 'https://cloudinary.com/rejected-staged-gallery.jpg';

      const liveProp = {
        ...mockPublishedProperty,
        coverImage: liveCover,
        images: [liveGallery1],
      };

      const importantEditReview = {
        ...mockPendingReview,
        submissionType: ReviewSubmissionType.IMPORTANT_EDIT,
        proposedChanges: {
          coverImage: stagedCover,
          images: [stagedGallery],
        },
      };

      mockTxReviewRepo.findOne.mockResolvedValue(importantEditReview);
      mockPropertyRepo.findOne.mockResolvedValue(liveProp);
      mockReviewRepo.find.mockResolvedValue([]);

      await service.rejectReview(
        REVIEW_ID,
        'Photos do not meet quality guidelines',
        mockAdminUser,
      );

      // Approved live images remain untouched; staged-only images cleaned up
      expect(mockCloudinaryService.deletePropertyImages).toHaveBeenCalledWith(
        PROPERTY_ID,
        expect.arrayContaining([stagedCover, stagedGallery]),
      );
    });
  });
});
