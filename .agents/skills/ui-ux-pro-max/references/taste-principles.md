# Design Taste & Anti-Slop Frontend Principles

Synthesized from **Leonxlnx/taste-skill** and curated modern design engineering standards.

---

## 1. Brief Inference: Read the Room First

Before touching CSS, React Native styles, or tokens, infer what the interface actually requires:
1. **App/Page Kind:**
   - Utility / Transit / Navigation: Focus on clarity, immediate legibility, high glanceability, spatial reassurance.
   - B2B Productivity: Density, efficiency, subtle keyboard workflows.
   - Consumer / Lifestyle: Warmth, polished tactile interactions, refined branding.
2. **Quiet Constraints (The Supreme Rules):**
   - **Accessibility & Assistive Tech:** If the audience includes people with visual, motor, or cognitive disabilities, aesthetic whims (e.g. subtle pastel text, glassy blur, thin hairline borders) **must give way** to high-contrast, robust affordance, and instant clarity.
3. **The Anti-Default Discipline:**
   - Eliminate generic AI templates:
     - ❌ AI-purple gradients (`#6366F1` to `#A855F7`) on dark backgrounds.
     - ❌ Generic glassmorphism that destroys contrast with low opacity overlays.
     - ❌ Three equal cards with floating decorative icons.
     - ❌ Inter font everywhere with washed-out `#6B7280` body text on white.
     - ❌ Floating random blobs or looping glow animations that add zero value.

---

## 2. The Three Dials Framework

When planning or generating a UI, calibrate three core dials:

```
DESIGN_VARIANCE: 1 - 10   (1 = Strict System Symmetry, 10 = Asymmetric / Expressive)
MOTION_INTENSITY: 1 - 10  (1 = Instant/Static, 10 = Cinematic Choreography)
VISUAL_DENSITY: 1 - 10    (1 = Airy / Gallery, 10 = Dense / Operational Cockpit)
```

### Dial Presets for Critical UI Types
| Use Case | Variance | Motion | Density | Rationale |
|---|---|---|---|---|
| **Public Transit / A11y Guide** | **2 - 3** | **2 - 3** | **3 - 4** | Maximum predictability, large hit zones, zero visual confusion |
| **B2B Productivity / SaaS** | **5 - 6** | **3 - 4** | **7 - 8** | Keyboard-first, dense data, swift response |
| **Consumer Mobile App** | **6 - 7** | **5 - 6** | **4 - 5** | Friendly, polished touch feedback, balanced breathing room |
| **Editorial / Content** | **7 - 8** | **4 - 5** | **2 - 3** | Typographic rhythm, generous whitespace, high readability |

---

## 3. Typographic Hierarchy & Craft

1. **Clear Scale Steps:**
   - Never use adjacent sizes with subtle differences (e.g., 14px vs 15px).
   - Use clear, deliberate jumps:
     - Display: 32px - 40px (bold, high impact)
     - Title / Heading: 24px - 28px
     - Subhead / Large Body: 18px - 20px
     - Body: 16px - 17px
     - Caption / Secondary: 14px (minimum allowed for secondary metadata; never below 13px in mobile)
2. **Line Heights & Tracking:**
   - Large headings: tighter line-height (1.1 - 1.25) and slight negative letter-spacing (`-0.02em`).
   - Body text: open line-height (1.4 - 1.6) and neutral letter-spacing for effortless scanning.
3. **Contrast Integrity:**
   - Never use low-contrast muted text on light backgrounds (e.g., `#9CA3AF` on `#FFFFFF` fails WCAG AA and AAA).
   - Use deep slate/neutral tones (`#111827`, `#1E293B`, or pure `#000000` / `#161616`) for primary text, and `#374151` / `#4B5563` for secondary.

---

## 4. Spacing, Spatial Rhythm & Touch Ergonomics

1. **8pt Grid Discipline:**
   - Spacing increments: `4, 8, 12, 16, 24, 32, 48, 64`.
   - Never invent arbitrary spacing (`17px`, `23px`, `31px`).
2. **Touch-First Spatial Ergonomics:**
   - Interactive elements must have a minimum physical dimension of **48×48dp** (or **56×56dp** to **76dp** for high-accessibility transit actions).
   - Spacing between adjacent interactive targets must be at least **12dp** to prevent accidental mis-touches.
3. **Visual Depth & Elevation:**
   - Prefer crisp borders (`borderWidth: 1.5` or `2`) with subtle, realistic elevation over muddy, blurry multi-layer drop shadows.
   - On dark mode, rely on surface luminance elevation (e.g., `#121212` background, `#1E1E1E` card surface, `#2A2A2A` elevated modal) rather than shadows.
