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
    starterFiles: ['App.jsx', 'components/task-section.jsx'],
    description:
      'Light productivity baseline with grouped task sections, restrained empty states, and a native tab bar.',
    visualSignature: 'Clean editorial white surfaces. Large display title at 34px 800 weight. Grouped list rows with hairline separators. Compact summary card below the title. Animated pill tab bar with glass blur. Circular action buttons in nav bar. Empty states are small and embedded — never full screen.',
    accentSuggestions: 'Slate blue #5856D6 for focus/GTD apps, coral #FF6B6B for habit trackers, sage green #52B788 for wellness tasks, amber #F59E0B for goal tracking',
  },
  {
    id: 'commerce-light-tabs',
    category: 'commerce',
    platformBaseline: 'ios-first',
    defaultTheme: 'light',
    navigationPattern: 'bottom tabs',
    screenArchetypes: ['featured feed', 'category chips', 'product cards', 'account/settings'],
    starterFiles: ['App.jsx', 'components/product-card.jsx'],
    description:
      'Light retail shell with featured content, browsable sections, and commerce-oriented tabs.',
    visualSignature: 'Warm white background #FAFAFA. Full-width featured hero card with dark overlay and white text. Product grid with rounded image placeholders (borderRadius 16), bold product name, muted price. Glass tab bar. Pill-shaped category filter chips in a horizontal scroll row.',
    accentSuggestions: 'Warm terracotta #C2673A for fashion/lifestyle, electric blue #3B82F6 for tech retail, emerald #10B981 for sustainable/organic, gold #F59E0B for luxury',
  },
  {
    id: 'dashboard-dark-cards',
    category: 'dashboard',
    platformBaseline: 'ios-first',
    defaultTheme: 'dark',
    navigationPattern: 'stack with segmented filters',
    screenArchetypes: ['hero metrics', 'stat cards', 'activity feed', 'detail drill-in'],
    starterFiles: ['App.jsx', 'components/metric-card.jsx'],
    description:
      'Dark data-rich layout for fitness, finance, or media apps where cards and charts carry the hierarchy.',
    visualSignature: 'True dark background #0A0A0F. Hero metric at fontSize 52 fontWeight 800 in accent color. Supporting stats in a 2x2 card grid with thin borders and no shadows. Eyebrow label above the main title in muted uppercase. Segmented filter row below the title. Glass blur on any floating chrome.',
    accentSuggestions: 'Mint green #34D399 for fitness/health dashboards, electric blue #3B82F6 for finance/analytics, coral #FF6B6B for activity/sports, gold #FBBF24 for performance metrics',
  },
  {
    id: 'form-sheet-settings',
    category: 'settings',
    platformBaseline: 'ios-first',
    defaultTheme: 'light',
    navigationPattern: 'stack + modal sheet',
    screenArchetypes: ['settings list', 'grouped form rows', 'confirmation sheet', 'account detail'],
    starterFiles: ['App.jsx', 'components/settings-group.jsx'],
    description:
      'Light settings/form baseline with grouped rows and sheet-style editing flows instead of web forms.',
    visualSignature: 'iOS systemGroupedBackground #F2F2F7. Grouped white surface rows with chevron indicators and hairline separators. Section headers in small uppercase muted labels. Modal sheet with rounded top corners (borderRadius 28), drag handle, and clear action button. No web-style stacked label+input forms.',
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
