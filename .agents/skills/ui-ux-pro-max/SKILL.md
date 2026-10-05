---
name: ui-ux-pro-max
description: "Master UI/UX Design Intelligence, Design Taste, Motion Engineering, and Visual Impairment (Discapacidad Visual / Low Vision / Screen Reader) Design System. Use when designing, building, auditing, or refactoring web and mobile interfaces. Integrates: (1) UI/UX Pro Max searchable database (79 styles, 192 palettes, 74 font pairings, 119 UX guidelines, 22 stacks including React Native/Expo via search.py CLI), (2) Taste-Skill anti-slop principles, brief inference, and dials (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY), (3) Design Motion Principles (Emil Kowalski, Jakub Krehel, Jhey Tompkins, frequency gate, GPU transforms, vestibular safety), and (4) Deep Visual Impairment & Assistive Tech Accessibility (WCAG 2.2 AAA contrast >= 7:1, TalkBack/VoiceOver card grouping, multimodal Haptics + TTS speech redundancy, large touch targets >= 56-76dp, dynamic type scaling without truncation)."
---

# UI/UX Pro Max: Master Design & Accessibility Intelligence

Comprehensive design engineering and accessibility intelligence combining **UI/UX Pro Max**, **Taste-Skill (Anti-Slop Craft)**, **Design Motion Principles (Emil Kowalski, Jakub Krehel, Jhey Tompkins)**, and **Visual Impairment & Low Vision Design Standards (WCAG 2.2 AAA & Assistive Tech)**.

---

## 1. When to Apply

Use this skill when designing, building, styling, reviewing, or fixing user interfaces:
- **Visual Design & Taste:** Escaping AI default templates, establishing typographic scales, high-contrast palettes, and intentional layout rhythm.
- **Motion & Interaction:** Designing purposeful micro-interactions, exit/enter animations, spring physics, and respecting `prefers-reduced-motion`.
- **Accessibility & Visual Impairment (Discapacidad Visual):** Designing for total blindness, low vision, tunnel vision, photophobia, and screen readers (TalkBack / VoiceOver). Ensuring WCAG AAA contrast (>= 7:1), touch targets (>= 56–76dp), and triple sensory redundancy (Visual + Audio/TTS + Haptics).
- **Stack-Specific Implementation:** React Native, Expo, Reanimated, Gesture Handler, Tailwind, SwiftUI, Web, etc.

---

## 2. Core Operational Workflow

```
[ STEP 0: BRIEF INFERENCE & ACCESSIBILITY CONSTRAINTS ]
                        │
                        ▼
[ STEP 1: SET THE THREE DIALS (Variance, Motion, Density) ]
                        │
                        ▼
[ STEP 2: SEARCH LOCAL INTELLIGENCE DATABASE (search.py) ]
                        │
                        ▼
[ STEP 3: APPLY MOTION PRINCIPLES (Frequency Gate & Physics) ]
                        │
                        ▼
[ STEP 4: ENFORCE VISUAL IMPAIRMENT & A11Y ARCHITECTURE ]
                        │
                        ▼
[ STEP 5: PRE-FLIGHT AUDIT & DELIVERY CHECKLIST ]
```

---

## STEP 0: Brief Inference & Quiet Constraints

Before writing styles or components, identify the room:
1. **Audience & Quiet Constraints:**
   - If users have visual impairments (low vision, blindness), **accessibility overrides all decorative preferences**. High contrast, large targets, and screen reader clarity take precedence over subtle aesthetics or complex animations.
2. **Anti-Default Discipline:**
   - ❌ Never use generic AI purple/violet gradients (`#6366F1` to `#A855F7`).
   - ❌ Never use low-contrast gray text (`#9E9E9E` or `#6B7280`) on white surfaces.
   - ❌ Never use glassmorphism that obscures text readability.
   - ❌ Never use 3 equal generic cards with floating icons.
   - ❌ Never rely on color alone to convey state or success/failure.

---

## STEP 1: Calibrate The Three Dials

```
DESIGN_VARIANCE: 1 - 10   (1 = Strict System Symmetry, 10 = Asymmetric / Expressive)
MOTION_INTENSITY: 1 - 10  (1 = Instant/Static, 10 = Cinematic Physics)
VISUAL_DENSITY: 1 - 10    (1 = Airy / Spacious, 10 = Dense / Operational Cockpit)
```

### Context Presets
| Context | Variance | Motion | Density | Description |
|---|---|---|---|---|
| **Transit / Low-Vision A11y** | **2 - 3** | **2 - 3** | **3 - 4** | Ultra-clear, large hit targets, high contrast, zero cognitive clutter |
| **B2B Productivity / SaaS** | **5 - 6** | **3 - 4** | **7 - 8** | High efficiency, keyboard navigation, crisp data display |
| **Consumer Mobile App** | **6 - 7** | **5 - 6** | **4 - 5** | Friendly tactile feedback, balanced spacing, polished feel |
| **Design Portfolio / Editorial** | **8 - 9** | **7 - 8** | **3 - 4** | Typographic distinction, expressive motion |

---

## STEP 2: Querying the Local Design Database (`search.py`)

Run the built-in search engine directly with `python3`:

