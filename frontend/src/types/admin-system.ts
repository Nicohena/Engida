export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'ytd' | '1y';

export interface AnalyticsKpi {
  grossBookingValueEtb: number;
  netRevenueEtb: number;
  hostPayoutsEtb: number;
  totalBookings: number;
  confirmedBookings: number;
  cancellationRatePercent: number;
  averageDailyRateEtb: number;
  averageLengthOfStayNights: number;
  activeListings: number;
  activeHosts: number;
  growth: {
    gbvPercent: number;
    bookingsPercent: number;
    revenuePercent: number;
  };
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  gbvEtb: number;
  revenueEtb: number;
  bookingsCount: number;
  cancellationsCount: number;
}

export interface DestinationMetric {
  city: string;
  region: string;
  bookingsCount: number;
  gbvEtb: number;
  sharePercent: number;
}

export interface CategoryMetric {
  category: string;
  slug: string;
  listingsCount: number;
  sharePercent: number;
}

export interface StatusFunnelItem {
  status: BookingStatus;
  count: number;
  percent: number;
}

export interface AnalyticsOverviewResult {
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
  kpis: AnalyticsKpi;
  timeSeries: TimeSeriesPoint[];
  topDestinations: DestinationMetric[];
  categoryDistribution: CategoryMetric[];
  bookingStatusFunnel: StatusFunnelItem[];
}

export type SettingCategory =
  | 'GENERAL'
  | 'BOOKINGS'
  | 'FINANCE'
  | 'LOCALIZATION'
  | 'NOTIFICATIONS'
  | 'SECURITY';

export type SettingType = 'string' | 'number' | 'boolean' | 'json';

export interface FormattedSetting {
  id: string;
  key: string;
  value: any;
  rawValue: string;
  category: SettingCategory;
  type: SettingType;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface SettingsResponse {
  settings: FormattedSetting[];
  grouped: Record<SettingCategory, FormattedSetting[]>;
}

export interface DatabaseStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  pingMs: number;
  databaseName: string;
  tableCounts: {
    users: number;
    properties: number;
    bookings: number;
    ledgerEntries: number;
    auditLogs: number;
    openCases: number;
  };
}

export interface RuntimeStatus {
  status: 'ONLINE';
  uptimeSeconds: number;
  uptimeFormatted: string;
  nodeVersion: string;
  platform: string;
  environment: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
}

export interface ScheduledJobInfo {
  name: string;
  description: string;
  schedule: string;
  lastRunAt: string | null;
  lastStatus: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'NEVER_RUN';
  lastDurationMs: number | null;
  details: Record<string, any> | null;
}

export interface GatewayStatus {
  name: string;
  category: 'PAYMENT' | 'CDN' | 'NOTIFICATIONS';
  status: 'OPERATIONAL' | 'DEGRADED';
  mode: string;
  endpoint: string;
}

export interface SystemHealthOverview {
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE';
  timestamp: string;
  database: DatabaseStatus;
  runtime: RuntimeStatus;
  jobs: ScheduledJobInfo[];
  gateways: GatewayStatus[];
  recentJobRuns: {
    id: string;
    jobName: string;
    status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    startedAt: string;
    finishedAt: string | null;
    counts: Record<string, any> | null;
    error: string | null;
  }[];
}
