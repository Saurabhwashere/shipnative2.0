import { z } from 'zod';

// AI SDK v6 uses `inputSchema` (accepts Zod schemas directly as FlexibleSchema)

export const askQuestionsTool = {
  description:
    'Ask the user 2-3 clarifying questions before building. Call this FIRST when the user describes a new app or a major new feature. Do NOT ask more than 3 questions. Each question should have 3-4 option pills the user can tap, plus an optional custom input.',
  inputSchema: z.object({
    questions: z.array(
      z.object({
        id: z.string().describe('Unique ID for this question, e.g. "q1"'),
        question: z.string().describe('The question to ask, e.g. "What style should the app have?"'),
        options: z.array(
          z.object({
            label: z.string().describe('Display text for the option pill'),
            value: z.string().describe('Machine-readable value'),
          }),
        ).describe('3-4 answer options shown as pill buttons'),
        allowCustom: z.boolean().describe('Whether to show a free-text input for custom answers'),
      }),
    ).min(1).max(3),
  }),
};

export const proposePlanTool = {
  description:
    'Present a build plan for user approval. Call this AFTER receiving answers to your clarifying questions, or if the user request is detailed enough to skip questions. Always include the app category, chosen starter template, theme direction, navigation pattern, key features, screens, and a numbered list of build steps. Wait for the user to approve before calling writeFile.',
  inputSchema: z.object({
    appName: z.string().describe('Name of the app being built'),
    description: z.string().describe('One-sentence description of what the app does'),
    category: z.string().describe('App category, e.g. tasks, commerce, dashboard, settings'),
    chosenTemplate: z.string().describe('Starter template selected for this build'),
    theme: z.string().describe('Theme direction, e.g. light, dark, or mixed'),
    navigationPattern: z.string().describe('Primary navigation pattern, e.g. bottom tabs or stack + modal sheet'),
    features: z.array(z.string()).describe('Key features, e.g. ["Tab navigation", "Dark mode"]'),
    screens: z.array(z.string()).describe('Screen names, e.g. ["HomeScreen", "ProfileScreen"]'),
    buildSteps: z.array(
      z.object({
        id: z.string().describe('Step ID, e.g. "step-1"'),
        label: z.string().describe('Human-readable step label, e.g. "Set up App.jsx with navigation"'),
        files: z.array(z.string()).describe('Files created/modified in this step'),
      }),
    ).describe('Ordered list of build steps'),
  }),
};

export const writeFileTool = {
  description:
    'Create or update a file in the project. Provide the COMPLETE file contents every time — never partial updates. The preview will auto-refresh when files are written.',
  inputSchema: z.object({
    path: z
      .string()
      .describe('File path, e.g. App.jsx or HomeScreen.jsx (no leading slash needed)'),
    code: z
      .string()
      .describe(
        'Complete file contents — valid JSX/TSX that will be transformed and rendered',
      ),
    description: z
      .string()
      .describe('Brief description of what this file does or what changed'),
  }),
};

export const readFileTool = {
  description:
    'Read the current contents of a file. Use this before modifying existing files to see the current code.',
  inputSchema: z.object({
    path: z.string().describe('File path to read, e.g. App.jsx'),
  }),
};

export const fixErrorTool = {
  description:
    'Fix a runtime error in a specific file. Use this when an error is reported from the preview. Provide the complete corrected file contents.',
  inputSchema: z.object({
    errorMessage: z.string().describe('The exact error message from the preview'),
    filePath: z.string().describe('The file that contains the bug, e.g. App.jsx'),
    correctedCode: z
      .string()
      .describe('The complete corrected file contents — valid JSX that fixes the error'),
    explanation: z.string().describe('Brief explanation of what the bug was and how you fixed it'),
  }),
};
