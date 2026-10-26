import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../../../users/entities/user.entity';
import { HostProfile, HostVerificationStatus } from '../../../users/entities/host-profile.entity';
import { Property, ListingStatus } from '../../properties/entities/property.entity';
import { ListingReview, ReviewStatus } from '../../properties/entities/listing-review.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Report, ReportStatus } from '../../reports/entities/report.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { hasPermission, Permission } from '../rbac/permissions';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(HostProfile)
    private readonly hostProfileRepository: Repository<HostProfile>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(ListingReview)
    private readonly listingReviewRepository: Repository<ListingReview>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly auditService: AuditService,
  ) {}

  async getSummary(actor: User) {
    const canViewAudit = hasPermission(actor, Permission.AUDIT_VIEW);
    const [
      pendingListingReviews,
      pendingHostVerifications,
      activeUsers,
      suspendedUsers,
      activeAdmins,
      publishedListings,
      hiddenListings,
      totalReviews,
      openReports,
      recentAudit,
    ] = await Promise.all([
      this.listingReviewRepository.count({ where: { status: ReviewStatus.PENDING } }),
      this.hostProfileRepository.count({
        where: { verificationStatus: HostVerificationStatus.PENDING },
      }),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { isActive: false } }),
      this.userRepository.count({
        where: { role: UserRole.ADMIN, isActive: true },
      }),
      this.propertyRepository.count({
        where: { status: ListingStatus.PUBLISHED, adminHidden: false },
      }),
      this.propertyRepository.count({ where: { adminHidden: true } }),
      this.reviewRepository.count(),
      this.reportRepository.count({
        where: {
          status: In([ReportStatus.OPEN, ReportStatus.INVESTIGATING]),
        },
      }),
      canViewAudit
        ? this.auditService.list({ page: 1, limit: 8 })
        : Promise.resolve({ data: [] as AuditLog[] }),
    ]);

    return {
      counts: {
        pendingListingReviews,
        pendingHostVerifications,
        activeUsers,
        suspendedUsers,
        activeAdmins,
        publishedListings,
        hiddenListings,
        totalReviews,
        openReports,
      },
      recentAudit: recentAudit.data,
    };
  }
}
