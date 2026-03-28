/**
 * Builds the file context block injected into the system prompt.
 *
 * Strategy:
 * - Q&A phase (no files written yet)  → no file context at all
 * - Initial build (plan just approved) → all files
 * - Follow-up edit                     → always-include files + keyword-matched files
 *                                        + recently written files
 */

type ProjectFile = { path: string; content: string };
type Message = {
  role: string;
  parts?: Array<{ type: string; text?: string; toolName?: string; input?: unknown }>;
};

// ── Always send these regardless of edit ─────────────────────────────────────
const ALWAYS_INCLUDE_PATTERNS = [
  /^app\.(jsx?|tsx?)$/i,
  /^colors?\.(js|ts)$/i,
  /^constants?\.(js|ts)$/i,
  /^theme\.(js|ts)$/i,
  /^styles?\.(js|ts)$/i,
];

// ── Keyword → filename fragment mapping ──────────────────────────────────────
const KEYWORD_MAP: Array<{ words: string[]; fragments: string[] }> = [
  { words: ['nav', 'navbar', 'navigation', 'header', 'back'], fragments: ['nav', 'header'] },
  { words: ['tab', 'tabbar', 'tab bar', 'bottom bar'], fragments: ['tab', 'bottom'] },
  { words: ['button', 'btn', 'press', 'touch'], fragments: ['button', 'btn'] },
  { words: ['color', 'colour', 'theme', 'palette', 'accent', 'background', 'dark', 'light'], fragments: ['color', 'theme', 'constant', 'style'] },
  { words: ['home', 'homescreen', 'main screen', 'dashboard'], fragments: ['home', 'dashboard'] },
  { words: ['profile', 'account', 'user', 'avatar'], fragments: ['profile', 'account', 'user'] },
  { words: ['card', 'list', 'item', 'row', 'cell'], fragments: ['card', 'list', 'item'] },
  { words: ['modal', 'sheet', 'popup', 'dialog', 'overlay'], fragments: ['modal', 'sheet'] },
  { words: ['form', 'input', 'field', 'text field', 'search'], fragments: ['form', 'input', 'search'] },
  { words: ['chart', 'graph', 'stat', 'analytics', 'metric'], fragments: ['chart', 'stat', 'metric', 'analytics'] },
  { words: ['settings', 'preferences', 'config'], fragments: ['settings', 'config', 'pref'] },
  { words: ['animation', 'animated', 'transition', 'motion'], fragments: ['anim'] },
];

function normalise(path: string): string {
  return path.split('/').pop()?.toLowerCase() ?? path.toLowerCase();
}

function isAlwaysInclude(path: string): boolean {
  const name = normalise(path);
  return ALWAYS_INCLUDE_PATTERNS.some((re) => re.test(name));
}

function selectByKeywords(files: ProjectFile[], userMessage: string): ProjectFile[] {
  const msg = userMessage.toLowerCase();
  const matchedFragments = new Set<string>();

  for (const { words, fragments } of KEYWORD_MAP) {
    if (words.some((w) => msg.includes(w))) {
      fragments.forEach((f) => matchedFragments.add(f));
    }
  }

  if (matchedFragments.size === 0) return [];

  return files.filter((f) => {
    const name = normalise(f.path);
    return [...matchedFragments].some((frag) => name.includes(frag));
  });
}

function recentlyWrittenFiles(files: ProjectFile[], messages: Message[]): ProjectFile[] {
  // Collect paths from the last 3 writeFile / fixError tool calls
  const recentPaths = new Set<string>();
  let count = 0;

  for (let i = messages.length - 1; i >= 0 && count < 3; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant') continue;
    for (const part of msg.parts ?? []) {
      if (
        (part.toolName === 'writeFile' || part.toolName === 'fixError') &&
        part.input
      ) {
        const input = part.input as { path?: string; filePath?: string };
        const p = (input.path ?? input.filePath ?? '').replace(/^\/+/, '');
        if (p) { recentPaths.add(p); count++; }
      }
    }
  }

  return files.filter((f) => recentPaths.has(f.path));
}

function formatFile(f: ProjectFile): string {
  const content =
    f.content.length > 12000 ? f.content.slice(0, 12000) + '\n... (truncated)' : f.content;
  return `--- ${f.path} (${content.split('\n').length} lines) ---\n${content}`;
}

