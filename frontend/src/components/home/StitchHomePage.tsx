'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

export interface PropertyListing {
  id: string;
  title: string;
  location: string;
  subLocation: string;
  details: string;
  dates: string;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  currency?: string;
  totalBeforeTaxes: number;
  images: string[];
  badge?: 'Superhost' | 'Guest Favorite' | 'Rare Find' | string;
  category: string;
  propertyType?: string;
  instantBook?: boolean;
  isSuperhost?: boolean;
}

// Stitch curated luxury stays from the design
const STITCH_CURATED_PROPERTIES: PropertyListing[] = [
  {
    id: 'stitch-1',
    title: 'The Glass Pavilion',
    location: 'Big Sur, California',
    subLocation: '240 miles away',
    details: '6 guests · 3 bedrooms · Oceanfront infinity pool',
    dates: 'Oct 12 – 17',
    rating: 4.98,
    reviewsCount: 142,
    pricePerNight: 580,
    currency: '$',
    totalBeforeTaxes: 2900,
    badge: 'Superhost',
    isSuperhost: true,
    instantBook: true,
    category: 'architectural',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAPM4jx02eqhhbSUpV7SAtgWiPPvbcycxQ_otuQ8FpvWgaF9SvBJDqgovycPBbbllSPoSzUT3NiwTqE3mj3m9WsXixzZ3fyBO9YHCvBzcshHCRYji650QWGZLZZXKOLN5Rw8XKocpkc847Nm94EYfphKVn5MgFMsSch_LR94qimX1rBgdcm8FznTKWWsSOrNwiuGdMwpH0AxV_SiXn-W2T_XIjnSiSeks4OW7UTU_GrBXzSt1K-JD0s',
    ],
  },
  {
    id: 'stitch-2',
    title: 'Villa Solaria',
    location: 'Amalfi, Italy',
    subLocation: 'Coastal views',
    details: '4 guests · 2 bedrooms · Panoramic Mediterranean terrace',
    dates: 'Nov 3 – 8',
    rating: 4.95,
    reviewsCount: 89,
    pricePerNight: 420,
    currency: '$',
    totalBeforeTaxes: 2100,
    badge: 'Guest Favorite',
    instantBook: true,
    category: 'beachfront',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDmqZ8ojS1z6wN6eErn21jAQ3USBdOHWRUHQImJqA-c-2_nJtcAu_6rPvqv8tOQq5ultDlbKwDyAYS9Pz5Uzauo9h4RFH-AqkV_Og8eC3AGY7YSaM54tBOVne5EFR1v9gCJygmbsGoLaY5vC-iL6iV_sR3vUsReDlvUgPgtk9Cl5rUj65AXgT0YMI0t3oDLimLUL33Y2IyuQ7wppmJH-RqnkbYgXkb5l2QPVq_Ow-r-CcztvAiEz5tJ',
    ],
  },
  {
    id: 'stitch-3',
    title: 'Nordic Timber Chalet',
    location: 'Tromsø, Norway',
    subLocation: 'Arctic mountain valley',
    details: '8 guests · 4 bedrooms · Private cedar sauna & Aurora views',
    dates: 'Dec 1 – 6',
    rating: 4.92,
    reviewsCount: 114,
    pricePerNight: 360,
    currency: '$',
    totalBeforeTaxes: 1800,
    category: 'cabins',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBgYPHRjRio3dltCIIttryQac4wRsD_08a7muTfyGDYfT3E2O12bMzQ8NEd2Hb4sz7MZfPeX5nDKsXNapubtn3MNxmivtBewM1g-HCFluoCFfvrlM2nUiAHScC3RgSjq2sdJR7YO06i_QF0ciSjBeUeJKtrcTUii1QBuqmX3SjSgPh1fN7LPOL2eF6VlhTOhbPgp4pakxAMnxD1tQ53LLjZTl0FebePT2lnCV3eoBtxcaGFPmuPS4io',
    ],
  },
  {
    id: 'stitch-4',
    title: 'Komorebi Modern Villa',
    location: 'Kyoto, Japan',
    subLocation: 'Historic Arashiyama district',
    details: '4 guests · 2 bedrooms · Traditional rock garden & onsen',
    dates: 'Nov 18 – 23',
    rating: 4.97,
    reviewsCount: 96,
    pricePerNight: 310,
    currency: '$',
    totalBeforeTaxes: 1550,
    badge: 'Superhost',
    isSuperhost: true,
    category: 'architectural',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCj782Qh7xr3tfXv8eqxfLt8wZ00M_CWa9sdXO5nfFoetfekqE-NkUd-fmxz5kT6qW3ZJKydV1FFE3ctmju2xfGaydPG9A9UOPsCLPZhfWKuyFtNagjDKKFPxn52KiFJa6tWBMbBA4cZWt__T0SSBnKMFX3UPIfjSdn018u2SWAfniO6A6hOeXIksojZWuWrbMbBtb2rek-5hX0KB7fzcBcMfFUnVzFC5C3Z_sLu5fa4OgXurolU1eN',
    ],
  },
  {
    id: 'stitch-5',
    title: 'Desert Horizon Sanctuary',
    location: 'Scottsdale, Arizona',
    subLocation: 'Sonoran desert preserve',
    details: '6 guests · 3 bedrooms · Cactus garden & heated firepit',
    dates: 'Oct 24 – 29',
    rating: 4.89,
    reviewsCount: 78,
    pricePerNight: 290,
    currency: '$',
    totalBeforeTaxes: 1450,
    instantBook: true,
    category: 'desert',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBwpxptkbTjz4ok_kG2dUTbqyYzMrwgUbhKXZHqIrFBhATBRJYrwRp3xSrp6jP7E8At1KMEMcfc_7slamK81jXv91FcR3k--Qby1EPG9cvzPig9-X-soeFwg5gwiqHIrUwQ_39i2ciqTprnJLGg_En8EpaRRIBQcBQgovLDJHP6WOb4-K3bg_SDxbBYNea8jzRniq8rWPC2e5QBkrhsaooyih_dY8b_iexf7GBd-QOMCx7KP1QxRThw',
    ],
  },
  {
    id: 'stitch-6',
    title: 'Cliffside Azure Haven',
    location: 'Santorini, Greece',
    subLocation: 'Oia Cliff edge',
    details: '2 guests · 1 bedroom · Caldera sunset terrace & plunge pool',
    dates: 'Nov 10 – 15',
    rating: 4.99,
    reviewsCount: 210,
    pricePerNight: 490,
    currency: '$',
    totalBeforeTaxes: 2450,
    badge: 'Rare Find',
    isSuperhost: true,
    category: 'beachfront',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDK3442M4g1p3ZQYVcU3sp2TR5v2HjiB-syVEpjFR_AcxhZaTXFH5XvAnQcrEM8SlxbhY9_KVAucxnzDCKRq2l-8xGAKSzmIHLME_5_vHX4otUFc_f_H9UDq4gpl5xN7uCHHObfnbrlDSFU1WyDnwlZdUBKulG5mQ1maukFde63KjFRkeUNoi6r7Hr_q4uaICZiS8JRMGIxBv-Hm4rP_bgNOo8bHYcQ9lxx_pRojqJC1WQXKzZt3vQX',
    ],
  },
  {
    id: 'stitch-7',
    title: 'Highland Eco Cabin',
    location: 'Isle of Skye, Scotland',
    subLocation: 'Waterfront seclusion',
    details: '4 guests · 2 bedrooms · Loch views & wood-burning stove',
    dates: 'Oct 28 – Nov 2',
    rating: 4.91,
    reviewsCount: 65,
    pricePerNight: 240,
    currency: '$',
    totalBeforeTaxes: 1200,
    category: 'countryside',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCeYmTsFw5IqrjHHeii4hBUGH3ieAbMXarG0DscIkFZdO_fYu0UTM_3h57o5Idqn_4qKt__e3GreXcWwEE2pyTbVuo1beBqh5uADh7FBhLzM1muVmpPzyi0P1CgOCuiIlVRc_IsvuZoTM05yaRSlP8STOZrKr8Gq92fPIJNbqX1ODtldw0UKfcsc0yakYT58l5jJjxgvlNNsroj-5vi10YffNrLIfKh3A-nsMTorU6yh1xJpZzF4g7-',
    ],
  },
  {
    id: 'stitch-8',
    title: 'Lake Como Contemporary',
    location: 'Bellagio, Italy',
    subLocation: 'Private water frontage',
    details: '10 guests · 5 bedrooms · Private boat dock & mountain vista',
    dates: 'Nov 5 – 11',
    rating: 4.96,
    reviewsCount: 180,
    pricePerNight: 750,
    currency: '$',
    totalBeforeTaxes: 4500,
    badge: 'Superhost',
    isSuperhost: true,
    instantBook: true,
    category: 'lakefront',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAyVtDbBgtZzH31M54riPgOGc6-vS_fK2Yabs_ueF5HtoB7gaWXkkUOXcOhFV8oIbic6e5XqPp1ZYfAisLSTGEhi36LSNOWl5_3RGi1-EqNyzgWcrLj4ubGFi_KCraemwcT6_lyXIbnFMDpPK8vhDQf4DQg8hYZipk6T_wODU6mp6LasyejQQmlC2DtycmT6-sXaa44ig4QipbgsShGAOUJQxYBOtYFy0-u6XoCNp8O7RLX-J4MM1_j',
    ],
  },
  // Ethiopian Architectural Landmarks & Luxury Getaways
  {
    id: 'eth-1',
    title: 'Bole Skyline Penthouse',
    location: 'Addis Ababa, Ethiopia',
    subLocation: 'Central Bole Diplomatic Zone',
    details: '4 guests · 2 bedrooms · Panoramic capital mountain views',
    dates: 'Nov 12 – 18',
    rating: 4.97,
    reviewsCount: 52,
    pricePerNight: 180,
    currency: '$',
    totalBeforeTaxes: 1080,
    badge: 'Guest Favorite',
    isSuperhost: true,
    instantBook: true,
    category: 'penthouses',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'eth-2',
    title: 'Kuriftu Lakefront Haven',
    location: 'Bishoftu, Ethiopia',
    subLocation: 'Crater Lake Vista',
    details: '6 guests · 3 bedrooms · Traditional spa, infinity lake pool',
    dates: 'Dec 4 – 10',
    rating: 4.94,
    reviewsCount: 88,
    pricePerNight: 260,
    currency: '$',
    totalBeforeTaxes: 1560,
    badge: 'Superhost',
    isSuperhost: true,
    instantBook: true,
    category: 'lakefront',
    images: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'eth-3',
    title: 'Entoto Eucalyptus Mountain Lodge',
    location: 'Entoto, Addis Ababa',
    subLocation: 'High-Altitude Forest Preserve',
    details: '4 guests · 2 bedrooms · Fireplace, horseback riding & trekking',
    dates: 'Oct 29 – Nov 3',
    rating: 4.93,
    reviewsCount: 41,
    pricePerNight: 210,
    currency: '$',
    totalBeforeTaxes: 1050,
    badge: 'Rare Find',
    category: 'cabins',
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'eth-4',
    title: 'Acacia Sunset Sanctuary',
    location: 'Hawassa, Ethiopia',
    subLocation: 'Lake Hawassa Shoreline',
    details: '8 guests · 4 bedrooms · Private bird sanctuary, canoe pier',
    dates: 'Nov 20 – 26',
    rating: 4.96,
    reviewsCount: 67,
    pricePerNight: 230,
    currency: '$',
    totalBeforeTaxes: 1380,
    isSuperhost: true,
    category: 'lakefront',
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    ],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Homes', icon: 'apps' },
  { id: 'beachfront', label: 'Beachfront', icon: 'waves' },
  { id: 'cabins', label: 'Modern Cabins', icon: 'cabin' },
  { id: 'architectural', label: 'Architectural', icon: 'architecture' },
  { id: 'lakefront', label: 'Lakefront', icon: 'houseboat' },
  { id: 'desert', label: 'Desert Retreats', icon: 'wb_sunny' },
  { id: 'countryside', label: 'Countryside', icon: 'nature' },
  { id: 'penthouses', label: 'Luxury Penthouses', icon: 'apartment' },
  { id: 'treehouses', label: 'Treehouses', icon: 'park' },
];

