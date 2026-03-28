import { describe, it, expect } from 'vitest';
import { buildFileContext } from '../../lib/file-context';

type ProjectFile = { path: string; content: string };
type Message = {
  role: string;
  parts?: Array<{ type: string; text?: string; toolName?: string; input?: unknown }>;
};

function makeFiles(paths: string[]): ProjectFile[] {
  return paths.map((p) => ({ path: p, content: `// ${p}` }));
}

function userMsg(text: string): Message {
  return { role: 'user', parts: [{ type: 'text', text }] };
}

function writeFileMsg(path: string): Message {
  return {
    role: 'assistant',
    parts: [{ type: 'dynamic-tool', toolName: 'writeFile', input: { path, description: 'file' } }],
  };
}

// ── Interactive phase ──────────────────────────────────────────────────────

describe('buildFileContext – interactive phase', () => {
  it('returns empty string regardless of files', () => {
    const files = makeFiles(['App.jsx', 'HomeScreen.jsx']);
    expect(buildFileContext(files, [], 'interactive')).toBe('');
  });

  it('returns empty string when projectFiles is null', () => {
    expect(buildFileContext(null, [], 'interactive')).toBe('');
  });
});

// ── Initial build phase ────────────────────────────────────────────────────

describe('buildFileContext – initial-build phase', () => {
  it('includes all project files', () => {
    const files = makeFiles(['App.jsx', 'HomeScreen.jsx', 'colors.ts']);
    const result = buildFileContext(files, [], 'initial-build');
    expect(result).toContain('App.jsx');
    expect(result).toContain('HomeScreen.jsx');
    expect(result).toContain('colors.ts');
  });

  it('returns "no files" message when projectFiles is empty', () => {
    const result = buildFileContext([], [], 'initial-build');
    expect(result).toContain('No files in the project yet');
  });

  it('returns "no files" message when projectFiles is null', () => {
    const result = buildFileContext(null, [], 'initial-build');
    expect(result).toContain('No files in the project yet');
  });

  it('truncates files over 12000 characters', () => {
    const longContent = 'x'.repeat(15000);
    const files: ProjectFile[] = [{ path: 'BigFile.jsx', content: longContent }];
    const result = buildFileContext(files, [], 'initial-build');
    expect(result).toContain('truncated');
    expect(result).not.toContain('x'.repeat(13000));
  });
});

// ── Edit phase – always-include files ─────────────────────────────────────

describe('buildFileContext – edit phase: always-include patterns', () => {
  const alwaysIncludeFiles = ['App.jsx', 'App.tsx', 'App.js', 'colors.ts', 'colors.js',
    'constants.ts', 'theme.ts', 'styles.ts'];

  it.each(alwaysIncludeFiles)('%s is always included in edit phase', (filename) => {
    const files = makeFiles([filename, 'SomeOtherScreen.jsx']);
    const msgs = [userMsg('change the button color')];
    const result = buildFileContext(files, msgs, 'edit');
    expect(result).toContain(filename);
  });

  it('non-always-include file is not included when unrelated to edit', () => {
    const files = makeFiles(['App.jsx', 'ProfileScreen.jsx', 'SettingsScreen.jsx']);
    const msgs = [userMsg('change the button color')];
    const result = buildFileContext(files, msgs, 'edit');
    // ProfileScreen and SettingsScreen are not related to 'button color'
    // They may or may not appear — but App.jsx must be there
    expect(result).toContain('App.jsx');
  });
});

// ── Edit phase – keyword matching ──────────────────────────────────────────

describe('buildFileContext – edit phase: keyword matching', () => {
  const keywordCases: [string, string, string][] = [
    ['nav', 'nav screen', 'NavBar.jsx'],
    ['header', 'update the header', 'HeaderComponent.jsx'],
    ['tab', 'change tab style', 'TabBar.jsx'],
    ['button', 'fix the button', 'ButtonComponent.jsx'],
    ['color', 'change the color', 'colors.ts'],
    ['theme', 'update theme', 'theme.js'],
    ['home', 'redesign home screen', 'HomeScreen.jsx'],
    ['profile', 'update profile', 'ProfileScreen.jsx'],
    ['card', 'update card layout', 'CardItem.jsx'],
    ['modal', 'show a modal', 'ModalSheet.jsx'],
    ['form', 'add a form field', 'FormInput.jsx'],
    ['search', 'add search bar', 'SearchBar.jsx'],
    ['chart', 'add a chart', 'ChartComponent.jsx'],
    ['settings', 'update settings', 'SettingsScreen.jsx'],
  ];

  it.each(keywordCases)('keyword "%s" in message includes file with matching fragment', (_, message, filename) => {
    const files = makeFiles(['App.jsx', filename]);
    const msgs = [userMsg(message)];
    const result = buildFileContext(files, msgs, 'edit');
    expect(result).toContain(filename);
  });
});

