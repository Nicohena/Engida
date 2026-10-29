/**
 * Ethiopian Location Normalization & Intelligence Engine.
 *
 * Establishes a canonical administrative hierarchy:
 * Country -> Region -> City -> Sub-city -> Neighborhood.
 *
 * Normalizes spelling variations, whitespace, and capitalization.
 * Assigns stable location reference codes and calculates strict hierarchical similarity.
 */

export interface NormalizedLocation {
  country: string;
  region: string;
  city: string;
  subCity: string | null;
  neighborhood: string | null;
  stableRef: string;
  isAddisAbaba: boolean;
}

export interface LocationInput {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  subCity?: string | null;
  neighborhood?: string | null;
}

/** Canonical Sub-cities for Addis Ababa (all 11 official sub-cities) */
export const ADDIS_SUB_CITIES = [
  'Bole',
  'Kirkos',
  'Nifas Silk-Lafto',
  'Yeka',
  'Arada',
  'Lideta',
  'Gullele',
  'Kolfe Keranio',
  'Akaky Kaliti',
  'Addis Ketema',
  'Lemi Kura',
] as const;

/** Canonical Ethiopian Regions & Charter Cities */
export const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Dire Dawa',
  'Oromia',
  'Amhara',
  'Sidama',
  'South Ethiopia',
  'Central Ethiopia',
  'Tigray',
  'Somali',
  'Afar',
  'Benishangul-Gumuz',
  'Gambela',
  'Harari',
] as const;

/** Known spelling variations and alias mappings */
const CITY_ALIASES: Record<string, { city: string; region: string }> = {
  'addis ababa': { city: 'Addis Ababa', region: 'Addis Ababa' },
  'addis abeba': { city: 'Addis Ababa', region: 'Addis Ababa' },
  'finfinne': { city: 'Addis Ababa', region: 'Addis Ababa' },
  'sheger': { city: 'Addis Ababa', region: 'Addis Ababa' },
  'bishoftu': { city: 'Bishoftu', region: 'Oromia' },
  'debre zeyit': { city: 'Bishoftu', region: 'Oromia' },
  'debrezeit': { city: 'Bishoftu', region: 'Oromia' },
  'debre zeyt': { city: 'Bishoftu', region: 'Oromia' },
  'hawassa': { city: 'Hawassa', region: 'Sidama' },
  'awassa': { city: 'Hawassa', region: 'Sidama' },
  'bahir dar': { city: 'Bahir Dar', region: 'Amhara' },
  'bahirdar': { city: 'Bahir Dar', region: 'Amhara' },
  'gondar': { city: 'Gondar', region: 'Amhara' },
  'gonder': { city: 'Gondar', region: 'Amhara' },
  'debre berhan': { city: 'Debre Berhan', region: 'Amhara' },
  'debreberhan': { city: 'Debre Berhan', region: 'Amhara' },
  'arba minch': { city: 'Arba Minch', region: 'South Ethiopia' },
  'arbaminch': { city: 'Arba Minch', region: 'South Ethiopia' },
  'mekelle': { city: 'Mekelle', region: 'Tigray' },
  'mekele': { city: 'Mekelle', region: 'Tigray' },
  'dire dawa': { city: 'Dire Dawa', region: 'Dire Dawa' },
  'diredawa': { city: 'Dire Dawa', region: 'Dire Dawa' },
  'jimma': { city: 'Jimma', region: 'Oromia' },
};

const SUB_CITY_ALIASES: Record<string, string> = {
  'bole': 'Bole',
  'kirkos': 'Kirkos',
  'cherkos': 'Kirkos',
  'nifas silk': 'Nifas Silk-Lafto',
  'nefas silk': 'Nifas Silk-Lafto',
  'nifas silk-lafto': 'Nifas Silk-Lafto',
  'nifas silk lafto': 'Nifas Silk-Lafto',
  'yeka': 'Yeka',
  'arada': 'Arada',
  'lideta': 'Lideta',
  'gullele': 'Gullele',
  'gulele': 'Gullele',
  'kolfe': 'Kolfe Keranio',
  'kolfe keranio': 'Kolfe Keranio',
  'akaky kaliti': 'Akaky Kaliti',
  'akaki kality': 'Akaky Kaliti',
  'kality': 'Akaky Kaliti',
  'addis ketema': 'Addis Ketema',
  'lemi kura': 'Lemi Kura',
  'lemikura': 'Lemi Kura',
};

