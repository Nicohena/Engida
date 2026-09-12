'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ListingItem {
  id: string;
  title: string;
  category: string;
  additionalCategories?: string[];
  location: string;
  distance: string;
  rating: number;
  reviewsCount: number;
  trustScore: number;
  pricePerNight: string;
  hostName: string;
  amenities: string[];
  instantBook: boolean;
  tag?: string;
  gradient: string;
  imageUrl?: string;
  renderIllustration?: () => React.ReactNode;
}

const CATEGORIES = [
  {
    id: 'all',
    name: 'All Stays',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'apartments',
    name: 'Serviced Apartments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="9" y1="6" x2="9" y2="6.01" />
        <line x1="15" y1="6" x2="15" y2="6.01" />
        <line x1="9" y1="10" x2="9" y2="10.01" />
        <line x1="15" y1="10" x2="15" y2="10.01" />
        <line x1="9" y1="14" x2="9" y2="14.01" />
        <line x1="15" y1="14" x2="15" y2="14.01" />
        <path d="M9 18h6" />
      </svg>
    ),
  },
  {
    id: 'lakeside',
    name: 'Lakeside & Resorts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
        <path d="M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
        <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 4 5 2-2 4-3 4-5a4 4 0 0 0-4-4z" />
      </svg>
    ),
  },
  {
    id: 'villas',
    name: 'Villas & Houses',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'guesthouses',
    name: 'Boutique Guesthouses',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
        <path d="M2 20h20" />
        <path d="M14 12v.01" />
      </svg>
    ),
  },
  {
    id: 'historic',
    name: 'Historic & Heritage',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 5h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z" />
        <path d="M12 14v8" />
        <path d="M8 22h8" />
      </svg>
    ),
  },
  {
    id: 'airport',
    name: 'Near Airport',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.2-2 1-.3.8-.1 1.7.5 2.2l4.7 3.6-2.5 2.5-2.7-.4c-.5-.1-1 .1-1.3.5-.3.4-.3 1 0 1.4l2.4 2.4 2.4 2.4c.4.3 1 .3 1.4 0 .4-.3.6-.8.5-1.3l-.4-2.7 2.5-2.5 3.6 4.7c.5.6 1.4.8 2.2.5.8-.4 1.2-1.2 1-2z" />
      </svg>
    ),
  },
];

