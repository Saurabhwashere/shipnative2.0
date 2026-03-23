export const NATIVE_UI_SKILL_PROMPT = `NATIVE UI SKILL — APPLY BEFORE WRITING FILES

═══════════════════════════════════════════
STEP 1 — CLASSIFY AND LOCK VISUAL IDENTITY
═══════════════════════════════════════════

Before proposePlan or writeFile, silently lock these four decisions.
Surface all four in the plan so the user can confirm before building starts.

  1. CATEGORY
     Pick from: tasks · commerce · dashboard · settings · fitness ·
     food · social · media · travel · education
     This drives template selection and theme defaults.

  2. CHOSEN TEMPLATE
     Pick the closest from the template library.
     Use its information architecture unless the user explicitly overrides it.

  3. THEME
     light → tasks, commerce, settings, food, travel, education (default)
     dark  → dashboard, fitness, media, social (default)
     Always follow user override if stated.

  4. ACCENT COLOR
     Pick from the family palette — never default to indigo #5856D6
     unless the app is explicitly productivity or utility.
     State the hex value in the plan so the user can approve it.

═══════════════════════════════════════════
STEP 2 — APPLY 2026 iOS DESIGN LANGUAGE
═══════════════════════════════════════════

Every app must hit these visual benchmarks. They are the difference
between a modern 2026 native app and a generic 2022 web template.

─── NAVIGATION CHROME ──────────────────────

RULE: All navigation chrome is weightless glass. All content surfaces are solid.

Nav bars:
- Home screens → LargeTitleNavBar (fontSize 34, fontWeight '800', letterSpacing -1)
- Drill-in screens → CompactNavBar (fontSize 17, fontWeight '700', back chevron)
- Both use GlassView with position absolute top 0
- Action buttons in nav bar are circular pills: width 36, height 36, borderRadius 18
- Content scrolls BENEATH the nav bar — set scrollContent paddingTop 120

Tab bars:
- Always animated sliding pill using Animated.spring (tension 320, friction 28)
- Always GlassView wrapper — never solid opaque background
- Icons are emoji, fontSize 22, with short label below (fontSize 10, fontWeight '600')
- position absolute bottom 0 — NEVER inside ScrollView
- scrollContent paddingBottom 110 to clear tab bar and home indicator

─── TYPOGRAPHY SYSTEM ──────────────────────

RULE: Every screen needs exactly 3 weight levels. Same-weight screens look like web pages.

Hero tier    → fontSize 34-56, fontWeight '800', letterSpacing -1 to -2
               Use for: screen titles, key metrics, stats, streaks, counts
Label tier   → fontSize 13-17, fontWeight '600', letterSpacing 0 to -0.1
               Use for: section headers, card titles, button labels, tab labels
Body tier    → fontSize 13-16, fontWeight '400', letterSpacing 0
               Use for: descriptions, metadata, secondary info, timestamps

fontWeight MUST always be a string: '400' '500' '600' '700' '800'
NEVER use a number: 400 600 700 — this causes a StyleSheet error.

─── SURFACE DEPTH MODEL ────────────────────

Light theme surfaces:
  Screen bg:   tinted near-white matching emotional register (see COLOR TOKENS)
  Cards:       #FFFFFF + borderWidth 1 + borderColor rgba(0,0,0,0.07)
  Chrome:      GlassView tint='light' — rgba(255,255,255,0.68) + blur(20px)

Dark theme surfaces:
  Screen bg:   deep dark matching emotional register (#0A0A0F to #0D1117)
  Cards:       COLORS.surface + borderWidth 1 + borderColor rgba(255,255,255,0.08)
               NO shadows on dark — they disappear. Borders only.
  Chrome:      GlassView tint='dark' — rgba(18,18,28,0.72) + blur(20px)

─── MOTION SYSTEM ──────────────────────────

RULE: useNativeDriver: true on every single Animated call. No exceptions.

Tab switching:     Animated.spring pill (tension 320, friction 28) — in TabBar
Screen transition: Animated.timing fade — 100ms toValue 0, then 180ms toValue 1
Card press:        style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
FAB press:         scale 0.95 + opacity 0.9 simultaneously
Nav action press:  opacity 0.7

─── COMPONENT HIERARCHY ────────────────────

Every screen follows this exact layer order from bottom to top:

  <View style={styles.screen}>                    ← flex 1, bg COLORS.bg
    <ScrollView contentContainerStyle={...}>      ← content goes here
      {/* all scrollable content */}
    </ScrollView>
    <TabBar ... />                                ← position absolute, bottom
    <LargeTitleNavBar ... />                      ← position absolute, top
    <FAB ... />                                   ← position absolute, bottom right
  </View>

Never put TabBar, NavBar, or FAB inside the ScrollView.
Never put TabBar, NavBar, or FAB inside a screen component —
they belong in App.jsx only.

─── EMPTY STATE RULES ──────────────────────

Empty states are footnotes, not headlines.

DO:
  - Keep them small and contextual (max 120px height)
  - Show them inside the scroll content flow
  - Keep the nav bar, filters, and summary visible when list is empty
  - Use a small icon (32-40px) and one short line of copy
  - Offer one inline action button (not a giant CTA)

NEVER:
  - Replace the entire screen layout with an empty state
  - Use a large centered illustration as the primary composition
  - Hide the nav bar or tab bar when the list is empty
  - Make the empty state CTA larger than a regular card

═══════════════════════════════════════════
STEP 3 — NATIVE ANTI-PATTERNS CHECKLIST
═══════════════════════════════════════════

Reject any generated output that contains these patterns.
If found, fix before writing the file.

LAYOUT ANTI-PATTERNS:
  ✗ Tab bar inside ScrollView — must be position absolute outside
  ✗ FAB inside ScrollView — must be position absolute outside
  ✗ Nav bar inside ScrollView — must be position absolute outside
  ✗ Entire screen centered around one giant CTA button
  ✗ Landing page hero composition as the primary app screen
  ✗ scrollContent paddingTop less than 120 when nav bar is present
  ✗ scrollContent paddingBottom less than 110 when tab bar is present

STYLE ANTI-PATTERNS:
  ✗ fontWeight as number (700) instead of string ('700')
  ✗ Hardcoded hex values instead of COLORS tokens
  ✗ Generic indigo accent on non-productivity app
  ✗ Pure #F2F2F7 background on food, fitness, media, or social app
  ✗ Solid opaque white or black tab bar without GlassView
  ✗ Heavy box shadows on dark theme cards
  ✗ All text elements at the same font weight

COMPONENT ANTI-PATTERNS:
  ✗ Blue underlined web links in native UI
  ✗ Stacked bold label + input field web form layout
  ✗ Missing press feedback on any tappable element
  ✗ Hard-cut screen transitions without Animated fade
  ✗ useNativeDriver: false on any Animated call
  ✗ require() for imports — use ES import syntax only
  ✗ Alert() — broken in web preview, use inline UI state instead

═══════════════════════════════════════════
STEP 4 — THE ONE FINAL QUESTION
═══════════════════════════════════════════

Before writing App.jsx, ask yourself this silently:

"If a senior iOS designer at Apple saw a screenshot of this app,
would they think it was built natively in Xcode — or would they
immediately recognize it as an AI-generated React Native template?"

If the honest answer is the latter, do not write the file yet.
Revisit the color identity, typography hierarchy, nav chrome,
and hero moment. Fix those four things first.

The bar is not perfection. The bar is "this looks like it belongs
on the App Store in 2026." Hit that bar on every single app.
`;
