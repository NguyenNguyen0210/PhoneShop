# Design Specification: Homepage Featured Brands Premium Glow Visual Styling

- **Date:** 2026-10-10
- **Status:** Approved
- **Author:** AI Agent & System Team

## 1. Context & Motivation

On the Storefront Home page (`/`), the featured brands horizontal bar currently uses standard white buttons with thin slate borders (`border-slate-200`), which blend into the neutral background and don't visually convey their "Featured / Top Brands" status.

The goal is to elevate this section using the **Premium Glow** aesthetic:
- A soft glowing backdrop card container with subtle blue/indigo gradient and gentle border.
- Vibrant, tactile brand buttons with crisp shadows, subtle 3D lift on hover (`-translate-y-0.5`), and clean contrast.
- An eye-catching active state with an electric gradient (`from-blue-600 via-indigo-600 to-blue-700`), glowing drop shadow (`shadow-blue-500/35`), and high contrast typography.
- Retains smooth horizontal wheel scrolling, full accessibility, responsive layout, and seamless integration with existing brand filter logic.

## 2. Requirements & Visual Specifications

### 2.1 Container Wrapper
- Background: `bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60`
- Border: `border border-blue-100/80`
- Border Radius: `rounded-2xl`
- Padding: `p-2 sm:p-2.5`
- Shadow: `shadow-xs backdrop-blur-xs`
- Header Badge (Optional/Compact): A small sparkling label `✨ THƯƠNG HIỆU NỔI BẬT` or integrated cleanly with the scroll row.

### 2.2 Button States
- **Normal (Inactive)**:
  - `bg-white border border-slate-200/90 text-slate-700 font-semibold shadow-xs`
  - Hover: `hover:border-blue-400 hover:text-blue-600 hover:shadow-md hover:shadow-blue-500/10 hover:-translate-y-0.5`
  - Transition: `transition-all duration-200 ease-out cursor-pointer`
- **Active (Selected)**:
  - `bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold border-transparent shadow-md shadow-blue-500/30`
  - Invert text/icon colors to crisp white.
  - Active brand button retains `bg-blue-50` or active styling for test compatibility.

### 2.3 Compatibility
- Ensures all existing unit tests in `HomePageUrlFilter.spec.tsx` and related specs continue passing.

## 3. Verification & Testing
- Unit tests: `npx vitest run src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx`
- Type checking: `npx tsc --noEmit`
- Production build: `npm run build`
