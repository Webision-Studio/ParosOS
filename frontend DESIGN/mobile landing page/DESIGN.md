---
name: Artisanal Daylight
colors:
  surface: '#fff8f5'
  surface-dim: '#e0d8d5'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2ee'
  surface-container: '#f4ece8'
  surface-container-high: '#eee7e3'
  surface-container-highest: '#e9e1dd'
  on-surface: '#1e1b19'
  on-surface-variant: '#58413b'
  inverse-surface: '#33302d'
  inverse-on-surface: '#f7efeb'
  outline: '#8c716a'
  outline-variant: '#e0bfb7'
  surface-tint: '#aa3614'
  primary: '#a63412'
  on-primary: '#ffffff'
  primary-container: '#c84c28'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb5a0'
  secondary: '#006d30'
  on-secondary: '#ffffff'
  secondary-container: '#92f5a4'
  on-secondary-container: '#007233'
  tertiary: '#8d4b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b15f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb5a0'
  on-primary-fixed: '#3b0900'
  on-primary-fixed-variant: '#872000'
  secondary-fixed: '#95f8a7'
  secondary-fixed-dim: '#79db8d'
  on-secondary-fixed: '#00210a'
  on-secondary-fixed-variant: '#005323'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#fff8f5'
  on-background: '#1e1b19'
  surface-variant: '#e9e1dd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 72px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
  metric-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system expresses a refined daylight aesthetic tailored for modern hospitality operators, specialty cafes, and contemporary restaurateurs. It reconciles high-velocity cloud SaaS precision with the warm, human tactility of independent culinary spaces. 

The emotional tone balances sunlit optimism, absolute operational dependability, and boutique restraint. Visuals steer clear of sterile corporate enterprise tropes and chaotic retail neon, favoring instead organic warmth, generous breathing room, crisp architectural micro-borders, and tangible digital surfaces that feel as considered as ceramic dishware or natural linen.

## Colors

The palette establishes an airy, warm daylight foundation punctuated by earthy culinary pigments.

- **Foundational Surfaces**: Base canvas alternates between pure Daylight White (`#FFFFFF`) and Warm Stone (`#FAFAF9`), with contextual sub-sections framed in soft Oatmeal (`#F5F5F4`).
- **Primary Accent (Roasted Paprika / Terracotta)**: `#E05D38` anchors critical conversion points and primary CTAs. Interactive states transition to `#C84E2C` on hover and `#A73C1E` on active press. Tonal backgrounds utilize `#FDF4F0` to supply soft, non-aggressive focus.
- **Secondary Accent (Olive / Laurel Green)**: `#15803D` (with `#DCFCE7` soft surface tint) represents fiscal surplus, margin gains, zero-hardware savings, and dynamic operational health.
- **Tertiary Accent (Toasted Amber)**: `#D97706` handles active table alerts, pending kitchen orders, and real-time synchronization badges.
- **Text & Neutral Contrast**: Headlines and key data points are rendered in Deep Espresso Roast (`#1C1917`). Body and running interface text use Warm Charcoal (`#44403C`), while metadata, captions, and micro-labels reside in Muted Stone (`#78716C`). Hairline dividers and structural boundaries use Crisp Mortar (`#E7E5E4`).

## Typography

The type system relies entirely on Plus Jakarta Sans for its geometric clarity, friendly open counters, and contemporary legibility.

- **Tabular Figures**: All metric comparisons, hardware savings calculations, rupee (`₹`) currencies, and bill counters must explicitly activate tabular lining (`font-feature-settings: "tnum" 1, "lnum" 1;`) to ensure razor-sharp vertical alignment across interactive dashboards and pricing tables.
- **Editorial Contrast**: Display hero treatments require tight tracking (`-0.03em`) and heavy weights (`800`) to ground the landing page with assertive confidence. Secondary and tertiary headers adopt a slightly relaxed weight (`600`) to evoke warm hospitality rather than clinical enterprise software.

## Layout & Spacing

A 12-column responsive fluid grid system powers the layouts, capped at a maximum content width of `1240px` for optimal reading proportion and focal balance.