const LISTINGS: ListingItem[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    title: 'Modern Cozy Villa in Bole',
    category: 'villas',
    additionalCategories: ['airport'],
    location: 'Bole Atlas, Addis Ababa',
    distance: '2.4 km from Bole Intl. Airport',
    rating: 4.98,
    reviewsCount: 46,
    trustScore: 99,
    pricePerNight: '120',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['24/7 Generator', 'Water Tank', 'Swimming Pool', 'Smart Home'],
    instantBook: true,
    tag: 'Featured Luxury',
    gradient: 'from-blue-600 via-indigo-700 to-slate-900',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkz2OG6oE8xWZHZkQBsfXBgI2gioKNMBSOfW5AJFgpMJ96qmbxt9Xjs9KnrrlgHmSC5HqhehkaETbqVTb37boq5fhlaT-qjqiZXsL4bQZ5z8waLri8TfQSdogqXmc9lkeabctZpgsYT1oEeY8bnW3dbWeXrPjDcuBhvCj_SGAfnNRZ0LiZvr2Dv-dSVKMRIQ0hPo_8N8XdNfKEMu9xdQMHOuWNSNTwBbFld0-Cj--rTkx39QREYun-ag',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    title: 'The Palm Sanctuary Resort',
    category: 'lakeside',
    location: 'Lake Hawassa Shore Road, Hawassa',
    distance: 'Direct waterfront dock & terrace',
    rating: 4.95,
    reviewsCount: 38,
    trustScore: 98,
    pricePerNight: '412',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['Lake View', 'Private Pool', 'Garden', 'WiFi'],
    instantBook: true,
    tag: 'Rare Find',
    gradient: 'from-teal-600 via-cyan-700 to-emerald-900',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWb-zNCPTotyBn6DsH750-rNTwzxG5p9rsKAA3r87enJxxmU87-dTW7LEEMgxtDtLU5jTqvRqkVIuNTJ3DaBcCYDEPgd6zfJep5aF9-84kXcnDlBf-zNGyXkDPb7pTi_SMmSg637iGf8w0xcNDhrsImQGrH5V2wo-d_kLoAJK0WZ2H6BsxlSr8XiVLLaEDdt-Y_8k7xjc2kdb69cvGj9aH54mqv_giQkBTmKVULHPtERfOZy-GRhzvWA',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    title: 'Skyline Panorama Suite',
    category: 'apartments',
    location: 'Bole Medhanialem, Tower 12',
    distance: 'Heart of Addis nightlife & dining',
    rating: 4.91,
    reviewsCount: 29,
    trustScore: 97,
    pricePerNight: '285',
    hostName: 'Abebe Bikila (Verified Host)',
    amenities: ['Fiber Internet', 'Fitness Center', 'Elevator', 'Security'],
    instantBook: true,
    tag: 'Popular',
    gradient: 'from-slate-700 via-slate-800 to-slate-950',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCD9YC9LX0yAmsB0rZ9SCGkjL5YzUVJMozYhj1KnYdMRaf2_3Vkw4U0-77uvDsnjubCBnmtiE4Js-NOehKP-H6m51ZAwajG6_GigX4eL_ffyL5DpZt7tSp441bQcblIuPenTKTcngUMcIfW65di23QgbcWMynNlvswCqRPg2oQqhqv7jtic026hOYky60ASF7qG84Cer198EtbzcFaSsFmm5TFGK93IDGJYE1S_yKXznM74Kvv37AQgtw',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    title: 'Hillside Minimalist Villa',
    category: 'villas',
    location: 'Entoto Hills, North Addis',
    distance: 'Panoramic mountain views & fresh air',
    rating: 4.96,
    reviewsCount: 34,
    trustScore: 99,
    pricePerNight: '345',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['Mountain View', 'Infinity Pool', 'Free Parking', 'Chef Kitchen'],
    instantBook: true,
    tag: 'Top Rated',
    gradient: 'from-amber-600 via-orange-700 to-stone-900',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoerE6yNADEE4L07QLGRJG1e4O-Dj5XutS0xRZLAJIBqtoh0Kv0eS0PS21GyXhnGFKHviUgn4dxpy2jUGmi5UWKyrD2uGPsni8RcyxvqdpZ8TkNmsgTMaLQjUYw_OxrmI3dIK2rGWTjLj3hSJ7gXntTjZBjO1a8iba7HXryKc83-ijjS0mQUQ97A4D2f86EWRMnsh-GMK-XdTzJfcQfuAr2-X2Gr3A6lkucUxIcWvXKvd0JoB6sJ7Rvw',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000006',
    title: 'Kuriftu Crater Lakefront Villa',
    category: 'lakeside',
    additionalCategories: ['villas'],
    location: 'Lake Kuriftu Shoreline, Bishoftu',
    distance: '45 mins from Addis via Expressway',
    rating: 4.97,
    reviewsCount: 52,
    trustScore: 99,
    pricePerNight: '480',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['Lake View', 'Private Pool', 'Spa Access', 'Kayaking'],
    instantBook: true,
    tag: 'Crater Escape',
    gradient: 'from-emerald-700 via-teal-800 to-slate-900',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWb-zNCPTotyBn6DsH750-rNTwzxG5p9rsKAA3r87enJxxmU87-dTW7LEEMgxtDtLU5jTqvRqkVIuNTJ3DaBcCYDEPgd6zfJep5aF9-84kXcnDlBf-zNGyXkDPb7pTi_SMmSg637iGf8w0xcNDhrsImQGrH5V2wo-d_kLoAJK0WZ2H6BsxlSr8XiVLLaEDdt-Y_8k7xjc2kdb69cvGj9aH54mqv_giQkBTmKVULHPtERfOZy-GRhzvWA',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000007',
    title: 'Kazanchis UNECA Diplomatic Penthouse',
    category: 'apartments',
    location: 'Kazanchis Diplomatic Quarter, Addis Ababa',
    distance: 'Walking distance to UNECA & Sheraton',
    rating: 4.93,
    reviewsCount: 31,
    trustScore: 98,
    pricePerNight: '290',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['24/7 Power', 'High Speed WiFi', 'Concierge', 'Gym'],
    instantBook: true,
    tag: 'Diplomatic Tier',
    gradient: 'from-slate-800 via-indigo-900 to-blue-950',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCD9YC9LX0yAmsB0rZ9SCGkjL5YzUVJMozYhj1KnYdMRaf2_3Vkw4U0-77uvDsnjubCBnmtiE4Js-NOehKP-H6m51ZAwajG6_GigX4eL_ffyL5DpZt7tSp441bQcblIuPenTKTcngUMcIfW65di23QgbcWMynNlvswCqRPg2oQqhqv7jtic026hOYky60ASF7qG84Cer198EtbzcFaSsFmm5TFGK93IDGJYE1S_yKXznM74Kvv37AQgtw',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    title: 'Glass Pavilion Residence',
    category: 'villas',
    location: 'Old Airport Road, Lideta',
    distance: 'Exclusive gated diplomatic enclave',
    rating: 4.99,
    reviewsCount: 58,
    trustScore: 100,
    pricePerNight: '520',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['Smart Automation', 'Wine Cellar', 'Private Pool', 'Security'],
    instantBook: true,
    tag: 'Architectural Gem',
    gradient: 'from-blue-700 via-indigo-800 to-slate-900',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSLpDNiC2MVR2ZzfZBQX8mEsKix2gnavtN0drMzfT1qQDBIwWnb-F0X1ewBYeQ0bkPsFk4Ng4Y6FdlzitQd_BG68UupCkxuQmobonWRHEoz__QwqIDQ3ld0KhF3D5uegW1KEFehLj1jBObBAttnV2ZtAoDI3CcpdKdcivb2r1dBnmIxIN9ESZvNkXA26ABljVUDUBi_6cXu8ctibvGXe38ne8oQyu7BeQjSTcjiP7IPxz2NQCXwh_x9w',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000008',
    title: 'Lake Tana Shoreline Resort Suite',
    category: 'lakeside',
    additionalCategories: ['guesthouses'],
    location: 'Lake Tana North Boulevard, Bahir Dar',
    distance: 'Private pier & boat trip departure',
    rating: 4.92,
    reviewsCount: 27,
    trustScore: 97,
    pricePerNight: '230',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['Lake View', 'Boat Dock', 'Organic Breakfast', 'WiFi'],
    instantBook: true,
    tag: 'Blue Nile Source',
    gradient: 'from-cyan-700 via-blue-800 to-indigo-950',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoerE6yNADEE4L07QLGRJG1e4O-Dj5XutS0xRZLAJIBqtoh0Kv0eS0PS21GyXhnGFKHviUgn4dxpy2jUGmi5UWKyrD2uGPsni8RcyxvqdpZ8TkNmsgTMaLQjUYw_OxrmI3dIK2rGWTjLj3hSJ7gXntTjZBjO1a8iba7HXryKc83-ijjS0mQUQ97A4D2f86EWRMnsh-GMK-XdTzJfcQfuAr2-X2Gr3A6lkucUxIcWvXKvd0JoB6sJ7Rvw',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    title: 'Lalibela Escarpment Heritage Lodge',
    category: 'historic',
    additionalCategories: ['guesthouses'],
    location: 'Mountain Ridge, Lalibela',
    distance: '8-min walk to Biete Giyorgis',
    rating: 4.94,
    reviewsCount: 42,
    trustScore: 98,
    pricePerNight: '310',
    hostName: 'Abebe Bikila (Heritage Host)',
    amenities: ['Canyon View', 'Private Balcony', 'Security', 'Free Parking'],
    instantBook: true,
    tag: 'Historic Gem',
    gradient: 'from-amber-700 via-orange-800 to-stone-900',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxknKoUW7P36f-lE2P7BXH1loEt4sNBtWxQq-YpFUO2J5gknUYVgweT_RCJ1Da1lJ70AUimqr7RF09P6tGZy1ZqPsjMbhYYb6K9ro0GdKUoejBOxLO4Xy7WI1anbTapUOypBPwZ0ynO-PFKVw0k8o7OKeDynqJSvRAsKDA-qYlmWogfFZqzJlpu1gysTyAlHlbjqGTQdbfhqnwd2dMRkaG2_u7_oipi34kV1lRNmBiiX9Zo2GrSUU40Q',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000009',
    title: 'Fasil Ghebbi Heritage Guest Manor',
    category: 'historic',
    additionalCategories: ['guesthouses'],
    location: 'Royal Enclosure Hills, Gondar',
    distance: '5 mins to Royal Castles & Debre Berhan',
    rating: 4.95,
    reviewsCount: 39,
    trustScore: 99,
    pricePerNight: '275',
    hostName: 'Abebe Bikila (Heritage Host)',
    amenities: ['Historical Tour', 'Garden Terrace', 'Security', 'Traditional Coffee'],
    instantBook: true,
    tag: 'Camelot of Africa',
    gradient: 'from-amber-800 via-yellow-900 to-stone-950',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxknKoUW7P36f-lE2P7BXH1loEt4sNBtWxQq-YpFUO2J5gknUYVgweT_RCJ1Da1lJ70AUimqr7RF09P6tGZy1ZqPsjMbhYYb6K9ro0GdKUoejBOxLO4Xy7WI1anbTapUOypBPwZ0ynO-PFKVw0k8o7OKeDynqJSvRAsKDA-qYlmWogfFZqzJlpu1gysTyAlHlbjqGTQdbfhqnwd2dMRkaG2_u7_oipi34kV1lRNmBiiX9Zo2GrSUU40Q',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000010',
    title: 'Bisrate Gabriel Luxury Garden Villa',
    category: 'villas',
    location: 'South Ring Road, Bisrate Gabriel, Addis Ababa',
    distance: 'Serene residential expat quarter',
    rating: 4.98,
    reviewsCount: 48,
    trustScore: 100,
    pricePerNight: '460',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['Lush Garden', '24/7 Power Backup', 'Water Reservoir', 'Chef Service'],
    instantBook: true,
    tag: 'Private Oasis',
    gradient: 'from-emerald-800 via-green-900 to-slate-950',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkz2OG6oE8xWZHZkQBsfXBgI2gioKNMBSOfW5AJFgpMJ96qmbxt9Xjs9KnrrlgHmSC5HqhehkaETbqVTb37boq5fhlaT-qjqiZXsL4bQZ5z8waLri8TfQSdogqXmc9lkeabctZpgsYT1oEeY8bnW3dbWeXrPjDcuBhvCj_SGAfnNRZ0LiZvr2Dv-dSVKMRIQ0hPo_8N8XdNfKEMu9xdQMHOuWNSNTwBbFld0-Cj--rTkx39QREYun-ag',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000011',
    title: 'Bole Executive Airport Transit Suite',
    category: 'airport',
    additionalCategories: ['apartments'],
    location: 'Cameroon Street, Bole Hub, Addis Ababa',
    distance: '5 mins free shuttle to Bole Terminal 2',
    rating: 4.96,
    reviewsCount: 63,
    trustScore: 99,
    pricePerNight: '195',
    hostName: 'Abebe Bikila (Superhost)',
    amenities: ['Airport Shuttle', 'Soundproof Windows', 'Fast WiFi', '24/7 Check-in'],
    instantBook: true,
    tag: 'Transit Perfect',
    gradient: 'from-blue-800 via-sky-900 to-slate-950',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSLpDNiC2MVR2ZzfZBQX8mEsKix2gnavtN0drMzfT1qQDBIwWnb-F0X1ewBYeQ0bkPsFk4Ng4Y6FdlzitQd_BG68UupCkxuQmobonWRHEoz__QwqIDQ3ld0KhF3D5uegW1KEFehLj1jBObBAttnV2ZtAoDI3CcpdKdcivb2r1dBnmIxIN9ESZvNkXA26ABljVUDUBi_6cXu8ctibvGXe38ne8oQyu7BeQjSTcjiP7IPxz2NQCXwh_x9w',
  },
];

