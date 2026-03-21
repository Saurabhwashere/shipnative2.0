import { describe, expect, it } from 'vitest';
import { TEMPLATE_LIBRARY, formatTemplateLibraryForPrompt } from '../../lib/template-library';

describe('template library', () => {
  it('includes the expected native starter templates', () => {
    expect(TEMPLATE_LIBRARY.map((template) => template.id)).toEqual([
      'tasks-light-tabs',
      'commerce-light-tabs',
      'dashboard-dark-cards',
      'form-sheet-settings',
    ]);
  });

  it('formats template data for prompt injection', () => {
    const promptBlock = formatTemplateLibraryForPrompt();

    expect(promptBlock).toContain('tasks-light-tabs');
    expect(promptBlock).toContain('defaultTheme: light');
    expect(promptBlock).toContain('starterFiles: App.jsx');
  });
});
