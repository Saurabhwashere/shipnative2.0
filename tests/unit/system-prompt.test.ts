import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT } from '../../lib/system-prompt';

describe('system prompt', () => {
  it('includes the native ui skill instructions', () => {
    expect(SYSTEM_PROMPT).toContain('NATIVE UI SKILL');
    expect(SYSTEM_PROMPT).toContain('Native anti-patterns');
  });

  it('includes the starter template library block', () => {
    expect(SYSTEM_PROMPT).toContain('tasks-light-tabs');
    expect(SYSTEM_PROMPT).toContain('form-sheet-settings');
    expect(SYSTEM_PROMPT).toContain('chosenTemplate');
  });

  it('requires bottom tabs to stay visible', () => {
    expect(SYSTEM_PROMPT).toContain('Bottom tabs MUST be visible without scrolling');
    expect(SYSTEM_PROMPT).toContain('Never place the tab bar inside ScrollView content');
  });

  it('requires floating add buttons to stay pinned', () => {
    expect(SYSTEM_PROMPT).toContain('Floating add buttons MUST be visible without scrolling');
    expect(SYSTEM_PROMPT).toContain('Never place the floating action button inside ScrollView content');
  });
});
