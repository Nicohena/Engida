import React from 'react';

interface CountryFlagProps {
  countryCode: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Authentic vector SVG national flag icons.
 * Renders identically across all operating systems without relying on OS emoji fonts.
 */
export default function CountryFlag({
  countryCode,
  className = '',
  width = 24,
  height = 16,
}: CountryFlagProps) {
  const code = countryCode?.toUpperCase() || 'OTHER';

  const baseSvgProps = {
    width,
    height,
    viewBox: '0 0 640 480',
    className: `inline-block shrink-0 rounded-[3px] shadow-sm border border-slate-300/60 object-cover ${className}`,
    xmlns: 'http://www.w3.org/2000/svg',
  };

  switch (code) {
    case 'ET': // Ethiopia
      return (
        <svg {...baseSvgProps} aria-label="Flag of Ethiopia">
          <rect width="640" height="160" fill="#078930" />
          <rect y="160" width="640" height="160" fill="#FCDD09" />
          <rect y="320" width="640" height="160" fill="#DA121A" />
          {/* Blue central disc */}
          <circle cx="320" cy="240" r="105" fill="#0F47AF" />
          {/* Yellow pentagram star */}
          <g fill="#FCDD09">
            <polygon points="320,155 342,225 415,225 356,267 378,335 320,293 262,335 284,267 225,225 298,225" />
            <line x1="320" y1="180" x2="320" y2="300" stroke="#0F47AF" strokeWidth="6" />
            <line x1="250" y1="230" x2="390" y2="250" stroke="#0F47AF" strokeWidth="6" />
            <line x1="265" y1="285" x2="375" y2="195" stroke="#0F47AF" strokeWidth="6" />
          </g>
        </svg>
      );

    case 'US': // United States
      return (
        <svg {...baseSvgProps} aria-label="Flag of the United States">
          <rect width="640" height="480" fill="#B22234" />
          {/* White stripes */}
          <rect y="37" width="640" height="37" fill="#FFFFFF" />
          <rect y="111" width="640" height="37" fill="#FFFFFF" />
          <rect y="185" width="640" height="37" fill="#FFFFFF" />
          <rect y="259" width="640" height="37" fill="#FFFFFF" />
          <rect y="333" width="640" height="37" fill="#FFFFFF" />
          <rect y="407" width="640" height="37" fill="#FFFFFF" />
          {/* Blue canton */}
          <rect width="256" height="259" fill="#3C3B6E" />
          {/* Stars grid representation */}
          <g fill="#FFFFFF" transform="scale(1.2) translate(12, 10)">
            {[0, 1, 2, 3, 4].map((row) =>
              [0, 1, 2, 3, 4, 5].map((col) => (
                <circle key={`${row}-${col}`} cx={col * 32 + 10} cy={row * 36 + 10} r="5" />
              )),
            )}
          </g>
        </svg>
      );

    case 'GB': // United Kingdom
      return (
        <svg {...baseSvgProps} aria-label="Flag of the United Kingdom">
          <clipPath id="gb-clip">
            <rect width="640" height="480" />
          </clipPath>
          <g clipPath="url(#gb-clip)">
            <rect width="640" height="480" fill="#012169" />
            {/* White diagonals */}
            <line x1="0" y1="0" x2="640" y2="480" stroke="#FFFFFF" strokeWidth="60" />
            <line x1="640" y1="0" x2="0" y2="480" stroke="#FFFFFF" strokeWidth="60" />
            {/* Red diagonals */}
            <line x1="0" y1="0" x2="320" y2="240" stroke="#C8102E" strokeWidth="20" />
            <line x1="640" y1="480" x2="320" y2="240" stroke="#C8102E" strokeWidth="20" />
            <line x1="640" y1="0" x2="320" y2="240" stroke="#C8102E" strokeWidth="20" />
            <line x1="0" y1="480" x2="320" y2="240" stroke="#C8102E" strokeWidth="20" />
            {/* White cross */}
            <rect x="270" width="100" height="480" fill="#FFFFFF" />
            <rect y="190" width="640" height="100" fill="#FFFFFF" />
            {/* Red cross */}
            <rect x="290" width="60" height="480" fill="#C8102E" />
            <rect y="210" width="640" height="60" fill="#C8102E" />
          </g>
        </svg>
      );

    case 'CA': // Canada
      return (
        <svg {...baseSvgProps} aria-label="Flag of Canada">
          <rect width="640" height="480" fill="#DA1A32" />
          <rect x="160" width="320" height="480" fill="#FFFFFF" />
          {/* Maple Leaf */}
          <polygon
            points="320,130 338,190 380,180 355,220 400,240 345,265 350,300 325,280 325,350 315,350 315,280 290,300 295,265 240,240 285,220 260,180 302,190"
            fill="#DA1A32"
          />
        </svg>
      );

    case 'KE': // Kenya
      return (
        <svg {...baseSvgProps} aria-label="Flag of Kenya">
          <rect width="640" height="140" fill="#000000" />
          <rect y="140" width="640" height="20" fill="#FFFFFF" />
          <rect y="160" width="640" height="160" fill="#BB0000" />
          <rect y="320" width="640" height="20" fill="#FFFFFF" />
          <rect y="340" width="640" height="140" fill="#006600" />
          {/* Maasai shield and spears */}
          <line x1="220" y1="100" x2="420" y2="380" stroke="#FFFFFF" strokeWidth="12" />
          <line x1="420" y1="100" x2="220" y2="380" stroke="#FFFFFF" strokeWidth="12" />
          <ellipse cx="320" cy="240" rx="55" ry="110" fill="#BB0000" stroke="#000000" strokeWidth="8" />
          <ellipse cx="320" cy="240" rx="20" ry="100" fill="#FFFFFF" />
        </svg>
      );

    case 'AE': // United Arab Emirates
      return (
        <svg {...baseSvgProps} aria-label="Flag of United Arab Emirates">
          <rect x="160" width="480" height="160" fill="#00732F" />
          <rect x="160" y="160" width="480" height="160" fill="#FFFFFF" />
          <rect x="160" y="320" width="480" height="160" fill="#000000" />
          <rect width="160" height="480" fill="#FF0000" />
        </svg>
      );

    case 'DE': // Germany
      return (
        <svg {...baseSvgProps} aria-label="Flag of Germany">
          <rect width="640" height="160" fill="#000000" />
          <rect y="160" width="640" height="160" fill="#DD0000" />
          <rect y="320" width="640" height="160" fill="#FFCE00" />
        </svg>
      );

    case 'FR': // France
      return (
        <svg {...baseSvgProps} aria-label="Flag of France">
          <rect width="213" height="480" fill="#002395" />
          <rect x="213" width="214" height="480" fill="#FFFFFF" />
          <rect x="427" width="213" height="480" fill="#ED2939" />
        </svg>
      );

    case 'IT': // Italy
      return (
        <svg {...baseSvgProps} aria-label="Flag of Italy">
          <rect width="213" height="480" fill="#009246" />
          <rect x="213" width="214" height="480" fill="#FFFFFF" />
          <rect x="427" width="213" height="480" fill="#CE2B37" />
        </svg>
      );

    case 'AU': // Australia
      return (
        <svg {...baseSvgProps} aria-label="Flag of Australia">
          <rect width="640" height="480" fill="#00008B" />
          {/* Mini Union Jack canton */}
          <rect width="320" height="240" fill="#012169" />
          <line x1="0" y1="0" x2="320" y2="240" stroke="#FFFFFF" strokeWidth="30" />
          <line x1="320" y1="0" x2="0" y2="240" stroke="#FFFFFF" strokeWidth="30" />
          <rect x="135" width="50" height="240" fill="#FFFFFF" />
          <rect y="95" width="320" height="50" fill="#FFFFFF" />
          <rect x="145" width="30" height="240" fill="#C8102E" />
          <rect y="105" width="320" height="30" fill="#C8102E" />
          {/* Commonwealth Star */}
          <circle cx="160" cy="360" r="35" fill="#FFFFFF" />
          {/* Southern Cross stars */}
          <circle cx="480" cy="120" r="14" fill="#FFFFFF" />
          <circle cx="430" cy="200" r="14" fill="#FFFFFF" />
          <circle cx="530" cy="220" r="14" fill="#FFFFFF" />
          <circle cx="480" cy="340" r="18" fill="#FFFFFF" />
          <circle cx="505" cy="265" r="9" fill="#FFFFFF" />
        </svg>
      );

    case 'NL': // Netherlands
      return (
        <svg {...baseSvgProps} aria-label="Flag of the Netherlands">
          <rect width="640" height="160" fill="#AE1C28" />
          <rect y="160" width="640" height="160" fill="#FFFFFF" />
          <rect y="320" width="640" height="160" fill="#21468B" />
        </svg>
      );

    case 'SE': // Sweden
      return (
        <svg {...baseSvgProps} aria-label="Flag of Sweden">
          <rect width="640" height="480" fill="#006AA7" />
          <rect x="180" width="80" height="480" fill="#FECC00" />
          <rect y="200" width="640" height="80" fill="#FECC00" />
        </svg>
      );

    case 'SA': // Saudi Arabia
      return (
        <svg {...baseSvgProps} aria-label="Flag of Saudi Arabia">
          <rect width="640" height="480" fill="#006C35" />
          {/* White sword emblem */}
          <rect x="220" y="320" width="200" height="14" rx="7" fill="#FFFFFF" />
          <polygon points="430,327 415,315 415,339" fill="#FFFFFF" />
          <rect x="235" y="305" width="10" height="44" fill="#FFFFFF" />
          {/* Calligraphic badge representation */}
          <ellipse cx="320" cy="220" rx="90" ry="40" fill="none" stroke="#FFFFFF" strokeWidth="8" />
          <line x1="260" y1="220" x2="380" y2="220" stroke="#FFFFFF" strokeWidth="6" />
        </svg>
      );

    case 'ZA': // South Africa
      return (
        <svg {...baseSvgProps} aria-label="Flag of South Africa">
          <rect width="640" height="240" fill="#E03C31" />
          <rect y="240" width="640" height="240" fill="#001489" />
          {/* Green pall with white & gold borders */}
          <polygon points="0,0 240,240 0,480" fill="#000000" />
          <polygon points="0,0 30,0 260,240 30,480 0,480" fill="#FFB612" />
          <polygon points="0,0 240,240 0,480" fill="#000000" />
          <polygon points="260,240 640,0 640,80 340,240 640,400 640,480" fill="#FFFFFF" />
          <polygon points="240,240 640,40 640,120 320,240 640,360 640,440" fill="#007749" />
        </svg>
      );

    case 'CN': // China
      return (
        <svg {...baseSvgProps} aria-label="Flag of China">
          <rect width="640" height="480" fill="#DE2910" />
          {/* Large star */}
          <polygon
            points="120,70 135,115 180,115 145,145 160,190 120,160 80,190 95,145 60,115 105,115"
            fill="#FFDE00"
          />
          {/* 4 small stars */}
          <polygon points="210,40 215,55 230,55 218,65 223,80 210,70 197,80 202,65 190,55 205,55" fill="#FFDE00" />
          <polygon points="250,80 255,95 270,95 258,105 263,120 250,110 237,120 242,105 230,95 245,95" fill="#FFDE00" />
          <polygon points="250,150 255,165 270,165 258,175 263,190 250,180 237,190 242,175 230,165 245,165" fill="#FFDE00" />
          <polygon points="210,200 215,215 230,215 218,225 223,240 210,230 197,240 202,225 190,215 205,215" fill="#FFDE00" />
        </svg>
      );

    case 'IN': // India
      return (
        <svg {...baseSvgProps} aria-label="Flag of India">
          <rect width="640" height="160" fill="#FF9933" />
          <rect y="160" width="640" height="160" fill="#FFFFFF" />
          <rect y="320" width="640" height="160" fill="#138808" />
          {/* Ashoka Chakra */}
          <circle cx="320" cy="240" r="60" fill="none" stroke="#000080" strokeWidth="8" />
          <circle cx="320" cy="240" r="14" fill="#000080" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line
              key={deg}
              x1="320"
              y1="240"
              x2={320 + 55 * Math.cos((deg * Math.PI) / 180)}
              y2={240 + 55 * Math.sin((deg * Math.PI) / 180)}
              stroke="#000080"
              strokeWidth="4"
            />
          ))}
        </svg>
      );

    default: // Global / Other
      return (
        <svg {...baseSvgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label="International Flag">
          <rect width="24" height="24" fill="#F1F5F9" />
          <circle cx="12" cy="12" r="9" stroke="#64748B" strokeWidth="1.5" />
          <path d="M3.6 9h16.8M3.6 15h16.8" stroke="#64748B" strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="4.5" ry="9" stroke="#64748B" strokeWidth="1.5" />
        </svg>
      );
  }
}
