# Visual Impairment & Inclusive Design System (Discapacidad Visual)

Comprehensive design engineering guide for creating high-accessibility interfaces for users with **Blindness, Low Vision, Tunnel Vision, Photophobia, and Color Vision Deficiencies**, specifically optimized for mobile environments (React Native / Expo / iOS / Android).

---

## 1. Profiles of Visual Impairment

| Impairment Profile | User Experience & Constraints | Core Design Requirements |
|---|---|---|
| **Total Blindness** | Relies 100% on Screen Readers (TalkBack/VoiceOver), Haptics, and Audio/TTS announcements. Cannot see visual UI at all. | Strict semantic markup, linear focus order, complete `accessibilityLabel` & `accessibilityHint`, haptic confirmations, uninterrupted audio announcements. |
| **Severe Low Vision / Macular Degeneration** | Uses high system zoom, Dynamic Type (200%-300%), or holds screen very close (inches away). Peripheral vision may be lost or blurred. | Massive contrast (WCAG AAA >= 7:1), bold typography (weights >= 700), extra-large hit targets (>= 56-76dp), no text truncation (`...`), robust borders. |
| **Tunnel Vision / Glaucoma** | Extremely narrow visual field. Cannot scan multi-column layouts or notice peripheral alerts. | Single-column linear layout, centralized notifications, sticky audio/haptic prompts when off-center events occur. |
| **Photophobia & Contrast Sensitivity** | Bright white screens cause eye strain, halos, or pain; faint light-gray text is completely invisible. | High-contrast dark mode (True Black `#000000` with high-luminance foregrounds `#FFFFFF`, `#FFD600`), avoid washed-out grays (`#9E9E9E`). |
| **Color Vision Deficiency (Color Blindness)** | Difficulty distinguishing Red/Green (Deuteranopia/Protanopia) or Blue/Yellow (Tritanopia). | **Never use color as the sole indicator of status.** Always combine color with high-contrast text labels, distinct icons, and haptic signatures. |

---

## 2. Contrast & Color Palette Standards (WCAG 2.2 AAA)

### Minimum Contrast Ratios
- **Body Text (< 18pt regular):** Minimum **7.0:1** (WCAG AAA).
- **Large Text (>= 18pt bold or >= 24pt regular):** Minimum **4.5:1** (WCAG AAA).
- **UI Components & Graphical Boundaries (Borders, Icons, Active States):** Minimum **3.0:1** (WCAG 2.2 non-text contrast).

### Recommended High-Visibility Transit Palette
```typescript
export const accessibleHighContrastColors = {
  // Surfaces
  background: '#000000',          // True black for maximum OLED contrast and battery
  surface: '#121212',             // Deep charcoal surface
  surfaceElevated: '#1E1E1E',     // Elevated card
  border: '#FFFFFF',              // 2px solid white borders for explicit boundaries
  borderMuted: '#767676',         // High-contrast secondary border (>= 4.5:1 on black)

  // Typography
  textPrimary: '#FFFFFF',         // 21:1 contrast on black
  textSecondary: '#E0E0E0',       // 14:1 contrast on black
  textInverse: '#000000',         // 21:1 contrast on white

  // Semantic Status (High-Luminance Accents)
  primary: '#FFD600',             // High-visibility Safety Yellow / Amber (16.8:1 on black)
  primaryPressed: '#E6C000',
  success: '#00E676',             // Vivid Emerald (12.4:1 on black)
  warning: '#FFA000',             // Safety Orange (10.1:1 on black)
  error: '#FF3B30',               // High-luminance Crimson (7.1:1 on black)
  info: '#40C4FF',                // Electric Sky (11.2:1 on black)
};
```

---

## 3. Multimodal Sensory Architecture (Triple Redundancy)

Every critical event, state change, and navigation alert must be transmitted simultaneously through three sensory channels:

```
[ CRITICAL USER ACTION / EVENT ]
         │
         ├── 1. VISUAL: High-contrast typography + 2px bold border + vivid accent
         ├── 2. AUDITORY: Spoken TTS prompt (Expo Speech) + localized Earcon tone
         └── 3. HAPTIC: Distinct vibration pattern (Expo Haptics)
```

