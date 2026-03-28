export interface TemplateManifest {
  id: string;
  category: string;
  platformBaseline: 'ios-first';
  defaultTheme: 'light' | 'dark';
  navigationPattern: string;
  screenArchetypes: string[];
  starterFiles: string[];
  description: string;
  visualSignature: string;
  accentSuggestions: string;
}

export const TEMPLATE_LIBRARY: TemplateManifest[] = [
  {
    id: 'tasks-light-tabs',
    category: 'tasks',
    platformBaseline: 'ios-first',
    defaultTheme: 'light',
    navigationPattern: 'bottom tabs',
    screenArchetypes: ['large-title list', 'grouped sections', 'inline composer', 'detail sheet'],
    starterFiles: ['App.jsx', 'task-data.js'],
    description:
      'Light productivity baseline with a calm focus hero, grouped task sections, and modern floating tab chrome.',
    visualSignature: 'Warm neutral background with one strong focus card, grouped rows with secondary metadata, and a floating glass pill tab bar. The first viewport is immediately useful rather than decorative.',
    accentSuggestions: 'Slate blue #5856D6 for focus/GTD apps, coral #FF6B6B for habit trackers, sage green #52B788 for wellness tasks, amber #F59E0B for goal tracking',
  },
  {
    id: 'commerce-light-tabs',
    category: 'commerce',
    platformBaseline: 'ios-first',
    defaultTheme: 'light',
    navigationPattern: 'bottom tabs',
    screenArchetypes: ['featured feed', 'category chips', 'product cards', 'account/settings'],
    starterFiles: ['App.jsx', 'product-data.js'],
    description:
      'Light retail shell with editorial merchandising, searchable discovery, and premium bottom navigation.',
    visualSignature: 'Warm off-white backdrop, search-first header, editorial feature modules, and a curated product grid with softer corners. Category chips and floating tab chrome keep the layout feeling current instead of catalog-like.',
    accentSuggestions: 'Warm terracotta #C2673A for fashion/lifestyle, electric blue #3B82F6 for tech retail, emerald #10B981 for sustainable/organic, gold #F59E0B for luxury',
  },
  {
    id: 'dashboard-dark-cards',
    category: 'dashboard',
    platformBaseline: 'ios-first',
    defaultTheme: 'dark',
    navigationPattern: 'stack with segmented filters',
    screenArchetypes: ['hero metrics', 'stat cards', 'activity feed', 'detail drill-in'],
    starterFiles: ['App.jsx', 'metric-data.js'],
    description:
      'Dark data-rich layout for fitness, finance, or media apps where one hero metric leads and supporting modules follow.',
    visualSignature: 'True dark background with compact top chrome, one oversized hero number, asymmetrical supporting insight cards, and a cleaner activity timeline. The screen name stays small so the data does the visual work.',
    accentSuggestions: 'Mint green #34D399 for fitness/health dashboards, electric blue #3B82F6 for finance/analytics, coral #FF6B6B for activity/sports, gold #FBBF24 for performance metrics',
  },
  {
    id: 'form-sheet-settings',
    category: 'settings',
    platformBaseline: 'ios-first',
    defaultTheme: 'light',
    navigationPattern: 'stack + modal sheet',
    screenArchetypes: ['settings list', 'grouped form rows', 'confirmation sheet', 'account detail'],
    starterFiles: ['App.jsx', 'settings-data.js'],
    description:
      'Light settings/form baseline with grouped rows, profile context, and sheet-style editing flows instead of web forms.',
    visualSignature: 'System-grouped background, concise profile header, white grouped lists, and a light glass sheet with focused actions. The layout feels quiet and native rather than like a web settings form.',
    accentSuggestions: 'System blue #007AFF for utility settings, indigo #5856D6 for productivity apps, teal #0EA5E9 for communication apps, slate #64748B for neutral/system apps',
  },
];

export function formatTemplateLibraryForPrompt(): string {
  return TEMPLATE_LIBRARY.map((template) => {
    const archetypes = template.screenArchetypes.join(', ');
    const files = template.starterFiles.join(', ');

    return [
      `- ${template.id}`,
      `  category: ${template.category}`,
      `  defaultTheme: ${template.defaultTheme}`,
      `  navigation: ${template.navigationPattern}`,
      `  archetypes: ${archetypes}`,
      `  starterFiles: ${files}`,
      `  useWhen: ${template.description}`,
      `  visualSignature: ${template.visualSignature}`,
      `  accentSuggestions: ${template.accentSuggestions}`,
    ].join('\n');
  }).join('\n');
}
