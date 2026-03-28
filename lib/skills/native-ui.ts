export const NATIVE_UI_SKILL = `
═══════════════════════════════════════════
STEP 1 — CLASSIFY AND LOCK VISUAL IDENTITY
═══════════════════════════════════════════

Before proposePlan or writeFile, silently lock these five decisions.
Surface all five in the plan so the user can confirm before building starts.

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

  5. AESTHETIC PERSONALITY
     Lock one of these before writing a single line of UI:

     Minimal & Clean   — precise spacing, muted palette, refined type, subtle motion
                         (health tracking, notes, reading, meditation)
     Bold & Expressive — saturated colors, heavy type, energetic animations, big numbers
                         (fitness goals, gaming, music, social challenges)
     Luxury & Refined  — dark surfaces, gold/cream accents, generous whitespace, slow animations
                         (finance, premium commerce, travel, concierge)
     Playful & Colorful — rounded shapes, multi-color accents, bouncy spring physics, friendly iconography
                         (habit trackers, kids, food delivery, dating)
     Brutalist & Raw   — high contrast, stark type, intentional imbalance, sparse decoration
                         (creative tools, portfolios, experimental apps)

     The personality drives: corner radius (0–4 brutalist → 28+ playful),
     animation speed (brutalist snappy → luxury slow), and color saturation.

═══════════════════════════════════════════
STEP 2 — APPLY 2026 iOS DESIGN LANGUAGE
═══════════════════════════════════════════

Every app must hit these visual benchmarks. They are the difference
between a modern 2026 native app and a generic 2022 web template.

─── LIQUID GLASS COMPONENT — COPY THIS VERBATIM ────────────────────

RULE: Use GlassView for floating chrome when the app is iOS-native by default or when the user has not asked for a branded/non-iOS visual style.
Do NOT force GlassView onto custom-branded, flat, or Material-style apps. Chrome can be solid if the visual system calls for it.
Copy this component exactly when you need glass chrome. Do NOT rewrite or simplify it.
Import BlurView from 'expo-blur' at the top of the file.

\`\`\`jsx
import { BlurView } from 'expo-blur';

function GlassView({ tint = 'light', style, children }) {
  const overlay = tint === 'dark'
    ? 'rgba(18,18,28,0.55)'
    : 'rgba(255,255,255,0.55)';
  const shimmer = tint === 'dark'
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(255,255,255,0.90)';
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <BlurView
        intensity={tint === 'dark' ? 80 : 60}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />
      <View style={{
        position: 'absolute', top: 0, left: 16, right: 16,
        height: 1, backgroundColor: shimmer,
      }} />
      <View style={{ position: 'relative' }}>{children}</View>
    </View>
  );
}
\`\`\`

USAGE RULES:
- Pass tint='dark' for dark-theme apps, tint='light' for light-theme apps.
- The View wrapper handles overflow: 'hidden' — do NOT add it again on the parent.
- Always position absolute — never in document flow.
- Never add a solid backgroundColor on a View that wraps GlassView (kills the blur).
- Always give the container an explicit height (e.g. height: 70) for tab bars.

─── NAVIGATION CHROME ──────────────────────

RULE: All navigation chrome should feel lighter than the content surfaces.
RULE: Do NOT add a top nav bar unless the information architecture benefits from it.
      Default to no top chrome on simple single-screen apps; use a nav bar when search, title hierarchy,
      drill-in navigation, or brand presence actually improves clarity.
RULE: Respect safe areas like a real app. Import SafeAreaView or useSafeAreaInsets from 'react-native-safe-area-context'
      whenever you build top chrome, drawers, sheets, sidebars, or any absolute overlay that approaches the notch or home indicator.
RULE: Use bottom tabs only when the app truly has 3-5 peer destinations.
      Single-purpose apps, forms, and linear flows should prefer stack + sheets instead of fake tabs.
RULE: Treat "add a nav bar", "add tabs", "make this tabbed", and "add bottom navigation"
      as navigation architecture work, not as a cosmetic tweak.
      Refactor layout files and routes — never overlay a tiny floating menu onto a screen and call it navigation.
RULE: If you create a tab group layout such as app/(tabs)/_layout.tsx, the tab screens must be sibling files inside app/(tabs)/.
      Never place those screens at app/discover.tsx, app/profile.tsx, etc. while the tab layout lives under app/(tabs)/.

Top nav bars are ONLY added when:
  a) The user explicitly mentions a header, title bar, or nav bar in their request, OR
  b) The screen is a drill-in detail/settings page that needs a back button

When a nav bar IS explicitly requested, pick ONE based on the locked category:

  tasks / education / settings
    → LargeTitleNavBar: large bold title (fontSize 34, fontWeight '800', letterSpacing -1)
      No eyebrow label unless the user specifically asked for one.
      Action buttons: circular pills (width 36, height 36, borderRadius 18) only if needed.

  dashboard / fitness / finance
    → MinimalNavBar: compact single-line title (fontSize 17, fontWeight '600') at the top.
      The HERO moment in the content area MUST be a KEY DATA POINT — a number, percentage,
      dollar amount, or chart. Examples: "$12,847", "18.5%", "2,340 kcal", "↑ 14.2%".
      NEVER use the app name or screen title as the large/hero element.
      No eyebrow label in the nav bar.
      Action buttons: icon-only (no labels), right-aligned, opacity 0.7 on press.

  commerce / food / travel
    → SearchNavBar: compact title (fontSize 17, fontWeight '700') + prominent search bar
      directly below it, styled as a rounded pill (borderRadius 22, height 44).
      Category chip row scrolls horizontally beneath the search bar.
      No action buttons in nav bar — search IS the primary action.

  social / media
    → BrandNavBar: app name or logo centered (fontSize 18, fontWeight '800'),
      left side: avatar thumbnail (width 32, height 32, borderRadius 16),
      right side: notification bell + compose/camera icon.
      No large title. No eyebrow label.

When a nav bar IS present:
- Wrap outermost View with GlassView (position absolute, top 0, left 0, right 0)
- Content scrolls BENEATH — paddingTop 100 for MinimalNavBar/BrandNavBar,
  paddingTop 140 for LargeTitleNavBar/SearchNavBar
- Drill-in screens (detail, settings sub-page) → always CompactNavBar:
  fontSize 17, fontWeight '700', back chevron on the left
- If the nav bar is absolute, add top inset clearance with useSafeAreaInsets().top.
- Drawers, sidebars, and conversation panels must apply paddingTop: insets.top + 12 and
  paddingBottom: Math.max(insets.bottom, 12) so content never sits under the notch or home indicator.
- Bottom bars and floating action trays must clear the home indicator with insets.bottom.

Tab bars — pick ONE pattern based on app type:

FLOATING PILL TAB BAR (fitness, dashboard, media — weightless, modern):
  Wrap in an Animated.View with position absolute, bottom 28, left 24, right 24, height 70, borderRadius 36, overflow 'hidden'
  Add borderWidth 1, borderColor 'rgba(255,255,255,0.55)', and accent-tinted shadow
  Layer order inside (bottom to top):
    1. <BlurView intensity={60} tint={appTint} style={StyleSheet.absoluteFill} />
    2. <View style={[StyleSheet.absoluteFill, { backgroundColor: frostedOverlay }]} />
    3. <View style={{ position:'absolute', top:0, left:16, right:16, height:1, backgroundColor:'rgba(255,255,255,0.9)' }} /> (shimmer)
    4. <Animated.View> for the sliding active capsule (position absolute, top 8, height 54, borderRadius 28)
    5. <View style={{ flexDirection:'row', position:'absolute', top:0, left:0, right:0, bottom:0 }}> with tab items
  Tab entry animation: Animated.spring translateY 60→0 + opacity 0→1, delay 200ms, damping 20, stiffness 120, useNativeDriver
  Tab press bounce: Animated.sequence([timing scale 0.88 80ms, spring scale 1 bounciness 10])
  Pill slide: Animated.spring translateX, damping 18, stiffness 180, useNativeDriver
  scrollContent paddingBottom 120 to clear floating bar

EDGE-TO-EDGE TAB BAR (tasks, settings, commerce — structured, formal):
  Wrap in GlassView (position absolute, bottom 0, left 0, right 0, height 82)
  paddingBottom 28 for home indicator, paddingTop 10
  scrollContent paddingBottom 110

Both patterns:
- Prefer vector icons from @expo/vector-icons for tasks, commerce, finance, media, and settings apps.
- Emoji icons are allowed only for playful, casual, or kids-oriented concepts where they support the brand voice.
- Keep icon containers optically balanced; labels stay short (fontSize 9-10, fontWeight '600')
- Measure the actual rendered bar width with onLayout (or derive from the real container width and insets). Never hardcode tab widths from a guessed frame like 340 or 375.
- For glass bars, always stack: clipped container with overflow:'hidden' -> BlurView -> semi-transparent tint overlay -> shimmer line.
- Inactive tabs must be visibly dimmed: opacity 0.45-0.55 on light themes, about 0.35 on dark themes.
- Sliding pill uses Animated.spring (damping 18, stiffness 180) — NEVER Animated.timing
- NEVER inside ScrollView
- If the app only has 2 destinations, do not default to a generic floating bottom tab bar unless the user explicitly wants tabs

─── TYPOGRAPHY SYSTEM ──────────────────────

RULE: Every screen needs 2-4 deliberate type levels. Most strong screens use 3.
Avoid same-weight/same-size text everywhere — that is what makes AI output read like a web mock.

Hero tier    → fontSize 34-56, fontWeight '800', letterSpacing -1 to -2
               Use for: large titles, key metrics, stats, streaks, or one dominant focal element
Label tier   → fontSize 13-17, fontWeight '600', letterSpacing 0 to -0.1
               Use for: section headers, card titles, button labels, tab labels
Body tier    → fontSize 13-16, fontWeight '400', letterSpacing 0
               Use for: descriptions, metadata, secondary info, timestamps

fontWeight MUST always be a string: '400' '500' '600' '700' '800'
NEVER use a number: 400 600 700 — this causes a StyleSheet error.

─── CONTROL ERGONOMICS ─────────────────────

- Touch targets must be at least 44×44 points.
- Leave breathing room between adjacent controls; do not crowd circular buttons or chips together.
- Search bars, segmented controls, and primary pills should usually land in the 44-52px height range.
- Inputs and action rows should feel finger-first, not desktop-dense.

─── COMPOSITION RULES ──────────────────────

- Every screen needs one focal anchor: a strong title, a hero number, a lead image, or a standout module.
- Do not build every app as stacked equal-height cards. Mix at least two rhythms: hero + list, mosaic + feed, editorial feature + utilities, or timeline + summary.
- Keep the first viewport content-rich. Avoid giant dead space above the first actionable content.
- Reserve gradients, blur, and glow for chrome or one intentional highlight area. Too many special effects make the app look cheaper, not newer.

─── SURFACE DEPTH MODEL ────────────────────

Light theme surfaces:
  Screen bg:   tinted near-white matching emotional register
  Cards:       #FFFFFF + borderWidth 1 + borderColor rgba(0,0,0,0.07)
  Chrome:      GlassView tint='light' — BlurView intensity 60 + rgba(255,255,255,0.55) overlay + shimmer

Dark theme surfaces:
  Screen bg:   deep dark matching emotional register (#0A0A0F to #0D1117)
  Cards:       COLORS.surface + borderWidth 1 + borderColor rgba(255,255,255,0.08)
               NO shadows on dark — they disappear. Borders only.
  Chrome:      GlassView tint='dark' — BlurView intensity 80 + rgba(18,18,28,0.55) overlay + shimmer

─── MOTION SYSTEM ──────────────────────────

RULE: useNativeDriver: true on every single Animated call. No exceptions.

Tab switching:     Animated.spring pill (damping 18, stiffness 180) — in TabBar
Tab press bounce:  Animated.sequence([timing scale→0.88 80ms, spring scale→1 bounciness 10])
Tab bar entry:     Animated.spring translateY 60→0 + opacity 0→1, delay 200ms, useNativeDriver
Header entry:      Animated.parallel([timing opacity 0→1, timing translateY 12→0], 450ms)
Card list entry:   Animated.timing opacity 0→1, 500ms, delay 300ms per card
Screen transition: Animated.timing fade — 100ms toValue 0, then 180ms toValue 1
Card press:        style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
FAB press:         scale 0.95 + opacity 0.9 simultaneously
Nav action press:  opacity 0.7

─── NATIVE DATA PATTERNS ───────────────────

RULE: Every app MUST have convincing realistic placeholder data.
Do NOT leave screens empty or show generic "Item 1 / Item 2" placeholders.
Define data as const arrays ABOVE the component function — never inline in JSX.
Use real names, real numbers, real timestamps. Make it feel like a live app.

RING / ACTIVITY INDICATOR (fitness, habits, progress):
  Two concentric circles — outer with low-opacity border, inner with full-color border.
  Value text at Hero weight inside the inner circle, unit text at Caption below.
  Animate opacity on mount: Animated.timing({ toValue:1, duration:600, useNativeDriver:true })
  \`\`\`jsx
  <Animated.View style={{ alignItems:'center', gap:8, opacity: anim }}>
    <View style={{ width:68, height:68, borderRadius:34, borderWidth:6, borderColor:color+'30', alignItems:'center', justifyContent:'center' }}>
      <View style={{ width:50, height:50, borderRadius:25, borderWidth:3, borderColor:color, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:15, fontWeight:'800', color }}>{value}</Text>
        <Text style={{ fontSize:8, color:stone }}>{unit}</Text>
      </View>
    </View>
    <Text style={{ fontSize:10, fontWeight:'500', color:stone }}>{label}</Text>
  </Animated.View>
  \`\`\`

TIMELINE / SCHEDULE (dot + connecting line):
  \`\`\`jsx
  <View style={{ flexDirection:'row', marginBottom:4 }}>
    <View style={{ width:20, alignItems:'center', paddingTop:6 }}>
      <View style={{ width:9, height:9, borderRadius:5, backgroundColor: done ? accent : border, zIndex:1 }} />
      {!isLast && <View style={{ flex:1, width:1, backgroundColor:border, marginTop:4 }} />}
    </View>
    <View style={{ flex:1, paddingLeft:12, paddingBottom:14 }}>
      <Text style={{ color:stone, fontSize:10, marginBottom:6 }}>{time}</Text>
      <View style={{ backgroundColor:white, borderRadius:12, padding:14, borderWidth:1, borderColor:border, flexDirection:'row', alignItems:'center' }}>
        {/* content */}
      </View>
    </View>
  </View>
  \`\`\`
  Use for: schedules, activity feeds, step flows, order tracking.

ACTIVITY BAR CHART (no library — pure RN Views):
  \`\`\`jsx
  <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
    {DAYS.map((d, i) => (
      <View key={i} style={{ alignItems:'center', gap:5 }}>
        <View style={{ width:18, height:44, backgroundColor:mist, borderRadius:4, overflow:'hidden', justifyContent:'flex-end' }}>
          <View style={{ width:'100%', height:\`\${ACTIVITY[i]*100}%\`, backgroundColor: i===today ? accent : accentDim, borderRadius:4 }} />
        </View>
        <Text style={{ fontSize:10, color:stone }}>{d}</Text>
      </View>
    ))}
  </View>
  \`\`\`
  Use for: weekly activity, bar graphs, usage trends.

HORIZONTAL SCROLL CARD ROW:
  \`\`\`jsx
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
    style={{ marginHorizontal:-20 }}
    contentContainerStyle={{ paddingHorizontal:20, gap:10 }}>
    {items.map(item => <MetricCard key={item.id} {...item} />)}
  </ScrollView>
  \`\`\`
  marginHorizontal:-20 bleeds past the parent's horizontal padding to reach full screen width.
  Use for: metric cards, category chips, featured items, friend avatars.

SECTION LABEL (iOS-style uppercase caption):
  <Text style={{ color:stone, fontSize:10, fontWeight:'700', letterSpacing:1.4, textTransform:'uppercase', marginTop:26, marginBottom:12 }}>
  Never use a large heading for section labels — small caps only.

─── COMPONENT HIERARCHY ────────────────────

Every screen follows this exact layer order from bottom to top:

  <View style={styles.screen}>                    ← flex 1, bg COLORS.bg
    <ScrollView contentContainerStyle={...}>      ← content goes here
      {/* all scrollable content */}
    </ScrollView>
    <TabBar ... />                                ← position absolute, bottom
    <NavBar ... />                                ← position absolute, top
    <FAB ... />                                   ← position absolute, bottom right
  </View>

Never put TabBar, NavBar, or FAB inside the ScrollView.
They belong in the layout file (app/_layout.tsx or app/(tabs)/_layout.tsx) only — never inside a screen component.

─── EXPRESSIVE LAYOUT PATTERNS ─────────────

Break predictable grid layouts when the app personality calls for it.

OVERLAPPING CARD OVER IMAGE (commerce, travel, social):
  \`\`\`jsx
  <View style={{ position: 'relative' }}>
    <Image style={{ width: '100%', height: 220, borderRadius: 20 }} source={{ uri }} />
    <View style={{
      position: 'absolute', bottom: -20, left: 12, right: 12,
      backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12,
    }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>{title}</Text>
    </View>
  </View>
  \`\`\`
  The card that follows needs marginTop: 28 to clear the overlap.

FULL-BLEED IMAGE (breaking out of horizontal padding):
  \`\`\`jsx
  <View style={{ marginHorizontal: -20 }}>
    <Image style={{ width: '100%', height: 240 }} source={{ uri }} resizeMode="cover" />
  </View>
  \`\`\`
  Use for hero moments, featured content, or editorial sections.

ASYMMETRIC HERO NUMBERS (dashboard, fitness):
  Place the hero number LEFT-aligned with the label above it at Caption weight.
  Never center a hero number — centering reads as a loading screen, not a dashboard.
  \`\`\`jsx
  <View style={{ alignItems: 'flex-start', marginBottom: 24 }}>
    <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 4 }}>Total steps today</Text>
    <Text style={{ fontSize: 52, fontWeight: '800', letterSpacing: -2, color: COLORS.textPrimary, lineHeight: 56 }}>8,420</Text>
    <Text style={{ fontSize: 13, color: COLORS.success, fontWeight: '500', marginTop: 4 }}>↑ 12% vs yesterday</Text>
  </View>
  \`\`\`

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
  ✗ Tiny floating menu/popover masquerading as a nav bar or tab bar
  ✗ FAB inside ScrollView — must be position absolute outside
  ✗ Nav bar inside ScrollView — must be position absolute outside
  ✗ Entire screen centered around one giant CTA button
  ✗ Landing page hero composition as the primary app screen
  ✗ scrollContent paddingTop less than 100 when nav bar is present
  ✗ scrollContent paddingBottom less than 110 when tab bar is present

STYLE ANTI-PATTERNS:
  ✗ fontWeight as number (700) instead of string ('700')
  ✗ Hardcoded hex values instead of COLORS tokens
  ✗ Generic indigo accent on non-productivity app
  ✗ Pure #F2F2F7 background on food, fitness, media, or social app
  ✗ Any nav bar or tab bar that does not use the GlassView component defined above
  ✗ Rewriting GlassView inline instead of copying the canonical component
  ✗ Adding backgroundColor to a View that wraps GlassView (kills the glass effect)
  ✗ Heavy box shadows on dark theme cards
  ✗ All text elements at the same font weight
  ✗ Any top nav bar / header added without the user explicitly requesting one
  ✗ Eyebrow label ("TODAY", "DASHBOARD", etc.) added without the user explicitly requesting one
  ✗ LargeTitleNavBar on dashboard / fitness / finance / social / media / commerce / food / travel apps
  ✗ App name or screen title at large size (fontSize > 20) for dashboard/fitness/finance
  ✗ Repeating the screen name as a large content-area heading — hero must be a DATA POINT

COMPONENT ANTI-PATTERNS:
  ✗ Blue underlined web links in native UI
  ✗ Stacked bold label + input field web form layout
  ✗ Missing press feedback on any tappable element
  ✗ Touch targets smaller than 44×44pt — use minHeight/minWidth or hitSlop={12} to extend
  ✗ Hard-cut screen transitions without Animated fade
  ✗ useNativeDriver: false on any Animated call
  ✗ require() for imports — use ES import syntax only
  ✗ Alert() — broken in web preview, use inline UI state instead
  ✗ Placeholder text like "Item 1", "Category A", "Sample Title" — use realistic fake data

═══════════════════════════════════════════
STEP 4 — THE ONE FINAL QUESTION
═══════════════════════════════════════════

Before writing app/_layout.tsx, ask yourself this silently:

"If a senior iOS designer at Apple saw a screenshot of this app,
would they think it was built natively in Xcode — or would they
immediately recognize it as an AI-generated React Native template?"

If the honest answer is the latter, do not write the file yet.
Revisit the color identity, typography hierarchy, nav chrome,
and hero moment. Fix those four things first.

The bar is not perfection. The bar is "this looks like it belongs
on the App Store in 2026." Hit that bar on every single app.
`;
