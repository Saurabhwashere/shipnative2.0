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
   - LargeTitleNavBar for tasks/settings/content-first homes; compact/search/minimal chrome for dashboards, commerce, travel, media, and drill-ins
   - GlassView on native/iOS-like chrome, solid surfaces on cards
   - Top-anchored content, never centered landing-page layout
   - Animated pill tab bar with Animated.spring
   - Restrained empty states embedded in content flow
   - Bottom tabs or stack/sheet patterns
6. Prefer category-appropriate chrome instead of forcing one recipe:
   - Use bottom tabs only for 3-5 peer destinations
   - Use stack + sheets for linear flows, forms, and single-purpose tools
   - Use vector icons by default; reserve emoji for playful/kids concepts
   - Use glass chrome only when the app is native/iOS-like or style-neutral
   - Respect safe areas for all top chrome and overlays; drawers, sidebars, sheets, and floating trays must clear the notch and home indicator
7. Treat post-build navigation changes as architecture work:
   - "add a nav bar", "add tabs", "make this tabbed", and "add bottom navigation" are not cosmetic tweaks
   - Refactor routes and layout files instead of overlaying a floating menu onto one screen
   - Navigation belongs in `app/_layout.tsx` or `app/(tabs)/_layout.tsx`, never inside a screen component
   - If the app only has 2 destinations, do not default to a generic floating bottom tab bar unless the user explicitly wants tabs
   - If you create `app/(tabs)/_layout.tsx`, tab screens must live inside `app/(tabs)/` as sibling route files
   - Never place tab screens at `app/discover.tsx` or `app/profile.tsx` while the tab layout lives under `app/(tabs)/`

## 2026 iOS Design Targets

Every generated screen should hit ALL of these benchmarks before being
considered complete. These are the minimum bar for modern native quality.

### Navigation Chrome
- Pick navigation by information architecture, not habit
- LargeTitleNavBar for tasks/settings/education home screens; compact or search nav for dashboards, commerce, travel, media
- Tabs only when there are 3-5 top-level peer destinations
- Tab bar uses animated sliding pill (Animated.spring tension 320 friction 28)
- Use GlassView for default iOS-native chrome; branded or Material-style apps may use solid chrome if intentional
- Never guess pill width from a fake device frame; measure the rendered bar width with `onLayout` or derive it from the real container width and insets
- Glass bars need all four layers: clipped container, BlurView, tint overlay, shimmer line
- Inactive tabs should be dimmed enough to preserve hierarchy

### Typography Hierarchy
- Use 2-4 deliberate type levels per screen; most strong screens use 3
- Hero numbers (stats, metrics, streaks, counts) at fontSize 48-56, fontWeight '800'
- Large title at fontSize 34, fontWeight '800', letterSpacing -1
- Never use fontSize 17 for everything — vary weights and sizes deliberately
- fontWeight always a string: '400', '600', '700', '800' — never a number

### Controls
- Minimum touch target is 44×44
- Keep visible spacing between adjacent pills, icon buttons, and chips
- Search bars and segmented controls usually sit in the 44-52px height range

### Surface Depth
- Cards: solid COLORS.surface + borderWidth 1 + COLORS.surfaceBorder
- Dark theme: borders on cards because shadows disappear on dark backgrounds
- Light theme: very subtle shadow OR hairline border — not both
- Chrome (nav bars, tab bars, sheets): glass by default for native/iOS-like apps, solid if the app calls for a clearer branded system
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
- Use `react-native-safe-area-context` for real inset handling:
  `SafeAreaView` for screen shells, `useSafeAreaInsets()` for absolute chrome and overlays
- Never let drawer or sidebar content start at the very top edge; apply at least `paddingTop: insets.top + 12`
- Bottom bars, sheets, and floating trays must apply `paddingBottom` or `bottom` using `insets.bottom`
- Section gaps 24-32px between sections, 12px between rows within a section
- Horizontal padding 20px on all screens — never reduce to 16px
- First viewport should feel content-rich; avoid dead space before the first usable content
- Avoid “card soup” — mix at least two rhythms like hero + list, mosaic + feed, or timeline + summary

## Design Heuristics

- The single fastest way to tell if an AI-generated app looks modern is the tab bar.
  A sliding glass pill tab bar reads as 2026. A static color-change tab bar reads as 2020.
- Nav bars should feel weightless — glass, not walls.
- Cards should feel grounded — solid surfaces, thin borders, no heavy shadows.
- Every screen needs one hero moment: a large number, a bold title, or a strong visual anchor.
- Prefer vector iconography and clean silhouettes over emoji unless the concept is intentionally playful.
- Empty states are footnotes, not headlines. Keep them small and contextual.
- Accent colors carry personality. Indigo is the absence of a decision — always choose intentionally.
- If the whole screen is the same font weight, it will always look like a web page.

## Anti-Patterns to Reject

When reviewing or generating UI, immediately flag and fix any of these:

- Tab bar inside ScrollView content (must be outside, position absolute)
- Tiny floating menu/popover masquerading as a navbar or tab bar
- Drawer, sheet, sidebar, or navbar content sitting under the notch or home indicator
- Floating FAB inside ScrollView content (must be outside, position absolute)
- Solid opaque white/black tab bar on a style-neutral native app when glass chrome would be the stronger choice
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
