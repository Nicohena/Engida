'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export type PartitionTab =
  | 'home'
  | 'stays'
  | 'ai-discovery'
  | 'trust-verification'
  | 'host-calculator'
  | 'how-it-works'
  | 'payments-escrow'
  | 'destinations'
  | 'benefits';

interface LandingHeaderProps {
  activeTab: PartitionTab;
  onTabChange: (tab: PartitionTab) => void;
}

interface MoreDropdownItem {
  id: PartitionTab;
  title: string;
  amharicTitle: string;
  subtitle: string;
  amharicSubtitle: string;
  badge?: string;
  icon: (active: boolean) => React.ReactNode;
}

const MORE_DROPDOWN_ITEMS: MoreDropdownItem[] = [
  {
    id: 'how-it-works',
    title: 'How It Works',
    amharicTitle: 'አሰራር',
    subtitle: 'Step-by-step guide for guests, verification & arrival',
    amharicSubtitle: 'የምዝገባ፣ ማረጋገጫና የመግቢያ መመሪያ',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'payments-escrow',
    title: 'Payments & Escrow',
    amharicTitle: 'ክፍያዎችና ዋስትና',
    subtitle: 'Telebirr, CBE Birr & 24-hour guest escrow protection',
    amharicSubtitle: 'ቴሌብር፣ ንግድ ባንክና የ24-ሰዓት አስተማማኝ አሰራር',
    badge: 'ETB',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <circle cx="12" cy="15" r="2" />
      </svg>
    ),
  },
  {
    id: 'destinations',
    title: 'Popular Destinations',
    amharicTitle: 'ተወዳጅ መዳረሻዎች',
    subtitle: 'Bole, Kazanchis, Bishoftu, Hawassa & Lalibela',
    amharicSubtitle: 'አዲስ አበባ፣ ቢሾፍቱ፣ ሀዋሳ፣ ባሕር ዳር እና ላሊበላ',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: 'benefits',
    title: 'Benefits & Guarantees',
    amharicTitle: 'ጥቅሞችና ዋስትናዎች',
    subtitle: '24/7 power & water guarantee, verified reviews',
    amharicSubtitle: 'የ24/7 መብራትና ውሃ ዋስትና እና አስተማማኝ ግምገማዎች',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#64748b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

export default function LandingHeader({ activeTab, onTabChange }: LandingHeaderProps) {
  const [role, setRole] = useState<'Guest' | 'Host'>('Guest');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [language, setLanguage] = useState<'English' | 'Amharic'>('English');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (moreRef.current && !moreRef.current.contains(target) && mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMoreDropdownOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(target)) {
        setRoleDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(target)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMoreActive =
    activeTab === 'how-it-works' ||
    activeTab === 'payments-escrow' ||
    activeTab === 'destinations' ||
    activeTab === 'benefits';

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md py-3 sm:py-3.5 px-4 sm:px-6 lg:px-10 z-50 border-b border-slate-100 shadow-2xs transition-all duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand Logo "Engida" */}
        <button
          type="button"
          onClick={() => {
            onTabChange('home');
            setMoreDropdownOpen(false);
          }}
          className="flex items-center gap-1.5 shrink-0 cursor-pointer text-left group"
        >
          <span className="text-2xl sm:text-[25px] font-extrabold tracking-[-0.03em] text-slate-900 group-hover:text-[#2563eb] transition-colors select-none">
            Engida
          </span>
          <span className="text-[11px] font-semibold text-[#2563eb] bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100/80">
            እንግዳ
          </span>
        </button>

        {/* Center Marketing-Driven Navbar Items (High-Value Features Visible) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 relative">
          
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => {
              onTabChange('home');
              setMoreDropdownOpen(false);
            }}
            className={`text-xs lg:text-[13px] font-medium transition-all duration-200 cursor-pointer px-3.5 py-1.5 rounded-full ${
              activeTab === 'home'
                ? 'bg-white text-[#2563eb] font-bold shadow-xs'
                : 'text-slate-600 hover:text-[#2563eb] hover:bg-white/60'
            }`}
          >
            {language === 'Amharic' ? 'መነሻ' : 'Home'}
          </button>

          {/* 2. Stays & Homes */}
          <button
            type="button"
            onClick={() => {
              onTabChange('stays');
              setMoreDropdownOpen(false);
            }}
            className={`text-xs lg:text-[13px] font-medium transition-all duration-200 cursor-pointer px-3.5 py-1.5 rounded-full ${
              activeTab === 'stays'
                ? 'bg-white text-[#2563eb] font-bold shadow-xs'
                : 'text-slate-600 hover:text-[#2563eb] hover:bg-white/60'
            }`}
          >
            {language === 'Amharic' ? 'ማረፊያዎች' : 'Stays'}
          </button>

          {/* 3. AI Discovery (High Marketing Differentiator) */}
          <button
            type="button"
            onClick={() => {
              onTabChange('ai-discovery');
              setMoreDropdownOpen(false);
            }}
            className={`text-xs lg:text-[13px] font-medium transition-all duration-200 cursor-pointer px-3.5 py-1.5 rounded-full flex items-center gap-1.5 ${
              activeTab === 'ai-discovery'
                ? 'bg-white text-[#2563eb] font-bold shadow-xs'
                : 'text-slate-600 hover:text-[#2563eb] hover:bg-white/60'
            }`}
          >
            <span>{language === 'Amharic' ? 'አይ ረዳት' : 'AI Discovery'}</span>
            <span className="text-[9px] font-extrabold bg-[#2563eb] text-white px-1.5 py-0.2 rounded-md shadow-2xs">
              AI
            </span>
          </button>

          {/* 4. Trust & Verification (Key Safety & Confidence Driver) */}
          <button
            type="button"
            onClick={() => {
              onTabChange('trust-verification');
              setMoreDropdownOpen(false);
            }}
            className={`text-xs lg:text-[13px] font-medium transition-all duration-200 cursor-pointer px-3.5 py-1.5 rounded-full flex items-center gap-1.5 ${
              activeTab === 'trust-verification'
                ? 'bg-white text-[#2563eb] font-bold shadow-xs'
                : 'text-slate-600 hover:text-[#2563eb] hover:bg-white/60'
            }`}
          >
            <span>{language === 'Amharic' ? 'ማረጋገጫ' : '100% Verified'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </button>

          {/* 5. Host & Earn (Supply Growth Driver) */}
          <button
            type="button"
            onClick={() => {
              onTabChange('host-calculator');
              setMoreDropdownOpen(false);
            }}
            className={`text-xs lg:text-[13px] font-medium transition-all duration-200 cursor-pointer px-3.5 py-1.5 rounded-full flex items-center gap-1.5 ${
              activeTab === 'host-calculator'
                ? 'bg-white text-[#2563eb] font-bold shadow-xs'
                : 'text-slate-600 hover:text-[#2563eb] hover:bg-white/60'
            }`}
          >
            <span>{language === 'Amharic' ? 'አስተናግደው ያግኙ' : 'Host & Earn'}</span>
            <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200/80 px-1.5 py-0.2 rounded">
              0% Fee
            </span>
          </button>

          {/* 6. More ▾ Dropdown (Secondary Information) */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              className={`text-xs lg:text-[13px] font-medium transition-all duration-200 cursor-pointer px-3.5 py-1.5 rounded-full flex items-center gap-1.5 ${
                isMoreActive || moreDropdownOpen
                  ? 'bg-white text-[#2563eb] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-[#2563eb] hover:bg-white/60'
              }`}
            >
              <span>{language === 'Amharic' ? 'ተጨማሪ' : 'More'}</span>
              {isMoreActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
              )}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown Menu Container */}
            {moreDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 z-50 animate-partition">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                  {language === 'Amharic' ? 'ተጨማሪ መረጃዎች' : 'Platform & Discovery'}
                </div>

                <div className="flex flex-col gap-0.5">
                  {MORE_DROPDOWN_ITEMS.map((item) => {
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onTabChange(item.id);
                          setMoreDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl transition-all duration-150 flex items-start gap-2.5 cursor-pointer group ${
                          isSelected
                            ? 'bg-blue-50/80 text-[#2563eb]'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg shrink-0 transition-colors mt-0.5 ${
                            isSelected
                              ? 'bg-blue-100/70 text-[#2563eb]'
                              : 'bg-slate-100 group-hover:bg-blue-50 group-hover:text-[#2563eb] text-slate-500'
                          }`}
                        >
                          {item.icon(isSelected)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? 'text-[#2563eb]' : 'text-slate-900 group-hover:text-[#2563eb]'}`}>
                              {language === 'Amharic' ? item.amharicTitle : item.title}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-extrabold bg-[#2563eb] text-white px-1.5 py-0.2 rounded">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-snug">
                            {language === 'Amharic' ? item.amharicSubtitle : item.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </nav>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3.5 text-xs sm:text-sm font-medium text-slate-800 shrink-0">
          
          {/* Role Dropdown */}
          <div className="relative" ref={roleRef}>
            <button
              type="button"
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen);
                setLangDropdownOpen(false);
                setMoreDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer py-1"
            >
              <span>I am a {role}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-partition">
                <button
                  type="button"
                  onClick={() => {
                    setRole('Guest');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer ${
                    role === 'Guest' ? 'text-[#2563eb] font-semibold' : 'text-slate-700'
                  }`}
                >
                  I am a Guest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('Host');
                    setRoleDropdownOpen(false);
                    onTabChange('host-calculator');
                  }}
                  className={`w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer ${
                    role === 'Host' ? 'text-[#2563eb] font-semibold' : 'text-slate-700'
                  }`}
                >
                  I am a Host
                </button>
              </div>
            )}
          </div>

          {/* Login Button */}
          <Link
            href="/login"
            className="border border-slate-300 hover:border-slate-400 text-slate-800 hover:text-slate-950 px-3.5 sm:px-4.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 hover:bg-slate-50/80 cursor-pointer shadow-2xs"
          >
            Login
          </Link>

          {/* Language Dropdown */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setRoleDropdownOpen(false);
                setMoreDropdownOpen(false);
              }}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer py-1"
            >
              <span>{language}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-partition">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('English');
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer ${
                    language === 'English' ? 'text-[#2563eb] font-semibold' : 'text-slate-700'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('Amharic');
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer ${
                    language === 'Amharic' ? 'text-[#2563eb] font-semibold' : 'text-slate-700'
                  }`}
                >
                  አማርኛ (Amharic)
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Mobile Sub-Navbar: Horizontal Scrollable Pills */}
      <div className="md:hidden pt-2 pb-1 border-t border-slate-100 mt-2 relative" ref={mobileMenuRef}>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none px-1 py-0.5">
          <button
            type="button"
            onClick={() => {
              onTabChange('home');
              setMoreDropdownOpen(false);
            }}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
              activeTab === 'home' ? 'bg-[#2563eb] text-white' : 'text-slate-600'
            }`}
          >
            {language === 'Amharic' ? 'መነሻ' : 'Home'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              onTabChange('stays');
              setMoreDropdownOpen(false);
            }}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
              activeTab === 'stays' ? 'bg-[#2563eb] text-white' : 'text-slate-600'
            }`}
          >
            {language === 'Amharic' ? 'ማረፊያዎች' : 'Stays'}
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange('ai-discovery');
              setMoreDropdownOpen(false);
            }}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'ai-discovery' ? 'bg-[#2563eb] text-white' : 'text-slate-600'
            }`}
          >
            <span>{language === 'Amharic' ? 'አይ ረዳት' : 'AI'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange('trust-verification');
              setMoreDropdownOpen(false);
            }}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
              activeTab === 'trust-verification' ? 'bg-[#2563eb] text-white' : 'text-slate-600'
            }`}
          >
            {language === 'Amharic' ? 'ማረጋገጫ' : 'Verified'}
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange('host-calculator');
              setMoreDropdownOpen(false);
            }}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
              activeTab === 'host-calculator' ? 'bg-[#2563eb] text-white' : 'text-slate-600'
            }`}
          >
            {language === 'Amharic' ? 'አስተናግድ' : 'Host & Earn'}
          </button>

          <button
            type="button"
            onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1 ${
              isMoreActive || moreDropdownOpen ? 'bg-[#2563eb] text-white' : 'text-slate-600'
            }`}
          >
            <span>{language === 'Amharic' ? 'ተጨማሪ' : 'More'}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu for More */}
        {moreDropdownOpen && (
          <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 animate-partition">
            <div className="flex flex-col gap-1">
              {MORE_DROPDOWN_ITEMS.map((item) => {
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      setMoreDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                      isSelected ? 'bg-blue-50 text-[#2563eb] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="shrink-0">{item.icon(isSelected)}</div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span>{language === 'Amharic' ? item.amharicTitle : item.title}</span>
                        {item.badge && (
                          <span className="text-[9px] bg-[#2563eb] text-white font-bold px-1.5 py-0.2 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{item.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
