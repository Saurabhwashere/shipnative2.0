import { describe, it, expect } from 'vitest';
import { askQuestionsTool, proposePlanTool, writeFileTool, readFileTool, fixErrorTool } from '../../lib/ai-tools';

// Each tool's inputSchema is a Zod schema — use .parse() to validate

describe('askQuestionsTool schema', () => {
  const schema = askQuestionsTool.inputSchema;

  it('parses a valid input', () => {
    expect(() =>
      schema.parse({
        questions: [
          {
            id: 'q1',
            question: 'What style?',
            options: [
              { label: 'Dark', value: 'dark' },
              { label: 'Light', value: 'light' },
            ],
            allowCustom: false,
          },
        ],
      }),
    ).not.toThrow();
  });

  it('fails when questions array is empty (min 1)', () => {
    expect(() => schema.parse({ questions: [] })).toThrow();
  });

  it('fails when more than 3 questions (max 3)', () => {
    const q = { id: 'q1', question: 'Q?', options: [{ label: 'A', value: 'a' }], allowCustom: false };
    expect(() => schema.parse({ questions: [q, q, q, q] })).toThrow();
  });

  it('fails when question id is missing', () => {
    expect(() =>
      schema.parse({
        questions: [{ question: 'Q?', options: [], allowCustom: false }],
      }),
    ).toThrow();
  });

  it('fails when options item missing label', () => {
    expect(() =>
      schema.parse({
        questions: [
          {
            id: 'q1',
            question: 'Q?',
            options: [{ value: 'a' }],
            allowCustom: false,
          },
        ],
      }),
    ).toThrow();
  });
});

describe('proposePlanTool schema', () => {
  const schema = proposePlanTool.inputSchema;

  const validPlan = {
    appName: 'TodoApp',
    description: 'A simple todo tracker',
    category: 'tasks',
    chosenTemplate: 'tasks-light-tabs',
    theme: 'light',
    navigationPattern: 'bottom tabs',
    features: ['Add tasks', 'Mark complete'],
    screens: ['HomeScreen', 'DetailScreen'],
    buildSteps: [
      { id: 'step-1', label: 'Setup App.jsx', files: ['App.jsx'] },
    ],
  };

  it('parses a valid plan', () => {
    expect(() => schema.parse(validPlan)).not.toThrow();
  });

  it('fails when appName is missing', () => {
    const { appName, ...rest } = validPlan;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('fails when buildSteps is missing', () => {
    const { buildSteps, ...rest } = validPlan;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('fails when chosenTemplate is missing', () => {
    const { chosenTemplate, ...rest } = validPlan;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('fails when a buildStep is missing files array', () => {
    expect(() =>
      schema.parse({
        ...validPlan,
        buildSteps: [{ id: 'step-1', label: 'Setup' }],
      }),
    ).toThrow();
  });
});

describe('writeFileTool schema', () => {
  const schema = writeFileTool.inputSchema;

  it('parses valid input', () => {
    expect(() =>
      schema.parse({ path: 'App.jsx', code: 'const x = 1;', description: 'Main app' }),
    ).not.toThrow();
  });

  it('fails when code is missing', () => {
    expect(() => schema.parse({ path: 'App.jsx', description: 'desc' })).toThrow();
  });

  it('fails when path is missing', () => {
    expect(() => schema.parse({ code: 'x', description: 'desc' })).toThrow();
  });

  it('fails when description is missing', () => {
    expect(() => schema.parse({ path: 'App.jsx', code: 'x' })).toThrow();
  });
});

describe('readFileTool schema', () => {
  const schema = readFileTool.inputSchema;

  it('parses valid input', () => {
    expect(() => schema.parse({ path: 'App.jsx' })).not.toThrow();
  });

  it('fails when path is missing', () => {
    expect(() => schema.parse({})).toThrow();
  });
});

describe('fixErrorTool schema', () => {
  const schema = fixErrorTool.inputSchema;

  const valid = {
    errorMessage: 'ReferenceError: foo is not defined',
    filePath: 'App.jsx',
    correctedCode: 'const foo = 1;',
    explanation: 'Added missing variable declaration',
  };

  it('parses a valid input', () => {
    expect(() => schema.parse(valid)).not.toThrow();
  });

  it('fails when correctedCode is missing', () => {
    const { correctedCode, ...rest } = valid;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('fails when errorMessage is missing', () => {
    const { errorMessage, ...rest } = valid;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('fails when filePath is missing', () => {
    const { filePath, ...rest } = valid;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('fails when explanation is missing', () => {
    const { explanation, ...rest } = valid;
    expect(() => schema.parse(rest)).toThrow();
  });
});
