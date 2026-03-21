export function detectPinnedTabBarIssue(code: string): string | null {
  if (!code.includes('ScrollView') || !code.includes('tabBar')) return null;

  const scrollViewStart = code.indexOf('<ScrollView');
  const scrollViewEnd = code.indexOf('</ScrollView>');
  const tabBarIndex = code.indexOf('styles.tabBar');

  if (scrollViewStart === -1 || scrollViewEnd === -1 || tabBarIndex === -1) return null;

  const tabBarInsideScroll = tabBarIndex > scrollViewStart && tabBarIndex < scrollViewEnd;
  if (!tabBarInsideScroll) return null;

  return 'Bottom tab bar is rendered inside ScrollView content instead of being pinned at the screen root.';
}

const FAB_STYLE_PATTERNS = [
  'styles.fab',
  'styles.floatingButton',
  'styles.addButton',
  'styles.actionButton',
  'styles.createButton',
  'styles.fabButton',
];

const FAB_TEXT_PATTERNS = [
  '>+</Text>',
  'Add</Text>',
  'New</Text>',
  'Create</Text>',
];

function findScrollViewBounds(code: string): Array<{ start: number; end: number }> {
  const bounds: Array<{ start: number; end: number }> = [];
  let searchFrom = 0;

  while (true) {
    const start = code.indexOf('<ScrollView', searchFrom);
    if (start === -1) break;
    const end = code.indexOf('</ScrollView>', start);
    if (end === -1) break;
    bounds.push({ start, end });
    searchFrom = end + '</ScrollView>'.length;
  }

  return bounds;
}

function findFabAnchorIndex(code: string): number {
  const styleIndex = FAB_STYLE_PATTERNS.map((pattern) => code.indexOf(pattern)).find((index) => index !== -1);
  if (styleIndex !== undefined) return styleIndex;

  const textIndex = FAB_TEXT_PATTERNS.map((pattern) => code.indexOf(pattern)).find((index) => index !== -1);
  return textIndex ?? -1;
}

function hasAbsoluteFabStyles(code: string): boolean {
  const styleBlockPattern =
    /(fab|floatingButton|addButton|actionButton|createButton|fabButton)\s*:\s*\{[\s\S]{0,240}?position\s*:\s*['"]absolute['"][\s\S]{0,240}?bottom\s*:\s*\d+[\s\S]{0,240}?(right\s*:\s*\d+|left\s*:\s*\d+)/i;

  return styleBlockPattern.test(code);
}

function looksLikeFloatingActionButton(code: string): boolean {
  return FAB_STYLE_PATTERNS.some((pattern) => code.includes(pattern)) || FAB_TEXT_PATTERNS.some((pattern) => code.includes(pattern));
}

export function detectFloatingActionButtonIssue(code: string): string | null {
  if (!code.includes('ScrollView') || !looksLikeFloatingActionButton(code)) return null;

  const scrollViews = findScrollViewBounds(code);
  const fabIndex = findFabAnchorIndex(code);
  const fabInsideScroll = scrollViews.some(({ start, end }) => fabIndex > start && fabIndex < end);

  if (fabInsideScroll) {
    return 'Floating add button is rendered inside ScrollView content instead of being pinned as an overlay sibling.';
  }

  if (!hasAbsoluteFabStyles(code)) {
    return 'Floating add button exists but is not anchored with absolute bottom/right positioning, so it may scroll with content.';
  }

  return null;
}

export interface LayoutGuardFile {
  path: string;
  content: string;
}

export interface LayoutGuardIssue {
  path: string;
  message: string;
}

const SCREEN_FILE_PATTERN = /\.(jsx|tsx|js|ts)$/i;

export function findPinnedTabBarIssues(files: LayoutGuardFile[]): LayoutGuardIssue[] {
  return files
    .filter((file) => SCREEN_FILE_PATTERN.test(file.path))
    .map((file) => {
      const message = detectPinnedTabBarIssue(file.content);
      if (!message) return null;
      return { path: file.path, message };
    })
    .filter((issue): issue is LayoutGuardIssue => issue !== null);
}

export function findFloatingActionButtonIssues(files: LayoutGuardFile[]): LayoutGuardIssue[] {
  return files
    .filter((file) => SCREEN_FILE_PATTERN.test(file.path))
    .map((file) => {
      const message = detectFloatingActionButtonIssue(file.content);
      if (!message) return null;
      return { path: file.path, message };
    })
    .filter((issue): issue is LayoutGuardIssue => issue !== null);
}