```bash
# Query UX best practices:
python3 "<skill_path>/scripts/search.py" "<query>" --domain ux

# Query React Native stack rules:
python3 "<skill_path>/scripts/search.py" "<query>" --stack react-native

# Generate complete design system tokens:
python3 "<skill_path>/scripts/search.py" "<keywords>" --design-system -p "App Name" --variance 3 --motion 2 --density 4
```

### Domains Available
- `ux`: 119 UX guidelines (touch targets, screen readers, error recovery, forms).
- `color`: 192 product palettes with semantic roles.
- `typography`: 74 verified font pairings and scales.
- `style`: 79 visual styles with implementation checklists.
- `icons`: Icon recommendations and accessible names.
- `gsap` / `motion`: Animation presets and timing.
- `--stack <stack>`: Stack-specific patterns (`react-native`, `swiftui`, `flutter`, `html-tailwind`, `react`, `nextjs`, etc.).

---

## STEP 3: Motion Design Engineering

Synthesized from Emil Kowalski, Jakub Krehel, and Jhey Tompkins. Read `references/motion-principles.md` for full depth.

### The Frequency Gate
- **Frequent actions (100s/day, typing, selecting):** 0ms - 80ms (Instant state change; never animate).
- **Daily actions (navigation, modals, sheets):** 150ms - 250ms (Subtle, purposeful).
- **Rare actions (onboarding, trip completion):** 300ms - 450ms (Delightful, expressive).
- **Keyboard / Screen Reader navigation:** **0ms (Never animate focus shifts).**

### Motion Performance & Easing
- **GPU Properties Only:** Animate strictly `transform` (`scale`, `translate`) and `opacity`. Never animate `width`, `height`, `top`, or `margin`.
- **Exit Faster Than Enter:** Enter = 200–250ms (`cubic-bezier(0.16, 1, 0.3, 1)` / snappy spring). Exit = 120–180ms (`cubic-bezier(0.7, 0, 0.84, 0)`).
- **Vestibular Safety:** When `prefers-reduced-motion` is active or in accessibility-focused profiles, bypass transform/scaling animations and use instant state changes or subtle cross-fades.

---

## STEP 4: Visual Impairment & Inclusive Architecture (Discapacidad Visual)

Read `references/visual-impairment-a11y.md` for complete technical patterns.

### 1. Contrast (WCAG 2.2 AAA Standards)
- Normal text: **>= 7.0:1** contrast.
- Large text / prominent UI icons: **>= 4.5:1** contrast.
- Focus borders / active boundaries: **>= 3.0:1** contrast (use 2px solid borders).
- Provide true OLED high-contrast dark surfaces (`#000000` background with `#FFFFFF` text and high-luminance accents like `#FFD600` Safety Yellow or `#00E676` Emerald).

### 2. Triple Sensory Redundancy
Every critical event must trigger:
1. **Visual:** High contrast label + 2px border + distinct icon (never color alone).
2. **Audio / Speech:** Spoken announcement via TTS (Expo Speech) with clear, conversational language ("A 50 metros", not "0.05 km").
3. **Tactile / Haptics:** Unique haptic pattern (Expo Haptics: Selection, Success, Warning, or Alert pulse).

### 3. Screen Reader Optimization (TalkBack & VoiceOver)
- **Group compound cards (`accessible={true}`):** Prevent fragmented reading. A transit card must read as one coherent sentence rather than 5 disjointed taps.
- **Accurate semantics:** Always assign `accessibilityRole` (`button`, `header`, `alert`, `search`).
- **Provide clear hints:** Use `accessibilityHint` for non-obvious outcomes ("Abre la lista de estaciones").
- **Dynamic announcement throttling:** Avoid speech collisions by debouncing and queuing spoken messages.

### 4. Touch Target Ergonomics & Layout Scaling
- **Minimum interactive size:** **56×56dp** (primary actions: **68×76dp**).
- **Spacing:** Minimum **12dp** gap between adjacent buttons to eliminate mis-touches.
- **Dynamic Type Safety:** Never use fixed container heights that clip text. Allow multi-line expansion; never truncate critical safety information with `...`.

---

## STEP 5: Pre-Flight Audit Checklist

Before declaring any UI task complete, verify:
- [ ] **Contrast:** Every text element meets WCAG AAA (>= 7:1 normal, >= 4.5:1 large).
- [ ] **Touch Targets:** Every interactive element has minHeight >= 56dp and hitSlop configured.
- [ ] **Screen Reader Test:** All buttons have `accessibilityRole`, meaningful `accessibilityLabel`, and optional `accessibilityHint`.
- [ ] **Dynamic Scaling:** Containers expand when system text size increases; no text is clipped.
- [ ] **Multimodal Feedback:** Critical actions trigger corresponding haptic feedback and TTS audio announcements.
- [ ] **Frequency Gate:** High-frequency actions do not have lagging or blocking animations.
- [ ] **Reduced Motion:** Layout functions perfectly without animation.

---

## References & Specialized Documentation
- [Quick Reference (119 UX Guidelines)](./references/quick-reference.md)
- [Pro Rules & Mobile Polish Checklist](./references/pro-rules.md)
- [Motion Principles (Emil, Jakub, Jhey)](./references/motion-principles.md)
- [Taste & Anti-Slop Principles](./references/taste-principles.md)
- [Visual Impairment & Low Vision Design System](./references/visual-impairment-a11y.md)