interface StitchHomePageProps {
  onNavigateTab?: (tab: string) => void;
  activeNavTab?: string;
}

export default function StitchHomePage({ onNavigateTab, activeNavTab = 'stays' }: StitchHomePageProps) {
  const { user, logout } = useAuth();

  // Search state
  const [activeSegment, setActiveSegment] = useState<'where' | 'when' | 'who' | null>(null);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [datesSelected, setDatesSelected] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);

  // Category and filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating'>('recommended');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Wishlist state
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  // Pagination / Load more state
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allLoadedMessage, setAllLoadedMessage] = useState(false);

  // User menu and language menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');

  const formatPrice = (usdAmount: number) => {
    if (currency === 'ETB') {
      return `${Math.round(usdAmount * 120).toLocaleString()} ETB`;
    }
    return `$${usdAmount.toLocaleString()}`;
  };

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('engida_wishlist');
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    btn.classList.add('heart-pop');
    setTimeout(() => btn.classList.remove('heart-pop'), 350);

    setWishlist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('engida_wishlist', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const removeFilterChip = (filter: string) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filter));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSelectedCategory('all');
    setDestinationSearch('');
  };

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    return STITCH_CURATED_PROPERTIES.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Text search
      if (destinationSearch.trim()) {
        const q = destinationSearch.toLowerCase();
        const matchesLoc = item.location.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSub = item.subLocation.toLowerCase().includes(q);
        if (!matchesLoc && !matchesTitle && !matchesSub) return false;
      }
      // Guest capacity filter
      if (guestCount > 1) {
        const guestMatch = item.details.match(/(\d+)\s*guests?/i);
        const maxGuests = guestMatch ? parseInt(guestMatch[1], 10) : 2;
        if (maxGuests < guestCount) {
          return false;
        }
      }
      // Date availability filter
      if (datesSelected && datesSelected !== 'Flexible Dates') {
        if (datesSelected === 'Anytime in Nov') {
          if (!item.dates.toLowerCase().includes('nov')) return false;
        } else if (item.dates) {
          if (!item.dates.trim()) return false;
        }
      }
      // Superhost chip
      if (activeFilters.includes('Superhost') && !item.isSuperhost && item.badge !== 'Superhost') {
        return false;
      }
      // Instant book chip
      if (activeFilters.includes('Instant Book') && !item.instantBook) {
        return false;
      }
      // Entire home filter
      if (activeFilters.includes('Entire home')) {
        const detailsLower = item.details.toLowerCase();
        if (detailsLower.includes('private room') || detailsLower.includes('shared room') || detailsLower.includes('hotel room')) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortOption === 'price-asc') return a.pricePerNight - b.pricePerNight;
      if (sortOption === 'price-desc') return b.pricePerNight - a.pricePerNight;
      if (sortOption === 'rating') return b.rating - a.rating;
      return 0; // recommended
    });
  }, [selectedCategory, destinationSearch, guestCount, datesSelected, activeFilters, sortOption]);

  const displayedListings = useMemo(() => {
    return filteredListings.slice(0, visibleCount);
  }, [filteredListings, visibleCount]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setIsLoadingMore(false);
      if (visibleCount < filteredListings.length) {
        setVisibleCount((prev) => Math.min(prev + 4, filteredListings.length));
      } else {
        setAllLoadedMessage(true);
        setTimeout(() => setAllLoadedMessage(false), 2200);
      }
    }, 700);
  };

  const progressPercent = Math.min(100, Math.round((displayedListings.length / Math.max(1, filteredListings.length)) * 100));

  return (
    <div className="w-full min-h-screen bg-[#F8F5ED] text-[#252923] font-body selection:bg-[#234B36]/20 selection:text-[#234B36]">
      {/* ============================================================ */}
      {/* 1. STICKY TOP HEADER                                         */}
      {/* ============================================================ */}
      <header className="relative z-[60] w-full bg-[#F8F5ED]/95 backdrop-blur-xl border-b border-[#E5E0D5]/40 shadow-[0_1px_8px_rgba(58,48,42,0.04)] transition-all duration-300">
        <div className="h-20 w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between max-w-[1440px] mx-auto">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 group transition-transform duration-200 hover:scale-[1.02] active:scale-95"
            >
              <span className="text-3xl font-bold tracking-tight text-[#234B36] font-headline transition-colors group-hover:text-[#2D5E43]">
                Engida
              </span>
            </Link>
          </div>

          {/* Right Actions: Become a Host & User Profile */}
          <div className="flex items-center gap-4">
            <Link
              href="/become-a-host"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[#EEF3EF] text-[#252923] font-semibold text-sm hover:bg-[#234B36] hover:text-white transition-all duration-200 active:scale-95 shadow-sm hover:shadow"
            >
              Become a Host
            </Link>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Global currency and language"
                onClick={() => setCurrency((c) => (c === 'USD' ? 'ETB' : 'USD'))}
                title={`Currency: ${currency}. Click to toggle`}
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#EEF3EF] transition-all duration-200 text-[#73776F] hover:text-[#234B36] active:scale-90"
              >
                <span className="material-symbols-outlined text-lg transition-transform duration-200 hover:rotate-12">
                  language
                </span>
              </button>

              {/* User Menu Trigger */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="User menu"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-white border border-[#E5E0D5]/60 shadow-[0_2px_12px_rgba(58,48,42,0.06)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.14)] hover:border-[#234B36]/40 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#73776F] text-base">menu</span>
                  <div className="w-8 h-8 rounded-full bg-[#EEF3EF] flex items-center justify-center overflow-hidden text-[#234B36] font-bold text-xs">
                    {user?.name ? (
                      user.name.charAt(0).toUpperCase()
                    ) : (
                      <span className="material-symbols-outlined text-lg text-[#73776F]">person</span>
                    )}
                  </div>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E5E0D5]/60 py-2 z-50 animate-fade-in-up">
                    {user ? (
                      <>
                        <div className="px-4 py-2 border-b border-[#E5E0D5]/40">
                          <p className="text-xs text-[#73776F]">Signed in as</p>
                          <p className="text-sm font-bold text-[#252923] truncate">{user.name || user.email}</p>
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                        >
                          My Dashboard
                        </Link>
                        <Link
                          href="/host"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                        >
                          Host Portal
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium"
                        >
                          Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm font-semibold text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36]"
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36]"
                        >
                          Create Account
                        </Link>
                        <div className="h-[1px] bg-[#E5E0D5]/40 my-1"></div>
                        <Link
                          href="/become-a-host"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36]"
                        >
                          Engida your home
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Segmented Navigation Bar (Stays / Experiences / How it Works) */}
        <div className="w-full px-4 sm:px-6 lg:px-12 py-2 flex items-center justify-center">
          <nav className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-[#E5E0D5]/60 shadow-sm transition-all">
            <button
              type="button"
              onClick={() => onNavigateTab?.('stays')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
                activeNavTab === 'stays' || activeNavTab === 'home'
                  ? 'bg-[#234B36] text-white shadow-sm'
                  : 'text-[#252923] hover:text-[#234B36] hover:bg-[#EEF3EF]'
              }`}
            >
              <span className="material-symbols-outlined text-base">cottage</span>
              <span>Stays</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.('destinations')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
                activeNavTab === 'destinations'
                  ? 'bg-[#234B36] text-white shadow-sm'
                  : 'text-[#252923] hover:text-[#234B36] hover:bg-[#EEF3EF]'
              }`}
            >
              <span className="material-symbols-outlined text-base">local_activity</span>
              <span>Experiences</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.('how-it-works')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
                activeNavTab === 'how-it-works'
                  ? 'bg-[#234B36] text-white shadow-sm'
                  : 'text-[#252923] hover:text-[#234B36] hover:bg-[#EEF3EF]'
              }`}
            >
              <span className="material-symbols-outlined text-base">help_outline</span>
              <span>How it Works</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full">
        {/* ============================================================ */}
        {/* 2. SEARCH BAR SECTION                                        */}
        {/* ============================================================ */}
        <section className="sticky top-0 z-[45] w-full px-4 sm:px-6 lg:px-12 pt-6 pb-6 flex flex-col items-center justify-center bg-[#F8F5ED]/95 backdrop-blur-md animate-fade-in-up">
          <div className="w-full max-w-4xl mx-auto flex justify-center relative">
            <div className="search-bar-container inline-flex flex-wrap sm:flex-nowrap items-center bg-white rounded-full border border-[#E5E0D5] shadow-[0_4px_16px_rgba(58,48,42,0.06)] hover:shadow-[0_8px_28px_rgba(194,101,42,0.16)] hover:border-[#234B36]/50 transition-all duration-300 pl-4 sm:pl-8 pr-2.5 py-2.5 gap-2 focus-within:ring-2 focus-within:ring-[#234B36]/40 focus-within:border-[#234B36]">
              {/* WHERE SEGMENT */}
              <button
                type="button"
                onClick={() => {
                  setActiveSegment('where');
                  setSearchPopoverOpen(true);
                }}
                className={`search-segment flex flex-col text-left pr-6 sm:pr-8 pl-3 py-1.5 rounded-full transition-all duration-200 focus:outline-none relative cursor-pointer ${
                  activeSegment === 'where' ? 'bg-[#EEF3EF] shadow-inner' : 'hover:bg-[#f6f0e8]'
                }`}
              >
                <span className="text-xs font-bold text-[#252923] tracking-tight">Where</span>
                <span className="text-sm text-[#73776F] font-normal truncate max-w-[140px] sm:max-w-[180px]">
                  {destinationSearch || 'Search destinations'}
                </span>
              </button>

              <div className="hidden sm:block h-8 w-[1px] bg-[#E5E0D5]/60 shrink-0"></div>

              {/* WHEN SEGMENT */}
              <button
                type="button"
                onClick={() => {
                  setActiveSegment('when');
                  setSearchPopoverOpen(true);
                }}
                className={`search-segment flex flex-col text-left px-6 sm:px-8 py-1.5 rounded-full transition-all duration-200 focus:outline-none relative cursor-pointer ${
                  activeSegment === 'when' ? 'bg-[#EEF3EF] shadow-inner' : 'hover:bg-[#f6f0e8]'
                }`}
              >
                <span className="text-xs font-bold text-[#252923] tracking-tight">When</span>
                <span className="text-sm text-[#73776F] font-normal truncate max-w-[120px]">
                  {datesSelected || 'Add dates'}
                </span>
              </button>

              <div className="hidden sm:block h-8 w-[1px] bg-[#E5E0D5]/60 shrink-0"></div>

              {/* WHO SEGMENT */}
              <button
                type="button"
                onClick={() => {
                  setActiveSegment('who');
                  setSearchPopoverOpen(true);
                }}
                className={`search-segment flex flex-col text-left pl-6 sm:pl-8 pr-4 sm:pr-6 py-1.5 rounded-full transition-all duration-200 focus:outline-none relative cursor-pointer ${
                  activeSegment === 'who' ? 'bg-[#EEF3EF] shadow-inner' : 'hover:bg-[#f6f0e8]'
                }`}
              >
                <span className="text-xs font-bold text-[#252923] tracking-tight">Who</span>
                <span className="text-sm text-[#73776F] font-normal">
                  {guestCount > 1 ? `${guestCount} guests` : 'Add guests'}
                </span>
              </button>

              {/* SEARCH BUTTON */}
              <button
                type="button"
                aria-label="Search"
                onClick={() => {
                  setSearchPopoverOpen(false);
                  setActiveSegment(null);
                  const el = document.getElementById('listings-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="search-btn search-glow w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 bg-[#234B36] hover:bg-[#2D5E43] shadow-md hover:scale-105 active:scale-95 transition-all duration-200 ml-1 relative overflow-hidden cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl font-bold transition-transform duration-300 hover:rotate-90">
                  search
                </span>
              </button>
            </div>

            {/* Interactive Search Popover */}
            {searchPopoverOpen && (
              <div className="absolute top-20 w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E5E0D5] p-6 z-50 animate-fade-in-up">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]/40 mb-4">
                  <h4 className="font-bold text-sm text-[#252923]">
                    {activeSegment === 'where' && 'Search by destination or property'}
                    {activeSegment === 'when' && 'Select travel window'}
                    {activeSegment === 'who' && 'Select guests'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchPopoverOpen(false);
                      setActiveSegment(null);
                    }}
                    className="text-[#73776F] hover:text-[#234B36]"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                {activeSegment === 'where' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Addis Ababa, Big Sur, Lake Como, Amalfi..."
                      value={destinationSearch}
                      onChange={(e) => setDestinationSearch(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:border-[#234B36]"
                    />
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="text-xs text-[#73776F] self-center mr-1">Popular:</span>
                      {['Addis Ababa', 'Bishoftu', 'Big Sur', 'Kyoto', 'Amalfi', 'Santorini'].map((dest) => (
                        <button
                          key={dest}
                          type="button"
                          onClick={() => {
                            setDestinationSearch(dest);
                            setSearchPopoverOpen(false);
                            setActiveSegment(null);
                          }}
                          className="px-3 py-1 rounded-full text-xs bg-[#EEF3EF] hover:bg-[#234B36] hover:text-white transition-colors"
                        >
                          {dest}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSegment === 'when' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {['This Weekend', 'Next Weekend', 'Anytime in Nov', 'Flexible Dates'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setDatesSelected(option);
                            setSearchPopoverOpen(false);
                            setActiveSegment(null);
                          }}
                          className="p-3 text-left border border-[#E5E0D5] rounded-xl text-sm font-medium hover:border-[#234B36] hover:bg-[#F8F5ED]"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSegment === 'who' && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-bold text-[#252923]">Guests</p>
                      <p className="text-xs text-[#73776F]">Ages 13 or above</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={guestCount <= 1}
                        onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                        className="w-8 h-8 rounded-full border border-[#E5E0D5] flex items-center justify-center text-sm font-bold disabled:opacity-30 hover:border-[#234B36]"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{guestCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => c + 1)}
                        className="w-8 h-8 rounded-full border border-[#E5E0D5] flex items-center justify-center text-sm font-bold hover:border-[#234B36]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. STICKY CATEGORIES & CONTROLS BAR                          */}
        {/* ============================================================ */}
        <section className="relative z-30 bg-[#F8F5ED]/95 backdrop-blur-md border-y border-[#E5E0D5]/50 w-full py-2 px-4 sm:px-6 lg:px-12 animate-fade-in-up">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
            {/* Horizontal Categories Scroller */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`category-btn group flex flex-col items-center gap-1 pb-2 shrink-0 border-b-2 transition-all duration-200 active:scale-95 cursor-pointer ${
                      isActive
                        ? 'border-[#234B36] text-[#234B36] font-semibold'
                        : 'border-transparent text-[#73776F] hover:text-[#234B36] hover:border-[#E5E0D5] font-medium'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl transition-transform duration-200 group-hover:-translate-y-0.5"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {cat.icon}
                    </span>
                    <span className="text-xs tracking-normal whitespace-nowrap">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Controls: Filters & Sort */}
            <div className="hidden sm:flex items-center gap-2 shrink-0 pl-4 border-l border-[#E5E0D5]/40">
              <button
                type="button"
                onClick={() => setFilterModalOpen(true)}
                className="filter-action-btn flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#E5E0D5] text-[#252923] hover:text-[#234B36] hover:border-[#234B36]/50 shadow-[0_2px_8px_rgba(58,48,42,0.04)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.15)] active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg transition-transform duration-200 hover:rotate-45">
                  tune
                </span>
                <span className="text-sm font-semibold">Filters</span>
                {activeFilters.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-bold rounded-full bg-[#234B36] text-white">
                    {activeFilters.length}
                  </span>
                )}
              </button>

              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setSortDropdownOpen((open) => !open)}
                  className="sort-action-btn flex items-center gap-1 px-4 py-2 rounded-full bg-white border border-[#E5E0D5] text-[#252923] hover:text-[#234B36] hover:border-[#234B36]/50 shadow-[0_2px_8px_rgba(58,48,42,0.04)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.15)] active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span className="text-sm font-semibold capitalize">
                    {sortOption === 'recommended' && 'Sort: Recommended'}
                    {sortOption === 'price-asc' && 'Price: Low to High'}
                    {sortOption === 'price-desc' && 'Price: High to Low'}
                    {sortOption === 'rating' && 'Highest Rated'}
                  </span>
                  <span className="material-symbols-outlined text-base transition-transform duration-200">
                    expand_more
                  </span>
                </button>

                {sortDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#E5E0D5] py-1.5 z-50 animate-fade-in-up">
                    {[
                      { id: 'recommended', label: 'Recommended' },
                      { id: 'price-asc', label: 'Price: Low to High' },
                      { id: 'price-desc', label: 'Price: High to Low' },
                      { id: 'rating', label: 'Highest Rated' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSortOption(opt.id as any);
                          setSortDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#F8F5ED] hover:text-[#234B36] ${
                          sortOption === opt.id ? 'text-[#234B36] font-bold' : 'text-[#252923]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. RESULT META HEADER & ACTIVE FILTER CHIPS                  */}
        {/* ============================================================ */}
        <section className="w-full px-4 sm:px-6 lg:px-12 pt-6 pb-2 max-w-[1440px] mx-auto animate-fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-bold font-headline text-[#252923]">
                Over {filteredListings.length} verified stays available
              </h2>
              <span className="hidden md:inline-flex items-center px-3 py-0.5 rounded-full bg-[#eae2da] text-[#73776F] font-semibold text-xs border border-[#E5E0D5]/50 transition-all hover:bg-[#fbe8d8] hover:text-[#401a08] cursor-default">
                Updated today
              </span>
            </div>

            {/* Quick Toggle Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map((chip) => (
                <span
                  key={chip}
                  className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EF] border border-[#E5E0D5]/60 text-[#252923] font-medium text-xs hover:border-[#234B36] hover:bg-[#ece6dc] transition-all duration-200 shadow-sm"
                >
                  {chip}
                  <button
                    type="button"
                    aria-label={`Remove filter ${chip}`}
                    onClick={() => removeFilterChip(chip)}
                    className="hover:text-[#234B36] transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              ))}

              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="clear-all-btn text-xs font-semibold text-[#73776F] hover:text-[#234B36] underline ml-1 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. CURATED PROPERTY LISTINGS GRID                            */}
        {/* ============================================================ */}
        <section id="listings-grid" className="w-full px-4 sm:px-6 lg:px-12 py-4 max-w-[1440px] mx-auto">
          {displayedListings.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-[#E5E0D5] p-8 max-w-xl mx-auto shadow-sm">
              <span className="material-symbols-outlined text-4xl text-[#234B36]">cottage</span>
              <h3 className="text-xl font-bold font-headline mt-3 text-[#252923]">No stays match your criteria</h3>
              <p className="text-sm text-[#73776F] mt-1">Try clearing some filters or searching for another destination.</p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-5 px-5 py-2.5 rounded-full bg-[#234B36] text-white font-semibold text-xs shadow-md hover:bg-[#2D5E43]"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedListings.map((property, idx) => {
                const isSaved = wishlist[property.id];
                return (
                  <article
                    key={property.id}
                    className="property-card group relative flex flex-col bg-white rounded-xl border border-[#E5E0D5]/70 overflow-hidden shadow-[0_4px_20px_-2px_rgba(58,48,42,0.05)] hover:shadow-[0_16px_36px_-4px_rgba(194,101,42,0.18)] hover:-translate-y-1.5 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${0.1 + (idx % 8) * 0.05}s` }}
                  >
                    {/* Media Container with 4:3 Aspect Ratio */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#EEF3EF]">
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      />

                      {/* Floating Badge */}
                      {property.badge && (
                        <div className="absolute top-2.5 left-2.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-white font-semibold text-[11px] uppercase tracking-wider shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                              property.badge === 'Superhost'
                                ? 'bg-[#234B36]'
                                : property.badge === 'Guest Favorite'
                                ? 'bg-[#2D5E43]'
                                : 'bg-[#8c3c3c]'
                            }`}
                          >
                            {property.badge}
                          </span>
                        </div>
                      )}

                      {/* Wishlist Heart Button */}
                      <button
                        type="button"
                        aria-label="Add to wishlist"
                        onClick={(e) => toggleWishlist(property.id, e)}
                        className={`wishlist-btn absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-[#E5E0D5]/60 flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${
                          isSaved ? 'text-[#234B36]' : 'text-[#252923]'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-xl transition-all duration-200"
                          style={isSaved ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          favorite
                        </span>
                      </button>

                      {/* Gallery Indicator Dots */}
                      <div className="absolute bottom-2.5 left-0 right-0 flex justify-center items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm transition-transform hover:scale-125"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 hover:bg-white transition-all"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 hover:bg-white transition-all"></span>
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="flex flex-col p-4 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-headline text-lg font-bold text-[#252923] truncate group-hover:text-[#234B36] transition-colors duration-200">
                          <Link
                            href={`/properties/${property.id}`}
                            className="focus:outline-hidden after:absolute after:inset-0 after:z-0"
                          >
                            {property.title}
                          </Link>
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className="material-symbols-outlined text-base text-[#234B36]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span className="text-xs font-bold text-[#252923]">{property.rating.toFixed(2)}</span>
                          <span className="text-xs text-[#73776F]">({property.reviewsCount})</span>
                        </div>
                      </div>

                      <p className="text-sm font-medium text-[#234B36] mt-0.5 truncate">{property.location}</p>
                      <p className="text-xs text-[#73776F] mt-1 truncate">{property.details}</p>
                      <p className="text-xs text-[#73776F]/80 mt-1">
                        {property.dates} · {property.subLocation}
                      </p>

                      <div className="mt-4 pt-2 flex items-baseline justify-between border-t border-[#E5E0D5]/40">
                        <div>
                          <span className="text-lg font-bold text-[#252923] font-headline">
                            {formatPrice(property.pricePerNight)}
                          </span>
                          <span className="text-xs text-[#73776F]"> / night</span>
                          <span className="block text-[11px] text-[#73776F]/80">
                            {formatPrice(property.totalBeforeTaxes)} total before taxes
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* 6. PAGINATION & LOAD MORE SECTION                            */}
        {/* ============================================================ */}
        <section className="w-full px-4 sm:px-6 lg:px-12 py-10 flex flex-col items-center justify-center gap-4 animate-fade-in-up">
          <p className="text-sm text-[#73776F] font-medium">
            Showing {displayedListings.length} of {filteredListings.length} properties
          </p>

          {/* Progress Indicator Bar */}
          <div className="w-48 h-1.5 bg-[#ece6dc] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#234B36] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <button
            type="button"
            disabled={isLoadingMore}
            onClick={handleLoadMore}
            className="show-more-btn mt-2 inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-[#234B36] text-white font-semibold text-sm shadow-md hover:bg-[#2D5E43] hover:shadow-lg active:scale-95 transition-all duration-200 relative overflow-hidden group cursor-pointer disabled:opacity-75"
          >
            {isLoadingMore ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Loading stays...</span>
              </>
            ) : allLoadedMessage ? (
              <>
                <span>All stays loaded</span>
                <span className="material-symbols-outlined text-base">check</span>
              </>
            ) : (
              <>
                <span>Show more stays</span>
                <span className="material-symbols-outlined text-base transition-transform duration-200 group-hover:translate-y-0.5">
                  expand_more
                </span>
              </>
            )}
          </button>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 7. FILTER MODAL                                              */}
      {/* ============================================================ */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E0D5] relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D5]/50">
              <h3 className="text-lg font-bold font-headline text-[#252923]">Filters</h3>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="text-[#73776F] hover:text-[#234B36] p-1 rounded-full hover:bg-[#F8F5ED]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="py-4 space-y-6">
              {/* Filter: Instant Book */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-[#252923]">Instant Book</p>
                  <p className="text-xs text-[#73776F]">Listings you can book without host approval wait</p>
                </div>
                <input
                  type="checkbox"
                  checked={activeFilters.includes('Instant Book')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setActiveFilters((prev) => [...prev, 'Instant Book']);
                    } else {
                      setActiveFilters((prev) => prev.filter((f) => f !== 'Instant Book'));
                    }
                  }}
                  className="w-5 h-5 accent-[#234B36] rounded cursor-pointer"
                />
              </div>

              {/* Filter: Superhost */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-[#252923]">Superhost</p>
                  <p className="text-xs text-[#73776F]">Stay with recognized high-rated hosts</p>
                </div>
                <input
                  type="checkbox"
                  checked={activeFilters.includes('Superhost')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setActiveFilters((prev) => [...prev, 'Superhost']);
                    } else {
                      setActiveFilters((prev) => prev.filter((f) => f !== 'Superhost'));
                    }
                  }}
                  className="w-5 h-5 accent-[#234B36] rounded cursor-pointer"
                />
              </div>

              {/* Filter: Entire home */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-[#252923]">Entire home</p>
                  <p className="text-xs text-[#73776F]">Have a whole place to yourself</p>
                </div>
                <input
                  type="checkbox"
                  checked={activeFilters.includes('Entire home')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setActiveFilters((prev) => [...prev, 'Entire home']);
                    } else {
                      setActiveFilters((prev) => prev.filter((f) => f !== 'Entire home'));
                    }
                  }}
                  className="w-5 h-5 accent-[#234B36] rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E5E0D5]/50">
              <button
                type="button"
                onClick={() => setActiveFilters([])}
                className="text-xs font-bold text-[#73776F] underline hover:text-[#234B36]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#234B36] text-white text-sm font-semibold shadow hover:bg-[#2D5E43]"
              >
                Show stays
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. EDITORIAL FOOTER                                          */}
      {/* ============================================================ */}
      <footer className="w-full bg-[#f6f0e8] border-t border-[#E5E0D5]/50 mt-12 pt-12 pb-8">
        <div className="w-full px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10">
            {/* Support */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Support</span>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Help Center
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Safety &amp; AirCover
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Cancellation Options
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Neighborhood Support
              </a>
            </div>

            {/* Hosting */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Hosting</span>
              <Link href="/become-a-host" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Engida your home
              </Link>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Host Cover
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Hosting Resources
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Community Forum
              </a>
            </div>

            {/* Discover */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Discover</span>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Curated Stays
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Local Guides
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Architectural Digest
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Gift Cards
              </a>
            </div>

            {/* Engida */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Engida</span>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Newsroom
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Careers
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Investors
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Sustainability
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E5E0D5]/40">
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#73776F]">
              <span>&copy; {new Date().getFullYear()} Engida. All rights reserved.</span>
              <span>&middot;</span>
              <a href="#" className="hover:text-[#234B36] transition-colors duration-150">
                Privacy
              </a>
              <span>&middot;</span>
              <a href="#" className="hover:text-[#234B36] transition-colors duration-150">
                Terms
              </a>
              <span>&middot;</span>
              <a href="#" className="hover:text-[#234B36] transition-colors duration-150">
                Sitemap
              </a>
            </div>

            <div className="flex items-center gap-6 text-[#73776F]">
              <span className="material-symbols-outlined text-base cursor-pointer hover:text-[#234B36] hover:scale-110 active:scale-90 transition-all duration-200">
                share
              </span>
              <span className="material-symbols-outlined text-base cursor-pointer hover:text-[#234B36] hover:scale-110 active:scale-90 transition-all duration-200">
                mail
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