### Haptic Pattern Taxonomy
1. **Selection / Tap:** `Haptics.selectionAsync()` on button touch.
2. **Success / Arrival:** `Haptics.notificationAsync(NotificationFeedbackType.Success)` (double crisp pulse).
3. **Warning / Approach (< 200m to station):** `Haptics.notificationAsync(NotificationFeedbackType.Warning)` (firm warning pulse).
4. **Critical Drop / Emergency:** `Haptics.notificationAsync(NotificationFeedbackType.Error)` (heavy triple pulse).

---

## 4. Screen Reader Architecture (TalkBack & VoiceOver)

### Card Grouping Rule (`accessible={true}`)
Never force a blind user to swipe through 5 individual text nodes inside a single logical card. Group the entire card into one coherent announcement:

```tsx
// ❌ ANTI-PATTERN: Forces 4 separate swipes
<View style={styles.card}>
  <Text>Ruta B12</Text>
  <Text>Hacia Portal Norte</Text>
  <Text>Llegada en 3 minutos</Text>
</View>

// ✅ ACCESSIBLE PATTERN: Single swipe, coherent sentence
<Pressable
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Ruta B doce, con destino Portal Norte. Llega en 3 minutos."
  accessibilityHint="Toca dos veces para rastrear este bus en tiempo real."
  onPress={handleSelect}>
  <Text style={styles.route}>Ruta B12</Text>
  <Text style={styles.dest}>Hacia Portal Norte</Text>
  <Text style={styles.time}>Llegada en 3 min</Text>
</Pressable>
```

### Accessibility Attributes Reference
- `accessibilityRole`: Define semantic type (`button`, `header`, `alert`, `search`, `checkbox`, `tab`).
- `accessibilityLabel`: Precise, localized, human-friendly description without jargon. (Say "B doce", not "B guión doce").
- `accessibilityHint`: Explains the outcome of the action ("Abre la lista de paradas").
- `accessibilityState`: Current dynamic state (`{ selected: true, disabled: false, busy: isTracking }`).
- `accessibilityLiveRegion`: Use `"polite"` for non-urgent status updates; use `"assertive"` ONLY for urgent safety alerts (e.g., "Parada inminente, desciende ahora").

### Audio Announcement Discipline (Collision Prevention)
- Do not fire multiple `AccessibilityInfo.announceForAccessibility` or `Speech.speak` calls at the same millisecond; they will cancel or overlap each other.
- Implement an **announcement queue** with debouncing (`minIntervalMs: 2500` to `5000`) so the user can comfortably listen to each instruction.

---

## 5. Touch Target Ergonomics & Layout

1. **Target Dimensions:**
   - Minimum height/width: **56×56dp**.
   - Primary transit actions (e.g., "Seleccionar destino", "Alerta de bajada"): **68×76dp**.
   - Use `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` to capture imprecise finger touches.
2. **Spacing Between Targets:**
   - Minimum **12dp to 16dp** gap between adjacent touch targets. Never pack buttons edge-to-edge.
3. **No Hidden Gestures:**
   - Never rely exclusively on swipe-to-delete, pinch-to-zoom, or shake gestures. Every gesture must have a large, visible, screen-reader-accessible button alternative.

---

## 6. Dynamic Type & Scalable Layouts

Users with low vision frequently increase system font sizes to 150%–300%:
- **Flexible Containers:** Never use fixed `height: 50` on containers holding text. Use `minHeight: 56` and `paddingVertical: 12` so containers expand gracefully as text scales.
- **Never Truncate with Ellipsis (`...`):** Cutting off text with `numberOfLines={1}` without an expandable view hides critical safety information (e.g., station names).
- **Flex Wrap & Stacking:** Allow horizontal layouts (`flexDirection: 'row'`) to wrap into vertical stacks on large text scales.

---

## 7. Real-Time Transit Guidance (Voice + Location)

When guiding a user on public transit:
1. **Metric vs. Conversational Units:**
   - Say: *"Estás a cincuenta metros de la estación Flores"*.
   - Never say: *"Estás a cero punto cero cinco kilómetros"*.
2. **Directional Clarity:**
   - Give relative landmarks: *"Avanza hacia el norte por la rampa derecha"* rather than cardinal coordinates.
3. **Imminent Arrival Warnings:**
   - Trigger warning 500m before the drop station, and urgent announcement 100m before arrival with distinctive haptic pulses.
