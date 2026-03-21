export const NATIVE_UI_SKILL_PROMPT = `NATIVE UI SKILL — APPLY BEFORE WRITING FILES

Platform baseline:
- Default to iOS-first design language with safe React Native Web fallbacks.
- Use Apple-style spacing, typography, grouped surfaces, and sheet-like flows.
- Only lean Android-first if the user explicitly asks for Material styling.

Theme selection:
- Productivity, notes, tasks, shopping, lifestyle: default to LIGHT.
- Fitness, finance dashboards, media, nightlife: DARK is acceptable if it improves hierarchy.
- Never default to purple-on-dark just because it looks "modern". Choose accent colors that fit the app concept.

Native screen archetypes:
- Task/productivity: large title + summary row + grouped list sections + inline add affordance.
- Commerce: featured feed + chips/filters + product cards + account/settings tab.
- Dashboard: high-contrast metrics + compact cards + segmented filters + activity feed.
- Settings/forms: grouped rows + inline labels + modal sheet editing, not long web forms.

Empty-state rules:
- Empty states live inside the content flow, not as a full-screen marketing hero.
- Use compact iconography and concise copy.
- For list-based apps, keep the header, summary, and toolbar visible even when the list is empty.
- The primary action should support the screen, not become the entire layout.

Layout rules:
- Keep primary content top-anchored.
- Prefer grouped sections, inset cards, and list rhythm over giant isolated panels.
- Use a single dominant CTA per screen and keep it near the content it affects.
- Avoid oversized illustrations unless the screen is onboarding.
- If a screen uses bottom tabs, render them as a sibling of the ScrollView at the screen root.
- Bottom tabs must remain visible without scrolling. Never place the tab bar inside ScrollView content.
- When bottom tabs are present, increase scroll content bottom padding so the last row clears the fixed tab bar.
- If a screen uses a floating add/create action, render it as an overlay sibling of the ScrollView at the screen root.
- Floating add/create actions must stay visible without scrolling and use absolute bottom/right positioning.
- When a floating action button is present, increase scroll content bottom padding so the last card clears the button and home indicator.

Native anti-patterns — NEVER generate these unless explicitly requested:
- Giant centered empty state with a huge button as the only real content.
- Landing-page composition inside a phone screen.
- Blue web links and labels stacked above every input.
- Huge emoji art blocks used as the main visual hierarchy.
- Random decorative gradients that do not support the concept.
- Tab bars rendered inside scroll content or only reachable at the end of the list.
- Floating add/create buttons rendered inside scroll content or only reachable at the end of the list.

Before proposePlan or writeFile, silently lock these decisions:
- category
- chosen template
- theme
- navigation pattern

Surface those choices in the plan so the user can approve them.`;
