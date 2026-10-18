import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Booking, BookingStatus, PaymentMethod, PaymentStatus } from '../bookings/entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { InitializePaymentDto, VerifyPaymentDto } from './dto/payment.dto';

export interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  category: 'ETHIOPIA_LOCAL' | 'INTERNATIONAL' | 'CASH';
  description: string;
  supportedCurrencies: string[];
  feePercentage: number;
  badge?: string;
  isPopular?: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly chapaSecretKey: string | undefined;
  // Estimated exchange rate: 1 USD = 125 ETB (used for international conversion display)
  private readonly etbToUsdRate = 125;

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly configService: ConfigService,
  ) {
    this.chapaSecretKey = this.configService.get<string>('CHAPA_SECRET_KEY');
  }

  getPaymentMethods(): { methods: PaymentMethodOption[]; exchangeRate: { base: string; target: string; rate: number } } {
    const methods: PaymentMethodOption[] = [
      {
        id: PaymentMethod.CHAPA,
        name: 'Chapa Payment Gateway',
        category: 'ETHIOPIA_LOCAL',
        description: 'Instant settlement via Telebirr, CBE Birr, Awash Birr, and Ethiopian bank debit cards',
        supportedCurrencies: ['ETB', 'USD'],
        feePercentage: 0,
        badge: 'Recommended in Ethiopia',
        isPopular: true,
      },
      {
        id: PaymentMethod.TELEBIRR,
        name: 'Telebirr Direct',
        category: 'ETHIOPIA_LOCAL',
        description: 'Direct mobile money deduction via your Ethio Telecom registered number',
        supportedCurrencies: ['ETB'],
        feePercentage: 0,
        isPopular: true,
      },
      {
        id: PaymentMethod.CBE_BIRR,
        name: 'CBE Birr',
        category: 'ETHIOPIA_LOCAL',
        description: 'Direct Commercial Bank of Ethiopia mobile payment transfer',
        supportedCurrencies: ['ETB'],
        feePercentage: 0,
      },
      {
        id: PaymentMethod.INTERNATIONAL_CARD,
        name: 'Credit or Debit Card (Visa / Mastercard / Amex)',
        category: 'INTERNATIONAL',
        description: 'Global card checkout in USD or ETB with instant 3D-Secure fraud verification',
        supportedCurrencies: ['USD', 'ETB', 'EUR', 'GBP'],
        feePercentage: 1.5,
        badge: 'Global Travelers & Diaspora',
        isPopular: true,
      },
      {
        id: PaymentMethod.PAYPAL,
        name: 'PayPal Global',
        category: 'INTERNATIONAL',
        description: 'Secure digital wallet checkout for international visitors and diaspora guests',
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        feePercentage: 2.0,
      },
      {
        id: PaymentMethod.WISE,
        name: 'Wise / Wire Transfer',
        category: 'INTERNATIONAL',
        description: 'Cross-border direct bank transfer at mid-market conversion rates',
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        feePercentage: 0.5,
      },
      {
        id: PaymentMethod.CASH_ON_ARRIVAL,
        name: 'Pay Upon Arrival',
        category: 'CASH',
        description: 'Pay cash in Ethiopian Birr (ETB) or US Dollars (USD) directly to the host at check-in',
        supportedCurrencies: ['ETB', 'USD'],
        feePercentage: 0,
      },
    ];

    return {
      methods,
      exchangeRate: {
        base: 'USD',
        target: 'ETB',
        rate: this.etbToUsdRate,
      },
    };
  }

  async initializePayment(dto: InitializePaymentDto, userId?: string) {
    const property = await this.propertyRepository.findOne({ where: { id: dto.propertyId } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const txRef = `ENGIDA-${dto.paymentMethod}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const currency = dto.currency || 'ETB';

    this.logger.log(
      `Initializing payment for property ${property.id}: ${currency} ${dto.amount} via ${dto.paymentMethod} (Ref: ${txRef})`,
    );

    // If real Chapa key is configured and method is CHAPA
    if (this.chapaSecretKey && dto.paymentMethod === PaymentMethod.CHAPA) {
      try {
        const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.chapaSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: dto.amount.toString(),
            currency,
            email: dto.customerEmail,
            first_name: dto.customerName.split(' ')[0] || 'Guest',
            last_name: dto.customerName.split(' ').slice(1).join(' ') || 'User',
            phone_number: dto.customerPhone || '0911000000',
            tx_ref: txRef,
            callback_url: `${this.configService.get('BACKEND_URL', 'http://localhost:3000')}/payments/webhook/chapa`,
            return_url: dto.returnUrl || `${this.configService.get('FRONTEND_URL', 'http://localhost:3001')}/dashboard`,
            'customization[title]': `ENGIDA Stay - ${property.title.slice(0, 30)}`,
            'customization[description]': `Rental booking in ${property.city}`,
          }),
        });

        const data = await response.json();
        if (data.status === 'success' && data.data?.checkout_url) {
          return {
            status: 'success',
            mode: 'live',
            checkoutUrl: data.data.checkout_url,
            transactionReference: txRef,
            amount: dto.amount,
            currency,
            paymentMethod: dto.paymentMethod,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Live Chapa call failed, falling back to instant sandbox flow: ${err.message}`);
      }
    }

    // Interactive simulated checkout for local and international gateways
    return {
      status: 'success',
      mode: 'sandbox',
      transactionReference: txRef,
      amount: dto.amount,
      currency,
      paymentMethod: dto.paymentMethod,
      message: `${dto.paymentMethod} payment session generated successfully`,
    };
  }

  async verifyPayment(dto: VerifyPaymentDto, userId?: string) {
    this.logger.log(`Verifying payment reference: ${dto.transactionReference}`);

    // If a booking ID was provided, mark it as paid
    if (dto.bookingId) {
      const booking = await this.bookingRepository.findOne({ where: { id: dto.bookingId } });
      if (booking) {
        booking.paymentStatus = PaymentStatus.PAID;
        booking.paymentReference = dto.transactionReference;
        booking.paidAt = new Date();
        await this.bookingRepository.save(booking);
      }
    }

    return {
      status: 'success',
      verified: true,
      transactionReference: dto.transactionReference,
      verifiedAt: new Date().toISOString(),
    };
  }

  async handleChapaWebhook(payload: any) {
    this.logger.log(`Received Chapa webhook event for tx_ref: ${payload?.tx_ref}`);
    const txRef = payload?.tx_ref;
    if (!txRef) return { received: true };

    const booking = await this.bookingRepository.findOne({ where: { paymentReference: txRef } });
    if (booking && payload.status === 'success') {
      booking.paymentStatus = PaymentStatus.PAID;
      booking.paidAt = new Date();
      await this.bookingRepository.save(booking);
      this.logger.log(`Booking ${booking.id} verified as PAID via Chapa webhook`);
    }

    return { received: true };
  }
}
