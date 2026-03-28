import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT } from '../../lib/system-prompt';

describe('system prompt', () => {
  it('includes the app-builder workflow and runtime constraints', () => {
    expect(SYSTEM_PROMPT).toContain('MANDATORY WORKFLOW');
    expect(SYSTEM_PROMPT).toContain('FORBIDDEN TypeScript syntax');
  });

  it('includes the starter template library block', () => {
    expect(SYSTEM_PROMPT).toContain('tasks-light-tabs');
    expect(SYSTEM_PROMPT).toContain('form-sheet-settings');
    expect(SYSTEM_PROMPT).toContain('chosenTemplate');
  });

  it('uses current navigation guidance instead of forcing one chrome style', () => {
    expect(SYSTEM_PROMPT).toContain('Pick nav bar style from the information architecture, not from habit');
    expect(SYSTEM_PROMPT).toContain('Only use bottom tabs when the app has 3-5 peer destinations');
    expect(SYSTEM_PROMPT).toContain('Never place it inside ScrollView content');
    expect(SYSTEM_PROMPT).toContain('Measure the actual rendered bar width with onLayout');
  });

  it('treats add-navbar requests as navigation architecture work', () => {
    expect(SYSTEM_PROMPT).toContain('Treat these as MAJOR feature / information architecture changes');
    expect(SYSTEM_PROMPT).toContain('Never fake navigation by dropping a small floating widget or modal-like menu');
    expect(SYSTEM_PROMPT).toContain('For 2 destinations, prefer stack + segmented switcher');
  });

  it('requires finger-sized controls and pinned floating actions', () => {
    expect(SYSTEM_PROMPT).toContain('minimum 44×44 touch targets');
    expect(SYSTEM_PROMPT).toContain('Floating add buttons MUST be visible without scrolling');
    expect(SYSTEM_PROMPT).toContain('Never place the floating action button inside ScrollView content');
  });

  it('requires safe-area handling for top chrome and overlays', () => {
    expect(SYSTEM_PROMPT).toContain("'react-native-safe-area-context' — SafeAreaProvider, SafeAreaView, useSafeAreaInsets");
    expect(SYSTEM_PROMPT).toContain('Drawers, sidebars, slide-over menus, sheets, modals, floating composers, and any custom overlay chrome must read insets with useSafeAreaInsets()');
    expect(SYSTEM_PROMPT).toContain('Never let custom sidebar or drawer content start at y=0 under the notch');
  });
});
