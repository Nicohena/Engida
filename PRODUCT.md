# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Travelers & Guests:** Local professionals, Ethiopian diaspora visiting home, international tourists, and digital nomads searching for reliable, verified, and architecturally inspiring accommodations across Ethiopian hubs (Addis Ababa, Bishoftu, Hawassa, Bahir Dar, Lalibela) and global architectural retreats.
- **Hosts & Property Vendors:** Individual property owners, boutique guesthouse operators, and real estate hosts managing listings, reservation requests, pricing, and guest communications.

## Product Purpose

ENGIDA ("Guest" in Amharic) is a modern property rental and real estate marketplace built to elevate the accommodation discovery and booking experience in Ethiopia. It bridges the trust gap in the local market through transparent listing specs, verified host badges, and an editorial architectural aesthetic that rivals premier global hospitality platforms.

## Positioning

The premier curated architectural stays and property marketplace tailored for Ethiopia. Unlike chaotic social media listings or generic classified boards, ENGIDA pairs curated architectural standards and localized hospitality intelligence with streamlined reservation requests and verified host profiles.

## Operating Context

- **Devices & Connectivity:** High volume of mobile web traffic often over mobile cellular networks in Ethiopia, alongside desktop workstations used by hosts and travel planners.
- **Localization:** Bilingual readiness (English and Amharic), multi-currency consideration (ETB and USD), and local city context (Bole, Kazanchis, Old Airport, Bishoftu lakes, Lake Hawassa).
- **Transaction Model:** Currently focused on verified listings, direct host-guest inquiry connections, and reservation scheduling without custodial escrow holding.

## Capabilities and Constraints

- **Frontend Architecture:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript 5.
- **Backend & Data:** NestJS 11 REST API, PostgreSQL database with TypeORM/Prisma migrations, JWT and Google OAuth authentication.
- **AI Intelligence:** Companion Python FastAPI service providing price prediction benchmarks and discovery intelligence.
- **Technical Boundaries:** No custodial escrow payment processing currently active; reservation inquiries connect guests directly to hosts.

## Brand Commitments

- **Brand Name:** ENGIDA (እንግዳ - "Guest").
- **Voice & Tone:** Refined, welcoming, trustworthy, and culturally rooted without clichés.
- **Design System:** Warm Architectural Modernism. Warm sand canvas (`#faf5ee`), deep slate text (`#3a302a`), sun-drenched terracotta rust (`#c2652a`), and ochre highlights.
- **Typography:** Editorial serif headings (**EB Garamond**) paired with high-legibility geometric sans-serif (**Manrope**).

## Evidence on Hand

- Production Next.js 16 frontend (`frontend/`) and NestJS backend (`backend/`).
- Verified design system and component architecture inspired by Stitch ("HavenStay — Property Rental Home").
- Working authentication flows with Google Sign-in and email credentials.
- Curated showcase property data including Bole Penthouse, Kuriftu Bishoftu, Entoto Mountain Lodge, and Lake Hawassa Sanctuary.

## Product Principles

1. **Hospitality with Dignity:** Every interaction should reflect the Ethiopian tradition of welcoming guests (*Engida*) with warmth, transparency, and care.
2. **Visual Truth & Clarity:** Photography and property details lead the experience; no hidden fees, accurate amenities, and unambiguous booking policies.
3. **Frictionless Scannability:** Key criteria (location, capacity, nightly price, rating) must be instantly readable at a glance on mobile and desktop viewports.
4. **Out-of-Distribution Craft:** Rejection of bland generic templates in favor of a cohesive, warm architectural identity with purposeful micro-interactions.

## Accessibility & Inclusion

- Responsive layout adhering to WCAG 2.1 AA contrast ratios across warm sand backgrounds and terracotta interactive elements.
- Accessible interactive touch targets (minimum 44x44px) for mobile navigability.
- Semantic HTML heading hierarchy and keyboard-navigable dialogs, search segments, and dropdowns.
