/**
 * Evidence-Based Seasonal Pricing Service.
 *
 * Implements strict data-driven seasonal ADR adjustments:
 * - Requires at least 30 completed booking transactions across >= 6 distinct months before
 *   applying any seasonal price adjustment.
 * - Does not invent speculative holiday/festival multipliers without booking proof.
 * - Separates rental seasonality from property sales (sales are never seasonally adjusted).
 * - Transparently reports data sufficiency status to the host.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';

export interface SeasonalAdjustmentResult {
  applied: boolean;
  seasonalMultiplier: number;
  seasonName: string;
  status: 'insufficient_historical_data' | 'not_applicable_to_sales' | 'evidence_calibrated';
  reason: string;
  historicalBookingCount: number;
  minimumRequiredCount: number;
}

@Injectable()
export class SeasonalPricingService {
  private readonly logger = new Logger(SeasonalPricingService.name);

  // Minimum statistical sample thresholds for evidence-based seasonal models
  public static readonly MIN_BOOKINGS_THRESHOLD = 30;
  public static readonly MIN_MONTHS_THRESHOLD = 6;

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository?: Repository<Booking>,
  ) {}

  /**
   * Analyzes booking history to determine whether a seasonal price adjustment is empirically justified.
   */
  async evaluateSeasonality(
    city: string,
    listingType = 'RENTAL',
    targetDate: Date = new Date(),
  ): Promise<SeasonalAdjustmentResult> {
    const isSale = listingType.toUpperCase() === 'SALE';

    // 1. Sales Valuation Rule: Never seasonally adjust capital real estate sales
    if (isSale) {
      return {
        applied: false,
        seasonalMultiplier: 1.0,
        seasonName: 'Capital Asset Valuation (Neutral)',
        status: 'not_applicable_to_sales',
        reason:
          'Seasonal pricing adjustments apply strictly to nightly short-term rentals; property sale valuations reflect long-term capital assets independent of monthly tourist fluctuations.',
        historicalBookingCount: 0,
        minimumRequiredCount: 0,
      };
    }

    // If repository is not available (e.g. in isolated test or disconnected mode)
    if (!this.bookingRepository) {
      return {
        applied: false,
        seasonalMultiplier: 1.0,
        seasonName: 'Neutral Baseline',
        status: 'insufficient_historical_data',
        reason: 'Booking repository offline; retaining neutral baseline rate.',
        historicalBookingCount: 0,
        minimumRequiredCount: SeasonalPricingService.MIN_BOOKINGS_THRESHOLD,
      };
    }

    try {
      // 2. Query completed reservations in the target city
      const completedBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .innerJoin('booking.property', 'property')
        .where('booking.status = :status', { status: BookingStatus.COMPLETED })
        .andWhere('LOWER(property.city) = LOWER(:city)', { city: city.trim() })
        .andWhere('booking.totalPrice > 0')
        .select(['booking.id', 'booking.checkInDate', 'booking.checkOutDate', 'booking.totalPrice'])
        .getMany();

      const count = completedBookings.length;

      // 3. Statistical Sufficiency Check
      if (count < SeasonalPricingService.MIN_BOOKINGS_THRESHOLD) {
        return {
          applied: false,
          seasonalMultiplier: 1.0,
          seasonName: 'Standard Rate (Data Limited)',
          status: 'insufficient_historical_data',
          reason: `Historical booking data in ${city} is currently limited (${count} completed reservation(s) found; minimum ${SeasonalPricingService.MIN_BOOKINGS_THRESHOLD} required across ${SeasonalPricingService.MIN_MONTHS_THRESHOLD}+ distinct months). No speculative seasonal multiplier applied.`,
          historicalBookingCount: count,
          minimumRequiredCount: SeasonalPricingService.MIN_BOOKINGS_THRESHOLD,
        };
      }

      // Helper function to extract booking nights
      const getBookingNights = (checkIn: Date | string, checkOut: Date | string): number => {
        const start = new Date(checkIn).getTime();
        const end = new Date(checkOut).getTime();
        if (isNaN(start) || isNaN(end) || end <= start) return 1;
        return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      };

      // Group bookings by calendar month to check distinct months count and ADR (Average Daily Rate)
      const monthBookings: Record<number, number[]> = {};
      const allDailyRates: number[] = [];
      for (const b of completedBookings) {
        const nights = getBookingNights(b.checkInDate, b.checkOutDate);
        const dailyRate = Number(b.totalPrice) / nights;
        if (!isNaN(dailyRate) && dailyRate > 0) {
          const month = new Date(b.checkInDate).getMonth();
          if (!monthBookings[month]) monthBookings[month] = [];
          monthBookings[month].push(dailyRate);
          allDailyRates.push(dailyRate);
        }
      }

      const distinctMonths = Object.keys(monthBookings).length;
      if (distinctMonths < SeasonalPricingService.MIN_MONTHS_THRESHOLD) {
        return {
          applied: false,
          seasonalMultiplier: 1.0,
          seasonName: 'Standard Rate (Insufficient Seasonal Coverage)',
          status: 'insufficient_historical_data',
          reason: `Bookings in ${city} span only ${distinctMonths} distinct calendar months (minimum ${SeasonalPricingService.MIN_MONTHS_THRESHOLD} required to compute annual ADR seasonal indices). Retaining standard rate.`,
          historicalBookingCount: count,
          minimumRequiredCount: SeasonalPricingService.MIN_BOOKINGS_THRESHOLD,
        };
      }

      // 4. Calculate empirical monthly ADR ratio
      const targetMonth = targetDate.getMonth();
      const annualAvgAdr = allDailyRates.length > 0
        ? allDailyRates.reduce((a, b) => a + b, 0) / allDailyRates.length
        : 1;

      const targetMonthPrices = monthBookings[targetMonth] || [];
      if (targetMonthPrices.length < 5) {
        return {
          applied: false,
          seasonalMultiplier: 1.0,
          seasonName: 'Standard Rate',
          status: 'insufficient_historical_data',
          reason: `Fewer than 5 bookings recorded for month ${targetMonth + 1} in ${city}. Retaining neutral baseline.`,
          historicalBookingCount: count,
          minimumRequiredCount: SeasonalPricingService.MIN_BOOKINGS_THRESHOLD,
        };
      }

      const targetMonthAdr = targetMonthPrices.reduce((a, b) => a + b, 0) / targetMonthPrices.length;
      const empiricalMultiplier = Math.min(1.30, Math.max(0.75, Math.round((targetMonthAdr / annualAvgAdr) * 100) / 100));

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[targetMonth];

      return {
        applied: Math.abs(empiricalMultiplier - 1.0) >= 0.05,
        seasonalMultiplier: empiricalMultiplier,
        seasonName: `${monthName} Historical Demand Index (${empiricalMultiplier}x)`,
        status: 'evidence_calibrated',
        reason: `Empirically calibrated from ${targetMonthPrices.length} historical completed bookings in ${monthName} vs ${count} annual reservations.`,
        historicalBookingCount: count,
        minimumRequiredCount: SeasonalPricingService.MIN_BOOKINGS_THRESHOLD,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to evaluate seasonal booking records: ${msg}`);
      return {
        applied: false,
        seasonalMultiplier: 1.0,
        seasonName: 'Neutral Baseline',
        status: 'insufficient_historical_data',
        reason: 'Could not query booking history; standard rate maintained.',
        historicalBookingCount: 0,
        minimumRequiredCount: SeasonalPricingService.MIN_BOOKINGS_THRESHOLD,
      };
    }
  }
}