const NEIGHBORHOOD_ALIASES: Record<string, { neighborhood: string; subCity?: string }> = {
  'medhanialem': { neighborhood: 'Bole Medhanialem', subCity: 'Bole' },
  'medhanealem': { neighborhood: 'Bole Medhanialem', subCity: 'Bole' },
  'bole medhanialem': { neighborhood: 'Bole Medhanialem', subCity: 'Bole' },
  'atlas': { neighborhood: 'Atlas', subCity: 'Bole' },
  'rwanda': { neighborhood: 'Rwanda', subCity: 'Bole' },
  'gerji': { neighborhood: 'Gerji', subCity: 'Bole' },
  'bole brass': { neighborhood: 'Bole Brass', subCity: 'Bole' },
  'kazanchis': { neighborhood: 'Kazanchis', subCity: 'Kirkos' },
  'kasanchis': { neighborhood: 'Kazanchis', subCity: 'Kirkos' },
  'meskel square': { neighborhood: 'Meskel Square', subCity: 'Kirkos' },
  'sarbet': { neighborhood: 'Sarbet', subCity: 'Kirkos' },
  'sar bet': { neighborhood: 'Sarbet', subCity: 'Kirkos' },
  'old airport': { neighborhood: 'Old Airport', subCity: 'Nifas Silk-Lafto' },
  'oldairport': { neighborhood: 'Old Airport', subCity: 'Nifas Silk-Lafto' },
  'bisrate gabriel': { neighborhood: 'Bisrate Gabriel', subCity: 'Nifas Silk-Lafto' },
  'cmc': { neighborhood: 'CMC', subCity: 'Yeka' },
  'ayat': { neighborhood: 'Ayat', subCity: 'Yeka' },
  'summit': { neighborhood: 'Summit', subCity: 'Yeka' },
  'megenagna': { neighborhood: 'Megenagna', subCity: 'Yeka' },
  'piazza': { neighborhood: 'Piazza', subCity: 'Arada' },
  'piassa': { neighborhood: 'Piazza', subCity: 'Arada' },
  'sidist kilo': { neighborhood: 'Sidist Kilo', subCity: 'Arada' },
  'mexico': { neighborhood: 'Mexico', subCity: 'Lideta' },
  'shiro meda': { neighborhood: 'Shiro Meda', subCity: 'Gullele' },
  'kuriftu': { neighborhood: 'Kuriftu' },
  'babogaya': { neighborhood: 'Babogaya' },
};