- **Desktop (≥ 1024px)**: 12 columns, `1.5rem` (`24px`) gutters, with canvas margins scaling dynamically above `2rem`.
- **Tablet (768px – 1023px)**: 8 columns, `1.25rem` (`20px`) gutters, `1.5rem` canvas margins. Interactive calculator components collapse from two asymmetric columns into unified stacked modular blocks.
- **Mobile (< 768px)**: 4 columns, `1rem` (`16px`) gutters, `1.25rem` (`20px`) margins. Section vertical rhythms contract from `space-xl` multiplications down to concise, fluid groupings to maximize above-the-fold engagement.

## Elevation & Depth

Visual hierarchy uses daylight ambient illumination: soft, extra-diffused downward shadows layered across crisp tactile planes.

- **Subtle Surface (Cards & Modules)**: `0 1px 2px rgba(28, 25, 23, 0.03), 0 4px 12px rgba(28, 25, 23, 0.04)`. Paired with a precise `1px` border of `#E7E5E4` to delineate card planes without visual clutter.
- **Elevated Interactive (Dropdowns, Floating Bill Previews)**: `0 4px 6px -1px rgba(28, 25, 23, 0.04), 0 12px 24px -4px rgba(28, 25, 23, 0.07)`.
- **Hero Device Mockup / Live Screen Emulators**: `0 20px 40px -12px rgba(28, 25, 23, 0.08), 0 1px 3px rgba(28, 25, 23, 0.04)`.
- **Hairline Layering Rule**: In this design system, shadows never exist without a corresponding hairline boundary (`#E7E5E4`). The border provides tactile structure, while the warm stone-tinted shadow anchors the element in a sunlit physical space.

## Shapes

The geometric architecture uses `roundedness: 2` (`0.5rem` / `8px` baseline), generating an ergonomic, human-centered feel.

- **Interactive Core (Buttons, Inputs)**: `0.5rem` (`8px`) for compact touch responsiveness.
- **Cards & Architectural Enclosures**: `rounded-lg` (`1rem` / `16px`) for primary cards and modular dashboard pods. Outer feature enclosures and hero interactive sandboxes scale up to `rounded-xl` (`1.5rem` / `24px`).
- **Pills**: Navigation status indicators, ROI metrics, category filters, and live floor-plan statuses maintain a full circular capsule radius (`9999px`).

## Components

### Buttons
- **Primary**: Solid Roasted Paprika (`#E05D38`) fill, pure white text, bold `label-md` styling, `8px` border radius, micro-padding `0.75rem 1.5rem`. Subtle tactile active press (`scale(0.98)`).
- **Secondary / Outline**: `#FFFFFF` surface with `1px` solid `#E7E5E4` border, `#1C1917` text. On hover, background shifts to `#FAFAF9` with border dark tinting to `#D6D3D1`.
- **ROI / Ghost**: Transparent fill, `#15803D` typography, hovering into a `#DCFCE7` wash.

### Badge Pills & Value Metrics
- Designed with `font-size: 11px`, all caps or small title case, tracking `0.04em`.
- **Zero-Hardware Callout**: `#FDF4F0` background with `#E05D38` text and a subtle warm border (`rgba(224, 93, 56, 0.15)`).
- **Profit / Savings Pill**: `#DCFCE7` background, `#15803D` text, paired with a green trending icon.

### Input Fields & Device Toggles
- Inputs display `#FFFFFF` fills, `1px` border `#E7E5E4`, and inner horizontal padding of `1rem`. Focused inputs gain a `#E05D38` boundary with a diffused `0 0 0 3px rgba(224, 93, 56, 0.15)` warm halo.
- Currency indicators (`₹`) are fixed inside the lead slot in non-breaking tabular typography.

### Cards & Comparison Panels
- Pure white `#FFFFFF` foundations nestled over `#FAFAF9` page sections.
- Outer border fixed at `1px solid #E7E5E4`.
- Padding maintains a generous internal rhythm of `space-lg` (`1.5rem`) to `space-xl` (`2.5rem`).
- Cards highlighting zero-hardware terminal alternatives feature a refined top accent rail (`2px` solid `#E05D38`).

### Live Order & Table Node Chips
- Floating state modules mimic physical thermal paper receipts and ceramic table tags.
- Micro-dividers use dashed `1px` borders in `#E7E5E4` to evoke hospitality ticket detail while keeping digital clarity intact.