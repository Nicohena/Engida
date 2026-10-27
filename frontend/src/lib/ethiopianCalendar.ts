/**
 * ENGIDA Ethiopian Calendar (የኢትዮጵያ ዘመን አቆጣጠር) Utility
 * 
 * Provides mathematically exact bidirectional conversion between the Gregorian
 * Calendar and the Ethiopian Calendar (13 months: 12 months of 30 days + Pagume of 5/6 days).
 * 
 * Complies with the ENGIDA Project Proposal requirements for full Ethiopian
 * localization and cultural accommodation booking intelligence.
 */

export interface EthiopianDate {
  year: number;
  month: number; // 1 to 13
  day: number; // 1 to 30 (or 1 to 5/6 in Pagume)
  monthNameAmharic: string;
  monthNameEnglish: string;
  formattedAmharic: string;
  formattedEnglish: string;
  holiday: EthiopianHoliday | null;
}

export interface EthiopianHoliday {
  id: string;
  nameAmharic: string;
  nameEnglish: string;
  isPeakTourism: boolean;
  recommendedPriceSurgePercent?: number;
  description: string;
}

export interface EthiopianMonthInfo {
  index: number; // 1 to 13
  nameAmharic: string;
  nameEnglish: string;
  days: number; // 30, or 5/6
}

export const ETHIOPIAN_MONTHS: EthiopianMonthInfo[] = [
  { index: 1, nameAmharic: 'መስከረም', nameEnglish: 'Meskerem', days: 30 },
  { index: 2, nameAmharic: 'ጥቅምት', nameEnglish: 'Tikimt', days: 30 },
  { index: 3, nameAmharic: 'ኅዳር', nameEnglish: 'Hidar', days: 30 },
  { index: 4, nameAmharic: 'ታኅሣሥ', nameEnglish: 'Tahsas', days: 30 },
  { index: 5, nameAmharic: 'ጥር', nameEnglish: 'Tir', days: 30 },
  { index: 6, nameAmharic: 'የካቲት', nameEnglish: 'Yakatit', days: 30 },
  { index: 7, nameAmharic: 'መጋቢት', nameEnglish: 'Megabit', days: 30 },
  { index: 8, nameAmharic: 'ሚያዝያ', nameEnglish: 'Miazia', days: 30 },
  { index: 9, nameAmharic: 'ግንቦት', nameEnglish: 'Ginbot', days: 30 },
  { index: 10, nameAmharic: 'ሰኔ', nameEnglish: 'Sene', days: 30 },
  { index: 11, nameAmharic: 'ሐምሌ', nameEnglish: 'Hamle', days: 30 },
  { index: 12, nameAmharic: 'ነሐሴ', nameEnglish: 'Nehase', days: 30 },
  { index: 13, nameAmharic: 'ጳጉሜ', nameEnglish: 'Pagume', days: 5 }, // 6 in leap year
];

export const ETHIOPIAN_WEEKDAYS = [
  { shortAmharic: 'እሑድ', shortEnglish: 'Sun', fullAmharic: 'እሑድ' },
  { shortAmharic: 'ሰኞ', shortEnglish: 'Mon', fullAmharic: 'ሰኞ' },
  { shortAmharic: 'ማክሰ', shortEnglish: 'Tue', fullAmharic: 'ማክሰኞ' },
  { shortAmharic: 'ረቡዕ', shortEnglish: 'Wed', fullAmharic: 'ረቡዕ' },
  { shortAmharic: 'ሐሙስ', shortEnglish: 'Thu', fullAmharic: 'ሐሙስ' },
  { shortAmharic: 'ዓርብ', shortEnglish: 'Fri', fullAmharic: 'ዓርብ' },
  { shortAmharic: 'ቅዳሜ', shortEnglish: 'Sat', fullAmharic: 'ቅዳሜ' },
];

/**
 * Known fixed Ethiopian national and cultural tourism holidays (Month 1-13, Day 1-30)
 */
const FIXED_HOLIDAYS: Record<string, Omit<EthiopianHoliday, 'id'>> = {
  '1-1': {
    nameAmharic: 'እንቁጣጣሽ (አዲስ ዓመት)',
    nameEnglish: 'Enkutatash (Ethiopian New Year)',
    isPeakTourism: true,
    recommendedPriceSurgePercent: 35,
    description: 'National New Year celebrations and major family reunions across Ethiopia.',
  },
  '1-17': {
    nameAmharic: 'መስቀል (ደመራ)',
    nameEnglish: 'Meskel (Finding of True Cross)',
    isPeakTourism: true,
    recommendedPriceSurgePercent: 40,
    description: 'UNESCO World Heritage celebration. Massive tourism in Addis Ababa (Meskel Sq) & Gurage/North.',
  },
  '4-29': {
    nameAmharic: 'ገና (የገና በዓል)',
    nameEnglish: 'Genna (Ethiopian Christmas)',
    isPeakTourism: true,
    recommendedPriceSurgePercent: 50,
    description: 'Major global pilgrimage and high occupancy in Lalibela and across historical highlands.',
  },
  '5-11': {
    nameAmharic: 'ጥምቀት (ከተራ & ጥምቀት)',
    nameEnglish: 'Timkat (Ethiopian Epiphany)',
    isPeakTourism: true,
    recommendedPriceSurgePercent: 55,
    description: 'UNESCO Intangible Heritage. Peak annual tourism demand in Gondar, Lalibela, and Addis Ababa.',
  },
  '6-23': {
    nameAmharic: 'የአድዋ ድል በዓል',
    nameEnglish: 'Victory of Adwa',
    isPeakTourism: true,
    recommendedPriceSurgePercent: 25,
    description: 'National holiday celebrating the historic victory over colonial forces.',
  },
  '8-23': {
    nameAmharic: 'የሠራተኞች ቀን',
    nameEnglish: 'Labor Day',
    isPeakTourism: false,
    recommendedPriceSurgePercent: 15,
    description: 'Public holiday weekend.',
  },
  '8-27': {
    nameAmharic: 'የአርበኞች ቀን',
    nameEnglish: 'Patriots Victory Day',
    isPeakTourism: false,
    recommendedPriceSurgePercent: 15,
    description: 'National memorial day.',
  },
  '12-16': {
    nameAmharic: 'ቡሄ (ደብረ ታቦር)',
    nameEnglish: 'Buhe (Debre Tabor)',
    isPeakTourism: true,
    recommendedPriceSurgePercent: 20,
    description: 'Traditional cultural bonfire celebration and songs throughout Ethiopian cities and towns.',
  },
};

