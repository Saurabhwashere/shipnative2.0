---
name: native-ui
description: Native-first mobile app generation guidance for ShipNative. Use when building or revising generated mobile UI, choosing templates, or improving app screens so they look modern and native.
---

# Native UI Skill

Use this skill for ShipNative prompt work, starter templates, and generated screen quality.

## Workflow

1. Classify the request into one of these categories: `tasks`, `commerce`, `dashboard`, `settings`, `fitness`, `food`, `social`, `media`, `travel`, `education`.
2. Pick the closest starter template from `assets/templates/`.
3. Keep the information architecture from the template unless the user explicitly asks for something else.
4. Apply the category theme rule:
   - `tasks`, `commerce`, `settings`, `food`, `travel`, `education` → light by default
   - `dashboard`, `fitness`, `media`, `social` → dark by default
5. Preserve native composition:
   - LargeTitleNavBar on home screens, CompactNavBar on drill-in screens
   - GlassView on tab bars and nav bars, solid surfaces on cards
   - Top-anchored content, never centered landing-page layout
   - Animated pill tab bar with Animated.spring
   - Restrained empty states embedded in content flow
   - Bottom tabs or stack/sheet patterns

## 2026 iOS Design Targets

Every generated screen should hit ALL of these benchmarks before being
considered complete. These are the minimum bar for modern native quality.

### Navigation Chrome
- LargeTitleNavBar floats above content using GlassView
- Nav bar action buttons are circular pills (36×36, borderRadius 18)
- Tab bar uses animated sliding pill (Animated.spring tension 320 friction 28)
- Tab bar uses GlassView — never a solid opaque background
- No solid-color nav bars unless the user explicitly requests a custom style

### Typography Hierarchy
- Exactly 3 weight levels per screen: 800 (titles), 600 (labels), 400 (body)
- Hero numbers (stats, metrics, streaks, counts) at fontSize 48-56, fontWeight '800'
- Large title at fontSize 34, fontWeight '800', letterSpacing -1
- Never use fontSize 17 for everything — vary weights and sizes deliberately
- fontWeight always a string: '400', '600', '700', '800' — never a number

### Surface Depth
- Cards: solid COLORS.surface + borderWidth 1 + COLORS.surfaceBorder
- Dark theme: borders on cards because shadows disappear on dark backgrounds
- Light theme: very subtle shadow OR hairline border — not both
- Chrome (nav bars, tab bars, sheets): GlassView only
- Background: tinted to match emotional register — never generic #F2F2F7
  for non-productivity apps

### Color Identity
- Accent color matches the app concept from the 9-family palette system
- Never default to indigo #5856D6 unless the app is explicitly productivity/tasks
- COLORS constant defined at top of file, used everywhere — no hardcoded hex

### Motion
- Tab switching: spring pill animation (already in TabBar component)
- Screen transitions: Animated.timing fade (100ms out, 180ms in)
- Card press: opacity 0.88 or scale 0.97 — every tappable element has feedback
- All Animated calls use useNativeDriver: true

### Layout Rules
- Tab bar outside ScrollView, position absolute bottom 0
- Nav bar outside ScrollView, position absolute top 0
- Floating FAB outside ScrollView, position absolute bottom 34 right 20
- scrollContent paddingTop 120 when nav bar present
- scrollContent paddingBottom 110 when tab bar present
- Section gaps 24-32px between sections, 12px between rows within a section
- Horizontal padding 20px on all screens — never reduce to 16px

## Design Heuristics

- The single fastest way to tell if an AI-generated app looks modern is the tab bar.
  A sliding glass pill tab bar reads as 2026. A static color-change tab bar reads as 2020.
- Nav bars should feel weightless — glass, not walls.
- Cards should feel grounded — solid surfaces, thin borders, no heavy shadows.
- Every screen needs one hero moment: a large number, a bold title, or a strong visual anchor.
- Empty states are footnotes, not headlines. Keep them small and contextual.
- Accent colors carry personality. Indigo is the absence of a decision — always choose intentionally.
- If the whole screen is the same font weight, it will always look like a web page.

## Anti-Patterns to Reject

When reviewing or generating UI, immediately flag and fix any of these:

- Tab bar inside ScrollView content (must be outside, position absolute)
- Floating FAB inside ScrollView content (must be outside, position absolute)
- Solid opaque white/black tab bar (must use GlassView)
- Every text element at the same font weight (must have at least 2 distinct levels)
- Generic indigo accent on a non-productivity app (must match app concept)
- Giant centered empty state replacing the whole screen layout
- Full-screen landing page hero as the main app screen
- Blue underlined web links in native UI
- fontWeight as a number instead of a string
- Hardcoded hex values instead of COLORS tokens
- Missing press feedback on tappable elements
- Hard-cut screen transitions without Animated fade

## Templates

- `assets/templates/tasks-light-tabs/`
- `assets/templates/commerce-light-tabs/`
- `assets/templates/dashboard-dark-cards/`
- `assets/templates/form-sheet-settings/`

Load only the relevant template files you need.
