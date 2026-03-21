import { rewriteSource } from './transformer-helpers';
export { normalizePath, toJsPath, makeErrorModule } from './transformer-helpers';

declare global {
  interface Window {
    Babel: any;
  }
}

let babelLoadPromise: Promise<void> | null = null;

export async function loadBabel(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.Babel) return;
  if (babelLoadPromise) return babelLoadPromise;

  babelLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@babel/standalone@7.26.10/babel.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Babel from CDN'));
    document.head.appendChild(script);
  });

  return babelLoadPromise;
}

/** Babel plugin that rewrites import/export sources */
function makeImportRewriterPlugin() {
  return function importRewriter(babel: any) {
    return {
      visitor: {
        'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path: any) {
          if (path.node.source) {
            path.node.source.value = rewriteSource(path.node.source.value);
          }
        },
        CallExpression(path: any) {
          // Dynamic import()
          if (
            path.node.callee.type === 'Import' &&
            path.node.arguments[0]?.type === 'StringLiteral'
          ) {
            path.node.arguments[0].value = rewriteSource(path.node.arguments[0].value);
          }
        },
      },
    };
  };
}

export async function transformCode(code: string, filename: string): Promise<string> {
  await loadBabel();

  const result = window.Babel.transform(code, {
    filename,
    presets: [
      ['react', { runtime: 'classic' }],
      ['typescript', { allExtensions: true, isTSX: true }],
    ],
    plugins: [makeImportRewriterPlugin()],
    sourceType: 'module',
    retainLines: false,
  });

  if (!result?.code) {
    throw new Error('Babel returned empty output');
  }

  return result.code as string;
}
