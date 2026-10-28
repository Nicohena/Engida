import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Booking, PaymentMethod, PaymentStatus, BookingStatus } from '../bookings/entities/booking.entity';
import { Property, PropertyType, ListingType, ListingStatus } from '../properties/entities/property.entity';

describe('PaymentsService Integration Acceptance', () => {
  let service: PaymentsService;
  let mockBookingRepo: any;
  let mockPropertyRepo: any;
  let mockConfigService: any;

  const mockProperty: Property = {
    id: 'prop-uuid-1',
    hostId: 'host-uuid-1',
    title: 'Luxury Bole Villa',
    description: 'Spacious stay in Addis',
    propertyType: PropertyType.VILLA,
    listingType: ListingType.RENTAL,
    status: ListingStatus.PUBLISHED,
    address: 'Bole Medhanealem',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    zone: null,
    subCity: 'Bole',
    woreda: null,
    neighborhood: null,
    latitude: 9.0,
    longitude: 38.7,
    pricePerNight: 2500,
    salePrice: null,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 120,
    parkingSpaces: 1,
    isAvailable: true,
    coverImage: 'cover.jpg',
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    host: {} as any,
    rooms: [],
    amenities: [],
    bookings: [],
    reviews: [],
    availabilityBlocks: [],
  };

  const mockBooking: Booking = {
    id: 'booking-uuid-1',
    propertyId: 'prop-uuid-1',
    roomId: null,
    guestId: 'guest-uuid-1',
    checkInDate: '2027-02-01',
    checkOutDate: '2027-02-05',
    guestCount: 2,
    totalPrice: 10000,
    status: BookingStatus.PENDING,
    paymentMethod: PaymentMethod.CHAPA,
    paymentStatus: PaymentStatus.PENDING,
    paymentReference: 'ENGIDA-CHAPA-TX12345',
    paymentCurrency: 'ETB',
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    room: null,
    guest: {} as any,
  };

  beforeEach(async () => {
    mockBookingRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
    };

    mockPropertyRepo = {
      findOne: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'CHAPA_SECRET_KEY') return undefined; // sandbox mode by default
        if (key === 'BACKEND_URL') return 'http://localhost:3000';
        if (key === 'FRONTEND_URL') return 'http://localhost:3001';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(Property), useValue: mockPropertyRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('Payment Methods & Discovery', () => {
    it('returns supported Ethiopian and international payment methods with exchange rates', () => {
      const result = service.getPaymentMethods();
      expect(result.methods).toBeDefined();
      expect(result.methods.length).toBeGreaterThanOrEqual(6);

      const chapa = result.methods.find((m) => m.id === PaymentMethod.CHAPA);
      expect(chapa).toBeDefined();
      expect(chapa?.category).toBe('ETHIOPIA_LOCAL');

      const cash = result.methods.find((m) => m.id === PaymentMethod.CASH_ON_ARRIVAL);
      expect(cash).toBeUndefined();

      expect(result.exchangeRate.base).toBe('USD');
      expect(result.exchangeRate.target).toBe('ETB');
      expect(result.exchangeRate.rate).toBe(125);
    });
  });

  describe('Payment Initialization', () => {
    it('throws NotFoundException if property does not exist', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.initializePayment({
          propertyId: 'non-existent',
          amount: 5000,
          paymentMethod: PaymentMethod.CHAPA,
          customerEmail: 'guest@test.com',
          customerName: 'Abebe Bikila',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('generates sandbox payment session with unique transaction reference when live key is not present', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(mockProperty);

      const result = await service.initializePayment({
        propertyId: mockProperty.id,
        amount: 10000,
        currency: 'ETB',
        paymentMethod: PaymentMethod.CHAPA,
        customerEmail: 'guest@test.com',
        customerName: 'Abebe Bikila',
      });

      expect(result.status).toBe('success');
      expect(result.mode).toBe('sandbox');
      expect(result.transactionReference).toMatch(/^ENGIDA-CHAPA-\d+-\d+$/);
      expect(result.amount).toBe(10000);
      expect(result.currency).toBe('ETB');
    });
  });

  describe('Chapa Webhook Processing', () => {
    it('verifies booking as PAID when webhook status is success', async () => {
      const bookingCopy = { ...mockBooking };
      mockBookingRepo.findOne.mockResolvedValue(bookingCopy);

      const result = await service.handleChapaWebhook({
        status: 'success',
        tx_ref: 'ENGIDA-CHAPA-TX12345',
        amount: '10000',
        currency: 'ETB',
      });

      expect(result).toEqual({ received: true });
      expect(mockBookingRepo.save).toHaveBeenCalled();
      expect(bookingCopy.paymentStatus).toBe(PaymentStatus.PAID);
      expect(bookingCopy.paidAt).toBeInstanceOf(Date);
    });

    it('ignores webhook if status is not success', async () => {
      const bookingCopy = { ...mockBooking, paymentStatus: PaymentStatus.PENDING };
      mockBookingRepo.findOne.mockResolvedValue(bookingCopy);

      const result = await service.handleChapaWebhook({
        status: 'failed',
        tx_ref: 'ENGIDA-CHAPA-TX12345',
      });

      expect(result).toEqual({ received: true });
      expect(bookingCopy.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(mockBookingRepo.save).not.toHaveBeenCalled();
    });

    it('gracefully handles missing tx_ref in webhook payload', async () => {
      const result = await service.handleChapaWebhook({});
      expect(result).toEqual({ received: true });
      expect(mockBookingRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Payment Verification', () => {
    it('verifies payment safely without directly marking booking as PAID', async () => {
      const bookingCopy = { ...mockBooking, paymentStatus: PaymentStatus.PENDING };
      mockBookingRepo.findOne.mockResolvedValue(bookingCopy);

      const result = await service.verifyPayment({
        transactionReference: 'ENGIDA-CHAPA-TX999',
        bookingId: mockBooking.id,
      });

      expect(result.status).toBe('pending');
      expect(result.verified).toBe(false);
      expect(bookingCopy.paymentStatus).toBe(PaymentStatus.PENDING);
    });
  });
});
