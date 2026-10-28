import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditRequestContext, AuditService } from '../../audit/audit.service';
import { User } from '../../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';
import { buildCsv } from '../utils/csv';
import { QueryAdminListingsDto } from './dto/admin-listings.dto';

const CSV_LIMIT = 5000;

@Injectable()
export class AdminListingsService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly auditService: AuditService,
  ) {}

  async exportCsv(
    query: QueryAdminListingsDto,
    actor: User,
    context: AuditRequestContext,
  ): Promise<string> {
    const qb = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoin('property.host', 'host')
      .addSelect(['host.id', 'host.name', 'host.email']);

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(property.title) LIKE :term OR LOWER(property.city) LIKE :term OR LOWER(property.address) LIKE :term OR LOWER(host.name) LIKE :term OR LOWER(host.email) LIKE :term)',
        { term },
      );
    }

    if (query.status) {
      qb.andWhere('property.status = :status', { status: query.status });
    }

    if (query.adminHidden !== undefined) {
      qb.andWhere('property.adminHidden = :adminHidden', {
        adminHidden: query.adminHidden,
      });
    }

    if (query.city?.trim()) {
      qb.andWhere('LOWER(property.city) = :city', {
        city: query.city.trim().toLowerCase(),
      });
    }

    const sort = query.sort || 'createdAt';
    const order = (query.order || 'desc').toUpperCase() as 'ASC' | 'DESC';
    const listings = await qb
      .orderBy(`property.${sort}`, order)
      .take(CSV_LIMIT)
      .getMany();

    const rows = listings.map((listing) => [
      listing.id,
      listing.title,
      listing.host?.name ?? '',
      listing.host?.email ?? '',
      listing.propertyType,
      listing.listingType,
      listing.status,
      listing.adminHidden ? 'Hidden' : 'Visible',
      listing.adminHiddenReason ?? '',
      listing.city,
      listing.region ?? '',
      listing.address,
      String(listing.pricePerNight),
      listing.salePrice === null ? '' : String(listing.salePrice),
      listing.maxGuests,
      listing.bedrooms,
      listing.bathrooms,
      listing.createdAt.toISOString(),
      listing.updatedAt.toISOString(),
    ]);
    const header = [
      'Listing ID',
      'Title',
      'Host',
      'Host email',
      'Property type',
      'Listing type',
      'Status',
      'Visibility',
      'Hidden reason',
      'City',
      'Region',
      'Address',
      'Price per night',
      'Sale price',
      'Max guests',
      'Bedrooms',
      'Bathrooms',
      'Created',
      'Updated',
    ];

    await this.auditService.record({
      actor,
      action: 'listing.list_exported',
      entityType: 'listing',
      metadata: {
        rows: rows.length,
        filters: {
          status: query.status ?? null,
          adminHidden: query.adminHidden ?? null,
          city: query.city ?? null,
        },
      },
      ...context,
    });

    return buildCsv(header, rows);
  }
}
