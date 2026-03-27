# Style Guide — Project Trace

**Based on:** Autexis Holding AG corporate design (autexis.com)
**Date:** 2026-03-27
**Implementation:** Tailwind CSS + shadcn/ui overrides

---

## Table of Contents

1. [Color Palette](#1-color-palette)
2. [Typography](#2-typography)
3. [Spacing & Layout](#3-spacing--layout)
4. [Components](#4-components)
5. [Icons](#5-icons)
6. [Animations](#6-animations)
7. [Tailwind Configuration](#7-tailwind-configuration)
8. [shadcn/ui Theme Overrides](#8-shadcnui-theme-overrides)
9. [Responsive Breakpoints](#9-responsive-breakpoints)
10. [Do's and Don'ts](#10-dos-and-donts)

---

## 1. Color Palette

Extracted from Autexis CSS (`style.css`). Use these exact values.

### Primary Colors

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `primary` | `#003a5d` | 0, 58, 93 | Links, headings, primary brand, nav active |
| `primary-foreground` | `#ffffff` | 255, 255, 255 | Text on primary backgrounds |

### Accent Colors

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `accent` | `#9eca45` | 158, 202, 69 | Buttons, badges, active states, CTAs, progress bars |
| `accent-foreground` | `#ffffff` | 255, 255, 255 | Text on accent backgrounds |
| `accent-hover` | `#8bb83a` | 139, 184, 58 | Accent hover state (10% darker) |

### Sub-Brand Colors (for reference)

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-control` | `#009ee3` | Autexis Control blue (use sparingly for info states) |
| `brand-it` | `#3fa435` | Autexis IT green (use sparingly for success states) |

### Neutral Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `foreground` | `#060606` | Headings (H1-H6) |
| `body` | `#424242` | Body text, paragraphs |
| `muted` | `#777777` | Secondary text, nav links, captions |
| `border` | `#dddddd` | Input borders, dividers, card borders |
| `border-light` | `#eeeeee` | Subtle dividers, top bar border |
| `surface` | `#f7f9fa` | Card backgrounds, alternate sections |
| `surface-alt` | `#f8f8f8` | Portfolio/portfolio sections |
| `background` | `#ffffff` | Page background |
| `selection` | `#fefac7` | Text selection highlight |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#3fa435` | Safe status, verified data, green dots |
| `warning` | `#f59e0b` | Monitoring, yellow risk level, caution |
| `danger` | `#dc2626` | Recalls, critical anomalies, red alerts |
| `info` | `#009ee3` | Informational, tips, links |

### Risk Level Colors

| Level | Score | Color | Hex |
|-------|-------|-------|-----|
| Safe | 0-25 | Green | `#3fa435` |
| Monitor | 26-50 | Yellow | `#f59e0b` |
| Under Review | 51-75 | Orange | `#ea580c` |
| Critical | 76-100 | Red | `#dc2626` |

---

## 2. Typography

### Font Family

**Titillium Web** — Google Fonts — sans-serif

```css
font-family: "Titillium Web", sans-serif;
```

Load weights: **300** (Light), **400** (Regular), **700** (Bold)

### Font Import

```html
<link href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@300;400;700&display=swap" rel="stylesheet">
```

Or via Next.js:

```typescript
// app/layout.tsx
import { Titillium_Web } from "next/font/google";

const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-titillium",
});
```

### Type Scale

| Element | Size | Weight | Line Height | Style | Tailwind Class |
|---------|------|--------|-------------|-------|----------------|
| H1 | 3.2em (51px) | 400 | 44px | — | `text-5xl font-normal` |
| H2 (section) | 30px | 700 | 42px | uppercase, tracking-wide | `text-3xl font-bold uppercase tracking-wide` |
| H3 | 1.8em (29px) | 700 | 24px | — | `text-2xl font-bold` |
| H4 | 1.4em (22px) | 400 | 27px | — | `text-xl font-normal` |
| H5 | 1em (16px) | 700 | 18px | — | `text-base font-bold` |
| Body | 16px | 400 | 24px | — | `text-base font-normal` |
| Sub-text | 18px | 400 | 29px | — | `text-lg font-normal` |
| Nav links | 13px | 600 | — | uppercase | `text-xs font-semibold uppercase` |
| Buttons | 12-13px | 700 | — | uppercase | `text-xs font-bold uppercase` |
| Captions | 12px | 400 | — | — | `text-xs font-normal` |
| Labels | 14px | 400 | — | — | `text-sm font-normal` |

### Heading Colors

| Element | Color |
|---------|-------|
| H1-H6 | `#060606` (near black) |
| Section H2 | `#333333` (dark gray, uppercase) |
| H4 (multi-content) | `#003a5d` (primary, uppercase) |
| Body paragraphs | `#424242` |

---

## 3. Spacing & Layout

### Grid

- Max container width: **1170px** (Bootstrap's default `.container`)
- Tailwind equivalent: `max-w-[1170px] mx-auto px-4`

### Section Spacing

| Token | Size | Usage |
|-------|------|-------|
| Section gap | 60-70px | Between major page sections |
| Card gap | 30px | Between cards in a grid |
| Inner padding | 60px | Inside content sections |
| Component gap | 20px | Between elements within a card |

### Section Divider

Every section heading uses a centered horizontal line:

```html
<div class="text-center mb-10">
  <h2 class="text-3xl font-bold uppercase tracking-wide text-[#333] mb-0">Section Title</h2>
  <span class="inline-block w-[70px] h-px border-t border-[#bbb] mt-2"></span>
</div>
```

### Border Radius

**Zero everywhere.** This is a core Autexis design principle.

```css
border-radius: 0;
```

Tailwind: `rounded-none` — apply globally via shadcn/ui theme.

No rounded corners on:
- Buttons
- Inputs
- Cards
- Badges
- Dropdowns
- Modals

---

## 4. Components

### 4.1 Buttons

All buttons: **uppercase, bold, sharp corners, subtle shadow.**

#### Primary Button (Accent)

```html
<button class="bg-[#9eca45] text-white font-bold text-xs uppercase px-7 py-3.5 rounded-none shadow-sm hover:bg-[#333] transition-all">
  Button Text
</button>
```

- Background: `#9eca45`
- Text: white, 13px, bold, uppercase
- Padding: 14px 28px
- Shadow: `0 1px 1px rgba(0,0,0,0.2)`
- Hover: background → `#333333`

#### Dark Button

```html
<button class="bg-[#333] text-white font-bold text-xs uppercase px-7 py-3.5 rounded-none shadow-sm hover:bg-[#9eca45] transition-all">
  Button Text
</button>
```

- Background: `#333333`
- Hover: background → `#9eca45`

#### Border Button (Outline)

```html
<button class="border border-[#9eca45] text-[#9eca45] font-bold text-xs uppercase px-7 py-3.5 rounded-none shadow-sm hover:bg-[#9eca45] hover:text-white transition-all">
  Button Text
</button>
```

#### White Border Button (for dark backgrounds)

```html
<button class="border border-white text-white font-bold text-xs uppercase px-7 py-3.5 rounded-none shadow-sm hover:bg-white hover:text-black transition-all">
  Button Text
</button>
```

### 4.2 Navbar

```
┌─────────────────────────────────────────────────────────┐
│ [Logo]              SCAN   PRODUCTS   ALERTS   CHAT     │
│                     (uppercase, 13px, semibold, #777)   │
└─────────────────────────────────────────────────────────┘
```

- Background: `rgba(255, 255, 255, 0.9)` (semi-transparent white)
- Min height: 70px
- Padding: 10px 0
- Shadow: `rgba(0,0,0,0.118) 0 1px 3px`
- Sticky on scroll
- Link color: `#777777`
- Link hover: `#9eca45`
- Active link: `#9eca45`
- Font: 13px, semibold (600), uppercase

### 4.3 Cards

```html
<div class="bg-white border border-[#ddd] rounded-none p-0 shadow-none">
  <div class="overflow-hidden">
    <img class="w-full hover:scale-110 transition-transform duration-200" />
  </div>
  <div class="p-4">
    <h4 class="text-xl font-normal text-[#444] mb-0">Card Title</h4>
    <span class="text-xs font-normal text-[#777]">Caption text</span>
  </div>
</div>
```

- No border radius
- Image hover: scale 1.1 with transition
- Image overlay on hover: `rgba(158, 202, 69, 0.7)` (accent with 70% opacity)

### 4.4 Form Inputs

```html
<input class="w-full border border-[#ddd] rounded-none bg-white text-xs text-[#7a7a7a] px-3 py-2 shadow-none focus:border-[#bbb] focus:shadow-none transition-all" />
```

- Border: `1px solid #ddd`
- Border radius: **0**
- Font size: 12px (inputs), 14px (labels)
- Focus: border → `#bbb`, no box shadow
- Background: white

### 4.5 Badges

```html
<span class="inline-block bg-[#9eca45] text-white text-xs font-normal rounded-none px-1.5 py-0.5 ml-1">
  Badge
</span>
```

### 4.6 Service/Feature Boxes

Icon boxes used for feature highlights:

```html
<div class="text-center">
  <div class="w-[85px] h-[85px] leading-[85px] text-center text-[#9eca45] text-3xl bg-[#f7f9fa] rounded-full mx-auto mb-6 hover:bg-[#9eca45] hover:text-white transition-all duration-700 hover:rotate-y-360">
    <!-- Icon -->
  </div>
  <h3 class="text-xl font-medium uppercase mb-4">Feature Title</h3>
  <p class="text-[#424242]">Description text</p>
</div>
```

**Note:** The service icon circle is the ONE exception to the zero-radius rule — it uses `rounded-full`.

### 4.7 Progress/Risk Bars

```html
<div class="w-full h-[15px] bg-[#e9e9e9] rounded-none">
  <div class="h-full bg-[#9eca45] rounded-none" style="width: 75%"></div>
</div>
```

---

## 5. Icons

Use **Font Awesome** (Autexis uses FA) or **Lucide React** (shadcn/ui default — more modern).

Recommendation: **Lucide React** for consistency with shadcn/ui, matching the Autexis aesthetic with simple line icons.

```bash
pnpm add lucide-react
```

### Icon Sizes

| Context | Size | Tailwind |
|---------|------|----------|
| Navigation | 14px | `w-3.5 h-3.5` |
| Buttons | 16px | `w-4 h-4` |
| Cards/features | 30px | `w-8 h-8` |
| Hero icons | 65px | `w-16 h-16` |

---

## 6. Animations

### Entrance Animations

Autexis uses wow.js/animate.css for scroll-triggered entrance animations. In React, use `framer-motion` or Tailwind's animation utilities.

```typescript
// Equivalent fadeInUp animation
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: "easeOut" },
};
```

Stagger delays for grid items:
- Item 1: 100ms delay
- Item 2: 200ms delay
- Item 3: 300ms delay

### Transitions

All interactive elements use CSS transitions:

```css
transition: all 200ms ease-in;
```

Tailwind: `transition-all duration-200 ease-in`

### Image Hover

```css
.item:hover img {
  transform: scale(1.1);
}
```

Tailwind: `hover:scale-110 transition-transform duration-200`

### Cursor Blink (for typed text effects)

```css
@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}
```

---

## 7. Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Autexis brand
        primary: {
          DEFAULT: "#003a5d",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#9eca45",
          foreground: "#ffffff",
          hover: "#8bb83a",
        },
        // Sub-brands
        brand: {
          control: "#009ee3",
          it: "#3fa435",
        },
        // Neutrals
        body: "#424242",
        muted: "#777777",
        surface: "#f7f9fa",
        "surface-alt": "#f8f8f8",
        // Semantic
        success: "#3fa435",
        warning: "#f59e0b",
        danger: "#dc2626",
        info: "#009ee3",
        // Risk levels
        risk: {
          safe: "#3fa435",
          monitor: "#f59e0b",
          review: "#ea580c",
          critical: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-titillium)", "Titillium Web", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        DEFAULT: "0",     // Override ALL default radius to 0
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "9999px",   // Keep full for avatars/icons
      },
      boxShadow: {
        button: "0 1px 1px rgba(0, 0, 0, 0.2)",
        nav: "rgba(0, 0, 0, 0.118) 0 1px 3px",
      },
      fontSize: {
        nav: ["13px", { fontWeight: "600", letterSpacing: "0" }],
        btn: ["12px", { fontWeight: "700" }],
        "btn-lg": ["13px", { fontWeight: "700" }],
      },
      maxWidth: {
        container: "1170px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## 8. shadcn/ui Theme Overrides

### CSS Variables (app/globals.css)

```css
@layer base {
  :root {
    /* Autexis colors mapped to shadcn/ui variables */
    --background: 0 0% 100%;                /* #ffffff */
    --foreground: 0 0% 2%;                   /* #060606 */
    --card: 210 20% 98%;                     /* #f7f9fa */
    --card-foreground: 0 0% 26%;             /* #424242 */
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 2%;
    --primary: 204 100% 18%;                 /* #003a5d */
    --primary-foreground: 0 0% 100%;
    --secondary: 210 20% 98%;               /* #f7f9fa */
    --secondary-foreground: 0 0% 26%;
    --muted: 0 0% 47%;                       /* #777777 */
    --muted-foreground: 0 0% 47%;
    --accent: 83 56% 53%;                    /* #9eca45 */
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;               /* #dc2626 */
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 87%;                      /* #dddddd */
    --input: 0 0% 87%;                       /* #dddddd */
    --ring: 204 100% 18%;                    /* #003a5d */
    --radius: 0px;                           /* ZERO border radius */

    /* Custom tokens */
    --accent-hover: 83 56% 44%;             /* #8bb83a */
    --surface: 210 20% 98%;                  /* #f7f9fa */
    --body-text: 0 0% 26%;                   /* #424242 */
    --selection-bg: 54 96% 89%;              /* #fefac7 */
  }
}

/* Text selection */
::selection {
  background-color: #fefac7;
  color: #555555;
}

::-moz-selection {
  background-color: #fefac7;
  color: #555555;
}
```

### shadcn/ui Component Overrides

When installing shadcn/ui components, override these defaults:

```json
// components.json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

Key overrides for shadcn/ui components:
- **Button:** Add `uppercase font-bold text-xs shadow-button` to all variants
- **Input:** Ensure `rounded-none` (should be automatic from `--radius: 0px`)
- **Card:** Remove default shadow, add `border-[#ddd]`
- **Badge:** Use `bg-accent text-white rounded-none`
- **Dialog/Sheet:** Sharp corners, no rounded borders

---

## 9. Responsive Breakpoints

Follow Tailwind defaults (matching Bootstrap pattern from Autexis):

| Breakpoint | Min Width | Tailwind Prefix |
|-----------|-----------|-----------------|
| Mobile | 0px | (default) |
| SM | 640px | `sm:` |
| MD | 768px | `md:` |
| LG | 1024px | `lg:` |
| XL | 1280px | `xl:` |

### Mobile-First Rules

- Scanner page: full viewport, no chrome
- Map: full width, touch-optimized
- Cards: single column on mobile, 3-column on desktop
- Nav: hamburger on mobile, horizontal on desktop
- Section padding: 15px on mobile, 60px on desktop

---

## 10. Do's and Don'ts

### DO

- Use sharp corners (border-radius: 0) on everything except circular icons
- Use uppercase for navigation, buttons, and section headings
- Use Titillium Web for all text — no mixing fonts
- Use the accent green (#9eca45) for all primary CTAs
- Use subtle shadows (0 1px 1px) on buttons only
- Use the centered line divider under section headings
- Use fadeIn entrance animations on scroll
- Keep the design clean, professional, and Swiss-industrial
- Use generous whitespace (60-70px between sections)

### DON'T

- Don't use rounded corners anywhere (except `rounded-full` for icon circles)
- Don't use heavy drop shadows or elevation effects
- Don't use gradients on backgrounds
- Don't use multiple fonts
- Don't use bright/saturated colors outside the defined palette
- Don't use emoji in the UI (this is industrial software, not consumer social)
- Don't use animated gradients or flashy effects
- Don't deviate from the type scale
- Don't use lowercase for navigation or buttons
