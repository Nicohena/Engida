---
name: Engida Architectural Modernism
description: Warm Mediterranean and desert modernist hospitality design system for Ethiopian property rentals
colors:
  primary: "#c2652a"
  primary-container: "#e08850"
  on-primary: "#ffffff"
  secondary: "#78706a"
  secondary-container: "#eae2da"
  on-secondary-container: "#605850"
  tertiary: "#8c3c3c"
  tertiary-container: "#d47070"
  surface: "#faf5ee"
  surface-dim: "#dcd6cc"
  surface-container: "#f2ece4"
  surface-container-low: "#f6f0e8"
  surface-container-high: "#ece6dc"
  surface-container-highest: "#e6e0d6"
  surface-container-lowest: "#ffffff"
  on-surface: "#3a302a"
  on-surface-variant: "#605850"
  outline: "#9a9088"
  outline-variant: "#d8d0c8"
typography:
  display:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: "3.5rem"
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
---

## Overview

This design system expresses quiet architectural luxury, warmth, and enduring craftsmanship tailored for curated Ethiopian accommodations and global architectural retreats. The aesthetic replaces cold corporate minimalism with natural tactile neutrals: linen-sand canvases, sun-drenched terracotta rust, deep roasted espresso typography, and warm earthen tones.

## Colors

- **Primary (`#c2652a` - Terracotta Rust):** Anchors focal actions, primary CTAs, active segmented tabs, category selection indicators, and rating stars.
- **Primary Container (`#e08850` - Warm Ochre Glow):** Applied to guest favorite badges and active hover states.
- **Surface & Background (`#faf5ee` - Warm Sand Linen):** Root canvas tone eliminating sterile monitor white glare.
- **Elevated Cards (`#ffffff`):** Dedicated to floating listing tiles, elevated search panels, and interactive modal dialogs.
- **Typography & Text (`#3a302a` - Dark Espresso):** High-contrast, grounded dark tone for headlines and primary body copy.
- **Secondary Text (`#605850` - Slate Muted):** Used for metadata, property specs, dates, and unselected nav elements.
- **Border Tone (`#d8d0c8`):** Soft hairline boundary tone calibrated to define card boundaries against the sand canvas.

## Typography

- **Editorial Headings:** **EB Garamond** (weights 600, 700). Evokes architectural monographs and high-end editorial publications with tightened letter spacing (`-0.015em` to `-0.03em`).
- **Interface & Specifications:** **Manrope** (weights 400, 500, 600, 700). High geometric clarity for scannable room counts, amenities, dates, and prices.
- **Iconography:** **Material Symbols Outlined** (fill toggle for active ratings, wishlist hearts, and category states).

## Layout

- **Desktop (≥ 1280px):** 4-column property listing grid with generous 24px gutters, max container width of 1440px.
- **Tablet (768px - 1199px):** 2-column listing grid with 20px gutters.
- **Mobile (< 768px):** Single-column stacked cards or swipeable viewports with 16px side canvas padding.
- **Vertical Rhythm:** 8px base grid multiple. Generous vertical breathing room between hero, category scroller, and listings.

## Elevation & Depth

- **Resting Cards:** `0 4px 20px -2px rgba(58, 48, 42, 0.05)` with a hairline 1px border `#d8d0c8`.
- **Card Hover:** `0 16px 36px -4px rgba(194, 101, 42, 0.18)` with subtle `-translate-y-1.5` lift.
- **Search Pill Rest:** `0 4px 16px rgba(58, 48, 42, 0.06)`. Focus within adds ring glow `rgba(194, 101, 42, 0.4)`.

## Shapes

- **Interactive Pills (`rounded-full` / `9999px`):** Search bar container, category segmented tabs, quick filter chips, and rating badges.
- **Cards & Media Panels (`rounded-xl` / `16px`):** Property cards and image container wrappers.
- **Action Buttons (`rounded-lg` / `8px`):** "Show more stays", "Become a Host".

## Components

### Hero Search Bar
- Capsule container with segmented touch targets: **Where**, **When**, **Who**.
- Floating popover panel with z-index elevation, fast destination pills, date presets, and guest counters.
- Terracotta circular search trigger button with `search-glow` pulse animation on hover.

### Property Listing Cards
- 4:3 aspect ratio photograph with subtle scale transform on hover.
- Floating status badges in top-left (Superhost, Guest Favorite, Rare Find).
- Floating top-right heart wishlist button with `heart-pop` keyframe micro-animation.
- Clear typographic separation: serif title, rating pill, location, room specs, and nightly price.

### Horizontal Category Scroller
- Single-row horizontal scroll with custom scrollbar hidden (`.no-scrollbar`).
- Active category marked by terracotta border-bottom and fill-toggled glyph.

## Do's and Don'ts

- **Do:** Use warm sand `#faf5ee` as the canvas rather than harsh `#ffffff` or generic cold gray `#f8fafc`.
- **Do:** Use EB Garamond exclusively for titles, section headers, and brand marks; use Manrope for all metadata and UI controls.
- **Do:** Keep photography front and center with consistent 4:3 aspect ratios.
- **Don't:** Introduce generic cold corporate blues or neon buttons.
- **Don't:** Use harsh pure black `#000000` text; use Dark Espresso `#3a302a` for softer, premium contrast.
