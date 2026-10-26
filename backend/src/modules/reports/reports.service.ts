import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Property } from '../properties/entities/property.entity';
import { Review } from '../reviews/entities/review.entity';
import { User } from '../../users/entities/user.entity';
import {
  Report,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(dto: CreateReportDto, reporter: User): Promise<Report> {
    const details = dto.details?.trim() || null;

    if (dto.reason === ReportReason.OTHER && !details) {
      throw new BadRequestException('Please describe the issue when selecting “Other”');
    }

    if (dto.targetType === ReportTargetType.LISTING) {
      const property = await this.propertyRepository.findOne({
        where: { id: dto.targetId },
        select: ['id', 'hostId', 'title'],
      });
      if (!property) {
        throw new NotFoundException('The listing you are trying to report was not found');
      }
      if (property.hostId === reporter.id) {
        throw new BadRequestException('You cannot report your own listing');
      }
    } else if (dto.targetType === ReportTargetType.REVIEW) {
      const review = await this.reviewRepository.findOne({
        where: { id: dto.targetId },
        select: ['id', 'userId'],
      });
      if (!review) {
        throw new NotFoundException('The review you are trying to report was not found');
      }
      if (review.userId === reporter.id) {
        throw new BadRequestException('You cannot report your own review');
      }
    } else {
      throw new BadRequestException('Unsupported report target');
    }

    const existing = await this.reportRepository.findOne({
      where: {
        reporterId: reporter.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: In([ReportStatus.OPEN, ReportStatus.INVESTIGATING]),
      },
    });
    if (existing) {
      throw new ConflictException('You already have an open report for this item');
    }

    const report = this.reportRepository.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      reporterId: reporter.id,
      reporterEmail: reporter.email,
      reason: dto.reason,
      details,
      status: ReportStatus.OPEN,
    });

    return this.reportRepository.save(report);
  }

  async listMine(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.reportRepository.findAndCount({
      where: { reporterId: userId },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }
}
