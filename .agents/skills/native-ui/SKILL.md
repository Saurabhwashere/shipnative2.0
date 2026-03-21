---
name: native-ui
description: Native-first mobile app generation guidance for ShipNative. Use when building or revising generated mobile UI, choosing templates, or improving app screens so they look modern and native.
---

# Native UI Skill

Use this skill for ShipNative prompt work, starter templates, and generated screen quality.

## Workflow

1. Classify the request into one of these categories: `tasks`, `commerce`, `dashboard`, `settings`.
2. Pick the closest starter template from `assets/templates/`.
3. Keep the information architecture from the template unless the user explicitly asks for something else.
4. Apply the category theme rule:
   - `tasks`, `commerce`, `settings` => light by default
   - `dashboard` => dark by default
5. Preserve native composition:
   - header or large title
   - top-anchored content
   - grouped surfaces
   - restrained empty states
   - bottom tabs or stack/sheet patterns
6. If the app uses bottom tabs:
   - render the tab bar outside the `ScrollView`
   - keep it visible at all times
   - pad the scroll content so rows do not disappear behind it
7. If the app uses a floating add/create button:
   - render it outside the `ScrollView`
   - anchor it with absolute bottom/right positioning
   - pad the scroll content so the last row clears the button and home indicator

## Design Heuristics

- Task apps should look like a real organizer, not an onboarding screen.
- Forms should use grouped rows and sheet-like editing flows, not stacked web forms.
- Empty states should appear below persistent chrome and context, not replace the whole screen.
- Default to compact icon containers over giant emoji illustrations.
- Accent colors should fit the concept instead of defaulting to indigo or purple.
- Tabs should behave like native tabs, not like another list item at the bottom of the page.
- Floating add buttons should behave like overlays, not like the last item in a list.

## Templates

- `assets/templates/tasks-light-tabs/`
- `assets/templates/commerce-light-tabs/`
- `assets/templates/dashboard-dark-cards/`
- `assets/templates/form-sheet-settings/`

Load only the relevant template files you need.
