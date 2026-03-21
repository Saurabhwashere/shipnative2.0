// Pure, browser-independent helpers extracted from transformer.ts.
// Keeping these separate makes them testable in a Node/jsdom environment.

const PASSTHROUGH_PREFIXES = ['react', 'react-dom', 'react-native'];

export function isPassthrough(source: string): boolean {
  return PASSTHROUGH_PREFIXES.some(
    (p) => source === p || source.startsWith(p + '/'),
  );
}

export function rewriteSource(source: string): string {
  if (isPassthrough(source)) return source;

  if (source.startsWith('./') || source.startsWith('../')) {
    const withoutSourceExt = source.replace(/\.(tsx?|jsx)$/, '');
    if (withoutSourceExt.endsWith('.js')) return withoutSourceExt;
    return withoutSourceExt + '.js';
  }

  return `https://esm.sh/${source}`;
}

/** Normalizes a VFS path (strips leading slash) */
export function normalizePath(path: string): string {
  return path.replace(/^\/+/, '');
}

/** Converts a source path to its .js output path */
export function toJsPath(path: string): string {
  return normalizePath(path).replace(/\.(tsx?|jsx)$/, '.js');
}

/** Generates a JS module that renders a compile error inside the app */
export function makeErrorModule(message: string): string {
  const escaped = message
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  return `import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function ErrorApp() {
  return React.createElement(ScrollView, {
    style: { flex: 1, backgroundColor: '#1a0a0a', padding: 16, paddingTop: 20 },
    contentContainerStyle: { flexGrow: 1 },
  },
    React.createElement(View, {
      style: {
        backgroundColor: '#2d1515',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#5c2323',
      }
    },
      React.createElement(Text, {
        style: { color: '#f06a6a', fontSize: 12, fontWeight: '700', marginBottom: 6 }
      }, '⚠ Compile Error'),
      React.createElement(Text, {
        style: { color: '#e4c4c4', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 }
      }, \`${escaped}\`)
    )
  );
}
`;
}