function isExpoRouteFile(path: string): boolean {
  return /^app\/.+\.(jsx?|tsx?)$/i.test(path) && !/_layout\.(jsx?|tsx?)$/i.test(path) && !/\+api\.(jsx?|tsx?)$/i.test(path);
}

function buildExpoRouterWarnings(projectFiles: ProjectFile[]): string[] {
  const warnings: string[] = [];
  const paths = projectFiles.map((file) => file.path);
  const tabLayouts = paths.filter((path) => /^app\/\([^/]+\)\/_layout\.(jsx?|tsx?)$/i.test(path));

  for (const layoutPath of tabLayouts) {
    const groupDir = layoutPath.replace(/_layout\.(jsx?|tsx?)$/i, '');
    const groupName = groupDir.split('/')[1] ?? '(group)';
    const groupScreens = paths.filter((path) => path.startsWith(groupDir) && isExpoRouteFile(path));
    if (groupScreens.length > 0) continue;

    const topLevelRoutes = paths.filter((path) => /^app\/[^/(][^/]*\.(jsx?|tsx?)$/i.test(path) && isExpoRouteFile(path));
    if (topLevelRoutes.length > 0) {
      warnings.push(
        `Expo Router structure issue: ${layoutPath} exists, but its tab screens are outside ${groupDir}. Move routes like ${topLevelRoutes.slice(0, 3).join(', ')} into ${groupDir} so the tab layout can render them.`,
      );
    } else {
      warnings.push(
        `Expo Router structure issue: ${layoutPath} exists, but there are no screen files inside ${groupDir}. A tab layout without child routes will render empty output.`,
      );
    }

    if (!paths.some((path) => path === `${groupDir}index.tsx` || path === `${groupDir}index.jsx` || path === 'app/index.tsx' || path === 'app/index.jsx')) {
      warnings.push(
        `Expo Router structure issue: there is no default index route for ${groupName}. Add ${groupDir}index.tsx or a root redirect so the preview has a clear landing route.`,
      );
    }
  }

  return warnings;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildFileContext(
  projectFiles: ProjectFile[] | null | undefined,
  messages: Message[],
  phase: 'interactive' | 'initial-build' | 'edit',
): string {
  // Q&A phase — model is just asking questions, no files needed
  if (phase === 'interactive') return '';

  if (!projectFiles || projectFiles.length === 0) return '\n\nNo files in the project yet.';

  const routerWarnings = buildExpoRouterWarnings(projectFiles);
  const warningBlock = routerWarnings.length > 0
    ? `\n\nProject structure warnings:\n${routerWarnings.map((warning) => `- ${warning}`).join('\n')}`
    : '';

  // Initial build — model needs full picture to write all files correctly
  if (phase === 'initial-build') {
    return `${warningBlock}\n\nCurrent project files:\n${projectFiles.map(formatFile).join('\n\n')}`;
  }

  // Follow-up edit — send only relevant files
  const lastUserText = [...messages]
    .reverse()
    .find((m) => m.role === 'user')
    ?.parts?.find((p) => p.type === 'text')?.text ?? '';

  const relevant = new Map<string, ProjectFile>();

  // 1. Always-include files
  projectFiles.filter((f) => isAlwaysInclude(f.path)).forEach((f) => relevant.set(f.path, f));

  // 2. Keyword-matched files
  selectByKeywords(projectFiles, lastUserText).forEach((f) => relevant.set(f.path, f));

  // 3. Recently written files
  recentlyWrittenFiles(projectFiles, messages).forEach((f) => relevant.set(f.path, f));

  // Fallback: if nothing matched beyond always-include, send all (small projects)
  const selected = projectFiles.length <= 4
    ? projectFiles
    : [...relevant.values()];

  const omittedCount = projectFiles.length - selected.length;
  const omittedNote = omittedCount > 0
    ? `\n(${omittedCount} unrelated file${omittedCount > 1 ? 's' : ''} omitted to save context)`
    : '';

  return `${warningBlock}\n\nRelevant project files:${omittedNote}\n${selected.map(formatFile).join('\n\n')}`;
}