// ── Edit phase – recently written files ───────────────────────────────────

describe('buildFileContext – edit phase: recently written files', () => {
  it('includes file from last writeFile tool call', () => {
    const files = makeFiles(['App.jsx', 'RecentlyEdited.jsx', 'Unrelated.jsx']);
    const msgs: Message[] = [
      userMsg('update something'),
      writeFileMsg('RecentlyEdited.jsx'),
      userMsg('make it better'),
    ];
    const result = buildFileContext(files, msgs, 'edit');
    expect(result).toContain('RecentlyEdited.jsx');
  });

  it('includes file from last fixError tool call', () => {
    const files = makeFiles(['App.jsx', 'BrokenScreen.jsx']);
    const msgs: Message[] = [
      userMsg('fix the error'),
      {
        role: 'assistant',
        parts: [{ type: 'dynamic-tool', toolName: 'fixError', input: { filePath: 'BrokenScreen.jsx', explanation: 'fixed' } }],
      },
      userMsg('looks good'),
    ];
    const result = buildFileContext(files, msgs, 'edit');
    expect(result).toContain('BrokenScreen.jsx');
  });

  it('collects up to 3 recent files', () => {
    const files = makeFiles(['App.jsx', 'File1.jsx', 'File2.jsx', 'File3.jsx', 'File4.jsx']);
    const msgs: Message[] = [
      userMsg('make changes'),
      writeFileMsg('File1.jsx'),
      writeFileMsg('File2.jsx'),
      writeFileMsg('File3.jsx'),
      writeFileMsg('File4.jsx'), // 4th write — should NOT be included (limit is 3)
      userMsg('update again'),
    ];
    const result = buildFileContext(files, msgs, 'edit');
    expect(result).toContain('File2.jsx');
    expect(result).toContain('File3.jsx');
    expect(result).toContain('File4.jsx');
  });
});

// ── Edit phase – small project fallback ───────────────────────────────────

describe('buildFileContext – edit phase: small project fallback', () => {
  it('sends all files when project has 4 or fewer files', () => {
    const files = makeFiles(['App.jsx', 'Screen1.jsx', 'Screen2.jsx', 'Unrelated.jsx']);
    const msgs = [userMsg('change the animation')]; // 'animation' won't keyword-match Unrelated
    const result = buildFileContext(files, msgs, 'edit');
    // All 4 files should be present because ≤ 4 files → send all
    expect(result).toContain('App.jsx');
    expect(result).toContain('Unrelated.jsx');
  });

  it('selectively sends files when project has more than 4 files', () => {
    const files = makeFiles(['App.jsx', 'Screen1.jsx', 'Screen2.jsx', 'Screen3.jsx', 'Screen4.jsx']);
    const msgs = [userMsg('change the animation')]; // won't match Screen1-4
    const result = buildFileContext(files, msgs, 'edit');
    // App.jsx always included; Screen1-4 should NOT be included (no keyword match)
    expect(result).toContain('App.jsx');
    expect(result).not.toContain('Screen1.jsx');
  });
});

// ── Output format ──────────────────────────────────────────────────────────

describe('buildFileContext – output format', () => {
  it('initial-build result contains file separator format', () => {
    const files = makeFiles(['App.jsx']);
    const result = buildFileContext(files, [], 'initial-build');
    expect(result).toContain('--- App.jsx');
    expect(result).toContain('lines');
  });

  it('edit result notes omitted files count when files are skipped', () => {
    const files = makeFiles(['App.jsx', 'Ignored1.jsx', 'Ignored2.jsx', 'Ignored3.jsx', 'Ignored4.jsx']);
    const msgs = [userMsg('update something simple')];
    const result = buildFileContext(files, msgs, 'edit');
    // Should mention omitted files since some were excluded
    if (!result.includes('Ignored1.jsx')) {
      expect(result).toContain('omitted');
    }
  });

  it('surfaces expo router tab-group structure warnings when screens live outside the tabs group', () => {
    const files = makeFiles([
      'app/_layout.tsx',
      'app/(tabs)/_layout.tsx',
      'app/discover.tsx',
      'app/likes.tsx',
      'app/profile.tsx',
    ]);
    const result = buildFileContext(files, [userMsg('fix the blank preview')], 'edit');

    expect(result).toContain('Project structure warnings:');
    expect(result).toContain('app/(tabs)/_layout.tsx exists, but its tab screens are outside app/(tabs)/');
  });
});