export class LocationNormalizer {
  /**
   * Cleans and normalizes input strings: trims whitespace, lowercases, handles internal spacing.
   */
  private static cleanText(text?: string | null): string {
    if (!text) return '';
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Title-cases words properly (e.g. "addis ababa" -> "Addis Ababa").
   */
  private static titleCase(text: string): string {
    if (!text) return '';
    return text
      .split(' ')
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');
  }

  /**
   * Normalizes raw location inputs into a structured, validated Ethiopian location hierarchy.
   */
  public static normalize(input: LocationInput): NormalizedLocation {
    const rawCity = this.cleanText(input.city);
    let rawSubCity = this.cleanText(input.subCity);
    let rawNeighborhood = this.cleanText(input.neighborhood);
    let rawRegion = this.cleanText(input.region);

    if (!rawCity) {
      return {
        country: 'Ethiopia',
        region: rawRegion ? this.titleCase(rawRegion) : 'Unknown',
        city: 'Unknown',
        subCity: rawSubCity ? this.titleCase(rawSubCity) : null,
        neighborhood: rawNeighborhood ? this.titleCase(rawNeighborhood) : null,
        stableRef: 'ET-UNK-GEN-GEN',
        isAddisAbaba: false,
      };
    }

    // 1. Resolve canonical city and region
    let canonicalCity = 'Addis Ababa';
    let canonicalRegion = 'Addis Ababa';

    if (CITY_ALIASES[rawCity]) {
      canonicalCity = CITY_ALIASES[rawCity].city;
      canonicalRegion = CITY_ALIASES[rawCity].region;
    } else {
      // Partial matching for city
      const matchedAlias = Object.keys(CITY_ALIASES).find((alias) => rawCity.includes(alias));
      if (matchedAlias) {
        canonicalCity = CITY_ALIASES[matchedAlias].city;
        canonicalRegion = CITY_ALIASES[matchedAlias].region;
      } else {
        canonicalCity = this.titleCase(rawCity);
        canonicalRegion = rawRegion ? this.titleCase(rawRegion) : 'Ethiopia';
      }
    }

    const isAddis = canonicalCity === 'Addis Ababa';

    // 2. Resolve neighborhood aliases (e.g. if host entered "Atlas", deduce Bole)
    let canonicalNeighborhood: string | null = null;
    if (rawNeighborhood) {
      if (NEIGHBORHOOD_ALIASES[rawNeighborhood]) {
        canonicalNeighborhood = NEIGHBORHOOD_ALIASES[rawNeighborhood].neighborhood;
        if (!rawSubCity && NEIGHBORHOOD_ALIASES[rawNeighborhood].subCity) {
          rawSubCity = NEIGHBORHOOD_ALIASES[rawNeighborhood].subCity!.toLowerCase();
        }
      } else {
        canonicalNeighborhood = this.titleCase(rawNeighborhood);
      }
    }

    // 3. Resolve canonical sub-city
    let canonicalSubCity: string | null = null;
    if (rawSubCity) {
      if (SUB_CITY_ALIASES[rawSubCity]) {
        canonicalSubCity = SUB_CITY_ALIASES[rawSubCity];
      } else {
        const matchedSubCity = Object.keys(SUB_CITY_ALIASES).find((alias) => rawSubCity.includes(alias));
        if (matchedSubCity) {
          canonicalSubCity = SUB_CITY_ALIASES[matchedSubCity];
        } else {
          canonicalSubCity = this.titleCase(rawSubCity);
        }
      }
    }

    // 4. Stable location reference code (e.g. "ET-ADD-BOL-MED")
    const cityCode = canonicalCity.replace(/\s+/g, '').slice(0, 3).toUpperCase();
    const subCityCode = canonicalSubCity ? canonicalSubCity.replace(/\s+/g, '').slice(0, 3).toUpperCase() : 'GEN';
    const neighCode = canonicalNeighborhood ? canonicalNeighborhood.replace(/\s+/g, '').slice(0, 3).toUpperCase() : 'GEN';
    const stableRef = `ET-${cityCode}-${subCityCode}-${neighCode}`;

    return {
      country: 'Ethiopia',
      region: canonicalRegion,
      city: canonicalCity,
      subCity: canonicalSubCity,
      neighborhood: canonicalNeighborhood,
      stableRef,
      isAddisAbaba: isAddis,
    };
  }

  /**
   * Calculates strict geographic similarity between target location and a comparable candidate.
   * Never matches across different cities (e.g. Piazza in Addis Ababa vs Piazza in Hawassa = 0.0).
   *
   * @returns 1.0 (Same neighborhood), 0.85 (Same sub-city), 0.45 (Same city, different sub-city), 0.0 (Different city).
   */
  public static calculateSimilarity(targetInput: LocationInput, candidateInput: LocationInput): number {
    const target = this.normalize(targetInput);
    const candidate = this.normalize(candidateInput);

    // Strict boundary: Different or unknown cities have zero geographic similarity
    if (
      target.city === 'Unknown' ||
      candidate.city === 'Unknown' ||
      target.city.toLowerCase() !== candidate.city.toLowerCase()
    ) {
      return 0.0;
    }

    // Both in same city
    // If both have sub-cities and they match
    const subCityMatch =
      target.subCity &&
      candidate.subCity &&
      target.subCity.toLowerCase() === candidate.subCity.toLowerCase();

    // If both have neighborhoods and they match
    const neighborhoodMatch =
      target.neighborhood &&
      candidate.neighborhood &&
      target.neighborhood.toLowerCase() === candidate.neighborhood.toLowerCase();

    if (subCityMatch && neighborhoodMatch) {
      return 1.0; // Same neighborhood in same sub-city
    }

    if (subCityMatch) {
      return 0.85; // Same sub-city
    }

    if (neighborhoodMatch) {
      return 0.90; // Same neighborhood (e.g. Kazanchis without subcity explicitly typed)
    }

    // Same city, but different or unknown sub-city
    return 0.45;
  }
}

