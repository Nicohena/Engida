export type Language = 'en' | 'am';

export interface LandingTranslations {
  nav: {
    exploreStays: string;
    becomeHost: string;
    hostBadge: string;
    login: string;
    currency: string;
    calendarGregorian: string;
    calendarEthiopian: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  search: {
    locationLabel: string;
    locationPlaceholder: string;
    datesLabel: string;
    datesPlaceholder: string;
    guestsLabel: string;
    guestsPlaceholder: string;
    propertyTypeLabel: string;
    searchBtn: string;
    popularLocationsTitle: string;
    ethiopianCalendarActive: string;
    gregorianCalendarActive: string;
  };
  aiAssistant: {
    badge: string;
    title: string;
    subtitle: string;
    inputPlaceholder: string;
    tryAsking: string;
    askBtn: string;
    parsedIntentLabel: string;
  };
  dockedBanner: {
    item1Title: string;
    item1Desc: string;
    item2Title: string;
    item2Desc: string;
    item3Title: string;
    item3Desc: string;
  };
  destinations: {
    tagline: string;
    title: string;
    description: string;
    viewAll: string;
    staysCountSuffix: string;
    startingFrom: string;
  };
  featuredStays: {
    tagline: string;
    title: string;
    description: string;
    verifiedScoreSuffix: string;
    instantBook: string;
    night: string;
    filterAll: string;
    filterVillas: string;
    filterApartments: string;
    filterGuesthouses: string;
    filterHotels: string;
  };
  payments: {
    title: string;
    subtitle: string;
    escrowBadge: string;
    instantSettlement: string;
    zeroFx: string;
  };
  howItWorks: {
    tagline: string;
    title: string;
    description: string;
    tabGuests: string;
    tabHosts: string;
  };
  trust: {
    tagline: string;
    title: string;
    description: string;
  };
  hostEarnings: {
    tagline: string;
    title: string;
    description: string;
    selectLocation: string;
    selectType: string;
    estimatedEarnings: string;
    perMonth: string;
    cta: string;
    guarantee: string;
  };
  pwaPerks: {
    badge: string;
    title: string;
    desc: string;
  };
  footer: {
    tagline: string;
    about: string;
    destinations: string;
    hosting: string;
    support: string;
    legal: string;
    copyright: string;
  };
}

export const content: Record<Language, LandingTranslations> = {
  en: {
    nav: {
      exploreStays: 'Explore Stays',
      becomeHost: 'Become a Host',
      hostBadge: '0% Listing Fee',
      login: 'Sign In',
      currency: 'ETB (ብር)',
      calendarGregorian: 'Gregorian',
      calendarEthiopian: 'Ethiopian Cal',
    },
    hero: {
      headline: 'Authentic Ethiopian Stays, Verified & Effortless',
      subheadline:
        'Discover handpicked homes, boutique guesthouses, and scenic lodges across Ethiopia. Seamless local payments with Telebirr, CBE & verified host trust.',
      ctaPrimary: 'Explore Stays Across Ethiopia',
      ctaSecondary: 'Ask AI Concierge',
    },
    search: {
      locationLabel: 'Where in Ethiopia?',
      locationPlaceholder: 'Bole, Kazanchis, Hawassa, Bishoftu...',
      datesLabel: 'Check-in — Check-out',
      datesPlaceholder: 'Add travel dates',
      guestsLabel: 'Who',
      guestsPlaceholder: '2 Guests, 1 Room',
      propertyTypeLabel: 'All Stays',
      searchBtn: 'Search Stays',
      popularLocationsTitle: 'Trending Ethiopian Destinations',
      ethiopianCalendarActive: 'Ethiopian Calendar (መስከረም — ጳጉሜ)',
      gregorianCalendarActive: 'Gregorian Calendar',
    },
    aiAssistant: {
      badge: 'Engida AI Concierge',
      title: 'Search in Natural Language',
      subtitle: 'Describe your ideal stay like you would to a local friend, and our AI will extract the exact criteria.',
      inputPlaceholder: "e.g., 'A cozy 2-bedroom in Bole near Edna Mall with backup generator under 4,500 ETB'",
      tryAsking: 'Try asking:',
      askBtn: 'Find with AI',
      parsedIntentLabel: 'AI Extracted Filters:',
    },
    dockedBanner: {
      item1Title: '100% Verified Stays',
      item1Desc: 'Physical inspections & Kebele/Passport KYC',
      item2Title: 'Telebirr & Local Banks',
      item2Desc: 'Direct ETB checkout with zero FX charges',
      item3Title: 'Escrow Guest Protection',
      item3Desc: 'Host payout released 24h after check-in',
    },
    destinations: {
      tagline: 'POPULAR DESTINATIONS',
      title: 'Explore Ethiopia’s Most Beloved Hubs',
      description: 'From vibrant diplomatic quarters in Addis Ababa to serene lakeside getaways and historic northern wonders.',
      viewAll: 'View All Destinations',
      staysCountSuffix: 'verified stays',
      startingFrom: 'From',
    },
    featuredStays: {
      tagline: 'HANDPICKED ACCOMMODATIONS',
      title: 'Featured Stays with Verified Trust',
      description: 'Curated homes and guesthouses equipped with essential amenities like 24/7 power backup and continuous water supply.',
      verifiedScoreSuffix: 'Trust Score',
      instantBook: 'Instant Book',
      night: '/ night',
      filterAll: 'All Stays',
      filterVillas: 'Villas & Houses',
      filterApartments: 'Serviced Apartments',
      filterGuesthouses: 'Guesthouses',
      filterHotels: 'Boutique Lodges',
    },
    payments: {
      title: 'Supported Ethiopian Payment Methods',
      subtitle: 'Pay securely in Ethiopian Birr (ETB) with your preferred national wallet or card with immediate booking confirmation.',
      escrowBadge: 'Funds held in secure escrow until check-in',
      instantSettlement: 'Instant SMS & in-app booking confirmation',
      zeroFx: '100% transparent pricing with zero foreign markup',
    },
    howItWorks: {
      tagline: 'HOW ENGIDA WORKS',
      title: 'Simple, Transparent, and Secure for Everyone',
      description: 'Whether you are booking your next getaway or hosting guests from around the world, Engida protects every step.',
      tabGuests: 'For Guests & Travelers',
      tabHosts: 'For Property Hosts',
    },
    trust: {
      tagline: 'UNCOMPROMISED SAFETY',
      title: 'The 4 Pillars of Engida Trust',
      description: 'We built rigorous physical and digital guardrails specifically tailored for the Ethiopian hospitality marketplace.',
    },
    hostEarnings: {
      tagline: 'HOST WITH ENGIDA',
      title: 'Turn Your Ethiopian Property into Steady Income',
      description: 'Join hundreds of hosts in Addis Ababa and beyond. Keep 100% control over pricing with smart dynamic recommendations.',
      selectLocation: 'Select Location / Sub-city',
      selectType: 'Property Type',
      estimatedEarnings: 'Estimated Monthly Revenue',
      perMonth: 'ETB / month',
      cta: 'Start Hosting on Engida',
      guarantee: 'Zero upfront fees • Guaranteed payouts to your local bank or Telebirr account.',
    },
    pwaPerks: {
      badge: 'BUILT FOR ETHIOPIA',
      title: 'Ultra-Fast on 3G & Works Offline',
      desc: 'Engida is engineered as a lightweight Progressive Web App that consumes minimal data and keeps your booking passes accessible even without network connection.',
    },
    footer: {
      tagline: 'Intelligent, Secure and Localized Accommodation & Tourism Marketplace for Ethiopia.',
      about: 'About Engida',
      destinations: 'Top Destinations',
      hosting: 'Host Resources',
      support: 'Support & Safety',
      legal: 'Legal & Policies',
      copyright: '© 2026 Engida Inc. All rights reserved. Addis Ababa, Ethiopia.',
    },
  },
  am: {
    nav: {
      exploreStays: 'ማረፊያዎችን ፈልግ',
      becomeHost: 'አስተናጋጅ ይሁኑ',
      hostBadge: 'የመመዝገቢያ ክፍያ 0%',
      login: 'ግባ',
      currency: 'ብር (ETB)',
      calendarGregorian: 'ፈረንጅ ቀን',
      calendarEthiopian: 'የኢትዮጵያ ቀን',
    },
    hero: {
      headline: 'አስተማማኝ እና የተረጋገጡ የኢትዮጵያ ማረፊያዎች',
      subheadline:
        'በመላው ኢትዮጵያ ምርጥ አፓርታማዎችን፣ የእንግዳ ማረፊያዎችን እና ሎጆችን ያግኙ። በቴሌብር፣ በሲቢኢ ብር እና በሀገር ውስጥ ባንኮች በቀላሉ ይክፈሉ።',
      ctaPrimary: 'ማረፊያዎችን ይፈልጉ',
      ctaSecondary: 'በአይ (AI) ያነጋግሩ',
    },
    search: {
      locationLabel: 'የት መሄድ ይፈልጋሉ?',
      locationPlaceholder: 'ቦሌ፣ ካዛንቺስ፣ ሐዋሳ፣ ቢሾፍቱ...',
      datesLabel: 'የመግቢያ — የመውጫ ቀን',
      datesPlaceholder: 'ቀን ይምረጡ',
      guestsLabel: 'እንግዶች',
      guestsPlaceholder: '2 እንግዶች፣ 1 ክፍል',
      propertyTypeLabel: 'ሁሉም ማረፊያዎች',
      searchBtn: 'ማረፊያ ፈልግ',
      popularLocationsTitle: 'ተወዳጅ የኢትዮጵያ መዳረሻዎች',
      ethiopianCalendarActive: 'የኢትዮጵያ ዘመን አቆጣጠር (መስከረም — ጳጉሜ)',
      gregorianCalendarActive: 'የፈረንጆች ዘመን አቆጣጠር',
    },
    aiAssistant: {
      badge: 'የእንግዳ አርቴፊሻል ኢንተለጀንስ ረዳት',
      title: 'በተፈጥሮ ቋንቋ ይፈልጉ',
      subtitle: 'የሚፈልጉትን ማረፊያ እንደፈለጉት ይግለጹ፤ ረዳታችን ተስማሚውን መረጃ ወዲያውኑ ያዘጋጅልዎታል።',
      inputPlaceholder: "ለምሳሌ፦ 'ቦሌ ኤድና ሞል አካባቢ ጀነሬተር ያለው የ 2 መኝታ ቤት አፓርታማ ከ 4,500 ብር በታች'",
      tryAsking: 'እነዚህን ይሞክሩ፦',
      askBtn: 'በአይ (AI) ፈልግ',
      parsedIntentLabel: 'የተለዩ መመዘኛዎች፦',
    },
    dockedBanner: {
      item1Title: '100% የተረጋገጡ ማረፊያዎች',
      item1Desc: 'በአካል የተፈተሹ እና የይዞታ ማረጋገጫ ያላቸው',
      item2Title: 'በቴሌብር እና በሀገር ውስጥ ባንኮች',
      item2Desc: 'ያለ ምንም ተጨማሪ የውጭ ምንዛሪ ክፍያ በብር ይክፈሉ',
      item3Title: 'አስተማማኝ የክፍያ ዋስትና',
      item3Desc: 'ክፍያ ለአስተናጋጁ የሚተላለፈው ከገቡ ከ 24 ሰዓት በኋላ ብቻ ነው',
    },
    destinations: {
      tagline: 'ተወዳጅ መዳረሻዎች',
      title: 'የኢትዮጵያን ድንቅ ከተሞች ይጎብኙ',
      description: 'ከአዲስ አበባ የዲፕሎማቲክ ሰፈሮች እስከ ሐዋሳ እና ቢሾፍቱ ሀይቆች፣ እንዲሁም የሰሜን ታሪካዊ ቦታዎች።',
      viewAll: 'ሁሉንም መዳረሻዎች ይመልከቱ',
      staysCountSuffix: 'የተረጋገጡ ማረፊያዎች',
      startingFrom: 'ከ',
    },
    featuredStays: {
      tagline: 'ምርጥ ማረፊያዎች',
      title: 'በከፍተኛ አመኔታ የተመረጡ ማረፊያዎች',
      description: '24/7 የኤሌክትሪክ ጀነሬተር እና የውሃ ታንከር ያላቸው ምቹ ቤቶች።',
      verifiedScoreSuffix: 'የእምነት ደረጃ',
      instantBook: 'ወዲያውኑ ይያዙ',
      night: '/ በሌሊት',
      filterAll: 'ሁሉም',
      filterVillas: 'ቪላ እና ቤቶች',
      filterApartments: 'አፓርታማዎች',
      filterGuesthouses: 'የእንግዳ ማረፊያዎች',
      filterHotels: 'ቡቲክ ሎጆች',
    },
    payments: {
      title: 'የሚደገፉ የሀገር ውስጥ የክፍያ አማራጮች',
      subtitle: 'በኢትዮጵያ ብር (ETB) በሚመርጡት ዲጂታል የኪስ ቦርሳ ወይም ባንክ ካርድ በቅጽበት ይክፈሉ።',
      escrowBadge: 'ገንዘብዎ እስከመግቢያዎ ድረስ በዋስትና ተጠብቆ ይቆያል',
      instantSettlement: 'ወዲያውኑ በኤስኤምኤስ (SMS) የማረጋገጫ መልዕክት ይደርስዎታል',
      zeroFx: 'ምንም አይነት የተደበቀ ክፍያ የሌለው ግልጽ አሰራር',
    },
    howItWorks: {
      tagline: 'እንግዳ እንዴት ይሰራል?',
      title: 'ቀላል፣ ግልጽ እና ደህንነቱ የተጠበቀ',
      description: 'ማረፊያ ለመያዝም ሆነ ቤትዎን ለቱሪስቶችና መንገደኞች ለማከራየት እንግዳ አስተማማኝ ምርጫዎ ነው።',
      tabGuests: 'ለእንግዶች እና መንገደኞች',
      tabHosts: 'ለአስተናጋጆች እና ለቤት ባለቤቶች',
    },
    trust: {
      tagline: 'አስተማማኝ ደህንነት',
      title: '4ቱ የእንግዳ የመተማመኛ ምሰሶዎች',
      description: 'ለኢትዮጵያ የቱሪዝም እና የእንግዳ ተቀባይነት ዘርፍ ተስማሚ የሆኑ የደህንነት መመሪያዎችን አዘጋጅተናል።',
    },
    hostEarnings: {
      tagline: 'ከእንግዳ ጋር ያስተናግዱ',
      title: 'ንብረትዎን ወደ አስተማማኝ የገቢ ምንጭ ይቀይሩ',
      description: 'በአዲስ አበባ እና በክልል ከተሞች የሚገኙ አስተናጋጆችን ይቀላቀሉ። ዋጋዎን በፈለጉት መልኩ ይቆጣጠሩ።',
      selectLocation: 'አካባቢ / ክፍለ ከተማ ይምረጡ',
      selectType: 'የማረፊያ አይነት',
      estimatedEarnings: 'የሚገመት ወርሃዊ ገቢ',
      perMonth: 'ብር / በወር',
      cta: 'አሁን ማስተናገድ ይጀምሩ',
      guarantee: 'የመመዝገቢያ ክፍያ የለም • ክፍያዎ በቀጥታ ወደ ባንክ ሂሳብዎ ወይም ቴሌብር ይገባል።',
    },
    pwaPerks: {
      badge: 'ለኢትዮጵያ የተሰራ',
      title: 'በ 3G ፍጥነት የሚሰራ እና ያለ ኢንተርኔት የሚያገለግል',
      desc: 'እንግዳ ዝቅተኛ የኢንተርኔት ዳታ እንዲጠቀም ተደርጎ የተሰራ ሲሆን፣ የያዟቸውን ማረፊያዎች ያለ ኔትወርክ ማየት ይችላሉ።',
    },
    footer: {
      tagline: 'ብልህ፣ ደህንነቱ የተጠበቀ እና ሀገር በቀል የኢትዮጵያ ማረፊያና ቱሪዝም ገበያ።',
      about: 'ስለ እንግዳ',
      destinations: 'ዋና ዋና መዳረሻዎች',
      hosting: 'የአስተናጋጅ መረጃ',
      support: 'እርዳታ እና ደህንነት',
      legal: 'ህጋዊ መመሪያዎች',
      copyright: '© 2026 እንግዳ ኃ.የተ.የግ.ማህበር። ሁሉም መብቱ የተጠበቀ ነው። አዲስ አበባ፣ ኢትዮጵያ።',
    },
  },
};
