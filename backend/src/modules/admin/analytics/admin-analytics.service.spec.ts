import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminAnalyticsService } from './admin-analytics.service';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';
import { Property, ListingStatus } from '../../properties/entities/property.entity';
import { User } from '../../../users/entities/user.entity';
import { HostProfile } from '../../../users/entities/host-profile.entity';
import { PropertyCategory } from '../../catalog/entities/property-category.entity';
import { Destination } from '../../catalog/entities/destination.entity';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let bookingRepo: any;
  let propertyRepo: any;
  let userRepo: any;
  let hostProfileRepo: any;
  let categoryRepo: any;
  let destinationRepo: any;

  const mockBookings: any[] = [
    {
      id: 'book-1',
      totalPrice: 10000,
      status: BookingStatus.CONFIRMED,
      checkInDate: new Date('2026-10-01'),
      checkOutDate: new Date('2026-10-05'),
      createdAt: new Date('2026-10-15'),
      property: {
        city: 'Addis Ababa',
        propertyType: 'villas',
      },
    },
    {
      id: 'book-2',
      totalPrice: 5000,
      status: BookingStatus.CANCELLED,
      checkInDate: new Date('2026-10-10'),
      checkOutDate: new Date('2026-10-12'),
      createdAt: new Date('2026-10-18'),
      property: {
        city: 'Bishoftu',
        propertyType: 'apartments',
      },
    },
  ];

  beforeEach(async () => {
    bookingRepo = {
      find: jest.fn().mockResolvedValue(mockBookings),
    };
    propertyRepo = {
      count: jest.fn().mockResolvedValue(25),
      find: jest.fn().mockResolvedValue([
        { id: 'prop-1', propertyType: 'villas' },
        { id: 'prop-2', propertyType: 'apartments' },
      ]),
    };
    userRepo = {
      count: jest.fn().mockResolvedValue(50),
    };
    hostProfileRepo = {
      count: jest.fn().mockResolvedValue(15),
    };
    categoryRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'cat-1', name: 'Luxury Villas', slug: 'villas', isActive: true },
        { id: 'cat-2', name: 'Modern Apartments', slug: 'apartments', isActive: true },
      ]),
    };
    destinationRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'dest-1', name: 'Addis Ababa', region: 'Shewa / Central', isActive: true },
        { id: 'dest-2', name: 'Bishoftu', region: 'Oromia / Rift Valley', isActive: true },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: bookingRepo,
        },
        {
          provide: getRepositoryToken(Property),
          useValue: propertyRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(HostProfile),
          useValue: hostProfileRepo,
        },
        {
          provide: getRepositoryToken(PropertyCategory),
          useValue: categoryRepo,
        },
        {
          provide: getRepositoryToken(Destination),
          useValue: destinationRepo,
        },
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('calculates KPIs, time series, and distributions', async () => {
      const res = await service.getOverview('30d');

      expect(res.kpis.grossBookingValueEtb).toBe(15000);
      expect(res.kpis.netRevenueEtb).toBe(1800);
      expect(res.kpis.totalBookings).toBe(2);
      expect(res.kpis.confirmedBookings).toBe(1);
      expect(res.kpis.cancellationRatePercent).toBe(50);
      expect(res.kpis.activeListings).toBe(25);
      expect(res.kpis.activeHosts).toBe(15);
      expect(res.timeSeries.length).toBeGreaterThan(0);
      expect(res.topDestinations.length).toBeGreaterThan(0);
      expect(res.categoryDistribution).toHaveLength(2);
      expect(res.bookingStatusFunnel).toHaveLength(4);
    });
  });

  describe('exportReportCsv', () => {
    it('returns a formatted CSV string with headers and rows', async () => {
      const csv = await service.exportReportCsv('30d');
      expect(csv).toContain('ENGIDA BUSINESS ANALYTICS REPORT');
      expect(csv).toContain('Gross Booking Value (ETB)');
      expect(csv).toContain('DAILY TIME SERIES');
    });
  });
});
