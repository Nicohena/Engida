'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { Property } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import ReportDialog from '@/components/reports/ReportDialog';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

// Curated luxury architectural properties from the Stitch design catalog
interface DetailedProperty {
  id: string;
  title: string;
  location: string;
  subLocation: string;
  country: string;
  city: string;
  details: string;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  dates: string;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  currency: string;
  badge?: string;
  isSuperhost?: boolean;
  instantBook?: boolean;
  category: string;
  description: string;
  host: {
    name: string;
    avatar: string;
    isSuperhost: boolean;
    joinedYear: number;
    responseRate: string;
  };
  highlights: {
    title: string;
    description: string;
    icon: string;
  }[];
  amenities: {
    name: string;
    icon: string;
    category: string;
  }[];
  sleepingArrangements: {
    room: string;
    bed: string;
    icon: string;
  }[];
  reviews: {
    id?: string;
    authorId?: string;
    author: string;
    date: string;
    rating: number;
    avatar: string;
    comment: string;
  }[];
  images: string[];
}

const CURATED_DETAILS: Record<string, DetailedProperty> = {
  'stitch-1': {
    id: 'stitch-1',
    title: 'The Glass Pavilion at Big Sur',
    location: 'Big Sur, California',
    subLocation: 'Pacific Coast Highway Panorama',
    city: 'Big Sur',
    country: 'United States',
    details: '6 guests · 3 bedrooms · 4 beds · 3 baths',
    guests: 6,
    bedrooms: 3,
    beds: 4,
    baths: 3,
    dates: 'Oct 12 – 17',
    rating: 4.98,
    reviewsCount: 142,
    pricePerNight: 580,
    currency: '$',
    badge: 'Superhost',
    isSuperhost: true,
    instantBook: true,
    category: 'architectural',
    description:
      'Suspended dramatically over the dramatic Pacific coastline, The Glass Pavilion is a masterclass in modern brutalist restraint and organic transparency. Floor-to-ceiling ultra-clear structural glass walls dissolve the boundary between cantilevered living pavilions and the crashing ocean spray below. Crafted with locally quarried slate stone, hand-finished cedar joinery, and an oceanfront cantilevered infinity plunge pool that appears to merge seamlessly into the horizon.',
    host: {
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isSuperhost: true,
      joinedYear: 2019,
      responseRate: '100% within an hour',
    },
    highlights: [
      {
        title: 'Architectural Digest Icon',
        description: 'Featured in Global Architectural Monographs 2024 for cantilevered residential design.',
        icon: 'architecture',
      },
      {
        title: 'Heated Oceanfront Plunge Pool',
        description: 'Year-round 38°C saltwater infinity pool overlooking the whale migration corridor.',
        icon: 'pool',
      },
      {
        title: 'Seamless Self Check-in',
        description: 'Arrive at your leisure with secure private electronic gate and smart lock entry.',
        icon: 'key',
      },
    ],
    sleepingArrangements: [
      { room: 'Primary Sanctuary', bed: '1 King Bed · Ocean Vista', icon: 'king_bed' },
      { room: 'Cantilever Suite', bed: '1 Queen Bed · Canyon View', icon: 'single_bed' },
      { room: 'Garden Pavilion', bed: '2 Twin Beds · Private Terrace', icon: 'bed' },
    ],
    amenities: [
      { name: 'Cantilevered infinity pool', icon: 'pool', category: 'Scenic & Wellness' },
      { name: 'Panoramic Pacific ocean views', icon: 'visibility', category: 'Scenic & Wellness' },
      { name: 'Private cedar dry sauna', icon: 'hot_tub', category: 'Scenic & Wellness' },
      { name: 'Chef-grade Miele kitchen', icon: 'soup_kitchen', category: 'Kitchen & Dining' },
      { name: 'Starlink Ultra-fast WiFi (220 Mbps)', icon: 'wifi', category: 'Work & Connectivity' },
      { name: 'Wood-burning indoor stone hearth', icon: 'fireplace', category: 'Comfort' },
      { name: 'Sonos Architectural audio throughout', icon: 'speaker', category: 'Entertainment' },
      { name: 'Level 2 EV vehicle charging', icon: 'electric_car', category: 'Parking & Facilities' },
    ],
    reviews: [
      {
        author: 'Marcus Vance',
        date: 'September 2024',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        comment:
          'Easily the most breathtaking residential experience on the California coast. Watching the sunset from the glass living room while the stone fireplace crackles is something we will never forget.',
      },
      {
        author: 'Amara Selassie',
        date: 'August 2024',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
        comment:
          'Impeccable architectural craft. Every corner, from the linen curtains to the bespoke stone basins, feels quiet, deliberate, and luxuriously serene. Elena is an exceptional host.',
      },
    ],
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAPM4jx02eqhhbSUpV7SAtgWiPPvbcycxQ_otuQ8FpvWgaF9SvBJDqgovycPBbbllSPoSzUT3NiwTqE3mj3m9WsXixzZ3fyBO9YHCvBzcshHCRYji650QWGZLZZXKOLN5Rw8XKocpkc847Nm94EYfphKVn5MgFMsSch_LR94qimX1rBgdcm8FznTKWWsSOrNwiuGdMwpH0AxV_SiXn-W2T_XIjnSiSeks4OW7UTU_GrBXzSt1K-JD0s',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'eth-1': {
    id: 'eth-1',
    title: 'Bole Skyline Penthouse',
    location: 'Addis Ababa, Ethiopia',
    subLocation: 'Central Bole Diplomatic Zone',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    details: '4 guests · 2 bedrooms · 2 beds · 2.5 baths',
    guests: 4,
    bedrooms: 2,
    beds: 2,
    baths: 2.5,
    dates: 'Nov 12 – 18',
    rating: 4.97,
    reviewsCount: 52,
    pricePerNight: 180,
    currency: '$',
    badge: 'Guest Favorite',
    isSuperhost: true,
    instantBook: true,
    category: 'penthouses',
    description:
      'Perched atop one of Bole’s premier contemporary residences, this penthouse pairs mid-century Ethiopian art collections with panoramic floor-to-ceiling vistas across the Addis Ababa skyline and the surrounding Entoto mountain range. Features polished terrazzo floors, custom eucalyptus furniture by local craftsmen, and a sunset terrace made for enjoying single-origin Yirgacheffe roasts.',
    host: {
      name: 'Dawit Mengistu',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      isSuperhost: true,
      joinedYear: 2021,
      responseRate: '100% within an hour',
    },
    highlights: [
      {
        title: '360° Panoramic Capital Views',
        description: 'Unobstructed mountain sunrises and twinkling nocturnal skyline vistas.',
        icon: 'mountain_flag',
      },
      {
        title: 'Curated Ethiopian Fine Art',
        description: 'Original paintings and hand-carved woodwork by celebrated contemporary artisans.',
        icon: 'palette',
      },
      {
        title: 'Dedicated Work & Espresso Bar',
        description: 'Dual-monitor ergonomic desk with local high-altitude single origin coffee beans included.',
        icon: 'coffee',
      },
    ],
    sleepingArrangements: [
      { room: 'Master Panoramic Suite', bed: '1 King Bed · Mountain Vista', icon: 'king_bed' },
      { room: 'Executive Skyline Room', bed: '1 Queen Bed · City View', icon: 'single_bed' },
    ],
    amenities: [
      { name: 'Wraparound skyline balcony', icon: 'balcony', category: 'Outdoor' },
      { name: 'Ultra-fast fiber broadband (150 Mbps)', icon: 'wifi', category: 'Work' },
      { name: 'Full backup solar & generator power', icon: 'bolt', category: 'Essentials' },
      { name: 'Italian espresso bar & grinder', icon: 'coffee', category: 'Dining' },
      { name: '24/7 Diplomatic building security', icon: 'security', category: 'Safety' },
      { name: 'Secure underground parking', icon: 'local_parking', category: 'Facilities' },
    ],
    reviews: [
      {
        author: 'Sarah Jenkins',
        date: 'October 2024',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        comment:
          'The most stylish and comfortable apartment in Addis Ababa. The location in Bole is walking distance to top restaurants, and the sunset from the terrace is pure magic.',
      },
    ],
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'eth-2': {
    id: 'eth-2',
    title: 'Kuriftu Lakefront Haven',
    location: 'Bishoftu, Ethiopia',
    subLocation: 'Crater Lake Vista',
    city: 'Bishoftu',
    country: 'Ethiopia',
    details: '6 guests · 3 bedrooms · 3 beds · 3 baths',
    guests: 6,
    bedrooms: 3,
    beds: 3,
    baths: 3,
    dates: 'Dec 4 – 10',
    rating: 4.94,
    reviewsCount: 88,
    pricePerNight: 260,
    currency: '$',
    badge: 'Superhost',
    isSuperhost: true,
    instantBook: true,
    category: 'lakefront',
    description:
      'Immerse yourself in tranquil crater lake breezes just an hour south of the capital. This private architectural retreat features thatched high timber ceilings, dry-stacked volcanic stone terraces, and an infinity plunge pool perched over Lake Kuriftu. Awaken to bird calls over the volcanic water and spend evenings around a sunken lakeside stone firepit.',
    host: {
      name: 'Tseday Haile',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      isSuperhost: true,
      joinedYear: 2020,
      responseRate: '100% within 30 minutes',
    },
    highlights: [
      {
        title: 'Direct Volcanic Crater Lake Waterway',
        description: 'Private wooden pier with wooden kayaks and sunset boat access.',
        icon: 'houseboat',
      },
      {
        title: 'Heated Infinity Plunge Pool',
        description: 'Seamless glass boundary looking down into the calm crater waters.',
        icon: 'pool',
      },
      {
        title: 'Sunken Outdoor Stone Firepit',
        description: 'Gather under ancient acacia canopies for evening stargazing.',
        icon: 'fireplace',
      },
    ],
    sleepingArrangements: [
      { room: 'Lakefront Master Bungalow', bed: '1 King Bed · Lake Overlook', icon: 'king_bed' },
      { room: 'Volcanic Stone Pavilion', bed: '1 Queen Bed · Garden View', icon: 'single_bed' },
      { room: 'Acacia Loft', bed: '1 Queen Bed · Private Balcony', icon: 'single_bed' },
    ],
    amenities: [
      { name: 'Private crater lake pier', icon: 'houseboat', category: 'Outdoors' },
      { name: 'Heated infinity plunge pool', icon: 'pool', category: 'Wellness' },
      { name: 'Outdoor lakeside dining pergola', icon: 'deck', category: 'Dining' },
      { name: 'Kayaks & life vests included', icon: 'kayaking', category: 'Activities' },
      { name: 'High-speed Starlink WiFi', icon: 'wifi', category: 'Connectivity' },
      { name: 'Dedicated private security guard', icon: 'security', category: 'Safety' },
    ],
    reviews: [
      {
        author: 'Bereket Alemayehu',
        date: 'October 2024',
        rating: 5,
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
        comment:
          'Absolute sanctuary. The calm of Lake Kuriftu, the architecture blending with nature, and the hospitality were world-class. We will be back every season.',
      },
    ],
    images: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
};

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || 'stitch-1';

  const [property, setProperty] = useState<DetailedProperty | null>(() => {
    return CURATED_DETAILS[id] || CURATED_DETAILS['stitch-1'] || null;
  });
  const [loading, setLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<number | null>(null);
  const [reportListingOpen, setReportListingOpen] = useState(false);
  const [reportReview, setReportReview] = useState<{ id: string; author: string } | null>(null);

  // Message Host Modal state
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [hostMessage, setHostMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  // Booking widget interactive state
  const [checkIn, setCheckIn] = useState('2026-11-15');
  const [checkOut, setCheckOut] = useState('2026-11-20');
  const [guests, setGuests] = useState(2);
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);

  useEffect(() => {
    // 1. First check if it matches our rich curated catalogue
    if (CURATED_DETAILS[id]) {
      setProperty(CURATED_DETAILS[id]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 2. Otherwise query backend API
    apiFetch<Property>(`/properties/${id}`, { skipAuth: true })
      .then((data) => {
        // Adapt backend Property model into rich view model
        const adapted: DetailedProperty = {
          id: data.id,
          title: data.title,
          location: `${data.city}, ${data.country}`,
          subLocation: data.address || `${data.city} neighborhood`,
          city: data.city,
          country: data.country,
          details: `${data.maxGuests || 4} guests · ${data.bedrooms || 2} bedrooms · ${data.bedrooms || 2} beds · ${data.bathrooms || 2} baths`,
          guests: data.maxGuests || 4,
          bedrooms: data.bedrooms || 2,
          beds: data.bedrooms || 2,
          baths: data.bathrooms || 2,
          dates: 'Available this season',
          rating: 4.95,
          reviewsCount: data.reviews?.length || 24,
          pricePerNight: Number(data.pricePerNight) || 250,
          currency: 'ETB',
          isSuperhost: true,
          instantBook: true,
          category: data.propertyType?.toLowerCase() || 'architectural',
          description: data.description || 'A serene architectural property crafted for restorative living.',
          host: {
            name: data.host?.name || 'Verified Engida Host',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            isSuperhost: true,
            joinedYear: 2022,
            responseRate: '100% within an hour',
          },
          highlights: [
            {
              title: 'Architectural Excellence',
              description: 'Designed to harmonize interior light with panoramic landscape vistas.',
              icon: 'architecture',
            },
            {
              title: 'Self Check-in',
              description: 'Seamless arrival with digital keypad lockbox.',
              icon: 'key',
            },
          ],
          sleepingArrangements: [
            { room: 'Primary Bedroom', bed: '1 King Bed', icon: 'king_bed' },
            { room: 'Guest Bedroom', bed: '1 Queen Bed', icon: 'single_bed' },
          ],
          amenities: (data.amenities || []).map((a) => ({
            name: typeof a === 'string' ? a : a.name || 'Verified amenity',
            icon: 'check_circle',
            category: 'Features',
          })),
          reviews: (data.reviews || []).map((r) => ({
            id: r.id,
            authorId: r.user?.id,
            author: r.user?.name || 'Curated Traveler',
            date: 'Recent Stay',
            rating: r.rating || 5,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            comment: r.comment || 'Remarkable property. Clean, tranquil, and exceeds expectations.',
          })),
          images: data.images && data.images.length > 0 ? data.images : [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          ],
        };
        setProperty(adapted);
      })
      .catch(() => {
        // Fallback gracefully to default premier property
        setProperty(CURATED_DETAILS['stitch-1']);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Pricing math & nights calculation based on selected dates
  const nightsCount = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [checkIn, checkOut]);

  const nightlyPrice = property?.pricePerNight || 350;
  const subtotal = nightlyPrice * nightsCount;
  const cleaningFee = useMemo(() => {
    if (nightsCount < 1) return 0;
    return property?.currency?.toUpperCase() === 'ETB' ? 750 : 65;
  }, [nightsCount, property?.currency]);
  const serviceFee = nightsCount > 0 ? Math.round(subtotal * 0.12) : 0;
  const totalPrice = subtotal + cleaningFee + serviceFee;

  // Booking & messaging states
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const { user } = useAuth();

  const openListingReport = () => {
    if (!property || !isUuid(property.id)) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/properties/${id}`)}`);
      return;
    }
    setReportListingOpen(true);
  };

  const openReviewReport = (reviewId: string, author: string) => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/properties/${id}`)}`);
      return;
    }
    setReportReview({ id: reviewId, author });
  };

  const handleBooking = async () => {
    if (nightsCount < 1 || !property) return;
    setBookingError(null);

    // If user is unauthenticated, redirect to login with safe returnUrl
    if (!user) {
      router.push(`/auth/login?returnUrl=/properties/${id}`);
      return;
    }

    setIsBookingLoading(true);
    try {
      if (isUuid(property.id)) {
        await apiFetch('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            propertyId: property.id,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            guestCount: guests,
          }),
        });
      }
      setIsBookingSuccess(true);
      setTimeout(() => {
        setIsBookingSuccess(false);
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit reservation request';
      setBookingError(msg);
    } finally {
      setIsBookingLoading(false);
    }
  };

  const openPhotoModal = (targetIndex: number) => {
    const imagesCount = property?.images?.length || 1;
    const maxIdx = Math.max(0, imagesCount - 1);
    setActivePhotoModal(Math.min(targetIndex, maxIdx));
  };

  if (loading || !property) {
    return (
      <div className="min-h-screen bg-[#faf5ee] flex flex-col font-body">
        <AppHeader />
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-10 w-full animate-pulse">
          <div className="h-8 w-96 bg-white/70 rounded-xl mb-4" />
          <div className="h-4 w-64 bg-white/50 rounded-lg mb-8" />
          <div className="w-full aspect-[21/9] bg-white/60 rounded-3xl" />
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf5ee] text-[#3a302a] flex flex-col font-body selection:bg-[#c2652a]/20 selection:text-[#3a302a]">
      <AppHeader />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 w-full flex-1">
        {/* Breadcrumb Navigation & Action Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#605850] hover:text-[#c2652a] transition-colors group active:scale-95"
          >
            <span className="material-symbols-outlined text-base transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            <span>Back to stays</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: property.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Listing link copied to clipboard!');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#d8d0c8]/60 text-xs font-semibold text-[#3a302a] hover:bg-[#f2ece4] hover:text-[#c2652a] transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWishlisted((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#d8d0c8]/60 text-xs font-semibold text-[#3a302a] hover:bg-[#f2ece4] transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <span
                className={`material-symbols-outlined text-sm transition-colors ${
                  isWishlisted ? 'material-symbols-fill text-[#c2652a]' : 'text-[#605850]'
                }`}
              >
                favorite
              </span>
              <span>{isWishlisted ? 'Saved' : 'Save'}</span>
            </button>

            {isUuid(property.id) && (
              <button
                type="button"
                onClick={openListingReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#d8d0c8]/60 text-xs font-semibold text-[#3a302a] hover:bg-[#f2ece4] hover:text-[#a84d16] transition active:scale-95 shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">flag</span>
                <span>Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Title & Headline Section */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-headline text-[#3a302a] tracking-tight leading-[1.15]">
            {property.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs sm:text-sm text-[#605850]">
            <div className="flex items-center gap-1 font-semibold text-[#3a302a]">
              <span className="text-[#a84d16] material-symbols-outlined material-symbols-fill text-base">star</span>
              <span>{property.rating}</span>
              <span className="text-[#605850] font-normal underline cursor-pointer ml-0.5">
                ({property.reviewsCount} reviews)
              </span>
            </div>

            {property.isSuperhost && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1 text-[#a84d16] font-semibold">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Superhost
                </span>
              </>
            )}

            {property.badge && (
              <>
                <span>&middot;</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f2ece4] text-[#a84d16] font-semibold text-xs border border-[#d8d0c8]/50">
                  {property.badge}
                </span>
              </>
            )}

            <span>&middot;</span>
            <span className="underline cursor-pointer hover:text-[#a84d16] transition-colors">
              {property.location}
            </span>
          </div>
        </div>

        {/* 5-Photo Architectural Showcase Mosaic */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-3.5 h-[360px] sm:h-[460px] md:h-[520px] rounded-2xl sm:rounded-3xl overflow-hidden relative group">
            {/* Primary Hero Image (Takes Left 2 Columns) */}
            <div
              className="md:col-span-2 relative h-full overflow-hidden cursor-pointer"
              onClick={() => openPhotoModal(0)}
            >
              <img
                src={property.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>

            {/* Sub-photo 1 */}
            <div
              className="hidden md:block relative h-full overflow-hidden cursor-pointer"
              onClick={() => openPhotoModal(1)}
            >
              <img
                src={property.images[1] || property.images[0]}
                alt="Interior view 1"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>

            {/* Sub-photo 2 & 3 Stacked in Column 4 */}
            <div className="hidden md:flex flex-col gap-3.5 h-full">
              <div
                className="relative h-1/2 overflow-hidden cursor-pointer"
                onClick={() => openPhotoModal(2)}
              >
                <img
                  src={property.images[2] || property.images[0]}
                  alt="Interior view 2"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div
                className="relative h-1/2 overflow-hidden cursor-pointer"
                onClick={() => openPhotoModal(3)}
              >
                <img
                  src={property.images[3] || property.images[0]}
                  alt="Interior view 3"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </div>

            {/* "Show all photos" Pill Button */}
            <button
              type="button"
              onClick={() => openPhotoModal(0)}
              className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 backdrop-blur-md text-[#3a302a] text-xs font-semibold hover:bg-white transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer font-body"
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              <span>View all {property.images.length} photos</span>
            </button>
          </div>
        </section>

        {/* 2-Column Content Grid: Left Story + Right Sticky Reservation Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-start">
          {/* Left Column (8 cols): Story, Details, Amenities & Reviews */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-10">
            {/* Space Overview & Host Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#d8d0c8]/60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#c2652a]/30 shadow-xs shrink-0">
                  <img
                    src={property.host.avatar}
                    alt={property.host.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold font-headline text-[#3a302a] text-balance">
                    Entire architectural sanctuary hosted by {property.host.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#605850]">
                    {property.details} &middot; Superhost since {property.host.joinedYear}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMessageSent(false);
                  setMessageModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8d0c8] bg-white hover:bg-[#f2ece4] text-[#3a302a] text-xs font-semibold transition active:scale-95 shadow-2xs cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-base text-[#a84d16]">chat_bubble</span>
                <span>Message Host</span>
              </button>
            </div>

            {/* Highlights List */}
            <div className="flex flex-col gap-6 pb-8 border-b border-[#d8d0c8]/60">
              {property.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#f2ece4] text-[#c2652a] flex items-center justify-center shrink-0 border border-[#d8d0c8]/50 shadow-2xs">
                    <span className="material-symbols-outlined text-xl">{h.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#3a302a] leading-tight text-balance">
                      {h.title}
                    </h3>
                    <p className="text-sm text-[#605850] mt-1 leading-relaxed max-w-[55ch] text-pretty">
                      {h.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Architectural Narrative ("About this space") */}
            <div className="pb-8 border-b border-[#d8d0c8]/60">
              <h2 className="text-2xl font-bold font-headline text-[#3a302a] mb-4 text-balance">
                About this sanctuary
              </h2>
              <p className="text-base text-[#3a302a] leading-relaxed font-normal whitespace-pre-line max-w-[58ch] text-pretty">
                {property.description}
              </p>
            </div>

            {/* Where you'll sleep (Bedrooms) */}
            <div className="pb-8 border-b border-[#d8d0c8]/60">
              <h2 className="text-2xl font-bold font-headline text-[#3a302a] mb-5 text-balance">
                Where you&apos;ll sleep
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {property.sleepingArrangements.map((item, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-white border border-[#d8d0c8]/80 shadow-[0_2px_12px_rgba(58,48,42,0.04)] flex flex-col justify-between"
                  >
                    <span className="material-symbols-outlined text-[#a84d16] text-2xl mb-3">
                      {item.icon}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-[#3a302a] text-balance">{item.room}</h3>
                      <p className="text-xs text-[#605850] mt-1">{item.bed}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities Grid */}
            <div className="pb-8 border-b border-[#d8d0c8]/60">
              <h2 className="text-2xl font-bold font-headline text-[#3a302a] mb-5 text-balance">
                What this place offers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                {property.amenities.map((amenity, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-[#3a302a]">
                    <span className="material-symbols-outlined text-[#a84d16] text-xl">
                      {amenity.icon}
                    </span>
                    <span>{amenity.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Reviews Section */}
            <div className="pb-8">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined material-symbols-fill text-[#a84d16] text-2xl">
                  star
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-headline text-[#3a302a] text-balance">
                  {property.rating} · {property.reviewsCount} reviews
                </h2>
              </div>

              {/* Sub-ratings Breakdown (Editorial divider layout) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 py-5 px-1 border-y border-[#d8d0c8]/70">
                <div>
                  <p className="text-xs font-semibold text-[#605850]">Cleanliness</p>
                  <p className="text-lg font-bold text-[#3a302a]">5.0</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#605850]">Accuracy</p>
                  <p className="text-lg font-bold text-[#3a302a]">4.9</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#605850]">Communication</p>
                  <p className="text-lg font-bold text-[#3a302a]">5.0</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#605850]">Location</p>
                  <p className="text-lg font-bold text-[#3a302a]">4.9</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#605850]">Check-in</p>
                  <p className="text-lg font-bold text-[#3a302a]">5.0</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#605850]">Value</p>
                  <p className="text-lg font-bold text-[#3a302a]">4.9</p>
                </div>
              </div>

              {/* Review Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {property.reviews.map((rev, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl bg-white border border-[#d8d0c8]/80 shadow-[0_2px_12px_rgba(58,48,42,0.04)] flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={rev.avatar}
                        alt={rev.author}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-[#3a302a] text-balance">{rev.author}</h3>
                        <p className="text-xs text-[#605850]">{rev.date}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[#3a302a] leading-relaxed italic text-pretty max-w-[65ch]">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                    {rev.id && rev.authorId !== user?.id && (
                      <div className="mt-3 flex justify-end border-t border-[#d8d0c8]/50 pt-3">
                        <button
                          type="button"
                          onClick={() => openReviewReport(rev.id as string, rev.author)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#605850] transition hover:text-[#a84d16]"
                        >
                          <span className="material-symbols-outlined text-sm">flag</span>
                          Report review
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Sticky Reservation Card */}
          <aside className="lg:col-span-5 xl:col-span-4 sticky top-28">
            <div className="bg-white rounded-3xl border border-[#d8d0c8] p-6 sm:p-8 shadow-[0_12px_40px_rgba(58,48,42,0.08)]">
              {/* Price & Rating Header */}
              <div className="flex items-baseline justify-between mb-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold font-headline text-[#3a302a]">
                    {property.currency}{property.pricePerNight}
                  </span>
                  <span className="text-sm text-[#605850] font-normal">/ night</span>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-[#3a302a]">
                  <span className="text-[#a84d16] material-symbols-outlined material-symbols-fill text-sm">star</span>
                  <span>{property.rating}</span>
                  <span className="text-[#605850]">({property.reviewsCount})</span>
                </div>
              </div>

              {/* Date & Guests Selection Grid (Border-less tint to avoid nested cards) */}
              <div className="bg-[#faf5ee]/70 rounded-2xl p-4 mb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#d8d0c8]/70">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#605850]">
                      Check-in
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-[#3a302a] focus:outline-none cursor-pointer mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#605850]">
                      Checkout
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-[#3a302a] focus:outline-none cursor-pointer mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#605850]">
                      Guests
                    </label>
                    <span className="text-xs font-semibold text-[#3a302a]">
                      {guests} {guests === 1 ? 'guest' : 'guests'} (max {property.guests})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={guests <= 1}
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs font-bold text-[#3a302a] hover:bg-[#ede4d8] disabled:opacity-30 cursor-pointer shadow-2xs"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      disabled={guests >= property.guests}
                      onClick={() => setGuests((g) => Math.min(property.guests, g + 1))}
                      className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs font-bold text-[#3a302a] hover:bg-[#ede4d8] disabled:opacity-30 cursor-pointer shadow-2xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Reserve Button */}
              <button
                type="button"
                disabled={nightsCount < 1 || isBookingLoading}
                onClick={handleBooking}
                className="w-full py-4 px-4 rounded-xl bg-[#b2531b] hover:bg-[#994413] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-[#b2531b]/25 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                {isBookingLoading ? (
                  <span>Processing Reservation...</span>
                ) : (
                  <>
                    <span>{nightsCount < 1 ? 'Select valid dates' : 'Reserve this Stay'}</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </>
                )}
              </button>

              {/* Message Host Secondary Action Button */}
              <button
                type="button"
                onClick={() => {
                  setMessageSent(false);
                  setMessageModalOpen(true);
                }}
                className="w-full mt-2.5 py-3 px-4 rounded-xl bg-[#faf5ee] hover:bg-[#ede4d8] text-[#3a302a] font-semibold text-xs transition-all duration-200 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-[#a84d16]">chat_bubble</span>
                <span>Inquire with Host (Preview)</span>
              </button>

              {isBookingSuccess && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center animate-fade-in-up">
                  Reservation request sent! Host will confirm within 2 hours.
                </div>
              )}

              {bookingError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold text-center animate-fade-in-up">
                  {bookingError}
                </div>
              )}

              <p className="text-center text-xs text-[#605850] mt-3">
                You won&apos;t be charged yet
              </p>

              {/* Transparent Price Breakdown */}
              <div className="mt-6 pt-6 border-t border-[#d8d0c8]/60 flex flex-col gap-3 text-xs text-[#605850]">
                <div className="flex justify-between items-center">
                  <span className="underline">{property.currency}{nightlyPrice} × {nightsCount} nights</span>
                  <span className="text-[#3a302a] font-medium">{property.currency}{subtotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="underline">Cleaning fee</span>
                  <span className="text-[#3a302a] font-medium">{property.currency}{cleaningFee}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="underline">Engida service fee</span>
                  <span className="text-[#3a302a] font-medium">{property.currency}{serviceFee}</span>
                </div>

                <div className="mt-3 pt-3 border-t border-[#d8d0c8]/60 flex justify-between items-center text-sm font-bold text-[#3a302a]">
                  <span>Total before taxes</span>
                  <span>{property.currency}{totalPrice}</span>
                </div>
              </div>

              {/* Reassurance Badge */}
              <div className="mt-6 p-4 rounded-2xl bg-[#f2ece4]/60 border border-[#d8d0c8]/50 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#a84d16] text-xl">verified_user</span>
                <div className="text-xs text-[#605850] leading-snug">
                  <span className="font-bold text-[#3a302a]">AirCover Guarantee:</span> Every booking includes free protection from Host cancellations and listing inaccuracies.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Fullscreen Photo Lightbox Modal */}
      {activePhotoModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-fade-in-up">
          <div className="flex items-center justify-between text-white">
            <span className="text-sm font-medium">
              Photo {activePhotoModal + 1} of {property.images.length}
            </span>
            <button
              type="button"
              onClick={() => setActivePhotoModal(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={property.images[activePhotoModal] || property.images[0]}
              alt={property.title}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            />
          </div>

          <div className="flex items-center justify-center gap-4 text-white pb-2">
            <button
              type="button"
              disabled={activePhotoModal <= 0}
              onClick={() => setActivePhotoModal((idx) => Math.max(0, (idx || 0) - 1))}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold disabled:opacity-30 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={activePhotoModal >= property.images.length - 1}
              onClick={() => setActivePhotoModal((idx) => Math.min(property.images.length - 1, (idx || 0) + 1))}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold disabled:opacity-30 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Interactive Message Host Modal */}
      {messageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-[#d8d0c8] w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#d8d0c8]/60 flex items-center justify-between bg-[#faf5ee]/60">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#a84d16]/30 shadow-xs shrink-0">
                  <img
                    src={property.host.avatar}
                    alt={property.host.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg text-[#3a302a] leading-tight">
                    Inquire with {property.host.name} (Preview)
                  </h3>
                  <p className="text-xs text-[#605850]">
                    Typically responds {property.host.responseRate.toLowerCase()} · Messaging preview mode
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMessageModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#d8d0c8] hover:bg-[#faf5ee] flex items-center justify-center text-[#605850] hover:text-[#3a302a] transition active:scale-90 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {messageSent ? (
                <div className="py-8 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                  <h4 className="font-headline font-bold text-xl text-[#3a302a]">
                    Inquiry Preview Recorded
                  </h4>
                  <p className="text-xs text-[#605850] mt-2 max-w-xs leading-relaxed">
                    Host messaging is currently in preview mode. Your inquiry has been saved for when live messaging is enabled.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMessageModalOpen(false)}
                    className="mt-6 px-6 py-2.5 rounded-xl bg-[#b2531b] hover:bg-[#994413] text-white text-xs font-semibold transition active:scale-95"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!hostMessage.trim()) return;
                    setMessageSent(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#605850] mb-2">
                      Common Inquiries
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Is early check-in possible?',
                        'Can I arrange airport transfer?',
                        'Is the WiFi suitable for video calls?',
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setHostMessage((prev) => (prev ? `${prev} ${prompt}` : prompt))}
                          className="px-3 py-1.5 rounded-full bg-[#f2ece4] hover:bg-[#a84d16] hover:text-white text-xs text-[#3a302a] transition-all cursor-pointer border border-[#d8d0c8]/60"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#605850] mb-2">
                      Your Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={hostMessage}
                      onChange={(e) => setHostMessage(e.target.value)}
                      placeholder={`Hello ${property.host.name}, I am planning a stay and had a quick question regarding...`}
                      className="w-full p-4 rounded-2xl bg-[#faf5ee]/50 border border-[#d8d0c8] text-sm text-[#3a302a] placeholder-[#706860] focus:outline-none focus:ring-2 focus:ring-[#b2531b]/20 focus:border-[#b2531b] focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setMessageModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#605850] hover:bg-[#faf5ee] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!hostMessage.trim()}
                      className="px-6 py-2.5 rounded-xl bg-[#b2531b] hover:bg-[#994413] disabled:opacity-40 text-white text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Send Inquiry (Preview)</span>
                      <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {reportListingOpen && property && (
        <ReportDialog
          open={reportListingOpen}
          onClose={() => setReportListingOpen(false)}
          targetType="LISTING"
          targetId={property.id}
          targetLabel={property.title}
        />
      )}

      {reportReview && (
        <ReportDialog
          open={Boolean(reportReview)}
          onClose={() => setReportReview(null)}
          targetType="REVIEW"
          targetId={reportReview.id}
          targetLabel={`${reportReview.author}'s review`}
        />
      )}

      <AppFooter />
    </div>
  );
}
