import { describe, it, expect, beforeAll } from 'vitest';
import { rewriteSource, normalizePath, toJsPath, makeErrorModule } from '../../lib/transformer-helpers';

// Pure helper tests that don't require a browser Babel environment.
// These cover the rewriteSource logic and utility functions exported from transformer.ts.

describe('rewriteSource – passthrough specifiers', () => {
  it('passes through "react"', () => {
    expect(rewriteSource('react')).toBe('react');
  });

  it('passes through "react-dom"', () => {
    expect(rewriteSource('react-dom')).toBe('react-dom');
  });

  it('passes through "react-native"', () => {
    expect(rewriteSource('react-native')).toBe('react-native');
  });

  it('passes through "react-native/Libraries/..."', () => {
    expect(rewriteSource('react-native/Libraries/Foo')).toBe('react-native/Libraries/Foo');
  });
});

describe('rewriteSource – relative imports', () => {
  it('adds .js to extension-less relative import', () => {
    expect(rewriteSource('./Foo')).toBe('./Foo.js');
  });

  it('replaces .jsx with .js', () => {
    expect(rewriteSource('./Foo.jsx')).toBe('./Foo.js');
  });

  it('replaces .tsx with .js', () => {
    expect(rewriteSource('./Foo.tsx')).toBe('./Foo.js');
  });

  it('replaces .ts with .js', () => {
    expect(rewriteSource('./Foo.ts')).toBe('./Foo.js');
  });

  it('keeps .js as-is', () => {
    expect(rewriteSource('./Foo.js')).toBe('./Foo.js');
  });

  it('handles parent-directory imports (../)', () => {
    expect(rewriteSource('../utils/helper')).toBe('../utils/helper.js');
  });
});

describe('rewriteSource – bare npm packages', () => {
  it('rewrites bare specifier to esm.sh', () => {
    expect(rewriteSource('lodash')).toBe('https://esm.sh/lodash');
  });

  it('rewrites scoped package to esm.sh', () => {
    expect(rewriteSource('@tanstack/react-query')).toBe('https://esm.sh/@tanstack/react-query');
  });
});

describe('normalizePath', () => {
  it('strips leading slash', () => {
    expect(normalizePath('/App.jsx')).toBe('App.jsx');
  });

  it('strips multiple leading slashes', () => {
    expect(normalizePath('///App.jsx')).toBe('App.jsx');
  });

  it('does nothing when no leading slash', () => {
    expect(normalizePath('App.jsx')).toBe('App.jsx');
  });
});

describe('toJsPath', () => {
  it('converts .jsx to .js', () => {
    expect(toJsPath('App.jsx')).toBe('App.js');
  });

  it('converts .tsx to .js', () => {
    expect(toJsPath('Home.tsx')).toBe('Home.js');
  });

  it('converts .ts to .js', () => {
    expect(toJsPath('utils.ts')).toBe('utils.js');
  });

  it('keeps .js as-is', () => {
    expect(toJsPath('app.js')).toBe('app.js');
  });

  it('strips leading slash before converting', () => {
    expect(toJsPath('/App.jsx')).toBe('App.js');
  });
});

describe('makeErrorModule', () => {
  it('returns a string containing the error message', () => {
    const mod = makeErrorModule('SyntaxError: Unexpected token');
    expect(mod).toContain('SyntaxError: Unexpected token');
  });

  it('output is valid JS module (contains export default)', () => {
    const mod = makeErrorModule('some error');
    expect(mod).toContain('export default');
  });

  it('escapes backticks to avoid template literal breakage', () => {
    const mod = makeErrorModule('error with `backtick`');
    // The backtick in the error message content must be escaped as \`
    expect(mod).toContain('error with \\`backtick\\`');
  });

  it('escapes backslashes', () => {
    const mod = makeErrorModule('C:\\path\\to\\file');
    expect(mod).toContain('C:\\\\path\\\\to\\\\file');
  });

  it('output contains React Native components (ScrollView, Text)', () => {
    const mod = makeErrorModule('err');
    expect(mod).toContain('ScrollView');
    expect(mod).toContain('Text');
  });
});
