export interface TemplateManifest {
  id: string;
  category: string;
  platformBaseline: 'ios-first';
  defaultTheme: 'light' | 'dark';
  navigationPattern: string;
  screenArchetypes: string[];
  starterFiles: string[];
  description: string;
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
    ].join('\n');
  }).join('\n');
}