/**
 * Determines if an Ethiopian year is a leap year (Pagume has 6 days).
 * Ethiopian leap years occur when year % 4 === 3 (e.g. 2011, 2015, 2019 EC).
 */
export function isEthiopianLeapYear(ethYear: number): boolean {
  return (ethYear % 4) === 3;
}

/**
 * Calculates Julian Day Number (JDN) for a Gregorian date
 */
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Converts Julian Day Number (JDN) to Gregorian Date
 */
function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

/**
 * Converts JDN to Ethiopian Date
 * (Ethiopian epoch in JDN is 1723856, corresponding to Aug 29, 8 CE Julian)
 */
function jdnToEthiopian(jdn: number): { year: number; month: number; day: number } {
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - 1723856) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

/**
 * Converts Ethiopian Date to JDN
 */
function ethiopianToJdn(year: number, month: number, day: number): number {
  return (
    1723856 +
    365 * year +
    Math.floor(year / 4) +
    30 * (month - 1) +
    day -
    1
  );
}

/**
 * Converts any Gregorian Date to an EthiopianDate object
 */
export function gregorianToEthiopian(input: Date | string): EthiopianDate {
  let d: Date;
  if (typeof input === 'string') {
    // If format is YYYY-MM-DD
    const parts = input.split('-');
    if (parts.length === 3) {
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      d = new Date(input);
    }
  } else {
    d = input;
  }

  const jdn = gregorianToJdn(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const { year, month, day } = jdnToEthiopian(jdn);

  const monthMeta = ETHIOPIAN_MONTHS[month - 1] || {
    nameAmharic: 'ያልታወቀ',
    nameEnglish: 'Unknown',
  };

  const holidayKey = `${month}-${day}`;
  const rawHoliday = FIXED_HOLIDAYS[holidayKey] || null;
  const holiday = rawHoliday
    ? { ...rawHoliday, id: `eth-holiday-${holidayKey}` }
    : null;

  return {
    year,
    month,
    day,
    monthNameAmharic: monthMeta.nameAmharic,
    monthNameEnglish: monthMeta.nameEnglish,
    formattedAmharic: `${monthMeta.nameAmharic} ${day}, ${year} ዓ.ም`,
    formattedEnglish: `${monthMeta.nameEnglish} ${day}, ${year} E.C.`,
    holiday,
  };
}

/**
 * Converts an Ethiopian Date back to a Gregorian Date
 */
export function ethiopianToGregorian(
  year: number,
  month: number,
  day: number,
): Date {
  const jdn = ethiopianToJdn(year, month, day);
  const { year: gYear, month: gMonth, day: gDay } = jdnToGregorian(jdn);
  return new Date(gYear, gMonth - 1, gDay);
}

/**
 * Generates an informative span title for a given Gregorian year and month
 * Example: October 2026 -> "ጥቅምት / ኅዳር 2019 ዓ.ም (Tikimt / Hidar 2019 E.C.)"
 */
export function getEthiopianSpanForGregorianMonth(
  gregYear: number,
  gregMonthIndex: number, // 0 = Jan, 11 = Dec
): { amharic: string; english: string } {
  const firstDay = new Date(gregYear, gregMonthIndex, 1);
  const lastDay = new Date(gregYear, gregMonthIndex + 1, 0);

  const ethFirst = gregorianToEthiopian(firstDay);
  const ethLast = gregorianToEthiopian(lastDay);

  if (ethFirst.month === ethLast.month) {
    return {
      amharic: `${ethFirst.monthNameAmharic} ${ethFirst.year} ዓ.ም`,
      english: `${ethFirst.monthNameEnglish} ${ethFirst.year} E.C.`,
    };
  }

  if (ethFirst.year === ethLast.year) {
    return {
      amharic: `${ethFirst.monthNameAmharic} – ${ethLast.monthNameAmharic} ${ethFirst.year} ዓ.ም`,
      english: `${ethFirst.monthNameEnglish} – ${ethLast.monthNameEnglish} ${ethFirst.year} E.C.`,
    };
  }

  return {
    amharic: `${ethFirst.monthNameAmharic} ${ethFirst.year} – ${ethLast.monthNameAmharic} ${ethLast.year} ዓ.ም`,
    english: `${ethFirst.monthNameEnglish} ${ethFirst.year} – ${ethLast.monthNameEnglish} ${ethLast.year} E.C.`,
  };
}

export function formatDualDate(isoDate: string): string {
  try {
    const eth = gregorianToEthiopian(isoDate);
    const parts = isoDate.split('-');
    let gregFormatted = isoDate;
    if (parts.length === 3) {
      // Create local midnight date to prevent UTC timezone drift
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      gregFormatted = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return `${eth.formattedAmharic} (${gregFormatted})`;
  } catch {
    return isoDate;
  }
}
