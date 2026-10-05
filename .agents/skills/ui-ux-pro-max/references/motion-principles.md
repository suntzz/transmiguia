# Design Motion Principles & Motion Engineering

Synthesized from **Emil Kowalski** (Linear, ex-Vercel), **Jakub Krehel** (jakub.kr), and **Jhey Tompkins** (@jh3yy).

---

## 1. The Three Designer Lenses

| Designer | Philosophy | Core Question | Best For | Key Signatures |
|---|---|---|---|---|
| **Emil Kowalski** | Restraint, speed, purposeful function | *"Should this animate at all?"* | Productivity tools, B2B SaaS, developer tools | Under 200ms, snappy springs, exit animations faster than enter, zero gratuitous bounce |
| **Jakub Krehel** | Subtle production polish, refinement | *"Is this subtle and polished enough for production?"* | Consumer apps, mobile interfaces, design systems | 200-400ms, smooth cubic-bezier or damped springs, spatial continuity, seamless layout transitions |
| **Jhey Tompkins** | Playful delight, creative physics | *"What could this become?"* | Creative sites, onboarding delight, gamified moments | Expressive physics, interactive micro-delights, CSS-driven clever mechanics |

### Context-to-Perspective Mapping
- **Productivity & Utilities (Transit, Maps, Tools):** Emil (Primary) + Jakub (Secondary). Motion must NEVER get in the way of efficiency.
- **Consumer Mobile Apps:** Jakub (Primary) + Emil (Secondary) + Jhey (Delighters on rare achievements).
- **Creative / Portfolios:** Jakub + Jhey (Primary) + Emil (High-frequency navigation).

---

## 2. The Frequency Gate (Golden Rule of UI Motion)

Before animating any UI element, determine how often the user triggers it:

| Frequency | Action Type | Motion Rule | Duration Guideline |
|---|---|---|---|
| **Frequent** (100s / day) | Keyboard shortcuts, list selection, typing, primary search | **Zero animation** or instant transition (< 100ms) | 0ms - 80ms |
| **Daily** (10-50 / day) | Opening details, switching tabs, dialogs, status changes | **Subtle, fast, functional** motion | 150ms - 250ms |
| **Rare** (monthly / once) | Onboarding, success completion, festive moments | **Expressive, delightful** motion | 300ms - 500ms |
| **Keyboard / Screen Reader** | Navigation via assistive tech or arrow keys | **NEVER animate** focus changes | 0ms |

> *"The best animation is that which goes unnoticed."*
> If a user notices or waits for an animation during repetitive tasks, it is bad UI.

---

## 3. Physics & Timing Rules

### Exit Faster Than Enter
- **Enter animation:** 200ms - 250ms (informative, allows user to register what appeared).
- **Exit animation:** 120ms - 180ms (get out of the way immediately; user already made the decision to close).

### Easing & Springs
- **CSS / Cubic-Bezier:**
  - Standard decelerate (Enter): `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo)
  - Standard accelerate (Exit): `cubic-bezier(0.7, 0, 0.84, 0)` (in-expo)
  - Standard smooth: `cubic-bezier(0.2, 0, 0, 1)`
- **Spring Physics (React Native Reanimated / Framer Motion):**
  - Snappy / UI control: `damping: 24, stiffness: 260, mass: 0.8`
  - Gentle / Modal: `damping: 28, stiffness: 200, mass: 1`
  - Avoid bouncy/wobbly springs (`damping < 15`) on interactive buttons or form fields.

---

## 4. Performance & Technical Constraints

1. **GPU Composited Properties Only:**
   - **Allowed:** `transform` (`translateX`, `translateY`, `scale`, `rotate`) and `opacity`.
   - **Forbidden in 60fps/120fps loops:** `width`, `height`, `top`, `left`, `margin`, `padding`, `backgroundColor` (without hardware shader).
   - Changing layout triggers recalculation, reflow, and dropped frames.
2. **React Native Reanimated Best Practices:**
   - Always run gesture and layout animations on the **UI thread** (`useAnimatedStyle`, `withSpring`, `withTiming`).
   - Never bridge large animated values across JS-Native bridge during frame rendering.
   - Use `cancelAnimation` when unmounting or interrupting gestures.

---

## 5. Accessible Motion & Reduced Motion

Motion is an accessibility hazard for users with vestibular disorders, motion sickness, ADHD, or visual impairments:
- **`prefers-reduced-motion` Support:**
  - When reduced motion is requested, disable transform/scaling/slide animations.
  - Replace them with instant state changes or subtle cross-fades (`opacity` with duration < 100ms).
- **Vestibular Triggers to NEVER Use:**
  - Parallax scrolling
  - Rapid spinning or zooming from center
  - Screen-wide bouncing or shaking
  - Infinite ambient movement that cannot be stopped
- **Assistive Tech Synchronization:**
  - Never animate element disappearance before a screen reader finishes announcing it.
  - Maintain focus stability; moving targets cause mis-clicks and disorient screen reader users.
