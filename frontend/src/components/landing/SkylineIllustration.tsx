'use client';

import React from 'react';

export default function SkylineIllustration() {
  return (
    <div className="relative w-full max-w-6xl mx-auto h-[280px] sm:h-[340px] md:h-[400px] overflow-hidden pointer-events-none select-none">
      
      {/* ============================================================ */}
      {/* 1. SKY CANVAS & AMBIENT SUN LIGHT */}
      {/* ============================================================ */}
      <div className="absolute inset-0 z-10">
        
        {/* Radiant Modern Sun (Warm Morning Sunlight over Addis) */}
        <div className="absolute top-4 right-1/4 sm:right-1/3 flex items-center justify-center">
          {/* Ambient Outer Halo */}
          <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-amber-200/40 via-yellow-100/20 to-transparent blur-xl animate-sun-pulse" />
          
          {/* Subtle Rotating Sun Rings / Rays */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            className="animate-sun-rays opacity-50"
          >
            <circle cx="40" cy="40" r="34" stroke="#fde047" strokeWidth="1" strokeDasharray="3 4" fill="none" />
            <circle cx="40" cy="40" r="28" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2 3" fill="none" />
            <line x1="40" y1="2" x2="40" y2="8" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="40" y1="72" x2="40" y2="78" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="2" y1="40" x2="8" y2="40" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="72" y1="40" x2="78" y2="40" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="13" y1="13" x2="18" y2="18" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
            <line x1="62" y1="62" x2="67" y2="67" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
            <line x1="67" y1="13" x2="62" y2="18" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
            <line x1="18" y1="62" x2="13" y2="67" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
          </svg>

          {/* Central Sun Disc with Warm Gradient */}
          <div className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-yellow-100 shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-yellow-200" />
        </div>

        {/* Floating Clouds */}
        <div className="absolute top-8 left-10 opacity-60 animate-cloud-slow">
          <svg width="80" height="30" viewBox="0 0 80 30" fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round">
            <path d="M14 26h52a11 11 0 002-21.8 15 15 0 00-28-4.4A12 12 0 0014 26z" fill="#ffffff" fillOpacity="0.7" />
          </svg>
        </div>
        
        <div className="absolute top-16 right-24 opacity-50 animate-cloud-fast">
          <svg width="66" height="26" viewBox="0 0 66 26" fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round">
            <path d="M12 22h44a9 9 0 001.8-17.8 12.5 12.5 0 00-23-3.6A10 10 0 0012 22z" fill="#ffffff" fillOpacity="0.7" />
          </svg>
        </div>

        <div className="absolute top-24 left-1/3 opacity-35 animate-cloud-slow">
          <svg width="54" height="22" viewBox="0 0 54 22" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round">
            <path d="M10 18h34a7 7 0 001.4-13.8 10 10 0 00-18.4-2.8A8 8 0 0010 18z" fill="#ffffff" fillOpacity="0.5" />
          </svg>
        </div>

        {/* ============================================================ */}
        {/* ETHIOPIAN MODERN AIRLINER (Boeing 787 Dreamliner Silhouette) */}
        {/* ============================================================ */}
        <div className="absolute top-4 left-6 sm:left-14 animate-airplane">
          <svg width="105" height="65" viewBox="0 0 105 65" fill="none" className="overflow-visible">
            {/* Dual Contrail Vapor Trails */}
            <path
              d="M-35 46 C-15 42, 6 32, 22 24"
              stroke="#cbd5e1"
              strokeWidth="1.4"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
            <path
              d="M-32 49 C-12 45, 9 35, 25 27"
              stroke="#e2e8f0"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />

            {/* Aerodynamic Modern Jet */}
            <g transform="translate(18, 4) rotate(-15)">
              {/* Main Fuselage Body */}
              <path
                d="M48 16 C42 14, 28 12, 14 12 C6 12, -4 14, -8 16 C-4 18, 6 20, 14 20 C28 20, 42 18, 48 16 Z"
                fill="#ffffff"
                stroke="#475569"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />

              {/* Swept Back Main Wings */}
              <path
                d="M26 12 L14 -6 L9 -5 L16 12 Z"
                fill="#f1f5f9"
                stroke="#475569"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M26 20 L12 42 L8 41 L16 20 Z"
                fill="#f1f5f9"
                stroke="#475569"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />

              {/* Jet Engines under wings */}
              <rect x="15" y="0" width="8" height="3.5" rx="1.5" fill="#334155" />
              <rect x="15" y="28" width="8" height="3.5" rx="1.5" fill="#334155" />

              {/* Tail Fin with Subtle Ethiopian Tricolor Accent Stripe */}
              <path
                d="M-4 15 L-14 -1 L-9 -1 L0 15 Z"
                fill="#ffffff"
                stroke="#475569"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              {/* Delicate Ethiopian tricolor livery stripes on vertical stabilizer */}
              <line x1="-12" y1="2" x2="-8" y2="2" stroke="#16a34a" strokeWidth="1.2" />
              <line x1="-10.5" y1="5" x2="-6.5" y2="5" stroke="#eab308" strokeWidth="1.2" />
              <line x1="-9" y1="8" x2="-5" y2="8" stroke="#dc2626" strokeWidth="1.2" />

              {/* Cockpit & Cabin Windows */}
              <path d="M43 15 L45 15.8 L42 16.5 Z" fill="#1e293b" />
              <circle cx="34" cy="15.5" r="0.75" fill="#64748b" />
              <circle cx="31" cy="15.5" r="0.75" fill="#64748b" />
              <circle cx="28" cy="15.5" r="0.75" fill="#64748b" />
              <circle cx="25" cy="15.5" r="0.75" fill="#64748b" />
              <circle cx="22" cy="15.5" r="0.75" fill="#64748b" />
              <circle cx="19" cy="15.5" r="0.75" fill="#64748b" />
            </g>
          </svg>
        </div>

        {/* ============================================================ */}
        {/* SUNRISE HOT AIR BALLOONS (Ethiopian Highland Tourism Motif) */}
        {/* ============================================================ */}
        
        {/* Balloon 1: Modern Foreground Balloon with Geometric Bands */}
        <div className="absolute top-5 right-8 sm:right-20 animate-balloon-slow">
          <svg width="64" height="88" viewBox="0 0 64 88" fill="none">
            {/* Balloon Envelope */}
            <path
              d="M32 2 C14 2, 2 18, 2 36 C2 50, 20 62, 24 70 L40 70 C44 62, 62 50, 62 36 C62 18, 50 2, 32 2 Z"
              fill="#ffffff"
              stroke="#475569"
              strokeWidth="1.4"
            />
            {/* Elegant Accent Stripes */}
            <path d="M32 2 C22 18, 20 52, 28 70" stroke="#0284c7" strokeWidth="1.2" />
            <path d="M32 2 C42 18, 44 52, 36 70" stroke="#0284c7" strokeWidth="1.2" />
            <path d="M32 2 L32 70" stroke="#f59e0b" strokeWidth="1.4" />
            {/* Horizontal Middle Band */}
            <path d="M6 34 Q32 44, 58 34" stroke="#e2e8f0" strokeWidth="2" fill="none" />
            <path d="M8 38 Q32 48, 56 38" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
            {/* Suspension Ropes */}
            <line x1="26" y1="70" x2="27" y2="76" stroke="#475569" strokeWidth="1" />
            <line x1="38" y1="70" x2="37" y2="76" stroke="#475569" strokeWidth="1" />
            {/* Basket */}
            <rect x="26" y="76" width="12" height="8" rx="2" fill="#f8fafc" stroke="#475569" strokeWidth="1.2" />
            {/* Burner Glow Dot */}
            <circle cx="32" cy="72" r="1.5" fill="#f97316" />
          </svg>
        </div>

        {/* Balloon 2: Medium Altitude Balloon */}
        <div className="absolute top-14 right-2 sm:right-6 animate-balloon-med opacity-85">
          <svg width="40" height="56" viewBox="0 0 40 56" fill="none">
            <path
              d="M20 1 C8 1, 1 11, 1 22 C1 31, 12 39, 15 44 L25 44 C28 39, 39 31, 39 22 C39 11, 32 1, 20 1 Z"
              fill="#ffffff"
              stroke="#64748b"
              strokeWidth="1.1"
            />
            <path d="M20 1 C13 11, 12 32, 17 44" stroke="#93c5fd" strokeWidth="0.9" />
            <path d="M20 1 C27 11, 28 32, 23 44" stroke="#93c5fd" strokeWidth="0.9" />
            <line x1="17" y1="44" x2="17.5" y2="48" stroke="#64748b" strokeWidth="0.9" />
            <line x1="23" y1="44" x2="22.5" y2="48" stroke="#64748b" strokeWidth="0.9" />
            <rect x="17" y="48" width="6" height="5" rx="1" fill="#f8fafc" stroke="#64748b" strokeWidth="0.9" />
          </svg>
        </div>

        {/* Balloon 3: Small Distant Sunrise Balloon */}
        <div className="absolute top-10 left-[47%] animate-balloon-fast opacity-70">
          <svg width="26" height="36" viewBox="0 0 26 36" fill="none">
            <path
              d="M13 1 C5.5 1, 1 7, 1 15 C1 21, 8 26, 10 29 L16 29 C18 26, 25 21, 25 15 C25 7, 20.5 1, 13 1 Z"
              fill="#ffffff"
              stroke="#94a3b8"
              strokeWidth="0.9"
            />
            <path d="M13 1 C9 8, 8 22, 11 29" stroke="#cbd5e1" strokeWidth="0.7" />
            <path d="M13 1 C17 8, 18 22, 15 29" stroke="#cbd5e1" strokeWidth="0.7" />
            <rect x="11" y="31" width="4" height="3" rx="0.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" />
          </svg>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 2. ARCHITECTURAL SKYLINE: ETHIOPIAN MODERN & ADDIS ICONS */}
      {/* ============================================================ */}
      <div className="absolute bottom-0 inset-x-0 w-full z-0 flex items-end justify-center">
        <svg
          className="w-full h-[240px] sm:h-[280px] md:h-[320px]"
          viewBox="0 0 1200 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax meet"
        >
          {/* Distant Rolling Entoto Highland Ridge Silhouette */}
          <path
            d="M0 240 Q160 215, 340 230 Q520 205, 700 225 Q880 200, 1040 218 Q1140 210, 1200 230 L1200 318 L0 318 Z"
            fill="#f8fafc"
            opacity="0.8"
          />
          <path
            d="M0 240 Q160 215, 340 230 Q520 205, 700 225 Q880 200, 1040 218 Q1140 210, 1200 230"
            stroke="#cbd5e1"
            strokeWidth="1"
            fill="none"
          />

          {/* Ground Baseline */}
          <line x1="0" y1="318" x2="1200" y2="318" stroke="#cbd5e1" strokeWidth="1.6" />

          {/* ============================================================ */}
          {/* A. ADDIS LIGHT RAIL (LRT) MODERN OVERPASS & BRIDGE (Left: 20-210) */}
          {/* ============================================================ */}
          <g stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Cable-stayed bridge pylon */}
            <path d="M90 318 L102 165 L108 165 L120 318" />
            <line x1="98" y1="195" x2="112" y2="195" strokeWidth="1.4" />
            <line x1="95" y1="235" x2="115" y2="235" strokeWidth="1.4" />
            {/* Stay Cables radiating to deck */}
            <line x1="105" y1="170" x2="30" y2="265" strokeWidth="0.9" />
            <line x1="105" y1="185" x2="55" y2="265" strokeWidth="0.9" />
            <line x1="105" y1="200" x2="80" y2="265" strokeWidth="0.9" />
            <line x1="105" y1="170" x2="180" y2="265" strokeWidth="0.9" />
            <line x1="105" y1="185" x2="155" y2="265" strokeWidth="0.9" />
            <line x1="105" y1="200" x2="130" y2="265" strokeWidth="0.9" />
            {/* Modern Viaduct Roadway & Train Deck */}
            <line x1="10" y1="265" x2="210" y2="265" strokeWidth="2.2" stroke="#64748b" />
            <line x1="10" y1="268" x2="210" y2="268" strokeWidth="1" stroke="#cbd5e1" />
            {/* Bridge Support Pillars */}
            <rect x="45" y="268" width="10" height="50" fill="#ffffff" />
            <rect x="160" y="268" width="10" height="50" fill="#ffffff" />
            {/* Streamlined Modern Light-Rail Train Car */}
            <rect x="80" y="254" width="46" height="10" rx="2" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" />
            <rect x="84" y="256" width="6" height="4" rx="0.5" fill="#ffffff" />
            <rect x="93" y="256" width="6" height="4" rx="0.5" fill="#ffffff" />
            <rect x="102" y="256" width="6" height="4" rx="0.5" fill="#ffffff" />
            <rect x="111" y="256" width="8" height="4" rx="0.5" fill="#ffffff" />
            <line x1="98" y1="254" x2="103" y2="248" stroke="#1e293b" strokeWidth="1" />
          </g>

          {/* ============================================================ */}
          {/* B. HISTORIC ST. GEORGE / HOLY TRINITY OCTAGONAL CATHEDRAL (215-325) */}
          {/* ============================================================ */}
          <g stroke="#94a3b8" strokeWidth="1.2" strokeLinejoin="round">
            {/* Classical Stone Plinth */}
            <rect x="220" y="255" width="104" height="63" fill="#ffffff" />
            <line x1="216" y1="255" x2="328" y2="255" strokeWidth="1.6" />
            {/* Traditional Stone Colonnade */}
            <line x1="234" y1="255" x2="234" y2="318" />
            <line x1="252" y1="255" x2="252" y2="318" />
            <line x1="272" y1="255" x2="272" y2="318" />
            <line x1="292" y1="255" x2="292" y2="318" />
            <line x1="310" y1="255" x2="310" y2="318" />
            {/* Arched Portico Pediment */}
            <polygon points="220,255 272,220 324,255" fill="#f8fafc" />
            {/* Drum & Arched Windows */}
            <rect x="242" y="165" width="60" height="55" fill="#ffffff" />
            <path d="M250 190 A5 5 0 0 1 260 190 L260 210 L250 210 Z" />
            <path d="M267 190 A5 5 0 0 1 277 190 L277 210 L267 210 Z" />
            <path d="M284 190 A5 5 0 0 1 294 190 L294 210 L284 210 Z" />
            {/* Octagonal Stepped Dome */}
            <path d="M236 165 C236 105, 308 105, 308 165 Z" fill="#f1f5f9" />
            {/* Cupola Lantern */}
            <rect x="268" y="90" width="8" height="15" fill="#ffffff" />
            {/* Ethiopian Filigree Cross on Top */}
            <line x1="272" y1="90" x2="272" y2="70" stroke="#f59e0b" strokeWidth="1.4" />
            <line x1="267" y1="76" x2="277" y2="76" stroke="#f59e0b" strokeWidth="1.4" />
            <circle cx="272" cy="70" r="2.5" fill="#f59e0b" />
          </g>

          {/* ============================================================ */}
          {/* C. AFRICAN UNION (AU) HEADQUARTERS TOWER (330-415) */}
          {/* ============================================================ */}
          <g stroke="#94a3b8" strokeWidth="1.2">
            {/* Elliptical Curved Glass High-Rise */}
            <path
              d="M340 318 L340 160 C340 120, 365 95, 375 90 C385 95, 410 120, 410 160 L410 318 Z"
              fill="#ffffff"
            />
            {/* Vertical Curved Glass Ribs */}
            <path d="M355 160 C355 130, 370 105, 375 92" stroke="#cbd5e1" />
            <path d="M395 160 C395 130, 380 105, 375 92" stroke="#cbd5e1" />
            <line x1="375" y1="90" x2="375" y2="318" stroke="#cbd5e1" />
            {/* AU Spire Antenna */}
            <line x1="375" y1="90" x2="375" y2="45" stroke="#475569" strokeWidth="1.6" />
            <circle cx="375" cy="42" r="2" fill="#2563eb" />
            {/* Horizontal Floor Rings */}
            <line x1="340" y1="180" x2="410" y2="180" stroke="#cbd5e1" />
            <line x1="340" y1="215" x2="410" y2="215" stroke="#cbd5e1" />
            <line x1="340" y1="250" x2="410" y2="250" stroke="#cbd5e1" />
            <line x1="340" y1="285" x2="410" y2="285" stroke="#cbd5e1" />
          </g>

          {/* ============================================================ */}
          {/* D. ADWA MEMORIAL ARCH & MONUMENT (420-490) */}
          {/* ============================================================ */}
          <g stroke="#94a3b8" strokeWidth="1.2">
            {/* Modern Monumental Arch */}
            <path
              d="M430 318 L430 200 A25 25 0 0 1 480 200 L480 318 L465 318 L465 200 A10 10 0 0 0 445 200 L445 318 Z"
              fill="#f8fafc"
            />
            <line x1="424" y1="175" x2="486" y2="175" strokeWidth="1.4" />
            {/* Sculptural Spire / Flame Pinnacle */}
            <polygon points="450,175 455,140 460,175" fill="#f59e0b" stroke="#f59e0b" />
          </g>

          {/* ============================================================ */}
          {/* E. ICONIC CBE HEADQUARTERS TOWER (The Tallest in East Africa: 495-600) */}
          {/* ============================================================ */}
          <g stroke="#475569" strokeWidth="1.3">
            {/* Main Tower Shaft */}
            <rect x="515" y="80" width="75" height="238" fill="#ffffff" stroke="#475569" strokeWidth="1.4" />
            {/* CBE Signature Faceted Diamond Crown Top */}
            <polygon
              points="515,80 552.5,22 590,80"
              fill="#eff6ff"
              stroke="#2563eb"
              strokeWidth="1.5"
            />
            {/* Diamond Crown facets */}
            <line x1="552.5" y1="22" x2="552.5" y2="80" stroke="#2563eb" strokeWidth="1.2" />
            <line x1="530" y1="60" x2="575" y2="60" stroke="#93c5fd" strokeWidth="1" />
            {/* Top Needle Antenna */}
            <line x1="552.5" y1="22" x2="552.5" y2="2" stroke="#2563eb" strokeWidth="1.8" />
            <circle cx="552.5" cy="2" r="2" fill="#2563eb" />

            {/* Contemporary Curtain Wall Glass Window Grid */}
            {Array.from({ length: 9 }).map((_, row) => (
              <g key={`cbe-row-${row}`}>
                {Array.from({ length: 4 }).map((_, col) => (
                  <rect
                    key={`cbe-win-${row}-${col}`}
                    x={523 + col * 17}
                    y={95 + row * 22}
                    width="11"
                    height="14"
                    rx="1"
                    fill="#f8fafc"
                    stroke="#cbd5e1"
                    strokeWidth="0.8"
                  />
                ))}
              </g>
            ))}
          </g>

          {/* ============================================================ */}
          {/* F. TELECOM & COMMERCIAL SKYSCRAPER (Kazanchis Tech District: 605-720) */}
          {/* ============================================================ */}
          <g stroke="#94a3b8" strokeWidth="1.2">
            {/* Background Mid-rise building */}
            <rect x="610" y="140" width="55" height="178" fill="#ffffff" opacity="0.7" strokeDasharray="3 2" />
            {/* Modern High-Rise with Balconies */}
            <rect x="645" y="95" width="70" height="223" fill="#ffffff" />
            {/* Balcony horizontal glass bands */}
            {Array.from({ length: 6 }).map((_, i) => (
              <g key={`balc-${i}`}>
                <line x1="645" y1={125 + i * 30} x2="715" y2={125 + i * 30} stroke="#cbd5e1" strokeWidth="1.4" />
                <rect x="653" y={105 + i * 30} width="16" height="16" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
                <rect x="683" y={105 + i * 30} width="16" height="16" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
              </g>
            ))}
            {/* Rooftop Solar Pergola */}
            <line x1="640" y1="95" x2="720" y2="95" strokeWidth="2" />
            <line x1="650" y1="88" x2="710" y2="88" strokeWidth="1.4" />
            <line x1="660" y1="88" x2="660" y2="95" />
            <line x1="700" y1="88" x2="700" y2="95" />
          </g>

          {/* ============================================================ */}
          {/* G. MODERN COMMERCIAL TOWER & BOLE RESIDENTIAL BLOCKS (725-860) */}
          {/* ============================================================ */}
          <g stroke="#94a3b8" strokeWidth="1.2">
            <rect x="735" y="75" width="80" height="243" fill="#ffffff" />
            {/* Angled Architectural Crown */}
            <polygon points="735,75 795,45 815,75" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
            {/* Vertical Mullion Bands */}
            <line x1="755" y1="75" x2="755" y2="318" stroke="#cbd5e1" />
            <line x1="775" y1="75" x2="775" y2="318" stroke="#cbd5e1" />
            <line x1="795" y1="75" x2="795" y2="318" stroke="#cbd5e1" />
            {/* Floor division bands */}
            <line x1="735" y1="125" x2="815" y2="125" stroke="#e2e8f0" />
            <line x1="735" y1="175" x2="815" y2="175" stroke="#e2e8f0" />
            <line x1="735" y1="225" x2="815" y2="225" stroke="#e2e8f0" />
            <line x1="735" y1="275" x2="815" y2="275" stroke="#e2e8f0" />
          </g>

          {/* ============================================================ */}
          {/* H. STEPPED MODERN CONDOS & URBAN DEVELOPMENTS (865-1020) */}
          {/* ============================================================ */}
          <g stroke="#94a3b8" strokeWidth="1.2">
            {/* Stepped Building (Modern Urban Expansion) */}
            <path
              d="M875 318 L875 140 L900 140 L900 110 L930 110 L930 85 L960 85 L960 110 L990 110 L990 318"
              fill="#ffffff"
            />
            {/* Window rows */}
            <rect x="882" y="160" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="910" y="130" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="938" y="105" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="968" y="130" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />

            <rect x="882" y="200" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="910" y="170" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="938" y="145" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="968" y="170" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />

            <rect x="882" y="240" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="910" y="210" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="938" y="185" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="968" y="210" width="12" height="15" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
          </g>

          {/* ============================================================ */}
          {/* I. HISTORIC OBELISK / JUBILEE / BOLE GATEWAY MONUMENT (1030-1180) */}
          {/* ============================================================ */}
          <g stroke="#94a3b8" strokeWidth="1.2">
            {/* Residential Apartment Block */}
            <rect x="1025" y="185" width="60" height="133" fill="#ffffff" />
            <line x1="1020" y1="185" x2="1090" y2="185" strokeWidth="1.4" />
            {/* Windows */}
            <rect x="1035" y="200" width="12" height="16" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="1060" y="200" width="12" height="16" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="1035" y="235" width="12" height="16" rx="1" fill="#f8fafc" stroke="#cbd5e1" />
            <rect x="1060" y="235" width="12" height="16" rx="1" fill="#f8fafc" stroke="#cbd5e1" />

            {/* Axum / Lalibela Stylized Stele / Obelisk Pillar */}
            <polygon points="1120,318 1125,120 1130,105 1135,120 1140,318" fill="#f8fafc" />
            <line x1="1125" y1="135" x2="1135" y2="135" stroke="#cbd5e1" />
            <line x1="1124" y1="165" x2="1136" y2="165" stroke="#cbd5e1" />
            <line x1="1123" y1="195" x2="1137" y2="195" stroke="#cbd5e1" />
            <line x1="1122" y1="225" x2="1138" y2="225" stroke="#cbd5e1" />
            <circle cx="1130" cy="103" r="3" fill="#f59e0b" />
          </g>
        </svg>
      </div>
    </div>
  );
}