interface CategoryListingsSectionProps {
  onSelectProperty?: (id: string) => void;
  onBookClick?: (id: string) => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  limit?: number;
  showViewAllButton?: boolean;
  onViewAllClick?: () => void;
}

export default function CategoryListingsSection({
  onSelectProperty,
  onBookClick,
  title = 'Verified Luxury Homes & Boutique Lodges',
  subtitle,
  badge = 'EXPLORE ETHIOPIAN STAYS',
  limit,
  showViewAllButton = false,
  onViewAllClick,
}: CategoryListingsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePropertyClick = (id: string) => {
    if (onSelectProperty) {
      onSelectProperty(id);
    } else if (onBookClick) {
      onBookClick(id);
    }
  };

  const baseFiltered = selectedCategory === 'all'
    ? LISTINGS
    : LISTINGS.filter((l) => l.category === selectedCategory || l.additionalCategories?.includes(selectedCategory));

  const filteredListings = limit ? baseFiltered.slice(0, limit) : baseFiltered;

  return (
    <section className="w-full py-10 sm:py-14 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <h2 className="text-xs font-bold tracking-widest text-[#2563eb] uppercase mb-1.5 font-mono">
              {badge}
            </h2>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-[-0.03em]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-800">{filteredListings.length}</strong> of {LISTINGS.length} verified stays with 24/7 power &amp; water
          </div>
        </div>

        {/* Airbnb-style Category Bar */}
        <div className="relative mb-8 border-b border-slate-100 pb-1">
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-none py-1.5 px-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center gap-1.5 py-1.5 px-1 whitespace-nowrap transition-all duration-200 cursor-pointer group border-b-2 -mb-1 ${
                    isActive
                      ? 'border-[#2563eb] text-[#2563eb]'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#2563eb]' : 'text-slate-500 group-hover:text-slate-800'}`}>
                    {cat.icon}
                  </div>
                  <span className={`text-xs tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Listings Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredListings.map((item) => {
            const isFav = favorites[item.id] || false;

            return (
              <Link
                key={item.id}
                href={`/properties/${item.id}`}
                onClick={(e: React.MouseEvent) => {
                  if (onSelectProperty) {
                    e.preventDefault();
                    onSelectProperty(item.id);
                  }
                }}
                className="group bg-white border border-slate-200 hover:border-blue-400 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-1"
              >
                {/* Visual Header / Artwork */}
                <div className={`h-44 sm:h-48 w-full bg-gradient-to-br ${item.gradient} relative overflow-hidden flex flex-col justify-between p-3.5 text-white`}>
                  
                  {/* Real Photo or Illustration */}
                  {item.imageUrl ? (
                    <>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/40 pointer-events-none" />
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px]" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-85 group-hover:scale-105 transition-transform duration-300">
                        {item.renderIllustration?.()}
                      </div>
                    </>
                  )}

                  {/* Top Badges Row */}
                  <div className="relative z-10 flex items-center justify-between">
                    {item.tag ? (
                      <span className="bg-white/95 backdrop-blur-xs text-slate-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                        {item.tag}
                      </span>
                    ) : <span />}

                    {/* Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      aria-label="Save stay"
                      className="w-7 h-7 rounded-full bg-black/35 backdrop-blur-xs flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-colors shadow-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? '#ef4444' : 'none'} stroke={isFav ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>

                  {/* Bottom Trust Badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-white/90 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                      {item.distance}
                    </span>
                    <span className="text-[10px] font-bold bg-[#2563eb] text-white px-2 py-0.5 rounded-md border border-white/20 shadow-2xs">
                      ★ {item.trustScore}% Trust
                    </span>
                  </div>

                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Location & Star Rating */}
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900 truncate">{item.location}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-amber-500 text-xs">★</span>
                        <span className="font-bold text-slate-800">{item.rating}</span>
                        <span className="text-slate-400 text-[10px]">({item.reviewsCount})</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-[#2563eb] transition-colors line-clamp-1 mb-2">
                      {item.title}
                    </h4>

                    {/* Amenities Checklist */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {item.amenities.map((am, idx) => (
                        <span key={idx} className="text-[9px] font-semibold bg-slate-50 text-slate-600 border border-slate-200/80 px-1.5 py-0.5 rounded">
                          {am.includes('Generator') && '⚡ '}
                          {am.includes('Water') && '💧 '}
                          {am.includes('Pool') && '🏊 '}
                          {am.includes('View') && '🌅 '}
                          {am.includes('Smart') && '🏠 '}
                          {am.includes('WiFi') && '📶 '}
                          {am.includes('Fiber') && '📶 '}
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price & Booking Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                    <div>
                      <span className="text-sm sm:text-base font-black text-slate-900">
                        ${item.pricePerNight} <span className="text-xs font-semibold text-slate-500">/ night</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-0.5 font-medium">{item.hostName}</span>
                    </div>

                    <span className="px-3.5 py-1.5 bg-slate-900 group-hover:bg-[#2563eb] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-2xs">
                      View Details
                    </span>
                  </div>

                </div>

              </Link>
            );
          })}
        </div>

        {/* Optional View All Button */}
        {showViewAllButton && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={onViewAllClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>Explore All {LISTINGS.length} Ethiopian Stays</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
